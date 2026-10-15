import assert from "node:assert/strict";
import test from "node:test";

import { replaceGeneratedPrefixRows } from "./learning_v2_generated_prefix_rows.mjs";

const row = (ordinal, value) => `  Object.freeze({\n    lessonOrdinal: 1, sessionOrdinal: ${ordinal},\n    value: ${JSON.stringify(value)},\n  }),`;
const moduleText = (rows) => `header\nexport const ROWS = Object.freeze([\n${rows.join("\n")}\n]);\n`;

test("replaces only the generated prefix and preserves every trailing row byte-for-byte", () => {
  const current = moduleText([row(1, "old-1"), row(2, "old-2"), row(3, "keep-3")]);
  const prefix = moduleText([row(1, "new-1"), row(2, "new-2")]);
  const updated = replaceGeneratedPrefixRows(current, prefix, 2);

  assert.match(updated, /new-1/u);
  assert.match(updated, /new-2/u);
  assert.match(updated, /keep-3/u);
  assert.doesNotMatch(updated, /old-1|old-2/u);
});

test("fails closed when current or replacement row counts do not match", () => {
  assert.throws(() => replaceGeneratedPrefixRows(moduleText([row(1, "a")]), moduleText([row(1, "b")]), 2), /generated_row_count_invalid/u);
  assert.throws(() => replaceGeneratedPrefixRows(moduleText([row(1, "a"), row(2, "b")]), moduleText([row(1, "c")]), 2), /generated_row_count_invalid/u);
});
