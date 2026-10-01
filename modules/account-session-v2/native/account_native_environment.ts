import type { AccountScope } from '../account_session';
import {
  deriveV2StorageIdentity,
  planV2StorageArtifacts,
  type AccountNativeStorageManifest,
  type AccountLineageObservation,
  type V2StoragePlan,
} from '../native_storage_manifest';

/*
 * Account V2, Пакет 6C (TG-88837487B247) — порты нативного окружения хранилища области.
 *
 * зачем: адаптер области (account_native_scope_adapter.ts) и стирание
 * (account_native_scope_erase.ts) — чистая логика поверх этих портов, поэтому
 * их можно проверить в jest без телефона. Настоящие порты (expo-sqlite с
 * патчем аренды, SecureStore, expo-file-system, expo-crypto) собирает
 * account_native_expo_environment.ts — только на Android и только при
 * включённом клиентском флаге (ленивый require).
 *
 * Ключ SQLCipher живёт только в SecureStore; в логи не попадают ни ключ, ни
 * uid, ни хэш области — только коды и числа.
 */

export const ACCOUNT_V2_LOG = '[ACCOUNT-V2]';

/** SecureStore с уже применённой политикой ключей V2 (service + WHEN_UNLOCKED_THIS_DEVICE_ONLY). */
export type AccountNativeSecureStore = Readonly<{
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}>;

/** Подмножество SQLiteDatabase (expo-sqlite 16 + патч аренды), которым пользуется адаптер. */
export type AccountNativeSqliteDatabase = Readonly<{
  nativeDatabase: unknown;
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: readonly (null | number | string)[]): Promise<unknown>;
  getFirstAsync(source: string, params: readonly (null | number | string)[]): Promise<unknown>;
  getAllAsync(source: string, params: readonly (null | number | string)[]): Promise<unknown>;
}>;

/** Нативная провиженинг-блокировка файла базы (FileChannel.lock из патча). */
export type AccountNativeProvisionLock = Readonly<{ release(): Promise<void> }>;

export type AccountNativeEnvironment = Readonly<{
  /** Сырой JSON манифеста; адаптер сам проверяет его validateAccountNativeStorageManifest. */
  manifest: unknown;
  digestSha256(value: string): Promise<string>;
  secure: AccountNativeSecureStore;
  randomKeyBytes(): Promise<Uint8Array>;
  acquireProvisionLock(databaseName: string): Promise<AccountNativeProvisionLock>;
  fileExists(fileName: string): Promise<boolean>;
  deleteFile(fileName: string): Promise<void>;
  /** Имена файлов в каталоге областей (accounts-v2). Каталога нет — пустой список. */
  listFileNames(): Promise<readonly string[]>;
  openDatabase(databaseName: string): Promise<AccountNativeSqliteDatabase>;
}>;

export type AccountScopeValue = Extract<AccountScope, { kind: 'account' }>;

export class AccountNativeScopeAdapterError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'AccountNativeScopeAdapterError';
    this.code = code;
    delete this.stack;
  }
}

export function kindOf(value: unknown): string {
  return value instanceof Error ? value.name : typeof value;
}

export function codeOf(value: unknown): string {
  const raw = typeof value === 'object' && value !== null && 'code' in value
    ? (value as { code: unknown }).code
    : null;
  return typeof raw === 'string' && /^[\w/-]{1,80}$/.test(raw) ? raw : kindOf(value);
}

export function accountScopeOf(uid: string): AccountScopeValue {
  return Object.freeze({ kind: 'account' as const, uid, scopeKey: `account:${uid}` as const });
}

export function artifactSelector(plan: V2StoragePlan, id: string): string {
  const artifact = plan.artifacts.find((candidate) => candidate.id === id);
  if (artifact === undefined) throw new AccountNativeScopeAdapterError('account_native_scope_plan_invalid');
  return artifact.selector;
}

export function databaseFamilySelectors(plan: V2StoragePlan): readonly string[] {
  return Object.freeze(['main', 'wal', 'shm', 'journal'].map((suffix) => artifactSelector(
    plan,
    `v2.${plan.identity.kind}.db.${suffix}`,
  )));
}

export async function planFor(
  manifest: AccountNativeStorageManifest,
  scope: AccountScopeValue,
  lineage: number,
  digest: (value: string) => Promise<string>,
): Promise<V2StoragePlan> {
  return planV2StorageArtifacts(manifest, await deriveV2StorageIdentity(scope, lineage, digest));
}

/** Линия области в SecureStore: `{"v":1,"value":N,"state":"active"|"erased_empty"}`. */
export function encodeLineage(value: number, state: 'active' | 'erased_empty'): string {
  return JSON.stringify({ v: 1, value, state });
}

export async function readLineageRecord(
  secure: AccountNativeSecureStore,
  selector: string,
): Promise<AccountLineageObservation> {
  let raw: string | null;
  try {
    raw = await secure.get(selector);
  } catch (error) {
    console.warn(`${ACCOUNT_V2_LOG} storage lineage_unreadable kind=${kindOf(error)}`);
    return Object.freeze({ kind: 'unreadable' });
  }
  if (raw === null) return Object.freeze({ kind: 'absent' });
  try {
    const parsed = JSON.parse(raw) as { v?: unknown; value?: unknown; state?: unknown };
    if (parsed.v === 1 && Number.isSafeInteger(parsed.value) && (parsed.value as number) > 0
      && (parsed.state === 'active' || parsed.state === 'erased_empty')) {
      return Object.freeze({ kind: 'stored', value: parsed.value as number, state: parsed.state });
    }
  } catch (error) {
    console.warn(`${ACCOUNT_V2_LOG} storage lineage_parse_failed kind=${kindOf(error)}`);
    return Object.freeze({ kind: 'malformed' });
  }
  console.warn(`${ACCOUNT_V2_LOG} storage lineage_shape_invalid`);
  return Object.freeze({ kind: 'malformed' });
}

/** Простая очередь по ключу: открытие и стирание одной области (по хэшу uid) не пересекаются. */
export function createKeyedMutex(): <T>(key: string, work: () => Promise<T>) => Promise<T> {
  const tails = new Map<string, Promise<unknown>>();
  return <T>(key: string, work: () => Promise<T>): Promise<T> => {
    const previous = tails.get(key) ?? Promise.resolve();
    const next = previous.then(work, work);
    const tail = next.catch((error: unknown) => {
      // зачем: ошибку отдаёт вызывающему `next`; хвост очереди только не должен её терять молча.
      console.warn(`${ACCOUNT_V2_LOG} storage mutex_step_failed code=${codeOf(error)}`);
    });
    tails.set(key, tail);
    void tail.then(() => { if (tails.get(key) === tail) tails.delete(key); });
    return next;
  };
}
