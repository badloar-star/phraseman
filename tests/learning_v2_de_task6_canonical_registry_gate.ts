import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import * as itemEvidenceModule from "../modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1";
import * as kernelModule from "../modules/learning-v2/curriculum/de/task6_registry_contract_de_v1";

const CANONICAL_REGISTRY_PATH =
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json";
const RECEIPT_PATH =
  "docs/v2/curriculum/de/TASK6_CANONICAL_REGISTRY_RECONCILIATION_RECEIPT_2026-10-11.md";
const BUNDLE_SCHEMA_VERSION =
  "learning-v2-german-task6-canonical-registry.v1";
const RECEIPT_BINDING_PATTERN =
  /^<!-- TASK6_CANONICAL_BUNDLE_SHA256: ([a-f0-9]{64}) -->$/mu;

assert.ok(
  fs.existsSync(CANONICAL_REGISTRY_PATH),
  "task6_canonical_registry_missing",
);
type JsonRecord = Record<string, unknown>;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validateBundleBinding(rawBundle: string, receipt: string): void {
  const receiptBinding = receipt.match(RECEIPT_BINDING_PATTERN);
  assert.ok(
    receiptBinding,
    "task6_canonical_registry_receipt_binding_missing",
  );
  assert.equal(
    sha256(rawBundle),
    receiptBinding[1],
    "task6_canonical_registry_receipt_binding_mismatch",
  );
}

function assertCanonicalBundleEnvelope(value: unknown): asserts value is JsonRecord {
  assert.ok(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "task6_canonical_registry_top_level_record_required",
  );
  const record = value as JsonRecord;
  assert.deepEqual(
    Object.keys(record).sort(),
    ["authorityContext", "registry", "schemaVersion"],
    "task6_canonical_registry_top_level_closed_schema",
  );
  assert.equal(
    record.schemaVersion,
    BUNDLE_SCHEMA_VERSION,
    "task6_canonical_registry_schema_version_invalid",
  );
  for (const key of ["authorityContext", "registry"] as const) {
    assert.ok(
      record[key] !== null &&
        typeof record[key] === "object" &&
        !Array.isArray(record[key]),
      `task6_canonical_registry_${key}_record_required`,
    );
  }
}

const rawBundle = fs.readFileSync(CANONICAL_REGISTRY_PATH, "utf8");
const receipt = fs.readFileSync(RECEIPT_PATH, "utf8");
validateBundleBinding(rawBundle, receipt);
assert.throws(
  () =>
    validateBundleBinding(
      rawBundle.replace('"schemaVersion"', '"schemaVersionDrift"'),
      receipt,
    ),
  /task6_canonical_registry_receipt_binding_mismatch/u,
);

const canonical = JSON.parse(rawBundle) as unknown;
assertCanonicalBundleEnvelope(canonical);
assert.throws(
  () =>
    assertCanonicalBundleEnvelope({
      ...(canonical as JsonRecord),
      learnerFacingRu: [],
    }),
  /task6_canonical_registry_top_level_closed_schema/u,
);
assert.throws(
  () =>
    assertCanonicalBundleEnvelope({
      ...(canonical as JsonRecord),
      schemaVersion: "learning-v2-german-task6-canonical-registry.v0",
    }),
  /task6_canonical_registry_schema_version_invalid/u,
);

const authorityContext = canonical.authorityContext as JsonRecord;
authorityContext.authoritySources = {
  grammarConstructs: JSON.parse(
    fs.readFileSync(
      "modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json",
      "utf8",
    ),
  ),
  lessonBlueprints: JSON.parse(
    fs.readFileSync(
      "modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json",
      "utf8",
    ),
  ),
  chapterBlueprints: JSON.parse(
    fs.readFileSync(
      "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
      "utf8",
    ),
  ),
};

const parseContext =
  kernelModule.parseGermanTask6RegistryAuthorityContextDeV1 as (
    input: unknown,
  ) => unknown;
const parseRegistry = kernelModule.parseGermanTask6RegistryContractDeV1 as (
  input: unknown,
  context: unknown,
  lexicalItemEvidence: unknown,
) => JsonRecord;

const result = parseRegistry(
  canonical.registry,
  parseContext(authorityContext),
  itemEvidenceModule.GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V1,
);

assert.deepEqual(result.registryCounts, {
  lexicalSenses: 2,
  phraseFrames: 2,
  pronunciationTargets: 1,
});
assert.equal(result.rowsPromoted, 0);
assert.equal(result.packetMaterializationStatus, "UNVERIFIED_UNTIL_TASK7");
assert.equal(
  result.pronunciationPacketContactsStatus,
  "UNVERIFIED_UNTIL_TASK7",
);
assert.equal(result.phraseFrameQuantityStatus, "UNVERIFIED_UNTIL_TASK7");
assert.equal(result.nativePhraseJudgementStatus, "REQUIRED");
assert.equal(result.verifiedLexicalItemEvidenceRows, 2);

const missingFrame = structuredClone(canonical);
(missingFrame.registry as JsonRecord).phraseFrames = [];
assert.throws(
  () =>
    parseRegistry(
      missingFrame.registry,
      parseContext({
        ...(missingFrame.authorityContext as JsonRecord),
        authoritySources: authorityContext.authoritySources,
      }),
      itemEvidenceModule.GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V1,
    ),
  /task5_chapter_mapping_without_phrase:de_pf_l01_c01_hallo_nachbarin_v1/u,
);

process.stdout.write(
  "TASK6_CANONICAL_REGISTRY_RECONCILIATION lexical=2 phraseFrames=2 pronunciation=1 packetContacts=UNVERIFIED_UNTIL_TASK7 rowsPromoted=0 status=HOLD\n",
);
