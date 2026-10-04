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
