import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

const FUNCTIONS_REGION = 'us-central1';

export type ClientReportKind =
  | 'user_report'
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

function callable<TReq, TRes>(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
}

export async function submitClientReport(
  kind: ClientReportKind,
  payload: Record<string, unknown>,
): Promise<SubmitClientReportResult | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  const fn = callable<{ kind: ClientReportKind; payload: Record<string, unknown> }, SubmitClientReportResult>(
    'submitClientReport',
  );
  const res = await fn({ kind, payload });
  return res.data;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
