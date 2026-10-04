/*
 * AA S2d раунд 3 (§135 ❓2 + повторное security-ревью): жизнь аварийной копии гостя A
 * после ПОДТВЕРЖДЁННОГО merge(A → B).
 *
 * Вход пишет под замком смены аккаунта метку-псевдоним {from: A, to: B, at}; копию не
 * переписывает (страницы v3 связаны хешами). Фоновое восстановление после входа
 * принимает копию A для B только по этой метке: доливает в B ТОЛЬКО отсутствующие
 * ключи (B не перезаписывается), пропускает ключи с id A в имени, пишет
 * [ACC-BACKUP-MERGE] с числами (без значений и id), удаляет копию и метку — после
 * этого копия больше не блокирует «Сменить аккаунт» (other_owner_pending).
 * Без метки (merge не подтверждён) копия A живёт: «другой аккаунт».
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  readAccountSwitchBackupMergeAlias,
  restoreAccountSwitchEmergencyBackupIfSafe,
  writeAccountSwitchBackupMergeAlias,
} from '../app/account_switch_backup_restore';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';

jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getCanonicalUserId } = require('../app/user_id_policy');

const BACKUP_KEY = 'account_switch_emergency_backup_latest_v1';
const ALIAS_KEY = 'account_switch_backup_merge_alias_v1';
const STABLE_A = '0f8fad5b-d9cb-469f-a165-70867728950e';
const STABLE_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const STABLE_C = '16fd2706-8baf-433b-82eb-8c7fada847da';

function guestBackup(): string {
  return JSON.stringify({
    version: 2,
    createdAt: Date.now(),
    reason: 'sign_in_presync_not_uploaded_before_swap',
    stableId: STABLE_A,
    pairs: [
      ['xp_total', '500'],
      ['streak_count', '7'],
      ['lesson_progress_3', '{"done":true}'],
      [`shards_delta_queue_v2:${STABLE_A}`, '[{"type":"earn"}]'],
    ],
  });
}

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };
let warn: jest.SpyInstance;

beforeEach(() => {
  storage.__reset?.();
  __resetAccountGenerationForTests();
  beginAccountGeneration(STABLE_B);
  (getCanonicalUserId as jest.Mock).mockResolvedValue(STABLE_B);
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => warn.mockRestore());

function mergeLines(): string[] {
  return warn.mock.calls.map((c) => String(c[0])).filter((l) => l.startsWith('[ACC-BACKUP-MERGE]'));
}

test('confirmed merge: the guest copy fills ONLY missing keys of B, nothing in B is overwritten', async () => {
  await AsyncStorage.setItem(BACKUP_KEY, guestBackup());
  await AsyncStorage.setItem('xp_total', '900'); // уже есть у B — не трогаем
  await writeAccountSwitchBackupMergeAlias(STABLE_A, STABLE_B);

  const result = await restoreAccountSwitchEmergencyBackupIfSafe();

  expect(result).toMatchObject({ status: 'restored', restoredKeys: 2, skippedExisting: 1 });
  expect(await AsyncStorage.getItem('xp_total')).toBe('900');
  expect(await AsyncStorage.getItem('streak_count')).toBe('7');
  expect(await AsyncStorage.getItem('lesson_progress_3')).toBe('{"done":true}');
  // Ключ, названный по id гостя A, в B не переносится.
  expect(await AsyncStorage.getItem(`shards_delta_queue_v2:${STABLE_A}`)).toBeNull();
  const line = mergeLines().find((l) => l.includes('restored'));
  expect(line).toContain('"restoredKeys":2');
  expect(line).toContain('"skippedExisting":1');
  expect(line).toContain('"skippedForeignKeys":1');
  expect(line).not.toContain(STABLE_A);
  expect(line).not.toContain(STABLE_B);
});

test('after the merge restore the copy no longer blocks «Сменить аккаунт» (root and alias removed)', async () => {
  await AsyncStorage.setItem(BACKUP_KEY, guestBackup());
  await writeAccountSwitchBackupMergeAlias(STABLE_A, STABLE_B);
  await restoreAccountSwitchEmergencyBackupIfSafe();

  // other_owner_pending возникает только когда корень копии принадлежит другому аккаунту.
  expect(await AsyncStorage.getItem(BACKUP_KEY)).toBeNull();
  expect(await AsyncStorage.getItem(ALIAS_KEY)).toBeNull();
  await expect(readAccountSwitchBackupMergeAlias()).resolves.toBeNull();
});

test('merge NOT confirmed (no alias): the guest copy stays alive for its owner', async () => {
  await AsyncStorage.setItem(BACKUP_KEY, guestBackup());
  await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({ status: 'different_account' });
  expect(await AsyncStorage.getItem(BACKUP_KEY)).not.toBeNull();
  expect(await AsyncStorage.getItem('streak_count')).toBeNull();
});

test('an alias for another target or another source is ignored', async () => {
  await AsyncStorage.setItem(BACKUP_KEY, guestBackup());
  await writeAccountSwitchBackupMergeAlias(STABLE_A, STABLE_C);
  await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({ status: 'different_account' });
  await writeAccountSwitchBackupMergeAlias(STABLE_C, STABLE_B);
  await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({ status: 'different_account' });
  expect(await AsyncStorage.getItem(BACKUP_KEY)).not.toBeNull();
});

test('a stale alias without a copy is cleaned up', async () => {
  await writeAccountSwitchBackupMergeAlias(STABLE_A, STABLE_B);
  await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({ status: 'no_backup' });
  expect(await AsyncStorage.getItem(ALIAS_KEY)).toBeNull();
});

// ── Раунд 4 (L-R3-1): конфликт графа Learning V2 при доливании по псевдониму ──
test('L-R3-1: a Learning V2 graph conflict does not leave an eternal copy — graph keys are skipped, the rest is restored, copy and alias removed', async () => {
  const backup = JSON.stringify({
    version: 2,
    createdAt: Date.now(),
    reason: 'sign_in_presync_not_uploaded_before_swap',
    stableId: STABLE_A,
    pairs: [
      ['streak_count', '7'],
      ['v2:outbox:shared-entry', 'value-from-guest'],
      ['v2:outbox:guest-only', 'guest-only-value'],
    ],
  });
  await AsyncStorage.setItem(BACKUP_KEY, backup);
  await AsyncStorage.setItem('v2:outbox:shared-entry', 'value-of-b');
  await writeAccountSwitchBackupMergeAlias(STABLE_A, STABLE_B);

  const result = await restoreAccountSwitchEmergencyBackupIfSafe();

  expect(result).toMatchObject({ status: 'restored', restoredKeys: 1 });
  expect(await AsyncStorage.getItem('v2:outbox:shared-entry')).toBe('value-of-b');
  // Половину чужого графа в B не ставим: при конфликте пропускается весь граф копии.
  expect(await AsyncStorage.getItem('v2:outbox:guest-only')).toBeNull();
  expect(await AsyncStorage.getItem('streak_count')).toBe('7');
  expect(await AsyncStorage.getItem(BACKUP_KEY)).toBeNull();
  expect(await AsyncStorage.getItem(ALIAS_KEY)).toBeNull();
  const line = mergeLines().find((l) => l.includes('restored'));
  expect(line).toContain('"skippedGraphKeys":2');
  expect(line).toContain('"graphConflict":true');
});

test('L-R3-1: without an alias a graph conflict still keeps the copy (own-account restore unchanged)', async () => {
  (getCanonicalUserId as jest.Mock).mockResolvedValue(STABLE_A);
  __resetAccountGenerationForTests();
  beginAccountGeneration(STABLE_A);
  await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify({
    version: 2, createdAt: Date.now(), reason: 'x', stableId: STABLE_A,
    pairs: [['v2:outbox:shared-entry', 'value-from-copy']],
  }));
  await AsyncStorage.setItem('v2:outbox:shared-entry', 'different');
  await expect(restoreAccountSwitchEmergencyBackupIfSafe()).resolves.toEqual({ status: 'invalid' });
  expect(await AsyncStorage.getItem(BACKUP_KEY)).not.toBeNull();
});

test('L-R3-3 support: restore can give up quickly when the account transition lock is busy', async () => {
  const generation = require('../app/account_generation');
  await AsyncStorage.setItem(BACKUP_KEY, guestBackup());
  await writeAccountSwitchBackupMergeAlias(STABLE_A, STABLE_B);
  let release!: () => void;
  let started!: () => void;
  const startedPromise = new Promise<void>((resolve) => { started = resolve; });
  const held = generation.withAccountTransitionLock(() => new Promise<void>((resolve) => { release = resolve; started(); }));
  await startedPromise;
  await expect(restoreAccountSwitchEmergencyBackupIfSafe(undefined, { lockTimeoutMs: 20 })).resolves.toEqual({ status: 'lock_busy' });
  release();
  await held;
  expect(await AsyncStorage.getItem(BACKUP_KEY)).not.toBeNull();
});

// L-R3-1 для постраничной копии v3 (основной формат новых копий).
test('L-R3-1 (v3): graph conflict under the alias skips the whole graph, restores the rest, removes copy, pages and alias', async () => {
  const { canonicalJsonV1, hashCanonicalBody, utf8ByteLengthV1 } = require('../modules/learning-v2/policies/decision_registry');
  const backupId = 'r4-v3-conflict';
  const pairs: [string, string][] = [
    ['streak_count', '7'],
    ['v2:outbox:guest-only', 'guest-only-value'],
    ['v2:outbox:shared-entry', 'value-from-guest'],
  ];
  const pageBody = {
    schemaVersion: 'account-switch-emergency-backup-page.v1' as const,
    backupId,
    stableId: STABLE_A,
    pageIndex: 0,
    previousPageFingerprint: null,
    pairs,
  };
  const pageFingerprint = hashCanonicalBody(pageBody);
  await AsyncStorage.setItem(`account_switch_emergency_backup_page_v1:${backupId}:0`, canonicalJsonV1({ ...pageBody, pageFingerprint }));
  const body = {
    version: 3 as const,
    schemaVersion: 'account-switch-emergency-backup.v3' as const,
    backupId,
    stableId: STABLE_A,
    createdAt: Date.now(),
    reason: 'sign_in_presync_not_uploaded_before_swap',
    pageCount: 1,
    pairCount: pairs.length,
    totalUtf8Bytes: pairs.reduce((total, [key, value]) => total + utf8ByteLengthV1(key) + utf8ByteLengthV1(value), 0),
    lastPageFingerprint: pageFingerprint,
    requiredSessionReceiptCount: 0,
  };
  await AsyncStorage.setItem(BACKUP_KEY, canonicalJsonV1({ ...body, manifestFingerprint: hashCanonicalBody(body) }));
  await AsyncStorage.setItem('v2:outbox:shared-entry', 'value-of-b');
  await writeAccountSwitchBackupMergeAlias(STABLE_A, STABLE_B);

  const result = await restoreAccountSwitchEmergencyBackupIfSafe();

  expect(result).toMatchObject({ status: 'restored', restoredKeys: 1 });
  expect(await AsyncStorage.getItem('v2:outbox:shared-entry')).toBe('value-of-b');
  expect(await AsyncStorage.getItem('v2:outbox:guest-only')).toBeNull();
  expect(await AsyncStorage.getItem('streak_count')).toBe('7');
  expect(await AsyncStorage.getItem(BACKUP_KEY)).toBeNull();
  expect(await AsyncStorage.getItem(`account_switch_emergency_backup_page_v1:${backupId}:0`)).toBeNull();
  expect(await AsyncStorage.getItem(ALIAS_KEY)).toBeNull();
  expect(mergeLines().find((l) => l.includes('restored'))).toContain('"skippedGraphKeys":2');
});
