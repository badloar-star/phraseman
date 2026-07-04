import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withCallableTimeout } from './callable_timeout';

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
type SubmitUserIdeaRequest = { payload: Record<string, unknown> };
type SubmitUserIdeaCallable = (
  data: SubmitUserIdeaRequest,
) => Promise<{ data: SubmitUserIdeaResult }>;

let submitUserIdeaCallable: SubmitUserIdeaCallable | null = null;
let ideaAppCheckWarmupInFlight: Promise<void> | null = null;

function callable<TReq, TRes>(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
}

function getSubmitUserIdeaCallable(): SubmitUserIdeaCallable {
  if (!submitUserIdeaCallable) {
    submitUserIdeaCallable = callable<SubmitUserIdeaRequest, SubmitUserIdeaResult>('submitUserIdea');
  }
  return submitUserIdeaCallable;
}

function warmIdeasAppCheck(): Promise<void> {
  if (!ideaAppCheckWarmupInFlight) {
    ideaAppCheckWarmupInFlight = initFirebaseAppCheckIfAvailable()
      .catch(() => false)
      .then(() => undefined)
      .finally(() => {
        ideaAppCheckWarmupInFlight = null;
      });
  }
  return ideaAppCheckWarmupInFlight;
}

/**
 * Отправить идею пользователя. Бросает ошибку при сбое/лимите (экран показывает
 * соответствующую модалку). Возвращает null только если облако недоступно.
 */
export async function submitUserIdea(input: IdeaInput): Promise<SubmitUserIdeaResult | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  await warmIdeasAppCheck();
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
  const fn = getSubmitUserIdeaCallable();
  // 30с вместо ~70с дефолта: отправка идеи не должна висеть минуту на плохой сети.
  const res = await withCallableTimeout(
    fn({
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
    }),
    'submitUserIdea',
  );
  return res.data;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
