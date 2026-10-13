import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const script = "scripts/learning-v2-de-materialize-packets.mjs";
const packetRoot = "content/learning-v2-course/curriculum/de/packets";
function snapshot(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { recursive: true, encoding: "utf8" })
    .sort()
    .map((entry) => {
      const sourcePath = path.join(root, entry);
      const stat = fs.statSync(sourcePath);
      return stat.isFile()
        ? `${entry}:${stat.size}:${sha(fs.readFileSync(sourcePath))}`
        : `${entry}:dir`;
    });
}
function sha(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
const before = snapshot(packetRoot);
const write = spawnSync(process.execPath, [script, "--write"], {
  encoding: "utf8",
});
assert.notEqual(write.status, 0, "task7_write_must_fail");
assert.match(`${write.stdout}${write.stderr}`, /TASK7_WRITE_UNIMPLEMENTED/u);
assert.deepEqual(
  snapshot(packetRoot),
  before,
  "task7_write_packet_root_unchanged",
);
const dryRun = spawnSync(process.execPath, [script], { encoding: "utf8" });
assert.notEqual(dryRun.status, 0, "task7_partial_authority_must_hold");
assert.match(
  `${dryRun.stdout}${dryRun.stderr}`,
  /TASK7_FULL_ALLOCATION_AUTHORITY_PARTIAL/u,
);
const forged = spawnSync(
  process.execPath,
  [script, "--authority", "fake.json"],
  { encoding: "utf8" },
);
assert.notEqual(forged.status, 0);
assert.match(
  `${forged.stdout}${forged.stderr}`,
  /TASK7_MATERIALIZER_ARGUMENTS_INVALID/u,
);
process.stdout.write(
  "TASK7_FULL_ALLOCATION_AUTHORITY fixedPaths=true synthetic=REJECTED write=UNIMPLEMENTED\n",
);
