import {
  PRONUNCIATION_PASS_THRESHOLD,
  scorePronunciationTranscript,
  type TranscriptSegment,
} from './pronunciation_scoring_core';
import { getRemoteBool } from './remote_flags';

export const SPEECH_PRONUNCIATION_PASS_THRESHOLD = PRONUNCIATION_PASS_THRESHOLD;
export const SPEECH_PRONUNCIATION_SCORING_PROVIDER = 'device_speech_recognition' as const;
export const SPEECH_PRONUNCIATION_SCORING_VERSION = 'device-transcript-match-v1';

export type PronunciationScoringResult = {
  ok: true;
  transcript: string;
  score: number;
  passed: boolean;
  threshold: number;
  breakdown?: {
    wordAccuracy?: number;
    orderAccuracy?: number;
    completeness?: number;
  };
  provider: typeof SPEECH_PRONUNCIATION_SCORING_PROVIDER;
  scoringVersion: string;
  recognitionConfidence: number;
  /** Значимые слова цели, которых не было в речи (для логов [SPEAK-SCORE] и подсказки). */
  missingWords: string[];
  /** Итог проверки слов (строгой или мягкой — по флагу). */
  strictWordsOk: boolean;
  /** Какой режим проверки слов применён. */
  strictMode: boolean;
  /** Уверенность ОС по каждому слову цели ([слово, 0..1 | null]); пока только лог/подсказка, без порога. */
  wordConfidence: Array<[string, number | null]>;
};

export type ScorePronunciationTranscriptInput = {
  targetText: string;
  transcript: string;
  recognitionConfidence?: number;
  /** Optional per-word segments for the low-confidence soft-miss. */
  segments?: readonly TranscriptSegment[];
};

export function scoreSpeechPronunciationTranscript(
  input: ScorePronunciationTranscriptInput,
): PronunciationScoringResult {
  // зачем (15.10): строгая проверка слов включена по умолчанию; выключатель — remote_config/app.bools,
  // читается из уже загруженного кэша (getRemoteBool), без новых запросов к Firestore.
  const strictMode = getRemoteBool('speaking_strict_check_enabled');
  const scored = scorePronunciationTranscript({
    targetText: input.targetText,
    transcript: input.transcript,
    threshold: SPEECH_PRONUNCIATION_PASS_THRESHOLD,
    segments: input.segments,
    strictWords: strictMode,
  });
  const rawConfidence = typeof input.recognitionConfidence === 'number'
    && Number.isFinite(input.recognitionConfidence)
    && input.recognitionConfidence >= 0
    ? input.recognitionConfidence
    : 1;

  return {
    ok: true,
    transcript: input.transcript.trim(),
    score: scored.score,
    passed: scored.passed,
    threshold: scored.threshold,
    breakdown: scored.breakdown,
    provider: SPEECH_PRONUNCIATION_SCORING_PROVIDER,
    scoringVersion: SPEECH_PRONUNCIATION_SCORING_VERSION,
    recognitionConfidence: Math.max(0, Math.min(1, rawConfidence)),
    missingWords: scored.missingWords ?? [],
    strictWordsOk: scored.strictWordsOk ?? scored.passed,
    strictMode,
    wordConfidence: scored.wordConfidence ?? [],
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
