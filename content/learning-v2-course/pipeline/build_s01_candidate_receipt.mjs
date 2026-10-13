#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeMockupFile } from "./write_mockup_file.mjs";

const PIPELINE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = path.resolve(PIPELINE, "../../..");
const DEFAULT_CANDIDATE = path.join(DEFAULT_REPO, "content/learning-v2-course/outputs/s01-pedagogy-fixed-20261013");
const BASELINE_NAME = "no-drift-baseline.json";
const ALLOWED_CANDIDATE_NAMES = new Set(["s01-pedagogy-fixed-20261013", "s01-pedagogy2-fixed-20261013", "s01-learner-fixed-20261013", "s01-learner2-fixed-20261013", "s01-learner3-fixed-20261013", "s01-source-projection-fixed-20261013", "s01-reader2-fixed-20261013", "s01-combined-review-fixed-20261013", "s01-i13-scene-fixed-20261013"]);
const USAGE = `Usage: node build_s01_candidate_receipt.mjs [--candidate <registered-candidate-directory>]
       node build_s01_candidate_receipt.mjs --candidate <registered-candidate-directory> --capture-boundary-baseline
       node build_s01_candidate_receipt.mjs --help`;
const CANDIDATE_ARTIFACTS = Object.freeze([
  "en/l01/s01/intro.json",
  "en/l01/s01/auxiliary.json",
  "en/l01/s01/learner.json",
  "en/l01/s01/learner.uk.json",
  "en/l01/s01/answers.json",
  "index.html",
  "external.html",
  "app.js",
  "data.js",
  BASELINE_NAME,
]);
const CONTENT_CANDIDATE_ARTIFACTS = Object.freeze([
  "en/l01/s01/intro.json",
  "en/l01/s01/auxiliary.json",
  "en/l01/s01/learner.json",
  "en/l01/s01/learner.uk.json",
  "en/l01/s01/answers.json",
  "index.html",
  "external.html",
  "app.js",
  "data.js",
]);
const CONTENT_SOURCE_ARTIFACTS = Object.freeze([
  "content/learning-v2-course/sessions/en/l01/s01/final.ru.md",
  "content/learning-v2-course/sessions/en/l01/s01/final.uk.md",
  "content/learning-v2-course/sessions/en/l01/s01/locales_batch.md",
  "content/learning-v2-course/sessions/en/l01/s01/practice.atomic.json",
  "content/learning-v2-course/sessions/en/l01/s01/practice.explanations.v1.json",
]);
const PRE_REPAIR_RECEIPT = "content/learning-v2-course/outputs/s01-token-analysis-evidence-fixed-20261013/hash-receipt.json";

const NO_DRIFT_ROOTS = Object.freeze([
  "content/learning-v2-course/release/en/l01/s01",
  "content/learning-v2-course/release/en/l01/s02",
  "content/learning-v2-course/sessions/en/l01/s02",
  "content/learning-v2-course/mockup/reviewed-source/en/l01/s01",
  "content/learning-v2-course/mockup/reviewed-source/en/l01/s02",
  "modules/learning-v2/content/factory_native/generated_release/en/l01/s01",
  "modules/learning-v2/content/factory_native/generated_release/en/l01/s02",
]);

const NO_DRIFT_FILES = Object.freeze([
  "content/learning-v2-course/mockup/app.js",
  "content/learning-v2-course/mockup/data.js",
  "content/learning-v2-course/mockup/external.html",
  "content/learning-v2-course/mockup/index.html",
  "assets/audio/learning-v2/factory-production-v1/manifest.json",
  "app/learning_v2_bootstrap_audio_assets_v1.generated.ts",
]);

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function filesUnder(absoluteRoot) {
  if (!fs.existsSync(absoluteRoot)) return [];
  const stat = fs.statSync(absoluteRoot);
  if (stat.isFile()) return [absoluteRoot];
  return fs.readdirSync(absoluteRoot, { withFileTypes: true })
    .flatMap((entry) => filesUnder(path.join(absoluteRoot, entry.name)));
}

function collectAudioAssetPaths(repoRoot) {
  const transcripts = new Set();
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    if (typeof value.transcript === "string" && value.transcript.trim()) transcripts.add(value.transcript.trim());
    Object.values(value).forEach(visit);
  };
  for (const session of ["s01", "s02"]) {
    const learner = JSON.parse(fs.readFileSync(path.join(repoRoot, "content/learning-v2-course/release/en/l01", session, "learner.json"), "utf8"));
    visit(learner.interactions);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "assets/audio/learning-v2/factory-production-v1/manifest.json"), "utf8"));
  const paths = new Set();
  for (const entry of manifest.entries ?? []) {
    if (!transcripts.has(String(entry.transcript ?? "").trim())) continue;
    if (typeof entry.assetPath === "string" && entry.assetPath.trim()) paths.add(entry.assetPath.replaceAll("\\", "/"));
    if (typeof entry.contentHash === "string" && entry.contentHash.trim()) {
      const bootstrap = `assets/audio/learning-v2-bootstrap-v1/${entry.contentHash}.mp3`;
      if (fs.existsSync(path.join(repoRoot, ...bootstrap.split("/")))) paths.add(bootstrap);
    }
  }
  return [...paths];
}

export function collectS01NoDriftBoundary({ repoRoot = DEFAULT_REPO } = {}) {
  const relativePaths = new Set([
    ...NO_DRIFT_FILES,
    ...NO_DRIFT_ROOTS.flatMap((relative) => filesUnder(path.join(repoRoot, ...relative.split("/")))
      .map((absolute) => normalizedRelative(repoRoot, absolute))),
    ...collectAudioAssetPaths(repoRoot),
  ]);
  const files = [...relativePaths].sort().map((relative) => hashFile(repoRoot, "noDriftBoundary", relative));
  const stable = JSON.stringify(files.map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest })));
  return {
    schemaVersion: "learning_v2_s01_no_drift_boundary_v1",
    claimsGitClean: false,
    scope: Object.freeze({ canonicalS01: true, allS02: true, referencedAudio: true }),
    fileCount: files.length,
    boundarySha256: sha256(stable),
    files,
  };
}

export async function captureS01NoDriftBaseline({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE } = {}) {
  const baseline = collectS01NoDriftBoundary({ repoRoot });
  await writeMockupFile(path.join(candidateRoot, BASELINE_NAME), `${JSON.stringify(baseline, null, 2)}\n`);
  return baseline;
}

function checkedJavaScriptDependencyClosure(repoRoot) {
  const require = createRequire(import.meta.url);
  const entry = path.join(repoRoot, "functions-content/lib/modules/learning-v2/content/lesson1_release_parity_v1.js");
  require(entry);
  const seen = new Set();
  const visit = (module) => {
    if (!module || seen.has(module.filename)) return;
    seen.add(module.filename);
    module.children.forEach(visit);
  };
  visit(require.cache[entry]);
  const prefix = path.join(repoRoot, "functions-content/lib/modules/learning-v2") + path.sep;
  return [...seen]
    .filter((absolute) => absolute.startsWith(prefix) && absolute.endsWith(".js"))
    .map((absolute) => normalizedRelative(repoRoot, absolute))
    .sort();
}

let checkedJavaScriptInventory;

function checkedJavaScriptInventoryForReceipt() {
  if (!checkedJavaScriptInventory) {
    checkedJavaScriptInventory = Object.freeze(checkedJavaScriptDependencyClosure(DEFAULT_REPO));
  }
  return checkedJavaScriptInventory;
}

export const S01_RECEIPT_INVENTORY = Object.freeze({
  preRepairBaseline: Object.freeze([PRE_REPAIR_RECEIPT]),
  source: Object.freeze([
    "content/learning-v2-course/sessions/en/l01/s01/final.ru.md",
    "content/learning-v2-course/sessions/en/l01/s01/final.uk.md",
    "content/learning-v2-course/sessions/en/l01/s01/locales_batch.md",
    "content/learning-v2-course/sessions/en/l01/s01/practice.atomic.json",
    "content/learning-v2-course/sessions/en/l01/s01/practice.explanations.v1.json",
    "content/learning-v2-course/sessions/en/l01/s01/review-evidence-manifest.json",
    "content/learning-v2-course/sessions/en/l01/s01/status.json",
    "content/learning-v2-course/judgements/2026-10-13_l01_s01_learner_raw.md",
    "content/learning-v2-course/judgements/2026-10-13_l01_s01_learner_audit3_raw.md",
    "content/learning-v2-course/judgements/2026-10-13_l01_s01_source_evidence.md",
    "content/learning-v2-course/migration/single-phrase-2026-10-03/preservation-ledger.json",
  ]),
  contract: Object.freeze([
    "package.json",
    "modules/learning-v2/contracts/mode_native_payload_v1.ts",
    "modules/learning-v2/runtime/course_session_client_children_v1.ts",
    "modules/learning-v2/content/factory_native/factory_native_course_v1.ts",
    "modules/learning-v2/content/learner_visible_text_v1.js",
    "modules/learning-v2/modes/mode_feedback_v1.tsx",
    "modules/learning-v2/modes/mode_router_v1.tsx",
    "modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx",
    "app/learning_v2_session_intro.tsx",
    "app/learning_v2_direct_session_player_v1.tsx",
    "content/learning-v2-course/pipeline/build_release.mjs",
    "content/learning-v2-course/pipeline/build_mockup.mjs",
    "content/learning-v2-course/pipeline/single_phrase_release.mjs",
    "content/learning-v2-course/pipeline/practice_explanations_v1.mjs",
    "content/learning-v2-course/pipeline/repair_s01_source_repetition.mjs",
    "content/learning-v2-course/pipeline/repair_s01_token_p1s.mjs",
    "content/learning-v2-course/pipeline/repair_s01_text_analysis_contract.mjs",
    "content/learning-v2-course/pipeline/build_s01_candidate_receipt.mjs",
  ]),
  get checkedJavaScript() {
    return checkedJavaScriptInventoryForReceipt();
  },
  verification: Object.freeze([
    "content/learning-v2-course/pipeline/l01s01_feedback_repair.test.mjs",
    "content/learning-v2-course/pipeline/practice_explanations_v1.test.mjs",
    "content/learning-v2-course/pipeline/build_mockup_pairs.test.mjs",
    "content/learning-v2-course/pipeline/build_release_source_release_parity.test.mjs",
    "content/learning-v2-course/pipeline/audit_locale_batch_parity.mjs",
    "content/learning-v2-course/pipeline/audit_locale_batch_parity.test.mjs",
    "content/learning-v2-course/pipeline/s01_checked_js_parity.test.cjs",
    "content/learning-v2-course/pipeline/build_s01_candidate_receipt.test.mjs",
    "content/learning-v2-course/pipeline/s01_review_evidence_manifest.test.mjs",
    "content/learning-v2-course/pipeline/s01_candidate_intro_browser.test.mjs",
    "tests/learning_v2_direct_session_intro_adapter_v1.test.ts",
    "tests/learning_v2_mode_feedback_v1.test.ts",
    "tests/learning_v2_mode_feedback_lane.test.tsx",
    "tests/lesson1_release_parity.test.ts",
    "tests/learning_v2_mode_text_analysis_contract_gate.ts",
    "tests/learning_v2_lesson1_session_01_mode_native_gate.ts",
  ]),
  candidate: Object.freeze(CANDIDATE_ARTIFACTS.map((relative) =>
    `content/learning-v2-course/outputs/s01-pedagogy-fixed-20261013/${relative}`)),
});

function normalizedRelative(repoRoot, absolute) {
  const relative = path.relative(repoRoot, absolute);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`receipt_path_outside_repo:${absolute}`);
  }
  return relative.split(path.sep).join("/");
}

export function s01ReceiptInventoryForCandidate({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE } = {}) {
  const absolute = path.resolve(candidateRoot);
  const expectedParent = path.resolve(repoRoot, "content/learning-v2-course/outputs");
  if (path.dirname(absolute) !== expectedParent || !ALLOWED_CANDIDATE_NAMES.has(path.basename(absolute))) {
    throw new Error(`unexpected_candidate_root:${candidateRoot}`);
  }
  const candidatePrefix = normalizedRelative(repoRoot, absolute);
  return Object.freeze({
    ...S01_RECEIPT_INVENTORY,
    candidate: Object.freeze(CANDIDATE_ARTIFACTS.map((relative) => `${candidatePrefix}/${relative}`)),
  });
}

export function s01ContentReceiptInventoryForCandidate({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE } = {}) {
  const absolute = path.resolve(candidateRoot);
  const expectedParent = path.resolve(repoRoot, "content/learning-v2-course/outputs");
  if (path.dirname(absolute) !== expectedParent || !ALLOWED_CANDIDATE_NAMES.has(path.basename(absolute))) {
    throw new Error(`unexpected_candidate_root:${candidateRoot}`);
  }
  const candidatePrefix = normalizedRelative(repoRoot, absolute);
  return Object.freeze([
    ...CONTENT_SOURCE_ARTIFACTS,
    ...CONTENT_CANDIDATE_ARTIFACTS.map((relative) => `${candidatePrefix}/${relative}`),
  ].sort());
}

function hashFile(repoRoot, category, relative) {
  const absolute = path.resolve(repoRoot, ...relative.split("/"));
  const normalized = normalizedRelative(repoRoot, absolute);
  if (normalized !== relative) throw new Error(`receipt_path_not_normalized:${relative}`);
  const bytes = fs.readFileSync(absolute);
  return {
    category,
    path: normalized,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

export function buildS01ContentReceipt({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE } = {}) {
  const expectedCandidate = path.resolve(candidateRoot);
  const files = s01ContentReceiptInventoryForCandidate({ repoRoot, candidateRoot: expectedCandidate })
    .map((relative) => hashFile(repoRoot, "content", relative));
  const stable = JSON.stringify(files.map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest })));
  return {
    schemaVersion: "learning_v2_s01_content_receipt_v3",
    courseSessionId: "en:lesson-01:session-01",
    releaseAuthority: false,
    candidateRoot: normalizedRelative(repoRoot, expectedCandidate),
    immutableContentOnly: true,
    fileCount: files.length,
    inventorySha256: sha256(stable),
    files,
  };
}

export function verifyS01ContentReceipt({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE, receiptPath, storedReceipt } = {}) {
  const expected = buildS01ContentReceipt({ repoRoot, candidateRoot });
  const storedPath = receiptPath ?? path.join(candidateRoot, "content-receipt.json");
  const stored = storedReceipt ?? JSON.parse(fs.readFileSync(storedPath, "utf8"));
  if (JSON.stringify(stored) !== JSON.stringify(expected)) throw new Error(`content_receipt_mismatch:${normalizedRelative(repoRoot, storedPath)}`);
  return expected;
}

export function buildS01CandidateReceipt({ repoRoot = DEFAULT_REPO, candidateRoot = DEFAULT_CANDIDATE } = {}) {
  const expectedCandidate = path.resolve(candidateRoot);
  const inventory = s01ReceiptInventoryForCandidate({ repoRoot, candidateRoot: expectedCandidate });
  const baselinePath = path.join(expectedCandidate, BASELINE_NAME);
  if (!fs.existsSync(baselinePath)) throw new Error(`no_drift_baseline_missing:${normalizedRelative(repoRoot, baselinePath)}`);
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const currentBoundary = collectS01NoDriftBoundary({ repoRoot });
  if (baseline.boundarySha256 !== currentBoundary.boundarySha256 || JSON.stringify(baseline.files) !== JSON.stringify(currentBoundary.files)) {
    throw new Error(`no_drift_boundary_changed:${baseline.boundarySha256}:${currentBoundary.boundarySha256}`);
  }
  const files = Object.entries(inventory)
    .flatMap(([category, paths]) => paths.map((relative) => hashFile(repoRoot, category, relative)))
    .sort((left, right) => left.path.localeCompare(right.path));
  const categoryCounts = Object.fromEntries(Object.keys(inventory).map((category) => [
    category,
    files.filter((entry) => entry.category === category).length,
  ]));
  const preRepairBytes = fs.readFileSync(path.join(repoRoot, ...PRE_REPAIR_RECEIPT.split("/")));
  const preRepairReceipt = JSON.parse(preRepairBytes.toString("utf8"));
  const preRepairFiles = new Map((preRepairReceipt.files ?? []).map((entry) => [entry.path, entry.sha256]));
  const currentFiles = new Map(files.map((entry) => [entry.path, entry.sha256]));
  const addedPaths = [...currentFiles.keys()].filter((file) => !preRepairFiles.has(file)).sort();
  const changedPaths = [...currentFiles.keys()].filter((file) => preRepairFiles.has(file) && preRepairFiles.get(file) !== currentFiles.get(file)).sort();
  const removedPaths = [...preRepairFiles.keys()].filter((file) => !currentFiles.has(file)).sort();
  const stable = JSON.stringify(files.map(({ category, path: file, bytes, sha256 }) => ({ category, path: file, bytes, sha256 })));
  return {
    schemaVersion: "learning_v2_s01_candidate_hash_receipt_v2",
    courseSessionId: "en:lesson-01:session-01",
    releaseAuthority: false,
    candidateRoot: normalizedRelative(repoRoot, expectedCandidate),
    categoryCounts,
    fileCount: files.length,
    inventorySha256: crypto.createHash("sha256").update(stable).digest("hex"),
    noDrift: {
      status: "PASS",
      claimsGitClean: false,
      baselinePath: normalizedRelative(repoRoot, baselinePath),
      boundaryFileCount: currentBoundary.fileCount,
      boundarySha256: currentBoundary.boundarySha256,
    },
    preRepair: {
      claimsGitClean: false,
      baselineReceiptPath: PRE_REPAIR_RECEIPT,
      baselineReceiptSha256: sha256(preRepairBytes),
      baselineInventorySha256: preRepairReceipt.inventorySha256,
      addedPaths,
      changedPaths,
      removedPaths,
    },
    files,
  };
}

function parseCliArgs(args) {
  const options = {
    candidate: null,
    captureBoundaryBaseline: false,
    help: false,
  };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--help") {
      if (seen.has(argument)) throw new Error(`duplicate argument: ${argument}`);
      seen.add(argument);
      options.help = true;
      continue;
    }
    if (argument === "--capture-boundary-baseline") {
      if (seen.has(argument)) throw new Error(`duplicate argument: ${argument}`);
      seen.add(argument);
      options.captureBoundaryBaseline = true;
      continue;
    }
    if (argument === "--candidate") {
      if (seen.has(argument)) throw new Error(`duplicate argument: ${argument}`);
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`missing value for ${argument}`);
      seen.add(argument);
      options.candidate = value;
      index++;
      continue;
    }
    if (argument.startsWith("--")) throw new Error(`unknown argument: ${argument}`);
    throw new Error(`unexpected positional argument: ${argument}`);
  }
  return options;
}

async function main(args = process.argv.slice(2)) {
  let cli;
  try {
    cli = parseCliArgs(args);
  } catch (error) {
    console.error(`[S01_RECEIPT][ERROR] ${error.message}`);
    console.error(USAGE);
    return 2;
  }
  if (cli.help) {
    console.log(USAGE);
    return 0;
  }
  const candidateRoot = cli.candidate ? path.resolve(cli.candidate) : DEFAULT_CANDIDATE;
  s01ReceiptInventoryForCandidate({ repoRoot: DEFAULT_REPO, candidateRoot });
  if (cli.captureBoundaryBaseline) {
    const baseline = await captureS01NoDriftBaseline({ candidateRoot });
    console.log(JSON.stringify({ output: normalizedRelative(DEFAULT_REPO, path.join(candidateRoot, BASELINE_NAME)), files: baseline.fileCount, sha256: baseline.boundarySha256 }));
    return 0;
  }
  // The v2 hash receipt is historical evidence. It is never rewritten by v3.
  // Building it here still validates the legacy inventory and no-drift boundary.
  buildS01CandidateReceipt({ candidateRoot });
  const receipt = buildS01ContentReceipt({ candidateRoot });
  const output = path.join(candidateRoot, "content-receipt.json");
  await writeMockupFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ output: normalizedRelative(DEFAULT_REPO, output), files: receipt.fileCount, sha256: receipt.inventorySha256 }));
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
