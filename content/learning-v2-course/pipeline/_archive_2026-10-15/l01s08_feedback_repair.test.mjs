import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s08");
const data = () => JSON.parse(fs.readFileSync(path.join(dir, "practice.atomic.json"), "utf8"));
const choices = ["i01", "i02", "i04", "i07", "i09", "i10", "i12"];
const tiles = { i03: ["not"], i11: ["done"], i13: ["free"], i16: ["is"] };

test("L01/S08 gives no feedback after correct choices and keeps every wrong-choice correction", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    assert.equal(snapshot.interactionsByLocale[locale].some((entry) => (entry.modePayload.choiceFeedback ?? []).some((row) => row.correct)), false, locale + ": no correct-answer feedback");
  }
  for (const locale of ["ru", "uk"]) for (const suffix of choices) {
    const id = `en:lesson-01:session-08:${suffix}`;
    const interaction = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const answer = snapshot.answers.find((entry) => entry.interactionId === id);
    const feedback = interaction?.modePayload?.choiceFeedback ?? [];
    assert.equal(feedback.some((entry) => entry.responseId === answer?.correctResponseId), false, `${locale}:${suffix}:correct`);
    const options = interaction.modePayload.gapOptions ?? interaction.modePayload.localizedMeaningChoices ?? [];
    for (const option of options) {
      const wrongFeedback = feedback.find((entry) => entry.responseId === option.responseId);
      if (option.responseId === answer?.correctResponseId) continue;
      assert.equal(wrongFeedback?.correct, false, `${locale}:${suffix}:${option.responseId}`);
      assert.ok(wrongFeedback?.feedbackByLocale?.ru && wrongFeedback?.feedbackByLocale?.uk, `${locale}:${suffix}:${option.responseId}:copy`);
      for (const copy of Object.values(wrongFeedback.feedbackByLocale)) assert.ok(copy.length <= 160, `${locale}:${suffix}:${option.responseId}:concise`);
    }
  }
});

test("L01/S08 supplies feedback for every physical extra tile", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) for (const [suffix, expectedTokens] of Object.entries(tiles)) {
    const id = `en:lesson-01:session-08:${suffix}`;
    const interaction = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const feedback = interaction?.modePayload?.slotFeedback ?? [];
    assert.deepEqual(interaction?.modePayload?.authoredDistractorTokens, expectedTokens, `${locale}:${suffix}:tokens`);
    assert.equal(feedback.length, expectedTokens.length, `${locale}:${suffix}`);
    feedback.forEach((entry, index) => {
      assert.equal(entry.responseId, `${id}:tile:d${index + 1}`);
      assert.equal(entry.correct, false, `${locale}:${suffix}:d${index + 1}:correctness`);
      assert.ok(entry.feedbackByLocale?.ru && entry.feedbackByLocale?.uk, `${locale}:${suffix}:d${index + 1}:copy`);
    });
  }
});

test("L01/S08 uses gender-neutral learner glosses in both locales", async () => {
  const snapshot = data();
  const sources = await Promise.all(["final.ru.md", "final.uk.md", "locales_batch.md"].map((name) => fs.promises.readFile(path.join(dir, name), "utf8")));
  const atomicText = JSON.stringify(snapshot.interactionsByLocale);
  const corpus = [...sources, atomicText].join("\n").toLocaleLowerCase();
  for (const genderedForm of ["я не заблудился", "я не голоден", "я не уверен", "я не свободен", "я уже не новичок", "я готов", "я заблукав", "я не голодний", "я не вільний", "я не впевнений", "я вже не новачок", "я готовий"]) {
    assert.equal(corpus.includes(genderedForm), false, `gendered learner wording: ${genderedForm}`);
  }
});

test("L01/S08's Ukrainian no/not explanation describes the tested contrast", async () => {
  const text = await fs.promises.readFile(path.join(dir, "final.uk.md"), "utf8");
  assert.match(text, /no[^\n]*перед іменником/i);
  assert.match(text, /перед прикметником після `am` потрібно `not`/i);
  assert.doesNotMatch(text, /ціла відмова|ви відмовили/i);
});

test("L01/S08 scopes grammar rules to the tested full sentence pattern", async () => {
  const sources = await Promise.all(["final.ru.md", "final.uk.md"].map((name) => fs.promises.readFile(path.join(dir, name), "utf8")));
  for (const source of sources) {
    assert.doesNotMatch(source, /в любой фразе|у будь-якій фразі|всегда называют, кто именно|завжди називають, хто саме/i);
  }
});

test("L01/S08 canonical learner prompts match the RU/UK Markdown projection", async () => {
  const { parsePractice, atomicMarkdownParityIssues } = await import("./build_release.mjs");
  const snapshot = data();
  const tasksByLocale = {};
  for (const locale of ["ru", "uk"]) {
    const source = await fs.promises.readFile(path.join(dir, "final." + locale + ".md"), "utf8");
    tasksByLocale[locale] = parsePractice(source);
  }
  const gateArgs = { sessionIdentity: "en/l01/s08", sessionId: "en:lesson-01:session-08", atomicSource: snapshot, tasksByLocale };
  assert.deepEqual(atomicMarkdownParityIssues(gateArgs), [], "canonical builder parity for every RU/UK task");
  const badPrompt = structuredClone(snapshot);
  badPrompt.interactionsByLocale.ru[1].prompt = tasksByLocale.ru[1].title;
  assert.match(atomicMarkdownParityIssues({ ...gateArgs, atomicSource: badPrompt }).join("\n"), /atomic_markdown_parity:en\/l01\/s08:ru:index=1/,
    "regression rejects the answer-bearing title tail that canonical projection strips");
  for (const locale of ["ru", "uk"]) {
    const source = await fs.promises.readFile(path.join(dir, "final." + locale + ".md"), "utf8");
    const lines = source.split(/\r?\n/);
    const practiceStart = lines.findIndex((line) => line.startsWith("## Практика"));
    for (let index = practiceStart + 1; index < lines.length; index += 1) {
      const title = lines[index].match(/^\*\*\d+ · (.+)\*\*$/)?.[1];
      if (!title) continue;
      const interactionId = lines[index + 1]?.match(/interaction_id: ([^;]+)/)?.[1];
      if (!interactionId) continue;
      const interaction = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId);
      const task = tasksByLocale[locale].find((entry) => entry.interactionId === interactionId);
      assert.equal(interaction?.accessibilityLabel, interaction?.prompt, locale + ": " + interactionId + " accessibility label");
      if (!/—\s*(?:tired|free)\s*$/i.test(title)) assert.equal(interaction?.prompt, title, locale + ": " + interactionId + " unprojected prompt");
      assert.ok(task, locale + ": " + interactionId + " source task exists");
    }
  }
});

test("L01/S08 feedback locale maps are reconstructed from both Markdown sources", async () => {
  const { feedbackLocaleParityIssues } = await import("./single_phrase_release.mjs");
  const snapshot = data();
  const issues = feedbackLocaleParityIssues(snapshot.interactionsByLocale, { answers: snapshot.answers });
  assert.deepEqual(issues, [], "choice and physical-tile maps agree across RU and UK projections");
  const drifted = structuredClone(snapshot.interactionsByLocale);
  drifted.uk.find((entry) => entry.interactionId.endsWith(":i01")).modePayload.choiceFeedback
    .find((entry) => entry.responseId.endsWith(":r3")).feedbackByLocale.uk = "stale copy";
  assert.ok(feedbackLocaleParityIssues(drifted, { answers: snapshot.answers }).some((issue) =>
    issue.interactionId.endsWith(":i01") && issue.responseId.endsWith(":r3") && issue.reason === "choice_feedback_locale_map_mismatch"),
  "regression detects RU/UK projection drift in a shared choice-feedback map");
});

test("L01/S08 every learner-facing atomic task matches its final Markdown projection", async () => {
  const { parsePractice, firstMarkdownAtomicLearnerMismatch } = await import("./build_release.mjs");
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    const source = await fs.promises.readFile(path.join(dir, "final." + locale + ".md"), "utf8");
    const tasks = parsePractice(source);
    assert.equal(tasks.length, 21, locale + ": task count");
    for (const [index, task] of tasks.entries()) {
      const interaction = snapshot.interactionsByLocale[locale][index];
      const answer = snapshot.answers.find((entry) => entry.interactionId === interaction.interactionId);
      assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, locale, answer), null,
        locale + ":" + interaction.interactionId + ": projection");
    }
  }
});

test("L01/S08 locale batch is the current Ukrainian learner source", async () => {
  const [batch, finalUk] = await Promise.all([
    fs.promises.readFile(path.join(dir, "locales_batch.md"), "utf8"),
    fs.promises.readFile(path.join(dir, "final.uk.md"), "utf8"),
  ]);
  assert.match(batch, /^===LOCALE: uk===\r?\n/);
  assert.equal(batch.slice(batch.indexOf("\n") + 1).trimEnd(), finalUk.trimEnd());
});

test("L01/S08's stated practice count matches its 21 numbered tasks", async () => {
  const ru = await fs.promises.readFile(path.join(dir, "final.ru.md"), "utf8");
  const uk = await fs.promises.readFile(path.join(dir, "final.uk.md"), "utf8");
  assert.match(ru, /Практика \(21 задан/i);
  assert.match(uk, /Практика \(21 завдан/i);
  assert.equal((ru.match(/^\*\*\d+ ·/gm) ?? []).length, 21);
  assert.equal((uk.match(/^\*\*\d+ ·/gm) ?? []).length, 21);
});

test("L01/S08 Markdown does not attach explanations to correct selectable answers", async () => {
  const sources = await Promise.all(["final.ru.md", "final.uk.md"].map((name) => fs.promises.readFile(path.join(dir, name), "utf8")));
  for (const source of sources) {
    assert.doesNotMatch(source, /^- (?:lost|tired|am|free|hungry|new) — \*(?:Верно|Правильно):/m);
  }
});
