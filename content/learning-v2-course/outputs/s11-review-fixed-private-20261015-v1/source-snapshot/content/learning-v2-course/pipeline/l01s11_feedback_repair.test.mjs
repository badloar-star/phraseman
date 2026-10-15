import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "sessions/en/l01/s11");
const session = "en:lesson-01:session-11";
const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");
const data = () => JSON.parse(read("practice.atomic.json"));

test("L01/S11 gives concise localized feedback for every wrong selectable answer only", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    for (const entry of snapshot.interactionsByLocale[locale]) {
      const feedback = entry.modePayload.choiceFeedback ?? [];
      assert.equal(feedback.some((row) => row.correct), false, `${locale}:${entry.interactionId}: no correct-answer feedback`);
      const answer = snapshot.answers.find((row) => row.interactionId === entry.interactionId);
      const byId = new Map(feedback.map((row) => [row.responseId, row]));
      for (const option of entry.responseOptions ?? []) {
        if (option.responseId === answer?.correctResponseId) continue;
        const row = byId.get(option.responseId);
        assert.ok(row, `${locale}:${entry.interactionId}:${option.responseId}: wrong option has feedback`);
        const text = row.feedbackByLocale?.[locale]?.trim() ?? "";
        assert.ok(text.length > 0 && text.length <= 120, `${locale}:${entry.interactionId}:${option.responseId}: concise localized feedback`);
        assert.doesNotMatch(text, /^(верно|правильно|correct|that's right)/i, `${locale}:${entry.interactionId}:${option.responseId}: feedback addresses the error`);
      }
    }
  }
});

test("L01/S11 gives each unused tile concise correction in both learner locales", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    for (const entry of snapshot.interactionsByLocale[locale]) {
      const distractors = entry.modePayload.authoredDistractorTokens ?? [];
      if (!distractors.length) continue;
      const rows = entry.modePayload.slotFeedback ?? [];
      assert.equal(rows.length, distractors.length, `${locale}:${entry.interactionId}: one feedback row per unused tile`);
      for (const row of rows) {
        const text = row.feedbackByLocale?.[locale]?.trim() ?? "";
        assert.ok(text.length > 0 && text.length <= 120, `${locale}:${row.responseId}: concise localized tile correction`);
      }
    }
  }
});

test("L01/S11 source projections match atomic data and preserve interaction IDs, order, and targets", async () => {
  const { parsePractice, atomicMarkdownParityIssues } = await import("./build_release.mjs");
  const snapshot = data();
  const tasksByLocale = Object.fromEntries(["ru", "uk"].map((locale) => [locale, parsePractice(read(`final.${locale}.md`))]));
  assert.deepEqual(atomicMarkdownParityIssues({ sessionIdentity: "en/l01/s11", sessionId: session, atomicSource: snapshot, tasksByLocale }), []);
  const ids = Array.from({ length: 18 }, (_, index) => `${session}:i${String(index + 1).padStart(2, "0")}`);
  assert.deepEqual(snapshot.interactionsByLocale.ru.map((entry) => entry.interactionId), ids);
  assert.deepEqual(snapshot.interactionsByLocale.uk.map((entry) => entry.interactionId), ids);
  for (const entry of snapshot.interactionsByLocale.ru) {
    const answer = snapshot.answers.find((row) => row.interactionId === entry.interactionId);
    if (entry.modePayload.targetPhrase) assert.equal(answer?.correctText, entry.modePayload.targetPhrase, `${entry.interactionId}: target preserved`);
  }
  assert.equal(read("locales_batch.md").slice(read("locales_batch.md").indexOf("\n") + 1).trimEnd(), read("final.uk.md").trimEnd());
});

test("L01/S11 avoids correct-answer explanations and unsupported sound claims", () => {
  for (const name of ["final.ru.md", "final.uk.md"]) {
    const source = read(name);
    const practice = source.split("## Практика")[1]?.split("## Для сборщика")[0] ?? "";
    assert.doesNotMatch(source, /^- ✅ .* — \*/m, `${name}: no explanation after correct answer`);
    assert.doesNotMatch(source, /произнош|слог|звучит как|«(?:крейзи|крейзі|ронг|лонг|ринг|кайнд)»|слышно «|чути «|первый звук|перший звук/i, `${name}: no unsupported phonetic claims`);
  }
});

test("L01/S11 intro answers explain each wrong choice specifically and keep correct answers unannotated", () => {
  for (const name of ["final.ru.md", "final.uk.md"]) {
    const source = read(name).split("## Практика")[0];
    const wrongRows = source.split(/\r?\n/).filter((line) => line.startsWith("- ❌ "));
    const correctRows = source.split(/\r?\n/).filter((line) => line.startsWith("- ✅ "));
    assert.equal(wrongRows.length, 6, `${name}: two wrong options on each of three intro pages`);
    assert.ok(wrongRows.every((line) => / — \*[^*]{1,120}\*\s*$/.test(line)), `${name}: each wrong option has concise feedback`);
    assert.equal(correctRows.length, 3, `${name}: one correct answer on each intro page`);
    assert.ok(correctRows.every((line) => !/ — \*/.test(line)), `${name}: correct answers have no explanation`);
  }
});

test("L01/S11 prompts and localized meanings give consistent, realistic learner context", () => {
  const snapshot = data();
  const expected = {
    ru: { i08: /Мира уверена, что ошиблась.*ответ.*верн/i, i11: /(?:время встречи.*проверила календарь|проверила календарь.*время встречи)/i, i14: /Мира уверена.*ответ.*верн/i, i15: /Лина осталась рядом с Мирой.*не одна/i, i16: /Мира принесла.*блокнот/i, i17: /Мира свободна/i },
    uk: { i08: /Міра певна, що помилилася.*відповідь.*правильн/i, i11: /(?:час зустрічі.*перевірила календар|перевірила календар.*час зустрічі)/i, i14: /Міра впевнена.*відповід.*правильн/i, i15: /Ліна залишилася поруч із Мірою.*не сама/i, i16: /Міра принесла.*блокнот/i, i17: /Міра вільна/i },
  };
  for (const locale of ["ru", "uk"]) {
    for (const [suffix, pattern] of Object.entries(expected[locale])) {
      const entry = snapshot.interactionsByLocale[locale].find((item) => item.interactionId.endsWith(`:${suffix}`));
      const scene = entry.modePayload.localizedScene?.[locale] ?? entry.modePayload.localizedMeaning?.[locale] ?? entry.prompt;
      assert.match(scene, pattern, `${locale}:${suffix}: context supports target`);
    }
  }
});

test("L01/S11 explains that no differs from not without claiming no is standalone only", () => {
  const expectations = {
    "final.ru.md": /`No` может быть ответом «нет» или стоять перед существительным, но не заменяет `not` в `You are not crazy`/is,
    "final.uk.md": /`No` може бути відповіддю «ні» або стояти перед іменником, але не замінює `not` у `You are not crazy`/is,
  };
  for (const [name, pattern] of Object.entries(expectations)) assert.match(read(name), pattern, name);
});
