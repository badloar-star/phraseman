import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  atomicMarkdownParityIssues,
  factoryManifestCorrectChoiceIndexes,
  sourceReleaseScopeIssues,
  sourceReleaseSemanticParityIssues,
} from "./build_release.mjs";
import { applyPracticeExplanationsV1 } from "./practice_explanations_v1.mjs";

test("legacy title-only word cards compare their taught word, not the shortened generic title", () => {
  const sessionId = "en:lesson-02:session-01";
  const task = { ordinal: 1, title: "Карточка слова — awake", interactionId: `${sessionId}:i01`, family: "listen_choose", target: "awake", options: [] };
  const interaction = {
    interactionId: task.interactionId,
    family: "listen_choose",
    prompt: "Карточка слова — awake",
    responseOptions: [],
    modePayload: { isWordCard: true, referenceAudio: { transcript: "awake" }, wordCard: { word: "awake" } },
  };
  assert.deepEqual(atomicMarkdownParityIssues({
    sessionIdentity: "en/l02/s01",
    sessionId,
    atomicSource: { schemaVersion: "learning_v2_atomic_practice_source_v1", courseSessionId: sessionId, interactionsByLocale: { ru: [interaction] }, answers: [] },
    tasksByLocale: { ru: [task] },
  }), []);
});

const HERE = path.dirname(fileURLToPath(import.meta.url));

function sourceFixture() {
  const sessionId = "en:lesson-01:session-01";
  const interactions = [
    {
      interactionId: `${sessionId}:i01`,
      family: "listen_choose",
      inputMode: "single_choice",
      prompt: "Выберите слово",
      responseOptions: [{ responseId: `${sessionId}:i01:r1`, text: "ready" }],
      modePayload: { referenceAudio: { transcript: "ready" } },
    },
    {
      interactionId: `${sessionId}:i02`,
      family: "phrase_builder",
      inputMode: "ordered_tokens",
      prompt: "Соберите фразу",
      responseOptions: [],
      modePayload: { targetPhrase: "I am ready.", orderedTokens: ["I", "am", "ready"] },
    },
  ];
  return {
    sessionId,
    atomicSource: {
      schemaVersion: "learning_v2_atomic_practice_source_v1",
      courseSessionId: sessionId,
      interactionsByLocale: { ru: interactions },
      answers: [
        { interactionId: `${sessionId}:i01`, correctText: "ready", correctResponseId: `${sessionId}:i01:r1` },
        { interactionId: `${sessionId}:i02`, correctText: "I am ready.", correctResponseId: null },
      ],
    },
    sourceIntroByLocale: {
      ru: [{
        kind: "concept",
        heading: "Ready or busy?",
        text: "Choose the exact state.",
        question: "Which word means ready?",
        options: [
          { text: "ready", correct: true },
          { text: "busy", correct: false },
          { text: "done", correct: false },
        ],
      }],
    },
    sourceLearningOutcomeByLocale: { ru: "Choose the exact state." },
  };
}

function alignedRelease(fixture) {
  const { sessionId, atomicSource, sourceIntroByLocale } = fixture;
  const page = sourceIntroByLocale.ru[0];
  return {
    releaseIntro: {
      courseSessionId: sessionId,
      learningOutcomeByLocale: structuredClone(fixture.sourceLearningOutcomeByLocale),
      pages: [{
        pageOrdinal: 1,
        pageId: `${sessionId}:intro1`,
        kind: page.kind,
        titleByLocale: { ru: page.heading },
        bodyByLocale: { ru: page.text },
        question: {
          interactionId: `${sessionId}:intro1:q`,
          promptByLocale: { ru: page.question },
          accessibilityLabelByLocale: { ru: page.question },
          choicesByLocale: { ru: page.options.map((option, index) => ({
            responseId: `${sessionId}:intro1:r${index + 1}`,
            text: option.text,
          })) },
        },
      }],
    },
    releaseLearnersByLocale: { ru: {
      courseSessionId: sessionId,
      interactions: structuredClone(atomicSource.interactionsByLocale.ru),
    } },
    releaseAnswers: structuredClone(atomicSource.answers),
  };
}

function divergentRelease(fixture) {
  const { sessionId } = fixture;
  return {
    releaseIntro: {
      pages: [{ question: { choicesByLocale: { ru: [
        { responseId: `${sessionId}:intro1:r1`, text: "ready" },
        { responseId: `${sessionId}:intro1:r2`, text: "hungry" },
        { responseId: `${sessionId}:intro1:r3`, text: "done" },
      ] } } }],
    },
    releaseLearnersByLocale: {
      ru: { interactions: [
        {
          interactionId: `${sessionId}:i01`,
          family: "context_gap_grammar",
          inputMode: "ordered_tokens",
          prompt: "Другое задание",
          responseOptions: [{ responseId: `${sessionId}:i01:r1`, text: "hungry" }],
          modePayload: { referenceAudio: { transcript: "hungry" } },
        },
        {
          interactionId: `${sessionId}:i03`,
          family: "phrase_builder",
          inputMode: "ordered_tokens",
          prompt: "Лишнее задание",
          responseOptions: [],
          modePayload: { targetPhrase: "I am busy.", orderedTokens: ["I", "am", "busy"] },
        },
      ] },
    },
    releaseAnswers: [
      { interactionId: `${sessionId}:i01`, correctText: "hungry", correctResponseId: `${sessionId}:i01:r1` },
      { interactionId: `${sessionId}:i03`, correctText: "I am busy.", correctResponseId: null },
    ],
  };
}

test("source/release parity reports every independent semantic mismatch", () => {
  const fixture = sourceFixture();
  const issues = sourceReleaseSemanticParityIssues({
    sessionIdentity: "en/l01/s01",
    ...fixture,
    ...divergentRelease(fixture),
  });

  for (const expected of [
    "intro:ru:page=1:choices",
    ":i01:family",
    ":i01:inputMode",
    ":i01:prompt",
    ":i01:responseOptions",
    ":i01:modePayload.referenceAudio.transcript",
    ":i02:release_interaction_missing",
    ":i03:source_interaction_missing",
    ":i01:answers.correctText",
    ":i02:release_answer_missing",
    ":i03:source_answer_missing",
  ]) {
    assert.ok(issues.some((issue) => issue.includes(expected)), `missing ${expected}\n${issues.join("\n")}`);
  }
  assert.ok(issues.length >= 11, issues.join("\n"));
});

test("source/release parity uses the validated explanation sidecar for speed-pair analysis and still rejects drift", () => {
  const sessionId = "en:lesson-01:session-01";
  const interaction = {
    interactionId: `${sessionId}:i01`, family: "speed_match", inputMode: "pair_grid", prompt: "Соедините пары", responseOptions: [],
    modePayload: { pairGrid: [{ pairId: `${sessionId}:i01:p1`, target: "ready", meaningByLocale: { ru: "готов" } }] },
  };
  const atomicSource = {
    schemaVersion: "learning_v2_atomic_practice_source_v1", courseSessionId: sessionId,
    interactionsByLocale: { ru: [interaction] }, answers: [{ interactionId: interaction.interactionId, correctText: `${sessionId}:i01:p1=ready`, correctResponseId: null }],
  };
  const analysis = {
    lemma: "ready", partOfSpeech: "adjective", partOfSpeechLabelByLocale: { ru: "прилагательное", uk: "прикметник" },
    meaningByLocale: { ru: "готов", uk: "готовий" }, functionByLocale: { ru: "Описывает состояние.", uk: "Описує стан." },
    matchExplanationByLocale: { ru: "Подходит по смыслу.", uk: "Підходить за змістом." }, sourceRefs: ["final.ru.md#practice-i01"],
  };
  const sidecar = { interactions: { [interaction.interactionId]: { pairs: [{ pairId: `${sessionId}:i01:p1`, target: "ready", analysisV1: analysis }] } } };
  const projected = applyPracticeExplanationsV1({ atomicSource, sidecar });
  const release = { courseSessionId: sessionId, interactions: projected.interactionsByLocale.ru };
  const base = {
    sessionIdentity: "en/l01/s01", sessionId, atomicSource, practiceExplanationsSidecar: sidecar, practiceExplanationsValidated: true,
    sourceIntroByLocale: {}, releaseIntro: { courseSessionId: sessionId, pages: [] },
    releaseLearnersByLocale: { ru: release }, releaseAnswers: atomicSource.answers, locales: ["ru"],
  };
  assert.deepEqual(sourceReleaseSemanticParityIssues(base), []);
  release.interactions[0].modePayload.pairGrid[0].analysisV1.matchExplanationByLocale.ru = "Другая причина.";
  assert.ok(sourceReleaseSemanticParityIssues(base).some((issue) => issue.includes("modePayload.pairGrid")));
  assert.ok(sourceReleaseSemanticParityIssues({ ...base, practiceExplanationsValidated: false })
    .some((issue) => issue.includes("practice_explanations_unvalidated")));
});

test("source/release parity preserves intro response token analyses in auxiliary output", () => {
  const sessionId = "en:lesson-01:session-01";
  const atomicSource = {
    schemaVersion: "learning_v2_atomic_practice_source_v1", courseSessionId: sessionId,
    interactionsByLocale: { ru: [] }, answers: [],
  };
  const analysis = {
    text: "I am here.", meaningByLocale: { ru: "Я здесь.", uk: "Я тут." },
    explanationByLocale: { ru: "Разбор.", uk: "Розбір." }, units: [],
  };
  const responseId = `${sessionId}:intro1:r1`;
  const diagnostics = {
    errorType: "missing_linking_verb",
    whyTemptingByLocale: { ru: "Похоже на короткую фразу.", uk: "Схоже на коротку фразу." },
    whyWrongHereByLocale: { ru: "Нужен am.", uk: "Потрібне am." },
    minimalContrastByLocale: { ru: "I here. → I am here.", uk: "I here. → I am here." },
    acceptabilityBoundaryByLocale: { ru: "Только заметка.", uk: "Лише нотатка." },
  };
  const sidecar = { introResponses: [{ responseId, correct: false, analysisByLocale: { ru: analysis, uk: analysis }, ...diagnostics }], interactions: {} };
  const releaseAuxiliary = structuredClone({
    courseSessionId: sessionId,
    entries: [1, 2, 3].map((ordinal) => ({
      interactionId: `${sessionId}:intro${ordinal}:q`,
      responseAnalysisById: ordinal === 1 ? { [responseId]: { ru: analysis, uk: analysis } } : {},
      responseDiagnosticsById: ordinal === 1 ? { [responseId]: diagnostics } : {},
    })),
  });
  const base = {
    sessionIdentity: "en/l01/s01", sessionId, atomicSource,
    practiceExplanationsSidecar: sidecar, practiceExplanationsValidated: true,
    sourceIntroByLocale: {}, releaseIntro: { courseSessionId: sessionId, pages: [] }, releaseAuxiliary,
    releaseLearnersByLocale: { ru: { courseSessionId: sessionId, interactions: [] } }, releaseAnswers: [], locales: ["ru"],
  };
  assert.deepEqual(sourceReleaseSemanticParityIssues(base), []);
  releaseAuxiliary.entries[0].responseAnalysisById[responseId].ru.explanationByLocale.ru = "Подмена.";
  assert.ok(sourceReleaseSemanticParityIssues(base).some((issue) => issue.includes("responseAnalysisById")));
  releaseAuxiliary.entries[0].responseAnalysisById[responseId].ru.explanationByLocale.ru = "Разбор.";
  releaseAuxiliary.entries[0].responseDiagnosticsById[responseId].minimalContrastByLocale.ru = "Подмена.";
  assert.ok(sourceReleaseSemanticParityIssues(base).some((issue) => issue.includes("responseDiagnosticsById")));
});

test("official scoped parity projects the validated sidecar before comparing speed-pair analysis", () => {
  const courseRoot = path.resolve(HERE, "..");
  const privateCandidate = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-sidecar-scope-"));
  const build = spawnSync(process.execPath, [
    path.join(HERE, "build_release.mjs"),
    "--session", "en/l01/s01",
    "--locales", "ru,uk",
    "--out", privateCandidate,
    "--candidate-preview",
  ], { encoding: "utf8" });
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);
  const releaseDir = path.join(privateCandidate, "en/l01/s01");

  const baseline = sourceReleaseScopeIssues({
    root: courseRoot,
    scope: "en/l01/s01",
    locales: ["ru", "uk"],
    releaseRoot: privateCandidate,
  });
  assert.equal(
    baseline.some((issue) => issue.includes("modePayload.pairGrid")),
    false,
    baseline.join("\n"),
  );

  const learnerPath = path.join(releaseDir, "learner.json");
  const learner = JSON.parse(fs.readFileSync(learnerPath, "utf8"));
  const interaction = learner.interactions.find((item) => item.interactionId === "en:lesson-01:session-01:i08");
  interaction.modePayload.pairGrid[0].analysisV1.matchExplanationByLocale.ru = "Подменённое объяснение.";
  fs.writeFileSync(learnerPath, JSON.stringify(learner));

  const mutated = sourceReleaseScopeIssues({
    root: courseRoot,
    scope: "en/l01/s01",
    locales: ["ru", "uk"],
    releaseRoot: privateCandidate,
  });
  assert.ok(
    mutated.some((issue) => issue.includes("modePayload.pairGrid")),
    mutated.join("\n"),
  );
});

test("intro parity blocks changed visible copy and canonical IDs even when choice text is unchanged", () => {
  const fixture = sourceFixture();
  const release = alignedRelease(fixture);
  release.releaseIntro.courseSessionId = "en:lesson-99:session-99";
  const [page] = release.releaseIntro.pages;
  page.pageId = "wrong-page";
  page.titleByLocale.ru = "Changed title";
  page.bodyByLocale.ru = "Changed body";
  page.question.promptByLocale.ru = "Changed question";
  page.question.interactionId = "wrong-question";
  page.question.choicesByLocale.ru.forEach((choice, index) => { choice.responseId = `wrong-r${index + 1}`; });

  const issues = sourceReleaseSemanticParityIssues({
    sessionIdentity: "en/l01/s01",
    ...fixture,
    ...release,
  });

  for (const expected of [
    ":courseSessionId",
    "intro:ru:page=1:pageId",
    "intro:ru:page=1:title",
    "intro:ru:page=1:body",
    "intro:ru:page=1:question.prompt",
    "intro:ru:page=1:question.interactionId",
    "intro:ru:page=1:choices.responseIds",
  ]) {
    assert.ok(issues.some((issue) => issue.includes(expected)), `missing ${expected}\n${issues.join("\n")}`);
  }
  assert.equal(page.question.choicesByLocale.ru.map((choice) => choice.text).join("|"), "ready|busy|done");
});

test("intro correctness uses explicit evaluator authority and accepts a faithful second choice", () => {
  const fixture = sourceFixture();
  fixture.sourceIntroByLocale.ru[0].options = [
    { text: "ready", correct: false },
    { text: "busy", correct: true },
    { text: "done", correct: false },
  ];
  const release = alignedRelease(fixture);
  const check = (releaseIntroCorrectChoiceIndexes) => sourceReleaseSemanticParityIssues({
    sessionIdentity: "en/l01/s01",
    ...fixture,
    ...release,
    releaseIntroCorrectChoiceIndexes,
  });

  const aligned = check([1]);
  assert.equal(aligned.some((issue) => issue.includes("choices.correctIndex")), false, aligned.join("\n"));

  const drifted = check([0]);
  assert.ok(drifted.some((issue) => issue.includes("choices.correctIndex:source=1:release=0")), drifted.join("\n"));
});

test("factory manifest correctness authority is read from the exact lesson and session row", () => {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-manifest-authority-"));
  const courseRoot = path.join(repository, "content/learning-v2-course");
  const manifest = path.join(repository, "modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated.ts");
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  fs.writeFileSync(manifest, `export const rows = [
    { lessonOrdinal: 1, sessionOrdinal: 1, introCorrectChoiceIndexes: Object.freeze([1,0,2]) },
    { lessonOrdinal: 1, sessionOrdinal: 2, introCorrectChoiceIndexes: Object.freeze([0,0,0]) },
  ];`);

  assert.deepEqual(factoryManifestCorrectChoiceIndexes({ root: courseRoot, sessionIdentity: "en/l01/s01" }), {
    indexes: [1, 0, 2],
    issues: [],
  });
});

test("English correctness authority fails closed when the factory manifest is absent", () => {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-manifest-absent-"));
  const result = factoryManifestCorrectChoiceIndexes({
    root: path.join(repository, "content/learning-v2-course"),
    sessionIdentity: "en/l01/s01",
  });
  assert.equal(result.indexes, null);
  assert.ok(result.issues.some((issue) => issue.includes("manifest:file_missing")), result.issues.join("\n"));
});

test("English correctness authority rejects a manifest row shorter than three intro pages", () => {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-manifest-short-"));
  const courseRoot = path.join(repository, "content/learning-v2-course");
  const manifest = path.join(repository, "modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated.ts");
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  fs.writeFileSync(manifest, `{ lessonOrdinal: 1, sessionOrdinal: 1,
    introCorrectChoiceIndexes: Object.freeze([0,1]) }`);

  const result = factoryManifestCorrectChoiceIndexes({ root: courseRoot, sessionIdentity: "en/l01/s01" });
  assert.equal(result.indexes, null);
  assert.ok(result.issues.some((issue) => issue.includes("correct_indexes_length:expected=3:actual=2")), result.issues.join("\n"));
});

for (const fixture of [
  {
    name: "missing exact session row",
    manifestBody: `{ lessonOrdinal: 1, sessionOrdinal: 2,
      introCorrectChoiceIndexes: Object.freeze([0,0,0]) }`,
    expected: "manifest:row_missing",
  },
  {
    name: "overlong index list",
    manifestBody: `{ lessonOrdinal: 1, sessionOrdinal: 1,
      introCorrectChoiceIndexes: Object.freeze([0,1,2,0]) }`,
    expected: "correct_indexes_length:expected=3:actual=4",
  },
  {
    name: "out-of-range index",
    manifestBody: `{ lessonOrdinal: 1, sessionOrdinal: 1,
      introCorrectChoiceIndexes: Object.freeze([0,3,1]) }`,
    expected: "correct_indexes_invalid",
  },
]) {
  test(`English correctness authority fails closed for ${fixture.name}`, () => {
    const repository = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-manifest-invalid-"));
    const courseRoot = path.join(repository, "content/learning-v2-course");
    const manifest = path.join(repository, "modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated.ts");
    fs.mkdirSync(path.dirname(manifest), { recursive: true });
    fs.writeFileSync(manifest, fixture.manifestBody);

    const result = factoryManifestCorrectChoiceIndexes({ root: courseRoot, sessionIdentity: "en/l01/s01" });
    assert.equal(result.indexes, null);
    assert.ok(result.issues.some((issue) => issue.includes(fixture.expected)), result.issues.join("\n"));
  });
}

test("intro structural and accessibility fields plus learner courseSessionId are exact", () => {
  const fixture = sourceFixture();
  const release = alignedRelease(fixture);
  const [page] = release.releaseIntro.pages;
  page.pageOrdinal = 2;
  page.kind = "formula";
  page.question.accessibilityLabelByLocale.ru = "Different accessible question";
  release.releaseIntro.learningOutcomeByLocale.ru = "Different learning outcome";
  release.releaseLearnersByLocale.ru.courseSessionId = "en:lesson-99:session-99";

  const issues = sourceReleaseSemanticParityIssues({
    sessionIdentity: "en/l01/s01",
    ...fixture,
    ...release,
  });

  for (const expected of [
    "intro:ru:page=1:pageOrdinal",
    "intro:ru:page=1:kind",
    "intro:ru:page=1:question.accessibilityLabel",
    "intro:ru:learningOutcome",
    "practice:ru:courseSessionId",
  ]) {
    assert.ok(issues.some((issue) => issue.includes(expected)), `missing ${expected}\n${issues.join("\n")}`);
  }
});

test("aligned interaction ID and family still block a target-only release drift", () => {
  const fixture = sourceFixture();
  const release = alignedRelease(fixture);
  const target = release.releaseLearnersByLocale.ru.interactions[1];
  assert.equal(target.interactionId, fixture.atomicSource.interactionsByLocale.ru[1].interactionId);
  assert.equal(target.family, fixture.atomicSource.interactionsByLocale.ru[1].family);
  target.modePayload.targetPhrase = "I am busy.";

  const issues = sourceReleaseSemanticParityIssues({
    sessionIdentity: "en/l01/s01",
    ...fixture,
    ...release,
  });

  assert.ok(issues.some((issue) => issue.includes(":i02:modePayload.targetPhrase")), issues.join("\n"));
  assert.equal(issues.some((issue) => issue.includes(":i02:family")), false, issues.join("\n"));
  assert.equal(issues.some((issue) => issue.includes(":i02:inputMode")), false, issues.join("\n"));
});

test("source/release check command prints all mismatches and exits non-zero", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-source-release-"));
  const pipeline = path.join(root, "pipeline");
  fs.mkdirSync(pipeline, { recursive: true });
  for (const name of [
    "build_release.mjs",
    "practice_explanations_v1.mjs",
    "owner_quality.mjs",
    "progression_quality_gate.mjs",
    "session_readiness.mjs",
    "session_header.mjs",
    "single_phrase_release.mjs",
    "write_mockup_file.mjs",
  ]) fs.copyFileSync(path.join(HERE, name), path.join(pipeline, name));
  const visibleTextModule = path.resolve(HERE, "../../../modules/learning-v2/content/learner_visible_text_v1.js");
  const fixtureVisibleTextModule = path.join(root, "modules/learning-v2/content/learner_visible_text_v1.js");
  fs.mkdirSync(path.dirname(fixtureVisibleTextModule), { recursive: true });
  fs.copyFileSync(visibleTextModule, fixtureVisibleTextModule);

  const fixture = sourceFixture();
  const release = divergentRelease(fixture);
  const sourceDir = path.join(root, "sessions/en/l01/s01");
  const releaseDir = path.join(root, "release/en/l01/s01");
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.writeFileSync(path.join(sourceDir, "practice.atomic.json"), JSON.stringify(fixture.atomicSource));
  fs.writeFileSync(path.join(sourceDir, "final.ru.md"), `# Test\n\n## Интро 1\n\n### Test\n\nText\n\n**Question**\n\n- ✅ **ready**\n- ❌ busy — *No.*\n- ❌ done — *No.*\n`);
  fs.writeFileSync(path.join(releaseDir, "intro.json"), JSON.stringify(release.releaseIntro));
  fs.writeFileSync(path.join(releaseDir, "learner.json"), JSON.stringify(release.releaseLearnersByLocale.ru));
  fs.writeFileSync(path.join(releaseDir, "answers.json"), JSON.stringify(release.releaseAnswers));

  const run = spawnSync(process.execPath, [
    path.join(pipeline, "build_release.mjs"),
    "--check-source-release",
    "--session", "en/l01/s01",
    "--locales", "ru",
  ], { encoding: "utf8" });
  const output = `${run.stdout}\n${run.stderr}`;

  assert.equal(run.status, 1, output);
  assert.match(output, /source_release_parity:en\/l01\/s01:intro:ru:page=1:choices/u);
  assert.match(output, /source_release_parity:en\/l01\/s01:.*:i01:family/u);
  assert.match(output, /source_release_parity:en\/l01\/s01:.*:i02:release_interaction_missing/u);
  assert.match(output, /source_release_parity:en\/l01\/s01:.*:i03:source_interaction_missing/u);
  assert.match(output, /atomic_markdown_parity:en\/l01\/s01:ru/u);
  assert.match(output, /source\/release semantic parity: BLOCKED \(/u);
});
