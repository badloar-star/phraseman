import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../modules/learning-v2/policies/decision_registry";
import {
  GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V2,
  parseGermanLexicalItemEvidenceRegistryDeV2,
} from "../modules/learning-v2/curriculum/de/lexical_item_evidence_de_v2";
import {
  GERMAN_TASK6_V2_MIGRATION_PLAN_DE_V1,
  parseGermanLexicalRegistryMigrationPlanDeV2,
} from "../modules/learning-v2/curriculum/de/lexical_registry_contract_de_v2";
import { loadGermanTask6V2MigrationPhaseA } from "../modules/learning-v2/curriculum/de/task6_registry_contract_de_v2";

type JsonRecord = Record<string, unknown>;

const LEXICAL_PATH =
  "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v2.json";
const BUNDLE_PATH =
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v2.json";
const RECEIPT_PATH =
  "docs/v2/curriculum/de/TASK6_V2_CANONICAL_REGISTRY_RECONCILIATION_RECEIPT_2026-10-12.md";
const THIS_GATE_PATH =
  "tests/learning_v2_de_task6_canonical_registry_v2_gate.ts";
const V1_LEXICAL_PATH =
  "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json";
const V1_BUNDLE_PATH =
  "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json";
const TASK5_PATH =
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json";
const DEFAULT_CONSUMER_PATH =
  "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts";

const PREDECESSOR_HASHES = {
  "modules/learning-v2/curriculum/de/lexical_registry_contract_de_v2.ts":
    "fc168070539f4639674949343166e8f44c7642a49f9bdc15e822c2b60834d955",
  "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v2.ts":
    "1ff9c1669f799d6c88ec0a63b3466797c92677fe9ea5eff03afd9484c600a86c",
  "modules/learning-v2/curriculum/de/evidence/task6_v2_verb_valency_adjudications_de_v1.json":
    "67132b351dab1ef2960d93bc98421625f75f1b832e1bb301263796a17275edd2",
  "modules/learning-v2/curriculum/de/task6_registry_contract_de_v2.ts":
    "9402237e9f74883d60d327e09fe695c874878da5fbbdc3fdf4c4b6a5d7856bbe",
  "tests/learning_v2_de_task6_v2_migration_gate.ts":
    "87c150ebd7bb971983a4fff3b651175d9776ad79e7b5bd666987a2ee7bc158f3",
  "tests/learning_v2_de_wohnen_valency_adjudication_gate.ts":
    "fe87810c9b14799fc047d4a51ef6eaef92b3c40817a1fec463c9c78a14041984",
  "docs/v2/curriculum/de/TASK6C_L02_SOURCE_ADMISSION_REVIEW_RECEIPT_2026-10-12.md":
    "e4a577acd94a6d6b21c8fa4d5b2351d655897c768a2cc612d27efe2f0bfe2a99",
  "docs/v2/curriculum/de/TASK6_V2_MIGRATION_AUTHORITY_2026-10-12.md":
    "c20778aa5703fad7f50f2e57c012a22da3ab2cca57fdbfa883e93f31d873cebf",
} as const;

const SOURCE_BINDINGS = {
  task5V2: {
    path: TASK5_PATH,
    schemaVersion: "learning-v2-german-chapter-blueprints.v2",
    byteSha256:
      "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
    canonicalBodySha256:
      "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3",
  },
  captureManifest: {
    path: "modules/learning-v2/curriculum/de/evidence/learning-v2-de-task6c-l02-identity-capture-v4-live-20261012T085552906Z/manifest.json",
    byteSha256:
      "e79b6c6016638ecc943ef633b814761ed5c95595a4e61171fb057da84273a535",
  },
  candidateManifest: {
    path: "modules/learning-v2/curriculum/de/evidence/task6c_l02_source_admission_candidate_v1/manifest.json",
    byteSha256:
      "d3430ade94b3901bca987f91d9a8ead5ec2efee530470835585e4447d6c3746c",
  },
  phaseAArtifacts: Object.entries(PREDECESSOR_HASHES).map(
    ([artifactPath, sha256]) => ({ path: artifactPath, sha256 }),
  ),
  v1Preservation: {
    lexicalRegistry: {
      path: V1_LEXICAL_PATH,
      byteSha256:
        "3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29",
      canonicalBodySha256:
        "57efb49887ccbfc2e05190a32f79b37d19e5831542fcc39d3c6d904c3332e9b2",
    },
    canonicalBundle: {
      path: V1_BUNDLE_PATH,
      byteSha256:
        "95181fb58d7563fc1ae37f220ad13b2543ccde898dfe1e93922cecc4a082fd31",
      canonicalBodySha256:
        "012b337c945cea54af55602d7300ddef6c2164a624d13f0ca2b5235886a62e37",
      authorityContextCanonicalSha256:
        "8a72e2bf6f608158f91707a2edc9a89f4ff86447e82cc3dbd655fdeaed9e96ca",
      phraseFramesCanonicalSha256:
        "7805da5365c290c1d532d31c6d11e24a39d76cea61a6b025e0da74bee55eac29",
      pronunciationTargetsCanonicalSha256:
        "6de9d7ab535b577785228621eb4cad3ff25db45a856bb7243de0f553aa90b2dd",
    },
    lexicalEvidenceModule: {
      path: "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts",
      sha256:
        "10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c",
    },
    task6ContractModule: {
      path: "modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts",
      sha256:
        "4e0a1dc41a62ae81eb516333f19339658590c5cbef39edaf20a1d6219ecfca4d",
    },
    canonicalGate: {
      path: "tests/learning_v2_de_task6_canonical_registry_gate.ts",
      sha256:
        "355316efccd41433c0e21239bebb69139d4fed3d96708071582de440a2959938",
    },
  },
  defaultConsumer: {
    path: DEFAULT_CONSUMER_PATH,
    byteSha256:
      "e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59",
    requiredRegistry: "lexical_senses_de_v1.json",
    forbiddenRegistry: "lexical_senses_de_v2.json",
  },
} as const;

const EXPECTED_AUTHORITY = {
  status: "TASK6_V2_CANONICAL_PARTIAL",
  upstreamCandidateCanonicalAdmission: "FORBIDDEN",
  phaseBMaterialization: "ADMITTED_FOR_TASK6_V2_REGISTRY_ONLY",
  rowsMaterialized: 6,
  newRowsMaterialized: 4,
  legacyRowsPreserved: 2,
  rowsPromoted: 0,
  task7Status: "TASK7_HOLD",
  task7Unlock: false,
  learnerFacing: false,
  phraseClaims: false,
  releaseAuthorized: false,
  consumerCutover: "NONE",
  defaultConsumerChanged: false,
} as const;

const sha256 = (value: Buffer | string): string =>
  createHash("sha256").update(value).digest("hex");

function record(value: unknown, code: string): JsonRecord {
  assert.ok(
    value !== null && typeof value === "object" && !Array.isArray(value),
    code,
  );
  return value as JsonRecord;
}

function closedKeys(value: JsonRecord, keys: readonly string[], code: string) {
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), code);
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

for (const [filePath, expected] of Object.entries(PREDECESSOR_HASHES)) {
  assert.equal(
    sha256(fs.readFileSync(filePath)),
    expected,
    `task6_v2_phase_a_hash_drift:${filePath}`,
  );
}
assert.deepEqual(loadGermanTask6V2MigrationPhaseA(), {
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

for (const filePath of [LEXICAL_PATH, BUNDLE_PATH, RECEIPT_PATH]) {
  assert.ok(fs.existsSync(filePath), `task6_v2_phase_b_missing:${filePath}`);
}

assert.equal(
  sha256(fs.readFileSync(TASK5_PATH)),
  SOURCE_BINDINGS.task5V2.byteSha256,
  "task6_v2_task5_byte_binding",
);
assert.equal(
  hashCanonicalBody(readJson(TASK5_PATH)),
  SOURCE_BINDINGS.task5V2.canonicalBodySha256,
  "task6_v2_task5_body_binding",
);
for (const binding of [
  SOURCE_BINDINGS.captureManifest,
  SOURCE_BINDINGS.candidateManifest,
]) {
  assert.equal(
    sha256(fs.readFileSync(binding.path)),
    binding.byteSha256,
    `task6_v2_source_binding:${binding.path}`,
  );
}
for (const value of Object.values(SOURCE_BINDINGS.v1Preservation)) {
  assert.equal(
    sha256(fs.readFileSync(value.path)),
    "byteSha256" in value ? value.byteSha256 : value.sha256,
    `task6_v2_v1_binding:${value.path}`,
  );
}
assert.equal(
  sha256(fs.readFileSync(DEFAULT_CONSUMER_PATH)),
  SOURCE_BINDINGS.defaultConsumer.byteSha256,
  "task6_v2_default_consumer_binding",
);
const defaultConsumerSource = fs.readFileSync(DEFAULT_CONSUMER_PATH, "utf8");
assert.match(defaultConsumerSource, /lexical_senses_de_v1\.json/u);
assert.doesNotMatch(defaultConsumerSource, /lexical_senses_de_v2\.json/u);

const evidence = parseGermanLexicalItemEvidenceRegistryDeV2(
  structuredClone(GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V2),
);
const migrationPlan = parseGermanLexicalRegistryMigrationPlanDeV2(
  structuredClone(GERMAN_TASK6_V2_MIGRATION_PLAN_DE_V1),
  evidence,
);
const v1Lexical = readJson(V1_LEXICAL_PATH) as unknown[];
const v1Bundle = record(readJson(V1_BUNDLE_PATH), "task6_v2_v1_bundle_record");
const v1Registry = record(v1Bundle.registry, "task6_v2_v1_registry_record");
const v1Authority = record(
  v1Bundle.authorityContext,
  "task6_v2_v1_authority_record",
);
assert.deepEqual(v1Registry.lexicalSenses, v1Lexical);
assert.equal(
  hashCanonicalBody(v1Lexical),
  SOURCE_BINDINGS.v1Preservation.lexicalRegistry.canonicalBodySha256,
);
assert.equal(
  hashCanonicalBody(v1Bundle),
  SOURCE_BINDINGS.v1Preservation.canonicalBundle.canonicalBodySha256,
);
assert.equal(
  hashCanonicalBody(v1Authority),
  SOURCE_BINDINGS.v1Preservation.canonicalBundle
    .authorityContextCanonicalSha256,
);
assert.equal(
  hashCanonicalBody(v1Registry.phraseFrames),
  SOURCE_BINDINGS.v1Preservation.canonicalBundle.phraseFramesCanonicalSha256,
);
assert.equal(
  hashCanonicalBody(v1Registry.pronunciationTargets),
  SOURCE_BINDINGS.v1Preservation.canonicalBundle
    .pronunciationTargetsCanonicalSha256,
);

const l02Lexical = evidence.map((row) => ({
  id: row.candidateCanonicalSenseId,
  lemma: row.lemma,
  senseGloss: row.senseGloss,
  partOfSpeech: row.partOfSpeech,
  nounGender: row.noun?.article ?? null,
  nounPlural: row.noun?.plural ?? null,
  verbValency: row.verb === null ? null : [...row.verb.slots],
  verbFrame: row.verb?.valencyFrame ?? null,
  verbSeparability: row.verb?.separability ?? null,
  verbAuxiliary: row.verb?.perfectAuxiliary ?? null,
  productionPolicy: "productive",
  region: null,
  evidenceIds: [row.id, row.regionalEvidenceId],
}));
const expectedLexical = [...v1Lexical, ...l02Lexical];
const l02Mappings = migrationPlan.candidateRows.map((row, index) => ({
  sourcePlanId: row.sourcePlanId,
  canonicalId: row.candidateCanonicalSenseId,
  plannedUsePacketIds: [index < 2 ? "de_l02_c01_s08" : "de_l02_c02_s16"],
}));
const EXPECTED_AUTHORITY_CONTEXT = {
  schemaVersion: "learning-v2-german-task6-registry-authority.v2",
  lexicalMappings: [
    ...(v1Authority.lexicalMappings as unknown[]),
    ...l02Mappings,
  ],
  phraseFrameMappings: v1Authority.phraseFrameMappings,
  pronunciationMappings: v1Authority.pronunciationMappings,
  communicativeOutcomeMappings: v1Authority.communicativeOutcomeMappings,
  forbiddenSurfaceForms: v1Authority.forbiddenSurfaceForms,
  pronunciationPresentationPolicies:
    v1Authority.pronunciationPresentationPolicies,
} as const;
const EXPECTED_MATERIALIZATION = {
  legacyV1LexicalSenseIds: [
    "de_lex_l01_c01_nachbarin_v1",
    "de_lex_l01_c02_aufzug_v1",
  ],
  legacyV1Policy: "PRESERVE_UNCHANGED_DO_NOT_IMPORT_AS_V2_EVIDENCE",
  l02LexicalMappings: migrationPlan.candidateRows.map((row) => ({
    sourcePlanId: row.sourcePlanId,
    canonicalLexicalSenseId: row.candidateCanonicalSenseId,
    evidenceId: row.evidenceId,
    materializationRole: "TASK6_V2_REGISTRY_ONLY_NOT_PROMOTED",
  })),
} as const;

function validateLexicalRegistry(value: unknown): void {
  assert.ok(Array.isArray(value), "task6_v2_lexical_array_required");
  assert.equal(value.length, 6, "task6_v2_lexical_count");
  assert.deepEqual(value, expectedLexical, "task6_v2_lexical_projection");
}

function validateBundle(bundleValue: unknown, lexicalValue: unknown): void {
  const bundle = record(bundleValue, "task6_v2_bundle_record");
  closedKeys(
    bundle,
    [
      "schemaVersion",
      "authority",
      "sourceBindings",
      "materialization",
      "authorityContext",
      "registry",
    ],
    "task6_v2_bundle_closed_schema",
  );
  assert.equal(
    bundle.schemaVersion,
    "learning-v2-german-task6-canonical-registry.v2",
    "task6_v2_schema_mix_forbidden",
  );
  assert.deepEqual(
    bundle.authority,
    EXPECTED_AUTHORITY,
    "task6_v2_authority_drift",
  );
  assert.deepEqual(
    bundle.sourceBindings,
    SOURCE_BINDINGS,
    "task6_v2_source_binding_drift",
  );
  assert.deepEqual(
    bundle.materialization,
    EXPECTED_MATERIALIZATION,
    "task6_v2_materialization_drift",
  );
  assert.deepEqual(
    bundle.authorityContext,
    EXPECTED_AUTHORITY_CONTEXT,
    "task6_v2_authority_context_drift",
  );
  const registry = record(bundle.registry, "task6_v2_registry_record");
  closedKeys(
    registry,
    ["lexicalSenses", "phraseFrames", "pronunciationTargets"],
    "task6_v2_registry_closed_schema",
  );
  validateLexicalRegistry(lexicalValue);
  assert.deepEqual(
    registry.lexicalSenses,
    lexicalValue,
    "task6_v2_bundle_lexical_parity",
  );
  assert.deepEqual(
    registry.phraseFrames,
    v1Registry.phraseFrames,
    "task6_v2_phrase_v1_preservation",
  );
  assert.deepEqual(
    registry.pronunciationTargets,
    v1Registry.pronunciationTargets,
    "task6_v2_pronunciation_v1_preservation",
  );
}

const lexical = readJson(LEXICAL_PATH);
const bundle = readJson(BUNDLE_PATH);
validateBundle(bundle, lexical);

const hostileBundle = (
  mutate: (value: JsonRecord) => void,
  expected: RegExp,
): void => {
  const candidate = structuredClone(bundle) as JsonRecord;
  mutate(candidate);
  assert.throws(() => validateBundle(candidate, lexical), expected);
};
hostileBundle((value) => {
  value.schemaVersion = "learning-v2-german-task6-canonical-registry.v1";
}, /task6_v2_schema_mix_forbidden/u);
hostileBundle((value) => {
  value.unknownAuthority = true;
}, /task6_v2_bundle_closed_schema/u);
for (const [key, replacement] of [
  ["rowsPromoted", 4],
  ["task7Unlock", true],
  ["learnerFacing", true],
  ["releaseAuthorized", true],
  ["consumerCutover", "V2"],
] as const) {
  hostileBundle((value) => {
    (value.authority as JsonRecord)[key] = replacement;
  }, /task6_v2_authority_drift/u);
}
hostileBundle((value) => {
  const registry = value.registry as JsonRecord;
  registry.phraseFrames = [
    ...(registry.phraseFrames as unknown[]),
    { id: "de_pf_l02_forbidden_v1" },
  ];
}, /task6_v2_phrase_v1_preservation/u);
hostileBundle((value) => {
  const registry = value.registry as JsonRecord;
  registry.pronunciationTargets = [
    ...(registry.pronunciationTargets as unknown[]),
    { id: "de_pron_l02_forbidden_v1" },
  ];
}, /task6_v2_pronunciation_v1_preservation/u);
hostileBundle((value) => {
  const sourceBindings = value.sourceBindings as JsonRecord;
  (sourceBindings.task5V2 as JsonRecord).canonicalBodySha256 = "0".repeat(64);
}, /task6_v2_source_binding_drift/u);
hostileBundle((value) => {
  const context = value.authorityContext as JsonRecord;
  (context.lexicalMappings as unknown[]).reverse();
}, /task6_v2_authority_context_drift/u);

const hostileLexical = (mutate: (value: JsonRecord[]) => void): void => {
  const candidate = structuredClone(lexical) as JsonRecord[];
  mutate(candidate);
  assert.throws(
    () => validateLexicalRegistry(candidate),
    /task6_v2_(?:lexical_count|lexical_projection)/u,
  );
};
hostileLexical((value) => {
  [value[0], value[1]] = [value[1], value[0]];
});
hostileLexical((value) => {
  value[2].evidenceIds = ["DE-LEX-ITEM-L02-C01-WOHNEN-SENSE-FORM-001"];
});
hostileLexical((value) => {
  value[3].nounPlural = "Küche";
});
hostileLexical((value) => {
  value[2].verbValency = [
    "subject",
    "residence-location complement",
    "invented object",
  ];
});
hostileLexical((value) => {
  value.push({ id: "de_lex_unknown_v1" });
});

const hostileEvidence = structuredClone(
  GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V2,
) as unknown as JsonRecord[];
hostileEvidence[0].canonicalAdmission = "ADMITTED";
assert.throws(
  () => parseGermanLexicalItemEvidenceRegistryDeV2(hostileEvidence),
  /lexical_item_evidence_v2_authority/u,
);
for (const mutate of [
  (value: JsonRecord) => {
    (value.source as JsonRecord).anchor = "d-1-2";
  },
  (value: JsonRecord) => {
    (value.verb as JsonRecord).caseGovernment = "DATIVE";
  },
  (value: JsonRecord) => {
    (value.verb as JsonRecord).complementObligatoriness = "REQUIRED";
  },
  (value: JsonRecord) => {
    (value.verb as JsonRecord).slots = ["subject", "object"];
  },
  (value: JsonRecord) => {
    value.metaphorAdmitted = true;
  },
]) {
  const candidate = structuredClone(
    GERMAN_LEXICAL_ITEM_EVIDENCE_DE_V2,
  ) as unknown as JsonRecord[];
  mutate(candidate[0]);
  assert.throws(
    () => parseGermanLexicalItemEvidenceRegistryDeV2(candidate),
    /lexical_item_evidence_v2_(?:identity|wohnen_valency)/u,
  );
}
for (const [field, value, expected] of [
  ["rowsPromoted", 4, /lexical_registry_v2_authority/u],
  ["task7Unlock", true, /lexical_registry_v2_authority/u],
] as const) {
  const hostilePlan = structuredClone(
    GERMAN_TASK6_V2_MIGRATION_PLAN_DE_V1,
  ) as JsonRecord;
  (hostilePlan.authority as JsonRecord)[field] = value;
  assert.throws(
    () => parseGermanLexicalRegistryMigrationPlanDeV2(hostilePlan, evidence),
    expected,
  );
}
const hostilePhrasePlan = structuredClone(
  GERMAN_TASK6_V2_MIGRATION_PLAN_DE_V1,
) as JsonRecord;
hostilePhrasePlan.phraseClaims = ["de_pf_l02_forbidden_v1"];
assert.throws(
  () =>
    parseGermanLexicalRegistryMigrationPlanDeV2(hostilePhrasePlan, evidence),
  /lexical_registry_v2_phrase_claim_forbidden/u,
);

const receipt = fs.readFileSync(RECEIPT_PATH, "utf8");
const receiptBinding = (label: string): string => {
  const match = receipt.match(
    new RegExp(`^<!-- ${label}: ([a-f0-9]{64}) -->$`, "mu"),
  );
  assert.ok(match, `task6_v2_receipt_binding_missing:${label}`);
  return match[1];
};
assert.equal(
  receiptBinding("TASK6_V2_LEXICAL_REGISTRY_SHA256"),
  sha256(fs.readFileSync(LEXICAL_PATH)),
  "task6_v2_receipt_lexical_binding",
);
assert.equal(
  receiptBinding("TASK6_V2_CANONICAL_BUNDLE_SHA256"),
  sha256(fs.readFileSync(BUNDLE_PATH)),
  "task6_v2_receipt_bundle_binding",
);
assert.equal(
  receiptBinding("TASK6_V2_GATE_SHA256"),
  sha256(fs.readFileSync(THIS_GATE_PATH)),
  "task6_v2_receipt_gate_binding",
);
assert.match(receipt, /Phase B review status:\*\* `PENDING_EXTERNAL_REVIEWS`/u);
assert.match(receipt, /NOT_SELF_AUTHENTICATING/u);
assert.match(receipt, /No default consumer or cutover was changed\./u);

function sourceFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(absolute));
    else if (/\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) files.push(absolute);
  }
  return files;
}
const forbiddenImports: string[] = [];
for (const root of [
  "app",
  "components",
  "content/learning-v2-course/pipeline",
  "functions/src",
  "modules",
  "scripts",
]) {
  for (const filePath of sourceFiles(root)) {
    const source = fs.readFileSync(filePath, "utf8");
    if (
      source.includes("lexical_senses_de_v2.json") ||
      source.includes("task6_canonical_registry_de_v2.json")
    ) {
      forbiddenImports.push(filePath.replaceAll("\\", "/"));
    }
  }
}
assert.deepEqual(
  forbiddenImports,
  [],
  "task6_v2_default_consumer_cutover_forbidden",
);
assert.equal(
  canonicalJsonV1((bundle as JsonRecord).authority),
  canonicalJsonV1(EXPECTED_AUTHORITY),
);

process.stdout.write(
  "TASK6_V2_CANONICAL_REGISTRY_GATE PASS lexical=6 legacy=2 l02=4 phraseFrames=v1-preserved pronunciation=v1-preserved rowsPromoted=0 task7=HOLD consumerCutover=NONE\n",
);
