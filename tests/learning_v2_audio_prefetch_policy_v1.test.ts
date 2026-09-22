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

// зачем (владелец, 22.09): прежний сторож фиксировал ОТМЕНЁННОЕ правило —
// «массово качать только по Wi-Fi» и «при неизвестной достижимости не качать
// вовсе». Именно оно и давало «Занятие не подготовилось. Проверь связь»:
// NetInfo отдаёт isInternetReachable === null сразу после запуска, поэтому
// прогрев не стартовал в тот самый момент, когда человек открывает карту.
// Владелец решил: качать на любой сети, кроме соединения по счётчику.

// Wi-Fi — качаем.
assert.equal(isLearningV2BulkAudioNetworkEligibleV1({
  type: "wifi",
  isConnected: true,
  isInternetReachable: true,
  isConnectionExpensive: false,
}), true);
// Мобильный интернет — ТОЖЕ качаем (раньше здесь стоял false).
assert.equal(isLearningV2BulkAudioNetworkEligibleV1({
  type: "cellular",
  isConnected: true,
  isInternetReachable: true,
  isConnectionExpensive: false,
}), true, "bulk prefetch must work on cellular, not only wi-fi");
// Неизвестная достижимость не должна останавливать закачку.
assert.equal(isLearningV2BulkAudioNetworkEligibleV1({
  type: "cellular",
  isConnected: true,
  isInternetReachable: null,
  isConnectionExpensive: false,
}), true, "unknown reachability must not block bulk downloads");
// Единственный настоящий стоп массовой закачки — оплата по счётчику.
assert.equal(isLearningV2BulkAudioNetworkEligibleV1({
  type: "wifi",
  isConnected: true,
  isInternetReachable: true,
  isConnectionExpensive: true,
}), false, "metered connection must never start bulk downloads");
// Сети нет — не качаем.
assert.equal(isLearningV2BulkAudioNetworkEligibleV1({
  type: "none",
  isConnected: false,
  isInternetReachable: false,
  isConnectionExpensive: false,
}), false);

// Срочное окно ближайших сессий важнее экономии: идёт даже по счётчику.
assert.equal(isLearningV2UrgentAudioNetworkEligibleV1({
  type: "cellular",
  isConnected: true,
  isInternetReachable: true,
  isConnectionExpensive: true,
}), true, "urgent window may use cellular data");
// Неизвестность трактуем как «попробовать стоит» (раньше здесь был false —
// ровно этот случай и ломал открытие занятия на старте приложения).
assert.equal(isLearningV2UrgentAudioNetworkEligibleV1({
  type: "cellular",
  isConnected: true,
  isInternetReachable: null,
  isConnectionExpensive: true,
}), true, "unknown reachability must still attempt the urgent window");
assert.equal(isLearningV2UrgentAudioNetworkEligibleV1({
  type: "unknown",
  isConnected: null,
  isInternetReachable: null,
  isConnectionExpensive: null,
}), true, "unknown network state must still attempt the urgent window");
// Явный отказ по-прежнему останавливает.
assert.equal(isLearningV2UrgentAudioNetworkEligibleV1({
  type: "none",
  isConnected: false,
  isInternetReachable: false,
  isConnectionExpensive: false,
}), false);
assert.equal(isLearningV2UrgentAudioNetworkEligibleV1({
  type: "wifi",
  isConnected: true,
  isInternetReachable: false,
  isConnectionExpensive: false,
}), false, "connected but provably offline must not download");

console.log("LEARNING V2 AUDIO PREFETCH POLICY: PASS");
