/*
 * Account V2, Пакет 6B (TG-F76EA3701B55) — ключ удаления V2 на телефоне.
 *
 * зачем: решение владельца 13 — ключ даёт право узнать этап удаления и
 * «дотолкнуть» стирание; данных аккаунта не открывает. Сервер (6A,
 * functions/src/accounts_v2_deletion/receipt.ts → isStrongCapability) принимает
 * ТОЛЬКО каноническую base64url-запись ровно 32 случайных байт (43 знака, без
 * паддинга) и ≥ 12 различных байтов; старый hex-ключ (auth_provider) не подходит.
 * operationId — 16..220 знаков без «/» и пробелов по краям.
 *
 * Ключ хранится только в SecureStore (порт); в логах — только коды.
 * Переустановка / потеря ключа: ничего не показываем (решение владельца 15).
 */

const LOG = '[ACCOUNT-V2]';

export const ACCOUNTS_V2_DELETION_CREDENTIAL_KEY = 'accounts_v2_deletion_credential_v1';
const CAPABILITY_BYTES = 32;
const OPERATION_ID_BYTES = 18;
const OPERATION_ID_PREFIX = 'acv2del_';
const CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CAPABILITY_MIN_DISTINCT_BYTES = 12;
const MAX_GENERATION_TRIES = 3;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export type AccountsV2DeletionCredential = Readonly<{ operationId: string; capability: string }>;

export type AccountsV2SecureStorePort = Readonly<{
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}>;

export type AccountsV2RandomBytes = (count: number) => Uint8Array | Promise<Uint8Array>;

/** base64url без паддинга (RFC 4648 §5). */
export function encodeBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += ALPHABET[(triple >> 18) & 63] + ALPHABET[(triple >> 12) & 63];
    if (index + 1 < bytes.length) out += ALPHABET[(triple >> 6) & 63];
    if (index + 2 < bytes.length) out += ALPHABET[triple & 63];
  }
  return out;
}

function decodeBase64Url(text: string): Uint8Array | null {
  const values: number[] = [];
  for (const char of text) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) return null;
    values.push(value);
  }
  const bytes: number[] = [];
  for (let index = 0; index < values.length; index += 4) {
    const chunk = values.slice(index, index + 4);
    if (chunk.length === 1) return null;
    const bits = chunk.reduce((acc, value, position) => acc | (value << (18 - position * 6)), 0);
    bytes.push((bits >> 16) & 255);
    if (chunk.length > 2) bytes.push((bits >> 8) & 255);
    if (chunk.length > 3) bytes.push(bits & 255);
  }
  return Uint8Array.from(bytes);
}

/** Копия серверного isStrongCapability (канон, 32 байта, ≥ 12 различных байтов). */
export function isStrongAccountsV2Capability(capability: unknown): boolean {
  if (typeof capability !== 'string' || !CAPABILITY_PATTERN.test(capability)) return false;
  const bytes = decodeBase64Url(capability);
  if (bytes === null || bytes.length !== CAPABILITY_BYTES || encodeBase64Url(bytes) !== capability) return false;
  return new Set(bytes).size >= CAPABILITY_MIN_DISTINCT_BYTES;
}

export function isValidAccountsV2DeletionOperationId(operationId: unknown): boolean {
  return typeof operationId === 'string' && operationId.length >= 16 && operationId.length <= 220
    && !operationId.includes('/') && operationId.trim() === operationId;
}

async function exactBytes(randomBytes: AccountsV2RandomBytes, count: number): Promise<Uint8Array | null> {
  const bytes = await randomBytes(count);
  return bytes instanceof Uint8Array && bytes.length === count ? bytes : null;
}

/**
 * Новый ключ удаления. randomBytes — крипто-стойкий источник (expo-crypto).
 * Слабый набор (почти невозможно у настоящего ГСЧ) — повтор; неудача — отказ с кодом.
 */
export async function createAccountsV2DeletionCredential(
  randomBytes: AccountsV2RandomBytes,
): Promise<AccountsV2DeletionCredential> {
  for (let attempt = 1; attempt <= MAX_GENERATION_TRIES; attempt += 1) {
    const capabilityBytes = await exactBytes(randomBytes, CAPABILITY_BYTES);
    const operationBytes = await exactBytes(randomBytes, OPERATION_ID_BYTES);
    if (capabilityBytes === null || operationBytes === null) {
      console.warn(`${LOG} credential random_invalid attempt=${attempt}`);
      continue;
    }
    const capability = encodeBase64Url(capabilityBytes);
    const operationId = `${OPERATION_ID_PREFIX}${encodeBase64Url(operationBytes)}`;
    if (isStrongAccountsV2Capability(capability) && isValidAccountsV2DeletionOperationId(operationId)) {
      return Object.freeze({ operationId, capability });
    }
    console.warn(`${LOG} credential weak attempt=${attempt}`);
  }
  throw new Error('accounts_v2_credential_generation_failed');
}

/** Пишет ключ в SecureStore и сверяет чтением. false — не сохранён (в лог — код). */
export async function persistAccountsV2DeletionCredential(
  store: AccountsV2SecureStorePort,
  credential: AccountsV2DeletionCredential,
): Promise<boolean> {
  const raw = JSON.stringify({ v: 1, operationId: credential.operationId, capability: credential.capability });
  try {
    await store.setItemAsync(ACCOUNTS_V2_DELETION_CREDENTIAL_KEY, raw);
    const readBack = await store.getItemAsync(ACCOUNTS_V2_DELETION_CREDENTIAL_KEY);
    if (readBack === raw) return true;
    console.warn(`${LOG} credential persist_mismatch`);
    return false;
  } catch (error) {
    console.warn(`${LOG} credential persist_failed kind=${error instanceof Error ? error.name : typeof error}`);
    return false;
  }
}

/** Сохранённый ключ (для повторной отправки/статуса); битая запись — null с логом. */
export async function readAccountsV2DeletionCredential(
  store: AccountsV2SecureStorePort,
): Promise<AccountsV2DeletionCredential | null> {
  let raw: string | null;
  try {
    raw = await store.getItemAsync(ACCOUNTS_V2_DELETION_CREDENTIAL_KEY);
  } catch (error) {
    console.warn(`${LOG} credential read_failed kind=${error instanceof Error ? error.name : typeof error}`);
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as { v?: unknown; operationId?: unknown; capability?: unknown };
    if (parsed.v === 1 && isValidAccountsV2DeletionOperationId(parsed.operationId)
      && isStrongAccountsV2Capability(parsed.capability)) {
      return Object.freeze({ operationId: parsed.operationId as string, capability: parsed.capability as string });
    }
  } catch (error) {
    console.warn(`${LOG} credential parse_failed kind=${error instanceof Error ? error.name : typeof error}`);
    return null;
  }
  console.warn(`${LOG} credential stored_invalid`);
  return null;
}
