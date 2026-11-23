export type AgeGroup = 'child_6_10' | 'teen_11_17' | 'adult_18_plus';

export type DifficultyTier = 'beginner' | 'elementary' | 'intermediate';

export interface RewardBadge {
  id: string;
  title: string;
  description: string;
  earnedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  ageGroup: AgeGroup | null;
  currentLevel: number;
  totalPoints: number;
  lives: number;
  maxLives: number;
  unlockedLevels: number[];
  rewards: RewardBadge[];
  profileCompleted: boolean;
  createdAt: string;
}

export interface CatalogItem {
  key: string;
  word: string;
  translation: string;
  phonetic: string;
  category: string;
  difficulty: DifficultyTier;
  exampleSentence: string;
  exampleTranslation: string;
}

export interface ExerciseQuestion {
  id: string;
  level: number;
  word: string;
  translation: string;
  phonetic: string;
  category: string;
  imageKey: string;
  audioText: string;
  exampleSentence: string;
  exampleTranslation: string;
  hintPt: string;
  options: string[];
  correctAnswer: string;
  difficulty: DifficultyTier;
}

export interface ExerciseBatch {
  id: string;
  level: number;
  difficulty: DifficultyTier;
  category: string;
  source: 'gemini' | 'curated_cache';
  modelName: string;
  fallbackReason?: string;
  createdAt: string;
  questions: ExerciseQuestion[];
}

export interface QuestionAnswerInput {
  questionId: string;
  selectedAnswer: string;
}

export interface EvaluatedAnswer {
  questionId: string;
  word: string;
  translation: string;
  category: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface AttemptRecord {
  id: string;
  userId: string;
  level: number;
  batchId: string;
  correctCount: number;
  incorrectCount: number;
  score: number;
  percentage: number;
  passed: boolean;
  durationSeconds: number;
  answers: EvaluatedAnswer[];
  createdAt: string;
}

export interface AttemptSubmissionResult {
  attempt: AttemptRecord;
  user: UserProfile;
  newlyUnlockedLevel: number | null;
  newRewards: RewardBadge[];
  endedByZeroLives?: boolean;
  nextRecommendedAction: {
    title: string;
    description: string;
    targetLevel: number;
  };
}

export interface QuestionAnswerResult {
  questionId: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  alreadyAnswered: boolean;
  livesDeducted: number;
  gameOver?: boolean;
  attemptResult?: AttemptSubmissionResult;
  user: UserProfile;
}

export interface RecoveryChallenge {
  id: string;
  questions: ExerciseQuestion[];
  createdAt: string;
}

export interface RecoveryChallengeResult {
  challengeId: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  passed: boolean;
  livesBefore: number;
  livesGained: number;
  livesAfter: number;
  user: UserProfile;
}

export interface WordStat {
  word: string;
  translation: string;
  category: string;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  lastSeenAt: string;
}

export interface LevelDefinition {
  level: number;
  title: string;
  subtitle: string;
  description: string;
  mode: 'audio_to_image' | 'image_to_word' | 'planned';
  isMvpImplemented: boolean;
  isUnlocked: boolean;
  bestScore: number | null;
  bestPercentage: number | null;
  attemptsCount: number;
  passedCount: number;
}

export interface VocabularyExample {
  word: string;
  translation: string;
  phonetic: string;
  exampleSentence: string;
  exampleTranslation: string;
}

export interface AIRecommendation {
  id: string;
  summaryPt: string;
  weakWords: string[];
  recommendedCategories: string[];
  difficultySuggestion: DifficultyTier;
  practiceTipPt: string;
  newVocabularyExamples: VocabularyExample[];
  source: 'gemini' | 'local_analysis';
  modelName?: string;
  fallbackReason?: string;
  createdAt: string;
}

export type ImplementationStatus =
  | 'Implementada'
  | 'Parcialmente implementada'
  | 'Planeada'
  | 'Não implementada';

export interface AuditedFeature {
  id: string;
  name: string;
  category: string;
  status: ImplementationStatus;
  evidence: string;
  notes: string;
}

export interface AuditedEndpoint {
  method: string;
  path: string;
  authRequired: boolean;
  purpose: string;
}

export interface AuditedTestEntry {
  id: string;
  group: string;
  name: string;
  objective: string;
  procedure: string;
  expectedResult: string;
  obtainedResult: string;
  status: 'Aprovado' | 'Não executado';
  executionMethod: string;
}

export interface GeneratedReportRecord {
  id: string;
  filename: string;
  appVersion: string;
  generatedAt: string;
  sizeBytes: number;
  pageCount: number;
  implementedCount: number;
  partialCount: number;
  plannedCount: number;
  notImplementedCount: number;
}

export interface ProjectDocumentationAudit {
  appName: string;
  appDescription: string;
  appVersion: string;
  auditedAt: string;
  stack: {
    frontend: string[];
    backend: string[];
    database: string;
    aiModels: {
      textPrimary: string;
      textFallback: string;
      ttsPrimary: string;
      ttsFallback: string;
      audioCacheVersion: string;
    };
  };
  metrics: {
    totalSourceFiles: number;
    frontendComponentCount: number;
    backendModuleCount: number;
    catalogWordCount: number;
    catalogCategories: Array<{ category: string; count: number }>;
    cachedWavV2Count: number;
    sqliteTables: string[];
    implementedLevels: number[];
    plannedLevels: number[];
    automatedTestCount: number;
    geminiConfigured: boolean;
  };
  structureSummary: Array<{ area: string; files: string[] }>;
  features: AuditedFeature[];
  endpoints: AuditedEndpoint[];
  automatedTests: AuditedTestEntry[];
  promptExtracts: Array<{ title: string; location: string; excerpt: string }>;
}

export type AppView =
  | 'landing'
  | 'register'
  | 'login'
  | 'profile_setup'
  | 'dashboard'
  | 'levels'
  | 'exercise'
  | 'recovery'
  | 'results'
  | 'history'
  | 'settings'
  | 'documentation';
