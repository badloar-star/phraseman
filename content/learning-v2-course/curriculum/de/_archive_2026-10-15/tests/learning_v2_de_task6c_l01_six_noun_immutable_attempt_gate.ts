import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const repo = process.cwd();
const relative = "docs/v2/curriculum/de/task6c-six-noun-attempts/task6c-l01-six-noun-20261011-01";
const attemptRoot = path.join(repo, relative);
const P = "a3a44ab4d1bc79ccc0af6741070eeb36267382fab2f44bb3dfb912adcdb42b55";
const NATIVE = "58f5ce80d09ab91fbca3770bb7d91f365857045c6bb14d70070181a652183134";
const ADVERSARIAL = "d7659bf4db1ffe0f2ec32afb6fdb3e89070881e2eaebc164f2d0dd91b7046105";
const CLOSURE = "6bc849c3369468cfb59be92bfcbd249473f65a29c8e9170385ddcfbcfe619c44";
type R = Record<string, unknown>;
const sha = (file: string) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const read = (file: string): unknown => JSON.parse(fs.readFileSync(file, "utf8"));
function record(value: unknown, code: string): asserts value is R { if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(code); }
function exact(value: R, fields: readonly string[], code: string): void { if (Object.keys(value).sort().join("\0") !== [...fields].sort().join("\0")) throw new Error(code); }
function inspect(root = attemptRoot, checkCreateOnly = true): void {
  const snapshot: unknown = read(path.join(root, "snapshot.json")); record(snapshot, "task6c_attempt_snapshot_invalid"); exact(snapshot, ["schemaVersion", "attemptId", "scope", "preManifest", "reviewRecords", "closureReceipt", "limits", "deterministicVerifier"], "task6c_attempt_snapshot_schema");
  if (snapshot.schemaVersion !== "learning-v2-de-task6c-l01-six-noun-attempt-snapshot.v1" || snapshot.attemptId !== "task6c-l01-six-noun-20261011-01" || snapshot.scope !== "PARTIAL_TASK6C_CURRENT_STATE_ONLY") throw new Error("task6c_attempt_snapshot_identity");
  for (const [field, digest] of [["preManifest", P], ["closureReceipt", CLOSURE]] as const) { record(snapshot[field], "task6c_attempt_snapshot_binding"); exact(snapshot[field], ["path", "sha256"], "task6c_attempt_snapshot_binding_schema"); if (snapshot[field].sha256 !== digest) throw new Error("task6c_attempt_snapshot_binding"); }
  record(snapshot.reviewRecords, "task6c_attempt_snapshot_reviews"); exact(snapshot.reviewRecords, ["native", "adversarial"], "task6c_attempt_snapshot_reviews_schema"); for (const [field, digest] of [["native", NATIVE], ["adversarial", ADVERSARIAL]] as const) { record(snapshot.reviewRecords[field], "task6c_attempt_snapshot_reviews"); exact(snapshot.reviewRecords[field], ["path", "sha256"], "task6c_attempt_snapshot_review_schema"); if (snapshot.reviewRecords[field].sha256 !== digest) throw new Error("task6c_attempt_snapshot_reviews"); }
  record(snapshot.limits, "task6c_attempt_limits_invalid"); exact(snapshot.limits, ["canonicalAdmission", "rowsPromoted", "task7Unlock", "learnerFacing", "phraseClaim", "release"], "task6c_attempt_limits_schema"); if (snapshot.limits.canonicalAdmission !== "FORBIDDEN" || snapshot.limits.rowsPromoted !== 0 || snapshot.limits.task7Unlock !== false || snapshot.limits.learnerFacing !== false || snapshot.limits.phraseClaim !== false || snapshot.limits.release !== "HOLD") throw new Error("task6c_attempt_limits_invalid");
  record(snapshot.deterministicVerifier, "task6c_attempt_verifier_invalid"); exact(snapshot.deterministicVerifier, ["command", "expectedExit", "truth"], "task6c_attempt_verifier_schema"); if (snapshot.deterministicVerifier.command !== "node --import tsx tests/learning_v2_de_task6c_l01_six_noun_receipt_closure_gate.ts" || snapshot.deterministicVerifier.expectedExit !== 0 || snapshot.deterministicVerifier.truth !== "STRUCTURAL_RECEIPT_CLOSURE_ONLY") throw new Error("task6c_attempt_verifier_invalid");
  const snapshotHash = sha(path.join(root, "snapshot.json")); const pre: unknown = read(path.join(root, "P.json")); record(pre, "task6c_attempt_P_invalid"); exact(pre, ["schemaVersion", "attemptId", "snapshotSha256", "preManifestSha256", "status"], "task6c_attempt_P_schema"); if (pre.schemaVersion !== "learning-v2-de-task6c-l01-six-noun-attempt-pre.v1" || pre.attemptId !== snapshot.attemptId || pre.snapshotSha256 !== snapshotHash || pre.preManifestSha256 !== P || pre.status !== "HOLD") throw new Error("task6c_attempt_P_invalid");
  const preHash = sha(path.join(root, "P.json")); const F: unknown = read(path.join(root, "F.json")); record(F, "task6c_attempt_F_invalid"); exact(F, ["schemaVersion", "attemptId", "snapshotSha256", "preReceiptSha256", "bindings", "status", "limitations"], "task6c_attempt_F_schema"); if (F.schemaVersion !== "learning-v2-de-task6c-l01-six-noun-attempt-final.v1" || F.attemptId !== snapshot.attemptId || F.snapshotSha256 !== snapshotHash || F.preReceiptSha256 !== preHash) throw new Error("task6c_attempt_F_chain_invalid");
  record(F.bindings, "task6c_attempt_F_bindings_invalid"); exact(F.bindings, ["preManifestSha256", "nativeReviewSha256", "adversarialReviewSha256", "closureReceiptSha256"], "task6c_attempt_F_bindings_schema"); if (F.bindings.preManifestSha256 !== P || F.bindings.nativeReviewSha256 !== NATIVE || F.bindings.adversarialReviewSha256 !== ADVERSARIAL || F.bindings.closureReceiptSha256 !== CLOSURE) throw new Error("task6c_attempt_F_bindings_invalid");
  record(F.status, "task6c_attempt_F_status_invalid"); exact(F.status, ["attemptAcceptance", "status", "canonicalAdmission", "rowsPromoted", "task7Unlock", "learnerFacing", "phraseClaim", "task6Completion", "release"], "task6c_attempt_F_status_schema"); if (F.status.attemptAcceptance !== "PARTIAL_TASK6C_CURRENT_STATE_ACCEPTED" || F.status.status !== "HOLD" || F.status.canonicalAdmission !== "FORBIDDEN" || F.status.rowsPromoted !== 0 || F.status.task7Unlock !== false || F.status.learnerFacing !== false || F.status.phraseClaim !== false || F.status.task6Completion !== "NOT_ESTABLISHED" || F.status.release !== "HOLD" || !Array.isArray(F.limitations) || !F.limitations.includes("ATTEMPT_DOES_NOT_MUTATE_CANONICAL_REGISTRY_OR_RELEASE")) throw new Error("task6c_attempt_F_status_invalid");
  if (checkCreateOnly) { const head = spawnSync("git", ["cat-file", "-e", `HEAD:${relative}/F.json`], { cwd: repo }); if (head.status === 0) throw new Error("task6c_attempt_not_create_only"); }
}
function fixture(): string { const temp = fs.mkdtempSync(path.join(os.tmpdir(), "de-six-noun-attempt-")); fs.cpSync(attemptRoot, temp, { recursive: true }); return temp; }
function write(file: string, value: unknown): void { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function hostile(mutate: (dir: string) => void, expected: RegExp): void { const dir = fixture(); try { mutate(dir); assert.throws(() => inspect(dir, false), expected); } finally { fs.rmSync(dir, { recursive: true, force: true }); } }

inspect();
hostile((dir) => { const f = path.join(dir, "snapshot.json"), v: any = read(f); v.preManifest.sha256 = "0".repeat(64); write(f, v); }, /task6c_attempt_snapshot_binding/u);
hostile((dir) => { const f = path.join(dir, "F.json"), v: any = read(f); v.bindings.nativeReviewSha256 = "0".repeat(64); write(f, v); }, /task6c_attempt_F_bindings_invalid/u);
hostile((dir) => { const f = path.join(dir, "F.json"), v: any = read(f); v.status.task7Unlock = true; write(f, v); }, /task6c_attempt_F_status_invalid/u);
hostile((dir) => { const f = path.join(dir, "F.json"), v: any = read(f); v.status.attemptAcceptance = "CANONICAL_APPROVED"; write(f, v); }, /task6c_attempt_F_status_invalid/u);
hostile((dir) => { const f = path.join(dir, "F.json"), v: any = read(f); v.forged = true; write(f, v); }, /task6c_attempt_F_schema/u);
process.stdout.write("TASK6C_L01_SIX_NOUN_ATTEMPT_CREATE_ONLY status=HOLD acceptance=PARTIAL_TASK6C_CURRENT_STATE_ACCEPTED rowsPromoted=0 task7Unlock=false\n");
