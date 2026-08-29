/** Legacy global v1 receipt left by the former durable DEV grant. */
export const CUSTOMIZATION_DEV_GRANT_RECEIPT_KEY = 'customization_dev_unlock_all_v1';
const LEGACY_OPERATION_ID = 'dev:customization:avatar100-and-all-auras:v1';

type LegacyReceipt = Readonly<{
  v: 1;
  operationId: typeof LEGACY_OPERATION_ID;
  state: 'pending' | 'committed';
  avatarIds: readonly string[];
  auraIds: readonly string[];
}>;

export type LegacyCustomizationDevCleanupOutcome =
  | Readonly<{
      status: 'none';
      removedAvatarIds: readonly string[];
      removedAuraIds: readonly string[];
    }>
  | Readonly<{
      status: 'invalid-preserved';
      removedAvatarIds: readonly string[];
      removedAuraIds: readonly string[];
      reason: 'invalid_legacy_receipt';
    }>
  | Readonly<{
      status: 'preserved-unknown';
      receiptState: 'pending' | 'committed';
      removedAvatarIds: readonly string[];
      removedAuraIds: readonly string[];
      preservedAvatarIds: readonly string[];
      preservedAuraIds: readonly string[];
      reason: 'missing_dev_exclusive_provenance';
    }>;

type LegacyReceiptStorage = Readonly<{
  getItem: (key: string) => Promise<string | null>;
}>;

const EMPTY_IDS = Object.freeze([]) as readonly string[];

function exactIds(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) return null;
  return Object.freeze(Array.from(new Set(value)));
}

function parseLegacyReceipt(raw: string): LegacyReceipt | null {
  let candidate: unknown;
  try { candidate = JSON.parse(raw) as unknown; } catch { return null; }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const value = candidate as Record<string, unknown>;
  const avatarIds = exactIds(value.avatarIds);
  const auraIds = exactIds(value.auraIds);
  if (value.v !== 1
    || value.operationId !== LEGACY_OPERATION_ID
    || (value.state !== 'pending' && value.state !== 'committed')
    || !avatarIds
    || !auraIds) return null;
  return Object.freeze({
    v: 1,
    operationId: LEGACY_OPERATION_ID,
    state: value.state,
    avatarIds,
    auraIds,
  });
}

/**
 * Read-only by construction. The legacy receipt is evidence that DEV once
 * touched an id, but it cannot prove that a later purchase/reward did not grant
 * the same id. Without DEV-exclusive provenance, deletion would revoke real
 * access, so every unknown item is preserved fail-closed.
 */
export async function inspectLegacyCustomizationDevGrant(
  storage: LegacyReceiptStorage,
): Promise<LegacyCustomizationDevCleanupOutcome> {
  const raw = await storage.getItem(CUSTOMIZATION_DEV_GRANT_RECEIPT_KEY);
  if (raw === null || raw.trim() === '') {
    return Object.freeze({
      status: 'none',
      removedAvatarIds: EMPTY_IDS,
      removedAuraIds: EMPTY_IDS,
    });
  }
  const receipt = parseLegacyReceipt(raw);
  if (!receipt) {
    return Object.freeze({
      status: 'invalid-preserved',
      removedAvatarIds: EMPTY_IDS,
      removedAuraIds: EMPTY_IDS,
      reason: 'invalid_legacy_receipt',
    });
  }
  return Object.freeze({
    status: 'preserved-unknown',
    receiptState: receipt.state,
    removedAvatarIds: EMPTY_IDS,
    removedAuraIds: EMPTY_IDS,
    preservedAvatarIds: receipt.avatarIds,
    preservedAuraIds: receipt.auraIds,
    reason: 'missing_dev_exclusive_provenance',
  });
}
