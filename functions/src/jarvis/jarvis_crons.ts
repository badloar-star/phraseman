import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { fetchActiveUserCount } from './app_tier_reader';
import { resolveAppTier } from './app_tier_resolver';
import { buildAllDepartmentsSnapshot } from './all_departments_snapshot';
import { fetchQualitySource } from './quality_firestore_fetcher';
import { buildQualitySnapshot } from './quality_snapshot';
import { fetchMoneySource } from './money_firestore_fetcher';
import { buildMoneySnapshot } from './money_snapshot';
import { fetchGrowthSource } from './growth_firestore_fetcher';
import { buildGrowthSnapshot } from './growth_snapshot';
import { fetchContentSource } from './content_firestore_fetcher';
import { buildContentSnapshot } from './content_snapshot';
import { buildFactorySnapshot } from './factory_snapshot';
import { fetchPaymentsSource } from './payments_firestore_fetcher';
import { buildPaymentsSnapshot } from './payments_snapshot';
import { fetchSafetySource } from './safety_firestore_fetcher';
import { buildSafetySnapshot } from './safety_snapshot';
import { fetchSupportSource } from './support_firestore_fetcher';
import { buildSupportSnapshot } from './support_snapshot';
import { buildDailyHistoryPoint } from './business_tier_daily_point';
import { dayKeyFromMs, dayKeyToStartMs, nextDayKey, type RawRevenueEventForBucketing } from './business_tier_history';
import { readRecentHistory, writeHistoryPoints, writePeakTier } from './business_tier_history_store';
import { buildBusinessTierSnapshot } from './business_tier_snapshot';
import { readPeakTier } from './business_tier_history_store';

/**
 * Суточные планировщики Джарвиса — второй режим работы наряду с «по кнопке».
 *
 * зачем раз в сутки (владелец 2026-08-01): непрерывный режим отвергнут —
 * он съедает бюджет и не добавляет пользы. Крон даёт свежий снимок к утру,
 * панель по требованию даёт то же самое немедленно, через ОДИН И ТОТ ЖЕ шов
 * (build*Snapshot) — Telegram и админка не могут разойтись в показаниях.
 */

const REGION = 'us-central1';

const DEPARTMENTS_SCHEDULE_OPTIONS = {
  schedule: 'every day 06:00',
  timeZone: 'UTC',
  region: REGION,
  retryCount: 1,
  timeoutSeconds: 300,
  memory: '256MiB' as const,
} as const;

/**
 * зачем на час позже департаментов: точка истории должна лечь после того,
 * как суточные счётчики устоялись, и не соревноваться с ними за квоты.
 */
const HISTORY_SCHEDULE_OPTIONS = {
  schedule: 'every day 07:00',
  timeZone: 'UTC',
  region: REGION,
  retryCount: 1,
  timeoutSeconds: 300,
  memory: '256MiB' as const,
} as const;

/** Верхняя граница событий за сутки — тот же приём, что в бэкфилле. */
const DAILY_REVENUE_LIMIT = 2_000;

async function fetchTodayRevenueRows(
  db: FirebaseFirestore.Firestore,
  nowMs: number,
): Promise<RawRevenueEventForBucketing[]> {
  const dayKey = dayKeyFromMs(nowMs);
  const fromMs = dayKeyToStartMs(dayKey);
  const toMs = dayKeyToStartMs(nextDayKey(dayKey));
  try {
    const snap = await db
      .collection('revenuecat_premium_events')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(fromMs))
      .where('createdAt', '<', admin.firestore.Timestamp.fromMillis(toMs))
      .select(
        'createdAt', 'eventType', 'periodType',
        'grossUsdMicros', 'estimatedProceedsUsdMicros', 'financialCoverage', 'billingCadence',
      )
      .limit(DAILY_REVENUE_LIMIT)
      .get();
    // guard-ok: один .get() выше вернул страницу разом; .map() ниже раскладывает
    // уже полученные документы в памяти, без чтений Firestore в цикле.
    return snap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const createdAt = data.createdAt as { toMillis?: () => number } | undefined;
      return {
        atMs: typeof createdAt?.toMillis === 'function' ? createdAt.toMillis() : null,
        eventType: data.eventType,
        periodType: data.periodType,
        grossUsdMicros: typeof data.grossUsdMicros === 'number' ? data.grossUsdMicros : null,
        estimatedProceedsUsdMicros: typeof data.estimatedProceedsUsdMicros === 'number' ? data.estimatedProceedsUsdMicros : null,
        financialCoverage: (data.financialCoverage === 'complete' || data.financialCoverage === 'partial' || data.financialCoverage === 'unavailable')
          ? data.financialCoverage
          : null,
        billingCadence: (data.billingCadence === 'monthly' || data.billingCadence === 'yearly' || data.billingCadence === 'lifetime' || data.billingCadence === 'unknown')
          ? data.billingCadence
          : null,
      };
    });
  } catch (error) {
    logger.warn('jarvis_daily_history: revenue read failed', error);
    return [];
  }
}

async function readTotalUsers(db: FirebaseFirestore.Firestore): Promise<number> {
  try {
    // guard-ok: .count() — серверная агрегация, документы не выкачиваются;
    // limit() здесь усёк бы сам результат подсчёта.
    const snap = await db.collection('users').count().get();
    const count = snap.data().count;
    return typeof count === 'number' && Number.isFinite(count) && count >= 0 ? count : 0;
  } catch {
    return 0;
  }
}

/**
 * Суточный проход всех департаментов. Решения строятся тем же швом, что и
 * панель; крон их не рассылает и никуда не пишет — на этом рубеже он лишь
 * прогревает картину и логирует итог. Отправка в Telegram появится на Р3,
 * когда владелец даст Telegram ID.
 */
export const jarvisDailyDepartmentsCron = onSchedule(DEPARTMENTS_SCHEDULE_OPTIONS, async () => {
  const db = admin.firestore();
  const nowMs = Date.now();

  // зачем общий читатель: «Контент» и «Фабрика» смотрят одну коллекцию
  // lesson_stats с разными вопросами — без кэша это два одинаковых запроса.
  let lessonStatsOnce: ReturnType<typeof fetchContentSource> | null = null;
  const readLessonStats = () => {
    if (!lessonStatsOnce) lessonStatsOnce = fetchContentSource({ collection: db.collection('lesson_stats'), nowMs });
    return lessonStatsOnce;
  };

  const snapshot = await buildAllDepartmentsSnapshot({
    resolveAppTier: () => resolveAppTier(() => fetchActiveUserCount({ collection: db.collection('users'), nowMs })),
    runQuality: (appTier) => buildQualitySnapshot({
      fetchers: {
        error_reports: () => fetchQualitySource({ sourceId: 'error_reports', collection: db.collection('error_reports'), nowMs }),
        user_reports: () => fetchQualitySource({ sourceId: 'user_reports', collection: db.collection('user_reports'), nowMs }),
        app_errors: () => fetchQualitySource({ sourceId: 'app_errors', collection: db.collection('app_errors'), nowMs }),
      },
      trigger: 'scheduled',
      nowMs,
      appTier,
    }),
    runMoney: (appTier) => buildMoneySnapshot({
      fetchers: {
        revenuecat_premium_events: () => fetchMoneySource({ sourceId: 'revenuecat_premium_events', collection: db.collection('revenuecat_premium_events'), nowMs }),
        paywall_funnel: () => fetchMoneySource({ sourceId: 'paywall_funnel', collection: db.collection('paywall_funnel'), nowMs }),
      },
      trigger: 'scheduled',
      nowMs,
      appTier,
    }),
    runGrowth: () => buildGrowthSnapshot({
      fetchers: { users: () => fetchGrowthSource({ sourceId: 'users', collection: db.collection('users'), nowMs }) },
      trigger: 'scheduled',
      nowMs,
    }),
    runContent: (appTier) => buildContentSnapshot({
      fetchers: { lesson_stats: readLessonStats },
      trigger: 'scheduled',
      nowMs,
      appTier,
    }),
    runFactory: (appTier) => buildFactorySnapshot({
      fetchFactory: readLessonStats,
      trigger: 'scheduled',
      nowMs,
      appTier,
    }),
    runPayments: (appTier) => buildPaymentsSnapshot({
      fetchers: {
        telegram_premium_dead_letter: () => fetchPaymentsSource({ sourceId: 'telegram_premium_dead_letter', collection: db.collection('telegram_premium_dead_letter'), nowMs }),
        revenuecat_premium_denials: () => fetchPaymentsSource({ sourceId: 'revenuecat_premium_denials', collection: db.collection('revenuecat_premium_denials'), nowMs }),
      },
      trigger: 'scheduled',
      nowMs,
      appTier,
    }),
    runSafety: (appTier) => buildSafetySnapshot({
      fetchSafety: () => fetchSafetySource({ db, nowMs }),
      trigger: 'scheduled',
      nowMs,
      appTier,
    }),
    runSupport: (appTier) => buildSupportSnapshot({
      fetchSupport: () => fetchSupportSource({ collection: db.collection('support_inbox'), nowMs }),
      trigger: 'scheduled',
      nowMs,
      appTier,
    }),
    nowMs,
  });

  logger.info('jarvis_daily_departments', {
    appTier: snapshot.appTier,
    decisions: snapshot.decisions.length,
    departmentErrors: snapshot.departmentErrors,
  });
});

/**
 * Суточная точка истории бизнес-тиров + подъём храповика. В отличие от
 * бэкфилла здесь есть настоящий замер активных пользователей за этот день.
 */
export const jarvisDailyBusinessHistoryCron = onSchedule(HISTORY_SCHEDULE_OPTIONS, async () => {
  const db = admin.firestore();
  const nowMs = Date.now();

  const [lastPoints, activeResult, totalUsers, revenueRows] = await Promise.all([
    readRecentHistory({ db, limit: 1 }),
    fetchActiveUserCount({ collection: db.collection('users'), nowMs }),
    readTotalUsers(db),
    fetchTodayRevenueRows(db, nowMs),
  ]);

  const previousCumulativeUsers = lastPoints.length > 0 ? lastPoints[lastPoints.length - 1].cumulativeUsers : 0;
  const point = buildDailyHistoryPoint({
    nowMs,
    totalUsers,
    activeUsers: activeResult.count,
    previousCumulativeUsers,
    revenueRows,
  });

  await writeHistoryPoints({ db, points: [point], nowMs });

  // зачем поднимать пик здесь: панель может не открываться неделями, а
  // храповик обязан помнить достигнутое — иначе первый заход после роста
  // показал бы заниженный тир.
  const storedPeakTier = await readPeakTier(db);
  const snapshot = buildBusinessTierSnapshot({
    history: [...lastPoints, { ...point, writtenAtMs: nowMs }],
    totalUsers,
    activeUsers: activeResult.count,
    storedPeakTier,
    nowMs,
  });
  await writePeakTier(db, snapshot.currentTier, nowMs).catch(() => undefined);

  logger.info('jarvis_daily_business_history', {
    dayKey: point.dayKey,
    cumulativeUsers: point.cumulativeUsers,
    activeUsers: point.activeUsers,
    dayMoneyCoverage: point.dayMoneyCoverage,
    tier: snapshot.tier,
  });
});
