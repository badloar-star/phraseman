import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_DIR = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1",
);
const PATHS = {
  task6V9:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v9.json",
  inventoryV9:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v9.json",
  module:
    "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v9_fail_closed_reconciliation_de_v1.ts",
  gate: "tests/learning_v2_de_task6c_l01_guten_tag_v9_fail_closed_reconciliation_gate.ts",
  capture:
    "scripts/capture_learning_v2_de_task6c_l01_guten_tag_v9_typescript_evidence.mjs",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/manifest.json",
  evidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/typescript_evidence.json",
  focusedLog:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/logs/focused_tsc.log",
  repositoryLog:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/logs/repository_tsc_8192.log",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_V9_FAIL_CLOSED_RECONCILIATION_RECEIPT_2026-10-13.md",
};
const TRANSACTION_PATHS = [
  PATHS.task6V9,
  PATHS.inventoryV9,
  PATHS.module,
  PATHS.gate,
  PATHS.capture,
  PATHS.manifest,
  PATHS.evidence,
  PATHS.focusedLog,
  PATHS.repositoryLog,
  PATHS.receipt,
];
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");

function diagnostics(raw) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    throw new Error("guten_tag_v9_capture_invalid_utf8");
  }
  if (text.includes("\u0000") || /\u001b\[[0-9;]*[A-Za-z]/u.test(text)) {
    throw new Error("guten_tag_v9_capture_unsafe_log_bytes");
  }
  const headers = [];
  for (const line of text.split(/\r?\n/u)) {
    if (!line.includes("error TS")) continue;
    const file = /^(.+)\((\d+),(\d+)\): error TS(\d+):/u.exec(line);
    const global = /^error TS(\d+):/u.exec(line);
    if (file)
      headers.push({
        file: file[1].replaceAll("\\", "/"),
        code: Number(file[4]),
      });
    else if (global) headers.push({ file: null, code: Number(global[1]) });
    else throw new Error("guten_tag_v9_capture_ambiguous_diagnostic");
  }
  return {
    total: headers.length,
    transaction: headers.filter(
      (item) => item.file && TRANSACTION_PATHS.includes(item.file),
    ).length,
    codes: [...new Set(headers.map((item) => item.code))].sort((a, b) => a - b),
  };
}

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
    : Buffer.from([]);
  const stderr = Buffer.isBuffer(result.stderr)
    ? result.stderr
    : Buffer.from([]);
  return { exitCode: result.status ?? 1, raw: Buffer.concat([stdout, stderr]) };
}

fs.mkdirSync(path.join(EVIDENCE_DIR, "logs"), { recursive: true });

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
const focused = run(focusedArgv, {});
const repository = run(repositoryArgv, {
  NODE_OPTIONS: "--max-old-space-size=8192",
});
const focusedFacts = diagnostics(focused.raw);
const repositoryFacts = diagnostics(repository.raw);
if (
  focused.exitCode !== 0 ||
  focusedFacts.total !== 0 ||
  focusedFacts.transaction !== 0
) {
  throw new Error("guten_tag_v9_capture_focused_failed");
}
if (repositoryFacts.transaction !== 0)
  throw new Error("guten_tag_v9_capture_transaction_diagnostic");
if (repository.exitCode !== 0 && repositoryFacts.total === 0) {
  throw new Error("guten_tag_v9_capture_repository_unexplained_failure");
}

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
const snapshotPaths = [
  PATHS.task6V9,
  PATHS.inventoryV9,
  PATHS.module,
  PATHS.gate,
  PATHS.capture,
  PATHS.manifest,
];
const evidence = {
  schemaVersion: "learning-v2-de-guten-tag-v9-typescript-evidence.v1",
  status: "PENDING_INDEPENDENT_REVIEW",
  provenance: "LOCAL_CAPTURE_NOT_IMMUTABLE_EXTERNAL_RUNNER",
  sourceSnapshot: {
    rootRelative: ".",
    files: snapshotPaths.map((relative) => ({
      path: relative,
      sha256: sha(fs.readFileSync(path.join(ROOT, relative))),
    })),
  },
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
  path.join(ROOT, PATHS.evidence),
  `${JSON.stringify(evidence, null, 2)}\n`,
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
