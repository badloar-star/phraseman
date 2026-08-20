import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildCustomizationSnapshot,
  customizationSnapshotsEqual,
  createCustomizationFallback,
} from '../app/customization_snapshot';
import { starterAvatarDNA } from '../modules/avatar-dna/catalog';
import type { AvatarDNAStoredState } from '../modules/avatar-dna/storage';
import { avatarDNAStateStorageKey, commitAvatarDNA } from '../modules/avatar-dna/storage';
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

  it('preserves explicit none and valid owned maps', () => {
    const snapshot = buildCustomizationSnapshot(new Map([
      ['user_avatar', 'custom:custom-01:violet:black'],
      ['user_avatar_aura', 'none'],
      ['user_total_xp', '1250'],
      ['shards_balance', '44'],
      ['custom_avatar_owned_v1', JSON.stringify({ 'custom-01': 'violet:black' })],
      ['avatar_aura_owned_v1', JSON.stringify({ 'aura-aurora': true, bad: false })],
      ['custom_avatar_gift_owned_v1', 'custom-61'],
      ['avatar_aura_gift_owned_v1', 'aura-nimbus'],
    ]), 100, 18);

    expect(snapshot.storedAuraSelection).toBe('none');
    expect(snapshot.shards).toBe(44);
    expect(snapshot.ownedAvatars).toEqual({ 'custom-01': 'violet:black' });
    expect(snapshot.ownedAuras).toEqual({ 'aura-aurora': true });
    expect(snapshot.giftedAvatarId).toBe('custom-61');
    expect(snapshot.giftedAuraId).toBe('aura-nimbus');
  });

  it('rejects arrays and malformed JSON', () => {
    const snapshot = buildCustomizationSnapshot(new Map([
      ['custom_avatar_owned_v1', '["custom-01"]'],
      ['avatar_aura_owned_v1', '{bad'],
    ]), 100, 1);
    expect(snapshot.ownedAvatars).toEqual({});
    expect(snapshot.ownedAuras).toEqual({});
  });

  it('compares normalized content instead of object identity', () => {
    const a = buildCustomizationSnapshot(new Map(), 100, 1);
    const b = buildCustomizationSnapshot(new Map(), 200, 1);
    expect(customizationSnapshotsEqual(a, b)).toBe(true);
  });

  it('carries validated account-matching Avatar DNA while preserving legacy fields', () => {
    const dna = starterAvatarDNA('starter_warm_01');
    const avatarDNA: AvatarDNAStoredState = {
      schemaVersion: 1,
      ownerStableId: 'u1',
      accountGeneration: 4,
      confirmedDNA: dna,
      lastConfirmedDNA: dna,
      manifestVersion: 1,
      lastGood: { portrait: 'portrait_1', studio: 'studio_1' },
      updatedAtMs: 90,
    };
    const snapshot = buildCustomizationSnapshot(new Map([
      ['user_avatar', '18'],
      ['shards_balance', '44'],
    ]), 100, 18, avatarDNA);

    expect(snapshot).toMatchObject({
      activeAvatar: '18',
      shards: 44,
      avatarDNA: {
        ownerStableId: 'u1',
        accountGeneration: 4,
        confirmedDNA: dna,
        lastGood: { portrait: 'portrait_1', studio: 'studio_1' },
      },
    });
  });

  it('keeps the legacy fallback intact when Avatar DNA is absent', () => {
    const fallback = createCustomizationFallback({
      profile: {
        source: 'storage', updatedAt: 10, name: 'Ada', avatar: '18', frame: '',
        totalXp: 100, level: 2, premiumActive: false, vipActive: false,
      },
      progress: { source: 'storage', updatedAt: 11, streak: 1, shards: 7, studyTarget: 'en' },
    });
    expect(fallback.activeAvatar).toBe('18');
    expect(fallback.shards).toBe(7);
    expect(fallback.avatarDNA).toBeUndefined();
  });

  it('publishes matching Avatar DNA in the first local app snapshot', async () => {
    const dna = starterAvatarDNA('starter_warm_01');
    const generation = beginAccountGeneration('u1').generation;
    await commitAvatarDNA({
      ownerStableId: 'u1',
      accountGeneration: generation,
      dna,
      renderIds: { portrait: 'portrait_1', studio: 'studio_1' },
      manifestVersion: 1,
    });
    await AsyncStorage.multiSet([
      ['user_avatar', '18'],
      ['user_total_xp', '100'],
      ['shards_balance', '7'],
    ]);

    await primeAppSnapshotFromStorage('en');

    expect(getAppSnapshot().profile?.avatarDNA).toMatchObject({
      ownerStableId: 'u1',
      accountGeneration: generation,
      confirmedDNA: dna,
      lastGood: { portrait: 'portrait_1', studio: 'studio_1' },
    });
    expect(getAppSnapshot().customization?.avatarDNA).toEqual(
      getAppSnapshot().profile?.avatarDNA,
    );
  });

  it('hydrates durable Avatar DNA after the process generation restarts at one', async () => {
    const dna = starterAvatarDNA('starter_warm_01');
    beginAccountGeneration('other-owner');
    const savedGeneration = beginAccountGeneration('u1').generation;
    await commitAvatarDNA({
      ownerStableId: 'u1', accountGeneration: savedGeneration, dna,
      renderIds: { portrait: 'portrait_restart', studio: 'studio_restart' }, manifestVersion: 1,
    });
    __resetAccountGenerationForTests();
    resetAppSnapshotForAccountSwitch();
    const restartedGeneration = beginAccountGeneration('u1').generation;

    await primeAppSnapshotFromStorage('en');

    expect(getAppSnapshot().profile?.avatarDNA).toMatchObject({
      ownerStableId: 'u1',
      accountGeneration: restartedGeneration,
      confirmedDNA: dna,
      lastGood: { portrait: 'portrait_restart', studio: 'studio_restart' },
    });
  });

  it('publishes deeply frozen DNA so profile and customization cannot mutate each other', async () => {
    const dna = starterAvatarDNA('starter_warm_01');
    const generation = beginAccountGeneration('u1').generation;
    await commitAvatarDNA({
      ownerStableId: 'u1', accountGeneration: generation, dna,
      renderIds: { portrait: 'portrait_frozen', studio: 'studio_frozen' }, manifestVersion: 1,
    });
    await primeAppSnapshotFromStorage('en');
    const profileDNA = getAppSnapshot().profile?.avatarDNA;
    const customizationDNA = getAppSnapshot().customization?.avatarDNA;

    expect(Object.isFrozen(profileDNA)).toBe(true);
    expect(Object.isFrozen(profileDNA?.confirmedDNA.base)).toBe(true);
    expect(() => {
      (customizationDNA?.confirmedDNA.base as { skinToneId: string }).skinToneId = 'skin_mutated';
    }).toThrow();
    expect(getAppSnapshot().profile?.avatarDNA?.confirmedDNA.base.skinToneId).toBe(
      dna.base.skinToneId,
    );
  });

  it('omits corrupt Avatar DNA from the first snapshot without losing legacy profile state', async () => {
    const generation = beginAccountGeneration('u1').generation;
    await AsyncStorage.multiSet([
      ['user_avatar', '18'],
      ['user_total_xp', '100'],
      ['shards_balance', '7'],
      [avatarDNAStateStorageKey('u1', generation), '{bad'],
    ]);

    await primeAppSnapshotFromStorage('en');

    expect(getAppSnapshot().profile).toMatchObject({ avatar: '18', totalXp: 100 });
    expect(getAppSnapshot().profile?.avatarDNA).toBeUndefined();
    expect(getAppSnapshot().customization).toMatchObject({ activeAvatar: '18', shards: 7 });
    expect(getAppSnapshot().customization?.avatarDNA).toBeUndefined();
  });

  it('stays lightweight for startup', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/customization_snapshot.ts'), 'utf8');
    expect(source).not.toContain("from '../constants/custom_avatars'");
    expect(source).not.toContain("from '../constants/avatars'");
    expect(source).not.toContain("from '../constants/avatar_auras'");
    expect(source).not.toContain('require(');
    const bootstrapSource = fs.readFileSync(path.join(__dirname, '../app/app_snapshot_bootstrap.ts'), 'utf8');
    expect(bootstrapSource).toContain('readAvatarDNAState(');
    expect(bootstrapSource).toContain('avatarDNA');
  });
});
