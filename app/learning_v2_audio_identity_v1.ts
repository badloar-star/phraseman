import Constants from "expo-constants";
import { Platform } from "react-native";

import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import type { LearningV2CourseSessionAudioFileV1 } from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import type { LearningV2NativeDecoderIdentityV1 } from "../modules/learning-v2/runtime/voice_native_decoder_observer_v1";

function fail(): never {
  throw new Error("learning_v2_course_session_audio_preload_invalid");
}

function boundedToken(value: string | null | undefined): string {
  const normalized = (value ?? "unknown")
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9._-]+/gu, "_")
    .slice(0, 64);
  return normalized || "unknown";
}

export function learningV2NativeDecoderIdentityForAudioFileV1(
  file: LearningV2CourseSessionAudioFileV1,
  itemIndex: number,
): LearningV2NativeDecoderIdentityV1 {
  if (Platform.OS !== "ios" && Platform.OS !== "android") fail();
  // Native identity is resolved lazily so cache-only imports do not initialize
  // expo-device on web or in route-contract tests.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Device = require("expo-device") as {
    readonly isDevice?: boolean;
    readonly osVersion?: string | null;
  };
  return Object.freeze({
    itemIndex,
    generationTargetFingerprint: file.fileFingerprint,
    entryFingerprint: file.fileFingerprint,
    objectPath: file.objectPath,
    contentHash: file.contentHash,
    objectGeneration: file.objectGeneration,
    byteSize: file.byteSize,
    platform: Platform.OS,
    deviceClass: Device.isDevice ? "physical_device" : "simulator_or_emulator",
    osVersion: boundedToken(Device.osVersion),
    appBuildFingerprint: hashCanonicalBody({
      schemaVersion: "learning-v2-course-session-audio-app-build.v1",
      appVersion: boundedToken(
        Constants.expoConfig?.version ?? Constants.nativeAppVersion,
      ),
      buildVersion: boundedToken(Constants.nativeBuildVersion),
    }),
    expoAudioVersion: "1.1.1",
  });
}
