import React from 'react';
import { ArrowLeft, CheckCircle2, Heart, Lock, Play, Sparkles } from 'lucide-react';
import type { AppView, LevelDefinition } from '../types/learnmatch.ts';

interface LevelsViewProps {
  levels: LevelDefinition[];
  userLives: number;
  onStartExercise: (level: number, forceFresh?: boolean) => void;
  onStartRecovery: () => void;
  onNavigate: (view: AppView) => void;
}

export const LevelsView: React.FC<LevelsViewProps> = ({
  levels,
  userLives,
  onStartExercise,
  onStartRecovery,
  onNavigate,
}) => {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar ao Painel
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Percurso Pedagógico (7 Níveis)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Cada nível tem 10 perguntas. Acerte pelo menos 6/10 (60%) para aprovar e desbloquear o
            nível seguinte.
          </p>
        </div>
      </div>

      {userLives <= 0 && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <p className="text-sm font-semibold text-amber-950">
            Ficámos sem vidas! Não desistas. Faz um desafio de recuperação para ganhares mais vidas
            e continuares a aprender.
          </p>
          <button
            type="button"
            onClick={onStartRecovery}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors shrink-0 cursor-pointer"
          >
            <Heart className="w-4 h-4" aria-hidden="true" />
            Recuperar Vidas
          </button>
        </div>
      )}

      <div className="space-y-4">
        {levels.map((lvl) => {
          const canPlay = lvl.isMvpImplemented && lvl.isUnlocked;
          return (
            <div
              key={lvl.level}
              className={`rounded-2xl border p-6 transition-colors ${
                canPlay
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-100/70 border-slate-200/80'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className={canPlay ? 'text-blue-700' : 'text-slate-500'}>
                      {lvl.subtitle}
                    </span>
                    <span aria-hidden="true">·</span>
                    {!lvl.isMvpImplemented ? (
                      <span className="text-slate-500">Previsto na arquitetura (Fase P2)</span>
                    ) : lvl.isUnlocked ? (
                      <span className="text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Desbloqueado
                      </span>
                    ) : (
                      <span className="text-amber-700 inline-flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                        Bloqueado (aprova o Nível {lvl.level - 1})
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-slate-900">{lvl.title}</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{lvl.description}</p>

                  {lvl.attemptsCount > 0 && (
                    <div className="pt-1 text-xs text-slate-500 font-mono-num">
                      Tentativas: {lvl.attemptsCount} · Aprovações: {lvl.passedCount} · Melhor
                      aproveitamento: {lvl.bestPercentage}% ({lvl.bestScore} pts)
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {canPlay ? (
                    <>
                      <button
                        type="button"
                        disabled={userLives <= 0}
                        onClick={() => onStartExercise(lvl.level, false)}
                        className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <Play className="w-4 h-4" aria-hidden="true" />
                        Iniciar Nível {lvl.level}
                      </button>
                      <button
                        type="button"
                        disabled={userLives <= 0}
                        onClick={() => onStartExercise(lvl.level, true)}
                        className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-blue-700" aria-hidden="true" />
                        Gerar Novo Lote IA
                      </button>
                    </>
                  ) : !lvl.isMvpImplemented ? (
                    <span className="px-4 py-2.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl">
                      Em desenvolvimento futuro
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl">
                      <Lock className="w-4 h-4" aria-hidden="true" />
                      Requer aprovação prévia
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
};
