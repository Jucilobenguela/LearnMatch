import React from 'react';
import { ArrowRight, CheckCircle2, Headphones, Image as ImageIcon, ShieldCheck, Sparkles } from 'lucide-react';
import type { AppView } from '../types/learnmatch.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface LandingPageProps {
  onNavigate: (view: AppView) => void;
}

const ROADMAP_PREVIEW = [
  { level: 1, name: 'Áudio → Imagem', desc: 'Ouve a palavra em inglês e identifica a imagem correta.', active: true },
  { level: 2, name: 'Imagem → Palavra', desc: 'Associa a ilustração apresentada à palavra escrita.', active: true },
  { level: 3, name: 'Vocabulário e Traduções', desc: 'Consolidação de palavras e significados.', active: false },
  { level: 4, name: 'Construção de Frases', desc: 'Organização de palavras em frases simples.', active: false },
  { level: 5, name: 'Compreensão Auditiva', desc: 'Interpretação de frases faladas.', active: false },
  { level: 6, name: 'Completar Frases', desc: 'Preenchimento contextual em pequenos textos.', active: false },
  { level: 7, name: 'Compreensão Avançada', desc: 'Leitura e áudio de maior complexidade.', active: false },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <main className="bg-slate-50">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-sm font-semibold text-blue-700 mb-3">
              Aprendizagem visual e auditiva de inglês
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12] text-balance">
              Aprenda inglês com imagens, áudio claro e progressão adaptativa.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              O LearnMatch foi concebido para crianças e adultos, incluindo quem tem dificuldades
              de leitura ou escrita. Comece pelo reconhecimento auditivo e evolua ao seu próprio ritmo.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Criar Conta Gratuita
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="px-6 py-3.5 text-base font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Iniciar Sessão
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
              <span>10 perguntas por sessão</span>
              <span aria-hidden="true">·</span>
              <span>Feedback visual e sonoro imediato</span>
              <span aria-hidden="true">·</span>
              <span>Progresso baseado no desempenho</span>
            </div>
          </div>

          <div className="lg:col-span-6 flex">
            <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
              <ResilientImage
                src="/src/assets/images/hero_learnmatch_studio_1795466747579.jpg"
                alt="Cartões ilustrados do LearnMatch com maçã, cão e auscultadores sobre secretária"
                fallbackTitle="LearnMatch — Cartões Visuais e Áudio"
                className="w-full h-full min-h-[280px] lg:h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Method Section */}
      <section id="metodo" className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
              Como funciona a metodologia LearnMatch
            </h2>
            <p className="mt-3 text-slate-600 leading-relaxed">
              Em vez de depender exclusivamente de texto denso, cada exercício liga o som inglês a
              ilustrações claras antes de introduzir o reconhecimento escrito.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <Headphones className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">01. Nível 1: Áudio → Imagem</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Ouça a palavra em inglês quantas vezes precisar e selecione a imagem correspondente
                entre quatro alternativas distintas.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <ImageIcon className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">02. Nível 2: Imagem → Palavra</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Após aprovar no Nível 1 (6/10 ou mais), observe a imagem e identifique a palavra
                inglesa correta, ligando som, significado e escrita.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">03. Revisão com IA Gemini</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                A Inteligência Artificial gera novos lotes de exercícios adaptados às palavras em que
                teve mais dificuldade e sugere novos exemplos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7-Level Roadmap */}
      <section id="niveis" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Sistema pedagógico em 7 níveis
            </h2>
            <p className="mt-2 text-slate-600">
              Progressão desbloqueada pelo seu desempenho real — nunca pela idade.
            </p>
          </div>
          <span className="text-sm font-medium text-slate-600">
            Níveis 1 e 2 disponíveis no MVP · Níveis 3 a 7 planeados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROADMAP_PREVIEW.map((item) => (
            <div
              key={item.level}
              className={`p-5 rounded-xl border ${
                item.active
                  ? 'bg-white border-blue-200'
                  : 'bg-slate-100/70 border-slate-200 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className={item.active ? 'text-blue-700' : 'text-slate-500'}>
                  Nível {item.level}
                </span>
                <span className={item.active ? 'text-emerald-700' : 'text-slate-500'}>
                  {item.active ? 'Disponível' : 'Em breve'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base">{item.name}</h3>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI + Privacy Section */}
      <section id="ia" className="bg-white border-t border-slate-200 py-16">
        <div id="privacidade" className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900">
              Integração real de Inteligência Artificial
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Geração em lotes de 10 perguntas validadas no servidor com a API Gemini, evitando
                  chamadas desnecessárias a cada clique.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Identificação de dificuldades recorrentes por palavra e recomendações personalizadas
                  de revisão.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Verificação imediata das respostas, pontos, vidas e desbloqueios processada de forma
                  rápida e segura.
                </span>
              </li>
            </ul>
          </div>

          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5 mb-3">
              <ShieldCheck className="w-6 h-6 text-blue-700" aria-hidden="true" />
              <h3 className="text-xl font-bold text-slate-900">Privacidade e segurança (RGPD)</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Recolhemos apenas os dados essenciais para guardar o seu progresso: nome ou pseudónimo,
              faixa etária e histórico de resultados. As palavras-passe são encriptadas no servidor,
              as credenciais de IA nunca são expostas ao navegador e cada utilizador acede apenas aos
              seus próprios dados.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Começar Agora
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        LearnMatch — Plataforma educativa para aprendizagem visual e auditiva de inglês.
      </footer>
    </main>
  );
};
