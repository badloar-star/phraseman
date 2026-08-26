import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(__dirname, "..", "hooks/use_learning_v2_local_hold_to_talk_v1.ts"),
  "utf8",
);

test("Learning V2 hold-to-talk is ephemeral, lifecycle-owned and can use the phone recognizer", () => {
  expect(source).toContain("useRuntimeActive()");
  expect(source).toContain("if (runtimeActive) return;");
  expect(source).toContain("generationRef.current += 1");
  expect(source).toContain("holdPressRef.current = false");
  expect(source).toContain("cleanupListeners()");
  expect(source).toContain("speechModule?.abort()");
  expect(source).toContain("restoreLoudPlaybackMode()");
  expect(source).toContain("persistRecording: false");
  expect(source).toContain("onDevice: localRecognition");
  expect(source).not.toContain("requiresOnDeviceRecognition: true");
  expect(source).not.toContain('setStatus("local_recognition_unavailable");\n      return;\n    }\n    cleanupListeners();');
  expect(source).not.toMatch(
    /httpsCallable|fetch\(|@react-native-firebase|Firestore|Storage/u,
  );
});

test("Learning V2 direct player exposes the real hold microphone in the center footer", () => {
  const player = readFileSync(
    join(__dirname, "..", "app/learning_v2_direct_session_player_v1.tsx"),
    "utf8",
  );
  expect(player).toContain("useLearningV2LocalHoldToTalkV1({");
  expect(player).toContain("void localVoice.start()");
  expect(player).toContain("onPressOut={localVoice.stop}");
  expect(player).toContain("<VoiceEqualizer");
  expect(player).not.toContain("<SpeakingPanel");
  expect(player).toContain('testID="learning-v2-footer-hold-to-talk"');
  expect(player).toContain("styles.footerMicSlot");
  expect(player).toContain("learningV2CourseSessionVoiceResponseV1(");
  expect(player).not.toMatch(/sendVoice|submitVoice|uploadVoice/u);
});
