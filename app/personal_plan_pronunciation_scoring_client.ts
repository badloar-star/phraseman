import {
  PRONUNCIATION_PASS_THRESHOLD,
  scorePronunciationTranscript,
} from './personal_plan_pronunciation_scoring_core';

export const PLAN_PRONUNCIATION_PASS_THRESHOLD = PRONUNCIATION_PASS_THRESHOLD;
export const PLAN_PRONUNCIATION_SCORING_PROVIDER = 'device_speech_recognition' as const;
export const PLAN_PRONUNCIATION_SCORING_VERSION = 'device-transcript-match-v1';

export type PlanPronunciationScoringResult = {
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
  provider: typeof PLAN_PRONUNCIATION_SCORING_PROVIDER;
  scoringVersion: string;
  recognitionConfidence: number;
};

export type ScorePlanPronunciationTranscriptInput = {
  targetText: string;
  transcript: string;
  recognitionConfidence?: number;
};

export function scorePlanPronunciationTranscript(
  input: ScorePlanPronunciationTranscriptInput,
): PlanPronunciationScoringResult {
  const scored = scorePronunciationTranscript({
    targetText: input.targetText,
    transcript: input.transcript,
    threshold: PLAN_PRONUNCIATION_PASS_THRESHOLD,
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
    provider: PLAN_PRONUNCIATION_SCORING_PROVIDER,
    scoringVersion: PLAN_PRONUNCIATION_SCORING_VERSION,
    recognitionConfidence: Math.max(0, Math.min(1, rawConfidence)),
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
