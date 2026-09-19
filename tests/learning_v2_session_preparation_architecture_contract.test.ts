import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lessons = readFileSync("app/(tabs)/lessons.tsx", "utf8");
const pulse = readFileSync(
  "components/learning-v2/LearningV2PulseCourse.tsx",
  "utf8",
);
const sheet = readFileSync(
  "components/LearningV2SessionOutcomeSheet.tsx",
  "utf8",
);
const client = readFileSync(
  "app/learning_v2_course_released_session_client_v3.ts",
  "utf8",
);
const audio = readFileSync(
  "app/learning_v2_course_session_audio_preload_v1.ts",
  "utf8",
);

assert.match(
  lessons,
  /prewarmCurrentLearningV2SessionOnEntry/,
  "the current session must start preparing as soon as Learning V2 opens",
);
assert.match(
  lessons,
  /learningV2ProgressHydrated/,
  "entry prewarm must use hydrated local progress, not the default placeholder",
);
assert.match(
  lessons,
  /learningV2FounderPassVisible[\s\S]{0,1800}prewarmCurrentLearningV2SessionOnEntry/,
  "Founder Pass time must be used to prepare the current session",
);
assert.match(
  pulse,
  /onVisibleSessionsSettled/,
  "the map must report visible sessions after scrolling settles",
);
assert.match(pulse, /onMomentumScrollEnd=/);
assert.match(pulse, /onScrollEndDrag=/);

const pressHandler = lessons.slice(
  lessons.indexOf("const handleLearningV2SessionPress"),
  lessons.indexOf("const handleLessonsBack"),
);
assert.ok(pressHandler.length > 0, "session press handler missing");
assert.ok(
  pressHandler.indexOf("setSelectedLearningV2Session") <
    pressHandler.indexOf("prepareLearningV2SessionBeforeModal"),
  "tap must mount the metadata-only modal synchronously before preparation",
);
assert.doesNotMatch(
  pressHandler,
  /prepareLearningV2SessionBeforeModal[\s\S]*?\.then\([\s\S]*?setSelectedLearningV2Session/,
  "modal visibility must not wait for preparation",
);

const launchHandler = lessons.slice(
  lessons.indexOf("const launchSelectedLearningV2Session"),
  lessons.indexOf("// Витрина звёзд"),
);
assert.match(launchHandler, /setSelectedLearningV2Session\(null\)/);
assert.match(launchHandler, /LEARNING_V2_SESSION_MODAL_EXIT_MS/);
assert.match(launchHandler, /Promise\.all/);

assert.match(audio, /physicalAudioCacheKeyV1/);
assert.match(audio, /verifiedPhysicalAudioFiles/);
assert.match(
  audio,
  /physicalAudioCacheKeyV1\([\s\S]{0,220}audioFingerprint[\s\S]{0,220}contentHash/,
);
assert.doesNotMatch(
  audio.match(/function physicalAudioCacheKeyV1[\s\S]*?\n\}/)?.[0] ?? "",
  /sessionRunId/,
  "physical-file cache identity must not contain sessionRunId",
);

assert.match(client, /getLearningV2CourseSessionReadyTimingV3/);
assert.match(client, /materialReadyAtMs/);
assert.match(client, /audioReadyAtMs/);
assert.match(sheet, /onMounted/);
assert.match(lessons, /startLearningV2SessionLaunchTraceV1/);
assert.match(lessons, /markLearningV2SessionLaunchStageV1/);
assert.match(lessons, /"modal_mounted"/);
assert.match(lessons, /"material_ready"/);
assert.match(lessons, /"audio_ready"/);

console.log("LEARNING V2 SESSION PREPARATION ARCHITECTURE CONTRACT: PASS");
