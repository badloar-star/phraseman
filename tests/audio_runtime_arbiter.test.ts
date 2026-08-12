jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

import { RecordingAudioArbiter, SpokenAudioArbiter } from '../modules/audio/audio_runtime_arbiter';

describe('SpokenAudioArbiter', () => {
  let voiceEnabled = true;
  let recordingActive = false;
  let leaseReleases: jest.Mock[];
  let arbiter: SpokenAudioArbiter;

  beforeEach(() => {
    voiceEnabled = true;
    recordingActive = false;
    leaseReleases = [];
    arbiter = new SpokenAudioArbiter(
      () => {
        const release = jest.fn();
        leaseReleases.push(release);
        return { release };
      },
      () => voiceEnabled,
      () => recordingActive,
    );
  });

  it('lets exactly one spoken owner survive and stops the superseded path', () => {
    const stopFirst = jest.fn();
    const first = arbiter.claim(stopFirst)!;
    const stopSecond = jest.fn();
    const second = arbiter.claim(stopSecond)!;

    expect(first.isCurrent()).toBe(false);
    expect(second.isCurrent()).toBe(true);
    expect(stopFirst).toHaveBeenCalledTimes(1);
    expect(stopSecond).not.toHaveBeenCalled();
    expect(leaseReleases[0]).toHaveBeenCalledTimes(1);
    expect(leaseReleases[1]).not.toHaveBeenCalled();
  });

  it('releases idempotently without stopping a naturally completed path', () => {
    const stop = jest.fn();
    const claim = arbiter.claim(stop)!;

    claim.release();
    claim.release();

    expect(claim.isCurrent()).toBe(false);
    expect(stop).not.toHaveBeenCalled();
    expect(leaseReleases[0]).toHaveBeenCalledTimes(1);
    expect(arbiter.hasOwner()).toBe(false);
  });

  it('blocks playback while recording or when voice audio is disabled', () => {
    recordingActive = true;
    expect(arbiter.claim(jest.fn())).toBeNull();
    recordingActive = false;
    voiceEnabled = false;
    expect(arbiter.claim(jest.fn())).toBeNull();
    expect(leaseReleases).toHaveLength(0);
  });

  it('clears ownership even when owner cleanup throws', () => {
    const claim = arbiter.claim(() => { throw new Error('native player already gone'); })!;
    expect(() => arbiter.stopCurrent()).not.toThrow();
    expect(claim.isCurrent()).toBe(false);
    expect(arbiter.hasOwner()).toBe(false);
    expect(leaseReleases[0]).toHaveBeenCalledTimes(1);
  });
});

describe('RecordingAudioArbiter', () => {
  it('preempts spoken audio and the previous microphone owner', () => {
    const releases: jest.Mock[] = [];
    const stopSpoken = jest.fn();
    const arbiter = new RecordingAudioArbiter(() => {
      const release = jest.fn();
      releases.push(release);
      return { release };
    }, stopSpoken);
    const stopFirst = jest.fn();
    const first = arbiter.claim(stopFirst);
    const second = arbiter.claim(jest.fn());

    expect(stopSpoken).toHaveBeenCalledTimes(2);
    expect(stopFirst).toHaveBeenCalledTimes(1);
    expect(first.isCurrent()).toBe(false);
    expect(second.isCurrent()).toBe(true);
    expect(releases[0]).toHaveBeenCalledTimes(1);
    expect(releases[1]).not.toHaveBeenCalled();
  });
});
