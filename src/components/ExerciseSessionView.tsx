import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Heart,
  HelpCircle,
  Loader2,
  Volume2,
  XCircle,
} from 'lucide-react';
import type {
  ExerciseBatch,
  QuestionAnswerInput,
  QuestionAnswerResult,
  UserProfile,
} from '../types/learnmatch.ts';
import { playEnglishWord, playFeedbackTone } from '../utils/audio.ts';
import { VocabIllustration } from './VocabIllustration.tsx';

interface ExerciseSessionViewProps {
  user: UserProfile;
  batch: ExerciseBatch;
  submitting: boolean;
  onAnswerQuestion: (
    questionId: string,
    selectedAnswer: string,
    durationSeconds: number,
  ) => Promise<QuestionAnswerResult | null>;
  onExitToDashboard: () => void;
  onSubmitAttempt: (answers: QuestionAnswerInput[], durationSeconds: number) => void;
}

export const ExerciseSessionView: React.FC<ExerciseSessionViewProps> = ({
  user,
  batch,
  submitting,
  onAnswerQuestion,
  onExitToDashboard,
  onSubmitAttempt,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [lastLivesDeducted, setLastLivesDeducted] = useState(0);
  const [answers, setAnswers] = useState<QuestionAnswerInput[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [gameEnded, setGameEnded] = useState(user.lives <= 0);

  const startedAtRef = useRef<number>(Date.now());
  const answeredQuestionIdsRef = useRef<Set<string>>(new Set());
  const gameEndedRef = useRef<boolean>(user.lives <= 0);
  const questions = batch.questions;
  const currentQuestion = questions[currentIndex];
  const isAnswered = selectedOption !== null;
  const isCorrect = isAnswered && selectedOption === currentQuestion.correctAnswer;
  const isLevel1 = batch.level === 1;
  const isSessionLocked = gameEnded || user.lives <= 0;

  const triggerWordAudio = useCallback(
    async (word: string, slow = false) => {
      setIsPlayingAudio(true);
      try {
        await playEnglishWord(word, { slow });
      } finally {
        setIsPlayingAudio(false);
      }
    },
    [],
  );

  // Auto-play English audio when advancing in Level 1
  useEffect(() => {
    if (isLevel1 && currentQuestion) {
      const timer = setTimeout(() => {
        triggerWordAudio(currentQuestion.audioText, false);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isLevel1, currentQuestion, triggerWordAudio]);

  const handleSelectOption = useCallback(
    async (option: string) => {
      if (
        !currentQuestion ||
        isAnswered ||
        submittingAnswer ||
        gameEndedRef.current ||
        user.lives <= 0 ||
        answeredQuestionIdsRef.current.has(currentQuestion.id)
      ) {
        return;
      }

      answeredQuestionIdsRef.current.add(currentQuestion.id);
      const normalized = option.toUpperCase();
      setSelectedOption(normalized);
      setLastLivesDeducted(0);

      const correct = normalized === currentQuestion.correctAnswer;
      if (correct) {
        setCorrectCount((c) => c + 1);
        setSessionPoints((p) => p + 15);
        playFeedbackTone('correct');
      } else {
        setIncorrectCount((c) => c + 1);
        playFeedbackTone('incorrect');
      }

      setAnswers((prev) => [
        ...prev,
        { questionId: currentQuestion.id, selectedAnswer: normalized },
      ]);

      // In Level 2, speak the target English word right after answering so learner reinforces pronunciation
      if (!isLevel1) {
        setTimeout(() => {
          triggerWordAudio(currentQuestion.word, false);
        }, 260);
      }

      setSubmittingAnswer(true);
      try {
        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const result = await onAnswerQuestion(currentQuestion.id, normalized, durationSeconds);
        if (result) {
          setLastLivesDeducted(result.livesDeducted);
          if (result.gameOver || result.user.lives <= 0) {
            gameEndedRef.current = true;
            setGameEnded(true);
          }
        }
      } finally {
        setSubmittingAnswer(false);
      }
    },
    [
      isAnswered,
      submittingAnswer,
      user.lives,
      currentQuestion,
      isLevel1,
      triggerWordAudio,
      onAnswerQuestion,
    ],
  );

  const handleNext = useCallback(() => {
    if (!isAnswered || submitting || submittingAnswer || gameEndedRef.current || user.lives <= 0) {
      return;
    }

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setShowHint(false);
      setLastLivesDeducted(0);
    } else {
      playFeedbackTone('complete');
      const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      onSubmitAttempt(answers, durationSeconds);
    }
  }, [
    isAnswered,
    submitting,
    submittingAnswer,
    user.lives,
    currentIndex,
    questions.length,
    onSubmitAttempt,
    answers,
  ]);

  // Keyboard shortcuts: 1-4 select option, R replays audio, Enter advances
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameEndedRef.current || user.lives <= 0) {
        return;
      }
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
  }, [isAnswered, user.lives, currentQuestion, triggerWordAudio, handleNext, handleSelectOption]);

  const progressPercent = Math.round(
    ((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100,
  );

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Progress & Telemetry Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onExitToDashboard}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Sair para Painel
          </button>

          <div className="text-xs text-slate-500">
            Nível {batch.level} ({isLevel1 ? 'Áudio → Imagem' : 'Imagem → Palavra'}) ·{' '}
            {batch.source === 'gemini'
              ? 'Gerado por IA Gemini'
              : 'Lote validado de reserva'}
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <span className="font-mono-num">
              Pergunta {currentIndex + 1} de {questions.length}
            </span>
            <span className="font-mono-num">{progressPercent}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-700 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Live Session Counters */}
        <div className="grid grid-cols-4 gap-2 pt-1 text-center sm:text-left">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500">Pontuação</div>
            <div className="text-sm font-bold text-slate-900 font-mono-num">
              +{sessionPoints} pts
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500">Vidas</div>
            <div className="text-sm font-bold text-slate-900 font-mono-num inline-flex items-center gap-1">
              <Heart
                className={`w-3.5 h-3.5 ${user.lives > 0 ? 'text-rose-600 fill-rose-600' : 'text-slate-400'}`}
                aria-hidden="true"
              />
              {user.lives}/{user.maxLives}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="text-[11px] text-emerald-700">Corretas</div>
            <div className="text-sm font-bold text-emerald-800 font-mono-num">{correctCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200">
            <div className="text-[11px] text-red-700">Incorretas</div>
            <div className="text-sm font-bold text-red-800 font-mono-num">{incorrectCount}</div>
          </div>
        </div>
      </div>

      {/* Main Question Stage */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        {isLevel1 ? (
          <div className="text-center space-y-5">
            <div>
              <p className="text-sm font-semibold text-blue-700">Nível 1 — Reconhecimento Auditivo</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">
                Ouça a palavra e selecione a imagem correspondente
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => triggerWordAudio(currentQuestion.audioText, false)}
                className="inline-flex items-center gap-3 px-7 py-4 text-base font-bold text-white bg-blue-700 rounded-2xl hover:bg-blue-800 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
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

            {/* 4 Image Options Grid */}
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
                    disabled={isAnswered || submittingAnswer || isSessionLocked}
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
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
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
          /* NÍVEL 2: IMAGEM -> PALAVRA */
          <div className="text-center space-y-6">
            <div>
              <p className="text-sm font-semibold text-blue-700">Nível 2 — Reconhecimento Visual</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">
                Qual é a palavra em inglês para esta imagem?
              </h1>
            </div>

            <div className="flex flex-col items-center gap-3">
              <VocabIllustration
                imageKey={currentQuestion.imageKey}
                label={`Ilustração para identificar em inglês`}
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

            {/* 4 Word Options Grid */}
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
                    disabled={isAnswered || submittingAnswer || isSessionLocked}
                    onClick={() => handleSelectOption(optWord)}
                    className={`py-5 px-6 rounded-2xl text-xl font-extrabold tracking-wide flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:cursor-default ${btnStyle}`}
                  >
                    {isAnswered && isRightOption && (
                      <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" aria-hidden="true" />
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

        {/* Immediate Pedagogical Feedback Banner */}
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
                    <span>Correto! +15 pontos</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-700" aria-hidden="true" />
                    <span>
                      Incorreto — Resposta correta: {currentQuestion.correctAnswer}
                      {lastLivesDeducted > 0
                        ? ` · -${lastLivesDeducted} vida (${user.lives}/${user.maxLives} restantes)`
                        : user.lives === 0
                          ? ` · 0/${user.maxLives} vidas restantes`
                          : ''}
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm">
                <strong>{currentQuestion.word}</strong> ({currentQuestion.phonetic}) ={' '}
                <strong>{currentQuestion.translation}</strong>
              </p>
              <p className="text-xs opacity-90">
                Exemplo: “{currentQuestion.exampleSentence}” ({currentQuestion.exampleTranslation})
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
                disabled={submitting || submittingAnswer || isSessionLocked}
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {(submitting || submittingAnswer) && (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                )}
                {currentIndex + 1 < questions.length ? 'Próxima Pergunta' : 'Concluir e Ver Resultados'}
                {!submitting && !submittingAnswer && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
        )}

        <p className="hidden sm:block mt-5 text-center text-xs text-slate-400">
          Atalhos de teclado: 1–4 selecionar alternativa · R ouvir palavra · Enter avançar
        </p>
      </section>
    </main>
  );
};
