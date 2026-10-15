import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { computeV2ToolchainClosure } from "./session_candidate_toolchain_closure.mjs";

const PROJECTION_NAMES = Object.freeze(["answers.json", "auxiliary.json", "intro.json", "learner.json", "learner.uk.json"]);
const SOURCE_NAMES = Object.freeze(["final.ru.md", "final.uk.md", "locales_batch.md", "practice.atomic.json"]);
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function pathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return Boolean(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function assertNoLinkedComponents(root, absolute, label) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(absolute);
  if (!pathInside(resolvedRoot, resolved)) throw new Error(`${label}_path_outside_root`);
  const relative = path.relative(resolvedRoot, resolved);
  let cursor = resolvedRoot;
  for (const component of relative.split(path.sep)) {
    cursor = path.join(cursor, component);
    let stat;
    try {
      stat = fs.lstatSync(cursor);
    } catch {
      throw new Error(`${label}_path_invalid`);
    }
    if (stat.isSymbolicLink()) throw new Error(`${label}_linked_component`);
  }
  const realRoot = fs.realpathSync(resolvedRoot);
  const real = fs.realpathSync(resolved);
  if (!pathInside(realRoot, real)) throw new Error(`${label}_path_outside_root`);
  return real;
}

export function readRegularFileContainedWithIdentity(root, absolute, label) {
  const real = assertNoLinkedComponents(root, absolute, label);
  const fd = fs.openSync(real, "r");
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile()) throw new Error(`${label}_not_regular_file`);
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd);
    const resolvedAfter = assertNoLinkedComponents(root, absolute, label);
    if (resolvedAfter !== real || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeMs !== after.mtimeMs || bytes.length !== after.size) {
      throw new Error(`${label}_changed_during_read`);
    }
    return Object.freeze({
      bytes,
      realPath: real,
      dev: after.dev,
      ino: after.ino,
      size: after.size,
      mtimeMs: after.mtimeMs,
    });
  } finally {
    fs.closeSync(fd);
  }
}

export function readRegularFileContained(root, absolute, label) {
  return readRegularFileContainedWithIdentity(root, absolute, label).bytes;
}

export function assertDirectoryContainedNoLinks(root, absolute, label) {
  const real = assertNoLinkedComponents(root, absolute, label);
  if (!fs.statSync(real).isDirectory()) throw new Error(`${label}_not_directory`);
  return real;
}

function readSnapshotIndex({ repoRoot, sourceSnapshotIndexPath, sourceSnapshotIndexSha256 }) {
  const indexBytes = readRegularFileContained(repoRoot, path.resolve(repoRoot, ...sourceSnapshotIndexPath.split("/")), "candidate_snapshot_index");
  if (sourceSnapshotIndexSha256 !== undefined && sha256(indexBytes) !== sourceSnapshotIndexSha256) {
    throw new Error("candidate_snapshot_index_stale");
  }
  const index = JSON.parse(indexBytes.toString("utf8"));
  if (index.schemaVersion !== "learning_v2_session_source_snapshot_v2"
    || index.courseSessionId !== "en:lesson-01:session-02") {
    throw new Error("candidate_snapshot_index_invalid");
  }
  if (!Array.isArray(index.entries) || new Set(index.entries.map((entry) => entry?.originalPath)).size !== index.entries.length) {
    throw new Error("candidate_snapshot_index_invalid");
  }
  return index;
}

export function verifyBoundV2Toolchain({ repoRoot, candidateRoot, sourceSnapshotIndexPath, sourceSnapshotIndexSha256 }) {
  const index = readSnapshotIndex({ repoRoot, sourceSnapshotIndexPath, sourceSnapshotIndexSha256 });
  const contracts = index.entries.filter((entry) => entry.category === "contract");
  const byPath = new Map(contracts.map((entry) => [entry.originalPath, entry]));
  const liveClosure = computeV2ToolchainClosure(repoRoot);
  const frozenClosure = [...byPath.keys()].sort();
  if (JSON.stringify(frozenClosure) !== JSON.stringify(liveClosure)) {
    const missing = liveClosure.find((relative) => !byPath.has(relative));
    const extra = frozenClosure.find((relative) => !liveClosure.includes(relative));
    throw new Error(`candidate_bound_toolchain_closure_mismatch:${missing ?? extra ?? "unknown"}`);
  }
  for (const entry of contracts) {
    if (typeof entry.originalPath !== "string" || typeof entry.snapshotPath !== "string"
      || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[0-9a-f]{64}$/u.test(String(entry.sha256 ?? ""))) {
      throw new Error("candidate_bound_toolchain_entry_invalid");
    }
    const expectedSnapshotPath = `${candidateRoot}/source-snapshot/${entry.originalPath}`;
    if (entry.snapshotPath !== expectedSnapshotPath) throw new Error(`candidate_bound_toolchain_path_invalid:${entry.originalPath}`);
    const frozenBytes = readRegularFileContained(
      repoRoot,
      path.resolve(repoRoot, ...entry.snapshotPath.split("/")),
      "candidate_bound_toolchain_snapshot",
    );
    if (frozenBytes.length !== entry.bytes || sha256(frozenBytes) !== entry.sha256) {
      throw new Error(`candidate_bound_toolchain_snapshot_stale:${entry.originalPath}`);
    }
    const liveBytes = readRegularFileContained(
      repoRoot,
      path.resolve(repoRoot, ...entry.originalPath.split("/")),
      "candidate_live_toolchain",
    );
    if (!liveBytes.equals(frozenBytes)) throw new Error(`candidate_live_toolchain_mismatch:${entry.originalPath}`);
  }
  return Object.freeze({ status: "PASS", fileCount: contracts.length });
}

function snapshotSources({ repoRoot, candidateRoot, sourceSnapshotIndexPath, sourceSnapshotIndexSha256 }) {
  const index = readSnapshotIndex({ repoRoot, sourceSnapshotIndexPath, sourceSnapshotIndexSha256 });
  const base = `content/learning-v2-course/sessions/en/l01/s02`;
  const required = SOURCE_NAMES.map((name) => `${base}/${name}`);
  const sourceEntries = index.entries?.filter((entry) => entry.category === "source") ?? [];
  if (JSON.stringify(sourceEntries.map((entry) => entry.originalPath).sort()) !== JSON.stringify([...required].sort())) {
    throw new Error("candidate_snapshot_source_inventory_invalid");
  }
  return sourceEntries.map((entry) => {
    const expectedSnapshotPath = `${candidateRoot}/source-snapshot/${entry.originalPath}`;
    if (entry.snapshotPath !== expectedSnapshotPath || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0
      || !/^[0-9a-f]{64}$/u.test(String(entry.sha256 ?? ""))) {
      throw new Error("candidate_snapshot_source_entry_invalid");
    }
    const bytes = readRegularFileContained(repoRoot, path.resolve(repoRoot, ...entry.snapshotPath.split("/")), "candidate_snapshot_source");
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) throw new Error("candidate_snapshot_source_stale");
    return { ...entry, bytes };
  });
}

function frozenSessionDirectory({ repoRoot, candidateRoot, sourceSnapshotIndexPath, sourceSnapshotIndexSha256 }) {
  const realCandidate = assertDirectoryContainedNoLinks(repoRoot, path.resolve(repoRoot, ...candidateRoot.split("/")), "candidate_root");
  const expectedIndex = path.join(realCandidate, "source-snapshot/index.json");
  const suppliedIndex = path.resolve(repoRoot, ...sourceSnapshotIndexPath.split("/"));
  if (suppliedIndex !== expectedIndex) throw new Error("candidate_snapshot_index_path_invalid");
  const sources = snapshotSources({ repoRoot, candidateRoot, sourceSnapshotIndexPath, sourceSnapshotIndexSha256 });
  const sourceRoot = path.join(realCandidate, "source-snapshot/content/learning-v2-course/sessions/en/l01/s02");
  assertDirectoryContainedNoLinks(repoRoot, sourceRoot, "candidate_snapshot_session");
  if (sources.some((entry) => path.dirname(path.resolve(repoRoot, ...entry.snapshotPath.split("/"))) !== sourceRoot)) {
    throw new Error("candidate_snapshot_source_root_invalid");
  }
  return { sourceRoot, indexSha256: sourceSnapshotIndexSha256 };
}

const V2_SEMANTIC_GATE_SPECS = Object.freeze({
  blueprint_authority: ({ repoRoot }) => ({
    executable: process.execPath,
    args: ["node_modules/tsx/dist/cli.mjs", "scripts/learning_v2_curriculum_blueprint_gate_v2.ts", "--session=en/l01/s02"],
    cwd: repoRoot,
  }),
  s02_exact_packet: ({ repoRoot, sourceRoot }) => ({
    executable: process.execPath,
    args: ["node_modules/tsx/dist/cli.mjs", "content/learning-v2-course/pipeline/l01s02_d956_packet.test.mjs"],
    cwd: repoRoot,
    env: { ...process.env, LEARNING_V2_FROZEN_SESSION_DIR: sourceRoot },
  }),
  feedback_locale_parity: ({ repoRoot, sourceRoot }) => ({
    executable: process.execPath,
    args: ["content/learning-v2-course/pipeline/l01s02_feedback_repair.test.mjs"],
    cwd: repoRoot,
    env: { ...process.env, LEARNING_V2_FROZEN_SESSION_DIR: sourceRoot },
  }),
  actor_clarity: ({ repoRoot, sourceRoot }) => ({
    executable: process.execPath,
    args: [
      "content/learning-v2-course/pipeline/audit_actor_clarity.mjs",
      "--sessions-root", path.resolve(sourceRoot, "../../.."),
      "--scope", "en", "--lesson", "l01", "--session", "s02",
    ],
    cwd: repoRoot,
  }),
});

export async function runFrozenV2SemanticGate({
  repoRoot,
  candidateRoot,
  sourceSnapshotIndexPath,
  sourceSnapshotIndexSha256,
  check,
}) {
  if (!/^[0-9a-f]{64}$/u.test(String(sourceSnapshotIndexSha256 ?? ""))) {
    throw new Error("candidate_snapshot_index_sha256_invalid");
  }
  const specFactory = V2_SEMANTIC_GATE_SPECS[check];
  if (!specFactory) throw new Error(`candidate_snapshot_semantic_gate_invalid:${check}`);
  verifyBoundV2Toolchain({ repoRoot, candidateRoot, sourceSnapshotIndexPath, sourceSnapshotIndexSha256 });
  const frozen = frozenSessionDirectory({ repoRoot, candidateRoot, sourceSnapshotIndexPath, sourceSnapshotIndexSha256 });
  const spec = specFactory({ repoRoot, sourceRoot: frozen.sourceRoot });
  const result = spawnSync(spec.executable, spec.args, {
    cwd: spec.cwd,
    env: spec.env,
    encoding: "utf8",
    shell: false,
    timeout: 120_000,
  });
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.stdout || result.error?.message || "unknown")
      .trim().split(/\r?\n/u).at(-1)?.slice(0, 500) ?? "unknown";
    throw new Error(`candidate_snapshot_semantic_gate_failed:${check}:${detail}`);
  }
  return Object.freeze({ status: "PASS", check, sourceSnapshotIndexSha256: frozen.indexSha256 });
}

export function rebuildAndVerifyV2Projection({ repoRoot, candidateRoot, sourceSnapshotIndexPath, sourceSnapshotIndexSha256 }) {
  verifyBoundV2Toolchain({ repoRoot, candidateRoot, sourceSnapshotIndexPath, sourceSnapshotIndexSha256 });
  const realCandidate = assertDirectoryContainedNoLinks(repoRoot, path.resolve(repoRoot, ...candidateRoot.split("/")), "candidate_root");
  const sources = snapshotSources({ repoRoot, candidateRoot, sourceSnapshotIndexPath, sourceSnapshotIndexSha256 });
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s02-rebuild-"));
  try {
    const sessionsRoot = path.join(temporaryRoot, "sessions");
    for (const entry of sources) {
      const destination = path.join(temporaryRoot, ...entry.originalPath.replace(/^content\/learning-v2-course\//u, "").split("/"));
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, entry.bytes);
    }
    const outputRoot = path.join(temporaryRoot, "release");
    const buildScript = path.join(repoRoot, "content/learning-v2-course/pipeline/build_release.mjs");
    readRegularFileContained(repoRoot, buildScript, "canonical_build_script");
    const build = spawnSync(process.execPath, [
      buildScript,
      "--session", "en/l01/s02",
      "--locales", "ru,uk",
      "--source-root", sessionsRoot,
      "--out", outputRoot,
      "--candidate-preview",
      "--v2-omit-legacy-explanation-sidecar",
    ], { cwd: repoRoot, encoding: "utf8", shell: false, timeout: 120_000 });
    if (build.error || build.status !== 0) {
      throw new Error(`candidate_projection_rebuild_failed:${String(build.stderr || build.stdout || build.error?.message || "unknown").trim()}`);
    }
    const rebuiltRoot = path.join(outputRoot, "en/l01/s02");
    for (const name of PROJECTION_NAMES) {
      const expected = readRegularFileContained(temporaryRoot, path.join(rebuiltRoot, name), `rebuilt_projection_${name}`);
      const actual = readRegularFileContained(repoRoot, path.join(realCandidate, "en/l01/s02", name), `candidate_projection_${name}`);
      if (!expected.equals(actual)) throw new Error(`candidate_projection_byte_mismatch:${name}`);
    }
    return Object.freeze({ status: "PASS", fileCount: PROJECTION_NAMES.length });
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

