import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { atomicMarkdownParityIssues, firstMarkdownAtomicLearnerMismatch, parseHeader, parsePractice } from "./build_release.mjs";
import { inspectPreJudgeChoreography } from "./prejudge_choreography.mjs";
import { feedbackLocaleParityIssues, familyChoreographyIssues } from "./single_phrase_release.mjs";

const COURSE_ROOT = fileURLToPath(new URL("../", import.meta.url));

function s10Fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-header-audit-"));
  const source = path.join(COURSE_ROOT, "sessions/en/l04/s10");
  for (const name of ["final.ru.md", "final.uk.md", "practice.atomic.json"]) {
    fs.copyFileSync(path.join(source, name), path.join(dir, name));
  }
  return dir;
}

function sourceInteraction(session, interactionId) {
  const source = JSON.parse(fs.readFileSync(
    path.join(COURSE_ROOT, `sessions/en/l04/${session}/practice.atomic.json`),
    "utf8",
  ));
  return source.interactionsByLocale.ru.find((interaction) => interaction.interactionId === interactionId);
}

function sessionSource(session, locale) {
  return fs.readFileSync(path.join(COURSE_ROOT, `sessions/en/l04/${session}/final.${locale}.md`), "utf8");
}

function introBodies(markdown) {
  return markdown.split(/^## [ИІ]нтро \d+[^\n]*$/mu).slice(1).map((page) => page
    .split("\n**")[0]
    .split("\n")
    .filter((line) => !line.trim().startsWith("###"))
    .join("\n")
    .trim());
}

test("L04 source repairs keep audio contrasts, context evidence, and the final check distinct", () => {
  const s10Audio = sourceInteraction("s10", "en:lesson-04:session-10:i01");
  const hospitalFeedback = s10Audio.modePayload.choiceFeedback.find((entry) => entry.responseId.endsWith(":r2"));
  assert.match(hospitalFeedback.feedbackByLocale.ru, /\/əʊ\/|\/ɒ\//u);

  const s10Final = sourceInteraction("s10", "en:lesson-04:session-10:i11");
  assert.match(s10Final.modePayload.localizedScene.ru, /пекарня.*площадк/u);

  const s11Audio = sourceInteraction("s11", "en:lesson-04:session-11:i01");
  assert.deepEqual(s11Audio.responseOptions.map((option) => option.text), ["tram", "train", "tramp"]);

  const s12PositiveSupport = sourceInteraction("s12", "en:lesson-04:session-12:i06");
  const s12Practice = sourceInteraction("s12", "en:lesson-04:session-12:i10");
  const s12Final = sourceInteraction("s12", "en:lesson-04:session-12:i12");
  assert.equal(s12PositiveSupport.responseOptions[0].text, "Yes, there are.");
  assert.equal(s12Practice.purpose, "guided_practice");
  assert.equal(s12Practice.responseOptions[0].text, "Are there three platforms?");
  assert.match(s12Practice.modePayload.localizedScene.ru, /платформы 1 и 2.*третья/u);
  assert.equal(s12Final.purpose, "independent_check");
  assert.match(s12Final.prompt, /вокзал.*две платформ/u);
  assert.doesNotMatch(s12Final.prompt, /отел/u);
});

test("L04 audit repairs keep word-listening traps close and final operations complete", () => {
  const s02 = sourceInteraction("s02", "en:lesson-04:session-02:i01");
  assert.equal(s02.responseOptions[2].text, "garment");
  const s03 = sourceInteraction("s03", "en:lesson-04:session-03:i17");
  assert.equal(s03.responseOptions[0].text, "There are banks");
  assert.equal(s03.modePayload.gappedTargetPhrase, "___ near the house.");
  const s12 = sourceInteraction("s12", "en:lesson-04:session-12:i01");
  assert.equal(s12.responseOptions[2].text, "platter");
  const platterFeedback = s12.modePayload.choiceFeedback.find((entry) => entry.responseId.endsWith(":r3"));
  assert.match(platterFeedback.feedbackByLocale.ru, /\/plæt\/[\s\S]*\/f\/[\s\S]*\/m\//u);
  assert.doesNotMatch(platterFeedback.feedbackByLocale.ru, /\/plæn\/|\/tə\/|\/ər\/|\/fɔːm\//u);
});

test("L04 S05 keeps intro copy plain, bounded, and derived from the language", () => {
  const ru = sessionSource("s05", "ru");
  const uk = sessionSource("s05", "uk");
  for (const [locale, source] of [["ru", ru], ["uk", uk]]) {
    const bodies = introBodies(source);
    assert.equal(bodies.length, 3, locale);
    assert.ok(bodies[1].trim().length > 0 && bodies[1].length <= 320, `${locale} intro 2 length=${bodies[1].length}`);
  }
  assert.doesNotMatch(ru, /исчисляем/u);
  assert.doesNotMatch(uk, /злічуван/u);
  assert.doesNotMatch(ru, /листовка сама за вас считать/u);
  assert.doesNotMatch(uk, /листівка сама за вас рахувати/u);
  assert.doesNotMatch(`${ru}\n${uk}`, /сразу после `there`|одразу після `there`/iu);
  assert.match(ru, /название места после `is\/are`/u);
  assert.match(uk, /назву місця після `is\/are`/u);
});

test("L04 S12 keeps pronunciation and the independent check inside the station scene", () => {
  const ru = sessionSource("s12", "ru");
  const uk = sessionSource("s12", "uk");
  for (const [locale, source] of [["ru", ru], ["uk", uk]]) {
    const bodies = introBodies(source);
    assert.ok(bodies[1].trim().length > 0 && bodies[1].length <= 320, `${locale} intro 2 length=${bodies[1].length}`);
  }
  assert.doesNotMatch(ru, /сокращени/u);
  assert.doesNotMatch(uk, /скороченн/u);
  assert.doesNotMatch(`${ru}\n${uk}`, /Табло (?:и|й) так .*ждать/iu);
  assert.doesNotMatch(`${ru}\n${uk}`, /planter|\/plæn\/|\/tə\//u);
  assert.match(ru, /platter[^\n]*\/plæt\//iu);
  assert.match(uk, /platter[^\n]*\/plæt\//iu);
  const atomic = JSON.parse(fs.readFileSync(path.join(COURSE_ROOT, "sessions/en/l04/s12/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) {
    const i06 = atomic.interactionsByLocale[locale][5];
    const i11 = atomic.interactionsByLocale[locale][10];
    const independent = atomic.interactionsByLocale[locale].filter((interaction) => interaction.purpose === "independent_check");
    assert.equal(i06.purpose, "guided_practice", locale);
    assert.deepEqual(i06.responseOptions.map((option) => option.text), [
      "Yes, there are.",
      "Yes, are there.",
      "Yes, there are there.",
    ], locale);
    assert.match(i06.prompt, /Are there platforms near the building\?/u, locale);
    assert.match(i06.modePayload.localizedScene[locale], /вокзал/iu, locale);
    assert.doesNotMatch(i06.modePayload.localizedScene[locale], /отел|готел/iu, locale);
    assert.equal(i11.modePayload.targetPhrase, "No, there are not.", locale);
    assert.deepEqual(i11.modePayload.orderedTokens, ["No,", "there", "are", "not"], locale);
    assert.deepEqual(i11.modePayload.authoredDistractorTokens, ["is"], locale);
    assert.equal(independent.length, 1, locale);
    assert.doesNotMatch(independent[0].prompt, /отел|готел/iu);
    assert.match(independent[0].prompt, /вокзал/iu);
    assert.match(independent[0].prompt, /Are there two platforms\?/u);
  }
  assert.equal(atomic.answers.find((answer) => answer.interactionId.endsWith(":i11")).correctText, "No, there are not.");
});

test("L04 S06-S08 keep Ukrainian am feedback plain and specific", () => {
  const expectedBySession = {
    s06: "`Am` уживають лише з `I`; тут потрібна форма `is`.",
    s07: "`Am` уживають лише з `I`; тут потрібна форма `is`.",
    s08: "`Am` уживають лише з `I`; тут ідеться про банк.",
  };
  for (const [session, expected] of Object.entries(expectedBySession)) {
    const uk = sessionSource(session, "uk");
    const atomicText = fs.readFileSync(path.join(COURSE_ROOT, `sessions/en/l04/${session}/practice.atomic.json`), "utf8");
    assert.match(uk, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"), session);
    assert.doesNotMatch(uk, /підмет/u, session);
    assert.equal(atomicText.split(expected).length - 1, 2, `${session} duplicated atomic feedback`);
    assert.doesNotMatch(atomicText, /підмет/u, session);
  }
});

test("L04 S10 prepares the contracted negative final with a distinct full negative answer", () => {
  const ruSource = sessionSource("s10", "ru");
  const ukSource = sessionSource("s10", "uk");
  assert.match(ruSource, /Интро 2[\s\S]*✅ \*\*No, there is not\.\*\*/u);
  assert.match(ukSource, /Інтро 2[\s\S]*✅ \*\*No, there is not\.\*\*/u);
  assert.match(ruSource, /`No, there isn't\.` значит то же самое/u);
  assert.match(ukSource, /`No, there isn't\.` означає те саме/u);
  const atomic = JSON.parse(fs.readFileSync(path.join(COURSE_ROOT, "sessions/en/l04/s10/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) {
    const interactions = atomic.interactionsByLocale[locale];
    const i06 = interactions.find((interaction) => interaction.interactionId.endsWith(":i06"));
    const i11 = interactions.find((interaction) => interaction.interactionId.endsWith(":i11"));
    const i12 = interactions.find((interaction) => interaction.interactionId.endsWith(":i12"));
    assert.equal(i06.purpose, "guided_practice", locale);
    assert.deepEqual(i06.responseOptions.map((option) => option.text), [
      "No, there is not.",
      "No, there not is.",
      "No, is there not.",
    ]);
    assert.match(i06.prompt, locale === "ru" ? /отел/iu : /готел/iu);
    assert.match(i06.prompt, /shop/iu);
    assert.match(i06.prompt, /building/iu);
    assert.equal(i06.modePayload.choiceFeedback.find((entry) => entry.responseId.endsWith(":r2")).testedDimension, "negation_word_order", locale);
    assert.equal(i11.responseOptions[0].text, "Yes, there is.", locale);
    assert.equal(i12.purpose, "independent_check", locale);
    assert.equal(i12.modePayload.targetPhrase, "No, there isn't.", locale);
    assert.equal(interactions.filter((interaction) => interaction.purpose === "independent_check").length, 1, locale);
  }
  const answers = new Map(atomic.answers.map((answer) => [answer.interactionId, answer.correctText]));
  assert.equal(answers.get("en:lesson-04:session-10:i06"), "No, there is not.");
  assert.equal(answers.get("en:lesson-04:session-10:i12"), "No, there isn't.");
});

test("L04 S05 and S09 vary the practice context instead of repeating an intro target", () => {
  const s05 = JSON.parse(fs.readFileSync(path.join(COURSE_ROOT, "sessions/en/l04/s05/practice.atomic.json"), "utf8"));
  const s09 = JSON.parse(fs.readFileSync(path.join(COURSE_ROOT, "sessions/en/l04/s09/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) {
    const s05i11 = s05.interactionsByLocale[locale][10];
    assert.equal(s05i11.modePayload.hiddenTargetPhrase, "There are shops near a house.", locale);
    assert.equal(s05i11.modePayload.referenceAudio.transcript, "There are shops near a house.", locale);
    assert.equal(s05.interactionsByLocale[locale][11].modePayload.targetPhrase, "There is a supermarket near two shops.", locale);
    const s09i05 = s09.interactionsByLocale[locale][4];
    assert.equal(s09i05.modePayload.targetPhrase, "Is there a dentist near the library?", locale);
    assert.deepEqual(s09i05.modePayload.orderedTokens, ["Is", "there", "a", "dentist", "near", "the", "library"], locale);
    const s09i07 = s09.interactionsByLocale[locale][6];
    assert.equal(s09i07.modePayload.hiddenTargetPhrase, "Is there a dentist in this building?", locale);
    assert.equal(s09i07.modePayload.referenceAudio.transcript, "Is there a dentist in this building?", locale);
  }
});

const choice = (interactionId, family = "context_gap_grammar") => ({
  interactionId,
  family,
  inputMode: "single_choice",
  responseOptions: [
    { responseId: `${interactionId}:r1`, text: "are" },
    { responseId: `${interactionId}:r2`, text: "is" },
    { responseId: `${interactionId}:r3`, text: "am" },
  ],
  modePayload: {
    gappedTargetPhrase: "There ___ platforms.",
    gapOptions: [
      { responseId: `${interactionId}:r1`, text: "are" },
      { responseId: `${interactionId}:r2`, text: "is" },
      { responseId: `${interactionId}:r3`, text: "am" },
    ],
    choiceFeedback: [],
  },
});

test("one shared header contract parses the Ukrainian scene and explicit no-new-words marker", () => {
  const header = parseHeader([
    "# Повторення",
    "",
    "**Сцена сесії.** Людина звіряє знайомі назви на схемі.",
    "**Операція:** повторення",
    "**Нові слова:** —",
    "**Повертаються:** bank, clinic",
  ].join("\n"));

  assert.equal(header.scene, "Людина звіряє знайомі назви на схемі.");
  assert.deepEqual(header.newWords, []);
  assert.equal(header.newWordsDeclaration, "explicit_none");

  const mockupSource = fs.readFileSync(new URL("./build_mockup.mjs", import.meta.url), "utf8");
  const releaseSource = fs.readFileSync(new URL("./build_release.mjs", import.meta.url), "utf8");
  assert.match(mockupSource, /from "\.\/session_header\.mjs"/u);
  assert.match(releaseSource, /from "\.\/session_header\.mjs"/u);
});

test("a legacy scene keeps plain continuation lines and stops before bold metadata", () => {
  const header = parseHeader([
    "# Ранний эталон",
    "",
    "**Сцена сессии.** Первая физическая строка сцены.",
    "Продолжение той же сцены без метки.",
    "Ещё одна строка сцены.",
    "**Новая операция:** `I am + слово про себя`",
    "**Новые слова:** ready, tired",
    "## Интро 1",
  ].join("\n"));
  assert.equal(header.scene, "Первая физическая строка сцены. Продолжение той же сцены без метки. Ещё одна строка сцены.");
  assert.equal(header.operation, "`I am + слово про себя`");
  assert.deepEqual(header.newWords, ["ready", "tired"]);
  assert.equal(header.scene.includes("операция"), false);
  assert.equal(header.scene.includes("Новые слова"), false);

  const uk = parseHeader("**Сцена сесії.** Перший рядок.\nДругий рядок.\n**Нова операція:** повторення\n**Нове слово:** —");
  assert.equal(uk.scene, "Перший рядок. Другий рядок.");
  assert.equal(uk.operation, "повторення");
});

test("missing and mixed empty/new-word declarations remain distinguishable", () => {
  assert.equal(parseHeader("# Missing").newWordsDeclaration, "missing");
  assert.equal(parseHeader("**Новые слова:** —, bank").newWordsDeclaration, "invalid");
});

for (const fixture of [
  {
    name: "RU",
    markdown: "**Сцена сессии.**   \n**Операция:** повторение\n**Новое слово:**\t\n**Возвращаются:** hotel",
  },
  {
    name: "UK",
    markdown: "**Сцена сесії.**\t\n**Операція:** повторення\n**Нове слово:**   \n**Повертаються:** hotel",
  },
]) {
  test(`${fixture.name} empty header labels never consume the following metadata line`, () => {
    const header = parseHeader(fixture.markdown);
    assert.equal(header.scene, "");
    assert.equal(header.operation, fixture.name === "RU" ? "повторение" : "повторення");
    assert.deepEqual(header.newWords, []);
    assert.equal(header.newWordsDeclaration, "invalid");
    assert.equal(header.newWordsRaw, "");
  });
}

test("pre-judge fails closed for missing, invalid, and guardian-conflicting declarations", () => {
  const dir = s10Fixture();
  try {
    const ruFile = path.join(dir, "final.ru.md");
    const ukFile = path.join(dir, "final.uk.md");
    const originalRu = fs.readFileSync(ruFile, "utf8");
    const originalUk = fs.readFileSync(ukFile, "utf8");

    fs.writeFileSync(ruFile, originalRu.replace(/^\*\*(?:Новые слова|Новое слово):\*\*.*\r?\n/mu, ""));
    let result = inspectPreJudgeChoreography({ sessionIdentity: "en/l04/s10", sessionDir: dir });
    assert.ok(result.issues.includes("new_words_declaration_missing:ru"));

    fs.writeFileSync(ruFile, originalRu.replace(/^\*\*(?:Новые слова|Новое слово):\*\*.*$/mu, "**Новые слова:** —, hotel"));
    result = inspectPreJudgeChoreography({ sessionIdentity: "en/l04/s10", sessionDir: dir });
    assert.ok(result.issues.includes("new_words_declaration_invalid:ru"));

    fs.writeFileSync(ruFile, originalRu.replace(/^\*\*(?:Новые слова|Новое слово):\*\*.*$/mu, "**Новое слово:**   "));
    result = inspectPreJudgeChoreography({ sessionIdentity: "en/l04/s10", sessionDir: dir });
    assert.equal(result.verdict, "HOLD");
    assert.ok(result.issues.includes("new_words_declaration_invalid:ru"));

    fs.writeFileSync(ruFile, originalRu);
    fs.writeFileSync(ukFile, originalUk);
    fs.writeFileSync(path.join(dir, "preauthoring.json"), JSON.stringify({ newWords: ["tram"] }));
    result = inspectPreJudgeChoreography({ sessionIdentity: "en/l04/s10", sessionDir: dir });
    assert.ok(result.issues.some((issue) => String(issue).startsWith("new_words_guardian_mismatch:")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("pre-judge normalizes an explicit none marker without inventing an empty word", () => {
  const dir = s10Fixture();
  try {
    for (const locale of ["ru", "uk"]) {
      const file = path.join(dir, `final.${locale}.md`);
      const source = fs.readFileSync(file, "utf8").replace(/^\*\*(?:Новые слова|Новое слово|Нові слова|Нове слово):\*\*.*$/mu, locale === "ru" ? "**Новые слова:** —" : "**Нові слова:** —");
      fs.writeFileSync(file, source);
    }
    const result = inspectPreJudgeChoreography({ sessionIdentity: "en/l04/s10", sessionDir: dir });
    assert.deepEqual(result.newWords, []);
    assert.equal(result.issues.some((issue) => JSON.stringify(issue).includes('"word":""')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("every wrong response in a single-choice interaction needs localized feedback", () => {
  const interaction = choice("i1");
  const answers = [{ interactionId: "i1", correctResponseId: "i1:r1", correctText: "are" }];
  const issues = feedbackLocaleParityIssues({ ru: [interaction], uk: [structuredClone(interaction)] }, { answers });

  assert.ok(issues.some((issue) => issue.responseId === "i1:r2" && issue.reason === "choice_feedback_missing"));
  assert.ok(issues.some((issue) => issue.responseId === "i1:r3" && issue.reason === "choice_feedback_missing"));
});

test("feedback attached to the correct response is accepted only when marked correct", () => {
  const interaction = choice("i1");
  interaction.modePayload.choiceFeedback = [{
    responseId: "i1:r1",
    correct: true,
    feedbackByLocale: { ru: "Верный ответ.", uk: "Правильна відповідь." },
  }];
  const answers = [{ interactionId: "i1", correctResponseId: "i1:r1", correctText: "are" }];
  const issues = feedbackLocaleParityIssues({ ru: [interaction], uk: [structuredClone(interaction)] }, { answers });

  assert.equal(issues.some((issue) => issue.responseId === "i1:r1"), false);

  interaction.modePayload.choiceFeedback[0].correct = false;
  const invalid = feedbackLocaleParityIssues({ ru: [interaction], uk: [structuredClone(interaction)] }, { answers });
  assert.ok(invalid.some((issue) => issue.responseId === "i1:r1" && issue.reason === "choice_feedback_wrong_contract"));
});

test("context-gap Markdown feedback must survive exactly into the atomic locale", () => {
  const task = {
    family: "context_gap_grammar",
    title: "Выберите форму",
    body: "___ → **are** · is\n- is — *Для нескольких мест нужен are.*",
    target: "___",
    options: [
      { text: "are", correct: true, feedback: "" },
      { text: "is", correct: false, feedback: "Для нескольких мест нужен are." },
    ],
  };
  const interaction = {
    interactionId: "i1",
    family: "context_gap_grammar",
    responseOptions: [
      { responseId: "i1:r1", text: "are" },
      { responseId: "i1:r2", text: "is" },
    ],
    modePayload: {
      gappedTargetPhrase: "___",
      gapOptions: [
        { responseId: "i1:r1", text: "are" },
        { responseId: "i1:r2", text: "is" },
      ],
      testedDimension: task.title,
      localizedScene: { ru: task.title },
      choiceFeedback: [{ responseId: "i1:r2", correct: false, testedDimension: task.title, feedbackByLocale: { ru: "Общее неверно." } }],
    },
  };

  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), "modePayload.choiceFeedback");
});

test("explicit feedback on the declared correct Markdown option cannot disappear", () => {
  const task = {
    family: "context_gap_grammar",
    target: "___",
    options: [
      { text: "are", correct: true, feedback: "Это feedback на правильном варианте." },
      { text: "is", correct: false, feedback: "Для нескольких мест нужен are." },
    ],
  };
  const interaction = {
    interactionId: "i1",
    responseOptions: [
      { responseId: "i1:r1", text: "are" },
      { responseId: "i1:r2", text: "is" },
    ],
    modePayload: {
      gappedTargetPhrase: "___",
      gapOptions: [
        { responseId: "i1:r1", text: "are" },
        { responseId: "i1:r2", text: "is" },
      ],
      choiceFeedback: [{ responseId: "i1:r2", correct: false, testedDimension: "", feedbackByLocale: { ru: "Для нескольких мест нужен are." } }],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), "modePayload.choiceFeedback");
});

test("inline Markdown decoration is ignored for feedback parity but semantic edits are not", () => {
  const task = {
    family: "context_gap_grammar",
    target: "___",
    options: [
      { text: "are", correct: true, feedback: "" },
      { text: "is", correct: false, feedback: "Для **нескольких** мест нужен `are`." },
    ],
  };
  const interaction = {
    interactionId: "i1",
    responseOptions: [
      { responseId: "i1:r1", text: "are" },
      { responseId: "i1:r2", text: "is" },
    ],
    modePayload: {
      gappedTargetPhrase: "___",
      gapOptions: [
        { responseId: "i1:r1", text: "are" },
        { responseId: "i1:r2", text: "is" },
      ],
      choiceFeedback: [{ responseId: "i1:r2", feedbackByLocale: { ru: "Для нескольких мест нужен are." } }],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), null);
  interaction.modePayload.choiceFeedback[0].feedbackByLocale.ru = "Для одного места нужен is.";
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), "modePayload.choiceFeedback");
});

test("multiple raw inline-code spans normalize independently before fence handling", () => {
  const task = {
    family: "listen_choose",
    audio: "gate",
    optionMeanings: {},
    options: [
      { text: "gate", correct: true, feedback: "" },
      { text: "garden", correct: false, feedback: "`Gate` — это ворота; `garden` — это сад." },
    ],
  };
  const interaction = {
    interactionId: "en:lesson-02:session-01:i01",
    responseOptions: [
      { responseId: "en:lesson-02:session-01:i01:r1", text: "gate" },
      { responseId: "en:lesson-02:session-01:i01:r2", text: "garden" },
    ],
    modePayload: {
      referenceAudio: { transcript: "gate" },
      isWordCard: false,
      localizedMeaningChoices: [
        { responseId: "en:lesson-02:session-01:i01:r1", targetText: "gate", meaningByLocale: null },
        { responseId: "en:lesson-02:session-01:i01:r2", targetText: "garden", meaningByLocale: null },
      ],
      choiceFeedback: [{
        responseId: "en:lesson-02:session-01:i01:r2",
        correct: false,
        testedDimension: "",
        feedbackByLocale: { ru: "Gate — это ворота; garden — это сад." },
      }],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), null);
  interaction.modePayload.choiceFeedback[0].feedbackByLocale.ru = "Gate — это ворота; garden — это парк.";
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), "modePayload.choiceFeedback");
});

test("choice feedback parity rejects stale learner-visible atomic entries", () => {
  const task = {
    family: "context_gap_grammar",
    target: "They ___ quiet.",
    options: [
      { text: "are", correct: true, feedback: "Верно: с they нужна форма are." },
      { text: "is", correct: false, feedback: "Форма is не подходит к they." },
    ],
  };
  const interaction = {
    interactionId: "en:lesson-01:session-52:i11",
    responseOptions: [
      { responseId: "en:lesson-01:session-52:i11:r1", text: "are" },
      { responseId: "en:lesson-01:session-52:i11:r2", text: "is" },
    ],
    modePayload: {
      gappedTargetPhrase: "They ___ quiet.",
      gapOptions: [
        { responseId: "en:lesson-01:session-52:i11:r1", text: "are" },
        { responseId: "en:lesson-01:session-52:i11:r2", text: "is" },
      ],
      choiceFeedback: [
        {
          responseId: "en:lesson-01:session-52:i11:r1",
          correct: true,
          testedDimension: "",
          feedbackByLocale: { ru: "Верно: с they нужна форма are." },
        },
        {
          responseId: "en:lesson-01:session-52:i11:r2",
          correct: false,
          testedDimension: "",
          feedbackByLocale: { ru: "Форма is не подходит к they." },
        },
      ],
    },
  };

  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), null);
  interaction.modePayload.choiceFeedback.push({
    responseId: "en:lesson-01:session-52:i11:r999",
    feedbackByLocale: { ru: "Устаревший разбор, которого нет в Markdown." },
  });
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), "modePayload.choiceFeedback");
});

test("choice feedback parity binds correct feedback and the full tested dimension", () => {
  const title = "Вставьте слово — вас спросили, как дела, всё хорошо";
  const interactionId = "en:lesson-01:session-01:i10";
  const task = {
    family: "context_gap_grammar",
    title,
    target: "I am ___.",
    options: [
      { text: "fine", correct: true, feedback: "Верно: I am fine." },
      { text: "here", correct: false, feedback: "Here отвечает на вопрос о месте." },
    ],
  };
  const canonical = {
    interactionId,
    responseOptions: [
      { responseId: `${interactionId}:r1`, text: "fine" },
      { responseId: `${interactionId}:r2`, text: "here" },
    ],
    modePayload: {
      gappedTargetPhrase: "I am ___.",
      gapOptions: [
        { responseId: `${interactionId}:r1`, text: "fine" },
        { responseId: `${interactionId}:r2`, text: "here" },
      ],
      testedDimension: title,
      localizedScene: { ru: title },
      choiceFeedback: [
        { responseId: `${interactionId}:r1`, correct: true, testedDimension: title, feedbackByLocale: { ru: "Верно: I am fine." } },
        { responseId: `${interactionId}:r2`, correct: false, testedDimension: title, feedbackByLocale: { ru: "Here отвечает на вопрос о месте." } },
      ],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, canonical, "ru"), null);

  const staleCorrect = structuredClone(canonical);
  staleCorrect.modePayload.choiceFeedback[0].feedbackByLocale.ru = "Старый правильный разбор.";
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, staleCorrect, "ru"), "modePayload.choiceFeedback");

  const truncatedDimension = structuredClone(canonical);
  truncatedDimension.modePayload.choiceFeedback[1].testedDimension = "Вставьте слово — вас спросили, как дела,";
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, truncatedDimension, "ru"), "modePayload.choiceFeedback");
});

test("word-card parity binds both learner-visible definition copies", () => {
  const interactionId = "en:lesson-01:session-01:i07";
  const task = {
    family: "listen_choose",
    card: { word: "happy", definition: "«рад / рада». Хорошая новость радует." },
    options: [],
  };
  const canonical = {
    interactionId,
    responseOptions: [],
    modePayload: {
      referenceAudio: { transcript: "happy" },
      isWordCard: true,
      localizedMeaningChoices: [{
        responseId: `${interactionId}:r1`,
        targetText: "happy",
        meaningByLocale: { ru: "«рад / рада». Хорошая новость радует." },
      }],
      wordCard: {
        word: "happy",
        definitionByLocale: { ru: "«рад / рада». Хорошая новость радует." },
      },
      choiceFeedback: [],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, canonical, "ru"), null);

  const staleMeaning = structuredClone(canonical);
  staleMeaning.modePayload.localizedMeaningChoices[0].meaningByLocale.ru = "«рад». Старая копия.";
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, staleMeaning, "ru"), "modePayload.localizedMeaningChoices");

  const staleCard = structuredClone(canonical);
  staleCard.modePayload.wordCard.definitionByLocale.ru = "«рад». Старая копия.";
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, staleCard, "ru"), "modePayload.wordCard.definitionByLocale");
});

test("builder slot-feedback parity rejects a missing authored tile explanation", () => {
  const interactionId = "en:lesson-01:session-52:i12";
  const task = {
    family: "phrase_builder",
    interactionId,
    title: "Соберите фразу",
    body: "Плитки: `They` `are` `quiet` `is`\n\n*Плитка `is` лишняя: с they нужна форма are.*",
    target: "They are quiet",
    tokens: ["They", "are", "quiet", "is"],
    options: [],
  };
  const interaction = {
    interactionId,
    responseOptions: [],
    modePayload: {
      targetPhrase: "They are quiet",
      orderedTokens: ["They", "are", "quiet"],
      authoredDistractorTokens: ["is"],
      slotFeedback: [],
    },
  };

  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), "modePayload.slotFeedback");
  interaction.modePayload.slotFeedback = [{
    responseId: `${interactionId}:tile:d1`,
    correct: false,
    testedDimension: task.title,
    feedbackByLocale: { ru: "с they нужна форма are." },
  }];
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), null);
  for (const mutate of [
    (copy) => { copy.modePayload.slotFeedback[0].correct = true; },
    (copy) => { copy.modePayload.slotFeedback[0].testedDimension = "Сокращённое описание"; },
  ]) {
    const copy = structuredClone(interaction);
    mutate(copy);
    assert.equal(firstMarkdownAtomicLearnerMismatch(task, copy, "ru"), "modePayload.slotFeedback");
  }
});

test("learner-visible atomic choice feedback cannot exceed the Markdown contract", () => {
  const task = {
    family: "context_gap_grammar",
    target: "___",
    options: [
      { text: "are", correct: true, feedback: "" },
      { text: "is", correct: false, feedback: "" },
    ],
  };
  const interaction = {
    interactionId: "i1",
    responseOptions: [
      { responseId: "i1:r1", text: "are" },
      { responseId: "i1:r2", text: "is" },
    ],
    modePayload: {
      gappedTargetPhrase: "___",
      gapOptions: [
        { responseId: "i1:r1", text: "are" },
        { responseId: "i1:r2", text: "is" },
      ],
      choiceFeedback: [{ responseId: "i1:r2", feedbackByLocale: { ru: "Для нескольких мест нужен are." } }],
    },
  };

  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), "modePayload.choiceFeedback");
  interaction.modePayload.choiceFeedback = [];
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), null);
});

test("choice IDs and the declared correct option stay bound from Markdown through answers and feedback", () => {
  const interactionId = "en:lesson-04:session-12:i01";
  const task = {
    ordinal: 1,
    title: "Выберите форму",
    interactionId,
    family: "context_gap_grammar",
    body: "___ → **are** · is",
    target: "___",
    options: [
      { text: "are", correct: true, feedback: "" },
      { text: "is", correct: false, feedback: "Для нескольких мест нужен are." },
    ],
  };
  const canonicalInteraction = {
    interactionId,
    family: task.family,
    prompt: task.title,
    inputMode: "single_choice",
    responseOptions: [
      { responseId: `${interactionId}:r1`, text: "are" },
      { responseId: `${interactionId}:r2`, text: "is" },
    ],
    modePayload: {
      gappedTargetPhrase: "___",
      gapOptions: [
        { responseId: `${interactionId}:r1`, text: "are" },
        { responseId: `${interactionId}:r2`, text: "is" },
      ],
      testedDimension: task.title,
      localizedScene: { ru: task.title },
      choiceFeedback: [{
        responseId: `${interactionId}:r2`,
        correct: false,
        testedDimension: task.title,
        feedbackByLocale: { ru: "Для нескольких мест нужен are." },
      }],
    },
  };
  const check = (interaction, answer) => atomicMarkdownParityIssues({
    sessionIdentity: "en/l04/s12",
    sessionId: "en:lesson-04:session-12",
    atomicSource: {
      schemaVersion: "learning_v2_atomic_practice_source_v1",
      courseSessionId: "en:lesson-04:session-12",
      interactionsByLocale: { ru: [interaction] },
      answers: [answer],
    },
    tasksByLocale: { ru: [task] },
  });
  const canonicalAnswer = { interactionId, correctResponseId: `${interactionId}:r1`, correctText: "are" };
  assert.deepEqual(check(canonicalInteraction, canonicalAnswer), []);

  const swappedOptions = structuredClone(canonicalInteraction);
  [swappedOptions.responseOptions[0].responseId, swappedOptions.responseOptions[1].responseId] =
    [swappedOptions.responseOptions[1].responseId, swappedOptions.responseOptions[0].responseId];
  [swappedOptions.modePayload.gapOptions[0].responseId, swappedOptions.modePayload.gapOptions[1].responseId] =
    [swappedOptions.modePayload.gapOptions[1].responseId, swappedOptions.modePayload.gapOptions[0].responseId];
  assert.match(check(swappedOptions, { ...canonicalAnswer, correctResponseId: `${interactionId}:r2` })[0] ?? "", /field=responseOptions/u);

  assert.match(check(canonicalInteraction, { ...canonicalAnswer, correctResponseId: `${interactionId}:r2` })[0] ?? "", /field=answers\.correctResponseId/u);

  const swappedFeedback = structuredClone(canonicalInteraction);
  swappedFeedback.modePayload.choiceFeedback[0].responseId = `${interactionId}:r1`;
  assert.match(check(swappedFeedback, canonicalAnswer)[0] ?? "", /field=modePayload\.choiceFeedback/u);
});

test("sound contrast keeps canonical contrasts and both audio contracts", () => {
  const task = {
    family: "sound_contrast",
    options: [
      { text: "ship", correct: true, feedback: "" },
      { text: "sheep", correct: false, feedback: "Долгий звук." },
    ],
  };
  const interactionId = "en:lesson-04:session-12:i02";
  const interaction = {
    interactionId,
    responseOptions: task.options.map((option, index) => ({ responseId: `${interactionId}:r${index + 1}`, text: option.text })),
    audioTargetIds: [`${interactionId}:audioA`, `${interactionId}:audioB`],
    modePayload: {
      contrastA: "ship",
      contrastB: "sheep",
      audioA: { audioTargetId: `${interactionId}:audioA`, transcript: "ship" },
      audioB: { audioTargetId: `${interactionId}:audioB`, transcript: "sheep" },
      choiceFeedback: [{ responseId: `${interactionId}:r2`, correct: false, testedDimension: "", feedbackByLocale: { ru: "Долгий звук." } }],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), null);
  for (const [field, mutate] of [
    ["modePayload.contrastA", (copy) => { copy.modePayload.contrastA = "sheep"; }],
    ["modePayload.contrastB", (copy) => { copy.modePayload.contrastB = "ship"; }],
    ["modePayload.audioA.transcript", (copy) => { copy.modePayload.audioA.transcript = "sheep"; }],
    ["modePayload.audioB.audioTargetId", (copy) => { copy.modePayload.audioB.audioTargetId += ":stale"; }],
    ["audioTargetIds", (copy) => { copy.audioTargetIds.reverse(); }],
  ]) {
    const copy = structuredClone(interaction);
    mutate(copy);
    assert.equal(firstMarkdownAtomicLearnerMismatch(task, copy, "ru"), field);
  }
});

test("builder distractors and dictation tokens stay exact across Markdown and atomic", () => {
  const builderTask = {
    family: "phrase_builder",
    target: "There is a hotel.",
    tokens: ["There", "is", "a", "hotel", "are"],
    options: [],
  };
  const builder = {
    responseOptions: [],
    modePayload: {
      targetPhrase: "There is a hotel.",
      orderedTokens: ["There", "is", "a", "hotel"],
      authoredDistractorTokens: [],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(builderTask, builder, "ru"), "modePayload.authoredDistractorTokens");
  builder.modePayload.authoredDistractorTokens = ["are", "are"];
  assert.equal(firstMarkdownAtomicLearnerMismatch(builderTask, builder, "ru"), "modePayload.authoredDistractorTokens");

  const dictationTask = {
    family: "listen_build_dictation",
    target: "Are there two platforms?",
    audio: "Are there two platforms?",
    tokens: ["Are", "there", "two", "platforms", "is"],
    options: [],
  };
  const dictation = {
    responseOptions: [],
    modePayload: {
      hiddenTargetPhrase: "Are there two platforms?",
      referenceAudio: { transcript: "Are there two platforms?" },
      orderedTokens: ["Are", "there", "platforms"],
      authoredDistractorTokens: ["is"],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(dictationTask, dictation, "ru"), "modePayload.orderedTokens");
});

test("builder distractors use a multiset so case-folded surplus tiles are preserved", () => {
  const task = {
    family: "phrase_builder",
    target: "There is a hotel.",
    tokens: ["there", "There", "is", "a", "hotel"],
    options: [],
  };
  const interaction = {
    responseOptions: [],
    modePayload: {
      targetPhrase: "There is a hotel.",
      orderedTokens: ["There", "is", "a", "hotel"],
      authoredDistractorTokens: [],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), "modePayload.authoredDistractorTokens");
  interaction.modePayload.authoredDistractorTokens = ["There"];
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), null);
});

test("omitted builder and dictation tiles may use a valid atomic reconstruction", () => {
  const builderTask = { family: "phrase_builder", target: "I am fine.", options: [] };
  const builder = {
    responseOptions: [],
    modePayload: {
      targetPhrase: "I am fine.",
      orderedTokens: ["I", "am", "fine"],
      authoredDistractorTokens: ["is"],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(builderTask, builder, "ru"), null);

  const dictationTask = {
    family: "listen_build_dictation",
    target: "There is a hotel.",
    audio: "There is a hotel.",
    options: [],
  };
  const dictation = {
    responseOptions: [],
    modePayload: {
      hiddenTargetPhrase: "There is a hotel.",
      referenceAudio: { transcript: "There is a hotel." },
      orderedTokens: ["There", "is", "a", "hotel"],
      authoredDistractorTokens: ["are", "There"],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(dictationTask, dictation, "ru"), null);
});

for (const fixture of [
  { session: "l01/s01", ordinal: 9, name: "L01 S01 i09 legacy omitted tiles" },
  { session: "l03/s01", ordinal: 5, name: "L03 target-only builder" },
]) {
  test(`${fixture.name} accepts its valid atomic reconstruction`, () => {
    const directory = path.join(COURSE_ROOT, "sessions/en", fixture.session);
    const tasks = parsePractice(fs.readFileSync(path.join(directory, "final.ru.md"), "utf8"));
    const atomic = JSON.parse(fs.readFileSync(path.join(directory, "practice.atomic.json"), "utf8"));
    const task = tasks.find((candidate) => candidate.ordinal === fixture.ordinal);
    const interaction = atomic.interactionsByLocale.ru.find((candidate) => candidate.interactionId === task?.interactionId);
    const answer = atomic.answers.find((candidate) => candidate.interactionId === task?.interactionId);
    assert.ok(task && interaction, "fixture interaction must exist in Markdown and atomic source");
    assert.equal(Object.prototype.hasOwnProperty.call(task, "tokens"), false);
    const interactionWithoutFeedback = structuredClone(interaction);
    interactionWithoutFeedback.modePayload.slotFeedback = [];
    assert.equal(firstMarkdownAtomicLearnerMismatch(task, interactionWithoutFeedback, "ru", answer), null);
  });
}

test("omitted tiles require a valid atomic target reconstruction", () => {
  const task = { family: "phrase_builder", target: "There is a hotel.", options: [] };
  const canonical = {
    responseOptions: [],
    modePayload: {
      targetPhrase: "There is a hotel.",
      orderedTokens: ["There", "is", "a", "hotel"],
      authoredDistractorTokens: ["are"],
    },
  };
  for (const mutate of [
    (copy) => { copy.modePayload.orderedTokens.splice(2, 1); },
    (copy) => { copy.modePayload.orderedTokens.reverse(); },
    (copy) => { copy.modePayload.orderedTokens.push("hotel"); },
    (copy) => { copy.modePayload.orderedTokens[0] = "there"; },
    (copy) => { copy.modePayload.authoredDistractorTokens = ["are", ""]; },
  ]) {
    const copy = structuredClone(canonical);
    mutate(copy);
    assert.match(firstMarkdownAtomicLearnerMismatch(task, copy, "ru") ?? "", /modePayload\.(?:orderedTokens|authoredDistractorTokens)/u);
  }
});

test("explicit tiles retain target coverage plus exact ordered and distractor multisets", () => {
  const task = {
    family: "phrase_builder",
    target: "There is a hotel.",
    tokens: ["There", "is", "a", "hotel", "are", "There"],
    options: [],
  };
  const canonical = {
    responseOptions: [],
    modePayload: {
      targetPhrase: "There is a hotel.",
      orderedTokens: ["There", "is", "a", "hotel"],
      authoredDistractorTokens: ["are", "There"],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, canonical, "ru"), null);

  const missingTile = { ...task, tokens: ["There", "is", "hotel", "are", "There"] };
  assert.equal(firstMarkdownAtomicLearnerMismatch(missingTile, canonical, "ru"), "modePayload.declaredTiles");

  for (const [field, mutate] of [
    ["modePayload.orderedTokens", (copy) => { copy.modePayload.orderedTokens[0] = "there"; }],
    ["modePayload.orderedTokens", (copy) => { copy.modePayload.orderedTokens.reverse(); }],
    ["modePayload.authoredDistractorTokens", (copy) => { copy.modePayload.authoredDistractorTokens = ["are", "are"]; }],
    ["modePayload.authoredDistractorTokens", (copy) => { copy.modePayload.authoredDistractorTokens = ["Are", "There"]; }],
  ]) {
    const copy = structuredClone(canonical);
    mutate(copy);
    assert.equal(firstMarkdownAtomicLearnerMismatch(task, copy, "ru"), field);
  }

  const explicitDictation = {
    ...task,
    family: "listen_build_dictation",
    audio: task.target,
    tokens: task.tokens.filter((token) => token !== "a"),
  };
  const dictationInteraction = {
    responseOptions: [],
    modePayload: {
      hiddenTargetPhrase: task.target,
      referenceAudio: { transcript: task.target },
      orderedTokens: canonical.modePayload.orderedTokens,
      authoredDistractorTokens: canonical.modePayload.authoredDistractorTokens,
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(explicitDictation, dictationInteraction, "ru"), "modePayload.declaredTiles");
});

test("omitted Markdown fields do not authorize extra speed-match pairs", () => {
  const task = {
    family: "speed_match",
    pairs: [
      { target: "hotel", meaning: "отель" },
      { target: "bank", meaning: "банк" },
    ],
    options: [],
  };
  const interaction = {
    responseOptions: [],
    modePayload: {
      pairGrid: [
        { target: "hotel", meaningByLocale: { ru: "отель" } },
        { target: "bank", meaningByLocale: { ru: "банк" } },
        { target: "tram", meaningByLocale: { ru: "трамвай" } },
      ],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), "modePayload.pairGrid");
});

test("an authored visible condition cannot disappear between Markdown and atomic projection", () => {
  const task = {
    family: "context_gap_grammar",
    title: "Заполните ответ",
    condition: "На табло одна платформа; вопрос — о двух.",
    body: "Условие: На табло одна платформа; вопрос — о двух.\n___ → **No, there aren't.** · No, there isn't.",
    target: "___",
    options: [
      { text: "No, there aren't.", correct: true, feedback: "" },
      { text: "No, there isn't.", correct: false, feedback: "Вопрос о нескольких платформах." },
    ],
  };
  const interaction = {
    interactionId: "i1",
    family: "context_gap_grammar",
    responseOptions: task.options.map((option, index) => ({ responseId: `i1:r${index + 1}`, text: option.text })),
    modePayload: {
      gappedTargetPhrase: "___",
      gapOptions: task.options.map((option, index) => ({ responseId: `i1:r${index + 1}`, text: option.text })),
      testedDimension: task.title,
      localizedScene: { ru: "" },
      choiceFeedback: [{ responseId: "i1:r2", feedbackByLocale: { ru: "Вопрос о нескольких платформах." } }],
    },
  };

  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), "modePayload.localizedScene");
});

test("a labeled visible condition is parsed as learner-facing task data", () => {
  const [task] = parsePractice(`## Практика\n\n**1 · Заполните ответ**\n<!-- interaction_id: en:lesson-04:session-12:i01; family: context_gap_grammar -->\nУсловие: На табло одна платформа; вопрос — о двух.\n___ → **No, there aren't.** · No, there isn't.\n- No, there isn't. — *Вопрос о нескольких платформах.*\n\n## Для сборщика\n\nmodes: 1=context_gap_grammar\n`);
  assert.equal(task.condition, "На табло одна платформа; вопрос — о двух.");
});

test("unlabelled learner guidance before a task is projected while service fields stay hidden", () => {
  const [task] = parsePractice(`## Практика\n\n**1 · Заполните ответ**\n<!-- interaction_id: en:lesson-04:session-12:i01; family: context_gap_grammar -->\nНа табло одна платформа; вопрос — о двух.\nЦель: \`There ___ two platforms.\`\nВарианты: \`are\` · \`is\`\nЗначения вариантов: are — несколько · is — одно\nThere ___ two platforms. → **are** · is\n- is — *Для двух нужна форма are.*\n\n## Для сборщика\n\nmodes: 1=context_gap_grammar\n`);
  assert.equal(task.visibleGuidance, "На табло одна платформа; вопрос — о двух.");
  assert.equal(task.visibleGuidance.includes("Цель:"), false);
  assert.equal(task.visibleGuidance.includes("Варианты:"), false);

  const interaction = {
    interactionId: task.interactionId,
    responseOptions: task.options.map((option, index) => ({ responseId: `${task.interactionId}:r${index + 1}`, text: option.text })),
    modePayload: {
      gappedTargetPhrase: "There ___ two platforms.",
      gapOptions: task.options.map((option, index) => ({ responseId: `${task.interactionId}:r${index + 1}`, text: option.text })),
      testedDimension: task.title,
      localizedScene: { ru: "" },
      choiceFeedback: [{ responseId: `${task.interactionId}:r2`, feedbackByLocale: { ru: "Для двух нужна форма are." } }],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, "ru"), "modePayload.localizedScene");
});

test("the first declared option is the authored correct response", () => {
  const [task] = parsePractice(`## Практика\n\n**1 · Выберите форму**\n<!-- interaction_id: en:lesson-04:session-12:i01; family: context_gap_grammar -->\nЦель: \`___\`\nВарианты: \`are\` · \`is\` · \`am\`\n\n## Для сборщика\n\nmodes: 1=context_gap_grammar\n`);
  assert.deepEqual(task.options.map((option) => option.correct), [true, false, false]);
});

test("response-specific feedback does not reorder declared choices", () => {
  const [task] = parsePractice(`## Практика\n\n**1 · Выберите форму**\n<!-- interaction_id: en:lesson-04:session-12:i01; family: context_gap_grammar -->\nЦель: \`___\`\nВарианты: \`are\` · \`is\` · \`am\`\n- is — *Для нескольких мест нужен are.*\n- am — *Am работает только с I.*\n\n## Для сборщика\n\nmodes: 1=context_gap_grammar\n`);
  assert.deepEqual(task.options.map(({ text, correct }) => ({ text, correct })), [
    { text: "are", correct: true },
    { text: "is", correct: false },
    { text: "am", correct: false },
  ]);
});

test("three initial word contacts permit a later retrieval contact after the first phrase", () => {
  const word = "platform";
  const interactions = [
    { interactionId: "i1", family: "listen_choose", modePayload: { referenceAudio: { transcript: word } } },
    { interactionId: "i2", family: "scripted_repeat_compare", modePayload: { targetPhrase: word } },
    { interactionId: "i3", family: "context_gap_grammar", modePayload: { gappedTargetPhrase: "___", gapOptions: [{ responseId: "i3:r1", text: word }] } },
    { interactionId: "i4", family: "phrase_builder", modePayload: { targetPhrase: "There is a platform.", orderedTokens: ["There", "is", "a", word] } },
    { interactionId: "i5", family: "speed_match", modePayload: { pairGrid: [word, "tram", "hotel", "bank"].map((target, index) => ({ pairId: `p${index + 1}`, target, meaningByLocale: { ru: `значение-${index + 1}` } })) } },
    { interactionId: "i6", family: "listen_build_dictation", modePayload: { hiddenTargetPhrase: "Is there a platform?", orderedTokens: ["Is", "there", "a", word], referenceAudio: { transcript: "Is there a platform?" } } },
  ];
  const answers = [
    { interactionId: "i3", correctResponseId: "i3:r1", correctText: word },
    { interactionId: "i5", correctResponseId: "p1", correctText: "p1=platform | p2=tram | p3=hotel | p4=bank" },
  ];

  const issues = familyChoreographyIssues(interactions, { newWords: [word], answers });
  assert.equal(issues.some((issue) => issue.reason === "word_first_contact_overflow"), false);
  assert.equal(issues.some((issue) => issue.reason === "word_first_three_distinct_contacts_missing"), false);
});

test("active judge prompts require a full visible-projection read and keep actors out of explanations", () => {
  for (const name of ["judge_reader.md", "judge_taste.md", "judge_pedagogy.md", "judge_progression.md", "judge_preauthoring.md"]) {
    const prompt = fs.readFileSync(new URL(`./prompts/${name}`, import.meta.url), "utf8");
    assert.match(prompt, /actual visible projection|фактическ(?:ую|ой) learner-projection/iu, name);
  }
  const taste = fs.readFileSync(new URL("./prompts/judge_taste.md", import.meta.url), "utf8");
  assert.match(taste, /люди и событие.*только.*вопрос/iu);
  assert.doesNotMatch(taste, /кто\? где человек\?/iu);
});

test("the repository verifier invokes the shared strict projection and declaration gate", () => {
  const verifier = fs.readFileSync(new URL("./verify_all_single_phrase_sources.mjs", import.meta.url), "utf8");
  assert.match(verifier, /strictProjectionContractIssues/u);
  assert.match(verifier, /strictProjectionContractIssues\(\{/u);
  assert.match(verifier, /strict_projection_contract:\$\{JSON\.stringify\(strictContract\.issues\[0\]\)\}/u);
});

test("pre-judge imports Buffer explicitly instead of relying on a runtime global", () => {
  const source = fs.readFileSync(new URL("./prejudge_choreography.mjs", import.meta.url), "utf8");
  assert.match(source, /import \{ Buffer \} from "node:buffer";/u);
});

test("locale humor review follows the owner's session-level requirement", () => {
  const prompt = fs.readFileSync(new URL("./prompts/judge_locale_batch.md", import.meta.url), "utf8");
  assert.match(prompt, /хотя бы один естественный.*на сессию/iu);
  assert.match(prompt, /не является приклеенн/iu);
  assert.match(prompt, /конкретн(?:ой|ыми) цитат/iu);
  assert.match(prompt, /2026-09-08_short_answer_construction_and_humor\.md/u);
  assert.doesNotMatch(prompt, /Шутка есть на каждой странице интро|интро без шутки/iu);
});
