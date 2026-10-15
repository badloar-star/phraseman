import assert from "node:assert/strict";
import test from "node:test";

import { isSinglePhraseMigrationLesson } from "./single_phrase_scope.mjs";

test("single-phrase preservation scope is limited to lessons 1–3", () => {
  assert.equal(isSinglePhraseMigrationLesson("l01"), true);
  assert.equal(isSinglePhraseMigrationLesson("l02"), true);
  assert.equal(isSinglePhraseMigrationLesson("l03"), true);
  assert.equal(isSinglePhraseMigrationLesson("l04"), false);
  assert.equal(isSinglePhraseMigrationLesson("l10"), false);
});
