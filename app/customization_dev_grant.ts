import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AVATAR_AURA_OWNED_KEY,
  CUSTOM_AVATAR_OWNED_KEY,
} from '../constants/customization_storage_keys';
import { setDevAllCustomizationAccessActive } from '../constants/customization_dev_access';
import {
  captureAccountGeneration,
  isCapturedAccountGenerationToken,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { DebugLogger } from './debug-logger';

/** Legacy global v1 key. New overlay state must never be written here. */
export const CUSTOMIZATION_DEV_GRANT_RECEIPT_KEY = 'customization_dev_unlock_all_v1';
export const CUSTOMIZATION_DEV_OVERLAY_RECEIPT_PREFIX = 'customization_dev_overlay_v2:';
const LEGACY_OPERATION_ID = 'dev:customization:avatar100-and-all-auras:v1';

type DevOverlayState = 'enabled' | 'restore-pending' | 'disabled' | 'legacy-cleaning';
type CustomizationTarget = 'avatar' | 'aura';

export type DevCustomizationSelection = Readonly<{
  avatarValue: string;
  storedAuraSelection: string | null;
  frameId: string;
  level: number;
}>;

export type DevCustomizationToggleContext = Readonly<{
  currentSelection: DevCustomizationSelection;
  /** Canonical safe level avatar + frame with no aura, used for legacy v1. */
  levelSelection: DevCustomizationSelection;
  restoreOperationId: string;
  /** Catalog entries unlocked only by the DEV overlay for this account. */
  overlayAvatarIds: readonly string[];
  overlayAuraIds: readonly string[];
  /** Runs the canonical selection/apply path while the account lock is held. */
  restoreSelection: (
    selection: DevCustomizationSelection,
    operationId: string,
    inheritedLease: AccountTransitionLockLease,
  ) => Promise<void>;
}>;

type LegacyReceipt = Readonly<{
  v: 1;
  operationId: typeof LEGACY_OPERATION_ID;
  state: 'pending' | 'committed';
  avatarIds: readonly string[];
  auraIds: readonly string[];
}>;

export type DevOverlayReceipt = Readonly<{
  v: 2;
  ownerStableId: string;
  state: DevOverlayState;
  baselineSelection: DevCustomizationSelection;
  restoreOperationId: string;
  suppressedAvatarIds: readonly string[];
  suppressedAuraIds: readonly string[];
}>;

export type DevGrantStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  multiGet: (keys: readonly string[]) => Promise<readonly (readonly [string, string | null])[]>;
  multiSet: (pairs: readonly (readonly [string, string])[]) => Promise<void>;
  multiRemove: (keys: readonly string[]) => Promise<void>;
};

export type DevCustomizationGrantOutcome = Readonly<{
  status: 'enabled' | 'disabled';
  active: boolean;
}>;

export function customizationDevOverlayReceiptKey(stableId: string): string {
  const owner = stableId.trim();
  if (!owner) throw new Error('customization_dev_account_mismatch');
  return `${CUSTOMIZATION_DEV_OVERLAY_RECEIPT_PREFIX}${encodeURIComponent(owner)}`;
}

function stringArray(value: unknown): readonly string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0)
    ? Array.from(new Set(value))
    : null;
}

function parseSelection(value: unknown): DevCustomizationSelection | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const parsed = value as Record<string, unknown>;
  const avatarValue = typeof parsed.avatarValue === 'string' ? parsed.avatarValue.trim() : '';
  const frameId = typeof parsed.frameId === 'string' ? parsed.frameId.trim() : '';
  const storedAuraSelection = parsed.storedAuraSelection === null
    ? null
    : typeof parsed.storedAuraSelection === 'string'
      ? parsed.storedAuraSelection.trim() || null
      : undefined;
  const rawLevel = Number(parsed.level);
  if (!Number.isFinite(rawLevel) || rawLevel < 1) return null;
  const level = Math.floor(rawLevel);
  if (!avatarValue || !frameId || storedAuraSelection === undefined) return null;
  return Object.freeze({ avatarValue, frameId, storedAuraSelection, level });
}

function parseLegacyReceipt(raw: string | null): LegacyReceipt | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const avatarIds = stringArray(parsed.avatarIds);
    const auraIds = stringArray(parsed.auraIds);
    if (
      parsed.v !== 1
      || parsed.operationId !== LEGACY_OPERATION_ID
      || (parsed.state !== 'pending' && parsed.state !== 'committed')
      || !avatarIds
      || !auraIds
    ) throw new Error('invalid');
    return {
      v: 1,
      operationId: LEGACY_OPERATION_ID,
      state: parsed.state,
      avatarIds,
      auraIds,
    };
  } catch {
    throw new Error('customization_dev_receipt_invalid');
  }
}

function parseOverlayReceipt(raw: string | null, ownerStableId: string): DevOverlayReceipt | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const suppressedAvatarIds = stringArray(parsed.suppressedAvatarIds);
    const suppressedAuraIds = stringArray(parsed.suppressedAuraIds);
    const baselineSelection = parseSelection(parsed.baselineSelection);
    const restoreOperationId = typeof parsed.restoreOperationId === 'string'
      ? parsed.restoreOperationId.trim()
      : '';
    if (
      parsed.v !== 2
      || parsed.ownerStableId !== ownerStableId
      || !['enabled', 'restore-pending', 'disabled', 'legacy-cleaning'].includes(String(parsed.state))
      || !baselineSelection
      || !restoreOperationId
      || !suppressedAvatarIds
      || !suppressedAuraIds
    ) throw new Error('invalid');
    return {
      v: 2,
      ownerStableId,
      state: parsed.state as DevOverlayState,
      baselineSelection,
      restoreOperationId,
      suppressedAvatarIds,
      suppressedAuraIds,
    };
  } catch {
    throw new Error('customization_dev_receipt_invalid');
  }
}

function serializeOverlayReceipt(receipt: DevOverlayReceipt): string {
  return JSON.stringify(receipt);
}

function assertCurrentAccount(token: AccountGenerationToken): string {
  const owner = token.stableId?.trim() ?? '';
  if (
    !owner
    || !isCapturedAccountGenerationToken(token)
    || !isCurrentAccountGeneration(token, owner)
  ) throw new Error('customization_dev_account_mismatch');
  return owner;
}

async function checkedGetItem(
  storage: Pick<DevGrantStorage, 'getItem'>,
  key: string,
  token: AccountGenerationToken,
): Promise<string | null> {
  assertCurrentAccount(token);
  const value = await storage.getItem(key);
  assertCurrentAccount(token);
  return value;
}

async function checkedMultiGet(
  storage: Pick<DevGrantStorage, 'multiGet'>,
  keys: readonly string[],
  token: AccountGenerationToken,
): Promise<ReadonlyMap<string, string | null>> {
  assertCurrentAccount(token);
  const values = new Map(await storage.multiGet(keys));
  assertCurrentAccount(token);
  return values;
}

async function checkedSetItem(
  storage: Pick<DevGrantStorage, 'setItem'>,
  key: string,
  value: string,
  token: AccountGenerationToken,
): Promise<void> {
  assertCurrentAccount(token);
  await storage.setItem(key, value);
  assertCurrentAccount(token);
}

async function checkedMultiSet(
  storage: Pick<DevGrantStorage, 'multiSet'>,
  pairs: readonly (readonly [string, string])[],
  token: AccountGenerationToken,
): Promise<void> {
  assertCurrentAccount(token);
  await storage.multiSet(pairs);
  assertCurrentAccount(token);
}

async function checkedMultiRemove(
  storage: Pick<DevGrantStorage, 'multiRemove'>,
  keys: readonly string[],
  token: AccountGenerationToken,
): Promise<void> {
  assertCurrentAccount(token);
  await storage.multiRemove(keys);
  assertCurrentAccount(token);
}

function exactOwnedRecord(raw: string | null): Record<string, unknown> {
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch (e) {
      // Fail closed below.
      DebugLogger.error('customization_dev_grant:exactOwnedRecord', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  throw new Error('customization_dev_legacy_ownership_invalid');
}

function removeIds(raw: string | null, ids: readonly string[]): string {
  const owned = exactOwnedRecord(raw);
  for (const id of ids) delete owned[id];
  return JSON.stringify(owned);
}

function assertLegacyOwnerEvidence(
  values: ReadonlyMap<string, string | null>,
  receipt: LegacyReceipt,
): void {
  const avatars = exactOwnedRecord(values.get(CUSTOM_AVATAR_OWNED_KEY) ?? null);
  const auras = exactOwnedRecord(values.get(AVATAR_AURA_OWNED_KEY) ?? null);
  if (
    receipt.avatarIds.some((id) => !(id in avatars))
    || receipt.auraIds.some((id) => !(id in auras))
  ) throw new Error('customization_dev_legacy_owner_mismatch');
}

async function readOverlayReceipt(
  storage: Pick<DevGrantStorage, 'getItem'>,
  token: AccountGenerationToken,
): Promise<DevOverlayReceipt | null> {
  const owner = assertCurrentAccount(token);
  return parseOverlayReceipt(
    await checkedGetItem(storage, customizationDevOverlayReceiptKey(owner), token),
    owner,
  );
}

function filterSuppressed(raw: string | null, suppressedIds: readonly string[]): string | null {
  if (raw === null || suppressedIds.length === 0) return raw;
  const owned = exactOwnedRecord(raw);
  for (const id of suppressedIds) delete owned[id];
  return JSON.stringify(owned);
}

function selectedAvatarId(value: string | null | undefined): string | null {
  const parts = String(value ?? '').split(':');
  return parts[0] === 'custom' && parts[1]?.trim() ? parts[1].trim() : null;
}

function isSuppressedAura(
  value: string | null | undefined,
  suppressedAuraIds: readonly string[],
): boolean {
  const id = String(value ?? '').trim();
  return id.length > 0 && suppressedAuraIds.includes(id);
}

function sanitizeSelectionProjection(
  data: Record<string, string | null>,
  receipt: DevOverlayReceipt,
): void {
  const avatarId = selectedAvatarId(data.user_avatar);
  if (avatarId && receipt.suppressedAvatarIds.includes(avatarId)) {
    data.user_avatar = receipt.baselineSelection.avatarValue;
    if ('user_frame' in data) data.user_frame = receipt.baselineSelection.frameId;
    if ('user_avatar_frame' in data) data.user_avatar_frame = receipt.baselineSelection.frameId;
  }
  if (isSuppressedAura(data.user_avatar_aura, receipt.suppressedAuraIds)) {
    data.user_avatar_aura = receipt.baselineSelection.storedAuraSelection ?? '';
  }
}

/** Device-local account-scoped suppression for legacy v1 cloud pollution. */
export async function sanitizeCustomizationDevOwnershipRecord(
  data: Record<string, string | null>,
  storage: Pick<DevGrantStorage, 'getItem'> = AsyncStorage,
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<void> {
  const receipt = await readOverlayReceipt(storage, token);
  if (!receipt) return;
  if (CUSTOM_AVATAR_OWNED_KEY in data) {
    data[CUSTOM_AVATAR_OWNED_KEY] = filterSuppressed(
      data[CUSTOM_AVATAR_OWNED_KEY], receipt.suppressedAvatarIds,
    );
  }
  if (AVATAR_AURA_OWNED_KEY in data) {
    data[AVATAR_AURA_OWNED_KEY] = filterSuppressed(
      data[AVATAR_AURA_OWNED_KEY], receipt.suppressedAuraIds,
    );
  }
  sanitizeSelectionProjection(data, receipt);
  assertCurrentAccount(token);
}

/** Included in the same composite localWrites as a legitimate purchase. */
export async function prepareCustomizationDevSuppressionRelease(
  storage: Pick<DevGrantStorage, 'getItem'>,
  token: AccountGenerationToken,
  target: CustomizationTarget,
  itemId: string,
): Promise<readonly [string, string] | null> {
  const owner = assertCurrentAccount(token);
  const receipt = await readOverlayReceipt(storage, token);
  if (!receipt) return null;
  const key = customizationDevOverlayReceiptKey(owner);
  const source = target === 'avatar' ? receipt.suppressedAvatarIds : receipt.suppressedAuraIds;
  if (!source.includes(itemId)) return null;
  const next: DevOverlayReceipt = target === 'avatar'
    ? { ...receipt, suppressedAvatarIds: source.filter((id) => id !== itemId) }
    : { ...receipt, suppressedAuraIds: source.filter((id) => id !== itemId) };
  assertCurrentAccount(token);
  return [key, serializeOverlayReceipt(next)];
}

export async function hasAllCustomizationDevGrant(
  storage: Pick<DevGrantStorage, 'getItem' | 'multiGet'> = AsyncStorage,
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<boolean> {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  setDevAllCustomizationAccessActive(false);
  const owner = assertCurrentAccount(token);
  const receipt = parseOverlayReceipt(
    await checkedGetItem(storage, customizationDevOverlayReceiptKey(owner), token),
    owner,
  );
  if (receipt) {
    const active = receipt.state === 'enabled' || receipt.state === 'restore-pending';
    setDevAllCustomizationAccessActive(active, owner);
    return active;
  }
  const legacy = parseLegacyReceipt(
    await checkedGetItem(storage, CUSTOMIZATION_DEV_GRANT_RECEIPT_KEY, token),
  );
  if (!legacy) return false;
  if (legacy.state === 'pending') throw new Error('customization_dev_legacy_pending');
  const values = await checkedMultiGet(
    storage,
    [CUSTOM_AVATAR_OWNED_KEY, AVATAR_AURA_OWNED_KEY],
    token,
  );
  assertLegacyOwnerEvidence(values, legacy);
  setDevAllCustomizationAccessActive(true, owner);
  return true;
}

function requireToggleContext(
  context: DevCustomizationToggleContext | undefined,
): DevCustomizationToggleContext {
  const selection = parseSelection(context?.currentSelection);
  const levelSelection = parseSelection(context?.levelSelection);
  const overlayAvatarIds = stringArray(context?.overlayAvatarIds);
  const overlayAuraIds = stringArray(context?.overlayAuraIds);
  if (!context || !selection || !levelSelection || !overlayAvatarIds || !overlayAuraIds
    || !context.restoreOperationId?.trim()
    || typeof context.restoreSelection !== 'function') {
    throw new Error('customization_dev_toggle_context_required');
  }
  return {
    ...context,
    currentSelection: selection,
    levelSelection,
    restoreOperationId: context.restoreOperationId.trim(),
    overlayAvatarIds,
    overlayAuraIds,
  };
}

function sanitizeLegacyBaseline(
  context: DevCustomizationToggleContext,
  legacy: LegacyReceipt,
): DevCustomizationSelection {
  const selection = context.currentSelection;
  const activeAvatarId = selectedAvatarId(selection.avatarValue);
  const legacyAvatarActive = activeAvatarId !== null && legacy.avatarIds.includes(activeAvatarId);
  const legacyAuraActive = isSuppressedAura(selection.storedAuraSelection, legacy.auraIds);
  if (!legacyAvatarActive && !legacyAuraActive) return selection;
  return context.levelSelection;
}

async function restoreAndDisable(
  storage: DevGrantStorage,
  token: AccountGenerationToken,
  receiptKey: string,
  receipt: DevOverlayReceipt,
  context: DevCustomizationToggleContext,
  lease: AccountTransitionLockLease,
): Promise<DevCustomizationGrantOutcome> {
  const pending = receipt.state === 'restore-pending'
    ? receipt
    : { ...receipt, state: 'restore-pending' as const };
  if (receipt.state !== 'restore-pending') {
    await checkedSetItem(storage, receiptKey, serializeOverlayReceipt(pending), token);
  }
  assertCurrentAccount(token);
  await context.restoreSelection(pending.baselineSelection, pending.restoreOperationId, lease);
  assertCurrentAccount(token);
  await checkedSetItem(
    storage,
    receiptKey,
    serializeOverlayReceipt({ ...pending, state: 'disabled' }),
    token,
  );
  return { status: 'disabled', active: false };
}

async function finishLegacyCleanup(
  storage: DevGrantStorage,
  token: AccountGenerationToken,
  receiptKey: string,
  receipt: DevOverlayReceipt,
  context: DevCustomizationToggleContext,
  lease: AccountTransitionLockLease,
): Promise<DevCustomizationGrantOutcome> {
  const values = await checkedMultiGet(
    storage,
    [CUSTOM_AVATAR_OWNED_KEY, AVATAR_AURA_OWNED_KEY],
    token,
  );
  await checkedMultiSet(storage, [
    [CUSTOM_AVATAR_OWNED_KEY, removeIds(
      values.get(CUSTOM_AVATAR_OWNED_KEY) ?? null,
      receipt.suppressedAvatarIds,
    )],
    [AVATAR_AURA_OWNED_KEY, removeIds(
      values.get(AVATAR_AURA_OWNED_KEY) ?? null,
      receipt.suppressedAuraIds,
    )],
  ], token);
  await checkedMultiRemove(storage, [CUSTOMIZATION_DEV_GRANT_RECEIPT_KEY], token);
  return restoreAndDisable(storage, token, receiptKey, receipt, context, lease);
}

/**
 * New DEV cycles are overlay-only. Only the one-time owner-authorized legacy
 * v1 migration may remove receipt-listed pollution from ownership maps.
 */
export async function toggleAllCustomizationForDev(
  storage: DevGrantStorage = AsyncStorage,
  token: AccountGenerationToken = captureAccountGeneration(),
  suppliedContext?: DevCustomizationToggleContext,
): Promise<DevCustomizationGrantOutcome> {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return { status: 'disabled', active: false };
  }
  setDevAllCustomizationAccessActive(false);
  const owner = assertCurrentAccount(token);
  const outcome = await withAccountTransitionLock(async (lease) => {
    assertCurrentAccount(token);
    const receiptKey = customizationDevOverlayReceiptKey(owner);
    const receipt = parseOverlayReceipt(
      await checkedGetItem(storage, receiptKey, token),
      owner,
    );
    if (receipt?.state === 'legacy-cleaning') {
      return finishLegacyCleanup(
        storage, token, receiptKey, receipt, requireToggleContext(suppliedContext), lease,
      );
    }
    if (receipt?.state === 'enabled' || receipt?.state === 'restore-pending') {
      return restoreAndDisable(
        storage, token, receiptKey, receipt, requireToggleContext(suppliedContext), lease,
      );
    }

    const legacy = parseLegacyReceipt(
      await checkedGetItem(storage, CUSTOMIZATION_DEV_GRANT_RECEIPT_KEY, token),
    );
    if (legacy) {
      if (legacy.state === 'pending') throw new Error('customization_dev_legacy_pending');
      const values = await checkedMultiGet(
        storage,
        [CUSTOM_AVATAR_OWNED_KEY, AVATAR_AURA_OWNED_KEY],
        token,
      );
      assertLegacyOwnerEvidence(values, legacy);
      const context = requireToggleContext(suppliedContext);
      const cleaning: DevOverlayReceipt = {
        v: 2,
        ownerStableId: owner,
        state: 'legacy-cleaning',
        baselineSelection: sanitizeLegacyBaseline(context, legacy),
        restoreOperationId: context.restoreOperationId,
        suppressedAvatarIds: legacy.avatarIds,
        suppressedAuraIds: legacy.auraIds,
      };
      await checkedSetItem(storage, receiptKey, serializeOverlayReceipt(cleaning), token);
      return finishLegacyCleanup(storage, token, receiptKey, cleaning, context, lease);
    }

    const context = requireToggleContext(suppliedContext);
    const values = await checkedMultiGet(
      storage,
      [CUSTOM_AVATAR_OWNED_KEY, AVATAR_AURA_OWNED_KEY],
      token,
    );
    const ownedAvatars = exactOwnedRecord(values.get(CUSTOM_AVATAR_OWNED_KEY) ?? null);
    const ownedAuras = exactOwnedRecord(values.get(AVATAR_AURA_OWNED_KEY) ?? null);
    const enabled: DevOverlayReceipt = {
      v: 2,
      ownerStableId: owner,
      state: 'enabled',
      baselineSelection: context.currentSelection,
      restoreOperationId: context.restoreOperationId,
      suppressedAvatarIds: context.overlayAvatarIds.filter((id) => !(id in ownedAvatars)),
      suppressedAuraIds: context.overlayAuraIds.filter((id) => !(id in ownedAuras)),
    };
    await checkedSetItem(storage, receiptKey, serializeOverlayReceipt(enabled), token);
    return { status: 'enabled', active: true } as const;
  });
  assertCurrentAccount(token);
  setDevAllCustomizationAccessActive(outcome.active, owner);
  return outcome;
}

/** @deprecated Kept for callers compiled against the v1 function name. */
export const grantAllCustomizationForDev = toggleAllCustomizationForDev;
