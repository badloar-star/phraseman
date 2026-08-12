import React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

const mockCommit = jest.fn(async (_scope: unknown, _envelope: unknown) => ({
  mutationId: "required-session-complete:test",
  payloadFingerprint: "a".repeat(64),
}));
const mockReplace = jest.fn();
const mockApplyResult = jest.fn(async () => ({ changed: true }));
const mockAudioSeekTo = jest.fn<Promise<void>, []>(async () => undefined);
const mockAudioPlay = jest.fn();
const mockAudioPause = jest.fn();
const mockAudioPlayer = {
  seekTo: mockAudioSeekTo,
  play: mockAudioPlay,
  pause: mockAudioPause,
};
const mockAudioSource = jest.fn<number | null, []>(() => 1);
const mockAudioStatus = {
  playing: false,
  didJustFinish: false,
  isLoaded: true,
};
let mockRouteSessionId = "lesson-1-understand-1";

jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (values: Record<string, unknown>) => values.ios ?? values.default },
  AppState: {
    currentState: "active",
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  InteractionManager: {
    runAfterInteractions: jest.fn((work: () => void) => {
      queueMicrotask(work);
      return { cancel: jest.fn() };
    }),
  },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style)
      ? Object.assign({}, ...style.filter(Boolean))
      : style,
  },
  useWindowDimensions: () => ({ width: 393, height: 852, scale: 3, fontScale: 1 }),
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: mockRouteSessionId }),
  useRouter: () => ({ replace: mockReplace, back: jest.fn(), canGoBack: () => false }),
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "session-run-skip-interaction" }));
jest.mock("expo-audio", () => ({
  useAudioPlayer: jest.fn(() => mockAudioPlayer),
  useAudioPlayerStatus: jest.fn(() => mockAudioStatus),
}));
jest.mock("../app/learning_v2_lesson1_audio_assets", () => ({
  learningV2Lesson1AudioSource: mockAudioSource,
  learningV2Lesson1FamilyUsesAudio: jest.fn((family: string) => [
    "listen_choose",
    "sound_contrast",
    "listen_build_dictation",
    "scripted_repeat_compare",
  ].includes(family)),
}));
jest.mock("../app/learning_v2_session_intro", () => {
  const ReactRuntime = require("react") as typeof import("react");
  return function MockLearningV2SessionIntro({ onComplete }: { onComplete: () => void }) {
    ReactRuntime.useEffect(() => onComplete(), [onComplete]);
    return null;
  };
});
jest.mock("react-native-reanimated", () => {
  const transition = {
    reduceMotion: () => transition,
    springify: () => transition,
    damping: () => transition,
    delay: () => transition,
    duration: () => transition,
  };
  const preset = { duration: () => transition, delay: () => transition };
  return {
    __esModule: true,
    default: { View: "View" },
    FadeIn: preset,
    FadeInDown: preset,
    ReduceMotion: { System: "system" },
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
    withSequence: (...values: unknown[]) => values.at(-1),
    withSpring: (value: unknown) => value,
  };
});
jest.mock("@expo/vector-icons/Ionicons", () => {
  const ReactRuntime = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");
  return function MockIonicon() { return ReactRuntime.createElement(View); };
});
jest.mock("../components/SafeLinearGradient", () => {
  const ReactRuntime = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");
  return { LinearGradient: ({ colors: _colors, start: _start, end: _end, locations: _locations, ...props }: Record<string, unknown>) =>
    ReactRuntime.createElement(View, props) };
});
jest.mock("../app/stable_safe_area_metrics", () => ({
  useStableSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("../app/stable_id", () => ({ getStableId: async () => "stable-user-1" }));
jest.mock("../app/account_generation", () => ({
  ensureAccountGeneration: () => ({ stableId: "stable-user-1", generation: 3 }),
  isCurrentAccountGeneration: () => true,
  withAccountTransitionLock: async (work: () => Promise<unknown>) => work(),
}));
jest.mock("../hooks/use-haptics", () => ({
  hapticError: jest.fn(async () => undefined),
  hapticSuccess: jest.fn(async () => undefined),
  hapticTap: jest.fn(async () => undefined),
}));
jest.mock("../modules/learning-v2/progress/lesson1_local_progress", () => ({
  createLesson1LocalProgressStore: () => ({ applyResult: mockApplyResult }),
}));
jest.mock("../modules/learning-v2/progress/required_session_local_commit", () => ({
  createRequiredSessionLocalCommitCoordinator: () => ({ commit: mockCommit }),
}));
jest.mock("../app/learning_v2_completion_background_scheduler", () => ({
  ensureLearningV2CompletionBackgroundSchedulerInstalled: jest.fn(),
  enterLearningV2InteractiveSurface: jest.fn(() => jest.fn()),
}));

import LearningV2SessionScreen from "../app/learning-v2/session/[id]";
import {
  __resetInteractiveNetworkQuietForTests,
  withBackgroundNetworkLease,
} from "../app/interactive_network_quiet";
import {
  __resetLearningV2SessionNetworkIntentForTests,
  learningV2SessionNetworkIntentSnapshot,
} from "../app/learning_v2_session_network_quiet";
import type { RequiredSessionCompletionEnvelopeV3 } from "../modules/learning-v2/progress/required_session_completion_envelope";

describe("Learning V2 real session skip interaction", () => {
  afterEach(async () => {
    cleanup();
    __resetLearningV2SessionNetworkIntentForTests();
    __resetInteractiveNetworkQuietForTests();
  });
  beforeEach(() => {
    mockCommit.mockClear();
    mockReplace.mockClear();
    mockApplyResult.mockClear();
    mockAudioSeekTo.mockClear();
    mockAudioPlay.mockClear();
    mockAudioPause.mockClear();
    mockAudioSource.mockReset();
    mockAudioSource.mockReturnValue(1);
    mockAudioStatus.playing = false;
    mockAudioStatus.didJustFinish = false;
    mockAudioStatus.isLoaded = true;
    mockRouteSessionId = "lesson-1-understand-1";
  });

  it("finishes twelve local skipped slots with no answer or transport step", async () => {
    const view = await render(React.createElement(LearningV2SessionScreen));
    for (let index = 0; index < 12; index += 1) {
      await act(async () => {
        fireEvent.press(view.getByLabelText("Пропустить это задание"));
      });
    }
    await waitFor(() => expect(mockCommit).toHaveBeenCalledTimes(1));
    const envelope = mockCommit.mock.calls[0][1] as RequiredSessionCompletionEnvelopeV3;
    expect(envelope.taskCompletions).toHaveLength(12);
    expect(envelope.taskCompletions.every((task) =>
      task.disposition === "skipped" && task.learnerAttempts === 0)).toBe(true);
    expect(JSON.stringify(envelope)).not.toMatch(/answerProof|submittedAnswer|audio|transcript/);
    expect(view.getByText("Собрано 0 звёзд")).toBeTruthy();
    expect(view.getByLabelText("Идеально 0. После исправления 0. С поддержкой 0. Пропущено 12.")).toBeTruthy();
    expect(view.getByText("Можно улучшить результат ещё на 36 звёзд.")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Вернуться на карту с результатом 0 звёзд"));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/learning-v2/lesson/[id]",
      params: {
        id: "1",
        resultSessionId: "lesson-1-understand-1",
        resultStars: "0",
      },
    });
  });

  it("awards the first correct answer exactly once and exposes the session star total", async () => {
    const view = await render(React.createElement(LearningV2SessionScreen));
    const correctChoice = view.getByLabelText(/Ответ [ABC]: Я здесь/);
    await act(async () => {
      fireEvent.press(correctChoice);
    });
    expect(view.getByText("Идеально! +3 звезды")).toBeTruthy();
    expect(view.getByLabelText("Идеально. Плюс 3 звезды. С первой попытки")).toBeTruthy();
    expect(view.getByLabelText("Собрано 3 из 36 звёзд в этой сессии")).toBeTruthy();
    await act(async () => {
      fireEvent.press(correctChoice);
    });
    expect(view.getByLabelText("Собрано 3 из 36 звёзд в этой сессии")).toBeTruthy();
  });

  it("shows a two-star recovery after one wrong attempt without skipping the task", async () => {
    const view = await render(React.createElement(LearningV2SessionScreen));
    const wrongChoice = view.getByLabelText(/Ответ [ABC]: Он занят/);
    const correctChoice = view.getByLabelText(/Ответ [ABC]: Я здесь/);
    await act(async () => {
      fireEvent.press(wrongChoice);
    });
    expect(view.getByText("Почти. Посмотри внимательнее и попробуй ещё.")).toBeTruthy();
    await act(async () => {
      fireEvent.press(correctChoice);
    });
    expect(view.getByText("Отлично! +2 звезды")).toBeTruthy();
    expect(view.getByLabelText("Отлично. Плюс 2 звезды. После исправления")).toBeTruthy();
    expect(view.getByLabelText("Собрано 2 из 36 звёзд в этой сессии")).toBeTruthy();
  });

  it("shows one supported star after using the hint", async () => {
    const view = await render(React.createElement(LearningV2SessionScreen));
    await act(async () => {
      fireEvent.press(view.getByLabelText("Показать подсказку"));
    });
    const correctChoice = view.getByLabelText(/Ответ [ABC]: Я здесь/);
    await act(async () => {
      fireEvent.press(correctChoice);
    });
    expect(view.getByText("Зачтено! +1 звезда")).toBeTruthy();
    expect(view.getByLabelText("Зачтено. Плюс 1 звезда. С поддержкой")).toBeTruthy();
    expect(view.getByLabelText("Собрано 1 из 36 звёзд в этой сессии")).toBeTruthy();
  });

  it("plays the bundled phrase recording without a speech or transport call", async () => {
    const view = await render(React.createElement(LearningV2SessionScreen));
    await act(async () => {
      fireEvent.press(view.getByLabelText("Прослушать локальную запись фразы"));
    });
    await waitFor(() => expect(mockAudioPlay).toHaveBeenCalledTimes(1));
    expect(mockAudioSeekTo).toHaveBeenCalledWith(0);
    expect(view.queryByText(/Не удалось воспроизвести/)).toBeNull();
  });

  it("shows an accessible textual fallback after a local playback failure", async () => {
    mockAudioSeekTo.mockRejectedValueOnce(new Error("local_audio_decode_failed"));
    const view = await render(React.createElement(LearningV2SessionScreen));
    await act(async () => {
      fireEvent.press(view.getByLabelText("Прослушать локальную запись фразы"));
      await Promise.resolve();
    });
    const fallback = view.getByText("Не удалось воспроизвести локальную запись. Фраза показана текстом.");
    expect(fallback.parent?.props.accessibilityLiveRegion).toBe("polite");
    expect(view.getByText("I am here")).toBeTruthy();
    expect(view.getByLabelText("Показать фразу текстом").props.accessibilityHint).toContain("показана текстом");
    expect(mockAudioPlay).not.toHaveBeenCalled();
    fireEvent.press(view.getByLabelText("Показать фразу текстом"));
    expect(mockAudioSeekTo).toHaveBeenCalledTimes(1);
  });

  it("shows the same fallback when native playback never reports that it started", async () => {
    jest.useFakeTimers();
    const view = await render(React.createElement(LearningV2SessionScreen));
    try {
      const audio = view.getByLabelText("Прослушать локальную запись фразы");
      await act(async () => {
        audio.props.onPress();
        await Promise.resolve();
      });
      expect(mockAudioPlay).toHaveBeenCalledTimes(1);
      await act(async () => {
        jest.advanceTimersByTime(2_001);
        await Promise.resolve();
      });
      expect(view.getByText("Не удалось воспроизвести локальную запись. Фраза показана текстом.")).toBeTruthy();
      expect(view.getByLabelText("Показать фразу текстом")).toBeTruthy();
    } finally {
      view.unmount();
      jest.useRealTimers();
    }
  });

  it("keeps the transcript hidden when native playback reports a successful start", async () => {
    jest.useFakeTimers();
    const view = await render(React.createElement(LearningV2SessionScreen));
    try {
      const audio = view.getByLabelText("Прослушать локальную запись фразы");
      await act(async () => {
        audio.props.onPress();
        await Promise.resolve();
      });
      mockAudioStatus.playing = true;
      await act(async () => {
        view.rerender(React.createElement(LearningV2SessionScreen));
        await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(2_001);
        await Promise.resolve();
      });
      expect(view.queryByText("Не удалось воспроизвести локальную запись. Фраза показана текстом.")).toBeNull();
      expect(view.queryByText("I am here")).toBeNull();
      expect(view.getByLabelText("Прослушать локальную запись фразы")).toBeTruthy();
    } finally {
      view.unmount();
      jest.useRealTimers();
    }
  });

  it("does not show a false fallback when replay starts while the player is already playing", async () => {
    jest.useFakeTimers();
    mockAudioStatus.playing = true;
    const view = await render(React.createElement(LearningV2SessionScreen));
    try {
      const audio = view.getByLabelText("Прослушать локальную запись фразы");
      await act(async () => {
        audio.props.onPress();
        await Promise.resolve();
      });
      expect(mockAudioPlay).toHaveBeenCalledTimes(1);
      await act(async () => {
        jest.advanceTimersByTime(2_001);
        await Promise.resolve();
      });
      expect(view.queryByText("Не удалось воспроизвести локальную запись. Фраза показана текстом.")).toBeNull();
      expect(view.getByLabelText("Прослушать локальную запись фразы")).toBeTruthy();
    } finally {
      view.unmount();
      jest.useRealTimers();
    }
  });

  it("does not let a stale didJustFinish flag hide a failed replay", async () => {
    jest.useFakeTimers();
    mockAudioStatus.playing = false;
    mockAudioStatus.didJustFinish = true;
    const view = await render(React.createElement(LearningV2SessionScreen));
    try {
      const audio = view.getByLabelText("Прослушать локальную запись фразы");
      await act(async () => {
        audio.props.onPress();
        await Promise.resolve();
      });
      expect(mockAudioPlay).toHaveBeenCalledTimes(1);
      const pauseCountBeforeWatchdog = mockAudioPause.mock.calls.length;
      await act(async () => {
        jest.advanceTimersByTime(2_001);
        await Promise.resolve();
      });
      expect(view.getByText("Не удалось воспроизвести локальную запись. Фраза показана текстом.")).toBeTruthy();
      expect(mockAudioPause).toHaveBeenCalledTimes(pauseCountBeforeWatchdog + 1);
    } finally {
      view.unmount();
      jest.useRealTimers();
    }
  });

  it("does not let a delayed previous finish event release the new playback", async () => {
    const view = await render(React.createElement(LearningV2SessionScreen));
    const audio = view.getByLabelText("Прослушать локальную запись фразы");
    await act(async () => {
      audio.props.onPress();
      await Promise.resolve();
    });
    expect(mockAudioPlay).toHaveBeenCalledTimes(1);
    mockAudioStatus.didJustFinish = true;
    await act(async () => {
      view.rerender(React.createElement(LearningV2SessionScreen));
      await Promise.resolve();
    });
    const pauseCountBeforeSkip = mockAudioPause.mock.calls.length;
    await act(async () => {
      view.getByLabelText("Пропустить это задание").props.onPress();
      await Promise.resolve();
    });
    expect(mockAudioPause.mock.calls.length).toBeGreaterThan(pauseCountBeforeSkip);
    expect(view.getByLabelText("2 из 12")).toBeTruthy();
  });

  it("exposes an explicit text action when the bundled source cannot be resolved", async () => {
    mockAudioSource.mockReturnValue(null);
    const view = await render(React.createElement(LearningV2SessionScreen));
    const textAction = view.getByLabelText("Показать фразу текстом");
    expect(textAction.props.accessibilityHint).toContain("Аудиозапись недоступна");
    expect(view.getByText("Локальная запись недоступна. Фраза показана текстом.")).toBeTruthy();
    expect(view.getByText("I am here")).toBeTruthy();
  });

  it("offers the same bundled audio control on sound contrast cards", async () => {
    mockRouteSessionId = "lesson-1-understand-2";
    const view = await render(React.createElement(LearningV2SessionScreen));
    fireEvent.press(view.getByLabelText("Пропустить это задание"));
    await waitFor(() => expect(view.getByText("Различай звучание")).toBeTruthy());
    expect(view.getByText("Различай звучание")).toBeTruthy();
    expect(view.getByLabelText("Прослушать локальную запись фразы")).toBeTruthy();
  });

  it("coalesces two synchronous skip activations into one card transition", async () => {
    const view = await render(React.createElement(LearningV2SessionScreen));
    const skip = view.getByLabelText("Пропустить это задание");
    expect(skip.props.accessibilityRole).toBe("button");
    expect(skip.props.accessibilityHint).toBe("Задание получит ноль звёзд, сессия продолжится");
    const skipStyles = skip.props.style({ pressed: false }) as Record<string, unknown>[];
    expect(Object.assign({}, ...skipStyles.filter(Boolean)).minHeight).toBeGreaterThanOrEqual(48);
    await act(() => {
      skip.props.onPress();
      skip.props.onPress();
    });
    expect(view.getByLabelText("2 из 12")).toBeTruthy();
    for (let index = 1; index < 12; index += 1) {
      await act(async () => {
        fireEvent.press(view.getByLabelText("Пропустить это задание"));
      });
    }
    await waitFor(() => expect(mockCommit).toHaveBeenCalledTimes(1));
    const envelope = mockCommit.mock.calls[0][1] as RequiredSessionCompletionEnvelopeV3;
    expect(envelope.taskCompletions).toHaveLength(12);
    expect(new Set(envelope.taskCompletions.map((task) => task.taskId)).size).toBe(12);
  });

  it("keeps local controls instant even while an older admitted network operation settles", async () => {
    let releaseNative!: () => void;
    const native = new Promise<void>((resolve) => { releaseNative = resolve; });
    const running = withBackgroundNetworkLease("completion.sync.component-test", async () => native);
    await Promise.resolve();

    const view = await render(React.createElement(LearningV2SessionScreen));
    const instantSkip = view.getByLabelText("Пропустить это задание");
    expect(instantSkip.props.disabled).toBe(false);
    expect(view.queryByText(/загруз|синхрон|сервер/i)).toBeNull();

    await act(async () => {
      fireEvent.press(instantSkip);
    });
    expect(view.getByLabelText("2 из 12")).toBeTruthy();

    releaseNative();
    await expect(running).rejects.toThrow("interactive_network_deferred");
  });

  it("acquires its global intent in commit phase without leaking under StrictMode", async () => {
    const view = await render(
      React.createElement(React.StrictMode, null, React.createElement(LearningV2SessionScreen)),
    );
    expect(view.getByLabelText("Пропустить это задание").props.disabled).toBe(false);
    expect(learningV2SessionNetworkIntentSnapshot()).toMatchObject({
      active: true,
      owner: "session",
      sessionId: "lesson-1-understand-1",
    });
  });

  it("does not start a stale recording after the learner advances", async () => {
    let releaseSeek!: () => void;
    mockAudioSeekTo.mockImplementationOnce(() => new Promise<void>((resolve) => { releaseSeek = resolve; }));
    const view = await render(React.createElement(LearningV2SessionScreen));
    const audio = view.getByLabelText("Прослушать локальную запись фразы");
    const skip = view.getByLabelText("Пропустить это задание");
    await act(async () => {
      audio.props.onPress();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockAudioSeekTo).toHaveBeenCalledWith(0));
    await act(async () => {
      skip.props.onPress();
      await Promise.resolve();
    });
    await act(async () => {
      releaseSeek();
      await Promise.resolve();
    });
    await waitFor(() => expect(view.getByLabelText("2 из 12")).toBeTruthy());
    await waitFor(() => expect(mockAudioPlay).not.toHaveBeenCalled());
  });

  it("stops a playing recording before advancing to the next card", async () => {
    const view = await render(React.createElement(LearningV2SessionScreen));
    const audio = view.getByLabelText("Прослушать локальную запись фразы");
    await act(async () => {
      audio.props.onPress();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockAudioPlay).toHaveBeenCalledTimes(1));
    const pauseCountBeforeSkip = mockAudioPause.mock.calls.length;
    await act(async () => {
      view.getByLabelText("Пропустить это задание").props.onPress();
      await Promise.resolve();
    });
    expect(view.getByLabelText("2 из 12")).toBeTruthy();
    expect(mockAudioPause.mock.calls.length).toBeGreaterThan(pauseCountBeforeSkip);
  });
});
