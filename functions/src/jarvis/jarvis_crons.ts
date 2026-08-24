import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { ADMIN_ALERT_BOT_TOKEN, sendTelegramAlert } from '../admin_alerts';
import { GROWTH_DAILY_COLLECTION } from '../growth_daily_aggregate';
import { openAiChat } from '../explain/explain_provider';
import { assertJobEnabled, resolveJobConfig } from '../openai_jobs_config';
import { enrichDecisionsWithNarrative, type EnricherDependencies } from './llm_enricher';
import { estimateEnrichmentCostUsd, actualEnrichmentCostUsd } from './llm_enricher_cost';
import { checkAndReserveBudget, recordActualSpend } from './llm_budget';
import { reserveEnrichmentSlot, recordEnrichmentResult } from './llm_enrichment_cache';
import { upsertPlan, closeVanishedPlans, reviewAcceptedPlans } from './jarvis_plans_store';
import { decisionTopicKey } from './decision_topic';
import { countDegradedSources } from './data_health_snapshot';
import { proposeActions, applyApprovedActions } from './jarvis_actions_store';
import { proposeActionsForDecisions } from './jarvis_action_proposals';
import { parseJarvisFollowUpTasksFlag } from './jarvis_follow_up_tasks';
import type { Decision } from './decision';
import { buildTelegramDigest, selectTelegramDecisions } from './telegram_digest';
import {
  JARVIS_NOTIFICATION_MEMORY_FIELD,
  parseNotificationMemory,
  recordDeliveredNotifications,
  selectNovelNotifications,
} from './notification_memory';
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
import { readBusinessKnowledge } from './business_knowledge';
import { buildKnowledgeReviewNotice, selectKnowledgeReviewsDue } from './knowledge_review_due';
import { fetchActiveUserCount } from './app_tier_reader';
import { resolveAppTier } from './app_tier_resolver';
import { buildAllDepartmentsSnapshot } from './all_departments_snapshot';
import { fetchQualitySource } from './quality_firestore_fetcher';
import { buildQualitySnapshot } from './quality_snapshot';
import { fetchMoneySource } from './money_firestore_fetcher';
import { buildMoneySnapshot } from './money_snapshot';
import { fetchMaxvoiceSource } from './maxvoice_firestore_fetcher';
import { buildMaxvoiceSnapshot } from './maxvoice_snapshot';
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
import { readJarvisPmBusinessContext } from './pm_business_context';

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
const FOLLOW_UP_TASKS_ENABLED = parseJarvisFollowUpTasksFlag(
  process.env.JARVIS_FOLLOW_UP_TASKS_ENABLED,
);

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
  const controlSnapshot = await db.doc(JARVIS_CONTROL_DOC).get().catch(() => null);
  const controlData = controlSnapshot?.data();
  const control = parseControl(controlData);
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

  // зачем читать историю здесь (аудит 2026-08-16): без вчерашней точки
  // департамент денег может сказать только «столько-то событий», а с ней —
  // назвать часть, из-за которой изменился итог. Одно чтение с лимитом 1;
  // те же три числа уже собирает суточный крон истории, второй запрос
  // к событиям RevenueCat удвоил бы чтения ради посчитанного.
  // зачем сверять dayKey (аудит 2026-08-16): readRecentHistory отдаёт САМУЮ
  // СВЕЖУЮ точку, а не строго вчерашнюю. Департаменты идут в 06:00, история
  // пишется в 07:00 — но при повторном/ручном запуске ПОСЛЕ 07:00 свежайшей
  // окажется точка за сегодня, и департамент сравнил бы день сам с собой
  // (дельта ноль → разбор молча исчезает). А если суточный крон пропустил
  // день, «вчера» тихо превратилось бы в позавчера. Тихий сдвиг ровно того
  // класса, против которого написана процедура silent-zero.
  const expectedYesterdayKey = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const yesterdayPoint = await readRecentHistory({ db, limit: 1 })
    .then((points) => {
      const point = points[0] ?? null;
      if (!point) return null;
      if (point.dayKey !== expectedYesterdayKey) {
        logger.warn('jarvis_daily_departments: history point is not yesterday, skipping breakdown', {
          expected: expectedYesterdayKey, got: point.dayKey,
        });
        return null;
      }
      return point;
    })
    .catch((error: unknown) => {
      logger.warn('jarvis_daily_departments: history read failed', error);
      return null;
    });

  const snapshot = await buildAllDepartmentsSnapshot({
    resolveAppTier: () => resolveAppTier(() => fetchActiveUserCount({ collection: db.collection('users'), nowMs })),
    runQuality: (appTier) => buildQualitySnapshot({
      fetchers: {
        error_reports: () => fetchQualitySource({ db, sourceId: 'error_reports', collection: db.collection('error_reports'), nowMs }),
        user_reports: () => fetchQualitySource({ db, sourceId: 'user_reports', collection: db.collection('user_reports'), nowMs }),
        app_errors: () => fetchQualitySource({ db, sourceId: 'app_errors', collection: db.collection('app_errors'), nowMs }),
      },
      trigger: 'scheduled',
      nowMs,
      appTier,
    }),
    runMoney: (appTier) => buildMoneySnapshot({
      fetchers: {
        revenuecat_premium_events: () => fetchMoneySource({ sourceId: 'revenuecat_premium_events', collection: db.collection('revenuecat_premium_events'), nowMs }),
        paywall_funnel: () => fetchMoneySource({ sourceId: 'paywall_funnel', collection: db.collection('paywall_funnel'), nowMs }),
        client_economy_opening: () => fetchMoneySource({ sourceId: 'client_economy_opening', collection: db.collectionGroup('client_economy_opening'), nowMs }),
        client_economy_operations: () => fetchMoneySource({ sourceId: 'client_economy_operations', collection: db.collectionGroup('client_economy_operations'), nowMs }),
        external_economy_events: () => fetchMoneySource({ sourceId: 'external_economy_events', collection: db.collectionGroup('external_economy_events'), nowMs }),
      },
      trigger: 'scheduled',
      nowMs,
      appTier,
      // зачем именно эти три поля: они уже посчитаны суточным кроном
      // истории и достаточны, чтобы разложить денежные события по частям.
      yesterday: yesterdayPoint
        ? {
          newPaying: yesterdayPoint.newPaying,
          renewals: yesterdayPoint.renewals,
          refunds: yesterdayPoint.refunds,
        }
        : null,
    }),
    runGrowth: () => buildGrowthSnapshot({
      fetchers: { users: () => fetchGrowthSource({
        sourceId: 'users',
        collection: db.collection('users'),
        dailyCollection: db.collection(GROWTH_DAILY_COLLECTION),
        nowMs,
      }) },
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
    runMaxvoice: () => buildMaxvoiceSnapshot({
      fetchMaxvoice: () => fetchMaxvoiceSource({ collection: db.collection('max_voice_ops_daily'), nowMs }),
      trigger: 'scheduled',
      nowMs,
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
      fetchSupport: () => fetchSupportSource({
        collection: db.collection('support_inbox'),
        syncDocument: db.doc('admin_config/support_inbox'),
        nowMs,
      }),
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
    // зачем тема, а не hashDecision: тот меняется вместе со счётчиком внутри
    // находки, и отказ владельца забывался уже назавтра — «125 писем» и
    // «126 писем» выглядели разными советами. Владелец 2026-08-15:
    // «пишет одно и то же», «не учится» — это был один и тот же баг.
    hashOf: decisionTopicKey,
    rejectedHashes: recentRejections,
    nowMs,
  });

  // contentHash меняется вместе со счётчиком, поэтому exact-dedupe недостаточно:
  // междневная память объединяет наблюдения одного бизнес-вопроса и пропускает
  // только новые/материально изменившиеся темы (для P0 также safety-reminder).
  const novelty = selectNovelNotifications({
    decisions,
    memory: parseNotificationMemory(controlData),
    nowMs,
  });
  const notificationDecisions = novelty.selected;

  // зачем сохранять планы ДО проверки тихих часов/выключателя: раздел
  // «Планы» в админке — постоянный архив находок, он не должен зависеть от
  // того, дошло ли сообщение в Telegram. Владелец 2026-08-04: находки видны
  // только секунду во всплывающем сообщении, негде читать их полностью —
  // здесь они сохраняются навсегда, независимо от уведомления.
  await Promise.all(decisions.map((decision) => upsertPlan({
    db,
    decision,
    nowMs,
    followUpTasksEnabled: FOLLOW_UP_TASKS_ENABLED,
  }).catch((error: unknown) => {
    logger.warn('jarvis_daily_departments: plan upsert failed', { department: decision.department, error });
  })));

  // зачем закрывать исчезнувшее (владелец 2026-08-15): без этого список
  // открытых находок рос вечно — проблема давно ушла из данных, а план висел.
  // Владелец переставал верить списку целиком. Закрытие «само» так же важно,
  // как появление. Считаем по ПОЛНОМУ снимку, а не по отфильтрованным
  // decisions: тема, погашенная отказом или анти-повтором, наблюдается —
  // молчать о ней можно, объявлять исчезнувшей нельзя.
  const observedTopicKeys = snapshot.decisions.map(decisionTopicKey);
  const vanishedCount = await closeVanishedPlans({ db, seenTopicKeys: observedTopicKeys, nowMs })
    .catch((error: unknown) => {
      logger.warn('jarvis_daily_departments: vanished-plan sweep failed', error);
      return 0;
    });

  // зачем проверять результат (владелец 2026-08-15, «не учится»): без этого
  // у системы нет ни одного сигнала, отличающего полезный совет от пустого —
  // а на собственных рассуждениях агент улучшаться не способен. Неделю спустя
  // после согласия смотрим факт: проблема ушла или осталась.
  const outcome = await reviewAcceptedPlans({ db, seenTopicKeys: observedTopicKeys, nowMs })
    .catch((error: unknown) => {
      logger.warn('jarvis_daily_departments: accepted-plan review failed', error);
      return { worked: 0, didNotWork: 0 };
    });

  // зачем предлагать, а не делать (владелец 2026-08-15, «говорит, а не
  // делает»): между решением модели и изменением мира стоят две преграды —
  // проверка кодом и согласие владельца. Здесь только первая половина:
  // действия кладутся в буфер и ждут кнопки «принять» в Telegram.
  const proposedActions = await proposeActions({
    db,
    proposals: proposeActionsForDecisions({ decisions, nowMs }),
    nowMs,
  }).catch((error: unknown) => {
    logger.warn('jarvis_daily_departments: action proposal failed', error);
    return [];
  });

  // зачем применять здесь, а не сразу при нажатии кнопки: вебхук обязан
  // ответить Telegram за секунды, а запись в чужие коллекции может тормозить.
  // Одобренное вчера применяется следующим прогоном — задержка приемлема,
  // потому что все разрешённые действия обратимы и не срочны.
  const appliedActions = await applyApprovedActions({ db, nowMs })
    .catch((error: unknown) => {
      logger.warn('jarvis_daily_departments: action apply failed', error);
      return 0;
    });

  // зачем молчать, когда всё чисто: ежедневное «всё хорошо» приучает не
  // читать сообщения, и настоящая находка потеряется среди них. Пишем только
  // когда есть что сказать — либо находка, либо недоступный департамент.
  // зачем canNotify отдельно от canRun: режим «тихо» означает «следи, но не
  // пиши мне» — надзор продолжается, сообщения нет.
  //
  // Поверх режима — политика тишины: ночью будят только платежи и
  // безопасность, за ними стоит конкретный человек. Остальное ждёт утра.
  const speakingDepartments = [
    ...notificationDecisions.map((d) => d.department),
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
    const narrativeByHash = await buildNarrativeMap(db, notificationDecisions);
    const text = buildTelegramDigest({
      decisions: notificationDecisions,
      appTier: snapshot.appTier,
      departmentErrors: snapshot.departmentErrors,
      narrativeByHash,
      // зачем (аудит 2026-08-15): data_health считался каждый прогон и
      // выбрасывался — детектор недостоверности молчал сам, и владелец не
      // мог узнать, что выводы построены на дырявых данных.
      degradedSources: countDegradedSources(snapshot.dataHealth),
    });
    // зачем два пути: кнопки требуют секрета с Telegram id владельца. Пока он
    // не задан, сводка обязана приходить всё равно — просто без кнопок.
    const ownerConfig = parseOwnerConfig(JARVIS_TELEGRAM_CONFIG.value());
    const keyboard = ownerConfig ? await issueDecisionButtons({
      db, decisions: selectTelegramDecisions(notificationDecisions), config: ownerConfig, nowMs,
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
    repeatedSuppressed: novelty.suppressed.length,
    // зачем логировать: единственный способ увидеть, что автозакрытие живёт
    // и список открытых находок реально разгружается, а не только растёт.
    vanishedClosed: vanishedCount,
    // зачем логировать вердикты: это первая в системе честная цифра о
    // собственной пользе — сколько принятых советов реально закрыли проблему.
    outcomeWorked: outcome.worked,
    outcomeDidNotWork: outcome.didNotWork,
    // зачем логировать: единственный способ увидеть, что Джарвис перешёл от
    // разговоров к делу — сколько действий предложено и сколько применено.
    actionsProposed: proposedActions.length,
    actionsApplied: appliedActions,
    // зачем логировать причину: «сообщение не пришло» без объяснения — это
    // час разбирательства. Здесь сразу видно: тихие часы, режим или пусто.
    mode: control.mode,
    silenceReason: notifyVerdict.send ? null : notifyVerdict.reason,
  });

  // зачем писать сюда же: /status в Telegram должен ответить за одно чтение
  // документа jarvis_control, а не искать «последний прогон» по логам.
  const nextNotificationMemory = telegramSent
    ? recordDeliveredNotifications({
      memory: parseNotificationMemory(controlData),
      delivered: selectTelegramDecisions(notificationDecisions),
      nowMs,
    })
    : parseNotificationMemory(controlData);
  await db.doc(JARVIS_CONTROL_DOC).set(
    {
      lastRunAtMs: nowMs,
      lastRunOpenDecisions: decisions.length,
      ...(telegramSent ? { [JARVIS_NOTIFICATION_MEMORY_FIELD]: nextNotificationMemory } : {}),
    },
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
    // Один общий контекст на весь прогон: Джарвис видит stage, 7-day business
    // history и свежие current-vs-previous comparisons, а не мыслит каждым
    // департаментом в вакууме. Ни сырого user text, ни PII сюда не попадает.
    const businessContext = await readJarvisPmBusinessContext(db, Date.now());
    const config = await resolveJobConfig(db, 'jarvis');
    assertJobEnabled(config, 'jarvis');
    const enriched = await enrichDecisionsWithNarrative(
      { decisions, businessContext },
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
      const topicKey = typeof data.decisionTopicKey === 'string' ? data.decisionTopicKey : null;
      const atMs = typeof data.atMs === 'number' ? data.atMs : null;
      if (atMs === null) continue;
      // зачем в карту кладутся ОБА ключа: тема (устойчива к смене счётчиков,
      // по ней и работает подавление) и старый decisionHash — записи,
      // сделанные до появления темы, не должны потерять силу в переходный
      // период. Лишний ключ никого не глушит: он просто ни с чем не совпадёт.
      // зачем max, а не последний встреченный: несколько отклонений одного
      // решения должны продлевать память, а не сокращать её случайным порядком.
      for (const key of [topicKey, hash]) {
        if (!key) continue;
        const existing = result.get(key);
        if (existing === undefined || atMs > existing) result.set(key, atMs);
      }
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

/**
 * Ежемесячное напоминание пересмотреть устав продукта.
 *
 * зачем (владелец, 2026-08-16): «сделай что-то, что раз в месяц надо обновлять
 * описание продукта». Описание устаревает молча — включили раздел, сменили
 * тариф, а файл продолжает уверенно рассказывать старое. Джарвис при этом
 * врёт клиентам с той же интонацией, что и раньше, и заметить это можно только
 * по жалобе живого человека.
 *
 * зачем раз в неделю, а не раз в месяц: срок пересмотра стоит в самом файле, и
 * файлов несколько с разными датами. Крон раз в месяц промахнулся бы мимо
 * большинства из них почти на месяц. Здесь он смотрит еженедельно, но пишет,
 * только когда чей-то срок реально подошёл, — молчание тут норма, а не сбой.
 *
 * зачем sendTelegramAlert, а не sendJarvisDigest: кнопок здесь нет, решать
 * нечего. Alert к тому же сам уважает выключатель уведомлений в admin_config.
 */
const KNOWLEDGE_REVIEW_SCHEDULE_OPTIONS = {
  schedule: 'every monday 09:00',
  timeZone: 'Europe/Kyiv',
  region: REGION,
  retryCount: 1,
  timeoutSeconds: 60,
  memory: '256MiB' as const,
} as const;

const KNOWLEDGE_REVIEW_ADMIN_URL = 'https://phraseman-ea0b3.web.app/legacy.html#product-charter';

export const jarvisProductKnowledgeReviewCron = onSchedule(KNOWLEDGE_REVIEW_SCHEDULE_OPTIONS, async () => {
  const nowMs = Date.now();
  // Файлы лежат рядом с кодом и читаются из кэша — обращений к Firestore нет.
  const due = selectKnowledgeReviewsDue(readBusinessKnowledge(), nowMs);
  if (due.length === 0) {
    logger.info('jarvis_product_knowledge_review', { due: 0 });
    return;
  }

  const control = parseControl((await admin.firestore().doc(JARVIS_CONTROL_DOC).get()).data());
  if (!canNotify(control)) {
    logger.info('jarvis_product_knowledge_review', { due: due.length, muted: true });
    return;
  }

  const text = buildKnowledgeReviewNotice(due, KNOWLEDGE_REVIEW_ADMIN_URL);
  const sent = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text);
  logger.info('jarvis_product_knowledge_review', {
    due: due.length,
    files: due.map((status) => status.file),
    sent,
  });
});
