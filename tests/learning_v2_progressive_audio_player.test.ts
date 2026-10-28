const createAudioPlayer = jest.fn();
const resolveCached = jest.fn();
const claimSpokenAudio = jest.fn();
const whenSpokenAudioReady = jest.fn();

jest.mock("expo-audio", () => ({
  createAudioPlayer: (...args: unknown[]) => createAudioPlayer(...args),
}));
jest.mock("../modules/learning-v2/audio/progressive_audio_runtime", () => ({
  getLearningV2ProgressiveAudioRuntime: () => ({ resolveCached }),
}));
jest.mock("../modules/audio/audio_runtime_arbiter", () => ({
  claimSpokenAudio: (...args: unknown[]) => claimSpokenAudio(...args),
  whenSpokenAudioReady: (...args: unknown[]) => whenSpokenAudioReady(...args),
}));

import {
  playLearningV2RecordedAudio,
  stopLearningV2RecordedAudio,
} from "../modules/learning-v2/audio/progressive_audio_player";

const request = {
  studyTarget: "es" as const,
  lessonOrdinal: 1,
  sessionOrdinal: 1,
  text: "Hola.",
  rate: 0.7,
};
const makeClaim = () => ({
  isCurrent: jest.fn(() => true),
  release: jest.fn(),
});

beforeEach(() => {
  stopLearningV2RecordedAudio();
  jest.clearAllMocks();
  resolveCached.mockResolvedValue({
    uri: "file:///clip.mp3",
    clipSha256: "a".repeat(64),
  });
});
afterEach(() => { stopLearningV2RecordedAudio(); });

test("applies requested rate and settles normal completion once", async () => {
  const claim = makeClaim();
  claimSpokenAudio.mockReturnValue(claim);
  whenSpokenAudioReady.mockResolvedValue(true);
  let status: ((value: any) => void) | null = null;
  const player = {
    setPlaybackRate: jest.fn(),
    addListener: jest.fn((_name, callback) => {
      status = callback;
      return { remove: jest.fn() };
    }),
    play: jest.fn(),
    pause: jest.fn(),
    release: jest.fn(),
  };
  createAudioPlayer.mockReturnValue(player);
  const callbacks = {
    onStart: jest.fn(),
    onDone: jest.fn(),
    onStopped: jest.fn(),
  };
  await expect(playLearningV2RecordedAudio(request, callbacks)).resolves.toBe(
    true,
  );
  expect(player.setPlaybackRate).toHaveBeenCalledWith(0.7);
  status?.({ isLoaded: true, playing: true, didJustFinish: false });
  status?.({ isLoaded: true, playing: false, didJustFinish: true });
  expect(callbacks.onStart).toHaveBeenCalledTimes(1);
  expect(callbacks.onDone).toHaveBeenCalledTimes(1);
  expect(callbacks.onStopped).not.toHaveBeenCalled();
});

test("denied claim and rejected readiness settle as stopped without starting or falling back", async () => {
  const denied = { onStopped: jest.fn() };
  claimSpokenAudio.mockReturnValue(null);
  await expect(playLearningV2RecordedAudio(request, denied)).resolves.toBe(
    true,
  );
  expect(denied.onStopped).toHaveBeenCalledTimes(1);
  expect(createAudioPlayer).not.toHaveBeenCalled();

  const claim = makeClaim();
  const rejected = { onStopped: jest.fn() };
  claimSpokenAudio.mockReturnValue(claim);
  whenSpokenAudioReady.mockRejectedValue(new Error("ready failed"));
  await expect(playLearningV2RecordedAudio(request, rejected)).resolves.toBe(
    true,
  );
  expect(rejected.onStopped).toHaveBeenCalledTimes(1);
  expect(claim.release).toHaveBeenCalled();
  expect(createAudioPlayer).not.toHaveBeenCalled();
});

test("stop during cache lookup settles once and late resolution cannot create a player", async () => {
  let finish: ((value: unknown) => void) | null = null;
  resolveCached.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const callbacks = { onStopped: jest.fn() };
  const pending = playLearningV2RecordedAudio(request, callbacks);
  await Promise.resolve();
  stopLearningV2RecordedAudio();
  finish?.({ uri: "file:///late.mp3", clipSha256: "b".repeat(64) });
  await expect(pending).resolves.toBe(true);
  expect(callbacks.onStopped).toHaveBeenCalledTimes(1);
  expect(createAudioPlayer).not.toHaveBeenCalled();
});

test.each(["miss", "reject"] as const)(
  "superseded delayed cache %s is handled without interrupting the current player",
  async (outcome) => {
    let resolveFirst!: (value: unknown) => void;
    let rejectFirst!: (error: Error) => void;
    resolveCached
      .mockReturnValueOnce(
        new Promise((resolve, reject) => {
          resolveFirst = resolve;
          rejectFirst = reject;
        }),
      )
      .mockResolvedValueOnce({
        uri: "file:///current.mp3",
        clipSha256: "c".repeat(64),
      });
    const claim = makeClaim();
    claimSpokenAudio.mockReturnValue(claim);
    whenSpokenAudioReady.mockResolvedValue(true);
    const currentPlayer = {
      setPlaybackRate: jest.fn(),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      play: jest.fn(),
      pause: jest.fn(),
      release: jest.fn(),
    };
    createAudioPlayer.mockReturnValue(currentPlayer);
    const staleCallbacks = { onStopped: jest.fn() };
    const stale = playLearningV2RecordedAudio(request, staleCallbacks);
    await Promise.resolve();
    await expect(
      playLearningV2RecordedAudio({ ...request, text: "Actual." }),
    ).resolves.toBe(true);
    if (outcome === "miss") resolveFirst(null);
    else rejectFirst(new Error("late cache failure"));
    await expect(stale).resolves.toBe(true);
    expect(staleCallbacks.onStopped).toHaveBeenCalledTimes(1);
    expect(currentPlayer.release).not.toHaveBeenCalled();
  },
);
