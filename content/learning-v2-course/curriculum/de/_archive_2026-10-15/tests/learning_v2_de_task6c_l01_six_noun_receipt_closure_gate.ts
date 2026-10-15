import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const repo = process.cwd();
const root = path.join(repo, "docs/v2/curriculum/de/task6c-l01-six-noun-closure-v1");
const manifest = path.join(repo, "modules/learning-v2/curriculum/de/evidence/task6c_l01_six_noun_admission_v1/manifest.json");
const P = "a3a44ab4d1bc79ccc0af6741070eeb36267382fab2f44bb3dfb912adcdb42b55";
const nativeName = "review.native.record.json";
const adversarialName = "review.adversarial.record.json";
const finalName = "F.json";

type RecordValue = Record<string, unknown>;
function hash(bytes: Buffer): string { return createHash("sha256").update(bytes).digest("hex"); }
function read(file: string): unknown { return JSON.parse(fs.readFileSync(file, "utf8")); }
function record(value: unknown, code: string): asserts value is RecordValue { if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(code); }
function keys(value: RecordValue, expected: readonly string[], code: string): void { if (Object.keys(value).sort().join("\0") !== [...expected].sort().join("\0")) throw new Error(code); }
function text(value: unknown, code: string): asserts value is string { if (typeof value !== "string" || value.length === 0) throw new Error(code); }
function inspect(base: string, manifestPath = manifest): void {
  if (hash(fs.readFileSync(manifestPath)) !== P) throw new Error("task6c_l01_six_closure_P_hash");
  const recordPaths = [nativeName, adversarialName].map((name) => path.join(base, name));
  const parsedReviews = recordPaths.map((file) => { const v = read(file); record(v, "task6c_l01_six_closure_review_invalid"); return v; });
  const expectedRoles = ["NATIVE_GERMAN_REVIEW", "ADVERSARIAL_REVIEW"];
  for (const [index, review] of parsedReviews.entries()) {
    keys(review, ["schemaVersion", "recordKind", "source", "reviewTaskIdentity", "reviewerRole", "reviewedManifest", "verdict", "scope", "limitations", "status"], "task6c_l01_six_closure_review_schema");
    if (review.schemaVersion !== "learning-v2-de-task6c-l01-independent-review-record.v1" || review.recordKind !== "ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY" || review.source !== "root message transcript" || review.reviewerRole !== expectedRoles[index] || review.verdict !== "PASS" || review.status !== "HOLD_ONLY") throw new Error("task6c_l01_six_closure_review_authority");
    text(review.reviewTaskIdentity, "task6c_l01_six_closure_review_task"); record(review.reviewedManifest, "task6c_l01_six_closure_review_P"); keys(review.reviewedManifest, ["path", "sha256"], "task6c_l01_six_closure_review_P_schema"); if (review.reviewedManifest.path !== "modules/learning-v2/curriculum/de/evidence/task6c_l01_six_noun_admission_v1/manifest.json" || review.reviewedManifest.sha256 !== P || !Array.isArray(review.scope) || !Array.isArray(review.limitations) || !review.limitations.includes("THIS_RECORD_DOES_NOT_SELF_PROVE_INDEPENDENCE")) throw new Error("task6c_l01_six_closure_review_binding");
    if (JSON.stringify(review).match(/(?:CANONICAL_ADMISSION|RELEASED|TASK7_UNLOCKED|ROWS_PROMOTED)/u)) throw new Error("task6c_l01_six_closure_review_upgrade");
  }
  const F: unknown = read(path.join(base, finalName)); record(F, "task6c_l01_six_closure_F_invalid");
  keys(F, ["schemaVersion", "stage", "preManifest", "reviews", "status", "limitations"], "task6c_l01_six_closure_F_schema");
  if (F.schemaVersion !== "learning-v2-de-task6c-l01-receipt-closure.v1" || F.stage !== "F") throw new Error("task6c_l01_six_closure_F_authority");
  record(F.preManifest, "task6c_l01_six_closure_F_P_invalid"); keys(F.preManifest, ["path", "sha256"], "task6c_l01_six_closure_F_P_schema"); if (F.preManifest.path !== "modules/learning-v2/curriculum/de/evidence/task6c_l01_six_noun_admission_v1/manifest.json" || F.preManifest.sha256 !== P) throw new Error("task6c_l01_six_closure_F_P_invalid");
  record(F.reviews, "task6c_l01_six_closure_F_reviews_invalid"); keys(F.reviews, ["native", "adversarial"], "task6c_l01_six_closure_F_reviews_schema");
  for (const [key, name] of [["native", nativeName], ["adversarial", adversarialName]] as const) { record(F.reviews[key], "task6c_l01_six_closure_F_review_invalid"); keys(F.reviews[key], ["path", "sha256"], "task6c_l01_six_closure_F_review_schema"); if (F.reviews[key].path !== `docs/v2/curriculum/de/task6c-l01-six-noun-closure-v1/${name}` || F.reviews[key].sha256 !== hash(fs.readFileSync(path.join(base, name)))) throw new Error("task6c_l01_six_closure_F_review_hash"); }
  record(F.status, "task6c_l01_six_closure_F_status_invalid"); keys(F.status, ["candidateAcceptance", "status", "canonicalAdmission", "rowsPromoted", "task7Unlock", "learnerFacing", "phraseClaim", "learnerAuthoring", "mockup", "audio", "runtime", "release"], "task6c_l01_six_closure_F_status_schema");
  const s = F.status; if (s.candidateAcceptance !== "ACCEPTED_UNDER_TASK6C_CURRENT_STATE" || s.status !== "HOLD" || s.canonicalAdmission !== "FORBIDDEN" || s.rowsPromoted !== 0 || s.task7Unlock !== false || s.learnerFacing !== false || s.phraseClaim !== false || s.learnerAuthoring !== "HOLD" || s.mockup !== "HOLD" || s.audio !== "HOLD" || s.runtime !== "HOLD" || s.release !== "HOLD" || !Array.isArray(F.limitations) || !F.limitations.includes("F_DOES_NOT_PROMOTE_OR_UNLOCK")) throw new Error("task6c_l01_six_closure_F_status_invalid");
  if (JSON.stringify(F).includes("F.json\"")) throw new Error("task6c_l01_six_closure_F_self_cycle");
}
function fixture(): string { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "de-six-noun-closure-")); fs.cpSync(root, dir, { recursive: true }); return dir; }
function write(file: string, value: unknown): void { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function hostile(mutator: (dir: string) => void, expected: RegExp): void { const dir = fixture(); try { mutator(dir); assert.throws(() => inspect(dir), expected); } finally { fs.rmSync(dir, { recursive: true, force: true }); } }

inspect(root);
hostile((dir) => { const f = path.join(dir, nativeName), v: any = read(f); v.reviewedManifest.sha256 = "0".repeat(64); write(f, v); }, /task6c_l01_six_closure_review_binding/u);
hostile((dir) => { const f = path.join(dir, finalName), v: any = read(f); v.preManifest.sha256 = "0".repeat(64); write(f, v); }, /task6c_l01_six_closure_F_P_invalid/u);
hostile((dir) => { const f = path.join(dir, finalName), v: any = read(f); v.reviews.native.sha256 = "0".repeat(64); write(f, v); }, /task6c_l01_six_closure_F_review_hash/u);
hostile((dir) => { const f = path.join(dir, adversarialName), v: any = read(f); v.status = "APPROVED"; write(f, v); }, /task6c_l01_six_closure_review_authority/u);
hostile((dir) => { const f = path.join(dir, finalName), v: any = read(f); v.status.task7Unlock = true; write(f, v); }, /task6c_l01_six_closure_F_status_invalid/u);
hostile((dir) => { const f = path.join(dir, finalName), v: any = read(f); v.self = "F.json"; write(f, v); }, /task6c_l01_six_closure_F_schema/u);
process.stdout.write("TASK6C_L01_SIX_NOUN_RECEIPT_CLOSURE status=HOLD candidateAcceptance=ACCEPTED_UNDER_TASK6C_CURRENT_STATE rowsPromoted=0 task7Unlock=false\n");
