import assert from "node:assert/strict";

import {
  isLearningV2BulkAudioNetworkEligibleV1,
  isLearningV2UrgentAudioNetworkEligibleV1,
  learningV2UrgentAudioCoordinatesV1,
} from "../app/learning_v2_audio_prefetch_policy_v1";

const published = new Set([
  "1:54",
  "1:55",
  "1:56",
  "2:1",
  "2:2",
  "2:3",
]);
const isPublished = (lessonOrdinal: number, sessionOrdinal: number) =>
  published.has(`${lessonOrdinal}:${sessionOrdinal}`);

assert.deepEqual(
  learningV2UrgentAudioCoordinatesV1({
    lessonOrdinal: 1,
    sessionOrdinal: 54,
    count: 3,
    isPublished,
  }),
  [
    { lessonOrdinal: 1, sessionOrdinal: 54 },
    { lessonOrdinal: 1, sessionOrdinal: 55 },
    { lessonOrdinal: 1, sessionOrdinal: 56 },
  ],
);

assert.deepEqual(
  learningV2UrgentAudioCoordinatesV1({
    lessonOrdinal: 1,
    sessionOrdinal: 55,
    count: 3,
    isPublished,
  }),
  [
    { lessonOrdinal: 1, sessionOrdinal: 55 },
    { lessonOrdinal: 1, sessionOrdinal: 56 },
    { lessonOrdinal: 2, sessionOrdinal: 1 },
  ],
  "urgent prefetch must cross a lesson boundary",
);

assert.deepEqual(
  learningV2UrgentAudioCoordinatesV1({
    lessonOrdinal: 2,
    sessionOrdinal: 2,
    count: 3,
    isPublished,
  }),
  [
    { lessonOrdinal: 2, sessionOrdinal: 2 },
    { lessonOrdinal: 2, sessionOrdinal: 3 },
  ],
  "urgent prefetch must stop at the first unpublished session",
);

assert.equal(isLearningV2BulkAudioNetworkEligibleV1({
  type: "wifi",
  isConnected: true,
  isInternetReachable: true,
  isConnectionExpensive: false,
}), true);
assert.equal(isLearningV2BulkAudioNetworkEligibleV1({
  type: "cellular",
  isConnected: true,
  isInternetReachable: true,
  isConnectionExpensive: false,
}), false);
assert.equal(isLearningV2UrgentAudioNetworkEligibleV1({
  type: "cellular",
  isConnected: true,
  isInternetReachable: true,
  isConnectionExpensive: true,
}), true, "urgent window may use cellular data");
assert.equal(isLearningV2UrgentAudioNetworkEligibleV1({
  type: "none",
  isConnected: false,
  isInternetReachable: false,
  isConnectionExpensive: false,
}), false);
assert.equal(isLearningV2BulkAudioNetworkEligibleV1({
  type: "wifi",
  isConnected: true,
  isInternetReachable: true,
  isConnectionExpensive: true,
}), false);
assert.equal(isLearningV2BulkAudioNetworkEligibleV1({
  type: "wifi",
  isConnected: true,
  isInternetReachable: null,
  isConnectionExpensive: false,
}), false, "unknown reachability must not start bulk downloads");
assert.equal(isLearningV2BulkAudioNetworkEligibleV1({
  type: "wifi",
  isConnected: true,
  isInternetReachable: true,
  isConnectionExpensive: null,
}), false, "unknown connection cost must not start bulk downloads");
assert.equal(isLearningV2UrgentAudioNetworkEligibleV1({
  type: "cellular",
  isConnected: true,
  isInternetReachable: null,
  isConnectionExpensive: true,
}), false, "unknown reachability must not start urgent downloads");
assert.equal(isLearningV2BulkAudioNetworkEligibleV1({
  type: "wifi",
  isConnected: false,
  isInternetReachable: false,
  isConnectionExpensive: false,
}), false);

console.log("LEARNING V2 AUDIO PREFETCH POLICY: PASS");
