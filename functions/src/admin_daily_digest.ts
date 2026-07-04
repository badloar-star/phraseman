// ═══════════════════════════════════════════════════════════════════════════
// admin_daily_digest.ts — «что случилось за сутки» одним взглядом (для владельца).
//
// Зачем: каждое утро приходится вручную обходить кучу разделов (рост, деньги,
// идеи, репорты, ошибки, safety, очереди модерации), чтобы понять, всё ли в
// порядке. Эта функция читает те же источники за последние 24ч, сводит
// компактную, но СОДЕРЖАТЕЛЬНУЮ статистику (не только числа, но и конкретику:
// какие идеи пришли, что именно в тревожных репортах, что за ошибки) и просит
// ИИ написать короткий человеческий отчёт с приоритетами и списком «сделай
// сегодня». Результат кладём в admin_digests/{dayKey} + запись в admin_log.
//
// Приватность/дёшево: в ИИ уходит АГРЕГАТ + КОРОТКИЕ сэмплы текста (обрезанные),
// не сырьё целиком и без PII сверх необходимого. Один вызов OpenAI на прогон.
//
// ВАЖНО про метки времени: у разных коллекций РАЗНОЕ поле времени. Нельзя фильтровать
// всё по createdAtMs — часть коллекций тогда молча вернёт пусто. Поэтому у
// каждого источника указано СВОЁ поле (см. loadDigestSources): created_at у
// users, eventTimestampMs у RevenueCat, day-строка у paywall_funnel,
// receivedAtMs у почты, createdAt(число) у help_board/league_chat и т.д.
//
// Архитектура: чистые aggregateDigestFacts / buildDigestPrompt (unit-тестируемы)
// отделены от I/O (loadDigestSources / runAdminDailyDigest). Модель и kill-switch —
// через resolveJobConfig(db,'digest').
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { openAiChat } from './explain/explain_provider';
import { resolveJobConfig, assertJobEnabled } from './openai_jobs_config';

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const DAY_MS = 24 * 60 * 60 * 1000;
const DIGESTS_COLLECTION = 'admin_digests';

// ── Типы сырых строк из источников ────────────────────────────────────────────
export interface DigestSourceRows {
  /** error_reports за 24ч: статус/категория/экран + КОРОТКИЙ текст жалобы юзера. */
  reports: Array<{ status?: string; category?: string; screen?: string; comment?: string; dataText?: string }>;
  /** subscription_cancel_surveys за 24ч: причина + свободный текст. */
  cancels: Array<{ reason?: string; reasonText?: string }>;
  /** app_errors за 24ч: серьёзность + что/сообщение/фича/ключ группировки. */
  appErrors: Array<{ severity?: string; context?: string; message?: string; feature?: string; fingerprint?: string }>;
  /** safety_flags за 24ч: категория + обработан ли. */
  safety: Array<{ category?: string; handled?: boolean }>;
  /** users, присоединившиеся за 24ч (только факт — для счётчика). */
  newUsers: Array<{ platform?: string }>;
  /** revenuecat_premium_events за 24ч: тип события + пробный период. */
  purchases: Array<{ eventType?: string; periodType?: string; productId?: string }>;
  /** paywall_funnel: события purchase_completed за дни окна (не dev). */
  paywallPurchases: Array<{ day?: string }>;
  /** user_ideas за 24ч: заголовок/суть/польза/категория/автор. */
  ideas: Array<{ title?: string; description?: string; benefit?: string; category?: string; userName?: string }>;
  /** Прочие очереди модерации/обращений за 24ч — только счётчики + короткие темы. */
  queues: {
    userReports: Array<{ reason?: string }>;
    packReports: Array<{ reason?: string }>;
    explainReports: Array<{ reason?: string }>;
    websiteInbox: Array<{ topic?: string; message?: string }>;
    supportInbox: Array<{ subject?: string }>;
    helpBoard: Array<{ title?: string }>;
    leagueModeration: Array<{ status?: string }>;
  };
}

// ── Тип фактов, уходящих в ИИ ──────────────────────────────────────────────────
export interface DigestErrorGroup { context: string; message: string; feature: string; count: number }
export interface DigestReportSample { screen: string; category: string; comment: string }
export interface DigestIdea { title: string; category: string; description: string; benefit: string; userName: string }
export interface DigestQueueLine { name: string; total: number; note: string }

export interface DigestFacts {
  windowHours: number;
  // topScreens — массив ОБЪЕКТОВ (не массив массивов): Firestore не хранит вложенные массивы.
  reports: {
    total: number;
    open: number;
    byCategory: Record<string, number>;
    topScreens: Array<{ screen: string; count: number }>;
    // Конкретные тревожные репорты (с текстом жалобы) — чтобы ИИ называл суть, а не число.
    samples: DigestReportSample[];
  };
  cancels: { total: number; byReason: Record<string, number>; sampleTexts: string[] };
  appErrors: {
    total: number;
    critical: number;
    // Топ-группы ошибок по частоте (что именно ломается), а не только «N критических».
    topGroups: DigestErrorGroup[];
  };
  safety: { total: number; open: number; byCategory: Record<string, number> };
  // Рост и деньги за сутки.
  growth: { newUsers: number };
  revenue: {
    newPaying: number;      // INITIAL_PURCHASE + NON_RENEWING_PURCHASE
    renewals: number;       // RENEWAL
    refunds: number;        // REFUND
    trials: number;         // periodType === 'TRIAL'
    paywallPurchases: number; // из paywall_funnel (сигнал, совпадает с графиком Overview)
  };
  // Новые идеи с содержимым — чтобы ИИ оценил, на что стоит обратить внимание.
  ideas: { total: number; byCategory: Record<string, number>; items: DigestIdea[] };
  // Прочие очереди — компактные строки «раздел: сколько накопилось».
  queues: DigestQueueLine[];
}

// ── Чистые хелперы ─────────────────────────────────────────────────────────────
function countBy<T>(rows: T[], key: (r: T) => string | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = (key(r) || '').trim() || 'unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function topN(counts: Record<string, number>, n: number): Array<{ screen: string; count: number }> {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([screen, count]) => ({ screen, count }));
}

function clip(s: string | undefined, max: number): string {
  return (s || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

const NEW_PAYING_EVENTS = new Set(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE']);

/** Группирует app_errors по fingerprint (или context|message) и берёт топ по частоте. */
function groupErrors(
  errors: DigestSourceRows['appErrors'],
  n: number,
): DigestErrorGroup[] {
  const groups = new Map<string, DigestErrorGroup>();
  for (const e of errors) {
    const key = (e.fingerprint || `${e.context || ''}|${e.message || ''}`).trim() || 'unknown';
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, {
        context: clip(e.context, 120) || '(без описания)',
        message: clip(e.message, 200),
        feature: clip(e.feature, 40) || 'app',
        count: 1,
      });
    }
  }
  return Array.from(groups.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/**
 * Сводит сырые строки источников в компактные факты (чистая функция).
 * Именно факты + короткие сэмплы, а не сырьё, уходят в промпт — дёшево и приватно.
 */
export function aggregateDigestFacts(rows: DigestSourceRows, windowHours = 24): DigestFacts {
  const openReports = rows.reports.filter((r) => {
    const s = (r.status || '').toLowerCase();
    return s !== 'fixed' && s !== 'archived' && s !== 'answered';
  }).length;

  // Тревожные репорты = открытые с непустым комментарием юзера; берём до 6.
  const reportSamples: DigestReportSample[] = rows.reports
    .filter((r) => {
      const s = (r.status || '').toLowerCase();
      const open = s !== 'fixed' && s !== 'archived' && s !== 'answered';
      return open && clip(r.comment, 1).length > 0;
    })
    .slice(0, 6)
    .map((r) => ({
      screen: clip(r.screen, 60) || 'unknown',
      category: clip(r.category, 40) || 'free_text',
      comment: clip(r.comment, 220),
    }));

  const sampleTexts = rows.cancels
    .map((c) => clip(c.reasonText, 160))
    .filter((t) => t.length > 0)
    .slice(0, 5);

  const ideaItems: DigestIdea[] = rows.ideas.slice(0, 8).map((i) => ({
    title: clip(i.title, 120) || '(без заголовка)',
    category: clip(i.category, 30) || 'other',
    description: clip(i.description, 300),
    benefit: clip(i.benefit, 160),
    userName: clip(i.userName, 40),
  }));

  const q = rows.queues;
  const queueLines: DigestQueueLine[] = [
    { name: 'Жалобы на юзеров (ники и т.п.)', total: q.userReports.length, note: topReasonNote(q.userReports) },
    { name: 'Жалобы на паки сообщества', total: q.packReports.length, note: topReasonNote(q.packReports) },
    { name: 'Жалобы «непонятно объяснили»', total: q.explainReports.length, note: topReasonNote(q.explainReports) },
    { name: 'Обращения с сайта', total: q.websiteInbox.length, note: clip(q.websiteInbox[0]?.topic, 40) },
    { name: 'Письма в почту поддержки', total: q.supportInbox.length, note: clip(q.supportInbox[0]?.subject, 60) },
    { name: 'Новые темы на доске помощи', total: q.helpBoard.length, note: clip(q.helpBoard[0]?.title, 60) },
    { name: 'Очередь модерации чата лиг', total: q.leagueModeration.length, note: '' },
  ].filter((l) => l.total > 0);

  return {
    windowHours,
    reports: {
      total: rows.reports.length,
      open: openReports,
      byCategory: countBy(rows.reports, (r) => r.category),
      topScreens: topN(countBy(rows.reports, (r) => r.screen), 5),
      samples: reportSamples,
    },
    cancels: {
      total: rows.cancels.length,
      byReason: countBy(rows.cancels, (c) => c.reason),
      sampleTexts,
    },
    appErrors: {
      total: rows.appErrors.length,
      critical: rows.appErrors.filter((e) => (e.severity || '').toLowerCase() === 'critical').length,
      topGroups: groupErrors(rows.appErrors, 5),
    },
    safety: {
      total: rows.safety.length,
      open: rows.safety.filter((s) => !s.handled).length,
      byCategory: countBy(rows.safety, (s) => s.category),
    },
    growth: {
      newUsers: rows.newUsers.length,
    },
    revenue: {
      newPaying: rows.purchases.filter((p) => NEW_PAYING_EVENTS.has((p.eventType || '').toUpperCase())).length,
      renewals: rows.purchases.filter((p) => (p.eventType || '').toUpperCase() === 'RENEWAL').length,
      refunds: rows.purchases.filter((p) => (p.eventType || '').toUpperCase() === 'REFUND').length,
      trials: rows.purchases.filter((p) => (p.periodType || '').toUpperCase() === 'TRIAL').length,
      paywallPurchases: rows.paywallPurchases.length,
    },
    ideas: {
      total: rows.ideas.length,
      byCategory: countBy(rows.ideas, (i) => i.category),
      items: ideaItems,
    },
    queues: queueLines,
  };
}

function topReasonNote(rows: Array<{ reason?: string }>): string {
  if (!rows.length) return '';
  const counts = countBy(rows, (r) => r.reason);
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? `чаще всего: ${clip(top[0], 40)}` : '';
}

/** true, если за сутки вообще ничего заметного не произошло (нет смысла звать ИИ). */
export function isDigestEmpty(facts: DigestFacts): boolean {
  return (
    facts.reports.total === 0 &&
    facts.cancels.total === 0 &&
    facts.appErrors.total === 0 &&
    facts.safety.total === 0 &&
    facts.growth.newUsers === 0 &&
    facts.revenue.newPaying === 0 &&
    facts.revenue.renewals === 0 &&
    facts.revenue.refunds === 0 &&
    facts.revenue.paywallPurchases === 0 &&
    facts.ideas.total === 0 &&
    facts.queues.length === 0
  );
}

const DIGEST_SYSTEM_PROMPT = [
  'Ты — толковый операционный помощник основателя мобильного приложения для изучения английского.',
  'Тебе дают СВОДКУ событий за последние сутки в JSON: рост (новые юзеры), деньги (покупки/продления/возвраты/пробные), новые идеи пользователей (с текстом), репорты (с примерами жалоб), ошибки приложения (сгруппированы: что именно ломается), safety-флаги и очереди модерации/обращений.',
  'Напиши ПОЛЕЗНЫЙ утренний отчёт НА РУССКОМ обычным текстом (без markdown-заголовков, без таблиц).',
  'Строгие правила содержания:',
  '— Называй КОНКРЕТИКУ, а не только числа. Про репорты: перескажи суть тревожных жалоб (из samples), а не «17 репортов». Про ошибки: назови топ-группы (context/message из topGroups) — что чинить. Про идеи: кратко перескажи 1-3 самые толковые (из items) и скажи, стоит ли обратить внимание и почему.',
  '— Деньги и рост — отдельным блоком: сколько новых людей, сколько новых платящих/продлений/возвратов/пробных. Если возвраты > 0 — подсветь. Помни: сумма выручки не дана (RevenueCat не присылает цену) — не выдумывай деньги, говори про КОЛИЧЕСТВО событий.',
  '— Очереди: если где-то накопилось (queues) — назови где и сколько, чтобы владелец знал, что разобрать.',
  'Структура ответа:',
  '1) Одна строка-итог: спокойно всё или есть на что смотреть в первую очередь.',
  '2) Блок «📈 Рост и деньги:» — 1-3 строки числами (новые люди, платящие, продления, возвраты, пробные; если нули — «продаж/новых не было»).',
  '3) Блок «⚠️ На что смотреть:» — маркеры «•» по приоритету: safety → возвраты/отмены → критические ошибки (какие) → тревожные репорты (о чём) → всё остальное. Группируй одинаковое, называй числа И суть.',
  '4) Блок «💡 Идеи:» — если были: 1-3 самые дельные своими словами + вердикт «стоит/не стоит смотреть». Если идей нет — пропусти блок.',
  '5) Блок «✅ Сделай сегодня:» — 1-5 конкретных действий по приоритету; если делать нечего — так и скажи.',
  'Тон: спокойный, по делу, как толковый коллега. Без воды и канцелярита. Безопасность — всегда наверх, если есть. Не выдумывай того, чего нет в данных; если сутки реально тихие — честно так и скажи коротко.',
].join('\n');

/** Собирает user-payload для ИИ из фактов (чистая функция). */
export function buildDigestPrompt(facts: DigestFacts): string {
  return JSON.stringify(facts, null, 2);
}

// ── I/O: чтение источников за 24ч ──────────────────────────────────────────────
/**
 * Читает все источники за окно [since, now]. КАЖДЫЙ источник — в своём try
 * (сбой одного, напр. нет индекса, не роняет весь дайджест) и по СВОЕМУ полю
 * времени (у коллекций оно разное — см. шапку файла).
 */
export async function loadDigestSources(
  db: FirebaseFirestore.Firestore,
  since: number,
  limitPer = 1000,
): Promise<DigestSourceRows> {
  // Универсальный безопасный запрос по числовому ms-полю времени.
  const byMs = async <T>(
    collection: string,
    field: string,
    map: (d: FirebaseFirestore.QueryDocumentSnapshot) => T,
  ): Promise<T[]> => {
    try {
      const snap = await db.collection(collection).where(field, '>=', since).limit(limitPer).get();
      return snap.docs.map(map);
    } catch (e) {
      console.warn(`admin_daily_digest: read ${collection} by ${field} failed`, e);
      return [];
    }
  };

  // users.created_at может быть числом / строкой / Timestamp — фильтруем в памяти
  // после чтения по индексируемому запросу, чтобы не упасть на смешанных типах.
  const loadNewUsers = async (): Promise<Array<{ platform?: string }>> => {
    try {
      const snap = await db.collection('users').where('created_at', '>=', since).limit(limitPer).get();
      return snap.docs
        .filter((d) => {
          const v = d.data().created_at;
          const ms = typeof v === 'number' ? v
            : typeof v === 'string' ? Date.parse(v)
              : (v && typeof v.toMillis === 'function') ? v.toMillis() : 0;
          return ms >= since;
        })
        .map((d) => ({ platform: d.data().platform as string }));
    } catch (e) {
      console.warn('admin_daily_digest: read users(created_at) failed', e);
      return [];
    }
  };

  // paywall_funnel: ключ — строка day (YYYY-MM-DD); окно 24ч перекрывает ≤2 дня.
  const loadPaywallPurchases = async (): Promise<Array<{ day?: string }>> => {
    try {
      const fromDay = new Date(since).toISOString().slice(0, 10);
      const toDay = new Date(since + DAY_MS).toISOString().slice(0, 10);
      const snap = await db
        .collection('paywall_funnel')
        .where('day', '>=', fromDay)
        .where('day', '<=', toDay)
        .limit(limitPer)
        .get();
      return snap.docs
        .map((d) => d.data())
        .filter((x) => x.dev !== true && x.step === 'purchase_completed')
        .map((x) => ({ day: x.day as string }));
    } catch (e) {
      console.warn('admin_daily_digest: read paywall_funnel failed', e);
      return [];
    }
  };

  // website_contact_inbox.createdAt — Firestore Timestamp (не число): фильтруем Timestamp'ом.
  const loadWebsiteInbox = async (): Promise<Array<{ topic?: string; message?: string }>> => {
    try {
      const sinceTs = admin.firestore.Timestamp.fromMillis(since);
      const snap = await db
        .collection('website_contact_inbox')
        .where('createdAt', '>=', sinceTs)
        .limit(limitPer)
        .get();
      return snap.docs.map((d) => ({ topic: d.data().topic as string, message: d.data().message as string }));
    } catch (e) {
      console.warn('admin_daily_digest: read website_contact_inbox failed', e);
      return [];
    }
  };

  const [
    reports, cancels, appErrors, safety,
    newUsers, purchases, paywallPurchases, ideas,
    userReports, packReports, explainReports, websiteInbox, supportInbox, helpBoard, leagueModeration,
  ] = await Promise.all([
    // — Основные (у всех есть числовой createdAtMs) —
    byMs('error_reports', 'createdAtMs', (d) => {
      const x = d.data();
      return { status: x.status as string, category: x.category as string, screen: x.screen as string, comment: x.comment as string, dataText: x.dataText as string };
    }),
    byMs('subscription_cancel_surveys', 'createdAtMs', (d) => {
      const x = d.data();
      return { reason: x.reason as string, reasonText: x.reasonText as string };
    }),
    byMs('app_errors', 'createdAtMs', (d) => {
      const x = d.data();
      return { severity: x.severity as string, context: x.context as string, message: x.message as string, feature: x.feature as string, fingerprint: x.fingerprint as string };
    }),
    byMs('safety_flags', 'createdAtMs', (d) => {
      const x = d.data();
      return { category: x.category as string, handled: !!x.handled };
    }),
    // — Рост и деньги (разные поля времени) —
    loadNewUsers(),
    byMs('revenuecat_premium_events', 'eventTimestampMs', (d) => {
      const x = d.data();
      return { eventType: x.eventType as string, periodType: x.periodType as string, productId: x.productId as string };
    }),
    loadPaywallPurchases(),
    byMs('user_ideas', 'createdAtMs', (d) => {
      const x = d.data();
      return { title: x.title as string, description: x.description as string, benefit: x.benefit as string, category: x.category as string, userName: x.userName as string };
    }),
    // — Прочие очереди —
    byMs('user_reports', 'createdAtMs', (d) => ({ reason: d.data().reason as string })),
    byMs('community_pack_reports', 'createdAtMs', (d) => ({ reason: d.data().reason as string })),
    byMs('explain_report_entries', 'createdAtMs', (d) => ({ reason: d.data().reason as string })),
    loadWebsiteInbox(),
    byMs('support_inbox', 'receivedAtMs', (d) => ({ subject: d.data().subject as string })),
    byMs('help_board_topics', 'createdAt', (d) => ({ title: d.data().title as string })), // createdAt здесь числовое (Date.now())
    byMs('league_chat_moderation_queue', 'createdAt', (d) => ({ status: d.data().status as string })), // createdAt числовое
  ]);

  return {
    reports, cancels, appErrors, safety,
    newUsers, purchases, paywallPurchases, ideas,
    queues: { userReports, packReports, explainReports, websiteInbox, supportInbox, helpBoard, leagueModeration },
  };
}

/** UTC день-ключ (YYYY-MM-DD) — один документ дайджеста на сутки. */
export function utcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export interface DigestResult {
  ok: boolean;
  empty: boolean;
  dayKey: string;
  summary: string;
  facts: DigestFacts;
  model: string;
}

/**
 * Полный прогон: читает источники, агрегирует, зовёт ИИ, пишет в
 * admin_digests/{dayKey} и admin_log. Идемпотентно перезаписывает документ дня
 * (повторный вызов = свежий дайджест за те же сутки).
 */
export async function runAdminDailyDigest(
  apiKey: string,
  actorEmail: string,
  now: number = Date.now(),
): Promise<DigestResult> {
  const db = admin.firestore();
  const cfg = await resolveJobConfig(db, 'digest');
  assertJobEnabled(cfg, 'digest');

  const since = now - DAY_MS;
  const rows = await loadDigestSources(db, since);
  const facts = aggregateDigestFacts(rows, 24);
  const dayKey = utcDayKey(now);

  let summary: string;
  const empty = isDigestEmpty(facts);
  if (empty) {
    summary = 'За последние сутки заметных событий нет — новых пользователей, продаж, репортов, критических ошибок и safety-флагов не поступало. Спокойные сутки.';
  } else {
    const result = await openAiChat({
      apiKey,
      model: cfg.model,
      messages: [
        { role: 'system', content: DIGEST_SYSTEM_PROMPT },
        { role: 'user', content: buildDigestPrompt(facts) },
      ],
      maxTokens: 1100,
      temperature: 0.5,
    });
    summary = result.text.trim();
  }

  const nowIso = new Date(now).toISOString();
  await db.collection(DIGESTS_COLLECTION).doc(dayKey).set({
    dayKey,
    summary,
    facts,
    model: empty ? 'none' : cfg.model,
    generatedAt: nowIso,
    generatedAtMs: now,
    generatedBy: actorEmail || 'admin',
  });

  // Короткая запись в общий admin_log (виден в Audit-log без нового UI).
  await db.collection('admin_log').add({
    ts: nowIso,
    adminEmail: actorEmail || 'admin',
    action: 'ai_daily_digest',
    details: {
      dayKey,
      newUsers: facts.growth.newUsers,
      newPaying: facts.revenue.newPaying,
      refunds: facts.revenue.refunds,
      reports: facts.reports.total,
      cancels: facts.cancels.total,
      appErrorsCritical: facts.appErrors.critical,
      safetyOpen: facts.safety.open,
      ideas: facts.ideas.total,
    },
  });

  return { ok: true, empty, dayKey, summary, facts, model: empty ? 'none' : cfg.model };
}

// ── Admin CF: сгенерировать дайджест по кнопке ────────────────────────────────
/**
 * adminGenerateDailyDigest — генерирует/перегенерирует дайджест за сутки.
 * data: {} (ничего не нужно). Возвращает { ok, empty, dayKey, summary, facts }.
 */
export const adminGenerateDailyDigest = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [OPENAI_API_KEY] },
  async (request) => {
    if (request.auth?.token?.admin !== true) {
      throw new HttpsError('permission-denied', 'Admin only');
    }
    // Do NOT clamp the secret — project-scoped keys can be long; truncation breaks auth.
    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');

    const actorEmail = String(request.auth?.token?.email ?? '');
    try {
      return await runAdminDailyDigest(apiKey, actorEmail);
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error('adminGenerateDailyDigest failed', e);
      throw new HttpsError('internal', e instanceof Error ? e.message : 'digest_failed');
    }
  },
);
