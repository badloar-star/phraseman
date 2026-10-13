import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const attemptsRoot = path.join(repoRoot, "docs/v2/curriculum/de/b3a-attempts");
const protocolPath = "docs/v2/curriculum/de/b3a-attempts/TASK6B3A_ATTEMPT_PROTOCOL_2026-10-11.md";
const candidateTuple = {
  "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts": "10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c",
  "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json": "3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29",
  "tests/learning_v2_de_lexical_registry_gate.ts": "3346867a3c40fecf6dcf11ef12c97f9de52a949a7db64870957ac08235c36f58",
} as const;
const terminalHold = {
  audio: "HOLD",
  b3Acceptance: "NOT_ESTABLISHED",
  englishAuthority: "EXCLUDED",
  learnerAuthoring: "HOLD",
  mockup: "HOLD",
  releaseAuthority: "HOLD",
  rowsPromoted: 0,
  runtime: "HOLD",
  task7Contacts: "UNVERIFIED",
} as const;
const requiredClosurePaths = [
  "docs/v2/curriculum/de/OWNER_DECISIONS.md",
  "docs/v2/curriculum/de/TASK_PACKET_6B3_AUFZUG_CANONICAL_MATERIALIZATION.md",
  "docs/v2/curriculum/de/TASK_PACKET_6B3A_AUFZUG_CURRENT_STATE_ACCEPTANCE.md",
  "docs/v2/curriculum/de/TASK_PACKET_6B4_AUFZUG_CURRENT_STATE_ADMISSION.md",
  "docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md",
  "docs/v2/curriculum/de/TASK6B1_LEXICAL_REVIEW_RECEIPT_2026-10-08.md",
  "docs/v2/curriculum/de/TASK6B2_QUARANTINE_DECISION_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B2_SOURCE_ADJUDICATION_RECEIPT_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B3A_AUTHORITY_RECORD_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B3A_IMMUTABLE_ATTEMPT_AUTHORITY_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B3A_TARGET_SCOPED_AUTHORITY_AMENDMENT_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B3A_METHOD_ADVISOR_RECEIPT_R3_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B3A_METHOD_ADVISOR_RECEIPT_R4_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B3A_METHOD_ADVISOR_RECEIPT_R5_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B4_AUTHORITY_RECORD_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B4_FINAL_METHOD_ADVISOR_RECEIPT_R4_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B4_GUARDIAN_RECEIPT_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B4_VALIDATION_RECEIPT_2026-10-11.md",
  "docs/v2/curriculum/de/b3a-attempts/TASK6B3A_ATTEMPT_PROTOCOL_2026-10-11.md",
  "tests/learning_v2_de_aufzug_b3a_immutable_attempt_gate.ts",
  ...Object.keys(candidateTuple),
].sort();
type Entry = { gitIndex: string; path: string; sha256: string };
type Snapshot = { algorithm: string; attemptId: string; entries: Entry[]; snapshotRootSha256: string };
type Pre = { attemptId: string; candidateTuple: typeof candidateTuple; closure: Record<string, string>; guardian: { path: string; sha256: string }; snapshot: { path: string; rootSha256: string }; stage: "P"; status: Record<string, string | number> };
type Guardian = { attemptId: string; closure: Record<string, string>; snapshotRootSha256: string; verdict: "PASS" };
type Review = { attemptId: string; preManifestSha256: string; reviewerRole: "orbit-red-team" | "orbit-spec-reviewer"; reviewerTask: string; snapshotRootSha256: string; verdict: "PASS" };
type Final = { attemptId: string; candidateTuple: typeof candidateTuple; closure: Record<string, string>; preManifestSha256: string; reviews: { adversarial: { path: string; sha256: string }; spec: { path: string; sha256: string } }; snapshotRootSha256: string; stage: "F"; status: Record<string, string | number> };

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
function readCanonicalJson<T>(file: string): T {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = JSON.parse(raw) as T;
  assert.equal(raw, `${JSON.stringify(parsed, null, 2)}\n`, `json_not_canonical:${path.basename(file)}`);
  return parsed;
}
const hashFile = (file: string) => sha256(fs.readFileSync(file));
const canonicalRoot = (entries: Entry[]) => sha256(JSON.stringify(entries));
const validAttemptId = (value: string) => /^b3a-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value);
function relativeWithin(root: string, file: string): string {
  const relative = path.relative(root, file).replace(/\\/gu, "/");
  assert.ok(relative && !relative.startsWith("../") && !path.isAbsolute(relative), "attempt_path_escapes_root");
  return relative;
}
function assertExactKeys(value: object, expected: string[], message: string): void {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), message);
}
function repoPath(relative: string): string {
  const normalized = relative.replace(/\\/gu, "/");
  assert.equal(relative, normalized, "repo_path_not_normalized");
  const absolute = path.resolve(repoRoot, normalized);
  const roundTrip = relativeWithin(repoRoot, absolute);
  assert.equal(roundTrip, normalized, "repo_path_not_normalized");
  return absolute;
}
function attemptPath(root: string, relative: string): string {
  const absolute = path.resolve(root, relative);
  relativeWithin(root, absolute);
  return absolute;
}
let indexByPath: Map<string, string> | undefined;
function trackedIndex(pathname: string): string {
  if (indexByPath === undefined) {
    const output = execFileSync("git", ["ls-files", "--stage", "-z"], { cwd: repoRoot, encoding: "buffer", maxBuffer: 32 * 1024 * 1024 }).toString("utf8");
    indexByPath = new Map(
      output.split("\0").filter(Boolean).map((row) => {
        const separator = row.indexOf("\t");
        return [row.slice(separator + 1), row.slice(0, separator)] as const;
      }),
    );
  }
  return indexByPath.get(pathname) ?? "UNTRACKED";
}
function verifySnapshot(snapshot: Snapshot, attemptId: string, root: string): void {
  assertExactKeys(snapshot, ["algorithm", "attemptId", "entries", "snapshotRootSha256"], "snapshot_schema_invalid");
  assert.equal(snapshot.algorithm, "sha256(json-v1; per-path-working-tree+git-index)", "snapshot_algorithm_invalid");
  assert.equal(snapshot.attemptId, attemptId, "snapshot_attempt_id_invalid");
  assert.deepEqual([...snapshot.entries].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0), snapshot.entries, "snapshot_entries_not_sorted");
  assert.equal(snapshot.snapshotRootSha256, canonicalRoot(snapshot.entries), "snapshot_root_invalid");
  for (const entry of snapshot.entries) {
    assertExactKeys(entry, ["gitIndex", "path", "sha256"], "snapshot_entry_schema_invalid");
    assert.ok(entry.path === protocolPath || !entry.path.startsWith("docs/v2/curriculum/de/b3a-attempts/"), "snapshot_must_not_name_attempt_receipt");
    assert.ok(requiredClosurePaths.includes(entry.path), "snapshot_path_not_in_required_closure");
    assert.equal(entry.sha256.length, 64, "snapshot_hash_invalid");
    const absolute = repoPath(entry.path);
    assert.ok(fs.existsSync(absolute), `snapshot_path_missing:${entry.path}`);
    assert.equal(hashFile(absolute), entry.sha256, `snapshot_worktree_drift:${entry.path}`);
    assert.equal(trackedIndex(entry.path), entry.gitIndex, `snapshot_index_drift:${entry.path}`);
  }
  assert.deepEqual(snapshot.entries.map((entry) => entry.path), requiredClosurePaths, "snapshot_paths_must_equal_required_closure");
  assert.ok(snapshot.entries.length > 0, "snapshot_empty");
  relativeWithin(root, path.join(root, "snapshot.json"));
}
function verifyAuthoritativeClosure(closure: Record<string, string>): void {
  assert.deepEqual(Object.keys(closure).sort(), requiredClosurePaths, "authoritative_closure_invalid");
  for (const [file, hash] of Object.entries(closure)) {
    assert.match(file, /^(docs\/v2\/curriculum\/de|modules\/learning-v2\/curriculum\/de|tests\/learning_v2_de_)/u, "closure_path_out_of_scope");
    assert.equal(hashFile(repoPath(file)), hash, `closure_drift:${file}`);
  }
}
function verifyHold(status: Record<string, string | number>, stage: "P" | "F"): void {
  assert.deepEqual(Object.keys(status).sort(), ["audio", "b3Acceptance", "b3aAcceptance", "candidateAcceptance", "englishAuthority", "historicalB1Replay", "learnerAuthoring", "mockup", "releaseAuthority", "rowsPromoted", "runtime", "task7Contacts"].sort(), "terminal_status_keys_invalid");
  assert.deepEqual(Object.fromEntries(Object.keys(terminalHold).map((key) => [key, status[key]])), terminalHold, "terminal_hold_changed");
  assert.equal(status.historicalB1Replay, "UNAVAILABLE_NOT_CLAIMED", "historical_replay_claimed");
  assert.equal(status.candidateAcceptance, stage === "P" ? "HOLD" : "ACCEPTED_UNDER_B4_CURRENT_STATE", "candidate_state_invalid");
  assert.equal(status.b3aAcceptance, stage === "P" ? "PENDING" : "ESTABLISHED", "b3a_state_invalid");
}
function verifyGuardian(guardian: Guardian, pre: Pre, snapshot: Snapshot, attemptId: string): void {
  assert.deepEqual(Object.keys(guardian), ["attemptId", "closure", "snapshotRootSha256", "verdict"], "guardian_schema_invalid");
  assert.equal(guardian.attemptId, attemptId, "guardian_attempt_id_invalid");
  assert.equal(guardian.snapshotRootSha256, snapshot.snapshotRootSha256, "guardian_snapshot_root_invalid");
  assert.deepEqual(guardian.closure, pre.closure, "guardian_closure_invalid");
  assert.equal(guardian.verdict, "PASS", "guardian_not_pass");
}
function verifyPre(pre: Pre, snapshot: Snapshot, attemptId: string, root: string): void {
  assertExactKeys(pre, ["attemptId", "candidateTuple", "closure", "guardian", "snapshot", "stage", "status"], "pre_schema_invalid");
  assertExactKeys(pre.guardian, ["path", "sha256"], "pre_guardian_schema_invalid");
  assertExactKeys(pre.snapshot, ["path", "rootSha256"], "pre_snapshot_schema_invalid");
  assert.equal(pre.attemptId, attemptId, "pre_attempt_id_invalid");
  assert.equal(pre.stage, "P", "pre_stage_invalid");
  assert.deepEqual(pre.candidateTuple, candidateTuple, "candidate_tuple_invalid");
  assert.equal(pre.snapshot.path, "snapshot.json", "pre_snapshot_path_invalid");
  assert.equal(pre.snapshot.rootSha256, snapshot.snapshotRootSha256, "pre_snapshot_root_invalid");
  verifyAuthoritativeClosure(pre.closure);
  const snapshotPaths = new Set(snapshot.entries.map((entry) => entry.path));
  for (const required of Object.keys(pre.closure)) assert.ok(snapshotPaths.has(required), `snapshot_coverage_missing:${required}`);
  for (const [file, hash] of Object.entries(candidateTuple)) assert.equal(pre.closure[file], hash, `candidate_missing_from_closure:${file}`);
  assert.equal(pre.guardian.path, "guardian.json", "guardian_path_invalid");
  const guardianPath = attemptPath(root, pre.guardian.path);
  assert.notEqual(guardianPath, path.join(root, "snapshot.json"), "guardian_must_be_distinct_from_snapshot");
  assert.equal(pre.guardian.sha256, hashFile(guardianPath), "guardian_hash_invalid");
  verifyGuardian(readCanonicalJson<Guardian>(guardianPath), pre, snapshot, attemptId);
  verifyHold(pre.status, "P");
}
function verifyImmutableAnchor(root: string, attemptId: string, commit: string, gitRoot = repoRoot): void {
  assert.match(commit, /^[0-9a-f]{40}$/u, "immutable_anchor_commit_invalid");
  const git = (args: string[], encoding: "buffer" | "utf8" = "buffer") => execFileSync("git", args, {
    cwd: gitRoot,
    encoding,
    maxBuffer: 32 * 1024 * 1024,
    stdio: "pipe",
    timeout: 5_000,
    windowsHide: true,
  });
  git(["merge-base", "--is-ancestor", commit, "HEAD"]);
  const attemptDirectory = `docs/v2/curriculum/de/b3a-attempts/${attemptId}`;
  assert.throws(() => git(["cat-file", "-e", `${commit}^:${attemptDirectory}`]), "immutable_anchor_not_first_creation");
  const history = git(["log", "--all", "--format=%H", "--", attemptDirectory], "utf8").trim().split("\n").filter(Boolean);
  assert.deepEqual(history, [commit], "immutable_anchor_history_not_unique");
  const names = ["snapshot.json", "guardian.json", "P.json", "review.spec.json", "review.adversarial.json", "F.json"];
  const changedPaths = git(["diff-tree", "--no-commit-id", "--name-only", "-r", commit], "utf8").trim().split("\n").filter(Boolean).sort();
  assert.deepEqual(changedPaths, names.map((name) => `${attemptDirectory}/${name}`).sort(), "immutable_anchor_changed_paths_invalid");
  for (const name of names) {
    const relative = `docs/v2/curriculum/de/b3a-attempts/${attemptId}/${name}`;
    const anchored = git(["show", `${commit}:${relative}`]);
    assert.deepEqual(anchored, fs.readFileSync(attemptPath(root, name)), `immutable_anchor_drift:${name}`);
  }
}
function verifyFinal(finalManifest: Final, prePath: string, pre: Pre, snapshot: Snapshot, attemptId: string, root: string): void {
  assertExactKeys(finalManifest, ["attemptId", "candidateTuple", "closure", "preManifestSha256", "reviews", "snapshotRootSha256", "stage", "status"], "final_schema_invalid");
  assertExactKeys(finalManifest.reviews, ["adversarial", "spec"], "final_reviews_schema_invalid");
  assert.equal(finalManifest.attemptId, attemptId, "final_attempt_id_invalid");
  assert.equal(finalManifest.stage, "F", "final_stage_invalid");
  assert.equal(finalManifest.preManifestSha256, hashFile(prePath), "final_pre_hash_invalid");
  assert.equal(finalManifest.snapshotRootSha256, snapshot.snapshotRootSha256, "final_snapshot_root_invalid");
  assert.deepEqual(finalManifest.candidateTuple, candidateTuple, "final_candidate_tuple_invalid");
  assert.deepEqual(finalManifest.closure, pre.closure, "final_closure_changed");
  verifyHold(finalManifest.status, "F");
  const reviews = Object.entries(finalManifest.reviews).map(([kind, receipt]) => {
    assertExactKeys(receipt, ["path", "sha256"], `review_reference_schema_invalid:${kind}`);
    assert.equal(receipt.path, kind === "spec" ? "review.spec.json" : "review.adversarial.json", `review_path_invalid:${kind}`);
    return { kind, receipt, data: readCanonicalJson<Review>(attemptPath(root, receipt.path)) };
  });
  assert.deepEqual(reviews.map(({ kind }) => kind).sort(), ["adversarial", "spec"], "review_roles_invalid");
  assert.notEqual(reviews[0].data.reviewerTask, reviews[1].data.reviewerTask, "review_tasks_not_distinct");
  for (const { kind, receipt, data } of reviews) {
    assertExactKeys(data, ["attemptId", "preManifestSha256", "reviewerRole", "reviewerTask", "snapshotRootSha256", "verdict"], `review_schema_invalid:${kind}`);
    assert.equal(receipt.sha256, hashFile(attemptPath(root, receipt.path)), `review_hash_invalid:${kind}`);
    assert.equal(data.attemptId, attemptId, `review_attempt_id_invalid:${kind}`);
    assert.equal(data.preManifestSha256, hashFile(prePath), `review_pre_hash_invalid:${kind}`);
    assert.equal(data.snapshotRootSha256, snapshot.snapshotRootSha256, `review_snapshot_root_invalid:${kind}`);
    assert.equal(data.verdict, "PASS", `review_not_pass:${kind}`);
    assert.equal(data.reviewerRole, kind === "spec" ? "orbit-spec-reviewer" : "orbit-red-team", `review_role_invalid:${kind}`);
    assert.match(data.reviewerTask, /^\/root\/[a-z0-9_/-]+$/u, `review_task_invalid:${kind}`);
  }
}
function verifyAttempt(attemptId: string, final: boolean, anchorCommit?: string): void {
  assert.ok(validAttemptId(attemptId), "attempt_id_invalid");
  const root = path.join(attemptsRoot, attemptId);
  assert.ok(fs.existsSync(root), "attempt_directory_missing");
  const snapshot = readCanonicalJson<Snapshot>(path.join(root, "snapshot.json"));
  verifySnapshot(snapshot, attemptId, root);
  const prePath = path.join(root, "P.json");
  const pre = readCanonicalJson<Pre>(prePath);
  verifyPre(pre, snapshot, attemptId, root);
  if (final) {
    assert.ok(anchorCommit, "immutable_anchor_required");
    verifyFinal(readCanonicalJson<Final>(path.join(root, "F.json")), prePath, pre, snapshot, attemptId, root);
    verifyImmutableAnchor(root, attemptId, anchorCommit);
  }
}
function selfTest(): void {
  const protocol = path.join(attemptsRoot, "TASK6B3A_ATTEMPT_PROTOCOL_2026-10-11.md");
  assert.ok(fs.existsSync(protocol), "immutable_attempt_protocol_missing");
  const text = fs.readFileSync(protocol, "utf8");
  for (const required of ["create-only", "snapshot.json", "P.json", "F.json", "distinct", "terminal HOLD", "immutable anchor", "first-creation", "English is rejected"]) assert.ok(text.includes(required), `protocol_missing:${required}`);
  assert.throws(() => verifyAttempt("BAD_ID", false), /attempt_id_invalid/u, "invalid_attempt_id_must_fail_closed");
  const pending = { ...terminalHold, historicalB1Replay: "UNAVAILABLE_NOT_CLAIMED", candidateAcceptance: "HOLD", b3aAcceptance: "PENDING" };
  assert.doesNotThrow(() => verifyHold(pending, "P"), "pending_pre_must_be_valid");
  assert.throws(() => verifyHold({ ...pending, b3aAcceptance: "ESTABLISHED" }, "P"), /b3a_state_invalid/u, "established_pre_must_fail");
  assert.throws(() => verifyHold({ ...pending, candidateAcceptance: "ACCEPTED_UNDER_B4_CURRENT_STATE" }, "P"), /candidate_state_invalid/u, "accepted_pre_must_fail");
  assert.throws(() => verifyHold(pending, "F"), /candidate_state_invalid/u, "pending_final_must_fail");
  const closure = Object.fromEntries(requiredClosurePaths.map((file) => [file, hashFile(repoPath(file))]));
  assert.doesNotThrow(() => verifyAuthoritativeClosure(closure), "complete_authoritative_closure_must_be_valid");
  const withoutProtocol = { ...closure };
  delete withoutProtocol["docs/v2/curriculum/de/b3a-attempts/TASK6B3A_ATTEMPT_PROTOCOL_2026-10-11.md"];
  assert.throws(() => verifyAuthoritativeClosure(withoutProtocol), /authoritative_closure_invalid/u, "imm_002_protocol_must_be_bound");
  assert.throws(() => repoPath("docs/v2/curriculum/de/../../outside.json"), /attempt_path_escapes_root|repo_path_not_normalized/u, "imm_004_traversal_must_fail_before_io");
  assert.throws(() => verifyImmutableAnchor(attemptsRoot, "b3a-fixture", "not-a-commit"), /immutable_anchor_commit_invalid/u, "imm_003_anchor_must_fail_closed");
  const anchorRepo = fs.mkdtempSync(path.join(os.tmpdir(), "b3a-immutable-anchor-"));
  const anchorAttemptId = "b3a-anchor-fixture";
  const anchorRelative = `docs/v2/curriculum/de/b3a-attempts/${anchorAttemptId}`;
  const anchorRoot = path.join(anchorRepo, anchorRelative);
  const git = (args: string[]) => execFileSync("git", args, { cwd: anchorRepo, encoding: "utf8" }).trim();
  try {
    git(["init"]); fs.mkdirSync(path.join(anchorRepo, ".no-hooks")); git(["config", "core.hooksPath", ".no-hooks"]); git(["config", "user.email", "gate@example.invalid"]); git(["config", "user.name", "B3A gate"]);
    fs.writeFileSync(path.join(anchorRepo, "seed.txt"), "seed\n"); git(["add", "."]); git(["commit", "-m", "seed"]);
    fs.mkdirSync(anchorRoot, { recursive: true });
    for (const name of ["snapshot.json", "guardian.json", "P.json", "review.spec.json", "review.adversarial.json", "F.json"]) fs.writeFileSync(path.join(anchorRoot, name), `${name}\n`);
    git(["add", "."]); git(["commit", "-m", "first attempt"]);
    const firstAnchor = git(["rev-parse", "HEAD"]);
    assert.doesNotThrow(() => verifyImmutableAnchor(anchorRoot, anchorAttemptId, firstAnchor, anchorRepo), "reachable_first_creation_unique_byte_identical_anchor_must_pass");
    fs.writeFileSync(path.join(anchorRoot, "P.json"), "changed\n");
    assert.throws(() => verifyImmutableAnchor(anchorRoot, anchorAttemptId, firstAnchor, anchorRepo), /immutable_anchor_drift:P.json/u, "byte_identity_bypass_must_fail");
    fs.writeFileSync(path.join(anchorRoot, "P.json"), "second attempt update\n"); git(["add", "."]); git(["commit", "-m", "second attempt update"]);
    const secondAnchor = git(["rev-parse", "HEAD"]);
    assert.throws(() => verifyImmutableAnchor(anchorRoot, anchorAttemptId, secondAnchor, anchorRepo), /immutable_anchor_not_first_creation/u, "first_creation_bypass_must_fail");
    assert.throws(() => verifyImmutableAnchor(anchorRoot, anchorAttemptId, firstAnchor, anchorRepo), /immutable_anchor_history_not_unique/u, "unique_history_bypass_must_fail");
    const branch = git(["branch", "--show-current"]); git(["checkout", "--orphan", "unreachable"]); git(["rm", "-rf", "."]); fs.writeFileSync(path.join(anchorRepo, "other.txt"), "other\n"); git(["add", "."]); git(["commit", "-m", "unreachable head"]);
    assert.throws(() => verifyImmutableAnchor(anchorRoot, anchorAttemptId, firstAnchor, anchorRepo), /Command failed/u, "reachable_head_bypass_must_fail");
    git(["checkout", branch]);
  } finally {
    fs.rmSync(anchorRepo, { recursive: true, force: true });
  }
  const preAttemptId = "b3a-self-test-pre";
  const isolatedRepo = fs.mkdtempSync(path.join(os.tmpdir(), "b3a-immutable-pre-"));
  try {
    for (const relative of requiredClosurePaths) {
      const source = repoPath(relative);
      const destination = path.join(isolatedRepo, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }
    execFileSync("git", ["init", "--quiet"], { cwd: isolatedRepo, encoding: "buffer" });
    fs.mkdirSync(path.join(isolatedRepo, ".no-hooks"));
    execFileSync("git", ["config", "core.hooksPath", ".no-hooks"], { cwd: isolatedRepo, encoding: "buffer" });
    execFileSync("git", ["config", "user.email", "gate@example.invalid"], { cwd: isolatedRepo, encoding: "buffer" });
    execFileSync("git", ["config", "user.name", "B3A gate"], { cwd: isolatedRepo, encoding: "buffer" });
    execFileSync("git", ["add", "."], { cwd: isolatedRepo, encoding: "buffer" });
    execFileSync("git", ["commit", "--quiet", "-m", "isolated pre fixture"], { cwd: isolatedRepo, encoding: "buffer" });
    const isolatedAttemptsRoot = path.join(isolatedRepo, "docs/v2/curriculum/de/b3a-attempts");
    const isolatedPreAttemptRoot = path.join(isolatedAttemptsRoot, preAttemptId);
    assert.ok(!fs.existsSync(isolatedPreAttemptRoot), "self_test_attempt_id_must_be_unused");
    fs.mkdirSync(isolatedPreAttemptRoot, { recursive: false });
    const isolatedGatePath = path.join(isolatedRepo, "tests/learning_v2_de_aufzug_b3a_immutable_attempt_gate.ts");
    const isolatedIndex = new Map(
      execFileSync("git", ["ls-files", "--stage", "-z"], { cwd: isolatedRepo, encoding: "buffer" }).toString("utf8").split("\0").filter(Boolean).map((row) => {
        const separator = row.indexOf("\t");
        return [row.slice(separator + 1), row.slice(0, separator)] as const;
      }),
    );
    const preEntries = Object.keys(closure)
      .sort()
      .map((entry) => {
        const absolute = path.join(isolatedRepo, entry);
        return { gitIndex: isolatedIndex.get(entry) ?? "UNTRACKED", path: entry, sha256: hashFile(absolute) };
      });
    const preSnapshot: Snapshot = {
      algorithm: "sha256(json-v1; per-path-working-tree+git-index)",
      attemptId: preAttemptId,
      entries: preEntries,
      snapshotRootSha256: canonicalRoot(preEntries),
    };
    fs.writeFileSync(path.join(isolatedPreAttemptRoot, "snapshot.json"), `${JSON.stringify(preSnapshot, null, 2)}\n`);
    const isolatedClosure = Object.fromEntries(requiredClosurePaths.map((relative) => [relative, hashFile(path.join(isolatedRepo, relative))]));
    const preGuardian: Guardian = { attemptId: preAttemptId, closure: isolatedClosure, snapshotRootSha256: preSnapshot.snapshotRootSha256, verdict: "PASS" };
    fs.writeFileSync(path.join(isolatedPreAttemptRoot, "guardian.json"), `${JSON.stringify(preGuardian, null, 2)}\n`);
    const preManifest: Pre = {
      attemptId: preAttemptId,
      candidateTuple,
      closure: isolatedClosure,
      guardian: { path: "guardian.json", sha256: hashFile(path.join(isolatedPreAttemptRoot, "guardian.json")) },
      snapshot: { path: "snapshot.json", rootSha256: preSnapshot.snapshotRootSha256 },
      stage: "P",
      status: pending,
    };
    fs.writeFileSync(path.join(isolatedPreAttemptRoot, "P.json"), `${JSON.stringify(preManifest, null, 2)}\n`);
    const preInvocation = spawnSync(
      process.execPath,
      [
        "--import",
        pathToFileURL(require.resolve("tsx")).href,
        isolatedGatePath,
        "--pre",
        preAttemptId,
      ],
      { cwd: isolatedRepo, encoding: "utf8", shell: false, windowsHide: true },
    );
    assert.equal(preInvocation.error, undefined, "valid_pre_attempt_spawn_failed");
    assert.equal(preInvocation.status, 0, preInvocation.stderr);
    assert.match(preInvocation.stdout, new RegExp(`TASK6B3A_ATTEMPT_PRE_VALIDATED attempt=${preAttemptId} candidateAcceptance=HOLD`, "u"));
  } finally {
    fs.rmSync(isolatedRepo, { recursive: true, force: true });
  }
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "b3a-immutable-attempt-"));
  const fixtureEntries = requiredClosurePaths.map((entry) => ({ gitIndex: "FIXTURE", path: entry, sha256: "0".repeat(64) }));
  const snapshot: Snapshot = { algorithm: "sha256(json-v1; per-path-working-tree+git-index)", attemptId: "b3a-fixture", entries: fixtureEntries, snapshotRootSha256: canonicalRoot(fixtureEntries) };
  const guardian: Guardian = { attemptId: "b3a-fixture", closure, snapshotRootSha256: snapshot.snapshotRootSha256, verdict: "PASS" };
  fs.writeFileSync(path.join(fixtureRoot, "guardian.json"), `${JSON.stringify(guardian, null, 2)}\n`);
  const pre: Pre = { attemptId: "b3a-fixture", candidateTuple, closure, guardian: { path: "guardian.json", sha256: hashFile(path.join(fixtureRoot, "guardian.json")) }, snapshot: { path: "snapshot.json", rootSha256: snapshot.snapshotRootSha256 }, stage: "P", status: pending };
  fs.writeFileSync(path.join(fixtureRoot, "P.json"), `${JSON.stringify(pre, null, 2)}\n`);
  assert.doesNotThrow(() => verifyPre(pre, snapshot, "b3a-fixture", fixtureRoot), "complete_pre_fixture_must_be_valid");
  const validSnapshotEntries = requiredClosurePaths.map((entry) => ({
    gitIndex: trackedIndex(entry),
    path: entry,
    sha256: hashFile(repoPath(entry)),
  }));
  const englishSnapshot: Snapshot = {
    ...snapshot,
    entries: [...validSnapshotEntries, { gitIndex: "FIXTURE", path: "docs/v2/curriculum/en/COURSE.md", sha256: "0".repeat(64) }].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
  };
  englishSnapshot.snapshotRootSha256 = canonicalRoot(englishSnapshot.entries);
  assert.throws(
    () => verifySnapshot(englishSnapshot, "b3a-fixture", fixtureRoot),
    /snapshot_path_not_in_required_closure/u,
    "english_path_must_not_be_snapshot",
  );
  assert.throws(() => verifyPre({ ...pre, F: "F.json" } as Pre, snapshot, "b3a-fixture", fixtureRoot), /pre_schema_invalid/u, "imm_005_pre_must_not_name_final");
  const reviews: Final["reviews"] = {
    spec: { path: "review.spec.json", sha256: "" },
    adversarial: { path: "review.adversarial.json", sha256: "" },
  };
  const reviewData: Record<keyof Final["reviews"], Review> = {
    spec: { attemptId: "b3a-fixture", preManifestSha256: hashFile(path.join(fixtureRoot, "P.json")), reviewerRole: "orbit-spec-reviewer", reviewerTask: "/root/b3a_fixture_spec", snapshotRootSha256: snapshot.snapshotRootSha256, verdict: "PASS" },
    adversarial: { attemptId: "b3a-fixture", preManifestSha256: hashFile(path.join(fixtureRoot, "P.json")), reviewerRole: "orbit-red-team", reviewerTask: "/root/b3a_fixture_adversarial", snapshotRootSha256: snapshot.snapshotRootSha256, verdict: "PASS" },
  };
  for (const kind of ["spec", "adversarial"] as const) {
    fs.writeFileSync(path.join(fixtureRoot, reviews[kind].path), `${JSON.stringify(reviewData[kind], null, 2)}\n`);
    reviews[kind].sha256 = hashFile(path.join(fixtureRoot, reviews[kind].path));
  }
  const established = { ...terminalHold, historicalB1Replay: "UNAVAILABLE_NOT_CLAIMED", candidateAcceptance: "ACCEPTED_UNDER_B4_CURRENT_STATE", b3aAcceptance: "ESTABLISHED" };
  const finalFixture: Final = { attemptId: "b3a-fixture", candidateTuple, closure, preManifestSha256: hashFile(path.join(fixtureRoot, "P.json")), reviews, snapshotRootSha256: snapshot.snapshotRootSha256, stage: "F", status: established };
  fs.writeFileSync(path.join(fixtureRoot, "F.json"), `${JSON.stringify(finalFixture, null, 2)}\n`);
  assert.doesNotThrow(() => verifyFinal(finalFixture, path.join(fixtureRoot, "P.json"), pre, snapshot, "b3a-fixture", fixtureRoot), "complete_final_fixture_must_be_valid");
  assert.throws(() => verifyFinal({ ...finalFixture, reviews: { ...reviews, spec: { ...reviews.spec, path: "P.json" } } }, path.join(fixtureRoot, "P.json"), pre, snapshot, "b3a-fixture", fixtureRoot), /review_path_invalid:spec/u, "review_path_bypass_must_fail");
  assert.throws(() => verifyFinal({ ...finalFixture, F: "shadow" } as Final, path.join(fixtureRoot, "P.json"), pre, snapshot, "b3a-fixture", fixtureRoot), /final_schema_invalid/u, "imm_005_final_must_not_shadow_release");
  const nonCanonical = path.join(fixtureRoot, "noncanonical.json");
  fs.writeFileSync(nonCanonical, "{\n  \"x\": 1\n}\n\n");
  assert.throws(() => readCanonicalJson(nonCanonical), /json_not_canonical:noncanonical.json/u, "canonical_json_bypass_must_fail");
}

const [mode, attemptId, anchorCommit] = process.argv.slice(2);
if (mode === "--self-test" && !attemptId) {
  selfTest();
  console.log("TASK6B3A_IMMUTABLE_ATTEMPT_GATE_DESIGN_VALIDATED acceptance=HOLD");
} else if ((mode === "--pre" || mode === "--final") && attemptId && (mode === "--pre" || anchorCommit)) {
  verifyAttempt(attemptId, mode === "--final", anchorCommit);
  console.log(`TASK6B3A_ATTEMPT_${mode === "--final" ? "FINAL" : "PRE"}_VALIDATED attempt=${attemptId} candidateAcceptance=${mode === "--final" ? "ACCEPTED_UNDER_B4_CURRENT_STATE" : "HOLD"}`);
} else {
  throw new Error("usage: --self-test | --pre <attempt-id> | --final <attempt-id> <immutable-anchor-commit>");
}
