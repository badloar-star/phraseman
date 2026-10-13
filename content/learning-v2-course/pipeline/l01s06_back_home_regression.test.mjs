import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseIntro } from "./build_release.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
test("L01/S06 keeps 'I am back home.' grammatical rather than an incorrect choice", () => {
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(root, `sessions/en/l01/s06/final.${locale}.md`), "utf8");
    assert.doesNotMatch(source, /❌\s*I am back home\./u, `${locale}: grammatical phrase must not be marked incorrect`);
    assert.match(source, /I am back to home\./, `${locale}: to-before-home contrast`);
  }
});

test("L01/S06 intro 2 has one exact correct response and the specified contrasts", () => {
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(root, `sessions/en/l01/s06/final.${locale}.md`), "utf8");
    const options = parseIntro(source)[1].options;
    assert.deepEqual(options.map((option) => option.text), ["I am back.", "I am back to home.", "I back."], `${locale}: source choices`);
    assert.deepEqual(options.filter((option) => option.correct).map((option) => option.text), ["I am back."], `${locale}: one correct response`);
    assert.ok(options[1].feedback.trim(), `${locale}: r2 feedback`);
    assert.ok(options[2].feedback.trim(), `${locale}: r3 feedback`);
    assert.notEqual(options[1].feedback, options[2].feedback, `${locale}: distinct distractor feedback`);
  }
});

test("L01/S06 reviewed output preserves exact choices and feedback for every answer", () => {
  const intro = JSON.parse(fs.readFileSync(path.join(root, "mockup/reviewed-source/en/l01/s06/intro.json"), "utf8"));
  const page = intro.pages[1];
  for (const locale of ["ru", "uk"]) {
    assert.deepEqual(page.question.choicesByLocale[locale].map((option) => option.text), ["I am back.", "I am back to home.", "I back."], `${locale}: output choices`);
    assert.equal(page.question.choicesByLocale[locale][0].responseId, "en:lesson-01:session-06:intro2:r1", `${locale}: r1 is the expected response`);
  }
  const auxiliary = JSON.parse(fs.readFileSync(path.join(root, "mockup/reviewed-source/en/l01/s06/auxiliary.json"), "utf8"));
  const feedback = auxiliary.entries[1].responseFeedbackById;
  assert.deepEqual(Object.keys(feedback), [
    "en:lesson-01:session-06:intro2:r1",
    "en:lesson-01:session-06:intro2:r2",
    "en:lesson-01:session-06:intro2:r3",
  ]);
  for (const locale of ["ru", "uk"]) {
    assert.ok(feedback["en:lesson-01:session-06:intro2:r1"][locale].trim(), `${locale}: r1 output feedback`);
    assert.ok(feedback["en:lesson-01:session-06:intro2:r2"][locale].trim(), `${locale}: r2 output feedback`);
    assert.ok(feedback["en:lesson-01:session-06:intro2:r3"][locale].trim(), `${locale}: r3 output feedback`);
    assert.notEqual(feedback["en:lesson-01:session-06:intro2:r2"][locale], feedback["en:lesson-01:session-06:intro2:r3"][locale], `${locale}: output feedback differs`);
  }
});

test("L01/S06 canonical release mirrors reviewed intro 2 and its exact feedback artifact", () => {
  const reviewedIntro = JSON.parse(fs.readFileSync(path.join(root, "mockup/reviewed-source/en/l01/s06/intro.json"), "utf8"));
  const releaseIntro = JSON.parse(fs.readFileSync(path.join(root, "release/en/l01/s06/intro.json"), "utf8"));
  assert.deepEqual(releaseIntro.pages[1], reviewedIntro.pages[1], "release intro 2 must equal the reviewed source");

  for (const locale of ["ru", "uk"]) {
    const choices = releaseIntro.pages[1].question.choicesByLocale[locale];
    assert.deepEqual(choices.map((choice) => choice.text), ["I am back.", "I am back to home.", "I back."], `${locale}: exact release choices`);
    assert.equal(new Set(choices.map((choice) => choice.text)).size, choices.length, `${locale}: distractors stay distinct from the answer and each other`);
  }

  const reviewedAuxiliary = JSON.parse(fs.readFileSync(path.join(root, "mockup/reviewed-source/en/l01/s06/auxiliary.json"), "utf8"));
  const releaseAuxiliary = JSON.parse(fs.readFileSync(path.join(root, "release/en/l01/s06/auxiliary.json"), "utf8"));
  assert.deepEqual(releaseAuxiliary, reviewedAuxiliary, "release feedback artifact must equal the reviewed source");
  const releaseFeedback = releaseAuxiliary.entries[1].responseFeedbackById;
  assert.ok(releaseFeedback["en:lesson-01:session-06:intro2:r1"]?.ru.trim());
  assert.ok(releaseFeedback["en:lesson-01:session-06:intro2:r1"]?.uk.trim());
  assert.deepEqual(releaseFeedback["en:lesson-01:session-06:intro2:r2"], {
    ru: "Перед `home` не ставят `to`: `home` здесь уже значит «домой».",
    uk: "Перед `home` не ставлять `to`: `home` тут уже означає «додому».",
  });
  assert.deepEqual(releaseFeedback["en:lesson-01:session-06:intro2:r3"], {
    ru: "После `I` нужно `am`: говорят `I am back`.",
    uk: "Після `I` потрібне `am`: кажуть `I am back`.",
  });
});

test("L01/S06 canonical release mirrors every reviewed artifact with canonical IDs", () => {
  const reviewedDir = path.join(root, "mockup/reviewed-source/en/l01/s06");
  const releaseDir = path.join(root, "release/en/l01/s06");
  const artifactNames = ["intro.json", "learner.json", "learner.uk.json", "answers.json", "auxiliary.json"];

  const artifacts = Object.fromEntries(artifactNames.map((name) => {
    const reviewedPath = path.join(reviewedDir, name);
    const releasePath = path.join(releaseDir, name);
    assert.ok(fs.existsSync(releasePath), `release artifact missing: ${name}`);
    const reviewed = JSON.parse(fs.readFileSync(reviewedPath, "utf8"));
    const release = JSON.parse(fs.readFileSync(releasePath, "utf8"));
    assert.deepEqual(release, reviewed, `${name}: release must be semantically identical to reviewed source`);
    return [name, release];
  }));

  const sessionId = "en:lesson-01:session-06";
  const expectedInteractionIds = Array.from({ length: 19 }, (_, index) => `${sessionId}:i${String(index + 1).padStart(2, "0")}`);
  const intro = artifacts["intro.json"];
  assert.equal(intro.courseSessionId, sessionId);
  assert.deepEqual(intro.pages.map((page) => page.pageId), [1, 2, 3].map((ordinal) => `${sessionId}:intro${ordinal}`));
  assert.deepEqual(intro.pages.map((page) => page.question.interactionId), [1, 2, 3].map((ordinal) => `${sessionId}:intro${ordinal}:q`));

  for (const name of ["learner.json", "learner.uk.json"]) {
    const learner = artifacts[name];
    assert.equal(learner.courseSessionId, sessionId, `${name}: canonical session ID`);
    assert.equal(learner.practiceInteractionCount, 19, `${name}: declared interaction count`);
    assert.deepEqual(learner.interactions.map((interaction) => interaction.interactionId), expectedInteractionIds, `${name}: canonical interaction IDs`);
    assert.deepEqual(learner.interactions.map((interaction) => interaction.ordinal), Array.from({ length: 19 }, (_, index) => index + 4), `${name}: contiguous display ordinals`);
  }

  assert.deepEqual(artifacts["answers.json"].map((answer) => answer.interactionId), expectedInteractionIds, "answers: one canonical answer per interaction");
  assert.deepEqual(artifacts["auxiliary.json"].entries.map((entry) => entry.interactionId), [1, 2, 3].map((ordinal) => `${sessionId}:intro${ordinal}:q`));
});

test("L01/S06 Russian intro does not repeat an explanation paragraph", () => {
  const source = fs.readFileSync(path.join(root, "sessions/en/l01/s06/final.ru.md"), "utf8");
  assert.equal((source.match(/`back` сообщает, что вы вернулись/g) ?? []).length, 1);
  assert.equal((source.match(/Буква «о» тут только для/gu) ?? []).length, 1);
});

test("mockup renders reviewed feedback for the selected intro response, including correct", () => {
  const builder = fs.readFileSync(path.join(root, "pipeline/build_mockup.mjs"), "utf8");
  const renderIntro = builder.slice(builder.indexOf("function renderIntro"), builder.indexOf("function nextRow"));
  assert.match(renderIntro, /responseFeedbackById\?\.\[S\.picked\]/u);
  assert.doesNotMatch(renderIntro, /S\.ok\s*\?\s*"Верно\."/u, "correct feedback must not be replaced with hard-coded copy");
});
