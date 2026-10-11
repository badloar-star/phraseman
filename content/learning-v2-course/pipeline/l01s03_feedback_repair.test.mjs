import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sessionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s03");
const atomic = () => JSON.parse(fs.readFileSync(path.join(sessionDir, "practice.atomic.json"), "utf8"));
const choiceIds = ["i02", "i04", "i05", "i09", "i12", "i14", "i17:s02"];
const tileIds = ["i10", "i11", "i13", "i15:s02", "i17:s04"];

test("L01/S03 explains every learner-selectable answer", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) for (const suffix of choiceIds) {
    const id = `en:lesson-01:session-03:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const answer = data.answers.find((entry) => entry.interactionId === id);
    const row = interaction?.modePayload?.choiceFeedback?.find((item) => item.responseId === answer?.correctResponseId);
    assert.equal(row?.correct, true, `${locale}:${suffix} needs correct-choice feedback`);
    assert.ok(row?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} needs Russian feedback`);
    assert.ok(row?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs Ukrainian feedback`);
  }
});

test("L01/S03 explains every authored extra tile including Ukrainian not", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) for (const suffix of tileIds) {
    const id = `en:lesson-01:session-03:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const row = interaction?.modePayload?.slotFeedback?.[0];
    assert.equal(row?.responseId, `${id}:tile:d1`, `${locale}:${suffix} needs its physical tile feedback`);
    assert.equal(row?.correct, false, `${locale}:${suffix} tile must be wrong`);
    assert.ok(row?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} needs Russian tile feedback`);
    assert.ok(row?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs Ukrainian tile feedback`);
  }
  const ukI13 = data.interactionsByLocale.uk.find((entry) => entry.interactionId.endsWith(":i13"));
  assert.deepEqual(ukI13?.modePayload?.authoredDistractorTokens, ["not"]);
});
