/*
 * AA S2d 🔴2 (§127): потеря свежего прогресса при входе / swap_timeout_swap_presync_20000ms.
 *
 * Причины (S2c, H7-1/H7-2):
 *  - presync входа звал syncToCloud({forceNow}); при mismatch внутри
 *    ensureAuthoritativeIdentityForCloudMutation запускались adopt (стирание
 *    локального + смена stable_id) и ПОЛНОЕ восстановление чужого профиля —
 *    прямо в 20-секундном окне presync (H7-1);
 *  - тот же mismatch молча выходил, ничего не выгрузив, а presync считался
 *    успешным (H7-2);
 *  - syncToCloud при уже идущей синхронизации возвращался сразу, не дожидаясь
 *    её (cloud_sync ~2587) — ещё один ложный «presync ok».
 *
 * Контракт после правки (уровень cloud_sync):
 *  - режим без adopt: mismatch → отказ с кодом, локальные данные и stable_id целы;
 *  - forceSyncToCloud в этом режиме сообщает причину отказа;
 *  - syncToCloud({forceNow}) при идущей синхронизации НЕ ждёт (раунд 2, H-S2d-1).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ensureAuthoritativeIdentityForCloudMutation,
  forceSyncToCloud,
  accountOwnedStorageKeysFrom,
  pruneShelvedAccountSwitchBackups,
  shelveAccountSwitchEmergencyBackupOf,
  readAccountSwitchEmergencyBackupSummary,
  saveAccountSwitchEmergencyBackup,
  syncToCloud,
} from '../app/cloud_sync';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';

type CallableResult = { data: Record<string, unknown> };
const mockCallable = jest.fn<Promise<CallableResult>, unknown[]>(async () => ({
  data: { ok: true, stableUid: 'stable-b', authUid: 'provider-a', identityReady: true },
}));
const mockSetStableId = jest.fn<Promise<void>, [string]>(async () => undefined);

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false, IS_STORE_RELEASE: false }));
jest.mock('../app/user_id_policy', () => ({
  getAuthUserId: jest.fn(() => 'provider-a'),
  getCanonicalUserId: jest.fn(async () => 'stable-a'),
}));
jest.mock('../app/stable_id', () => ({
  setStableId: (stableId: string) => mockSetStableId(stableId),
  peekStableId: () => 'stable-a',
  clearStableId: jest.fn(async () => undefined),
}));
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({ currentUser: { uid: 'provider-a', isAnonymous: false } }),
}));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallable),
}));
const mockDocSet = jest.fn(async () => undefined);
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({
    collection: () => ({ doc: () => ({ set: mockDocSet, update: mockDocSet, get: jest.fn(async () => ({ exists: false })) }) }),
  }),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };

describe('AA S2d 🔴2 — presync never adopts and never reports a false success', () => {
  beforeEach(() => {
    storage.__reset?.();
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('stable-a');
  });

  it('identity check without adopt: mismatch keeps local progress and stable id, reports mismatch', async () => {
    await AsyncStorage.setItem('user_total_xp', '777');

    const result = await ensureAuthoritativeIdentityForCloudMutation('stable-a', { adoptOnMismatch: false });

    expect(result).toMatchObject({ ok: false, stableUid: 'stable-b', adopted: false, mismatch: true });
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('777');
    expect(mockSetStableId).not.toHaveBeenCalled();
    expect(captureAccountGeneration()).toMatchObject({ stableId: 'stable-a', phase: 'active' });
  });

  it('forced upload in presync mode refuses on mismatch with a reason instead of wiping', async () => {
    await AsyncStorage.setItem('user_total_xp', '777');
    const refusals: string[] = [];

    const uploaded = await forceSyncToCloud({
      adoptOnIdentityMismatch: false,
      onRefusal: (code) => { refusals.push(code); },
    });

    expect(uploaded).toBe(false);
    expect(refusals).toEqual(['identity_mismatch']);
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('777');
    expect(mockSetStableId).not.toHaveBeenCalled();
    expect(mockDocSet).not.toHaveBeenCalled();
  });

  it('forced upload reports identity_unavailable when the server cannot confirm the identity', async () => {
    mockCallable.mockResolvedValueOnce({
      data: { ok: true, stableUid: 'stable-a', authUid: 'provider-a' },
    });
    const refusals: string[] = [];

    const uploaded = await forceSyncToCloud({
      adoptOnIdentityMismatch: false,
      onRefusal: (code) => { refusals.push(code); },
    });

    expect(uploaded).toBe(false);
    expect(refusals).toEqual(['identity_unavailable']);
  });

  // зачем (S2d раунд 2, H-S2d-1): ожидание идущей синхронизации внутри
  // syncToCloud({forceNow}) давало взаимную блокировку — покупка в «Управлении
  // подпиской» зовёт его под withAccountTransitionLock, а идущий doSyncToCloud
  // в adopt ждёт тот же замок. Сторож: forceNow при идущей синхронизации
  // возвращается СРАЗУ (presync ждёт через forceSyncToCloud с потолком).
  it('guard: syncToCloud({forceNow}) never waits for a sync already in flight (no lock-order deadlock)', async () => {
    let releaseFirst!: () => void;
    mockCallable.mockImplementationOnce(() => new Promise<CallableResult>((resolve) => {
      releaseFirst = () => resolve({ data: { ok: true, stableUid: 'stable-a', authUid: 'provider-a' } });
    }));

    const first = syncToCloud({ forceNow: true });
    for (let i = 0; i < 50 && mockCallable.mock.calls.length === 0; i += 1) await new Promise<void>((r) => setImmediate(r));
    expect(mockCallable).toHaveBeenCalledTimes(1);
    let secondDone = false;
    const second = syncToCloud({ forceNow: true }).then(() => { secondDone = true; });
    for (let i = 0; i < 20; i += 1) await new Promise<void>((r) => setImmediate(r));

    expect(secondDone).toBe(true);
    releaseFirst();
    await first;
    await second;
  });

  // H-S2d-2 / §134: вход проверяет, что аварийная копия записана и принадлежит A,
  // и пишет в лог её РАЗМЕР (ключи, байты) — без значений.
  it('backup summary reader returns owner and size of the saved emergency copy, null when absent/broken', async () => {
    await expect(readAccountSwitchEmergencyBackupSummary()).resolves.toBeNull();
    const raw = JSON.stringify({ version: 2, stableId: 'stable-a', pairs: [['k1', 'v1'], ['k2', 'v2']] });
    await AsyncStorage.setItem('account_switch_emergency_backup_latest_v1', raw);
    await expect(readAccountSwitchEmergencyBackupSummary()).resolves.toEqual({
      stableId: 'stable-a',
      pairCount: 2,
      bytes: Buffer.byteLength(raw, 'utf8'),
    });
    await AsyncStorage.setItem('account_switch_emergency_backup_latest_v1', '{broken');
    await expect(readAccountSwitchEmergencyBackupSummary()).resolves.toBeNull();
  });

  // §134: копия гостя не должна исчезнуть раньше подтверждённого восстановления.
  // Стирание аккаунта при свапе работает по инвентарю аккаунта — ключи копии в него
  // не входят (иначе свап сразу уничтожил бы только что сохранённую копию).
  it('emergency backup keys are outside the account wipe inventory', () => {
    const keys = accountOwnedStorageKeysFrom([
      'account_switch_emergency_backup_latest_v1',
      'account_switch_emergency_backup_page_v1:abc:0',
      'account_switch_emergency_backup_shelved_v1:x:1',
      'user_total_xp',
    ]);
    expect(keys.filter((key) => key.startsWith('account_switch_emergency_backup'))).toEqual([]);
  });

  // Раунд 3 (§135, ревью п.2): merge НЕ подтверждён → копию гостя сразу отложить,
  // чтобы она не блокировала «Сменить аккаунт»; чужую копию так не отодвинуть.
  it('shelves the guest copy only when it belongs to the given owner', async () => {
    const raw = JSON.stringify({ version: 2, stableId: 'stable-a', pairs: [['k1', 'v1']] });
    await AsyncStorage.setItem('account_switch_emergency_backup_latest_v1', raw);

    await expect(shelveAccountSwitchEmergencyBackupOf('stable-other')).resolves.toBe(false);
    expect(await AsyncStorage.getItem('account_switch_emergency_backup_latest_v1')).toBe(raw);

    await expect(shelveAccountSwitchEmergencyBackupOf('stable-a')).resolves.toBe(true);
    expect(await AsyncStorage.getItem('account_switch_emergency_backup_latest_v1')).toBeNull();
    const keys = await AsyncStorage.getAllKeys();
    const shelved = keys.filter((key) => key.startsWith('account_switch_emergency_backup_shelved_v1:'));
    expect(shelved).toHaveLength(1);
    expect(await AsyncStorage.getItem(shelved[0])).toBe(raw);
  });

  // Раунд 3 (ревью п.2): давняя утечка — отложенные копии жили вечно.
  it('prunes shelved copies older than 30 days and keeps fresh ones', async () => {
    const now = Date.UTC(2026, 9, 4);
    const day = 24 * 60 * 60 * 1000;
    const oldKey = `account_switch_emergency_backup_shelved_v1:stable-a:${(now - 31 * day).toString(36)}`;
    const freshKey = `account_switch_emergency_backup_shelved_v1:stable-b:${(now - 2 * day).toString(36)}`;
    const raw = JSON.stringify({ version: 2, stableId: 'stable-a', pairs: [['k1', 'v1']] });
    await AsyncStorage.setItem(oldKey, raw);
    await AsyncStorage.setItem(freshKey, raw);

    await expect(pruneShelvedAccountSwitchBackups(now)).resolves.toBe(1);
    expect(await AsyncStorage.getItem(oldKey)).toBeNull();
    expect(await AsyncStorage.getItem(freshKey)).toBe(raw);
  });

  // Ревью S2d: логи копий/отложенных копий не содержат сырых stableId.
  it('guard: backup logs never carry a raw stable id (shelve and other-owner block)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const raw = JSON.stringify({ version: 2, stableId: 'stable-a', pairs: [['k1', 'v1']] });
      await AsyncStorage.setItem('account_switch_emergency_backup_latest_v1', raw);
      await expect(shelveAccountSwitchEmergencyBackupOf('stable-a')).resolves.toBe(true);

      const foreign = JSON.stringify({ version: 2, stableId: 'stable-foreign-owner', pairs: [['k1', 'v1']] });
      await AsyncStorage.setItem('account_switch_emergency_backup_latest_v1', foreign);
      await expect(saveAccountSwitchEmergencyBackup('guard_test', 'stable-a'))
        .rejects.toThrow('account_switch_backup_other_owner_pending');

      const lines = warn.mock.calls.map((call) => call.map(String).join(' ')).filter((line) => line.includes('[ACC-MUT] backup:'));
      expect(lines.some((line) => line.includes('shelved_other_owner'))).toBe(true);
      expect(lines.some((line) => line.includes('other_owner_blocked'))).toBe(true);
      for (const line of lines) {
        expect(line).not.toContain('stable-a');
        expect(line).not.toContain('stable-foreign-owner');
      }
    } finally {
      warn.mockRestore();
    }
  });

  // ── Раунд 4 (L-R3-3): копия гостя с меткой подтверждённого merge — не «чужая» ──
  it('L-R3-3: a merged guest copy (alias from→current) is folded in first, then the new backup is written (no other_owner_pending)', async () => {
    await AsyncStorage.setItem('account_switch_emergency_backup_latest_v1', JSON.stringify({
      version: 2, createdAt: Date.now(), reason: 'sign_in_presync_not_uploaded_before_swap',
      stableId: 'stable-guest', pairs: [['guest_only_key', 'guest-value']],
    }));
    await AsyncStorage.setItem('account_switch_backup_merge_alias_v1', JSON.stringify({ from: 'stable-guest', to: 'stable-a', at: Date.now() }));

    await expect(saveAccountSwitchEmergencyBackup('after_merge', 'stable-a')).resolves.toBe(true);

    expect(await AsyncStorage.getItem('guest_only_key')).toBe('guest-value');
    expect(await AsyncStorage.getItem('account_switch_backup_merge_alias_v1')).toBeNull();
    await expect(readAccountSwitchEmergencyBackupSummary()).resolves.toMatchObject({ stableId: 'stable-a' });
  });

  it('L-R3-3: under a held transition lock the merged guest copy is shelved instead (no deadlock), the new backup is written', async () => {
    const generation = require('../app/account_generation');
    await AsyncStorage.setItem('account_switch_emergency_backup_latest_v1', JSON.stringify({
      version: 2, createdAt: Date.now(), reason: 'x', stableId: 'stable-guest', pairs: [['guest_only_key', 'guest-value']],
    }));
    await AsyncStorage.setItem('account_switch_backup_merge_alias_v1', JSON.stringify({ from: 'stable-guest', to: 'stable-a', at: Date.now() }));

    const saved = await generation.withAccountTransitionLock(() => saveAccountSwitchEmergencyBackup('under_lock', 'stable-a'));

    expect(saved).toBe(true);
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((key) => key.startsWith('account_switch_emergency_backup_shelved_v1:'))).toBe(true);
    expect(await AsyncStorage.getItem('account_switch_backup_merge_alias_v1')).toBeNull();
    await expect(readAccountSwitchEmergencyBackupSummary()).resolves.toMatchObject({ stableId: 'stable-a' });
  });

  it('L-R3-3: a foreign copy WITHOUT a matching alias is still other_owner_pending', async () => {
    await AsyncStorage.setItem('account_switch_emergency_backup_latest_v1', JSON.stringify({
      version: 2, createdAt: Date.now(), reason: 'x', stableId: 'stable-guest', pairs: [['k', 'v']],
    }));
    await AsyncStorage.setItem('account_switch_backup_merge_alias_v1', JSON.stringify({ from: 'stable-guest', to: 'stable-zzz', at: Date.now() }));
    await expect(saveAccountSwitchEmergencyBackup('t', 'stable-a')).rejects.toThrow('account_switch_backup_other_owner_pending');
  });

  // ── Раунд 4 (L-R3-4): очистка отложенных копий — по ключу и не чаще раза в сутки ──
  it('L-R3-4: a broken shelved key does not stop the loop; every key is handled separately', async () => {
    const now = Date.UTC(2026, 9, 4);
    const day = 24 * 60 * 60 * 1000;
    const brokenKey = `account_switch_emergency_backup_shelved_v1:stable-x:${(now - 40 * day).toString(36)}`;
    const oldKey = `account_switch_emergency_backup_shelved_v1:stable-y:${(now - 41 * day).toString(36)}`;
    await AsyncStorage.setItem(brokenKey, 'x');
    await AsyncStorage.setItem(oldKey, JSON.stringify({ version: 2, stableId: 'stable-y', pairs: [] }));
    // getItem уже jest.fn из мока хранилища: spyOn вернул бы ту же функцию, поэтому
    // подменяем реализацию и возвращаем исходную в finally.
    const getItemMock = AsyncStorage.getItem as unknown as jest.Mock;
    const originalImpl = getItemMock.getMockImplementation()!;
    const spy = {
      mockRestore: () => { getItemMock.mockImplementation(originalImpl); },
    };
    getItemMock.mockImplementation(async (key: string) => {
      if (key === brokenKey) throw new Error('storage_read_failed');
      return originalImpl(key);
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      await expect(pruneShelvedAccountSwitchBackups(now)).resolves.toBe(1);
      expect(warn.mock.calls.map((c) => String(c[0])).some((l) => l.includes('backup shelved_prune_key_failed'))).toBe(true);
      expect(warn.mock.calls.map((c) => String(c[0])).join('\n')).not.toContain('stable-x');
    } finally {
      spy.mockRestore();
      warn.mockRestore();
    }
    expect(await AsyncStorage.getItem(oldKey)).toBeNull();
  });

  it('L-R3-4: runs at most once a day', async () => {
    const now = Date.UTC(2026, 9, 5);
    const day = 24 * 60 * 60 * 1000;
    await expect(pruneShelvedAccountSwitchBackups(now)).resolves.toBe(0);
    const oldKey = `account_switch_emergency_backup_shelved_v1:stable-y:${(now - 41 * day).toString(36)}`;
    await AsyncStorage.setItem(oldKey, JSON.stringify({ version: 2, stableId: 'stable-y', pairs: [] }));
    await expect(pruneShelvedAccountSwitchBackups(now + 60 * 60 * 1000)).resolves.toBe(0);
    expect(await AsyncStorage.getItem(oldKey)).not.toBeNull();
    await expect(pruneShelvedAccountSwitchBackups(now + day + 1)).resolves.toBe(1);
    expect(await AsyncStorage.getItem(oldKey)).toBeNull();
  });

  it('LOW-1: clock moved back — the daily threshold counts as passed', async () => {
    const now = Date.UTC(2026, 9, 5);
    const day = 24 * 60 * 60 * 1000;
    await expect(pruneShelvedAccountSwitchBackups(now)).resolves.toBe(0);
    const oldKey = `account_switch_emergency_backup_shelved_v1:stable-z:${(now - 45 * day).toString(36)}`;
    await AsyncStorage.setItem(oldKey, JSON.stringify({ version: 2, stableId: 'stable-z', pairs: [] }));
    // Часы ушли на 2 часа назад относительно последнего запуска: очистка не должна стоять.
    await expect(pruneShelvedAccountSwitchBackups(now - 2 * 60 * 60 * 1000)).resolves.toBe(1);
    expect(await AsyncStorage.getItem(oldKey)).toBeNull();
  });
});
