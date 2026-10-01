import type { AccountScope } from '../account_session';
import type { ScopeStorageAdapter, ScopeStorageConnection } from '../account_scope_store';
import {
  validateAccountNativeStorageManifest,
  type AccountNativeStorageManifest,
  type V2StoragePlan,
} from '../native_storage_manifest';
import {
  provisionOrReopenV2,
  type AccountNativeKeyPolicy,
  type AccountNativeKeyRead,
  type AccountNativeProvisionCandidate,
  type AccountNativeProvisionPorts,
} from './account_native_provisioner';
import { createAccountSqliteLeaseBinding } from './account_sqlite_lease_binding';
import type { AccountSqliteColumn, AccountSqliteRow } from './account_sqlite_scope_connection';
import {
  ACCOUNT_V2_LOG as LOG,
  AccountNativeScopeAdapterError,
  accountScopeOf,
  artifactSelector,
  codeOf,
  createKeyedMutex,
  encodeLineage,
  kindOf,
  planFor,
  readLineageRecord,
  type AccountNativeEnvironment,
  type AccountNativeProvisionLock,
  type AccountNativeSqliteDatabase,
  type AccountScopeValue,
} from './account_native_environment';
import { createAccountNativeScopeEraser, parseRetirementMarker } from './account_native_scope_erase';

/*
 * Account V2, Пакет 6C (TG-88837487B247) — адаптер хранилища области на телефоне.
 *
 * зачем: тонкий слой над уже принятыми частями — provisionOrReopenV2 (решение
 * «создать / открыть / карантин»), SQLCipher-соединение области с арендой
 * (account_sqlite_scope_connection + lease_binding) и патч expo-sqlite 16.0.10.
 * Сам ничего не решает: любая неясность (битый ключ, чужая схема, нечитаемая
 * линия) → лог `[ACCOUNT-V2]` и отказ открыть; клиент тогда просто не пишет.
 * Тихого пересоздания базы нет (это требование манифеста V2).
 *
 * Открытие и стирание одной области идут через одну очередь (по хэшу uid),
 * а файл базы дополнительно держит нативная провиженинг-блокировка патча.
 */

export type AccountNativeScopeAdapter = ScopeStorageAdapter & Readonly<{
  /**
   * uid областей с незаконченным стиранием (найдена метка вывода из строя).
   * зачем (ревью 6B, P2): при испорченной защёлке это единственный след
   * «дочистить», который не лежит в самой защёлке. Никогда не отклоняется.
   * knownUids (ревью 6C, P2): uid, известные процессу (текущий, удалённые) —
   * их метка проверяется даже когда файлов семейства уже нет (сбой между §5.5 и §5.7).
   */
  discoverPendingEraseUids(knownUids?: readonly string[]): Promise<readonly string[]>;
  /**
   * Пакет 6E: сколько семейств файлов последнее обнаружение не смогло приписать uid
   * (нет читаемой метки и uid неизвестен). Такие области стереть нельзя — только в лог.
   */
  lastDiscoveryUnattributed(): number;
}>;

// зачем (ревью 6C, P2): любой член семейства (main/-wal/-shm/-journal) — след области.
const DATABASE_NAME = /^accounts-v2-a-([0-9a-f]{64})-([1-9][0-9]{0,15})\.db(?:-wal|-shm|-journal)?$/;
const KEY_HEX = /^[0-9a-f]{64}$/;

type Lease = Readonly<{ lock: AccountNativeProvisionLock }>;
type Candidate = AccountNativeProvisionCandidate<AccountNativeSqliteDatabase>;

function toColumns(parameters: readonly AccountSqliteColumn[]): (null | number | string)[] {
  return [...parameters];
}

function changesOf(value: unknown): Readonly<{ changes: number }> {
  const changes = typeof value === 'object' && value !== null && 'changes' in value
    ? (value as { changes: unknown }).changes
    : null;
  if (!Number.isSafeInteger(changes) || (changes as number) < 0) {
    throw new AccountNativeScopeAdapterError('account_native_scope_run_result_invalid');
  }
  return Object.freeze({ changes: changes as number });
}

/** Ключ на том же соединении, затем свёртка соединения в кандидата провиженера. */
async function keyedCandidate(database: AccountNativeSqliteDatabase, keyHex: string): Promise<Candidate> {
  // зачем: аренда — первым делом; без неё открытое соединение нечем было бы закрыть.
  let leaseBinding: ReturnType<typeof createAccountSqliteLeaseBinding>;
  try {
    leaseBinding = createAccountSqliteLeaseBinding(database.nativeDatabase);
  } catch (error) {
    // зачем (ревью 6C, P3): сборка без патча аренды — базу уже открыли, закрываем обычным путём.
    console.warn(`${LOG} storage lease_binding_failed code=${codeOf(error)}`);
    try {
      if (typeof database.closeAsync === 'function') await database.closeAsync();
      else console.warn(`${LOG} storage lease_binding_close_unavailable`);
    } catch (closeError) {
      console.warn(`${LOG} storage lease_binding_close_failed kind=${kindOf(closeError)}`);
    }
    throw new AccountNativeScopeAdapterError('account_native_scope_lease_unsupported');
  }
  try {
    // keyHex уже проверен провиженером: ровно 64 строчных hex — подстановка безопасна.
    await database.execAsync(`PRAGMA key = "x'${keyHex}'"`);
  } catch (error) {
    console.warn(`${LOG} storage key_apply_failed kind=${kindOf(error)}`);
    try {
      leaseBinding.revoke();
      await leaseBinding.close();
    } catch (closeError) {
      console.warn(`${LOG} storage key_apply_close_failed code=${codeOf(closeError)}`);
    }
    throw new AccountNativeScopeAdapterError('account_native_scope_key_apply_failed');
  }
  const sql = Object.freeze({
    run: async (source: string, parameters: readonly AccountSqliteColumn[]) => (
      changesOf(await database.runAsync(source, toColumns(parameters)))
    ),
    getFirst: async (source: string, parameters: readonly AccountSqliteColumn[]) => (
      await database.getFirstAsync(source, toColumns(parameters)) as AccountSqliteRow | null
    ),
    getAll: async (source: string, parameters: readonly AccountSqliteColumn[]) => (
      await database.getAllAsync(source, toColumns(parameters)) as readonly AccountSqliteRow[]
    ),
  });
  return Object.freeze({
    handle: database,
    scopeConnectionBundle: Object.freeze({ sql, leaseBinding }),
    revoke: (): undefined => leaseBinding.revoke(),
    close: (): Promise<void> => leaseBinding.close(),
  });
}

function nonEmptyStringField(row: unknown, field: string): boolean {
  if (typeof row !== 'object' || row === null) return false;
  const value = (row as Record<string, unknown>)[field];
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Защита семейства файлов под удерживаемой блокировкой (только iOS-блокировка несёт protectFamily).
 * Android: поля нет — ничего не делаем, поведение прежнее.
 */
async function protectFamilyUnderLease(lease: object, stage: 'before_open' | 'after_proof'): Promise<void> {
  const protect = (lease as Partial<Lease>).lock?.protectFamily;
  if (protect === undefined) return;
  try {
    await protect();
  } catch (error) {
    console.warn(`${LOG} storage family_protection_failed stage=${stage} code=${codeOf(error)}`);
    throw new AccountNativeScopeAdapterError('account_native_scope_family_protection_failed');
  }
  console.log(`${LOG} storage family_protected stage=${stage}`);
}

function createPorts(
  env: AccountNativeEnvironment,
  manifest: AccountNativeStorageManifest,
): AccountNativeProvisionPorts<AccountNativeSqliteDatabase> {
  const assertPolicy = (policy: AccountNativeKeyPolicy): void => {
    if (policy.service !== manifest.secureStoreService) {
      throw new AccountNativeScopeAdapterError('account_native_scope_key_policy_mismatch');
    }
  };
  const open = async (lease: object, plan: V2StoragePlan, keyHex: string): Promise<Candidate> => {
    // зачем (Пакет 6H, iOS): каталог accounts-v2 получает защиту и исключение из бэкапа
    // ДО создания файлов — новые файлы наследуют класс защиты каталога.
    await protectFamilyUnderLease(lease, 'before_open');
    const database = await env.openDatabase(artifactSelector(plan, `v2.${plan.identity.kind}.db.main`));
    return keyedCandidate(database, keyHex);
  };
  return Object.freeze({
    acquireDurableProvisionLease: async (plan: V2StoragePlan): Promise<Lease> => Object.freeze({
      lock: await env.acquireProvisionLock(artifactSelector(plan, `v2.${plan.identity.kind}.db.main`)),
    }),
    readLineage: (_lease: object, selector: string) => readLineageRecord(env.secure, selector),
    readKey: async (_lease: object, selector: string, policy: AccountNativeKeyPolicy): Promise<AccountNativeKeyRead> => {
      assertPolicy(policy);
      let raw: string | null;
      try {
        raw = await env.secure.get(selector);
      } catch (error) {
        console.warn(`${LOG} storage key_unreadable kind=${kindOf(error)}`);
        return Object.freeze({ kind: 'unreadable' });
      }
      if (raw === null) return Object.freeze({ kind: 'absent' });
      if (!KEY_HEX.test(raw)) {
        console.warn(`${LOG} storage key_malformed`);
        return Object.freeze({ kind: 'malformed' });
      }
      return Object.freeze({ kind: 'stored', value: raw });
    },
    readRetirementMarker: async (_lease: object, selector: string) => {
      try {
        return await env.secure.get(selector) === null ? 'absent' : 'present';
      } catch (error) {
        console.warn(`${LOG} storage marker_unreadable kind=${kindOf(error)}`);
        return 'unreadable';
      }
    },
    inspectDatabaseFamily: async (_lease: object, selectors: readonly string[]) => {
      try {
        const present = await Promise.all(selectors.map((name) => env.fileExists(name)));
        return present.some(Boolean) ? 'present' : 'absent';
      } catch (error) {
        console.warn(`${LOG} storage family_unreadable kind=${kindOf(error)}`);
        return 'unreadable';
      }
    },
    generateKeyBytes: () => env.randomKeyBytes(),
    writeKey: async (_lease: object, selector: string, keyHex: string, policy: AccountNativeKeyPolicy) => {
      assertPolicy(policy);
      await env.secure.set(selector, keyHex);
    },
    createNew: (lease: object, plan: V2StoragePlan, keyHex: string) => open(lease, plan, keyHex),
    openExisting: (lease: object, plan: V2StoragePlan, keyHex: string) => open(lease, plan, keyHex),
    proveKeyedSameConnection: async (lease: object, candidate: Candidate) => {
      try {
        const cipher = await candidate.handle.getFirstAsync('PRAGMA cipher_version', []);
        if (!nonEmptyStringField(cipher, 'cipher_version')) {
          // зачем: без SQLCipher база легла бы на диск открытым текстом — не открываем.
          console.warn(`${LOG} storage proof_failed reason=cipher_missing`);
          return false;
        }
        // Чужой ключ даёт «file is not a database» именно здесь.
        await candidate.handle.getFirstAsync('SELECT count(*) AS table_count FROM sqlite_schema', []);
      } catch (error) {
        console.warn(`${LOG} storage proof_failed kind=${kindOf(error)}`);
        return false;
      }
      try {
        // зачем (Пакет 6H, iOS): после открытия файлы семейства уже на диске — защищаем
        // и их (с обратным чтением в Swift). Не вышло — база не открывается вовсе.
        await protectFamilyUnderLease(lease, 'after_proof');
      } catch (error) {
        console.warn(`${LOG} storage proof_failed reason=family_protection code=${codeOf(error)}`);
        return false;
      }
      return true;
    },
    writeActiveLineage: async (_lease: object, selector: string, lineage: number) => {
      await env.secure.set(selector, encodeLineage(lineage, 'active'));
    },
    releaseDurableProvisionLease: async (lease: object) => {
      await (lease as Lease).lock.release();
    },
  });
}

/** Линия для открытия: сохранённая, иначе 1 (провиженер сам отправит битую в карантин). */
async function lineageForOpen(
  env: AccountNativeEnvironment,
  manifest: AccountNativeStorageManifest,
  scope: AccountScopeValue,
): Promise<number> {
  const base = await planFor(manifest, scope, 1, env.digestSha256);
  const stored = await readLineageRecord(env.secure, artifactSelector(base, 'v2.account.lineage'));
  if (stored.kind === 'stored') return stored.value;
  if (stored.kind !== 'absent') console.warn(`${LOG} storage open_lineage_${stored.kind}`);
  return 1;
}

async function hashOf(env: AccountNativeEnvironment, manifest: AccountNativeStorageManifest, scope: AccountScopeValue): Promise<string> {
  return (await planFor(manifest, scope, 1, env.digestSha256)).identity.hash;
}

export function createAccountNativeScopeAdapter(env: AccountNativeEnvironment): AccountNativeScopeAdapter {
  // Битый манифест — бросаем сразу: клиент поймает и честно не откроет хранилище.
  const manifest = validateAccountNativeStorageManifest(env.manifest);
  const ports = createPorts(env, manifest);
  const serial = createKeyedMutex();
  const eraser = createAccountNativeScopeEraser(env, manifest);
  let lastUnattributed = 0;

  const openAccount = async (scope: AccountScopeValue, allowRecovery: boolean): Promise<ScopeStorageConnection> => {
    const lineage = await lineageForOpen(env, manifest, scope);
    const plan = await planFor(manifest, scope, lineage, env.digestSha256);
    const result = await provisionOrReopenV2(manifest, plan, ports);
    if (result.outcome === 'opened') {
      console.log(`${LOG} storage opened decision=${result.decision} hydrate=${result.requiresHydration} lineage=${lineage}`);
      return result.handle;
    }
    console.warn(`${LOG} storage open_attention decision=${result.decision} code=${result.code} cleanup=${result.cleanup !== null}`);
    if (result.cleanup !== null) {
      const cleaned = await result.cleanup.retryCleanup();
      console.warn(`${LOG} storage open_cleanup outcome=${cleaned.outcome}`);
    }
    if (result.decision === 'recovery_required' && allowRecovery) {
      // зачем (ревью 6C, P2): метка вывода из строя = незаконченное стирание этой области.
      // Без дочистки открытие отказывало бы вечно. Дочищаем (мы уже в очереди области)
      // и пробуем открыть ОДИН раз; ошибка стирания уходит вызывающему.
      console.warn(`${LOG} storage open_recovery erase_then_retry`);
      await eraser.erase(scope);
      return openAccount(scope, false);
    }
    throw new AccountNativeScopeAdapterError(result.code);
  };

  return Object.freeze({
    open: async (scope: AccountScope): Promise<ScopeStorageConnection> => {
      if (scope.kind !== 'account') {
        // зачем: гостевые области V2 клиентом пока не используются — не создаём их файлов.
        console.warn(`${LOG} storage open_rejected reason=guest_scope`);
        throw new AccountNativeScopeAdapterError('account_native_scope_guest_unsupported');
      }
      const hash = await hashOf(env, manifest, scope);
      return serial(hash, () => openAccount(scope, true));
    },
    eraseClosedAccountScope: async (scope: AccountScopeValue) => {
      const hash = await hashOf(env, manifest, scope);
      return serial(hash, () => eraser.erase(scope));
    },
    discoverPendingEraseUids: async (knownUids: readonly string[] = []): Promise<readonly string[]> => {
      let names: readonly string[] = [];
      try {
        names = await env.listFileNames();
      } catch (error) {
        // зачем: без списка файлов ещё можно проверить известные uid — не выходим.
        console.warn(`${LOG} storage discover_list_failed kind=${kindOf(error)}`);
      }
      const known = new Map<string, string>();
      for (const uid of new Set(knownUids)) {
        try {
          known.set(await hashOf(env, manifest, accountScopeOf(uid)), uid);
        } catch (error) {
          console.warn(`${LOG} storage discover_known_invalid code=${codeOf(error)}`);
        }
      }
      const familyHashes = new Set(names.flatMap((name) => {
        const match = DATABASE_NAME.exec(name);
        return match === null ? [] : [match[1]];
      }));
      const uids = new Set<string>();
      let unattributed = 0;
      for (const hash of new Set([...familyHashes, ...known.keys()])) {
        try {
          const read = parseRetirementMarker(await env.secure.get(eraser.markerSelectorForHash(hash)));
          if (read.kind === 'valid') uids.add(read.marker.scopeKey.slice('account:'.length));
          else if (read.kind === 'corrupt' && known.has(hash)) uids.add(known.get(hash)!);
          else if (familyHashes.has(hash)) unattributed += 1;
        } catch (error) {
          console.warn(`${LOG} storage discover_marker_failed kind=${kindOf(error)}`);
        }
      }
      // зачем: область без читаемой метки и без известного uid не приписать (в имени только хэш) — считаем.
      lastUnattributed = unattributed;
      console.log(`${LOG} storage discovered families=${familyHashes.size} known=${known.size} pending=${uids.size} unattributed=${unattributed}`);
      return Object.freeze([...uids]);
    },
    lastDiscoveryUnattributed: (): number => lastUnattributed,
  });
}

export { accountScopeOf };
