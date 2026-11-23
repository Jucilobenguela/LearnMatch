import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileDown,
  Loader2,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import type {
  AIRecommendation,
  AgeGroup,
  AppView,
  AttemptRecord,
  UserProfile,
  WordStat,
} from '../types/learnmatch.ts';
import { exportLearnMatchPdf } from '../utils/pdfReport.ts';

interface SettingsViewProps {
  user: UserProfile;
  authToken: string | null;
  attempts: AttemptRecord[];
  wordStats: WordStat[];
  recommendation: AIRecommendation | null;
  onUserUpdated: (user: UserProfile) => void;
  onLogout: () => void;
  onNavigate: (view: AppView) => void;
}

const AGE_GROUPS: Array<{ value: AgeGroup; label: string }> = [
  { value: 'child_6_10', label: '6 a 10 anos' },
  { value: 'teen_11_17', label: '11 a 17 anos' },
  { value: 'adult_18_plus', label: '18 anos ou mais' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  authToken,
  attempts,
  wordStats,
  recommendation,
  onUserUpdated,
  onLogout,
  onNavigate,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(user.ageGroup || 'adult_18_plus');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const trimmed = displayName.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      setFeedback({
        type: 'err',
        text: 'O nome ou pseudónimo deve ter entre 2 e 40 caracteres.',
      });
      return;
    }

    setSaving(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'LearnMatch',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ displayName: trimmed, ageGroup }),
      });
      const data = (await res.json()) as { user?: UserProfile; error?: string };
      if (!res.ok || !data.user) {
        setFeedback({ type: 'err', text: data.error || 'Erro ao atualizar perfil.' });
        return;
      }
      onUserUpdated(data.user);
      setFeedback({ type: 'ok', text: 'Perfil atualizado com sucesso.' });
    } catch {
      setFeedback({ type: 'err', text: 'Erro de ligação ao servidor.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Voltar ao Painel
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Perfil e Definições</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gerir os seus dados essenciais de aprendizagem, exportar relatórios ou terminar sessão.
        </p>
      </div>

      {/* Edit Profile Form */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900">Dados do perfil</h2>
        <p className="mt-1 text-xs text-slate-500">
          E-mail associado: <span className="font-medium text-slate-700">{user.email}</span>
        </p>

        {feedback && (
          <div
            role="status"
            className={`mt-4 p-3.5 rounded-xl border text-sm flex items-center gap-2 ${
              feedback.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label htmlFor="settings-name" className="block text-sm font-semibold text-slate-800 mb-1.5">
              Nome ou pseudónimo
            </label>
            <input
              id="settings-name"
              type="text"
              required
              minLength={2}
              maxLength={40}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label htmlFor="settings-age" className="block text-sm font-semibold text-slate-800 mb-1.5">
              Faixa etária
            </label>
            <select
              id="settings-age"
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {AGE_GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-500">
              A faixa etária não altera o seu nível pedagógico. A progressão depende apenas do
              desempenho.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar Alterações
          </button>
        </form>
      </section>

      {/* RGPD & Export */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-700" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900">Privacidade (RGPD) e Relatório PDF</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          O LearnMatch armazena exclusivamente o identificador da conta, pseudónimo, faixa etária,
          nível atual, pontuação e histórico de tentativas. Pode descarregar a qualquer momento um
          relatório em PDF com o seu progresso e documentação técnica da aplicação.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => exportLearnMatchPdf({ user, attempts, wordStats, recommendation })}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4" aria-hidden="true" />
            Descarregar Relatório PDF
          </button>

          <button
            type="button"
            onClick={() => onNavigate('documentation')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            Documentação do Projeto (PDF Final)
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Terminar Sessão
          </button>
        </div>
      </section>
    </main>
  );
};
