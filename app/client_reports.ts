import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withCallableTimeout } from './callable_timeout';

const FUNCTIONS_REGION = 'us-central1';

export type ClientReportKind =
  | 'user_report'
  | 'arena_opponent_report'
  | 'community_pack_report'
  | 'error_report'
  | 'app_error'
  | 'app_activity'
  | 'subscription_cancel_survey'
  | 'review_promo_claim';

type SubmitClientReportResult = {
  ok: boolean;
  id?: string;
  collection?: string;
};

type SubmitClientReportRequest = {
  kind: ClientReportKind;
  payload: Record<string, unknown>;
};

type SubmitClientReportCallable = (
  data: SubmitClientReportRequest,
) => Promise<{ data: SubmitClientReportResult }>;

let submitClientReportCallable: SubmitClientReportCallable | null = null;
let appCheckWarmupInFlight: Promise<void> | null = null;

function callable<TReq, TRes>(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
}

function getSubmitClientReportCallable(): SubmitClientReportCallable {
  if (!submitClientReportCallable) {
    submitClientReportCallable = callable<SubmitClientReportRequest, SubmitClientReportResult>(
      'submitClientReport',
    );
  }
  return submitClientReportCallable;
}

function warmClientReportAppCheck(): Promise<void> {
  if (!appCheckWarmupInFlight) {
    appCheckWarmupInFlight = initFirebaseAppCheckIfAvailable()
      .catch(() => false)
      .then(() => undefined)
      .finally(() => {
        appCheckWarmupInFlight = null;
      });
  }
  return appCheckWarmupInFlight;
}

export async function submitClientReport(
  kind: ClientReportKind,
  payload: Record<string, unknown>,
): Promise<SubmitClientReportResult | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  await warmClientReportAppCheck();
  const fn = getSubmitClientReportCallable();
  // 30с вместо ~70с дефолта RN Firebase: на висящей сети кнопка «Отправить»
  // не должна крутить спиннер больше минуты.
  const res = await withCallableTimeout(fn({ kind, payload }), 'submitClientReport');
  return res.data;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
