import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  submitClientReport,
  type ClientReportKind,
  type SubmitClientReportOptions,
  type SubmitClientReportResult,
} from '../../app/client_reports';

export type SpireTaskReportSubmissionInput = Readonly<{
  stableUid: string;
  taskId: string;
  studyTarget: 'es' | 'fr' | 'de';
  weekId: string;
  tier: number;
  packHash: string;
  floor: number;
  step: number;
  setIndex: number;
  taskIndex: number;
  reason: string;
}>;

type Sender = (
  kind: ClientReportKind,
  payload: Record<string, unknown>,
  options: SubmitClientReportOptions,
) => Promise<SubmitClientReportResult | null>;

export type PendingSpireTaskReport = Readonly<{
  id: string;
  stableUid: string;
  payload: Record<string, unknown>;
  queuedAtMs: number;
}>;

export function canDrainSpireTaskReportOutbox(input: Readonly<{
  authenticatedUid: string | null;
  appIsActive: boolean;
  stableUid: string | null;
  accountPhase: string;
}>): input is Readonly<{
  authenticatedUid: string;
  appIsActive: true;
  stableUid: string;
  accountPhase: 'active';
}> {
  return !!input.authenticatedUid
    && input.appIsActive
    && input.accountPhase === 'active'
    && !!input.stableUid;
}

const OUTBOX_PREFIX = 'spire_task_report_outbox_v1';
const OUTBOX_MAX = 50;
const OUTBOX_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const outboxLocks = new Map<string, Promise<void>>();

function outboxKey(stableUid: string): string {
  const clean = stableUid.trim();
  if (!clean || Array.from(clean).length > 256) throw new Error('spire_task_report_owner_invalid');
  return `${OUTBOX_PREFIX}:${encodeURIComponent(clean)}`;
}

function withOutboxLock<T>(stableUid: string, operation: () => Promise<T>): Promise<T> {
  const key = outboxKey(stableUid);
  const previous = outboxLocks.get(key) ?? Promise.resolve();
  const run = previous.then(operation);
  const tail = run.then(() => undefined, () => undefined);
  outboxLocks.set(key, tail);
  return run.finally(() => {
    if (outboxLocks.get(key) === tail) outboxLocks.delete(key);
  });
}

function isPending(value: unknown, stableUid: string, nowMs: number): value is PendingSpireTaskReport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return row.stableUid === stableUid
    && typeof row.id === 'string' && row.id.length > 0 && row.id.length <= 120
    && typeof row.queuedAtMs === 'number' && nowMs - row.queuedAtMs >= -5 * 60 * 1_000
    && nowMs - row.queuedAtMs <= OUTBOX_TTL_MS
    && !!row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload);
}

async function readPendingUnlocked(stableUid: string, nowMs = Date.now()): Promise<PendingSpireTaskReport[]> {
  const raw = await AsyncStorage.getItem(outboxKey(stableUid));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error('invalid');
    const kept = parsed.filter((row) => isPending(row, stableUid, nowMs)).slice(-OUTBOX_MAX);
    if (kept.length !== parsed.length) await writePendingUnlocked(stableUid, kept);
    return kept;
  } catch {
    await AsyncStorage.removeItem(outboxKey(stableUid)).catch(() => undefined);
    return [];
  }
}

async function writePendingUnlocked(stableUid: string, rows: readonly PendingSpireTaskReport[]): Promise<void> {
  if (!rows.length) await AsyncStorage.removeItem(outboxKey(stableUid));
  else await AsyncStorage.setItem(outboxKey(stableUid), JSON.stringify(rows));
}

export async function listPendingSpireTaskReports(stableUid: string): Promise<PendingSpireTaskReport[]> {
  return withOutboxLock(stableUid, () => readPendingUnlocked(stableUid));
}

async function enqueuePendingSpireTaskReport(report: PendingSpireTaskReport): Promise<boolean> {
  try {
    return await withOutboxLock(report.stableUid, async () => {
      const rows = await readPendingUnlocked(report.stableUid, report.queuedAtMs);
      const withoutSame = rows.filter((row) => row.id !== report.id);
      if (withoutSame.length >= OUTBOX_MAX) return false;
      await writePendingUnlocked(report.stableUid, [...withoutSame, report]);
      return true;
    });
  } catch {
    return false;
  }
}

async function removePendingSpireTaskReport(stableUid: string, id: string): Promise<void> {
  await withOutboxLock(stableUid, async () => {
    const rows = await readPendingUnlocked(stableUid);
    await writePendingUnlocked(stableUid, rows.filter((row) => row.id !== id));
  });
}

export async function retryPendingSpireTaskReports(
  stableUid: string,
  send: Sender = submitClientReport,
): Promise<Readonly<{ sent: number; left: number }>> {
  const rows = await listPendingSpireTaskReports(stableUid);
  let sent = 0;
  for (const row of rows) {
    let result: SubmitClientReportResult | null;
    try {
      result = await send('spire_task_report', row.payload, {
        expectedStableUid: stableUid,
        idempotencyKey: row.id,
      });
    } catch {
      break;
    }
    if (result?.ok !== true) break;
    await removePendingSpireTaskReport(stableUid, row.id);
    sent += 1;
  }
  return { sent, left: (await listPendingSpireTaskReports(stableUid)).length };
}

async function idempotencyKey(input: SpireTaskReportSubmissionInput): Promise<string> {
  const canonical = [
    'spire-task-report-v1', input.studyTarget, input.weekId, input.tier,
    input.packHash, input.taskId, input.floor, input.step, input.setIndex,
    input.taskIndex, input.reason.trim(),
  ].join(':');
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical);
  return `spire-task-report-v1:${digest}`;
}

/**
 * Typed integration seam for the future Spire task renderer.
 *
 * The current repository contains the Spire pack/progress engine but no mounted
 * learner task screen. That screen must call this helper from its usual flag
 * action and remove the task from the remaining in-memory run immediately.
 */
export function buildSpireTaskReportSubmission(input: SpireTaskReportSubmissionInput) {
  const payload = Object.freeze({
    taskId: input.taskId,
    studyTarget: input.studyTarget,
    weekId: input.weekId,
    tier: input.tier,
    packHash: input.packHash,
    floor: input.floor,
    step: input.step,
    setIndex: input.setIndex,
    taskIndex: input.taskIndex,
    reason: input.reason,
  });
  return Object.freeze({
    payload,
    async submit(deps: Readonly<{
      send?: Sender;
      removeFromRemainingRun(taskId: string): void;
    }>): Promise<Readonly<{ serverConfirmed: boolean; reportId: string | null }>> {
      const reportKey = await idempotencyKey(input);
      const persisted = await enqueuePendingSpireTaskReport({
        id: reportKey,
        stableUid: input.stableUid,
        payload,
        queuedAtMs: Date.now(),
      });
      let removedFromRun = false;
      const removeExactlyOnce = () => {
        if (removedFromRun) return;
        removedFromRun = true;
        deps.removeFromRemainingRun(input.taskId);
      };
      if (persisted) removeExactlyOnce();
      let result: SubmitClientReportResult | null = null;
      try {
        result = await (deps.send ?? submitClientReport)(
          'spire_task_report',
          payload,
          { expectedStableUid: input.stableUid, idempotencyKey: reportKey },
        );
      } catch {
        result = null;
      }
      // A task may leave the current run only after either a durable local
      // handoff or authoritative server acceptance. Storage-full/write errors
      // must not turn a transient delivery failure into a lost report.
      if (result?.ok === true) removeExactlyOnce();
      if (persisted && result?.ok === true) {
        await removePendingSpireTaskReport(input.stableUid, reportKey).catch(() => undefined);
      }
      return Object.freeze({
        serverConfirmed: result?.ok === true,
        reportId: result?.ok === true && result.id ? result.id : null,
      });
    },
  });
}
