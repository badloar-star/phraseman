import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = new URL("./audit_selectable_feedback.mjs", import.meta.url);
const scriptPath = fileURLToPath(script);
const courseRoot = path.dirname(path.dirname(scriptPath));
const sid = "en:lesson-01:session-36";
const scope = "en/l01/s36";
const practiceId = `${sid}:i01`;

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeWrongOnlyFixture(root, { practiceAnswer = "valid" } = {}) {
  const session = path.join(root, "sessions", ...scope.split("/"));
  fs.mkdirSync(session, { recursive: true });
  for (const locale of ["ru", "uk"]) fs.writeFileSync(path.join(session, `final.${locale}.md`), [
    "## Интро 1", "", "### Проверка", "", "Текст.", "", "**Выберите.**", "",
    "- ✅ **We are colleagues.**",
    `- ❌ We colleagues. — *${locale}-wrong-1*`,
    `- ❌ We is colleagues. — *${locale}-wrong-2*`, "",
  ].join("\n"));

  const responseOptions = [
    { responseId: `${practiceId}:r1`, text: "am" },
    { responseId: `${practiceId}:r2`, text: "are" },
    { responseId: `${practiceId}:r3`, text: "is" },
  ];
  const choiceFeedback = responseOptions.slice(1).map((option) => ({
    responseId: option.responseId,
    correct: false,
    feedbackByLocale: { ru: `ru-${option.text}`, uk: `uk-${option.text}` },
  }));
  const practice = {
    interactionId: practiceId,
    inputMode: "single_choice",
    responseOptions,
    modePayload: { choiceFeedback },
  };
  const answers = practiceAnswer === "missing" ? [] : practiceAnswer === "ambiguous"
    ? [
      { interactionId: practiceId, correctResponseId: `${practiceId}:r1` },
      { interactionId: practiceId, correctResponseId: `${practiceId}:r2` },
    ]
    : [{ interactionId: practiceId, correctResponseId: `${practiceId}:r1` }];
  writeJson(path.join(session, "practice.atomic.json"), {
    interactionsByLocale: { ru: [practice], uk: [practice] },
    answers,
  });

  const intro = { courseSessionId: sid, pages: [{ question: {
    interactionId: `${sid}:intro1:q`,
    choicesByLocale: { ru: [
      { responseId: `${sid}:intro1:r1`, text: "We are colleagues." },
      { responseId: `${sid}:intro1:r2`, text: "We colleagues." },
      { responseId: `${sid}:intro1:r3`, text: "We is colleagues." },
    ] },
  } }] };
  const auxiliary = { entries: [{ interactionId: `${sid}:intro1:q`, responseFeedbackById: {
    [`${sid}:intro1:r2`]: { ru: "ru-wrong-1", uk: "uk-wrong-1" },
    [`${sid}:intro1:r3`]: { ru: "ru-wrong-2", uk: "uk-wrong-2" },
  } }] };
  for (const base of ["release/en/l01/s36", "mockup/reviewed-source/en/l01/s36"]) {
    writeJson(path.join(root, base, "intro.json"), intro);
    writeJson(path.join(root, base, "auxiliary.json"), auxiliary);
    writeJson(path.join(root, base, "learner.json"), { interactions: [practice] });
    writeJson(path.join(root, base, "answers.json"), answers);
  }
}

function runAudit(root, requestedScope = "") {
  const args = [scriptPath, "--root", root, "--json"];
  if (requestedScope) args.push("--scope", requestedScope);
  const run = spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  return { run, report: JSON.parse(run.stdout) };
}

test("corpus audit CLI runs when its script path enters through a directory junction", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-feedback-junction-"));
  try {
    const alias = path.join(temp, "course-alias");
    fs.symlinkSync(courseRoot, alias, process.platform === "win32" ? "junction" : "dir");
    const emptyRoot = path.join(temp, "empty-root");
    fs.mkdirSync(emptyRoot);
    const aliasedScript = path.join(alias, "pipeline", "audit_selectable_feedback.mjs");
    const run = spawnSync(process.execPath, [aliasedScript, "--root", emptyRoot, "--json"], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.deepEqual(JSON.parse(run.stdout), {
      scope: "all",
      countsByCategory: { source: 0, release: 0, mockup: 0 },
      issueCount: 0,
      issues: [],
    });
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("wrong-only intro and practice feedback is accepted across source, release, and mockup", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-feedback-wrong-only-"));
  try {
    writeWrongOnlyFixture(root);
    const { run, report } = runAudit(root, scope);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.deepEqual(report.countsByCategory, { source: 0, release: 0, mockup: 0 });
    assert.deepEqual(report.issues, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("omitted wrong-answer feedback remains a HOLD in every audited layer", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-feedback-missing-wrong-"));
  try {
    writeWrongOnlyFixture(root);
    for (const base of ["release/en/l01/s36", "mockup/reviewed-source/en/l01/s36"]) {
      const auxiliaryFile = path.join(root, base, "auxiliary.json");
      const auxiliary = JSON.parse(fs.readFileSync(auxiliaryFile, "utf8"));
      delete auxiliary.entries[0].responseFeedbackById[`${sid}:intro1:r3`];
      writeJson(auxiliaryFile, auxiliary);
      const learnerFile = path.join(root, base, "learner.json");
      const learner = JSON.parse(fs.readFileSync(learnerFile, "utf8"));
      learner.interactions[0].modePayload.choiceFeedback = learner.interactions[0].modePayload.choiceFeedback
        .filter((row) => row.responseId !== `${practiceId}:r3`);
      writeJson(learnerFile, learner);
    }
    const atomicFile = path.join(root, "sessions/en/l01/s36/practice.atomic.json");
    const atomic = JSON.parse(fs.readFileSync(atomicFile, "utf8"));
    for (const locale of ["ru", "uk"]) atomic.interactionsByLocale[locale][0].modePayload.choiceFeedback =
      atomic.interactionsByLocale[locale][0].modePayload.choiceFeedback.filter((row) => row.responseId !== `${practiceId}:r3`);
    writeJson(atomicFile, atomic);

    const { run, report } = runAudit(root, scope);
    assert.equal(run.status, 1, run.stderr || run.stdout);
    assert.deepEqual(report.countsByCategory, { source: 2, release: 2, mockup: 2 });
    assert.ok(report.issues.every((row) => row.reason === "feedback_missing"));
    assert.ok(report.issues.some((row) => row.responseId === `${sid}:intro1:r3`));
    assert.ok(report.issues.some((row) => row.responseId === `${practiceId}:r3`));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("release and mockup reject feedback maps that target a correct response", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-feedback-correct-target-"));
  try {
    writeWrongOnlyFixture(root);
    for (const base of ["release/en/l01/s36", "mockup/reviewed-source/en/l01/s36"]) {
      const auxiliaryFile = path.join(root, base, "auxiliary.json");
      const auxiliary = JSON.parse(fs.readFileSync(auxiliaryFile, "utf8"));
      auxiliary.entries[0].responseFeedbackById[`${sid}:intro1:r1`] = { ru: "ru-correct", uk: "uk-correct" };
      writeJson(auxiliaryFile, auxiliary);
      const learnerFile = path.join(root, base, "learner.json");
      const learner = JSON.parse(fs.readFileSync(learnerFile, "utf8"));
      learner.interactions[0].modePayload.choiceFeedback.unshift({
        responseId: `${practiceId}:r1`, correct: true, feedbackByLocale: { ru: "ru-correct", uk: "uk-correct" },
      });
      writeJson(learnerFile, learner);
    }

    const { run, report } = runAudit(root, scope);
    assert.equal(run.status, 1, run.stderr || run.stdout);
    assert.deepEqual(report.countsByCategory, { source: 0, release: 2, mockup: 2 });
    assert.ok(report.issues.every((row) => row.reason === "feedback_target_invalid"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("missing or ambiguous answer correctness fails closed as its own issue", () => {
  for (const answerState of ["missing", "ambiguous"]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `learning-v2-feedback-${answerState}-answer-`));
    try {
      writeWrongOnlyFixture(root, { practiceAnswer: answerState });
      const { run, report } = runAudit(root, scope);
      assert.equal(run.status, 1, run.stderr || run.stdout);
      assert.ok(report.issues.length > 0);
      assert.ok(report.issues.every((row) => row.reason === `answer_correctness_${answerState}`));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test("current corpus retains the 666 known release wrong-answer feedback holds", { timeout: 120_000 }, () => {
  const { run, report } = runAudit(courseRoot);
  assert.equal(run.status, 1, "the corpus must remain HOLD while wrong-answer feedback is missing");
  assert.equal(report.issues.filter((row) => row.category === "release" && row.reason === "feedback_missing").length, 666);
  assert.ok(report.countsByCategory.release >= 666);
});
