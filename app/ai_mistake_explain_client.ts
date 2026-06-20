import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';

const FUNCTIONS_REGION = 'us-central1';

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

export async function callExplainMistake(req: ExplainMistakeRequest): Promise<ExplainMistakeResponse> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = httpsCallable<ExplainMistakeRequest, ExplainMistakeResponse>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'explainMistake',
  );
  const res = await fn(req);
  return res.data;
}
