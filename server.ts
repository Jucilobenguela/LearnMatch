import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import type { AgeGroup, QuestionAnswerInput, UserProfile } from './src/types/learnmatch.ts';
import {
  authenticateUser,
  createRecoveryChallenge,
  createSession,
  createUser,
  deleteSession,
  getLatestAIRecommendation,
  getLevelsForUser,
  getUserAttempts,
  getUserByEmail,
  getUserBySessionToken,
  getUserWordStats,
  submitAttempt,
  submitQuestionAnswer,
  submitRecoveryChallenge,
  updateUserProfile,
} from './server/db.ts';
import {
  generatePedagogicalRecommendations,
  getOrGenerateExerciseBatch,
  getOrGenerateWordAudioResult,
} from './server/geminiService.ts';

interface AuthenticatedRequest extends Request {
  user?: UserProfile;
  sessionToken?: string;
}

const SESSION_COOKIE_NAME = 'lm_session';
const VALID_AGE_GROUPS: AgeGroup[] = ['child_6_10', 'teen_11_17', 'adult_18_plus'];

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const val = decodeURIComponent(part.slice(idx + 1).trim());
      cookies[key] = val;
    }
  }
  return cookies;
}

function isHttpsRequest(req: Request): boolean {
  if (req.secure) return true;
  const forwarded = req.headers['x-forwarded-proto'];
  if (typeof forwarded === 'string') {
    const proto = forwarded.split(',')[0].trim().toLowerCase();
    if (proto === 'https') return true;
  }
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.startsWith('https://')) {
    return true;
  }
  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer.startsWith('https://')) {
    return true;
  }
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const isLoopback = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  if (!isLoopback && process.env.APP_URL?.startsWith('https://')) {
    return true;
  }
  return false;
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const maxAge = 7 * 24 * 60 * 60;
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAge}`,
  ];
  if (isHttpsRequest(req)) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const parts = [`${SESSION_COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'Max-Age=0'];
  if (isHttpsRequest(req)) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function extractSessionToken(req: Request): string {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] || '';
}

function verifyMutationOrigin(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }

  // Allow Bearer-authenticated API requests directly
  if (req.headers.authorization?.startsWith('Bearer ')) {
    next();
    return;
  }

  // Verify X-Requested-With or same-host Origin for cookie-authenticated mutations
  const customHeader = req.headers['x-requested-with'];
  if (customHeader === 'LearnMatch') {
    next();
    return;
  }

  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) {
        next();
        return;
      }
    } catch {
      // fall through
    }
  }

  // Allow non-browser server-to-server/curl calls without Origin header when no cross-origin Origin is sent
  if (!origin) {
    next();
    return;
  }

  res.status(403).json({ error: 'Pedido bloqueado pela verificação de origem.' });
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractSessionToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sessão não iniciada. Por favor inicie sessão.' });
    return;
  }
  const user = getUserBySessionToken(token);
  if (!user) {
    res.status(401).json({ error: 'Sessão expirada ou inválida. Inicie sessão novamente.' });
    return;
  }
  req.user = user;
  req.sessionToken = token;
  next();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', verifyMutationOrigin);

  app.get('/api/health', (_req, res) => {
    const geminiConfigured = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
    );
    res.json({
      status: 'ok',
      app: 'LearnMatch',
      geminiConfigured,
      timestamp: new Date().toISOString(),
    });
  });

  // Register
  app.post('/api/auth/register', (req, res) => {
    try {
      const { email, password, displayName } = req.body as {
        email?: string;
        password?: string;
        displayName?: string;
      };

      if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
        res.status(400).json({ error: 'Introduza um endereço de e-mail válido.' });
        return;
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        res.status(400).json({ error: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
        return;
      }
      if (password.length > 128) {
        res.status(400).json({ error: 'A palavra-passe excede o limite permitido.' });
        return;
      }

      const existing = getUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: 'Já existe uma conta registada com este e-mail.' });
        return;
      }

      const safeDisplayName =
        typeof displayName === 'string' && displayName.trim().length >= 2
          ? displayName.trim().slice(0, 40)
          : '';

      const user = createUser(email, password, safeDisplayName);
      const session = createSession(user.id);
      setSessionCookie(req, res, session.token);

      res.status(201).json({ user, token: session.token });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta.';
      res.status(500).json({ error: message });
    }
  });

  // Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
        res.status(400).json({ error: 'Preencha o e-mail e a palavra-passe.' });
        return;
      }

      const user = authenticateUser(email, password);
      if (!user) {
        res.status(401).json({ error: 'E-mail ou palavra-passe incorretos.' });
        return;
      }

      const session = createSession(user.id);
      setSessionCookie(req, res, session.token);
      res.json({ user, token: session.token });
    } catch {
      res.status(500).json({ error: 'Erro interno ao iniciar sessão.' });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const token = extractSessionToken(req);
    if (token) {
      deleteSession(token);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // Current user
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user, token: req.sessionToken });
  });

  // Profile creation & settings update
  app.put('/api/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const { displayName, ageGroup } = req.body as {
      displayName?: string;
      ageGroup?: AgeGroup;
    };

    if (
      !displayName ||
      typeof displayName !== 'string' ||
      displayName.trim().length < 2 ||
      displayName.trim().length > 40
    ) {
      res.status(400).json({ error: 'O nome ou pseudónimo deve ter entre 2 e 40 caracteres.' });
      return;
    }

    if (!ageGroup || !VALID_AGE_GROUPS.includes(ageGroup)) {
      res.status(400).json({ error: 'Selecione uma faixa etária válida.' });
      return;
    }

    // Note: ageGroup is stored strictly for profile personalization; never used to auto-set level.
    const updated = updateUserProfile(req.user!.id, displayName, ageGroup);
    res.json({ user: updated });
  });

  // Legacy direct-recovery endpoint disabled: requires completing a 5-question recovery challenge
  app.post('/api/profile/recover-life', requireAuth, (_req: AuthenticatedRequest, res) => {
    res.status(400).json({
      error: 'A recuperação de vidas requer concluir o Desafio de Recuperação (4 ou 5 corretas em 5).',
    });
  });

  // Independent 5-question Life Recovery Challenge (reuses local catalog, 0 Gemini calls)
  app.post('/api/recovery/start', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const challenge = createRecoveryChallenge(req.user!.id);
      res.status(201).json({ challenge });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao iniciar desafio de recuperação.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/recovery/submit', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { challengeId, answers } = req.body as {
        challengeId?: string;
        answers?: QuestionAnswerInput[];
      };

      if (!challengeId || typeof challengeId !== 'string') {
        res.status(400).json({ error: 'Identificador do desafio em falta.' });
        return;
      }
      if (!Array.isArray(answers) || answers.length !== 5) {
        res.status(400).json({ error: 'O desafio de recuperação requer exatamente 5 respostas.' });
        return;
      }

      const result = submitRecoveryChallenge({
        userId: req.user!.id,
        challengeId,
        answers,
      });

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao validar desafio de recuperação.';
      const status = message.includes('Acesso negado')
        ? 403
        : message.includes('já foi concluído')
          ? 409
          : 400;
      res.status(status).json({ error: message });
    }
  });

  // Levels & roadmap
  app.get('/api/levels', requireAuth, (req: AuthenticatedRequest, res) => {
    const levels = getLevelsForUser(req.user!);
    res.json({ levels });
  });

  // Generate or retrieve a 10-question batch (Gemini AI + cache + strict validation)
  app.post('/api/exercises/generate', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.lives <= 0) {
        res.status(403).json({
          error:
            'Ficámos sem vidas! Faz um desafio de recuperação para ganhares mais vidas e continuares a aprender.',
        });
        return;
      }

      const { level, forceFresh, focusWeakWords } = req.body as {
        level?: number;
        forceFresh?: boolean;
        focusWeakWords?: boolean;
      };
      const parsedLevel = Number(level);
      if (!Number.isInteger(parsedLevel) || (parsedLevel !== 1 && parsedLevel !== 2)) {
        res.status(400).json({ error: 'Apenas os Níveis 1 e 2 estão disponíveis para prática.' });
        return;
      }

      if (!req.user!.unlockedLevels.includes(parsedLevel)) {
        res.status(403).json({
          error: `O Nível ${parsedLevel} ainda está bloqueado. Conclua o nível anterior com pelo menos 6/10 respostas corretas.`,
        });
        return;
      }

      const batch = await getOrGenerateExerciseBatch({
        userId: req.user!.id,
        level: parsedLevel,
        forceFresh: Boolean(forceFresh),
        focusWeakWords: Boolean(focusWeakWords),
      });

      res.json({ batch });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao preparar exercícios.';
      res.status(500).json({ error: message });
    }
  });

  // Validate a single exercise answer immediately and update lives idempotently
  app.post('/api/exercises/answer', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { batchId, questionId, selectedAnswer, durationSeconds } = req.body as {
        batchId?: string;
        questionId?: string;
        selectedAnswer?: string;
        durationSeconds?: number;
      };

      if (!batchId || typeof batchId !== 'string') {
        res.status(400).json({ error: 'Identificador do lote em falta.' });
        return;
      }
      if (!questionId || typeof questionId !== 'string') {
        res.status(400).json({ error: 'Identificador da pergunta em falta.' });
        return;
      }
      if (!selectedAnswer || typeof selectedAnswer !== 'string') {
        res.status(400).json({ error: 'Selecione uma alternativa válida.' });
        return;
      }

      const result = submitQuestionAnswer({
        userId: req.user!.id,
        batchId,
        questionId,
        selectedAnswer,
        durationSeconds: Number(durationSeconds) || 1,
      });

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao validar resposta.';
      const status =
        message.includes('sem vidas') || message.includes('já foi concluída') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  });

  // Submit completed 10-question attempt
  app.post('/api/attempts', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { batchId, level, answers, durationSeconds } = req.body as {
        batchId?: string;
        level?: number;
        answers?: QuestionAnswerInput[];
        durationSeconds?: number;
      };

      if (!batchId || typeof batchId !== 'string') {
        res.status(400).json({ error: 'Identificador do lote em falta.' });
        return;
      }
      const parsedLevel = Number(level);
      if (!Number.isInteger(parsedLevel) || (parsedLevel !== 1 && parsedLevel !== 2)) {
        res.status(400).json({ error: 'Nível inválido.' });
        return;
      }
      if (!Array.isArray(answers) || answers.length === 0 || answers.length > 10) {
        res.status(400).json({ error: 'O conjunto de respostas submetido é inválido.' });
        return;
      }

      const result = submitAttempt({
        userId: req.user!.id,
        batchId,
        level: parsedLevel,
        answers,
        durationSeconds: Number(durationSeconds) || 0,
      });

      res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao registar tentativa.';
      res.status(400).json({ error: message });
    }
  });

  // User attempt history
  app.get('/api/attempts', requireAuth, (req: AuthenticatedRequest, res) => {
    const attempts = getUserAttempts(req.user!.id);
    res.json({ attempts });
  });

  // User word stats & progress summary
  app.get('/api/stats', requireAuth, (req: AuthenticatedRequest, res) => {
    const attempts = getUserAttempts(req.user!.id);
    const wordStats = getUserWordStats(req.user!.id);
    const levels = getLevelsForUser(req.user!);
    const latestRecommendation = getLatestAIRecommendation(req.user!.id);

    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter((a) => a.passed).length;
    const avgPercentage =
      totalAttempts > 0
        ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts)
        : 0;

    res.json({
      summary: {
        totalAttempts,
        passedAttempts,
        avgPercentage,
        masteredWords: wordStats.filter((w) => w.correctCount > 0 && w.incorrectCount === 0).length,
        weakWordsCount: wordStats.filter((w) => w.incorrectCount > w.correctCount).length,
      },
      wordStats,
      levels,
      latestRecommendation,
    });
  });

  // AI Pedagogical Recommendations
  app.get('/api/ai/recommendations', requireAuth, (req: AuthenticatedRequest, res) => {
    const recommendation = getLatestAIRecommendation(req.user!.id);
    res.json({ recommendation });
  });

  app.post('/api/ai/recommendations', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const recommendation = await generatePedagogicalRecommendations(req.user!.id);
      res.json({ recommendation });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar recomendações.';
      res.status(500).json({ error: message });
    }
  });

  // Cached Gemini TTS Pronunciation endpoint
  app.get('/api/audio/speak', requireAuth, async (req, res) => {
    const word = String(req.query.word ?? '').trim();
    if (!word || !/^[a-zA-Z ]{1,32}$/.test(word)) {
      res.status(400).json({ error: 'Palavra inválida para pronúncia.' });
      return;
    }

    const result = await getOrGenerateWordAudioResult(word);
    if (!result) {
      res.status(404).json({ error: 'Áudio Gemini indisponível neste momento.' });
      return;
    }

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Audio-Cache', result.cacheStatus);
    res.setHeader('X-Audio-Version', result.version);
    res.setHeader('X-Audio-Filename', result.filename);
    res.send(result.wavBuffer);
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`LearnMatch server running on http://0.0.0.0:${port}`);
  });
}

// Start only if executed directly (not when imported by test runner)
const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isMainModule) {
  startServer().catch((err) => {
    console.error('Failed to start LearnMatch server:', err);
    process.exit(1);
  });
}
