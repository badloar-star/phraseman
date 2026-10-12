import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createHash } from 'crypto';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { logExpireAt, supportReportExpireAt } from './log_ttl';
import {
  commitPreparedQualityDailyAggregate,
  isQualityReportKind,
  prepareQualityDailyAggregate,
} from './quality_daily_aggregate';
import {
  parseSpireTaskReportClaim,
  verifySpireTaskClaimAgainstPack,
  type VerifiedSpireTaskClaim,
} from './spire_task_report_contract';
import {
  SPIRE_TASK_FLAGS_COLLECTION,
  parseSpireTaskFlagsDocStrict,
  spireTaskFlagsDocId,
} from './spire_task_flag_contract';
import {
  SPIRE_TASK_INCIDENTS_COLLECTION,
  parseSpireTaskIncident,
  planAcceptedSpireTaskReport,
  spireTaskIncidentId,
} from './spire_task_incident_contract';
import { spireWeekId } from './spire_groups';
import { spireWeekStartMs } from './spire_residents';

const REGION = 'us-central1';
const RATE_COLLECTION = 'client_report_rate_limits';
const SPIRE_RESERVATION_COLLECTION = 'spire_task_report_reservations';
/** Приватный документ матча Арены: там лежит seatByStableUid и маркер бота. */
const ARENA_MATCH_PRIVATE = 'arena_v2_match_private';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type ClientReportKind =
  | 'user_report'
  | 'arena_opponent_report'
  | 'community_pack_report'
  | 'error_report'
  | 'spire_task_report'
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
  spire_task_report: { collection: 'error_reports', max: 10, windowMs: HOUR_MS },
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

// зачем (Q40): язык жалобы на набор — это язык обучения набора; прежний enum ['en','fr'] писал жалобы на
// es/de/it наборы как английские. Серверный двойник app/learning_language_contour.ts (functions не импортирует
// app/*); совпадение держит тест client_reports.test.ts. Неизвестный язык — фолбэк 'en' с логом, не отказ:
// жалобу на контент терять нельзя.
export const REPORT_STUDY_TARGETS = ['en', 'es', 'fr', 'de', 'it'] as const;

function reportStudyTarget(value: unknown): (typeof REPORT_STUDY_TARGETS)[number] {
  const raw = text(value, 80);
  if ((REPORT_STUDY_TARGETS as readonly string[]).includes(raw)) return raw as (typeof REPORT_STUDY_TARGETS)[number];
  console.warn('[CLIENT-REPORTS] community_pack_report: unknown studyTarget, fallback en', { received: raw || null });
  return 'en';
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

/**
 * PM-108-A2: одна жалоба одного человека на один набор (или один отклик под
 * ним) — один документ. Повторное нажатие «Пожаловаться» не плодит дубликаты
 * в админке и не тратит окно лимита: id детерминирован от (кто, набор, отклик).
 */
export function communityPackReportDedupeDocId(
  stableUid: string,
  packId: string,
  commentId: string,
): string {
  return `cpr_${createHash('sha256')
    .update(`community_pack_report|${stableUid}|${packId}|${commentId}`)
    .digest('hex')
    .slice(0, 48)}`;
}

function baseDoc(payload: Record<string, unknown>, stableUid: string, authUid: string, now: number) {
  return {
    uid: stableUid,
    authUid,
    // зачем (§126 п.9): error_report старых клиентов шлёт платформу как deviceOS — берём её, а не 'unknown'.
    platform: text(payload.platform, 40) || text(payload.deviceOS, 40) || 'unknown',
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
      // зачем (2026-09-30): у визитки «Про» есть свой текст, его видят все —
      // жалоба на него идёт тем же путём, но с отдельной причиной и снимком текста,
      // чтобы модератор видел, ЧТО было написано, даже если текст потом сменят.
      reason: enumText(payload.reason, ['offensive_nickname', 'offensive_profile_text'] as const, 'offensive_nickname'),
      ...(payload.reason === 'offensive_profile_text'
        ? { reportedText: text(payload.reportedText, 200) }
        : {}),
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
    // зачем commentId опционален: тот же callable и та же коллекция обслуживают
    // и жалобу на весь набор (ReportPackModal), и жалобу на отдельный отклик
    // (ReportCommentModal, owner-решение 2026-09-17) — их различает наличие поля.
    const commentId = text(payload.commentId, 180);
    return {
      ...base,
      packId,
      packTitle: text(payload.packTitle, 220),
      authorStableId: nullableText(payload.authorStableId, 180),
      studyTarget: reportStudyTarget(payload.studyTarget),
      reason: enumText(
        payload.reason,
        ['offensive', 'sexual', 'spam', 'copyright', 'wrong_translation', 'other'] as const,
        'other',
      ),
      comment: text(payload.comment, 500),
      ...(commentId ? {
        commentId,
        commentAuthorStableId: nullableText(payload.commentAuthorStableId, 180),
        commentText: text(payload.commentText, 200),
      } : {}),
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
      // зачем (решение владельца 12.10 (а)): обращение и приложенный журнал удаляются TTL через 30 дней (см. log_ttl.ts, политика).
      expireAt: supportReportExpireAt(now),
    };
  }

  if (kind === 'spire_task_report') {
    const claim = resolvedSpireClaim(payload);
    return {
      ...base,
      screen: 'spire',
      category: 'spire_task_report',
      dataId: claim.taskId,
      dataText: '',
      userAnswer: '',
      comment: claim.reason,
      status: 'new',
      contentScope: 'spire',
      spireTaskId: claim.taskId,
      spireLang: claim.studyTarget,
      spireWeekId: claim.weekId,
      spireTier: claim.tier,
      spirePackHash: claim.packHash,
      spireFloor: claim.floor,
      spireStep: claim.step,
      spireSetIndex: claim.setIndex,
      spireTaskIndex: claim.taskIndex,
      spireTaskMode: claim.mode,
      spireTaskKind: claim.kind,
      spireTaskDifficulty: claim.difficulty,
      spireQuarantineState: 'quarantined',
      spireQuarantinedAtMs: now,
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
      // зачем (§CORE-0158, приватность): имя старых сборок в журнал сбоев не сохраняем — только uid из base.
      osVersion: nullableText(payload.osVersion, 80),
      deviceName: nullableText(payload.deviceName, 160),
      // зачем: журнал ошибок живёт 90 дней (TTL по expireAt), см. log_ttl.ts
      expireAt: logExpireAt(now),
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
      // зачем (§CORE-0158, приватность): имя старых сборок в журнал активности не сохраняем — только uid из base.
      osVersion: nullableText(payload.osVersion, 80),
      appState: nullableText(payload.appState, 40),
      // зачем: журнал активности живёт 90 дней (TTL по expireAt), см. log_ttl.ts
      expireAt: logExpireAt(now),
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

function resolvedSpireClaim(payload: Record<string, unknown>): VerifiedSpireTaskClaim {
  if (payload.__verifiedSpireTaskClaim !== true) throw new HttpsError('failed-precondition', 'spire_task_report_not_verified');
  const { __verifiedSpireTaskClaim: _verified, ...claim } = payload;
  return claim as unknown as VerifiedSpireTaskClaim;
}

async function verifyPublishedSpireTaskClaim(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  let claim;
  try {
    claim = parseSpireTaskReportClaim(payload);
  } catch (error) {
    throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'spire_task_report_invalid');
  }
  const currentWeekId = spireWeekId(new Date(spireWeekStartMs(Date.now())));
  if (claim.weekId !== currentWeekId) {
    throw new HttpsError('failed-precondition', 'spire_task_report_week_not_current');
  }
  const path = `spire_packs/${claim.studyTarget}/${claim.tier}/${claim.weekId}.json`;
  try {
    const file = admin.storage().bucket().file(path);
    const [metadata] = await file.getMetadata();
    const publishedPackHash = text((metadata.metadata as Record<string, unknown> | undefined)?.packHash, 128);
    const size = Number(metadata.size ?? 0);
    if (!publishedPackHash || !Number.isFinite(size) || size <= 0 || size > 12 * 1024 * 1024) {
      throw new Error('spire_task_report_pack_unavailable');
    }
    const [bytes] = await file.download({ validation: 'crc32c' });
    if (bytes.byteLength !== size) throw new Error('spire_task_report_pack_unavailable');
    const pack = JSON.parse(bytes.toString('utf8')) as unknown;
    const verified = verifySpireTaskClaimAgainstPack(claim, pack, publishedPackHash);
    return { ...verified, __verifiedSpireTaskClaim: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'spire_task_report_pack_unavailable';
    if (message.startsWith('spire_task_report_')) throw new HttpsError('failed-precondition', message);
    throw new HttpsError('failed-precondition', 'spire_task_report_pack_unavailable');
  }
}

function spireAttemptFingerprint(payload: Record<string, unknown>): string {
  const bounded = [
    payload.taskId, payload.studyTarget, payload.weekId, payload.tier, payload.packHash,
    payload.floor, payload.step, payload.setIndex, payload.taskIndex, text(payload.reason, 2000),
  ];
  return createHash('sha256').update(JSON.stringify(bounded), 'utf8').digest('hex');
}

function requireMatchingFinalizedSpireFingerprint(
  snapshot: admin.firestore.DocumentSnapshot,
  expected: string,
): void {
  const actual = snapshot.data()?.spireRequestFingerprint;
  if (actual !== expected) {
    throw new HttpsError('already-exists', 'spire_task_report_idempotency_mismatch');
  }
}

async function submitVerifiedSpireTaskReport(input: Readonly<{
  db: admin.firestore.Firestore;
  authUid: string;
  stableUid: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  nowMs: number;
}>): Promise<Readonly<{ ok: true; id: string; collection: string }>> {
  const config = REPORT_CONFIG.spire_task_report;
  const reportRef = input.db.collection(config.collection)
    .doc(idempotentReportDocId('spire_task_report', input.stableUid, input.idempotencyKey));
  const rateRef = input.db.collection(RATE_COLLECTION)
    .doc(rateDocId('spire_task_report', input.authUid, input.stableUid));
  const reservationRef = input.db.collection(SPIRE_RESERVATION_COLLECTION).doc(reportRef.id);
  const fingerprint = spireAttemptFingerprint(input.payload);

  const reservation = await input.db.runTransaction(async (tx) => {
    const [existingReport, existingReservation, rateSnap] = await Promise.all([
      tx.get(reportRef), tx.get(reservationRef), tx.get(rateRef),
    ]);
    if (existingReport.exists) {
      requireMatchingFinalizedSpireFingerprint(existingReport, fingerprint);
      return { replayed: true as const };
    }
    if (existingReservation.exists) {
      const row = existingReservation.data() ?? {};
      if (row.stableUid !== input.stableUid || row.requestFingerprint !== fingerprint) {
        throw new HttpsError('already-exists', 'spire_task_report_idempotency_mismatch');
      }
      if (row.status !== 'pending') throw new HttpsError('failed-precondition', 'spire_task_report_reservation_invalid');
      return { replayed: false as const };
    }
    const rate = rateSnap.data() || {};
    const windowStartMs = numeric(rate.windowStartMs);
    const sameWindow = input.nowMs - windowStartMs < config.windowMs;
    const count = sameWindow ? numeric(rate.count) : 0;
    if (count >= config.max) throw new HttpsError('resource-exhausted', 'rate_limited');
    tx.set(rateRef, {
      kind: 'spire_task_report', stableUid: input.stableUid, authUid: input.authUid,
      windowStartMs: sameWindow ? windowStartMs : input.nowMs,
      count: count + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAtMs: input.nowMs,
    }, { merge: true });
    tx.create(reservationRef, {
      schemaVersion: 'spire-task-report-reservation-v1',
      reportId: reportRef.id,
      stableUid: input.stableUid,
      requestFingerprint: fingerprint,
      status: 'pending',
      createdAtMs: input.nowMs,
      serverCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { replayed: false as const };
  });
  if (reservation.replayed) {
    return { ok: true, id: reportRef.id, collection: config.collection };
  }

  const resolvedPayload = await verifyPublishedSpireTaskClaim(input.payload);
  const claim = resolvedSpireClaim(resolvedPayload);
  const reportDoc = buildReportDoc('spire_task_report', resolvedPayload, input.stableUid, input.authUid, input.nowMs);
  const flagRef = input.db.collection(SPIRE_TASK_FLAGS_COLLECTION).doc(spireTaskFlagsDocId(claim.studyTarget));
  const incidentId = spireTaskIncidentId(claim.studyTarget, claim.taskId);
  const incidentRef = input.db.collection(SPIRE_TASK_INCIDENTS_COLLECTION).doc(incidentId);
  const receiptRef = input.db.collection('spire_task_report_receipts').doc(reportRef.id);

  return input.db.runTransaction(async (tx) => {
    const [existingReport, reservationSnap, flagSnap, incidentSnap] = await Promise.all([
      tx.get(reportRef), tx.get(reservationRef), tx.get(flagRef), tx.get(incidentRef),
    ]);
    if (existingReport.exists) {
      requireMatchingFinalizedSpireFingerprint(existingReport, fingerprint);
      return { ok: true as const, id: reportRef.id, collection: config.collection };
    }
    const pending = reservationSnap.data() ?? {};
    if (!reservationSnap.exists
      || pending.status !== 'pending'
      || pending.stableUid !== input.stableUid
      || pending.requestFingerprint !== fingerprint) {
      throw new HttpsError('failed-precondition', 'spire_task_report_reservation_invalid');
    }
    const flags = parseSpireTaskFlagsDocStrict(flagSnap.exists ? flagSnap.data() : null, claim.studyTarget);
    const existingIncident = incidentSnap.exists
      ? parseSpireTaskIncident(incidentSnap.data(), claim.studyTarget, claim.taskId)
      : null;
    const plan = planAcceptedSpireTaskReport({
      existing: existingIncident,
      evidence: {
        reportId: reportRef.id, studyTarget: claim.studyTarget, taskId: claim.taskId,
        weekId: claim.weekId, tier: claim.tier, packHash: claim.packHash,
        reason: claim.reason, mode: claim.mode, difficulty: claim.difficulty,
      },
      nowMs: input.nowMs,
      flags,
    });
    const qualityAggregate = await prepareQualityDailyAggregate({
      db: input.db,
      tx,
      kind: 'error_report',
      reportDoc,
      stableUid: input.stableUid,
      nowMs: input.nowMs,
      fields: admin.firestore.FieldValue,
    });
    tx.create(reportRef, {
      ...reportDoc,
      spireIncidentId: incidentId,
      spireIncidentRevisionAtReport: plan.incident.revision,
      spireRequestFingerprint: fingerprint,
    });
    if (plan.nextFlags !== flags) tx.set(flagRef, plan.nextFlags);
    tx.set(incidentRef, plan.incident);
    tx.create(receiptRef, {
      schemaVersion: 'spire-task-report-receipt-v1',
      reportId: reportRef.id,
      taskId: claim.taskId,
      studyTarget: claim.studyTarget,
      incidentId,
      incidentRevision: plan.incident.revision,
      transition: plan.transition,
      requestFingerprint: fingerprint,
      createdAtMs: input.nowMs,
      serverCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(reservationRef, {
      status: 'finalized',
      finalizedAtMs: input.nowMs,
      serverFinalizedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    commitPreparedQualityDailyAggregate(tx, qualityAggregate);
    return { ok: true as const, id: reportRef.id, collection: config.collection };
  });
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
  if (kind === 'spire_task_report' && !idempotencyKey) {
    throw new HttpsError('invalid-argument', 'spire_task_report_idempotency_required');
  }
  const payload = asRecord(request.data?.payload);
  const now = Date.now();
  if (kind === 'spire_task_report') {
    return submitVerifiedSpireTaskReport({
      db, authUid, stableUid, idempotencyKey, payload, nowMs: now,
    });
  }
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
  // зачем (PM-108-A2): жалобы на набор/отклик дедуплицируются по (кто, набор,
  // отклик), а не только окном лимита 5/час — иначе один человек мог положить
  // в админку пять одинаковых жалоб подряд.
  const dedupeId = kind === 'community_pack_report'
    ? communityPackReportDedupeDocId(
      stableUid,
      text((doc as Record<string, unknown>).packId, 180),
      text((doc as Record<string, unknown>).commentId, 180),
    )
    : '';
  const reportRef = idempotencyKey
    ? db.collection(config.collection).doc(idempotentReportDocId(kind, stableUid, idempotencyKey))
    : dedupeId
      ? db.collection(config.collection).doc(dedupeId)
      : db.collection(config.collection).doc();
  return db.runTransaction(async (tx) => {
    if (idempotencyKey || dedupeId) {
      const existingReport = await tx.get(reportRef);
      if (existingReport.exists) {
        console.log('[PM108-REPORT] duplicate report ignored', {
          kind, reportId: reportRef.id, via: idempotencyKey ? 'idempotencyKey' : 'pack_dedupe',
        });
        // Повтор по idempotencyKey возвращает ровно прежний ответ (контракт ретрая);
        // пометка duplicate — только для дедупликации жалоб на набор.
        return idempotencyKey
          ? { ok: true, id: reportRef.id, collection: config.collection }
          : { ok: true, id: reportRef.id, collection: config.collection, duplicate: true };
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

    const qualityKind = kind;
    const qualityAggregate = isQualityReportKind(qualityKind)
      ? await prepareQualityDailyAggregate({
        db,
        tx,
        kind: qualityKind,
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
