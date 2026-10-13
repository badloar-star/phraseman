import * as fs from "node:fs";
import * as path from "node:path";

import { buildGermanTask6cL02CapturePredicateDeV3 } from "../modules/learning-v2/curriculum/de/task6c_l02_capture_predicate_de_v3";
import { GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3 } from "../modules/learning-v2/curriculum/de/task6c_l02_capture_producer_contract_de_v3";
import { assertGermanTask6cL02CapturePostCaptureRuntimeDeV3 } from "../modules/learning-v2/curriculum/de/task6c_l02_capture_producer_de_v3";

function fail(code: string): never {
  throw new Error(code);
}

function readRegularFile(absolute: string, code: string): Buffer {
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink() || !stat.isFile()) fail(code);
  return fs.readFileSync(absolute);
}

function main(): void {
  if (process.argv.slice(2).length !== 0)
    fail("CAPTURE_PREDICATE_CALLER_INPUT_FORBIDDEN");
  assertGermanTask6cL02CapturePostCaptureRuntimeDeV3();
  const runnerTemp = process.env.RUNNER_TEMP;
  const sourceSha = process.env.GITHUB_SHA;
  if (!runnerTemp || !sourceSha) fail("CAPTURE_PREDICATE_RUNTIME_INVALID");
  const root = path.join(
    runnerTemp,
    GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceRootName,
  );
  const files = new Map(
    GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceFileAllowlist.map(
      (relativePath) => [
        relativePath,
        readRegularFile(
          path.join(root, ...relativePath.split("/")),
          "CAPTURE_PREDICATE_EVIDENCE_INVALID",
        ),
      ],
    ),
  );
  const archivePath = path.join(
    runnerTemp,
    GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.archiveName,
  );
  const archiveBytes = readRegularFile(
    archivePath,
    "CAPTURE_PREDICATE_ARCHIVE_INVALID",
  );
  const predicate = buildGermanTask6cL02CapturePredicateDeV3({
    sourceSha,
    files,
    archive: archiveBytes,
  });
  const output = path.join(
    runnerTemp,
    GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.predicateName,
  );
  fs.writeFileSync(output, predicate, { flag: "wx", mode: 0o644 });
  process.stdout.write(
    `CAPTURE_V3_PREDICATE_COMPLETE bytes=${predicate.length} path=${output}\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
