import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { withCallableTimeout } from './callable_timeout';

const FUNCTIONS_REGION = 'us-central1';

export type ClientReportKind =
  | 'user_report'
  | 'arena_opponent_report'
  | 'community_pack_report'
  | 'error_report'
  | 'spire_task_report'
  | 'app_error'
  | 'app_activity'
  | 'subscription_cancel_survey'
  | 'review_promo_claim';

export type SubmitClientReportResult = {
  ok: boolean;
  id?: string;
  collection?: string;
};

type SubmitClientReportRequest = {
  kind: ClientReportKind;
  payload: Record<string, unknown>;
  expectedStableUid?: string;
  idempotencyKey?: string;
};

export type SubmitClientReportOptions = {
  expectedStableUid?: string;
  idempotencyKey?: string;
};

type SubmitClientReportCallable = (
  data: SubmitClientReportRequest,
) => Promise<{ data: SubmitClientReportResult }>;

let submitClientReportCallable: SubmitClientReportCallable | null = null;

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

export async function submitClientReport(
  kind: ClientReportKind,
  payload: Record<string, unknown>,
  options: SubmitClientReportOptions = {},
): Promise<SubmitClientReportResult | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  const fn = getSubmitClientReportCallable();
  // 30с вместо ~70с дефолта RN Firebase: на висящей сети кнопка «Отправить»
  // не должна крутить спиннер больше минуты.
  const request: SubmitClientReportRequest = {
    kind,
    // зачем (§126 п.9): часть отчётов (error_report шлёт deviceOS) приходила без platform → 'unknown'
    // в админке. Одна общая точка: platform добавляется, если вызывающий не задал своё.
    payload: typeof payload.platform === 'string' && payload.platform ? payload : { ...payload, platform: Platform.OS },
    ...(options.expectedStableUid ? { expectedStableUid: options.expectedStableUid } : {}),
    ...(options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}),
  };
  const res = await withCallableTimeout(fn(request), 'submitClientReport');
  return res.data;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
