import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withExplainCallableTimeout } from './explain_callable_timeout';

const FUNCTIONS_REGION = 'us-central1';
const explainMistakeInFlight = new Map<string, Promise<ExplainMistakeResponse>>();

export type MistakeExplainVariant = 'full' | 'eli5';

export interface MistakeDiffPair {
  expected: string;
  picked: string;
}

export interface ExplainMistakeRequest {
  lessonId: number;
  phraseId: string;
  studyTarget: string;
  interfaceLang: string;
  prompt?: string;
  userAnswer: string;
  targetAnswer: string;
  phraseMeaning?: string;
  selectedWrongWord?: string;
  expectedWord?: string;
  /** Every mismatched word pair, not just the first — lets the AI explain the WHOLE error. */
  diffPairs?: MistakeDiffPair[];
  /** 'full' = inline breakdown (default), 'eli5' = explain-like-I'm-five modal text. */
  variant?: MistakeExplainVariant;
}

export interface ExplainMistakeResponse {
  ok: true;
  text: string;
  remainingQuota: number;
  model: string;
  fromCache?: boolean;
  variant?: MistakeExplainVariant;
}

function explainMistakeRequestKey(req: ExplainMistakeRequest): string {
  return JSON.stringify({
    lessonId: req.lessonId,
    phraseId: req.phraseId,
    studyTarget: req.studyTarget,
    interfaceLang: req.interfaceLang,
    prompt: req.prompt,
    userAnswer: req.userAnswer,
    targetAnswer: req.targetAnswer,
    phraseMeaning: req.phraseMeaning,
    selectedWrongWord: req.selectedWrongWord,
    expectedWord: req.expectedWord,
    diffPairs: req.diffPairs,
    variant: req.variant,
  });
}

export async function callExplainMistake(req: ExplainMistakeRequest): Promise<ExplainMistakeResponse> {
  const key = explainMistakeRequestKey(req);
  const existing = explainMistakeInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable<ExplainMistakeRequest, ExplainMistakeResponse>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'explainMistake',
    );
    const res = await withExplainCallableTimeout(fn(req), 'explainMistake');
    return res.data;
  })().finally(() => {
    explainMistakeInFlight.delete(key);
  });

  explainMistakeInFlight.set(key, request);
  return request;
}
