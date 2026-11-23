import { jsPDF } from 'jspdf';
import type { ProjectAuditSnapshot } from './projectAuditService.ts';

function cleanPdfText(text: string): string {
  return text
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'")
    .replace(/•/g, '-')
    .replace(/·/g, ' | ');
}

interface TocEntry {
  number: string;
  title: string;
  page: number;
}

export function buildProjectFinalPdf(audit: ProjectAuditSnapshot): {
  pdfBuffer: Buffer;
  pageCount: number;
} {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 17;
  const maxWidth = pageWidth - margin * 2;
  const topY = 23;
  const bottomLimit = 276;

  let y = topY;
  const tocEntries: TocEntry[] = [];

  const implementedCount = audit.features.filter((f) => f.status === 'Implementada').length;
  const partialCount = audit.features.filter((f) => f.status === 'Parcialmente implementada').length;
  const plannedCount = audit.features.filter((f) => f.status === 'Planeada').length;
  const notImplementedCount = audit.features.filter((f) => f.status === 'Não implementada').length;
  const generatedLabel = new Date(audit.auditedAt).toLocaleString('pt-PT');

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      doc.addPage();
      y = topY;
    }
  };

  const addChapter = (number: string, title: string) => {
    // Start major chapters neatly; if less than 55mm remain, jump to fresh page
    if (doc.getNumberOfPages() <= 2) {
      doc.addPage();
      y = topY;
    } else if (y > 225) {
      doc.addPage();
      y = topY;
    } else {
      y += 4;
    }

    const pageNum = doc.getNumberOfPages();
    tocEntries.push({ number, title, page: pageNum });

    doc.setFillColor(239, 246, 255); // blue-50
    doc.roundedRect(margin, y - 5, maxWidth, 12, 2, 2, 'F');
    doc.setFillColor(29, 78, 216); // blue-700 accent bar
    doc.rect(margin, y - 5, 3, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(15, 23, 42);
    doc.text(cleanPdfText(`CAPÍTULO ${number} - ${title}`), margin + 6, y + 2.8);
    y += 13;
  };

  const addSubheading = (subtitle: string) => {
    ensureSpace(14);
    y += 1.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(29, 78, 216);
    doc.text(cleanPdfText(subtitle), margin, y);
    y += 5.5;
  };

  const addParagraph = (text: string, options?: { bold?: boolean; indent?: number }) => {
    const indent = options?.indent ?? 0;
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(cleanPdfText(text), maxWidth - indent) as string[];
    const lineH = 4.55;
    ensureSpace(Math.min(lines.length, 4) * lineH + 2);

    for (const line of lines) {
      ensureSpace(lineH + 2);
      doc.text(line, margin + indent, y);
      y += lineH;
    }
    y += 2;
  };

  const addBullet = (lead: string, body: string) => {
    const full = lead ? `• ${lead}: ${body}` : `• ${body}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.4);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(cleanPdfText(full), maxWidth - 4) as string[];
    const lineH = 4.45;
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(lineH + 1.5);
      doc.text(lines[i], margin + (i === 0 ? 1.5 : 4.5), y);
      y += lineH;
    }
    y += 1.3;
  };

  const addTable = (
    headers: string[],
    colWidths: number[],
    rows: string[][],
    fontSize = 8.4,
  ) => {
    const lineH = 3.9;
    const drawHeader = () => {
      ensureSpace(12);
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, maxWidth, 7.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      doc.setTextColor(255, 255, 255);
      let x = margin + 2;
      for (let i = 0; i < headers.length; i++) {
        doc.text(cleanPdfText(headers[i]), x, y + 5);
        x += colWidths[i];
      }
      y += 7.5;
    };

    drawHeader();

    rows.forEach((row, rIdx) => {
      const wrappedCols = row.map((cell, cIdx) =>
        doc.splitTextToSize(cleanPdfText(cell), colWidths[cIdx] - 4) as string[],
      );
      const maxLines = Math.max(...wrappedCols.map((c) => c.length), 1);
      const rowHeight = maxLines * lineH + 3.5;

      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        y = topY;
        drawHeader();
      }

      if (rIdx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, maxWidth, rowHeight, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, maxWidth, rowHeight, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(30, 41, 59);

      let x = margin + 2;
      for (let cIdx = 0; cIdx < wrappedCols.length; cIdx++) {
        const lines = wrappedCols[cIdx];
        for (let l = 0; l < lines.length; l++) {
          doc.text(lines[l], x, y + 4 + l * lineH);
        }
        x += colWidths[cIdx];
      }
      y += rowHeight;
    });

    y += 4;
  };

  const drawAiPipelineDiagram = () => {
    ensureSpace(56);
    const boxY = y + 2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, boxY, maxWidth, 46, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(29, 78, 216);
    doc.text('Esquema Real do Percurso de Exercicios com IA (vs Operacoes Locais)', margin + 4, boxY + 6);

    const steps = [
      { title: '1. Pedido', sub: 'POST /exercises\n/generate', fill: [219, 234, 254] },
      { title: '2. Gemini AI', sub: 'Lote 10 JSON ou\ncache reutilizada', fill: [224, 231, 255] },
      { title: '3. Validacao', sub: 'Catalogo SVG\n4 opcoes unicas', fill: [254, 243, 199] },
      { title: '4. SQLite', sub: 'exercise_batches\n(ou reserva local)', fill: [241, 245, 249] },
      { title: '5. Interface', sub: 'Audio + SVG\n(React SPA)', fill: [220, 252, 231] },
      { title: '6. Calculo Local', sub: 'Pontos, vidas\nsem chamada IA', fill: [209, 250, 229] },
    ];

    const stepW = 25.5;
    const gap = 3.5;
    const startX = margin + 4.5;
    const itemY = boxY + 13;

    steps.forEach((s, idx) => {
      const x = startX + idx * (stepW + gap);
      doc.setFillColor(s.fill[0], s.fill[1], s.fill[2]);
      doc.setDrawColor(148, 163, 184);
      doc.roundedRect(x, itemY, stepW, 24, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      doc.text(s.title, x + stepW / 2, itemY + 6.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      const subLines = s.sub.split('\n');
      subLines.forEach((sl, sIdx) => {
        doc.text(sl, x + stepW / 2, itemY + 13 + sIdx * 4.2, { align: 'center' });
      });

      if (idx < steps.length - 1) {
        const ax = x + stepW + 0.6;
        const ay = itemY + 12;
        doc.setDrawColor(71, 85, 105);
        doc.line(ax, ay, ax + gap - 1.2, ay);
        doc.text('>', ax + gap - 1.9, ay + 1);
      }
    });

    y = boxY + 51;
  };

  const drawArchitectureDiagram = () => {
    ensureSpace(64);
    const boxY = y + 2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, boxY, maxWidth, 55, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(29, 78, 216);
    doc.text('Esquema da Arquitetura Geral do LearnMatch', margin + 4, boxY + 6);

    // Client box
    doc.setFillColor(219, 234, 254);
    doc.setDrawColor(59, 130, 246);
    doc.roundedRect(margin + 5, boxY + 12, 46, 36, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('FRONTEND (SPA)', margin + 28, boxY + 19, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.text(
      ['React 19 + TypeScript', 'Tailwind CSS v4', '48 SVG + Web Speech', 'jsPDF (Relatorio Aluno)', 'Cookie + Bearer'],
      margin + 28,
      boxY + 25,
      { align: 'center' },
    );

    // Arrow Client -> Server
    doc.setDrawColor(30, 41, 59);
    doc.line(margin + 52, boxY + 30, margin + 65, boxY + 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('REST / JSON', margin + 58.5, boxY + 27.5, { align: 'center' });
    doc.text('>', margin + 63.8, boxY + 31);

    // Server box
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(100, 116, 139);
    doc.roundedRect(margin + 66, boxY + 12, 52, 36, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('BACKEND EXPRESS', margin + 92, boxY + 19, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.text(
      ['Node.js + server.ts', 'Auth & Origem (CSRF)', 'Catalogo + Validador', 'Motor Gamificacao', 'Auditoria & PDF 15 Cap.'],
      margin + 92,
      boxY + 25,
      { align: 'center' },
    );

    // Arrows Server -> Persistence & AI
    doc.line(margin + 119, boxY + 21, margin + 129, boxY + 21);
    doc.text('>', margin + 127.8, boxY + 22);
    doc.line(margin + 119, boxY + 39, margin + 129, boxY + 39);
    doc.text('>', margin + 127.8, boxY + 40);

    // SQLite & Cache box
    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(22, 163, 74);
    doc.roundedRect(margin + 130, boxY + 11, 41, 17, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.text('PERSISTENCIA LOCAL', margin + 150.5, boxY + 16.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text([`SQLite WAL (${audit.metrics.sqliteTables.length} tabelas)`, 'WAV v2 + data/reports'], margin + 150.5, boxY + 21.5, {
      align: 'center',
    });

    // Gemini API box
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.roundedRect(margin + 130, boxY + 31, 41, 17, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.text('GOOGLE GEMINI API', margin + 150.5, boxY + 36.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(['@google/genai (server)', 'Texto JSON + TTS WAV'], margin + 150.5, boxY + 41.5, {
      align: 'center',
    });

    y = boxY + 60;
  };

  // =========================================================
  // PAGE 1: PROFESSIONAL COVER PAGE
  // =========================================================
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 88, 'F');
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 88, pageWidth, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(147, 197, 253);
  doc.text('DOCUMENTAÇÃO ACADÉMICA E TÉCNICA AUTOMÁTICA', margin, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.setTextColor(255, 255, 255);
  doc.text('LEARNMATCH', margin, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(226, 232, 240);
  doc.text('Relatório Técnico e Funcional do Projeto', margin, 58);

  doc.setFontSize(10.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    cleanPdfText(
      'Plataforma Web Educativa para Aprendizagem de Inglês com Imagens, Áudio, Gamificação e Inteligência Artificial',
    ),
    margin,
    72,
    { maxWidth },
  );

  // Summary card on cover
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, 108, maxWidth, 92, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Ficha Técnica da Auditoria em Tempo Real', margin + 8, 120);

  const coverMeta: Array<[string, string]> = [
    ['Versão documentada:', `LearnMatch v${audit.appVersion}`],
    ['Data de geração:', generatedLabel],
    ['Modo de geração:', 'Auditoria local determinística do código-fonte (sem dependência da API Gemini)'],
    ['Estado das funcionalidades:', `${implementedCount} implementadas | ${partialCount} parciais | ${plannedCount} planeadas | ${notImplementedCount} não implementadas`],
    ['Módulos inspecionados:', `${audit.metrics.totalSourceFiles} ficheiros (${audit.metrics.frontendComponentCount} componentes UI, ${audit.metrics.backendModuleCount} módulos servidor)`],
    ['Base de dados e vocabulário:', `${audit.metrics.sqliteTables.length} tabelas SQLite | ${audit.metrics.catalogWordCount} palavras ilustradas | ${audit.metrics.cachedWavV2Count} áudios WAV v2`],
    ['Cobertura de testes:', `${audit.metrics.automatedTestCount} conjuntos/cenários aprovados em scripts/run_tests.ts (via HTTP/SQLite)`],
  ];

  let cy = 131;
  for (const [k, v] of coverMeta) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(29, 78, 216);
    doc.text(cleanPdfText(k), margin + 8, cy);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(cleanPdfText(v), margin + 58, cy, { maxWidth: maxWidth - 66 });
    cy += 9;
  }

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, 214, maxWidth, 34, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text('Declaração de Rigor e Privacidade', margin + 8, 224);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(30, 41, 59);
  doc.text(
    cleanPdfText(
      'Este relatório reflete exclusivamente o código-fonte, esquema de base de dados, endpoints e resultados de testes realmente existentes na data da sua geração. Funcionalidades planeadas ou incompletas estão explicitamente sinalizadas. Nenhuma chave de API, palavra-passe, token de sessão ou dado pessoal privado de utilizadores reais é incluído neste documento.',
    ),
    margin + 8,
    231,
    { maxWidth: maxWidth - 16 },
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('LearnMatch · Documento Académico e Técnico do Projeto', margin, 282);

  // =========================================================
  // PAGE 2: RESERVED FOR TABLE OF CONTENTS (FILLED AT THE END)
  // =========================================================
  doc.addPage();

  // =========================================================
  // CHAPTERS 1 TO 15 (START ON PAGE 3)
  // =========================================================

  // CAPÍTULO 1 — INTRODUÇÃO
  addChapter('1', 'INTRODUÇÃO');
  addSubheading('1.1 Apresentação e Contextualização do LearnMatch');
  addParagraph(
    'O LearnMatch é uma aplicação web educativa concebida para o ensino e consolidação de vocabulário de língua inglesa através da associação direta entre som, imagem e palavra escrita. Desenvolvida com uma arquitetura full-stack moderna (React, TypeScript, Express e SQLite), a plataforma integra gamificação equilibrada e suporte opcional à API Google Gemini para geração controlada de exercícios e análise pedagógica.',
  );
  addSubheading('1.2 Problema Identificado e Necessidade Educativa');
  addParagraph(
    'Muitas ferramentas digitais de aprendizagem de línguas dependem fortemente da leitura fluente de enunciados longos, traduções textuais imediatas ou menus complexos. Essa abordagem cria barreiras para crianças em fase inicial de literacia, adultos com baixa escolaridade ou utilizadores com dificuldades específicas de leitura e escrita, que beneficiam de estímulos auditivos claros e referências visuais inequívocas antes da exigência ortográfica.',
  );
  addSubheading('1.3 Objetivos Gerais, Específicos e Resultados Pretendidos');
  addBullet(
    'Objetivo geral',
    'Proporcionar uma plataforma web inclusiva, acessível e funcional para aprendizagem inicial de inglês baseada em associação visual e auditiva.',
  );
  addBullet(
    'Objetivos específicos',
    'Garantir persistência de contas e progresso em SQLite; estruturar níveis progressivos (Nível 1 Áudio -> Imagem e Nível 2 Imagem -> Palavra); integrar IA com validação rigorosa no servidor e baixo custo operacional; implementar gamificação justa com vidas, pontuação e desafio de recuperação; e fornecer documentação técnica automática auditável.',
  );
  addBullet(
    'Resultados pretendidos',
    'Permitir que qualquer utilizador, independentemente da idade, progrida ao seu próprio ritmo com feedback imediato, áudio claro em inglês e acompanhamento objetivo dos seus pontos fortes e palavras a rever.',
  );

  // CAPÍTULO 2 — CONCEITO E PÚBLICO-ALVO
  addChapter('2', 'CONCEITO E PÚBLICO-ALVO');
  addSubheading('2.1 Finalidade e Perfis de Utilizadores');
  addParagraph(
    'O LearnMatch destina-se a falantes de português que desejam adquirir ou reforçar vocabulário essencial de inglês do quotidiano. A plataforma suporta três faixas etárias configuráveis no perfil (6 a 10 anos, 11 a 17 anos e 18 anos ou mais), mantendo uma interface limpa, botões amplos, alto contraste e suporte a teclado.',
  );
  addSubheading('2.2 Inclusão para Diferentes Capacidades de Leitura e Escrita');
  addParagraph(
    'No Nível 1, o aluno não precisa de ler opções em inglês para responder: ouve a palavra pronunciada com clareza (em velocidade normal ou mais devagar) e seleciona uma entre quatro ilustrações vetoriais distintas. Apenas após consolidar o reconhecimento auditivo e atingir a aprovação mínima (6/10) é desbloqueado o Nível 2, que associa a imagem já familiar à respetiva palavra escrita.',
  );
  addSubheading('2.3 Princípio Fundamental: Desempenho Acima da Idade');
  addParagraph(
    'No código-fonte (server/db.ts e server.ts), a faixa etária selecionada (ageGroup) é armazenada exclusivamente para personalização do perfil e nunca define ou limita o nível pedagógico inicial. Todos os utilizadores iniciam no Nível 1 e desbloqueiam conteúdos seguintes unicamente mediante o seu desempenho real nas sessões avaliadas.',
  );

  // CAPÍTULO 3 — FUNCIONAMENTO DA APLICAÇÃO
  addChapter('3', 'FUNCIONAMENTO DA APLICAÇÃO');
  addParagraph(
    'De seguida descreve-se, passo a passo e em linguagem acessível, o percurso completo de utilização do LearnMatch em computador, tablet ou smartphone:',
  );
  const stepsUsage = [
    '1. Aceder à aplicação: o utilizador abre o endereço web no navegador; a página inicial apresenta o método, os 7 níveis planeados e os botões "Criar Conta Gratuita" e "Iniciar Sessão".',
    '2. Criar conta: ao selecionar "Criar Conta", introduz um e-mail válido e uma palavra-passe (mínimo 6 caracteres) com confirmação. O servidor cria o utilizador com 5 vidas iniciais e 0 pontos.',
    '3. Iniciar sessão: em visitas futuras, basta introduzir o e-mail e a palavra-passe; a sessão permanece ativa durante 7 dias através de cookie HttpOnly e token seguro.',
    '4. Criar ou configurar o perfil: imediatamente após o primeiro registo, o utilizador define o seu nome ou pseudónimo (2 a 40 caracteres) e seleciona a faixa etária, podendo alterá-los depois em "Perfil".',
    '5. Consultar o Painel: no Painel de Aprendizagem visualiza o nível atual, pontuação acumulada, vidas disponíveis (X/5), progresso inicial (N1-N2), níveis disponíveis, recomendações de IA, últimos resultados, acesso ao histórico, perfil e botões "Continuar a Aprender" e "Recuperar Vidas".',
    '6. Escolher um nível: pode iniciar diretamente pelo Painel ou abrir o separador "Níveis" para consultar o percurso pedagógico de 7 níveis (Nível 1 desbloqueado de origem; Nível 2 desbloqueado após aprovação no Nível 1).',
    '7. Realizar exercícios: cada sessão normal é composta por 10 perguntas, com barra de progresso superior e contadores ao vivo de pontuação, vidas, corretas e incorretas.',
    '8. Ouvir palavras em inglês: no Nível 1 a pronúncia toca automaticamente ao entrar em cada pergunta e pode ser repetida em velocidade normal ("Ouvir Palavra" ou tecla R) ou pausada ("Ouvir Mais Devagar"). No Nível 2, a pronúncia é reproduzida após a resposta para reforçar o som da palavra.',
    '9. Selecionar imagens ou palavras: o utilizador clica num dos 4 cartões visuais (Nível 1) ou numa das 4 palavras (Nível 2), ou utiliza as teclas 1 a 4. Recebe feedback imediato verde/vermelho, tradução, transcrição fonética e frase de exemplo.',
    '10. Consultar resultados: ao concluir as 10 perguntas (ou se as vidas chegarem a 0), o ecrã de Resultados mostra o estado de aprovação, aproveitamento percentual, pontuação obtida, novas medalhas e revisão pergunta a pergunta com botão para ouvir novamente cada palavra.',
    '11. Acompanhar pontuação e vidas: cada resposta correta vale 15 pontos (com bónus ao aprovar); cada resposta incorreta desconta exatamente 1 vida no servidor. Se as vidas chegarem a 0, a sessão termina imediatamente guardando a pontuação e respostas já dadas.',
    '12. Consultar o histórico: no separador "Histórico" estão registadas todas as tentativas com data, nível, acertos, erros, duração e precisão acumulada por palavra, ordenando primeiro as palavras com mais erros.',
    '13. Recuperar vidas: além da recuperação automática de +1 vida a cada 15 minutos, o utilizador pode clicar em "Recuperar Vidas" e completar um desafio independente de 5 perguntas; acertando 4 ou 5 ganha +1 vida (até ao máximo de 5), sem perder vidas pelos erros do desafio.',
    '14. Continuar a aprendizagem e desbloquear conteúdos: com vidas disponíveis e após atingir >= 6/10 no Nível 1, o Nível 2 fica permanentemente desbloqueado e o aluno pode também treinar especificamente as suas palavras mais difíceis.',
  ];
  for (const s of stepsUsage) {
    addParagraph(s, { indent: 2 });
  }

  // CAPÍTULO 4 — FUNCIONALIDADES
  addChapter('4', 'FUNCIONALIDADES');
  addSubheading('4.1 Inventário Real de Funcionalidades (Auditoria do Código)');
  addParagraph(
    'A tabela seguinte classifica todas as funcionalidades auditadas no projeto de acordo com o seu estado efetivo de implementação na data de geração deste documento:',
  );
  addTable(
    ['Funcionalidade', 'Categoria', 'Estado Real', 'Evidência no Código'],
    [54, 34, 34, 54],
    audit.features.map((f) => [f.name, f.category, f.status, f.evidence]),
    7.8,
  );

  addSubheading('4.2 Descrição Funcional Detalhada');
  const functionalSpecs: Array<[string, string]> = [
    [
      'Registo, Autenticação e Sessão Dual',
      'O que faz: cria contas com e-mail/palavra-passe e mantém sessões autenticadas. Como funciona: hashing scrypt com salt aleatório em server/db.ts e emissão simultânea de cookie HttpOnly (SameSite=None; Secure; Partitioned em HTTPS) e token Bearer em memória para funcionar dentro de iframes cross-site. Benefício: acesso contínuo sem perda de sessão após recarregamento.',
    ],
    [
      'Perfil do Utilizador e Painel Principal',
      'O que faz: gere pseudónimo/faixa etária e centraliza KPIs, ações rápidas e recomendações. Como funciona: PUT /api/profile valida comprimento (2-40 caracteres) e faixa etária; DashboardView organiza vidas, botão "Continuar a Aprender", botão destacado "Recuperar Vidas", cartões de níveis, resultados recentes e link para Perfil e Documentação. Benefício: orientação imediata do próximo passo.',
    ],
    [
      'Exercícios Áudio/Imagem, Feedback e Atalhos',
      'O que faz: apresenta 10 questões interativas com 4 opções únicas, dica de categoria, feedback auditivo sintetizado via Web Audio API e pronúncia inglesa. Como o utilizador usa: clique nos cartões ou teclas 1-4, R e Enter. Benefício: aprendizagem multissensorial acessível.',
    ],
    [
      'Pontuação, Vidas, Game Over e Desafio de Recuperação',
      'O que faz: atribui pontos por acerto/aprovação e desconta 1 vida por erro de forma idempotente no servidor (POST /api/exercises/answer). A 0 vidas encerra a sessão imediatamente guardando a tentativa parcial. O Desafio de Recuperação (POST /api/recovery/start e /submit) apresenta 5 perguntas independentes sem descontar vidas e concede +1 vida ao acertar 4 ou 5. Benefício: ritmo equilibrado sem bloquear permanentemente o aluno.',
    ],
    [
      'Histórico, Treino de Palavras Difíceis e Recomendações',
      'O que faz: armazena tentativas em attempts e estatísticas por palavra em word_performance; permite iniciar lotes focados (focusWeakWords: true) nas palavras com mais erros e pedir análise personalizada (/api/ai/recommendations). Benefício: revisão dirigida às dificuldades reais.',
    ],
    [
      'Exportação PDF do Aluno e Documentação Automática do Projeto',
      'O que faz: exportLearnMatchPdf() gera no browser o relatório individual de progresso do aluno; a área "DOCUMENTAÇÃO DO PROJETO" executa auditoria local ao código-fonte e gera este Relatório Final PDF completo em versão preservada. Benefício: portabilidade para estudo, acompanhamento docente e apresentação académica.',
    ],
  ];
  for (const [title, desc] of functionalSpecs) {
    addBullet(title, desc);
  }

  // CAPÍTULO 5 — ESTRUTURA PEDAGÓGICA
  addChapter('5', 'ESTRUTURA PEDAGÓGICA');
  addParagraph(
    'O percurso pedagógico do LearnMatch foi estruturado em 7 níveis progressivos em server/catalog.ts (LEVEL_ROADMAP). No estado atual do projeto, os Níveis 1 e 2 estão integralmente implementados e funcionais, enquanto os Níveis 3 a 7 encontram-se definidos apenas como plano arquitetural (isMvpImplemented: false).',
  );
  addTable(
    ['Nível', 'Título e Modo', 'Critério de Desbloqueio', 'Estado Atual'],
    [16, 56, 62, 42],
    [
      ['Nível 1', 'Áudio -> Imagem (Reconhecimento Auditivo)', 'Desbloqueado de origem para todos os utilizadores', 'Implementado'],
      ['Nível 2', 'Imagem -> Palavra (Reconhecimento Visual/Escrito)', 'Aprovar no Nível 1 com >= 6/10 respostas corretas (60%)', 'Implementado'],
      ['Nível 3', 'Vocabulário e Traduções (Expansão Lexical)', 'Previsto após aprovação no Nível 2', 'Planeado (Fase P2)'],
      ['Nível 4', 'Construção de Frases (Sintaxe Básica)', 'Previsto na arquitetura P2', 'Planeado (Fase P2)'],
      ['Nível 5', 'Compreensão Auditiva (Frases Completas)', 'Previsto na arquitetura P2', 'Planeado (Fase P2)'],
      ['Nível 6', 'Completar Frases e Textos', 'Previsto na arquitetura P2', 'Planeado (Fase P2)'],
      ['Nível 7', 'Compreensão Avançada (Leitura e Áudio)', 'Previsto na arquitetura P2', 'Planeado (Fase P2)'],
    ],
    8.2,
  );
  addSubheading('5.1 Adaptação da Dificuldade e Catálogo Visual');
  addParagraph(
    `A dificuldade dos lotes gerados (beginner, elementary, intermediate) é ajustada dinamicamente pela função getUserDifficultyTier() em server/db.ts com base na média percentual das últimas 3 tentativas: beginner por omissão ou média < 65%; elementary se média >= 65%; intermediate se média >= 85% em pelo menos 2 tentativas. O vocabulário visual validado conta atualmente com ${audit.metrics.catalogWordCount} palavras distribuídas por ${audit.metrics.catalogCategories.length} categorias:`,
  );
  addTable(
    ['Categoria Temática', 'Palavras no Catálogo'],
    [116, 60],
    audit.metrics.catalogCategories.map((c) => [c.category, `${c.count} palavras ilustradas em SVG`]),
    8.4,
  );

  // CAPÍTULO 6 — GAMIFICAÇÃO
  addChapter('6', 'GAMIFICAÇÃO');
  addParagraph(
    'As regras de gamificação são processadas e validadas integralmente no backend (server/db.ts) dentro de transações SQLite BEGIN IMMEDIATE para impedir manipulação no frontend ou condições de corrida.',
  );
  addTable(
    ['Mecânica', 'Regra Efetiva no Código', 'Observações Técnicas'],
    [36, 76, 64],
    [
      ['Vidas', 'Início com 5 vidas (maxLives = 5). Acerto mantém; erro desconta 1 vida.', 'Cada pergunta só pode descontar uma vez (batch_question_answers).'],
      ['Fim de Jogo', 'Ao atingir 0 vidas, a sessão termina imediatamente (gameOver: true).', 'Guarda tentativa parcial com ended_by_zero_lives = 1 e bloqueia níveis (403).'],
      ['Recuperação', '1) Automática temporal: +1 vida a cada 15 min. 2) Desafio de 5 perguntas: >=4/5 dá +1 vida.', 'Erros no desafio não descontam vidas; rota direta antiga devolve HTTP 400.'],
      ['Pontuação', '15 pts por resposta correta + 30 pts bónus de aprovação (>=6/10) + 20 pts bónus 10/10.', 'Sessão de 10/10 = 150 + 30 + 20 = 200 pts; tentativa parcial 1/6 = 15 pts.'],
      ['Recompensas', '5 medalhas: Primeiro Passo, Ouvido Atento, Leitor Visual, Pontuação Perfeita, Dedicação (300+ pts).', 'Atribuídas automaticamente no encerramento da tentativa em finalizeBatchAttemptInTx.'],
    ],
    8.2,
  );
  addSubheading('6.1 Exemplos Práticos das Regras Implementadas');
  addBullet(
    'Exemplo A — Aprovação no Nível 1 com 8/10 e 2 erros',
    'O aluno inicia com 5 vidas. Nas 2 respostas erradas perde 1 vida em cada (ficando com 3/5). Ao terminar a 10.ª pergunta obtém 8*15 + 30 = 150 pontos, 80% de aproveitamento, aprova (>=6/10), desbloqueia o Nível 2 e recebe as medalhas "Primeiro Passo" e "Ouvido Atento".',
  );
  addBullet(
    'Exemplo B — Esgotamento de vidas e Desafio de Recuperação',
    'Se um aluno com 5 vidas acertar a 1.ª pergunta (+15 pts) e errar 5 perguntas seguidas, na 6.ª pergunta as vidas chegam a 0. A sessão encerra imediatamente guardando 1/6 corretas e +15 pontos no histórico. De seguida realiza o Desafio de Recuperação: com 4/5 corretas recupera +1 vida (ficando com 1/5) e volta a poder praticar o Nível 1.',
  );

  // CAPÍTULO 7 — INTELIGÊNCIA ARTIFICIAL
  addChapter('7', 'INTELIGÊNCIA ARTIFICIAL');
  addSubheading('7.1 Justificação e Arquitetura da Integração Gemini');
  addParagraph(
    `A Inteligência Artificial é utilizada exclusivamente no servidor através do SDK oficial @google/genai para enriquecer a prática pedagógica sem aumentar latência ou custos por clique. Os modelos configurados em server/geminiService.ts são: ${audit.stack.aiModels.textPrimary} (com fallback ${audit.stack.aiModels.textFallback}) para geração estruturada de exercícios e recomendações, e ${audit.stack.aiModels.ttsPrimary} (com fallback ${audit.stack.aiModels.ttsFallback}) para síntese de voz em inglês.`,
  );
  addSubheading('7.2 Geração de Exercícios, Opções e Validação Estrita');
  addParagraph(
    'Em vez de pedir uma pergunta por clique, o backend solicita um lote completo de exatamente 10 perguntas numa única chamada JSON (responseMimeType: "application/json" e responseSchema rigoroso). Tanto a palavra-alvo como as 4 opções de resposta são restringidas no prompt às 48 palavras do VISUAL_CATALOG. Antes de gravar o lote, validateExerciseQuestions() verifica que existem 10 perguntas, palavras-alvo sem repetição, 4 opções únicas válidas no catálogo e correspondência exata de correctAnswer.',
  );
  addSubheading('7.3 Tratamento de Falhas, Otimização de Custos e Operações Locais');
  addBullet(
    'Reutilização de lotes em cache',
    'Quando forceFresh e focusWeakWords são falsos, getReusableGeminiBatch() reutiliza um lote Gemini compatível (mesmo nível e dificuldade) ainda não tentado pelo utilizador, evitando chamadas repetidas à API.',
  );
  addBullet(
    'Reserva curada determinística',
    'Se GEMINI_API_KEY não estiver configurada, ocorrer erro 429/503 ou a validação estrutural falhar, buildCuratedFallbackBatch() gera imediatamente 10 perguntas válidas a partir do catálogo local (source: "curated_cache"), mantendo a aplicação operacional.',
  );
  addBullet(
    'Áudio e cache WAV versionada (v2)',
    'Em getOrGenerateWordAudioResult(), o campo text enviado ao modelo TTS contém apenas a palavra inglesa isolada, enquanto speechMetadata.style transmite a direção de pronúncia sem ser lida. Os ficheiros WAV RIFF gerados ficam guardados em data/audio_cache com hash SHA-256 "v2:<PALAVRA>" para reutilização perpétua; em caso de falha ou quota excedida, o frontend usa Web Speech API (en-US).',
  );
  addBullet(
    'Operações 100% locais sem IA',
    'Autenticação, avaliação de respostas, cálculo de pontos, dedução/recuperação de vidas, Desafio de Recuperação (5 perguntas do catálogo), desbloqueio de níveis, histórico e geração deste Relatório Final PDF funcionam integralmente sem chamadas à API Gemini.',
  );
  addSubheading('7.4 Implementado vs Futuro na IA');
  addParagraph(
    'Implementado: geração de lotes de 10 perguntas em JSON, análise pedagógica pós-tentativa com 3 exemplos novos, síntese de voz por palavra com cache v2 e adaptação de dificuldade por histórico. Futuro: geração dinâmica de ilustrações para palavras fora do catálogo fixo e correção gramatical livre nos Níveis 4 a 7.',
  );
  drawAiPipelineDiagram();

  // CAPÍTULO 8 — ARQUITETURA E TECNOLOGIAS
  addChapter('8', 'ARQUITETURA E TECNOLOGIAS');
  addSubheading('8.1 Stack Tecnológica Verificada');
  addBullet('Frontend', audit.stack.frontend.join(' | '));
  addBullet('Backend', audit.stack.backend.join(' | '));
  addBullet('Base de dados', `${audit.stack.database}. Tabelas existentes: ${audit.metrics.sqliteTables.join(', ')}.`);
  addSubheading('8.2 Comunicação Frontend-Backend e Endpoints REST');
  addParagraph(
    'Em desenvolvimento, server.ts monta o middleware do Vite na mesma porta 3000 do Express (evitando problemas de CORS). A autenticação usa dupla via (cookie HttpOnly + cabeçalho Authorization Bearer) e proteção contra CSRF via cabeçalho X-Requested-With: LearnMatch ou validação de Origin.',
  );
  drawArchitectureDiagram();
  addTable(
    ['Método', 'Endpoint', 'Auth', 'Finalidade Auditada'],
    [22, 54, 18, 82],
    audit.endpoints.map((e) => [e.method, e.path, e.authRequired ? 'Sim' : 'Não', e.purpose]),
    7.8,
  );

  // CAPÍTULO 9 — INTERFACE E EXPERIÊNCIA DO UTILIZADOR
  addChapter('9', 'INTERFACE E EXPERIÊNCIA DO UTILIZADOR');
  addSubheading('9.1 Organização dos Ecrãs Implementados');
  addBullet('TopNav (src/components/TopNav.tsx)', 'Barra fixa com acesso a Painel, Níveis, Histórico, Perfil, Documentação e botão contextual de ação (Praticar Nível ou Recuperar Vidas a 0 vidas).');
  addBullet('Painel (DashboardView.tsx)', 'Cartão de boas-vindas com Continuar a Aprender e Recuperar Vidas, tira de 4 KPIs, cartões dos Níveis 1 e 2, painel do Tutor Gemini, lista de palavras a rever, últimos resultados e medalhas.');
  addBullet('Sessão de Exercícios e Recuperação', 'Barra de progresso linear, contadores de sessão, botões de áudio normal/lento, dica de categoria, grelha responsiva 2x2 de ilustrações SVG ou palavras e banner pedagógico imediato após responder.');
  addBullet('Resultados, Níveis, Histórico, Perfil e Documentação', 'Ecrãs dedicados com tabelas responsivas, revisão áudio palavra a palavra, exportação PDF do aluno e área académica de auditoria/PDF do projeto.');
  addSubheading('9.2 Responsividade, Acessibilidade e Capturas de Ecrã');
  addParagraph(
    'A interface utiliza grelhas responsivas Tailwind CSS (1 coluna em smartphone até 2-4 colunas em desktop), fontes de leitura clara (Plus Jakarta Sans, DM Sans, JetBrains Mono tabular), atributos ARIA (role="alert", role="status", aria-label), atalhos de teclado (1-4, R, Enter) e respeito por prefers-reduced-motion. Nota transparente: não foram incluídas capturas de ecrã neste PDF porque o ambiente do contentor não dispõe de navegador Chromium/Playwright para capturas automatizadas reais (evitando ilustrações fictícias).',
  );

  // CAPÍTULO 10 — SEGURANÇA E PRIVACIDADE
  addChapter('10', 'SEGURANÇA E PRIVACIDADE');
  addSubheading('10.1 Mecanismos Implementados no Código');
  addBullet('Credenciais e Sessões', 'Palavras-passe encriptadas com crypto.scryptSync e salt aleatório de 16 bytes, comparadas com crypto.timingSafeEqual. Sessões geradas com 32 bytes aleatórios (expiração de 7 dias) e revogação explícita em /api/auth/logout.');
  addBullet('Proteção de Chaves de API', 'GEMINI_API_KEY permanece estritamente em process.env no servidor (server/geminiService.ts); nunca é enviada ao frontend.');
  addBullet('Isolamento de Dados e Integridade', 'Todas as rotas autenticadas filtram consultas SQL por req.user.id. recovery_challenges valida user_id (HTTP 403 se outro utilizador tentar submeter).');
  addBullet('Minimização de Dados e Proteção de Menores', 'Recolhe apenas e-mail, palavra-passe cifrada, pseudónimo/nome, faixa etária e métricas pedagógicas. Não recolhe morada, telefone, data de nascimento exata nem fotos, e evita anúncios ou exposição pública entre utilizadores.');
  addSubheading('10.2 Recomendações Ainda Não Implementadas');
  addParagraph(
    'Como evolução de segurança e conformidade RGPD, recomenda-se implementar futuramente: (a) recuperação de palavra-passe com token temporário por e-mail; (b) eliminação self-service definitiva de conta pelo utilizador (DELETE /api/profile); e (c) limitação de taxa (rate limiting) dedicada nas rotas de autenticação.',
  );

  // CAPÍTULO 11 — TESTES E VALIDAÇÃO
  addChapter('11', 'TESTES E VALIDAÇÃO');
  addParagraph(
    'A validação técnica do LearnMatch assenta na suíte automatizada em scripts/run_tests.ts (executada contra servidor Express e SQLite isolado em data/learnmatch_test.db) e em testes manuais via pedidos HTTP ao servidor ativo na porta 3000. Os testes em navegador gráfico real encontram-se assinalados como "Não executado" por ausência de Chromium neste contentor.',
  );
  addTable(
    ['ID / Grupo', 'Objetivo e Procedimento', 'Resultado Esperado / Obtido', 'Estado e Método'],
    [28, 62, 54, 32],
    audit.automatedTests.map((t) => [
      `${t.id}\n(${t.group})`,
      `${t.name}: ${t.objective} Procedimento: ${t.procedure}`,
      `Esperado: ${t.expectedResult} Obtido: ${t.obtainedResult}`,
      `${t.status}\n(${t.executionMethod})`,
    ]),
    7.6,
  );

  // CAPÍTULO 12 — MELHORIAS DESENVOLVIDAS
  addChapter('12', 'MELHORIAS DESENVOLVIDAS');
  const improvements: Array<[string, string, string, string, string]> = [
    [
      '1. Autenticação e Criação de Perfil em Iframe Cross-Site',
      'Após registo no ambiente em iframe, PUT /api/profile devolvia HTTP 401 ("Sessão não iniciada").',
      'isHttpsRequest() não detetava HTTPS atrás de proxy reverso e cookies sem SameSite=None; Secure; Partitioned eram bloqueados em iframes; o cliente não usava fallback Bearer.',
      'Atualização de server.ts (deteção x-forwarded-proto/Origin e cookie Partitioned) e canal duplo com token Bearer em memória (App.tsx, AuthViews.tsx, SettingsView.tsx).',
      'Validado em REG-01 e REG-02 (registo + perfil concluídos mesmo sem cookies e sessão restaurada via HttpOnly).',
    ],
    [
      '2. Pronúncia Exclusiva da Palavra em Inglês e Cache WAV v2',
      'O áudio TTS lia instruções introdutórias ("Say clearly in standard English...") antes da palavra.',
      'O texto de instrução era concatenado diretamente no campo text enviado ao modelo TTS e os WAV antigos estavam em cache sem versionamento.',
      'Separação em server/geminiService.ts (text = apenas a palavra; estilo em speechMetadata.style), cache SHA-256 v2 e invalidação automática de WAV v1.',
      'Validado para horse, apple, dog, banana e house em REG-07 (RIFF WAV v2, cache hit, transcrição exata da palavra).',
    ],
    [
      '3. Dedução Imediata e Idempotente de Vidas por Pergunta',
      'As vidas não diminuíam visualmente no momento do erro ou podiam sofrer descontos duplicados.',
      'Faltava validação por pergunta persistida com bloqueio transacional.',
      'Criação da tabela batch_question_answers e endpoint POST /api/exercises/answer com transação BEGIN IMMEDIATE.',
      'Validado em TESTE-01 a TESTE-08 (5->4, 5 cliques concorrentes = 1 desconto, persistência após reload).',
    ],
    [
      '4. Fim de Jogo a 0 Vidas, Desafio de Recuperação e Documentação PDF',
      'A sessão permitia continuar com 0 vidas e a recuperação restaurava 5/5 num único clique.',
      'Falta de encerramento automático a 0 vidas e ausência de desafio independente de recuperação.',
      'Encerramento imediato em submitQuestionAnswer (ended_by_zero_lives), criação de recovery_challenges (/api/recovery/*, RecoveryChallengeView.tsx), bloqueio HTTP 403 a 0 vidas e módulo de Documentação Automática.',
      'Validado em VIDAS-01..VIDAS-10 e DOC-01..DOC-02 (27 testes automatizados aprovados via HTTP/SQLite).',
    ],
  ];
  for (const [title, prob, causa, sol, ev] of improvements) {
    addSubheading(title);
    addBullet('Problema inicial', prob);
    addBullet('Causa identificada', causa);
    addBullet('Solução aplicada', sol);
    addBullet('Resultado e evidência', ev);
  }

  // CAPÍTULO 13 — LIMITAÇÕES E TRABALHO FUTURO
  addChapter('13', 'LIMITAÇÕES E TRABALHO FUTURO');
  addSubheading('13.1 Limitações Técnicas Atuais');
  addBullet('Catálogo visual fixo', `As ilustrações estão limitadas às ${audit.metrics.catalogWordCount} palavras com SVG dedicado em VocabIllustration.tsx.`);
  addBullet('Quotas de API externa', 'O modelo Gemini TTS Free Tier possui limites reduzidos de pedidos diários; ao serem atingidos, o sistema recorre ao fallback TTS ou à Web Speech API do navegador.');
  addBullet('Cobertura E2E gráfica', 'A ausência de Chromium/Playwright no contentor impede testes automatizados de cliques reais em navegador gráfico.');
  addBullet('Níveis avançados', 'Os Níveis 3 a 7 encontram-se apenas planeados no roteiro pedagógico.');

  addSubheading('13.2 Propostas de Trabalho Futuro');
  addBullet('Implementação dos Níveis 3 a 7', 'Construção dos motores interativos de tradução, ordenação sintática, frases em áudio e leitura contextual.');
  addBullet('Conversão para PWA (Progressive Web App)', 'Adição de Web App Manifest e Service Worker para instalação em dispositivos móveis e estudo offline.');
  addBullet('Acessibilidade e RGPD avançados', 'Modo de alto contraste configurável, controlo granular de velocidade de leitura, eliminação de conta self-service e recuperação de palavra-passe por e-mail.');

  // CAPÍTULO 14 — CONCLUSÃO E REFLEXÃO CRÍTICA
  addChapter('14', 'CONCLUSÃO E REFLEXÃO CRÍTICA');
  addParagraph(
    'O desenvolvimento e auditoria do LearnMatch demonstram que é possível construir uma aplicação educativa inclusiva, responsiva e tecnicamente robusta combinando persistência relacional local (SQLite), gamificação determinística e Inteligência Artificial generativa controlada.',
  );
  addParagraph(
    'A principal lição técnica do projeto reside na separação clara de responsabilidades: a Inteligência Artificial (Google Gemini) atua onde acrescenta valor pedagógico real — criação de lotes variados, pronúncia natural e análise personalizada — mas nunca decide sozinha a integridade dos dados. Regras críticas como validação de respostas, pontuação, perda e recuperação de vidas, controlo de acesso e documentação do projeto permanecem determinísticas no servidor, garantindo previsibilidade, segurança e resiliência mesmo quando serviços externos falham.',
  );
  addParagraph(
    'Em perspetiva crítica, o MVP cumpre integralmente os requisitos dos Níveis 1 e 2, da gamificação segura e da transparência documental, deixando como próximos passos naturais a execução de testes em dispositivos móveis reais, a expansão para os Níveis 3 a 7 e a adição de gestão completa de conta.',
  );

  // CAPÍTULO 15 — ANEXOS E REFERÊNCIAS
  addChapter('15', 'ANEXOS E REFERÊNCIAS');
  addSubheading('15.1 Ferramentas, Dependências e Referências Técnicas');
  addBullet('Stack Frontend', audit.stack.frontend.join(', '));
  addBullet('Stack Backend', audit.stack.backend.join(', '));
  addBullet('Referências', 'Documentação oficial React 19 (react.dev), Express.js (expressjs.com), Node.js SQLite (nodejs.org/api/sqlite.html), Google GenAI TypeScript SDK (@google/genai) e jsPDF.');

  addSubheading('15.2 Extratos Reais de Prompts Utilizados (server/geminiService.ts)');
  for (const p of audit.promptExtracts) {
    addBullet(`${p.title} [${p.location}]`, p.excerpt);
  }

  addSubheading('15.3 Estrutura de Ficheiros Auditada');
  for (const group of audit.structureSummary) {
    addBullet(group.area, group.files.join(', '));
  }

  addSubheading('15.4 Glossário dos Principais Termos Técnicos');
  addTable(
    ['Termo', 'Definição no Contexto do LearnMatch'],
    [42, 134],
    [
      ['Cookie HttpOnly', 'Cookie de sessão inacessível por JavaScript no navegador, reduzindo risco de roubo por XSS.'],
      ['SameSite=None / Partitioned', 'Atributos que permitem envio controlado de cookies dentro de iframes HTTPS modernos (CHIPS).'],
      ['SQLite WAL', 'Modo Write-Ahead Logging que melhora a concorrência de leitura e escrita na base de dados local.'],
      ['Idempotência', 'Propriedade que garante que repetir o mesmo pedido (ex.: cliques duplos) não duplica o efeito (ex.: perda de vida).'],
      ['TTS (Text-to-Speech)', 'Síntese de voz que converte texto (a palavra inglesa) em ficheiro áudio WAV reproduzível.'],
      ['Fallback / Reserva', 'Mecanismo automático que mantém o sistema funcional quando a API externa falha ou atinge limites.'],
    ],
    8.2,
  );

  // =========================================================
  // PASS 2: POPULATE PAGE 2 TABLE OF CONTENTS + HEADERS/FOOTERS
  // =========================================================
  const totalPages = doc.getNumberOfPages();

  // Fill Page 2 TOC
  doc.setPage(2);
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('ÍNDICE GERAL', margin, 15.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Relatório Técnico e Funcional · LearnMatch v${audit.appVersion} · ${totalPages} páginas`,
    margin,
    33,
  );

  let tocY = 44;
  for (const entry of tocEntries) {
    const label = cleanPdfText(`Capítulo ${entry.number} — ${entry.title}`);
    const pageStr = `Pág. ${entry.page}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(label, margin, tocY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(29, 78, 216);
    doc.text(pageStr, pageWidth - margin, tocY, { align: 'right' });

    // Subtle divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, tocY + 2.5, pageWidth - margin, tocY + 2.5);
    tocY += 13;
  }

  // Running Headers & Footers on pages 2..totalPages
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    if (p >= 3) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(cleanPdfText(`LEARNMATCH — Relatório Técnico e Funcional (v${audit.appVersion})`), margin, 12);
      doc.text(cleanPdfText(generatedLabel), pageWidth - margin, 12, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 15, pageWidth - margin, 15);
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 283, pageWidth - margin, 283);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(cleanPdfText('LearnMatch · Documentação Automática do Projeto'), margin, 288);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, 288, { align: 'right' });
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return { pdfBuffer, pageCount: totalPages };
}
