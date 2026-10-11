import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-18";
const expected = {
  "i02:r1": "shy", "i04:r1": "loud", "i06:r1": "quiet", "i08:r1": "loud",
  "i10:r1": "clever", "i12:tile:d1": "He is clever", "i15:r1": "funny", "i17:tile:d1": "He is kind"
};
const source = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s18/practice.atomic.json"), "utf8"));

test("L01/S18 feedback explains each exact answer and unused tile", () => {
  for (const locale of ["ru", "uk"]) {
    const feedback = source().interactionsByLocale[locale].flatMap((interaction) => [
      ...(interaction.modePayload?.choiceFeedback ?? []), ...(interaction.modePayload?.slotFeedback ?? [])
    ]);
    for (const [suffix, answer] of Object.entries(expected)) {
      const entries = feedback.filter((item) => item.responseId === `${session}:${suffix}`);
      assert.equal(entries.length, 1, `${locale}:${suffix}: exactly one feedback record is required`);
      const [entry] = entries;
      assert.ok(entry, `${locale}:${suffix}: missing feedback`);
      assert.equal(Boolean(entry.correct), suffix.includes(":r1"), `${locale}:${suffix}: incorrect correctness`);
      for (const feedbackLocale of ["ru", "uk"]) {
        const text = entry.feedbackByLocale?.[feedbackLocale] ?? "";
        assert.match(text, new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${locale}:${suffix}:${feedbackLocale}: must name exact answer`);
        assert.doesNotMatch(text, /соответствует смыслу задания|відповідає змісту завдання|следуйте форме|дотримуйтеся форми/iu, `${locale}:${suffix}:${feedbackLocale}: generic feedback`);
      }
    }
  }
});

test("L01/S18 reviewed Markdown preserves the repaired situations", () => {
  const markdown = Object.fromEntries(["ru", "uk"].map((locale) => [locale,
    fs.readFileSync(path.join(root, `sessions/en/l01/s18/final.${locale}.md`), "utf8")
  ]));
  assert.match(markdown.ru, /He is ___ \. → \*\*quiet\*\* · loud · shy/u);
  assert.match(markdown.uk, /He is ___ \. → \*\*quiet\*\* · loud · shy/u);
  assert.match(markdown.ru, /\*\*8 · Прослушайте A и B\. Какое слово звучит в образце A\?\*\*/u);
  assert.match(markdown.uk, /\*\*8 · Прослухайте A і B\. Яке слово звучить у зразку A\?\*\*/u);
  assert.match(markdown.ru, /bossy — \*`bossy` — «командует всеми», а в подсказке сказано «смешная»\./u);
  assert.match(markdown.uk, /bossy — \*`bossy` — «командує всіма», а в підказці сказано «смішна»\./u);
});

test("L01/S18 has decidable prompts and evidence-bound distractors", () => {
  for (const locale of ["ru", "uk"]) {
    const byId = new Map(source().interactionsByLocale[locale].map((item) => [item.interactionId, item]));
    const i06 = byId.get(`${session}:i06`);
    assert.equal(i06.responseOptions.find((option) => option.responseId.endsWith(":r3"))?.text, "shy", `${locale}: i06 needs a clue-supported distractor`);
    const i08 = byId.get(`${session}:i08`);
    assert.match(i08.prompt, /образце A|зразку A/u, `${locale}: i08 must state which audio sample to identify`);
    assert.match(i08.modePayload.choiceFeedback.find((item) => item.responseId.endsWith(":r2"))?.feedbackByLocale?.[locale] ?? "", /образце B|зразку B/u, `${locale}: i08 feedback must compare both samples`);
    const i15 = byId.get(`${session}:i15`);
    for (const suffix of ["r2", "r3"]) {
      const feedback = i15.modePayload.choiceFeedback.find((item) => item.responseId.endsWith(`:${suffix}`))?.feedbackByLocale?.[locale] ?? "";
      assert.match(feedback, /смешн|смішн/u, `${locale}: i15:${suffix} must use the stated clue`);
      assert.doesNotMatch(feedback, /анекдот|весело|анекдот/u, `${locale}: i15:${suffix} must not invent behavior`);
    }
  }
});
