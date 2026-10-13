import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = "modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_receipt_closure_v1";
const ADMISSION_PATH = "modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_admission_v1/manifest.json";
const ADMISSION_SHA256 = "2573f1435c6f5a5e1da1240fcf87bfb4458141193950190c2cbd59fccd5b4256";
const REVIEW_FILES = {
  native: ["native_review.json", "4ded9890bbd1ae2cdb5c48ddf9720ed77e591901ef1de6193bb89ac8b4b31b05", "/root/einladung_hardened_native", "EINLADUNG_ADMISSION_SCOPE_SEMANTICS_TRUST_ROOT_HOLD_ONLY"],
  adversarial: ["adversarial_review.json", "de245c242a574e215aeb42eec940d2d71abe246bf0f71304374cfbacb6cb79ff", "/root/einladung_hardened_adversarial", "EINLADUNG_ADMISSION_FULL_FORGE_REPLAY_SCOPE_ONLY"],
} as const;
type RecordValue = Record<string, unknown>;
function fail(code: string): never { throw new Error(code); }
function sha256(value: Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function record(value: unknown, code: string): asserts value is RecordValue { if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code); }
function exactKeys(value: RecordValue, keys: readonly string[], code: string): void { if (Object.keys(value).sort().join("\u0000") !== [...keys].sort().join("\u0000")) fail(code); }
function json(pathname: string, code: string): RecordValue { try { const value: unknown = JSON.parse(fs.readFileSync(pathname, "utf8")); record(value, code); return value; } catch { return fail(code); } }
export type GermanTask6cL01EinladungReceiptClosureDeV1 = Readonly<{ candidateAcceptance: "ACCEPTED_UNDER_TASK6C_CURRENT_STATE"; canonicalAdmission: "FORBIDDEN"; task6CompletionEstablished: false; task7Unlock: false }>;

/** Acyclic current-state closure: it binds P and externally attested review summaries without granting delivery authority. */
export function loadGermanTask6cL01EinladungReceiptClosureDeV1(options: Readonly<{ rootForTest?: string; admissionManifestPathForTest?: string }> = {}): GermanTask6cL01EinladungReceiptClosureDeV1 {
  const root = options.rootForTest ?? ROOT, admissionPath = options.admissionManifestPathForTest ?? ADMISSION_PATH;
  const closure = json(path.join(root, "closure.json"), "einladung_receipt_closure");
  exactKeys(closure, ["schemaVersion", "status", "candidateAcceptance", "canonicalAdmission", "rowsPromoted", "task7Unlock", "learnerFacing", "phraseClaim", "task6CompletionEstablished", "admissionManifest", "reviewRecords"], "einladung_receipt_closure_schema");
  if (closure.schemaVersion !== "learning-v2-de-task6c-l01-einladung-receipt-closure.v1" || closure.status !== "HOLD" || closure.candidateAcceptance !== "ACCEPTED_UNDER_TASK6C_CURRENT_STATE" || closure.canonicalAdmission !== "FORBIDDEN" || closure.rowsPromoted !== 0 || closure.task7Unlock !== false || closure.learnerFacing !== false || closure.phraseClaim !== false || closure.task6CompletionEstablished !== false) fail("einladung_receipt_closure_authority");
  record(closure.admissionManifest, "einladung_receipt_admission_binding"); exactKeys(closure.admissionManifest, ["path", "sha256"], "einladung_receipt_admission_binding"); if (closure.admissionManifest.path !== ADMISSION_PATH || closure.admissionManifest.sha256 !== ADMISSION_SHA256 || sha256(fs.readFileSync(admissionPath)) !== ADMISSION_SHA256) fail("einladung_receipt_admission_binding");
  record(closure.reviewRecords, "einladung_receipt_closure_schema"); exactKeys(closure.reviewRecords, Object.keys(REVIEW_FILES), "einladung_receipt_closure_schema");
  for (const [name, [filename, expectedHash, transcriptRoot, scope]] of Object.entries(REVIEW_FILES)) {
    const binding = closure.reviewRecords[name]; record(binding, "einladung_receipt_closure_schema"); exactKeys(binding, ["path", "sha256", "recordKind", "independence"], "einladung_receipt_closure_schema"); if (binding.path !== filename || binding.sha256 !== expectedHash || binding.recordKind !== "ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY" || binding.independence !== "NOT_SELF_PROVED_BY_THIS_RECEIPT") fail("einladung_receipt_closure_schema"); const bytes = fs.readFileSync(path.join(root, filename)); if (sha256(bytes) !== expectedHash) fail(`einladung_receipt_${name}_review_hash`); const review = json(path.join(root, filename), `einladung_receipt_${name}_review`); const expectedKeys = name === "native" ? ["schemaVersion", "recordKind", "transcriptRoot", "verdict", "findings", "scope", "trustRoot", "holdState", "independence"] : ["schemaVersion", "recordKind", "transcriptRoot", "verdict", "findings", "scope", "fullForgeReplaysRejected", "holdState", "independence"]; exactKeys(review, expectedKeys, `einladung_receipt_${name}_review`); record(review.findings, `einladung_receipt_${name}_review`); exactKeys(review.findings, ["p0ToP2"], `einladung_receipt_${name}_review`); if (review.schemaVersion !== "learning-v2-de-task6c-l01-einladung-review-record.v1" || review.recordKind !== "ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY" || review.transcriptRoot !== transcriptRoot || review.verdict !== "PASS" || review.findings.p0ToP2 !== 0 || review.scope !== scope || review.holdState !== "HOLD_FORBIDDEN_NO_PROMOTION" || review.independence !== "NOT_SELF_PROVED_BY_THIS_RECEIPT") fail(`einladung_receipt_${name}_review`); if (name === "native" && review.trustRoot !== "IMMUTABLE_CAPTURE_RAW_BYTES_AND_PINNED_AUTHORITIES") fail("einladung_receipt_native_review"); if (name === "adversarial" && review.fullForgeReplaysRejected !== true) fail("einladung_receipt_adversarial_review");
  }
  return { candidateAcceptance: "ACCEPTED_UNDER_TASK6C_CURRENT_STATE", canonicalAdmission: "FORBIDDEN", task6CompletionEstablished: false, task7Unlock: false };
}
