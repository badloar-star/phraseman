// Numeric video recovery: actual playback grants +1 every 36 seconds and
// replaces passive recovery for that same segment instead of stacking with it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  creditVideoWatchSegment,
  initialVerifiedPlaybackState,
  measureVerifiedPlaybackProgress,
  getVideoWatchTargetRemainingMs,
  VIDEO_WATCH_TARGET_RECOVERY_MS,
} from '../app/energy_video_watch_credit';
import { timeUntilEnergyAtLeast } from '../app/energy_state_v2';

const ENERGY_KEY = 'energy_state';
const VIDEO_UNIT_MS = 36 * 1000;

async function seedEnergy(current: number): Promise<void> {
  await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify({
    schemaVersion: 2,
    current,
    lastSettledAt: Date.now(),
    recoveryCreditMicrounits: 0,
    recoveryDivisionRemainder: 0,
  }));
}

async function readEnergy(): Promise<Record<string, number>> {
  return JSON.parse((await AsyncStorage.getItem(ENERGY_KEY)) as string) as Record<string, number>;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  __resetAccountGenerationForTests();
  beginAccountGeneration('video-energy-user');
});

describe('numeric video watch credit', () => {
  afterEach(() => jest.restoreAllMocks());

  it('credits only monotonic forward playback and clamps it to native wall time', () => {
    let state = initialVerifiedPlaybackState('video-a');
    let measured = measureVerifiedPlaybackProgress(state, { playing: true, positionMs: 10_000 }, 1_000);
    expect(measured.creditedMs).toBe(0);
    state = measured.state;

    measured = measureVerifiedPlaybackProgress(state, { playing: true, positionMs: 11_400 }, 2_000);
    expect(measured.creditedMs).toBe(1_000);
    state = measured.state;

    measured = measureVerifiedPlaybackProgress(state, { playing: true, positionMs: 11_400 }, 3_000);
    expect(measured.creditedMs).toBe(0); // stalled player
  });

  it('does not credit seek jumps or replay an already seen position range', () => {
    let state = initialVerifiedPlaybackState('video-a');
    state = measureVerifiedPlaybackProgress(state, { playing: true, positionMs: 10_000 }, 1_000).state;
    state = measureVerifiedPlaybackProgress(state, { playing: true, positionMs: 11_000 }, 2_000).state;

    let measured = measureVerifiedPlaybackProgress(state, { playing: true, positionMs: 80_000 }, 3_000);
    expect(measured.creditedMs).toBe(0); // forward seek
    state = measured.state;
    measured = measureVerifiedPlaybackProgress(state, { playing: true, positionMs: 81_000 }, 4_000);
    expect(measured.creditedMs).toBe(1_000); // real playback after seek
    state = measured.state;

    state = measureVerifiedPlaybackProgress(state, { playing: true, positionMs: 10_000 }, 5_000).state;
    measured = measureVerifiedPlaybackProgress(state, { playing: true, positionMs: 11_000 }, 6_000);
    expect(measured.creditedMs).toBe(0); // replayed range
  });

  it('resets range ownership when the video source changes', () => {
    let state = initialVerifiedPlaybackState('video-a');
    state = measureVerifiedPlaybackProgress(state, { playing: true, positionMs: 0 }, 1_000).state;
    state = measureVerifiedPlaybackProgress(state, { playing: true, positionMs: 1_000 }, 2_000).state;
    const reset = measureVerifiedPlaybackProgress(state, { sourceId: 'video-b', playing: true, positionMs: 0 }, 3_000);
    expect(reset.creditedMs).toBe(0);
    expect(reset.state.sourceId).toBe('video-b');
  });

  it('uses the approved 100/hour rate', () => {
    expect(VIDEO_WATCH_TARGET_RECOVERY_MS).toBe(VIDEO_UNIT_MS);
    expect(getVideoWatchTargetRemainingMs()).toBe(VIDEO_UNIT_MS);
  });

  it('grants one whole unit for 36 seconds of actual playback', async () => {
    await seedEnergy(42);
    await expect(creditVideoWatchSegment(VIDEO_UNIT_MS)).resolves.toMatchObject({
      applied: true,
      watchedMs: VIDEO_UNIT_MS,
      from: 42,
      to: 43,
    });
    await expect(readEnergy()).resolves.toMatchObject({ schemaVersion: 2, current: 43 });
  });

  it('preserves partial playback across flushes without rounding it away', async () => {
    await seedEnergy(42);
    await expect(creditVideoWatchSegment(VIDEO_UNIT_MS / 2)).resolves.toMatchObject({
      applied: true,
      from: 42,
      to: 42,
    });
    await expect(creditVideoWatchSegment(VIDEO_UNIT_MS / 2)).resolves.toMatchObject({
      applied: true,
      from: 42,
      to: 43,
    });
  });

  it('preserves five passive minutes and applies 10x total recovery to the watched segment', async () => {
    const now = Date.parse('2026-09-12T12:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now);
    await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify({
      schemaVersion: 2,
      current: 42,
      lastSettledAt: now - 5 * 60_000 - VIDEO_UNIT_MS,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
    }));

    await expect(creditVideoWatchSegment(VIDEO_UNIT_MS)).resolves.toMatchObject({
      applied: true,
      from: 42,
      to: 43,
      lastSettledAt: now,
    });
    const state = await readEnergy();
    expect(timeUntilEnergyAtLeast({
      current: state.current,
      required: state.current + 1,
      unitMs: 6 * 60_000,
      recoveryCreditMicrounits: state.recoveryCreditMicrounits,
      recoveryDivisionRemainder: state.recoveryDivisionRemainder,
    })).toBe(60_000);
  });

  it('does not double-count passive recovery already settled during playback', async () => {
    const now = Date.parse('2026-09-12T12:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now);
    await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify({
      schemaVersion: 2,
      current: 42,
      lastSettledAt: now - 18_000,
      // An intermediate EnergyContext settlement already preserved the first
      // 18 seconds of the same 36-second playback segment at passive 1x.
      recoveryCreditMicrounits: 50_000,
      recoveryDivisionRemainder: 0,
    }));

    await expect(creditVideoWatchSegment(VIDEO_UNIT_MS)).resolves.toMatchObject({
      applied: true,
      from: 42,
      to: 43,
      lastSettledAt: now,
    });
    await expect(readEnergy()).resolves.toMatchObject({
      current: 43,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
      lastSettledAt: now,
    });
  });

  it('never exceeds the active full state', async () => {
    await seedEnergy(100);
    await expect(creditVideoWatchSegment(VIDEO_UNIT_MS)).resolves.toEqual({
      applied: false,
      reason: 'already_full',
    });
    await expect(readEnergy()).resolves.toMatchObject({ current: 100 });
  });

  it('names every fail-closed early exit', async () => {
    await seedEnergy(1);
    await expect(creditVideoWatchSegment(200)).resolves.toEqual({
      applied: false,
      reason: expect.stringContaining('segment_too_short'),
    });

    await AsyncStorage.clear();
    await expect(creditVideoWatchSegment(VIDEO_UNIT_MS)).resolves.toEqual({
      applied: false,
      reason: 'no_energy_state',
    });

    await AsyncStorage.setItem(ENERGY_KEY, '{not json');
    await expect(creditVideoWatchSegment(VIDEO_UNIT_MS)).resolves.toEqual({
      applied: false,
      reason: 'corrupt_energy_state',
    });
  });
});
