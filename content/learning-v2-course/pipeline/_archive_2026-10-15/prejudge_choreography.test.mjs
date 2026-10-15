import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { firstMarkdownAtomicLearnerMismatch, parseHeader } from "./build_release.mjs";
import { authoringPlanProjectionIssues, inspectPreJudgeChoreography } from "./prejudge_choreography.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COURSE_ROOT = path.resolve(HERE, "..");
const S10_DIR = path.join(COURSE_ROOT, "sessions", "en", "l04", "s10");

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-singular-word-"));
  for (const name of ["final.ru.md", "final.uk.md", "practice.atomic.json"]) {
    fs.copyFileSync(path.join(S10_DIR, name), path.join(dir, name));
  }
  return dir;
}

test("a singular Russian new-word header is parsed and cannot bypass word-first choreography", () => {
  const dir = fixture();
  try {
    const source = fs.readFileSync(path.join(dir, "final.ru.md"), "utf8")
      .replace("**Новое слово:** hotel", "**Новое слово:** syntheticword");
    fs.writeFileSync(path.join(dir, "final.ru.md"), source);

    const result = inspectPreJudgeChoreography({ sessionIdentity: "en/l04/s10", sessionDir: dir });

    assert.deepEqual(result.newWords, ["syntheticword"]);
    assert.equal(result.verdict, "HOLD");
    assert.equal(result.verdict, "HOLD");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a singular Ukrainian new-word header is parsed", () => {
  const dir = fixture();
  try {
    const ruSource = fs.readFileSync(path.join(dir, "final.ru.md"), "utf8")
      .replace("**Новое слово:** hotel", "**Нове слово:** platform");
    const result = inspectPreJudgeChoreography({
      sessionIdentity: "en/l04/s10",
      sessionDir: dir,
      judgedSource: ruSource,
    });

    assert.deepEqual(result.newWords, ["platform"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("release header preserves singular and plural new-word declarations", () => {
  const singular = parseHeader("**Сцена сессии.** Только сцена.\n**Операция:** не сцена\n**Новое слово:** hotel");
  assert.equal(singular.scene, "Только сцена.");
  assert.deepEqual(singular.newWords, ["hotel"]);
  assert.deepEqual(parseHeader("**Нове слово:** tram").newWords, ["tram"]);
  assert.deepEqual(parseHeader("**Новые слова:** bank, clinic").newWords, ["bank", "clinic"]);
});

test("atomic parity rejects missing wrong-choice feedback and builder token drift", () => {
  const choiceTask = {
    family: "listen_choose", audio: "hotel",
    options: [{ text: "hotel", correct: true, feedback: "" }, { text: "hospital", correct: false, feedback: "Не больница." }],
    optionMeanings: {},
  };
  const choiceInteraction = {
    interactionId: "en:lesson-04:session-10:i01",
    responseOptions: [
      { responseId: "en:lesson-04:session-10:i01:r1", text: "hotel" },
      { responseId: "en:lesson-04:session-10:i01:r2", text: "hospital" },
    ],
    modePayload: {
      referenceAudio: { transcript: "hotel" }, isWordCard: false,
      localizedMeaningChoices: [
        { responseId: "en:lesson-04:session-10:i01:r1", targetText: "hotel", meaningByLocale: null },
        { responseId: "en:lesson-04:session-10:i01:r2", targetText: "hospital", meaningByLocale: null },
      ],
      choiceFeedback: [],
    },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(choiceTask, choiceInteraction, "ru"), "modePayload.choiceFeedback");

  const builderTask = { family: "phrase_builder", target: "Is there a hotel?", tokens: ["Is", "there", "a", "hotel", "There"] };
  const builderInteraction = {
    responseOptions: [],
    modePayload: { targetPhrase: "Is there a hotel?", orderedTokens: ["Is", "there", "hotel"], authoredDistractorTokens: [] },
  };
  assert.equal(firstMarkdownAtomicLearnerMismatch(builderTask, builderInteraction, "ru"), "modePayload.orderedTokens");
});

test("a preauthoring plan cannot claim one tile-free final while projecting a revealed six-step chain", () => {
  const result = authoringPlanProjectionIssues({
    guardian: {
      authoringPlan: {
        taskCount: 17,
        requiredIndependentFinal: "task 17 has no ready-made complete target phrase and no answer tiles before response",
      },
    },
    atomicSource: {
      interactionsByLocale: {
        ru: [
          ...Array.from({ length: 16 }, (_, index) => ({ interactionId: `en:lesson-03:session-43:i${index + 1}` })),
          { interactionId: "en:lesson-03:session-43:i17:s01", family: "scripted_repeat_compare" },
          { interactionId: "en:lesson-03:session-43:i17:s02", family: "phrase_builder" },
        ],
      },
    },
  });
  assert.deepEqual(result, [
    "authoring_plan_task_count:ru:planned=17:actual=18",
    "authoring_plan_final_shape:ru:expected_one_i17:actual=2",
  ]);
});
