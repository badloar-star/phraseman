import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createHash } from 'crypto';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import {
  commitPreparedQualityDailyAggregate,
  isQualityReportKind,
  prepareQualityDailyAggregate,
} from './quality_daily_aggregate';

const REGION = 'us-central1';
const RATE_COLLECTION = 'client_report_rate_limits';
/** Приватный документ матча Арены: там лежит seatByStableUid и маркер бота. */
const ARENA_MATCH_PRIVATE = 'arena_v2_match_private';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type ClientReportKind =
  | 'user_report'
  | 'arena_opponent_report'
  | 'community_pack_report'
  | 'error_report'
  | 'app_error'
  | 'app_activity'
  | 'subscription_cancel_survey'
  | 'review_promo_claim';

type ReportConfig = {
  collection: string;
  max: number;
  windowMs: number;
};

const REPORT_CONFIG: Record<ClientReportKind, ReportConfig> = {
  user_report: { collection: 'user_reports', max: 5, windowMs: HOUR_MS },
  // зачем: жалоба на ник соперника в Арене лжёт в ту же очередь
  // user_reports, но приходит без uid: клиент его не знает (и не должен).
  arena_opponent_report: { collection: 'user_reports', max: 5, windowMs: HOUR_MS },
  community_pack_report: { collection: 'community_pack_reports', max: 5, windowMs: HOUR_MS },
  error_report: { collection: 'error_reports', max: 10, windowMs: HOUR_MS },
  app_error: { collection: 'app_errors', max: 20, windowMs: HOUR_MS },
  app_activity: { collection: 'app_activity', max: 60, windowMs: HOUR_MS },
  subscription_cancel_survey: { collection: 'subscription_cancel_surveys', max: 5, windowMs: DAY_MS },
  review_promo_claim: { collection: 'review_promo_claims', max: 20, windowMs: DAY_MS },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function nullableText(value: unknown, max: number): string | null {
  const out = text(value, max);
  return out || null;
}

function enumText<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const out = text(value, 80) as T;
  return allowed.includes(out) ? out : fallback;
}

function numeric(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanTags(value: unknown): Record<string, string | number | boolean | null> {
  const source = asRecord(value);
  const out: Record<string, string | number | boolean | null> = {};
  Object.entries(source).slice(0, 24).forEach(([key, raw]) => {
    const cleanKey = text(key, 80);
    if (!cleanKey) return;
    if (typeof raw === 'string') out[cleanKey] = raw.slice(0, 220);
    else if (typeof raw === 'number' || typeof raw === 'boolean' || raw === null) out[cleanKey] = raw;
    else if (raw !== undefined) out[cleanKey] = String(raw).slice(0, 220);
  });
  return out;
}

const SUPPORT_DIAGNOSTIC_EVENTS = [
  'navigation', 'app_state', 'support_report', 'customization_purchase',
  'customization_apply', 'account_delete', 'auth_transition',
  'feature_action',
] as const;
const SUPPORT_DIAGNOSTIC_RESULTS = ['start', 'success', 'blocked', 'error', 'info'] as const;
const SUPPORT_DIAGNOSTIC_SUBJECTS = ['avatar', 'aura', 'account', 'report', 'app'] as const;
const SUPPORT_DIAGNOSTIC_REASONS = [
  'account_changed', 'insufficient_currency', 'transaction_failed', 'selection_failed',
  'locally_cleared', 'server_enqueued', 'quarantine_retained', 'queued',
  'direct_fallback', 'foreground', 'background', 'inactive',
] as const;
const SUPPORT_DIAGNOSTIC_TTL_MS = 24 * HOUR_MS;
const SUPPORT_DIAGNOSTIC_FUTURE_SKEW_MS = 5 * 60 * 1000;
const SUPPORT_DIAGNOSTIC_MAX_EVENTS = 200;
const SUPPORT_DIAGNOSTIC_MAX_BYTES = 32 * 1024;

function optionalEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : undefined;
}

function safeDiagnosticScreen(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const out = value.trim().slice(0, 96);
  if (!out || !/^[/a-zA-Z0-9_().\-[\]]+$/.test(out)) return undefined;
  if (/(?:^|\/)[A-Za-z0-9]{20,}(?:\/|$)/.test(out)
    || /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(out)) {
    return undefined;
  }
  return out;
}

function safeDiagnosticAction(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const out = value.trim().slice(0, 80);
  if (!/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/.test(out)) return undefined;
  if (/(?:^|[:._-])[A-Za-z0-9]{20,}(?:$|[:._-])/.test(out)
    || /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(out)) {
    return undefined;
  }
  return out;
}

export function cleanSupportDiagnostics(value: unknown, now: number): Record<string, unknown> | null {
  const source = asRecord(value);
  if (source.version !== 1 || !Array.isArray(source.events)) return null;
  const capturedRaw = Number(source.capturedAtMs);
  const capturedAtMs = Number.isSafeInteger(capturedRaw)
    && capturedRaw >= now - SUPPORT_DIAGNOSTIC_TTL_MS
    && capturedRaw <= now + SUPPORT_DIAGNOSTIC_FUTURE_SKEW_MS
    ? capturedRaw
    : now;
  const events = source.events.slice(-400).flatMap((raw): Record<string, unknown>[] => {
    const eventSource = asRecord(raw);
    const atMs = Number(eventSource.atMs);
    const event = optionalEnum(eventSource.event, SUPPORT_DIAGNOSTIC_EVENTS);
    if (!event || !Number.isSafeInteger(atMs)
      || atMs < now - SUPPORT_DIAGNOSTIC_TTL_MS
      || atMs > now + SUPPORT_DIAGNOSTIC_FUTURE_SKEW_MS) return [];
    const screen = safeDiagnosticScreen(eventSource.screen);
    const result = optionalEnum(eventSource.result, SUPPORT_DIAGNOSTIC_RESULTS);
    const reason = optionalEnum(eventSource.reason, SUPPORT_DIAGNOSTIC_REASONS);
    const subject = optionalEnum(eventSource.subject, SUPPORT_DIAGNOSTIC_SUBJECTS);
    const durationRaw = Number(eventSource.durationMs);
    const durationMs = Number.isFinite(durationRaw) && durationRaw >= 0
      ? Math.min(Math.round(durationRaw), SUPPORT_DIAGNOSTIC_TTL_MS)
      : undefined;
    const action = safeDiagnosticAction(eventSource.action);
    return [{
      atMs,
      event,
      ...(screen ? { screen } : {}),
      ...(result ? { result } : {}),
      ...(reason ? { reason } : {}),
      ...(subject ? { subject } : {}),
      ...(durationMs !== undefined ? { durationMs } : {}),
      ...(action ? { action } : {}),
    }];
  }).sort((left, right) => Number(left.atMs) - Number(right.atMs))
    .slice(-SUPPORT_DIAGNOSTIC_MAX_EVENTS);
  if (events.length === 0) return null;
  const bundle: { version: number; capturedAtMs: number; events: Record<string, unknown>[] } = {
    version: 1,
    capturedAtMs,
    events,
  };
  while (bundle.events.length > 0
    && Buffer.byteLength(JSON.stringify(bundle), 'utf8') > SUPPORT_DIAGNOSTIC_MAX_BYTES) {
    bundle.events.shift();
  }
  return bundle.events.length > 0 ? bundle : null;
}

function rateDocId(kind: ClientReportKind, authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`${kind}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `${kind}_${hash}`;
}

function idempotentReportDocId(
  kind: ClientReportKind,
  stableUid: string,
  idempotencyKey: string,
): string {
  return createHash('sha256')
    .update(`${kind}|${stableUid}|${idempotencyKey}`)
    .digest('hex');
}

function baseDoc(payload: Record<string, unknown>, stableUid: string, authUid: string, now: number) {
  return {
    uid: stableUid,
    authUid,
    platform: text(payload.platform, 40) || 'unknown',
    appVersion: text(payload.appVersion, 80) || 'unknown',
    buildNumber: nullableText(payload.buildNumber, 80),
    createdAt: new Date(now).toISOString(),
    createdAtMs: now,
    serverCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

function buildReportDoc(
  kind: ClientReportKind,
  payload: Record<string, unknown>,
  stableUid: string,
  authUid: string,
  now: number,
): Record<string, unknown> {
  const base = baseDoc(payload, stableUid, authUid, now);

  if (kind === 'user_report') {
    const reportedUid = text(payload.reportedUid, 180);
    if (!reportedUid) throw new HttpsError('invalid-argument', 'reported_uid_required');
    return {
      ...base,
      reportedUid,
      reportedName: text(payload.reportedName, 120),
      reason: enumText(payload.reason, ['offensive_nickname'] as const, 'offensive_nickname'),
      // зачем: карточка игрока открывается из >5 экранов (друзья, клуб, турнир,
      // главная) — 'profile' покрывает всё, что не leaderboard, вместо
      // молчаливого fallback на 'leaderboard' в админской статистике жалоб.
      screen: enumText(payload.screen, ['leaderboard', 'profile'] as const, 'leaderboard'),
      reporterUid: stableUid,
      reporterAuthUid: authUid,
      reporterName: text(payload.reporterName, 120) || 'unknown',
      status: 'new',
    };
  }

  // зачем: жалоба из боя Арены. reportedUid сюда уже подставил сервер
  // (resolveArenaOpponent) — клиент uid соперника не знает и не передаёт.
  if (kind === 'arena_opponent_report') {
    const reportedUid = text(payload.reportedUid, 180);
    if (!reportedUid) throw new HttpsError('invalid-argument', 'reported_uid_required');
    return {
      ...base,
      reportedUid,
      reportedName: text(payload.reportedName, 120),
      reason: enumText(payload.reason, ['offensive_nickname'] as const, 'offensive_nickname'),
      // Отдельный экран, чтобы в админке было видно: жалоба пришла из боя.
      screen: 'arena_match',
      matchId: text(payload.matchId, 180),
      reporterUid: stableUid,
      reporterAuthUid: authUid,
      reporterName: text(payload.reporterName, 120) || 'unknown',
      status: 'new',
    };
  }

  if (kind === 'community_pack_report') {
    const packId = text(payload.packId, 180);
    if (!packId) throw new HttpsError('invalid-argument', 'pack_id_required');
    return {
      ...base,
      packId,
      packTitle: text(payload.packTitle, 220),
      authorStableId: nullableText(payload.authorStableId, 180),
      studyTarget: enumText(payload.studyTarget, ['en', 'fr'] as const, 'en'),
      reason: enumText(
        payload.reason,
        ['offensive', 'sexual', 'spam', 'copyright', 'wrong_translation', 'other'] as const,
        'other',
      ),
      comment: text(payload.comment, 500),
      reporterUid: stableUid,
      reporterAuthUid: authUid,
      reporterName: text(payload.reporterName, 120) || 'unknown',
      status: 'new',
    };
  }

  if (kind === 'error_report') {
    const diagnostics = cleanSupportDiagnostics(payload.diagnostics, now);
    return {
      ...base,
      screen: text(payload.screen, 120),
      category: text(payload.category, 120) || 'free_text',
      dataId: text(payload.dataId, 180),
      dataText: text(payload.dataText, 5000),
      userAnswer: text(payload.userAnswer, 1000),
      comment: text(payload.comment, 2000),
      deviceModel: nullableText(payload.deviceModel, 160),
      deviceOS: nullableText(payload.deviceOS, 80),
      deviceOSVersion: nullableText(payload.deviceOSVersion, 80),
      screenWidth: numeric(payload.screenWidth),
      screenHeight: numeric(payload.screenHeight),
      pixelRatio: numeric(payload.pixelRatio, 1),
      userName: nullableText(payload.userName, 120),
      userLevel: numeric(payload.userLevel),
      userXP: numeric(payload.userXP),
      userStreak: numeric(payload.userStreak),
      userPremium: !!payload.userPremium,
      userLanguage: nullableText(payload.userLanguage, 16),
      userDaysInApp: numeric(payload.userDaysInApp),
      copyText: text(payload.copyText, 7000),
      ...(diagnostics ? { diagnostics } : {}),
      status: 'new',
    };
  }

  if (kind === 'app_error') {
    return {
      ...base,
      context: text(payload.context, 180),
      feature: text(payload.feature, 120) || 'app',
      screen: nullableText(payload.screen, 120),
      severity: enumText(payload.severity, ['warning', 'critical'] as const, 'warning'),
      fingerprint: text(payload.fingerprint, 80),
      errorName: text(payload.errorName, 120),
      message: text(payload.message, 2000),
      stack: nullableText(payload.stack, 8000),
      tags: cleanTags(payload.tags),
      userName: nullableText(payload.userName, 120),
      osVersion: nullableText(payload.osVersion, 80),
      deviceName: nullableText(payload.deviceName, 160),
      status: 'new',
    };
  }

  if (kind === 'app_activity') {
    return {
      ...base,
      action: text(payload.action, 120),
      feature: text(payload.feature, 120) || text(payload.action, 120).split(':')[0] || 'app',
      screen: nullableText(payload.screen, 120),
      result: enumText(payload.result, ['start', 'success', 'blocked', 'error', 'info'] as const, 'info'),
      tags: cleanTags(payload.tags),
      userName: nullableText(payload.userName, 120),
      osVersion: nullableText(payload.osVersion, 80),
      appState: nullableText(payload.appState, 40),
    };
  }

  if (kind === 'subscription_cancel_survey') {
    return {
      ...base,
      reason: text(payload.reason, 80) || 'unknown',
      reasonText: text(payload.reasonText, 1000),
      context: text(payload.context, 80) || 'manage',
      userName: nullableText(payload.userName, 120),
      lang: nullableText(payload.lang, 16),
      premiumPlan: nullableText(payload.premiumPlan, 80),
      osVersion: nullableText(payload.osVersion, 80),
    };
  }

  return {
    ...base,
    broadcastId: text(payload.broadcastId, 180),
    status: 'clicked',
  };
}

/**
 * Кто был соперником в матче Арены.
 *
 * зачем: uid чужого игрока намеренно НЕ уходит в клиент (в план матча падают
 * только место a/b, имя и аватар), поэтому пожаловаться на оскорбительный ник
 * из боя было физически нечем. Клиент шлёт matchId + место соперника, а uid
 * находит сервер — приватность сохраняется, жалоба становится возможной.
 *
 * Жалующийся обязан сам быть участником этого матча, иначе по чужому matchId
 * можно было бы заваливать жалобами кого угодно.
 */
async function resolveArenaOpponent(
  db: admin.firestore.Firestore,
  matchId: string,
  opponentSeat: 'a' | 'b',
  reporterStableUid: string,
): Promise<{ uid: string; isBot: boolean }> {
  const snap = await db.collection(ARENA_MATCH_PRIVATE).doc(matchId).get();
  if (!snap.exists) throw new HttpsError('not-found', 'arena_match_not_found');
  const data = snap.data() || {};
  const seatByStableUid = asRecord(data.seatByStableUid);
  // Жалующийся должен сидеть в этом матче — иначе это чужой матч.
  if (!seatByStableUid[reporterStableUid]) {
    throw new HttpsError('permission-denied', 'arena_not_a_participant');
  }
  const opponentUid = Object.keys(seatByStableUid)
    .find((uid) => seatByStableUid[uid] === opponentSeat && uid !== reporterStableUid);
  if (!opponentUid) throw new HttpsError('not-found', 'arena_opponent_not_found');
  // Бот — не человек: ник ему выдал сам сервер из своего пула, жаловаться не на кого.
  const isBot = Boolean(data.botSeed) || opponentUid.startsWith('bot_');
  return { uid: opponentUid, isBot };
}

export const submitClientReport = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 15,
  memory: '256MiB',
  maxInstances: 40,
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const kind = text(request.data?.kind, 80) as ClientReportKind;
  const config = REPORT_CONFIG[kind];
  if (!config) throw new HttpsError('invalid-argument', 'unknown_report_kind');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);
  const expectedStableUid = text(request.data?.expectedStableUid, 180);
  if (expectedStableUid && expectedStableUid !== stableUid) {
    throw new HttpsError('failed-precondition', 'report_owner_changed');
  }
  const idempotencyKey = text(request.data?.idempotencyKey, 120);
  const payload = asRecord(request.data?.payload);
  const now = Date.now();
  // зачем: в Арене клиент не знает uid соперника (сервер его намеренно не шлёт),
  // поэтому находим сами по matchId + месту.
  //
  // Бот: жалоба ПРИНИМАЕТСЯ как успех, но документ не пишется. Отказ ошибкой
  // косвенно раскрывал бы бота (на живого уходит, на бота — «не отправилась»),
  // а владелец запретил раскрывать бота в интерфейсе. Наказывать некого,
  // телеграм-алерт о жалобе не спамится — записи просто нет.
  const resolvedPayload = kind === 'arena_opponent_report'
    ? await (async () => {
      const matchId = text(payload.matchId, 180);
      if (!matchId) throw new HttpsError('invalid-argument', 'match_id_required');
      const seat = enumText(payload.opponentSeat, ['a', 'b'] as const, 'a');
      const opponent = await resolveArenaOpponent(db, matchId, seat, stableUid);
      if (opponent.isBot) return null;
      return { ...payload, reportedUid: opponent.uid };
    })()
    : payload;
  if (resolvedPayload === null) return { ok: true, id: 'accepted' };
  const doc = buildReportDoc(kind, resolvedPayload, stableUid, authUid, now);
  const rateRef = db.collection(RATE_COLLECTION).doc(rateDocId(kind, authUid, stableUid));
  const reportRef = idempotencyKey
    ? db.collection(config.collection).doc(idempotentReportDocId(kind, stableUid, idempotencyKey))
    : db.collection(config.collection).doc();

  return db.runTransaction(async (tx) => {
    if (idempotencyKey) {
      const existingReport = await tx.get(reportRef);
      if (existingReport.exists) {
        return { ok: true, id: reportRef.id, collection: config.collection };
      }
    }
    const rateSnap = await tx.get(rateRef);
    const rate = rateSnap.data() || {};
    const windowStartMs = numeric(rate.windowStartMs);
    const sameWindow = now - windowStartMs < config.windowMs;
    const count = sameWindow ? numeric(rate.count) : 0;
    if (count >= config.max) {
      throw new HttpsError('resource-exhausted', 'rate_limited');
    }

    const qualityAggregate = isQualityReportKind(kind)
      ? await prepareQualityDailyAggregate({
        db,
        tx,
        kind,
        reportDoc: doc,
        stableUid,
        nowMs: now,
        fields: admin.firestore.FieldValue,
      })
      : null;

    tx.set(rateRef, {
      kind,
      stableUid,
      authUid,
      windowStartMs: sameWindow ? windowStartMs : now,
      count: count + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: now,
    }, { merge: true });
    tx.create(reportRef, doc);
    if (qualityAggregate) commitPreparedQualityDailyAggregate(tx, qualityAggregate);
    // Осколок за баг-репорт начисляет АДМИН вручную при подтверждении («пофикшено»)
    // в admin/index.html → applyReportStatusFix (shards += 1, reason 'bug_fixed',
    // helpful_error_reports_confirmed_v1). Автоначисления при отправке НЕТ намеренно —
    // награда только за подтверждённую/полезную жалобу.
    return { ok: true, id: reportRef.id, collection: config.collection };
  });
});
