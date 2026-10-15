import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "run.mjs"), "utf8");

test("authoring entry no longer depends on lifecycle or guardian receipt state", () => {
  assert.doesNotMatch(source, /trustedPreauthoringHostEpoch/u);
  assert.doesNotMatch(source, /readPreauthoringRunBinding/u);
  assert.doesNotMatch(source, /persistPreauthoringRunBinding/u);
  assert.doesNotMatch(source, /requirePreauthoringReceipt/u);
  assert.doesNotMatch(source, /\.preauthoring-preflight\.json/u);
});

test("automatic admission retains one writer lock and the full code-owned source snapshot", () => {
  assert.match(source, /acquirePreauthoringSessionLock\(SESSION\)/u);
  assert.match(source, /captureMandatoryAuthoringSources\(\{/u);
  assert.match(source, /CURRENT_AUTHORING_SOURCE_SNAPSHOTS = mandatorySources\.snapshots/u);
  assert.match(source, /finally \{[\s\S]*releaseAuthoringLock\(\)/u);
});

test("prior quality evidence is admitted separately from deferred publication gates", () => {
  assert.match(source, /buildAuthoringAdmission\(\{/u);
  assert.doesNotMatch(source, /sessionReadiness\(dir, \["uk"\]/u);
  assert.doesNotMatch(source, /priorRangeReady/u);
});
