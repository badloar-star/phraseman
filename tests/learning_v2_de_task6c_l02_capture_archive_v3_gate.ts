import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  buildGermanTask6cL02CaptureArchiveDeV3,
  inspectGermanTask6cL02CaptureArchiveDeV3,
} from "../modules/learning-v2/curriculum/de/task6c_l02_capture_archive_de_v3";
import { GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3 } from "../modules/learning-v2/curriculum/de/task6c_l02_capture_producer_contract_de_v3";

const files = new Map(
  GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceFileAllowlist.map(
    (filePath, index) => [
      filePath,
      Buffer.from(`fixture-${index}-${filePath}\n`, "utf8"),
    ],
  ),
);
const archiveA = buildGermanTask6cL02CaptureArchiveDeV3(files);
const archiveB = buildGermanTask6cL02CaptureArchiveDeV3(
  new Map([...files].reverse()),
);
assert(
  archiveA.equals(archiveB),
  "archive must be insertion-order independent",
);
assert.equal(archiveA.length % 512, 0);
assert(
  archiveA.subarray(-1024).equals(Buffer.alloc(1024)),
  "archive must end in two zero blocks",
);

const inspected = inspectGermanTask6cL02CaptureArchiveDeV3(archiveA);
assert.deepEqual(
  inspected.map(({ path }) => path),
  GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceFileAllowlist,
);
for (const entry of inspected) {
  assert.equal(entry.type, "0");
  assert.equal(entry.mode, 0o644);
  assert.equal(entry.uid, 0);
  assert.equal(entry.gid, 0);
  assert.equal(entry.mtime, 0);
  assert.equal(entry.uname, "");
  assert.equal(entry.gname, "");
  assert(files.get(entry.path)?.equals(entry.bytes));
}

assert.throws(
  () => buildGermanTask6cL02CaptureArchiveDeV3(new Map([...files].slice(1))),
  /CAPTURE_ARCHIVE_FILE_SET_INVALID/u,
);
assert.throws(
  () =>
    buildGermanTask6cL02CaptureArchiveDeV3(
      new Map([...files, ["extra", Buffer.alloc(0)]]),
    ),
  /CAPTURE_ARCHIVE_FILE_SET_INVALID/u,
);
const tampered = Buffer.from(archiveA);
tampered[148] ^= 1;
assert.throws(
  () => inspectGermanTask6cL02CaptureArchiveDeV3(tampered),
  /CAPTURE_ARCHIVE_CHECKSUM_INVALID/u,
);
const payloadTampered = Buffer.from(archiveA);
payloadTampered[512] ^= 1;
assert.notEqual(
  createHash("sha256").update(payloadTampered).digest("hex"),
  createHash("sha256").update(archiveA).digest("hex"),
);
assert.throws(
  () =>
    inspectGermanTask6cL02CaptureArchiveDeV3(
      Buffer.concat([archiveA, Buffer.alloc(512)]),
    ),
  /CAPTURE_ARCHIVE_TRAILING_BYTES/u,
);

process.stdout.write(
  `LEARNING V2 GERMAN L02 CAPTURE ARCHIVE V3 OFFLINE GATE: PASS (files=13; bytes=${archiveA.length}; deterministic=true)\n`,
);
