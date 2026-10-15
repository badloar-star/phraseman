import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = "modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_immutable_attempt_v1";
const BINDINGS = {
  admissionManifest: ["modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_admission_v1/manifest.json", "2573f1435c6f5a5e1da1240fcf87bfb4458141193950190c2cbd59fccd5b4256"],
  nativeReview: ["modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_receipt_closure_v1/native_review.json", "4ded9890bbd1ae2cdb5c48ddf9720ed77e591901ef1de6193bb89ac8b4b31b05"],
  adversarialReview: ["modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_receipt_closure_v1/adversarial_review.json", "de245c242a574e215aeb42eec940d2d71abe246bf0f71304374cfbacb6cb79ff"],
  receiptClosure: ["modules/learning-v2/curriculum/de/evidence/task6c_l01_einladung_receipt_closure_v1/closure.json", "4db2ee8b314b8f9e3375ae5187342a850ecac53a8918fd694a2c7436787c46d9"],
} as const;
type RecordValue = Record<string, unknown>;
function fail(code: string): never { throw new Error(code); }
function sha256(bytes: Buffer): string { return createHash("sha256").update(bytes).digest("hex"); }
function record(value: unknown, code: string): asserts value is RecordValue { if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code); }
function exactKeys(value: RecordValue, keys: readonly string[], code: string): void { if (Object.keys(value).sort().join("\u0000") !== [...keys].sort().join("\u0000")) fail(code); }
export type GermanTask6cL01EinladungImmutableAttemptDeV1 = Readonly<{ status: "PARTIAL_TASK6C_CURRENT_STATE_ACCEPTED"; canonicalAdmission: "FORBIDDEN"; task6Completion: "NOT_ESTABLISHED"; releaseStatus: "HOLD" }>;

/** Immutable, byte-bound record of the current Einladung Task6C attempt; it grants no completion, release, or canonical authority. */
export function loadGermanTask6cL01EinladungImmutableAttemptDeV1(options: Readonly<{ rootForTest?: string }> = {}): GermanTask6cL01EinladungImmutableAttemptDeV1 {
  const root = options.rootForTest ?? ROOT;
  let attempt: unknown; try { attempt = JSON.parse(fs.readFileSync(path.join(root, "attempt.json"), "utf8")); } catch { return fail("einladung_attempt_invalid"); } record(attempt, "einladung_attempt_invalid");
  exactKeys(attempt, ["schemaVersion", "status", "canonicalAdmission", "rowsPromoted", "task7Unlock", "learnerFacing", "phraseClaim", "task6Completion", "releaseStatus", "snapshot", "bindings", "verification"], "einladung_attempt_schema");
  if (attempt.schemaVersion !== "learning-v2-de-task6c-l01-einladung-immutable-attempt.v1" || attempt.status !== "PARTIAL_TASK6C_CURRENT_STATE_ACCEPTED" || attempt.canonicalAdmission !== "FORBIDDEN" || attempt.rowsPromoted !== 0 || attempt.task7Unlock !== false || attempt.learnerFacing !== false || attempt.phraseClaim !== false || attempt.task6Completion !== "NOT_ESTABLISHED" || attempt.releaseStatus !== "HOLD") fail("einladung_attempt_authority");
  record(attempt.snapshot, "einladung_attempt_snapshot"); exactKeys(attempt.snapshot, ["admissionManifestSha256", "receiptClosureSha256"], "einladung_attempt_snapshot"); if (attempt.snapshot.admissionManifestSha256 !== BINDINGS.admissionManifest[1] || attempt.snapshot.receiptClosureSha256 !== BINDINGS.receiptClosure[1]) fail("einladung_attempt_snapshot");
  record(attempt.bindings, "einladung_attempt_binding"); exactKeys(attempt.bindings, Object.keys(BINDINGS), "einladung_attempt_binding");
  for (const [name, [pathname, expectedHash]] of Object.entries(BINDINGS)) { const binding = attempt.bindings[name]; record(binding, "einladung_attempt_binding"); exactKeys(binding, ["path", "sha256"], "einladung_attempt_binding"); if (binding.path !== pathname || binding.sha256 !== expectedHash || sha256(fs.readFileSync(pathname)) !== expectedHash) fail("einladung_attempt_binding"); }
  record(attempt.verification, "einladung_attempt_verification"); exactKeys(attempt.verification, ["command", "evidence", "scope"], "einladung_attempt_verification"); if (attempt.verification.command !== "npx tsx tests/learning_v2_de_task6c_l01_einladung_direct_capture_gate.ts; npx tsx tests/learning_v2_de_task6c_l01_einladung_facts_gate.ts; npx tsx tests/learning_v2_de_task6c_l01_einladung_admission_gate.ts; npx tsx tests/learning_v2_de_task6c_l01_einladung_receipt_closure_gate.ts" || attempt.verification.evidence !== "ALL_FOUR_EINLADUNG_GATES_EXIT_0_IN_CURRENT_WORKTREE" || attempt.verification.scope !== "CURRENT_STATE_ONLY_NO_CANONICAL_OR_RELEASE_AUTHORITY") fail("einladung_attempt_verification");
  return { status: "PARTIAL_TASK6C_CURRENT_STATE_ACCEPTED", canonicalAdmission: "FORBIDDEN", task6Completion: "NOT_ESTABLISHED", releaseStatus: "HOLD" };
}
