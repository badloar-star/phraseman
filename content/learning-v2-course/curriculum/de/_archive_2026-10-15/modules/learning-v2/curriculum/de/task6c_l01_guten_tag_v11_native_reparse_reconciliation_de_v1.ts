import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
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
  lexicalV10:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v10.json",
  task6V10:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v10.json",
  inventoryV10:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v10.json",
  moduleV10:
    "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v10_evidence_only_reconciliation_de_v1.ts",
  gateV10:
    "tests/learning_v2_de_task6c_l01_guten_tag_v10_evidence_only_reconciliation_gate.ts",
  captureV10:
    "scripts/capture_learning_v2_de_task6c_l01_guten_tag_v10_typescript_evidence.mjs",
  manifestV10:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/manifest.json",
  evidenceV10:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/typescript_evidence.json",
  focusedLogV10:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/logs/focused_tsc.log",
  repositoryLogV10:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v10_evidence_only_reconciliation_v1/logs/repository_tsc_8192.log",
  receiptV10:
    "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_V10_EVIDENCE_ONLY_RECONCILIATION_RECEIPT_2026-10-13.md",
  lexicalV11:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v11.json",
  task6V11:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v11.json",
  inventoryV11:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v11.json",
  module:
    "modules/learning-v2/curriculum/de/task6c_l01_guten_tag_v11_native_reparse_reconciliation_de_v1.ts",
  gate: "tests/learning_v2_de_task6c_l01_guten_tag_v11_native_reparse_reconciliation_gate.ts",
  capture:
    "scripts/capture_learning_v2_de_task6c_l01_guten_tag_v11_typescript_evidence.mjs",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v11_native_reparse_reconciliation_v1/manifest.json",
  typescriptEvidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v11_native_reparse_reconciliation_v1/typescript_evidence.json",
  focusedLog:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v11_native_reparse_reconciliation_v1/logs/focused_tsc.log",
  repositoryLog:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_guten_tag_v11_native_reparse_reconciliation_v1/logs/repository_tsc_8192.log",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_GUTEN_TAG_V11_NATIVE_REPARSE_RECONCILIATION_RECEIPT_2026-10-13.md",
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
  [PATHS.lexicalV10]:
    "77f0f1df558c9d0ee3c9b8e14f046c63e2261e3e5531e70a4a36dd4f79ad7be4",
  [PATHS.task6V10]:
    "93e7a4f2413f879945c5f740d5f98cc0b18c5a60c03bb80eac32697ec1ac6ecd",
  [PATHS.inventoryV10]:
    "dff3fb050d58906eadbb92b0e75fc955e6d7ce848a9164c17f8b574a102679eb",
  [PATHS.moduleV10]:
    "5d7aff945ffa5f32c9d2f33bf85a6deed99079ce43d867ca4c3e4d5d92af6a11",
  [PATHS.gateV10]:
    "3a18b3290c276ee27b0958cb96a26ca4ed91ccd82a43cb39aa1499bcad8e2bdf",
  [PATHS.captureV10]:
    "e58d1e92bda41e443ad4ee9db92b4b7a31bcad9d52922e18457c6078b2113a95",
  [PATHS.manifestV10]:
    "062d709fbb877d75ee327e02dea6abb02fc8b86996cd345ad2f9a9d78eec1c01",
  [PATHS.evidenceV10]:
    "166ccf86e389d5cd640c812e97e991829166e7119377b893c47c66a0f3769c95",
  [PATHS.focusedLogV10]:
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  [PATHS.repositoryLogV10]:
    "c1ddaee2bf4d1853e53f288e60b306962074490ac735a28a58adac32f0c734f7",
  [PATHS.receiptV10]:
    "a0d89d62aa541cc74223c321e6ac66698e853bf182b5f01d8335ef9607b5fa57",
};

const DIGESTS = {
  task5: "b9d1f10fd35ce789a90055a6632af29550b0cfef349cd6b229a764336b0a271b",
  resolved: "f769b2a0ac46870f09a4f1c35bd0815ef97973b27cbfe711b56dcd717b37f400",
  unresolved:
    "fc3aa2befc24bd30c456fd69ebe53f62acb821d6eda683cada6b03565e92c605",
  packets: "32a2320cf26729d24efc5884e0fe3c6e993e9eeeac693886a49fd566771a6d3f",
} as const;

export const TRANSACTION_PATHS = [
  PATHS.lexicalV11,
  PATHS.task6V11,
  PATHS.inventoryV11,
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
  PATHS.lexicalV11,
  PATHS.task6V11,
  PATHS.inventoryV11,
  PATHS.module,
  PATHS.gate,
  PATHS.capture,
  PATHS.manifest,
] as const;

export const CLOSED_AUTHORITY_V11 = {
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
      fail("guten_tag_v11_frozen_input_drift");
  }
}

export function validateLexicalEvidenceRaw(raw: Buffer): RecordJson {
  if (sha(raw) !== CONSTRUCTIVE_HASHES[PATHS.lexicalEvidence])
    fail("guten_tag_v11_lexical_evidence_hash");
  let value: RecordJson;
  try {
    value = JSON.parse(raw.toString("utf8")) as RecordJson;
  } catch {
    return fail("guten_tag_v11_lexical_evidence_schema");
  }
  exact(value, EXPECTED_EVIDENCE, "guten_tag_v11_lexical_evidence_schema");
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
    fail("guten_tag_v11_constructive_binding_unknown");
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

export function expectedLexicalV11(): Json[] {
  return [
    ...(clone(json(PATHS.lexicalV6)) as unknown as Json[]),
    canonicalGutenTagRow(),
  ];
}

export function expectedTask6V11(lexicalV11Sha256: string): RecordJson {
  const base = clone(json(PATHS.task6V6));
  base.schemaVersion = "learning-v2-german-task6-canonical-registry.v11";
  base.authority = clone(CLOSED_AUTHORITY_V11) as unknown as RecordJson;
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
  bindings.lexicalRegistryV11 = {
    path: PATHS.lexicalV11,
    schemaVersion: "learning-v2-german-lexical-senses.v11",
    byteSha256: lexicalV11Sha256,
  };
  base.rejectedAudits = rejectedAudits();
  const materialization = base.materialization as RecordJson;
  materialization.l01GutenTagLexicalMapping = canonicalMaterialization();
  const context = base.authorityContext as RecordJson;
  context.schemaVersion = "learning-v2-german-task6-registry-authority.v11";
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

export function expectedInventoryV11(task6V11Sha256: string): RecordJson {
  const base = clone(json(PATHS.inventoryV6));
  const source = evidence();
  const allocation = source.allocation as RecordJson;
  base.schemaVersion = "learning-v2-german-task7-allocation-inventory.v11";
  base.status = "GUTEN_TAG_NATIVE_REPARSE_RECONCILIATION_PENDING_REVIEW";
  base.authority = clone(CLOSED_AUTHORITY_V11) as unknown as RecordJson;
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
  bindings.lexicalRegistryV11 = {
    path: PATHS.lexicalV11,
    schemaVersion: "learning-v2-german-lexical-senses.v11",
    byteSha256: sha(bytes(PATHS.lexicalV11)),
  };
  bindings.task6V11 = {
    path: PATHS.task6V11,
    schemaVersion: "learning-v2-german-task6-canonical-registry.v11",
    byteSha256: task6V11Sha256,
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
    fail("guten_tag_v11_task5_partition");
  if (packets.length !== 1792 || new Set(packets).size !== 1792)
    fail("guten_tag_v11_packet_partition");
  if (resolved.length !== 11 || new Set(resolved).size !== 11)
    fail("guten_tag_v11_resolution_partition");
  const planSet = new Set(plans);
  if (resolved.some((id) => !planSet.has(id)))
    fail("guten_tag_v11_resolution_unknown");
  const resolvedSet = new Set(resolved);
  const unresolved = plans.filter((id) => !resolvedSet.has(id));
  if (unresolved.length !== 277) fail("guten_tag_v11_resolution_partition");
  exact(
    inventory.inventoryDigests,
    {
      task5PlanIdsCanonicalSha256: hashCanonicalBody(plans),
      resolvedPlanIdsCanonicalSha256: hashCanonicalBody(resolved),
      unresolvedPlanIdsCanonicalSha256: hashCanonicalBody(unresolved),
      packetIdsCanonicalSha256: hashCanonicalBody(packets),
    },
    "guten_tag_v11_inventory_digests",
  );
  exact(
    inventory.inventoryDigests,
    {
      task5PlanIdsCanonicalSha256: DIGESTS.task5,
      resolvedPlanIdsCanonicalSha256: DIGESTS.resolved,
      unresolvedPlanIdsCanonicalSha256: DIGESTS.unresolved,
      packetIdsCanonicalSha256: DIGESTS.packets,
    },
    "guten_tag_v11_inventory_digests",
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
};

export type DiagnosticFsProvider = {
  platform: "win32" | "posix";
  existsSync(target: string): boolean;
  lstatSync(target: string): StatLike;
  statSync(target: string): StatLike;
  realpathSync(target: string): string;
  readWindowsFileAttributesSync?: (paths: string[]) => number[];
};

type AttributeProbeResult = {
  error?: Error;
  signal: NodeJS.Signals | null;
  status: number | null;
  stdout: Buffer | string | null;
  stderr: Buffer | string | null;
};

export type AttributeProbeSpawnSync = (
  executable: string,
  argv: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    encoding: null;
    shell: false;
    windowsHide: true;
    timeout: 5000;
    maxBuffer: 65536;
  },
) => AttributeProbeResult;

const WINDOWS_ATTRIBUTE_SCRIPT = String.raw`$ErrorActionPreference='Stop'
try {
  $b64=[Environment]::GetEnvironmentVariable('PHRASEMAN_V11_REPARSE_PATHS_B64','Process')
  if ([String]::IsNullOrEmpty($b64)) { throw 'payload' }
  $raw=[Convert]::FromBase64String($b64)
  if ($raw.Length -lt 4 -or $raw.Length -gt 12000) { throw 'payload' }
  $offset=0
  $count=[BitConverter]::ToUInt32($raw,$offset)
  $offset+=4
  if ($count -lt 1 -or $count -gt 256) { throw 'count' }
  $utf8=[Text.UTF8Encoding]::new($false,$true)
  $values=[Collections.Generic.List[string]]::new()
  for ($n=0; $n -lt $count; $n++) {
    if ($offset + 4 -gt $raw.Length) { throw 'length' }
    $length=[BitConverter]::ToUInt32($raw,$offset)
    $offset+=4
    if ($length -lt 1 -or $length -gt 4096 -or $offset + $length -gt $raw.Length) { throw 'length' }
    $text=$utf8.GetString($raw,$offset,$length)
    $offset+=$length
    if ($text.IndexOf([char]0) -ge 0) { throw 'nul' }
    $attribute=[uint32][IO.File]::GetAttributes($text)
    $values.Add($attribute.ToString([Globalization.CultureInfo]::InvariantCulture))
  }
  if ($offset -ne $raw.Length) { throw 'trailing' }
  [Console]::Out.Write('PHRASEMAN_ATTRS_V1|'+$count.ToString([Globalization.CultureInfo]::InvariantCulture)+'|'+[String]::Join(',',$values))
} catch {
  [Console]::Error.Write('PHRASEMAN_ATTRS_V1_ERROR')
  [Environment]::Exit(70)
}`;

export const WINDOWS_ATTRIBUTE_SCRIPT_ENCODED = Buffer.from(
  WINDOWS_ATTRIBUTE_SCRIPT,
  "utf16le",
).toString("base64");

const WINDOWS_UNSAFE_ATTRIBUTE_MASK = 0x00441400;

function encodeAttributeProbePayload(paths: string[]): string {
  if (paths.length < 1 || paths.length > 256)
    fail("guten_tag_v11_windows_attributes_payload");
  const encoded = paths.map((candidate) => {
    if (candidate.includes("\u0000"))
      fail("guten_tag_v11_windows_attributes_payload");
    const value = Buffer.from(candidate, "utf8");
    if (value.length < 1 || value.length > 4096)
      fail("guten_tag_v11_windows_attributes_payload");
    return value;
  });
  const total = 4 + encoded.reduce((sum, value) => sum + 4 + value.length, 0);
  if (total > 12000) fail("guten_tag_v11_windows_attributes_payload");
  const payload = Buffer.alloc(total);
  payload.writeUInt32LE(encoded.length, 0);
  let offset = 4;
  for (const value of encoded) {
    payload.writeUInt32LE(value.length, offset);
    offset += 4;
    value.copy(payload, offset);
    offset += value.length;
  }
  const base64 = payload.toString("base64");
  if (base64.length > 16000) fail("guten_tag_v11_windows_attributes_payload");
  return base64;
}

function validatedWindowsEnvironment(
  environment: NodeJS.ProcessEnv,
  payload: string,
): { executable: string; env: NodeJS.ProcessEnv } {
  const systemRoot = environment.SystemRoot;
  if (
    typeof systemRoot !== "string" ||
    systemRoot.length === 0 ||
    unsafePathText.test(systemRoot) ||
    !/^[a-zA-Z]:\\/u.test(systemRoot) ||
    !path.win32.isAbsolute(systemRoot) ||
    path.win32.normalize(systemRoot) !== systemRoot
  )
    fail("guten_tag_v11_windows_system_root");
  const temp = environment.TEMP;
  const tmp = environment.TMP;
  if (
    typeof temp !== "string" ||
    typeof tmp !== "string" ||
    temp.length === 0 ||
    tmp.length === 0 ||
    unsafePathText.test(temp) ||
    unsafePathText.test(tmp)
  )
    fail("guten_tag_v11_windows_environment");
  const checkedSystemRoot = systemRoot as string;
  const checkedTemp = temp as string;
  const checkedTmp = tmp as string;
  return {
    executable: path.win32.join(
      checkedSystemRoot,
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe",
    ),
    env: {
      SystemRoot: checkedSystemRoot,
      WINDIR: checkedSystemRoot,
      TEMP: checkedTemp,
      TMP: checkedTmp,
      PHRASEMAN_V11_REPARSE_PATHS_B64: payload,
    } as unknown as NodeJS.ProcessEnv,
  };
}

export function readWindowsFileAttributesWithSpawnSync(
  paths: string[],
  environment: NodeJS.ProcessEnv = process.env,
  runner: AttributeProbeSpawnSync = spawnSync as AttributeProbeSpawnSync,
): number[] {
  const payload = encodeAttributeProbePayload(paths);
  const { executable, env } = validatedWindowsEnvironment(environment, payload);
  const result = runner(
    executable,
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-EncodedCommand",
      WINDOWS_ATTRIBUTE_SCRIPT_ENCODED,
    ],
    {
      cwd: ROOT,
      env,
      encoding: null,
      shell: false,
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 65536,
    },
  );
  const stdout = result.stdout;
  const stderr = result.stderr;
  if (
    result.error !== undefined ||
    result.signal !== null ||
    result.status !== 0 ||
    !Buffer.isBuffer(stdout) ||
    !Buffer.isBuffer(stderr) ||
    stderr.length !== 0
  )
    fail("guten_tag_v11_windows_attributes_probe");
  const output = (stdout as Buffer).toString("ascii");
  if (!(stdout as Buffer).equals(Buffer.from(output, "ascii")))
    fail("guten_tag_v11_windows_attributes_output");
  const match =
    /^PHRASEMAN_ATTRS_V1\|([1-9]\d*)\|((?:0|[1-9]\d*)(?:,(?:0|[1-9]\d*))*)$/u.exec(
      output,
    );
  if (match === null || match[1] !== String(paths.length))
    fail("guten_tag_v11_windows_attributes_output");
  const matched = match as RegExpExecArray;
  const values = matched[2].split(",").map((raw) => Number(raw));
  if (
    values.length !== paths.length ||
    values.some(
      (value) =>
        !Number.isSafeInteger(value) || value < 0 || value > 0xffffffff,
    )
  )
    fail("guten_tag_v11_windows_attributes_output");
  return values;
}

export const nativeDiagnosticFs: DiagnosticFsProvider = {
  platform: process.platform === "win32" ? "win32" : "posix",
  existsSync: fs.existsSync,
  lstatSync: (target) => fs.lstatSync(target, { bigint: true }),
  statSync: (target) => fs.statSync(target, { bigint: true }),
  realpathSync: fs.realpathSync.native,
  readWindowsFileAttributesSync: (paths) =>
    readWindowsFileAttributesWithSpawnSync(paths),
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
  if (stat.isSymbolicLink()) fail(code);
}

function absoluteComponents(
  candidate: string,
  platform: "win32" | "posix",
  code: string,
): string[] {
  const api = pathApi(platform);
  if (!api.isAbsolute(ROOT) || !api.isAbsolute(candidate)) fail(code);
  const relative = api.relative(ROOT, candidate);
  if (
    relative === ".." ||
    relative.startsWith(`..${api.sep}`) ||
    api.isAbsolute(relative)
  )
    fail(code);
  const components = [ROOT];
  let current = ROOT;
  for (const segment of relative.split(api.sep)) {
    if (segment.length === 0) continue;
    current = api.join(current, segment);
    if (!api.isAbsolute(current)) fail(code);
    components.push(current);
  }
  return components;
}

export function readSafeWindowsAttributes(
  components: string[],
  provider: DiagnosticFsProvider,
  code: string,
): number[] {
  if (provider.platform !== "win32") return [];
  const reader = provider.readWindowsFileAttributesSync;
  if (reader === undefined) fail(code);
  let values: number[];
  try {
    values = (reader as (paths: string[]) => number[])(components);
  } catch {
    return fail(code);
  }
  if (
    !Array.isArray(values) ||
    values.length !== components.length ||
    values.some(
      (value) =>
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > 0xffffffff ||
        (value & WINDOWS_UNSAFE_ATTRIBUTE_MASK) !== 0,
    )
  )
    fail(code);
  return values;
}

function uniqueComponents(
  candidates: string[],
  provider: DiagnosticFsProvider,
  code: string,
): string[] {
  const components: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    for (const component of absoluteComponents(
      candidate,
      provider.platform,
      code,
    )) {
      const key = keyFor(component, provider.platform);
      if (seen.has(key)) continue;
      seen.add(key);
      components.push(component);
    }
  }
  return components;
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

function inspectFileStats(
  candidate: string,
  provider: DiagnosticFsProvider,
  code: string,
): StableFileRecord {
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
}

function inspectExistingFilesBatched(
  candidates: string[],
  provider: DiagnosticFsProvider,
  code: string,
): StableFileRecord[] {
  if (candidates.length === 0) return [];
  const components = uniqueComponents(candidates, provider, code);
  const attributesBefore = readSafeWindowsAttributes(
    components,
    provider,
    code,
  );
  const before = candidates.map((candidate) =>
    inspectFileStats(candidate, provider, code),
  );
  const after = candidates.map((candidate) =>
    inspectFileStats(candidate, provider, code),
  );
  const attributesAfter = readSafeWindowsAttributes(components, provider, code);
  exact(attributesAfter, attributesBefore, code);
  exact(after, before, code);
  return before;
}

function inspectExistingFile(
  candidate: string,
  provider: DiagnosticFsProvider,
  code: string,
): StableFileRecord {
  const records = inspectExistingFilesBatched([candidate], provider, code);
  if (records.length !== 1) fail(code);
  return records[0];
}

function parseDiagnosticPath(raw: string, platform: "win32" | "posix"): string {
  if (raw.length === 0 || unsafePathText.test(raw))
    fail("guten_tag_v11_typescript_diagnostic_path");
  const api = pathApi(platform);
  let value = raw;
  const drive = /^[a-zA-Z]:(.*)$/u.exec(value);
  if (drive !== null && !/^[\\/]/u.test(drive[1]))
    fail("guten_tag_v11_typescript_diagnostic_path");
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/u.exec(value);
  if (scheme !== null && drive === null) {
    if (scheme[1].toLowerCase() !== "file")
      fail("guten_tag_v11_typescript_diagnostic_path");
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return fail("guten_tag_v11_typescript_diagnostic_path");
    }
    if (
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== "" ||
      (url.hostname !== "" && url.hostname.toLowerCase() !== "localhost")
    )
      fail("guten_tag_v11_typescript_diagnostic_path");
    try {
      value = fileURLToPath(url.href);
    } catch {
      return fail("guten_tag_v11_typescript_diagnostic_path");
    }
  }
  const winAbsolute = path.win32.isAbsolute(value);
  const posixAbsolute = path.posix.isAbsolute(value);
  if (
    (platform === "win32" && posixAbsolute && !winAbsolute) ||
    (platform === "posix" && winAbsolute)
  )
    fail("guten_tag_v11_typescript_diagnostic_path");
  const normalized = value.replace(/[\\/]/gu, api.sep);
  const resolved = api.isAbsolute(normalized)
    ? api.normalize(normalized)
    : api.resolve(ROOT, normalized);
  if (!isContained(ROOT, resolved, platform))
    fail("guten_tag_v11_typescript_diagnostic_path");
  return resolved;
}

function snapshotTransactions(
  provider: DiagnosticFsProvider,
): TransactionIndex {
  const api = pathApi(provider.platform);
  const records: StableFileRecord[] = [];
  const byCanonical = new Map<string, StableFileRecord>();
  const byPhysical = new Map<string, StableFileRecord>();
  const targets: string[] = [];
  for (const relative of TRANSACTION_PATHS) {
    const target = api.resolve(ROOT, relative.replace(/[\\/]/gu, api.sep));
    if (provider.existsSync(target)) targets.push(target);
  }
  const batch = inspectExistingFilesBatched(
    targets,
    provider,
    "guten_tag_v11_typescript_transaction_alias",
  );
  for (const record of batch) {
    if (byCanonical.has(record.canonicalKey))
      fail("guten_tag_v11_typescript_transaction_duplicate_path");
    if (byPhysical.has(record.physicalKey))
      fail("guten_tag_v11_typescript_transaction_duplicate_identity");
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
    "guten_tag_v11_typescript_transaction_raced",
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
    "guten_tag_v11_typescript_diagnostic_alias",
  );
  const canonical = transactions.byCanonical.get(inspected.canonicalKey);
  const physical = transactions.byPhysical.get(inspected.physicalKey);
  if (canonical !== undefined && physical !== undefined) {
    if (canonical.path !== physical.path)
      fail("guten_tag_v11_typescript_identity_conflict");
    return true;
  }
  if (canonical !== undefined && physical === undefined)
    fail("guten_tag_v11_typescript_canonical_identity_raced");
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
    return fail("guten_tag_v11_typescript_log_utf8");
  }
  if (text.startsWith("\ufeff")) fail("guten_tag_v11_typescript_log_control");
  for (let index = 0; index < text.length; index += 1) {
    const code = text.codePointAt(index) as number;
    if (code > 0xffff) index += 1;
    if (code === 0x0d) {
      if (text.codePointAt(index + 1) !== 0x0a)
        fail("guten_tag_v11_typescript_log_control");
      continue;
    }
    if (code === 0x09 || code === 0x0a) continue;
    if (
      code < 0x20 ||
      (code >= 0x7f && code <= 0x9f) ||
      code === 0xfeff ||
      /\p{Cf}/u.test(String.fromCodePoint(code))
    )
      fail("guten_tag_v11_typescript_log_control");
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
    else fail("guten_tag_v11_typescript_ambiguous_diagnostic");
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
      "learning-v2-de-guten-tag-v11-native-reparse-reconciliation-manifest.v1",
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
      PATHS.lexicalV11,
      PATHS.task6V11,
      PATHS.inventoryV11,
      PATHS.module,
      PATHS.gate,
      PATHS.capture,
    ].map((relative) => ({ path: relative, sha256: sha(bytes(relative)) })),
    authority: CLOSED_AUTHORITY_V11,
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
    | "lexicalV11"
    | "task6V11"
    | "inventoryV11"
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
    "guten_tag_v11_typescript_schema",
  );
  if (run.executable !== "node" || run.cwdRelative !== ".")
    fail("guten_tag_v11_typescript_command");
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
  exact(run.argv, expectedArgv, "guten_tag_v11_typescript_command");
  exact(
    run.env,
    kind === "focused" ? {} : { NODE_OPTIONS: "--max-old-space-size=8192" },
    "guten_tag_v11_typescript_command",
  );
  const log = exactKeys(
    run.log,
    ["path", "sha256", "bytes"],
    "guten_tag_v11_typescript_schema",
  );
  const expectedPath =
    kind === "focused" ? PATHS.focusedLog : PATHS.repositoryLog;
  if (log.path !== expectedPath) fail("guten_tag_v11_typescript_log_path");
  const key = kind === "focused" ? "focusedLog" : "repositoryLog";
  const raw = readOverride(key, overrides);
  if (
    sha(raw) !== log.sha256 ||
    raw.length !== log.bytes ||
    !HASH.test(String(log.sha256))
  )
    fail("guten_tag_v11_typescript_log_integrity");
  const facts = analyzeTypeScriptLog(raw, provider);
  exact(run.diagnostics, facts, "guten_tag_v11_typescript_diagnostics");
  if (facts.transaction !== 0)
    fail("guten_tag_v11_typescript_transaction_diagnostic");
  if (kind === "focused") {
    if (run.exitCode !== 0 || run.outcome !== "PASS" || facts.total !== 0)
      fail("guten_tag_v11_typescript_focused");
  } else if (
    (run.exitCode === 0 && (run.outcome !== "PASS" || facts.total !== 0)) ||
    (run.exitCode !== 0 &&
      (run.outcome !== "BASELINE_DIAGNOSTICS_OUTSIDE_TRANSACTION" ||
        facts.total === 0))
  )
    fail("guten_tag_v11_typescript_repository");
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
    "guten_tag_v11_typescript_schema",
  );
  if (
    record.schemaVersion !==
      "learning-v2-de-guten-tag-v11-typescript-evidence.v1" ||
    record.status !== "PENDING_INDEPENDENT_REVIEW" ||
    record.provenance !== "LOCAL_CAPTURE_NOT_IMMUTABLE_EXTERNAL_RUNNER"
  )
    fail("guten_tag_v11_typescript_schema");
  exact(record.authority, CLOSED_AUTHORITY_V11, "guten_tag_v11_authority");
  exact(
    record.sourceSnapshot,
    sourceSnapshotRecord(),
    "guten_tag_v11_typescript_source_snapshot",
  );
  exact(
    record.transactionPaths,
    TRANSACTION_PATHS,
    "guten_tag_v11_typescript_transaction_paths",
  );
  validateRun(record.focusedRun, "focused", overrides, provider);
  validateRun(record.repositoryRun, "repository", overrides, provider);
}

export function receiptRecord(): RecordJson {
  const evidenceRecord = json(PATHS.typescriptEvidence);
  return {
    schemaVersion:
      "learning-v2-de-guten-tag-v11-native-reparse-reconciliation-receipt.v1",
    status: "PENDING_INDEPENDENT_REVIEW",
    provenance: "LOCAL_WORKTREE_NOT_IMMUTABLE_EXTERNAL_RUNNER",
    independentReview: "PENDING",
    adversarialReview: "PENDING",
    closure: "NOT_CREATED",
    authority: CLOSED_AUTHORITY_V11,
    inventory: {
      task5PlanIds: 288,
      resolvedPlanIds: 11,
      unresolvedPlanIds: 277,
      packetIds: 1792,
      materializedPackets: 0,
    },
    digests: DIGESTS,
    nativeReparseContract: {
      platform: "win32",
      unsafeAttributeMaskHex: "0x00441400",
      probeProtocol: "PHRASEMAN_ATTRS_V1",
      probeTiming: "BEFORE_AND_AFTER_BIGINT_IDENTITY_SNAPSHOTS",
    },
    residualRisk:
      "A sufficiently privileged local actor may still swap filesystem state between the attribute probe and the adjacent bigint identity operations; V11 reduces and detects ordinary races but does not claim an atomic kernel handle proof.",
    artifacts: [
      PATHS.lexicalV11,
      PATHS.task6V11,
      PATHS.inventoryV11,
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
    "# German Learning V2 — Guten Tag V11 native-reparse reconciliation",
    "",
    "Status: `PENDING_INDEPENDENT_REVIEW`.",
    "",
    "This local receipt records a V11 reconstruction from frozen V6 authority and direct lexical evidence only. The exact 11 V10 transaction bytes are hashed as REJECTED_NOT_AUTHORITY and are never parsed as constructive input. Windows reparse/offline/recall attributes are probed fail-closed before and after bigint identity snapshots; a sufficiently privileged swap between adjacent operations remains an explicitly documented residual risk. This receipt grants no Task 7, preauthoring, learner-facing, release, phrase, cutover, default-consumer, or owner authority.",
    "",
    "```json",
    machine,
    "```",
    "",
  ].join("\n");
}

function validateReceipt(raw: string): void {
  const matches = [...raw.matchAll(/```json\n([\s\S]*?)\n```/gu)];
  if (matches.length !== 1) fail("guten_tag_v11_receipt_machine_block");
  let parsed: unknown;
  try {
    parsed = JSON.parse(matches[0][1]);
  } catch {
    return fail("guten_tag_v11_receipt_machine_block");
  }
  exact(parsed, receiptRecord(), "guten_tag_v11_receipt_record");
  if (raw !== renderReceipt()) fail("guten_tag_v11_receipt_bytes");
  const prose = raw.replace(matches[0][0], "");
  if (/\b(?:PASS|CLOSED|APPROVED|AUTHORIZED)\b/u.test(prose))
    fail("guten_tag_v11_receipt_authority_word");
}

export function validateGutenTagV11(
  overrides: GateOverrides = {},
  provider: DiagnosticFsProvider = nativeDiagnosticFs,
): void {
  verifyFrozenBytes();
  evidence();
  const rejectedAbsolutePaths = new Set(
    Object.keys(REJECTED_AUDIT_HASHES).map((relative) =>
      path.resolve(abs(relative)),
    ),
  );
  for (const key of [
    "lexicalV11",
    "task6V11",
    "inventoryV11",
  ] as (keyof GateOverrides)[]) {
    const override = overrides[key];
    if (
      override !== undefined &&
      rejectedAbsolutePaths.has(path.resolve(override))
    )
      fail("guten_tag_v11_registry_path_binding");
  }
  exact(
    jsonOverride("lexicalV11", overrides),
    expectedLexicalV11(),
    "guten_tag_v11_lexical_body",
  );
  const lexicalRaw = readOverride("lexicalV11", overrides);
  const task6Raw = readOverride("task6V11", overrides);
  const inventoryRaw = readOverride("inventoryV11", overrides);
  if (sha(lexicalRaw) !== sha(bytes(PATHS.lexicalV11)))
    fail("guten_tag_v11_lexical_byte_binding");
  if (sha(task6Raw) !== sha(bytes(PATHS.task6V11)))
    fail("guten_tag_v11_task6_byte_binding");
  if (sha(inventoryRaw) !== sha(bytes(PATHS.inventoryV11)))
    fail("guten_tag_v11_inventory_byte_binding");
  exact(
    JSON.parse(task6Raw.toString("utf8")),
    expectedTask6V11(sha(lexicalRaw)),
    "guten_tag_v11_task6_body",
  );
  const inventory = JSON.parse(inventoryRaw.toString("utf8")) as RecordJson;
  exact(
    inventory,
    expectedInventoryV11(sha(task6Raw)),
    "guten_tag_v11_inventory_body",
  );
  verifyInventoryPartition(inventory);
  exact(
    jsonOverride("manifest", overrides),
    expectedManifest(),
    "guten_tag_v11_manifest",
  );
  const typescriptRaw = readOverride("typescriptEvidence", overrides);
  const typescriptRecord = JSON.parse(typescriptRaw.toString("utf8"));
  if (
    typescriptRaw.toString("utf8") !==
    renderTypeScriptEvidence(typescriptRecord)
  )
    fail("guten_tag_v11_typescript_evidence_bytes");
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
  writeJson(PATHS.lexicalV11, expectedLexicalV11());
}

export function materializeTask6(): void {
  writeJson(PATHS.task6V11, expectedTask6V11(sha(bytes(PATHS.lexicalV11))));
}

export function materializeInventory(): void {
  writeJson(
    PATHS.inventoryV11,
    expectedInventoryV11(sha(bytes(PATHS.task6V11))),
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
    else validateGutenTagV11();
    console.log("guten_tag_v11_native_reparse_reconciliation: PASS");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
