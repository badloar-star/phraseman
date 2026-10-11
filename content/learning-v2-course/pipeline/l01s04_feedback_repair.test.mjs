import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s04");
const read = () => JSON.parse(fs.readFileSync(path.join(dir, "practice.atomic.json"), "utf8"));
const choices = ["i02", "i04", "i06", "i08", "i09", "i13", "i15", "i21"];
const tiles = ["i12", "i14", "i16", "i18", "i20"];

test("L01/S04 explains every selectable answer", () => {
  const data = read();
  for (const locale of ["ru", "uk"]) for (const suffix of choices) {
    const id = `en:lesson-01:session-04:${suffix}`;
    const item = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const answer = data.answers.find((entry) => entry.interactionId === id);
    const row = item?.modePayload?.choiceFeedback?.find((entry) => entry.responseId === answer?.correctResponseId);
    assert.equal(row?.correct, true, `${locale}:${suffix} needs correct feedback`);
    assert.ok(row?.feedbackByLocale?.ru?.trim() && row?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs bilingual feedback`);
  }
});

test("L01/S04 explains every physical extra tile", () => {
  const data = read();
  for (const locale of ["ru", "uk"]) for (const suffix of tiles) {
    const id = `en:lesson-01:session-04:${suffix}`;
    const row = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id)?.modePayload?.slotFeedback?.[0];
    assert.equal(row?.responseId, `${id}:tile:d1`, `${locale}:${suffix} needs physical tile feedback`);
    assert.equal(row?.correct, false, `${locale}:${suffix} tile must be wrong`);
    assert.ok(row?.feedbackByLocale?.ru?.trim() && row?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs bilingual tile feedback`);
  }
});

test("L01/S04 does not duplicate busy in the final gap", () => {
  const data = read();
  for (const locale of ["ru", "uk"]) {
    const task = data.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i21"));
    assert.equal(task?.modePayload?.gappedTargetPhrase, "I am ___ .");
  }
});
