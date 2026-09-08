import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { REQUIRED_JUDGES, judgeIssues } from "./session_readiness.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "run.mjs"), "utf8");
// Exercise the real orchestration body; replace external stages, never invoke a model.
const mainSource = source.slice(source.indexOf("function main() {"), source.lastIndexOf("\nmain();")) + "\nmain();";
const pass = () => Object.fromEntries([...REQUIRED_JUDGES, "judge_taste"].map((role) => [role, { verdict: "PASS" }]));

function exercise(finalVerdicts, brokenTasks = [], initial = pass(), localeResults = { uk: "PASS" }) {
  const parent = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(parent, "learning-v2-full-"));
  try {
    const draft = path.join(dir, "draft.ru.md"); fs.writeFileSync(draft, "draft");
    let judging = 0; let localized = 0; let built = 0;
    const context = {
      cmd: "full", SESSION: "en/l02/s33", HERE: here, ROOT: path.dirname(here),
      LOCALES: ["uk"],
      fs, path, process: { execPath: process.execPath },
      LOG: () => {}, WARN: () => {}, opt: (_name, fallback) => fallback,
      parseSession: () => ({ lang: "en", lesson: 2, session: 33, dir }),
      loadPlan: () => ({ rows: new Map([[33, { type: "новая", grammar: "Who is", words: "host" }]]) }),
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
      write: (file, text) => fs.writeFileSync(file, text), judgeIssues, REQUIRED_JUDGES,
    };
    vm.runInNewContext(mainSource, context, { timeout: 1000 });
    return { localized, built, status: JSON.parse(fs.readFileSync(path.join(dir, "status.json"), "utf8")) };
  } finally {
    assert.equal(path.dirname(dir), parent);
    assert.ok(path.basename(dir).startsWith("learning-v2-full-"));
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

for (const role of REQUIRED_JUDGES) test(`final ${role} BLOCK stops before localization or build`, () => {
  const final = pass(); final[role] = { verdict: "BLOCK" };
  const result = exercise(final);
  assert.equal(result.localized, 0); assert.equal(result.built, 0);
  assert.equal(result.status.needsHumanReview, true);
});

test("final REVISE and missing review cannot pass by aggregate score", () => {
  for (const verdict of ["REVISE", undefined]) {
    const final = pass(); final.judge_reader = verdict ? { verdict } : undefined;
    const result = exercise(final); assert.equal(result.localized, 0); assert.equal(result.built, 0);
  }
});

test("ambiguous final exercise stops before localization", () => {
  const result = exercise(pass(), ["task has two answers"]);
  assert.equal(result.localized, 0); assert.equal(result.built, 0);
});

test("four PASS suffice even when advisory taste says BLOCK", () => {
  const final = pass(); final.judge_taste = { verdict: "BLOCK" };
  const result = exercise(final, [], final);
  assert.equal(result.localized, 1); assert.equal(result.built, 2);
  assert.equal(result.status.needsHumanReview, false);
});

test("unreviewed or rejected localization cannot trigger build", () => {
  for (const verdict of ["REVISE", "BLOCK", "FIXED", undefined]) {
    const result = exercise(pass(), [], pass(), verdict ? { uk: verdict } : {});
    assert.equal(result.localized, 1); assert.equal(result.built, 0);
    assert.equal(result.status.needsHumanReview, true);
  }
});
