import React, { useEffect, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { AgeGroup, AppView, UserProfile } from '../types/learnmatch.ts';

interface AuthViewsProps {
  mode: 'register' | 'login' | 'profile_setup';
  user: UserProfile | null;
  authToken: string | null;
  onAuthSuccess: (user: UserProfile, token?: string | null) => void;
  onNavigate: (view: AppView) => void;
}

const AGE_OPTIONS: Array<{ value: AgeGroup; label: string; desc: string }> = [
  { value: 'child_6_10', label: '6 a 10 anos', desc: 'Crianças em idade escolar inicial' },
  { value: 'teen_11_17', label: '11 a 17 anos', desc: 'Jovens e estudantes' },
  { value: 'adult_18_plus', label: '18 anos ou mais', desc: 'Adultos e aprendizagem contínua' },
];

export const AuthViews: React.FC<AuthViewsProps> = ({
  mode,
  user,
  authToken,
  onAuthSuccess,
  onNavigate,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(user?.ageGroup || 'adult_18_plus');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (mode === 'profile_setup' && user) {
      setDisplayName(user.displayName || '');
      if (user.ageGroup) {
        setAgeGroup(user.ageGroup);
      }
    }
  }, [mode, user]);

  const handleRegisterOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Introduza um endereço de e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('As palavras-passe não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'LearnMatch',
        },
        credentials: 'include',
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      const data = (await res.json()) as {
        user?: UserProfile;
        token?: string;
        error?: string;
      };
      if (!res.ok || !data.user) {
        setError(data.error || 'Não foi possível concluir o pedido.');
        return;
      }
      onAuthSuccess(data.user, data.token ?? null);
    } catch {
      setError('Erro de ligação ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = displayName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 40) {
      setError('O nome ou pseudónimo deve ter entre 2 e 40 caracteres.');
      return;
    }

    setLoading(true);
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
        body: JSON.stringify({ displayName: trimmedName, ageGroup }),
      });
      const data = (await res.json()) as { user?: UserProfile; error?: string };
      if (!res.ok || !data.user) {
        setError(data.error || 'Não foi possível guardar o perfil.');
        return;
      }
      onAuthSuccess(data.user, authToken);
    } catch {
      setError('Erro ao guardar o perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'profile_setup') {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-slate-50">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">Passo final do registo</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Criar o seu perfil</h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Recolhemos apenas o essencial. A faixa etária serve só para personalizar o perfil — o
            seu nível é determinado exclusivamente pelo desempenho nos exercícios.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleProfileSetup} className="mt-6 space-y-5">
            <div>
              <label htmlFor="displayName" className="block text-sm font-semibold text-slate-800 mb-1.5">
                Nome ou pseudónimo
              </label>
              <input
                id="displayName"
                type="text"
                required
                minLength={2}
                maxLength={40}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex.: Maria ou Estudante12"
                className="w-full px-4 py-3 text-base bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <div>
              <span className="block text-sm font-semibold text-slate-800 mb-2">Faixa etária</span>
              <div className="space-y-2.5">
                {AGE_OPTIONS.map((option) => {
                  const selected = ageGroup === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAgeGroup(option.value)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-blue-50 border-blue-600 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-semibold text-sm">{option.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{option.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 text-base font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
              Concluir Perfil e Começar
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {mode === 'register' ? 'Criar conta LearnMatch' : 'Iniciar sessão'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {mode === 'register'
            ? 'Guarde a sua pontuação, níveis desbloqueados e recomendações personalizadas.'
            : 'Entre para continuar a sua aprendizagem exatamente onde parou.'}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegisterOrLogin} className="mt-6 space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-sm font-semibold text-slate-800 mb-1.5">
              Endereço de e-mail
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@exemplo.pt"
              className="w-full px-4 py-3 text-base bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-sm font-semibold text-slate-800 mb-1.5">
              Palavra-passe
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 pr-12 text-base bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-confirm-password"
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                Confirmar palavra-passe
              </label>
              <input
                id="auth-confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a palavra-passe"
                className="w-full px-4 py-3 text-base bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 text-base font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
            {mode === 'register' ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200 text-center text-sm text-slate-600">
          {mode === 'register' ? (
            <>
              Já tem conta?{' '}
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Iniciar sessão
              </button>
            </>
          ) : (
            <>
              Ainda não tem conta?{' '}
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Registar gratuitamente
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
};
