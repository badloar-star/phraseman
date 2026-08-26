jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
let mockEffectsEnabled = true;
let mockSoundSettingsListener: (() => void) | null = null;
jest.mock('../modules/audio/sound_settings', () => ({
  getSoundSettingsSnapshot: jest.fn(() => ({ effectsEnabled: mockEffectsEnabled, voiceEnabled: true })),
  subscribeSoundSettings: jest.fn((listener: () => void) => {
    mockSoundSettingsListener = listener;
    return () => { if (mockSoundSettingsListener === listener) mockSoundSettingsListener = null; };
  }),
}));
jest.mock('../modules/audio/audio_runtime_arbiter', () => ({
  claimAmbientAudio: jest.fn(),
}));

import fs from 'node:fs';
import path from 'node:path';
import { createAudioPlayer } from 'expo-audio';
import { claimAmbientAudio } from '../modules/audio/audio_runtime_arbiter';
import {
  letCelebrationBackgroundFinish,
  startCelebrationBackground,
  stopCelebrationBackground,
} from '../modules/audio/celebrationBackgroundPlayer';
import { playCelebrationSceneSound, stopAllCelebrationSceneSounds } from '../modules/audio/celebrationScenePlayer';
import { SOUND_EVENTS } from '../modules/audio/sound_events';

type FakePlayer = {
  volume: number;
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
};

const createAudioPlayerMock = createAudioPlayer as jest.MockedFunction<typeof createAudioPlayer>;
const claimAmbientAudioMock = claimAmbientAudio as jest.MockedFunction<typeof claimAmbientAudio>;

function player(): FakePlayer {
  return {
    volume: 0,
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
  };
}

describe('celebration audio lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    createAudioPlayerMock.mockReset();
    claimAmbientAudioMock.mockImplementation(() => ({ isCurrent: () => true, release: jest.fn() }));
    mockEffectsEnabled = true;
  });

  afterEach(() => {
    stopCelebrationBackground();
    stopAllCelebrationSceneSounds();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('does not create celebration players while effects are disabled', () => {
    mockEffectsEnabled = false;

    startCelebrationBackground();
    playCelebrationSceneSound('pm.celebration.open_rift');

    expect(createAudioPlayerMock).not.toHaveBeenCalled();
    expect(claimAmbientAudioMock).not.toHaveBeenCalled();
  });

  test('settings-off revokes an in-flight stop fade and its old timer cannot release a newer session', () => {
    const claims: Array<{ isCurrent: () => boolean; release: jest.Mock }> = [];
    claimAmbientAudioMock.mockImplementation(() => {
      const claim = { isCurrent: () => true, release: jest.fn() };
      claims.push(claim);
      return claim;
    });
    const first = player();
    const second = player();
    createAudioPlayerMock.mockReturnValueOnce(first as never).mockReturnValueOnce(second as never);

    startCelebrationBackground();
    stopCelebrationBackground();
    mockEffectsEnabled = false;
    mockSoundSettingsListener?.();

    expect(first.remove).toHaveBeenCalledTimes(1);

    mockEffectsEnabled = true;
    startCelebrationBackground();
    jest.advanceTimersByTime(320);

    expect(second.remove).not.toHaveBeenCalled();
    expect(claims[1].release).not.toHaveBeenCalled();
  });

  test('recording revocation stops both the background and overlapping scene players', () => {
    let revoke: (() => void) | undefined;
    claimAmbientAudioMock.mockImplementation((stop) => {
      revoke = stop;
      return { isCurrent: () => true, release: jest.fn() };
    });
    const background = player();
    const scene = player();
    createAudioPlayerMock.mockReturnValueOnce(background as never).mockReturnValueOnce(scene as never);

    startCelebrationBackground();
    playCelebrationSceneSound('pm.celebration.open_rift');
    revoke?.();

    expect(background.remove).toHaveBeenCalledTimes(1);
    expect(scene.remove).toHaveBeenCalledTimes(1);
  });

  test('a newly started celebration disposes its prior finishing background before creating another', () => {
    const first = player();
    const second = player();
    createAudioPlayerMock.mockReturnValueOnce(first as never).mockReturnValueOnce(second as never);

    startCelebrationBackground();
    letCelebrationBackgroundFinish();
    startCelebrationBackground();

    expect(first.remove).toHaveBeenCalledTimes(1);
    expect(second.play).toHaveBeenCalledTimes(1);
  });

  test('keeps the background playing after a normal close then disposes it once after its bounded duration', () => {
    const background = player();
    createAudioPlayerMock.mockReturnValue(background as never);

    startCelebrationBackground();
    letCelebrationBackgroundFinish();

    const boundedLifetime = SOUND_EVENTS['pm.celebration.background_bed'].durationMs + 400;
    jest.advanceTimersByTime(boundedLifetime - 1);
    expect(background.pause).not.toHaveBeenCalled();
    expect(background.remove).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(background.pause).toHaveBeenCalledTimes(1);
    expect(background.remove).toHaveBeenCalledTimes(1);

    jest.runOnlyPendingTimers();
    expect(background.remove).toHaveBeenCalledTimes(1);
  });

  test('abrupt stop removes the background even when pause throws', () => {
    const background = player();
    background.pause.mockImplementation(() => { throw new Error('native pause failed'); });
    createAudioPlayerMock.mockReturnValue(background as never);

    startCelebrationBackground();
    stopCelebrationBackground();
    jest.advanceTimersByTime(320);

    expect(background.pause).toHaveBeenCalledTimes(1);
    expect(background.remove).toHaveBeenCalledTimes(1);
  });

  test('abrupt stop releases the background if the fade volume write fails', () => {
    const background = player();
    createAudioPlayerMock.mockReturnValue(background as never);

    startCelebrationBackground();
    Object.defineProperty(background, 'volume', {
      configurable: true,
      get: () => 0,
      set: () => { throw new Error('native player released during fade'); },
    });

    stopCelebrationBackground();
    jest.advanceTimersByTime(60);

    expect(background.pause).toHaveBeenCalledTimes(1);
    expect(background.remove).toHaveBeenCalledTimes(1);
  });

  test('abrupt stop releases the background if the initial fade volume read fails', () => {
    const background = player();
    createAudioPlayerMock.mockReturnValue(background as never);

    startCelebrationBackground();
    Object.defineProperty(background, 'volume', {
      configurable: true,
      get: () => { throw new Error('native player released before fade'); },
      set: () => undefined,
    });

    expect(() => stopCelebrationBackground()).not.toThrow();
    expect(background.pause).toHaveBeenCalledTimes(1);
    expect(background.remove).toHaveBeenCalledTimes(1);
  });

  test('releases a newly created background player when its initial volume write fails', () => {
    const background = player();
    Object.defineProperty(background, 'volume', {
      configurable: true,
      get: () => 0,
      set: () => { throw new Error('native player failed while configuring volume'); },
    });
    createAudioPlayerMock.mockReturnValue(background as never);

    startCelebrationBackground();

    expect(background.pause).toHaveBeenCalledTimes(1);
    expect(background.remove).toHaveBeenCalledTimes(1);
  });

  test('releases a newly created background player when play fails', () => {
    const background = player();
    background.play.mockImplementation(() => { throw new Error('native player failed to start'); });
    createAudioPlayerMock.mockReturnValue(background as never);

    startCelebrationBackground();

    expect(background.pause).toHaveBeenCalledTimes(1);
    expect(background.remove).toHaveBeenCalledTimes(1);
  });

  test('releases the active background player when a fade-in volume write fails', () => {
    const background = player();
    createAudioPlayerMock.mockReturnValue(background as never);

    startCelebrationBackground();
    Object.defineProperty(background, 'volume', {
      configurable: true,
      get: () => 0,
      set: () => { throw new Error('native player released during fade-in'); },
    });

    expect(() => jest.advanceTimersByTime(60)).not.toThrow();
    expect(background.pause).toHaveBeenCalledTimes(1);
    expect(background.remove).toHaveBeenCalledTimes(1);
  });

  test('releases a newly created scene player when its initial volume write fails', () => {
    const scene = player();
    Object.defineProperty(scene, 'volume', {
      configurable: true,
      get: () => 0,
      set: () => { throw new Error('native scene player failed while configuring volume'); },
    });
    createAudioPlayerMock.mockReturnValue(scene as never);

    playCelebrationSceneSound('pm.celebration.open_rift');

    expect(scene.pause).toHaveBeenCalledTimes(1);
    expect(scene.remove).toHaveBeenCalledTimes(1);
  });

  test('abrupt modal cleanup stops scene sounds, while the normal-finish branch does not', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components', 'PremiumCelebrationModal.tsx'),
      'utf8',
    );

    expect(source).toContain("import { playCelebrationSceneSound, stopAllCelebrationSceneSounds } from '../modules/audio/celebrationScenePlayer';");
    expect(source).toMatch(/if \(!letBgFinishRef\.current\) \{[\s\S]{0,140}stopCelebrationBackground\(\);[\s\S]{0,140}stopAllCelebrationSceneSounds\(\);/);
    expect(source).toMatch(/if \(letBgFinishRef\.current\) \{[\s\S]{0,220}letCelebrationBackgroundFinish\(\);[\s\S]{0,220}\} else \{[\s\S]{0,180}stopCelebrationBackground\(\);[\s\S]{0,180}stopAllCelebrationSceneSounds\(\);/);
    expect(source).toMatch(/const handleClose = useCallback\(\(\) => \{[\s\S]{0,260}letBgFinishRef\.current = true;[\s\S]{0,160}letCelebrationBackgroundFinish\(\);[\s\S]{0,160}onClose\(\);/);
  });

  test('Reduce Motion cleanup treats unmount as abrupt unless the user chose a normal finish', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components', 'PremiumCelebrationModal.tsx'),
      'utf8',
    );

    expect(source).toMatch(/if \(reduceMotion\) \{[\s\S]{0,260}return \(\) => \{[\s\S]{0,120}clearTimers\(\);[\s\S]{0,180}if \(!letBgFinishRef\.current\) \{[\s\S]{0,140}stopCelebrationBackground\(\);[\s\S]{0,140}stopAllCelebrationSceneSounds\(\);/);
  });
});
