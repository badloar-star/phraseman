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

test("L01/S10 reviewer repairs keep the UK heading, accessibility copy, and localized meaning aligned", () => {
  const uk = read("final.uk.md");
  const batch = read("locales_batch.md");
  const snapshot = data();
  const ukTask = snapshot.interactionsByLocale.uk.find((entry) => entry.interactionId.endsWith(":i15"));
  const ruTask = snapshot.interactionsByLocale.ru.find((entry) => entry.interactionId.endsWith(":i15"));
  const prompt = "Складіть фразу — Міра вдягла куртку, взяла сумку й каже, що готова йти; скажіть їй про це";
  const ruMeaning = "Соберите фразу — Мира надела куртку, взяла сумку и говорит, что готова идти; скажите ей об этом";
  assert.match(uk, /^## Практика \(20 завдань, підтримка зменшується\)$/m);
  assert.equal(batch.slice(batch.indexOf("\n") + 1).trimEnd(), uk.trimEnd());
  assert.equal(ukTask.prompt, prompt);
  assert.equal(ukTask.accessibilityLabel, prompt);
  assert.equal(ukTask.modePayload.localizedMeaning.uk, prompt);
  assert.equal(ukTask.modePayload.localizedMeaning.ru, ruMeaning);
  assert.equal(ruTask.modePayload.localizedMeaning.ru, ruMeaning);
});

test("L01/S10 uses gender-paired generic adjective glosses in learner copy and atomic data", () => {
  const expected = {
    ru: { quiet: "тихий/тихая", tired: "устал/устала", busy: "занят/занята", ready: "готов/готова" },
    uk: { quiet: "тихий/тиха", tired: "втомлений/втомлена", busy: "зайнятий/зайнята", ready: "готовий/готова" },
  };
  for (const locale of ["ru", "uk"]) {
    const source = read(`final.${locale}.md`);
    for (const [word, pair] of Object.entries(expected[locale])) {
      assert.ok(source.includes(`${word} — ${pair}`), `${locale}:${word}: generic gloss is gender-paired`);
    }
    const match = source.match(/new_words:\r?\n([\s\S]*?)\r?\n\r?\nmodes:/);
    assert.ok(match, `${locale}: new_words block exists`);
    assert.ok(match[1].includes(`quiet — ${expected[locale].quiet}`), `${locale}: atomic/source quiet gloss remains paired`);
  }
  const snapshot = data();
  const pairs = snapshot.interactionsByLocale.ru.find((entry) => entry.interactionId.endsWith(":i17")).modePayload.pairGrid;
  const quietPairs = snapshot.interactionsByLocale.ru.find((entry) => entry.interactionId.endsWith(":i11")).modePayload.pairGrid;
  const quietPair = quietPairs.find((item) => item.target === "quiet");
  for (const locale of ["ru", "uk"]) {
    assert.equal(quietPair?.meaningByLocale?.[locale], expected[locale].quiet, `${locale}:quiet: atomic match gloss is paired`);
    for (const [word, pair] of Object.entries(expected[locale]).filter(([word]) => word !== "quiet")) {
      const row = pairs.find((item) => item.target === word);
      assert.equal(row?.meaningByLocale?.[locale], pair, `${locale}:${word}: atomic glossary is paired`);
    }
  }
  assert.match(read("final.ru.md"), /\*\*Что вы освоите:\*\* как описать собеседника/);
  assert.match(read("final.uk.md"), /\*\*Що ви опануєте:\*\* як описати співрозмовника/);
  assert.equal(snapshot.interactionsByLocale.ru.find((entry) => entry.interactionId.endsWith(":i07")).modePayload.wordCard.definitionByLocale.ru.startsWith("«тихий/тихая,"), true);
  assert.equal(snapshot.interactionsByLocale.uk.find((entry) => entry.interactionId.endsWith(":i07")).modePayload.wordCard.definitionByLocale.uk.startsWith("«тихий/тиха,"), true);
});
