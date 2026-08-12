/**
 * cards-2.0 (E1+E9): SoundService — очередь SFX → пауза 120мс → TTS (§5),
 * тумблеры `fc_sfx_on` / `fc_autospeak_on`, полная карта событий §5,
 * пул плееров expo-audio, платформенный маппинг хаптики.
 */

type FakePlayer = {
  volume: number;
  play: jest.Mock;
  seekTo: jest.Mock;
  remove: jest.Mock;
};

const createdPlayers: FakePlayer[] = [];
const createAudioPlayerMock = jest.fn((): FakePlayer => {
  const p: FakePlayer = {
    volume: 1,
    play: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn(),
  };
  createdPlayers.push(p);
  return p;
});
const setAudioModeAsyncMock = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-audio', () => ({
  __esModule: true,
  createAudioPlayer: (...args: unknown[]) => createAudioPlayerMock(...(args as [])),
  setAudioModeAsync: (...args: unknown[]) => setAudioModeAsyncMock(...(args as [])),
}));

const notificationAsyncMock = jest.fn().mockResolvedValue(undefined);
const impactAsyncMock = jest.fn().mockResolvedValue(undefined);
const selectionAsyncMock = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-haptics', () => ({
  __esModule: true,
  notificationAsync: (...args: unknown[]) => notificationAsyncMock(...(args as [])),
  impactAsync: (...args: unknown[]) => impactAsyncMock(...(args as [])),
  selectionAsync: () => selectionAsyncMock(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Soft: 'soft' },
}));

const speechSpeakMock = jest.fn();
const speechStopMock = jest.fn();
jest.mock('expo-speech', () => ({
  __esModule: true,
  speak: (...args: unknown[]) => speechSpeakMock(...(args as [])),
  stop: () => speechStopMock(),
}));

import {
  __resetFcSoundServiceForTests,
  autoSpeakAfterSfx,
  comboSfxForStreak,
  fcHaptic,
  isFcAutoSpeakEnabled,
  isFcSfxEnabled,
  playSfx,
  setFcAutoSpeakEnabled,
  setFcSfxEnabled,
  setFcTtsSpeaker,
  speakAfterSfx,
  type FcSfxName,
} from '../app/flashcards/SoundService';
import { FC_SFX_TTS_GAP_MS } from '../constants/flashcards_motion';

const AsyncStorageMock = require('../tests/__mocks__/async-storage');

/** E9: полный набор событий §5 (все обязаны иметь файл в SFX_DEFS). */
const ALL_SFX: FcSfxName[] = [
  'flip', 'tick', 'correct', 'incorrect', 'swipe_know', 'swipe_learn',
  'combo_x3', 'combo_x5', 'combo_x10', 'star', 'chest_open',
  'session_complete', 'riser',
];

const { Platform } = require('react-native');

const flushMicrotasks = async () => {
  // playSfx: seekTo(0) → then(play); хаптика: async-цепочка runIfEnabled → getItem → run
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

beforeEach(() => {
  __resetFcSoundServiceForTests();
  createdPlayers.length = 0;
  createAudioPlayerMock.mockClear();
  setAudioModeAsyncMock.mockClear();
  notificationAsyncMock.mockClear();
  impactAsyncMock.mockClear();
  selectionAsyncMock.mockClear();
  speechSpeakMock.mockClear();
  speechStopMock.mockClear();
  Platform.OS = 'ios';
});

describe('playSfx + тумблер fc_sfx_on', () => {
  it('дефолт (кэш не загружен) — звук включён', () => {
    expect(isFcSfxEnabled()).toBe(true);
  });

  it('играет: создаёт плеер, ставит громкость по карте §5, seekTo(0) → play', async () => {
    playSfx('correct');
    await flushMicrotasks();
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
    const p = createdPlayers[0];
    expect(p.volume).toBe(0.55);
    expect(p.seekTo).toHaveBeenCalledWith(0);
    expect(p.play).toHaveBeenCalledTimes(1);
    // аудио-режим установлен один раз: playsInSilentMode + mixWithOthers (§5)
    expect(setAudioModeAsyncMock).toHaveBeenCalledWith({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });
  });

  it('тумблер off → полная тишина (плеер даже не создаётся)', async () => {
    await setFcSfxEnabled(false);
    expect(isFcSfxEnabled()).toBe(false);
    playSfx('flip');
    await flushMicrotasks();
    expect(createAudioPlayerMock).not.toHaveBeenCalled();
  });

  it('пул: повторное срабатывание не создаёт больше POOL_SIZE плееров на звук', async () => {
    playSfx('tick');
    playSfx('tick');
    playSfx('tick');
    playSfx('tick');
    await flushMicrotasks();
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(2);
  });

  it('E9: каждое событие полной карты §5 проигрывается (файл существует в SFX_DEFS)', async () => {
    for (const name of ALL_SFX) {
      createdPlayers.length = 0;
      createAudioPlayerMock.mockClear();
      __resetFcSoundServiceForTests();
      playSfx(name);
      await flushMicrotasks();
      expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
      expect(createdPlayers[0].play).toHaveBeenCalledTimes(1);
      expect(createdPlayers[0].volume).toBeGreaterThan(0);
      expect(createdPlayers[0].volume).toBeLessThanOrEqual(0.7);
    }
  });

  it('E9: громкости ключевых событий по таблице §5', async () => {
    const expected: Partial<Record<FcSfxName, number>> = {
      flip: 0.3, tick: 0.2, correct: 0.55, incorrect: 0.4,
      combo_x5: 0.6, star: 0.5, session_complete: 0.7, riser: 0.6,
    };
    for (const [name, vol] of Object.entries(expected) as [FcSfxName, number][]) {
      createdPlayers.length = 0;
      __resetFcSoundServiceForTests();
      playSfx(name);
      await flushMicrotasks();
      expect(createdPlayers[0].volume).toBe(vol);
    }
  });

  it('E9: comboSfxForStreak — пороги ×3/×5/×10', () => {
    expect(comboSfxForStreak(1)).toBe('correct');
    expect(comboSfxForStreak(3)).toBe('combo_x3');
    expect(comboSfxForStreak(4)).toBe('combo_x3');
    expect(comboSfxForStreak(5)).toBe('combo_x5');
    expect(comboSfxForStreak(9)).toBe('combo_x5');
    expect(comboSfxForStreak(10)).toBe('combo_x10');
  });
});

describe('speakAfterSfx — очередь SFX → пауза 120мс → TTS, никогда одновременно', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('TTS стартует только после паузы 120мс за SFX', () => {
    const speakSpy = jest.fn();
    setFcTtsSpeaker(speakSpy);
    speakAfterSfx('hello world', { sfx: 'flip', language: 'en-US' });
    // SFX запущен сразу…
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
    // …а речь — нет
    expect(speakSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(FC_SFX_TTS_GAP_MS - 1);
    expect(speakSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2);
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect(speakSpy.mock.calls[0][0]).toBe('hello world');
    expect(speakSpy.mock.calls[0][2]).toMatchObject({ language: 'en-US' });
  });

  it('при выключенных SFX речь идёт сразу, без искусственной паузы', async () => {
    await setFcSfxEnabled(false);
    const speakSpy = jest.fn();
    setFcTtsSpeaker(speakSpy);
    speakAfterSfx('instant');
    expect(createAudioPlayerMock).not.toHaveBeenCalled();
    expect(speakSpy).toHaveBeenCalledTimes(1);
  });

  it('sfx: null → только TTS без звука', () => {
    const speakSpy = jest.fn();
    setFcTtsSpeaker(speakSpy);
    speakAfterSfx('just speech', { sfx: null });
    expect(createAudioPlayerMock).not.toHaveBeenCalled();
    expect(speakSpy).toHaveBeenCalledTimes(1);
  });

  it('второй вызов до паузы отменяет отложенный TTS первого — играет только новейший', () => {
    const speakSpy = jest.fn();
    setFcTtsSpeaker(speakSpy);
    speakAfterSfx('first', { sfx: 'flip' });
    jest.advanceTimersByTime(60);
    speakAfterSfx('second', { sfx: 'flip' });
    jest.advanceTimersByTime(FC_SFX_TTS_GAP_MS + 10);
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect(speakSpy.mock.calls[0][0]).toBe('second');
  });

  it('без инъекции — фолбэк на expo-speech (stop перед speak)', () => {
    speakAfterSfx('fallback path', { sfx: null, language: 'en-US' });
    expect(speechStopMock).toHaveBeenCalled();
    expect(speechSpeakMock).toHaveBeenCalledTimes(1);
    expect(speechSpeakMock.mock.calls[0][0]).toBe('fallback path');
    expect(speechSpeakMock.mock.calls[0][1]).toMatchObject({ language: 'en-US' });
  });

  it('пустой текст — no-op', () => {
    const speakSpy = jest.fn();
    setFcTtsSpeaker(speakSpy);
    speakAfterSfx('   ');
    jest.advanceTimersByTime(500);
    expect(speakSpy).not.toHaveBeenCalled();
    expect(createAudioPlayerMock).not.toHaveBeenCalled();
  });

  it('E9: ни одного наложения SFX на TTS — для КАЖДОГО события полной карты §5', () => {
    for (const name of ALL_SFX) {
      __resetFcSoundServiceForTests();
      createAudioPlayerMock.mockClear();
      const speakSpy = jest.fn();
      setFcTtsSpeaker(speakSpy);
      speakAfterSfx('phrase', { sfx: name, language: 'en-US' });
      // SFX стартовал сразу, TTS молчит весь зазор
      expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(FC_SFX_TTS_GAP_MS - 1);
      expect(speakSpy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(2);
      expect(speakSpy).toHaveBeenCalledTimes(1);
    }
  });
});

describe('E9: автоозвучка — тумблер fc_autospeak_on (дефолт true)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('дефолт — автопроизношение включено', () => {
    expect(isFcAutoSpeakEnabled()).toBe(true);
  });

  it('on: SFX → 120мс → TTS (та же очередь)', () => {
    const speakSpy = jest.fn();
    setFcTtsSpeaker(speakSpy);
    autoSpeakAfterSfx('good answer', { sfx: 'correct', language: 'en-US' });
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1);
    expect(speakSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(FC_SFX_TTS_GAP_MS + 5);
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect(speakSpy.mock.calls[0][0]).toBe('good answer');
  });

  it('off: SFX события играет, TTS не запускается вовсе', async () => {
    await setFcAutoSpeakEnabled(false);
    expect(isFcAutoSpeakEnabled()).toBe(false);
    const speakSpy = jest.fn();
    setFcTtsSpeaker(speakSpy);
    autoSpeakAfterSfx('silent', { sfx: 'incorrect' });
    expect(createAudioPlayerMock).toHaveBeenCalledTimes(1); // SFX остался
    jest.advanceTimersByTime(1000);
    expect(speakSpy).not.toHaveBeenCalled(); // речи нет
    expect(speechSpeakMock).not.toHaveBeenCalled();
  });

  it('off + sfx: null — полная тишина', async () => {
    await setFcAutoSpeakEnabled(false);
    const speakSpy = jest.fn();
    setFcTtsSpeaker(speakSpy);
    autoSpeakAfterSfx('nothing', { sfx: null });
    jest.advanceTimersByTime(1000);
    expect(createAudioPlayerMock).not.toHaveBeenCalled();
    expect(speakSpy).not.toHaveBeenCalled();
  });

  it('тумблеры персистятся в AsyncStorage под своими ключами', async () => {
    await setFcAutoSpeakEnabled(false);
    await setFcSfxEnabled(false);
    expect(AsyncStorageMock.setItem).toHaveBeenCalledWith('fc_autospeak_on', 'false');
    expect(AsyncStorageMock.setItem).toHaveBeenCalledWith('fc_sfx_on', 'false');
    await setFcAutoSpeakEnabled(true);
    expect(AsyncStorageMock.setItem).toHaveBeenCalledWith('fc_autospeak_on', 'true');
  });

  it('тумблеры независимы: sfx off + autospeak on → речь сразу, без SFX и без паузы', async () => {
    await setFcSfxEnabled(false);
    const speakSpy = jest.fn();
    setFcTtsSpeaker(speakSpy);
    autoSpeakAfterSfx('instant speech', { sfx: 'correct' });
    expect(createAudioPlayerMock).not.toHaveBeenCalled();
    expect(speakSpy).toHaveBeenCalledTimes(1);
  });
});

describe('fcHaptic — платформенный маппинг §5', () => {
  it('iOS: correct → notification Success; wrong → notification Error', async () => {
    Platform.OS = 'ios';
    fcHaptic('correct');
    fcHaptic('wrong');
    await flushMicrotasks();
    expect(notificationAsyncMock).toHaveBeenCalledWith('success');
    expect(notificationAsyncMock).toHaveBeenCalledWith('error');
    expect(impactAsyncMock).not.toHaveBeenCalled();
  });

  it('Android: notification*/Medium деградируют до impact Light', async () => {
    Platform.OS = 'android';
    fcHaptic('correct');
    fcHaptic('wrong');
    fcHaptic('star');
    await flushMicrotasks();
    expect(notificationAsyncMock).not.toHaveBeenCalled();
    expect(impactAsyncMock).toHaveBeenCalledTimes(3);
    expect(impactAsyncMock).toHaveBeenCalledWith('light');
  });

  it('порог свайпа → selection на обеих платформах', async () => {
    Platform.OS = 'android';
    fcHaptic('threshold');
    await flushMicrotasks();
    expect(selectionAsyncMock).toHaveBeenCalledTimes(1);
  });

  it('web → полный no-op', async () => {
    Platform.OS = 'web';
    fcHaptic('correct');
    fcHaptic('threshold');
    fcHaptic('star');
    await flushMicrotasks();
    expect(notificationAsyncMock).not.toHaveBeenCalled();
    expect(impactAsyncMock).not.toHaveBeenCalled();
    expect(selectionAsyncMock).not.toHaveBeenCalled();
  });
});
