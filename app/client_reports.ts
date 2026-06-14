import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';

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
  /** +1 осколок за содержательный баг-репорт (сервер, ≤3/сутки). 0 если не начислен. */
  shardAwarded?: number;
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
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<{ kind: ClientReportKind; payload: Record<string, unknown> }, SubmitClientReportResult>(
    'submitClientReport',
  );
  const res = await fn({ kind, payload });
  // Сервер мог начислить +1 осколок за содержательный баг-репорт. Подтягиваем облачный
  // баланс в локальный и показываем модалку награды (динамический импорт — без циклов).
  const shardAwarded = Number(res.data?.shardAwarded) || 0;
  if (shardAwarded > 0) {
    void (async () => {
      try {
        const shards = await import('./shards_system');
        await shards.loadShardsFromCloud();
        const { emitAppEvent } = await import('./events');
        emitAppEvent('shards_earned', { amount: shardAwarded, reasonKey: 'bug_report' });
      } catch {
        // Награда необязательна для успеха репорта — молчим при сбое подтяжки баланса.
      }
    })();
  }
  return res.data;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
