import type { AccountSyncWireBatch } from './account_sync';
import { ACCOUNTS_V2_SYNC_CALLABLE } from './account_sync_callable_transport';
import type { ScopeStorageAdapter } from './account_scope_store';
import {
  ACCOUNTS_V2_UNBOUND_DELETION,
  clearAccountsV2DeletionCredential,
  createAccountsV2DeletionCredential,
  isValidAccountsV2DeletionBinding,
  persistAccountsV2DeletionCredential,
  readAccountsV2DeletionCredential,
  type AccountsV2DeletionCredential,
  type AccountsV2SecureStorePort,
} from './account_deletion_credential';
import { createAccountDetachLatch } from './account_detach_latch';
import {
  createAccountsV2ClientController,
  type AccountsV2ClientController,
  type AccountsV2HydrationClientPorts,
} from './account_v2_client_session';
import {
  createAccountsV2AuthTransitionCoordinator,
  type AccountsV2AuthTransitionCoordinator,
  type AccountsV2AuthTransitionState,
  type AccountsV2ProviderSignInResult,
  type AccountsV2SessionUidResult,
} from './account_v2_auth_transition';
import type { HydrationApplyResult, HydrationSnapshot } from './account_v2_hydration';
import { withAccountsV2ClientVersion } from './account_v2_client_version';
import {
  clearAccountsV2LegacyHydratedMarker,
  readAccountsV2LegacyHydratedUid,
  writeAccountsV2LegacyHydratedMarker,
} from './accounts_v2_legacy_marker';
import {
  createAccountAuthorityRuntime,
  type AccountAuthorityProviderPort,
  type AccountAuthorityRuntime,
} from '../account-authority-v2/account_authority_runtime';
import {
  parseFirebaseAuthUid,
  parseOperationId,
  type OperationId,
} from '../account-authority-v2/account_authority_ids';
import {
  createAccountAuthorityProductionBootstrapRegistry,
  type AccountAuthorityProductionBootstrap,
} from '../account-authority-v2/account_authority_bootstrap_contract';
import { createAccountAuthorityProductionBootstrapIfPossible } from './account_authority_production_adapter';

/*
 * Account V2, Пакет 6B (TG-F76EA3701B55) — боевые порты клиента V2.
 *
 * зачем: единственное место, где контроллер V2 встречается с нативом
 * (SecureStore, expo-crypto, Firebase Auth/Functions). Модуль грузится ТОЛЬКО
 * через app/accounts_v2_client_flag.ts и только при включённом флаге, поэтому
 * при выключенном флаге ни один из этих require не выполняется.
 *
 * Пакет 6C (TG-88837487B247): createStorageAdapter отдаёт настоящий адаптер
 * области (SQLCipher поверх native/*) — только на Android; iOS и любая поломка
 * окружения → null с логом, и контроллер честно не открывает область (клиент
 * не пишет). Нативные модули хранилища грузятся лениво уже здесь, внутри порта.
 * Ключ удаления V2 не зависит от локального хранилища.
 */

const LOG = '[ACCOUNT-V2]';
const SYNC_CALLABLE_TIMEOUT_MS = 30_000;

type SecureStoreModule = AccountsV2SecureStorePort;
type CryptoModule = Readonly<{
  getRandomBytesAsync(count: number): Promise<Uint8Array>;
  randomUUID(): string;
}>;

let controller: AccountsV2ClientController | null = null;
let authTransition: AccountsV2AuthTransitionCoordinator | null = null;
let enabledGate: () => boolean = () => false;

/**
 * Account Authority 2.0 cannot invent any ownership value on the client. The
 * production bootstrap must provide a durable local-store port plus the server
 * lease port before the global cutover can be enabled. Task 5 deliberately
 * leaves that cutover off; a missing bootstrap therefore fails closed.
 */
export type AccountAuthorityClientBootstrap = Readonly<{
  deviceId: AccountAuthorityProductionBootstrap['deviceId'];
  lease: AccountAuthorityProductionBootstrap['lease'];
  localStore: AccountAuthorityProductionBootstrap['localStore'];
  /** Real Firebase/provider sign-out used by UI sign-out and fail-closed cleanup. */
  providerSignOut: () => Promise<void>;
}>;

type PendingProviderSignIn = {
  authenticate: () => Promise<AccountsV2ProviderSignInResult>;
  outcome: AccountsV2ProviderSignInResult | null;
  providerFailure: Error | null;
};

const accountAuthorityBootstrap = createAccountAuthorityProductionBootstrapRegistry();
let accountAuthorityRuntime: AccountAuthorityRuntime | null = null;
const pendingAuthoritySignIns = new Map<string, PendingProviderSignIn>();
let productionBootstrapInstall: Promise<boolean> | null = null;

/** One-time production composition hook. Rebinding a live authority is forbidden. */
export function installAccountAuthorityClientBootstrap(bootstrap: AccountAuthorityClientBootstrap): void {
  accountAuthorityBootstrap.install(bootstrap);
}

/**
 * Installs the real native composition once. Unsupported platforms and native
 * capability failures publish no bootstrap; a successful binding remains
 * immutable through the registry above.
 */
export function installAccountAuthorityProductionBootstrapIfPossible(): Promise<boolean> {
  if (productionBootstrapInstall !== null) return productionBootstrapInstall;
  productionBootstrapInstall = Promise.resolve()
    .then(() => createAccountAuthorityProductionBootstrapIfPossible())
    .then((bootstrap) => {
      if (bootstrap === null) return false;
      accountAuthorityBootstrap.install(bootstrap);
      console.log(`${LOG} authority production_bootstrap_installed`);
      return true;
    })
    .catch((error: unknown) => {
      console.warn(`${LOG} authority production_bootstrap_failed kind=${kindOf(error)}`);
      return false;
    });
  return productionBootstrapInstall;
}

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
    const user = auth?.currentUser;
    // Guest Firebase identities never own Account V2 account scopes. In
    // particular, provider cancellation must not reopen the anonymous uid as
    // `account:<uid>` after the old provider scope has been closed.
    if (user?.isAnonymous !== false) return null;
    const uid = String(user.uid ?? '').trim();
    return uid.length > 0 ? uid : null;
  } catch (error) {
    console.warn(`${LOG} runtime auth_unavailable kind=${kindOf(error)}`);
    return null;
  }
}

function newAccountAuthorityOperationId(kind: 'sign_in' | 'sign_out' | 'startup_resume'): OperationId {
  return parseOperationId(`client_${kind}_${crypto().randomUUID()}`);
}

const ACCOUNT_AUTHORITY_PROVIDER_PORT: AccountAuthorityProviderPort = Object.freeze({
  authenticate: async ({ operationId }: Readonly<{ operationId: OperationId }>) => {
    const pending = pendingAuthoritySignIns.get(operationId.value);
    if (pending === undefined) throw new Error('account_authority_provider_callback_missing');
    const identityBefore = currentAuthUid();
    let outcome: AccountsV2ProviderSignInResult;
    try {
      outcome = await pending.authenticate();
    } catch (error) {
      const identityAfter = currentAuthUid();
      return Object.freeze({
        type: 'failed' as const,
        error,
        identityPreserved: identityBefore !== null && identityAfter === identityBefore,
      });
    }
    pending.outcome = outcome;
    if (outcome.result === 'cancelled') {
      return Object.freeze({ type: 'cancelled' as const });
    }
    if (outcome.result === 'error') {
      const identityAfter = currentAuthUid();
      const providerFailure = new Error(`account_authority_provider_error:${outcome.error ?? 'unknown'}`);
      pending.providerFailure = providerFailure;
      return Object.freeze({
        type: 'failed' as const,
        error: providerFailure,
        identityPreserved: identityBefore !== null && identityAfter === identityBefore,
      });
    }
    const uid = currentAuthUid();
    if (uid === null) throw new Error('account_authority_authenticated_uid_missing');
    return Object.freeze({ type: 'authenticated' as const, firebaseAuthUid: parseFirebaseAuthUid(uid) });
  },
  currentIdentity: async () => {
    const uid = currentAuthUid();
    return uid === null ? null : parseFirebaseAuthUid(uid);
  },
  signOut: async () => {
    const bootstrap = accountAuthorityBootstrap.requireInstalled();
    await bootstrap.providerSignOut();
  },
});

function getAccountAuthorityRuntime(): AccountAuthorityRuntime {
  if (accountAuthorityRuntime !== null) return accountAuthorityRuntime;
  const bootstrap = accountAuthorityBootstrap.requireInstalled();
  accountAuthorityRuntime = createAccountAuthorityRuntime({
    deviceId: bootstrap.deviceId,
    provider: ACCOUNT_AUTHORITY_PROVIDER_PORT,
    lease: bootstrap.lease,
    localStore: bootstrap.localStore,
  });
  return accountAuthorityRuntime;
}

/**
 * Provider authentication enters the one Account Authority FIFO. The callback
 * may acquire Google/Apple/Firebase credentials, but only the server lease port
 * can return the accountId/sessionId used to open a local scope.
 */
export async function runAccountAuthorityProviderSignInTransition<
  T extends AccountsV2ProviderSignInResult,
>(authenticate: () => Promise<T>): Promise<T> {
  const operationId = newAccountAuthorityOperationId('sign_in');
  const pending: PendingProviderSignIn = { authenticate, outcome: null, providerFailure: null };
  pendingAuthoritySignIns.set(operationId.value, pending);
  try {
    await getAccountAuthorityRuntime().signIn(operationId);
    if (pending.outcome === null) throw new Error('account_authority_provider_outcome_missing');
    return pending.outcome as T;
  } catch (error) {
    if (pending.outcome?.result === 'error' && error === pending.providerFailure) {
      return pending.outcome as T;
    }
    throw error;
  } finally {
    pendingAuthoritySignIns.delete(operationId.value);
  }
}

/** Account switch/sign-out closes the authority scope before provider sign-out. */
export async function runAccountAuthorityProviderSignOutTransition(
): Promise<void> {
  const operationId = newAccountAuthorityOperationId('sign_out');
  await getAccountAuthorityRuntime().signOut(operationId);
}

/** Startup provider reauthentication/resume uses currentIdentity inside the authority. */
export async function resumeAccountAuthorityProviderSession(): Promise<void> {
  const operationId = newAccountAuthorityOperationId('startup_resume');
  await getAccountAuthorityRuntime().resume(operationId);
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

/** Пакет 6G: перенос и гидрация — те же httpsCallable, свой таймаут (перенос до 10 транзакций). */
const MIGRATE_CALLABLE_TIMEOUT_MS = 70_000;

function callableOf(name: string, timeout: number): (data: unknown) => Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), 'us-central1'), name, { timeout }) as (data: unknown) => Promise<unknown>;
}

/**
 * Применение гидрации в хранилища приложения. зачем лениво: модуль тянет сторы
 * уроков/карточек/наборов — грузим только когда гидрация реально дошла до применения.
 */
async function applyHydrationLocally(snapshot: HydrationSnapshot, isCurrent: () => boolean): Promise<HydrationApplyResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { applyAccountsV2HydrationLocally } = require('../../app/accounts_v2_hydration_apply') as
    typeof import('../../app/accounts_v2_hydration_apply');
  return applyAccountsV2HydrationLocally(snapshot, isCurrent);
}

const HYDRATION_PORTS: AccountsV2HydrationClientPorts = Object.freeze({
  // зачем (8F, PM-235 T2): версия сборки — сервер ниже minClientVersion отвечает client_too_old.
  callMigrate: () => callableOf('accountsV2MigrateMine', MIGRATE_CALLABLE_TIMEOUT_MS)(withAccountsV2ClientVersion({})),
  callPull: (request: Readonly<{ cursor: string | null; limit: number }>) =>
    callableOf('accountsV2PullMine', SYNC_CALLABLE_TIMEOUT_MS)(withAccountsV2ClientVersion({ cursor: request.cursor, limit: request.limit })),
  applyLocal: applyHydrationLocally,
  // зачем (7A, ремонт №1): метка для выключателя старой синхронизации (accounts_v2_legacy_marker.ts).
  markHydrated: (uid: string) => writeAccountsV2LegacyHydratedMarker(uid, Date.now()),
  // зачем (7A, ремонт №2): применение заново после чистки; снятие метки при выключенном сервере.
  isLocallyApplied: async (uid: string) => (await readAccountsV2LegacyHydratedUid()) === uid,
  clearHydratedMarker: clearAccountsV2LegacyHydratedMarker,
});

/** Настоящее хранилище области; null — платформа/окружение не готовы (лог внутри). */
function createNativeStorageAdapter(): ScopeStorageAdapter | null {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { createExpoAccountNativeEnvironment } = require('./native/account_native_expo_environment') as
      typeof import('./native/account_native_expo_environment');
    const { createAccountNativeScopeAdapter } = require('./native/account_native_scope_adapter') as
      typeof import('./native/account_native_scope_adapter');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const environment = createExpoAccountNativeEnvironment();
    if (environment === null) return null;
    const adapter = createAccountNativeScopeAdapter(environment);
    console.log(`${LOG} runtime storage_adapter_ready`);
    return adapter;
  } catch (error) {
    // зачем: битый манифест/модуль — не открываем область вовсе, клиент не пишет.
    console.warn(`${LOG} runtime storage_adapter_failed kind=${kindOf(error)}`);
    return null;
  }
}

function getController(isEnabled: () => boolean): AccountsV2ClientController {
  enabledGate = isEnabled;
  if (controller !== null) return controller;
  controller = createAccountsV2ClientController({
    isEnabled: () => enabledGate(),
    createStorageAdapter: createNativeStorageAdapter,
    latch: createAccountDetachLatch(secureStore() ?? MISSING_SECURE_STORE),
    callSync,
    currentAuthUid,
    newNonce: () => crypto().randomUUID(),
    setTimer: (run, delayMs) => setTimeout(run, delayMs),
    clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    hydration: HYDRATION_PORTS,
  });
  return controller;
}

function getAuthTransition(isEnabled: () => boolean): AccountsV2AuthTransitionCoordinator {
  enabledGate = isEnabled;
  if (authTransition !== null) return authTransition;
  authTransition = createAccountsV2AuthTransitionCoordinator({
    currentAuthUid,
    isEnabled,
    setSessionUid: async (uid): Promise<AccountsV2SessionUidResult> => {
      const target = getController(isEnabled);
      await target.setAuthUid(uid);
      const status = target.status();
      if (uid === null) {
        return status.uid === null
          ? Object.freeze({ outcome: 'closed', uid: null })
          : Object.freeze({ outcome: 'not_opened', uid: status.uid, reason: 'scope_close_not_confirmed' });
      }
      if (status.uid !== uid) {
        return Object.freeze({ outcome: 'not_opened', uid: status.uid, reason: 'scope_not_opened' });
      }
      return Object.freeze({ outcome: 'opened', uid, hydrationScheduled: status.hydrationArmed });
    },
    onStateChange: (state) => {
      console.log(`${LOG} auth_transition phase=${state.phase} hasUid=${state.uid !== null} hasError=${state.error !== null}`);
    },
  });
  return authTransition;
}

/** Awaited provider sign-in authority used only by the Android flag gate. */
export function runAccountsV2ProviderSignInTransition<T extends AccountsV2ProviderSignInResult>(
  authenticate: () => Promise<T>,
  isEnabled: () => boolean,
): Promise<T> {
  return getAuthTransition(isEnabled).runProviderSignIn(authenticate);
}

/** Awaited provider sign-out authority used only by the Android flag gate. */
export function runAccountsV2ProviderSignOutTransition(
  authenticate: () => Promise<void>,
  isEnabled: () => boolean,
): Promise<void> {
  return getAuthTransition(isEnabled).runProviderSignOut(authenticate);
}

export function accountsV2AuthTransitionStatus(): AccountsV2AuthTransitionState {
  return authTransition?.status() ?? Object.freeze({ phase: 'idle', uid: null, error: null });
}

/**
 * Firebase сообщил об изменении auth-состояния. Переданный uid принадлежит
 * UI/Spire-сигналу и намеренно не является authority для области Account V2:
 * например, анонимная Firebase-сессия имеет uid, но не владеет account scope.
 * Единственный источник scope uid — текущая linked provider identity.
 */
export function syncAccountsV2ClientAuthUid(_observedUid: string | null, isEnabled: () => boolean): void {
  getAuthTransition(isEnabled).observeAuthUid(currentAuthUid()).catch((error: unknown) => {
    console.warn(`${LOG} runtime set_auth_failed kind=${kindOf(error)}`);
  });
}

/**
 * Пакет 7A: uid ОТКРЫТОЙ области V2 (живая сессия, сервер не выключен) или null.
 * зачем: выключатель старой синхронизации (accounts_v2_legacy_sync_disabled)
 * действует только пока V2 реально ведёт данные этого аккаунта. Синхронно,
 * без чтений: только состояние контроллера в памяти.
 */
export function accountsV2OpenScopeUid(): string | null {
  if (controller === null) return null;
  const status = controller.status();
  return status.serverDisabled ? null : status.uid;
}

/**
 * Пакет 6F: изменение приложения (урок/карточки/свайпы/библиотека) → outbox V2.
 * Никогда не отклоняется; без живой сессии — лог и ничего.
 */
export function produceAccountsV2Change(
  change: import('./account_sync_producer_plan').AccountsV2Change,
  ownerUid: string,
  isEnabled: () => boolean,
): Promise<void> {
  return getController(isEnabled).produce(change, ownerUid).catch((error: unknown) => {
    console.warn(`${LOG} runtime produce_failed kind=${kindOf(error)}`);
  });
}

/** Записи ключа в полёте по привязке: снятие ждёт свою запись. */
const credentialWrites = new Map<string, Promise<AccountsV2DeletionCredential | null>>();

/** operationId замка удаления; нет замка (аноним) — общая привязка «без замка». */
function bindingOf(lockOperationId: string | null): string {
  return lockOperationId === null ? ACCOUNTS_V2_UNBOUND_DELETION : lockOperationId;
}

/**
 * Ключ удаления V2 замка lockOperationId — для повтора постановки после перезапуска.
 * зачем (ревью 6B, P3): иначе повтор уходил без accountsV2Deletion и телефон
 * терял право узнать этап и дотолкнуть стирание. Никогда не отклоняется.
 */
export async function readStoredAccountsV2DeletionCredential(
  lockOperationId: string | null,
): Promise<AccountsV2DeletionCredential | null> {
  const store = secureStore();
  if (store === null) return null;
  try {
    const credential = await readAccountsV2DeletionCredential(store, bindingOf(lockOperationId));
    console.log(`${LOG} delete stored_credential found=${credential !== null}`);
    return credential;
  } catch (error) {
    console.warn(`${LOG} delete stored_credential_failed kind=${kindOf(error)}`);
    return null;
  }
}

/**
 * Удаление замка lockOperationId завершено (сервер принял постановку) — ключ V2
 * больше не нужен телефону. зачем (хвост 6B P3): ключ не живёт вечно под
 * постоянным именем. Чужой замок не трогает. Никогда не отклоняется.
 */
export async function clearStoredAccountsV2DeletionCredential(lockOperationId: string | null): Promise<boolean> {
  // зачем (ревью 6C, P3, гонка FAST_WAIT): запрос мог уйти без ключа, пока ключ ещё
  // пишется. Снятие ждёт окончания записи этого же замка — иначе запись легла бы ПОСЛЕ снятия.
  const inFlight = credentialWrites.get(bindingOf(lockOperationId));
  if (inFlight !== undefined) {
    console.log(`${LOG} delete clear_waits_for_write`);
    await inFlight;
  }
  const store = secureStore();
  if (store === null) return false;
  try {
    return await clearAccountsV2DeletionCredential(store, bindingOf(lockOperationId));
  } catch (error) {
    console.warn(`${LOG} delete clear_credential_failed kind=${kindOf(error)}`);
    return false;
  }
}

async function createPersistedCredential(lockOperationId: string | null): Promise<AccountsV2DeletionCredential | null> {
  const binding = bindingOf(lockOperationId);
  if (!isValidAccountsV2DeletionBinding(binding)) {
    console.warn(`${LOG} delete credential_binding_invalid`);
    return null;
  }
  const store = secureStore();
  if (store === null) return null;
  let credential: AccountsV2DeletionCredential;
  try {
    credential = await createAccountsV2DeletionCredential((count) => crypto().getRandomBytesAsync(count));
  } catch (error) {
    console.warn(`${LOG} delete credential_failed kind=${kindOf(error)}`);
    return null;
  }
  if (!await persistAccountsV2DeletionCredential(store, credential, binding)) {
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
  lockOperationId: string | null = null,
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
  const binding = bindingOf(lockOperationId);
  const writing = createPersistedCredential(lockOperationId).catch((error: unknown) => {
    console.warn(`${LOG} delete credential_threw kind=${kindOf(error)}`);
    return null;
  });
  credentialWrites.set(binding, writing);
  void writing.then(() => { if (credentialWrites.get(binding) === writing) credentialWrites.delete(binding); });
  return writing;
}
