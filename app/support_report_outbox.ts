import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Lang } from '../constants/i18n';
import {
  submitErrorReport,
  type ErrorReportPayload,
  type ErrorReportResult,
  type SubmitErrorReportOptions,
} from './error_report';
import { getStableId } from './stable_id';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import {
  captureSupportDiagnosticBundle,
  recordSupportDiagnostic,
} from './support_diagnostics';
import { sanitizeSupportDiagnosticBundle } from './support_diagnostic_schema';

const OUTBOX_KEY_PREFIX = 'support_report_outbox_v1';
const mutationLocks = new Map<string, Promise<void>>();
const flushLocks = new Map<string, Promise<void>>();
const throttledRetryTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const SUPPORT_REPORT_OUTBOX_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
// Enough for prolonged offline use without allowing unbounded raw-text growth.
export const SUPPORT_REPORT_OUTBOX_MAX_ENTRIES = 50;
const SUPPORT_REPORT_CLOCK_SKEW_MS = 5 * 60 * 1_000;
const SUPPORT_REPORT_THROTTLED_RETRY_MS = 61_000;
const SUPPORT_DIAGNOSTIC_CAPTURE_DEADLINE_MS = 150;

function captureSupportDiagnosticsWithDeadline() {
  return new Promise<Awaited<ReturnType<typeof captureSupportDiagnosticBundle>>>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (value: Awaited<ReturnType<typeof captureSupportDiagnosticBundle>>): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    timer = setTimeout(() => finish(null), SUPPORT_DIAGNOSTIC_CAPTURE_DEADLINE_MS);
    void captureSupportDiagnosticBundle().then(finish, () => finish(null));
  });
}

export interface PendingSupportReport {
  id: string;
  payload: ErrorReportPayload;
  userName: string;
  lang: Lang;
  queuedAtMs: number;
}

export type SupportReportTransport = (
  payload: ErrorReportPayload,
  userName: string,
  lang: Lang,
  options: SubmitErrorReportOptions,
) => Promise<ErrorReportResult>;

function storageKey(accountKey: string): string {
  const normalized = accountKey.trim();
  if (!normalized || Array.from(normalized).length > 256) {
    throw new Error('support_report_account_invalid');
  }
  return `${OUTBOX_KEY_PREFIX}:${encodeURIComponent(normalized)}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isLang(value: unknown): value is Lang {
  return value === 'ru' || value === 'uk' || value === 'en' || value === 'es'
    || value === 'pt-BR' || value === 'vi' || value === 'id' || value === 'tr'
    || value === 'pl';
}

function isPendingSupportReport(value: unknown): value is PendingSupportReport {
  if (!isPlainObject(value) || !isPlainObject(value.payload)) return false;
  const payload = value.payload;
  const diagnosticsValid = payload.diagnostics === undefined
    || sanitizeSupportDiagnosticBundle(payload.diagnostics) !== null;
  return diagnosticsValid
    && typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 120
    && typeof value.userName === 'string' && value.userName.length <= 120
    && isLang(value.lang)
    && typeof value.queuedAtMs === 'number' && Number.isFinite(value.queuedAtMs)
    && typeof payload.screen === 'string' && payload.screen.length > 0
    && typeof payload.dataId === 'string' && payload.dataId.length > 0
    && typeof payload.dataText === 'string'
    && typeof payload.comment === 'string' && payload.comment.trim().length >= 10
    && payload.comment.length <= 3000
    && (payload.category === undefined || typeof payload.category === 'string')
    && (payload.userAnswer === undefined || typeof payload.userAnswer === 'string');
}

function withLock<T>(
  locks: Map<string, Promise<void>>,
  accountKey: string,
  operation: () => Promise<T>,
): Promise<T> {
  const key = storageKey(accountKey);
  const previous = locks.get(key) ?? Promise.resolve();
  const run = previous.then(operation);
  const tail = run.then(() => undefined, () => undefined);
  locks.set(key, tail);
  return run.finally(() => {
    if (locks.get(key) === tail) locks.delete(key);
  });
}

async function writeAllUnlocked(accountKey: string, rows: PendingSupportReport[]): Promise<boolean> {
  const key = storageKey(accountKey);
  try {
    if (rows.length === 0) {
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        // Some storage adapters can fail deletion while ordinary writes still
        // work. Persisting an empty queue prevents an acknowledged report from
        // being replayed and duplicated on the next foreground.
        await AsyncStorage.setItem(key, '[]');
      }
    } else {
      await AsyncStorage.setItem(key, JSON.stringify(rows));
    }
    return true;
  } catch {
    return false;
  }
}

async function readAllUnlocked(
  accountKey: string,
  nowMs: number,
  throwOnStorageRead = false,
): Promise<PendingSupportReport[]> {
  const key = storageKey(accountKey);
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch (error) {
    if (throwOnStorageRead) throw error;
    return [];
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    try { await AsyncStorage.removeItem(key); } catch { /* best-effort privacy cleanup */ }
    return [];
  }
  if (!Array.isArray(parsed)) {
    try { await AsyncStorage.removeItem(key); } catch { /* best-effort privacy cleanup */ }
    return [];
  }

  const kept = parsed
    .filter(isPendingSupportReport)
    .filter((row) => {
      const ageMs = nowMs - row.queuedAtMs;
      // A flush snapshots `nowMs` before its network await. A report enqueued
      // while that await is in flight is legitimately a few ms "in the future"
      // relative to the snapshot and must not be purged by the old dequeue.
      return ageMs >= -SUPPORT_REPORT_CLOCK_SKEW_MS
        && ageMs <= SUPPORT_REPORT_OUTBOX_TTL_MS;
    })
    .slice(-SUPPORT_REPORT_OUTBOX_MAX_ENTRIES);
  if (kept.length !== parsed.length) await writeAllUnlocked(accountKey, kept);
  return kept;
}

export async function enqueueSupportReport(
  accountKey: string,
  report: PendingSupportReport,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!isPendingSupportReport(report)) return false;
  const ageMs = nowMs - report.queuedAtMs;
  if (ageMs < -SUPPORT_REPORT_CLOCK_SKEW_MS || ageMs > SUPPORT_REPORT_OUTBOX_TTL_MS) return false;
  return withLock(mutationLocks, accountKey, async () => {
    let current: PendingSupportReport[];
    try {
      current = await readAllUnlocked(accountKey, nowMs, true);
    } catch {
      // Never overwrite an unreadable queue snapshot. The caller makes one
      // direct delivery attempt while the older durable rows remain untouched.
      return false;
    }
    const withoutSame = current.filter((row) => row.id !== report.id);
    if (withoutSame.length >= SUPPORT_REPORT_OUTBOX_MAX_ENTRIES) return false;
    const next = [...withoutSame, report];
    return writeAllUnlocked(accountKey, next);
  });
}

export async function listPendingSupportReports(
  accountKey: string,
  nowMs: number = Date.now(),
): Promise<PendingSupportReport[]> {
  return withLock(mutationLocks, accountKey, () => readAllUnlocked(accountKey, nowMs));
}

export async function flushSupportReportOutbox(
  accountKey: string,
  send: SupportReportTransport = submitErrorReport,
  nowMs: number = Date.now(),
): Promise<{ sent: number; left: number }> {
  return withLock(flushLocks, accountKey, async () => {
    const rows = await withLock(
      mutationLocks,
      accountKey,
      () => readAllUnlocked(accountKey, nowMs),
    );
    let sent = 0;
    for (const row of rows) {
      let result: ErrorReportResult;
      try {
        result = await send(row.payload, row.userName, row.lang, {
          awardSubmissionXp: false,
          expectedStableUid: accountKey,
          idempotencyKey: row.id,
        });
      } catch {
        break;
      }
      if (result !== 'sent' && result !== 'invalid_comment') break;
      await withLock(mutationLocks, accountKey, async () => {
        const current = await readAllUnlocked(accountKey, nowMs);
        await writeAllUnlocked(accountKey, current.filter((pending) => pending.id !== row.id));
      });
      if (result === 'sent') sent += 1;
    }
    const left = await withLock(
      mutationLocks,
      accountKey,
      async () => (await readAllUnlocked(accountKey, nowMs)).length,
    );
    return { sent, left };
  });
}

async function deliverOnlyForCurrentAccount(
  accountToken: AccountGenerationToken,
  accountKey: string,
  payload: ErrorReportPayload,
  userName: string,
  lang: Lang,
  options: SubmitErrorReportOptions,
): Promise<ErrorReportResult> {
  if (!isCurrentAccountGeneration(accountToken, accountKey)) return 'failed';
  return submitErrorReport(payload, userName, lang, options);
}

export async function resumePendingSupportReports(
  accountKey: string,
  send: SupportReportTransport = submitErrorReport,
): Promise<void> {
  const accountToken = captureAccountGeneration();
  if (!isCurrentAccountGeneration(accountToken, accountKey)) return;
  let wasThrottled = false;
  await flushSupportReportOutbox(
    accountKey,
    async (payload, userName, lang, options) => {
      if (!isCurrentAccountGeneration(accountToken, accountKey)) return 'failed';
      // The server also validates options.expectedStableUid. That closes the
      // final race between this check and callable auth capture without holding
      // the account-transition lock through a potentially slow network call.
      const result = await send(payload, userName, lang, options);
      if (result === 'throttled') wasThrottled = true;
      return result;
    },
  );
  if (wasThrottled && !throttledRetryTimers.has(accountKey)) {
    const timer = setTimeout(() => {
      throttledRetryTimers.delete(accountKey);
      void resumePendingSupportReports(accountKey, send).catch(() => {});
    }, SUPPORT_REPORT_THROTTLED_RETRY_MS);
    (timer as unknown as { unref?: () => void }).unref?.();
    throttledRetryTimers.set(accountKey, timer);
  }
}

function createSupportReportId(nowMs: number): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `support_${nowMs}_${random}`;
}

/**
 * Optimistic submission entry point: callers deliberately do not await it.
 * The first await happens before disk/network work, so React can paint the
 * confirmation immediately; the durable queue then survives app restarts.
 */
export async function sendSupportReportInBackground(
  payload: ErrorReportPayload,
  lang: Lang,
  options: SubmitErrorReportOptions = { awardSubmissionXp: false },
): Promise<void> {
  const nowMs = Date.now();
  const prepared = await withAccountTransitionLock(async () => {
    const accountKey = await getStableId();
    const accountToken = captureAccountGeneration();
    if (!isCurrentAccountGeneration(accountToken, accountKey)) return null;
    void recordSupportDiagnostic({
      atMs: nowMs,
      event: 'support_report',
      result: 'start',
      subject: 'report',
    });
    if (!isCurrentAccountGeneration(accountToken, accountKey)) return null;
    const userName = await AsyncStorage.getItem('user_name').catch(() => null);
    if (!isCurrentAccountGeneration(accountToken, accountKey)) return null;
    const capturedDiagnostics = payload.diagnostics
      ?? await captureSupportDiagnosticsWithDeadline();
    if (!isCurrentAccountGeneration(accountToken, accountKey)) return null;
    const diagnostics = sanitizeSupportDiagnosticBundle(capturedDiagnostics);
    const frozenPayload = diagnostics ? { ...payload, diagnostics } : payload;
    const report: PendingSupportReport = {
      id: createSupportReportId(nowMs),
      payload: frozenPayload,
      userName: userName || '',
      lang,
      queuedAtMs: nowMs,
    };
    const persisted = await enqueueSupportReport(accountKey, report, nowMs);
    if (!isCurrentAccountGeneration(accountToken, accountKey)) return null;
    if (!persisted) {
      void recordSupportDiagnostic({
        event: 'support_report',
        result: 'info',
        reason: 'direct_fallback',
        subject: 'report',
      });
      return { accountKey, accountToken, frozenPayload, report, persisted: false as const };
    }
    void recordSupportDiagnostic({
      event: 'support_report',
      result: 'success',
      reason: 'queued',
      subject: 'report',
    });
    if (!isCurrentAccountGeneration(accountToken, accountKey)) return null;
    return { accountKey, accountToken, frozenPayload, report, persisted: true as const };
  });
  if (!prepared) return;
  if (!prepared.persisted) {
    await deliverOnlyForCurrentAccount(
      prepared.accountToken,
      prepared.accountKey,
      prepared.frozenPayload,
      prepared.report.userName,
      lang,
      {
        ...options,
        expectedStableUid: prepared.accountKey,
        idempotencyKey: prepared.report.id,
      },
    ).catch(() => {});
    return;
  }
  await resumePendingSupportReports(prepared.accountKey).catch(() => {});
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
