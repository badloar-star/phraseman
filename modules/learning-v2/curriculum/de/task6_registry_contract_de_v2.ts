import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../policies/decision_registry";
import {
  GERMAN_TASK6_V2_MIGRATION_PLAN_DE_V1,
  parseGermanLexicalRegistryMigrationPlanDeV2,
  type GermanLexicalRegistryMigrationPlanDeV2,
} from "./lexical_registry_contract_de_v2";
import {
  GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V2,
  GERMAN_TASK6_V2_VERB_VALENCY_ADJUDICATIONS_DE_V1,
  parseGermanLexicalItemEvidenceRegistryDeV2,
  parseGermanTask6V2VerbValencyAdjudicationsDeV1,
  validateGermanWohnenEvidenceSourceBindingDeV2,
  type GermanLexicalItemEvidenceDeV2,
} from "./lexical_item_evidence_de_v2";

type JsonRecord = Record<string, unknown>;

export type GermanTask6V2MigrationPhaseAResult = Readonly<{
  status: "HOLD";
  migrationStatus: "PHASE_A_VALIDATED_NOT_ADMITTED";
  sourceAuthorityStatus: "TASK5_V2_AND_L02_CANDIDATE_RECONCILED";
  reviewEvidenceStatus: "THREE_EXTERNAL_PASS_SUMMARIES_BOUND_NOT_SELF_AUTHENTICATING";
  canonicalAdmission: "FORBIDDEN";
  rowsPromoted: 0;
  task7Unlock: false;
  learnerFacing: false;
  phraseClaims: false;
  releaseAuthorized: false;
  candidateRows: 4;
  verifiedEvidenceRows: 4;
  verbValencyAdjudications: 1;
  legacyV1RowsPreserved: 2;
}>;

export type GermanTask6V2MigrationInputs = Readonly<{
  task5Raw: Buffer | Uint8Array;
  candidateRaw: Buffer | Uint8Array;
  captureManifestRaw: Buffer | Uint8Array;
  candidateModuleRaw: Buffer | Uint8Array;
  candidateGateRaw: Buffer | Uint8Array;
  valencyAdjudicationsRaw: Buffer | Uint8Array;
  wohnenBodyRaw: Buffer | Uint8Array;
  v1LexicalEvidenceRaw: Buffer | Uint8Array;
  v1Task6ContractRaw: Buffer | Uint8Array;
  v1CanonicalRegistryRaw: Buffer | Uint8Array;
  v1CanonicalGateRaw: Buffer | Uint8Array;
  reviewReceipt: string;
  migrationPlan: unknown;
  lexicalEvidence: unknown;
}>;

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const TASK5_PATH =
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json";
const CANDIDATE_PATH =
  "modules/learning-v2/curriculum/de/evidence/task6c_l02_source_admission_candidate_v1/manifest.json";
const CAPTURE_ROOT =
  "modules/learning-v2/curriculum/de/evidence/learning-v2-de-task6c-l02-identity-capture-v4-live-20261012T085552906Z";
const CAPTURE_MANIFEST_PATH = `${CAPTURE_ROOT}/manifest.json`;
const WOHNEN_BODY_PATH = `${CAPTURE_ROOT}/decoded-representation/wohnen.html`;
const ADJUDICATION_PATH =
  "modules/learning-v2/curriculum/de/evidence/task6_v2_verb_valency_adjudications_de_v1.json";
const REVIEW_RECEIPT_PATH =
  "docs/v2/curriculum/de/TASK6C_L02_SOURCE_ADMISSION_REVIEW_RECEIPT_2026-10-12.md";
const CANDIDATE_MODULE_PATH =
  "modules/learning-v2/curriculum/de/task6c_l02_source_admission_candidate_de_v1.ts";
const CANDIDATE_GATE_PATH =
  "tests/learning_v2_de_task6c_l02_source_admission_candidate_gate.ts";
const V1_LEXICAL_EVIDENCE_PATH =
  "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts";
const V1_TASK6_CONTRACT_PATH =
  "modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts";
const V1_CANONICAL_REGISTRY_PATH =
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json";
const V1_CANONICAL_GATE_PATH =
  "tests/learning_v2_de_task6_canonical_registry_gate.ts";

const TASK5_BYTE_SHA =
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const TASK5_CANONICAL_SHA =
  "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3";
const TASK5_WOHNEN_VERB_PACKAGE_SHA =
  "8528c540c8028de3ea0740abbe128c9f62e6e9f002f2433250252a3cd762d2fc";
const CANDIDATE_SHA =
  "d3430ade94b3901bca987f91d9a8ead5ec2efee530470835585e4447d6c3746c";
const CAPTURE_MANIFEST_SHA =
  "e79b6c6016638ecc943ef633b814761ed5c95595a4e61171fb057da84273a535";
const CANDIDATE_MODULE_SHA =
  "1d153cd73a8f7847dd832aea834d0df6c1bb7477b2d388ee94d0c315684244d5";
const CANDIDATE_GATE_SHA =
  "7fa08137ba62c3ea84d8741d48afc6dd51095e78dd6c88046d1f8da777b12b81";
const V1_LEXICAL_EVIDENCE_SHA =
  "10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c";
const V1_TASK6_CONTRACT_SHA =
  "4e0a1dc41a62ae81eb516333f19339658590c5cbef39edaf20a1d6219ecfca4d";
const V1_CANONICAL_REGISTRY_BYTE_SHA =
  "95181fb58d7563fc1ae37f220ad13b2543ccde898dfe1e93922cecc4a082fd31";
const V1_CANONICAL_REGISTRY_BODY_SHA =
  "012b337c945cea54af55602d7300ddef6c2164a624d13f0ca2b5235886a62e37";
const V1_CANONICAL_GATE_SHA =
  "355316efccd41433c0e21239bebb69139d4fed3d96708071582de440a2959938";

const REVIEW_TASKS = Object.freeze({
  native: "/root/l02_admission_candidate_native_review",
  spec: "/root/l02_admission_candidate_spec_review",
  adversarial: "/root/l02_admission_candidate_adversarial_review",
});

const RESULT = Object.freeze({
  status: "HOLD",
  migrationStatus: "PHASE_A_VALIDATED_NOT_ADMITTED",
  sourceAuthorityStatus: "TASK5_V2_AND_L02_CANDIDATE_RECONCILED",
  reviewEvidenceStatus:
    "THREE_EXTERNAL_PASS_SUMMARIES_BOUND_NOT_SELF_AUTHENTICATING",
  canonicalAdmission: "FORBIDDEN",
  rowsPromoted: 0,
  task7Unlock: false,
  learnerFacing: false,
  phraseClaims: false,
  releaseAuthorized: false,
  candidateRows: 4,
  verifiedEvidenceRows: 4,
  verbValencyAdjudications: 1,
  legacyV1RowsPreserved: 2,
} as const satisfies GermanTask6V2MigrationPhaseAResult);

function fail(code: string): never {
  throw new Error(code);
}

function sha256(value: Buffer | Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function bytes(value: Buffer | Uint8Array): Buffer {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

function requiredBytes(value: unknown, code: string): Buffer {
  if (!(Buffer.isBuffer(value) || value instanceof Uint8Array)) fail(code);
  return bytes(value);
}

function parseRecord(value: Buffer | Uint8Array, code: string): JsonRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes(value).toString("utf8")) as unknown;
  } catch {
    fail(code);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail(code);
  }
  return parsed as JsonRecord;
}

function task5Plans(task5: JsonRecord): Map<string, JsonRecord> {
  const plans = new Map<string, JsonRecord>();
  if (!Array.isArray(task5.lessons)) fail("task6_v2_task5_schema");
  for (const lesson of task5.lessons) {
    const chapters = (lesson as JsonRecord)?.chapters;
    if (!Array.isArray(chapters)) continue;
    for (const chapter of chapters) {
      const rows = ((chapter as JsonRecord)?.checkpoint as JsonRecord)
        ?.plannedNewLexicalSenses;
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (row && typeof row === "object" && !Array.isArray(row)) {
          const record = row as JsonRecord;
          if (typeof record.id === "string") plans.set(record.id, record);
        }
      }
    }
  }
  return plans;
}

function validateTask5(task5Raw: Buffer | Uint8Array): Map<string, JsonRecord> {
  if (sha256(task5Raw) !== TASK5_BYTE_SHA) fail("task6_v2_task5_bytes");
  const task5 = parseRecord(task5Raw, "task6_v2_task5_schema");
  if (
    task5.schemaVersion !== "learning-v2-german-chapter-blueprints.v2" ||
    hashCanonicalBody(task5) !== TASK5_CANONICAL_SHA
  ) {
    fail("task6_v2_task5_v1_mix_forbidden");
  }
  const plans = task5Plans(task5);
  const wohnen = plans.get("de_lex_plan_l02_c01_wohnen_v1");
  if (
    wohnen === undefined ||
    hashCanonicalBody(wohnen.verbPackage) !== TASK5_WOHNEN_VERB_PACKAGE_SHA
  ) {
    fail("task6_v2_wohnen_task5_verb_package");
  }
  return plans;
}

function validateCandidate(
  candidateRaw: Buffer | Uint8Array,
  evidence: readonly GermanLexicalItemEvidenceDeV2[],
  task5: ReadonlyMap<string, JsonRecord>,
): void {
  if (sha256(candidateRaw) !== CANDIDATE_SHA) {
    fail("task6_v2_candidate_binding");
  }
  const candidate = parseRecord(candidateRaw, "task6_v2_candidate_schema");
  if (
    candidate.schemaVersion !==
      "learning-v2-de-task6c-l02-source-admission-candidate.v1" ||
    candidate.status !== "HOLD" ||
    candidate.admissionStatus !== "PARTIAL_CANDIDATE" ||
    candidate.candidateAcceptance !== "HOLD" ||
    candidate.reviewStatus !== "PENDING_INDEPENDENT_REVIEW" ||
    candidate.canonicalAdmission !== "FORBIDDEN" ||
    candidate.rowsPromoted !== 0 ||
    candidate.task7Unlock !== false ||
    candidate.learnerFacing !== false ||
    candidate.phraseClaim !== false ||
    candidate.releaseAuthorized !== false
  ) {
    fail("task6_v2_candidate_authority");
  }
  const task5Binding = candidate.task5 as JsonRecord;
  const capture = candidate.capture as JsonRecord;
  if (
    task5Binding?.canonicalBodySha256 !== TASK5_CANONICAL_SHA ||
    capture?.manifestSha256 !== CAPTURE_MANIFEST_SHA
  ) {
    fail("task6_v2_candidate_binding");
  }
  if (!Array.isArray(candidate.rows) || candidate.rows.length !== 4) {
    fail("task6_v2_candidate_roster");
  }
  for (let index = 0; index < evidence.length; index += 1) {
    const row = candidate.rows[index] as JsonRecord;
    const item = evidence[index];
    const plan = task5.get(item.sourcePlanId);
    const task5Row = row.task5 as JsonRecord;
    const lexical = row.lexicalPackage as JsonRecord;
    if (
      row.sourcePlanId !== item.sourcePlanId ||
      row.candidateCanonicalSenseId !== item.candidateCanonicalSenseId ||
      row.admissionRole !== "CANDIDATE_NOT_CANONICAL" ||
      row.lemma !== item.lemma ||
      task5Row?.semanticIdentity !== item.semanticIdentity ||
      task5Row?.senseGloss !== item.senseGloss ||
      task5Row?.communicativeUse !== item.communicativeUse ||
      lexical?.partOfSpeech !== item.partOfSpeech ||
      plan?.semanticIdentity !== item.semanticIdentity ||
      plan?.lemmaOrExpression !== item.lemma ||
      plan?.senseGloss !== item.senseGloss ||
      plan?.communicativeUse !== item.communicativeUse
    ) {
      fail("task6_v2_candidate_evidence_reconciliation");
    }
  }
}

function validateReviewReceipt(receipt: string): void {
  const records: JsonRecord[] = [];
  const pattern =
    /<!-- TASK6C_L02_SOURCE_ADMISSION_REVIEW_RECORD (\{[^\r\n]+\}) -->/gu;
  for (
    let match = pattern.exec(receipt);
    match;
    match = pattern.exec(receipt)
  ) {
    try {
      records.push(JSON.parse(match[1]) as JsonRecord);
    } catch {
      fail("task6_v2_external_review_binding");
    }
  }
  if (records.length !== 3) fail("task6_v2_external_review_binding");
  for (const lens of ["native", "spec", "adversarial"] as const) {
    const record = records.find((candidate) => candidate.lens === lens);
    const expected = {
      lens,
      reviewerTask: REVIEW_TASKS[lens],
      runId: null,
      threadId: null,
      identifierAvailability: "NOT_EXPOSED_DO_NOT_INVENT",
      evidenceClass: "ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY",
      moduleSha256: CANDIDATE_MODULE_SHA,
      candidateManifestSha256: CANDIDATE_SHA,
      gateSha256: CANDIDATE_GATE_SHA,
      verdict: "PASS",
      p0: 0,
      p1: 0,
      p2: 0,
      findings: [],
      independence: "NOT_SELF_PROVED_BY_THIS_RECEIPT",
      authority: "NO_ADMISSION_AUTHORITY",
    };
    if (canonicalJsonV1(record) !== canonicalJsonV1(expected)) {
      fail("task6_v2_external_review_binding");
    }
  }
}

function validatePredecessorBindings(
  candidateModuleRaw: Buffer | Uint8Array,
  candidateGateRaw: Buffer | Uint8Array,
): void {
  if (sha256(candidateModuleRaw) !== CANDIDATE_MODULE_SHA) {
    fail("task6_v2_predecessor_module_binding");
  }
  if (sha256(candidateGateRaw) !== CANDIDATE_GATE_SHA) {
    fail("task6_v2_predecessor_gate_binding");
  }
}

function validateValencyAndWohnenSource(
  input: GermanTask6V2MigrationInputs,
): void {
  const adjudicationBytes = requiredBytes(
    input.valencyAdjudicationsRaw,
    "task6_v2_valency_input",
  );
  const wohnenBytes = requiredBytes(
    input.wohnenBodyRaw,
    "task6_v2_wohnen_source_input",
  );
  let adjudicationInput: unknown;
  try {
    adjudicationInput = JSON.parse(
      adjudicationBytes.toString("utf8"),
    ) as unknown;
  } catch {
    fail("task6_v2_valency_input");
  }
  const adjudications =
    parseGermanTask6V2VerbValencyAdjudicationsDeV1(adjudicationInput);
  if (
    canonicalJsonV1(adjudications) !==
    canonicalJsonV1(GERMAN_TASK6_V2_VERB_VALENCY_ADJUDICATIONS_DE_V1)
  ) {
    fail("wohnen_valency_adjudication");
  }
  validateGermanWohnenEvidenceSourceBindingDeV2(wohnenBytes, adjudications[0]);
}

function validateV1PreservationBindings(
  input: GermanTask6V2MigrationInputs,
): void {
  const lexicalEvidenceBytes = requiredBytes(
    input.v1LexicalEvidenceRaw,
    "task6_v2_v1_lexical_evidence_binding",
  );
  const task6ContractBytes = requiredBytes(
    input.v1Task6ContractRaw,
    "task6_v2_v1_task6_contract_binding",
  );
  const canonicalRegistryBytes = requiredBytes(
    input.v1CanonicalRegistryRaw,
    "task6_v2_v1_canonical_registry_byte_binding",
  );
  const canonicalGateBytes = requiredBytes(
    input.v1CanonicalGateRaw,
    "task6_v2_v1_canonical_gate_binding",
  );
  if (sha256(lexicalEvidenceBytes) !== V1_LEXICAL_EVIDENCE_SHA) {
    fail("task6_v2_v1_lexical_evidence_binding");
  }
  if (sha256(task6ContractBytes) !== V1_TASK6_CONTRACT_SHA) {
    fail("task6_v2_v1_task6_contract_binding");
  }
  if (sha256(canonicalRegistryBytes) !== V1_CANONICAL_REGISTRY_BYTE_SHA) {
    fail("task6_v2_v1_canonical_registry_byte_binding");
  }
  if (sha256(canonicalGateBytes) !== V1_CANONICAL_GATE_SHA) {
    fail("task6_v2_v1_canonical_gate_binding");
  }
  const canonicalRegistry = parseRecord(
    canonicalRegistryBytes,
    "task6_v2_v1_canonical_registry_body_binding",
  );
  if (
    canonicalRegistry.schemaVersion !==
      "learning-v2-german-task6-canonical-registry.v1" ||
    hashCanonicalBody(canonicalRegistry) !== V1_CANONICAL_REGISTRY_BODY_SHA
  ) {
    fail("task6_v2_v1_canonical_registry_body_binding");
  }
  const registry = canonicalRegistry.registry as JsonRecord;
  const lexicalSenses = registry?.lexicalSenses;
  if (
    !Array.isArray(lexicalSenses) ||
    lexicalSenses.length !== 2 ||
    (lexicalSenses[0] as JsonRecord)?.id !== "de_lex_l01_c01_nachbarin_v1" ||
    (lexicalSenses[1] as JsonRecord)?.id !== "de_lex_l01_c02_aufzug_v1"
  ) {
    fail("task6_v2_v1_canonical_registry_body_binding");
  }
}

export function parseGermanTask6V2MigrationAuthorityDeV2(
  input: GermanTask6V2MigrationInputs,
): GermanTask6V2MigrationPhaseAResult {
  validatePredecessorBindings(input.candidateModuleRaw, input.candidateGateRaw);
  validateValencyAndWohnenSource(input);
  validateV1PreservationBindings(input);
  const evidence = parseGermanLexicalItemEvidenceRegistryDeV2(
    input.lexicalEvidence,
  );
  const plan: GermanLexicalRegistryMigrationPlanDeV2 =
    parseGermanLexicalRegistryMigrationPlanDeV2(input.migrationPlan, evidence);
  const task5 = validateTask5(input.task5Raw);
  if (
    plan.task5.canonicalBodySha256 !== TASK5_CANONICAL_SHA ||
    plan.candidateManifestSha256 !== CANDIDATE_SHA ||
    plan.captureManifestSha256 !== CAPTURE_MANIFEST_SHA
  ) {
    fail("task6_v2_source_identity");
  }
  if (sha256(input.captureManifestRaw) !== CAPTURE_MANIFEST_SHA) {
    fail("task6_v2_capture_binding");
  }
  validateCandidate(input.candidateRaw, evidence, task5);
  validateReviewReceipt(input.reviewReceipt);
  return RESULT;
}

export function loadGermanTask6V2MigrationPhaseA(): GermanTask6V2MigrationPhaseAResult {
  const candidateModuleRaw = fs.readFileSync(
    path.join(REPO_ROOT, CANDIDATE_MODULE_PATH),
  );
  const candidateGateRaw = fs.readFileSync(
    path.join(REPO_ROOT, CANDIDATE_GATE_PATH),
  );
  const task5Raw = fs.readFileSync(path.join(REPO_ROOT, TASK5_PATH));
  const candidateRaw = fs.readFileSync(path.join(REPO_ROOT, CANDIDATE_PATH));
  const captureManifestRaw = fs.readFileSync(
    path.join(REPO_ROOT, CAPTURE_MANIFEST_PATH),
  );
  return parseGermanTask6V2MigrationAuthorityDeV2({
    task5Raw,
    candidateRaw,
    captureManifestRaw,
    candidateModuleRaw,
    candidateGateRaw,
    valencyAdjudicationsRaw: fs.readFileSync(
      path.join(REPO_ROOT, ADJUDICATION_PATH),
    ),
    wohnenBodyRaw: fs.readFileSync(path.join(REPO_ROOT, WOHNEN_BODY_PATH)),
    v1LexicalEvidenceRaw: fs.readFileSync(
      path.join(REPO_ROOT, V1_LEXICAL_EVIDENCE_PATH),
    ),
    v1Task6ContractRaw: fs.readFileSync(
      path.join(REPO_ROOT, V1_TASK6_CONTRACT_PATH),
    ),
    v1CanonicalRegistryRaw: fs.readFileSync(
      path.join(REPO_ROOT, V1_CANONICAL_REGISTRY_PATH),
    ),
    v1CanonicalGateRaw: fs.readFileSync(
      path.join(REPO_ROOT, V1_CANONICAL_GATE_PATH),
    ),
    reviewReceipt: fs.readFileSync(
      path.join(REPO_ROOT, REVIEW_RECEIPT_PATH),
      "utf8",
    ),
    migrationPlan: GERMAN_TASK6_V2_MIGRATION_PLAN_DE_V1,
    lexicalEvidence: GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V2,
  });
}
