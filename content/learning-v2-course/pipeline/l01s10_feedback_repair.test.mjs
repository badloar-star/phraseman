import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-10";
const atomic = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s10/practice.atomic.json"), "utf8"));
const correctChoices = ["i02:r1", "i04:r1", "i06:r1", "i08:r1", "i09:r1", "i14:r1"];
const tiles = ["i05:tile:d1", "i10:tile:d1", "i13:tile:d1", "i15:tile:d1", "i19:tile:d1", "i19:tile:d2"];

test("L01/S10 explains every correct choice in both learner locales", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const feedback = data.interactionsByLocale[locale].flatMap((item) => item.modePayload?.choiceFeedback ?? []);
    for (const suffix of correctChoices) {
      assert.equal(feedback.some((item) => item.responseId === `${session}:${suffix}` && item.correct === true && item.feedbackByLocale?.ru?.trim() && item.feedbackByLocale?.uk?.trim()), true, `${locale}:${suffix}`);
    }
  }
});

test("L01/S10 explains each physical unused tile separately in both learner locales", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const feedback = data.interactionsByLocale[locale].flatMap((item) => item.modePayload?.slotFeedback ?? []);
    for (const suffix of tiles) {
      assert.equal(feedback.some((item) => item.responseId === `${session}:${suffix}` && item.feedbackByLocale?.ru?.trim() && item.feedbackByLocale?.uk?.trim()), true, `${locale}:${suffix}`);
    }
  }
});
