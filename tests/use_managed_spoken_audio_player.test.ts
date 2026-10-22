import { act, cleanup, renderHook } from '@testing-library/react-native';
import type { AudioPlayer } from 'expo-audio';

jest.mock('../modules/audio/audio_runtime_arbiter', () => ({
  claimSpokenAudio: jest.fn(),
  whenSpokenAudioReady: jest.fn(),
}));

import {
  claimSpokenAudio,
  whenSpokenAudioReady,
} from '../modules/audio/audio_runtime_arbiter';
import {
  nextManagedLocalAudioPlaybackState,
  shouldStartManagedAudioRequest,
  useManagedAudioRequestStart,
  useManagedSpokenAudioPlayer,
} from '../hooks/use_managed_spoken_audio_player';

type Claim = Readonly<{ isCurrent(): boolean; release(): void }>;

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, reject, resolve };
}

function fakePlayer(overrides: Partial<AudioPlayer> = {}): AudioPlayer {
  return {
    pause: jest.fn(),
    play: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    playing: false,
    isLoaded: true,
    currentTime: 0,
    duration: 1,
    ...overrides,
  } as unknown as AudioPlayer;
}

describe('useManagedSpokenAudioPlayer lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (claimSpokenAudio as jest.Mock).mockReset();
    (whenSpokenAudioReady as jest.Mock).mockReset().mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('reuses one live claim across a duplicate start instead of revoking playback', async () => {
    let current = true;
    const claim: Claim = {
      isCurrent: () => current,
      release: jest.fn(() => { current = false; }),
    };
    (claimSpokenAudio as jest.Mock).mockReturnValue(claim);
    const player = fakePlayer();
    const hook = await renderHook(() => useManagedSpokenAudioPlayer(player));

    await act(async () => {
      expect(await hook.result.current.playFromStart()).toBe(true);
      expect(await hook.result.current.playFromStart()).toBe(true);
    });

    expect(claimSpokenAudio).toHaveBeenCalledTimes(1);
    expect(player.pause).not.toHaveBeenCalled();
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('never plays after readiness hangs and the claim is stopped in background cleanup', async () => {
    let current = true;
    const claim: Claim = {
      isCurrent: () => current,
      release: jest.fn(() => { current = false; }),
    };
    (claimSpokenAudio as jest.Mock).mockReturnValue(claim);
    const readiness = deferred<boolean>();
    (whenSpokenAudioReady as jest.Mock).mockReturnValue(readiness.promise);
    const player = fakePlayer();
    const hook = await renderHook(() => useManagedSpokenAudioPlayer(player));
    let result: boolean | undefined;
    let settledAtDeadline = false;

    await act(async () => {
      const pending = hook.result.current.playFromStart().then((value) => {
        result = value;
        settledAtDeadline = true;
      });
      hook.result.current.stop('app-background');
      await jest.advanceTimersByTimeAsync(2_000);
      await Promise.resolve();
      const observedAtDeadline = settledAtDeadline;
      readiness.resolve(true);
      await pending;
      settledAtDeadline = observedAtDeadline;
    });

    expect(settledAtDeadline).toBe(true);
    expect(result).toBe(false);
    expect(player.play).not.toHaveBeenCalled();
    expect(claim.release).toHaveBeenCalled();
  });

  it('releases the claim and reports failure when readiness rejects', async () => {
    let current = true;
    const claim: Claim = {
      isCurrent: () => current,
      release: jest.fn(() => { current = false; }),
    };
    (claimSpokenAudio as jest.Mock).mockReturnValue(claim);
    (whenSpokenAudioReady as jest.Mock).mockRejectedValue(new Error('mode failed'));
    const player = fakePlayer();
    const hook = await renderHook(() => useManagedSpokenAudioPlayer(player));
    let result: boolean | undefined;

    await act(async () => {
      result = await hook.result.current.playFromStart();
    });

    expect(result).toBe(false);
    expect(player.play).not.toHaveBeenCalled();
    expect(claim.release).toHaveBeenCalledTimes(1);
  });

  it('releases the claim and never plays when native seek hangs', async () => {
    let current = true;
    const claim: Claim = {
      isCurrent: () => current,
      release: jest.fn(() => { current = false; }),
    };
    (claimSpokenAudio as jest.Mock).mockReturnValue(claim);
    const seek = deferred<void>();
    const player = fakePlayer({ seekTo: jest.fn(() => seek.promise) });
    const hook = await renderHook(() => useManagedSpokenAudioPlayer(player));
    let result: boolean | undefined;
    let settledAtDeadline = false;

    await act(async () => {
      const pending = hook.result.current.playFromStart().then((value) => {
        result = value;
        settledAtDeadline = true;
      });
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(2_000);
      await Promise.resolve();
      const observedAtDeadline = settledAtDeadline;
      seek.resolve();
      await pending;
      settledAtDeadline = observedAtDeadline;
    });

    expect(settledAtDeadline).toBe(true);
    expect(result).toBe(false);
    expect(player.play).not.toHaveBeenCalled();
    expect(claim.release).toHaveBeenCalledTimes(1);
  });

  it('does not let an older rejected seek release the claim reused by a newer start', async () => {
    let current = true;
    const claim: Claim = {
      isCurrent: () => current,
      release: jest.fn(() => { current = false; }),
    };
    (claimSpokenAudio as jest.Mock).mockReturnValue(claim);
    const firstSeek = deferred<void>();
    const player = fakePlayer({
      seekTo: jest.fn()
        .mockImplementationOnce(() => firstSeek.promise)
        .mockResolvedValue(undefined),
    });
    const hook = await renderHook(() => useManagedSpokenAudioPlayer(player));
    let first!: Promise<boolean>;

    await act(async () => {
      first = hook.result.current.playFromStart();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      expect(await hook.result.current.playFromStart()).toBe(true);
    });
    firstSeek.reject(new Error('old seek failed'));
    await expect(first).resolves.toBe(false);
    await act(async () => {
      expect(await hook.result.current.playFromStart()).toBe(true);
    });

    expect(claim.release).not.toHaveBeenCalled();
    expect(claimSpokenAudio).toHaveBeenCalledTimes(1);
  });
});

describe('Learning V2 local audio request gating', () => {
  it('rechecks readiness when a replacement source emits a new status event with the same loaded boolean', async () => {
    let playerIsLoaded = false;
    const player = fakePlayer({
      setPlaybackRate: jest.fn(),
    });
    Object.defineProperty(player, 'isLoaded', {
      configurable: true,
      get: () => playerIsLoaded,
    });
    const managedAudio = {
      playFromStart: jest.fn().mockResolvedValue(true),
    };
    const startedRequestIdRef = { current: null as number | null };
    const onStartFailed = jest.fn();
    const request = { requestId: 8, rate: 1 };
    const hook = await renderHook(
      ({ status }) => useManagedAudioRequestStart({
        managedAudio,
        onStartFailed,
        player,
        request,
        startedRequestIdRef,
        status,
      }),
      { initialProps: { status: { isLoaded: true } } },
    );

    expect(managedAudio.playFromStart).not.toHaveBeenCalled();

    playerIsLoaded = true;
    await act(async () => {
      hook.rerender({ status: { isLoaded: true } });
      await Promise.resolve();
    });

    expect(player.setPlaybackRate).toHaveBeenCalledWith(1, 'high');
    expect(managedAudio.playFromStart).toHaveBeenCalledTimes(1);

    await act(async () => {
      hook.rerender({ status: { isLoaded: true } });
      await Promise.resolve();
    });
    expect(managedAudio.playFromStart).toHaveBeenCalledTimes(1);
    expect(onStartFailed).not.toHaveBeenCalled();
  });

  it('marks the request failed when managed playback rejects', async () => {
    const player = fakePlayer({ setPlaybackRate: jest.fn() });
    const managedAudio = {
      playFromStart: jest.fn().mockRejectedValue(new Error('unexpected start rejection')),
    };
    const startedRequestIdRef = { current: null as number | null };
    const onStartFailed = jest.fn();

    await act(async () => {
      await renderHook(() => useManagedAudioRequestStart({
        managedAudio,
        onStartFailed,
        player,
        request: { requestId: 8, rate: 1 },
        startedRequestIdRef,
        status: { isLoaded: true },
      }));
      await Promise.resolve();
    });

    expect(onStartFailed).toHaveBeenCalledWith(8);
  });

  it('does not start a new request from a stale loaded status belonging to the old source', () => {
    expect(shouldStartManagedAudioRequest({
      requestId: 8,
      startedRequestId: 7,
      statusIsLoaded: true,
      playerIsLoaded: false,
    })).toBe(false);
  });

  it('starts each loaded request at most once', () => {
    expect(shouldStartManagedAudioRequest({
      requestId: 8,
      startedRequestId: null,
      statusIsLoaded: true,
      playerIsLoaded: true,
    })).toBe(true);
    expect(shouldStartManagedAudioRequest({
      requestId: 8,
      startedRequestId: 8,
      statusIsLoaded: true,
      playerIsLoaded: true,
    })).toBe(false);
  });

  it('ignores stale finish events while a replacement source is still loading', () => {
    expect(nextManagedLocalAudioPlaybackState(
      { requestId: 8, state: 'loading' },
      { requestId: 8, startedRequestId: null, playing: false, didJustFinish: true },
    )).toEqual({ requestId: 8, state: 'loading' });
  });

  it('returns a stopped in-flight request to a tappable idle state', () => {
    expect(nextManagedLocalAudioPlaybackState(
      { requestId: 8, state: 'playing' },
      { requestId: 8, startedRequestId: 8, playing: false, didJustFinish: false },
    )).toEqual({ requestId: 8, state: 'idle' });
  });
});
