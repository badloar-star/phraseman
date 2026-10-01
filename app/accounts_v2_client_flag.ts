import { getRemoteBool } from './remote_flags';

/*
 * Account V2, Пакет 6B (TG-F76EA3701B55) — лёгкие ворота клиента V2.
 *
 * зачем: этот файл импортируют горячие места (корневой layout, поток удаления),
 * поэтому в нём НЕТ ничего тяжёлого: только синхронное чтение уже загруженного
 * флага из памяти (remote_flags). Сам клиент V2 (область, outbox, раннер,
 * SecureStore, callable) лежит вне app/ (не маршрут expo-router) и грузится
 * лениво через require — ТОЛЬКО при включённом флаге. При выключенном флаге
 * приложение ведёт себя ровно как раньше: ни чтений, ни записей, ни сети, ни
 * таймеров (Performance Bible: ничего нового на первом кадре и холодном старте).
 */

type AccountsV2ClientRuntime = typeof import('../modules/account-session-v2/accounts_v2_client_runtime');

let loaded: AccountsV2ClientRuntime | null = null;

/** Клиентский флаг Account V2 (remote_config «Пульта»), по умолчанию выключен. */
export function isAccountsV2ClientEnabled(): boolean {
  return getRemoteBool('accounts_v2_client_enabled') === true;
}

/** Клиент V2; грузится только при включённом флаге. null — флаг выключен или загрузка упала. */
export function loadAccountsV2ClientIfEnabled(): AccountsV2ClientRuntime | null {
  if (loaded !== null) return loaded;
  if (!isAccountsV2ClientEnabled()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('../modules/account-session-v2/accounts_v2_client_runtime') as AccountsV2ClientRuntime;
  } catch (error) {
    console.warn(`[ACCOUNT-V2] client load_failed kind=${error instanceof Error ? error.name : typeof error}`);
    loaded = null;
  }
  return loaded;
}

/**
 * uid Firebase сменился. Флаг выключен и клиент не грузился — ничего (ни
 * require, ни чтений). Клиент уже загружен — сообщаем всегда: при выключенном
 * флаге он сам остановится и закроет область.
 */
export function syncAccountsV2ClientAuth(uid: string | null): void {
  const client = loadAccountsV2ClientIfEnabled();
  if (client === null) {
    if (__DEV__) console.log('[ACCOUNT-V2] auth_sync skip reason=flag_off');
    return;
  }
  client.syncAccountsV2ClientAuthUid(uid, isAccountsV2ClientEnabled);
}

/**
 * Подтверждённое удаление: СИНХРОННО отсоединяет V2 (до сети) и готовит ключ.
 * null — флаг выключен (поток удаления идёт ровно как раньше, без поля V2).
 */
export function beginAccountsV2DeletionIfEnabled(
  uid: string | null,
  lockOperationId: string | null = null,
): Promise<Readonly<{ operationId: string; capability: string }> | null> | null {
  const client = loadAccountsV2ClientIfEnabled();
  if (client === null) {
    if (__DEV__) console.log('[ACCOUNT-V2] delete skip reason=flag_off');
    return null;
  }
  // зачем (Пакет 6C, хвост 6B P3): ключ V2 привязан к замку удаления (его operationId).
  return client.beginAccountsV2Deletion(uid, isAccountsV2ClientEnabled, lockOperationId);
}

/**
 * Повтор постановки удаления после перезапуска: сохранённый ключ V2 (если есть).
 * null — флаг выключен (повтор идёт ровно как раньше, без поля V2).
 */
export function readStoredAccountsV2DeletionCredentialIfEnabled(
  lockOperationId: string | null,
): Promise<Readonly<{ operationId: string; capability: string }> | null> | null {
  const client = loadAccountsV2ClientIfEnabled();
  if (client === null) {
    if (__DEV__) console.log('[ACCOUNT-V2] delete_retry skip reason=flag_off');
    return null;
  }
  return client.readStoredAccountsV2DeletionCredential(lockOperationId);
}

/**
 * Удаление замка завершено (сервер принял постановку) — снять ключ V2 этого
 * замка. Флаг выключен и клиент не грузился — ничего. Никогда не бросает.
 */
export function clearStoredAccountsV2DeletionCredentialIfEnabled(lockOperationId: string | null): void {
  const client = loadAccountsV2ClientIfEnabled();
  if (client === null) {
    if (__DEV__) console.log('[ACCOUNT-V2] delete_clear skip reason=flag_off');
    return;
  }
  void client.clearStoredAccountsV2DeletionCredential(lockOperationId).then((cleared) => {
    console.log(`[ACCOUNT-V2] delete credential_cleared ok=${cleared}`);
  });
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
