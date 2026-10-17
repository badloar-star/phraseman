import assert from "node:assert/strict";
import { resolveLearningV2SessionRouteCoordinatesV1 } from "../app/learning_v2_session_route_coordinates_v1";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
assert.deepEqual(resolveLearningV2SessionRouteCoordinatesV1({
  id: "lesson-03:session:05", lessonOrdinal: "", sessionOrdinal: "",
}), { lessonOrdinal: 3, sessionOrdinal: 5 });
assert.deepEqual(resolveLearningV2SessionRouteCoordinatesV1({
  id: "lesson-03:session:05", lessonOrdinal: "3", sessionOrdinal: "5",
}), { lessonOrdinal: 3, sessionOrdinal: 5 });
assert.equal(resolveLearningV2SessionRouteCoordinatesV1({
  id: "lesson-03:session:05", lessonOrdinal: "2", sessionOrdinal: "5",
}), null);
assert.equal(resolveLearningV2SessionRouteCoordinatesV1({
  id: "broken", lessonOrdinal: "", sessionOrdinal: "",
}), null);
assert.equal(resolveLearningV2SessionRouteCoordinatesV1({
  id: "", lessonOrdinal: "", sessionOrdinal: "",
}), null);
assert.equal(resolveLearningV2SessionRouteCoordinatesV1({
  id: "", lessonOrdinal: "1", sessionOrdinal: "",
}), null);
assert.equal(resolveLearningV2SessionRouteCoordinatesV1({
  id: "lesson-03:session:05", lessonOrdinal: "3x", sessionOrdinal: "5",
}), null);

// зачем (Сверка 18.10): id фабрики «en:lesson-NN:session-NN» (диплинк) разбирается так же, как id приложения
assert.deepEqual(resolveLearningV2SessionRouteCoordinatesV1({
  id: "en:lesson-01:session-07", lessonOrdinal: "", sessionOrdinal: "",
}), { lessonOrdinal: 1, sessionOrdinal: 7 });
assert.equal(resolveLearningV2SessionRouteCoordinatesV1({
  id: "en:lesson-01:session-07", lessonOrdinal: "1", sessionOrdinal: "8",
}), null);
assert.equal(resolveLearningV2SessionRouteCoordinatesV1({
  id: "en:lesson-01:session:07", lessonOrdinal: "", sessionOrdinal: "",
}), null);

console.log("Learning V2 route coordinates v1: PASS");
}

if (typeof test === "function") {
  test("learning_v2_session_route_coordinates_v1", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
