import React from 'react';
import type { AppView, UserProfile } from '../types/learnmatch.ts';

interface TopNavProps {
  user: UserProfile | null;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onStartRecommended: () => void;
  onStartRecovery: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  user,
  currentView,
  onNavigate,
  onStartRecommended,
  onStartRecovery,
}) => {
  if (!user || !user.profileCompleted) {
    return (
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-700 rounded cursor-pointer"
          >
            LearnMatch
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#metodo"
              onClick={(e) => {
                if (currentView !== 'landing') {
                  e.preventDefault();
                  onNavigate('landing');
                }
              }}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Como Funciona
            </a>
            <a
              href="#niveis"
              onClick={(e) => {
                if (currentView !== 'landing') {
                  e.preventDefault();
                  onNavigate('landing');
                }
              }}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Níveis
            </a>
            <a
              href="#ia"
              onClick={(e) => {
                if (currentView !== 'landing') {
                  e.preventDefault();
                  onNavigate('landing');
                }
              }}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Inteligência Artificial
            </a>
            <a
              href="#privacidade"
              onClick={(e) => {
                if (currentView !== 'landing') {
                  e.preventDefault();
                  onNavigate('landing');
                }
              }}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Privacidade
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onNavigate(currentView === 'login' ? 'register' : 'login')}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
            >
              {currentView === 'login' ? 'Criar Conta' : 'Iniciar Sessão'}
            </button>
          </div>
        </div>
      </header>
    );
  }

  const navItems: Array<{ view: AppView; label: string }> = [
    { view: 'dashboard', label: 'Painel' },
    { view: 'levels', label: 'Níveis' },
    { view: 'history', label: 'Histórico' },
    { view: 'settings', label: 'Perfil' },
    { view: 'documentation', label: 'Documentação' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-700 rounded cursor-pointer"
        >
          LearnMatch
        </button>

        <nav className="flex items-center gap-3 sm:gap-6 text-sm font-medium text-slate-600 overflow-x-auto">
          {navItems.map((item) => {
            const active = currentView === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => onNavigate(item.view)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  active
                    ? 'text-blue-700 border-blue-700 font-semibold'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="hidden sm:flex items-center shrink-0">
          {user.lives <= 0 ? (
            <button
              type="button"
              onClick={onStartRecovery}
              className="px-4 py-2 text-sm font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 cursor-pointer"
            >
              Recuperar Vidas
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartRecommended}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
            >
              Praticar Nível {user.currentLevel}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
