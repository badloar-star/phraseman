import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasVerifiedCallablePermission } from './admin/permissions';
import { ADMIN_SENSITIVE_WRITE_OPTIONS } from './callable_options';

const DAY_MS = 24 * 60 * 60 * 1000;
export const ADMIN_SHARD_REFUND_RANGE_DAYS = 90;
export const ADMIN_SHARD_REFUND_MAX_ROWS = 300;

type RawRefundRow = Readonly<Record<string, unknown>>;

export interface AdminShardRefundDependencies {
  readonly now: () => number;
  readonly loadRows: (
    sinceMs: number,
    untilMs: number,
    limit: number,
  ) => Promise<readonly RawRefundRow[]>;
}

export interface AdminShardRefundRow {
  readonly rowKey: string;
  readonly productId: string;
  readonly requestedDebit: number;
  readonly eventTimestampMs: number;
  readonly reason: string;
  readonly serial: boolean | null;
  readonly buyerRefundCount: number | null;
}

interface AdminShardRefundRequest {
  readonly rangeDays: number;
  readonly cap: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, maxLength: number, fallback: string): string {
  const clean = typeof value === 'string' ? value.trim() : '';
  if (!clean) return fallback;
  return clean.slice(0, maxLength);
}

function parseRequest(data: unknown): AdminShardRefundRequest {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'Request object required');
  const keys = Object.keys(data);
  if (keys.some((key) => key !== 'rangeDays' && key !== 'cap')) {
    throw new HttpsError('invalid-argument', 'Unsupported request field');
  }
  if (data.rangeDays !== ADMIN_SHARD_REFUND_RANGE_DAYS) {
    throw new HttpsError('invalid-argument', 'Only the fixed 90-day range is supported');
  }
  const cap = Number(data.cap);
  if (!Number.isSafeInteger(cap) || cap < 1 || cap > ADMIN_SHARD_REFUND_MAX_ROWS) {
    throw new HttpsError('invalid-argument', `cap must be 1..${ADMIN_SHARD_REFUND_MAX_ROWS}`);
  }
  return { rangeDays: ADMIN_SHARD_REFUND_RANGE_DAYS, cap };
}

function internalBuyerKey(row: RawRefundRow): string {
  for (const value of [row.uid, row.sourceUid, row.uidHash]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function validRefundRow(row: RawRefundRow, sinceMs: number, untilMs: number): boolean {
  const eventTimestampMs = Number(row.eventTimestampMs);
  const requestedDebit = Number(row.requestedDebit ?? row.grantedShards ?? 0);
  return Number.isSafeInteger(eventTimestampMs)
    && eventTimestampMs >= sinceMs
    && eventTimestampMs <= untilMs
    && Number.isSafeInteger(requestedDebit)
    && requestedDebit >= 0
    && requestedDebit <= 10_000_000;
}

async function loadRowsFromFirestore(
  sinceMs: number,
  untilMs: number,
  limit: number,
): Promise<readonly RawRefundRow[]> {
  const snapshot = await admin.firestore()
    .collection('revenuecat_shard_refunds')
    .where('eventTimestampMs', '>=', sinceMs)
    .where('eventTimestampMs', '<=', untilMs)
    .orderBy('eventTimestampMs', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map((document) => document.data() as RawRefundRow);
}

const productionDependencies: AdminShardRefundDependencies = {
  now: () => Date.now(),
  loadRows: loadRowsFromFirestore,
};

export async function adminListShardRefundsHandler(
  data: unknown,
  auth: unknown,
  dependencies: AdminShardRefundDependencies = productionDependencies,
) {
  if (!hasVerifiedCallablePermission(auth, 'money.read')) {
    throw new HttpsError('permission-denied', 'money.read permission required');
  }
  const input = parseRequest(data);
  const untilMs = dependencies.now();
  if (!Number.isSafeInteger(untilMs) || untilMs <= 0) {
    throw new HttpsError('internal', 'Server clock is unavailable');
  }
  const sinceMs = untilMs - input.rangeDays * DAY_MS;
  const rawRows = await dependencies.loadRows(sinceMs, untilMs, input.cap + 1);
  const truncated = rawRows.length > input.cap;
  const visibleRows = rawRows.slice(0, input.cap);
  const validRows = visibleRows.filter((row) => validRefundRow(row, sinceMs, untilMs));
  const droppedCount = visibleRows.length - validRows.length;
  const countsByBuyer = new Map<string, number>();
  for (const row of validRows) {
    const key = internalBuyerKey(row);
    if (key) countsByBuyer.set(key, (countsByBuyer.get(key) ?? 0) + 1);
  }
  const partial = truncated || droppedCount > 0;
  const rows: AdminShardRefundRow[] = validRows.map((row, index) => {
    const buyerRefundCount = countsByBuyer.get(internalBuyerKey(row)) ?? 1;
    return {
      rowKey: `shard-refund-${index + 1}`,
      productId: boundedText(row.productId, 100, 'shards'),
      requestedDebit: Number(row.requestedDebit ?? row.grantedShards ?? 0),
      eventTimestampMs: Number(row.eventTimestampMs),
      reason: boundedText(row.reason, 80, 'store refund'),
      serial: partial ? null : buyerRefundCount >= 2,
      buyerRefundCount: partial ? null : buyerRefundCount,
    };
  });
  return {
    ok: true as const,
    source: 'revenuecat_shard_refunds' as const,
    rangeSinceMs: sinceMs,
    rangeUntilMs: untilMs,
    rows,
    sourceHealth: {
      state: partial ? 'partial' as const : 'ready' as const,
      complete: !partial,
      truncated,
      droppedCount,
      count: rows.length,
    },
  };
}

export const adminListShardRefunds = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => adminListShardRefundsHandler(request.data, request.auth),
);
