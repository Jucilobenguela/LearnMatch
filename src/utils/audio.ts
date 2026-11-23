let activeAudio: HTMLAudioElement | null = null;
const blobUrlCache = new Map<string, string>();
let inMemoryAuthToken: string | null = null;

export function setAudioAuthToken(token: string | null): void {
  inMemoryAuthToken = token;
}

export function speakWithWebSpeech(word: string, rate = 0.9): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word.toLowerCase());
      utterance.lang = 'en-US';
      utterance.rate = rate;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const englishVoice =
        voices.find((v) => v.lang.startsWith('en-US')) ||
        voices.find((v) => v.lang.startsWith('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

const AUDIO_CLIENT_CACHE_VERSION = 'v2';

/**
 * Plays crystal-clear English pronunciation:
 * 1. Checks in-memory Blob cache / server-cached Gemini TTS endpoint (/api/audio/speak)
 * 2. Falls back seamlessly to browser Web Speech API (en-US)
 */
export async function playEnglishWord(
  word: string,
  options?: { slow?: boolean },
): Promise<'gemini_tts' | 'web_speech'> {
  const cleanWord = word.trim().toUpperCase();
  const cacheKey = `${AUDIO_CLIENT_CACHE_VERSION}:${cleanWord}`;
  const playbackRate = options?.slow ? 0.78 : 1.0;

  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }

  try {
    let blobUrl = blobUrlCache.get(cacheKey);
    if (!blobUrl) {
      const headers: Record<string, string> = {};
      if (inMemoryAuthToken) {
        headers['Authorization'] = `Bearer ${inMemoryAuthToken}`;
      }
      const response = await fetch(
        `/api/audio/speak?word=${encodeURIComponent(cleanWord)}&v=${AUDIO_CLIENT_CACHE_VERSION}`,
        { credentials: 'include', headers },
      );
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 100) {
          blobUrl = URL.createObjectURL(blob);
          blobUrlCache.set(cacheKey, blobUrl);
        }
      }
    }

    if (blobUrl) {
      const audio = new Audio(blobUrl);
      audio.playbackRate = playbackRate;
      activeAudio = audio;
      await audio.play();
      return 'gemini_tts';
    }
  } catch {
    // Fallback gracefully to Web Speech API
  }

  await speakWithWebSpeech(cleanWord, options?.slow ? 0.7 : 0.92);
  return 'web_speech';
}

/**
 * Subtle synthesized auditory feedback chimes (Web Audio API)
 * without external dependencies or jarring noise.
 */
export function playFeedbackTone(type: 'correct' | 'incorrect' | 'complete'): void {
  if (typeof window === 'undefined') return;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'correct') {
      const notes = [523.25, 659.25]; // C5 -> E5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.001, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.2);
      });
    } else if (type === 'incorrect') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.linearRampToValueAtTime(190, now + 0.2);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } else {
      const notes = [523.25, 659.25, 783.99]; // C5 -> E5 -> G5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.001, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.11, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch {
    // Ignore audio context restrictions
  }
}
