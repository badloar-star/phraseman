jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));

import { PREWARM_STEP_GAP_MS, SoundDirector, type SfxPlaybackBackend } from '@/modules/audio/sound_director';
import type { SoundEventId } from '@/modules/audio/sound_events';

/**
 * зачем (координатор 13.10, профиль Сверки ×3): прогрев создавал все нативные плееры одним куском и держал JS-поток 3,2–3,6 с
 * после кадра Главной. Сторож: один плеер за шаг, пауза между шагами, без дублей, dispose снимает очередь.
 */
class PrewarmBackend implements SfxPlaybackBackend {
  batches: string[][] = [];
  play() { return true; }
  stopExclusive() {}
  stopAll() {}
  dispose() {}
  prewarm(entries: ReadonlyArray<{ eventId: SoundEventId; source: number }>) {
    this.batches.push(entries.map((entry) => entry.eventId));
  }
}

const TAPS: SoundEventId[] = ['pm.ui.tap_soft', 'pm.ui.tap_primary', 'pm.ui.tap_blocked'];

describe('SoundDirector.prewarm — по одному плееру за шаг', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('первый плеер сразу, остальные — через паузу, каждый отдельным вызовом', () => {
    const backend = new PrewarmBackend();
    const director = new SoundDirector(backend);
    director.prewarm(TAPS);
    expect(backend.batches).toEqual([['pm.ui.tap_soft']]);
    jest.advanceTimersByTime(PREWARM_STEP_GAP_MS - 1);
    expect(backend.batches).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(backend.batches).toEqual([['pm.ui.tap_soft'], ['pm.ui.tap_primary']]);
    jest.advanceTimersByTime(PREWARM_STEP_GAP_MS);
    expect(backend.batches.every((batch) => batch.length === 1)).toBe(true);
    expect(backend.batches.flat()).toEqual(TAPS);
  });

  it('вторая волна во время первой встаёт в ту же очередь без дублей', () => {
    const backend = new PrewarmBackend();
    const director = new SoundDirector(backend);
    director.prewarm(TAPS);
    director.prewarm(['pm.ui.tap_primary', 'pm.reward.small']);
    jest.advanceTimersByTime(PREWARM_STEP_GAP_MS * 10);
    expect(backend.batches.flat()).toEqual([...TAPS, 'pm.reward.small']);
  });

  it('dispose снимает оставшуюся очередь', () => {
    const backend = new PrewarmBackend();
    const director = new SoundDirector(backend);
    director.prewarm(TAPS);
    director.dispose();
    jest.advanceTimersByTime(PREWARM_STEP_GAP_MS * 10);
    expect(backend.batches.flat()).toEqual(['pm.ui.tap_soft']);
  });

  it('медленный шаг пишется console.warn (виден в релизе)', () => {
    const backend = new PrewarmBackend();
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValueOnce(0).mockReturnValueOnce(450);
    const warn = console.warn as jest.Mock;
    new SoundDirector(backend).prewarm(['pm.ui.tap_soft']);
    expect(warn.mock.calls.some(([line]) => String(line).includes('[SFX-PREWARM] step event=pm.ui.tap_soft ms=450') && String(line).includes('slow'))).toBe(true);
  });
});
