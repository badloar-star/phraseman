import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  analyzeTypeScriptLog,
  CLOSED_AUTHORITY_V11,
  PATHS,
  ROOT,
  renderTypeScriptEvidence,
  sourceSnapshotRecord,
  TRANSACTION_PATHS,
} from "../modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v11_native_reparse_reconciliation_de_v1.ts";

const SCRIPT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
if (SCRIPT_ROOT !== ROOT)
  throw new Error("guten_tag_v11_capture_root_mismatch");
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");

function run(argv, env) {
  const result = spawnSync(process.execPath, argv, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: null,
    windowsHide: true,
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const stdout = Buffer.isBuffer(result.stdout)
    ? result.stdout
    : Buffer.alloc(0);
  const stderr = Buffer.isBuffer(result.stderr)
    ? result.stderr
    : Buffer.alloc(0);
  return { exitCode: result.status ?? 1, raw: Buffer.concat([stdout, stderr]) };
}

const focusedArgv = [
  "node_modules/typescript/bin/tsc",
  "--noEmit",
  "--pretty",
  "false",
  "--skipLibCheck",
  "--esModuleInterop",
  "--module",
  "commonjs",
  "--target",
  "es2022",
  "--moduleResolution",
  "node",
  PATHS.module,
  PATHS.gate,
];
const repositoryArgv = [
  "node_modules/typescript/bin/tsc",
  "--noEmit",
  "--pretty",
  "false",
];

const before = sourceSnapshotRecord();
const focused = run(focusedArgv, {});
const repository = run(repositoryArgv, {
  NODE_OPTIONS: "--max-old-space-size=8192",
});
const focusedFacts = analyzeTypeScriptLog(focused.raw);
const repositoryFacts = analyzeTypeScriptLog(repository.raw);
if (
  focused.exitCode !== 0 ||
  focusedFacts.total !== 0 ||
  focusedFacts.transaction !== 0
)
  throw new Error("guten_tag_v11_capture_focused_failed");
if (repositoryFacts.transaction !== 0)
  throw new Error("guten_tag_v11_capture_transaction_diagnostic");
if (repository.exitCode !== 0 && repositoryFacts.total === 0)
  throw new Error("guten_tag_v11_capture_repository_unexplained_failure");
const after = sourceSnapshotRecord();
if (JSON.stringify(before) !== JSON.stringify(after))
  throw new Error("guten_tag_v11_capture_source_changed_recapture_required");

fs.mkdirSync(path.dirname(path.join(ROOT, PATHS.focusedLog)), {
  recursive: true,
});
fs.writeFileSync(path.join(ROOT, PATHS.focusedLog), focused.raw);
fs.writeFileSync(path.join(ROOT, PATHS.repositoryLog), repository.raw);

const runRecord = (argv, env, result, facts, logPath) => ({
  executable: "node",
  argv,
  cwdRelative: ".",
  env,
  exitCode: result.exitCode,
  outcome:
    result.exitCode === 0 ? "PASS" : "BASELINE_DIAGNOSTICS_OUTSIDE_TRANSACTION",
  log: { path: logPath, sha256: sha(result.raw), bytes: result.raw.length },
  diagnostics: facts,
});

const evidence = {
  schemaVersion: "learning-v2-de-guten-tag-v11-typescript-evidence.v1",
  status: "PENDING_INDEPENDENT_REVIEW",
  provenance: "LOCAL_CAPTURE_NOT_IMMUTABLE_EXTERNAL_RUNNER",
  authority: CLOSED_AUTHORITY_V11,
  sourceSnapshot: after,
  transactionPaths: TRANSACTION_PATHS,
  focusedRun: runRecord(
    focusedArgv,
    {},
    focused,
    focusedFacts,
    PATHS.focusedLog,
  ),
  repositoryRun: runRecord(
    repositoryArgv,
    { NODE_OPTIONS: "--max-old-space-size=8192" },
    repository,
    repositoryFacts,
    PATHS.repositoryLog,
  ),
};
fs.writeFileSync(
  path.join(ROOT, PATHS.typescriptEvidence),
  renderTypeScriptEvidence(evidence),
  "utf8",
);
console.log(
  JSON.stringify(
    {
      focused: { exitCode: focused.exitCode, ...focusedFacts },
      repository: { exitCode: repository.exitCode, ...repositoryFacts },
    },
    null,
    2,
  ),
);
