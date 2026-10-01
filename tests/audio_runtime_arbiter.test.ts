jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

import {
  RecordingAudioArbiter,
  SpokenAudioArbiter,
  claimSpokenAudio,
  claimVideoAudio,
  stopCurrentSpokenAudio,
} from '../modules/audio/audio_runtime_arbiter';
import { setManagedAudioMode } from '../app/audio_session_coordinator';

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

// PM-207: видео, озвучка и микрофон — один владелец звука.
describe('video / spoken / recording coordination (PM-207)', () => {
  afterEach(async () => {
    stopCurrentSpokenAudio();
    await setManagedAudioMode({ allowsRecording: false } as never);
  });

  it('new spoken audio pauses a playing video', () => {
    const pauseVideo = jest.fn();
    const video = claimVideoAudio(pauseVideo)!;
    expect(video.isCurrent()).toBe(true);

    const spoken = claimSpokenAudio(jest.fn(), 'test:tts');

    expect(spoken).not.toBeNull();
    expect(pauseVideo).toHaveBeenCalledTimes(1);
    expect(video.isCurrent()).toBe(false);
    spoken!.release();
  });

  it('a video starting silences the current spoken audio', () => {
    const stopSpoken = jest.fn();
    const spoken = claimSpokenAudio(stopSpoken, 'test:tts')!;

    const video = claimVideoAudio(jest.fn())!;

    expect(stopSpoken).toHaveBeenCalledTimes(1);
    expect(spoken.isCurrent()).toBe(false);
    expect(video.isCurrent()).toBe(true);
    video.release();
  });

  it('microphone capture pauses the video and keeps video and speech out', async () => {
    const pauseVideo = jest.fn();
    const video = claimVideoAudio(pauseVideo)!;

    await setManagedAudioMode({ allowsRecording: true } as never);

    expect(pauseVideo).toHaveBeenCalledTimes(1);
    expect(video.isCurrent()).toBe(false);
    expect(claimVideoAudio(jest.fn())).toBeNull();
    expect(claimSpokenAudio(jest.fn(), 'test:tts')).toBeNull();
  });

  it('a naturally finished video releases without pausing and does not block speech', () => {
    const pauseVideo = jest.fn();
    const video = claimVideoAudio(pauseVideo)!;
    video.release();

    const spoken = claimSpokenAudio(jest.fn(), 'test:tts');

    expect(pauseVideo).not.toHaveBeenCalled();
    expect(spoken).not.toBeNull();
    spoken!.release();
  });
});
