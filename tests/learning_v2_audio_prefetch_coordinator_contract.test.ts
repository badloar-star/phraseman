import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const coordinatorPath = "app/learning_v2_audio_prefetch_coordinator_v1.ts";
const backgroundPath = "app/learning_v2_audio_prefetch_background_v1.ts";
assert.ok(existsSync(coordinatorPath), "audio prefetch coordinator must exist");
assert.ok(existsSync(backgroundPath), "audio prefetch background adapter must exist");

const coordinator = readFileSync(coordinatorPath, "utf8");
const background = readFileSync(backgroundPath, "utf8");
const packs = readFileSync("app/learning_v2_lesson_audio_pack_v1.ts", "utf8");
const lessons = readFileSync("app/(tabs)/lessons.tsx", "utf8");
const rootLayout = readFileSync("app/_layout.tsx", "utf8");
const appConfig = readFileSync("app.config.js", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  dependencies?: Record<string, string>;
};

assert.match(coordinator, /runLearningV2AudioPrefetchCoordinatorCoreV1/);
assert.match(coordinator, /prepareLearningV2SessionAudioPackV1/);
assert.match(coordinator, /prepareLearningV2LessonAudioPackV1/);
assert.match(coordinator, /NetInfo\.addEventListener/);
assert.match(coordinator, /AsyncStorage\.setItem/);
assert.match(coordinator, /inFlight/);
assert.match(coordinator, /persistChain/);
assert.match(coordinator, /queueRevision/);
assert.match(coordinator, /activeRunAbortController/);
assert.match(coordinator, /signal/);
assert.match(packs, /export function learningV2PublishedAudioLessonOrdinalsV1/);
assert.match(packs, /retainedPublishedHashes/);
assert.match(packs, /input\.signal/);
assert.match(background, /TaskManager\.defineTask/);
assert.match(background, /BackgroundTask\.registerTaskAsync/);
assert.match(background, /runPersistedLearningV2AudioPrefetchV1/);
assert.match(background, /network\.isInternetReachable !== true/);
assert.match(lessons, /requestLearningV2AudioPrefetchV1/);
assert.doesNotMatch(
  lessons.slice(
    lessons.indexOf("const handleLearningV2SessionPress"),
    lessons.indexOf("const handleLearningV2SessionModalMounted"),
  ),
  /isLearningV2SessionAudioPublishedV1/,
  "audio publication must not gate a session tap",
);
assert.match(rootLayout, /startLearningV2AudioPrefetchNetworkObserverV1/);
assert.match(rootLayout, /registerLearningV2AudioPrefetchBackgroundTaskV1/);
assert.match(appConfig, /expo-background-task/);
assert.equal(packageJson.dependencies?.["expo-background-task"], "~1.0.10");
assert.equal(packageJson.dependencies?.["expo-task-manager"], "~14.0.9");
assert.doesNotMatch(
  coordinator,
  /Alert|Toast|setState|loading|progressMessage|notification/i,
  "prefetch must have no learner-facing surface",
);

console.log("LEARNING V2 AUDIO PREFETCH COORDINATOR CONTRACT: PASS");
