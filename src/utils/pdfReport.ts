import { jsPDF } from 'jspdf';
import type {
  AIRecommendation,
  AttemptRecord,
  UserProfile,
  WordStat,
} from '../types/learnmatch.ts';

function asciiSafe(text: string): string {
  // jsPDF Helvetica handles Latin-1 characters cleanly when kept standard; normalize rare symbols
  return text.replace(/→/g, '->').replace(/≥/g, '>=').replace(/—/g, '-');
}

export function exportLearnMatchPdf(params: {
  user: UserProfile;
  attempts: AttemptRecord[];
  wordStats: WordStat[];
  recommendation: AIRecommendation | null;
}): void {
  const { user, attempts, wordStats, recommendation } = params;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = 18;

  const ensureSpace = (needed = 16) => {
    if (y + needed > 278) {
      doc.addPage();
      y = 18;
    }
  };

  const addHeading = (title: string) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(29, 78, 216);
    doc.text(asciiSafe(title), margin, y);
    y += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  const addParagraph = (text: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(asciiSafe(text), maxWidth) as string[];
    ensureSpace(lines.length * 5 + 3);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 2;
  };

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('LearnMatch - Relatorio de Progresso e Arquitetura', margin, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-PT')} | Utilizador: ${asciiSafe(user.displayName || user.email)}`,
    margin,
    22,
  );
  y = 38;

  addHeading('1. Resumo do Utilizador');
  addParagraph(`Nome / Pseudonimo: ${user.displayName || 'Nao definido'}`);
  addParagraph(`Nivel Atual: Nivel ${user.currentLevel} | Niveis Desbloqueados: ${user.unlockedLevels.join(', ')}`);
  addParagraph(`Pontuacao Acumulada: ${user.totalPoints} pontos | Vidas: ${user.lives}/${user.maxLives}`);
  addParagraph(`Recompensas Conquistadas: ${user.rewards.length > 0 ? user.rewards.map((r) => r.title).join(', ') : 'Nenhuma ainda'}`);

  addHeading('2. Historico de Tentativas');
  if (attempts.length === 0) {
    addParagraph('Ainda nao existem tentativas registadas para esta conta.');
  } else {
    attempts.slice(0, 12).forEach((a, index) => {
      const status = a.passed ? 'APROVADO' : 'NAO APROVADO';
      const dateStr = new Date(a.createdAt).toLocaleString('pt-PT');
      addParagraph(
        `${index + 1}. Nivel ${a.level} (${dateStr}) - ${a.correctCount}/10 corretas (${a.percentage}%) - ${a.score} pts - ${status}`,
      );
    });
  }

  addHeading('3. Palavras com Maior Dificuldade e Revisao');
  const weak = wordStats.filter((w) => w.incorrectCount > 0).slice(0, 8);
  if (weak.length === 0) {
    addParagraph('Sem dificuldades recorrentes registadas ate ao momento.');
  } else {
    weak.forEach((w) => {
      addParagraph(
        `- ${w.word} (${w.translation}) [${w.category}]: ${w.correctCount} acertos / ${w.incorrectCount} erros (${w.accuracy}% precisao)`,
      );
    });
  }

  if (recommendation) {
    addHeading('4. Analise Pedagogica e Recomendacoes de IA');
    addParagraph(`Fonte: ${recommendation.source === 'gemini' ? 'API Gemini (gemini-4-hydrogen)' : 'Analise estatistica local'}`, true);
    addParagraph(recommendation.summaryPt);
    addParagraph(`Dica pratica: ${recommendation.practiceTipPt}`);
    if (recommendation.newVocabularyExamples.length > 0) {
      addParagraph('Exemplos de vocabulario sugeridos:', true);
      recommendation.newVocabularyExamples.forEach((ex) => {
        addParagraph(`- ${ex.word} (${ex.translation}) ${ex.phonetic}: "${ex.exampleSentence}"`);
      });
    }
  }

  addHeading('5. Arquitetura e Regras Pedagogicas do LearnMatch');
  addParagraph(
    'Stack: React 19, TypeScript, Tailwind CSS v4, Express.js, SQLite (node:sqlite) e SDK oficial @google/genai no servidor.',
  );
  addParagraph(
    'Regras: 10 perguntas por tentativa, 4 opcoes unicas, verificacao local imediata, aprovacao com >= 6/10 respostas corretas, progressao baseada exclusivamente no desempenho e nunca na idade.',
  );
  addParagraph(
    'Otimizacao de custos IA: geracao em lotes de 10 exercicios com validacao estrutural rigorosa, cache de lotes reutilizaveis, TTS em cache por palavra e reserva local validada em caso de falha.',
  );

  doc.save(`LearnMatch_Relatorio_${(user.displayName || 'Aluno').replace(/\s+/g, '_')}.pdf`);
}
