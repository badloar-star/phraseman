// Registry of on-device whisper models, keyed by the spoken TARGET language.
//
// Why a registry (not a single hardcoded model): today the speaking target is
// always English, so the English-only model (`tiny.en`) is the best choice —
// it is smaller AND more accurate on English than the multilingual model. When
// other target languages are added, the code must transparently pick a
// multilingual model for them without touching the recorder or the panel.
//
// This module is PURE (no React / native imports) so the language→model
// mapping and the "which files may stay on disk" logic are fully unit-testable.
// The download / filesystem / whisper wiring lives in speaking_neural_judge.

/** A single downloadable whisper model. */
export interface WhisperModelSpec {
  /** File name on disk (also the cache key). */
  fileName: string;
  /** Remote source (Hugging Face whisper.cpp ggml weights). */
  url: string;
  /** Sanity floor: a truncated/aborted download smaller than this is not a model. */
  minBytes: number;
  /** true when this model is English-only (transcribe language must be 'en'). */
  englishOnly: boolean;
}

/**
 * English-only model: quantized whisper tiny.en (~32 MB). Smaller and more
 * accurate on English than the multilingual tiny — the right default while the
 * only target language is English.
 */
export const MODEL_EN: WhisperModelSpec = {
  fileName: 'ggml-tiny.en-q5_1.bin',
  url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-q5_1.bin',
  minBytes: 30 * 1024 * 1024,
  englishOnly: true,
};

/**
 * Multilingual model: quantized whisper base (~60 MB). Used for any non-English
 * target. `base` (not multilingual `tiny`) because the extra accuracy matters
 * once we can't lean on an English-specialized model; the size delta is a
 * one-time per-device download, not app weight.
 */
export const MODEL_MULTILINGUAL: WhisperModelSpec = {
  fileName: 'ggml-base-q5_1.bin',
  url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
  minBytes: 50 * 1024 * 1024,
  englishOnly: false,
};

/** Every model the app can ever download — the allow-list the pruner keeps. */
export const ALL_WHISPER_MODELS: readonly WhisperModelSpec[] = [
  MODEL_EN,
  MODEL_MULTILINGUAL,
];

/** Subdirectory (under documentDirectory) that holds the model files. */
export const WHISPER_MODEL_DIRECTORY = 'neural_judge';

/**
 * Normalize a BCP-47 recognition locale ('en-US', 'en_GB', 'EN') to its base
 * language subtag in lower case ('en'). Empty / malformed input falls back to
 * 'en' — the current guaranteed target.
 */
export function baseLanguageOf(locale: string | null | undefined): string {
  const raw = (locale ?? '').trim().toLowerCase();
  if (!raw) return 'en';
  // Split on '-' or '_'; the first segment is the language subtag.
  const lang = raw.split(/[-_]/)[0];
  return lang || 'en';
}

/**
 * Pick the whisper model for a spoken target locale. English → the English-only
 * model; everything else → the multilingual model.
 */
export function resolveWhisperModel(locale: string | null | undefined): WhisperModelSpec {
  return baseLanguageOf(locale) === 'en' ? MODEL_EN : MODEL_MULTILINGUAL;
}

/**
 * whisper transcribe `language` option for a locale. English-only model must be
 * driven with 'en'; the multilingual model is told the base language so it does
 * not waste a slot auto-detecting (and never mis-detects a short phrase).
 */
export function whisperLanguageFor(locale: string | null | undefined): string {
  return baseLanguageOf(locale);
}

/**
 * Given the file names currently on disk and the model we intend to keep,
 * return the names that should be DELETED. Pure set logic — the caller does the
 * actual unlink. Keeps only the active model; every other known-or-unknown
 * `.bin` in the model directory is disposable (old target language, superseded
 * quantization, half-download left by a crash).
 */
export function modelsToPrune(
  filesOnDisk: readonly string[],
  keepFileName: string,
): string[] {
  return filesOnDisk.filter((name) => name !== keepFileName);
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
