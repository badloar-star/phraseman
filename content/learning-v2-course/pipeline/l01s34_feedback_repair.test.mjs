import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-34";
const choices = { i02: "busy", i04: "nice", i05: "are", i08: "loud", i09: "nice", i13: "ready" };
const tiles = ["i10", "i12", "i14", "i15", "i17:s01"];

test("L01/S34 explains every checked answer and every extra tile", () => {
  const file = path.join(root, "sessions/en/l01/s34/practice.atomic.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const locale of ["ru", "uk"]) {
    const rows = new Map(data.interactionsByLocale[locale].map((row) => [row.interactionId.slice(`${session}:`.length), row]));
    for (const [id, answer] of Object.entries(choices)) {
      const feedback = rows.get(id).modePayload.choiceFeedback?.find((item) => item.responseId === `${session}:${id}:r1`);
      assert.equal(feedback?.correct, true, `${locale}:${id}:correct choice`);
      assert.match(feedback?.feedbackByLocale?.[locale] ?? "", new RegExp(answer), `${locale}:${id}:meaning`);
    }
    for (const id of tiles) {
      const row = rows.get(id);
      assert.deepEqual(row.responseOptions, [], `${locale}:${id}:no answer buttons`);
      const feedback = row.modePayload.slotFeedback?.find((item) => item.responseId === `${session}:${id}:tile:d1`);
      assert.equal(feedback?.correct, false, `${locale}:${id}:extra tile`);
      assert.ok(feedback?.feedbackByLocale?.[locale], `${locale}:${id}:localized feedback`);
    }
  }
});
