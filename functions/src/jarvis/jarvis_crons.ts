import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { ADMIN_ALERT_BOT_TOKEN, sendTelegramAlert } from '../admin_alerts';
import { openAiChat } from '../explain/explain_provider';
import { assertJobEnabled, resolveJobConfig } from '../openai_jobs_config';
import { enrichDecisionsWithNarrative, type EnricherDependencies } from './llm_enricher';
import { estimateEnrichmentCostUsd, actualEnrichmentCostUsd } from './llm_enricher_cost';
import { checkAndReserveBudget, recordActualSpend } from './llm_budget';
import { reserveEnrichmentSlot, recordEnrichmentResult } from './llm_enrichment_cache';
import { upsertPlan } from './jarvis_plans_store';
import type { Decision } from './decision';
import { buildTelegramDigest } from './telegram_digest';
import { JARVIS_APPROVAL_COLLECTION } from './approval_store';
import { JARVIS_APPROVAL_AUDIT_COLLECTION } from './approval_audit';
import { hashDecision } from './issue_decision_buttons';
import { filterOutRecentlyRejected, REJECTION_MEMORY_MS } from './recent_rejections';
import { canNotify, canRun, JARVIS_CONTROL_DOC, parseControl } from './control';
import { shouldNotifyNow } from './notify_policy';
import { parseOwnerConfig } from './approval_webhook_core';
import { JARVIS_TELEGRAM_CONFIG } from './approval_webhook';
import { issueDecisionButtons } from './issue_decision_buttons';
import { sendJarvisDigest } from './telegram_send';
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
import { fetchRetentionSource } from './retention_firestore_fetcher';
import { buildRetentionSnapshot } from './retention_snapshot';
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

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const DEPARTMENTS_SCHEDULE_OPTIONS = {
  schedule: 'every day 06:00',
  timeZone: 'UTC',
  region: REGION,
  retryCount: 1,
  timeoutSeconds: 300,
  memory: '256MiB' as const,
  // зачем секрет здесь: утреннюю сводку крон отправляет владельцу тем же
  // ботом, что и остальные алерты — своей инфраструктуры Джарвис не заводит.
  // зачем второй секрет: без него не собрать кнопки — там Telegram id
  // владельца, к которому привязывается каждый токен подтверждения.
  // зачем третий секрет: LLM-обогатитель использует уже существующий ключ
  // OpenAI (тот же, что digest/explain/weekly) — отдельного ключа не заводим.
  secrets: [ADMIN_ALERT_BOT_TOKEN, JARVIS_TELEGRAM_CONFIG, OPENAI_API_KEY],
};

/**
 * Реальные зависимости обогатителя. Собраны здесь, а не внутри llm_enricher.ts,
 * чтобы сам обогатитель оставался чистой функцией без Firestore/OpenAI внутри —
 * тестируется подстановкой фейковых deps (см. llm_enricher.test.ts).
 */
function buildEnricherDependencies(db: FirebaseFirestore.Firestore, model: string): EnricherDependencies {
  return {
    checkBudget: (input) => checkAndReserveBudget({ db, nowMs: input.nowMs, estimatedCostUsd: input.estimatedCostUsd }),
    reserveSlot: (input) => reserveEnrichmentSlot({ db, contentHash: input.contentHash, nowMs: input.nowMs }),
    generateNarrative: async (prompt) => {
      const apiKey = OPENAI_API_KEY.value().trim();
      if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
      const result = await openAiChat({
        apiKey,
        model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        maxTokens: 300,
        temperature: 0.3,
      });
      return { text: result.text, promptTokens: result.promptTokens, completionTokens: result.completionTokens };
    },
    recordSpend: (input) => recordActualSpend({ db, nowMs: input.nowMs, actualCostUsd: input.actualCostUsd }),
    recordResult: (input) => recordEnrichmentResult({
      db, contentHash: input.contentHash, narrative: input.narrative, nowMs: input.nowMs,
    }),
    estimateCostUsd: estimateEnrichmentCostUsd,
    actualCostUsd: actualEnrichmentCostUsd,
    nowMs: () => Date.now(),
  };
}

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

  // зачем проверять режим ДО работы: если владелец выключил Джарвиса, прогон
  // не должен стоить ни одного чтения. Одно чтение конфига вместо десятков.
  const control = parseControl((await db.doc(JARVIS_CONTROL_DOC).get().catch(() => null))?.data());
  if (!canRun(control)) {
    logger.info('jarvis_daily_departments: выключен владельцем', { reason: control.reason });
    return;
  }

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
    runRetention: (appTier) => buildRetentionSnapshot({
      fetchRetention: () => fetchRetentionSource({ collection: db.collection('users'), nowMs }),
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

  // зачем фильтровать здесь, а не только перед отправкой текста: отклонённая
  // находка не должна ни попадать в сводку, ни считаться поводом нарушить
  // тихие часы — иначе повторное появление того же совета разбудит ночью
  // ровно тем, от чего владелец уже отказался.
  const recentRejections = await readRecentRejections(db, nowMs);
  const decisions = filterOutRecentlyRejected({
    decisions: snapshot.decisions,
    hashOf: hashDecision,
    rejectedHashes: recentRejections,
    nowMs,
  });

  // зачем сохранять планы ДО проверки тихих часов/выключателя: раздел
  // «Планы» в админке — постоянный архив находок, он не должен зависеть от
  // того, дошло ли сообщение в Telegram. Владелец 2026-08-04: находки видны
  // только секунду во всплывающем сообщении, негде читать их полностью —
  // здесь они сохраняются навсегда, независимо от уведомления.
  await Promise.all(decisions.map((decision) => upsertPlan({ db, decision, nowMs }).catch((error: unknown) => {
    logger.warn('jarvis_daily_departments: plan upsert failed', { department: decision.department, error });
  })));

  // зачем молчать, когда всё чисто: ежедневное «всё хорошо» приучает не
  // читать сообщения, и настоящая находка потеряется среди них. Пишем только
  // когда есть что сказать — либо находка, либо недоступный департамент.
  // зачем canNotify отдельно от canRun: режим «тихо» означает «следи, но не
  // пиши мне» — надзор продолжается, сообщения нет.
  //
  // Поверх режима — политика тишины: ночью будят только платежи и
  // безопасность, за ними стоит конкретный человек. Остальное ждёт утра.
  const speakingDepartments = [
    ...decisions.map((d) => d.department),
    ...snapshot.departmentErrors,
  ];
  const notifyVerdict = shouldNotifyNow({
    departments: speakingDepartments,
    nowMs,
    // Крон ходит раз в сутки, поэтому за последний час он ничего не слал.
    // Лимит здесь страхует от ручных прогонов, а не от самого крона.
    sentInLastHour: 0,
  });
  const worthSending = canNotify(control) && notifyVerdict.send;
  let telegramSent = false;
  if (worthSending) {
    // зачем обогащать только здесь, а не раньше: если тихие часы/лимит/
    // выключатель всё равно погасят отправку, платить LLM за narrative,
    // который никто не увидит, бессмысленно.
    const narrativeByHash = await buildNarrativeMap(db, decisions);
    const text = buildTelegramDigest({
      decisions,
      appTier: snapshot.appTier,
      departmentErrors: snapshot.departmentErrors,
      narrativeByHash,
    });
    // зачем два пути: кнопки требуют секрета с Telegram id владельца. Пока он
    // не задан, сводка обязана приходить всё равно — просто без кнопок.
    const ownerConfig = parseOwnerConfig(JARVIS_TELEGRAM_CONFIG.value());
    const keyboard = ownerConfig ? await issueDecisionButtons({
      db, decisions, config: ownerConfig, nowMs,
    }) : null;

    telegramSent = keyboard && ownerConfig
      ? await sendJarvisDigest({
        botToken: ADMIN_ALERT_BOT_TOKEN.value(),
        chatId: ownerConfig.ownerTelegramChatId,
        text,
        keyboard,
      })
      // sendTelegramAlert не бросает и сам уважает выключатель в admin_config/alerts.
      : await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text);
  }

  logger.info('jarvis_daily_departments', {
    appTier: snapshot.appTier,
    decisions: decisions.length,
    departmentErrors: snapshot.departmentErrors,
    telegramSent,
    rejectedSuppressed: snapshot.decisions.length - decisions.length,
    // зачем логировать причину: «сообщение не пришло» без объяснения — это
    // час разбирательства. Здесь сразу видно: тихие часы, режим или пусто.
    mode: control.mode,
    silenceReason: notifyVerdict.send ? null : notifyVerdict.reason,
  });

  // зачем писать сюда же: /status в Telegram должен ответить за одно чтение
  // документа jarvis_control, а не искать «последний прогон» по логам.
  await db.doc(JARVIS_CONTROL_DOC).set(
    { lastRunAtMs: nowMs, lastRunOpenDecisions: decisions.length },
    { merge: true },
  ).catch((error) => {
    logger.warn('jarvis_daily_departments: last-run write failed', error);
  });

  // зачем чистить здесь, а не отдельным планировщиком: токены живут 10 минут,
  // их немного, и отдельный крон был бы лишним холодным стартом каждый день.
  await purgeExpiredApprovalTokens(db, nowMs).catch((error) => {
    logger.warn('jarvis_daily_departments: token purge failed', error);
  });
});

/**
 * Строит narrative для digest поверх готовых decisions. НИКОГДА не бросает
 * и не меняет decisions/severity/пороги — при любой ошибке (в том числе
 * выключен джоб владельцем через openAiJobsConfig) возвращает пустую карту,
 * и buildTelegramDigest выдаёт ровно тот же текст, что без обогатителя.
 */
async function buildNarrativeMap(
  db: FirebaseFirestore.Firestore,
  decisions: readonly Decision[],
): Promise<Map<string, string>> {
  const narrativeByHash = new Map<string, string>();
  try {
    const config = await resolveJobConfig(db, 'jarvis');
    assertJobEnabled(config, 'jarvis');
    const enriched = await enrichDecisionsWithNarrative(
      { decisions },
      buildEnricherDependencies(db, config.model),
    );
    for (const item of enriched) {
      if (item.narrative) narrativeByHash.set(item.decision.contentHash, item.narrative);
    }
  } catch (error) {
    logger.warn('jarvis_daily_departments: enrichment skipped', error);
  }
  return narrativeByHash;
}

/**
 * Читает недавние отклонения из журнала подтверждений (бриф в181-190:
 * не повторять только что отклонённый совет).
 *
 * зачем where по времени + limit: журнал растёт вечно, а нужно только окно
 * REJECTION_MEMORY_MS — сканировать всю коллекцию было бы дорого и не нужно.
 */
async function readRecentRejections(
  db: FirebaseFirestore.Firestore,
  nowMs: number,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  try {
    // зачем именно такой порядок where: Firestore требует, чтобы поля
    // диапазона (atMs) шли после полей равенства в определении составного
    // индекса — см. firestore.indexes.json.
    const snap = await db
      .collection(JARVIS_APPROVAL_AUDIT_COLLECTION)
      .where('action', '==', 'reject')
      .where('outcome', '==', 'accepted')
      .where('atMs', '>=', nowMs - REJECTION_MEMORY_MS)
      .limit(200)
      .get();
    // guard-ok: один .get() выше вернул страницу разом; цикл — работа с уже
    // полученными документами в памяти, без чтений Firestore внутри.
    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const hash = typeof data.decisionHash === 'string' ? data.decisionHash : null;
      const atMs = typeof data.atMs === 'number' ? data.atMs : null;
      if (!hash || atMs === null) continue;
      // зачем max, а не последний встреченный: несколько отклонений одного
      // решения должны продлевать память, а не сокращать её случайным порядком.
      const existing = result.get(hash);
      if (existing === undefined || atMs > existing) result.set(hash, atMs);
    }
  } catch (error) {
    // Недоступный журнал — не повод молчать: просто без памяти в этом проходе.
    logger.warn('jarvis_daily_departments: recent-rejections read failed', error);
  }
  return result;
}

/**
 * Удаляет просроченные approval-токены.
 *
 * зачем limit: чистка не должна превращаться в дорогой скан. Остаток уйдёт
 * на следующем прогоне — токены и так мертвы, спешить некуда.
 */
async function purgeExpiredApprovalTokens(db: FirebaseFirestore.Firestore, nowMs: number): Promise<void> {
  const snap = await db
    .collection(JARVIS_APPROVAL_COLLECTION)
    .where('expiresAtMs', '<', nowMs)
    .limit(200)
    .get();
  if (snap.empty) return;
  // guard-ok: один .get() выше вернул страницу разом; batch удаляет её одной
  // операцией, без чтений Firestore в цикле.
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

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
