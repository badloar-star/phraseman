import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasPermission, type AdminPermission } from '../admin/permissions';
import { hasAdminRole, type AdminRole } from '../admin/roles';
import { ENFORCE_APP_CHECK } from '../callable_options';
import { buildAllDepartmentsSnapshot } from './all_departments_snapshot';
import { fetchContentSource } from './content_firestore_fetcher';
import { buildContentSnapshot } from './content_snapshot';
import { fetchPaymentsSource } from './payments_firestore_fetcher';
import { buildPaymentsSnapshot } from './payments_snapshot';
import { resolveAppTier } from './app_tier_resolver';
import { fetchActiveUserCount } from './app_tier_reader';
import { fetchGrowthSource } from './growth_firestore_fetcher';
import { buildGrowthSnapshot } from './growth_snapshot';
import { fetchMoneySource } from './money_firestore_fetcher';
import { buildMoneySnapshot } from './money_snapshot';
import { fetchQualitySource } from './quality_firestore_fetcher';
import { buildQualitySnapshot } from './quality_snapshot';
import { fetchSafetySource } from './safety_firestore_fetcher';
import { buildSafetySnapshot } from './safety_snapshot';
import { fetchSupportSource } from './support_firestore_fetcher';
import { buildSupportSnapshot } from './support_snapshot';

/**
 * Одна кнопка «Проверить сейчас», один вызов, все три департамента разом.
 *
 * зачем: владелец 2026-08-02 — панель не должна дёргать три отдельных
 * callable по отдельности, результат должен быть одним объединённым окном.
 * Требует ВСЕ ТРИ права одновременно (diagnostics.read + money.read +
 * users.read) — это сужает доступ сильнее, чем любой отдельный департамент
 * (support видит Качество/Рост по отдельности, но не общий свод с деньгами).
 */

const REGION = 'us-central1';
const REQUIRED_PERMISSIONS: readonly AdminPermission[] = ['diagnostics.read', 'money.read', 'users.read'];
const MAX_QUESTION_LEN = 300;

const OPTIONS = Object.freeze({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 30,
  memory: '256MiB' as const,
});

interface CallableRequest {
  readonly auth?: { readonly uid?: string; readonly token?: Record<string, unknown> } | null;
  readonly data?: unknown;
}

function requireAllDepartmentsAccess(request: CallableRequest): void {
  if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const claimedRole = request.auth.token.adminRole;
  if (!hasAdminRole(claimedRole)) throw new HttpsError('permission-denied', 'Valid adminRole required');
  const role: AdminRole = claimedRole;
  const missing = REQUIRED_PERMISSIONS.find((permission) => !hasPermission(role, permission));
  if (missing) throw new HttpsError('permission-denied', `Role cannot use ${missing}`);
}

function parseQuestion(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const question = (data as Record<string, unknown>).question;
  return typeof question === 'string' && question.trim() ? question.trim().slice(0, MAX_QUESTION_LEN) : undefined;
}

export const jarvisGetAllDecisions = onCall(OPTIONS, async (request: CallableRequest) => {
  requireAllDepartmentsAccess(request);
  const question = parseQuestion(request.data);
  const db = admin.firestore();
  const nowMs = Date.now();

  const snapshot = await buildAllDepartmentsSnapshot({
    resolveAppTier: () => resolveAppTier(() => fetchActiveUserCount({ collection: db.collection('users'), nowMs })),
    runQuality: (appTier) => buildQualitySnapshot({
      fetchers: {
        error_reports: () => fetchQualitySource({ sourceId: 'error_reports', collection: db.collection('error_reports'), nowMs }),
        user_reports: () => fetchQualitySource({ sourceId: 'user_reports', collection: db.collection('user_reports'), nowMs }),
        app_errors: () => fetchQualitySource({ sourceId: 'app_errors', collection: db.collection('app_errors'), nowMs }),
      },
      trigger: 'owner_request',
      question,
      nowMs,
      appTier,
    }),
    runMoney: (appTier) => buildMoneySnapshot({
      fetchers: {
        revenuecat_premium_events: () => fetchMoneySource({ sourceId: 'revenuecat_premium_events', collection: db.collection('revenuecat_premium_events'), nowMs }),
        paywall_funnel: () => fetchMoneySource({ sourceId: 'paywall_funnel', collection: db.collection('paywall_funnel'), nowMs }),
      },
      trigger: 'owner_request',
      question,
      nowMs,
      appTier,
    }),
    runGrowth: () => buildGrowthSnapshot({
      fetchers: { users: () => fetchGrowthSource({ sourceId: 'users', collection: db.collection('users'), nowMs }) },
      trigger: 'owner_request',
      question,
      nowMs,
    }),
    runContent: (appTier) => buildContentSnapshot({
      fetchers: { lesson_stats: () => fetchContentSource({ collection: db.collection('lesson_stats'), nowMs }) },
      trigger: 'owner_request',
      question,
      nowMs,
      appTier,
    }),
    runPayments: (appTier) => buildPaymentsSnapshot({
      fetchers: {
        telegram_premium_dead_letter: () => fetchPaymentsSource({ sourceId: 'telegram_premium_dead_letter', collection: db.collection('telegram_premium_dead_letter'), nowMs }),
        revenuecat_premium_denials: () => fetchPaymentsSource({ sourceId: 'revenuecat_premium_denials', collection: db.collection('revenuecat_premium_denials'), nowMs }),
      },
      trigger: 'owner_request',
      question,
      nowMs,
      appTier,
    }),
    runSafety: (appTier) => buildSafetySnapshot({
      fetchSafety: () => fetchSafetySource({ db, nowMs }),
      trigger: 'owner_request',
      question,
      nowMs,
      appTier,
    }),
    runSupport: (appTier) => buildSupportSnapshot({
      fetchSupport: () => fetchSupportSource({ collection: db.collection('support_inbox'), nowMs }),
      trigger: 'owner_request',
      question,
      nowMs,
      appTier,
    }),
    nowMs,
  });

  return {
    ok: true,
    generatedAtMs: snapshot.generatedAtMs,
    appTier: snapshot.appTier,
    decisions: snapshot.decisions,
    departmentErrors: snapshot.departmentErrors,
  };
});
