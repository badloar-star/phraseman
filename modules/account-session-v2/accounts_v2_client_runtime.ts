import type { AccountSyncWireBatch } from './account_sync';
import { ACCOUNTS_V2_SYNC_CALLABLE } from './account_sync_callable_transport';
import {
  createAccountsV2DeletionCredential,
  persistAccountsV2DeletionCredential,
  readAccountsV2DeletionCredential,
  type AccountsV2DeletionCredential,
  type AccountsV2SecureStorePort,
} from './account_deletion_credential';
import { createAccountDetachLatch } from './account_detach_latch';
import {
  createAccountsV2ClientController,
  type AccountsV2ClientController,
} from './account_v2_client_session';

/*
 * Account V2, Пакет 6B (TG-F76EA3701B55) — боевые порты клиента V2.
 *
 * зачем: единственное место, где контроллер V2 встречается с нативом
 * (SecureStore, expo-crypto, Firebase Auth/Functions). Модуль грузится ТОЛЬКО
 * через app/accounts_v2_client_flag.ts и только при включённом флаге, поэтому
 * при выключенном флаге ни один из этих require не выполняется.
 *
 * TEMP (до включения): нативного хранилища областей (SQLCipher-адаптер поверх
 * native/account_sqlite_scope_connection + provisioner) ещё нет — порт
 * createStorageAdapter отдаёт null, и контроллер честно не открывает область
 * (лог `storage_unavailable`). Ключ удаления V2 при этом уже генерируется и
 * уходит на сервер — он не зависит от локального хранилища.
 */

const LOG = '[ACCOUNT-V2]';
const SYNC_CALLABLE_TIMEOUT_MS = 30_000;

type SecureStoreModule = AccountsV2SecureStorePort;
type CryptoModule = Readonly<{
  getRandomBytesAsync(count: number): Promise<Uint8Array>;
  randomUUID(): string;
}>;

let controller: AccountsV2ClientController | null = null;
let enabledGate: () => boolean = () => false;

function kindOf(value: unknown): string {
  return value instanceof Error ? value.name : typeof value;
}

function secureStore(): SecureStoreModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store') as SecureStoreModule;
  } catch (error) {
    console.warn(`${LOG} runtime secure_store_unavailable kind=${kindOf(error)}`);
    return null;
  }
}

function crypto(): CryptoModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-crypto') as CryptoModule;
}

/** SecureStore, которого нет (Expo Go/web): каждое действие — отказ, защёлка fail-closed. */
const MISSING_SECURE_STORE: AccountsV2SecureStorePort = Object.freeze({
  getItemAsync: async () => { throw new Error('secure_store_unavailable'); },
  setItemAsync: async () => { throw new Error('secure_store_unavailable'); },
  deleteItemAsync: async () => { throw new Error('secure_store_unavailable'); },
});

function currentAuthUid(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('@react-native-firebase/auth').default();
    const uid = String(auth?.currentUser?.uid ?? '').trim();
    return uid.length > 0 ? uid : null;
  } catch (error) {
    console.warn(`${LOG} runtime auth_unavailable kind=${kindOf(error)}`);
    return null;
  }
}

async function callSync(batch: AccountSyncWireBatch): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  const call = httpsCallable(getFunctions(getApp(), 'us-central1'), ACCOUNTS_V2_SYNC_CALLABLE, {
    timeout: SYNC_CALLABLE_TIMEOUT_MS,
  }) as (data: AccountSyncWireBatch) => Promise<unknown>;
  return call(batch);
}

function getController(isEnabled: () => boolean): AccountsV2ClientController {
  enabledGate = isEnabled;
  if (controller !== null) return controller;
  controller = createAccountsV2ClientController({
    isEnabled: () => enabledGate(),
    createStorageAdapter: () => {
      // зачем: нативный адаптер областей ещё не подключён (см. TEMP выше) — не открываем ничего.
      console.warn(`${LOG} runtime storage_adapter_not_wired`);
      return null;
    },
    latch: createAccountDetachLatch(secureStore() ?? MISSING_SECURE_STORE),
    callSync,
    currentAuthUid,
    newNonce: () => crypto().randomUUID(),
    setTimer: (run, delayMs) => setTimeout(run, delayMs),
    clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  });
  return controller;
}

/** uid Firebase сменился (вход, выход, смена аккаунта). Никогда не бросает. */
export function syncAccountsV2ClientAuthUid(uid: string | null, isEnabled: () => boolean): void {
  getController(isEnabled).setAuthUid(uid).catch((error: unknown) => {
    console.warn(`${LOG} runtime set_auth_failed kind=${kindOf(error)}`);
  });
}

/**
 * Ключ удаления V2 из SecureStore — для повтора постановки после перезапуска.
 * зачем (ревью 6B, P3): иначе повтор уходил без accountsV2Deletion и телефон
 * терял право узнать этап и дотолкнуть стирание. Никогда не отклоняется.
 */
export async function readStoredAccountsV2DeletionCredential(): Promise<AccountsV2DeletionCredential | null> {
  const store = secureStore();
  if (store === null) return null;
  try {
    const credential = await readAccountsV2DeletionCredential(store);
    console.log(`${LOG} delete stored_credential found=${credential !== null}`);
    return credential;
  } catch (error) {
    console.warn(`${LOG} delete stored_credential_failed kind=${kindOf(error)}`);
    return null;
  }
}

async function createPersistedCredential(): Promise<AccountsV2DeletionCredential | null> {
  const store = secureStore();
  if (store === null) return null;
  let credential: AccountsV2DeletionCredential;
  try {
    credential = await createAccountsV2DeletionCredential((count) => crypto().getRandomBytesAsync(count));
  } catch (error) {
    console.warn(`${LOG} delete credential_failed kind=${kindOf(error)}`);
    return null;
  }
  if (!await persistAccountsV2DeletionCredential(store, credential)) {
    // зачем: ключ, которого нет на телефоне, бесполезен — не шлём; сервер сотрёт V2 и без него.
    console.warn(`${LOG} delete credential_not_persisted`);
    return null;
  }
  console.log(`${LOG} delete credential_ready`);
  return credential;
}

/**
 * Подтверждённое удаление аккаунта. СИНХРОННО (до возврата) останавливает
 * отправку V2 и закрывает область uid — до любой сети; затем готовит ключ
 * удаления V2 (SecureStore). Промис ключа никогда не отклоняется (null — без ключа).
 */
export function beginAccountsV2Deletion(
  uid: string | null,
  isEnabled: () => boolean,
): Promise<AccountsV2DeletionCredential | null> {
  let detaching: Promise<unknown>;
  try {
    detaching = getController(isEnabled).beginDeletionDetach(uid);
  } catch (error) {
    console.warn(`${LOG} delete detach_threw kind=${kindOf(error)}`);
    detaching = Promise.resolve(null);
  }
  void detaching.catch((error: unknown) => {
    console.warn(`${LOG} delete detach_failed kind=${kindOf(error)}`);
  });
  return createPersistedCredential().catch((error: unknown) => {
    console.warn(`${LOG} delete credential_threw kind=${kindOf(error)}`);
    return null;
  });
}
