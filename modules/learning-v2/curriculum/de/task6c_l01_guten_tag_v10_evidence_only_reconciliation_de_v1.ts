import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";

import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../policies/decision_registry";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type RecordJson = { [key: string]: Json };

export const ROOT = path.resolve(process.cwd());
const HASH = /^[a-f0-9]{64}$/u;

export const PATHS = {
  task5: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json",
  lexicalV6:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v6.json",
  task6V6:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v6.json",
  inventoryV6:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v6.json",
  closureV6:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_final_review_closure_v1/closure.json",
  lexicalEvidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/lexical_evidence.json",
  sourceManifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/manifest.json",
  extraction:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/extraction_map.json",
  rawDwds:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/raw/dwds_guten_tag.html",
  metadata:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_positive_admission_v1/raw/dwds_guten_tag.http_metadata.json",
  lexicalV7:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v7.json",
  task6V7:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v7.json",
  inventoryV7:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v7.json",
  task6V8:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v8.json",
  inventoryV8:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v8.json",
  task6V9:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v9.json",
  inventoryV9:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v9.json",
  moduleV9:
    "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v9_fail_closed_reconciliation_de_v1.ts",
  gateV9:
    "tests/learning_v2_de_task6c_l01_guten_tag_v9_fail_closed_reconciliation_gate.ts",
  captureV9:
    "scripts/capture_learning_v2_de_task6c_l01_guten_tag_v9_typescript_evidence.mjs",
  manifestV9:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/manifest.json",
  evidenceV9:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/typescript_evidence.json",
  focusedLogV9:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/logs/focused_tsc.log",
  repositoryLogV9:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v9_fail_closed_reconciliation_v1/logs/repository_tsc_8192.log",
  receiptV9:
    "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_V9_FAIL_CLOSED_RECONCILIATION_RECEIPT_2026-10-13.md",
  lexicalV10:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v10.json",
  task6V10:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v10.json",
  inventoryV10:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v10.json",
  module:
    "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v10_evidence_only_reconciliation_de_v1.ts",
  gate: "tests/learning_v2_de_task6c_l01_guten_tag_v10_evidence_only_reconciliation_gate.ts",
  capture:
    "scripts/capture_learning_v2_de_task6c_l01_guten_tag_v10_typescript_evidence.mjs",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/manifest.json",
  typescriptEvidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/typescript_evidence.json",
  focusedLog:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/logs/focused_tsc.log",
  repositoryLog:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/logs/repository_tsc_8192.log",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_V10_EVIDENCE_ONLY_RECONCILIATION_RECEIPT_2026-10-13.md",
} as const;

export const CONSTRUCTIVE_HASHES: Readonly<Record<string, string>> = {
  [PATHS.lexicalV6]:
    "3d45077cba6f20e826ce3fa04732a91fec15d571ac9a0cb54923c8ec84c66e55",
  [PATHS.task6V6]:
    "63d65319b2f41dc6cb08e8e4e407fbf4a6ca71c061229da64a886c62ba9403bc",
  [PATHS.inventoryV6]:
    "e940b37e2ea29e479710dada185c8bc1466bb04b61176c8c839432eeaf392677",
  [PATHS.closureV6]:
    "7d12e8f92cc4f190a53cbd2a04463fbd04dde42d39063b704059400e8af0577c",
  [PATHS.lexicalEvidence]:
    "132f65574f9e858a8c7ec22fc6269732a269c4e122fa6a2304caab8bcfd21ddc",
  [PATHS.sourceManifest]:
    "23c83a69e545957a8a5314894d27707a2a63991c68dbaeebd50d8592dcb8a0be",
  [PATHS.extraction]:
    "ce73ac77e2b97229ef9ea94f47ba2b3318bead5886dfe26f4e523911af9f1e57",
  [PATHS.rawDwds]:
    "542050aad29117960da3264eaa73dbb41ffe252b7330d1809a4dc6e47c97ebf2",
  [PATHS.metadata]:
    "b6ecc0a42a37f89f327d30b344ec32b18d7fa79b4995d386fe28699c41fa150b",
  [PATHS.task5]:
    "5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe",
};

export const REJECTED_AUDIT_HASHES: Readonly<Record<string, string>> = {
  [PATHS.lexicalV7]:
    "a52b925ee5e6d3adbd1de87749e7722424f6fc9c1fb5a50e3f306d2ad2fce5b1",
  [PATHS.task6V7]:
    "29e2c6b7e379acd2fa69431e28d25eb6c1e97466555bc7751eafe05693b33195",
  [PATHS.inventoryV7]:
    "d409e6cc0a909fdcf486c69308f8d2de84b2a6db688d7a90d31f933e14c0f69b",
  [PATHS.task6V8]:
    "f80c085f75f3c09bb84072ea56d4809ed11110248b6f5958365b6d0197019ff7",
  [PATHS.inventoryV8]:
    "b051f67de024c149f734167b25f18b88849d6c79502ea59a2d33bdee3b5af536",
  [PATHS.task6V9]:
    "808093390dfb8d6074021a9af55721ba251ad296c0bd5ecefa025947ea49239d",
  [PATHS.inventoryV9]:
    "83529d0021c399dc1d6b8c4f310d49f783d582c3effa094380c8823270a84c1e",
  [PATHS.moduleV9]:
    "6455d9abfa65e7483aa0200352d809b085e6a2a53ee549a4f053f799ee03e69e",
  [PATHS.gateV9]:
    "0358a742889fc9670bec88163ff3afb0840f000542d01d928898bfeb9ed7ca0c",
  [PATHS.captureV9]:
    "77fb56d0b872b9ef60ee602d7c0983c51923333b7da5e822365d8a55c5e2e9ad",
  [PATHS.manifestV9]:
    "1820eba60cac363e3b3d7cc420d7a7ef4a94657a531391b3d8e094210aed5ecc",
  [PATHS.evidenceV9]:
    "5413b055de4059c02690016574b41eed6fce722bd18b64e670b2c640a63dd0d0",
  [PATHS.focusedLogV9]:
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  [PATHS.repositoryLogV9]:
    "c1ddaee2bf4d1853e53f288e60b306962074490ac735a28a58adac32f0c734f7",
  [PATHS.receiptV9]:
    "6c967f8a24a71e7b7fe46ccb5fe73d188d327fe55edb71a60a981865726a01ef",
};

const DIGESTS = {
  task5: "b9d1f10fd35ce789a90055a6632af29550b0cfef349cd6b229a764336b0a271b",
  resolved: "f769b2a0ac46870f09a4f1c35bd0815ef97973b27cbfe711b56dcd717b37f400",
  unresolved:
    "fc3aa2befc24bd30c456fd69ebe53f62acb821d6eda683cada6b03565e92c605",
  packets: "32a2320cf26729d24efc5884e0fe3c6e993e9eeeac693886a49fd566771a6d3f",
} as const;

export const TRANSACTION_PATHS = [
  PATHS.lexicalV10,
  PATHS.task6V10,
  PATHS.inventoryV10,
  PATHS.module,
  PATHS.gate,
  PATHS.capture,
  PATHS.manifest,
  PATHS.typescriptEvidence,
  PATHS.focusedLog,
  PATHS.repositoryLog,
  PATHS.receipt,
] as const;

export const SOURCE_SNAPSHOT_PATHS = [
  PATHS.lexicalV10,
  PATHS.task6V10,
  PATHS.inventoryV10,
  PATHS.module,
  PATHS.gate,
  PATHS.capture,
  PATHS.manifest,
] as const;

export const CLOSED_AUTHORITY_V10 = {
  task7Unlock: false,
  preauthoringAuthority: false,
  learnerFacing: false,
  releaseAuthorized: false,
  currentlyMaterializable: false,
  materializedPackets: 0,
  phraseAuthority: false,
  consumerCutover: "NONE",
  defaultConsumerChanged: false,
  ownerApproval: "NOT_REQUESTED_NOT_GRANTED",
} as const;

const EXPECTED_EVIDENCE = {
  schemaVersion:
    "learning-v2-de-task6c-l01-guten-tag-positive-lexical-evidence.v1",
  sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1",
  canonicalSenseId: "de_lex_l01_c04_guten_tag_v1",
  sourceHeadword: "guten Tag",
  sourcePartOfSpeech: "Mehrwortausdruck",
  canonicalPartOfSpeech: "fixed_expression",
  partOfSpeechInterpretation:
    "SOURCE_GROUNDED_MULTIWORD_EXPRESSION_TO_FIXED_EXPRESSION",
  admittedSourceSenseAnchor: "d-1-1",
  admittedMeaning: "höfliche Formel zur Begrüßung",
  pragmaticFunction: "interaction_opening",
  sourcePolitenessMarker: "höfliche",
  sourceRegisterMarkers: null,
  register: null,
  timeOfDayScope: ["am Vormittag", "am Mittag", "am Nachmittag"],
  exclusions: {
    occasionalFarewellTailExcluded: true,
    rareAngryDismissalD12Excluded: true,
    morningExcluded: true,
    eveningExcluded: true,
    nightExcluded: true,
    unrestrictedAllDayExcluded: true,
  },
  claimBoundaries: {
    neutralRegisterClaim: false,
    formalRegisterClaim: false,
    unqualifiedFormalAddressClaim: false,
    phraseAuthority: false,
    phraseFrameClaim: false,
    phraseMappingClaim: false,
    addresseeCompositionClaim: false,
    curriculumNeutralFormalCaretakerSieWordingIsSourceFact: false,
  },
  curriculumIntentNotSourceFact: [
    "neutral formal greeting",
    "caretaker",
    "Sie",
  ],
  allocation: {
    checkpointPacketId: "de_l01_c04_s32",
    plannedUsePacketIds: ["de_l01_c04_s32"],
    firstIntroductionPacketId: null,
    firstScoredUsePacketId: null,
  },
  productionPolicy: "NOT_AUTHORIZED_BY_THIS_ADMISSION",
  authority: {
    task7Unlock: false,
    preauthoringAuthority: false,
    learnerFacing: false,
    releaseAuthorized: false,
    currentlyMaterializable: false,
    materializedPackets: 0,
    consumerCutover: "NONE",
    defaultConsumerChanged: false,
    ownerApproval: "NOT_REQUESTED_NOT_GRANTED",
  },
} as const;

const sha = (bytes: Buffer | string): string =>
  crypto.createHash("sha256").update(bytes).digest("hex");
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const fail = (code: string): never => {
  throw new Error(code);
};
const abs = (relative: string): string => path.join(ROOT, relative);
const bytes = (relative: string): Buffer => fs.readFileSync(abs(relative));
const json = (relative: string): RecordJson =>
  JSON.parse(bytes(relative).toString("utf8")) as RecordJson;
const exact = (actual: unknown, expected: unknown, code: string): void => {
  if (canonicalJsonV1(actual) !== canonicalJsonV1(expected)) fail(code);
};
const exactKeys = (
  value: unknown,
  keys: readonly string[],
  code: string,
): RecordJson => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return fail(code);
  const actual = Object.keys(value as RecordJson).sort();
  if (canonicalJsonV1(actual) !== canonicalJsonV1([...keys].sort())) fail(code);
  return value as RecordJson;
};
const writeJson = (relative: string, value: unknown): void => {
  fs.mkdirSync(path.dirname(abs(relative)), { recursive: true });
  fs.writeFileSync(
    abs(relative),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
};

function verifyFrozenBytes(): void {
  for (const [relative, expected] of Object.entries({
    ...CONSTRUCTIVE_HASHES,
    ...REJECTED_AUDIT_HASHES,
  })) {
    if (sha(bytes(relative)) !== expected)
      fail("guten_tag_v10_frozen_input_drift");
  }
}

export function validateLexicalEvidenceRaw(raw: Buffer): RecordJson {
  if (sha(raw) !== CONSTRUCTIVE_HASHES[PATHS.lexicalEvidence])
    fail("guten_tag_v10_lexical_evidence_hash");
  let value: RecordJson;
  try {
    value = JSON.parse(raw.toString("utf8")) as RecordJson;
  } catch {
    return fail("guten_tag_v10_lexical_evidence_schema");
  }
  exact(value, EXPECTED_EVIDENCE, "guten_tag_v10_lexical_evidence_schema");
  return value;
}

function evidence(): RecordJson {
  return validateLexicalEvidenceRaw(bytes(PATHS.lexicalEvidence));
}

function rejectedAudits(): RecordJson[] {
  return Object.entries(REJECTED_AUDIT_HASHES).map(
    ([relative, byteSha256]) => ({
      path: relative,
      byteSha256,
      status: "REJECTED_NOT_AUTHORITY",
    }),
  );
}

function binding(relative: string, schemaVersion?: string): RecordJson {
  const expected = CONSTRUCTIVE_HASHES[relative];
  if (expected === undefined)
    fail("guten_tag_v10_constructive_binding_unknown");
  return {
    path: relative,
    ...(schemaVersion === undefined ? {} : { schemaVersion }),
    byteSha256: expected,
  };
}

export function canonicalGutenTagRow(): RecordJson {
  const source = evidence();
  return {
    id: source.canonicalSenseId,
    lemma: "Guten Tag",
    senseGloss: "polite formula used as a greeting",
    partOfSpeech: source.canonicalPartOfSpeech,
    sourceHeadword: source.sourceHeadword,
    sourcePartOfSpeech: source.sourcePartOfSpeech,
    sourceSenseAnchor: source.admittedSourceSenseAnchor,
    sourceSense: source.admittedMeaning,
    excludedSourceSenseSegments: ["gelegentlich auch zum Abschied", "d-1-2"],
    pragmaticFunction: source.pragmaticFunction,
    partOfSpeechInterpretation: source.partOfSpeechInterpretation,
    sourcePolitenessMarker: source.sourcePolitenessMarker,
    sourceRegisterMarkers: source.sourceRegisterMarkers,
    register: source.register,
    timeOfDayScope: source.timeOfDayScope,
    neutralRegisterClaim: (source.claimBoundaries as RecordJson)
      .neutralRegisterClaim,
    formalRegisterClaim: (source.claimBoundaries as RecordJson)
      .formalRegisterClaim,
    unqualifiedFormalAddressClaim: (source.claimBoundaries as RecordJson)
      .unqualifiedFormalAddressClaim,
    phraseAuthority: false,
    nounGender: null,
    nounPlural: null,
    verbValency: null,
    verbFrame: null,
    verbSeparability: null,
    verbAuxiliary: null,
    productionPolicy: source.productionPolicy,
    region: null,
    evidenceIds: ["DE-LEX-ITEM-L01-C04-GUTEN-TAG-D11-GREETING-001"],
  };
}

function canonicalMapping(): RecordJson {
  const source = evidence();
  const allocation = source.allocation as RecordJson;
  return {
    sourcePlanId: source.sourcePlanId,
    canonicalId: source.canonicalSenseId,
    evidenceIds: ["DE-LEX-ITEM-L01-C04-GUTEN-TAG-D11-GREETING-001"],
    plannedUsePacketIds: allocation.plannedUsePacketIds,
    checkpointPacketId: allocation.checkpointPacketId,
    firstIntroductionPacketId: allocation.firstIntroductionPacketId,
    firstScoredUsePacketId: allocation.firstScoredUsePacketId,
    phraseAuthority: false,
  };
}

function canonicalMaterialization(): RecordJson {
  const mapping = canonicalMapping();
  return {
    sourcePlanId: mapping.sourcePlanId,
    canonicalLexicalSenseId: mapping.canonicalId,
    evidenceIds: mapping.evidenceIds,
    allocation: {
      plannedUsePacketIds: mapping.plannedUsePacketIds,
      checkpointPacketId: mapping.checkpointPacketId,
      firstIntroductionPacketId: mapping.firstIntroductionPacketId,
      firstScoredUsePacketId: mapping.firstScoredUsePacketId,
    },
    phraseAuthority: false,
  };
}

export function expectedLexicalV10(): Json[] {
  return [
    ...(clone(json(PATHS.lexicalV6)) as unknown as Json[]),
    canonicalGutenTagRow(),
  ];
}

export function expectedTask6V10(lexicalV10Sha256: string): RecordJson {
  const base = clone(json(PATHS.task6V6));
  base.schemaVersion = "learning-v2-german-task6-canonical-registry.v10";
  base.authority = clone(CLOSED_AUTHORITY_V10) as unknown as RecordJson;
  const bindings = base.sourceBindings as RecordJson;
  bindings.task6V6 = binding(
    PATHS.task6V6,
    "learning-v2-german-task6-canonical-registry.v6",
  );
  bindings.inventoryV6 = binding(
    PATHS.inventoryV6,
    "learning-v2-german-task7-allocation-inventory.v6",
  );
  bindings.v6Closure = binding(PATHS.closureV6);
  bindings.gutenTagLexicalEvidence = binding(PATHS.lexicalEvidence);
  bindings.gutenTagSourceManifest = binding(PATHS.sourceManifest);
  bindings.gutenTagExtraction = binding(PATHS.extraction);
  bindings.gutenTagRawDwds = binding(PATHS.rawDwds);
  bindings.gutenTagMetadata = binding(PATHS.metadata);
  bindings.lexicalRegistryV10 = {
    path: PATHS.lexicalV10,
    schemaVersion: "learning-v2-german-lexical-senses.v10",
    byteSha256: lexicalV10Sha256,
  };
  base.rejectedAudits = rejectedAudits();
  const materialization = base.materialization as RecordJson;
  materialization.l01GutenTagLexicalMapping = canonicalMaterialization();
  const context = base.authorityContext as RecordJson;
  context.schemaVersion = "learning-v2-german-task6-registry-authority.v10";
  context.lexicalMappings = [
    ...(context.lexicalMappings as Json[]),
    canonicalMapping(),
  ];
  const registry = base.registry as RecordJson;
  registry.lexicalSenses = [
    ...(registry.lexicalSenses as Json[]),
    canonicalGutenTagRow(),
  ];
  return base;
}

function task5Ids(): { plans: string[]; packets: string[] } {
  const task5 = json(PATHS.task5);
  const plans: string[] = [];
  const packets: string[] = [];
  for (const lesson of task5.lessons as RecordJson[]) {
    for (const chapter of lesson.chapters as RecordJson[]) {
      packets.push(...(chapter.packetIds as string[]));
      const checkpoint = chapter.checkpoint as RecordJson;
      for (const plan of checkpoint.plannedNewLexicalSenses as RecordJson[]) {
        plans.push(plan.id as string);
      }
    }
  }
  return { plans, packets };
}

export function expectedInventoryV10(task6V10Sha256: string): RecordJson {
  const base = clone(json(PATHS.inventoryV6));
  const source = evidence();
  const allocation = source.allocation as RecordJson;
  base.schemaVersion = "learning-v2-german-task7-allocation-inventory.v10";
  base.status = "GUTEN_TAG_EVIDENCE_ONLY_RECONCILIATION_PENDING_REVIEW";
  base.authority = clone(CLOSED_AUTHORITY_V10) as unknown as RecordJson;
  const bindings = base.sourceBindings as RecordJson;
  bindings.task6V6 = binding(
    PATHS.task6V6,
    "learning-v2-german-task6-canonical-registry.v6",
  );
  bindings.inventoryV6 = binding(
    PATHS.inventoryV6,
    "learning-v2-german-task7-allocation-inventory.v6",
  );
  bindings.v6Closure = binding(PATHS.closureV6);
  bindings.gutenTagLexicalEvidence = binding(PATHS.lexicalEvidence);
  bindings.gutenTagSourceManifest = binding(PATHS.sourceManifest);
  bindings.gutenTagExtraction = binding(PATHS.extraction);
  bindings.gutenTagRawDwds = binding(PATHS.rawDwds);
  bindings.gutenTagMetadata = binding(PATHS.metadata);
  bindings.lexicalRegistryV10 = {
    path: PATHS.lexicalV10,
    schemaVersion: "learning-v2-german-lexical-senses.v10",
    byteSha256: sha(bytes(PATHS.lexicalV10)),
  };
  bindings.task6V10 = {
    path: PATHS.task6V10,
    schemaVersion: "learning-v2-german-task6-canonical-registry.v10",
    byteSha256: task6V10Sha256,
  };
  base.rejectedAudits = rejectedAudits();
  base.counts = {
    task5PlanIds: 288,
    resolvedPlanIds: 11,
    unresolvedPlanIds: 277,
    packetIds: 1792,
    materializedPackets: 0,
  };
  base.inventoryDigests = {
    task5PlanIdsCanonicalSha256: DIGESTS.task5,
    resolvedPlanIdsCanonicalSha256: DIGESTS.resolved,
    unresolvedPlanIdsCanonicalSha256: DIGESTS.unresolved,
    packetIdsCanonicalSha256: DIGESTS.packets,
  };
  base.resolutions = [
    ...(base.resolutions as Json[]),
    {
      sourcePlanId: source.sourcePlanId,
      checkpointPacketId: allocation.checkpointPacketId,
      canonicalSenseId: source.canonicalSenseId,
      firstIntroductionPacketId: allocation.firstIntroductionPacketId,
      firstScoredUsePacketId: allocation.firstScoredUsePacketId,
    },
  ];
  const sequence = base.sequence as RecordJson;
  sequence.eligibilityKind =
    "NEXT_ORDERED_SESSION_AFTER_REMAINING_277_ALLOCATIONS_AND_SEPARATE_TASK7_UNLOCK";
  sequence.currentlyMaterializable = false;
  return base;
}

function verifyInventoryPartition(inventory: RecordJson): void {
  const { plans, packets } = task5Ids();
  const resolved = (inventory.resolutions as RecordJson[]).map(
    (row) => row.sourcePlanId as string,
  );
  if (plans.length !== 288 || new Set(plans).size !== 288)
    fail("guten_tag_v10_task5_partition");
  if (packets.length !== 1792 || new Set(packets).size !== 1792)
    fail("guten_tag_v10_packet_partition");
  if (resolved.length !== 11 || new Set(resolved).size !== 11)
    fail("guten_tag_v10_resolution_partition");
  const planSet = new Set(plans);
  if (resolved.some((id) => !planSet.has(id)))
    fail("guten_tag_v10_resolution_unknown");
  const resolvedSet = new Set(resolved);
  const unresolved = plans.filter((id) => !resolvedSet.has(id));
  if (unresolved.length !== 277) fail("guten_tag_v10_resolution_partition");
  exact(
    inventory.inventoryDigests,
    {
      task5PlanIdsCanonicalSha256: hashCanonicalBody(plans),
      resolvedPlanIdsCanonicalSha256: hashCanonicalBody(resolved),
      unresolvedPlanIdsCanonicalSha256: hashCanonicalBody(unresolved),
      packetIdsCanonicalSha256: hashCanonicalBody(packets),
    },
    "guten_tag_v10_inventory_digests",
  );
  exact(
    inventory.inventoryDigests,
    {
      task5PlanIdsCanonicalSha256: DIGESTS.task5,
      resolvedPlanIdsCanonicalSha256: DIGESTS.resolved,
      unresolvedPlanIdsCanonicalSha256: DIGESTS.unresolved,
      packetIdsCanonicalSha256: DIGESTS.packets,
    },
    "guten_tag_v10_inventory_digests",
  );
}

type StatLike = {
  dev?: unknown;
  ino?: unknown;
  size?: unknown;
  mtimeNs?: unknown;
  ctimeNs?: unknown;
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
  isReparsePoint?: () => boolean;
};

export type DiagnosticFsProvider = {
  platform: "win32" | "posix";
  existsSync(target: string): boolean;
  lstatSync(target: string): StatLike;
  statSync(target: string): StatLike;
  realpathSync(target: string): string;
};

export const nativeDiagnosticFs: DiagnosticFsProvider = {
  platform: process.platform === "win32" ? "win32" : "posix",
  existsSync: fs.existsSync,
  lstatSync: (target) => fs.lstatSync(target, { bigint: true }),
  statSync: (target) => fs.statSync(target, { bigint: true }),
  realpathSync: fs.realpathSync.native,
};

const unsafePathText =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u;
const keyFor = (value: string, platform: "win32" | "posix"): string =>
  platform === "win32"
    ? value.normalize("NFC").toLocaleLowerCase("en-US")
    : value;
const pathApi = (platform: "win32" | "posix"): typeof path.win32 =>
  platform === "win32" ? path.win32 : path.posix;
const isContained = (
  root: string,
  target: string,
  platform: "win32" | "posix",
): boolean => {
  const api = pathApi(platform);
  const relative = api.relative(root, target);
  return (
    relative !== "" &&
    !relative.startsWith(`..${api.sep}`) &&
    relative !== ".." &&
    !api.isAbsolute(relative)
  );
};
const isAliasEqual = (
  left: string,
  right: string,
  platform: "win32" | "posix",
): boolean => keyFor(left, platform) === keyFor(right, platform);

function rejectLink(stat: StatLike, code: string): void {
  if (stat.isSymbolicLink() || stat.isReparsePoint?.() === true) fail(code);
}

type StableFileRecord = {
  canonicalKey: string;
  path: string;
  realpath: string;
  physicalKey: string;
  dev: string;
  ino: string;
  size: string;
  mtimeNs: string;
  ctimeNs: string;
};

type TransactionIndex = {
  records: StableFileRecord[];
  byCanonical: Map<string, StableFileRecord>;
  byPhysical: Map<string, StableFileRecord>;
};

function statFields(
  stat: StatLike,
  code: string,
): {
  dev: bigint;
  ino: bigint;
  size: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
} {
  const { dev, ino, size, mtimeNs, ctimeNs } = stat;
  if (
    typeof dev !== "bigint" ||
    typeof ino !== "bigint" ||
    typeof size !== "bigint" ||
    typeof mtimeNs !== "bigint" ||
    typeof ctimeNs !== "bigint" ||
    dev <= 0n ||
    ino <= 0n ||
    size < 0n ||
    mtimeNs < 0n ||
    ctimeNs < 0n
  )
    fail(code);
  return {
    dev: dev as bigint,
    ino: ino as bigint,
    size: size as bigint,
    mtimeNs: mtimeNs as bigint,
    ctimeNs: ctimeNs as bigint,
  };
}

function inspectChain(
  candidate: string,
  provider: DiagnosticFsProvider,
  code: string,
): void {
  const api = pathApi(provider.platform);
  const relative = api.relative(ROOT, candidate);
  let component = ROOT;
  try {
    rejectLink(provider.lstatSync(component), code);
    for (const segment of relative.split(api.sep)) {
      if (segment.length === 0) continue;
      component = api.join(component, segment);
      rejectLink(provider.lstatSync(component), code);
    }
  } catch {
    fail(code);
  }
}

function inspectExistingFile(
  candidate: string,
  provider: DiagnosticFsProvider,
  code: string,
): StableFileRecord {
  const inspectOnce = (): StableFileRecord => {
    if (!provider.existsSync(candidate)) fail(code);
    inspectChain(candidate, provider, code);
    let lstat: StatLike;
    let stat: StatLike;
    let realpath: string;
    try {
      lstat = provider.lstatSync(candidate);
      stat = provider.statSync(candidate);
      realpath = provider.realpathSync(candidate);
    } catch {
      return fail(code);
    }
    rejectLink(lstat, code);
    if (!lstat.isFile() || !stat.isFile()) fail(code);
    const lstatValue = statFields(lstat, code);
    const statValue = statFields(stat, code);
    if (
      lstatValue.dev !== statValue.dev ||
      lstatValue.ino !== statValue.ino ||
      lstatValue.size !== statValue.size ||
      lstatValue.mtimeNs !== statValue.mtimeNs ||
      lstatValue.ctimeNs !== statValue.ctimeNs
    )
      fail(code);
    if (!isAliasEqual(realpath, candidate, provider.platform)) fail(code);
    if (!isContained(ROOT, realpath, provider.platform)) fail(code);
    return {
      canonicalKey: keyFor(realpath, provider.platform),
      path: candidate,
      realpath,
      physicalKey: `${statValue.dev}:${statValue.ino}`,
      dev: String(statValue.dev),
      ino: String(statValue.ino),
      size: String(statValue.size),
      mtimeNs: String(statValue.mtimeNs),
      ctimeNs: String(statValue.ctimeNs),
    };
  };
  const before = inspectOnce();
  const after = inspectOnce();
  exact(after, before, code);
  return before;
}

function parseDiagnosticPath(raw: string, platform: "win32" | "posix"): string {
  if (raw.length === 0 || unsafePathText.test(raw))
    fail("guten_tag_v10_typescript_diagnostic_path");
  const api = pathApi(platform);
  let value = raw;
  const drive = /^[a-zA-Z]:(.*)$/u.exec(value);
  if (drive !== null && !/^[\\/]/u.test(drive[1]))
    fail("guten_tag_v10_typescript_diagnostic_path");
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/u.exec(value);
  if (scheme !== null && drive === null) {
    if (scheme[1].toLowerCase() !== "file")
      fail("guten_tag_v10_typescript_diagnostic_path");
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return fail("guten_tag_v10_typescript_diagnostic_path");
    }
    if (
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== "" ||
      (url.hostname !== "" && url.hostname.toLowerCase() !== "localhost")
    )
      fail("guten_tag_v10_typescript_diagnostic_path");
    try {
      value = fileURLToPath(url.href);
    } catch {
      return fail("guten_tag_v10_typescript_diagnostic_path");
    }
  }
  const winAbsolute = path.win32.isAbsolute(value);
  const posixAbsolute = path.posix.isAbsolute(value);
  if (
    (platform === "win32" && posixAbsolute && !winAbsolute) ||
    (platform === "posix" && winAbsolute)
  )
    fail("guten_tag_v10_typescript_diagnostic_path");
  const normalized = value.replace(/[\\/]/gu, api.sep);
  const resolved = api.isAbsolute(normalized)
    ? api.normalize(normalized)
    : api.resolve(ROOT, normalized);
  if (!isContained(ROOT, resolved, platform))
    fail("guten_tag_v10_typescript_diagnostic_path");
  return resolved;
}

function snapshotTransactions(
  provider: DiagnosticFsProvider,
): TransactionIndex {
  const api = pathApi(provider.platform);
  const records: StableFileRecord[] = [];
  const byCanonical = new Map<string, StableFileRecord>();
  const byPhysical = new Map<string, StableFileRecord>();
  for (const relative of TRANSACTION_PATHS) {
    const target = api.resolve(ROOT, relative.replace(/[\\/]/gu, api.sep));
    if (!provider.existsSync(target)) continue;
    const record = inspectExistingFile(
      target,
      provider,
      "guten_tag_v10_typescript_transaction_alias",
    );
    if (byCanonical.has(record.canonicalKey))
      fail("guten_tag_v10_typescript_transaction_duplicate_path");
    if (byPhysical.has(record.physicalKey))
      fail("guten_tag_v10_typescript_transaction_duplicate_identity");
    byCanonical.set(record.canonicalKey, record);
    byPhysical.set(record.physicalKey, record);
    records.push(record);
  }
  return { records, byCanonical, byPhysical };
}

function assertSnapshotsStable(
  before: TransactionIndex,
  provider: DiagnosticFsProvider,
): void {
  const after = snapshotTransactions(provider);
  exact(
    after.records,
    before.records,
    "guten_tag_v10_typescript_transaction_raced",
  );
}

function classifyDiagnosticPath(
  raw: string,
  transactions: TransactionIndex,
  provider: DiagnosticFsProvider,
): boolean {
  const candidate = parseDiagnosticPath(raw, provider.platform);
  const inspected = inspectExistingFile(
    candidate,
    provider,
    "guten_tag_v10_typescript_diagnostic_alias",
  );
  const canonical = transactions.byCanonical.get(inspected.canonicalKey);
  const physical = transactions.byPhysical.get(inspected.physicalKey);
  if (canonical !== undefined && physical !== undefined) {
    if (canonical.path !== physical.path)
      fail("guten_tag_v10_typescript_identity_conflict");
    return true;
  }
  if (canonical !== undefined && physical === undefined)
    fail("guten_tag_v10_typescript_canonical_identity_raced");
  if (canonical === undefined && physical !== undefined) return true;
  return false;
}

export function decodeTypeScriptLog(raw: Buffer): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      raw,
    );
  } catch {
    return fail("guten_tag_v10_typescript_log_utf8");
  }
  if (text.startsWith("\ufeff")) fail("guten_tag_v10_typescript_log_control");
  for (let index = 0; index < text.length; index += 1) {
    const code = text.codePointAt(index) as number;
    if (code > 0xffff) index += 1;
    if (code === 0x0d) {
      if (text.codePointAt(index + 1) !== 0x0a)
        fail("guten_tag_v10_typescript_log_control");
      continue;
    }
    if (code === 0x09 || code === 0x0a) continue;
    if (
      code < 0x20 ||
      (code >= 0x7f && code <= 0x9f) ||
      code === 0xfeff ||
      /\p{Cf}/u.test(String.fromCodePoint(code))
    )
      fail("guten_tag_v10_typescript_log_control");
  }
  return text;
}

export type DiagnosticFacts = {
  total: number;
  transaction: number;
  codes: number[];
};

export function analyzeTypeScriptLog(
  raw: Buffer,
  provider: DiagnosticFsProvider = nativeDiagnosticFs,
): DiagnosticFacts {
  const text = decodeTypeScriptLog(raw);
  const transactions = snapshotTransactions(provider);
  const headers: { file: string | null; code: number }[] = [];
  for (const line of text.split(/\r?\n/u)) {
    if (!line.includes("error TS")) continue;
    const file = /^(.+)\((\d+),(\d+)\): error TS(\d+): .+$/u.exec(line);
    const global = /^error TS(\d+): .+$/u.exec(line);
    if (file !== null) headers.push({ file: file[1], code: Number(file[4]) });
    else if (global !== null)
      headers.push({ file: null, code: Number(global[1]) });
    else fail("guten_tag_v10_typescript_ambiguous_diagnostic");
  }
  const transaction = headers.filter(
    (item) =>
      item.file !== null &&
      classifyDiagnosticPath(item.file, transactions, provider),
  ).length;
  assertSnapshotsStable(transactions, provider);
  return {
    total: headers.length,
    transaction,
    codes: [...new Set(headers.map((item) => item.code))].sort((a, b) => a - b),
  };
}

function expectedManifest(): RecordJson {
  return {
    schemaVersion:
      "learning-v2-de-guten-tag-v10-evidence-only-reconciliation-manifest.v1",
    status: "PENDING_INDEPENDENT_REVIEW",
    provenance: "LOCAL_WORKTREE_NOT_IMMUTABLE_EXTERNAL_RUNNER",
    constructiveInputs: Object.entries(CONSTRUCTIVE_HASHES).map(
      ([relative, sha256]) => ({
        path: relative,
        sha256,
      }),
    ),
    rejectedAudits: rejectedAudits(),
    outputs: [
      PATHS.lexicalV10,
      PATHS.task6V10,
      PATHS.inventoryV10,
      PATHS.module,
      PATHS.gate,
      PATHS.capture,
    ].map((relative) => ({ path: relative, sha256: sha(bytes(relative)) })),
    authority: CLOSED_AUTHORITY_V10,
  };
}

export function sourceSnapshotRecord(): RecordJson {
  return {
    rootRelative: ".",
    files: SOURCE_SNAPSHOT_PATHS.map((relative) => ({
      path: relative,
      sha256: sha(bytes(relative)),
    })),
  };
}

export type GateOverrides = Partial<
  Record<
    | "lexicalV10"
    | "task6V10"
    | "inventoryV10"
    | "manifest"
    | "typescriptEvidence"
    | "focusedLog"
    | "repositoryLog"
    | "receipt",
    string
  >
>;

const readOverride = (
  key: keyof GateOverrides,
  overrides: GateOverrides,
): Buffer =>
  overrides[key] === undefined
    ? bytes(PATHS[key])
    : fs.readFileSync(overrides[key] as string);
const jsonOverride = (
  key: keyof GateOverrides,
  overrides: GateOverrides,
): RecordJson =>
  JSON.parse(readOverride(key, overrides).toString("utf8")) as RecordJson;

function validateRun(
  value: unknown,
  kind: "focused" | "repository",
  overrides: GateOverrides,
  provider: DiagnosticFsProvider,
): void {
  const run = exactKeys(
    value,
    [
      "executable",
      "argv",
      "cwdRelative",
      "env",
      "exitCode",
      "outcome",
      "log",
      "diagnostics",
    ],
    "guten_tag_v10_typescript_schema",
  );
  if (run.executable !== "node" || run.cwdRelative !== ".")
    fail("guten_tag_v10_typescript_command");
  const expectedArgv =
    kind === "focused"
      ? [
          "node_modules/typescript/bin/tsc",
          "--noEmit",
          "--pretty",
          "false",
          "--skipLibCheck",
          "--esModuleInterop",
          "--module",
          "commonjs",
          "--target",
          "es2022",
          "--moduleResolution",
          "node",
          PATHS.module,
          PATHS.gate,
        ]
      : ["node_modules/typescript/bin/tsc", "--noEmit", "--pretty", "false"];
  exact(run.argv, expectedArgv, "guten_tag_v10_typescript_command");
  exact(
    run.env,
    kind === "focused" ? {} : { NODE_OPTIONS: "--max-old-space-size=8192" },
    "guten_tag_v10_typescript_command",
  );
  const log = exactKeys(
    run.log,
    ["path", "sha256", "bytes"],
    "guten_tag_v10_typescript_schema",
  );
  const expectedPath =
    kind === "focused" ? PATHS.focusedLog : PATHS.repositoryLog;
  if (log.path !== expectedPath) fail("guten_tag_v10_typescript_log_path");
  const key = kind === "focused" ? "focusedLog" : "repositoryLog";
  const raw = readOverride(key, overrides);
  if (
    sha(raw) !== log.sha256 ||
    raw.length !== log.bytes ||
    !HASH.test(String(log.sha256))
  )
    fail("guten_tag_v10_typescript_log_integrity");
  const facts = analyzeTypeScriptLog(raw, provider);
  exact(run.diagnostics, facts, "guten_tag_v10_typescript_diagnostics");
  if (facts.transaction !== 0)
    fail("guten_tag_v10_typescript_transaction_diagnostic");
  if (kind === "focused") {
    if (run.exitCode !== 0 || run.outcome !== "PASS" || facts.total !== 0)
      fail("guten_tag_v10_typescript_focused");
  } else if (
    (run.exitCode === 0 && (run.outcome !== "PASS" || facts.total !== 0)) ||
    (run.exitCode !== 0 &&
      (run.outcome !== "BASELINE_DIAGNOSTICS_OUTSIDE_TRANSACTION" ||
        facts.total === 0))
  )
    fail("guten_tag_v10_typescript_repository");
}

function validateTypeScriptEvidence(
  value: unknown,
  overrides: GateOverrides,
  provider: DiagnosticFsProvider,
): void {
  const record = exactKeys(
    value,
    [
      "schemaVersion",
      "status",
      "provenance",
      "authority",
      "sourceSnapshot",
      "transactionPaths",
      "focusedRun",
      "repositoryRun",
    ],
    "guten_tag_v10_typescript_schema",
  );
  if (
    record.schemaVersion !==
      "learning-v2-de-guten-tag-v10-typescript-evidence.v1" ||
    record.status !== "PENDING_INDEPENDENT_REVIEW" ||
    record.provenance !== "LOCAL_CAPTURE_NOT_IMMUTABLE_EXTERNAL_RUNNER"
  )
    fail("guten_tag_v10_typescript_schema");
  exact(record.authority, CLOSED_AUTHORITY_V10, "guten_tag_v10_authority");
  exact(
    record.sourceSnapshot,
    sourceSnapshotRecord(),
    "guten_tag_v10_typescript_source_snapshot",
  );
  exact(
    record.transactionPaths,
    TRANSACTION_PATHS,
    "guten_tag_v10_typescript_transaction_paths",
  );
  validateRun(record.focusedRun, "focused", overrides, provider);
  validateRun(record.repositoryRun, "repository", overrides, provider);
}

export function receiptRecord(): RecordJson {
  const evidenceRecord = json(PATHS.typescriptEvidence);
  return {
    schemaVersion:
      "learning-v2-de-guten-tag-v10-evidence-only-reconciliation-receipt.v1",
    status: "PENDING_INDEPENDENT_REVIEW",
    provenance: "LOCAL_WORKTREE_NOT_IMMUTABLE_EXTERNAL_RUNNER",
    independentReview: "PENDING",
    adversarialReview: "PENDING",
    closure: "NOT_CREATED",
    authority: CLOSED_AUTHORITY_V10,
    inventory: {
      task5PlanIds: 288,
      resolvedPlanIds: 11,
      unresolvedPlanIds: 277,
      packetIds: 1792,
      materializedPackets: 0,
    },
    digests: DIGESTS,
    artifacts: [
      PATHS.lexicalV10,
      PATHS.task6V10,
      PATHS.inventoryV10,
      PATHS.module,
      PATHS.gate,
      PATHS.capture,
      PATHS.manifest,
      PATHS.typescriptEvidence,
      PATHS.focusedLog,
      PATHS.repositoryLog,
    ].map((relative) => ({ path: relative, sha256: sha(bytes(relative)) })),
    rejectedAudits: rejectedAudits(),
    typescript: {
      focused: evidenceRecord.focusedRun,
      repository: evidenceRecord.repositoryRun,
    },
  };
}

export function renderTypeScriptEvidence(value: unknown): string {
  return `${JSON.stringify(value, null, 2).replace(
    /"codes": \[\n((?:\s+\d+,?\n)+)\s+\]/gu,
    (_match, rows: string) =>
      `"codes": [${[...rows.matchAll(/\d+/gu)]
        .map((item) => item[0])
        .join(", ")}]`,
  )}\n`;
}

export function renderReceipt(): string {
  const machine = renderTypeScriptEvidence(receiptRecord()).trimEnd();
  return [
    "# German Learning V2 — Guten Tag V10 evidence-only reconciliation",
    "",
    "Status: `PENDING_INDEPENDENT_REVIEW`.",
    "",
    "This local receipt records a V10 reconstruction from frozen V6 authority and direct lexical evidence only. Rejected V7/V8/V9 bytes are hashed for audit identity and are never parsed as constructive input. It grants no Task 7, preauthoring, learner-facing, release, phrase, cutover, default-consumer, or owner authority.",
    "",
    "```json",
    machine,
    "```",
    "",
  ].join("\n");
}

function validateReceipt(raw: string): void {
  const matches = [...raw.matchAll(/```json\n([\s\S]*?)\n```/gu)];
  if (matches.length !== 1) fail("guten_tag_v10_receipt_machine_block");
  let parsed: unknown;
  try {
    parsed = JSON.parse(matches[0][1]);
  } catch {
    return fail("guten_tag_v10_receipt_machine_block");
  }
  exact(parsed, receiptRecord(), "guten_tag_v10_receipt_record");
  if (raw !== renderReceipt()) fail("guten_tag_v10_receipt_bytes");
  const prose = raw.replace(matches[0][0], "");
  if (/\b(?:PASS|CLOSED|APPROVED|AUTHORIZED)\b/u.test(prose))
    fail("guten_tag_v10_receipt_authority_word");
}

export function validateGutenTagV10(
  overrides: GateOverrides = {},
  provider: DiagnosticFsProvider = nativeDiagnosticFs,
): void {
  verifyFrozenBytes();
  evidence();
  exact(
    jsonOverride("lexicalV10", overrides),
    expectedLexicalV10(),
    "guten_tag_v10_lexical_body",
  );
  const lexicalRaw = readOverride("lexicalV10", overrides);
  const task6Raw = readOverride("task6V10", overrides);
  exact(
    JSON.parse(task6Raw.toString("utf8")),
    expectedTask6V10(sha(lexicalRaw)),
    "guten_tag_v10_task6_body",
  );
  const inventory = jsonOverride("inventoryV10", overrides);
  exact(
    inventory,
    expectedInventoryV10(sha(task6Raw)),
    "guten_tag_v10_inventory_body",
  );
  verifyInventoryPartition(inventory);
  exact(
    jsonOverride("manifest", overrides),
    expectedManifest(),
    "guten_tag_v10_manifest",
  );
  const typescriptRaw = readOverride("typescriptEvidence", overrides);
  const typescriptRecord = JSON.parse(typescriptRaw.toString("utf8"));
  if (
    typescriptRaw.toString("utf8") !==
    renderTypeScriptEvidence(typescriptRecord)
  )
    fail("guten_tag_v10_typescript_evidence_bytes");
  validateTypeScriptEvidence(typescriptRecord, overrides, provider);
  validateReceipt(readOverride("receipt", overrides).toString("utf8"));
  verifyFrozenBytes();
}

export function materializeCore(): void {
  verifyFrozenBytes();
  evidence();
  materializeLexical();
  materializeTask6();
  materializeInventory();
  writeJson(PATHS.manifest, expectedManifest());
}

export function materializeLexical(): void {
  writeJson(PATHS.lexicalV10, expectedLexicalV10());
}

export function materializeTask6(): void {
  writeJson(PATHS.task6V10, expectedTask6V10(sha(bytes(PATHS.lexicalV10))));
}

export function materializeInventory(): void {
  writeJson(
    PATHS.inventoryV10,
    expectedInventoryV10(sha(bytes(PATHS.task6V10))),
  );
}

export function materializeManifest(): void {
  verifyFrozenBytes();
  writeJson(PATHS.manifest, expectedManifest());
}

if (
  process.argv[1] !== undefined &&
  path.basename(process.argv[1]) === path.basename(PATHS.module)
) {
  try {
    if (process.argv.includes("--materialize-core")) materializeCore();
    else if (process.argv.includes("--write-lexical")) materializeLexical();
    else if (process.argv.includes("--write-task6")) materializeTask6();
    else if (process.argv.includes("--write-inventory")) materializeInventory();
    else if (process.argv.includes("--write-manifest")) materializeManifest();
    else if (process.argv.includes("--write-receipt"))
      fs.writeFileSync(abs(PATHS.receipt), renderReceipt(), "utf8");
    else validateGutenTagV10();
    console.log("guten_tag_v10_evidence_only_reconciliation: PASS");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
