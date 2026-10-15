import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const judges = ["learner", "pedagogy", "nonsense", "reader"];

function accepted(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const session = dir.replace(/\\/gu, "/").match(/\/sessions\/([a-z]{2}\/l\d{2}\/s\d{2})$/iu)?.[1];
  if (!session) throw new Error(`fixture path must end with sessions/<lang>/lNN/sNN: ${dir}`);
  const source = "master source";
  const localizedSource = "localized master source";
  fs.writeFileSync(path.join(dir, "final.ru.md"), source);
  fs.writeFileSync(path.join(dir, "final.uk.md"), localizedSource);
  fs.writeFileSync(path.join(dir, "practice.atomic.json"), "{}\n");
  const digest = (name) => crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, name))).digest("hex");
  const ru = digest("final.ru.md");
  const uk = digest("final.uk.md");
  const atomic = digest("practice.atomic.json");
  const bindings = { sourceSha256: ru, exactRuSha256: ru, exactUkSha256: uk, localeSha256: uk, practiceAtomicSha256: atomic };
  const evidence = (role, locale, quote, extraCoverage = []) => ({ fieldPath: `final.${locale}.md`, quote, analysis: "Exact quote verifies the current session requirement.", coverage: [role, ...extraCoverage] });
  const identity = (role) => ({ session, sessionId: session, role, reviewer: `learning-v2-reviewer-v1|reviewerId=pipeline-${role}|sessionId=${session}|role=${role}` });
  for (const role of judges) fs.writeFileSync(path.join(dir, `final.judge_${role}.json`), JSON.stringify({
    verdict: "PASS",
    evidence: [evidence(`judge_${role}`, "ru", source)],
    ...identity(`judge_${role}`),
    ...bindings,
  }));
  fs.writeFileSync(path.join(dir, "final.judge_taste.json"), JSON.stringify({
    ...bindings,
    ...identity("judge_taste"),
    evidence: [evidence("judge_taste", "ru", source)],
    pairwise: "equal",
    pairwise_reason: "The source was compared with the reference for clarity, voice, and teaching value.",
    voice: { score: 4, evidence: [source] },
    humor: { present: true, on_topic: true, examples: ["«master source» is the cited source phrase used by this fixture."], misfires: [] },
    ai_text_or_nonsense: [], must_fix: [], verdict: "PASS",
    verdict_reason: "The fixture records a complete independent taste decision.",
  }));
  fs.writeFileSync(path.join(dir, "locales.judge.json"), JSON.stringify({ sourceSha256: ru, exactRuSha256: ru, exactUkSha256: uk, localeHashes: { ru, uk }, practiceAtomicSha256: atomic, ...identity("judge_locales"), evidence: [evidence("judge_locales", "ru", source, ["ru"]), evidence("judge_locales", "uk", localizedSource, ["uk"])], locales: { uk: { verdict: "PASS" } } }));
  fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify({ sourceSha256: ru, exactRuSha256: ru, exactUkSha256: uk, localeHashes: { ru, uk }, practiceAtomicSha256: atomic, converged: true, needsHumanReview: false }));
}

function withFactory(fn) {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, "learning-v2-batch-"));
  try {
    fs.mkdirSync(path.join(root, "pipeline"));
    for (const name of ["run_batch.mjs", "session_readiness.mjs", "owner_quality.mjs"]) {
      if (fs.existsSync(path.join(here, name))) fs.copyFileSync(path.join(here, name), path.join(root, "pipeline", name));
    }
    const common = `import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; const root=${JSON.stringify(root)}; const args=process.argv.slice(2); const id=args[args.indexOf('--session')+1];`;
    fs.writeFileSync(path.join(root, "pipeline/run.mjs"), common + `fs.appendFileSync(path.join(root,'events'), 'run '+id+${JSON.stringify(String.fromCharCode(10))}); (${accepted.toString().replace("for (const role of judges)", `for (const role of ${JSON.stringify(judges)})`)})(path.join(root,'sessions',id));`);
    for (const script of ["build_release.mjs", "build_mockup.mjs"]) fs.writeFileSync(path.join(root, "pipeline", script), common + `fs.appendFileSync(path.join(root,'events'), '${script} '+id+${JSON.stringify(String.fromCharCode(10))});`);
    const run = (from, count = 1) => spawnSync(process.execPath, [path.join(root, "pipeline/run_batch.mjs"), "--from", from, "--count", String(count), "--backend", "mock"], { encoding: "utf8" });
    fn({ root, run, events: () => fs.existsSync(path.join(root, "events")) ? fs.readFileSync(path.join(root, "events"), "utf8") : "" });
  } finally {
    assert.equal(path.dirname(root), parent);
    assert.ok(path.basename(root).startsWith("learning-v2-batch-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("existing unfinished master stops before touching the next session", () => withFactory(({ root, run, events }) => {
  const dir = path.join(root, "sessions/en/l02/s33");
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "final.ru.md"), "unfinished");
  assert.equal(run("en/l02/s33", 2).status, 1);
  assert.equal(events(), "");
  assert.equal(fs.readFileSync(path.join(dir, "final.ru.md"), "utf8"), "unfinished");
}));

test("accepted session can be skipped without invoking generation", () => withFactory(({ root, run, events }) => {
  accepted(path.join(root, "sessions/en/l02/s33"));
  assert.equal(run("en/l02/s33").status, 0);
  assert.equal(events(), "");
}));

for (const defect of ["missingJudge", "blockedJudge", "staleJudge", "missingLocale", "badLocale", "unresolvedStatus", "nullStatus", "emptyStatus", "partialStatus", "wrongTypeStatus"]) {
  test(`existing master is not accepted with ${defect}`, () => withFactory(({ root, run, events }) => {
    const dir = path.join(root, "sessions/en/l02/s33"); accepted(dir);
    const judge = path.join(dir, "final.judge_reader.json");
    if (defect === "missingJudge") fs.unlinkSync(judge);
    if (defect === "blockedJudge") fs.writeFileSync(judge, '{"verdict":"BLOCK"}');
    if (defect === "staleJudge") fs.utimesSync(judge, new Date(0), new Date(0));
    if (defect === "missingLocale") fs.unlinkSync(path.join(dir, "final.uk.md"));
    if (defect === "badLocale") fs.writeFileSync(path.join(dir, "locales.judge.json"), '{"locales":{"uk":{"verdict":"REVISE"}}}');
    if (defect === "unresolvedStatus") fs.writeFileSync(path.join(dir, "status.json"), '{"needsHumanReview":true,"brokenTasks":["ambiguous"]}');
    if (defect === "nullStatus") fs.writeFileSync(path.join(dir, "status.json"), 'null');
    if (defect === "emptyStatus") fs.writeFileSync(path.join(dir, "status.json"), '{}');
    if (defect === "partialStatus") fs.writeFileSync(path.join(dir, "status.json"), '{"converged":true}');
    if (defect === "wrongTypeStatus") fs.writeFileSync(path.join(dir, "status.json"), '{"converged":1,"needsHumanReview":0}');
    assert.equal(run("en/l02/s33").status, 1);
    assert.equal(events(), "");
  }));
}

test("batch rolls over from session56 to next lesson session01", () => withFactory(({ run, events }) => {
  const result = run("en/l02/s56", 2);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(events(), /run en\/l02\/s56\n/);
  assert.match(events(), /run en\/l03\/s01\n/);
  assert.doesNotMatch(events(), /s57/);
}));

test("invalid ranges cannot invoke generation", () => withFactory(({ run, events }) => {
  for (const [from, count] of [["en/l32/s56", 2], ["en/l02/s57", 1], ["en/l00/s01", 1], ["en/l02/s01", 0]]) assert.equal(run(from, count).status, 2);
  assert.equal(events(), "");
}));
