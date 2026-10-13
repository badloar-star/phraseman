import * as fs from "node:fs";
import * as path from "node:path";

import { buildGermanTask6cL02CaptureArchiveDeV3 } from "../modules/learning-v2/curriculum/de/task6c_l02_capture_archive_de_v3";
import { GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3 } from "../modules/learning-v2/curriculum/de/task6c_l02_capture_producer_contract_de_v3";
import { assertGermanTask6cL02CapturePostCaptureRuntimeDeV3 } from "../modules/learning-v2/curriculum/de/task6c_l02_capture_producer_de_v3";

function fail(code: string): never {
  throw new Error(code);
}

function readRegularFile(root: string, relativePath: string): Buffer {
  const absolute = path.join(root, ...relativePath.split("/"));
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink() || !stat.isFile())
    fail("CAPTURE_ARCHIVE_INPUT_INVALID");
  const rootRealpath = fs.realpathSync.native(root);
  const fileRealpath = fs.realpathSync.native(absolute);
  if (!fileRealpath.startsWith(`${rootRealpath}${path.sep}`)) {
    fail("CAPTURE_ARCHIVE_INPUT_ESCAPES_ROOT");
  }
  return fs.readFileSync(absolute);
}

function main(): void {
  if (process.argv.slice(2).length !== 0)
    fail("CAPTURE_ARCHIVE_CALLER_INPUT_FORBIDDEN");
  assertGermanTask6cL02CapturePostCaptureRuntimeDeV3();
  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) fail("CAPTURE_PRODUCER_RUNNER_TEMP_INVALID");
  const root = path.join(
    runnerTemp,
    GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceRootName,
  );
  const files = new Map(
    GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceFileAllowlist.map(
      (relativePath) => [relativePath, readRegularFile(root, relativePath)],
    ),
  );
  const archive = buildGermanTask6cL02CaptureArchiveDeV3(files);
  const output = path.join(
    runnerTemp,
    GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.archiveName,
  );
  fs.writeFileSync(output, archive, { flag: "wx", mode: 0o644 });
  process.stdout.write(
    `CAPTURE_V3_ARCHIVE_COMPLETE bytes=${archive.length} path=${output}\n`,
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
