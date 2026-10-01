import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildCustomizationSnapshot } from '../app/customization_snapshot';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  getAppSnapshot,
  resetAppSnapshotForAccountSwitch,
} from '../app/app_snapshot_store';
import { primeAppSnapshotFromStorage } from '../app/app_snapshot_bootstrap';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/friends_tab_swr_warm', () => ({
  startFriendsTabSwrPrime: jest.fn(async () => {}),
  peekFriendsTabSwrWarm: jest.fn(() => null),
}));
jest.mock('../app/user_settings_store', () => ({
  getUserSettingsSnapshot: jest.fn(() => ({
    autoCheck: true,
    voiceOut: true,
    uiSounds: true,
    speechRate: 1,
    speechVoiceId: '',
    hardMode: false,
    autoAdvance: false,
    haptics: true,
    immediateCheck: false,
  })),
  hydrateUserSettingsFromStorage: jest.fn(async () => {}),
}));

describe('customization snapshot', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetAccountGenerationForTests();
    resetAppSnapshotForAccountSwitch();
  });

  // зачем: D108 — купленные ауры/аватары удалены: снимок их больше не несёт.
  // зачем: Q5 (координатор 01.10) — Avatar DNA («Студия персонажа») тоже удалён.
  it('does not carry removed cosmetics or Avatar DNA (D108, Q5)', () => {
    const snapshot = buildCustomizationSnapshot(new Map([
      ['user_avatar', '18'],
      ['user_avatar_aura', 'aura-ember'],
      ['custom_avatar_owned_v1', JSON.stringify({ 'custom-01': 'violet:black' })],
      ['avatar_aura_owned_v1', JSON.stringify({ 'aura-aurora': true })],
      ['shards_balance', '44'],
    ]), 100, 18);
    expect(Object.keys(snapshot).sort()).toEqual(['activeAvatar', 'level', 'shards', 'source', 'updatedAt']);
    expect(snapshot).toMatchObject({ activeAvatar: '18', shards: 44 });
  });

  it('publishes the first local snapshot without Avatar DNA even if old DNA data is on the device', async () => {
    const generation = beginAccountGeneration('u1').generation;
    await AsyncStorage.multiSet([
      ['user_avatar', '18'],
      ['user_total_xp', '100'],
      ['shards_balance', '7'],
      [`avatar_dna_state_v1:${encodeURIComponent('u1')}:${generation}`, '{"schemaVersion":1}'],
    ]);

    await primeAppSnapshotFromStorage('en');

    expect(getAppSnapshot().profile).toMatchObject({ avatar: '18' });
    expect(getAppSnapshot().profile).not.toHaveProperty('avatarDNA');
    expect(getAppSnapshot().customization).toMatchObject({ activeAvatar: '18', shards: 7 });
    expect(getAppSnapshot().customization).not.toHaveProperty('avatarDNA');
  });

  it('stays lightweight for startup', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/customization_snapshot.ts'), 'utf8');
    expect(source).not.toContain("from '../constants/custom_avatars'");
    expect(source).not.toContain("from '../constants/avatars'");
    expect(source).not.toContain("from '../constants/avatar_auras'");
    expect(source).not.toContain('require(');
    const bootstrapSource = fs.readFileSync(path.join(__dirname, '../app/app_snapshot_bootstrap.ts'), 'utf8');
    // зачем: Q5 — старт больше не читает состояние «Студии персонажа».
    expect(bootstrapSource).not.toContain('readAvatarDNAState(');
    expect(bootstrapSource).not.toContain('modules/avatar-dna');
  });
});
