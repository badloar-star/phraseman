/*
 * Account V2, Пакет 8F (TG-766E45F4A75A, PM-235 T2) — серверная проверка версии клиента.
 *
 * зачем: блокировка старых версий приложения была только клиентской (force_update) — сервер
 * принимал всех. Теперь V2-функции (синхронизация, перенос, pull) сравнивают версию клиента с
 * `config/accounts_v2.minClientVersion` и ниже минимума отвечают окончательным
 * `failed-precondition client_too_old` ДО любых чтений/записей данных.
 *  - Версия клиента = номер сборки приложения (Android versionCode = iOS buildNumber, сейчас 130;
 *    монотонно растёт), едет полем `clientVersion` в данных вызова.
 *  - Минимум 0 / нет / порча = проверки нет — поведение не меняется до решения владельца.
 *  - Нет поля = версия 0: при включённом минимуме старые сборки без поля получают client_too_old
 *    (это и есть цель).
 *  - Поле снимается с данных до строгих разборщиков пакета/запроса (они не знают о нём).
 *  - accountsV2DeletionStatus сознательно НЕ проверяется: статус удаления ничего не пишет, а
 *    человек обязан видеть этап удаления аккаунта с любой версии.
 * Читается из уже кэшированного документа флагов — ноль доп. чтений. Без импортов (сторож паритета).
 */

export const ACCOUNTS_V2_CLIENT_VERSION_FIELD = 'clientVersion';
export const ACCOUNTS_V2_CLIENT_TOO_OLD = 'client_too_old';

/** Минимум из документа флагов: safe integer ≥ 1, иначе 0 (выкл). */
export function parseMinClientVersion(raw: unknown): number {
  return typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 1 ? raw : 0;
}

type Split = Readonly<{ clientVersion: number; data: unknown }>;

/**
 * Версия клиента из данных вызова и данные БЕЗ поля версии.
 * Не объект / нет поля / не целое ≥ 1 → версия 0 (данные возвращаются как есть).
 */
export function splitClientVersion(data: unknown): Split {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return { clientVersion: 0, data };
  const descriptor = Object.getOwnPropertyDescriptor(data, ACCOUNTS_V2_CLIENT_VERSION_FIELD);
  if (descriptor === undefined) return { clientVersion: 0, data };
  const raw = 'value' in descriptor ? descriptor.value : undefined;
  const rest: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (key !== ACCOUNTS_V2_CLIENT_VERSION_FIELD) rest[key] = (data as Record<string, unknown>)[key];
  }
  const clientVersion = typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 1 ? raw : 0;
  return { clientVersion, data: rest };
}

/** Клиент ниже минимума (минимум 0 — никогда). */
export function accountsV2ClientTooOld(minClientVersion: number | undefined, clientVersion: number): boolean {
  const min = minClientVersion ?? 0;
  return min > 0 && clientVersion < min;
}
