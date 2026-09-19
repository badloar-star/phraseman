import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import LearningV2Horizons from "../components/learning-v2/horizons/LearningV2Horizons";
import HorizonSessionResult from "../components/learning-v2/horizons/HorizonSessionResult";
import OutcomeSheet from "../components/LearningV2SessionOutcomeSheet";
import { prepareLearningV2CourseAccordionProgressV1 } from "../modules/learning-v2/map/course_accordion_map_model_v1";

jest.mock("react-native", () => {
  const React = require("react");
  return {
    View: "View",
    Text: "Text",
    Pressable: "Pressable",
    TouchableOpacity: "Pressable",
    ScrollView: "ScrollView",
    Image: "Image",
    Modal: ({ visible, children }: any) =>
      visible ? React.createElement("Modal", null, children) : null,
    FlatList: ({ data, renderItem }: any) =>
      React.createElement(
        "View",
        null,
        data.map((item: unknown, index: number) =>
          React.createElement(
            React.Fragment,
            { key: index },
            renderItem({ item, index }),
          ),
        ),
      ),
    StyleSheet: {
      create: (s: unknown) => s,
      flatten: (s: unknown) =>
        Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s,
      absoluteFill: {},
      hairlineWidth: 1,
    },
    useWindowDimensions: () => ({ width: 375, height: 812 }),
    PanResponder: { create: () => ({ panHandlers: {} }) },
    BackHandler: { addEventListener: () => ({ remove: jest.fn() }) },
    Platform: { OS: "ios", select: (values: any) => values.ios },
  };
});
let mockReducedMotion = true;
const mockGestureEnd: { current?: (event: any) => void } = {};
jest.mock("../hooks/use_reduce_motion", () => ({
  useReduceMotionPreference: () => mockReducedMotion,
}));
jest.mock("../hooks/use-screen", () => ({
  normalizeSafeAreaBottomInset: (n: number) => n,
}));
jest.mock("../hooks/use-haptics", () => ({ hapticTap: jest.fn() }));
let mockThemeName = "INDIGO";
jest.mock("../components/ThemeContext", () => ({
  useTheme: () => ({ theme: require("../constants/theme")[mockThemeName], f: { h2: 24, body: 16 } }),
}));
jest.mock("../components/EnergyCostBadge", () => () => null);
jest.mock("react-native-worklets", () => ({
  scheduleOnRN: (fn: (...args: any[]) => void, ...args: any[]) => fn(...args),
}));
jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: "View",
  GestureDetector: ({ children }: any) => children,
  Gesture: {
    Pan: () => {
      const chain: any = {
        activeOffsetY: () => chain,
        failOffsetX: () => chain,
        onUpdate: () => chain,
        onEnd: (fn: any) => {
          mockGestureEnd.current = fn;
          return chain;
        },
      };
      return chain;
    },
  },
}));

jest.mock("@expo/vector-icons/Ionicons", () => "Icon");
jest.mock("expo-image", () => ({ Image: "Image" }));
jest.mock("../app/feedback/feedback_kit", () => ({
  __esModule: true,
  default: {
    cancelResultsSequenceAudio: jest.fn(),
    successHaptic: jest.fn(),
    milestone: jest.fn(),
    xpCounterStart: jest.fn(),
    tick: jest.fn(),
    xpCounterComplete: jest.fn(),
    resultsReward: jest.fn(),
    resultsFinale: jest.fn(),
  },
}));
jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Path: "Path",
  Defs: "Defs",
  LinearGradient: "LinearGradient",
  Stop: "Stop",
  G: "G",
}));
jest.mock("../components/learning-v2/horizons/HorizonArtwork", () => ({
  HorizonArtwork: () => null,
}));
jest.mock("../components/AnimatedCountUpText", () => ({AnimatedCountUpText: () => null}));
jest.mock("../hooks/use_runtime_active", () => ({
  useRuntimeActive: () => true,
}));
jest.mock("../app/stable_safe_area_metrics", () => ({
  useStableSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }),
}));
jest.mock("../components/LearningV2MapNode", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  return { LearningV2MapNode: ({ children, onPress, testID, accessibilityLabel }: any) =>
    React.createElement(
      Pressable,
      { onPress, testID, accessibilityLabel },
      children,
    ) };
});
jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View } = require("react-native");
  const identity = (value: unknown) => value;
  return {
    __esModule: true,
    default: { View },
    cancelAnimation: jest.fn(),
    useSharedValue: (value: unknown) => React.useRef({ value }).current,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withTiming: identity,
    withDelay: (_: unknown, value: unknown) => value,
    Easing: {
      out: identity,
      back: identity,
      cubic: identity,
      bezier: () => identity,
    },
  };
});

const titles = Array.from({ length: 32 }, (_, i) => `Lesson ${i + 1}`);
const completed = [
  "lesson-01:session:01",
  "lesson-01:session:02",
  "lesson-01:session:03",
];
const base = {
  titles,
  lang: "ru" as const,
  scopeKey: "horizons-test",
  preparedProgress: prepareLearningV2CourseAccordionProgressV1({
    completedSessionIds: completed,
    currentSessionId: "lesson-01:session:04",
  }),
  currentSessionId: "lesson-01:session:04",
  completedSessionIds: completed,
  stars: { "lesson-01:session:03": 2 as const },
  active: true,
  reducedMotion: true,
  devUnlockAll: false,
  bottomPadding: 0,
  onExpandedLesson: jest.fn(),
  onSessionPress: jest.fn(),
  onSessionCompleted: jest.fn(),
  onDictionary: jest.fn(),
};

describe("native Horizons integration", () => {
  beforeEach(() => { jest.clearAllMocks(); mockThemeName = "INDIGO"; });
  test("active theme changes the surface immediately without changing progress", async () => {
    const themes = require("../constants/theme");
    const ui = await render(<LearningV2Horizons {...base} />);
    expect(StyleSheet.flatten(ui.getByTestId("learning-v2-horizons").props.style).backgroundColor).toBe(themes.INDIGO.bgPrimary);
    mockThemeName = "SAGE_PORCELAIN";
    await ui.rerender(<LearningV2Horizons {...base} />);
    expect(StyleSheet.flatten(ui.getByTestId("learning-v2-horizons").props.style).backgroundColor).toBe(themes.SAGE_PORCELAIN.bgPrimary);
    expect(base.onSessionPress).not.toHaveBeenCalled();
    expect(base.onSessionCompleted).not.toHaveBeenCalled();
    await ui.unmount();
  });
  test("immersive surface reserves safe area and keeps navigation reachable without changing progress", async () => {
    const onNavigation = jest.fn();
    const ui = await render(<LearningV2Horizons {...base} topPadding={48}
      navigationControl={<Pressable testID="navigation-control" onPress={onNavigation} />} />);
    expect(StyleSheet.flatten(ui.getByTestId("learning-v2-horizons").props.style).paddingTop).toBe(48);
    await fireEvent.press(ui.getByTestId("navigation-control"));
    expect(onNavigation).toHaveBeenCalledTimes(1);
    expect(base.onSessionPress).not.toHaveBeenCalled();
    await ui.unmount();
  });
  test("opens exactly one chapter and sends canonical row state to the existing gate", async () => {
    const ui = await render(<LearningV2Horizons {...base} />);
    await fireEvent.press(ui.getByLabelText("Войти в мир"));
    expect(base.onExpandedLesson).toHaveBeenCalledWith(1);
    expect(ui.getAllByTestId(/learning-v2-horizon-node-/)).toHaveLength(8);
    await fireEvent.press(ui.getByTestId("learning-v2-horizon-node-4"));
    expect(base.onSessionPress).toHaveBeenLastCalledWith(1, 4, "current");
    await fireEvent.press(ui.getByTestId("learning-v2-horizon-node-6"));
    expect(base.onSessionPress).toHaveBeenLastCalledWith(1, 6, "locked");
    await fireEvent.press(ui.getByLabelText("Глава 7"));
    expect(ui.getAllByTestId(/learning-v2-horizon-node-/)).toHaveLength(8);
    await fireEvent.press(ui.getByTestId("learning-v2-horizon-node-56"));
    expect(base.onSessionPress).toHaveBeenLastCalledWith(1, 56, "locked");
    await ui.unmount();
  });
  test("dictionary remains connected and returning to worlds changes no progress", async () => {
    const ui = await render(<LearningV2Horizons {...base} />);
    await fireEvent.press(ui.getByLabelText("Войти в мир"));
    await fireEvent.press(ui.getByLabelText("Мои слова"));
    expect(base.onDictionary).toHaveBeenCalledTimes(1);
    await fireEvent.press(ui.getByLabelText("Назад"));
    expect(base.onExpandedLesson).toHaveBeenLastCalledWith(null);
    expect(base.onSessionPress).not.toHaveBeenCalled();
    await ui.unmount();
  });
  test("world dictionary scopes the selected lesson and resume uses the canonical current session", async () => {
    const ui = await render(<LearningV2Horizons {...base} />);
    await fireEvent.press(ui.getByLabelText("Мои слова"));
    expect(base.onExpandedLesson).toHaveBeenLastCalledWith(1);
    expect(base.onDictionary).toHaveBeenCalledTimes(1);
    await fireEvent.press(ui.getByLabelText("Продолжить"));
    expect(base.onSessionPress).toHaveBeenLastCalledWith(1, 4, "current");
    await ui.unmount();
  });
  test("shows the supplied earned runes and never auto-dismisses the receipt", async () => {
    jest.useFakeTimers();
    const onContinue = jest.fn();
    const ui = await render(
      <HorizonSessionResult
        lesson={1}
        kind="session"
        stars={2}
        facts={{ runes: 54, total: 20, firstTry: 17, elapsedMs: 272000, credit: "credited" }}
        lang="ru"
        reducedMotion
        onContinue={onContinue}
      />,
    );
    expect(ui.getByTestId("horizons-rune-count").props.children).toBe(54);
    expect(ui.getByText("85%")).toBeTruthy();
    expect(ui.getByText("4:32")).toBeTruthy();
    expect(ui.getByText("+")).toBeTruthy();
    jest.advanceTimersByTime(5000);
    expect(onContinue).not.toHaveBeenCalled();
    expect(ui.queryByLabelText("Повторить анимацию")).toBeNull();
    expect(ui.getByTestId("horizons-rune-count").props.children).toBe(54);
    await fireEvent.press(ui.getByTestId("horizons-result-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
    await ui.unmount();
    jest.useRealTimers();
  });
  test.each([
    ["session", "СЕССИЯ ЗАВЕРШЕНА · 1"],
    ["chapter", "ГЛАВА ЗАВЕРШЕНА · 1"],
    ["lesson", "УРОК ЗАВЕРШЁН · 1"],
    ["final", "КУРС ЗАВЕРШЁН"],
  ] as const)("labels a %s completion truthfully", async (kind, label) => {
    const ui = await render(
      <HorizonSessionResult
        lesson={1}
        sessionOrdinal={1}
        kind={kind}
        stars={2}
        facts={{ runes: 0, total: 20, firstTry: 17, elapsedMs: 1000, credit: "practice" }}
        lang="ru"
        reducedMotion
        onContinue={jest.fn()}
      />,
    );
    expect(ui.getByText(label)).toBeTruthy();
    await ui.unmount();
  });
  test("zero-rune checkpoint does not claim confirmed skills", async () => {
    const ui = await render(
      <HorizonSessionResult
        lesson={1}
        kind="chapter"
        stars={0}
        facts={{ runes: 0, total: 20, firstTry: 0, elapsedMs: 0 }}
        lang="ru"
        reducedMotion
        onContinue={jest.fn()}
      />,
    );
    expect(ui.getByTestId("horizons-rune-count").props.children).toBe(0);
    expect(ui.queryByText("Закрепилось")).toBeNull();
    expect(ui.getByText("Стоит повторить")).toBeTruthy();
    await ui.unmount();
  });
  test.each(["existing", "practice"] as const)("%s runes never imply a new wallet credit", async credit => {
    const ui = await render(<HorizonSessionResult lesson={1} kind="session" stars={2} facts={{runes:51,total:20,firstTry:17,elapsedMs:1000,credit}} lang="ru" reducedMotion onContinue={jest.fn()}/>);
    expect(ui.getByTestId("horizons-rune-count").props.children).toBe(51);
    expect(ui.queryByText("+")).toBeNull();
    expect(ui.queryByText("ЗАРАБОТАНО ЗА СЕССИЮ")).toBeNull();
    expect(ui.getByText(credit === "existing" ? "Повторного начисления нет" : "Учебный результат · без начисления")).toBeTruthy();
    await ui.unmount();
  });
});

describe("Horizons entry dismissal lifecycle", () => {
  const props = {
    visible: true,
    title: "Start",
    message: "Outcome",
    primaryLabel: "Begin",
    secondaryLabel: "Close",
    closeLabel: "Dismiss",
    onPrimaryPress: jest.fn(),
    onSecondaryPress: jest.fn(),
  };
  test("reduced-motion swipe closes immediately without awaiting an animation", async () => {
    mockReducedMotion = true;
    const close = jest.fn();
    const ui = await render(<OutcomeSheet {...props} onClose={close} />);
    mockGestureEnd.current?.({ velocityY: 1000 });
    expect(close).toHaveBeenCalledTimes(1);
    await ui.unmount();
  });
  test("the secondary action skips intro instead of closing the modal", async () => {
    mockReducedMotion = true;
    const close = jest.fn();
    const skip = jest.fn();
    const ui = await render(<OutcomeSheet {...props} onClose={close} onSecondaryPress={skip} />);
    await fireEvent.press(ui.getByTestId("learning-v2-session-skip-intro"));
    expect(skip).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    await ui.unmount();
  });
  test("the backdrop and close icon announce dismissal, not the skip-intro action", async () => {
    mockReducedMotion = true;
    const close = jest.fn();
    const ui = await render(<OutcomeSheet {...props} onClose={close} />);
    expect(ui.getAllByLabelText("Dismiss")).toHaveLength(2);
    expect(ui.getAllByLabelText("Close")).toHaveLength(1);
    await fireEvent.press(ui.getAllByLabelText("Dismiss")[1]);
    expect(close).toHaveBeenCalledTimes(1);
    expect(props.onSecondaryPress).not.toHaveBeenCalled();
    await ui.unmount();
  });
  test("a cancelled dismissal cannot close a subsequent opening", async () => {
    jest.useFakeTimers();
    mockReducedMotion = false;
    const close = jest.fn();
    const ui = await render(<OutcomeSheet {...props} onClose={close} />);
    await fireEvent.press(ui.getAllByLabelText("Dismiss")[0]);
    await ui.rerender(
      <OutcomeSheet {...props} visible={false} onClose={close} />,
    );
    await ui.rerender(<OutcomeSheet {...props} onClose={close} />);
    jest.advanceTimersByTime(500);
    expect(close).not.toHaveBeenCalled();
    await ui.unmount();
    jest.useRealTimers();
    mockReducedMotion = true;
  });
});
