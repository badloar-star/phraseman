import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sessionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s02");
const atomic = () => JSON.parse(fs.readFileSync(path.join(sessionDir, "practice.atomic.json"), "utf8"));
const correctChoiceIds = ["i02", "i04", "i08", "i09", "i14:s02", "i17:s03"];
const extraTileIds = ["i10", "i11", "i13", "i15", "i17:s02", "i17:s04"];

test("L01/S02 explains every learner-selectable answer", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) for (const suffix of correctChoiceIds) {
    const interactionId = `en:lesson-01:session-02:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId);
    const answer = data.answers.find((entry) => entry.interactionId === interactionId);
    const feedback = interaction?.modePayload?.choiceFeedback?.find((entry) => entry.responseId === answer?.correctResponseId);
    assert.equal(feedback?.correct, true, `${locale}:${suffix} needs correct-choice feedback`);
    assert.ok(feedback?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} needs Russian feedback`);
    assert.ok(feedback?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs Ukrainian feedback`);
  }
});

test("L01/S02 explains every authored extra tile", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) for (const suffix of extraTileIds) {
    const interactionId = `en:lesson-01:session-02:${suffix}`;
    const feedback = data.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId)?.modePayload?.slotFeedback;
    assert.equal(feedback?.length, 1, `${locale}:${suffix} needs one extra-tile explanation`);
    assert.equal(feedback?.[0]?.responseId, `${interactionId}:tile:d1`, `${locale}:${suffix} must identify the physical extra tile`);
    assert.equal(feedback?.[0]?.correct, false, `${locale}:${suffix} extra tile must be marked wrong`);
    assert.ok(feedback?.[0]?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} needs Russian tile feedback`);
    assert.ok(feedback?.[0]?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs Ukrainian tile feedback`);
  }
});
