import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';

const FUNCTIONS_REGION = 'us-central1';

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
}

export interface ExplainMistakeResponse {
  ok: true;
  text: string;
  remainingQuota: number;
  model: string;
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
