import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { hashCanonicalBody } from "../../policies/decision_registry";

type JsonRecord = Record<string, any>;

export type GermanTask6cL01IchHeissePositiveAdmissionOptionsDeV1 = Readonly<{
  task5V2PathForTest?: string;
  task5V3PathForTest?: string;
  lexicalV2PathForTest?: string;
  task6V2PathForTest?: string;
  inventoryV2PathForTest?: string;
  lexicalV3PathForTest?: string;
  task6V3PathForTest?: string;
  inventoryV3PathForTest?: string;
  lexicalV4PathForTest?: string;
  task6V4PathForTest?: string;
  inventoryV4PathForTest?: string;
  sourceHoldManifestPathForTest?: string;
  sourceExtractionPathForTest?: string;
  dwdsRawPathForTest?: string;
  formulaicManifestPathForTest?: string;
  formulaicExtractionPathForTest?: string;
  goetheRawPathForTest?: string;
  defaultConsumerPathForTest?: string;
  evidencePathForTest?: string;
  lexicalV5PathForTest?: string;
  task6V5PathForTest?: string;
  inventoryV5PathForTest?: string;
  manifestPathForTest?: string;
  receiptPathForTest?: string;
}>;

export type GermanTask6cL01IchHeissePositiveAdmissionResultDeV1 = Readonly<{
  status: "PASS";
  decision: "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION";
  admissionScope: "EXACT_ICH_HEISSE_FIXED_EXPRESSION_ONLY";
  sourcePlanId: "de_lex_plan_l01_c03_ich_heisse_v1";
  canonicalSenseId: "de_lex_l01_c03_ich_heisse_v1";
  checkpointPacketId: "de_l01_c03_s24";
  firstIntroductionPacketId: null;
  phraseAuthority: false;
  resolvedPlanIds: 9;
  unresolvedPlanIds: 279;
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
  task5V2: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
  task5V3: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json",
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
  sourceHoldManifest:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_ich_heisse_source_hold_v1/manifest.json",
  sourceExtraction:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_ich_heisse_source_hold_v1/extraction_map.json",
  dwdsRaw:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_ich_heisse_source_hold_v1/raw/dwds_heissen.html",
  formulaicManifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1/manifest.json",
  formulaicExtraction:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1/extraction_map.json",
  goetheRaw:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_ich_heisse_source_hold_v1/raw/goethe_a1_redemittel.pdf",
  defaultConsumer:
    "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
  evidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_ich_heisse_positive_admission_v1/lexical_evidence.json",
  lexicalV5:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v5.json",
  task6V5:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v5.json",
  inventoryV5:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v5.json",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_ich_heisse_positive_admission_v1/manifest.json",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_ICH_HEISSE_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
} as const);

const HASHES = Object.freeze({
  [PATHS.task5V2]:
    "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
  [PATHS.task5V3]:
    "5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe",
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
  [PATHS.sourceHoldManifest]:
    "b87974af6a1340eb34e9e69faf86a2df1081e75fc4cfa1677093447b5b4ffe23",
  [PATHS.sourceExtraction]:
    "8cb5f30fd298ddd1d5e058b0ff9a9984e0c79895e4a0fb9e339f4bc5e65b5b9c",
  [PATHS.dwdsRaw]:
    "ceb735ca72b691d06fd46f9521636bb650102ed14a19465ee71142f1a295fbf1",
  [PATHS.formulaicManifest]:
    "2c3bca21dc11dee134979bacf64520cca3ce1dce1d0bd58b16657d2f75955e98",
  [PATHS.formulaicExtraction]:
    "4cb9d040275870fe6857b222c9bad26fab46646094994a7704bb9d9f0c93c3a7",
  [PATHS.goetheRaw]:
    "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085",
  [PATHS.defaultConsumer]:
    "e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59",
  [PATHS.evidence]:
    "aaade49d6ba482326b5f0638e617c99744ce3f9242e789928afd7650ea7ccfe3",
  [PATHS.lexicalV5]:
    "4ed741cc0e457eff0c3500f98e6c8d62a33a951110d428ff1333075eca99a2c7",
  [PATHS.task6V5]:
    "9bbf41335e13dff8f97be3bbd05f21284c99e62c31d5fcb63f7b5f0ab324af91",
  [PATHS.inventoryV5]:
    "e1c01fa8ef727c23d128d07bbe5cf67f7c04c6539610817ba39b6e0b555fb3b4",
  [PATHS.manifest]:
    "94900d9d0cd595d394e0964a79d354495e9f41a194eaf4a408d20b377c584b4e",
});

const OPTION_KEYS = Object.freeze([
  "task5V2PathForTest",
  "task5V3PathForTest",
  "lexicalV2PathForTest",
  "task6V2PathForTest",
  "inventoryV2PathForTest",
  "lexicalV3PathForTest",
  "task6V3PathForTest",
  "inventoryV3PathForTest",
  "lexicalV4PathForTest",
  "task6V4PathForTest",
  "inventoryV4PathForTest",
  "sourceHoldManifestPathForTest",
  "sourceExtractionPathForTest",
  "dwdsRawPathForTest",
  "formulaicManifestPathForTest",
  "formulaicExtractionPathForTest",
  "goetheRawPathForTest",
  "defaultConsumerPathForTest",
  "evidencePathForTest",
  "lexicalV5PathForTest",
  "task6V5PathForTest",
  "inventoryV5PathForTest",
  "manifestPathForTest",
  "receiptPathForTest",
] as const);

function fail(code: string): never {
  throw new Error(code);
}

function sha256(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function exact(value: unknown, expected: unknown, code: string): void {
  if (JSON.stringify(value) !== JSON.stringify(expected)) fail(code);
}

function record(value: unknown, code: string): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(code);
}

function exactKeys(
  value: JsonRecord,
  expected: readonly string[],
  code: string,
): void {
  exact(Object.keys(value).sort(), [...expected].sort(), code);
}

function parseJson(bytes: Buffer, code: string): any {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    return fail(code);
  }
}

function readBytes(
  candidate: string | undefined,
  relativePath: string,
): Buffer {
  return fs.readFileSync(candidate ?? path.join(ROOT, relativePath));
}

function readPredecessor(
  candidate: string | undefined,
  relativePath: keyof typeof HASHES,
): Buffer {
  const bytes = readBytes(candidate, relativePath);
  if (sha256(bytes) !== HASHES[relativePath])
    fail("ich_heisse_positive_predecessor_drift");
  return bytes;
}

function verifyArtifact(
  bytes: Buffer,
  relativePath: keyof typeof HASHES,
): void {
  if (sha256(bytes) !== HASHES[relativePath])
    fail("ich_heisse_positive_artifact_drift");
}

function allPlans(task5: JsonRecord): JsonRecord[] {
  return task5.lessons.flatMap((lesson: JsonRecord) =>
    lesson.chapters.flatMap(
      (chapter: JsonRecord) => chapter.checkpoint.plannedNewLexicalSenses,
    ),
  ) as JsonRecord[];
}

function allPacketIds(task5: JsonRecord): string[] {
  return task5.lessons.flatMap((lesson: JsonRecord) =>
    lesson.chapters.flatMap((chapter: JsonRecord) => chapter.packetIds),
  ) as string[];
}

function validateTask5(task5V2: JsonRecord, task5V3: JsonRecord): void {
  const expectedPlan = {
    id: "de_lex_plan_l01_c03_ich_heisse_v1",
    semanticIdentity:
      "ich heiße|fixed first person expression for giving one s name",
    lemmaOrExpression: "Ich heiße",
    partOfSpeech: "fixed_expression",
    lexicalKind: "FIXED_EXPRESSION",
    nounPackage: null,
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
      utilityRole: "participant_reference",
      situationFacet: "goal",
      facetValue: "introduce-a-name-after-greeting",
      necessityClass: "OUTCOME_UNACHIEVABLE",
      plannedUsePacketIds: ["de_l01_c03_s24"],
    },
    senseGloss: "fixed first-person expression for giving one's name",
    communicativeUse: "say a name after a greeting",
  };
  for (const [task5, schema] of [
    [task5V2, "learning-v2-german-chapter-blueprints.v2"],
    [task5V3, "learning-v2-german-chapter-blueprints.v3"],
  ] as const) {
    if (task5.schemaVersion !== schema || allPlans(task5).length !== 288)
      fail("ich_heisse_positive_task5_plan");
    exact(
      allPlans(task5).filter((row) => row.id === expectedPlan.id),
      [expectedPlan],
      "ich_heisse_positive_task5_plan",
    );
  }
}

function validateSourceEvidence(
  sourceHold: JsonRecord,
  extraction: JsonRecord,
  formulaic: JsonRecord,
  formulaicExtraction: JsonRecord,
): void {
  if (
    sourceHold.status !== "HOLD" ||
    sourceHold.task5V2?.sourcePlanId !== "de_lex_plan_l01_c03_ich_heisse_v1" ||
    sourceHold.task5V2?.checkpointPacketId !== "de_l01_c03_s24" ||
    sourceHold.sources?.dwds?.headword !== "heißen" ||
    sourceHold.sources?.dwds?.sourcePartOfSpeech !== "Verb" ||
    sourceHold.fieldSupport?.supportedClaims?.nameMeaning !==
      "DWDS_D_1_1_GENANNT_WERDEN_DEN_NAMEN_HABEN"
  ) {
    fail("ich_heisse_positive_source_binding");
  }
  if (
    extraction.extractions?.dwdsIdentity?.headword !== "heißen" ||
    extraction.extractions?.dwdsIdentity?.sourcePartOfSpeech !== "Verb" ||
    extraction.extractions?.dwdsNameMeaning?.sourceAnchor !== "d-1-1" ||
    extraction.extractions?.dwdsNameMeaning?.exactDefinitionGerman !==
      "genannt werden, den Namen haben" ||
    extraction.unsupportedClaims?.canonicalAdmission !== "OUT_OF_SCOPE" ||
    extraction.unsupportedClaims?.phraseAuthority !== "OUT_OF_SCOPE"
  ) {
    fail("ich_heisse_positive_source_binding");
  }
  const formulaicRow = formulaic.rows?.filter(
    (row: JsonRecord) =>
      row.sourcePlanId === "de_lex_plan_l01_c03_ich_heisse_v1",
  );
  const extractionRow = formulaicExtraction.rows?.filter(
    (row: JsonRecord) =>
      row.sourcePlanId === "de_lex_plan_l01_c03_ich_heisse_v1",
  );
  if (
    formulaic.status !== "HOLD" ||
    formulaic.phraseClaim !== false ||
    formulaicRow?.length !== 1 ||
    formulaicRow[0].occurrence?.text !== "Ich heiße Max." ||
    formulaicRow[0].evidenceFunction !==
      "EXACT_OCCURRENCE_IN_OFFICIAL_LEARNING_INVENTORY" ||
    extractionRow?.length !== 1 ||
    extractionRow[0].normalizedOccurrence !== "Ich heiße Max."
  ) {
    fail("ich_heisse_positive_goethe_occurrence");
  }
}

function validateEvidence(evidence: JsonRecord): void {
  exactKeys(
    evidence,
    [
      "schemaVersion",
      "admissionScope",
      "sourcePlanId",
      "canonicalSenseId",
      "evidenceId",
      "admittedExpression",
      "sourceLemma",
      "sourcePartOfSpeech",
      "sourceSense",
      "curriculumPartOfSpeech",
      "partOfSpeechInterpretation",
      "senseGloss",
      "interactionRole",
      "communicativeUse",
      "sourceRegisterMarkers",
      "register",
      "productiveConjugationAuthority",
      "generalNameFrameAuthority",
      "phraseAuthority",
      "productionPolicy",
      "packetAllocation",
      "goetheOccurrence",
      "sourceSupport",
      "authority",
    ],
    "ich_heisse_positive_evidence_identity",
  );
  if (
    evidence.schemaVersion !== "learning-v2-german-lexical-item-evidence.v4" ||
    evidence.admissionScope !== "EXACT_ICH_HEISSE_FIXED_EXPRESSION_ONLY" ||
    evidence.sourcePlanId !== "de_lex_plan_l01_c03_ich_heisse_v1" ||
    evidence.canonicalSenseId !== "de_lex_l01_c03_ich_heisse_v1" ||
    evidence.evidenceId !== "DE-LEX-ITEM-L01-C03-ICH-HEISSE-SENSE-FORM-001" ||
    evidence.admittedExpression !== "Ich heiße" ||
    evidence.sourceLemma !== "heißen" ||
    evidence.sourcePartOfSpeech !== "Verb" ||
    evidence.sourceSense !== "genannt werden, den Namen haben" ||
    evidence.curriculumPartOfSpeech !== "fixed_expression" ||
    evidence.partOfSpeechInterpretation !==
      "SOURCE_GROUNDED_FIRST_PERSON_VERB_CHUNK_TO_FIXED_EXPRESSION" ||
    evidence.senseGloss !==
      "fixed first-person expression for giving one's name" ||
    evidence.interactionRole !== "participant_reference" ||
    evidence.communicativeUse !== "say a name after a greeting"
  ) {
    fail("ich_heisse_positive_evidence_identity");
  }
  if (
    evidence.sourceRegisterMarkers !== null ||
    evidence.register !== null ||
    /\b(?:neutral|formal|colloquial)\b/iu.test(
      `${evidence.senseGloss} ${evidence.communicativeUse}`,
    )
  ) {
    fail("ich_heisse_positive_register");
  }
  if (
    evidence.productiveConjugationAuthority !== false ||
    evidence.generalNameFrameAuthority !== false ||
    evidence.phraseAuthority !== false ||
    evidence.productionPolicy !== "NOT_AUTHORIZED_BY_THIS_ADMISSION"
  ) {
    fail("ich_heisse_positive_evidence_scope");
  }
  exact(
    evidence.packetAllocation,
    {
      plannedUsePacketIds: ["de_l01_c03_s24"],
      checkpointPacketId: "de_l01_c03_s24",
      firstIntroductionPacketId: null,
    },
    "ich_heisse_positive_plan_sense_mapping",
  );
  exact(
    evidence.goetheOccurrence,
    {
      text: "Ich heiße Max.",
      evidenceFunction: "EXACT_OCCURRENCE_ONLY",
      generalFrameAuthority: false,
      literalPhraseFrameAuthority: false,
    },
    "ich_heisse_positive_phrase_forbidden",
  );
  exact(
    evidence.authority,
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
    "ich_heisse_positive_authority_boundary",
  );
}

function validatePredecessorV4(
  lexicalV4: unknown,
  task6V4: JsonRecord,
  inventoryV4: JsonRecord,
): JsonRecord[] {
  if (!Array.isArray(lexicalV4) || lexicalV4.length !== 8)
    fail("ich_heisse_positive_predecessor_schema");
  if (
    task6V4.schemaVersion !== "learning-v2-german-task6-canonical-registry.v4"
  )
    fail("ich_heisse_positive_predecessor_schema");
  exact(
    task6V4.authority,
    {
      status: "TASK6_V4_CANONICAL_PARTIAL",
      upstreamCandidateCanonicalAdmission:
        "ADMITTED_EXACT_HALLO_AND_TSCHUESS_SENSES_ONLY",
      phaseBMaterialization: "ADMITTED_FOR_TASK6_V4_REGISTRY_ONLY",
      rowsMaterialized: 8,
      newRowsMaterialized: 6,
      legacyRowsPreserved: 2,
      rowsPromoted: 2,
      task7Status: "TASK7_HOLD_GLOBAL_ALLOCATION_INCOMPLETE",
      task7Unlock: false,
      learnerFacing: false,
      phraseClaims: "HALLO_EXACT_ONLY",
      releaseAuthorized: false,
      consumerCutover: "NONE",
      defaultConsumerChanged: false,
    },
    "ich_heisse_positive_predecessor_schema",
  );
  if (
    inventoryV4.schemaVersion !==
    "learning-v2-german-task7-allocation-inventory.v4"
  ) {
    fail("ich_heisse_positive_predecessor_schema");
  }
  exact(
    inventoryV4.counts,
    {
      task5PlanIds: 288,
      resolvedPlanIds: 8,
      unresolvedPlanIds: 280,
      packetIds: 1792,
      materializedPackets: 0,
    },
    "ich_heisse_positive_predecessor_schema",
  );
  exact(
    task6V4.registry.lexicalSenses,
    lexicalV4,
    "ich_heisse_positive_predecessor_schema",
  );
  return lexicalV4;
}

function validateLexicalV5(
  lexicalV5: unknown,
  lexicalV4: JsonRecord[],
): JsonRecord[] {
  if (!Array.isArray(lexicalV5) || lexicalV5.length !== 9)
    fail("ich_heisse_positive_lexical_scope");
  exact(
    lexicalV5.filter(
      (row: JsonRecord) => row.id !== "de_lex_l01_c03_ich_heisse_v1",
    ),
    lexicalV4,
    "ich_heisse_positive_predecessor_drift",
  );
  const target = lexicalV5.filter(
    (row: JsonRecord) => row.id === "de_lex_l01_c03_ich_heisse_v1",
  );
  exact(
    target,
    [
      {
        id: "de_lex_l01_c03_ich_heisse_v1",
        lemma: "Ich heiße",
        senseGloss: "fixed first-person expression for giving one's name",
        partOfSpeech: "fixed_expression",
        sourceLemma: "heißen",
        sourcePartOfSpeech: "Verb",
        sourceSense: "genannt werden, den Namen haben",
        partOfSpeechInterpretation:
          "SOURCE_GROUNDED_FIRST_PERSON_VERB_CHUNK_TO_FIXED_EXPRESSION",
        sourceRegisterMarkers: null,
        register: null,
        nounGender: null,
        nounPlural: null,
        verbValency: null,
        verbFrame: null,
        verbSeparability: null,
        verbAuxiliary: null,
        productionPolicy: "NOT_AUTHORIZED_BY_THIS_ADMISSION",
        region: null,
        evidenceIds: ["DE-LEX-ITEM-L01-C03-ICH-HEISSE-SENSE-FORM-001"],
      },
    ],
    "ich_heisse_positive_lexical_scope",
  );
  return lexicalV5;
}

function validateTask6V5(
  task6: JsonRecord,
  task6V4: JsonRecord,
  lexicalV5: JsonRecord[],
): void {
  if (task6.schemaVersion !== "learning-v2-german-task6-canonical-registry.v5")
    fail("ich_heisse_positive_task6_authority");
  exactKeys(
    task6.authority,
    [
      "status",
      "upstreamCandidateCanonicalAdmission",
      "phaseBMaterialization",
      "rowsMaterialized",
      "newRowsMaterialized",
      "legacyRowsPreserved",
      "rowsPromoted",
      "task7Status",
      "task7Unlock",
      "preauthoringAuthority",
      "learnerFacing",
      "phraseClaims",
      "releaseAuthorized",
      "currentlyMaterializable",
      "materializedPackets",
      "consumerCutover",
      "defaultConsumerChanged",
      "ownerApproval",
    ],
    "ich_heisse_positive_task6_authority",
  );
  exact(
    task6.authority,
    {
      status: "TASK6_V5_CANONICAL_PARTIAL",
      upstreamCandidateCanonicalAdmission:
        "ADMITTED_EXACT_HALLO_TSCHUESS_AND_ICH_HEISSE_SENSES_ONLY",
      phaseBMaterialization: "ADMITTED_FOR_TASK6_V5_REGISTRY_ONLY",
      rowsMaterialized: 9,
      newRowsMaterialized: 7,
      legacyRowsPreserved: 2,
      rowsPromoted: 3,
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
    "ich_heisse_positive_authority_boundary",
  );
  const { l01IchHeisseLexicalMapping, ...priorMaterialization } =
    task6.materialization;
  exact(
    priorMaterialization,
    task6V4.materialization,
    "ich_heisse_positive_predecessor_drift",
  );
  exact(
    l01IchHeisseLexicalMapping,
    {
      sourcePlanId: "de_lex_plan_l01_c03_ich_heisse_v1",
      canonicalLexicalSenseId: "de_lex_l01_c03_ich_heisse_v1",
      evidenceId: "DE-LEX-ITEM-L01-C03-ICH-HEISSE-SENSE-FORM-001",
      materializationRole:
        "TASK6_V5_CANONICAL_POSITIVE_ADMISSION_EXACT_FIXED_EXPRESSION_ONLY",
      phraseAuthority: false,
    },
    "ich_heisse_positive_materialization",
  );
  exact(
    task6.registry.lexicalSenses,
    lexicalV5,
    "ich_heisse_positive_lexical_scope",
  );
  exact(
    task6.registry.phraseFrames,
    task6V4.registry.phraseFrames,
    "ich_heisse_positive_phrase_forbidden",
  );
  exact(
    task6.registry.pronunciationTargets,
    task6V4.registry.pronunciationTargets,
    "ich_heisse_positive_predecessor_drift",
  );
  if (
    task6.registry.phraseFrames.some(
      (row: JsonRecord) =>
        /Ich heiße(?:\s+Max\.|\s+\{Name\})/u.test(String(row.frame)) ||
        row.lexicalSenseIds?.includes("de_lex_l01_c03_ich_heisse_v1"),
    )
  ) {
    fail("ich_heisse_positive_phrase_forbidden");
  }
  const mappings = task6.authorityContext.lexicalMappings as JsonRecord[];
  exact(
    mappings.filter(
      (row) => row.sourcePlanId === "de_lex_plan_l01_c03_ich_heisse_v1",
    ),
    [
      {
        sourcePlanId: "de_lex_plan_l01_c03_ich_heisse_v1",
        canonicalId: "de_lex_l01_c03_ich_heisse_v1",
        plannedUsePacketIds: ["de_l01_c03_s24"],
        checkpointPacketId: "de_l01_c03_s24",
        firstIntroductionPacketId: null,
      },
    ],
    "ich_heisse_positive_plan_sense_mapping",
  );
  exact(
    mappings.filter(
      (row) => row.sourcePlanId !== "de_lex_plan_l01_c03_ich_heisse_v1",
    ),
    task6V4.authorityContext.lexicalMappings,
    "ich_heisse_positive_predecessor_drift",
  );
  const {
    schemaVersion: _schema,
    lexicalMappings: _mappings,
    ...otherContext
  } = task6.authorityContext;
  const {
    schemaVersion: _priorSchema,
    lexicalMappings: _priorMappings,
    ...priorContext
  } = task6V4.authorityContext;
  if (_schema !== "learning-v2-german-task6-registry-authority.v5")
    fail("ich_heisse_positive_task6_authority");
  exact(otherContext, priorContext, "ich_heisse_positive_phrase_forbidden");
}

function validateInventoryV5(
  inventory: JsonRecord,
  inventoryV4: JsonRecord,
  task5: JsonRecord,
): void {
  if (
    inventory.schemaVersion !==
      "learning-v2-german-task7-allocation-inventory.v5" ||
    inventory.status !== "ICH_HEISSE_LEXICAL_SENSE_CANONICAL_ADMITTED_PARTIAL"
  ) {
    fail("ich_heisse_positive_inventory");
  }
  exact(
    inventory.authority,
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
    "ich_heisse_positive_authority_boundary",
  );
  if (inventory.sequence?.currentlyMaterializable !== false)
    fail("ich_heisse_positive_authority_boundary");
  exact(
    inventory.counts,
    {
      task5PlanIds: 288,
      resolvedPlanIds: 9,
      unresolvedPlanIds: 279,
      packetIds: 1792,
      materializedPackets: 0,
    },
    "ich_heisse_positive_inventory",
  );
  exact(
    inventory.resolutions.filter(
      (row: JsonRecord) =>
        row.sourcePlanId === "de_lex_plan_l01_c03_ich_heisse_v1",
    ),
    [
      {
        sourcePlanId: "de_lex_plan_l01_c03_ich_heisse_v1",
        checkpointPacketId: "de_l01_c03_s24",
        canonicalSenseId: "de_lex_l01_c03_ich_heisse_v1",
        firstIntroductionPacketId: null,
      },
    ],
    "ich_heisse_positive_inventory",
  );
  exact(
    inventory.resolutions.filter(
      (row: JsonRecord) =>
        row.sourcePlanId !== "de_lex_plan_l01_c03_ich_heisse_v1",
    ),
    inventoryV4.resolutions,
    "ich_heisse_positive_predecessor_drift",
  );
  const plans = allPlans(task5).map((row) => row.id);
  const resolved = inventory.resolutions.map(
    (row: JsonRecord) => row.sourcePlanId,
  );
  const resolvedSet = new Set(resolved);
  const unresolved = plans.filter((id) => !resolvedSet.has(id));
  const packets = allPacketIds(task5);
  exact(
    inventory.inventoryDigests,
    {
      task5PlanIdsCanonicalSha256: hashCanonicalBody(plans),
      resolvedPlanIdsCanonicalSha256: hashCanonicalBody(resolved),
      unresolvedPlanIdsCanonicalSha256: hashCanonicalBody(unresolved),
      packetIdsCanonicalSha256: hashCanonicalBody(packets),
    },
    "ich_heisse_positive_inventory_digest",
  );
  if (
    plans.length !== 288 ||
    resolved.length !== 9 ||
    unresolved.length !== 279 ||
    packets.length !== 1792 ||
    inventory.sequence?.eligibilityKind !==
      "NEXT_ORDERED_SESSION_AFTER_REMAINING_279_ALLOCATIONS_AND_SEPARATE_TASK7_UNLOCK" ||
    !Array.isArray(inventory.materializedPacketPaths) ||
    inventory.materializedPacketPaths.length !== 0
  ) {
    fail("ich_heisse_positive_inventory");
  }
}

function validateManifest(manifest: JsonRecord): void {
  if (
    manifest.schemaVersion !==
      "learning-v2-de-task6c-l01-ich-heisse-positive-admission.v1" ||
    manifest.status !== "PASS" ||
    manifest.decision !== "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION"
  ) {
    fail("ich_heisse_positive_manifest");
  }
  exact(
    manifest.scope,
    {
      admissionScope: "EXACT_ICH_HEISSE_FIXED_EXPRESSION_ONLY",
      sourcePlanId: "de_lex_plan_l01_c03_ich_heisse_v1",
      canonicalSenseId: "de_lex_l01_c03_ich_heisse_v1",
      checkpointPacketId: "de_l01_c03_s24",
      firstIntroductionPacketId: null,
    },
    "ich_heisse_positive_manifest",
  );
  exact(
    manifest.phraseBoundary,
    {
      phraseAdmission: false,
      generalNameFrameAdmitted: false,
      literalGoetheOccurrenceFrameAdmitted: false,
      goetheOccurrenceEvidenceFunction: "EXACT_OCCURRENCE_ONLY",
      phraseFrameModified: false,
      lexicalSenseLinkAdded: false,
      phraseClaims: "HALLO_EXACT_ONLY",
    },
    "ich_heisse_positive_manifest",
  );
  exact(
    manifest.authority,
    {
      canonicalAdmission: true,
      admissionScope: "EXACT_ICH_HEISSE_FIXED_EXPRESSION_ONLY",
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
    "ich_heisse_positive_manifest",
  );
  if (manifest.sourceBindings?.defaultConsumer?.v5Selected !== false)
    fail("ich_heisse_positive_authority_boundary");
  for (const [name, relativePath] of [
    ["lexicalEvidence", PATHS.evidence],
    ["lexicalRegistryV5", PATHS.lexicalV5],
    ["task6V5", PATHS.task6V5],
    ["inventoryV5", PATHS.inventoryV5],
  ] as const) {
    exact(
      manifest.artifactBindings?.[name],
      { path: relativePath, sha256: HASHES[relativePath] },
      "ich_heisse_positive_manifest",
    );
  }
}

function receiptField(receipt: string, label: string, expected: string): void {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const matches = [
    ...receipt.matchAll(new RegExp("^" + escaped + ": `([^`]+)`\\.?$", "gmu")),
  ];
  if (matches.length !== 1 || matches[0][1] !== expected)
    fail("ich_heisse_positive_receipt_boundary");
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
  ] as const) {
    receiptField(receipt, label, expected);
  }

  const marker = "TYPESCRIPT_REVIEWED_RUN_JSON";
  const evidenceMatches = [
    ...receipt.matchAll(
      /<!-- TYPESCRIPT_REVIEWED_RUN_JSON\n(\{[^\n]+\})\n-->/gu,
    ),
  ];
  if (evidenceMatches.length !== 1)
    fail("ich_heisse_positive_receipt_typescript");
  let evidence: unknown;
  try {
    evidence = JSON.parse(evidenceMatches[0][1]);
  } catch {
    return fail("ich_heisse_positive_receipt_typescript");
  }
  record(evidence, "ich_heisse_positive_receipt_typescript");
  exactKeys(
    evidence,
    [
      "command",
      "exitCode",
      "diagnostics",
      "transactionPathCount",
      "transactionDiagnostics",
      "repositoryGreen",
      "logPath",
    ],
    "ich_heisse_positive_receipt_typescript",
  );
  exact(
    evidence,
    {
      command:
        "node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false",
      exitCode: 2,
      diagnostics: 14,
      transactionPathCount: 8,
      transactionDiagnostics: 0,
      repositoryGreen: false,
      logPath: "C:\\Temp\\phraseman_ich_heisse_v5_tsc_20261013.log",
    },
    "ich_heisse_positive_receipt_typescript",
  );
  if (
    marker !== "TYPESCRIPT_REVIEWED_RUN_JSON" ||
    !receipt.includes(
      "Observed reviewed-run exit: `2`; diagnostics: `14`; diagnostics in the eight transaction\npaths: `0`.",
    ) ||
    !receipt.includes(
      "The repository-wide\nTypeScript build is not claimed green.",
    ) ||
    !receipt.includes(
      "node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false",
    )
  ) {
    fail("ich_heisse_positive_receipt_typescript");
  }
}

export function inspectGermanTask6cL01IchHeissePositiveAdmissionDeV1(
  options: GermanTask6cL01IchHeissePositiveAdmissionOptionsDeV1 = {},
): GermanTask6cL01IchHeissePositiveAdmissionResultDeV1 {
  if (Object.keys(options).some((key) => !OPTION_KEYS.includes(key as any)))
    fail("ich_heisse_positive_options");

  const task5V2 = parseJson(
    readPredecessor(options.task5V2PathForTest, PATHS.task5V2),
    "ich_heisse_positive_predecessor_json",
  );
  const task5V3 = parseJson(
    readPredecessor(options.task5V3PathForTest, PATHS.task5V3),
    "ich_heisse_positive_predecessor_json",
  );
  validateTask5(task5V2, task5V3);

  const lexicalV2 = parseJson(
    readPredecessor(options.lexicalV2PathForTest, PATHS.lexicalV2),
    "ich_heisse_positive_predecessor_json",
  );
  const task6V2 = parseJson(
    readPredecessor(options.task6V2PathForTest, PATHS.task6V2),
    "ich_heisse_positive_predecessor_json",
  );
  const inventoryV2 = parseJson(
    readPredecessor(options.inventoryV2PathForTest, PATHS.inventoryV2),
    "ich_heisse_positive_predecessor_json",
  );
  const lexicalV3 = parseJson(
    readPredecessor(options.lexicalV3PathForTest, PATHS.lexicalV3),
    "ich_heisse_positive_predecessor_json",
  );
  const task6V3 = parseJson(
    readPredecessor(options.task6V3PathForTest, PATHS.task6V3),
    "ich_heisse_positive_predecessor_json",
  );
  const inventoryV3 = parseJson(
    readPredecessor(options.inventoryV3PathForTest, PATHS.inventoryV3),
    "ich_heisse_positive_predecessor_json",
  );
  if (
    !Array.isArray(lexicalV2) ||
    lexicalV2.length !== 6 ||
    task6V2.schemaVersion !==
      "learning-v2-german-task6-canonical-registry.v2" ||
    inventoryV2.schemaVersion !==
      "learning-v2-german-task7-allocation-inventory.v2" ||
    !Array.isArray(lexicalV3) ||
    lexicalV3.length !== 7 ||
    task6V3.schemaVersion !==
      "learning-v2-german-task6-canonical-registry.v3" ||
    inventoryV3.schemaVersion !==
      "learning-v2-german-task7-allocation-inventory.v3"
  ) {
    fail("ich_heisse_positive_predecessor_schema");
  }

  const lexicalV4 = parseJson(
    readPredecessor(options.lexicalV4PathForTest, PATHS.lexicalV4),
    "ich_heisse_positive_predecessor_json",
  );
  const task6V4 = parseJson(
    readPredecessor(options.task6V4PathForTest, PATHS.task6V4),
    "ich_heisse_positive_predecessor_json",
  );
  const inventoryV4 = parseJson(
    readPredecessor(options.inventoryV4PathForTest, PATHS.inventoryV4),
    "ich_heisse_positive_predecessor_json",
  );
  const predecessorLexical = validatePredecessorV4(
    lexicalV4,
    task6V4,
    inventoryV4,
  );

  const sourceHold = parseJson(
    readPredecessor(
      options.sourceHoldManifestPathForTest,
      PATHS.sourceHoldManifest,
    ),
    "ich_heisse_positive_source_json",
  );
  const sourceExtraction = parseJson(
    readPredecessor(
      options.sourceExtractionPathForTest,
      PATHS.sourceExtraction,
    ),
    "ich_heisse_positive_source_json",
  );
  readPredecessor(options.dwdsRawPathForTest, PATHS.dwdsRaw);
  const formulaicManifest = parseJson(
    readPredecessor(
      options.formulaicManifestPathForTest,
      PATHS.formulaicManifest,
    ),
    "ich_heisse_positive_source_json",
  );
  const formulaicExtraction = parseJson(
    readPredecessor(
      options.formulaicExtractionPathForTest,
      PATHS.formulaicExtraction,
    ),
    "ich_heisse_positive_source_json",
  );
  readPredecessor(options.goetheRawPathForTest, PATHS.goetheRaw);
  readPredecessor(options.defaultConsumerPathForTest, PATHS.defaultConsumer);
  validateSourceEvidence(
    sourceHold,
    sourceExtraction,
    formulaicManifest,
    formulaicExtraction,
  );

  const evidenceBytes = readBytes(options.evidencePathForTest, PATHS.evidence);
  const evidence = parseJson(
    evidenceBytes,
    "ich_heisse_positive_evidence_json",
  );
  validateEvidence(evidence);
  verifyArtifact(evidenceBytes, PATHS.evidence);

  const lexicalV5Bytes = readBytes(
    options.lexicalV5PathForTest,
    PATHS.lexicalV5,
  );
  const lexicalV5 = validateLexicalV5(
    parseJson(lexicalV5Bytes, "ich_heisse_positive_lexical_json"),
    predecessorLexical,
  );
  verifyArtifact(lexicalV5Bytes, PATHS.lexicalV5);

  const task6V5Bytes = readBytes(options.task6V5PathForTest, PATHS.task6V5);
  const task6V5 = parseJson(task6V5Bytes, "ich_heisse_positive_task6_json");
  validateTask6V5(task6V5, task6V4, lexicalV5);
  verifyArtifact(task6V5Bytes, PATHS.task6V5);

  const inventoryV5Bytes = readBytes(
    options.inventoryV5PathForTest,
    PATHS.inventoryV5,
  );
  const inventoryV5 = parseJson(
    inventoryV5Bytes,
    "ich_heisse_positive_inventory_json",
  );
  validateInventoryV5(inventoryV5, inventoryV4, task5V3);
  verifyArtifact(inventoryV5Bytes, PATHS.inventoryV5);

  const manifestBytes = readBytes(options.manifestPathForTest, PATHS.manifest);
  validateManifest(
    parseJson(manifestBytes, "ich_heisse_positive_manifest_json"),
  );
  verifyArtifact(manifestBytes, PATHS.manifest);
  validateReceipt(
    readBytes(options.receiptPathForTest, PATHS.receipt).toString("utf8"),
  );

  return Object.freeze({
    status: "PASS",
    decision: "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION",
    admissionScope: "EXACT_ICH_HEISSE_FIXED_EXPRESSION_ONLY",
    sourcePlanId: "de_lex_plan_l01_c03_ich_heisse_v1",
    canonicalSenseId: "de_lex_l01_c03_ich_heisse_v1",
    checkpointPacketId: "de_l01_c03_s24",
    firstIntroductionPacketId: null,
    phraseAuthority: false,
    resolvedPlanIds: 9,
    unresolvedPlanIds: 279,
    packetIds: 1792,
    materializedPackets: 0,
    task7Unlock: false,
    preauthoringAuthority: false,
    learnerFacing: false,
    releaseAuthorized: false,
    consumerCutover: "NONE",
  });
}
