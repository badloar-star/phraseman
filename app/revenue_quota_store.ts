import {
  commitPhoneStatePracticeReceipt,
  readPhoneStatePracticeFactProjection,
} from './phone_state_practice_bridge';

export const FLASHCARD_TRAINING_QUOTA_PREFIX = 'revenue_quota:v1:flashcard_training_starts:';

export type FlashcardTrainingQuotaMode = 'swipe' | 'blitz' | 'recall' | 'speaking';

export type RevenueQuotaReceipt = Readonly<{
  schemaVersion: 'revenue-quota.v1';
  quota: 'flashcard_training_starts';
  lineage: number;
  period: string;
  timeZone: string;
  resetAt: number;
  observedAtMs: number;
  receiptId: string;
  mode: FlashcardTrainingQuotaMode;
}>;

export type RevenueQuotaReceiptRead =
  | Readonly<{ status: 'unavailable' }>
  | Readonly<{ status: 'stale_account' }>
  | Readonly<{
      status: 'available';
      stableUid: string;
      lineage: number;
      receipts: readonly RevenueQuotaReceipt[];
    }>;

export type RevenueQuotaReceiptCommit =
  | Readonly<{ status: 'committed'; duplicate: boolean }>
  | Readonly<{ status: 'unavailable' | 'stale_account' | 'failed' }>;

const MODES = new Set<FlashcardTrainingQuotaMode>(['swipe', 'blitz', 'recall', 'speaking']);

function isReceipt(value: unknown, lineage: number): value is RevenueQuotaReceipt {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<RevenueQuotaReceipt>;
  return item.schemaVersion === 'revenue-quota.v1'
    && item.quota === 'flashcard_training_starts'
    && item.lineage === lineage
    && Number.isSafeInteger(item.lineage) && (item.lineage as number) >= 1
    && typeof item.period === 'string' && item.period.length > 0
    && typeof item.timeZone === 'string' && item.timeZone.length > 0
    && Number.isFinite(item.resetAt) && (item.resetAt as number) > 0
    && Number.isFinite(item.observedAtMs) && (item.observedAtMs as number) >= 0
    && typeof item.receiptId === 'string' && item.receiptId.trim().length > 0
    && typeof item.mode === 'string' && MODES.has(item.mode as FlashcardTrainingQuotaMode);
}

export async function readFlashcardTrainingQuotaReceipts(
  expectedStableUid: string,
): Promise<RevenueQuotaReceiptRead> {
  const projection = await readPhoneStatePracticeFactProjection('attempt', expectedStableUid);
  if (projection.status !== 'available') return projection;
  const receipts = Object.entries(projection.facts)
    .filter(([entityId, value]) => entityId.startsWith(`${FLASHCARD_TRAINING_QUOTA_PREFIX}${projection.lineage}:`)
      && isReceipt(value, projection.lineage))
    .map(([, value]) => value as RevenueQuotaReceipt);
  return Object.freeze({
    status: 'available',
    stableUid: projection.stableUid,
    lineage: projection.lineage,
    receipts: Object.freeze(receipts),
  });
}

export async function commitFlashcardTrainingQuotaReceipt(
  expectedStableUid: string,
  receipt: RevenueQuotaReceipt,
): Promise<RevenueQuotaReceiptCommit> {
  if (!isReceipt(receipt, receipt.lineage)) return Object.freeze({ status: 'failed' });
  const entityId = `${FLASHCARD_TRAINING_QUOTA_PREFIX}${receipt.lineage}:${receipt.receiptId}`;
  return commitPhoneStatePracticeReceipt(
    'attempt',
    entityId,
    receipt,
    entityId,
    expectedStableUid,
    receipt.lineage,
  );
}

export default function __RouteShim() {
  return null;
}
