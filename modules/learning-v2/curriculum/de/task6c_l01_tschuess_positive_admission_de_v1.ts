import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { hashCanonicalBody } from "../../policies/decision_registry";

type JsonRecord = Record<string, any>;

export type GermanTask6cL01TschuessPositiveAdmissionOptionsDeV1 = Readonly<{
  task5V3PathForTest?: string;
  lexicalV3PathForTest?: string;
  task6V3PathForTest?: string;
  inventoryV3PathForTest?: string;
  task5V2PathForTest?: string;
  inventoryV2PathForTest?: string;
  priorHoldAdjudicationPathForTest?: string;
  lexicalEvidencePathForTest?: string;
  lexicalRegistryV4PathForTest?: string;
  task6V4PathForTest?: string;
  inventoryV4PathForTest?: string;
  manifestPathForTest?: string;
  receiptPathForTest?: string;
}>;

export type GermanTask6cL01TschuessPositiveAdmissionResultDeV1 = Readonly<{
  status: "PASS";
  decision: "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION";
  admissionScope: "EXACT_TSCHUESS_SENSE_ONLY";
  sourcePlanId: "de_lex_plan_l01_c02_tschuess_v1";
  canonicalSenseId: "de_lex_l01_c02_tschuess_v1";
  checkpointPacketId: "de_l01_c02_s16";
  firstIntroductionPacketId: null;
  phraseAuthority: false;
  resolvedPlanIds: 8;
  unresolvedPlanIds: 280;
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
  lexicalV3:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v3.json",
  task6V3:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v3.json",
  inventoryV3:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v3.json",
  task5V2: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
  inventoryV2:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
  extraction:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c02_tschuess_source_hold_v1/extraction_map.json",
  dwdsRaw:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c02_tschuess_source_hold_v1/raw/dwds_tschuess.html",
  sourceManifest:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c02_tschuess_source_hold_v1/manifest.json",
  priorHoldAdjudication:
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c02_tschuess_admission_adjudication_hold_v1/adjudication.json",
  goetheRaw:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1/raw/goethe_wortliste.pdf",
  formulaicManifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1/manifest.json",
  defaultConsumer:
    "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
  evidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_tschuess_positive_admission_v1/lexical_evidence.json",
  lexicalV4:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v4.json",
  task6V4:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v4.json",
  inventoryV4:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v4.json",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_tschuess_positive_admission_v1/manifest.json",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_TSCHUESS_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
  gate: "tests/learning_v2_de_task6c_l01_tschuess_positive_admission_gate.ts",
  module:
    "modules/learning-v2/curriculum/de/task6c_l01_tschuess_positive_admission_de_v1.ts",
} as const);

const HASHES = Object.freeze({
  [PATHS.task5V3]:
    "5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe",
  [PATHS.lexicalV3]:
    "475caad2f4a56a576301836c2bb4590061dd4536cd40553b1638ce605bfdbcbb",
  [PATHS.task6V3]:
    "8f54a19fcaad578a374c06e3a4ecf5504ab761b1790a296056334aa35bf36862",
  [PATHS.inventoryV3]:
    "702a491699774d2f0cc90c19755bc8747a0b1663ddd2e94f272b68d40ddc1d88",
  [PATHS.task5V2]:
    "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
  [PATHS.inventoryV2]:
    "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415",
  [PATHS.extraction]:
    "072ae39ffa27ca489d4152bac243dd2ee50de90765d3089dd8f87b7d48d6d0fe",
  [PATHS.dwdsRaw]:
    "78c9f5c885d69b0719a5910e207c5f73113ef4ea7cbf45c57a794ef55df15650",
  [PATHS.sourceManifest]:
    "d7aa6eed248a5d24c57eafcfdbf4560d433e985fc0a054a86c9836f38fadd612",
  [PATHS.priorHoldAdjudication]:
    "f430908b804b5ffe325154b569a3630f4f10a6fb621b661ffdff22340de15051",
  [PATHS.goetheRaw]:
    "45fb648bc0ac02338f7898cae065953e320ab72ed0c14e13e0deffe6f1c5d64e",
  [PATHS.formulaicManifest]:
    "2c3bca21dc11dee134979bacf64520cca3ce1dce1d0bd58b16657d2f75955e98",
  [PATHS.defaultConsumer]:
    "e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59",
  [PATHS.evidence]:
    "b8d90064c6c7994369c8d14d935878f976af0ca45b506e77122f454c16dfe72d",
  [PATHS.lexicalV4]:
    "aa08ccd483fb2bebb43a3f2388940a5672708cc70b29e41dfb05e0d4a39bd120",
  [PATHS.task6V4]:
    "65db4d567150c654c90c14d667811c8682136db753c602d12ed0f8b0808ee1c4",
  [PATHS.inventoryV4]:
    "3abf18ea54a4b84f0386a75788b86f6e0c693b7f54819284c8f44237a407d4b6",
  [PATHS.manifest]:
    "98ea894cb092c5502deeb79fa4e91516d6f612e90722b8313250b546c579974d",
} as const);

const ENGLISH_SURFACE = Object.freeze({
  roots: Object.freeze([
    "modules/learning-v2/curriculum/en",
    "content/learning-v2-course/curriculum/en",
    "content/learning-v2-course/release/en",
    "modules/learning-v2/content/factory_native/generated_release/en",
  ]),
  fileCount: 1570,
  sha256: "33c6dfd1201dfa9e2719eda7b4845a4591fdb2acd7b0cc059f89e1297e2b9f95",
});

function fail(code: string): never {
  throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exact(value: unknown, expected: unknown, code: string): void {
  if (JSON.stringify(value) !== JSON.stringify(expected)) fail(code);
}

function parseJson(bytes: Buffer, code: string): JsonRecord {
  try {
    return JSON.parse(bytes.toString("utf8")) as JsonRecord;
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

function walk(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function englishSurfaceDigest(): Readonly<{ count: number; sha256: string }> {
  const files = ENGLISH_SURFACE.roots
    .flatMap((root) => walk(path.join(ROOT, root)))
    .map((file) => ({
      file,
      relative: path.relative(ROOT, file).replaceAll("\\", "/"),
    }))
    .sort((left, right) => left.relative.localeCompare(right.relative));
  const digest = crypto.createHash("sha256");
  for (const entry of files) {
    digest.update(entry.relative);
    digest.update("\0");
    digest.update(sha256(fs.readFileSync(entry.file)));
    digest.update("\0");
  }
  return Object.freeze({ count: files.length, sha256: digest.digest("hex") });
}

function allPlans(task5: JsonRecord): JsonRecord[] {
  return task5.lessons.flatMap((lesson: JsonRecord) =>
    lesson.chapters.flatMap(
      (chapter: JsonRecord) => chapter.checkpoint.plannedNewLexicalSenses,
    ),
  ) as JsonRecord[];
}

function validateTask5(task5: JsonRecord): void {
  if (task5.schemaVersion !== "learning-v2-german-chapter-blueprints.v3")
    fail("tschuss_positive_task5_schema");
  const plans = allPlans(task5);
  if (plans.length !== 288) fail("tschuss_positive_task5_plan");
  const matches = plans.filter(
    (row) => row.id === "de_lex_plan_l01_c02_tschuess_v1",
  );
  if (matches.length !== 1) fail("tschuss_positive_task5_plan");
  const plan = matches[0];
  if (
    plan.semanticIdentity !== "tschuss|informal leave taking" ||
    plan.lemmaOrExpression !== "Tschüss" ||
    plan.partOfSpeech !== "fixed_expression" ||
    plan.senseGloss !== "informal leave-taking" ||
    plan.communicativeUse !==
      "close an informal departure in a familiar setting" ||
    plan.utilityProof?.utilityRole !== "interaction_closing"
  ) {
    fail("tschuss_positive_task5_plan");
  }
  exact(
    plan.utilityProof?.plannedUsePacketIds,
    ["de_l01_c02_s16"],
    "tschuss_positive_packet_allocation",
  );
  if (
    plan.utilityProof?.checkpointPacketId !== "de_l01_c02_s16" ||
    "firstScoredUsePacketId" in plan.utilityProof ||
    "firstIntroductionPacketId" in plan.utilityProof
  ) {
    fail("tschuss_positive_packet_allocation");
  }
}

function validateEvidence(evidence: JsonRecord): void {
  if (
    evidence.schemaVersion !== "learning-v2-german-lexical-item-evidence.v3" ||
    evidence.admissionScope !== "EXACT_TSCHUESS_SENSE_ONLY" ||
    evidence.sourcePlanId !== "de_lex_plan_l01_c02_tschuess_v1" ||
    evidence.canonicalSenseId !== "de_lex_l01_c02_tschuess_v1" ||
    evidence.sourcePartOfSpeech !== "Interjektion" ||
    evidence.curriculumPartOfSpeech !== "fixed_expression" ||
    evidence.partOfSpeechInterpretation !==
      "SOURCE_GROUNDED_INTERJECTION_TO_FIXED_EXPRESSION" ||
    evidence.interactionRole !== "interaction_closing" ||
    evidence.communicativeUse !== "close a familiar departure"
  ) {
    fail("tschuss_positive_evidence_identity");
  }
  exact(
    evidence.sourceRegisterMarkers,
    ["landschaftlich", "umgangssprachlich"],
    "tschuss_positive_register",
  );
  if (
    evidence.register !== "colloquial" ||
    evidence.neutralRegisterClaim !== false ||
    evidence.unqualifiedStandardGermanClaim !== false ||
    /neutral/iu.test(`${evidence.senseGloss} ${evidence.communicativeUse}`)
  ) {
    fail("tschuss_positive_register");
  }
  exact(
    evidence.packetAllocation,
    {
      plannedUsePacketIds: ["de_l01_c02_s16"],
      checkpointPacketId: "de_l01_c02_s16",
      firstIntroductionPacketId: null,
    },
    "tschuss_positive_packet_allocation",
  );
  if (
    evidence.phraseAuthority !== false ||
    evidence.task7Unlock !== false ||
    evidence.preauthoringAuthority !== false ||
    evidence.learnerFacingAuthority !== false ||
    evidence.releaseAuthorized !== false ||
    evidence.consumerCutover !== "NONE"
  ) {
    fail("tschuss_positive_authority_boundary");
  }
  if (
    evidence.sourceSupport?.dwds?.rawSha256 !== HASHES[PATHS.dwdsRaw] ||
    evidence.sourceSupport?.dwds?.extractionMapSha256 !==
      HASHES[PATHS.extraction] ||
    evidence.sourceSupport?.goetheA1Wortliste?.rawSha256 !==
      HASHES[PATHS.goetheRaw] ||
    evidence.sourceSupport?.goetheA1Wortliste?.formulaicManifestSha256 !==
      HASHES[PATHS.formulaicManifest] ||
    evidence.sourceSupport?.priorHold?.sourceManifestSha256 !==
      HASHES[PATHS.sourceManifest] ||
    evidence.sourceSupport?.priorHold?.adjudicationSha256 !==
      HASHES[PATHS.priorHoldAdjudication]
  ) {
    fail("tschuss_positive_source_binding");
  }
}

function validateLexical(lexical: unknown, lexicalV3: unknown): JsonRecord[] {
  if (!Array.isArray(lexical) || lexical.length !== 8)
    fail("tschuss_positive_lexical_sense");
  if (!Array.isArray(lexicalV3) || lexicalV3.length !== 7)
    fail("tschuss_positive_predecessor_drift");
  const matches = lexical.filter(
    (row: JsonRecord) => row.id === "de_lex_l01_c02_tschuess_v1",
  );
  if (matches.length !== 1) fail("tschuss_positive_lexical_sense");
  const sense = matches[0];
  if (
    sense.lemma !== "Tschüss" ||
    sense.senseGloss !== "colloquial informal leave-taking" ||
    sense.partOfSpeech !== "fixed_expression" ||
    sense.sourcePartOfSpeech !== "Interjektion" ||
    sense.partOfSpeechInterpretation !==
      "SOURCE_GROUNDED_INTERJECTION_TO_FIXED_EXPRESSION" ||
    sense.register !== "colloquial" ||
    sense.unqualifiedStandardGermanClaim !== false ||
    sense.productionPolicy !== "NOT_AUTHORIZED_BY_THIS_ADMISSION" ||
    sense.region !== "source-marked-landschaftlich"
  ) {
    fail("tschuss_positive_lexical_sense");
  }
  exact(
    sense.sourceRegisterMarkers,
    ["landschaftlich", "umgangssprachlich"],
    "tschuss_positive_register",
  );
  exact(
    lexical.filter(
      (row: JsonRecord) => row.id !== "de_lex_l01_c02_tschuess_v1",
    ),
    lexicalV3,
    "tschuss_positive_predecessor_drift",
  );
  return lexical as JsonRecord[];
}

function validateTask6(
  task6: JsonRecord,
  task6V3: JsonRecord,
  lexical: JsonRecord[],
): void {
  if (
    task6.schemaVersion !== "learning-v2-german-task6-canonical-registry.v4" ||
    task6.authority?.rowsMaterialized !== 8 ||
    task6.authority?.rowsPromoted !== 2 ||
    task6.authority?.phraseClaims !== "HALLO_EXACT_ONLY"
  ) {
    fail("tschuss_positive_task6_authority");
  }
  if (
    task6.authority.task7Unlock !== false ||
    task6.authority.learnerFacing !== false ||
    task6.authority.releaseAuthorized !== false ||
    task6.authority.consumerCutover !== "NONE" ||
    task6.authority.defaultConsumerChanged !== false
  ) {
    fail("tschuss_positive_authority_boundary");
  }
  exact(
    task6.authority,
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
    "tschuss_positive_authority_boundary",
  );
  exact(
    task6.materialization?.l01TschuessLexicalMapping,
    {
      sourcePlanId: "de_lex_plan_l01_c02_tschuess_v1",
      canonicalLexicalSenseId: "de_lex_l01_c02_tschuess_v1",
      evidenceId: "DE-LEX-ITEM-L01-C02-TSCHUESS-SENSE-REGISTER-001",
      materializationRole:
        "TASK6_V4_CANONICAL_POSITIVE_ADMISSION_EXACT_SENSE_ONLY",
      phraseAuthority: false,
    },
    "tschuss_positive_phrase_forbidden",
  );
  exact(
    task6.registry?.lexicalSenses,
    lexical,
    "tschuss_positive_lexical_sense",
  );
  const mappings = task6.authorityContext?.lexicalMappings as JsonRecord[];
  const targetMappings = mappings.filter(
    (row) => row.sourcePlanId === "de_lex_plan_l01_c02_tschuess_v1",
  );
  exact(
    targetMappings,
    [
      {
        sourcePlanId: "de_lex_plan_l01_c02_tschuess_v1",
        canonicalId: "de_lex_l01_c02_tschuess_v1",
        plannedUsePacketIds: ["de_l01_c02_s16"],
        checkpointPacketId: "de_l01_c02_s16",
        firstIntroductionPacketId: null,
      },
    ],
    "tschuss_positive_plan_sense_mapping",
  );
  exact(
    mappings.filter(
      (row) => row.sourcePlanId !== "de_lex_plan_l01_c02_tschuess_v1",
    ),
    task6V3.authorityContext.lexicalMappings,
    "tschuss_positive_predecessor_drift",
  );
  exact(
    task6.authorityContext.phraseFrameMappings,
    task6V3.authorityContext.phraseFrameMappings,
    "tschuss_positive_phrase_forbidden",
  );
  exact(
    task6.registry.phraseFrames,
    task6V3.registry.phraseFrames,
    "tschuss_positive_phrase_forbidden",
  );
  exact(
    task6.registry.pronunciationTargets,
    task6V3.registry.pronunciationTargets,
    "tschuss_positive_predecessor_drift",
  );
  if (
    task6.registry.phraseFrames.some(
      (row: JsonRecord) =>
        row.frame === "Tschüss!" ||
        row.lexicalSenseIds?.includes("de_lex_l01_c02_tschuess_v1"),
    )
  ) {
    fail("tschuss_positive_phrase_forbidden");
  }
}

function validateInventory(
  inventory: JsonRecord,
  task5: JsonRecord,
  inventoryV3: JsonRecord,
): void {
  if (
    inventory.schemaVersion !==
      "learning-v2-german-task7-allocation-inventory.v4" ||
    inventory.counts?.task5PlanIds !== 288 ||
    inventory.counts?.resolvedPlanIds !== 8 ||
    inventory.counts?.unresolvedPlanIds !== 280 ||
    inventory.counts?.packetIds !== 1792 ||
    inventory.counts?.materializedPackets !== 0
  ) {
    fail("tschuss_positive_inventory");
  }
  if (
    inventory.authority?.task7Unlock !== false ||
    inventory.authority?.preauthoringAuthority !== false ||
    inventory.authority?.learnerFacing !== false ||
    inventory.authority?.releaseAuthorized !== false ||
    inventory.authority?.consumerCutover !== "NONE" ||
    inventory.authority?.defaultConsumerChanged !== false ||
    inventory.sequence?.currentlyMaterializable !== false ||
    inventory.materializedPacketPaths?.length !== 0
  ) {
    fail("tschuss_positive_authority_boundary");
  }
  const target = inventory.resolutions.filter(
    (row: JsonRecord) => row.sourcePlanId === "de_lex_plan_l01_c02_tschuess_v1",
  );
  exact(
    target,
    [
      {
        sourcePlanId: "de_lex_plan_l01_c02_tschuess_v1",
        checkpointPacketId: "de_l01_c02_s16",
        canonicalSenseId: "de_lex_l01_c02_tschuess_v1",
        firstIntroductionPacketId: null,
      },
    ],
    "tschuss_positive_inventory",
  );
  exact(
    inventory.resolutions.filter(
      (row: JsonRecord) =>
        row.sourcePlanId !== "de_lex_plan_l01_c02_tschuess_v1",
    ),
    inventoryV3.resolutions,
    "tschuss_positive_predecessor_drift",
  );
  const plans = allPlans(task5).map((row) => row.id);
  const resolved = inventory.resolutions.map(
    (row: JsonRecord) => row.sourcePlanId,
  );
  const resolvedSet = new Set(resolved);
  const unresolved = plans.filter((id) => !resolvedSet.has(id));
  const packets = task5.lessons.flatMap((lesson: JsonRecord) =>
    lesson.chapters.flatMap((chapter: JsonRecord) => chapter.packetIds),
  );
  exact(
    inventory.inventoryDigests,
    {
      task5PlanIdsCanonicalSha256: hashCanonicalBody(plans),
      resolvedPlanIdsCanonicalSha256: hashCanonicalBody(resolved),
      unresolvedPlanIdsCanonicalSha256: hashCanonicalBody(unresolved),
      packetIdsCanonicalSha256: hashCanonicalBody(packets),
    },
    "tschuss_positive_inventory",
  );
}

function validateManifest(manifest: JsonRecord): void {
  if (
    manifest.schemaVersion !==
      "learning-v2-de-task6c-l01-tschuess-positive-admission.v1" ||
    manifest.status !== "PASS" ||
    manifest.decision !== "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION"
  ) {
    fail("tschuss_positive_manifest");
  }
  exact(
    manifest.scope,
    {
      admissionScope: "EXACT_TSCHUESS_SENSE_ONLY",
      sourcePlanId: "de_lex_plan_l01_c02_tschuess_v1",
      canonicalSenseId: "de_lex_l01_c02_tschuess_v1",
      checkpointPacketId: "de_l01_c02_s16",
      firstIntroductionPacketId: null,
    },
    "tschuss_positive_manifest",
  );
  exact(
    manifest.authority,
    {
      canonicalAdmission: true,
      admissionScope: "EXACT_TSCHUESS_SENSE_ONLY",
      phraseAuthority: false,
      task7Unlock: false,
      preauthoringAuthority: false,
      learnerFacing: false,
      releaseAuthorized: false,
      consumerCutover: "NONE",
      defaultConsumerChanged: false,
    },
    "tschuss_positive_authority_boundary",
  );
  exact(
    manifest.phraseBoundary,
    {
      phraseAdmission: false,
      exactTschuessFrameAdmitted: false,
      existingCompositePhraseFrameId: "de_pf_l01_c02_tschuess_aufzug_v1",
      existingCompositeModified: false,
      lexicalSenseLinkAdded: false,
    },
    "tschuss_positive_phrase_forbidden",
  );
  exact(
    manifest.allocation,
    {
      plannedUsePacketIds: ["de_l01_c02_s16"],
      checkpointPacketId: "de_l01_c02_s16",
      firstIntroductionPacketId: null,
      resolvedPlanIds: 8,
      unresolvedPlanIds: 280,
      packetIds: 1792,
      materializedPackets: 0,
    },
    "tschuss_positive_packet_allocation",
  );
  exact(
    manifest.sourceBindings?.englishSurface,
    ENGLISH_SURFACE,
    "tschuss_positive_english_binding",
  );
  if (manifest.sourceBindings?.defaultConsumer?.v4Selected !== false)
    fail("tschuss_positive_consumer_cutover");
}

function receiptBinding(receipt: string, label: string): string {
  const match = receipt.match(
    new RegExp(`^<!-- ${label}: ([a-f0-9]{64}) -->$`, "mu"),
  );
  if (!match) fail(`tschuss_positive_receipt_binding:${label}`);
  return match[1];
}

function receiptReviewHistory(receipt: string): JsonRecord {
  const match = receipt.match(
    /^<!-- REVIEW_HISTORY_JSON\r?\n([\s\S]*?)\r?\n-->$/mu,
  );
  if (!match) fail("tschuss_positive_receipt_review_history");
  return parseJson(
    Buffer.from(match[1], "utf8"),
    "tschuss_positive_receipt_review_history",
  );
}

function receiptInteger(receipt: string, label: string): number {
  const matches = [
    ...receipt.matchAll(new RegExp(`^<!-- ${label}: (\\d+) -->$`, "gmu")),
  ];
  if (matches.length !== 1)
    fail("tschuss_positive_receipt_typescript_evidence");
  return Number(matches[0][1]);
}

export function inspectGermanTask6cL01TschuessPositiveAdmissionDeV1(
  options: GermanTask6cL01TschuessPositiveAdmissionOptionsDeV1 = {},
): GermanTask6cL01TschuessPositiveAdmissionResultDeV1 {
  const allowedOptions = new Set([
    "task5V3PathForTest",
    "lexicalV3PathForTest",
    "task6V3PathForTest",
    "inventoryV3PathForTest",
    "task5V2PathForTest",
    "inventoryV2PathForTest",
    "priorHoldAdjudicationPathForTest",
    "lexicalEvidencePathForTest",
    "lexicalRegistryV4PathForTest",
    "task6V4PathForTest",
    "inventoryV4PathForTest",
    "manifestPathForTest",
    "receiptPathForTest",
  ]);
  if (Object.keys(options).some((key) => !allowedOptions.has(key)))
    fail("tschuss_positive_options_schema");

  const bytes = new Map<string, Buffer>([
    [PATHS.task5V3, readBytes(options.task5V3PathForTest, PATHS.task5V3)],
    [PATHS.lexicalV3, readBytes(options.lexicalV3PathForTest, PATHS.lexicalV3)],
    [PATHS.task6V3, readBytes(options.task6V3PathForTest, PATHS.task6V3)],
    [
      PATHS.inventoryV3,
      readBytes(options.inventoryV3PathForTest, PATHS.inventoryV3),
    ],
    [PATHS.task5V2, readBytes(options.task5V2PathForTest, PATHS.task5V2)],
    [
      PATHS.inventoryV2,
      readBytes(options.inventoryV2PathForTest, PATHS.inventoryV2),
    ],
    [
      PATHS.priorHoldAdjudication,
      readBytes(
        options.priorHoldAdjudicationPathForTest,
        PATHS.priorHoldAdjudication,
      ),
    ],
    [
      PATHS.evidence,
      readBytes(options.lexicalEvidencePathForTest, PATHS.evidence),
    ],
    [
      PATHS.lexicalV4,
      readBytes(options.lexicalRegistryV4PathForTest, PATHS.lexicalV4),
    ],
    [PATHS.task6V4, readBytes(options.task6V4PathForTest, PATHS.task6V4)],
    [
      PATHS.inventoryV4,
      readBytes(options.inventoryV4PathForTest, PATHS.inventoryV4),
    ],
    [PATHS.manifest, readBytes(options.manifestPathForTest, PATHS.manifest)],
  ]);

  for (const relativePath of [
    PATHS.task5V3,
    PATHS.lexicalV3,
    PATHS.task6V3,
    PATHS.inventoryV3,
    PATHS.task5V2,
    PATHS.inventoryV2,
    PATHS.priorHoldAdjudication,
  ]) {
    if (sha256(bytes.get(relativePath)!) !== HASHES[relativePath])
      fail("tschuss_positive_predecessor_drift");
  }

  const task5 = parseJson(
    bytes.get(PATHS.task5V3)!,
    "tschuss_positive_task5_schema",
  );
  const lexicalV3 = parseJson(
    bytes.get(PATHS.lexicalV3)!,
    "tschuss_positive_predecessor_drift",
  );
  const task6V3 = parseJson(
    bytes.get(PATHS.task6V3)!,
    "tschuss_positive_predecessor_drift",
  );
  const inventoryV3 = parseJson(
    bytes.get(PATHS.inventoryV3)!,
    "tschuss_positive_predecessor_drift",
  );
  const evidence = parseJson(
    bytes.get(PATHS.evidence)!,
    "tschuss_positive_evidence_identity",
  );
  const lexicalV4 = parseJson(
    bytes.get(PATHS.lexicalV4)!,
    "tschuss_positive_lexical_sense",
  );
  const task6V4 = parseJson(
    bytes.get(PATHS.task6V4)!,
    "tschuss_positive_task6_authority",
  );
  const inventoryV4 = parseJson(
    bytes.get(PATHS.inventoryV4)!,
    "tschuss_positive_inventory",
  );
  const manifest = parseJson(
    bytes.get(PATHS.manifest)!,
    "tschuss_positive_manifest",
  );

  validateTask5(task5);
  validateEvidence(evidence);
  const lexical = validateLexical(lexicalV4, lexicalV3);
  validateTask6(task6V4, task6V3, lexical);
  validateInventory(inventoryV4, task5, inventoryV3);
  validateManifest(manifest);

  for (const [name, binding] of Object.entries({
    ...(manifest.sourceBindings as JsonRecord),
    ...(manifest.artifactBindings as JsonRecord),
  })) {
    if (name === "englishSurface") continue;
    if (
      typeof binding?.path !== "string" ||
      typeof binding?.sha256 !== "string" ||
      sha256(fs.readFileSync(path.join(ROOT, binding.path))) !== binding.sha256
    ) {
      fail("tschuss_positive_source_binding_drift");
    }
  }

  for (const [relativePath, expected] of Object.entries(HASHES)) {
    const artifactBytes =
      bytes.get(relativePath) ?? fs.readFileSync(path.join(ROOT, relativePath));
    if (sha256(artifactBytes) !== expected)
      fail("tschuss_positive_artifact_drift");
  }
  exact(
    englishSurfaceDigest(),
    { count: ENGLISH_SURFACE.fileCount, sha256: ENGLISH_SURFACE.sha256 },
    "tschuss_positive_english_binding",
  );

  const receipt = readBytes(options.receiptPathForTest, PATHS.receipt).toString(
    "utf8",
  );
  for (const [label, relativePath] of [
    ["TASK5_V3_INPUT_SHA256", PATHS.task5V3],
    ["LEXICAL_V3_INPUT_SHA256", PATHS.lexicalV3],
    ["TASK6_V3_INPUT_SHA256", PATHS.task6V3],
    ["INVENTORY_V3_INPUT_SHA256", PATHS.inventoryV3],
    ["TASK5_V2_IMMUTABLE_SHA256", PATHS.task5V2],
    ["INVENTORY_V2_IMMUTABLE_SHA256", PATHS.inventoryV2],
    ["PRIOR_HOLD_ADJUDICATION_SHA256", PATHS.priorHoldAdjudication],
    ["DEFAULT_CONSUMER_SHA256", PATHS.defaultConsumer],
    ["LEXICAL_EVIDENCE_SHA256", PATHS.evidence],
    ["LEXICAL_REGISTRY_V4_SHA256", PATHS.lexicalV4],
    ["TASK6_V4_SHA256", PATHS.task6V4],
    ["INVENTORY_V4_SHA256", PATHS.inventoryV4],
    ["ADMISSION_MANIFEST_SHA256", PATHS.manifest],
    ["ADMISSION_MODULE_SHA256", PATHS.module],
    ["ADMISSION_GATE_SHA256", PATHS.gate],
  ] as const) {
    if (
      receiptBinding(receipt, label) !==
      sha256(fs.readFileSync(path.join(ROOT, relativePath)))
    ) {
      fail(`tschuss_positive_receipt_binding:${label}`);
    }
  }
  const historicalBindings = [
    [PATHS.task5V3, HASHES[PATHS.task5V3]],
    [PATHS.lexicalV3, HASHES[PATHS.lexicalV3]],
    [PATHS.task6V3, HASHES[PATHS.task6V3]],
    [PATHS.inventoryV3, HASHES[PATHS.inventoryV3]],
    [PATHS.task5V2, HASHES[PATHS.task5V2]],
    [PATHS.inventoryV2, HASHES[PATHS.inventoryV2]],
    [PATHS.priorHoldAdjudication, HASHES[PATHS.priorHoldAdjudication]],
    [PATHS.defaultConsumer, HASHES[PATHS.defaultConsumer]],
  ] as const;
  if (
    !historicalBindings.every(([relativePath, hash]) =>
      receipt.includes(`- \`${relativePath}\` — \`${hash}\``),
    ) ||
    !receipt.includes(
      "No byte-preservation claim is made for any unlisted V2, V3, or Tschüss HOLD path.",
    ) ||
    !receipt.includes(
      "Current gates observed no drift in the eight listed paths; they do not prove\npreservation of any unlisted bytes.",
    ) ||
    receipt.includes("remain byte-for-byte historical inputs") ||
    receipt.includes("All V2, V3, and Tschüss HOLD paths are byte-preserved.")
  ) {
    fail("tschuss_positive_receipt_byte_scope");
  }
  exact(
    {
      postrepairExit: receiptInteger(receipt, "TYPESCRIPT_POSTREPAIR_EXIT"),
      postrepairDiagnostics: receiptInteger(
        receipt,
        "TYPESCRIPT_POSTREPAIR_DIAGNOSTICS",
      ),
      closureExit: receiptInteger(receipt, "TYPESCRIPT_CLOSURE_EXIT"),
      closureDiagnostics: receiptInteger(
        receipt,
        "TYPESCRIPT_CLOSURE_DIAGNOSTICS",
      ),
      closureTargetDiagnostics: receiptInteger(
        receipt,
        "TYPESCRIPT_CLOSURE_TARGET_DIAGNOSTICS",
      ),
    },
    {
      postrepairExit: 2,
      postrepairDiagnostics: 17,
      closureExit: 2,
      closureDiagnostics: 14,
      closureTargetDiagnostics: 0,
    },
    "tschuss_positive_receipt_typescript_evidence",
  );
  exact(
    receiptReviewHistory(receipt),
    {
      initialSpec: {
        taskIdentity: "/root/de_tschuess_spec_review",
        verdict: "HOLD",
        findings: { P0: 0, P1: 1, P2: 0 },
        reviewedHashes: {
          evidence:
            "b8d90064c6c7994369c8d14d935878f976af0ca45b506e77122f454c16dfe72d",
          manifest:
            "98ea894cb092c5502deeb79fa4e91516d6f612e90722b8313250b546c579974d",
          lexicalV4:
            "aa08ccd483fb2bebb43a3f2388940a5672708cc70b29e41dfb05e0d4a39bd120",
          task6V4:
            "65db4d567150c654c90c14d667811c8682136db753c602d12ed0f8b0808ee1c4",
          inventoryV4:
            "3abf18ea54a4b84f0386a75788b86f6e0c693b7f54819284c8f44237a407d4b6",
          module:
            "2e9c13283e8e8a5a228350281ff2699c41089893017782ee919d81459bca8523",
          gate: "a34d4b873d48feb1ba18cf6075df7510a562485351a0b2eadbbbbc22691b2576",
          receipt:
            "7d06c5b93145685eabbf9b910ed00707e38f1aa7e7fd8ff8a4cc959c8ce1f223",
        },
        rawSidecarPath: "unavailable",
        outputSha256: "unavailable",
      },
      postrepairSpec: {
        taskIdentity: "/root/de_tschuess_postrepair_spec_review",
        verdict: "PASS",
        findings: { P0: 0, P1: 0, P2: 0 },
        reviewedHashes: {
          evidence:
            "b8d90064c6c7994369c8d14d935878f976af0ca45b506e77122f454c16dfe72d",
          manifest:
            "98ea894cb092c5502deeb79fa4e91516d6f612e90722b8313250b546c579974d",
          lexicalV4:
            "aa08ccd483fb2bebb43a3f2388940a5672708cc70b29e41dfb05e0d4a39bd120",
          task6V4:
            "65db4d567150c654c90c14d667811c8682136db753c602d12ed0f8b0808ee1c4",
          inventoryV4:
            "3abf18ea54a4b84f0386a75788b86f6e0c693b7f54819284c8f44237a407d4b6",
          module:
            "5b13ede1f3800f3aa5b57619749291dbef7dac976cc867dae88488b5d1f29b33",
          gate: "16989f89bea90562ee9458de10ae3220804762754fe3cecdcd35901c601732d3",
          receipt:
            "6f9faf507bd1da3651cd1094b65eb909611004493507260475741fdc0fabb666",
        },
        rawSidecarPath: "unavailable",
        outputSha256: "unavailable",
      },
      adversarial: {
        taskIdentity: "/root/de_tschuess_adversarial_review",
        verdict: "HOLD",
        findings: { P0: 0, P1: 0, P2: 2 },
        reviewedHashes: {
          evidence:
            "b8d90064c6c7994369c8d14d935878f976af0ca45b506e77122f454c16dfe72d",
          manifest:
            "98ea894cb092c5502deeb79fa4e91516d6f612e90722b8313250b546c579974d",
          lexicalV4:
            "aa08ccd483fb2bebb43a3f2388940a5672708cc70b29e41dfb05e0d4a39bd120",
          task6V4:
            "65db4d567150c654c90c14d667811c8682136db753c602d12ed0f8b0808ee1c4",
          inventoryV4:
            "3abf18ea54a4b84f0386a75788b86f6e0c693b7f54819284c8f44237a407d4b6",
          module:
            "5b13ede1f3800f3aa5b57619749291dbef7dac976cc867dae88488b5d1f29b33",
          gate: "16989f89bea90562ee9458de10ae3220804762754fe3cecdcd35901c601732d3",
          receipt:
            "6f9faf507bd1da3651cd1094b65eb909611004493507260475741fdc0fabb666",
        },
        rawSidecarPath: "unavailable",
        outputSha256: "unavailable",
      },
      finalReviewStatus: "PENDING",
      freshFinalReviewsRequired: 2,
    },
    "tschuss_positive_receipt_review_history",
  );
  if (
    !receipt.includes("Independent review status: `PENDING`") ||
    receipt.includes("Independent review status: `CLOSED`") ||
    !receipt.includes("Phrase authority: `false`") ||
    !receipt.includes("Task 7 unlock: `false`") ||
    !receipt.includes("Preauthoring authority: `false`") ||
    !receipt.includes("Learner-facing authority: `false`") ||
    !receipt.includes("Release authorization: `false`") ||
    !receipt.includes("Consumer cutover: `NONE`") ||
    !receipt.includes("Default consumer changed: `false`") ||
    /(?:Phrase authority|Task 7 unlock|Preauthoring authority|Learner-facing authority|Release authorization|Default consumer changed): `true`/u.test(
      receipt,
    ) ||
    /^Consumer cutover: `(?!NONE`)[^`]+`$/mu.test(receipt)
  ) {
    fail("tschuss_positive_receipt_boundary");
  }

  return Object.freeze({
    status: "PASS" as const,
    decision: "EXACT_POSITIVE_CANONICAL_LEXICAL_SENSE_ADMISSION" as const,
    admissionScope: "EXACT_TSCHUESS_SENSE_ONLY" as const,
    sourcePlanId: "de_lex_plan_l01_c02_tschuess_v1" as const,
    canonicalSenseId: "de_lex_l01_c02_tschuess_v1" as const,
    checkpointPacketId: "de_l01_c02_s16" as const,
    firstIntroductionPacketId: null,
    phraseAuthority: false as const,
    resolvedPlanIds: 8 as const,
    unresolvedPlanIds: 280 as const,
    packetIds: 1792 as const,
    materializedPackets: 0 as const,
    task7Unlock: false as const,
    preauthoringAuthority: false as const,
    learnerFacing: false as const,
    releaseAuthorized: false as const,
    consumerCutover: "NONE" as const,
  });
}
