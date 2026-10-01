/*
 * Account V2, Пакет 8F (TG-766E45F4A75A, PM-235 T2) — версия клиента для V2-функций.
 *
 * зачем: сервер сравнивает её с `config/accounts_v2.minClientVersion` и ниже минимума отвечает
 * `client_too_old` (functions/src/accounts_v2_client_version.ts). Версия = номер сборки
 * приложения (Android versionCode = iOS buildNumber; монотонно растёт), читается из
 * expo-constants `nativeBuildVersion`. Нет / не целое — 0 (сервер при включённом минимуме
 * откажет — безопасная сторона). Поле `clientVersion` — ровно серверный контракт
 * (сверяет functions/src/accounts_v2_client_version.test.ts по тексту этого файла).
 */

export const ACCOUNT_V2_CLIENT_VERSION_FIELD = 'clientVersion';

let cached: number | null = null;

/** Разбор номера сборки: целое ≥ 1, иначе 0. */
export function parseAccountsV2ClientVersion(raw: unknown): number {
  const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : '';
  if (!/^\d{1,9}$/.test(text)) return 0;
  const value = Number(text);
  return Number.isSafeInteger(value) && value >= 1 ? value : 0;
}

/** Номер сборки этого приложения (кэш на процесс). Никогда не бросает. */
export function readAccountsV2ClientVersion(): number {
  if (cached !== null) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const constants = require('expo-constants').default as { nativeBuildVersion?: unknown } | undefined;
    cached = parseAccountsV2ClientVersion(constants?.nativeBuildVersion);
    if (cached === 0) console.warn('[ACCOUNT-V2] client_version unknown -> 0');
  } catch (error) {
    console.warn(`[ACCOUNT-V2] client_version unavailable kind=${error instanceof Error ? error.name : typeof error} -> 0`);
    cached = 0;
  }
  return cached;
}

/** Данные вызова + версия клиента (новый объект, исходный не меняется). */
export function withAccountsV2ClientVersion<T extends object>(data: T, version: number = readAccountsV2ClientVersion()): T & { clientVersion: number } {
  return { ...data, [ACCOUNT_V2_CLIENT_VERSION_FIELD]: version } as T & { clientVersion: number };
}

/** Только для тестов. */
export function __resetAccountsV2ClientVersionForTests(): void {
  cached = null;
}
