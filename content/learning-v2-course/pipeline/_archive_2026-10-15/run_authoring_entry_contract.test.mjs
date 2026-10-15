import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { exemplarKeyForBlueprintRole } from "./run.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "run.mjs"), "utf8");

test("draft edit and full use automatic admission without manual guardian lifecycle state", () => {
  assert.match(source, /buildAuthoringAdmission/u);
  assert.match(source, /acquirePreauthoringSessionLock/u);
  assert.doesNotMatch(source, /requirePreauthoringReceipt/u);
  assert.doesNotMatch(source, /trustedPreauthoringHostEpoch/u);
  assert.doesNotMatch(source, /readPreauthoringRunBinding/u);
  assert.doesNotMatch(source, /persistPreauthoringRunBinding/u);
  assert.doesNotMatch(source, /priorRangeIssues/u);
  assert.doesNotMatch(source, /sessionReadiness\(dir, \["uk"\]/u);
});

test("author prompt receives automatic content-bound admission instead of preauthoring.json", () => {
  assert.doesNotMatch(source, /preauthoring\.json/u);
  assert.match(source, /АВТОМАТИЧЕСКИЙ_ПАКЕТ_ДОПУСКА/u);
  assert.match(source, /CURRENT_AUTHORING_ADMISSION/u);
});

test("mandatory source bytes are captured under lock before plan context and prompt reads", () => {
  const mainStart = source.indexOf("async function main() {");
  const mainSource = source.slice(mainStart);
  const lockIndex = mainSource.indexOf("acquirePreauthoringSessionLock(SESSION)");
  const captureIndex = mainSource.indexOf("captureMandatoryAuthoringSources({");
  const planIndex = mainSource.indexOf("const plan = loadPlan(");
  const contextIndex = mainSource.indexOf("const ctx = courseContext(");

  assert.ok(lockIndex >= 0 && lockIndex < captureIndex);
  assert.ok(captureIndex < planIndex && planIndex < contextIndex);
  assert.match(source, /CURRENT_AUTHORING_SOURCE_SNAPSHOTS\?\.has\(resolved\)/u);
  assert.match(source, /CURRENT_AUTHORING_SOURCE_INVENTORY/u);
  assert.match(source, /unbound protected source read/u);
  assert.doesNotMatch(mainSource, /contentPaths:/u);
});

test("failed automatic admission unwinds through finally and releases the session lock", () => {
  const admissionStart = source.indexOf("if (authoringCommand) {");
  const finallyStart = source.indexOf("} finally {", admissionStart);
  const admissionScope = source.slice(
    admissionStart,
    source.indexOf("CURRENT_AUTHORING_ADMISSION = admission.packet", admissionStart),
  );
  const finallyScope = source.slice(finallyStart, source.indexOf("\n  }\n}", finallyStart));

  assert.match(admissionScope, /if \(!admission\.ready\)[\s\S]*throw new Error/u);
  assert.doesNotMatch(admissionScope, /process\.exit\(/u);
  assert.match(finallyScope, /releaseAuthoringLock\(\)/u);

  const run = () => spawnSync(process.execPath, [
    path.join(here, "run.mjs"),
    "preflight",
    "--session",
    "fr/l01/s01",
    "--backend",
    "disabled",
  ], { encoding: "utf8" });
  const first = run();
  const second = run();
  for (const result of [first, second]) {
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    assert.equal(result.status, 1);
    assert.match(output, /unbound protected source read/u);
    assert.doesNotMatch(output, /session lock is already held/u);
  }
});

test("invalid S99 preflight releases its real lock so an immediate retry reaches the same row error", () => {
  const run = () => spawnSync(process.execPath, [
    path.join(here, "run.mjs"),
    "preflight",
    "--session",
    "en/l01/s99",
    "--backend",
    "disabled",
  ], { encoding: "utf8" });
  const first = run();
  const second = run();
  for (const result of [first, second]) {
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    assert.equal(result.status, 1);
    assert.match(output, /нет сессии 99/u);
    assert.doesNotMatch(output, /session lock is already held/u);
  }
});

test("authoring derives its working row and prerequisite knowledge from the exact blueprint packet", () => {
  assert.match(source, /runEnglishBlueprintIntegrityGate\(REPO_ROOT, SESSION\)/u);
  assert.match(source, /collectAcceptedPrefixPrerequisiteCoverage\(\{/u);
  assert.match(source, /row = admission\.packet\.authoritativeRow/u);
  assert.match(source, /known = admission\.packet\.authoritativeKnown/u);
  assert.match(source, /CURRENT_AUTHORING_ADMISSION\.authoritativePlan\.arc/u);
  assert.match(source, /CURRENT_AUTHORING_ADMISSION\s*\?\s*"\(exact blueprint packet is authoritative/u);
});

test("every exact blueprint role has an explicit exemplar mapping", () => {
  assert.deepEqual(
    Object.fromEntries([
      "introduce_grammar",
      "introduce_or_guided_extension",
      "introduce_or_diagnostic_contrast",
      "guided_application",
      "diagnostic_repair",
      "listening_retrieval",
      "spoken_production",
      "checkpoint",
    ].map((role) => [role, exemplarKeyForBlueprintRole(role)])),
    {
      introduce_grammar: "l01_s01",
      introduce_or_guided_extension: "l01_s02",
      introduce_or_diagnostic_contrast: "l01_s03",
      guided_application: "l01_s02",
      diagnostic_repair: "l01_s03",
      listening_retrieval: "l01_s02",
      spoken_production: "l01_s02",
      checkpoint: "l01_s02",
    },
  );
  assert.throws(() => exemplarKeyForBlueprintRole("unmapped_role"), /blueprint_role_exemplar_missing/u);
});
