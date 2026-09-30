import { createHash } from 'node:crypto';
import { currentDialogMonthlyQuota } from './dialog_quota_contract';

const REQUEST_ID_RE = /^[A-Za-z0-9_-]{16,80}$/;
const OWNER_ID_RE = /^[^/]{1,160}$/;
const SHA256_RE = /^[a-f0-9]{64}$/;

export type DialogExtraRepliesOperationV1 = Readonly<{
  schemaVersion: 'client-dialog-extra-replies-rune-operation.v1';
  operationId: string;
  ownerStableId: string;
  accountGeneration: number;
  requestId: string;
  runeDelta: -300;
  price: 300;
  repliesGranted: 10;
  balanceBefore: number;
  balanceAfter: number;
  reason: 'dialog_extra_replies';
  createdAtMs: number;
  requestFingerprint: string;
}>;

export type DialogQuotaObservationV1 = Readonly<{
  remainingQuota: number;
  resetAtMs: number;
  quotaVersion: number;
}>;

const exactKeys = (value: object, allowed: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

export function parseDialogExtraRepliesOperation(input: unknown): DialogExtraRepliesOperationV1 | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Partial<DialogExtraRepliesOperationV1>;
  if (!exactKeys(value, [
    'schemaVersion', 'operationId', 'ownerStableId', 'accountGeneration', 'requestId',
    'runeDelta', 'price', 'repliesGranted', 'balanceBefore', 'balanceAfter', 'reason',
    'createdAtMs', 'requestFingerprint',
  ])
    || value.schemaVersion !== 'client-dialog-extra-replies-rune-operation.v1'
    || typeof value.requestId !== 'string' || !REQUEST_ID_RE.test(value.requestId)
    || value.operationId !== `dialog_extra_replies:${value.requestId}`
    || typeof value.ownerStableId !== 'string' || !OWNER_ID_RE.test(value.ownerStableId.trim())
    || value.ownerStableId !== value.ownerStableId.trim()
    || !Number.isSafeInteger(value.accountGeneration) || Number(value.accountGeneration) < 1
    || value.runeDelta !== -300 || value.price !== 300 || value.repliesGranted !== 10
    || !Number.isSafeInteger(value.balanceBefore) || Number(value.balanceBefore) < 300
    || !Number.isSafeInteger(value.balanceAfter)
    || Number(value.balanceAfter) !== Number(value.balanceBefore) - 300
    || value.reason !== 'dialog_extra_replies'
    || !Number.isSafeInteger(value.createdAtMs) || Number(value.createdAtMs) < 0
    || typeof value.requestFingerprint !== 'string' || !SHA256_RE.test(value.requestFingerprint)) return null;
  return value as DialogExtraRepliesOperationV1;
}

export function dialogExtraRepliesOperationFingerprint(
  operation: Omit<DialogExtraRepliesOperationV1, 'schemaVersion' | 'requestFingerprint'>,
): string {
  return createHash('sha256').update(JSON.stringify({
    schemaVersion: 1,
    operationId: operation.operationId,
    ownerStableId: operation.ownerStableId,
    accountGeneration: operation.accountGeneration,
    requestId: operation.requestId,
    runeDelta: operation.runeDelta,
    price: operation.price,
    repliesGranted: operation.repliesGranted,
    balanceBefore: operation.balanceBefore,
    balanceAfter: operation.balanceAfter,
    reason: operation.reason,
    createdAtMs: operation.createdAtMs,
  })).digest('hex');
}

export function hasValidDialogExtraRepliesOperationFingerprint(input: unknown): input is DialogExtraRepliesOperationV1 {
  const operation = parseDialogExtraRepliesOperation(input);
  if (!operation) return false;
  const { schemaVersion: _schemaVersion, requestFingerprint, ...unsigned } = operation;
  return requestFingerprint === dialogExtraRepliesOperationFingerprint(unsigned);
}

const safeNonNegative = (value: unknown): number => (
  Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : 0
);

export function nextDialogQuotaAfterPurchase(
  current: Readonly<Record<string, unknown>>,
  nowMs: number,
  nextResetAtMs: (nowMs: number) => number,
): Readonly<{
  quotaPeriod: 'calendar_month';
  periodKey: string;
  monthlyCap: number;
  monthlyCount: number;
  extraCapThisMonth: number;
  dailyCap: number;
  dailyCount: number;
  extraCapToday: number;
  resetAtMs: number;
  quotaVersion: number;
  observation: DialogQuotaObservationV1;
}> {
  const normalized = currentDialogMonthlyQuota(current, nowMs, nextResetAtMs);
  const extraCapThisMonth = normalized.extraCapThisMonth + 10;
  const quotaVersion = safeNonNegative(current.quotaVersion) + 1;
  return Object.freeze({
    quotaPeriod: 'calendar_month' as const,
    periodKey: normalized.periodKey,
    monthlyCap: normalized.monthlyCap,
    monthlyCount: normalized.monthlyCount,
    extraCapThisMonth,
    dailyCap: normalized.monthlyCap,
    dailyCount: normalized.monthlyCount,
    extraCapToday: extraCapThisMonth,
    resetAtMs: normalized.resetAtMs,
    quotaVersion,
    observation: Object.freeze({
      remainingQuota: Math.max(0, normalized.monthlyCap + extraCapThisMonth - normalized.monthlyCount),
      resetAtMs: normalized.resetAtMs,
      quotaVersion,
    }),
  });
}

export function currentDialogQuotaObservation(
  current: Readonly<Record<string, unknown>>,
  nowMs: number,
  nextResetAtMs: (nowMs: number) => number,
): Readonly<{
  quotaPeriod: 'calendar_month';
  periodKey: string;
  monthlyCap: number;
  monthlyCount: number;
  extraCapThisMonth: number;
  dailyCap: number;
  dailyCount: number;
  extraCapToday: number;
  resetAtMs: number;
  quotaVersion: number;
  normalizedFreshDay: boolean;
  observation: DialogQuotaObservationV1;
}> {
  const normalized = currentDialogMonthlyQuota(current, nowMs, nextResetAtMs);
  const previouslyCurrent = current.quotaPeriod === 'calendar_month'
    && current.periodKey === normalized.periodKey
    && nowMs < safeNonNegative(current.resetAtMs);
  const normalizedFreshDay = !previouslyCurrent;
  const quotaVersion = safeNonNegative(current.quotaVersion) + (normalizedFreshDay ? 1 : 0);
  return Object.freeze({
    quotaPeriod: 'calendar_month' as const,
    periodKey: normalized.periodKey,
    monthlyCap: normalized.monthlyCap,
    monthlyCount: normalized.monthlyCount,
    extraCapThisMonth: normalized.extraCapThisMonth,
    dailyCap: normalized.monthlyCap,
    dailyCount: normalized.monthlyCount,
    extraCapToday: normalized.extraCapThisMonth,
    resetAtMs: normalized.resetAtMs,
    quotaVersion,
    normalizedFreshDay,
    observation: Object.freeze({
      remainingQuota: Math.max(0, normalized.monthlyCap + normalized.extraCapThisMonth - normalized.monthlyCount),
      resetAtMs: normalized.resetAtMs,
      quotaVersion,
    }),
  });
}
