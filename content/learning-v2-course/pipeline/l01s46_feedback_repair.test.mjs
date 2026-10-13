import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-46";
const choices = { i02: "fun", i04: "boring", i06: "boring", i09: "weird", i11: "I'm", i14: "quiet", i16: "new" };
const tiles = { i05: { d1: "is" }, i10: { d1: "are", d2: "He's" }, i12: { d1: "They're", d2: "weird" }, i15: { d1: "not" } };
test("L01/S46 explains every checked answer and actual distractor", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s46/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, word] of Object.entries(choices)) { const feedback = byId.get(id).modePayload.choiceFeedback?.find((item) => item.responseId === `${session}:${id}:r1`); assert.equal(feedback?.correct, true, `${locale}:${id}:correct`); assert.ok((feedback?.feedbackByLocale?.[locale] ?? "").includes(word), `${locale}:${id}:explanation`); } for (const [id, slots] of Object.entries(tiles)) for (const [slot, word] of Object.entries(slots)) { const all = byId.get(id).modePayload.slotFeedback ?? []; assert.equal(all.some((item) => /:r[12]$/.test(item.responseId)), false, `${locale}:${id}:orphan`); const feedback = all.find((item) => item.responseId === `${session}:${id}:tile:${slot}`); assert.equal(feedback?.correct, false, `${locale}:${id}:${slot}:wrong tile`); assert.ok((feedback?.feedbackByLocale?.[locale] ?? "").includes(word), `${locale}:${id}:${slot}:explanation`); } }
});

test("L01/S46 first-visit cafe check says that the cafe is new to the learner", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s46/practice.atomic.json"), "utf8"));
  const expectedPrompt = {
    ru: "Друг спрашивает о кафе, где вы впервые. Скажите: «Для меня это новое место».",
    uk: "Друг питає про кав'ярню, де ви вперше. Скажіть: «Для мене це нове місце».",
  };
  const expectedFeedback = {
    ru: "`It's new to me.` — кафе новое именно для вас: вы здесь впервые.",
    uk: "`It's new to me.` — кав'ярня нова саме для вас: ви тут уперше.",
  };

  for (const locale of ["ru", "uk"]) {
    const item = data.interactionsByLocale[locale].find((candidate) => candidate.interactionId === `${session}:i16`);
    assert.ok(item, `${locale}:i16 exists`);
    assert.equal(item.prompt, expectedPrompt[locale], `${locale}:prompt`);
    assert.equal(item.accessibilityLabel, expectedPrompt[locale], `${locale}:accessibility`);
    assert.equal(item.modePayload.localizedScene[locale], expectedPrompt[locale], `${locale}:scene`);
    assert.equal(item.modePayload.gappedTargetPhrase, "It's ___ to me.", `${locale}:target frame`);
    assert.deepEqual(item.responseOptions.map((option) => option.text), ["new", "tired", "weird"], `${locale}:options`);
    assert.deepEqual(item.modePayload.gapOptions, item.responseOptions, `${locale}:atomic option parity`);
    const correct = item.modePayload.choiceFeedback.find((feedback) => feedback.responseId === `${session}:i16:r1`);
    assert.equal(correct?.correct, true, `${locale}:correct flag`);
    assert.equal(correct?.feedbackByLocale?.[locale], expectedFeedback[locale], `${locale}:correct explanation`);
    assert.equal("It's new to me.".replace("new", item.responseOptions[0].text), "It's new to me.", `${locale}:exact target`);
  }

  const answer = data.answers.find((candidate) => candidate.interactionId === `${session}:i16`);
  assert.deepEqual(answer, {
    interactionId: `${session}:i16`,
    correctText: "new",
    correctResponseId: `${session}:i16:r1`,
  });
});
