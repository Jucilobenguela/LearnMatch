import React from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Heart,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import type {
  AIRecommendation,
  AppView,
  AttemptRecord,
  LevelDefinition,
  UserProfile,
  WordStat,
} from '../types/learnmatch.ts';
import { playEnglishWord } from '../utils/audio.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface DashboardViewProps {
  user: UserProfile;
  levels: LevelDefinition[];
  attempts: AttemptRecord[];
  wordStats: WordStat[];
  recommendation: AIRecommendation | null;
  aiLoading: boolean;
  recoveryLoading: boolean;
  onStartExercise: (level: number, forceFresh?: boolean, focusWeakWords?: boolean) => void;
  onRequestAIRecommendation: () => void;
  onStartRecovery: () => void;
  onNavigate: (view: AppView) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  levels,
  attempts,
  wordStats,
  recommendation,
  aiLoading,
  recoveryLoading,
  onStartExercise,
  onRequestAIRecommendation,
  onStartRecovery,
  onNavigate,
}) => {
  const level1 = levels.find((l) => l.level === 1);
  const level2 = levels.find((l) => l.level === 2);

  const passedLevel1 = (level1?.passedCount ?? 0) > 0;
  const passedLevel2 = (level2?.passedCount ?? 0) > 0;

  // Determine clear next pedagogical step
  const nextTargetLevel = !passedLevel1 ? 1 : 2;
  const nextStepTitle = !passedLevel1
    ? 'Iniciar ou concluir o Nível 1 (Áudio → Imagem)'
    : !passedLevel2
      ? 'Avançar para o Nível 2 (Imagem → Palavra)'
      : 'Reforçar vocabulário com a IA Adaptativa (Nível 2)';

  const nextStepDesc = !passedLevel1
    ? 'Acerte pelo menos 6 em 10 perguntas para dominar o reconhecimento auditivo e desbloquear o Nível 2.'
    : !passedLevel2
      ? 'Excelente trabalho no Nível 1! Agora ligue cada imagem à palavra escrita correta.'
      : 'Já concluiu os dois níveis principais! Continue a praticar para consolidar palavras difíceis.';

  const weakWords = wordStats.filter((w) => w.incorrectCount > 0).slice(0, 4);
  const mvpProgressPct = passedLevel2 ? 100 : passedLevel1 ? 50 : attempts.length > 0 ? 25 : 0;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* Welcome & Primary Recommended Action */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-blue-700">
              Painel de Aprendizagem
            </p>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="text-xs font-semibold text-slate-600 hover:text-blue-700 underline underline-offset-2 cursor-pointer"
            >
              Perfil ({user.email})
            </button>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">
            Olá, {user.displayName || 'Estudante'}!
          </h1>
          <p className="mt-2 text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-800">Próximo passo recomendado:</span>{' '}
            {nextStepTitle}. {nextStepDesc}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={user.lives === 0}
            onClick={() => onStartExercise(nextTargetLevel)}
            className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Continuar a Aprender
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onStartRecovery}
            disabled={recoveryLoading}
            className={`inline-flex items-center gap-2 px-5 py-3.5 text-base font-bold rounded-xl transition-colors cursor-pointer ${
              user.lives === 0
                ? 'text-white bg-amber-600 hover:bg-amber-700 ring-4 ring-amber-200'
                : 'text-amber-950 bg-amber-100 border-2 border-amber-300 hover:bg-amber-200'
            }`}
          >
            {recoveryLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <Heart className="w-5 h-5 text-rose-600 fill-rose-600" aria-hidden="true" />
            )}
            Recuperar Vidas
          </button>
        </div>
      </section>

      {user.lives === 0 && (
        <section
          role="alert"
          className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-amber-900">
              <Heart className="w-4 h-4 text-rose-600" aria-hidden="true" />
              <span>0/{user.maxLives} vidas disponíveis</span>
            </div>
            <p className="text-base font-semibold text-amber-950">
              Ficámos sem vidas! Não desistas. Faz um desafio de recuperação para ganhares mais
              vidas e continuares a aprender.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartRecovery}
            disabled={recoveryLoading}
            className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors shrink-0 cursor-pointer"
          >
            {recoveryLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Heart className="w-4 h-4" aria-hidden="true" />
            )}
            Iniciar Desafio de Recuperação
          </button>
        </section>
      )}

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Nível atual</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono-num">
            Nível {user.currentLevel}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {user.unlockedLevels.length} {user.unlockedLevels.length === 1 ? 'nível desbloqueado' : 'níveis desbloqueados'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Pontuação acumulada</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono-num">
            {user.totalPoints} pts
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {user.rewards.length} {user.rewards.length === 1 ? 'recompensa' : 'recompensas'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Vidas disponíveis</div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono-num">
              {user.lives}/{user.maxLives}
            </span>
            <Heart
              className={`w-5 h-5 ${user.lives > 0 ? 'text-rose-600 fill-rose-600' : 'text-slate-300'}`}
              aria-hidden="true"
            />
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {user.lives < user.maxLives ? (
              <button
                type="button"
                onClick={onStartRecovery}
                className="text-amber-800 font-semibold hover:underline cursor-pointer"
              >
                Ganhar +1 vida no desafio →
              </button>
            ) : (
              'Energia completa · 15 min/vida'
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Progresso inicial (N1–N2)</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono-num">
            {mvpProgressPct}%
          </div>
          <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-700 transition-all duration-300"
              style={{ width: `${mvpProgressPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* Active Levels Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Níveis principais de aprendizagem</h2>
          <button
            type="button"
            onClick={() => onNavigate('levels')}
            className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer"
          >
            Ver todos os 7 níveis
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Level 1 */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="h-44 overflow-hidden border-b border-slate-200">
              <ResilientImage
                src="/src/assets/images/level_one_listening_1795466748573.jpg"
                alt="Ilustração do Nível 1 Áudio para Imagem"
                fallbackTitle="Nível 1 — Áudio → Imagem"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-blue-700">Nível 1 · Reconhecimento Auditivo</span>
                  <span className="text-emerald-700">Desbloqueado</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Áudio → Imagem</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Ouça palavras em inglês e escolha a imagem correta entre 4 alternativas.
                  Mínimo de 6/10 para aprovar.
                </p>
                {level1 && level1.attemptsCount > 0 && (
                  <p className="mt-3 text-xs text-slate-500 font-mono-num">
                    Melhor resultado: {level1.bestPercentage}% ({level1.bestScore} pts) · {level1.attemptsCount} tentativa(s)
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={user.lives === 0}
                  onClick={() => onStartExercise(1, false)}
                  className="flex-1 py-3 px-4 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Praticar Nível 1
                </button>
                <button
                  type="button"
                  disabled={user.lives === 0}
                  onClick={() => onStartExercise(1, true)}
                  title="Pedir novo lote gerado pela IA Gemini"
                  className="py-3 px-4 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Novo Lote IA
                </button>
              </div>
            </div>
          </div>

          {/* Level 2 */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="h-44 overflow-hidden border-b border-slate-200 relative">
              <ResilientImage
                src="/src/assets/images/level_two_visual_1795466749318.jpg"
                alt="Ilustração do Nível 2 Imagem para Palavra"
                fallbackTitle="Nível 2 — Imagem → Palavra"
                className={`w-full h-full object-cover ${!level2?.isUnlocked ? 'opacity-50 grayscale' : ''}`}
              />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-blue-700">Nível 2 · Reconhecimento Visual</span>
                  <span className={level2?.isUnlocked ? 'text-emerald-700' : 'text-amber-700'}>
                    {level2?.isUnlocked ? 'Desbloqueado' : 'Bloqueado'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Imagem → Palavra</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Observe a ilustração e selecione a palavra correta em inglês entre quatro opções.
                </p>
                {level2 && level2.attemptsCount > 0 && (
                  <p className="mt-3 text-xs text-slate-500 font-mono-num">
                    Melhor resultado: {level2.bestPercentage}% ({level2.bestScore} pts) · {level2.attemptsCount} tentativa(s)
                  </p>
                )}
              </div>

              <div className="mt-5">
                {level2?.isUnlocked ? (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={user.lives === 0}
                      onClick={() => onStartExercise(2, false)}
                      className="flex-1 py-3 px-4 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Praticar Nível 2
                    </button>
                    <button
                      type="button"
                      disabled={user.lives === 0}
                      onClick={() => onStartExercise(2, true)}
                      className="py-3 px-4 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Novo Lote IA
                    </button>
                  </div>
                ) : (
                  <div className="w-full py-3 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                    Aprova o Nível 1 (≥ 6/10) para desbloquear
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Tutor + Recent Attempts Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gemini Pedagogical Insights */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Tutor Pedagógico Gemini</span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Análise adaptativa e recomendações de revisão
              </h2>
            </div>
            <button
              type="button"
              onClick={onRequestAIRecommendation}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-60 transition-colors shrink-0 cursor-pointer"
            >
              {aiLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
              )}
              {recommendation ? 'Atualizar Análise IA' : 'Gerar Análise IA'}
            </button>
          </div>

          {recommendation ? (
            <div className="mt-4 space-y-4">
              <div className="text-xs text-slate-500">
                Origem:{' '}
                <span className="font-semibold text-slate-700">
                  {recommendation.source === 'gemini'
                    ? `API Gemini (${recommendation.modelName || 'gemini-4-hydrogen'})`
                    : 'Análise Estatística Local'}
                </span>
                {recommendation.fallbackReason && (
                  <span> · {recommendation.fallbackReason}</span>
                )}
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">{recommendation.summaryPt}</p>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Dica prática: </span>
                {recommendation.practiceTipPt}
              </div>

              {recommendation.newVocabularyExamples.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2.5">
                    Novas palavras sugeridas para expandir o vocabulário
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {recommendation.newVocabularyExamples.map((ex) => (
                      <div
                        key={ex.word}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 text-sm">{ex.word}</span>
                            <button
                              type="button"
                              onClick={() => playEnglishWord(ex.word)}
                              aria-label={`Ouvir pronúncia de ${ex.word}`}
                              className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="text-xs text-slate-500">
                            {ex.translation} · {ex.phonetic}
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-slate-700 leading-snug">
                          “{ex.exampleSentence}”
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 p-6 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-sm text-slate-600">
                Conclua pelo menos uma sessão ou clique em <strong>Gerar Análise IA</strong> para
                receber recomendações personalizadas do Gemini com base nas suas respostas.
              </p>
            </div>
          )}

          {weakWords.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Palavras com maior necessidade de revisão
                </h3>
                <button
                  type="button"
                  disabled={user.lives === 0}
                  onClick={() => onStartExercise(nextTargetLevel, true, true)}
                  className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
                >
                  Treinar estas palavras agora →
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {weakWords.map((w) => (
                  <button
                    key={w.word}
                    type="button"
                    onClick={() => playEnglishWord(w.word)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 border border-amber-200 text-amber-900 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {w.word} ({w.translation}) · {w.incorrectCount} erro(s)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Results & Rewards */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Últimos resultados</h2>
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Ver histórico completo
              </button>
            </div>

            {attempts.length === 0 ? (
              <p className="text-sm text-slate-500">
                Ainda não concluiu nenhuma tentativa. Inicie o Nível 1 para registar o seu primeiro
                resultado!
              </p>
            ) : (
              <div className="space-y-3">
                {attempts.slice(0, 4).map((att) => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      {att.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
                      )}
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          Nível {att.level} · {att.passed ? 'Aprovado' : 'Não aprovado'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(att.createdAt).toLocaleDateString('pt-PT')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono-num">
                      <div className="text-sm font-bold text-slate-900">
                        {att.correctCount}/{att.answers.length || 10} ({att.percentage}%)
                      </div>
                      <div className="text-xs text-slate-500">+{att.score} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-amber-600" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-900">Recompensas conquistadas</h2>
            </div>
            {user.rewards.length === 0 ? (
              <p className="text-sm text-slate-500">
                Conclua um exercício para ganhar a sua primeira medalha de progresso.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {user.rewards.map((r) => (
                  <li key={r.id} className="text-sm border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                    <div className="font-semibold text-slate-900">{r.title}</div>
                    <div className="text-xs text-slate-600">{r.description}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};
