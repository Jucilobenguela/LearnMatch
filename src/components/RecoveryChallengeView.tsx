import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Heart,
  HelpCircle,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Volume2,
  XCircle,
} from 'lucide-react';
import type {
  QuestionAnswerInput,
  RecoveryChallenge,
  RecoveryChallengeResult,
  UserProfile,
} from '../types/learnmatch.ts';
import { playEnglishWord, playFeedbackTone } from '../utils/audio.ts';
import { VocabIllustration } from './VocabIllustration.tsx';

interface RecoveryChallengeViewProps {
  user: UserProfile;
  challenge: RecoveryChallenge;
  submitting: boolean;
  result: RecoveryChallengeResult | null;
  onSubmitChallenge: (challengeId: string, answers: QuestionAnswerInput[]) => void;
  onRetryNewChallenge: () => void;
  onReturnToDashboard: () => void;
}

export const RecoveryChallengeView: React.FC<RecoveryChallengeViewProps> = ({
  user,
  challenge,
  submitting,
  result,
  onSubmitChallenge,
  onRetryNewChallenge,
  onReturnToDashboard,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [answers, setAnswers] = useState<QuestionAnswerInput[]>([]);
  const [correctCount, setCorrectCount] = useState(0);

  const answeredQuestionIdsRef = useRef<Set<string>>(new Set());
  const submittedChallengeRef = useRef(false);

  // Reset local state whenever a new challenge ID arrives
  useEffect(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowHint(false);
    setAnswers([]);
    setCorrectCount(0);
    answeredQuestionIdsRef.current = new Set();
    submittedChallengeRef.current = false;
  }, [challenge.id]);

  const questions = challenge.questions;
  const currentQuestion = questions[currentIndex];
  const isAnswered = selectedOption !== null;
  const isCorrect =
    isAnswered && currentQuestion ? selectedOption === currentQuestion.correctAnswer : false;
  const isAudioQuestion = currentQuestion?.level === 1;

  const triggerWordAudio = useCallback(async (word: string, slow = false) => {
    setIsPlayingAudio(true);
    try {
      await playEnglishWord(word, { slow });
    } finally {
      setIsPlayingAudio(false);
    }
  }, []);

  useEffect(() => {
    if (!result && isAudioQuestion && currentQuestion) {
      const timer = setTimeout(() => {
        triggerWordAudio(currentQuestion.audioText, false);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [result, currentIndex, isAudioQuestion, currentQuestion, triggerWordAudio]);

  const handleSelectOption = useCallback(
    (option: string) => {
      if (
        result ||
        !currentQuestion ||
        isAnswered ||
        submitting ||
        answeredQuestionIdsRef.current.has(currentQuestion.id)
      ) {
        return;
      }

      answeredQuestionIdsRef.current.add(currentQuestion.id);
      const normalized = option.toUpperCase();
      setSelectedOption(normalized);

      const correct = normalized === currentQuestion.correctAnswer;
      if (correct) {
        setCorrectCount((c) => c + 1);
        playFeedbackTone('correct');
      } else {
        playFeedbackTone('incorrect');
      }

      setAnswers((prev) => [
        ...prev,
        { questionId: currentQuestion.id, selectedAnswer: normalized },
      ]);

      if (!isAudioQuestion) {
        setTimeout(() => {
          triggerWordAudio(currentQuestion.word, false);
        }, 260);
      }
    },
    [result, currentQuestion, isAnswered, submitting, isAudioQuestion, triggerWordAudio],
  );

  const handleNext = useCallback(() => {
    if (result || !isAnswered || submitting) return;

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setShowHint(false);
    } else if (!submittedChallengeRef.current) {
      submittedChallengeRef.current = true;
      playFeedbackTone('complete');
      onSubmitChallenge(challenge.id, answers);
    }
  }, [
    result,
    isAnswered,
    submitting,
    currentIndex,
    questions.length,
    onSubmitChallenge,
    challenge.id,
    answers,
  ]);

  useEffect(() => {
    if (result) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (!isAnswered && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        const opt = currentQuestion?.options[idx];
        if (opt) {
          e.preventDefault();
          handleSelectOption(opt);
        }
      } else if (e.key.toLowerCase() === 'r' && currentQuestion) {
        e.preventDefault();
        triggerWordAudio(currentQuestion.audioText, false);
      } else if (isAnswered && e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [result, isAnswered, currentQuestion, triggerWordAudio, handleSelectOption, handleNext]);

  // Completion View
  if (result) {
    const recovered = result.livesGained > 0;
    const cappedAtMax = result.passed && result.livesGained === 0;

    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <section
          className={`rounded-2xl border p-6 sm:p-8 ${
            recovered || cappedAtMax
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-sm font-bold">
              {recovered || cappedAtMax ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                  <span className="text-emerald-800">
                    {recovered
                      ? 'Desafio concluído com sucesso! +1 vida ganha'
                      : 'Desafio concluído (já tem o máximo de 5 vidas)'}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-amber-800" aria-hidden="true" />
                  <span className="text-amber-900">Não atingiu o mínimo de 4/5 desta vez</span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {recovered
                ? 'Recuperou +1 vida para continuar a aprender!'
                : cappedAtMax
                  ? 'Excelente revisão! A sua energia continua completa.'
                  : 'Não desistas! Podes tentar um novo desafio de recuperação.'}
            </h1>
            <p className="text-sm text-slate-700">
              Regra do desafio: acertar 4 ou 5 em 5 perguntas concede +1 vida (até ao máximo de{' '}
              {result.user.maxLives} vidas). Os erros neste modo nunca retiram vidas.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-500">Respostas corretas</div>
            <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono-num">
              {result.correctCount}/{result.totalQuestions}
            </div>
            <div className="mt-1 text-xs text-slate-500">Mínimo para ganhar vida: 4/5</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-500">Vidas recuperadas</div>
            <div
              className={`mt-1.5 text-2xl font-bold font-mono-num ${
                result.livesGained > 0 ? 'text-emerald-700' : 'text-slate-700'
              }`}
            >
              +{result.livesGained}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {result.livesGained > 0 ? 'Vida adicionada à conta' : 'Sem alteração de vidas'}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-500">Vidas atuais</div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 font-mono-num">
                {result.livesAfter}/{result.user.maxLives}
              </span>
              <Heart
                className={`w-5 h-5 ${
                  result.livesAfter > 0 ? 'text-rose-600 fill-rose-600' : 'text-slate-300'
                }`}
                aria-hidden="true"
              />
            </div>
            <div className="mt-1 text-xs text-slate-500">Persistido na sua conta</div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-600">
            Este desafio é independente dos níveis normais e não altera pontos nem desbloqueios.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {result.livesAfter < result.user.maxLives && (
              <button
                type="button"
                onClick={onRetryNewChallenge}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-amber-900 bg-amber-100 border border-amber-300 rounded-xl hover:bg-amber-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                Fazer Novo Desafio
              </button>
            )}
            <button
              type="button"
              onClick={onReturnToDashboard}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 transition-colors cursor-pointer"
            >
              Regressar ao Painel
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>
    );
  }

  const progressPercent = Math.round(
    ((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100,
  );

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Recovery Header Bar */}
      <div className="bg-white border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReturnToDashboard}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Sair para Painel
          </button>

          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Desafio de Recuperação de Vidas · Erros não retiram vidas
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <span className="font-mono-num">
              Pergunta {currentIndex + 1} de {questions.length}
            </span>
            <span className="font-mono-num">{progressPercent}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center sm:text-left">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="text-[11px] text-emerald-700">Corretas no desafio</div>
            <div className="text-sm font-bold text-emerald-800 font-mono-num">
              {correctCount}/{questions.length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500">Vidas atuais</div>
            <div className="text-sm font-bold text-slate-900 font-mono-num inline-flex items-center gap-1">
              <Heart
                className={`w-3.5 h-3.5 ${
                  user.lives > 0 ? 'text-rose-600 fill-rose-600' : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
              {user.lives}/{user.maxLives}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
            <div className="text-[11px] text-amber-800">Objetivo</div>
            <div className="text-sm font-bold text-amber-950 font-mono-num">4 ou 5 → +1 vida</div>
          </div>
        </div>
      </div>

      {/* Question Stage */}
      {currentQuestion && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
          {isAudioQuestion ? (
            <div className="text-center space-y-5">
              <div>
                <p className="text-sm font-semibold text-amber-700">
                  Desafio de Recuperação — Áudio → Imagem
                </p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">
                  Ouça a palavra e selecione a imagem correspondente
                </h1>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => triggerWordAudio(currentQuestion.audioText, false)}
                  className="inline-flex items-center gap-3 px-7 py-4 text-base font-bold text-white bg-blue-700 rounded-2xl hover:bg-blue-800 transition-colors cursor-pointer"
                >
                  <Volume2
                    className={`w-6 h-6 ${isPlayingAudio ? 'animate-pulse' : ''}`}
                    aria-hidden="true"
                  />
                  {isPlayingAudio ? 'A reproduzir...' : 'Ouvir Palavra'}
                </button>

                <button
                  type="button"
                  onClick={() => triggerWordAudio(currentQuestion.audioText, true)}
                  className="inline-flex items-center gap-2 px-5 py-4 text-sm font-semibold text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Ouvir Mais Devagar
                </button>

                <button
                  type="button"
                  onClick={() => setShowHint((h) => !h)}
                  className="inline-flex items-center gap-1.5 px-4 py-4 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" aria-hidden="true" />
                  Dica
                </button>
              </div>

              {showHint && (
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 inline-block">
                  {currentQuestion.hintPt}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 sm:gap-5 pt-2">
                {currentQuestion.options.map((optWord, idx) => {
                  const isSelected = selectedOption === optWord;
                  const isRightOption = optWord === currentQuestion.correctAnswer;

                  let cardStyle =
                    'bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/30';
                  if (isAnswered) {
                    if (isRightOption) {
                      cardStyle = 'bg-emerald-50 border-2 border-emerald-600';
                    } else if (isSelected && !isRightOption) {
                      cardStyle = 'bg-red-50 border-2 border-red-600';
                    } else {
                      cardStyle = 'bg-slate-50 border-2 border-slate-200 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={optWord}
                      type="button"
                      disabled={isAnswered || submitting}
                      onClick={() => handleSelectOption(optWord)}
                      className={`p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors min-h-[168px] sm:min-h-[196px] cursor-pointer disabled:cursor-default ${cardStyle}`}
                    >
                      <VocabIllustration
                        imageKey={optWord.toLowerCase()}
                        label={isAnswered ? optWord : `Opção visual ${idx + 1}`}
                        className="w-24 h-24 sm:w-28 sm:h-28"
                      />
                      <div className="text-sm font-bold text-slate-800">
                        {isAnswered ? (
                          <span className="inline-flex items-center gap-1.5">
                            {isRightOption && (
                              <CheckCircle2
                                className="w-4 h-4 text-emerald-700"
                                aria-hidden="true"
                              />
                            )}
                            {isSelected && !isRightOption && (
                              <XCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
                            )}
                            {optWord}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">Opção {idx + 1}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div>
                <p className="text-sm font-semibold text-amber-700">
                  Desafio de Recuperação — Imagem → Palavra
                </p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">
                  Qual é a palavra em inglês para esta imagem?
                </h1>
              </div>

              <div className="flex flex-col items-center gap-3">
                <VocabIllustration
                  imageKey={currentQuestion.imageKey}
                  label="Ilustração para identificar em inglês"
                  className="w-44 h-44 sm:w-52 sm:h-52 shadow-sm"
                />

                <button
                  type="button"
                  onClick={() => setShowHint((h) => !h)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" aria-hidden="true" />
                  {showHint ? 'Ocultar dica' : 'Ver dica de categoria'}
                </button>

                {showHint && (
                  <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl py-2 px-4">
                    {currentQuestion.hintPt}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {currentQuestion.options.map((optWord) => {
                  const isSelected = selectedOption === optWord;
                  const isRightOption = optWord === currentQuestion.correctAnswer;

                  let btnStyle =
                    'bg-white border-2 border-slate-200 text-slate-900 hover:border-blue-600 hover:bg-blue-50/40';
                  if (isAnswered) {
                    if (isRightOption) {
                      btnStyle = 'bg-emerald-50 border-2 border-emerald-600 text-emerald-900';
                    } else if (isSelected && !isRightOption) {
                      btnStyle = 'bg-red-50 border-2 border-red-600 text-red-900';
                    } else {
                      btnStyle = 'bg-slate-50 border-2 border-slate-200 text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={optWord}
                      type="button"
                      disabled={isAnswered || submitting}
                      onClick={() => handleSelectOption(optWord)}
                      className={`py-5 px-6 rounded-2xl text-xl font-extrabold tracking-wide flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:cursor-default ${btnStyle}`}
                    >
                      {isAnswered && isRightOption && (
                        <CheckCircle2
                          className="w-6 h-6 text-emerald-700 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      {isAnswered && isSelected && !isRightOption && (
                        <XCircle className="w-6 h-6 text-red-700 shrink-0" aria-hidden="true" />
                      )}
                      <span>{optWord}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isAnswered && (
            <div
              role="status"
              className={`mt-6 p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-red-50 border-red-200 text-red-950'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-base">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                      <span>Correto!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-700" aria-hidden="true" />
                      <span>
                        Incorreto — Resposta correta: {currentQuestion.correctAnswer} · Sem perda de
                        vidas neste desafio
                      </span>
                    </>
                  )}
                </div>
                <p className="text-sm">
                  <strong>{currentQuestion.word}</strong> ({currentQuestion.phonetic}) ={' '}
                  <strong>{currentQuestion.translation}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => triggerWordAudio(currentQuestion.word, false)}
                  aria-label={`Ouvir novamente ${currentQuestion.word}`}
                  className="p-3 rounded-xl bg-white/80 border border-slate-200 text-slate-800 hover:bg-white transition-colors cursor-pointer"
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  {currentIndex + 1 < questions.length ? 'Próxima Pergunta' : 'Concluir Desafio'}
                  {!submitting && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          )}

          <p className="hidden sm:block mt-5 text-center text-xs text-slate-400">
            Atalhos de teclado: 1–4 selecionar alternativa · R ouvir palavra · Enter avançar
          </p>
        </section>
      )}
    </main>
  );
};
