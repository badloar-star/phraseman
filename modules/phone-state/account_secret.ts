import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const SECURE_STORE_SERVICE = 'phraseman.phone_state.sqlcipher.v1';
// Expo SecureStore accepts only alphanumeric characters plus `.`, `-`, `_`.
// A colon here made every lineage read/rotation throw on real iOS devices,
// which in turn blocked account deletion before the local privacy wipe.
const PHONE_STATE_LINEAGE_KEY_PREFIX = 'phone_state_lineage_v1_';
const KEY_HEX_PATTERN = /^[a-f0-9]{64}$/;
const inFlightCredentials = new Map<string, Promise<PhoneStateCredentials>>();
const inFlightLineages = new Map<string, Promise<number>>();
const inFlightLineageRetirements = new Map<string, Promise<number>>();

export type PhoneStateScope = Readonly<{
  stableUid: string;
  // Persistent account lineage; never the transient runtime race counter.
  accountGeneration: number;
}>;

export type PhoneStateCredentials = Readonly<{
  databaseName: string;
  keyHex: string;
  secureKey: string;
}>;

function assertValidScope(scope: PhoneStateScope): void {
  if (
    typeof scope?.stableUid !== 'string'
    || scope.stableUid.trim().length === 0
    || !Number.isSafeInteger(scope.accountGeneration)
    || scope.accountGeneration < 1
  ) {
    throw new Error('phone_state_scope_invalid');
  }
}

function parseLineage(raw: string | null): number | null {
  if (raw === null || !/^[1-9]\d*$/.test(raw)) return null;
  const lineage = Number(raw);
  return Number.isSafeInteger(lineage) && lineage > 0 ? lineage : null;
}

function secureOptions(): SecureStore.SecureStoreOptions {
  return {
    keychainService: SECURE_STORE_SERVICE,
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  };
}

function phoneStateLineageKey(accountHash: string): string {
  if (!KEY_HEX_PATTERN.test(accountHash)) throw new Error('phone_state_scope_invalid');
  return `${PHONE_STATE_LINEAGE_KEY_PREFIX}${accountHash}`;
}

export async function digestStableUid(stableUid: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    stableUid,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  if (!KEY_HEX_PATTERN.test(digest)) {
    throw new Error('phone_state_scope_invalid');
  }
  return digest;
}

export function bytesToHex(bytes: Uint8Array): string {
  if (bytes.length !== 32) {
    throw new Error('phone_state_key_invalid');
  }
  const keyHex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  if (!KEY_HEX_PATTERN.test(keyHex)) {
    throw new Error('phone_state_key_invalid');
  }
  return keyHex;
}

async function createCredentials(scope: PhoneStateScope): Promise<PhoneStateCredentials> {
  const accountHash = await digestStableUid(scope.stableUid);
  const secureKey = `phone_state_key_v1_${accountHash}_${scope.accountGeneration}`;
  const storedKey = await SecureStore.getItemAsync(secureKey, secureOptions());

  if (storedKey !== null) {
    if (!KEY_HEX_PATTERN.test(storedKey)) {
      throw new Error('phone_state_key_invalid');
    }
    return {
      databaseName: `phone-state-v1-${accountHash.slice(0, 32)}-${scope.accountGeneration}.db`,
      keyHex: storedKey,
      secureKey,
    };
  }

  const keyHex = bytesToHex(await Crypto.getRandomBytesAsync(32));
  await SecureStore.setItemAsync(secureKey, keyHex, secureOptions());
  return {
    databaseName: `phone-state-v1-${accountHash.slice(0, 32)}-${scope.accountGeneration}.db`,
    keyHex,
    secureKey,
  };
}

export async function materializePhoneStateCredentials(
  scope: PhoneStateScope,
): Promise<PhoneStateCredentials> {
  assertValidScope(scope);
  const scopeKey = JSON.stringify([scope.stableUid, scope.accountGeneration]);
  const existing = inFlightCredentials.get(scopeKey);
  if (existing) {
    return existing;
  }

  const pending = createCredentials(scope);
  inFlightCredentials.set(scopeKey, pending);
  const clearPending = (): void => {
    if (inFlightCredentials.get(scopeKey) === pending) {
      inFlightCredentials.delete(scopeKey);
    }
  };
  void pending.then(clearPending, clearPending);
  return pending;
}

export async function materializePhoneStateLineage(stableUid: string): Promise<number> {
  const normalized = stableUid.trim();
  if (!normalized) throw new Error('phone_state_lineage_invalid');
  const existing = inFlightLineages.get(normalized);
  if (existing) return existing;

  const pending = (async () => {
    const accountHash = await digestStableUid(normalized);
    const lineageKey = phoneStateLineageKey(accountHash);
    const raw = await SecureStore.getItemAsync(lineageKey, secureOptions());
    if (raw !== null) {
      const lineage = parseLineage(raw);
      if (lineage === null) throw new Error('phone_state_lineage_invalid');
      return lineage;
    }
    await SecureStore.setItemAsync(lineageKey, '1', secureOptions());
    return 1;
  })();
  inFlightLineages.set(normalized, pending);
  const clear = (): void => {
    if (inFlightLineages.get(normalized) === pending) inFlightLineages.delete(normalized);
  };
  void pending.then(clear, clear);
  return pending;
}

/**
 * Rotates the durable lineage only after an irreversible identity deletion.
 * The new lineage is persisted before the old SQLCipher key is discarded, so
 * a crash cannot reopen the deleted database under a freshly generated key.
 */
export async function retirePhoneStateLineageAfterDeletion(stableUid: string): Promise<number> {
  const normalized = stableUid.trim();
  if (!normalized) throw new Error('phone_state_lineage_invalid');
  const existing = inFlightLineageRetirements.get(normalized);
  if (existing) return existing;

  const pending = (async () => {
    const accountHash = await digestStableUid(normalized);
    const lineageKey = phoneStateLineageKey(accountHash);
    const raw = await SecureStore.getItemAsync(lineageKey, secureOptions());
    const current = raw === null ? 1 : parseLineage(raw);
    if (current === null || current >= Number.MAX_SAFE_INTEGER) {
      throw new Error('phone_state_lineage_invalid');
    }
    const next = current + 1;
    await SecureStore.setItemAsync(lineageKey, String(next), secureOptions());
    await SecureStore.deleteItemAsync(
      `phone_state_key_v1_${accountHash}_${current}`,
      secureOptions(),
    );
    inFlightCredentials.delete(JSON.stringify([normalized, current]));
    inFlightLineages.delete(normalized);
    return next;
  })();
  inFlightLineageRetirements.set(normalized, pending);
  const clear = (): void => {
    if (inFlightLineageRetirements.get(normalized) === pending) {
      inFlightLineageRetirements.delete(normalized);
    }
  };
  void pending.then(clear, clear);
  return pending;
}
