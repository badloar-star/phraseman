// зачем (координатор 17.10, Сверка 501558120): после выхода/входа экран «Аккаунт» держал «Не задано» до перезапуска.
import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncSnapshotProfileNameFromStorage } from '../app/profile_name_snapshot_sync';
import { getAppSnapshot, patchAppSnapshot, resetAppSnapshotForAccountSwitch } from '../app/app_snapshot_store';
import { __resetAccountGenerationForTests, beginAccountGeneration, invalidateAccountGeneration } from '../app/account_generation';

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

const profile = {
  source: 'live' as const,
  updatedAt: 1000,
  name: '',
  avatar: '7',
  frame: 'gold',
  premiumActive: true,
  vipActive: false,
};

describe('[ACC-NAME] profile name reaches the shared snapshot after a cloud restore', () => {
  beforeEach(() => {
    storage.__reset?.();
    resetAppSnapshotForAccountSwitch();
    __resetAccountGenerationForTests();
    beginAccountGeneration('stable-b');
  });

  it('fills only the name of the existing profile section, keeping its source, time and other fields', async () => {
    patchAppSnapshot({ profile });
    await AsyncStorage.setItem('user_name', 'Delta 94030');
    await expect(syncSnapshotProfileNameFromStorage('test')).resolves.toEqual({ decision: 'applied', name: 'Delta 94030' });
    expect(getAppSnapshot().profile).toEqual({ ...profile, name: 'Delta 94030' });
  });

  it('does not create a profile section (defaults would override Home), but returns the name for the screen', async () => {
    await AsyncStorage.setItem('user_name', 'Delta 94030');
    await expect(syncSnapshotProfileNameFromStorage('test')).resolves.toEqual({ decision: 'no_profile_section', name: 'Delta 94030' });
    expect(getAppSnapshot().profile).toBeUndefined();
  });

  it('empty storage and a switched account give nothing', async () => {
    patchAppSnapshot({ profile });
    await expect(syncSnapshotProfileNameFromStorage('test')).resolves.toEqual({ decision: 'empty_storage', name: null });
    await AsyncStorage.setItem('user_name', 'Old Name');
    invalidateAccountGeneration();
    await expect(syncSnapshotProfileNameFromStorage('test')).resolves.toEqual({ decision: 'no_owner', name: null });
    expect(getAppSnapshot().profile?.name).toBe('');
  });

  it('the account screen pulls the name on cloud_profile_hydrated and when it opens without one', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'account_details.tsx'), 'utf8');
    expect(src).toContain("onAppEvent('cloud_profile_hydrated', () => pull('cloud_profile_hydrated'))");
    expect(src).toContain("if (!snapshotNameRef.current) pull('account_open_empty')");
  });
});
