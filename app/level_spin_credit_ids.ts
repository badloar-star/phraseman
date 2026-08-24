const LOCAL_SPIN_NON_LEVEL_SOURCE = '(?:dev|lesson|session|arena_ranked)_[A-Za-z0-9_-]{1,96}';

const LOCAL_SPIN_CREDIT_ID_RE = new RegExp(
  `^local_spin_(?:v1_\\d{3}|${LOCAL_SPIN_NON_LEVEL_SOURCE})$`,
);
const LOCAL_SPIN_RECEIPT_CREDIT_ID_RE = new RegExp(
  `^(?:level_spin_v1_\\d{3}|local_spin_${LOCAL_SPIN_NON_LEVEL_SOURCE})$`,
);

/** IDs persisted in the device-owned credit queue and idempotency set. */
export function isLocalSpinCreditId(value: unknown): value is string {
  return typeof value === 'string' && LOCAL_SPIN_CREDIT_ID_RE.test(value);
}

/** IDs allowed in claim receipts, including the canonical level-v1 spelling. */
export function isLocalSpinReceiptCreditId(value: unknown): value is string {
  return typeof value === 'string' && LOCAL_SPIN_RECEIPT_CREDIT_ID_RE.test(value);
}
