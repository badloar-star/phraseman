import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "docs/v2/curriculum/de/TASK7_V2_L01C06_HAUSMEISTER_SCOPE_EVIDENCE_MANIFEST_2026-10-13.json");
const GUARD = path.join(ROOT, "scripts/guard_learning_v2_de_task7_v2_l01_c06_hausmeister_scope.mjs");

assert.equal(fs.existsSync(MANIFEST), true, "Hausmeister scope manifest must exist");
assert.equal(fs.existsSync(GUARD), true, "Hausmeister scope guard must exist");

type ScopeManifest = {
  allowlist: readonly string[];
  protectedRoots: readonly string[];
  hashes: Record<string, string>;
  gitDiffCheckExemptPaths: readonly string[];
  statusSnapshot: { scopedStatus: string; unrelatedStatusSha256: string; unrelatedPathCount: number };
};

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8")) as ScopeManifest;
assert.equal(manifest.allowlist.length, 8);
assert.deepEqual([...manifest.allowlist].sort(), Object.keys(manifest.hashes).sort());
assert.deepEqual(manifest.gitDiffCheckExemptPaths, [
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_hausmeister_source_hold_v1/raw/de_lex_plan_l01_c06_hausmeister_v1.html",
]);
for (const relativePath of manifest.allowlist) {
  assert.match(relativePath, /hausmeister|HAUSMEISTER/u);
  assert.equal(sha256(path.join(ROOT, relativePath)), manifest.hashes[relativePath]);
}
assert.equal(manifest.statusSnapshot.scopedStatus, "??");
assert.match(manifest.statusSnapshot.unrelatedStatusSha256, /^[a-f0-9]{64}$/u);
assert.ok(manifest.statusSnapshot.unrelatedPathCount > 0);

const pass = spawnSync(process.execPath, [GUARD, "--verify-allowlist"], { cwd: ROOT, encoding: "utf8" });
assert.equal(pass.status, 0, pass.stderr);

const protectedOutsideAllowlist = spawnSync(
  process.execPath,
  [GUARD, "--check-path", "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v2.json"],
  { cwd: ROOT, encoding: "utf8" },
);
assert.notEqual(protectedOutsideAllowlist.status, 0);
assert.match(protectedOutsideAllowlist.stderr, /HAUSMEISTER_SCOPE_PROTECTED_PATH_OUTSIDE_ALLOWLIST/u);

const unrelatedOutsideProtectedRoots = spawnSync(
  process.execPath,
  [GUARD, "--check-path", "app/flashcards/tts_voices.ts"],
  { cwd: ROOT, encoding: "utf8" },
);
assert.equal(unrelatedOutsideProtectedRoots.status, 0, unrelatedOutsideProtectedRoots.stderr);

process.stdout.write("TASK7_V2_L01C06_HAUSMEISTER_SCOPE_EVIDENCE_GATE PASS allowlist=8 protected-root-rejection=active\\n");
