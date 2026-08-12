import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasPermission, type AdminPermission } from '../admin/permissions';
import { hasAdminRole, type AdminRole } from '../admin/roles';
import { ENFORCE_APP_CHECK } from '../callable_options';
import { GROWTH_DAILY_COLLECTION } from '../growth_daily_aggregate';
import { buildAllDepartmentsSnapshot } from './all_departments_snapshot';
import { fetchContentSource } from './content_firestore_fetcher';
import { buildContentSnapshot } from './content_snapshot';
import { buildFactorySnapshot } from './factory_snapshot';
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
import { fetchRetentionSource } from './retention_firestore_fetcher';
import { buildRetentionSnapshot } from './retention_snapshot';
import { fetchSafetySource } from './safety_firestore_fetcher';
import { buildSafetySnapshot } from './safety_snapshot';
import { fetchSupportSource } from './support_firestore_fetcher';
import { buildSupportSnapshot } from './support_snapshot';
import { JARVIS_CONTROL_DOC, parseControl } from './control';
import { classifySeverity } from './severity';
import { fetchRecentApprovalAudit } from './approval_audit_reader';
import { runCohortRetentionDepartment } from './cohort_retention_department';
import { fetchCohortRetentionMetrics } from './learning_metrics';

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

function requireCohortOwnerAccess(request: CallableRequest): void {
  if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) {
    throw new HttpsError('permission-denied', 'Owner only');
  }
  if (request.auth.token.adminRole !== 'owner') {
    throw new HttpsError('permission-denied', 'Owner only');
  }
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

  // зачем общий читатель: «Контент» и «Фабрика» смотрят одну коллекцию
  // lesson_stats, но спрашивают разное. Без кэша один прогон стоил бы два
  // одинаковых запроса вместо одного.
  let lessonStatsOnce: ReturnType<typeof fetchContentSource> | null = null;
  const readLessonStats = () => {
    if (!lessonStatsOnce) lessonStatsOnce = fetchContentSource({ collection: db.collection('lesson_stats'), nowMs });
    return lessonStatsOnce;
  };

  // зачем параллельно, а не после снапшота: чтение режима не зависит от
  // департаментов, ждать его последовательно — терять время впустую.
  const controlPromise = db.doc(JARVIS_CONTROL_DOC).get().catch(() => null);

  const snapshot = await buildAllDepartmentsSnapshot({
    resolveAppTier: () => resolveAppTier(() => fetchActiveUserCount({ collection: db.collection('users'), nowMs })),
    runQuality: (appTier) => buildQualitySnapshot({
      fetchers: {
        error_reports: () => fetchQualitySource({ db, sourceId: 'error_reports', collection: db.collection('error_reports'), nowMs }),
        user_reports: () => fetchQualitySource({ db, sourceId: 'user_reports', collection: db.collection('user_reports'), nowMs }),
        app_errors: () => fetchQualitySource({ db, sourceId: 'app_errors', collection: db.collection('app_errors'), nowMs }),
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
      fetchers: { users: () => fetchGrowthSource({
        sourceId: 'users',
        collection: db.collection('users'),
        dailyCollection: db.collection(GROWTH_DAILY_COLLECTION),
        nowMs,
      }) },
      trigger: 'owner_request',
      question,
      nowMs,
    }),
    runContent: (appTier) => buildContentSnapshot({
      fetchers: { lesson_stats: readLessonStats },
      trigger: 'owner_request',
      question,
      nowMs,
      appTier,
    }),
    runFactory: (appTier) => buildFactorySnapshot({
      fetchFactory: readLessonStats,
      trigger: 'owner_request',
      question,
      nowMs,
      appTier,
    }),
    runRetention: (appTier) => buildRetentionSnapshot({
      fetchRetention: () => fetchRetentionSource({ collection: db.collection('users'), nowMs }),
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
      fetchSupport: () => fetchSupportSource({
        collection: db.collection('support_inbox'),
        syncDocument: db.doc('admin_config/support_inbox'),
        nowMs,
      }),
      trigger: 'owner_request',
      question,
      nowMs,
      appTier,
    }),
    nowMs,
  });

  const control = parseControl((await controlPromise)?.data());

  return {
    ok: true,
    generatedAtMs: snapshot.generatedAtMs,
    appTier: snapshot.appTier,
    mode: control.mode,
    // зачем добавлять severity здесь, а не заставлять панель считать её
    // заново: правило классификации живёт в одном месте (severity.ts),
    // и панель не должна знать департаменты наизусть.
    decisions: snapshot.decisions.map((decision) => ({ ...decision, severity: classifySeverity(decision) })),
    departmentErrors: snapshot.departmentErrors,
  };
});

/** Owner-only cohort view. It reads aggregate documents and never member markers. */
export const jarvisGetCohortRetention = onCall(OPTIONS, async (request: CallableRequest) => {
  requireCohortOwnerAccess(request);
  const now = new Date();
  const metrics = await fetchCohortRetentionMetrics({ db: admin.firestore(), now });
  const result = runCohortRetentionDepartment({
    metrics,
    trigger: 'owner_request',
    question: parseQuestion(request.data),
    nowMs: now.getTime(),
  });
  return {
    ok: true,
    generatedAtMs: now.getTime(),
    metrics,
    decisions: result.decisions,
  };
});

/**
 * Читает последние подтверждения/отклонения для панели (бриф в187: ссылки
 * из решения на аудит; в174: страница Audit).
 *
 * зачем те же права, что у jarvisGetAllDecisions: журнал подтверждений — это
 * тоже часть свода Джарвиса, доступ не должен быть шире основной панели.
 */
export const jarvisGetApprovalAudit = onCall(OPTIONS, async (request: CallableRequest) => {
  requireAllDepartmentsAccess(request);
  const db = admin.firestore();
  const entries = await fetchRecentApprovalAudit(db);
  return { ok: true, entries };
});
