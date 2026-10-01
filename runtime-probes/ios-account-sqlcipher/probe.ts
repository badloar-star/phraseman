import { createAccountScopeStore, type AccountScopeStore } from '../../modules/account-session-v2/account_scope_store';
import type { SessionFence } from '../../modules/account-session-v2/account_session';
import {
  codeOf,
  type AccountNativeEnvironment,
  type AccountNativeProvisionLock,
} from '../../modules/account-session-v2/native/account_native_environment';
import { createAccountNativeScopeAdapter } from '../../modules/account-session-v2/native/account_native_scope_adapter';

/*
 * Account V2, Пакет 6H (OD17) — проба хранилища области на iPhone владельца.
 *
 * зачем: Swift-часть патча expo-sqlite (flock-блокировка, аренда, защита
 * семейства файлов) и SQLCipher на iOS ни разу не запускались. Проба гоняет
 * НАСТОЯЩИЙ путь — адаптер области + провиженер + SecureStore(Keychain) — на
 * синтетической области (не аккаунт владельца, без сервера), фаза за фазой:
 *
 *   write  — создать область, записать маркер, НЕ закрывать (владелец затем
 *            выгружает приложение свайпом — это «убийство процесса»);
 *   verify — после перезапуска: переоткрыть, прочитать маркер, закрыть;
 *   erase  — стереть область по §5 и проверить, что следов не осталось.
 *
 * Квитанция — только коды и числа: ни ключа, ни uid, ни идентификаторов
 * устройства. Логика чистая (порты внедряются) — её проверяет jest.
 */

export const IOS_PROOF_LOG = '[ACCOUNT-V2-IOS-PROOF]';
export const IOS_PROOF_SYNTHETIC_UID = 'account-v2-ios-proof-synthetic-uid-v1';
export const IOS_PROOF_CANARY_KEY = 'ios_proof_canary_v1';
const SCOPE = Object.freeze({
  kind: 'account' as const,
  uid: IOS_PROOF_SYNTHETIC_UID,
  scopeKey: `account:${IOS_PROOF_SYNTHETIC_UID}` as const,
});
const SQLITE_PLAINTEXT_HEADER = 'SQLite format 3\u0000';
const DATABASE_FAMILY = /^accounts-v2-a-[0-9a-f]{64}-[1-9][0-9]*\.db(?:-wal|-shm|-journal)?$/;

export type IosProofPhase = 'write' | 'verify' | 'erase';

export type IosProofStep = Readonly<{ id: string; ok: boolean; value: string }>;

export type IosProofReceipt = Readonly<{
  phase: IosProofPhase;
  verdict: 'pass' | 'fail';
  steps: readonly IosProofStep[];
  text: string;
}>;

export type IosProofPorts = Readonly<{
  /** Настоящее окружение (createExpoAccountNativeEnvironment) или null. */
  environment: AccountNativeEnvironment | null;
  /** Первые 16 байт файла базы; null — файла нет/не читается. */
  readDatabaseHeader(databaseName: string): Promise<Uint8Array | null>;
  now(): number;
  /** Версия ОС/сборки для квитанции (без идентификаторов устройства). */
  platformLabel: string;
}>;

type Observation = {
  protectOk: number;
  protectFailed: number;
  lockAcquired: number;
  lockReleased: number;
  databaseName: string | null;
};

// зачем: фаза write оставляет соединение открытым до выгрузки приложения —
// держим ссылку на уровне модуля, чтобы сборщик мусора не закрыл его раньше.
let heldOpenStore: AccountScopeStore | null = null;
let fenceGeneration = 0;

function nextFence(): SessionFence {
  fenceGeneration += 1;
  return Object.freeze({ scopeKey: SCOPE.scopeKey, uid: SCOPE.uid, generation: fenceGeneration, nonce: `ios-proof-${fenceGeneration}` });
}

function observe(env: AccountNativeEnvironment, seen: Observation): AccountNativeEnvironment {
  return Object.freeze({
    ...env,
    acquireProvisionLock: async (databaseName: string): Promise<AccountNativeProvisionLock> => {
      const lock = await env.acquireProvisionLock(databaseName);
      seen.lockAcquired += 1;
      const release = async () => { await lock.release(); seen.lockReleased += 1; };
      const protect = lock.protectFamily;
      if (protect === undefined) return Object.freeze({ release });
      return Object.freeze({
        release,
        protectFamily: async () => {
          try {
            await protect();
            seen.protectOk += 1;
          } catch (error) {
            seen.protectFailed += 1;
            throw error;
          }
        },
      });
    },
    openDatabase: (databaseName: string) => {
      seen.databaseName = databaseName;
      return env.openDatabase(databaseName);
    },
  });
}

function headerState(bytes: Uint8Array | null): 'encrypted' | 'plaintext' | 'unreadable' {
  if (bytes === null || bytes.length < 16) return 'unreadable';
  const prefix = String.fromCharCode(...Array.from(bytes.slice(0, 16)));
  return prefix === SQLITE_PLAINTEXT_HEADER ? 'plaintext' : 'encrypted';
}

function canaryWrittenAt(value: unknown): number | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as { v?: unknown; writtenAtMs?: unknown };
  return record.v === 1 && Number.isSafeInteger(record.writtenAtMs) ? record.writtenAtMs as number : null;
}

function receipt(phase: IosProofPhase, steps: readonly IosProofStep[], platformLabel: string): IosProofReceipt {
  const verdict = steps.length > 0 && steps.every((step) => step.ok) ? 'pass' : 'fail';
  const lines = [
    `${IOS_PROOF_LOG} phase=${phase} verdict=${verdict} platform=${platformLabel}`,
    ...steps.map((step) => `${IOS_PROOF_LOG}   ${step.ok ? 'OK  ' : 'FAIL'} ${step.id}=${step.value}`),
  ];
  for (const line of lines) console.log(line);
  return Object.freeze({ phase, verdict, steps: Object.freeze([...steps]), text: lines.join('\n') });
}

async function checkHeader(ports: IosProofPorts, seen: Observation, steps: IosProofStep[]): Promise<void> {
  if (seen.databaseName === null) {
    steps.push({ id: 'db_header', ok: false, value: 'no_database_opened' });
    return;
  }
  let bytes: Uint8Array | null;
  try {
    bytes = await ports.readDatabaseHeader(seen.databaseName);
  } catch (error) {
    console.warn(`${IOS_PROOF_LOG} header_read_failed code=${codeOf(error)}`);
    bytes = null;
  }
  const state = headerState(bytes);
  // зачем: у SQLCipher первые 16 байт — случайная соль; «SQLite format 3» = база открытым текстом.
  steps.push({ id: 'db_header', ok: state === 'encrypted', value: state });
}

function pushProtection(seen: Observation, steps: IosProofStep[], minimumCalls: number): void {
  steps.push({
    id: 'family_protection',
    ok: seen.protectFailed === 0 && seen.protectOk >= minimumCalls,
    value: `ok=${seen.protectOk} failed=${seen.protectFailed}`,
  });
}

async function runWrite(ports: IosProofPorts, env: AccountNativeEnvironment, steps: IosProofStep[]): Promise<void> {
  const seen: Observation = { protectOk: 0, protectFailed: 0, lockAcquired: 0, lockReleased: 0, databaseName: null };
  const familyBefore = (await env.listFileNames()).filter((name) => DATABASE_FAMILY.test(name)).length;
  steps.push({ id: 'family_files_before', ok: true, value: String(familyBefore) });
  const store = createAccountScopeStore(createAccountNativeScopeAdapter(observe(env, seen)));
  const handle = await store.open(SCOPE, nextFence());
  steps.push({ id: 'scope_open', ok: true, value: 'opened' });
  const previous = canaryWrittenAt((await handle.readRecord(IOS_PROOF_CANARY_KEY))?.value);
  steps.push({ id: 'canary_before', ok: true, value: previous === null ? 'absent' : 'present' });
  const writtenAtMs = ports.now();
  await handle.withTransaction(async (tx) => {
    await tx.putRecord({ key: IOS_PROOF_CANARY_KEY, value: { v: 1, writtenAtMs } });
  });
  const readback = canaryWrittenAt((await handle.readRecord(IOS_PROOF_CANARY_KEY))?.value);
  steps.push({ id: 'canary_readback', ok: readback === writtenAtMs, value: readback === writtenAtMs ? 'match' : 'mismatch' });
  steps.push({ id: 'lock_released_after_open', ok: seen.lockAcquired === 1 && seen.lockReleased === 1, value: `acquired=${seen.lockAcquired} released=${seen.lockReleased}` });
  pushProtection(seen, steps, 2);
  await checkHeader(ports, seen, steps);
  heldOpenStore = store;
  steps.push({ id: 'connection_left_open', ok: true, value: 'swipe_kill_app_now' });
}

async function runVerify(ports: IosProofPorts, env: AccountNativeEnvironment, steps: IosProofStep[]): Promise<void> {
  if (heldOpenStore !== null) {
    // зачем: verify в том же процессе ничего не доказывает про перезапуск — честно валим.
    steps.push({ id: 'process_restarted', ok: false, value: 'same_process_kill_app_first' });
    return;
  }
  steps.push({ id: 'process_restarted', ok: true, value: 'yes' });
  const seen: Observation = { protectOk: 0, protectFailed: 0, lockAcquired: 0, lockReleased: 0, databaseName: null };
  const familyBefore = (await env.listFileNames()).filter((name) => DATABASE_FAMILY.test(name)).length;
  steps.push({ id: 'family_files_before', ok: familyBefore > 0, value: String(familyBefore) });
  const store = createAccountScopeStore(createAccountNativeScopeAdapter(observe(env, seen)));
  const fence = nextFence();
  const handle = await store.open(SCOPE, fence);
  steps.push({ id: 'scope_reopen', ok: true, value: 'opened' });
  const writtenAtMs = canaryWrittenAt((await handle.readRecord(IOS_PROOF_CANARY_KEY))?.value);
  const now = ports.now();
  steps.push({
    id: 'canary_after_kill',
    ok: writtenAtMs !== null && writtenAtMs <= now,
    value: writtenAtMs === null ? 'absent' : `present_age_s=${Math.max(0, Math.round((now - writtenAtMs) / 1000))}`,
  });
  pushProtection(seen, steps, 2);
  await checkHeader(ports, seen, steps);
  const closed = await store.close(fence);
  steps.push({ id: 'scope_close', ok: closed.outcome === 'closed', value: closed.outcome });
}

async function runErase(env: AccountNativeEnvironment, steps: IosProofStep[]): Promise<void> {
  if (heldOpenStore !== null) {
    steps.push({ id: 'process_restarted', ok: false, value: 'same_process_kill_app_first' });
    return;
  }
  const store = createAccountScopeStore(createAccountNativeScopeAdapter(env));
  const evidence = await store.eraseClosedAccountScope(SCOPE);
  steps.push({
    id: 'erase',
    ok: evidence.outcome === 'erased' || evidence.outcome === 'already_absent',
    value: `${evidence.outcome} records=${evidence.erasedRecordCount} evidence=${evidence.evidenceKind}`,
  });
  const familyAfter = (await env.listFileNames()).filter((name) => DATABASE_FAMILY.test(name)).length;
  // зачем: проба — единственный владелец V2-файлов в этой сборке (клиентские флаги V2 выключены).
  steps.push({ id: 'family_files_after', ok: familyAfter === 0, value: String(familyAfter) });
}

/** Прогон одной фазы. Никогда не бросает: любой сбой — шаг FAIL с кодом. */
export async function runIosAccountProofPhase(phase: IosProofPhase, ports: IosProofPorts): Promise<IosProofReceipt> {
  const steps: IosProofStep[] = [];
  console.log(`${IOS_PROOF_LOG} start phase=${phase} env=${ports.environment === null ? 'null' : 'ready'}`);
  const env = ports.environment;
  if (env === null) {
    steps.push({ id: 'environment', ok: false, value: 'unavailable_see_ACCOUNT-V2_log' });
    return receipt(phase, steps, ports.platformLabel);
  }
  steps.push({ id: 'environment', ok: true, value: 'ready' });
  try {
    if (phase === 'write') await runWrite(ports, env, steps);
    else if (phase === 'verify') await runVerify(ports, env, steps);
    else await runErase(env, steps);
  } catch (error) {
    console.warn(`${IOS_PROOF_LOG} phase_failed phase=${phase} code=${codeOf(error)}`);
    steps.push({ id: 'phase_error', ok: false, value: codeOf(error) });
  }
  return receipt(phase, steps, ports.platformLabel);
}

/** Только для тестов: сбросить «удерживаемое» соединение, как будто процесс перезапущен. */
export function simulateProcessRestartForTests(): void {
  heldOpenStore = null;
}
