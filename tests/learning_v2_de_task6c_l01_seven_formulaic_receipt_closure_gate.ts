import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const repo = process.cwd();
const root = path.join(repo, "docs/v2/curriculum/de/task6c-l01-seven-formulaic-closure-v1");
const manifest = path.join(repo, "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1/manifest.json");
const P = "2c3bca21dc11dee134979bacf64520cca3ce1dce1d0bd58b16657d2f75955e98";
const nativeName = "review.native.record.json", adversarialName = "review.adversarial.record.json", finalName = "F.json";
type RecordValue = Record<string, unknown>;
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const read = (file: string): unknown => JSON.parse(fs.readFileSync(file, "utf8"));
function record(value: unknown, code: string): asserts value is RecordValue { if (!value || typeof value !== "object" || Array.isArray(value)) throw Error(code); }
function keys(value: RecordValue, expected: readonly string[], code: string): void { if (Object.keys(value).sort().join("\0") !== [...expected].sort().join("\0")) throw Error(code); }
function inspect(base: string, manifestPath = manifest): void {
  if (hash(fs.readFileSync(manifestPath)) !== P) throw Error("task6c_l01_formulaic_closure_P_hash");
  const reviewFiles = [nativeName, adversarialName].map((name) => path.join(base, name));
  for (const file of reviewFiles) {
    const review = read(file); record(review, "task6c_l01_formulaic_closure_review_invalid");
    keys(review, ["schemaVersion", "recordKind", "source", "reviewTaskIdentity", "reviewerRole", "reviewedManifest", "verdict", "scope", "limitations", "status"], "task6c_l01_formulaic_closure_review_schema");
    if (review.schemaVersion !== "learning-v2-de-task6c-l01-independent-review-record.v1" || review.recordKind !== "ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY" || review.source !== "root message transcript" || review.reviewerRole !== "economy-reviewer" || review.verdict !== "PASS" || review.status !== "HOLD_ONLY") throw Error("task6c_l01_formulaic_closure_review_authority");
    if (typeof review.reviewTaskIdentity !== "string" || !Array.isArray(review.scope) || !Array.isArray(review.limitations) || !review.limitations.includes("THIS_RECORD_DOES_NOT_SELF_PROVE_INDEPENDENCE")) throw Error("task6c_l01_formulaic_closure_review_binding");
    record(review.reviewedManifest, "task6c_l01_formulaic_closure_review_P"); keys(review.reviewedManifest, ["path", "sha256"], "task6c_l01_formulaic_closure_review_P_schema");
    if (review.reviewedManifest.path !== "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1/manifest.json" || review.reviewedManifest.sha256 !== P || /(?:CANONICAL_ADMISSION|RELEASED|TASK7_UNLOCKED|ROWS_PROMOTED)/u.test(JSON.stringify(review))) throw Error("task6c_l01_formulaic_closure_review_binding");
  }
  const F = read(path.join(base, finalName)); record(F, "task6c_l01_formulaic_closure_F_invalid"); keys(F, ["schemaVersion", "stage", "preManifest", "reviews", "status", "limitations"], "task6c_l01_formulaic_closure_F_schema");
  if (F.schemaVersion !== "learning-v2-de-task6c-l01-receipt-closure.v1" || F.stage !== "F") throw Error("task6c_l01_formulaic_closure_F_authority");
  record(F.preManifest, "task6c_l01_formulaic_closure_F_P_invalid"); keys(F.preManifest, ["path", "sha256"], "task6c_l01_formulaic_closure_F_P_schema"); if (F.preManifest.path !== "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1/manifest.json" || F.preManifest.sha256 !== P) throw Error("task6c_l01_formulaic_closure_F_P_invalid");
  record(F.reviews, "task6c_l01_formulaic_closure_F_reviews_invalid"); keys(F.reviews, ["native", "adversarial"], "task6c_l01_formulaic_closure_F_reviews_schema");
  for (const [key, name] of [["native", nativeName], ["adversarial", adversarialName]] as const) { record(F.reviews[key], "task6c_l01_formulaic_closure_F_review_invalid"); keys(F.reviews[key], ["path", "sha256"], "task6c_l01_formulaic_closure_F_review_schema"); if (F.reviews[key].path !== `docs/v2/curriculum/de/task6c-l01-seven-formulaic-closure-v1/${name}` || F.reviews[key].sha256 !== hash(fs.readFileSync(path.join(base, name)))) throw Error("task6c_l01_formulaic_closure_F_review_hash"); }
  record(F.status, "task6c_l01_formulaic_closure_F_status_invalid"); keys(F.status, ["candidateAcceptance", "status", "canonicalAdmission", "rowsPromoted", "task7Unlock", "learnerFacing", "phraseClaim", "learnerAuthoring", "mockup", "audio", "runtime", "release"], "task6c_l01_formulaic_closure_F_status_schema"); const s = F.status;
  if (s.candidateAcceptance !== "ACCEPTED_UNDER_TASK6C_CURRENT_STATE" || s.status !== "HOLD" || s.canonicalAdmission !== "FORBIDDEN" || s.rowsPromoted !== 0 || s.task7Unlock !== false || s.learnerFacing !== false || s.phraseClaim !== false || s.learnerAuthoring !== "HOLD" || s.mockup !== "HOLD" || s.audio !== "HOLD" || s.runtime !== "HOLD" || s.release !== "HOLD" || !Array.isArray(F.limitations) || !F.limitations.includes("F_DOES_NOT_PROMOTE_OR_UNLOCK")) throw Error("task6c_l01_formulaic_closure_F_status_invalid");
  if (JSON.stringify(F).includes("F.json\"")) throw Error("task6c_l01_formulaic_closure_F_self_cycle");
}
function fixture(): string { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "de-formulaic-closure-")); fs.cpSync(root, dir, { recursive: true }); return dir; }
function write(file: string, value: unknown): void { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function hostile(mutator: (dir: string) => void, expected: RegExp): void { const dir = fixture(); try { mutator(dir); assert.throws(() => inspect(dir), expected); } finally { fs.rmSync(dir, { recursive: true, force: true }); } }
inspect(root);
hostile((dir) => { const f = path.join(dir, nativeName), v: any = read(f); v.reviewedManifest.sha256 = "0".repeat(64); write(f, v); }, /review_binding/u);
hostile((dir) => { const f = path.join(dir, finalName), v: any = read(f); v.preManifest.sha256 = "0".repeat(64); write(f, v); }, /F_P_invalid/u);
hostile((dir) => { const f = path.join(dir, finalName), v: any = read(f); v.reviews.native.sha256 = "0".repeat(64); write(f, v); }, /F_review_hash/u);
hostile((dir) => { const f = path.join(dir, adversarialName), v: any = read(f); v.status = "APPROVED"; write(f, v); }, /review_authority/u);
hostile((dir) => { const f = path.join(dir, finalName), v: any = read(f); v.status.task7Unlock = true; write(f, v); }, /F_status_invalid/u);
hostile((dir) => { const f = path.join(dir, finalName), v: any = read(f); v.status.canonicalAdmission = "CANONICAL"; write(f, v); }, /F_status_invalid/u);
hostile((dir) => { const f = path.join(dir, finalName), v: any = read(f); v.self = "F.json"; write(f, v); }, /F_schema/u);
hostile((dir) => { const f = path.join(dir, finalName), v: any = read(f); v.limitations.push("F.json"); write(f, v); }, /F_self_cycle/u);
{ const dir = fixture(), changed = path.join(dir, "P.post-edit.json"); try { fs.copyFileSync(manifest, changed); fs.appendFileSync(changed, " "); assert.throws(() => inspect(dir, changed), /P_hash/u); } finally { fs.rmSync(dir, { recursive: true, force: true }); } }
process.stdout.write("TASK6C_L01_SEVEN_FORMULAIC_RECEIPT_CLOSURE status=HOLD candidateAcceptance=ACCEPTED_UNDER_TASK6C_CURRENT_STATE rowsPromoted=0 task7Unlock=false\n");
