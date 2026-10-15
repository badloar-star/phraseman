import assert from "node:assert/strict";
import test from "node:test";
import { canonicalAnnotation, hasAnnotationChanges, parseAnnotation } from "./interaction_annotation.mjs";

test("recognizes a legacy interaction annotation that has no family", () => {
  assert.deepEqual(
    parseAnnotation("<!-- interaction_id: en:lesson-01:session-15:i17:s01; -->"),
    { interactionId: "en:lesson-01:session-15:i17:s01", family: null },
  );
});

test("formats the only permitted canonical annotation", () => {
  assert.equal(
    canonicalAnnotation("en:lesson-01:session-15:i17:s01", "phrase_builder"),
    "<!-- interaction_id: en:lesson-01:session-15:i17:s01; family: phrase_builder -->",
  );
});

test("a legacy-to-canonical replacement is a write even with no insertion", () => {
  assert.equal(hasAnnotationChanges({ insertions: 0, replacements: 1 }), true);
  assert.equal(hasAnnotationChanges({ insertions: 0, replacements: 0 }), false);
});
