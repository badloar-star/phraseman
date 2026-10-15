import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s09");
const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");
const data = () => JSON.parse(read("practice.atomic.json"));

test("L01/S09 shows only concise response-specific feedback after wrong choices", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    const entries = snapshot.interactionsByLocale[locale];
    for (const entry of entries) {
      const feedback = entry.modePayload.choiceFeedback ?? [];
      assert.equal(feedback.some((row) => row.correct), false, `${locale}:${entry.interactionId}: no correct-answer feedback`);
      const answer = snapshot.answers.find((row) => row.interactionId === entry.interactionId);
      const feedbackIds = new Set(feedback.map((row) => row.responseId));
      for (const option of entry.responseOptions ?? []) {
        if (option.responseId === answer?.correctResponseId) continue;
        assert.ok(feedbackIds.has(option.responseId), `${locale}:${entry.interactionId}:${option.responseId}: wrong response has feedback`);
      }
      for (const row of feedback) {
        assert.notEqual(row.responseId, answer?.correctResponseId,
          `${locale}:${entry.interactionId}: feedback is not attached to the correct response`);
        for (const copy of Object.values(row.feedbackByLocale ?? {})) assert.ok(copy.length <= 120, `${locale}:${entry.interactionId}: concise correction`);
      }
    }
  }
  for (const name of ["final.ru.md", "final.uk.md"]) {
    const practice = read(name).split("## Практика")[1]?.split("## Для сборщика")[0] ?? "";
    assert.doesNotMatch(practice, /^- ✅ .* — \*/m, `${name}: Markdown has no correct-answer explanation`);
  }
});

test("L01/S09 phrase-builder cues describe the intended message", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    const entries = snapshot.interactionsByLocale[locale];
    const i05 = entries.find((entry) => entry.interactionId.endsWith(":i05"));
    assert.match(i05.prompt, /добра|kind/i, `${locale}: i05 scene calls for kind`);
  }
});

test("L01/S09 keeps sorry and funny claims within their scenes", () => {
  for (const [name, required] of [["final.ru.md", "В этой ситуации `You are sorry` не подходит как ответ на благодарность."], ["final.uk.md", "У цій ситуації `You are sorry` не підходить як відповідь на подяку."]]) {
    const source = read(name);
    assert.ok(source.includes(required), `${name}: sorry is unsuitable in this context, not inherently a reproach`);
    const title = source.match(/### ([^\r\n]+)\r?\n\r?\n`funny`/)?.[1] ?? "";
    assert.match(title, /шутк|жарт/i, `${name}: intro 3 title is bounded to reacting to a joke`);
    assert.doesNotMatch(title, /флирт|залицян/i, `${name}: intro 3 title makes no broad flirtation claim`);
  }
});

test("L01/S09 i06 explicitly asks the learner to address Mira", async () => {
  const { parsePractice } = await import("./build_release.mjs");
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    const source = read(`final.${locale}.md`);
    const i06 = parsePractice(source).find((task) => task.interactionId.endsWith(":i06"));
    assert.match(i06?.title ?? "", /Скажите Мире|Скажіть Мірі/i, `${locale}: instruction addresses Mira`);
    assert.match(i06?.title ?? "", /ты устала|ти втомлена/i, `${locale}: requested second-person message`);
    const atomic = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i06"));
    assert.equal(atomic?.prompt, i06.title, `${locale}: atomic prompt matches the address-to-Mira cue`);
  }
});

test("L01/S09 active sources keep RU/UK Markdown, locale batch and atomic projections aligned", async () => {
  const { parsePractice, atomicMarkdownParityIssues } = await import("./build_release.mjs");
  const snapshot = data();
  const tasksByLocale = {};
  for (const locale of ["ru", "uk"]) tasksByLocale[locale] = parsePractice(read(`final.${locale}.md`));
  assert.deepEqual(atomicMarkdownParityIssues({
    sessionIdentity: "en/l01/s09",
    sessionId: "en:lesson-01:session-09",
    atomicSource: snapshot,
    tasksByLocale,
  }), []);
  const batch = read("locales_batch.md");
  assert.match(batch, /^===LOCALE: uk===\r?\n/);
  assert.equal(batch.slice(batch.indexOf("\n") + 1).trimEnd(), read("final.uk.md").trimEnd());
});
