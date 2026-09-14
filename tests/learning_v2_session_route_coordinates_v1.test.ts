import assert from "node:assert/strict";
import { resolveLearningV2SessionRouteCoordinatesV1 } from "../app/learning_v2_session_route_coordinates_v1";

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

console.log("Learning V2 route coordinates v1: PASS");
