import { Platform } from 'react-native';
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
let accountAuthorityResumeInFlight: Promise<void> | null = null;
let accountAuthorityResumeQueued = false;
let accountAuthorityResumeLatestClient:
  Pick<AccountsV2ClientRuntime, 'resumeAccountAuthorityProviderSession'> | null = null;
let accountAuthorityBootstrapInstall: Promise<boolean> | null = null;

// Owner gate: wiring may land before the durable client bootstrap, callable
// exports, and migration proof. Never make this remotely activatable.
const ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED = false;

export function isAccountAuthorityV2CutoverEnabled(): boolean {
  return ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED;
}

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

function loadAccountsV2ClientForAuthorityCutover(): AccountsV2ClientRuntime | null {
  if (loaded !== null) return loaded;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('../modules/account-session-v2/accounts_v2_client_runtime') as AccountsV2ClientRuntime;
  } catch (error) {
    console.warn(`[ACCOUNT-AUTHORITY] client load_failed kind=${error instanceof Error ? error.name : typeof error}`);
    loaded = null;
  }
  return loaded;
}

/**
 * Real startup composition. It is safe to call repeatedly, publishes nothing
 * on an unsupported native platform, and never changes the rollout gate.
 */
export function installAccountAuthorityProductionBootstrapIfPossible(): Promise<boolean> {
  if (accountAuthorityBootstrapInstall !== null) return accountAuthorityBootstrapInstall;
  // Do not touch native storage, SecureStore, or Firebase while both rollout
  // gates are off. The authority composition is only needed for the explicit
  // V2 migration gate or the owner-authorized global cutover.
  if (!isAccountAuthorityV2CutoverEnabled() && !isAccountsV2ClientEnabled()) {
    return Promise.resolve(false);
  }
  if (!isAccountsV2ProviderTransitionSupported()) return Promise.resolve(false);
  const client = loadAccountsV2ClientForAuthorityCutover();
  if (client === null) return Promise.resolve(false);
  accountAuthorityBootstrapInstall = client.installAccountAuthorityProductionBootstrapIfPossible();
  return accountAuthorityBootstrapInstall;
}

export function resumeAccountAuthorityProviderSessionIfIdle(
  client: Pick<AccountsV2ClientRuntime, 'resumeAccountAuthorityProviderSession'>,
): void {
  if (accountAuthorityResumeInFlight !== null) {
    accountAuthorityResumeQueued = true;
    accountAuthorityResumeLatestClient = client;
    return;
  }
  const task = client.resumeAccountAuthorityProviderSession();
  accountAuthorityResumeInFlight = task;
  const settled = (): void => {
    if (accountAuthorityResumeInFlight !== task) return;
    accountAuthorityResumeInFlight = null;
    if (!accountAuthorityResumeQueued) return;
    accountAuthorityResumeQueued = false;
    const latestClient = accountAuthorityResumeLatestClient;
    accountAuthorityResumeLatestClient = null;
    if (latestClient !== null) resumeAccountAuthorityProviderSessionIfIdle(latestClient);
  };
  void task.then(settled, settled);
}

/**
 * uid Firebase сменился. Флаг выключен и клиент не грузился — ничего (ни
 * require, ни чтений). Клиент уже загружен — сообщаем всегда: при выключенном
 * флаге он сам остановится и закроет область.
 */
export function syncAccountsV2ClientAuth(uid: string | null): void {
  const bootstrapInstall = installAccountAuthorityProductionBootstrapIfPossible();
  if (isAccountAuthorityV2CutoverEnabled()) {
    void bootstrapInstall.then((installed) => {
      const client = installed ? loadAccountsV2ClientForAuthorityCutover() : null;
      if (client === null) {
        console.warn('[ACCOUNT-AUTHORITY] startup_resume blocked reason=bootstrap_unavailable');
        return;
      }
      resumeAccountAuthorityProviderSessionIfIdle({
        resumeAccountAuthorityProviderSession: async () => client.resumeAccountAuthorityProviderSession().catch((error: unknown) => {
          console.warn(`[ACCOUNT-AUTHORITY] startup_resume failed kind=${error instanceof Error ? error.name : typeof error}`);
        }),
      });
    });
    return;
  }
  const client = loadAccountsV2ClientIfEnabled();
  if (client === null) {
    if (__DEV__) console.log('[ACCOUNT-V2] auth_sync skip reason=flag_off');
    return;
  }
  client.syncAccountsV2ClientAuthUid(uid, isAccountsV2ClientEnabled);
}

/**
 * Provider transitions may use Account V2 only where the native scope has been
 * proven: Android, or the explicitly opt-in iOS proof build. The capability
 * check is lazy so ordinary iOS/web startup keeps the legacy path untouched.
 */
function isAccountsV2ProviderTransitionSupported(): boolean {
  if (Platform.OS === 'android') return true;
  if (Platform.OS !== 'ios') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const environment = require('../modules/account-session-v2/native/account_native_expo_environment') as
      typeof import('../modules/account-session-v2/native/account_native_expo_environment');
    return environment.isAccountV2NativePlatformSupported();
  } catch (error) {
    console.warn(`[ACCOUNT-V2] provider_transition capability_failed kind=${error instanceof Error ? error.name : typeof error}`);
    return false;
  }
}

function runLegacyAccountsV2ProviderSignInTransition<T extends Readonly<{ result: string; error?: string }>>(
  authenticate: () => Promise<T>,
): Promise<T> {
  if (!isAccountsV2ClientEnabled() || !isAccountsV2ProviderTransitionSupported()) return authenticate();
  const client = loadAccountsV2ClientIfEnabled();
  if (client === null) return authenticate();
  return client.runAccountsV2ProviderSignInTransition(authenticate, isAccountsV2ClientEnabled);
}

/** Capability + flag-gated provider sign-out through the same awaited authority. */
function runLegacyAccountsV2ProviderSignOutTransition(
  authenticate: () => Promise<void>,
): Promise<void> {
  if (!isAccountsV2ClientEnabled() || !isAccountsV2ProviderTransitionSupported()) return authenticate();
  const client = loadAccountsV2ClientIfEnabled();
  if (client === null) return authenticate();
  return client.runAccountsV2ProviderSignOutTransition(authenticate, isAccountsV2ClientEnabled);
}

/**
 * New provider entrypoint. Until the owner cutover gate changes in source, the
 * existing Account V2 transition remains an explicit migration adapter.
 */
export function runAccountAuthorityProviderSignInTransition<
  T extends Readonly<{ result: string; error?: string }>,
>(
  authorityAuthenticate: () => Promise<T>,
  legacyAuthenticate: () => Promise<T> = authorityAuthenticate,
): Promise<T> {
  if (!isAccountAuthorityV2CutoverEnabled()) {
    return runLegacyAccountsV2ProviderSignInTransition(legacyAuthenticate);
  }
  return installAccountAuthorityProductionBootstrapIfPossible().then((installed) => {
    const client = installed ? loadAccountsV2ClientForAuthorityCutover() : null;
    if (client === null) throw new Error('account_authority_bootstrap_unavailable');
    return client.runAccountAuthorityProviderSignInTransition(authorityAuthenticate);
  });
}

export function runAccountAuthorityProviderSignOutTransition(
  authenticate: () => Promise<void>,
): Promise<void> {
  if (!isAccountAuthorityV2CutoverEnabled()) {
    return runLegacyAccountsV2ProviderSignOutTransition(authenticate);
  }
  return installAccountAuthorityProductionBootstrapIfPossible().then((installed) => {
    const client = installed ? loadAccountsV2ClientForAuthorityCutover() : null;
    if (client === null) throw new Error('account_authority_bootstrap_unavailable');
    return client.runAccountAuthorityProviderSignOutTransition();
  });
}

/** Compatibility exports route every caller through the cutover seam. */
export const runAccountsV2ProviderSignInTransition = runAccountAuthorityProviderSignInTransition;
export const runAccountsV2ProviderSignOutTransition = runAccountAuthorityProviderSignOutTransition;

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

/**
 * Пакет 7A: uid открытой области V2, если клиент V2 УЖЕ загружен; иначе null.
 * зачем: читает выключатель старой синхронизации на горячем пути cloud_sync —
 * поэтому НИКАКОГО require здесь: не загружен клиент — значит и область не открыта.
 */
export function accountsV2OpenScopeUidIfLoaded(): string | null {
  if (loaded === null || !isAccountsV2ClientEnabled()) return null;
  try {
    return loaded.accountsV2OpenScopeUid();
  } catch (error) {
    console.warn(`[ACCOUNT-V2] legacy_skip scope_status_failed kind=${error instanceof Error ? error.name : typeof error}`);
    return null;
  }
}

export type AccountsV2ChangeInput = import('../modules/account-session-v2/account_sync_producer_plan').AccountsV2Change;

/**
 * Пакет 6F, ремонт №1 (P2): владелец изменения — uid Firebase В МОМЕНТ записи.
 * зачем: изменение аккаунта A, отложенное (setTimeout, отложенная запись свайпов),
 * не должно попасть в область B, если человек успел сменить аккаунт. Места записи
 * зовут это СИНХРОННО в начале своей записи. Флаг выключен — null без чтений.
 */
export function captureAccountsV2OwnerUid(): string | null {
  if (!isAccountsV2ClientEnabled()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const user = require('@react-native-firebase/auth').default()?.currentUser as
      { uid?: unknown; isAnonymous?: unknown } | null | undefined;
    if (user?.isAnonymous !== false) return null;
    const uid = String(user.uid ?? '').trim();
    return uid.length > 0 ? uid : null;
  } catch (error) {
    console.warn(`[ACCOUNT-V2] produce owner_unavailable kind=${error instanceof Error ? error.name : typeof error}`);
    return null;
  }
}

/**
 * Account V2, Пакет 6F (dual-write): изменение урока / карточек / свайпов /
 * библиотеки → операции V2. Флаг выключен — НИЧЕГО (ни require, ни чтений,
 * ни таймеров). Включён — изменение сразу передаётся в сериализованную очередь
 * runtime; сама отправка в сеть остаётся фоновой. Это сохраняет порядок
 * относительно A→B перехода и не блокирует экран. Никогда не бросает.
 * ownerUid — из captureAccountsV2OwnerUid() в момент записи (ремонт №1, P2).
 */
export function produceAccountsV2ChangeIfEnabled(ownerUid: string | null, build: () => AccountsV2ChangeInput): void {
  if (!isAccountsV2ClientEnabled()) return;
  if (ownerUid === null) {
    console.warn('[ACCOUNT-V2] produce skip reason=no_owner');
    return;
  }
  const client = loadAccountsV2ClientIfEnabled();
  if (client === null) {
    console.log('[ACCOUNT-V2] produce skip reason=client_unavailable');
    return;
  }
  let change: AccountsV2ChangeInput;
  try {
    change = build();
  } catch (error) {
    console.warn(`[ACCOUNT-V2] produce build_failed kind=${error instanceof Error ? error.name : typeof error}`);
    return;
  }
  // The runtime controller serializes producer work with auth transitions.
  // Enter that queue now; a timer here could let A→B close the scope before
  // A's card mutation is even handed to Account V2.
  void client.produceAccountsV2Change(change, ownerUid, isAccountsV2ClientEnabled)
    .catch((error: unknown) => {
      console.warn(`[ACCOUNT-V2] produce failed kind=${error instanceof Error ? error.name : typeof error}`);
    });
}

/**
 * Ответ постановки удаления — настоящий успех (сервер принял и закрыл ключ).
 * зачем (Пакет 6D, хвост 6C P3): аноним снимал ключ V2 при ЛЮБОМ ответе; без
 * успеха ключ — единственное право телефона узнать этап удаления, его не снимаем.
 */
export function isAccountsV2DeletionAckSuccessful(ack: unknown): boolean {
  if (typeof ack !== 'object' || ack === null) return false;
  const value = ack as { ok?: unknown; jobId?: unknown; authReleased?: unknown; credentialSafe?: unknown };
  return value.ok === true && typeof value.jobId === 'string' && value.jobId.length > 0
    && value.authReleased === true && value.credentialSafe === true;
}

/** Снять ключ V2 замка только после УСПЕШНОГО ответа сервера. Никогда не бросает. */
export function clearStoredAccountsV2DeletionCredentialAfterAckIfEnabled(
  lockOperationId: string | null,
  ack: unknown,
): void {
  if (!isAccountsV2DeletionAckSuccessful(ack)) {
    console.warn('[ACCOUNT-V2] delete_clear skip reason=ack_not_successful');
    return;
  }
  clearStoredAccountsV2DeletionCredentialIfEnabled(lockOperationId);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
