import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";

import SpeakingPanel from "../components/SpeakingPanel";

const mockSpeechListeners = new Map<string, (event: unknown) => void>();
const mockSpeech = {
  addListener: jest.fn((event: string, listener: (payload: unknown) => void) => {
    mockSpeechListeners.set(event, listener);
    return { remove: () => mockSpeechListeners.delete(event) };
  }),
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  supportsOnDeviceRecognition: jest.fn(async () => true),
  isRecognitionAvailable: jest.fn(() => true),
};

jest.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  AppState: {
    currentState: "active",
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Linking: { openSettings: jest.fn(async () => undefined) },
  Modal: "Modal",
  Platform: { OS: "ios" },
  Pressable: "Pressable",
  StyleSheet: {
    absoluteFillObject: {},
    create: (styles: unknown) => styles,
    hairlineWidth: 1,
  },
  Text: "Text",
  View: "View",
}));
jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons");
jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    pause: jest.fn(),
    play: jest.fn(),
    remove: jest.fn(),
    replace: jest.fn(),
  })),
}));
jest.mock("expo-file-system", () => ({
  File: class {
    exists = false;
    delete = jest.fn();
  },
}));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("expo-speech-recognition", () => ({
  ExpoSpeechRecognitionModule: mockSpeech,
}));
jest.mock("../components/ThemeContext", () => ({
  useTheme: () => ({ liquidGlassThemeId: "light" }),
}));
jest.mock("../constants/liquidGlassThemePalette", () => ({
  liquidGlassTokens: () => ({
    opaqueSheet: "#fff",
    text: "#111",
    secondary: "#555",
    cta: "#07f",
    accentText: "#07f",
    ctaInk: "#fff",
    line: "#ccc",
  }),
}));
jest.mock("../app/voice_equalizer", () => ({
  VOICE_EQUALIZER_ROW_H: 52,
  VoiceEqualizer: "VoiceEqualizer",
}));
jest.mock("../app/dev_cards_state", () => ({
  devSpeechTranscriptFor: jest.fn(() => null),
  getDevSpeechMode: jest.fn(() => null),
}));
jest.mock("../hooks/use_runtime_active", () => ({
  useRuntimeActive: () => true,
}));
jest.mock("../hooks/use-haptics", () => ({
  hapticError: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticTap: jest.fn(),
}));
jest.mock("../hooks/use-record-start-cue", () => ({
  useRecordStartCue: (() => {
    const value = { playRecordStart: jest.fn() };
    return () => value;
  })(),
}));
jest.mock("../hooks/use-no-speech-cue", () => ({
  useNoSpeechCue: (() => {
    const value = { playNoSpeech: jest.fn() };
    return () => value;
  })(),
}));
jest.mock("../hooks/use-audio", () => ({
  useAudio: (() => {
    const value = { speak: jest.fn(), stop: jest.fn() };
    return () => value;
  })(),
}));
jest.mock("../hooks/use_managed_recording_audio", () => ({
  useManagedRecordingAudio: (() => {
    const value = {
      begin: jest.fn(async () => true),
      release: jest.fn(),
    };
    return () => value;
  })(),
}));
jest.mock("../modules/audio/audio_runtime_arbiter", () => ({
  claimSpokenAudio: jest.fn(() => ({ release: jest.fn() })),
  whenSpokenAudioReady: jest.fn(async () => undefined),
}));
jest.mock("../app/speech_recognition_module", () => ({
  isSpeechRecognitionAvailable: jest.fn(() => true),
  requestSpeechPermissionForHold: jest.fn(async () => "already_granted"),
}));
jest.mock("../components/SpeakingInlineSlot", () => ({
  useSpeakingInlineMetrics: () => ({ scale: 1 }),
}));
jest.mock("../components/WordDrillCard", () => ({
  WordDrillCard: "WordDrillCard",
}));
jest.mock("../app/speaking_hold_recorder", () => ({
  deleteHoldRecording: jest.fn(),
  isHoldRecordingSupported: jest.fn(() => false),
  startHoldRecording: jest.fn(),
}));
jest.mock("../app/speaking_neural_judge", () => ({
  ensureNeuralModel: jest.fn(async () => false),
  isNeuralJudgeSupported: jest.fn(() => false),
  isNeuralModelReady: jest.fn(() => false),
  judgeWithNeuralEngine: jest.fn(async () => null),
}));

const theme = {
  bg: "#fff",
  card: "#fff",
  textPrimary: "#111",
  textSecond: "#555",
  textMuted: "#777",
  accent: "#07f",
  correct: "#080",
  wrong: "#d00",
  border: "#ccc",
  onAccent: "#fff",
  accentText: "#07f",
};

describe("Learning V2 strict scripted-repeat SpeakingPanel host boundary", () => {
  beforeEach(() => {
    mockSpeechListeners.clear();
    jest.clearAllMocks();
  });

  it("keeps target-derived interim matching and accessibility text absent before the first scored attempt", async () => {
    const onTranscriptChange = jest.fn();
    const screen = await render(
      <SpeakingPanel
        targetText="I am smart"
        lang="en"
        theme={theme}
        presentation="inline"
        renderInlineSurface={false}
        holdActive={false}
        onTranscriptChange={onTranscriptChange}
        onClose={jest.fn()}
      />,
    );

    await screen.rerender(
      <SpeakingPanel
        targetText="I am smart"
        lang="en"
        theme={theme}
        presentation="inline"
        renderInlineSurface={false}
        holdActive
        onTranscriptChange={onTranscriptChange}
        onClose={jest.fn()}
      />,
    );
    await waitFor(() => {
      expect(mockSpeechListeners.get("result")).toBeDefined();
    });
    await act(async () => {
      mockSpeechListeners.get("result")?.({
        isFinal: false,
        results: [{ transcript: "I" }],
      });
    });

    expect(onTranscriptChange).toHaveBeenCalledWith("i");
    expect(screen.queryByTestId("speaking-inline-card")).toBeNull();
    expect(screen.queryByText("I")).toBeNull();
    expect(screen.queryByLabelText(/I am smart|I __ _____/u)).toBeNull();

    screen.unmount();
  });
});
