import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SCRIPT = "scripts/learning-v2-de-materialize-packets-v2.mjs";
const PACKET_ROOT = "content/learning-v2-course/curriculum/de/packets";
const V1_SCRIPT = "scripts/learning-v2-de-materialize-packets.mjs";
const V1_SCRIPT_SHA256 =
  "aa61455b910a7117c32c7c9e6e6ab6a6882a0f08e97ef24c8bbf49e454e92805";

function sha256(relativePath: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest("hex");
}

function run(args: readonly string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", SCRIPT, ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

assert.equal(sha256(V1_SCRIPT), V1_SCRIPT_SHA256, "task7_v2_v1_script_drift");
assert.equal(fs.existsSync(path.join(ROOT, PACKET_ROOT)), false);

const dryRun = run([]);
assert.equal(dryRun.status, 0, dryRun.stderr);
assert.equal(
  dryRun.stdout,
  "TASK7_V2_DRY_RUN status=V2_AUTHORITY_MIGRATED_PARTIAL authority=HOLD plans=288 resolved=6 unresolved=282 packets=1792 materialized=0 next=de_l01_s01 task7Unlock=false learner=false release=false\n",
);
assert.equal(fs.existsSync(path.join(ROOT, PACKET_ROOT)), false);

const write = run(["--write"]);
assert.notEqual(write.status, 0);
assert.match(write.stderr, /TASK7_V2_WRITE_FORBIDDEN/u);
assert.equal(fs.existsSync(path.join(ROOT, PACKET_ROOT)), false);

const callerPath = run(["--inventory", "caller.json"]);
assert.notEqual(callerPath.status, 0);
assert.match(callerPath.stderr, /TASK7_V2_ARGUMENTS_FORBIDDEN/u);
assert.equal(fs.existsSync(path.join(ROOT, PACKET_ROOT)), false);

process.stdout.write(
  "TASK7_V2_DRY_RUN_GATE PASS fixedPaths=true v1=UNCHANGED write=REJECTED callerPaths=REJECTED materialized=0\n",
);
