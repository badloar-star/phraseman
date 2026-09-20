import assert from "node:assert/strict";

import { runLearningV2AudioPrefetchCoordinatorCoreV1 } from "../app/learning_v2_audio_prefetch_coordinator_core_v1";

const publishedSessions = new Set(["1:55", "1:56", "2:1", "2:2"]);

async function run(type: "wifi" | "cellular" | "none") {
  const calls: string[] = [];
  const summary = await runLearningV2AudioPrefetchCoordinatorCoreV1({
    current: { lessonOrdinal: 1, sessionOrdinal: 55 },
    network: {
      type,
      isConnected: type !== "none",
      isInternetReachable: type !== "none",
      isConnectionExpensive: type === "cellular",
    },
    publishedLessonOrdinals: [3, 1, 2],
    isSessionPublished: (lessonOrdinal, sessionOrdinal) =>
      publishedSessions.has(`${lessonOrdinal}:${sessionOrdinal}`),
    prepareSession: async ({ lessonOrdinal, sessionOrdinal }) => {
      calls.push(`s:${lessonOrdinal}:${sessionOrdinal}`);
    },
    prepareLesson: async (lessonOrdinal) => {
      calls.push(`l:${lessonOrdinal}`);
    },
  });
  return { calls, summary };
}

void (async () => {
  const wifi = await run("wifi");
  assert.deepEqual(wifi.calls, [
    "s:1:55",
    "s:1:56",
    "s:2:1",
    "l:1",
    "l:2",
    "l:3",
  ]);
  assert.deepEqual(wifi.summary, {
    urgentSessionCount: 3,
    bulkLessonCount: 3,
    bulkEligible: true,
  });

  const cellular = await run("cellular");
  assert.deepEqual(cellular.calls, ["s:1:55", "s:1:56", "s:2:1"]);
  assert.equal(cellular.summary.bulkLessonCount, 0);
  assert.equal(cellular.summary.bulkEligible, false);

  const offline = await run("none");
  assert.deepEqual(offline.calls, []);
  assert.deepEqual(offline.summary, {
    urgentSessionCount: 0,
    bulkLessonCount: 0,
    bulkEligible: false,
  });

  const transitionCalls: string[] = [];
  let networkChecks = 0;
  await runLearningV2AudioPrefetchCoordinatorCoreV1({
    current: { lessonOrdinal: 1, sessionOrdinal: 55 },
    network: {
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
      isConnectionExpensive: false,
    },
    getNetwork: async () => {
      networkChecks += 1;
      return networkChecks <= 4
        ? { type: "wifi", isConnected: true, isInternetReachable: true, isConnectionExpensive: false }
        : { type: "cellular", isConnected: true, isInternetReachable: true, isConnectionExpensive: true };
    },
    shouldContinue: () => true,
    publishedLessonOrdinals: [1, 2, 3],
    isSessionPublished: (lessonOrdinal, sessionOrdinal) =>
      publishedSessions.has(`${lessonOrdinal}:${sessionOrdinal}`),
    prepareSession: async ({ lessonOrdinal, sessionOrdinal }) => {
      transitionCalls.push(`s:${lessonOrdinal}:${sessionOrdinal}`);
    },
    prepareLesson: async (lessonOrdinal) => {
      transitionCalls.push(`l:${lessonOrdinal}`);
    },
  });
  assert.deepEqual(transitionCalls, ["s:1:55", "s:1:56", "s:2:1", "l:1"],
    "bulk queue must stop before the next lesson after Wi-Fi becomes expensive");

  const preemptionCalls: string[] = [];
  let continueChecks = 0;
  await runLearningV2AudioPrefetchCoordinatorCoreV1({
    current: { lessonOrdinal: 1, sessionOrdinal: 55 },
    network: {
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
      isConnectionExpensive: false,
    },
    getNetwork: async () => ({
      type: "wifi", isConnected: true, isInternetReachable: true, isConnectionExpensive: false,
    }),
    shouldContinue: () => {
      continueChecks += 1;
      return continueChecks <= 4;
    },
    publishedLessonOrdinals: [1, 2, 3],
    isSessionPublished: (lessonOrdinal, sessionOrdinal) =>
      publishedSessions.has(`${lessonOrdinal}:${sessionOrdinal}`),
    prepareSession: async ({ lessonOrdinal, sessionOrdinal }) => {
      preemptionCalls.push(`s:${lessonOrdinal}:${sessionOrdinal}`);
    },
    prepareLesson: async (lessonOrdinal) => {
      preemptionCalls.push(`l:${lessonOrdinal}`);
    },
  });
  assert.deepEqual(preemptionCalls, ["s:1:55", "s:1:56", "s:2:1", "l:1"],
    "a newer request must preempt bulk work between lesson packs");

  console.log("LEARNING V2 AUDIO PREFETCH COORDINATOR CORE: PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
