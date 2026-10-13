import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

import {
  GERMAN_TASK6_V2_MIGRATION_PLAN_DE_V1,
  parseGermanLexicalRegistryMigrationPlanDeV2,
} from "../modules/learning-v2/curriculum/de/lexical_registry_contract_de_v2";
import {
  GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V2,
  parseGermanLexicalItemEvidenceRegistryDeV2,
} from "../modules/learning-v2/curriculum/de/lexical_item_evidence_de_v2";
import {
  loadGermanTask6V2MigrationPhaseA,
  parseGermanTask6V2MigrationAuthorityDeV2,
  type GermanTask6V2MigrationInputs,
} from "../modules/learning-v2/curriculum/de/task6_registry_contract_de_v2";

type JsonRecord = Record<string, any>;

const TASK5_PATH =
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json";
const CANDIDATE_PATH =
  "modules/learning-v2/curriculum/de/evidence/task6c_l02_source_admission_candidate_v1/manifest.json";
const CAPTURE_MANIFEST_PATH =
  "modules/learning-v2/curriculum/de/evidence/learning-v2-de-task6c-l02-identity-capture-v4-live-20261012T085552906Z/manifest.json";
const REVIEW_RECEIPT_PATH =
  "docs/v2/curriculum/de/TASK6C_L02_SOURCE_ADMISSION_REVIEW_RECEIPT_2026-10-12.md";
const CANDIDATE_MODULE_PATH =
  "modules/learning-v2/curriculum/de/task6c_l02_source_admission_candidate_de_v1.ts";
const CANDIDATE_GATE_PATH =
  "tests/learning_v2_de_task6c_l02_source_admission_candidate_gate.ts";
const VALENCY_ADJUDICATION_PATH =
  "modules/learning-v2/curriculum/de/evidence/task6_v2_verb_valency_adjudications_de_v1.json";
const WOHNEN_BODY_PATH =
  "modules/learning-v2/curriculum/de/evidence/learning-v2-de-task6c-l02-identity-capture-v4-live-20261012T085552906Z/decoded-representation/wohnen.html";
const V1_LEXICAL_EVIDENCE_PATH =
  "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts";
const V1_TASK6_CONTRACT_PATH =
  "modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts";
const V1_CANONICAL_REGISTRY_PATH =
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json";
const V1_CANONICAL_GATE_PATH =
  "tests/learning_v2_de_task6_canonical_registry_gate.ts";
const TASK5_CANONICAL_SHA =
  "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3";
const CANDIDATE_SHA =
  "d3430ade94b3901bca987f91d9a8ead5ec2efee530470835585e4447d6c3746c";
const CAPTURE_MANIFEST_SHA =
  "e79b6c6016638ecc943ef633b814761ed5c95595a4e61171fb057da84273a535";

const sha256 = (value: Buffer | string): string =>
  createHash("sha256").update(value).digest("hex");

const task5Raw = fs.readFileSync(TASK5_PATH);
const candidateRaw = fs.readFileSync(CANDIDATE_PATH);
const captureManifestRaw = fs.readFileSync(CAPTURE_MANIFEST_PATH);
const candidateModuleRaw = fs.readFileSync(CANDIDATE_MODULE_PATH);
const candidateGateRaw = fs.readFileSync(CANDIDATE_GATE_PATH);
const valencyAdjudicationsRaw = fs.readFileSync(VALENCY_ADJUDICATION_PATH);
const wohnenBodyRaw = fs.readFileSync(WOHNEN_BODY_PATH);
const v1LexicalEvidenceRaw = fs.readFileSync(V1_LEXICAL_EVIDENCE_PATH);
const v1Task6ContractRaw = fs.readFileSync(V1_TASK6_CONTRACT_PATH);
const v1CanonicalRegistryRaw = fs.readFileSync(V1_CANONICAL_REGISTRY_PATH);
const v1CanonicalGateRaw = fs.readFileSync(V1_CANONICAL_GATE_PATH);

assert.equal(sha256(candidateRaw), CANDIDATE_SHA);
assert.equal(sha256(captureManifestRaw), CAPTURE_MANIFEST_SHA);

const result = loadGermanTask6V2MigrationPhaseA();
assert.deepEqual(result, {
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
});

const parsedEvidence = parseGermanLexicalItemEvidenceRegistryDeV2(
  structuredClone(GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V2),
);
assert.equal(parsedEvidence.length, 4);
assert.equal(parsedEvidence[0].sourcePlanId, "de_lex_plan_l02_c01_wohnen_v1");
assert.equal(parsedEvidence[0].partOfSpeech, "verb");
assert.deepEqual(parsedEvidence[0].verb, {
  infinitive: "wohnen",
  valencyFrame: "intransitive residence frame",
  separability: "INSEPARABLE",
  perfectAuxiliary: "haben",
  slots: ["subject", "residence-location complement"],
  complementObligatoriness: "UNCLAIMED",
  caseGovernment: "UNCLAIMED",
});

const parsedPlan = parseGermanLexicalRegistryMigrationPlanDeV2(
  structuredClone(GERMAN_TASK6_V2_MIGRATION_PLAN_DE_V1),
  parsedEvidence,
);
assert.equal(parsedPlan.task5.canonicalBodySha256, TASK5_CANONICAL_SHA);
assert.equal(parsedPlan.candidateManifestSha256, CANDIDATE_SHA);
assert.deepEqual(parsedPlan.legacyV1CanonicalSenseIds, [
  "de_lex_l01_c01_nachbarin_v1",
  "de_lex_l01_c02_aufzug_v1",
]);
assert.equal(parsedPlan.candidateRows.length, 4);
assert.equal(parsedPlan.authority.rowsPromoted, 0);
assert.equal(parsedPlan.authority.task7Unlock, false);
assert.equal(parsedPlan.authority.learnerFacing, false);
assert.equal(parsedPlan.authority.releaseAuthorized, false);

const canonicalInputs = {
  task5Raw,
  candidateRaw,
  captureManifestRaw,
  candidateModuleRaw,
  candidateGateRaw,
  valencyAdjudicationsRaw,
  wohnenBodyRaw,
  v1LexicalEvidenceRaw,
  v1Task6ContractRaw,
  v1CanonicalRegistryRaw,
  v1CanonicalGateRaw,
  reviewReceipt: fs.readFileSync(REVIEW_RECEIPT_PATH, "utf8"),
  migrationPlan: structuredClone(GERMAN_TASK6_V2_MIGRATION_PLAN_DE_V1),
  lexicalEvidence: structuredClone(GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V2),
};

assert.equal(
  canonicalInputs.reviewReceipt.match(/"findings":\[\]/gu)?.length,
  3,
  "all three external records must explicitly preserve their empty findings arrays",
);

const hostile = (
  mutate: (value: JsonRecord) => void,
  expected: RegExp,
): void => {
  const value = structuredClone(canonicalInputs) as JsonRecord;
  mutate(value);
  assert.throws(
    () =>
      parseGermanTask6V2MigrationAuthorityDeV2(
        value as unknown as GermanTask6V2MigrationInputs,
      ),
    expected,
  );
};

hostile((value) => {
  value.migrationPlan.schemaVersion =
    "learning-v2-german-lexical-registry-migration-plan.v1";
}, /task6_v2_schema_mix_forbidden/u);

hostile((value) => {
  value.migrationPlan.task5.canonicalBodySha256 =
    "e70ef798e06dfa752e9faace47282300a4fd43f8acaf158b2f608a8225f8cf90";
}, /task6_v2_task5_v1_mix_forbidden/u);

hostile((value) => {
  value.migrationPlan.candidateManifestSha256 = "0".repeat(64);
}, /task6_v2_candidate_binding/u);

hostile((value) => {
  value.lexicalEvidence[0].schemaVersion =
    "learning-v2-german-lexical-item-evidence.v1";
}, /lexical_item_evidence_v2_schema_mix_forbidden/u);

hostile((value) => {
  value.lexicalEvidence[0].canonicalAdmission = "ADMITTED";
}, /lexical_item_evidence_v2_authority/u);

hostile((value) => {
  value.migrationPlan.authority.rowsPromoted = 4;
  value.migrationPlan.authority.task7Unlock = true;
  value.migrationPlan.authority.learnerFacing = true;
  value.migrationPlan.authority.releaseAuthorized = true;
}, /lexical_registry_v2_authority/u);

hostile((value) => {
  value.migrationPlan.phraseClaims = ["de_pf_l02_c01_fabricated_v1"];
}, /lexical_registry_v2_phrase_claim_forbidden/u);

hostile((value) => {
  value.reviewReceipt = value.reviewReceipt.replace(
    "/root/l02_admission_candidate_native_review",
    "/root/forged-reviewer",
  );
}, /task6_v2_external_review_binding/u);

hostile((value) => {
  value.candidateModuleRaw = Buffer.concat([
    Buffer.from(value.candidateModuleRaw),
    Buffer.from("\n// predecessor drift\n"),
  ]);
}, /task6_v2_predecessor_module_binding/u);

hostile((value) => {
  value.candidateGateRaw = Buffer.concat([
    Buffer.from(value.candidateGateRaw),
    Buffer.from("\n// predecessor gate drift\n"),
  ]);
}, /task6_v2_predecessor_gate_binding/u);

hostile((value) => {
  delete value.valencyAdjudicationsRaw;
}, /task6_v2_valency_input/u);

hostile((value) => {
  const adjudications = JSON.parse(
    Buffer.from(value.valencyAdjudicationsRaw).toString("utf8"),
  );
  adjudications[0].adjudication.caseGovernment = "DATIVE";
  value.valencyAdjudicationsRaw = Buffer.from(JSON.stringify(adjudications));
}, /wohnen_valency_adjudication/u);

hostile((value) => {
  delete value.wohnenBodyRaw;
}, /task6_v2_wohnen_source_input/u);

hostile((value) => {
  value.wohnenBodyRaw = Buffer.concat([
    Buffer.from(value.wohnenBodyRaw),
    Buffer.from("source drift"),
  ]);
}, /wohnen_source_body_hash/u);

hostile((value) => {
  value.wohnenBodyRaw = Buffer.from(
    Buffer.from(value.wohnenBodyRaw)
      .toString("utf8")
      .replace('id="d-1-1"', 'id="d-1-x"')
      .replace('id="d-1-2"', 'id="d-1-1"'),
  );
}, /wohnen_source_(?:body|sense)_hash/u);

hostile((value) => {
  delete value.v1LexicalEvidenceRaw;
}, /task6_v2_v1_lexical_evidence_binding/u);

hostile((value) => {
  value.v1Task6ContractRaw = Buffer.concat([
    Buffer.from(value.v1Task6ContractRaw),
    Buffer.from("\n// v1 drift\n"),
  ]);
}, /task6_v2_v1_task6_contract_binding/u);

hostile((value) => {
  value.v1CanonicalRegistryRaw = Buffer.from("{}\n");
}, /task6_v2_v1_canonical_registry_(?:byte|body)_binding/u);

hostile((value) => {
  value.v1CanonicalGateRaw = value.v1LexicalEvidenceRaw;
}, /task6_v2_v1_canonical_gate_binding/u);

hostile((value) => {
  value.reviewReceipt = value.reviewReceipt.replace(
    CANDIDATE_SHA,
    "0".repeat(64),
  );
}, /task6_v2_external_review_binding/u);

hostile((value) => {
  value.reviewReceipt = value.reviewReceipt.replace(
    '"verdict":"PASS"',
    '"verdict":"FAIL"',
  );
}, /task6_v2_external_review_binding/u);

hostile((value) => {
  value.reviewReceipt = value.reviewReceipt.replace(
    '"runId":null',
    '"runId":"invented"',
  );
}, /task6_v2_external_review_binding/u);

assert.equal(
  fs
    .readFileSync(CANDIDATE_PATH, "utf8")
    .includes('"reviewStatus": "PENDING_INDEPENDENT_REVIEW"'),
  true,
);
assert.equal(
  fs
    .readFileSync(CANDIDATE_PATH, "utf8")
    .includes('"canonicalAdmission": "FORBIDDEN"'),
  true,
);

process.stdout.write(
  "TASK6_V2_MIGRATION_PHASE_A_GATE PASS task5=v2 candidateRows=4 evidenceRows=4 externalReviewSummaries=3 rowsPromoted=0 task7Unlock=false status=HOLD\n",
);
