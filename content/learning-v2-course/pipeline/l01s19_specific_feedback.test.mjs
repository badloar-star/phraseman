import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parsePractice } from "./build_release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-19";
const expected = {
  "i02:r1": "angry", "i04:r1": "rude", "i07:r1": "slow", "i08:r1": "slow",
  "i10:r1": "mean", "i13:r1": "serious", "i15:r1": "is", "i17:tile:d1": "are",
  "i18:r1": "quiet", "i19:tile:d1": "not"
};
const source = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s19/practice.atomic.json"), "utf8"));

test("L01/S19 gives one source-grounded explanation for every required answer or tile", () => {
  for (const locale of ["ru", "uk"]) {
    const feedback = source().interactionsByLocale[locale].flatMap((interaction) => [
      ...(interaction.modePayload.choiceFeedback ?? []), ...(interaction.modePayload.slotFeedback ?? [])
    ]);
    for (const [suffix, answer] of Object.entries(expected)) {
      const rows = feedback.filter((row) => row.responseId === `${session}:${suffix}`);
      assert.equal(rows.length, 1, `${locale}:${suffix}: exactly one feedback row`);
      assert.match(rows[0].feedbackByLocale?.[locale] ?? "", new RegExp(answer), `${locale}:${suffix}: names the exact answer or tile`);
    }
  }
});

test("L01/S19 keeps its listening cues and grammar explanations factually precise", () => {
  const data = source();
  for (const locale of ["ru", "uk"]) {
    const interactions = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.split(":").at(-1), item]));
    const feedback = (id, responseId) => interactions.get(id).modePayload.choiceFeedback
      .find((row) => row.responseId === `${session}:${id}:${responseId}`).feedbackByLocale[locale];
    const prompt = (id) => interactions.get(id).prompt;
    assert.match(prompt("i07"), /образце A|зразку A/i, `${locale}: i07 identifies the tested sample before asking for an answer`);
    assert.match(feedback("i07", "r2"), /образец B|зразок B/i, `${locale}: i07 explains the contrast against sample B`);
    assert.doesNotMatch(feedback("i02", "r3"), /длинн(ое|ий).*(ё|йо)|довг(е|ий).*(ё|йо)/i, `${locale}: i02 does not invent a false onset for early`);
    assert.doesNotMatch(feedback("i15", "r3"), /собеседник|співрозмовник/i, `${locale}: i15 does not overgeneralize are as a listener-only form`);
    assert.doesNotMatch(feedback("i18", "r3"), /не грубость|не є грубістю/i, `${locale}: i18 does not make a categorical claim from silence alone`);
    assert.match(feedback("i18", "r3"), /молчит|мовчить/i, `${locale}: i18 uses the stated clue`);
  }
  const ukI10 = new Map(data.interactionsByLocale.uk.map((item) => [item.interactionId.split(":").at(-1), item])).get("i10");
  assert.doesNotMatch(ukI10.prompt, /шкідлив/i, "uk: i10 uses the interpersonal meaning of mean");
  assert.match(ukI10.prompt, /недобр/i, "uk: i10 calls mean an unkind action");
  assert.doesNotMatch(JSON.stringify(data), /длинное «ё»|довге «йо»|шкідлив|про собеседника|про співрозмовника|Молчать — не грубость|Мовчати — не грубість/i, "all duplicated learner-facing records use the corrected meaning and sound explanations");
});

test("L01/S19 preserves both named audio choices and synchronized locale feedback in its source", () => {
  for (const locale of ["ru", "uk"]) {
    const markdown = fs.readFileSync(path.join(root, `sessions/en/l01/s19/final.${locale}.md`), "utf8");
    const i07 = parsePractice(markdown).find((task) => task.interactionId.endsWith(":i07"));
    assert.deepEqual(i07.options.map((option) => option.text), ["slow", "low"], `${locale}: i07 keeps both named sound choices`);
  }
  const data = source();
  for (const id of ["i02", "i07", "i10", "i15", "i18"]) {
    const ru = data.interactionsByLocale.ru.find((item) => item.interactionId.endsWith(`:${id}`));
    const uk = data.interactionsByLocale.uk.find((item) => item.interactionId.endsWith(`:${id}`));
    assert.deepEqual(
      ru.modePayload.choiceFeedback.map((row) => ({ responseId: row.responseId, feedbackByLocale: row.feedbackByLocale })),
      uk.modePayload.choiceFeedback.map((row) => ({ responseId: row.responseId, feedbackByLocale: row.feedbackByLocale })),
      `${id}: duplicate locale structures agree on all translations`
    );
  }
});
