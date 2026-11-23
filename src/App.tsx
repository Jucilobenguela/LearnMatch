import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { AuthViews } from './components/AuthViews.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ExerciseSessionView } from './components/ExerciseSessionView.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { LevelsView } from './components/LevelsView.tsx';
import { RecoveryChallengeView } from './components/RecoveryChallengeView.tsx';
import { ResultsView } from './components/ResultsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { TopNav } from './components/TopNav.tsx';
import { setAudioAuthToken } from './utils/audio.ts';
import type {
  AIRecommendation,
  AppView,
  AttemptRecord,
  AttemptSubmissionResult,
  ExerciseBatch,
  LevelDefinition,
  QuestionAnswerInput,
  QuestionAnswerResult,
  RecoveryChallenge,
  RecoveryChallengeResult,
  UserProfile,
  WordStat,
} from './types/learnmatch.ts';

export default function App() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('landing');

  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [wordStats, setWordStats] = useState<WordStat[]>([]);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);

  const [activeBatch, setActiveBatch] = useState<ExerciseBatch | null>(null);
  const [lastResult, setLastResult] = useState<AttemptSubmissionResult | null>(null);
  const [activeRecoveryChallenge, setActiveRecoveryChallenge] =
    useState<RecoveryChallenge | null>(null);
  const [recoveryResult, setRecoveryResult] = useState<RecoveryChallengeResult | null>(null);

  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [submittingRecovery, setSubmittingRecovery] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const buildHeaders = useCallback(
    (tokenOverride?: string | null, withJson = false): Record<string, string> => {
      const headers: Record<string, string> = {
        'X-Requested-With': 'LearnMatch',
      };
      if (withJson) {
        headers['Content-Type'] = 'application/json';
      }
      const activeToken = tokenOverride !== undefined ? tokenOverride : authToken;
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }
      return headers;
    },
    [authToken],
  );

  const loadDashboardData = useCallback(
    async (tokenOverride?: string | null) => {
      try {
        const headers = buildHeaders(tokenOverride, false);
        const [attemptsRes, statsRes] = await Promise.all([
          fetch('/api/attempts', { credentials: 'include', headers }),
          fetch('/api/stats', { credentials: 'include', headers }),
        ]);

        if (attemptsRes.ok) {
          const attemptsJson = (await attemptsRes.json()) as { attempts: AttemptRecord[] };
          setAttempts(attemptsJson.attempts || []);
        }
        if (statsRes.ok) {
          const statsJson = (await statsRes.json()) as {
            levels: LevelDefinition[];
            wordStats: WordStat[];
            latestRecommendation: AIRecommendation | null;
          };
          setLevels(statsJson.levels || []);
          setWordStats(statsJson.wordStats || []);
          setRecommendation(statsJson.latestRecommendation || null);
        }
      } catch {
        // Non-fatal dashboard sync failure
      }
    },
    [buildHeaders],
  );

  // Restore session across page reloads via HttpOnly cookie
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = (await res.json()) as { user?: UserProfile; token?: string };
          if (active && data.user) {
            setUser(data.user);
            if (data.token) {
              setAuthToken(data.token);
              setAudioAuthToken(data.token);
            }
            if (!data.user.profileCompleted) {
              setView('profile_setup');
            } else {
              setView('dashboard');
              await loadDashboardData(data.token ?? null);
            }
          }
        }
      } catch {
        // Stay on landing
      } finally {
        if (active) setBootstrapping(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadDashboardData]);

  const handleAuthSuccess = async (
    authenticatedUser: UserProfile,
    token?: string | null,
  ) => {
    setGlobalError(null);
    const nextToken = token !== undefined ? token : authToken;
    if (token !== undefined) {
      setAuthToken(token);
      setAudioAuthToken(token);
    }
    setUser(authenticatedUser);
    if (!authenticatedUser.profileCompleted) {
      setView('profile_setup');
    } else {
      setView('dashboard');
      await loadDashboardData(nextToken);
    }
  };

  const handleLogout = async () => {
    setGlobalError(null);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: buildHeaders(undefined, false),
        credentials: 'include',
      });
    } catch {
      // Clear local state anyway
    }
    setAuthToken(null);
    setAudioAuthToken(null);
    setUser(null);
    setLevels([]);
    setAttempts([]);
    setWordStats([]);
    setRecommendation(null);
    setActiveBatch(null);
    setLastResult(null);
    setActiveRecoveryChallenge(null);
    setRecoveryResult(null);
    setView('landing');
  };

  const handleStartExercise = async (
    level: number,
    forceFresh = false,
    focusWeakWords = false,
  ) => {
    setGlobalError(null);
    if (user && user.lives <= 0) {
      setGlobalError(
        'Ficámos sem vidas! Faz um desafio de recuperação para ganhares mais vidas e continuares a aprender.',
      );
      return;
    }
    setExerciseLoading(true);
    try {
      const res = await fetch('/api/exercises/generate', {
        method: 'POST',
        headers: buildHeaders(undefined, true),
        credentials: 'include',
        body: JSON.stringify({ level, forceFresh, focusWeakWords }),
      });
      const data = (await res.json()) as { batch?: ExerciseBatch; error?: string };
      if (!res.ok || !data.batch) {
        setGlobalError(data.error || 'Não foi possível carregar os exercícios.');
        return;
      }
      setActiveBatch(data.batch);
      setLastResult(null);
      setView('exercise');
    } catch {
      setGlobalError('Erro de ligação ao preparar os exercícios.');
    } finally {
      setExerciseLoading(false);
    }
  };

  const handleAnswerQuestion = async (
    questionId: string,
    selectedAnswer: string,
    durationSeconds: number,
  ): Promise<QuestionAnswerResult | null> => {
    if (!activeBatch) return null;
    try {
      const res = await fetch('/api/exercises/answer', {
        method: 'POST',
        headers: buildHeaders(undefined, true),
        credentials: 'include',
        body: JSON.stringify({
          batchId: activeBatch.id,
          questionId,
          selectedAnswer,
          durationSeconds,
        }),
      });
      const data = (await res.json()) as QuestionAnswerResult & { error?: string };
      if (!res.ok || !data.user) {
        setGlobalError(data.error || 'Não foi possível validar a resposta.');
        return null;
      }
      setUser(data.user);
      if (data.gameOver && data.attemptResult) {
        setLastResult(data.attemptResult);
        setActiveBatch(null);
        setView('results');
        await loadDashboardData();
      }
      return data;
    } catch {
      setGlobalError('Erro de ligação ao validar a resposta.');
      return null;
    }
  };

  const handleSubmitAttempt = async (
    answers: QuestionAnswerInput[],
    durationSeconds: number,
  ) => {
    if (!activeBatch) return;
    setGlobalError(null);
    setSubmittingAttempt(true);
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: buildHeaders(undefined, true),
        credentials: 'include',
        body: JSON.stringify({
          batchId: activeBatch.id,
          level: activeBatch.level,
          answers,
          durationSeconds,
        }),
      });
      const data = (await res.json()) as AttemptSubmissionResult & { error?: string };
      if (!res.ok || !data.attempt) {
        setGlobalError(data.error || 'Não foi possível guardar os resultados.');
        return;
      }
      setUser(data.user);
      setLastResult(data);
      setView('results');
      await loadDashboardData();
    } catch {
      setGlobalError('Erro ao guardar a tentativa no servidor.');
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const handleRequestAIRecommendation = async () => {
    setGlobalError(null);
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: buildHeaders(undefined, true),
        credentials: 'include',
      });
      const data = (await res.json()) as {
        recommendation?: AIRecommendation;
        error?: string;
      };
      if (!res.ok || !data.recommendation) {
        setGlobalError(data.error || 'Erro ao gerar recomendações de IA.');
        return;
      }
      setRecommendation(data.recommendation);
    } catch {
      setGlobalError('Erro ao contactar o serviço de Inteligência Artificial.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleStartRecoveryChallenge = async () => {
    setGlobalError(null);
    setRecoveryLoading(true);
    try {
      const res = await fetch('/api/recovery/start', {
        method: 'POST',
        headers: buildHeaders(undefined, false),
        credentials: 'include',
      });
      const data = (await res.json()) as { challenge?: RecoveryChallenge; error?: string };
      if (!res.ok || !data.challenge) {
        setGlobalError(data.error || 'Não foi possível iniciar o desafio de recuperação.');
        return;
      }
      setRecoveryResult(null);
      setActiveRecoveryChallenge(data.challenge);
      setView('recovery');
    } catch {
      setGlobalError('Erro de ligação ao preparar o desafio de recuperação.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleSubmitRecoveryChallenge = async (
    challengeId: string,
    answers: QuestionAnswerInput[],
  ) => {
    setGlobalError(null);
    setSubmittingRecovery(true);
    try {
      const res = await fetch('/api/recovery/submit', {
        method: 'POST',
        headers: buildHeaders(undefined, true),
        credentials: 'include',
        body: JSON.stringify({ challengeId, answers }),
      });
      const data = (await res.json()) as RecoveryChallengeResult & { error?: string };
      if (!res.ok || !data.user) {
        setGlobalError(data.error || 'Não foi possível validar o desafio de recuperação.');
        return;
      }
      setUser(data.user);
      setRecoveryResult(data);
    } catch {
      setGlobalError('Erro ao concluir o desafio de recuperação.');
    } finally {
      setSubmittingRecovery(false);
    }
  };

  const handleNavigate = (nextView: AppView) => {
    setGlobalError(null);
    if (
      !user &&
      nextView !== 'landing' &&
      nextView !== 'login' &&
      nextView !== 'register'
    ) {
      setView('login');
      return;
    }
    if (user && !user.profileCompleted && nextView !== 'profile_setup') {
      setView('profile_setup');
      return;
    }
    setView(nextView);
  };

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-blue-700" aria-hidden="true" />
          <span className="text-sm font-medium">A carregar LearnMatch...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <TopNav
        user={user}
        currentView={view}
        onNavigate={handleNavigate}
        onStartRecommended={() =>
          handleStartExercise(user?.currentLevel || 1, false)
        }
        onStartRecovery={handleStartRecoveryChallenge}
      />

      {globalError && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4">
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{globalError}</span>
            </div>
            <button
              type="button"
              onClick={() => setGlobalError(null)}
              className="text-xs font-semibold underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {exerciseLoading && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-center shadow-lg space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-700 mx-auto" aria-hidden="true" />
            <h2 className="font-bold text-slate-900">A preparar 10 exercícios...</h2>
            <p className="text-xs text-slate-600">
              A validar perguntas, ilustrações e adaptação pedagógica para o seu nível.
            </p>
          </div>
        </div>
      )}

      {view === 'landing' && <LandingPage onNavigate={handleNavigate} />}

      {(view === 'register' || view === 'login' || view === 'profile_setup') && (
        <AuthViews
          mode={view}
          user={user}
          authToken={authToken}
          onAuthSuccess={handleAuthSuccess}
          onNavigate={handleNavigate}
        />
      )}

      {view === 'dashboard' && user && (
        <DashboardView
          user={user}
          levels={levels}
          attempts={attempts}
          wordStats={wordStats}
          recommendation={recommendation}
          aiLoading={aiLoading}
          recoveryLoading={recoveryLoading}
          onStartExercise={handleStartExercise}
          onRequestAIRecommendation={handleRequestAIRecommendation}
          onStartRecovery={handleStartRecoveryChallenge}
          onNavigate={handleNavigate}
        />
      )}

      {view === 'levels' && user && (
        <LevelsView
          levels={levels}
          userLives={user.lives}
          onStartExercise={handleStartExercise}
          onStartRecovery={handleStartRecoveryChallenge}
          onNavigate={handleNavigate}
        />
      )}

      {view === 'exercise' && user && activeBatch && (
        <ExerciseSessionView
          user={user}
          batch={activeBatch}
          submitting={submittingAttempt}
          onAnswerQuestion={handleAnswerQuestion}
          onExitToDashboard={() => handleNavigate('dashboard')}
          onSubmitAttempt={handleSubmitAttempt}
        />
      )}

      {view === 'recovery' && user && activeRecoveryChallenge && (
        <RecoveryChallengeView
          user={user}
          challenge={activeRecoveryChallenge}
          submitting={submittingRecovery}
          result={recoveryResult}
          onSubmitChallenge={handleSubmitRecoveryChallenge}
          onRetryNewChallenge={handleStartRecoveryChallenge}
          onReturnToDashboard={() => {
            setActiveRecoveryChallenge(null);
            setRecoveryResult(null);
            handleNavigate('dashboard');
          }}
        />
      )}

      {view === 'results' && lastResult && (
        <ResultsView
          result={lastResult}
          onStartExercise={handleStartExercise}
          onStartRecovery={handleStartRecoveryChallenge}
          onNavigate={handleNavigate}
        />
      )}

      {view === 'history' && user && (
        <HistoryView
          user={user}
          attempts={attempts}
          wordStats={wordStats}
          recommendation={recommendation}
          onNavigate={handleNavigate}
        />
      )}

      {view === 'settings' && user && (
        <SettingsView
          user={user}
          authToken={authToken}
          attempts={attempts}
          wordStats={wordStats}
          recommendation={recommendation}
          onUserUpdated={(updated) => setUser(updated)}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
