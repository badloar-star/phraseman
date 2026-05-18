import {
  APP_SOUND_DEFAULT_VOLUME,
  DEFAULT_SETTINGS,
  normalizeAppSoundVolume,
} from '../app/user_settings_store';
import {
  getSoundManifestEntry,
  SOUND_MANIFEST,
} from '../app/audio/sound_manifest';
import { resolveSoundIdForAppEvent } from '../app/audio/sound_routing';

describe('app sound system contract', () => {
  test('defaults enable app sounds separately from speech pronunciation', () => {
    expect(DEFAULT_SETTINGS.voiceOut).toBe(true);
    expect(DEFAULT_SETTINGS.appSoundsEnabled).toBe(true);
    expect(DEFAULT_SETTINGS.ceremonySoundsEnabled).toBe(true);
    expect(DEFAULT_SETTINGS.appSoundsVolume).toBe(APP_SOUND_DEFAULT_VOLUME);
  });

  test('normalizes app sound volume into a stable 0-1 range', () => {
    expect(normalizeAppSoundVolume(-1)).toBe(0);
    expect(normalizeAppSoundVolume(1.4)).toBe(1);
    expect(normalizeAppSoundVolume('0.456')).toBe(0.46);
    expect(normalizeAppSoundVolume('bad')).toBe(APP_SOUND_DEFAULT_VOLUME);
  });

  test('manifest contains the first production sound pack with unique ids and categories', () => {
    const ids = SOUND_MANIFEST.map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([
      'level.up',
      'achievement.unlocked',
      'shards.earned.small',
      'shards.earned.medium',
      'shards.earned.large',
      'daily.reward.claimed',
      'arena.match.found',
      'answer.correct',
      'answer.wrong',
      'premium.activated',
    ]));
    expect(getSoundManifestEntry('premium.activated')?.category).toBe('ceremony');
    expect(getSoundManifestEntry('answer.correct')?.category).toBe('action');
  });

  test('routes high-value app events to sound ids and keeps noisy events silent', () => {
    expect(resolveSoundIdForAppEvent('level_up_pending')).toBe('level.up');
    expect(resolveSoundIdForAppEvent('achievement_unlocked')).toBe('achievement.unlocked');
    expect(resolveSoundIdForAppEvent('premium_activated')).toBe('premium.activated');
    expect(resolveSoundIdForAppEvent('daily_task_reward_claimed', { taskId: 'daily_xp' })).toBe('daily.reward.claimed');
    expect(resolveSoundIdForAppEvent('shards_earned', { amount: 3, reasonKey: 'daily' })).toBe('shards.earned.small');
    expect(resolveSoundIdForAppEvent('shards_earned', { amount: 15, reasonKey: 'lesson' })).toBe('shards.earned.medium');
    expect(resolveSoundIdForAppEvent('shards_earned', { amount: 50, reasonKey: 'league' })).toBe('shards.earned.large');
    expect(resolveSoundIdForAppEvent('action_toast', { type: 'success', messageRu: 'OK' })).toBeNull();
    expect(resolveSoundIdForAppEvent('xp_changed')).toBeNull();
  });

  test('native sound playback is a no-op instead of crashing when AV native module is missing', async () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    jest.doMock('expo-modules-core', () => ({
      requireOptionalNativeModule: jest.fn(() => null),
    }));
    const expoAvFactory = jest.fn(() => {
      throw new Error('expo-av should not load without native ExponentAV');
    });
    jest.doMock('expo-av', expoAvFactory);

    try {
      const soundManager = require('../app/audio/sound_manager') as typeof import('../app/audio/sound_manager');
      expect(() => soundManager.preloadAppSounds()).not.toThrow();
      await expect(soundManager.playAppSound('answer.correct')).resolves.toBeUndefined();
      expect(expoAvFactory).not.toHaveBeenCalled();
    } finally {
      jest.dontMock('react-native');
      jest.dontMock('expo-modules-core');
      jest.dontMock('expo-av');
      jest.resetModules();
    }
  });

  test('plays through expo-av when ExponentAV is available', async () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    jest.doMock('expo-modules-core', () => ({
      requireOptionalNativeModule: jest.fn((name: string) => (name === 'ExponentAV' ? {} : null)),
    }));

    const replayAsync = jest.fn().mockResolvedValue({});
    const setStatusAsync = jest.fn().mockResolvedValue({});
    const createAsync = jest.fn().mockResolvedValue({
      sound: {
        replayAsync,
        setStatusAsync,
        unloadAsync: jest.fn().mockResolvedValue({}),
      },
    });
    const setAudioModeAsync = jest.fn().mockResolvedValue(undefined);
    jest.doMock('expo-av', () => ({
      Audio: {
        Sound: { createAsync },
        setAudioModeAsync,
      },
    }));

    try {
      const soundManager = require('../app/audio/sound_manager') as typeof import('../app/audio/sound_manager');
      await expect(soundManager.playAppSound('answer.correct', { force: true, volume: 1 })).resolves.toBeUndefined();
      expect(setAudioModeAsync).toHaveBeenCalled();
      expect(createAsync).toHaveBeenCalled();
      expect(replayAsync).toHaveBeenCalledWith(expect.objectContaining({
        shouldPlay: true,
        positionMillis: 0,
        isMuted: false,
      }));
    } finally {
      jest.dontMock('react-native');
      jest.dontMock('expo-modules-core');
      jest.dontMock('expo-av');
      jest.resetModules();
    }
  });
});
