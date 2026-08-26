// зачем 'chest' (владелец, 2026-08-26): сундук лиги стал выдавать спин вместо
// фиктивной жемчужины (grantLocalChestSpin). Префикс ОБЯЗАН быть здесь: фильтр
// загрузки стирает неизвестные ключи, и без записи в этом списке кредит сундука
// пропадал бы при каждом перезапуске вместе с защитой от дубля — тот самый
// класс бага из инцидента 2026-08-23 (session_/arena_ranked_ выдавали спин
// повторно). Ключ длиннее прочих: в нём id клейма + id дропа + индекс.
const LOCAL_SPIN_NON_LEVEL_SOURCE = '(?:dev|lesson|session|arena_ranked|chest)_[A-Za-z0-9_-]{1,128}';

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
