import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';

const FUNCTIONS_REGION = 'us-central1';

export type IdeaCategory = 'feature' | 'improvement' | 'monetization' | 'content' | 'other';

export interface IdeaInput {
  title: string;
  description: string;
  benefit: string;
  category: IdeaCategory;
  lang: string;
  userName?: string | null;
}

type SubmitUserIdeaResult = { ok: boolean; id?: string };

function callable<TReq, TRes>(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
}

/**
 * Отправить идею пользователя. Бросает ошибку при сбое/лимите (экран показывает
 * соответствующую модалку). Возвращает null только если облако недоступно.
 */
export async function submitUserIdea(input: IdeaInput): Promise<SubmitUserIdeaResult | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
  const fn = callable<{ payload: Record<string, unknown> }, SubmitUserIdeaResult>('submitUserIdea');
  const res = await fn({
    payload: {
      title: input.title,
      description: input.description,
      benefit: input.benefit,
      category: input.category,
      lang: input.lang,
      userName: input.userName ?? null,
      platform: Platform.OS,
      appVersion,
    },
  });
  return res.data;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
