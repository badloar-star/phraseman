import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s10");
const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");
const data = () => JSON.parse(read("practice.atomic.json"));

test("L01/S10 keeps RU/UK sources and locale batch aligned", async () => {
  const { parsePractice, atomicMarkdownParityIssues } = await import("./build_release.mjs");
  const snapshot = data();
  const tasksByLocale = Object.fromEntries(["ru", "uk"].map((locale) => [locale, parsePractice(read(`final.${locale}.md`))]));
  assert.deepEqual(atomicMarkdownParityIssues({ sessionIdentity: "en/l01/s10", sessionId: "en:lesson-01:session-10", atomicSource: snapshot, tasksByLocale }), []);
  assert.match(read("locales_batch.md"), /^===LOCALE: uk===\r?\n/);
  assert.equal(read("locales_batch.md").slice(read("locales_batch.md").indexOf("\n") + 1).trimEnd(), read("final.uk.md").trimEnd());
});

test("L01/S10 wrong choices have concise option-specific feedback and correct answers have none", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    for (const entry of snapshot.interactionsByLocale[locale]) {
      const feedback = entry.modePayload.choiceFeedback ?? [];
      assert.equal(feedback.some((row) => row.correct), false, `${locale}:${entry.interactionId}: no correct-answer feedback`);
      const answer = snapshot.answers.find((row) => row.interactionId === entry.interactionId);
      const ids = new Set(feedback.map((row) => row.responseId));
      for (const option of entry.responseOptions ?? []) {
        if (option.responseId === answer?.correctResponseId) continue;
        assert.ok(ids.has(option.responseId), `${locale}:${entry.interactionId}:${option.responseId}: each wrong option has feedback`);
      }
      for (const row of feedback) {
        assert.notEqual(row.responseId, answer?.correctResponseId, `${locale}:${entry.interactionId}: feedback is not attached to the correct answer`);
        assert.ok((row.feedbackByLocale?.[locale] ?? "").length > 0, `${locale}:${entry.interactionId}:${row.responseId}: feedback exists in its locale`);
        assert.ok((row.feedbackByLocale?.[locale] ?? "").length <= 120, `${locale}:${entry.interactionId}:${row.responseId}: feedback is concise`);
      }
    }
  }
});

test("L01/S10 retains the authored interaction order and answer targets", () => {
  const snapshot = data();
  const entries = snapshot.interactionsByLocale.ru;
  assert.deepEqual(entries.map((entry) => entry.interactionId), Array.from({ length: 20 }, (_, i) => `en:lesson-01:session-10:i${String(i + 1).padStart(2, "0")}`));
  assert.deepEqual(snapshot.interactionsByLocale.uk.map((entry) => entry.interactionId), entries.map((entry) => entry.interactionId));
  for (const entry of entries) {
    const answer = snapshot.answers.find((row) => row.interactionId === entry.interactionId);
    if (entry.modePayload.targetPhrase) assert.equal(answer?.correctText, entry.modePayload.targetPhrase, `${entry.interactionId}: target phrase is preserved in its answer`);
  }
});

test("L01/S10 has no phonetic claims or learner-facing explanation after a correct answer", () => {
  for (const name of ["final.ru.md", "final.uk.md"]) {
    const source = read(name);
    const practice = source.split("## Практика")[1]?.split("## Для сборщика")[0] ?? "";
    assert.doesNotMatch(practice, /^- ✅ .* — \*/m, `${name}: no correct-answer explanation`);
    assert.doesNotMatch(source, /произнош|слог|звучит|звука|чути|слышно|рот открыт|hear|sound|pronunciation/i, `${name}: no unsupported phonetic/audio claim`);
  }
});

test("L01/S10 intro scenes support the requested adjective and correct the specific error", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    const entries = snapshot.interactionsByLocale[locale];
    assert.match(entries[4].prompt, /раньше|рано|до начала встречи|до початку зустрічі/i, `${locale}: early prompt gives evidence of arriving early`);
    assert.match(entries[5].prompt, /швидко|швидк|за хвилину|за минуту/i, `${locale}: fast prompt gives evidence of speed`);
    assert.match(entries[12].prompt, /мовч|молчит|тих/i, `${locale}: quiet prompt gives evidence of silence`);
    const i14 = entries.find((entry) => entry.interactionId.endsWith(":i14"));
    const scene = i14.modePayload.localizedScene?.[locale] ?? i14.prompt;
    assert.match(scene, /извиняется|просит прощ|вибача|пробач/i, `${locale}: sorry scene names an apology`);
  }
});
