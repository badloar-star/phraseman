import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { REQUIRED_JUDGES, judgeIssues, requiredJudgesForSession } from "./session_readiness.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "run.mjs"), "utf8");
// Exercise the real orchestration body; replace external stages, never invoke a model.
const mainSource = source.slice(source.indexOf("async function main() {"), source.lastIndexOf("\nif (process.argv[1]")) + "\nmain();";
const pass = () => Object.fromEntries([...REQUIRED_JUDGES, "judge_taste"].map((role) => [role, { verdict: "PASS" }]));

async function exercise(finalVerdicts, brokenTasks = [], initial = pass(), localeResults = { uk: "PASS" }, session = "en/l02/s33") {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, "learning-v2-full-"));
  try {
    const draft = path.join(dir, "draft.ru.md"); fs.writeFileSync(draft, "draft");
    let judging = 0; let localized = 0; let built = 0;
    let admissionCalls = 0;
    const scope = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/u.exec(session);
    const context = {
      cmd: "full", SESSION: session, HERE: here, ROOT: path.dirname(here),
      REPO_ROOT: path.resolve(here, "../../.."), DESKTOP_CODEX_ROOT: path.join(dir, "DesktopCodex"),
      LOCALES: ["uk"],
      CURRENT_AUTHORING_ADMISSION: null, CURRENT_AUTHORING_SOURCE_SNAPSHOTS: null,
      APPROVED_ENGLISH_PLAN_SHA256: "test-plan",
      fs, path, process: { execPath: process.execPath },
      LOG: () => {}, WARN: () => {}, opt: (_name, fallback) => fallback,
      parseSession: () => ({ lang: scope[1], lesson: Number(scope[2]), session: Number(scope[3]), dir }),
      loadPlan: () => ({ arc: "test", rows: new Map([[Number(scope[3]), { n: Number(scope[3]), type: "новая", grammar: "Who is", words: "host", moment: "test", scene: "test scene" }]]) }),
      knownBefore: () => ({ ops: [], words: [] }), courseContext: () => ({}),
      stageDraft: () => [draft], machineFacts: () => "", HARD_FACT_RE: /never-a-fact/,
      stageJudge: () => ({ judge_taste: initial.judge_taste }),
      stageJudgeStable: () => judging++ === 0 ? initial : finalVerdicts,
      score: () => 10, RANK: { PASS: 2, REVISE: 1, BLOCK: 0 },
      stageEdit: () => { throw new Error("unexpected edit"); },
      checkSingleAnswer: () => brokenTasks,
      stageLocalize: () => { localized++; return localeResults; },
      spawnSync: () => { built++; return { status: 0, stdout: "", stderr: "" }; },
      exists: fs.existsSync, read: (file) => fs.readFileSync(file, "utf8"),
      write: (file, text) => fs.writeFileSync(file, text), judgeIssues, requiredJudgesForSession, REQUIRED_JUDGES,
      writeBoundStatus: (_S, value) => fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify(value)),
      acquirePreauthoringSessionLock: () => ({ release: () => {} }),
      captureMandatoryAuthoringSources: () => ({ issues: [], digests: {}, snapshots: new Map(), files: {} }),
      runEnglishBlueprintIntegrityGate: () => ({ status: 0, stdout: "PASS", stderr: "" }),
      buildAuthoringAdmission: () => {
        admissionCalls += 1;
        return { ready: true, issues: [], packet: { blueprintFingerprint: "test", curriculumRowSha256: "test" } };
      },
      requirePreJudgeChoreography: () => ({ session }),
    };
    await vm.runInNewContext(mainSource, context, { timeout: 1000 });
    return { localized, built, admissionCalls, status: JSON.parse(fs.readFileSync(path.join(dir, "status.json"), "utf8")) };
  } finally {
    assert.equal(path.dirname(dir), parent);
    assert.ok(path.basename(dir).startsWith("learning-v2-full-"));
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("full uses automatic admission without consulting prior release readiness", async () => {
  const progressionPass = { ...pass(), judge_progression: { verdict: "PASS" } };
  const result = await exercise(progressionPass, [], progressionPass, { uk: "BLOCK" }, "en/l03/s27");
  assert.equal(result.admissionCalls, 1);
});

for (const role of REQUIRED_JUDGES) test(`final ${role} BLOCK stops before localization or build`, async () => {
  const final = pass(); final[role] = { verdict: "BLOCK" };
  const result = await exercise(final);
  assert.equal(result.localized, 0); assert.equal(result.built, 0);
  assert.equal(result.status.needsHumanReview, true);
});

test("final REVISE and missing review cannot pass by aggregate score", async () => {
  for (const verdict of ["REVISE", undefined]) {
    const final = pass(); final.judge_reader = verdict ? { verdict } : undefined;
    const result = await exercise(final); assert.equal(result.localized, 0); assert.equal(result.built, 0);
  }
});

test("ambiguous final exercise stops before localization", async () => {
  const result = await exercise(pass(), ["task has two answers"]);
  assert.equal(result.localized, 0); assert.equal(result.built, 0);
});

test("owner-scoped final taste BLOCK stops before localization", async () => {
  const final = pass(); final.judge_taste = { verdict: "BLOCK" };
  const result = await exercise(final, [], pass());
  assert.equal(result.localized, 0); assert.equal(result.built, 0);
  assert.equal(result.status.needsHumanReview, true);
});

test("frozen historical session retains the four ordinary PASS threshold", async () => {
  const final = pass(); final.judge_taste = { verdict: "BLOCK" };
  const result = await exercise(final, [], final, { uk: "PASS" }, "en/l02/s32");
  assert.equal(result.localized, 1); assert.equal(result.built, 2);
  assert.equal(result.status.needsHumanReview, false);
});

test("unreviewed or rejected localization cannot trigger build", async () => {
  for (const verdict of ["REVISE", "BLOCK", "FIXED", undefined]) {
    const result = await exercise(pass(), [], pass(), verdict ? { uk: verdict } : {});
    assert.equal(result.localized, 1); assert.equal(result.built, 0);
    assert.equal(result.status.needsHumanReview, true);
  }
});
