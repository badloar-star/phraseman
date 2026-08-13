import { act, cleanup, renderHook } from "@testing-library/react-native";

type Status = Readonly<{ isLoaded: boolean; didJustFinish: boolean }>;
let statusListener: ((status: Status) => void) | null = null;
let ready = true;
let claimCurrent = true;
const releaseClaim = jest.fn();
const player = {
  currentStatus: { isLoaded: false, didJustFinish: false },
  addListener: jest.fn((_event: string, listener: (status: Status) => void) => {
    statusListener = listener;
    return { remove: jest.fn() };
  }),
  seekTo: jest.fn(async () => undefined),
  play: jest.fn(),
  pause: jest.fn(),
  remove: jest.fn(),
};
const createAudioPlayer = jest.fn(
  (_source: unknown, _options: unknown) => player,
);
const claimSpokenAudio = jest.fn((_stop: () => void) => ({
  isCurrent: () => claimCurrent,
  release: releaseClaim,
}));

jest.mock("expo-audio", () => ({
  createAudioPlayer: (source: unknown, options: unknown) =>
    createAudioPlayer(source, options),
}));
jest.mock("../modules/audio/audio_runtime_arbiter", () => ({
  claimSpokenAudio: (stop: () => void) => claimSpokenAudio(stop),
  whenSpokenAudioReady: async () => ready,
}));

/* eslint-disable import/first -- native audio and arbiter are mocked first */
import { useLearningV2ActivityLocalAudioPlaybackV1 } from "../app/use_learning_v2_activity_local_audio_playback_v1";
/* eslint-enable import/first */

describe("Learning V2 local selected-word playback lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    statusListener = null;
    ready = true;
    claimCurrent = true;
    player.currentStatus = { isLoaded: false, didJustFinish: false };
  });

  afterEach(async () => {
    await cleanup();
  });

  it("plays only a local file after the shared audio arbiter is ready", async () => {
    const hook = await renderHook(() =>
      useLearningV2ActivityLocalAudioPlaybackV1({
        active: true,
        taskId: "task-1",
      }),
    );
    expect(hook.result.current.play("https://example.test/audio.mp3")).toBe(
      "unavailable",
    );
    expect(createAudioPlayer).not.toHaveBeenCalled();

    expect(hook.result.current.play("file:///cache/exact.mp3")).toBe("started");
    expect(createAudioPlayer).toHaveBeenCalledWith(
      { uri: "file:///cache/exact.mp3" },
      expect.objectContaining({
        downloadFirst: false,
        keepAudioSessionActive: true,
      }),
    );
    await act(async () => {
      player.currentStatus = { isLoaded: true, didJustFinish: false };
      statusListener?.(player.currentStatus);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it("releases the player on task change and never starts after lifecycle revocation", async () => {
    let taskId = "task-1";
    const hook = await renderHook(() =>
      useLearningV2ActivityLocalAudioPlaybackV1({ active: true, taskId }),
    );
    hook.result.current.play("file:///cache/exact.mp3");
    taskId = "task-2";
    await hook.rerender({});
    expect(player.pause).toHaveBeenCalled();
    expect(player.remove).toHaveBeenCalled();
    expect(releaseClaim).toHaveBeenCalled();

    ready = false;
    hook.result.current.play("file:///cache/next.mp3");
    await act(async () => {
      await Promise.resolve();
      player.currentStatus = { isLoaded: true, didJustFinish: false };
      statusListener?.(player.currentStatus);
    });
    expect(player.play).not.toHaveBeenCalled();
  });
});
