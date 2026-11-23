import React from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Heart,
  RotateCcw,
  Unlock,
  Volume2,
  XCircle,
} from 'lucide-react';
import type { AppView, AttemptSubmissionResult } from '../types/learnmatch.ts';
import { playEnglishWord } from '../utils/audio.ts';

interface ResultsViewProps {
  result: AttemptSubmissionResult;
  onStartExercise: (level: number, forceFresh?: boolean) => void;
  onStartRecovery: () => void;
  onNavigate: (view: AppView) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  result,
  onStartExercise,
  onStartRecovery,
  onNavigate,
}) => {
  const { attempt, user, newlyUnlockedLevel, newRewards, nextRecommendedAction, endedByZeroLives } =
    result;
  const totalAnswered = attempt.answers.length || 10;
  const isZeroLives = Boolean(endedByZeroLives) || user.lives <= 0;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      {/* Main Outcome Banner */}
      <section
        className={`rounded-2xl border p-6 sm:p-8 ${
          attempt.passed
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-sm font-bold">
              {attempt.passed ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                  <span className="text-emerald-800">Aprovado no Nível {attempt.level}</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-amber-800" aria-hidden="true" />
                  <span className="text-amber-900">
                    {endedByZeroLives
                      ? `Sessão terminada por falta de vidas (Nível ${attempt.level})`
                      : `Não aprovado no Nível ${attempt.level}`}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {attempt.passed
                ? 'Excelente progresso na sua aprendizagem!'
                : endedByZeroLives
                  ? 'As suas vidas chegaram a zero nesta sessão'
                  : 'Continue a praticar — está quase lá!'}
            </h1>
            <p className="text-sm text-slate-700">
              {attempt.passed
                ? 'Atingiu o critério mínimo de 6 respostas corretas em 10 perguntas.'
                : endedByZeroLives
                  ? 'A tentativa, a pontuação obtida e as respostas dadas até ao momento foram guardadas no seu histórico.'
                  : 'São necessárias pelo menos 6 respostas corretas em 10 para aprovar neste nível.'}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 text-center shrink-0">
            <div className="text-xs font-medium text-slate-500">Aproveitamento</div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono-num">
              {attempt.percentage}%
            </div>
            <div className="text-xs font-semibold text-blue-700 font-mono-num">
              +{attempt.score} pontos
            </div>
          </div>
        </div>
      </section>

      {/* Score Breakdown Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Pontuação final</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 font-mono-num">
            {attempt.score} pts
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Respostas corretas</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 font-mono-num">
            {attempt.correctCount}/{totalAnswered}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Respostas incorretas</div>
          <div className="mt-1 text-2xl font-bold text-red-700 font-mono-num">
            {attempt.incorrectCount}/{totalAnswered}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Duração</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 font-mono-num">
            {attempt.durationSeconds}s
          </div>
        </div>
      </section>

      {isZeroLives && (
        <section
          role="alert"
          className="bg-amber-50 border border-amber-300 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-amber-900">
              <Heart className="w-4 h-4 text-rose-600" aria-hidden="true" />
              <span>Vidas atuais: 0/{user.maxLives}</span>
            </div>
            <p className="text-sm text-amber-950 font-medium">
              Ficámos sem vidas! Não desistas. Faz um desafio de recuperação para ganhares mais
              vidas e continuares a aprender.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onStartRecovery}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors cursor-pointer"
            >
              <Heart className="w-4 h-4" aria-hidden="true" />
              Recuperar Vidas
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Voltar ao Painel
            </button>
          </div>
        </section>
      )}

      {/* Newly Unlocked Level or New Rewards */}
      {(newlyUnlockedLevel || newRewards.length > 0) && (
        <section className="bg-white border border-blue-200 rounded-2xl p-6 space-y-4">
          {newlyUnlockedLevel && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Unlock className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Nível {newlyUnlockedLevel} desbloqueado!
                </h2>
                <p className="text-sm text-slate-600">
                  {newlyUnlockedLevel === 2
                    ? 'Já pode avançar para o Nível 2 (Imagem → Palavra).'
                    : 'Concluiu os níveis principais do MVP com sucesso.'}
                </p>
              </div>
            </div>
          )}

          {newRewards.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
                <Award className="w-4 h-4 text-amber-600" aria-hidden="true" />
                <span>Recompensas conquistadas nesta sessão</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {newRewards.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="font-bold text-sm text-amber-950">{r.title}</div>
                    <div className="text-xs text-amber-800">{r.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Next Recommended Action */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-blue-700">Próxima ação recomendada</div>
          <h2 className="mt-0.5 text-lg font-bold text-slate-900">
            {nextRecommendedAction.title}
          </h2>
          <p className="text-sm text-slate-600">{nextRecommendedAction.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {isZeroLives ? (
            <>
              <button
                type="button"
                onClick={onStartRecovery}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors cursor-pointer"
              >
                <Heart className="w-4 h-4" aria-hidden="true" />
                Recuperar Vidas
              </button>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Voltar ao Painel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onStartExercise(attempt.level, true)}
                className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                Repetir Nível {attempt.level}
              </button>

              <button
                type="button"
                onClick={() => onStartExercise(nextRecommendedAction.targetLevel, false)}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 transition-colors cursor-pointer"
              >
                {nextRecommendedAction.title}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </section>

      {/* Question-by-Question Review */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Revisão detalhada ({attempt.answers.length}{' '}
            {attempt.answers.length === 1 ? 'pergunta respondida' : 'perguntas respondidas'})
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer"
          >
            Voltar ao Painel
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {attempt.answers.map((ans, idx) => (
            <div
              key={ans.questionId}
              className="py-3 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                {ans.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
                )}
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {idx + 1}. {ans.word}{' '}
                    <span className="font-normal text-slate-500">({ans.translation})</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {ans.isCorrect
                      ? `Selecionou ${ans.selectedAnswer} · Correto`
                      : `Selecionou ${ans.selectedAnswer} · Correto: ${ans.correctAnswer}`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => playEnglishWord(ans.word)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                Ouvir
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};
