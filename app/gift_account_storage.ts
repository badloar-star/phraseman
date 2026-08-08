import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';

const safeStableUid = (value: string): string =>
  value.trim().replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 180);

type LegacyOwnerRecord = {
  ownerUid: string;
  claimedAtMs: number;
  version: 1;
};

let legacyMigrationSerial: Promise<unknown> = Promise.resolve();

const serializeLegacyMigration = async <T>(fn: () => Promise<T>): Promise<T> => {
  const next = legacyMigrationSerial.then(fn, fn);
  legacyMigrationSerial = next.catch(() => undefined);
  return next;
};

export const giftAccountLegacyOwnerKey = (baseKey: string): string =>
  `${baseKey}::legacy-owner-v1`;

export function giftAccountStorageKey(
  baseKey: string,
  token: AccountGenerationToken = captureAccountGeneration(),
): string | null {
  if (token.phase !== 'active' || !token.stableId) return null;
  return `${baseKey}::uid:${safeStableUid(token.stableId)}`;
}

function requireCurrentGiftAccount(
  baseKey: string,
  token: AccountGenerationToken,
): string {
  const key = giftAccountStorageKey(baseKey, token);
  if (!key || !isCurrentAccountGeneration(token, token.stableId)) {
    throw new Error('gift_account_storage_identity_changed');
  }
  return key;
}

function parseLegacyOwner(raw: string | null): LegacyOwnerRecord | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LegacyOwnerRecord>;
    const ownerUid = typeof parsed.ownerUid === 'string' ? parsed.ownerUid.trim() : '';
    if (!ownerUid || parsed.version !== 1) throw new Error('invalid owner');
    return {
      ownerUid,
      claimedAtMs: Math.max(0, Math.trunc(Number(parsed.claimedAtMs) || 0)),
      version: 1,
    };
  } catch {
    throw new Error('gift_account_legacy_owner_invalid');
  }
}

async function requireOrClaimLegacyOwner(
  baseKey: string,
  token: AccountGenerationToken,
): Promise<boolean> {
  requireCurrentGiftAccount(baseKey, token);
  const stableId = token.stableId;
  if (!stableId) throw new Error('gift_account_storage_identity_changed');
  const ownerKey = giftAccountLegacyOwnerKey(baseKey);
  const existing = parseLegacyOwner(await AsyncStorage.getItem(ownerKey));
  if (!isCurrentAccountGeneration(token, stableId)) throw new Error('gift_account_storage_identity_changed');
  if (existing) return existing.ownerUid === stableId;
  const record: LegacyOwnerRecord = { ownerUid: stableId, claimedAtMs: Date.now(), version: 1 };
  const encoded = JSON.stringify(record);
  await AsyncStorage.setItem(ownerKey, encoded);
  if (!isCurrentAccountGeneration(token, stableId)) throw new Error('gift_account_storage_identity_changed');
  const verified = parseLegacyOwner(await AsyncStorage.getItem(ownerKey));
  if (!verified || verified.ownerUid !== stableId) throw new Error('gift_account_legacy_owner_not_durable');
  return true;
}

async function removeAndVerifyLegacyKeys(keys: readonly string[]): Promise<void> {
  await Promise.all(keys.map((key) => AsyncStorage.removeItem(key)));
  const remaining = await Promise.all(keys.map(async (key) => [key, await AsyncStorage.getItem(key)] as [string, string | null]));
  if (remaining.some(([, value]) => value !== null)) throw new Error('gift_account_legacy_remove_not_durable');
}

/** Reads the stable-UID slot and claims a legacy global value for this active UID once. */
export async function readGiftAccountValue(
  baseKey: string,
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<string | null> {
  return serializeLegacyMigration(async () => {
    const key = requireCurrentGiftAccount(baseKey, token);
    const scoped = await AsyncStorage.getItem(key);
    if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('gift_account_storage_identity_changed');
    if (scoped !== null) {
      const legacy = await AsyncStorage.getItem(baseKey);
      if (legacy !== null) {
        const owner = parseLegacyOwner(await AsyncStorage.getItem(giftAccountLegacyOwnerKey(baseKey)));
        if (owner?.ownerUid === token.stableId) await removeAndVerifyLegacyKeys([baseKey]);
      }
      if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('gift_account_storage_identity_changed');
      return scoped;
    }
    const legacy = await AsyncStorage.getItem(baseKey);
    if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('gift_account_storage_identity_changed');
    if (legacy === null) return null;
    if (!await requireOrClaimLegacyOwner(baseKey, token)) return null;
    const claimedLegacy = await AsyncStorage.getItem(baseKey);
    if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('gift_account_storage_identity_changed');
    if (claimedLegacy === null) return null;
    await AsyncStorage.setItem(key, claimedLegacy);
    if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('gift_account_storage_identity_changed');
    const verified = await AsyncStorage.getItem(key);
    if (verified !== claimedLegacy) throw new Error('gift_account_scoped_materialization_not_durable');
    await removeAndVerifyLegacyKeys([baseKey]);
    return claimedLegacy;
  });
}

/** Claims a set of historical keys for one stable UID before the caller materializes them. */
export async function readClaimedGiftLegacyValues(
  baseKey: string,
  legacyKeys: readonly string[],
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<Array<[string, string]>> {
  return serializeLegacyMigration(async () => {
    requireCurrentGiftAccount(baseKey, token);
    const pairs = await Promise.all(legacyKeys.map(async (key) => [key, await AsyncStorage.getItem(key)] as [string, string | null]));
    if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('gift_account_storage_identity_changed');
    const present = pairs.filter((pair): pair is [string, string] => pair[1] !== null);
    if (!present.length) return [];
    if (!await requireOrClaimLegacyOwner(baseKey, token)) return [];
    return present;
  });
}

/** Removes claimed historical keys only after the scoped inventory is readable. */
export async function finalizeClaimedGiftLegacyValues(
  baseKey: string,
  legacyKeys: readonly string[],
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<void> {
  await serializeLegacyMigration(async () => {
    const scopedKey = requireCurrentGiftAccount(baseKey, token);
    const owner = parseLegacyOwner(await AsyncStorage.getItem(giftAccountLegacyOwnerKey(baseKey)));
    if (!owner || owner.ownerUid !== token.stableId) throw new Error('gift_account_legacy_owner_mismatch');
    if (await AsyncStorage.getItem(scopedKey) === null) throw new Error('gift_account_scoped_materialization_missing');
    if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('gift_account_storage_identity_changed');
    await removeAndVerifyLegacyKeys(legacyKeys);
  });
}

export async function writeGiftAccountValue(
  baseKey: string,
  value: string,
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<void> {
  const key = requireCurrentGiftAccount(baseKey, token);
  await AsyncStorage.setItem(key, value);
  if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('gift_account_storage_identity_changed');
  if (await AsyncStorage.getItem(key) !== value) throw new Error('gift_account_scoped_write_not_durable');
}

export async function removeGiftAccountValue(
  baseKey: string,
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<void> {
  const key = requireCurrentGiftAccount(baseKey, token);
  await AsyncStorage.removeItem(key);
  if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('gift_account_storage_identity_changed');
}

export function requireGiftAccountStorageKey(
  baseKey: string,
  token: AccountGenerationToken,
): string {
  return requireCurrentGiftAccount(baseKey, token);
}
