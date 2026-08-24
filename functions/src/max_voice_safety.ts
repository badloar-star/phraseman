// ═══════════════════════════════════════════════════════════════════════════
// max_voice_safety.ts — privacy-safe safety detection for MAX voice calls.
//
// Три источника флага по транскрипту, пока финализация ещё выполняется:
//   1) учитель сам вызвал инструмент flag_safety во время урока (клиент передал);
//   2) словарный детектор ai_safety.evaluateSafety по каждой реплике ученика;
//   3) OpenAI Moderation по всему тексту ученика (одним вызовом, дёшево).
// Каждая уникальная категория даёт только обезличенный Telegram-сигнал.
// MAX не пишет safety_flags и не отправляет оператору UID, реплики, контекст,
// транскрипт, sessionId или свободный текст (owner-approved contract 2026-08-21).
// Никогда не бросает: сбой журнала не должен ломать разбор урока.
// ═══════════════════════════════════════════════════════════════════════════

import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { ADMIN_ALERT_BOT_TOKEN } from './admin_alerts';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import {
  evaluateSafety,
  moderateUserText,
  recordMaxVoiceSafetySignal,
  type SafetyCategory,
  type SafetyVerdict,
} from './ai_safety';
import {
  VOICE_DEAD_SESSION_SILENCE_MS,
  VOICE_QUOTA_COLLECTION,
  ensureCanonicalVoiceQuota,
  voiceQuotaDocId,
} from './max_voice_quota';

if (!admin.apps.length) admin.initializeApp();

const CLIENT_KINDS: ReadonlySet<SafetyCategory> = new Set<SafetyCategory>([
  'self_harm', 'suicide', 'abuse', 'harassment', 'sexual', 'sexual_minors', 'violence', 'hate', 'illicit', 'minor', 'other',
]);

export interface VoiceSafetyClientFlag {
  kind: string;
  note?: string;
}

export interface VoiceSafetyTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface VoiceSafetyReviewArgs {
  apiKey: string;
  authUid: string;
  stableUid: string;
  /** 'voice_tutor' | 'voice_call' — режим для админки/алерта. */
  mode: string;
  history: readonly VoiceSafetyTurn[];
  /** Флаги, поставленные учителем инструментом flag_safety (клиент собрал за урок). */
  clientFlags?: readonly VoiceSafetyClientFlag[];
  /** Сессия звонка: категории, уже записанные мгновенным репортом, не дублируем. */
  sessionId?: string;
  /** Dependency injection for deterministic guard tests; production uses Admin SDK. */
  db?: Firestore;
  nowMs?: number;
  /** Only trusted finalizers may review the just-settled session. */
  allowSettled?: boolean;
}

export interface VoiceSafetyReviewResult {
  categories: SafetyCategory[];
}

/** Разбор клиентских флагов: только известные категории, дедуп, потолок. */
export function sanitizeClientSafetyFlags(value: unknown): VoiceSafetyClientFlag[] {
  if (!Array.isArray(value)) return [];
  const out: VoiceSafetyClientFlag[] = [];
  for (const raw of value.slice(0, 10)) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const kind = String(item.kind ?? '').trim().slice(0, 24);
    if (!CLIENT_KINDS.has(kind as SafetyCategory)) continue;
    if (out.some((f) => f.kind === kind)) continue;
    out.push({ kind, note: String(item.note ?? '').trim().slice(0, 200) });
  }
  return out;
}

/**
 * Собрать вердикты из трёх источников. Чистая часть (без сети): клиентские флаги
 * + словарь; модерация — отдельным шагом в reviewVoiceSafety.
 */
export function collectLocalVoiceVerdicts(
  history: readonly VoiceSafetyTurn[],
  clientFlags: readonly VoiceSafetyClientFlag[],
): Array<{ verdict: SafetyVerdict; source: 'keywords' | 'tutor_tool' }> {
  const out: Array<{ verdict: SafetyVerdict; source: 'keywords' | 'tutor_tool' }> = [];
  const learnerLines = history.filter((t) => t.role === 'user').map((t) => String(t.content ?? ''));
  for (const flag of clientFlags) {
    out.push({
      verdict: { flagged: true, category: flag.kind as SafetyCategory, matched: 'tutor:flag_safety' },
      source: 'tutor_tool',
    });
  }
  for (const line of learnerLines) {
    const verdict = evaluateSafety(line);
    if (verdict.flagged) out.push({ verdict, source: 'keywords' });
  }
  return out;
}

/** Схлопнуть по категории (первый источник побеждает: инструмент учителя → словарь → модерация). */
export function dedupeVerdicts<T extends { verdict: SafetyVerdict }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const cat = item.verdict.category;
    if (!cat || seen.has(cat)) continue;
    seen.add(cat);
    out.push(item);
  }
  return out;
}

export async function reviewVoiceSafety(args: VoiceSafetyReviewArgs): Promise<VoiceSafetyReviewResult> {
  try {
    const clientFlags = args.clientFlags ?? [];
    const local = collectLocalVoiceVerdicts(args.history, clientFlags);
    const learnerText = args.history.filter((t) => t.role === 'user').map((t) => t.content).join('\n');
    let moderation: SafetyVerdict = { flagged: false, category: null, matched: null };
    try {
      moderation = await moderateUserText(args.apiKey, learnerText);
    } catch {
      // Модерация недоступна — словарь и флаги учителя уже отработали.
    }
    const all = dedupeVerdicts([
      ...local,
      ...(moderation.flagged ? [{ verdict: moderation, source: 'moderation' as const }] : []),
    ]);
    if (all.length === 0) return { categories: [] };
    const mode = args.mode === 'voice_call' ? 'voice_call' : 'voice_tutor';
    for (const item of all) {
      if (!args.sessionId) continue;
      try {
        await reportMaxVoiceSafetySignal(
          args.db ?? admin.firestore(),
          {
            authUid: args.authUid,
            stableUid: args.stableUid,
            sessionId: args.sessionId,
            reportId: `finalize_${String(item.verdict.category)}`,
            kind: item.verdict.category as SafetyCategory,
            mode,
            source: item.source,
            nowMs: args.nowMs,
            allowSettled: args.allowSettled === true,
          },
          recordMaxVoiceSafetySignal,
        );
      } catch (error) {
        // Signal delivery must never make a completed lesson unavailable.
        console.error('[max_voice_safety] guarded signal failed', error);
      }
    }
    return { categories: all.map((i) => i.verdict.category as SafetyCategory) };
  } catch (error) {
    console.error('[max_voice_safety] review failed', error);
    return { categories: [] };
  }
}

// ── Мгновенный репорт из урока ──────────────────────────────────────────────

const REGION = 'us-central1';

export const MAX_VOICE_SAFETY_RATE_LIMIT = 6;
const MAX_VOICE_SAFETY_RATE_WINDOW_MS = 60_000;
const MAX_VOICE_SAFETY_GUARD_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_VOICE_SAFETY_DELIVERY_LEASE_MS = 30_000;
const MAX_VOICE_SAFETY_REPORT_DIGESTS = 32;
const REPORT_ID_RE = /^[^\u0000-\u001f\u007f]{1,128}$/;
const SESSION_ID_RE = /^vs_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface MaxVoiceSafetyReportData {
  sessionId: string;
  reportId: string;
  kind: SafetyCategory;
}

interface MaxVoiceSafetySignalArgs extends MaxVoiceSafetyReportData {
  authUid: string;
  stableUid: string;
  mode: 'voice_tutor' | 'voice_call';
  source?: 'keywords' | 'moderation' | 'tutor_tool';
  nowMs?: number;
  /** Internal post-settlement review only; never exposed through the callable. */
  allowSettled?: boolean;
}

type MaxVoiceSafetySignalSender = (
  verdict: SafetyVerdict,
  ctx: { mode: 'voice_tutor' | 'voice_call'; source: 'keywords' | 'moderation' | 'tutor_tool' },
) => Promise<boolean>;

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function nonNegativeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function digest(...parts: string[]): string {
  return createHash('sha256').update(parts.join('\0')).digest('hex');
}

function digestMap(value: unknown): Record<string, string | number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string | number> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, MAX_VOICE_SAFETY_REPORT_DIGESTS)) {
    if (!/^[a-f0-9]{64}$/.test(key)) continue;
    if (typeof item === 'string' && /^[a-f0-9]{64}$/.test(item)) out[key] = item;
    if (typeof item === 'number' && Number.isFinite(item)) out[key] = Math.max(0, Math.floor(item));
  }
  return out;
}

/** Strict callable boundary: transcript, note and arbitrary metadata are rejected. */
export function parseMaxVoiceSafetyReportData(value: unknown): MaxVoiceSafetyReportData {
  const data = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const keys = Object.keys(data).sort();
  const allowedKeys = new Set(['kind', 'reportId', 'sessionId']);
  if (keys.some((key) => !allowedKeys.has(key))) {
    throw new HttpsError('invalid-argument', 'safety_payload_fields_invalid');
  }
  const sessionId = text(data.sessionId, 80);
  const reportId = text(data.reportId, 128);
  const kind = text(data.kind, 24);
  if (!SESSION_ID_RE.test(sessionId)) throw new HttpsError('invalid-argument', 'safety_session_id_invalid');
  if (!reportId) throw new HttpsError('invalid-argument', 'safety_report_id_required');
  if (!REPORT_ID_RE.test(reportId)) throw new HttpsError('invalid-argument', 'safety_report_id_invalid');
  if (!CLIENT_KINDS.has(kind as SafetyCategory)) throw new HttpsError('invalid-argument', 'safety_kind_invalid');
  return { sessionId, reportId, kind: kind as SafetyCategory };
}

/**
 * Atomically leases one content-free operator signal. The bounded opaque guard
 * lives inside the account-scoped quota document, so account deletion already
 * erases it. A definitive false delivery clears the lease and stays retryable;
 * an exception is an honest uncertain outcome and is never silently reported
 * as delivered or resent. Only a confirmed true result becomes replayable.
 */
export async function reportMaxVoiceSafetySignal(
  db: Firestore,
  args: MaxVoiceSafetySignalArgs,
  send: MaxVoiceSafetySignalSender,
): Promise<{ ok: true; replayed: boolean }> {
  const nowMs = args.nowMs ?? Date.now();
  const quotaRef = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(args.stableUid));
  // Session IDs are server-minted UUIDs. Including one in every digest prevents
  // a low-entropy category dictionary while leaving no raw session identifier
  // in the nested guard.
  const reportDigest = digest('report_v1', args.sessionId, args.reportId);
  const payloadDigest = digest('payload_v2', args.sessionId, args.kind);
  const sessionDigest = digest('session_v1', args.sessionId);
  const leaseToken = digest('lease_v1', reportDigest, payloadDigest, String(nowMs));
  const pendingUntilDigest = digest('pending_until_v1', payloadDigest);
  // Earlier schemas are already durable. Normalize them without resending:
  // their pre-delivery claim may have been followed by Telegram acceptance.
  const legacyPayloadDigests = [
    digest('payload_v1', args.sessionId, args.kind),
    digest('payload_v1', args.sessionId, args.kind, 'voice_tutor'),
    digest('payload_v1', args.sessionId, args.kind, 'voice_call'),
  ];
  const acceptedPayloadDigests = new Set([payloadDigest, ...legacyPayloadDigests]);

  const claim = await db.runTransaction(async (tx): Promise<'send' | 'replay' | 'pending' | 'uncertain'> => {
    const quotaSnap = await tx.get(quotaRef);
    const quota = (quotaSnap.data() ?? {}) as Record<string, unknown>;
    const owned = quotaSnap.exists && quota.authUid === args.authUid && quota.stableUid === args.stableUid;
    const live = owned
      && quota.activeSessionId === args.sessionId
      // A mint reservation alone is not a conversation. The transport sends
      // its first heartbeat immediately on activation, before any tool call.
      && nonNegativeNumber(quota.activatedAtMs) > 0
      && nonNegativeNumber(quota.reservedSec) > 0
      && nonNegativeNumber(quota.expiresAtMs) > nowMs
      && nonNegativeNumber(quota.lastHeartbeatMs) > 0
      && nowMs - nonNegativeNumber(quota.lastHeartbeatMs) <= VOICE_DEAD_SESSION_SILENCE_MS;
    const lastSettledAtMs = nonNegativeNumber(quota.lastSettledAtMs);
    const settledAgeMs = nowMs - lastSettledAtMs;
    const settled = owned
      && args.allowSettled === true
      && quota.lastSettledSessionId === args.sessionId
      && lastSettledAtMs > 0
      && settledAgeMs >= 0
      && settledAgeMs < MAX_VOICE_SAFETY_GUARD_TTL_MS;
    if (!live && !settled) {
      // One response for missing, foreign, closed, expired and stale sessions.
      throw new HttpsError('failed-precondition', 'safety_session_not_active');
    }

    const nestedGuard = quota.safetyGuard;
    const rawGuard = nestedGuard && typeof nestedGuard === 'object' && !Array.isArray(nestedGuard)
      ? nestedGuard as Record<string, unknown>
      : {};
    const guardAlive = nonNegativeNumber(rawGuard.expiresAtMs) > nowMs
      && (!rawGuard.sessionDigest || rawGuard.sessionDigest === sessionDigest);
    const schemaVersion = Math.floor(nonNegativeNumber(rawGuard.schemaVersion));
    const reportDigests = guardAlive ? digestMap(rawGuard.reportDigests) as Record<string, string> : {};
    const payloadDigests = guardAlive && schemaVersion >= 3
      ? digestMap(rawGuard.payloadDigests) as Record<string, number>
      : {};
    const uncertainDigests = guardAlive && schemaVersion >= 3
      ? digestMap(rawGuard.uncertainDigests) as Record<string, number>
      : {};
    const pendingDigests = guardAlive ? digestMap(rawGuard.pendingDigests) as Record<string, string | number> : {};
    const existingPayload = reportDigests[reportDigest];
    if (existingPayload) {
      if (!acceptedPayloadDigests.has(existingPayload)) {
        throw new HttpsError('failed-precondition', 'safety_report_id_conflict');
      }
    }
    if (!existingPayload && Object.keys(reportDigests).length >= MAX_VOICE_SAFETY_REPORT_DIGESTS) {
      throw new HttpsError('resource-exhausted', 'safety_report_rate_limited');
    }

    reportDigests[reportDigest] = payloadDigest;
    const expiresAtMs = nowMs + MAX_VOICE_SAFETY_GUARD_TTL_MS;
    const acceptedDigests = [payloadDigest, ...legacyPayloadDigests];
    const legacyPayloadState = schemaVersion < 3
      ? digestMap(rawGuard.payloadDigests) as Record<string, number>
      : {};
    const legacyClaimMs = acceptedDigests
      .map((key) => nonNegativeNumber(legacyPayloadState[key]))
      .find((value) => value > 0);
    const priorConfirmedMs = acceptedDigests
      .map((key) => nonNegativeNumber(payloadDigests[key]))
      .find((value) => value > 0);
    const priorUncertainMs = acceptedDigests
      .map((key) => nonNegativeNumber(uncertainDigests[key]))
      .find((value) => value > 0);
    const legacyPending = schemaVersion < 3
      && acceptedDigests.some((key) => Boolean(pendingDigests[key]));
    if (legacyPending || (schemaVersion < 3 && (legacyClaimMs || existingPayload))) {
      for (const legacyDigest of legacyPayloadDigests) {
        delete payloadDigests[legacyDigest];
        delete uncertainDigests[legacyDigest];
      }
      uncertainDigests[payloadDigest] = legacyClaimMs || nowMs;
      tx.update(quotaRef, { safetyGuard: {
        ...rawGuard,
        schemaVersion: 3,
        sessionDigest,
        reportDigests,
        payloadDigests,
        uncertainDigests,
        pendingDigests: {},
        updatedAtMs: nowMs,
        expiresAtMs,
        expiresAt: new Date(expiresAtMs),
      } });
      return 'uncertain';
    }
    if (priorConfirmedMs) {
      for (const legacyDigest of legacyPayloadDigests) delete payloadDigests[legacyDigest];
      payloadDigests[payloadDigest] = priorConfirmedMs;
      tx.update(quotaRef, { safetyGuard: {
        ...rawGuard,
        schemaVersion: 3,
        sessionDigest,
        reportDigests,
        payloadDigests,
        uncertainDigests,
        pendingDigests: {},
        updatedAtMs: nowMs,
        expiresAtMs,
        expiresAt: new Date(expiresAtMs),
      } });
      return 'replay';
    }
    if (priorUncertainMs) {
      for (const legacyDigest of legacyPayloadDigests) delete uncertainDigests[legacyDigest];
      uncertainDigests[payloadDigest] = priorUncertainMs;
      tx.update(quotaRef, { safetyGuard: {
        ...rawGuard,
        schemaVersion: 3,
        sessionDigest,
        reportDigests,
        payloadDigests,
        uncertainDigests,
        pendingDigests: {},
        updatedAtMs: nowMs,
        expiresAtMs,
        expiresAt: new Date(expiresAtMs),
      } });
      return 'uncertain';
    }
    if (pendingDigests[payloadDigest]
      && nonNegativeNumber(pendingDigests[pendingUntilDigest]) > nowMs) {
      return 'pending';
    }

    const previousWindowStartedAtMs = nonNegativeNumber(rawGuard.windowStartedAtMs);
    const sameWindow = guardAlive && nowMs - previousWindowStartedAtMs < MAX_VOICE_SAFETY_RATE_WINDOW_MS;
    const windowStartedAtMs = sameWindow ? previousWindowStartedAtMs : nowMs;
    const windowCount = sameWindow ? Math.floor(nonNegativeNumber(rawGuard.windowCount)) : 0;
    if (!existingPayload && windowCount >= MAX_VOICE_SAFETY_RATE_LIMIT) {
      throw new HttpsError('resource-exhausted', 'safety_report_rate_limited');
    }
    const nextPendingDigests: Record<string, string | number> = {
      [payloadDigest]: leaseToken,
      [pendingUntilDigest]: nowMs + MAX_VOICE_SAFETY_DELIVERY_LEASE_MS,
    };
    tx.update(quotaRef, { safetyGuard: {
      schemaVersion: 3,
      sessionDigest,
      windowStartedAtMs,
      windowCount: windowCount + (existingPayload ? 0 : 1),
      reportDigests,
      payloadDigests,
      uncertainDigests,
      pendingDigests: nextPendingDigests,
      updatedAtMs: nowMs,
      expiresAtMs,
      expiresAt: new Date(expiresAtMs),
    } });
    return 'send';
  });

  if (claim === 'replay') return { ok: true, replayed: true };
  if (claim === 'pending') throw new HttpsError('unavailable', 'safety_signal_delivery_pending');
  if (claim === 'uncertain') throw new HttpsError('unavailable', 'safety_signal_delivery_uncertain');
  let delivered = false;
  let uncertain = false;
  try {
    delivered = await send(
      { flagged: true, category: args.kind, matched: 'tutor:flag_safety' },
      { mode: args.mode, source: args.source ?? 'tutor_tool' },
    );
  } catch {
    uncertain = true;
  }
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(quotaRef);
    if (!snapshot.exists) return;
    const quota = (snapshot.data() ?? {}) as Record<string, unknown>;
    const nested = quota.safetyGuard;
    const guard = nested && typeof nested === 'object' && !Array.isArray(nested)
      ? nested as Record<string, unknown>
      : {};
    const pendingDigests = digestMap(guard.pendingDigests) as Record<string, string | number>;
    if (pendingDigests[payloadDigest] !== leaseToken) return;
    delete pendingDigests[payloadDigest];
    delete pendingDigests[pendingUntilDigest];
    const payloadDigests = digestMap(guard.payloadDigests) as Record<string, number>;
    const uncertainDigests = digestMap(guard.uncertainDigests) as Record<string, number>;
    if (delivered) payloadDigests[payloadDigest] = nowMs;
    if (uncertain) uncertainDigests[payloadDigest] = nowMs;
    tx.update(quotaRef, { safetyGuard: {
      ...guard,
      schemaVersion: 3,
      pendingDigests,
      payloadDigests,
      uncertainDigests,
      updatedAtMs: nowMs,
    } });
  });
  if (uncertain) throw new HttpsError('unavailable', 'safety_signal_delivery_uncertain');
  if (!delivered) throw new HttpsError('unavailable', 'safety_signal_delivery_failed');
  return { ok: true, replayed: false };
}

/**
 * Учитель вызвал flag_safety прямо в уроке. Сервер принимает только известную
 * категорию и немедленно отправляет обезличенный сигнал. Свободный текст и
 * транскрипт не входят в wire-contract и отклоняются на границе callable.
 */
export const maxVoiceSafetyReport = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 20,
  memory: '256MiB',
  maxInstances: 10,
  secrets: [ADMIN_ALERT_BOT_TOKEN],
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const data = parseMaxVoiceSafetyReportData(request.data);
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);
  await ensureCanonicalVoiceQuota(db, { authUid, stableUid });
  return reportMaxVoiceSafetySignal(db, {
    authUid,
    stableUid,
    ...data,
    mode: 'voice_tutor',
    source: 'tutor_tool',
  }, recordMaxVoiceSafetySignal);
});
