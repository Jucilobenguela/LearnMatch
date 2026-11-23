import React from 'react';
import { ArrowLeft, CheckCircle2, FileDown, Volume2, XCircle } from 'lucide-react';
import type {
  AIRecommendation,
  AppView,
  AttemptRecord,
  UserProfile,
  WordStat,
} from '../types/learnmatch.ts';
import { playEnglishWord } from '../utils/audio.ts';
import { exportLearnMatchPdf } from '../utils/pdfReport.ts';

interface HistoryViewProps {
  user: UserProfile;
  attempts: AttemptRecord[];
  wordStats: WordStat[];
  recommendation: AIRecommendation | null;
  onNavigate: (view: AppView) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  user,
  attempts,
  wordStats,
  recommendation,
  onNavigate,
}) => {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
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
            Histórico de Tentativas e Vocabulário
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Todos os resultados ficam guardados na sua conta entre sessões.
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportLearnMatchPdf({ user, attempts, wordStats, recommendation })}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
        >
          <FileDown className="w-4 h-4" aria-hidden="true" />
          Exportar Relatório PDF
        </button>
      </div>

      {/* Attempts History Table */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Registo de sessões</h2>
        </div>

        {attempts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Ainda não realizou nenhum exercício avaliado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-6">Data</th>
                  <th className="py-3 px-4">Nível</th>
                  <th className="py-3 px-4">Corretas</th>
                  <th className="py-3 px-4">Incorretas</th>
                  <th className="py-3 px-4">Aproveitamento</th>
                  <th className="py-3 px-4">Pontuação</th>
                  <th className="py-3 px-4">Duração</th>
                  <th className="py-3 px-6">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-6 text-slate-700 whitespace-nowrap">
                      {new Date(att.createdAt).toLocaleString('pt-PT')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">Nível {att.level}</td>
                    <td className="py-3.5 px-4 font-mono-num text-emerald-700 font-semibold">
                      {att.correctCount}
                    </td>
                    <td className="py-3.5 px-4 font-mono-num text-red-700 font-semibold">
                      {att.incorrectCount}
                    </td>
                    <td className="py-3.5 px-4 font-mono-num font-semibold text-slate-900">
                      {att.percentage}%
                    </td>
                    <td className="py-3.5 px-4 font-mono-num text-slate-700">+{att.score} pts</td>
                    <td className="py-3.5 px-4 font-mono-num text-slate-500">
                      {att.durationSeconds}s
                    </td>
                    <td className="py-3.5 px-6">
                      {att.passed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          Aprovado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                          <XCircle className="w-4 h-4" aria-hidden="true" />
                          Não aprovado
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Word Mastery Stats */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          Desempenho por palavra (ordenado por necessidade de revisão)
        </h2>

        {wordStats.length === 0 ? (
          <p className="text-sm text-slate-500">
            O desempenho detalhado por palavra aparecerá após concluir a primeira tentativa.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {wordStats.map((w) => (
              <div
                key={w.word}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {w.word}{' '}
                    <span className="font-normal text-slate-500">({w.translation})</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {w.category} ·{' '}
                    <span className="font-mono-num font-semibold text-slate-700">
                      {w.accuracy}% precisão
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono-num mt-0.5">
                    {w.correctCount} acertos / {w.incorrectCount} erros
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => playEnglishWord(w.word)}
                  aria-label={`Ouvir ${w.word}`}
                  className="p-2 text-blue-700 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 transition-colors shrink-0 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};
