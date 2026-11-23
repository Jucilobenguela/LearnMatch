import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AIRecommendation,
  DifficultyTier,
  ExerciseBatch,
  WordStat,
} from '../src/types/learnmatch.ts';
import {
  VISUAL_CATALOG,
  buildCuratedFallbackBatch,
  validateExerciseQuestions,
} from './catalog.ts';
import {
  getReusableGeminiBatch,
  getUserAttempts,
  getUserDifficultyTier,
  getUserWordStats,
  saveAIRecommendation,
  saveExerciseBatch,
} from './db.ts';

const GEMINI_TEXT_MODEL = 'gemini-4-hydrogen';
const GEMINI_FALLBACK_TEXT_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_TTS_MODEL = 'gemini-3.8-flash-lite-tts';
const GEMINI_FALLBACK_TTS_MODEL = 'gemini-3.8-flash-tts';
export const AUDIO_CACHE_VERSION = 'v2';

const AUDIO_CACHE_DIR = path.resolve(process.cwd(), 'data', 'audio_cache');
if (!fs.existsSync(AUDIO_CACHE_DIR)) {
  fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
} else {
  // Invalidate legacy v1 WAV files that may contain spoken prompt instructions
  try {
    for (const entry of fs.readdirSync(AUDIO_CACHE_DIR)) {
      if (entry.endsWith('.wav') && !entry.includes(`_${AUDIO_CACHE_VERSION}_`)) {
        fs.unlinkSync(path.join(AUDIO_CACHE_DIR, entry));
      }
    }
  } catch {
    // Ignore cleanup errors on read-only or locked files
  }
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 600 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

async function generateJsonWithFallbackModel<T>(
  ai: GoogleGenAI,
  callModel: (model: string) => Promise<T>,
): Promise<{ result: T; modelUsed: string }> {
  try {
    const result = await withRetry(() => callModel(GEMINI_TEXT_MODEL), 1);
    return { result, modelUsed: GEMINI_TEXT_MODEL };
  } catch (primaryErr) {
    const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    const isTransient =
      msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429') || msg.includes('high demand');
    if (!isTransient) {
      throw primaryErr;
    }
    const result = await withRetry(() => callModel(GEMINI_FALLBACK_TEXT_MODEL), 1);
    return { result, modelUsed: GEMINI_FALLBACK_TEXT_MODEL };
  }
}

/**
 * Generates or retrieves a validated 10-question batch for Level 1 or Level 2.
 * Cost Optimization:
 * 1. Reuses an unused cached Gemini batch matching level + difficulty first (when forceFresh is false).
 * 2. Generates all 10 questions + hints + examples in ONE single Gemini API call.
 * 3. Validates every question against VISUAL_CATALOG before persisting or returning.
 * 4. Transparently falls back to curated_cache if Gemini is unavailable or fails validation.
 */
export async function getOrGenerateExerciseBatch(params: {
  userId: string;
  level: number;
  forceFresh?: boolean;
  focusWeakWords?: boolean;
}): Promise<ExerciseBatch> {
  const difficulty: DifficultyTier = getUserDifficultyTier(params.userId);
  const wordStats = getUserWordStats(params.userId);
  const weakWords = wordStats
    .filter((w) => w.incorrectCount > 0)
    .slice(0, params.focusWeakWords ? 10 : 6)
    .map((w) => w.word);

  // Cost optimization: reuse cached unused Gemini batch unless user explicitly requests fresh AI generation or focused weak-word drill
  if (!params.forceFresh && !params.focusWeakWords) {
    const cached = getReusableGeminiBatch(params.userId, params.level, difficulty);
    if (cached) {
      return cached;
    }
  }

  const ai = getGenAIClient();
  if (!ai) {
    const fallbackQuestions = buildCuratedFallbackBatch(params.level, difficulty, weakWords);
    return saveExerciseBatch({
      userId: params.userId,
      level: params.level,
      difficulty,
      category: 'Misto (Catálogo Validado)',
      questions: fallbackQuestions,
      source: 'curated_cache',
      modelName: 'local-curated-fallback',
      fallbackReason: 'GEMINI_API_KEY não configurada no servidor.',
    });
  }

  const allowedWordsList = VISUAL_CATALOG.map(
    (item) => `${item.word} (${item.translation}, ${item.category}, ${item.difficulty})`,
  ).join('\n');

  const levelObjective =
    params.level === 1
      ? 'Nível 1 (Áudio → Imagem): o aluno ouve a palavra em inglês e escolhe a imagem correspondente entre 4 opções.'
      : 'Nível 2 (Imagem → Palavra): o aluno observa a imagem e escolhe a palavra inglesa correspondente entre 4 opções.';

  const prompt = `És o motor pedagógico do LearnMatch, uma aplicação para aprender inglês (público: crianças e adultos lusófonos).
Cria um lote completo de EXATAMENTE 10 perguntas únicas de inglês para o ${levelObjective}

Nível de dificuldade adaptativo do aluno: ${difficulty}
Palavras com dificuldades anteriores a priorizar (se existirem): ${weakWords.length > 0 ? weakWords.join(', ') : 'Nenhuma ainda (focar em vocabulário essencial)'}

REGRAS OBRIGATÓRIAS:
1. Cada uma das 10 perguntas deve ter um "word" DIFERENTE (sem repetições no mesmo lote).
2. Tanto "word", "correctAnswer" como todas as 4 "options" DEVEM ser escolhidas EXCLUSIVAMENTE em MAIÚSCULAS da lista de vocabulário visual abaixo (para garantir imagens válidas).
3. "correctAnswer" tem de ser EXATAMENTE igual a "word" e estar incluída em "options".
4. "options" deve ter exatamente 4 palavras distintas, preferencialmente da mesma categoria ou próximas para criar um desafio pedagógico equilibrado.
5. Escreve "hintPt", "translation" e "exampleTranslation" em português europeu claro e acessível.
6. Escreve "exampleSentence" em inglês simples adequado ao nível "${difficulty}".

LISTA DE VOCABULÁRIO VISUAL DISPONÍVEL:
${allowedWordsList}`;

  try {
    const { result: response, modelUsed } = await generateJsonWithFallbackModel(ai, (model) =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            'Responde apenas com JSON válido em conformidade estrita com o schema fornecido. Nunca inventes palavras fora da lista permitida.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              themeSummary: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    translation: { type: Type.STRING },
                    phonetic: { type: Type.STRING },
                    exampleSentence: { type: Type.STRING },
                    exampleTranslation: { type: Type.STRING },
                    hintPt: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctAnswer: { type: Type.STRING },
                  },
                  required: [
                    'word',
                    'translation',
                    'exampleSentence',
                    'exampleTranslation',
                    'hintPt',
                    'difficulty',
                    'options',
                    'correctAnswer',
                  ],
                },
              },
            },
            required: ['themeSummary', 'questions'],
          },
        },
      }),
    );

    const rawText = (response.text ?? '').trim();
    const parsed = JSON.parse(rawText) as {
      themeSummary?: string;
      questions?: unknown[];
    };

    const validation = validateExerciseQuestions(parsed.questions, params.level, difficulty);
    if (!validation.valid) {
      throw new Error(`Validação falhou: ${validation.reason}`);
    }

    return saveExerciseBatch({
      userId: params.userId,
      level: params.level,
      difficulty,
      category: parsed.themeSummary?.trim() || 'Lote Adaptativo Gemini',
      questions: validation.questions,
      source: 'gemini',
      modelName: modelUsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido na API Gemini';
    const fallbackQuestions = buildCuratedFallbackBatch(params.level, difficulty, weakWords);
    return saveExerciseBatch({
      userId: params.userId,
      level: params.level,
      difficulty,
      category: 'Misto (Reserva Validada)',
      questions: fallbackQuestions,
      source: 'curated_cache',
      modelName: 'local-curated-fallback',
      fallbackReason: `Reserva local ativada: ${message}`,
    });
  }
}

/**
 * Generates personalized pedagogical analysis, identifies recurring difficulties,
 * recommends categories to review, and creates 3 fresh English vocabulary examples.
 */
export async function generatePedagogicalRecommendations(
  userId: string,
): Promise<AIRecommendation> {
  const attempts = getUserAttempts(userId);
  const wordStats: WordStat[] = getUserWordStats(userId);
  const difficulty: DifficultyTier = getUserDifficultyTier(userId);

  const weakWordStats = wordStats.filter((w) => w.incorrectCount > 0).slice(0, 6);
  const weakWords = weakWordStats.map((w) => w.word);

  const categoryErrors = new Map<string, number>();
  for (const ws of wordStats) {
    if (ws.incorrectCount > 0) {
      categoryErrors.set(
        ws.category,
        (categoryErrors.get(ws.category) ?? 0) + ws.incorrectCount,
      );
    }
  }
  const recommendedCategories = Array.from(categoryErrors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  if (recommendedCategories.length === 0) {
    recommendedCategories.push('Frutas e Alimentos', 'Animais');
  }

  const ai = getGenAIClient();
  if (!ai) {
    return saveAIRecommendation(userId, buildLocalRecommendation(attempts.length, weakWords, recommendedCategories, difficulty, 'GEMINI_API_KEY não configurada no servidor.'));
  }

  const attemptsSummary = attempts.slice(0, 5).map((a) => ({
    level: a.level,
    correct: a.correctCount,
    incorrect: a.incorrectCount,
    percentage: a.percentage,
    passed: a.passed,
  }));

  const prompt = `Analisa o desempenho de um aluno lusófono no LearnMatch e fornece recomendações pedagógicas personalizadas em português europeu.

Dados do aluno:
- Tentativas recentes: ${JSON.stringify(attemptsSummary)}
- Palavras com mais erros: ${JSON.stringify(weakWordStats.map((w) => ({ word: w.word, translation: w.translation, errors: w.incorrectCount, correct: w.correctCount })))}
- Categorias a reforçar: ${recommendedCategories.join(', ')}
- Dificuldade atual sugerida: ${difficulty}

Gera:
1. "summaryPt": resumo claro e motivador (2 a 3 frases) sobre o progresso atual e padrões detetados.
2. "practiceTipPt": uma dica prática e concreta para melhorar o reconhecimento auditivo e visual.
3. "difficultySuggestion": "beginner", "elementary" ou "intermediate".
4. "newVocabularyExamples": exatamente 3 novas palavras de inglês úteis do quotidiano (que podem ir além do catálogo básico, para enriquecer o vocabulário do aluno) com tradução em português, transcrição fonética simples, frase de exemplo em inglês e respetiva tradução em português.`;

  try {
    const { result: response, modelUsed } = await generateJsonWithFallbackModel(ai, (model) =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            'És um tutor pedagógico de inglês para falantes de português. Responde apenas em JSON válido segundo o schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summaryPt: { type: Type.STRING },
              practiceTipPt: { type: Type.STRING },
              difficultySuggestion: { type: Type.STRING },
              newVocabularyExamples: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    translation: { type: Type.STRING },
                    phonetic: { type: Type.STRING },
                    exampleSentence: { type: Type.STRING },
                    exampleTranslation: { type: Type.STRING },
                  },
                  required: [
                    'word',
                    'translation',
                    'phonetic',
                    'exampleSentence',
                    'exampleTranslation',
                  ],
                },
              },
            },
            required: [
              'summaryPt',
              'practiceTipPt',
              'difficultySuggestion',
              'newVocabularyExamples',
            ],
          },
        },
      }),
    );

    const parsed = JSON.parse((response.text ?? '').trim()) as {
      summaryPt: string;
      practiceTipPt: string;
      difficultySuggestion: string;
      newVocabularyExamples: Array<{
        word: string;
        translation: string;
        phonetic: string;
        exampleSentence: string;
        exampleTranslation: string;
      }>;
    };

    const validatedDifficulty: DifficultyTier =
      parsed.difficultySuggestion === 'beginner' ||
      parsed.difficultySuggestion === 'elementary' ||
      parsed.difficultySuggestion === 'intermediate'
        ? parsed.difficultySuggestion
        : difficulty;

    return saveAIRecommendation(userId, {
      summaryPt: parsed.summaryPt,
      weakWords,
      recommendedCategories,
      difficultySuggestion: validatedDifficulty,
      practiceTipPt: parsed.practiceTipPt,
      newVocabularyExamples: (parsed.newVocabularyExamples || []).slice(0, 3),
      source: 'gemini',
      modelName: modelUsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro na análise Gemini';
    return saveAIRecommendation(
      userId,
      buildLocalRecommendation(
        attempts.length,
        weakWords,
        recommendedCategories,
        difficulty,
        `Análise estatística local utilizada: ${message}`,
      ),
    );
  }
}

function buildLocalRecommendation(
  attemptCount: number,
  weakWords: string[],
  recommendedCategories: string[],
  difficulty: DifficultyTier,
  fallbackReason: string,
): Omit<AIRecommendation, 'id' | 'createdAt'> {
  const summaryPt =
    attemptCount === 0
      ? 'Ainda não completou exercícios avaliados. Comece pelo Nível 1 para medir o seu reconhecimento auditivo inicial.'
      : weakWords.length > 0
        ? `Com base nas suas últimas sessões, identificámos ${weakWords.length} palavra(s) que merecem revisão (${weakWords.slice(0, 3).join(', ')}). A repetição auditiva e visual ajudará a consolidar estes termos.`
        : 'Excelente consistência nas últimas sessões! Está pronto para consolidar vocabulário com maior variedade temática.';

  return {
    summaryPt,
    weakWords,
    recommendedCategories,
    difficultySuggestion: difficulty,
    practiceTipPt:
      'Ouça cada palavra pelo menos duas vezes no Nível 1 antes de responder e associe o som à imagem correspondente.',
    newVocabularyExamples: [
      {
        word: 'WINDOW',
        translation: 'Janela',
        phonetic: '/ˈwɪn.dəʊ/',
        exampleSentence: 'Open the window for fresh air.',
        exampleTranslation: 'Abre a janela para entrar ar fresco.',
      },
      {
        word: 'GARDEN',
        translation: 'Jardim',
        phonetic: '/ˈɡɑː.dən/',
        exampleSentence: 'The flowers bloom in the garden.',
        exampleTranslation: 'As flores florescem no jardim.',
      },
      {
        word: 'MORNING',
        translation: 'Manhã',
        phonetic: '/ˈmɔː.nɪŋ/',
        exampleSentence: 'Good morning, let us study English.',
        exampleTranslation: 'Bom dia, vamos estudar inglês.',
      },
    ],
    source: 'local_analysis',
    fallbackReason,
  };
}

export interface WordAudioResult {
  wavBuffer: Buffer;
  cacheStatus: 'hit' | 'miss';
  version: string;
  filename: string;
}

/**
 * Synthesizes clear English pronunciation using Gemini TTS and caches the WAV file on disk
 * with cache versioning so each word is generated at most ONCE per cache version.
 * Spoken text strictly contains ONLY the English word; delivery style is kept in speechMetadata.
 */
export async function getOrGenerateWordAudioResult(
  rawWord: string,
): Promise<WordAudioResult | null> {
  const cleanWord = rawWord.replace(/[^a-zA-Z ]/g, '').trim().toUpperCase();
  if (!cleanWord || cleanWord.length > 32) return null;

  const hash = crypto
    .createHash('sha256')
    .update(`${AUDIO_CACHE_VERSION}:${cleanWord}`)
    .digest('hex')
    .slice(0, 16);
  const safeFilename = `${cleanWord.toLowerCase().replace(/\s+/g, '_')}_${AUDIO_CACHE_VERSION}_${hash}.wav`;
  const targetPath = path.resolve(AUDIO_CACHE_DIR, safeFilename);
  if (!targetPath.startsWith(AUDIO_CACHE_DIR + path.sep)) {
    return null;
  }

  if (fs.existsSync(targetPath)) {
    const existing = fs.readFileSync(targetPath);
    if (existing.length > 44 && existing.subarray(0, 4).toString('ascii') === 'RIFF') {
      return {
        wavBuffer: existing,
        cacheStatus: 'hit',
        version: AUDIO_CACHE_VERSION,
        filename: safeFilename,
      };
    }
  }

  const ai = getGenAIClient();
  if (!ai) return null;

  const spokenWord = cleanWord.toLowerCase();

  const synthesizeWithModel = async (ttsModel: string): Promise<Buffer> => {
    const response = await ai.models.generateContent({
      model: ttsModel,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: spokenWord,
              speechMetadata: {
                style: 'Clear, natural standard English pronunciation at a steady learning pace',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const base64Audio = parts.find((p) => p.inlineData?.data)?.inlineData?.data;
    if (!base64Audio) {
      throw new Error(
        `Empty TTS audio payload for "${spokenWord}" (${ttsModel}, finishReason=${response.candidates?.[0]?.finishReason ?? 'unknown'})`,
      );
    }

    const buf = Buffer.from(base64Audio, 'base64');
    if (buf.length <= 44 || buf.subarray(0, 4).toString('ascii') !== 'RIFF') {
      throw new Error(`Invalid WAV payload for "${spokenWord}" (${buf.length} bytes)`);
    }
    return buf;
  };

  try {
    let wavBuffer: Buffer;
    try {
      wavBuffer = await synthesizeWithModel(GEMINI_TTS_MODEL);
    } catch (primaryErr) {
      const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      const shouldFallback =
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('Empty TTS audio payload');
      if (!shouldFallback) {
        throw primaryErr;
      }
      wavBuffer = await withRetry(() => synthesizeWithModel(GEMINI_FALLBACK_TTS_MODEL), 1);
    }

    fs.writeFileSync(targetPath, wavBuffer);
    return {
      wavBuffer,
      cacheStatus: 'miss',
      version: AUDIO_CACHE_VERSION,
      filename: safeFilename,
    };
  } catch (err) {
    console.warn(
      `[LearnMatch TTS] Falha ao gerar áudio para "${spokenWord}":`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export async function getOrGenerateWordAudioWav(rawWord: string): Promise<Buffer | null> {
  const result = await getOrGenerateWordAudioResult(rawWord);
  return result ? result.wavBuffer : null;
}
