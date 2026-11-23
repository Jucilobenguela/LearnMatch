import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  AIRecommendation,
  AgeGroup,
  AttemptRecord,
  AttemptSubmissionResult,
  DifficultyTier,
  EvaluatedAnswer,
  ExerciseBatch,
  ExerciseQuestion,
  LevelDefinition,
  QuestionAnswerInput,
  QuestionAnswerResult,
  RecoveryChallenge,
  RecoveryChallengeResult,
  RewardBadge,
  UserProfile,
  WordStat,
} from '../src/types/learnmatch.ts';
import {
  CATALOG_BY_WORD,
  LEVEL_ROADMAP,
  buildRecoveryChallengeQuestions,
} from './catalog.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.LEARNMATCH_DB_PATH
  ? path.resolve(process.env.LEARNMATCH_DB_PATH)
  : path.join(DATA_DIR, 'learnmatch.db');

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    age_group TEXT,
    current_level INTEGER NOT NULL DEFAULT 1,
    total_points INTEGER NOT NULL DEFAULT 0,
    lives INTEGER NOT NULL DEFAULT 5,
    max_lives INTEGER NOT NULL DEFAULT 5,
    lives_updated_at TEXT NOT NULL,
    unlocked_levels_json TEXT NOT NULL DEFAULT '[1]',
    rewards_json TEXT NOT NULL DEFAULT '[]',
    profile_completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exercise_batches (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    level INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    category TEXT NOT NULL,
    questions_json TEXT NOT NULL,
    source TEXT NOT NULL,
    model_name TEXT NOT NULL,
    fallback_reason TEXT,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    batch_id TEXT NOT NULL,
    correct_count INTEGER NOT NULL,
    incorrect_count INTEGER NOT NULL,
    score INTEGER NOT NULL,
    percentage INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    answers_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS word_performance (
    user_id TEXT NOT NULL,
    word TEXT NOT NULL,
    translation TEXT NOT NULL,
    category TEXT NOT NULL,
    correct_count INTEGER NOT NULL DEFAULT 0,
    incorrect_count INTEGER NOT NULL DEFAULT 0,
    last_seen_at TEXT NOT NULL,
    PRIMARY KEY (user_id, word),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_recommendations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    summary_pt TEXT NOT NULL,
    weak_words_json TEXT NOT NULL,
    recommended_categories_json TEXT NOT NULL,
    difficulty_suggestion TEXT NOT NULL,
    practice_tip_pt TEXT NOT NULL,
    new_vocabulary_json TEXT NOT NULL,
    source TEXT NOT NULL,
    model_name TEXT,
    fallback_reason TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS batch_question_answers (
    batch_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_answer TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    lives_after INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (batch_id, user_id, question_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS recovery_challenges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    questions_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    correct_count INTEGER,
    lives_gained INTEGER,
    lives_after INTEGER,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Safe migration for ended_by_zero_lives column on existing SQLite databases
const attemptCols = db.prepare(`PRAGMA table_info(attempts)`).all() as Array<{ name: string }>;
if (!attemptCols.some((c) => c.name === 'ended_by_zero_lives')) {
  db.exec(`ALTER TABLE attempts ADD COLUMN ended_by_zero_lives INTEGER NOT NULL DEFAULT 0`);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

interface RawUserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  age_group: AgeGroup | null;
  current_level: number;
  total_points: number;
  lives: number;
  max_lives: number;
  lives_updated_at: string;
  unlocked_levels_json: string;
  rewards_json: string;
  profile_completed: number;
  created_at: string;
}

function regenerateLivesIfDue(row: RawUserRow): RawUserRow {
  if (row.lives >= row.max_lives) {
    return row;
  }
  const lastMs = Date.parse(row.lives_updated_at);
  if (Number.isNaN(lastMs)) return row;
  const elapsedMs = Date.now() - lastMs;
  const minutesPerLife = 15;
  const gained = Math.floor(elapsedMs / (minutesPerLife * 60 * 1000));
  if (gained <= 0) return row;

  const newLives = Math.min(row.max_lives, row.lives + gained);
  const nowIso = new Date().toISOString();
  db.prepare(`UPDATE users SET lives = ?, lives_updated_at = ? WHERE id = ?`).run(
    newLives,
    nowIso,
    row.id,
  );
  return { ...row, lives: newLives, lives_updated_at: nowIso };
}

function serializeUser(rawRow: RawUserRow): UserProfile {
  const row = regenerateLivesIfDue(rawRow);
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    ageGroup: row.age_group,
    currentLevel: row.current_level,
    totalPoints: row.total_points,
    lives: row.lives,
    maxLives: row.max_lives,
    unlockedLevels: JSON.parse(row.unlocked_levels_json || '[1]') as number[],
    rewards: JSON.parse(row.rewards_json || '[]') as RewardBadge[],
    profileCompleted: Boolean(row.profile_completed),
    createdAt: row.created_at,
  };
}

export function createUser(email: string, password: string, displayName = ''): UserProfile {
  const normalizedEmail = email.trim().toLowerCase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = hashPassword(password);

  db.prepare(
    `INSERT INTO users (
      id, email, password_hash, display_name, age_group,
      current_level, total_points, lives, max_lives, lives_updated_at,
      unlocked_levels_json, rewards_json, profile_completed, created_at
    ) VALUES (?, ?, ?, ?, NULL, 1, 0, 5, 5, ?, '[1]', '[]', 0, ?)`,
  ).run(id, normalizedEmail, passwordHash, displayName.trim(), now, now);

  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as unknown as RawUserRow;
  return serializeUser(row);
}

export function authenticateUser(email: string, password: string): UserProfile | null {
  const normalizedEmail = email.trim().toLowerCase();
  const row = db
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(normalizedEmail) as unknown as RawUserRow | undefined;
  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return serializeUser(row);
}

export function getUserByEmail(email: string): UserProfile | null {
  const row = db
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(email.trim().toLowerCase()) as unknown as RawUserRow | undefined;
  return row ? serializeUser(row) : null;
}

export function getUserById(userId: string): UserProfile | null {
  const row = db
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(userId) as unknown as RawUserRow | undefined;
  return row ? serializeUser(row) : null;
}

export function createSession(userId: string): { token: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  db.prepare(
    `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
  ).run(token, userId, now.toISOString(), expires.toISOString());
  return { token, expiresAt: expires.toISOString() };
}

export function getUserBySessionToken(token: string): UserProfile | null {
  if (!token) return null;
  const session = db
    .prepare(`SELECT user_id, expires_at FROM sessions WHERE token = ?`)
    .get(token) as unknown as { user_id: string; expires_at: string } | undefined;
  if (!session) return null;
  if (Date.parse(session.expires_at) <= Date.now()) {
    db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    return null;
  }
  return getUserById(session.user_id);
}

export function deleteSession(token: string): void {
  db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export function updateUserProfile(
  userId: string,
  displayName: string,
  ageGroup: AgeGroup,
): UserProfile {
  db.prepare(
    `UPDATE users SET display_name = ?, age_group = ?, profile_completed = 1 WHERE id = ?`,
  ).run(displayName.trim(), ageGroup, userId);
  const updated = getUserById(userId);
  if (!updated) throw new Error('Utilizador não encontrado.');
  return updated;
}

export function recoverUserLives(_userId: string): never {
  throw new Error('A recuperação manual direta foi substituída pelo Desafio de Recuperação de Vidas.');
}

export function saveExerciseBatch(params: {
  userId: string | null;
  level: number;
  difficulty: DifficultyTier;
  category: string;
  questions: ExerciseQuestion[];
  source: 'gemini' | 'curated_cache';
  modelName: string;
  fallbackReason?: string;
}): ExerciseBatch {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO exercise_batches (
      id, user_id, level, difficulty, category, questions_json,
      source, model_name, fallback_reason, usage_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(
    id,
    params.userId,
    params.level,
    params.difficulty,
    params.category,
    JSON.stringify(params.questions),
    params.source,
    params.modelName,
    params.fallbackReason ?? null,
    createdAt,
  );

  return {
    id,
    level: params.level,
    difficulty: params.difficulty,
    category: params.category,
    source: params.source,
    modelName: params.modelName,
    fallbackReason: params.fallbackReason,
    createdAt,
    questions: params.questions,
  };
}

interface RawBatchRow {
  id: string;
  user_id: string | null;
  level: number;
  difficulty: DifficultyTier;
  category: string;
  questions_json: string;
  source: 'gemini' | 'curated_cache';
  model_name: string;
  fallback_reason: string | null;
  usage_count: number;
  created_at: string;
}

export function getReusableGeminiBatch(
  userId: string,
  level: number,
  difficulty: DifficultyTier,
): ExerciseBatch | null {
  // Reuse a cached Gemini batch that this user hasn't attempted yet
  const row = db
    .prepare(
      `SELECT b.* FROM exercise_batches b
       WHERE b.level = ?
         AND b.difficulty = ?
         AND b.source = 'gemini'
         AND b.id NOT IN (SELECT batch_id FROM attempts WHERE user_id = ?)
       ORDER BY b.created_at DESC
       LIMIT 1`,
    )
    .get(level, difficulty, userId) as unknown as RawBatchRow | undefined;

  if (!row) return null;
  db.prepare(`UPDATE exercise_batches SET usage_count = usage_count + 1 WHERE id = ?`).run(row.id);

  return {
    id: row.id,
    level: row.level,
    difficulty: row.difficulty,
    category: row.category,
    source: row.source,
    modelName: row.model_name,
    fallbackReason: row.fallback_reason ?? undefined,
    createdAt: row.created_at,
    questions: JSON.parse(row.questions_json) as ExerciseQuestion[],
  };
}

export function getExerciseBatchById(batchId: string): ExerciseBatch | null {
  const row = db
    .prepare(`SELECT * FROM exercise_batches WHERE id = ?`)
    .get(batchId) as unknown as RawBatchRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    level: row.level,
    difficulty: row.difficulty,
    category: row.category,
    source: row.source,
    modelName: row.model_name,
    fallbackReason: row.fallback_reason ?? undefined,
    createdAt: row.created_at,
    questions: JSON.parse(row.questions_json) as ExerciseQuestion[],
  };
}

function finalizeBatchAttemptInTx(params: {
  user: UserProfile;
  batch: ExerciseBatch;
  evaluatedAnswers: EvaluatedAnswer[];
  durationSeconds: number;
  endedByZeroLives: boolean;
  nextLives: number;
  nextLivesUpdatedAt: string | null;
  now: string;
}): AttemptSubmissionResult {
  const {
    user,
    batch,
    evaluatedAnswers,
    durationSeconds,
    endedByZeroLives,
    nextLives,
    nextLivesUpdatedAt,
    now,
  } = params;

  let correctCount = 0;
  let incorrectCount = 0;
  for (const ans of evaluatedAnswers) {
    if (ans.isCorrect) {
      correctCount += 1;
    } else {
      incorrectCount += 1;
    }

    const catalogEntry = CATALOG_BY_WORD.get(ans.word);
    db.prepare(
      `INSERT INTO word_performance (user_id, word, translation, category, correct_count, incorrect_count, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, word) DO UPDATE SET
         correct_count = word_performance.correct_count + excluded.correct_count,
         incorrect_count = word_performance.incorrect_count + excluded.incorrect_count,
         last_seen_at = excluded.last_seen_at`,
    ).run(
      user.id,
      ans.word,
      catalogEntry?.translation ?? ans.translation,
      ans.category,
      ans.isCorrect ? 1 : 0,
      ans.isCorrect ? 0 : 1,
      now,
    );
  }

  const totalQuestions = batch.questions.length;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const passed = !endedByZeroLives && correctCount >= 6;
  // Transparent scoring: 15 pts per correct answer + 30 bonus pts on passing + 20 bonus on perfect 10/10
  const score =
    correctCount * 15 + (passed ? 30 : 0) + (correctCount === totalQuestions ? 20 : 0);

  // Level progression (purely performance-based, never age-based!)
  const unlockedSet = new Set(user.unlockedLevels);
  let newlyUnlockedLevel: number | null = null;
  let nextCurrentLevel = user.currentLevel;

  if (passed && batch.level === 1 && !unlockedSet.has(2)) {
    unlockedSet.add(2);
    newlyUnlockedLevel = 2;
    nextCurrentLevel = Math.max(user.currentLevel, 2);
  } else if (passed && batch.level === 2 && !unlockedSet.has(3)) {
    unlockedSet.add(3);
    newlyUnlockedLevel = 3;
    nextCurrentLevel = Math.max(user.currentLevel, 2);
  }

  // Rewards calculation
  const existingRewards = [...user.rewards];
  const existingRewardIds = new Set(existingRewards.map((r) => r.id));
  const newRewards: RewardBadge[] = [];

  const grantReward = (id: string, title: string, description: string) => {
    if (!existingRewardIds.has(id)) {
      const badge: RewardBadge = { id, title, description, earnedAt: now };
      existingRewards.push(badge);
      newRewards.push(badge);
      existingRewardIds.add(id);
    }
  };

  grantReward(
    'first_attempt',
    'Primeiro Passo',
    'Concluiu o primeiro conjunto de exercícios no LearnMatch.',
  );

  if (passed && batch.level === 1) {
    grantReward(
      'level_1_master',
      'Ouvido Atento',
      'Aprovado no Nível 1 (Áudio → Imagem) com pelo menos 6/10 respostas corretas.',
    );
  }
  if (passed && batch.level === 2) {
    grantReward(
      'level_2_master',
      'Leitor Visual',
      'Aprovado no Nível 2 (Imagem → Palavra) com pelo menos 6/10 respostas corretas.',
    );
  }
  if (correctCount === 10) {
    grantReward(
      'perfect_10',
      'Pontuação Perfeita',
      'Acertou 10 em 10 perguntas numa única sessão de aprendizagem.',
    );
  }
  if (user.totalPoints + score >= 300) {
    grantReward(
      'points_300',
      'Dedicação Contínua',
      'Alcançou 300 pontos acumulados em exercícios de inglês.',
    );
  }

  const attemptId = crypto.randomUUID();
  const safeDuration = Math.max(1, Math.min(3600, Math.round(durationSeconds || 0)));

  db.prepare(
    `INSERT INTO attempts (
      id, user_id, level, batch_id, correct_count, incorrect_count,
      score, percentage, passed, duration_seconds, answers_json, ended_by_zero_lives, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    attemptId,
    user.id,
    batch.level,
    batch.id,
    correctCount,
    incorrectCount,
    score,
    percentage,
    passed ? 1 : 0,
    safeDuration,
    JSON.stringify(evaluatedAnswers),
    endedByZeroLives ? 1 : 0,
    now,
  );

  if (nextLivesUpdatedAt) {
    db.prepare(
      `UPDATE users SET
        total_points = total_points + ?,
        lives = ?,
        lives_updated_at = ?,
        current_level = ?,
        unlocked_levels_json = ?,
        rewards_json = ?
       WHERE id = ?`,
    ).run(
      score,
      nextLives,
      nextLivesUpdatedAt,
      nextCurrentLevel,
      JSON.stringify(Array.from(unlockedSet).sort((a, b) => a - b)),
      JSON.stringify(existingRewards),
      user.id,
    );
  } else {
    db.prepare(
      `UPDATE users SET
        total_points = total_points + ?,
        lives = ?,
        current_level = ?,
        unlocked_levels_json = ?,
        rewards_json = ?
       WHERE id = ?`,
    ).run(
      score,
      nextLives,
      nextCurrentLevel,
      JSON.stringify(Array.from(unlockedSet).sort((a, b) => a - b)),
      JSON.stringify(existingRewards),
      user.id,
    );
  }

  const updatedUser = getUserById(user.id)!;

  let nextRecommendedAction: AttemptSubmissionResult['nextRecommendedAction'];
  if (endedByZeroLives || updatedUser.lives <= 0) {
    nextRecommendedAction = {
      title: 'Recuperar Vidas',
      description:
        'Ficámos sem vidas! Faz um desafio de recuperação para ganhares vidas e continuares a aprender.',
      targetLevel: batch.level,
    };
  } else if (!passed) {
    nextRecommendedAction = {
      title: `Repetir Nível ${batch.level}`,
      description: `Obteve ${correctCount}/10. Precisa de pelo menos 6 respostas corretas para aprovar.`,
      targetLevel: batch.level,
    };
  } else if (newlyUnlockedLevel === 2) {
    nextRecommendedAction = {
      title: 'Avançar para o Nível 2',
      description: 'Desbloqueou o reconhecimento Imagem → Palavra. Continue a sua progressão!',
      targetLevel: 2,
    };
  } else if (batch.level === 2) {
    nextRecommendedAction = {
      title: 'Consolidar com IA Adaptativa',
      description:
        'Aprovado no Nível 2! Pratique novamente com exercícios gerados pela IA ou reveja o histórico.',
      targetLevel: 2,
    };
  } else {
    nextRecommendedAction = {
      title: 'Continuar para o Nível 2',
      description: 'Consolidou o Nível 1. Avance para o Nível 2 ou reforce vocabulário.',
      targetLevel: 2,
    };
  }

  return {
    attempt: {
      id: attemptId,
      userId: user.id,
      level: batch.level,
      batchId: batch.id,
      correctCount,
      incorrectCount,
      score,
      percentage,
      passed,
      durationSeconds: safeDuration,
      answers: evaluatedAnswers,
      createdAt: now,
    },
    user: updatedUser,
    newlyUnlockedLevel,
    newRewards,
    endedByZeroLives,
    nextRecommendedAction,
  };
}

export function submitQuestionAnswer(params: {
  userId: string;
  batchId: string;
  questionId: string;
  selectedAnswer: string;
  durationSeconds?: number;
}): QuestionAnswerResult {
  const normalizedSelected = params.selectedAnswer.trim().toUpperCase();
  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE');
  try {
    const user = getUserById(params.userId);
    if (!user) {
      throw new Error('Utilizador não encontrado.');
    }

    const batch = getExerciseBatchById(params.batchId);
    if (!batch) {
      throw new Error('Conjunto de exercícios inválido ou expirado.');
    }

    if (!user.unlockedLevels.includes(batch.level)) {
      throw new Error(`O nível ${batch.level} ainda não está desbloqueado para esta conta.`);
    }

    const question = batch.questions.find((q) => q.id === params.questionId);
    if (!question) {
      throw new Error('Pergunta não pertence a este conjunto de exercícios.');
    }

    if (!normalizedSelected || !question.options.includes(normalizedSelected)) {
      throw new Error(`Resposta inválida para a pergunta "${question.word}".`);
    }

    const existingAttempt = db
      .prepare(`SELECT id FROM attempts WHERE user_id = ? AND batch_id = ?`)
      .get(params.userId, params.batchId) as unknown as { id: string } | undefined;
    if (existingAttempt) {
      throw new Error('Esta sessão de exercícios já foi concluída.');
    }

    // Idempotency guard: never process or deduct lives twice for the same question in the same batch
    const existingAnswer = db
      .prepare(
        `SELECT selected_answer, is_correct
         FROM batch_question_answers
         WHERE batch_id = ? AND user_id = ? AND question_id = ?`,
      )
      .get(params.batchId, params.userId, params.questionId) as unknown as
      | { selected_answer: string; is_correct: number }
      | undefined;

    if (existingAnswer) {
      db.exec('COMMIT');
      return {
        questionId: question.id,
        selectedAnswer: existingAnswer.selected_answer,
        correctAnswer: question.correctAnswer,
        isCorrect: Boolean(existingAnswer.is_correct),
        alreadyAnswered: true,
        livesDeducted: 0,
        gameOver: user.lives <= 0,
        user,
      };
    }

    // Enforce hard block when user has 0 lives before answering
    if (user.lives <= 0) {
      throw new Error('Ficou sem vidas! A sessão terminou. Faça um desafio de recuperação para continuar.');
    }

    const isCorrect = normalizedSelected === question.correctAnswer;
    const nextLives = isCorrect ? user.lives : Math.max(0, user.lives - 1);
    const livesDeducted = user.lives - nextLives;

    if (nextLives !== user.lives) {
      db.prepare(`UPDATE users SET lives = ?, lives_updated_at = ? WHERE id = ?`).run(
        nextLives,
        now,
        params.userId,
      );
    }

    db.prepare(
      `INSERT INTO batch_question_answers (
        batch_id, user_id, question_id, selected_answer, is_correct, lives_after, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      params.batchId,
      params.userId,
      params.questionId,
      normalizedSelected,
      isCorrect ? 1 : 0,
      nextLives,
      now,
    );

    // If lives just hit 0, immediately end the session and persist the partial attempt + score
    let gameOver = false;
    let attemptResult: AttemptSubmissionResult | undefined;
    if (nextLives === 0) {
      gameOver = true;
      const recordedRows = db
        .prepare(
          `SELECT question_id, selected_answer
           FROM batch_question_answers
           WHERE batch_id = ? AND user_id = ?`,
        )
        .all(params.batchId, params.userId) as unknown as Array<{
        question_id: string;
        selected_answer: string;
      }>;
      const recordedMap = new Map(recordedRows.map((r) => [r.question_id, r.selected_answer]));

      const evaluatedAnswers: EvaluatedAnswer[] = [];
      for (const q of batch.questions) {
        const sel = recordedMap.get(q.id);
        if (!sel) continue;
        evaluatedAnswers.push({
          questionId: q.id,
          word: q.word,
          translation: q.translation,
          category: q.category,
          selectedAnswer: sel,
          correctAnswer: q.correctAnswer,
          isCorrect: sel === q.correctAnswer,
        });
      }

      attemptResult = finalizeBatchAttemptInTx({
        user,
        batch,
        evaluatedAnswers,
        durationSeconds: params.durationSeconds ?? 1,
        endedByZeroLives: true,
        nextLives: 0,
        nextLivesUpdatedAt: now,
        now,
      });
    }

    db.exec('COMMIT');
    const updatedUser = attemptResult ? attemptResult.user : getUserById(params.userId)!;
    return {
      questionId: question.id,
      selectedAnswer: normalizedSelected,
      correctAnswer: question.correctAnswer,
      isCorrect,
      alreadyAnswered: false,
      livesDeducted,
      gameOver,
      attemptResult,
      user: updatedUser,
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors if transaction already closed
    }
    throw err;
  }
}

export function submitAttempt(params: {
  userId: string;
  batchId: string;
  level: number;
  answers: QuestionAnswerInput[];
  durationSeconds: number;
}): AttemptSubmissionResult {
  db.exec('BEGIN IMMEDIATE');
  try {
    const user = getUserById(params.userId);
    if (!user) {
      throw new Error('Utilizador não encontrado.');
    }

    if (!user.unlockedLevels.includes(params.level)) {
      throw new Error(`O nível ${params.level} ainda não está desbloqueado para esta conta.`);
    }

    const batch = getExerciseBatchById(params.batchId);
    if (!batch || batch.level !== params.level) {
      throw new Error('Conjunto de exercícios inválido ou expirado.');
    }

    const duplicateAttempt = db
      .prepare(`SELECT id FROM attempts WHERE user_id = ? AND batch_id = ?`)
      .get(params.userId, params.batchId) as unknown as { id: string } | undefined;
    if (duplicateAttempt) {
      throw new Error('Esta tentativa já foi registada anteriormente.');
    }

    const preRecordedRows = db
      .prepare(
        `SELECT question_id, selected_answer, is_correct
         FROM batch_question_answers
         WHERE batch_id = ? AND user_id = ?`,
      )
      .all(params.batchId, params.userId) as unknown as Array<{
      question_id: string;
      selected_answer: string;
      is_correct: number;
    }>;
    const preRecordedMap = new Map(preRecordedRows.map((r) => [r.question_id, r]));

    if (user.lives <= 0 && preRecordedRows.length === 0) {
      throw new Error('Sem vidas disponíveis. Faça um desafio de recuperação para continuar.');
    }

    if (!Array.isArray(params.answers) || params.answers.length === 0) {
      throw new Error('Nenhuma resposta submetida para esta tentativa.');
    }
    if (user.lives > 0 && params.answers.length !== batch.questions.length) {
      throw new Error('É necessário responder às 10 perguntas do exercício.');
    }

    const answerMap = new Map<string, string>();
    for (const ans of params.answers) {
      if (!ans || typeof ans.questionId !== 'string' || typeof ans.selectedAnswer !== 'string') {
        throw new Error('Formato de resposta inválido.');
      }
      answerMap.set(ans.questionId, ans.selectedAnswer.trim().toUpperCase());
    }

    let unprocessedIncorrectCount = 0;
    const evaluatedAnswers: EvaluatedAnswer[] = [];
    const now = new Date().toISOString();

    let runningLives = user.lives;

    for (const question of batch.questions) {
      const preRecorded = preRecordedMap.get(question.id);
      const provided = answerMap.get(question.id);
      if (!provided) {
        if (preRecorded) {
          // Use pre-recorded answer if present
        } else {
          continue;
        }
      }
      const chosen = provided ?? preRecorded!.selected_answer;
      if (!question.options.includes(chosen)) {
        throw new Error(`Resposta inválida para a pergunta "${question.word}".`);
      }

      // Use authoritative pre-recorded answer if already validated during the session
      const selected = preRecorded ? preRecorded.selected_answer : chosen;
      const isCorrect = selected === question.correctAnswer;

      if (!preRecorded) {
        if (!isCorrect) {
          unprocessedIncorrectCount += 1;
          runningLives = Math.max(0, runningLives - 1);
        }
        db.prepare(
          `INSERT INTO batch_question_answers (
            batch_id, user_id, question_id, selected_answer, is_correct, lives_after, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          params.batchId,
          params.userId,
          question.id,
          selected,
          isCorrect ? 1 : 0,
          runningLives,
          now,
        );
      }

      evaluatedAnswers.push({
        questionId: question.id,
        word: question.word,
        translation: question.translation,
        category: question.category,
        selectedAnswer: selected,
        correctAnswer: question.correctAnswer,
        isCorrect,
      });
    }

    if (evaluatedAnswers.length !== batch.questions.length && runningLives > 0) {
      throw new Error('É necessário responder às 10 perguntas do exercício.');
    }

    const nextLives = Math.max(0, user.lives - unprocessedIncorrectCount);
    const nextLivesUpdatedAt = nextLives < user.lives ? now : null;
    const result = finalizeBatchAttemptInTx({
      user,
      batch,
      evaluatedAnswers,
      durationSeconds: params.durationSeconds,
      endedByZeroLives: nextLives === 0 && evaluatedAnswers.length < batch.questions.length,
      nextLives,
      nextLivesUpdatedAt,
      now,
    });

    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback error
    }
    throw err;
  }
}

export function createRecoveryChallenge(userId: string): RecoveryChallenge {
  const user = getUserById(userId);
  if (!user) {
    throw new Error('Utilizador não encontrado.');
  }
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const questions = buildRecoveryChallengeQuestions();

  db.prepare(
    `INSERT INTO recovery_challenges (id, user_id, questions_json, status, created_at)
     VALUES (?, ?, ?, 'active', ?)`,
  ).run(id, userId, JSON.stringify(questions), createdAt);

  return { id, questions, createdAt };
}

export function submitRecoveryChallenge(params: {
  userId: string;
  challengeId: string;
  answers: QuestionAnswerInput[];
}): RecoveryChallengeResult {
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const user = getUserById(params.userId);
    if (!user) {
      throw new Error('Utilizador não encontrado.');
    }

    const row = db
      .prepare(`SELECT * FROM recovery_challenges WHERE id = ?`)
      .get(params.challengeId) as unknown as
      | {
          id: string;
          user_id: string;
          questions_json: string;
          status: string;
          created_at: string;
        }
      | undefined;

    if (!row) {
      throw new Error('Desafio de recuperação não encontrado.');
    }
    if (row.user_id !== params.userId) {
      throw new Error('Acesso negado a este desafio de recuperação.');
    }
    if (row.status !== 'active') {
      throw new Error('Este desafio de recuperação já foi concluído.');
    }

    const questions = JSON.parse(row.questions_json) as ExerciseQuestion[];
    if (!Array.isArray(params.answers) || params.answers.length !== questions.length) {
      throw new Error(`É necessário responder às ${questions.length} perguntas do desafio.`);
    }

    const answerMap = new Map<string, string>();
    for (const ans of params.answers) {
      if (!ans || typeof ans.questionId !== 'string' || typeof ans.selectedAnswer !== 'string') {
        throw new Error('Formato de resposta inválido.');
      }
      answerMap.set(ans.questionId, ans.selectedAnswer.trim().toUpperCase());
    }

    let correctCount = 0;
    let incorrectCount = 0;
    for (const q of questions) {
      const selected = answerMap.get(q.id);
      if (!selected || !q.options.includes(selected)) {
        throw new Error(`Resposta inválida para a pergunta "${q.word}".`);
      }
      if (selected === q.correctAnswer) {
        correctCount += 1;
      } else {
        incorrectCount += 1;
      }
    }

    // Rule: 4 or 5 correct answers out of 5 grants +1 life (never exceeding maxLives = 5);
    // mistakes in recovery mode NEVER deduct lives and never alter levels/points/attempts.
    const passed = correctCount >= 4;
    const livesBefore = user.lives;
    const livesAfter = passed ? Math.min(user.maxLives, livesBefore + 1) : livesBefore;
    const livesGained = livesAfter - livesBefore;

    if (livesGained > 0) {
      db.prepare(`UPDATE users SET lives = ?, lives_updated_at = ? WHERE id = ?`).run(
        livesAfter,
        now,
        params.userId,
      );
    }

    db.prepare(
      `UPDATE recovery_challenges
       SET status = 'completed', correct_count = ?, lives_gained = ?, lives_after = ?, completed_at = ?
       WHERE id = ?`,
    ).run(correctCount, livesGained, livesAfter, now, params.challengeId);

    db.exec('COMMIT');
    const updatedUser = getUserById(params.userId)!;
    return {
      challengeId: params.challengeId,
      totalQuestions: questions.length,
      correctCount,
      incorrectCount,
      passed,
      livesBefore,
      livesGained,
      livesAfter,
      user: updatedUser,
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback error
    }
    throw err;
  }
}

export function getUserAttempts(userId: string): AttemptRecord[] {
  const rows = db
    .prepare(`SELECT * FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`)
    .all(userId) as unknown as Array<{
    id: string;
    user_id: string;
    level: number;
    batch_id: string;
    correct_count: number;
    incorrect_count: number;
    score: number;
    percentage: number;
    passed: number;
    duration_seconds: number;
    answers_json: string;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    level: r.level,
    batchId: r.batch_id,
    correctCount: r.correct_count,
    incorrectCount: r.incorrect_count,
    score: r.score,
    percentage: r.percentage,
    passed: Boolean(r.passed),
    durationSeconds: r.duration_seconds,
    answers: JSON.parse(r.answers_json) as EvaluatedAnswer[],
    createdAt: r.created_at,
  }));
}

export function getUserWordStats(userId: string): WordStat[] {
  const rows = db
    .prepare(
      `SELECT word, translation, category, correct_count, incorrect_count, last_seen_at
       FROM word_performance
       WHERE user_id = ?
       ORDER BY incorrect_count DESC, last_seen_at DESC`,
    )
    .all(userId) as unknown as Array<{
    word: string;
    translation: string;
    category: string;
    correct_count: number;
    incorrect_count: number;
    last_seen_at: string;
  }>;

  return rows.map((r) => {
    const total = r.correct_count + r.incorrect_count;
    return {
      word: r.word,
      translation: r.translation,
      category: r.category,
      correctCount: r.correct_count,
      incorrectCount: r.incorrect_count,
      accuracy: total > 0 ? Math.round((r.correct_count / total) * 100) : 0,
      lastSeenAt: r.last_seen_at,
    };
  });
}

export function getUserDifficultyTier(userId: string): DifficultyTier {
  const recent = db
    .prepare(`SELECT percentage, passed FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 3`)
    .all(userId) as unknown as Array<{ percentage: number; passed: number }>;

  if (recent.length === 0) return 'beginner';
  const avg = recent.reduce((acc, r) => acc + r.percentage, 0) / recent.length;
  if (avg >= 85 && recent.length >= 2) return 'intermediate';
  if (avg >= 65) return 'elementary';
  return 'beginner';
}

export function getLevelsForUser(user: UserProfile): LevelDefinition[] {
  const attempts = getUserAttempts(user.id);
  return LEVEL_ROADMAP.map((def) => {
    const levelAttempts = attempts.filter((a) => a.level === def.level);
    const bestScore =
      levelAttempts.length > 0 ? Math.max(...levelAttempts.map((a) => a.score)) : null;
    const bestPercentage =
      levelAttempts.length > 0 ? Math.max(...levelAttempts.map((a) => a.percentage)) : null;

    return {
      ...def,
      isUnlocked: user.unlockedLevels.includes(def.level),
      bestScore,
      bestPercentage,
      attemptsCount: levelAttempts.length,
      passedCount: levelAttempts.filter((a) => a.passed).length,
    };
  });
}

export function saveAIRecommendation(
  userId: string,
  rec: Omit<AIRecommendation, 'id' | 'createdAt'>,
): AIRecommendation {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO ai_recommendations (
      id, user_id, summary_pt, weak_words_json, recommended_categories_json,
      difficulty_suggestion, practice_tip_pt, new_vocabulary_json,
      source, model_name, fallback_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    rec.summaryPt,
    JSON.stringify(rec.weakWords),
    JSON.stringify(rec.recommendedCategories),
    rec.difficultySuggestion,
    rec.practiceTipPt,
    JSON.stringify(rec.newVocabularyExamples),
    rec.source,
    rec.modelName ?? null,
    rec.fallbackReason ?? null,
    createdAt,
  );

  return { ...rec, id, createdAt };
}

export function getLatestAIRecommendation(userId: string): AIRecommendation | null {
  const row = db
    .prepare(`SELECT * FROM ai_recommendations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(userId) as unknown as
    | {
        id: string;
        summary_pt: string;
        weak_words_json: string;
        recommended_categories_json: string;
        difficulty_suggestion: DifficultyTier;
        practice_tip_pt: string;
        new_vocabulary_json: string;
        source: 'gemini' | 'local_analysis';
        model_name: string | null;
        fallback_reason: string | null;
        created_at: string;
      }
    | undefined;

  if (!row) return null;
  return {
    id: row.id,
    summaryPt: row.summary_pt,
    weakWords: JSON.parse(row.weak_words_json),
    recommendedCategories: JSON.parse(row.recommended_categories_json),
    difficultySuggestion: row.difficulty_suggestion,
    practiceTipPt: row.practice_tip_pt,
    newVocabularyExamples: JSON.parse(row.new_vocabulary_json),
    source: row.source,
    modelName: row.model_name ?? undefined,
    fallbackReason: row.fallback_reason ?? undefined,
    createdAt: row.created_at,
  };
}
