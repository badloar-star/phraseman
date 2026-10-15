import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { hashCanonicalBody } from "../../policies/decision_registry";

type JsonRecord = Record<string, any>;

export type GermanTask6cL01BriefkastenPositiveAdmissionOptionsDeV1 = Readonly<
  Partial<
    Record<
      | "task5V3PathForTest"
      | "rawPathForTest"
      | "metadataPathForTest"
      | "sourceExtractionPathForTest"
      | "sourceHoldManifestPathForTest"
      | "canonicalHoldManifestPathForTest"
      | "lexicalV2PathForTest"
      | "task6V2PathForTest"
      | "inventoryV2PathForTest"
      | "lexicalV3PathForTest"
      | "task6V3PathForTest"
      | "inventoryV3PathForTest"
      | "lexicalV4PathForTest"
      | "task6V4PathForTest"
      | "inventoryV4PathForTest"
      | "lexicalV5PathForTest"
      | "task6V5PathForTest"
      | "inventoryV5PathForTest"
      | "v5ClosurePathForTest"
      | "defaultConsumerPathForTest"
      | "evidencePathForTest"
      | "lexicalV6PathForTest"
      | "task6V6PathForTest"
      | "inventoryV6PathForTest"
      | "manifestPathForTest"
      | "receiptPathForTest",
      string
    >
  >
>;

export type GermanTask6cL01BriefkastenPositiveAdmissionResultDeV1 = Readonly<{
  status: "PASS";
  decision: "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION";
  admissionScope: "EXACT_BRIEFKASTEN_RESIDENTIAL_MAILBOX_NOUN_ONLY";
  sourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1";
  canonicalSenseId: "de_lex_l01_c03_briefkasten_v1";
  checkpointPacketId: "de_l01_c03_s24";
  firstIntroductionPacketId: null;
  phraseAuthority: false;
  resolvedPlanIds: 10;
  unresolvedPlanIds: 278;
  packetIds: 1792;
  materializedPackets: 0;
  task7Unlock: false;
  preauthoringAuthority: false;
  learnerFacing: false;
  releaseAuthorized: false;
  consumerCutover: "NONE";
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const PATHS = Object.freeze({
  task5V3: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json",
  raw: "modules/learning-v2/curriculum/de/evidence/task6c_l01_six_noun_admission_v1/raw/de_lex_plan_l01_c03_briefkasten_v1.html",
  metadata:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_source_hold_v1/raw/dwds_briefkasten.http_metadata.txt",
  sourceExtraction:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_source_hold_v1/extraction_map.json",
  sourceHoldManifest:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_source_hold_v1/manifest.json",
  canonicalHoldManifest:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_canonical_admission_hold_v1/manifest.json",
  lexicalV2:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v2.json",
  task6V2:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v2.json",
  inventoryV2:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
  lexicalV3:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v3.json",
  task6V3:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v3.json",
  inventoryV3:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v3.json",
  lexicalV4:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v4.json",
  task6V4:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v4.json",
  inventoryV4:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v4.json",
  lexicalV5:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v5.json",
  task6V5:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v5.json",
  inventoryV5:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v5.json",
  v5Closure:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_ich_heisse_final_review_closure_v1/closure.json",
  defaultConsumer:
    "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
  evidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_positive_admission_v1/lexical_evidence.json",
  lexicalV6:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v6.json",
  task6V6:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v6.json",
  inventoryV6:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v6.json",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_briefkasten_positive_admission_v1/manifest.json",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_BRIEFKASTEN_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
} as const);

const HASHES = Object.freeze({
  [PATHS.task5V3]:
    "5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe",
  [PATHS.raw]:
    "d6e63ca2942fb05841e2a89cd30a3c335228dc4d6ba296e4d010e9515bd18342",
  [PATHS.metadata]:
    "b9314f5e8b3f0b8c884b617ef967b531f06d80fdd8b83c07f89cb172706dfb50",
  [PATHS.sourceExtraction]:
    "f97ccbd4f4e95f0361f7fb607cae2f60c2cb4bdac18b89ec9fe34d3568e3cc89",
  [PATHS.sourceHoldManifest]:
    "1e8b97c051384f05d02675bc05de4d3c2c6bc27101bc4e07c951b4671de35d69",
  [PATHS.canonicalHoldManifest]:
    "d2e8906a0fbcb135bad438fdfc1b52ca836e5b5e382838492a415d506d235d38",
  [PATHS.lexicalV2]:
    "31934e35b5278c7a7e901d08e02da5398f3503825782acbb604d06de094726a5",
  [PATHS.task6V2]:
    "ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f",
  [PATHS.inventoryV2]:
    "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415",
  [PATHS.lexicalV3]:
    "475caad2f4a56a576301836c2bb4590061dd4536cd40553b1638ce605bfdbcbb",
  [PATHS.task6V3]:
    "8f54a19fcaad578a374c06e3a4ecf5504ab761b1790a296056334aa35bf36862",
  [PATHS.inventoryV3]:
    "702a491699774d2f0cc90c19755bc8747a0b1663ddd2e94f272b68d40ddc1d88",
  [PATHS.lexicalV4]:
    "aa08ccd483fb2bebb43a3f2388940a5672708cc70b29e41dfb05e0d4a39bd120",
  [PATHS.task6V4]:
    "65db4d567150c654c90c14d667811c8682136db753c602d12ed0f8b0808ee1c4",
  [PATHS.inventoryV4]:
    "3abf18ea54a4b84f0386a75788b86f6e0c693b7f54819284c8f44237a407d4b6",
  [PATHS.lexicalV5]:
    "4ed741cc0e457eff0c3500f98e6c8d62a33a951110d428ff1333075eca99a2c7",
  [PATHS.task6V5]:
    "9bbf41335e13dff8f97be3bbd05f21284c99e62c31d5fcb63f7b5f0ab324af91",
  [PATHS.inventoryV5]:
    "e1c01fa8ef727c23d128d07bbe5cf67f7c04c6539610817ba39b6e0b555fb3b4",
  [PATHS.v5Closure]:
    "c592bf535b160a846b5e2ddade1491d1aa5c4866d8083d007ab1abfe60641c4b",
  [PATHS.defaultConsumer]:
    "e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59",
  [PATHS.evidence]:
    "bf298f3e6441b615772ff43efb6ec05252aa07fa772a2d15bb2f330ee523ef12",
  [PATHS.lexicalV6]:
    "3d45077cba6f20e826ce3fa04732a91fec15d571ac9a0cb54923c8ec84c66e55",
  [PATHS.task6V6]:
    "63d65319b2f41dc6cb08e8e4e407fbf4a6ca71c061229da64a886c62ba9403bc",
  [PATHS.inventoryV6]:
    "e940b37e2ea29e479710dada185c8bc1466bb04b61176c8c839432eeaf392677",
  [PATHS.manifest]:
    "766022b62d091c6c023d310477969d9e09d7eacd62e6b89af2448fbfe878d8f1",
});

const OPTION_KEYS = new Set([
  "task5V3PathForTest",
  "rawPathForTest",
  "metadataPathForTest",
  "sourceExtractionPathForTest",
  "sourceHoldManifestPathForTest",
  "canonicalHoldManifestPathForTest",
  "lexicalV2PathForTest",
  "task6V2PathForTest",
  "inventoryV2PathForTest",
  "lexicalV3PathForTest",
  "task6V3PathForTest",
  "inventoryV3PathForTest",
  "lexicalV4PathForTest",
  "task6V4PathForTest",
  "inventoryV4PathForTest",
  "lexicalV5PathForTest",
  "task6V5PathForTest",
  "inventoryV5PathForTest",
  "v5ClosurePathForTest",
  "defaultConsumerPathForTest",
  "evidencePathForTest",
  "lexicalV6PathForTest",
  "task6V6PathForTest",
  "inventoryV6PathForTest",
  "manifestPathForTest",
  "receiptPathForTest",
]);

function fail(code: string): never {
  throw new Error(code);
}

function sha256(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function exact(value: unknown, expected: unknown, code: string): void {
  if (JSON.stringify(value) !== JSON.stringify(expected)) fail(code);
}

function exactKeys(
  value: JsonRecord,
  keys: readonly string[],
  code: string,
): void {
  exact(Object.keys(value).sort(), [...keys].sort(), code);
}

function parseJson(bytes: Buffer, code: string): any {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    return fail(code);
  }
}

function readBytes(candidate: string | undefined, relative: string): Buffer {
  return fs.readFileSync(candidate ?? path.join(ROOT, relative));
}

function readPinned(
  candidate: string | undefined,
  relative: keyof typeof HASHES,
): Buffer {
  const bytes = readBytes(candidate, relative);
  if (sha256(bytes) !== HASHES[relative])
    fail("briefkasten_positive_predecessor_drift");
  return bytes;
}

function verifyArtifact(bytes: Buffer, relative: keyof typeof HASHES): void {
  if (sha256(bytes) !== HASHES[relative])
    fail("briefkasten_positive_artifact_drift");
}

function allPlans(task5: JsonRecord): JsonRecord[] {
  return task5.lessons.flatMap((lesson: JsonRecord) =>
    lesson.chapters.flatMap(
      (chapter: JsonRecord) => chapter.checkpoint.plannedNewLexicalSenses,
    ),
  );
}

function allPacketIds(task5: JsonRecord): string[] {
  return task5.lessons.flatMap((lesson: JsonRecord) =>
    lesson.chapters.flatMap((chapter: JsonRecord) => chapter.packetIds),
  );
}

function validateTask5(task5: JsonRecord): void {
  if (
    task5.schemaVersion !== "learning-v2-german-chapter-blueprints.v3" ||
    allPlans(task5).length !== 288
  )
    fail("briefkasten_positive_task5_plan");
  exact(
    allPlans(task5).filter(
      (row) => row.id === "de_lex_plan_l01_c03_briefkasten_v1",
    ),
    [
      {
        id: "de_lex_plan_l01_c03_briefkasten_v1",
        semanticIdentity: "briefkasten|mailbox at a residence",
        lemmaOrExpression: "Briefkasten",
        partOfSpeech: "noun",
        lexicalKind: "NOUN_LEXEME",
        nounPackage: {
          article: "der",
          singular: "Briefkasten",
          plural: "Briefkästen",
        },
        nounPackageIdentity: "der|briefkasten|briefkasten",
        verbPackage: null,
        lemmaStatus: "FIRST_MEANING",
        contrastsWithSenseId: null,
        contrastEvidence: null,
        chapterOutcomeId: "de_l01_ch03",
        utilityProof: {
          chapterOutcomeId: "de_l01_ch03",
          checkpointPacketId: "de_l01_c03_s24",
          integratedConstructIds: [
            "de_gc_pre_a1_formulaic_chunks_v1",
            "de_gc_personal_reference_v1",
          ],
          utilityRole: "scene_grounding",
          situationFacet: "setting",
          facetValue: "postbox-area",
          necessityClass: "SCENE_UNGROUNDED",
          plannedUsePacketIds: ["de_l01_c03_s24"],
        },
        senseGloss: "mailbox at a residence",
        communicativeUse: "ground an introduction at a mailbox area",
      },
    ],
    "briefkasten_positive_task5_plan",
  );
}

function validateSource(
  extraction: JsonRecord,
  sourceHold: JsonRecord,
  canonicalHold: JsonRecord,
): void {
  exact(
    extraction.extractions,
    {
      sourceHeadword: "Briefkasten",
      sourcePartOfSpeech: "Substantiv (Maskulinum)",
      article: "der",
      singular: "Briefkasten",
      nominativePlural: "Briefkästen",
      senseAnchor: "d-1-2",
      sourceCoreGerman:
        "Kasten, der an der Haustür angebracht ist und in den von der Post die Sendungen für die einzelnen Empfänger eingeworfen werden",
    },
    "briefkasten_positive_source_binding",
  );
  if (
    sourceHold.status !== "HOLD" ||
    sourceHold.authority?.canonicalAdmission !== false ||
    sourceHold.task5V2?.sourcePlanId !== "de_lex_plan_l01_c03_briefkasten_v1" ||
    sourceHold.fieldSupport?.supportedClaims?.residenceMailboxSense !==
      "DWDS_D_1_2_HAUSTUER_POST_SENDUNGEN" ||
    canonicalHold.status !== "HOLD" ||
    canonicalHold.fieldAuthority?.senseAnchor?.value !== "d-1-2" ||
    canonicalHold.authority?.canonicalAdmission !== false
  ) {
    fail("briefkasten_positive_source_binding");
  }
}

function validateEvidence(value: JsonRecord): void {
  if ("examples" in value) fail("briefkasten_positive_phrase_forbidden");
  exactKeys(
    value,
    [
      "schemaVersion",
      "admissionScope",
      "sourcePlanId",
      "canonicalSenseId",
      "evidenceId",
      "lemma",
      "sourcePartOfSpeech",
      "sourceSenseAnchor",
      "rejectedSourceSenseAnchor",
      "senseGloss",
      "curriculumPartOfSpeech",
      "partOfSpeechInterpretation",
      "nounPackage",
      "utilityRole",
      "communicativeUse",
      "sourceRegisterMarkers",
      "register",
      "region",
      "productionPolicy",
      "phraseAuthority",
      "examplesAuthority",
      "packetAllocation",
      "sourceSupport",
      "authority",
    ],
    "briefkasten_positive_evidence_scope",
  );
  if (
    value.schemaVersion !== "learning-v2-german-lexical-item-evidence.v5" ||
    value.admissionScope !==
      "EXACT_BRIEFKASTEN_RESIDENTIAL_MAILBOX_NOUN_ONLY" ||
    value.sourcePlanId !== "de_lex_plan_l01_c03_briefkasten_v1" ||
    value.canonicalSenseId !== "de_lex_l01_c03_briefkasten_v1" ||
    value.evidenceId !== "DE-LEX-ITEM-L01-C03-BRIEFKASTEN-SENSE-FORM-001" ||
    value.lemma !== "Briefkasten" ||
    value.sourcePartOfSpeech !== "Substantiv (Maskulinum)" ||
    value.curriculumPartOfSpeech !== "noun" ||
    value.utilityRole !== "scene_grounding" ||
    value.communicativeUse !== "ground an introduction at a mailbox area"
  )
    fail("briefkasten_positive_evidence_scope");
  if (
    value.sourceSenseAnchor !== "d-1-2" ||
    value.rejectedSourceSenseAnchor !== "d-1-1" ||
    value.senseGloss !== "mailbox at a residence"
  )
    fail("briefkasten_positive_sense");
  exact(
    value.nounPackage,
    {
      article: "der",
      singular: "Briefkasten",
      nominativePlural: "Briefkästen",
      broaderMorphologyAuthority: false,
    },
    "briefkasten_positive_morphology",
  );
  if (
    value.sourceRegisterMarkers !== null ||
    value.register !== null ||
    value.region !== null
  )
    fail("briefkasten_positive_register");
  if (
    value.productionPolicy !== "NOT_AUTHORIZED_BY_THIS_ADMISSION" ||
    value.phraseAuthority !== false ||
    value.examplesAuthority !== false
  )
    fail("briefkasten_positive_evidence_scope");
  exact(
    value.packetAllocation,
    {
      plannedUsePacketIds: ["de_l01_c03_s24"],
      checkpointPacketId: "de_l01_c03_s24",
      firstIntroductionPacketId: null,
      firstScoredUsePacketId: null,
    },
    "briefkasten_positive_plan_sense_mapping",
  );
  exact(
    value.authority,
    {
      task7Unlock: false,
      preauthoringAuthority: false,
      learnerFacing: false,
      releaseAuthorized: false,
      currentlyMaterializable: false,
      phraseAuthority: false,
      defaultConsumerChanged: false,
      consumerCutover: "NONE",
      ownerApproval: "NOT_REQUESTED_NOT_GRANTED",
      materializedPackets: 0,
    },
    "briefkasten_positive_authority_boundary",
  );
}

function validateLexicalV6(
  value: unknown,
  lexicalV5: JsonRecord[],
): JsonRecord[] {
  if (!Array.isArray(value) || value.length !== 10)
    fail("briefkasten_positive_lexical_scope");
  exact(
    value.filter((row) => row.id !== "de_lex_l01_c03_briefkasten_v1"),
    lexicalV5,
    "briefkasten_positive_predecessor_drift",
  );
  exact(
    value.filter((row) => row.id === "de_lex_l01_c03_briefkasten_v1"),
    [
      {
        id: "de_lex_l01_c03_briefkasten_v1",
        lemma: "Briefkasten",
        senseGloss: "mailbox at a residence",
        partOfSpeech: "noun",
        sourcePartOfSpeech: "Substantiv (Maskulinum)",
        sourceSenseAnchor: "d-1-2",
        rejectedSourceSenseAnchor: "d-1-1",
        partOfSpeechInterpretation:
          "SOURCE_GROUNDED_MASCULINE_SUBSTANTIV_TO_NOUN",
        sourceRegisterMarkers: null,
        register: null,
        nounGender: "der",
        nounPlural: "Briefkästen",
        verbValency: null,
        verbFrame: null,
        verbSeparability: null,
        verbAuxiliary: null,
        productionPolicy: "NOT_AUTHORIZED_BY_THIS_ADMISSION",
        region: null,
        evidenceIds: ["DE-LEX-ITEM-L01-C03-BRIEFKASTEN-SENSE-FORM-001"],
      },
    ],
    "briefkasten_positive_lexical_scope",
  );
  return value;
}

function validateTask6V6(
  value: JsonRecord,
  task6V5: JsonRecord,
  lexicalV6: JsonRecord[],
): void {
  if (value.schemaVersion !== "learning-v2-german-task6-canonical-registry.v6")
    fail("briefkasten_positive_task6_authority");
  exact(
    value.authority,
    {
      status: "TASK6_V6_CANONICAL_PARTIAL",
      upstreamCandidateCanonicalAdmission:
        "ADMITTED_EXACT_HALLO_TSCHUESS_ICH_HEISSE_AND_BRIEFKASTEN_SENSES_ONLY",
      phaseBMaterialization: "ADMITTED_FOR_TASK6_V6_REGISTRY_ONLY",
      rowsMaterialized: 10,
      newRowsMaterialized: 8,
      legacyRowsPreserved: 2,
      rowsPromoted: 4,
      task7Status: "TASK7_HOLD_GLOBAL_ALLOCATION_INCOMPLETE",
      task7Unlock: false,
      preauthoringAuthority: false,
      learnerFacing: false,
      phraseClaims: "HALLO_EXACT_ONLY",
      releaseAuthorized: false,
      currentlyMaterializable: false,
      materializedPackets: 0,
      consumerCutover: "NONE",
      defaultConsumerChanged: false,
      ownerApproval: "NOT_REQUESTED_NOT_GRANTED",
    },
    "briefkasten_positive_authority_boundary",
  );
  const { l01BriefkastenLexicalMapping, ...priorMaterialization } =
    value.materialization;
  exact(
    priorMaterialization,
    task6V5.materialization,
    "briefkasten_positive_predecessor_drift",
  );
  exact(
    l01BriefkastenLexicalMapping,
    {
      sourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1",
      canonicalLexicalSenseId: "de_lex_l01_c03_briefkasten_v1",
      evidenceId: "DE-LEX-ITEM-L01-C03-BRIEFKASTEN-SENSE-FORM-001",
      materializationRole:
        "TASK6_V6_CANONICAL_POSITIVE_ADMISSION_EXACT_RESIDENTIAL_MAILBOX_NOUN_ONLY",
      phraseAuthority: false,
    },
    "briefkasten_positive_materialization",
  );
  exact(
    value.registry.lexicalSenses,
    lexicalV6,
    "briefkasten_positive_lexical_scope",
  );
  exact(
    value.registry.phraseFrames,
    task6V5.registry.phraseFrames,
    "briefkasten_positive_phrase_forbidden",
  );
  exact(
    value.registry.pronunciationTargets,
    task6V5.registry.pronunciationTargets,
    "briefkasten_positive_predecessor_drift",
  );
  if (
    value.registry.phraseFrames.some(
      (row: JsonRecord) =>
        /Briefkasten/u.test(String(row.frame)) ||
        row.lexicalSenseIds?.includes("de_lex_l01_c03_briefkasten_v1"),
    )
  )
    fail("briefkasten_positive_phrase_forbidden");
  const mappings = value.authorityContext.lexicalMappings as JsonRecord[];
  exact(
    mappings.filter(
      (row) => row.sourcePlanId === "de_lex_plan_l01_c03_briefkasten_v1",
    ),
    [
      {
        sourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1",
        canonicalId: "de_lex_l01_c03_briefkasten_v1",
        plannedUsePacketIds: ["de_l01_c03_s24"],
        checkpointPacketId: "de_l01_c03_s24",
        firstIntroductionPacketId: null,
      },
    ],
    "briefkasten_positive_plan_sense_mapping",
  );
  exact(
    mappings.filter(
      (row) => row.sourcePlanId !== "de_lex_plan_l01_c03_briefkasten_v1",
    ),
    task6V5.authorityContext.lexicalMappings,
    "briefkasten_positive_predecessor_drift",
  );
  const {
    schemaVersion,
    lexicalMappings: _maps,
    ...otherContext
  } = value.authorityContext;
  const {
    schemaVersion: _priorSchema,
    lexicalMappings: _priorMaps,
    ...priorContext
  } = task6V5.authorityContext;
  if (schemaVersion !== "learning-v2-german-task6-registry-authority.v6")
    fail("briefkasten_positive_task6_authority");
  exact(otherContext, priorContext, "briefkasten_positive_phrase_forbidden");
}

function validateInventoryV6(
  value: JsonRecord,
  inventoryV5: JsonRecord,
  task5: JsonRecord,
): void {
  if (
    value.schemaVersion !==
      "learning-v2-german-task7-allocation-inventory.v6" ||
    value.status !== "BRIEFKASTEN_LEXICAL_SENSE_CANONICAL_ADMITTED_PARTIAL"
  )
    fail("briefkasten_positive_inventory");
  exact(
    value.authority,
    {
      classification: "PARTIAL_INVENTORY_ONLY",
      fullAllocationAuthority: false,
      preauthoringAuthority: false,
      ownerApproval: "NOT_REQUESTED_NOT_GRANTED",
      consumerCutover: "NONE",
      task7Unlock: false,
      learnerFacing: false,
      releaseAuthorized: false,
      phraseAuthority: false,
      defaultConsumerChanged: false,
    },
    "briefkasten_positive_authority_boundary",
  );
  if (value.sequence?.currentlyMaterializable !== false)
    fail("briefkasten_positive_authority_boundary");
  exact(
    value.counts,
    {
      task5PlanIds: 288,
      resolvedPlanIds: 10,
      unresolvedPlanIds: 278,
      packetIds: 1792,
      materializedPackets: 0,
    },
    "briefkasten_positive_inventory",
  );
  exact(
    value.resolutions.filter(
      (row: JsonRecord) =>
        row.sourcePlanId === "de_lex_plan_l01_c03_briefkasten_v1",
    ),
    [
      {
        sourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1",
        checkpointPacketId: "de_l01_c03_s24",
        canonicalSenseId: "de_lex_l01_c03_briefkasten_v1",
        firstIntroductionPacketId: null,
      },
    ],
    "briefkasten_positive_inventory",
  );
  exact(
    value.resolutions.filter(
      (row: JsonRecord) =>
        row.sourcePlanId !== "de_lex_plan_l01_c03_briefkasten_v1",
    ),
    inventoryV5.resolutions,
    "briefkasten_positive_predecessor_drift",
  );
  const plans = allPlans(task5).map((row) => row.id);
  const resolved = value.resolutions.map((row: JsonRecord) => row.sourcePlanId);
  const resolvedSet = new Set(resolved);
  const unresolved = plans.filter((id) => !resolvedSet.has(id));
  const packets = allPacketIds(task5);
  exact(
    value.inventoryDigests,
    {
      task5PlanIdsCanonicalSha256: hashCanonicalBody(plans),
      resolvedPlanIdsCanonicalSha256: hashCanonicalBody(resolved),
      unresolvedPlanIdsCanonicalSha256: hashCanonicalBody(unresolved),
      packetIdsCanonicalSha256: hashCanonicalBody(packets),
    },
    "briefkasten_positive_inventory_digest",
  );
  if (
    resolved.length !== 10 ||
    unresolved.length !== 278 ||
    packets.length !== 1792 ||
    value.sequence.eligibilityKind !==
      "NEXT_ORDERED_SESSION_AFTER_REMAINING_278_ALLOCATIONS_AND_SEPARATE_TASK7_UNLOCK" ||
    !Array.isArray(value.materializedPacketPaths) ||
    value.materializedPacketPaths.length !== 0
  )
    fail("briefkasten_positive_inventory");
}

function validateManifest(value: JsonRecord): void {
  if (
    value.schemaVersion !==
      "learning-v2-de-task6c-l01-briefkasten-positive-admission.v1" ||
    value.status !== "PASS" ||
    value.decision !== "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION"
  )
    fail("briefkasten_positive_manifest");
  exact(
    value.scope,
    {
      admissionScope: "EXACT_BRIEFKASTEN_RESIDENTIAL_MAILBOX_NOUN_ONLY",
      sourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1",
      canonicalSenseId: "de_lex_l01_c03_briefkasten_v1",
      checkpointPacketId: "de_l01_c03_s24",
      firstIntroductionPacketId: null,
    },
    "briefkasten_positive_manifest",
  );
  exact(
    value.allocation,
    {
      plannedUsePacketIds: ["de_l01_c03_s24"],
      checkpointPacketId: "de_l01_c03_s24",
      firstIntroductionPacketId: null,
      firstScoredUsePacketId: null,
      resolvedPlanIds: 10,
      unresolvedPlanIds: 278,
      packetIds: 1792,
      materializedPackets: 0,
    },
    "briefkasten_positive_manifest",
  );
  exact(
    value.phraseBoundary,
    {
      phraseAdmission: false,
      phraseFrameModified: false,
      lexicalSenseLinkAdded: false,
      examplesAuthority: false,
      phraseClaims: "HALLO_EXACT_ONLY",
    },
    "briefkasten_positive_phrase_forbidden",
  );
  exact(
    value.authority,
    {
      canonicalAdmission: true,
      admissionScope: "EXACT_BRIEFKASTEN_RESIDENTIAL_MAILBOX_NOUN_ONLY",
      phraseAuthority: false,
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
    "briefkasten_positive_authority_boundary",
  );
  if (value.sourceBindings?.defaultConsumer?.v6Selected !== false)
    fail("briefkasten_positive_authority_boundary");
  for (const [name, relative] of [
    ["lexicalEvidence", PATHS.evidence],
    ["lexicalRegistryV6", PATHS.lexicalV6],
    ["task6V6", PATHS.task6V6],
    ["inventoryV6", PATHS.inventoryV6],
  ] as const) {
    exact(
      value.artifactBindings?.[name],
      { path: relative, sha256: HASHES[relative] },
      "briefkasten_positive_manifest",
    );
  }
  exact(
    value.sourceBindings?.englishSurface,
    {
      roots: [
        "modules/learning-v2/curriculum/en",
        "content/learning-v2-course/curriculum/en",
        "content/learning-v2-course/release/en",
        "modules/learning-v2/content/factory_native/generated_release/en",
      ],
      fileCount: 1570,
      sha256:
        "33c6dfd1201dfa9e2719eda7b4845a4591fdb2acd7b0cc059f89e1297e2b9f95",
    },
    "briefkasten_positive_manifest",
  );
}

function receiptField(receipt: string, label: string, expected: string): void {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const matches = [
    ...receipt.matchAll(new RegExp("^" + escaped + ": `([^`]+)`\\.?$", "gmu")),
  ];
  if (matches.length !== 1 || matches[0][1] !== expected)
    fail("briefkasten_positive_receipt_boundary");
}

function validateReceipt(receipt: string): void {
  for (const [label, expected] of [
    ["Independent review status", "PENDING"],
    ["Phrase authority", "false"],
    ["Task 7 unlock", "false"],
    ["Preauthoring authority", "false"],
    ["Learner-facing authority", "false"],
    ["Release authorization", "false"],
    ["Currently materializable", "false"],
    ["Materialized packets", "0"],
    ["Consumer cutover", "NONE"],
    ["Default consumer changed", "false"],
    ["Owner approval", "NOT_REQUESTED_NOT_GRANTED"],
    ["Production policy", "NOT_AUTHORIZED_BY_THIS_ADMISSION"],
  ] as const)
    receiptField(receipt, label, expected);
  const matches = [
    ...receipt.matchAll(
      /<!-- TYPESCRIPT_REVIEWED_RUN_JSON\n(\{[^\n]+\})\n-->/gu,
    ),
  ];
  if (matches.length !== 1) fail("briefkasten_positive_receipt_typescript");
  let evidence: unknown;
  try {
    evidence = JSON.parse(matches[0][1]);
  } catch {
    return fail("briefkasten_positive_receipt_typescript");
  }
  exact(
    evidence,
    {
      command:
        "node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false",
      exitCode: 2,
      diagnostics: 16,
      transactionPathCount: 8,
      transactionDiagnostics: 0,
      repositoryGreen: false,
      logPath: "C:\\Temp\\phraseman_briefkasten_v6_tsc_20261013.log",
    },
    "briefkasten_positive_receipt_typescript",
  );
  if (
    !receipt.includes(
      "Observed reviewed-run exit: `2`; diagnostics: `16`; diagnostics in the eight transaction\npaths: `0`.",
    ) ||
    !receipt.includes(
      "The repository-wide\nTypeScript build is not claimed green.",
    )
  )
    fail("briefkasten_positive_receipt_typescript");
}

export function inspectGermanTask6cL01BriefkastenPositiveAdmissionDeV1(
  options: GermanTask6cL01BriefkastenPositiveAdmissionOptionsDeV1 = {},
): GermanTask6cL01BriefkastenPositiveAdmissionResultDeV1 {
  if (Object.keys(options).some((key) => !OPTION_KEYS.has(key)))
    fail("briefkasten_positive_options");

  const predecessorOptions = [
    ["task5V3PathForTest", PATHS.task5V3],
    ["rawPathForTest", PATHS.raw],
    ["metadataPathForTest", PATHS.metadata],
    ["sourceExtractionPathForTest", PATHS.sourceExtraction],
    ["sourceHoldManifestPathForTest", PATHS.sourceHoldManifest],
    ["canonicalHoldManifestPathForTest", PATHS.canonicalHoldManifest],
    ["lexicalV2PathForTest", PATHS.lexicalV2],
    ["task6V2PathForTest", PATHS.task6V2],
    ["inventoryV2PathForTest", PATHS.inventoryV2],
    ["lexicalV3PathForTest", PATHS.lexicalV3],
    ["task6V3PathForTest", PATHS.task6V3],
    ["inventoryV3PathForTest", PATHS.inventoryV3],
    ["lexicalV4PathForTest", PATHS.lexicalV4],
    ["task6V4PathForTest", PATHS.task6V4],
    ["inventoryV4PathForTest", PATHS.inventoryV4],
    ["lexicalV5PathForTest", PATHS.lexicalV5],
    ["task6V5PathForTest", PATHS.task6V5],
    ["inventoryV5PathForTest", PATHS.inventoryV5],
    ["v5ClosurePathForTest", PATHS.v5Closure],
    ["defaultConsumerPathForTest", PATHS.defaultConsumer],
  ] as const;
  const predecessors = Object.fromEntries(
    predecessorOptions.map(([option, relative]) => [
      relative,
      readPinned(options[option], relative),
    ]),
  );
  const task5 = parseJson(
    predecessors[PATHS.task5V3],
    "briefkasten_positive_task5_json",
  );
  validateTask5(task5);
  validateSource(
    parseJson(
      predecessors[PATHS.sourceExtraction],
      "briefkasten_positive_source_json",
    ),
    parseJson(
      predecessors[PATHS.sourceHoldManifest],
      "briefkasten_positive_source_json",
    ),
    parseJson(
      predecessors[PATHS.canonicalHoldManifest],
      "briefkasten_positive_source_json",
    ),
  );
  const lexicalV5 = parseJson(
    predecessors[PATHS.lexicalV5],
    "briefkasten_positive_predecessor_json",
  );
  const task6V5 = parseJson(
    predecessors[PATHS.task6V5],
    "briefkasten_positive_predecessor_json",
  );
  const inventoryV5 = parseJson(
    predecessors[PATHS.inventoryV5],
    "briefkasten_positive_predecessor_json",
  );
  if (
    !Array.isArray(lexicalV5) ||
    lexicalV5.length !== 9 ||
    task6V5.schemaVersion !==
      "learning-v2-german-task6-canonical-registry.v5" ||
    inventoryV5.schemaVersion !==
      "learning-v2-german-task7-allocation-inventory.v5"
  )
    fail("briefkasten_positive_predecessor_schema");

  const evidenceBytes = readBytes(options.evidencePathForTest, PATHS.evidence);
  validateEvidence(
    parseJson(evidenceBytes, "briefkasten_positive_evidence_json"),
  );
  verifyArtifact(evidenceBytes, PATHS.evidence);
  const lexicalBytes = readBytes(options.lexicalV6PathForTest, PATHS.lexicalV6);
  const lexicalV6 = validateLexicalV6(
    parseJson(lexicalBytes, "briefkasten_positive_lexical_json"),
    lexicalV5,
  );
  verifyArtifact(lexicalBytes, PATHS.lexicalV6);
  const task6Bytes = readBytes(options.task6V6PathForTest, PATHS.task6V6);
  validateTask6V6(
    parseJson(task6Bytes, "briefkasten_positive_task6_json"),
    task6V5,
    lexicalV6,
  );
  verifyArtifact(task6Bytes, PATHS.task6V6);
  const inventoryBytes = readBytes(
    options.inventoryV6PathForTest,
    PATHS.inventoryV6,
  );
  validateInventoryV6(
    parseJson(inventoryBytes, "briefkasten_positive_inventory_json"),
    inventoryV5,
    task5,
  );
  verifyArtifact(inventoryBytes, PATHS.inventoryV6);
  const manifestBytes = readBytes(options.manifestPathForTest, PATHS.manifest);
  validateManifest(
    parseJson(manifestBytes, "briefkasten_positive_manifest_json"),
  );
  verifyArtifact(manifestBytes, PATHS.manifest);
  validateReceipt(
    readBytes(options.receiptPathForTest, PATHS.receipt).toString("utf8"),
  );

  return Object.freeze({
    status: "PASS",
    decision: "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION",
    admissionScope: "EXACT_BRIEFKASTEN_RESIDENTIAL_MAILBOX_NOUN_ONLY",
    sourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1",
    canonicalSenseId: "de_lex_l01_c03_briefkasten_v1",
    checkpointPacketId: "de_l01_c03_s24",
    firstIntroductionPacketId: null,
    phraseAuthority: false,
    resolvedPlanIds: 10,
    unresolvedPlanIds: 278,
    packetIds: 1792,
    materializedPackets: 0,
    task7Unlock: false,
    preauthoringAuthority: false,
    learnerFacing: false,
    releaseAuthorized: false,
    consumerCutover: "NONE",
  });
}
