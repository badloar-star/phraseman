// "Second opinion" recognizer for borderline speaking attempts — fully on-device.
//
// When the fast native recognizer lands a learner in the borderline band (close
// to the pass threshold but not over), a heavier but more accent-robust model
// (whisper.rn — whisper.cpp on-device) can re-transcribe the SAME captured audio
// and, if it matches the target better, rescue a false fail. No cloud, no network.
//
// IMPORTANT — graceful degradation by design:
// The native `whisper.rn` package is NOT a hard dependency. It requires a native
// rebuild and a one-time ~32MB model download, which is a deliberate build/release
// decision. Until it is installed AND a model is provisioned, isSecondOpinionAvailable()
// returns false and the app behaves exactly as before. This file is therefore safe
// to ship in a JS-only tree: it never imports whisper.rn at module scope.
//
// This module is the SEAM. The scoring/decision logic here is pure and tested; the
// actual transcription is behind a lazy, guarded loader.

export const BORDERLINE_LOW = 55;
export const BORDERLINE_HIGH = 74;

/** A borderline attempt is close-but-not-passing — worth a second look. */
export function isBorderline(score: number, threshold: number): boolean {
  if (score >= threshold) return false; // already passed — no need
  return score >= BORDERLINE_LOW && score <= Math.min(BORDERLINE_HIGH, threshold - 1);
}

/** Minimal shape we need from a whisper.rn-like transcriber. */
export type WhisperLike = {
  transcribe: (
    audioPath: string,
    options?: Record<string, unknown>,
  ) => { promise: Promise<{ result?: string }> } | Promise<{ result?: string }>;
};

export type SecondOpinionLoader = () => WhisperLike | null;

// Default loader: try to require whisper.rn lazily. Returns null when the native
// module is absent (JS-only tree / model not installed) — callers MUST treat null
// as "second opinion unavailable" and keep the fast path's result.
const defaultLoader: SecondOpinionLoader = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('whisper.rn');
    const ctx = mod?.__phrasemanWhisperContext ?? null; // provisioned at app start when available
    if (ctx && typeof ctx.transcribe === 'function') return ctx as WhisperLike;
    return null;
  } catch {
    return null;
  }
};

let activeLoader: SecondOpinionLoader = defaultLoader;

/** Test/seam hook to inject a transcriber (or reset with null → default). */
export function __setSecondOpinionLoader(loader: SecondOpinionLoader | null): void {
  activeLoader = loader ?? defaultLoader;
}

export function isSecondOpinionAvailable(): boolean {
  return activeLoader() != null;
}

export type SecondOpinionInput = {
  audioPath: string | null | undefined;
  fastScore: number;
  threshold: number;
  /** Re-score a candidate transcript against the target. */
  scoreTranscript: (transcript: string) => number;
};

export type SecondOpinionResult = {
  ran: boolean;
  /** The better transcript to use, when the second opinion improved the score. */
  transcript?: string;
  score: number;
  reason: 'not_borderline' | 'unavailable' | 'no_audio' | 'no_improvement' | 'improved' | 'error';
};

/**
 * Run the second opinion when warranted. Always safe: returns the fast score
 * unchanged unless a strictly better transcript was found. Never throws.
 */
export async function maybeSecondOpinion(input: SecondOpinionInput): Promise<SecondOpinionResult> {
  const { audioPath, fastScore, threshold, scoreTranscript } = input;
  if (!isBorderline(fastScore, threshold)) {
    return { ran: false, score: fastScore, reason: 'not_borderline' };
  }
  const whisper = activeLoader();
  if (!whisper) return { ran: false, score: fastScore, reason: 'unavailable' };
  if (!audioPath) return { ran: false, score: fastScore, reason: 'no_audio' };

  try {
    const call = whisper.transcribe(audioPath, { language: 'en' });
    const settled = 'promise' in (call as any) ? await (call as any).promise : await call;
    const transcript = String(settled?.result ?? '').trim();
    if (!transcript) return { ran: true, score: fastScore, reason: 'no_improvement' };
    const newScore = scoreTranscript(transcript);
    if (newScore > fastScore) {
      return { ran: true, transcript, score: newScore, reason: 'improved' };
    }
    return { ran: true, score: fastScore, reason: 'no_improvement' };
  } catch {
    return { ran: true, score: fastScore, reason: 'error' };
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
