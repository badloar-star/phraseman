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
  accentColor?: string;
  finalTitle?: string;
  finalSubtitle?: string;
  questions: SurveyQuestionClient[];
};

export type ActiveSurveyLookupResult = {
  survey: ActiveSurvey | null;
  completion: { completedAtMs: number } | null;
};

export type SubmitSurveyResult = {
  ok: boolean;
  alreadyGranted: boolean;
  reward: number;
  eventId: string;
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
}): Promise<ActiveSurveyLookupResult> {
  if (!isSurveyCloudEnabled()) return { survey: null, completion: null };
  const res = await callFunction<typeof data, ActiveSurveyLookupResult>(
    'getActiveShardSurvey',
    data,
  );
  return { survey: res.survey ?? null, completion: res.completion ?? null };
}

/**
 * Auth linking and Firebase App Check can finish just after a focused screen
 * starts its first request. Retry the read briefly so a newly enabled survey
 * does not disappear until the user leaves and re-enters the screen.
 */
export async function fetchActiveSurveyWithRetry(
  data: { stableId: string; platform: string; lang: string },
  options: { attempts?: number; delayMs?: number; wait?: (ms: number) => Promise<void> } = {},
): Promise<ActiveSurveyLookupResult> {
  const requestedAttempts = Number(options.attempts ?? 3);
  const attempts = Math.min(5, Math.max(1, Number.isFinite(requestedAttempts)
    ? Math.floor(requestedAttempts)
    : 3));
  const delayMs = Math.min(2000, Math.max(0, Math.floor(Number(options.delayMs ?? 350)) || 0));
  const wait = options.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let lastError: unknown;
  let lastResult: ActiveSurveyLookupResult = { survey: null, completion: null };
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      lastResult = await fetchActiveSurvey(data);
      if (lastResult.survey || lastResult.completion) return lastResult;
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts - 1 && delayMs > 0) {
      await wait(delayMs);
    }
  }
  if (lastError) throw lastError;
  return lastResult;
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
