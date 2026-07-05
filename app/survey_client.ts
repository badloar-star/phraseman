// ════════════════════════════════════════════════════════════════════════════
// survey_client.ts — клиент опросов за осколки (callable-обёртки).
// Модель по образцу community_packs/functionsClient.ts.
// ════════════════════════════════════════════════════════════════════════════
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';

const FUNCTIONS_REGION = 'us-central1';

export type SurveyQuestionClient = {
  id: string;
  type: 'single_choice' | 'text';
  text: string;
  options: { id: string; label: string }[];
};

export type ActiveSurvey = {
  surveyId: string;
  title: string;
  subtitle: string;
  rewardShards: number;
  questions: SurveyQuestionClient[];
};

export type SubmitSurveyResult = {
  ok: boolean;
  alreadyGranted: boolean;
  reward: number;
  balanceAfter: number;
  shardsUpdatedAtMs: number | null;
};

export function isSurveyCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

async function callFunction<TReq, TRes>(name: string, data: TReq): Promise<TRes> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<TReq, TRes>(name);
  const res = await fn(data);
  return res.data;
}

export async function fetchActiveSurvey(data: {
  stableId: string;
  platform: string;
  lang: string;
}): Promise<ActiveSurvey | null> {
  if (!isSurveyCloudEnabled()) return null;
  const res = await callFunction<typeof data, { survey: ActiveSurvey | null }>(
    'getActiveShardSurvey',
    data,
  );
  return res.survey ?? null;
}

export async function submitSurvey(data: {
  stableId: string;
  surveyId: string;
  answers: Record<string, { optionId?: string; comment?: string }>;
  platform: string;
  appVersion: string;
}): Promise<SubmitSurveyResult> {
  return callFunction<typeof data, SubmitSurveyResult>('submitShardSurvey', data);
}
