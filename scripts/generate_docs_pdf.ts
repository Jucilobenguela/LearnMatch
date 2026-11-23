import fs from 'node:fs';
import path from 'node:path';
import { jsPDF } from 'jspdf';

function sanitize(text: string): string {
  return text
    .replace(/→/g, '->')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/—/g, '-')
    .replace(/–/g, '-');
}

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
const margin = 16;
const pageWidth = doc.internal.pageSize.getWidth();
const maxWidth = pageWidth - margin * 2;
let y = 20;

function checkSpace(needed = 14) {
  if (y + needed > 276) {
    doc.addPage();
    y = 18;
  }
}

function addSection(title: string, paragraphs: string[]) {
  checkSpace(18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(29, 78, 216);
  doc.text(sanitize(title), margin, y);
  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5.5;

  for (const p of paragraphs) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.6);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(sanitize(p), maxWidth) as string[];
    checkSpace(lines.length * 4.6 + 3);
    doc.text(lines, margin, y);
    y += lines.length * 4.6 + 2.3;
  }
  y += 2;
}

// Header
doc.setFillColor(15, 23, 42);
doc.rect(0, 0, pageWidth, 34, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(17.5);
doc.setTextColor(255, 255, 255);
doc.text('LearnMatch - Auditoria Tecnica e Relatorio Atualizado', margin, 15);
doc.setFont('helvetica', 'normal');
doc.setFontSize(9.8);
doc.setTextColor(203, 213, 225);
doc.text('Estabilizacao de Autenticacao, Cookies em Iframe, Integracao Gemini e Regressao', margin, 23);
doc.text(`Data de geracao: ${new Date().toLocaleString('pt-PT')}`, margin, 29);
y = 44;

addSection('1. Problema Prioritario e Correcoes Recentes', [
  'A. Sessao em Iframe Cross-Site (Resolvido): apos o registo, PUT /api/profile devolvia HTTP 401 porque isHttpsRequest nao detetava HTTPS atras do proxy AI Studio. Implementado SameSite=None; Secure; Partitioned e canal duplo com token Bearer em memoria React.',
  'B. Pronuncia TTS com Frases Introdutorias (Resolvido): separado speechMetadata.style do texto falado exclusivo da palavra inglesa em server/geminiService.ts com cache WAV versionada (v2).',
  'C. Fim de Jogo a 0 Vidas e Recuperacao Independente (Resolvido): quando as vidas chegam a 0 durante uma sessao, a sessao termina imediatamente com gravacao da tentativa parcial no historico; a recuperacao manual instantanea foi substituida pelo Desafio de Recuperacao independente de 5 perguntas.',
]);

addSection('2. Sistema de Vidas, Fim de Jogo e Desafio de Recuperacao', [
  '- Fim de jogo imediato (0 vidas): em server/db.ts (submitQuestionAnswer), se nextLives atingir 0, a transacao SQLite finaliza de imediato a tentativa parcial via finalizeBatchAttemptInTx (ended_by_zero_lives = 1, preservando pontuacao e respostas dadas ate ao momento) e devolve { gameOver: true, attemptResult, user }. No frontend, ExerciseSessionView bloqueia cliques/atalhos e App.tsx transita para ResultsView.',
  '- Bloqueio a 0 vidas: POST /api/exercises/generate (HTTP 403), POST /api/exercises/answer (HTTP 403) e os botoes do Painel/Niveis/Resultados impedem iniciar ou continuar sessoes normais com 0 vidas, exibindo a mensagem amigavel orientada a recuperacao.',
  '- Desafio de Recuperacao (POST /api/recovery/start e POST /api/recovery/submit): gera 5 perguntas independentes a partir de VISUAL_CATALOG (alternando Audio -> Imagem e Imagem -> Palavra, sem chamadas desnecessarias a API Gemini). Regra estrita: >= 4/5 corretas concede +1 vida (maxLives = 5); <= 3/5 concede 0 vidas; erros no desafio nao descontam vidas e nunca alteram pontos, desbloqueios de niveis, attempts ou word_performance.',
  '- Rota legada desativada e recuperacao automatica mantida: POST /api/profile/recover-life devolve HTTP 400 (sem restauracao direta); a recuperacao automatica temporal de +1 vida a cada 15 minutos permanece ativa.',
]);

addSection('3. Verificacao da Pronuncia TTS (5 Palavras Obrigatorias + Cache v2)', [
  'Cada palavra foi validada em cache WAV RIFF v2 (24kHz mono 16-bit) e transcrita por gemini-3.5-transcribe confirmando ausencia de frases adicionais:',
  '- horse (61.468 B), apple (65.308 B), dog (72.988 B), banana (72.988 B), house (69.148 B) -> todas cache=hit na 2.a chamada e transcricao exata da palavra.',
]);

addSection('4. Arquitetura, Seguranca e Funcionalidades Preservadas', [
  'Configuracao ativa: React 19 + TypeScript + Tailwind v4 + Express + SQLite (data/learnmatch.db) + Gemini API (/api/health -> geminiConfigured: true).',
  'Seguranca: transacoes BEGIN IMMEDIATE em SQLite previnem condicoes de corrida e dupla deducao/recompensa; recovery_challenges valida propriedade por user_id (HTTP 403 cross-user) e estado ativo unico (HTTP 409 em reenvios duplicados).',
  'Preservadas integralmente: Nivel 1 (Audio -> Imagem), Nivel 2 (Imagem -> Palavra), regra de aprovacao (>= 6/10), desbloqueio de niveis, historico de tentativas, recomendacoes IA, treino focusWeakWords, atalhos de teclado (1-4, R, Enter) e exportacao PDF.',
]);

addSection('5. Testes Executados (25/25 PASS)', [
  'Distincao transparente: testes executados via HTTP contra o servidor Express/SQLite isolado em scripts/run_tests.ts e contra o servidor local em execucao; nao foi executado um navegador grafico externo (Chromium/Playwright indisponivel neste contentor).',
  '- Regressao Geral [REG-01..REG-07 PASS]: registo em iframe, reload via cookie HttpOnly, logout/login, conclusao N1->N2, isolamento entre utilizadores, fallback/focusWeakWords e cache WAV v2.',
  '- Perda de Vidas [TESTE-01..TESTE-08 PASS]: -1 vida por erro, manutencao ao acertar, sequencia mista sem dupla deducao, 5 cliques concorrentes (apenas 1 desconto), persistencia apos reload, isolamento entre contas, recuperacao automatica 15 min + desafio e consistencia em N1/N2/focusWeakWords.',
  '- Fim de Jogo e Recuperacao [VIDAS-01..VIDAS-10 PASS]: reducao -1 vida; gameOver imediato a 0 vidas gravando tentativa parcial (+15 pts, 1/6) no historico; bloqueio de respostas/niveis a 0 vidas (403) e rota legada (400); desafio 4/5 e 5/5 (+1 vida); desafio <= 3/5 (0 vidas, sem perda); teto 5/5 e bloqueio de reenvio duplicado (409); reload via /api/auth/me; isolamento cross-user (403); zero alteracao de pontos/niveis/attempts/wordStats no desafio; retoma normal do Nivel 1 apos recuperar.',
]);

addSection('6. Limitacoes Atuais', [
  '1. Ausencia de Chromium/Playwright neste contentor impede cliques reais num navegador grafico (validacao visual/interativa de UI confirmada por inspecao de codigo e testes HTTP).',
  '2. Quotas Free Tier da API Gemini (ex.: 10 pedidos/dia em TTS) acionam automaticamente o modelo fallback ou reserva local/Web Speech API.',
  '3. Niveis 3 a 7 permanecem como roteiro arquitetural planeado para a fase P2.',
]);

const pdfArrayBuffer = doc.output('arraybuffer');
const buffer = Buffer.from(pdfArrayBuffer);

const rootPdfPath = path.resolve(process.cwd(), 'LearnMatch_Documentacao_Tecnica.pdf');
const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const publicPdfPath = path.join(publicDir, 'LearnMatch_Documentacao_Tecnica.pdf');

fs.writeFileSync(rootPdfPath, buffer);
fs.writeFileSync(publicPdfPath, buffer);
console.log(`PDF atualizado com sucesso em ${rootPdfPath} e ${publicPdfPath} (${buffer.length} bytes)`);
