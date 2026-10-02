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
/**
 * зачем (трасса «Дизайна», слабый профиль, 02.10): SHA-256 одного и того же uid считался дважды
 * подряд (lineage, затем ключ) — 1,2–2,5 с каждый раз в очереди нативных модулей на старте.
 * Отпечаток uid — не секрет (он и так в имени файла базы), кэшируем в памяти процесса.
 */
const digestCache = new Map<string, Promise<string>>();
/**
 * зачем (та же трасса): ключ читается из SecureStore/Keystore 1–1,5 с; прогрев параллельно с
 * чтением флага целостности + короткое удержание в памяти (30 с) дают открытию уже прочитанный
 * ключ вместо второго похода в Keystore. Удаление аккаунта сбрасывает запись немедленно.
 */
const RESOLVED_CREDENTIALS_TTL_MS = 30_000;
const resolvedCredentials = new Map<string, Readonly<{ value: PhoneStateCredentials; expiresAt: number }>>();

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

/** Только для тестов: сбросить кэши процесса (отпечатки uid и прочитанные ключи). */
export function resetPhoneStateSecretCachesForTests(): void {
  digestCache.clear();
  resolvedCredentials.clear();
}

export async function digestStableUid(stableUid: string): Promise<string> {
  const cached = digestCache.get(stableUid);
  if (cached) return cached;
  const pending = computeDigest(stableUid);
  digestCache.set(stableUid, pending);
  pending.catch((error: unknown) => {
    digestCache.delete(stableUid);
    console.warn('[PHONE-STATE-DB] key:digest_failed — кэш сброшен', error instanceof Error ? error.message : String(error));
  });
  return pending;
}

async function computeDigest(stableUid: string): Promise<string> {
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

/**
 * Временная трасса (координатор, надзор 06:11Z, 02.10): на слабом профиле между db_open:start и
 * open:in терялось ~4 с. Кандидаты — хэш uid, чтение ключа из SecureStore/Keystore, создание ключа.
 * Каждая строка: шаг, мс шага, мс от старта процесса. Убрать после диагноза.
 */
function keyTrace(step: string, startedAt: number, extra = ''): void {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  const proc = typeof perf?.now === 'function' ? Math.round(perf.now()) : -1;
  console.log(`[PHONE-STATE-DB] key:${step} ${Date.now() - startedAt}мс proc=${proc}ms${extra ? ` ${extra}` : ''}`);
}

async function createCredentials(scope: PhoneStateScope): Promise<PhoneStateCredentials> {
  const digestStartedAt = Date.now();
  const accountHash = await digestStableUid(scope.stableUid);
  keyTrace('digest', digestStartedAt);
  const secureKey = `phone_state_key_v1_${accountHash}_${scope.accountGeneration}`;
  const readStartedAt = Date.now();
  const storedKey = await SecureStore.getItemAsync(secureKey, secureOptions());
  keyTrace('secure_store_read', readStartedAt, `found=${storedKey !== null}`);

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

  const createStartedAt = Date.now();
  const keyHex = bytesToHex(await Crypto.getRandomBytesAsync(32));
  await SecureStore.setItemAsync(secureKey, keyHex, secureOptions());
  keyTrace('created_and_stored', createStartedAt);
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
  const resolved = resolvedCredentials.get(scopeKey);
  if (resolved && resolved.expiresAt > Date.now()) {
    console.log('[PHONE-STATE-DB] key:credentials_from_memory');
    return resolved.value;
  }
  resolvedCredentials.delete(scopeKey);
  const existing = inFlightCredentials.get(scopeKey);
  if (existing) {
    return existing;
  }

  const pending = createCredentials(scope);
  inFlightCredentials.set(scopeKey, pending);
  void pending.then((value) => {
    resolvedCredentials.set(scopeKey, Object.freeze({ value, expiresAt: Date.now() + RESOLVED_CREDENTIALS_TTL_MS }));
  }, () => undefined /* причину пишет вызывающий: этот then только кладёт успех в память */);
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
    const lineageStartedAt = Date.now();
    const accountHash = await digestStableUid(normalized);
    const lineageKey = phoneStateLineageKey(accountHash);
    const raw = await SecureStore.getItemAsync(lineageKey, secureOptions());
    keyTrace('lineage_read', lineageStartedAt, `found=${raw !== null}`);
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
    resolvedCredentials.delete(JSON.stringify([normalized, current]));
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
