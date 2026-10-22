import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { Text, View } from "react-native";

import LearningV2DirectSessionPlayerV1 from "../app/learning_v2_direct_session_player_v1";

let mockStrictPolicy = true;
let mockSpeakingPanelProps: Record<string, any> | null = null;

const strictRevealPolicy = Object.freeze({
  schemaVersion: "learning-v2-scripted-repeat-reveal-policy.v1",
  revealAfter: "first_submitted_attempt",
  answerExposedBeforeAttempt: false,
  targetPhraseVisibleBeforeAttempt: false,
  referenceAudioAvailableBeforeAttempt: false,
  modelPlaybackAvailableBeforeAttempt: false,
});

const mockPractice = () => ({
  interactionId: "repeat-1",
  family: "scripted_repeat_compare",
  purpose: mockStrictPolicy ? "independent_check" : "guided_practice",
  prompt: "Speak when you are ready.",
  inputMode: "scripted_speech",
  supportLevel: mockStrictPolicy ? "none" : "full",
  hintBudget: mockStrictPolicy ? 0 : 1,
  responseOptions: [],
  scriptedAlternate: null,
  modePayload: {
    family: "scripted_repeat_compare",
    referenceAudio: {
      audioTargetId: "repeat-reference",
      transcript: "I am smart.",
    },
    slowReferenceAudio: null,
    targetPhrase: "I am smart.",
    recordControlPolicy: "hold_press_release_with_accessible_toggle",
    modelPlayback: "reference_and_slow",
    learnerPlayback: "available_after_capture",
    honestOutcomeStates: [
      "PASS_CONFIDENT",
      "NEEDS_WORK_CONFIDENT",
      "UNCERTAIN",
      "INVALID_AUDIO_OR_SYSTEM",
    ],
    ...(mockStrictPolicy
      ? { scriptedRepeatRevealPolicy: strictRevealPolicy }
      : {}),
  },
});

const mockMaterial = {
  releaseId: "release-test",
  activeRootFingerprint: "root",
  activeHeadFingerprint: "head",
  lessonId: "lesson-1",
  lessonOrdinal: 1,
  courseSessionId: "course-session-1",
  sessionOrdinal: 1,
  packageFingerprint: "package",
  childSetFingerprint: "children",
  introChild: {
    pages: [1, 2, 3].map((index) => ({
      question: { interactionId: `intro-${index}` },
    })),
  },
  learnerChild: {},
  evaluatorCapsuleChild: {},
  auxiliaryChild: {},
  factoryWordEncounterQueues: {},
  factoryPracticeSemantics: {
    "repeat-1": {
      canonicalTarget: "I am smart.",
      reviewedMeaningByLocale: { en: "I am smart." },
    },
  },
};

jest.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Platform: { OS: "ios" },
  // зачем (22.10): выход из эпизода с подтверждением (69aeaff8d) слушает системную кнопку «назад».
  BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style,
    hairlineWidth: 1,
  },
  Text: "Text",
  View: "View",
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({
    id: "course-session-1",
    lessonOrdinal: "1",
    sessionOrdinal: "1",
    previewMode: "authoring_v1",
    skipIntro: "1",
  }),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  // зачем (22.10): выход из эпизода с подтверждением (69aeaff8d) слушает beforeRemove через useNavigation.
  useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
}));
jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons");
// зачем (координатор 17.10): шторка голосового лимита (1c2823b95) — отдельный UI на старте занятия со своим тестом
// (learning_v2_voice_headsup_v1.test.ts); её анимации (Animated/Easing/PanResponder/Modal) этому моку react-native не нужны.
// Здесь проверяется жизненный цикл плеера повтора, поэтому шторка — пустая заглушка, а не расширение мока под чужой UI.
jest.mock("../components/learning-v2/LearningV2VoiceHeadsupSheet", () => ({ __esModule: true, default: () => null }));
// зачем (22.10): плеер подключил шторку выхода (69aeaff8d) и шторку теории (c4559f4fd). Шторка выхода через MomentCoin →
// use_runtime_active тянет @react-navigation (тестовая среда его не разбирает) — обе шторки в этом тесте не участвуют.
jest.mock("../components/lesson_exit/LessonExitSheet", () => ({ __esModule: true, default: () => null }));
jest.mock("../components/learning-v2/LearningV2TheorySheet", () => ({ __esModule: true, default: () => null }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "run-test" }));
jest.mock("expo-image", () => ({ Image: "Image" }));
jest.mock("expo-audio", () => ({
  useAudioPlayer: () => ({
    replace: jest.fn(),
    setPlaybackRate: jest.fn(),
  }),
  useAudioPlayerStatus: () => ({
    didJustFinish: false,
    isLoaded: false,
    playing: false,
  }),
}));
jest.mock("react-native-reanimated", () => {
  const chain = { duration: () => chain, easing: () => chain };
  return {
    __esModule: true,
    default: { View: "AnimatedView" },
    Easing: { bezier: () => ({ factory: () => undefined }) },
    FadeInDown: chain,
    SlideInRight: chain,
    SlideOutLeft: chain,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    withSequence: (...values: unknown[]) => values.at(-1),
    withTiming: (value: unknown) => value,
  };
});

jest.mock("../components/SpeakingPanel", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const Panel = (props: Record<string, any>) => {
    mockSpeakingPanelProps = props;
    return props.renderInlineSurface
      ? React.createElement(
          Text,
          {
            testID: "mock-speaking-target-feedback",
            accessibilityLabel: `Target feedback: ${props.targetText}`,
          },
          props.targetText,
        )
      : null;
  };
  return {
    __esModule: true,
    default: Panel,
    buildSpeakingPanelTheme: () => ({}),
  };
});
jest.mock("../components/learning-v2/LearningV2PracticeViewport", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);
});
jest.mock("../components/LearningV2AnswerChoice", () => "LearningV2AnswerChoice");
jest.mock("../components/learning-v2/LearningV2NewWordEncounterOverlay", () => "LearningV2NewWordEncounterOverlay");
jest.mock("../components/learning-v2/LearningV2WordPocketOverlayV1", () => "LearningV2WordPocketOverlayV1");
jest.mock("../components/learning-v2/horizons/HorizonSessionResult", () => "HorizonSessionResult");
jest.mock("../components/rewards/CoinRewardFlight", () => "CoinRewardFlight");
jest.mock("../components/EnergyBar", () => "EnergyBar");
jest.mock("../components/ReportErrorButton", () => "ReportErrorButton");
jest.mock("../components/session_attempts/SessionAttemptsHud", () => "SessionAttemptsHud");
jest.mock("../components/SpeakingInlineResultStars", () => "SpeakingInlineResultStars");
jest.mock("../components/SpeakingScoreStars", () => ({
  starsForScore: () => 1,
}));
jest.mock("../app/flashcards/SpeakHoldButton", () => "SpeakHoldButton");
jest.mock("../components/learning-v2/LearningV2SessionUnavailable", () => ({
  LearningV2SessionUnavailable: "LearningV2SessionUnavailable",
  learningV2SessionUnavailableDefaultHint: () => "Unavailable",
}));
jest.mock("../app/learning_v2_session_intro", () => "LearningV2SessionIntro");

jest.mock("../components/LangContext", () => ({ useLang: () => ({ lang: "en" }) }));
jest.mock("../components/StudyTargetContext", () => ({ useStudyTarget: () => ({ studyTarget: "en" }) }));
jest.mock("../components/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      bgPrimary: "#fff",
      bgCard: "#fff",
      textPrimary: "#111",
      textSecond: "#555",
      textMuted: "#777",
      accent: "#07f",
      correct: "#080",
      wrong: "#d00",
      border: "#ccc",
      textOnGold: "#fff",
      accentText: "#07f",
    },
    f: { label: 12 },
  }),
}));
jest.mock("../components/learning-v2/LearningV2Glass", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Lv2Cta: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(Text, null, children),
    Lv2Explain: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(Text, null, children),
    lv2Alpha: () => "rgba(0,0,0,.2)",
    lv2CardStyle: () => ({}),
    useLv2Glass: () => ({
      bg: "#fff",
      text: "#111",
      secondary: "#555",
      opaqueControl: "#eee",
      opaqueCard: "#fff",
      selected: "#eef",
      cta: "#07f",
      accent: "#07f",
      accentInk: "#fff",
      glassEdge: "#ccc",
      buttonFill: "#eee",
      dividerTone: "#ddd",
      goodEdge: "#080",
      badEdge: "#d00",
    }),
  };
});
jest.mock("../components/EnergyContext", () => ({
  useEnergy: () => ({
    energy: 3,
    bonusEnergy: 0,
    isUnlimited: false,
    energyReady: true,
    confirmSpendOne: jest.fn(),
    acknowledgeSessionStart: jest.fn(),
  }),
  useEnergySessionIntent: () => ({ state: "confirmed", confirm: jest.fn() }),
}));

jest.mock("../hooks/use-haptics", () => ({
  hapticError: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticTap: jest.fn(),
}));
jest.mock("../hooks/use-audio", () => ({
  useAudio: () => ({ speak: jest.fn(), stop: jest.fn() }),
}));
jest.mock("../hooks/use_learning_v2_unlocked_lesson_words_v1", () => ({
  useLearningV2UnlockedLessonWordsV1: () => ({ words: [], hydrated: true }),
}));
jest.mock("../hooks/use_managed_spoken_audio_player", () => ({
  useManagedSpokenAudioPlayer: () => ({
    stop: jest.fn(),
    playFromStart: jest.fn(async () => true),
    state: "idle",
  }),
}));
jest.mock("../hooks/useSessionAttempts", () => ({
  useSessionAttempts: () => ({
    state: { phase: "active", remainingAttempts: 3 },
    registerVerdict: jest.fn(() => null),
    reset: jest.fn(),
    updateQuestion: jest.fn(),
    mistakeChargeActive: false,
  }),
}));
jest.mock("../hooks/useSessionAttemptAutoReset", () => ({ useSessionAttemptAutoReset: jest.fn() }));
jest.mock("../hooks/learningV2FirstQuestionEnergy", () => ({ LearningV2FirstQuestionShownReporter: () => null }));
jest.mock("../hooks/useLineScale", () => ({ useLineScale: () => (value: number) => value }));

jest.mock("../app/speech_device_availability", () => ({
  speechUnavailableOnDeviceText: () => "Speech unavailable",
  useSpeechUnavailableOnDevice: () => false,
}));
jest.mock("../app/stable_safe_area_metrics", () => ({
  useStableSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("../app/learning_v2_session_route_coordinates_v1", () => ({
  resolveLearningV2SessionRouteCoordinatesV1: () => ({ lessonOrdinal: 1, sessionOrdinal: 1 }),
}));
jest.mock("../app/learning_v2_course_released_session_client_v3", () => ({
  bundledLearningV2CourseSessionMaterialV3: () => mockMaterial,
  // с 9ef805ab1 путь предпросмотра (isAuthoringPreview) читает материал отсюда, а не из bundled…
  previewLearningV2CourseSessionMaterialV3: () => mockMaterial,
  consumeLearningV2CourseSessionReadyHandoffV3: () => null,
  peekLearningV2CourseSessionReadyHandoffKeysV3: () => [],
  resolveLearningV2CourseSessionReadyMaterialV3: jest.fn(),
}));
jest.mock("../modules/learning-v2/runtime/course_session_device_run_v1", () => ({
  createLearningV2CourseSessionDeviceRunV1: () => ({ kind: "mock-run" }),
  evaluateLearningV2CourseSessionDeviceInteractionV1: () => ({ resultCode: "provisional_wrong" }),
  getLearningV2CourseSessionAuxiliaryEntryV1: () => ({
    save: {
      targetText: "I am smart.",
      meaningByLocale: { en: "I am smart." },
    },
    voice: { available: true },
    responseFeedbackById: {},
  }),
  getLearningV2CourseSessionDeviceRunSummaryV1: () => ({
    courseSessionId: "course-session-1",
    lessonOrdinal: 1,
    sessionOrdinal: 1,
    targetLanguage: "en",
    practiceInteractionCount: 1,
    interactionCount: 1,
  }),
  getLearningV2CourseSessionNewWordEncountersV1: () => [],
  getLearningV2CourseSessionPracticeInteractionV1: () => mockPractice(),
  materializeLearningV2CourseSessionCompletedSummaryV1: jest.fn(),
}));
jest.mock("../app/learning_v2_direct_session_intro_adapter_v1", () => ({
  adaptLearningV2DirectSessionIntroV1: () => [],
}));
jest.mock("../modules/learning-v2/content/factory_native/factory_native_catalog_v1", () => ({
  factoryNativeLearningV2AvailabilityV1: () => ({ sessions: [] }),
}));
jest.mock("../modules/learning-v2/content/course_topology_v1", () => ({
  learningV2CourseSessionIdV1: () => "course-session-1",
  learningV2CourseSessionRoleV1: () => "learning",
}));
jest.mock("../app/learning_v2_interleaved_new_word_flow_v1", () => ({
  createLearningV2InterleavedNewWordFlowV1: () => ({ kind: "idle" }),
  reduceLearningV2InterleavedNewWordFlowV1: (state: unknown) => ({ state, effects: [] }),
  // зачем (22.10): плеер решает автозапуск звука задания этим помощником — та же логика, что в модуле.
  shouldAutoplayLearningV2PracticeAudioV1: (input: { requestedToken: number; consumedToken: number; practiceActivated: boolean; referenceAvailable: boolean }) =>
    input.requestedToken > input.consumedToken && input.practiceActivated && input.referenceAvailable,
}));
jest.mock("../app/learning_v2_preview_speech_watchdog_v1", () => ({
  createLearningV2PreviewSpeechGenerationGuardV1: () => ({
    begin: () => ({ key: "test" }),
    clear: () => true,
    cancelCurrent: jest.fn(),
    currentKey: () => null,
  }),
  learningV2PreviewSpeechWatchdogMsV1: () => 1000,
}));
jest.mock("../app/learning_v2_interaction_rune_award_v1", () => ({
  createLearningV2InteractionRuneAwardLedgerV1: () => ({ claim: () => 0 }),
  learningV2InteractionRuneAwardV1: () => 0,
}));
jest.mock("../app/learning_v2_session_copy", () => ({
  learningV2SessionCopy: () => new Proxy(
    { modes: { scripted_repeat_compare: "Speak" } },
    { get: (target, key) => (key in target ? target[key as keyof typeof target] : String(key)) },
  ),
}));
jest.mock("../modules/learning-v2/modes/mode_feedback_v1", () => ({
  resolveLearningV2ModeFeedbackV1: () => null,
}));
jest.mock("../modules/learning-v2/modes/mode_router_v1", () => ({
  isLearningV2ModeRoutedV1: () => false,
  LearningV2ModeRouterV1: () => null,
}));
jest.mock("../modules/learning-v2/modes/scripted_repeat_compare_mode_v1", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ attemptSubmitted, modePayload }: Record<string, any>) => {
    const visible = !modePayload.scriptedRepeatRevealPolicy || attemptSubmitted;
    return visible
      ? React.createElement(
          Text,
          {
            testID: "mock-mode-target",
            accessibilityLabel: `Target phrase: ${modePayload.targetPhrase}`,
          },
          modePayload.targetPhrase,
        )
      : null;
  };
});
jest.mock("../app/learning_v2_course_session_completed_spool_v1", () => ({
  createLearningV2CourseSessionCompletedSpoolV1: () => ({ flush: jest.fn(), enqueue: jest.fn() }),
}));
jest.mock("../app/learning_v2_owner_repository_runtime", () => ({
  commitLearningV2SessionRuneRewardCompositeV1: jest.fn(),
  recoverPendingLearningV2SessionRuneRewardIntentsV1: jest.fn(async () => undefined), // зачем: плеер зовёт `.catch` на результате — заглушка обязана вернуть промис
}));
jest.mock("../modules/learning-v2/progress/course_local_progress_v1", () => ({
  createLearningV2CourseLocalProgressStoreV1: () => ({ read: jest.fn(), write: jest.fn() }),
}));
jest.mock("../app/debug-logger", () => ({
  DebugLogger: { error: jest.fn(), warn: jest.fn() },
}));
jest.mock("../app/learning_v2_telemetry", () => ({ trackLearningV2Telemetry: jest.fn() }));
jest.mock("../modules/learning-v2/telemetry", () => ({
  learningV2SessionAbandonEvent: () => ({}),
  learningV2SessionCompleteEvent: () => ({}),
  learningV2SessionStartEvent: () => ({}),
  learningV2TaskResultEvent: () => ({}),
}));
jest.mock("../app/learning_v2_session1_voice_dev_jump_v1", () => ({
  resolveLearningV2Session1VoiceDevJumpV1: () => null,
  runLearningV2Session1VoiceDevJumpV1: jest.fn(),
}));
jest.mock("../components/v2/KitLiquidGlass", () => ({ KitGlassLayer: () => null }));
jest.mock("../components/v2/ShadowSurface", () => ({
  actionBoxShadow: () => ({}),
  nestedBoxShadow: () => ({}),
  // зачем (22.10): плита задания в плеере (7e15fdc7e, шапка/подвал по макету) берёт plateBoxShadow.
  plateBoxShadow: () => ({}),
  raisedBoxShadow: () => ({}),
}));

function targetVisible(screen: Awaited<ReturnType<typeof render>>): boolean {
  return screen.queryAllByText("I am smart.").length > 0 ||
    screen.queryAllByLabelText(/I am smart\./u).length > 0;
}

describe("Learning V2 scripted-repeat real player reveal lifecycle", () => {
  beforeEach(() => {
    // зачем (координатор 15.10, разбор Моментов): react-native здесь замокан целиком, и глобальный __DEV__ (его в приложении задаёт
    // сборщик) в тесте не определён — плеер читает его голым при рендере. true, а не false: тест идёт по пути предпросмотра
    // (isAuthoringPreview = __DEV__ && previewMode), иначе плеер ждёт handoff карты и уходит в [V2-BRIDGE] bounce_to_map.
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    mockStrictPolicy = true;
    mockSpeakingPanelProps = null;
  });

  it("keeps strict target hidden through empty/error paths and reveals only after a scored nonempty attempt", async () => {
    const screen = await render(<LearningV2DirectSessionPlayerV1 />);
    await waitFor(() => expect(mockSpeakingPanelProps).not.toBeNull());

    expect(targetVisible(screen)).toBe(false);
    expect(mockSpeakingPanelProps?.renderInlineSurface).toBe(false);

    await act(async () => {
      mockSpeakingPanelProps?.onStatusChange?.("no_speech");
      mockSpeakingPanelProps?.onScore?.({ score: 0, passed: false, transcript: "   " });
    });
    expect(targetVisible(screen)).toBe(false);
    expect(mockSpeakingPanelProps?.renderInlineSurface).toBe(false);

    await act(async () => {
      mockSpeakingPanelProps?.onStatusChange?.("stalled");
    });
    expect(targetVisible(screen)).toBe(false);

    await act(async () => {
      mockSpeakingPanelProps?.onScore?.({ score: 45, passed: false, transcript: "I" });
    });
    expect(targetVisible(screen)).toBe(true);
  });

  it("preserves guided model-first visibility", async () => {
    mockStrictPolicy = false;
    const screen = await render(<LearningV2DirectSessionPlayerV1 />);
    await waitFor(() => expect(mockSpeakingPanelProps).not.toBeNull());

    expect(mockSpeakingPanelProps?.renderInlineSurface).toBe(true);
    expect(targetVisible(screen)).toBe(true);
  });
});
