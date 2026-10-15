import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { hashCanonicalBody } from "../../policies/decision_registry";

type JsonRecord = Record<string, any>;

export type GermanTask6cL01HalloPositiveAdmissionOptionsDeV1 = Readonly<{
  task5PathForTest?: string;
  lexicalEvidencePathForTest?: string;
  lexicalRegistryPathForTest?: string;
  task6PathForTest?: string;
  inventoryPathForTest?: string;
  manifestPathForTest?: string;
  receiptPathForTest?: string;
}>;

export type GermanTask6cL01HalloPositiveAdmissionResultDeV1 = Readonly<{
  status: "PASS";
  decision: "EXACT_POSITIVE_CANONICAL_ADMISSION";
  sourcePlanId: "de_lex_plan_l01_c01_hallo_v2";
  canonicalSenseId: "de_lex_l01_c01_hallo_v2";
  phraseFrameId: "de_pf_l01_c01_hallo_v2";
  exactSurface: "Hallo!";
  register: "colloquial";
  firstIntroductionPacketId: "de_l01_c01_s01";
  firstScoredUsePacketId: "de_l01_c01_s08";
  resolvedPlanIds: 7;
  unresolvedPlanIds: 281;
  packetIds: 1792;
  task7Unlock: false;
  preauthoringAuthority: false;
  learnerFacing: false;
  releaseAuthorized: false;
  consumerCutover: "NONE";
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const PATHS = Object.freeze({
  task5V2: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
  lexicalV2: `modules/learning-v2/curriculum/de/registries/${[
    "lexical",
    "senses",
    "de",
    "v2",
  ].join("_")}.json`,
  task6V2: `modules/learning-v2/curriculum/de/registries/${[
    "task6",
    "canonical",
    "registry",
    "de",
    "v2",
  ].join("_")}.json`,
  inventoryV2:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
  task5: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json",
  evidence:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_hallo_positive_admission_v1/lexical_evidence.json",
  lexical:
    "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v3.json",
  task6:
    "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v3.json",
  inventory:
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v3.json",
  manifest:
    "modules/learning-v2/curriculum/de/evidence/task6c_l01_hallo_positive_admission_v1/manifest.json",
  receipt:
    "docs/v2/curriculum/de/TASK6C_L01_HALLO_POSITIVE_ADMISSION_RECEIPT_2026-10-13.md",
  gate: "tests/learning_v2_de_task6c_l01_hallo_positive_admission_gate.ts",
  module:
    "modules/learning-v2/curriculum/de/task6c_l01_hallo_positive_admission_de_v1.ts",
} as const);

const HASHES = Object.freeze({
  [PATHS.task5V2]:
    "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
  [PATHS.lexicalV2]:
    "31934e35b5278c7a7e901d08e02da5398f3503825782acbb604d06de094726a5",
  [PATHS.task6V2]:
    "ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f",
  [PATHS.inventoryV2]:
    "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415",
  [PATHS.task5]:
    "5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe",
  [PATHS.evidence]:
    "10c1b3de298b46d7e3f0e6e6388349e551ebe4647c2941b55731ab86f8ddc38f",
  [PATHS.lexical]:
    "475caad2f4a56a576301836c2bb4590061dd4536cd40553b1638ce605bfdbcbb",
  [PATHS.task6]:
    "8f54a19fcaad578a374c06e3a4ecf5504ab761b1790a296056334aa35bf36862",
  [PATHS.inventory]:
    "702a491699774d2f0cc90c19755bc8747a0b1663ddd2e94f272b68d40ddc1d88",
  [PATHS.manifest]:
    "e8f42204720575759449574c109b8220f9479c6fe1479cec3db20bbefa460e28",
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

function readBytes(
  candidate: string | undefined,
  relativePath: string,
): Buffer {
  return fs.readFileSync(candidate ?? path.join(ROOT, relativePath));
}

function parseJson(bytes: Buffer, code: string): JsonRecord {
  try {
    return JSON.parse(bytes.toString("utf8")) as JsonRecord;
  } catch {
    return fail(code);
  }
}

function exact(value: unknown, expected: unknown, code: string): void {
  if (JSON.stringify(value) !== JSON.stringify(expected)) fail(code);
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
    fail("hallo_positive_task5_schema");
  const plans = allPlans(task5);
  if (plans.length !== 288) fail("hallo_positive_task5_plan");
  const hallo = plans.filter(
    (row) => row.id === "de_lex_plan_l01_c01_hallo_v2",
  );
  if (
    hallo.length !== 1 ||
    plans.some((row) => row.id === "de_lex_plan_l01_c01_hallo_v1")
  ) {
    fail("hallo_positive_task5_plan");
  }
  const plan = hallo[0];
  if (
    plan.semanticIdentity !== "hallo|colloquial greeting on meeting" ||
    plan.partOfSpeech !== "fixed_expression" ||
    plan.sourceInterpretation?.sourcePartOfSpeech !== "Interjektion" ||
    plan.sourceInterpretation?.curriculumPartOfSpeech !== "fixed_expression" ||
    plan.sourceInterpretation?.interpretation !==
      "SOURCE_GROUNDED_INTERJECTION_TO_FIXED_EXPRESSION"
  ) {
    fail("hallo_positive_task5_plan");
  }
  if (
    plan.register !== "colloquial" ||
    /neutral/iu.test(
      `${plan.semanticIdentity} ${plan.senseGloss} ${plan.utilityProof?.facetValue}`,
    )
  ) {
    fail("hallo_positive_register");
  }
  exact(
    plan.utilityProof?.plannedUsePacketIds,
    ["de_l01_c01_s01", "de_l01_c01_s08"],
    "hallo_positive_packet_allocation",
  );
  if (
    plan.utilityProof?.firstIntroductionPacketId !== "de_l01_c01_s01" ||
    plan.utilityProof?.firstScoredUsePacketId !== "de_l01_c01_s08"
  ) {
    fail("hallo_positive_packet_allocation");
  }
  const chapter = task5.lessons[0].chapters[0];
  if (
    chapter.lessonOutcome !==
      "recognise a colloquial greeting and identify a participant in distinct interactions" ||
    /participant named by a fixed chunk/iu.test(chapter.lessonOutcome)
  ) {
    fail("hallo_positive_interaction_separation");
  }
  exact(
    chapter.outcomeInteractions,
    [
      {
        id: "de_l01_ch01_greeting_v2",
        kind: "GREETING_RECOGNITION",
        requiredLexicalSenseIds: ["de_lex_l01_c01_hallo_v2"],
        participantReferenceRequired: false,
      },
      {
        id: "de_l01_ch01_participant_v2",
        kind: "PARTICIPANT_IDENTIFICATION",
        requiredLexicalSenseIds: ["de_lex_l01_c01_nachbarin_v1"],
        fixedGreetingChunkRequired: false,
      },
    ],
    "hallo_positive_interaction_separation",
  );
}

function validateEvidence(evidence: JsonRecord): void {
  if (
    evidence.sourcePlanId !== "de_lex_plan_l01_c01_hallo_v2" ||
    evidence.canonicalSenseId !== "de_lex_l01_c01_hallo_v2" ||
    evidence.exactSurface !== "Hallo!" ||
    evidence.sourcePartOfSpeech !== "Interjektion" ||
    evidence.curriculumPartOfSpeech !== "fixed_expression" ||
    evidence.partOfSpeechInterpretation !==
      "SOURCE_GROUNDED_INTERJECTION_TO_FIXED_EXPRESSION"
  ) {
    fail("hallo_positive_evidence_identity");
  }
  if (
    evidence.register !== "colloquial" ||
    evidence.neutralRegisterClaim !== false ||
    evidence.sourceSupport?.registerAdjudication?.admittedRegister !==
      "colloquial" ||
    evidence.sourceSupport?.registerAdjudication?.forbiddenRegister !==
      "neutral"
  ) {
    fail("hallo_positive_register");
  }
  if (
    evidence.sourceSupport?.dwds?.rawSha256 !==
      "b9dd475eb8828c1d38b000404cd519b3d66012941b2a13eead5325bda5e39467" ||
    evidence.sourceSupport?.goetheA1?.rawSha256 !==
      "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085" ||
    evidence.sourceSupport?.goetheA1?.exactAlternative !== "Hallo!"
  ) {
    fail("hallo_positive_source_binding");
  }
}

function validateLexicalRegistry(lexical: unknown): JsonRecord[] {
  if (!Array.isArray(lexical) || lexical.length !== 7)
    fail("hallo_positive_lexical_sense");
  const matches = lexical.filter(
    (row: JsonRecord) => row.id === "de_lex_l01_c01_hallo_v2",
  );
  if (matches.length !== 1) fail("hallo_positive_lexical_sense");
  const sense = matches[0];
  if (
    sense.lemma !== "Hallo" ||
    sense.senseGloss !== "colloquial greeting on meeting" ||
    sense.partOfSpeech !== "fixed_expression" ||
    sense.sourcePartOfSpeech !== "Interjektion" ||
    sense.partOfSpeechInterpretation !==
      "SOURCE_GROUNDED_INTERJECTION_TO_FIXED_EXPRESSION"
  ) {
    fail("hallo_positive_lexical_sense");
  }
  if (sense.register !== "colloquial") fail("hallo_positive_register");
  return lexical as JsonRecord[];
}

function validateTask6(task6: JsonRecord, lexical: JsonRecord[]): void {
  if (
    task6.schemaVersion !== "learning-v2-german-task6-canonical-registry.v3" ||
    task6.authority?.upstreamCandidateCanonicalAdmission !==
      "ADMITTED_EXACT_HALLO_ONLY" ||
    task6.authority?.rowsMaterialized !== 7 ||
    task6.authority?.rowsPromoted !== 1
  ) {
    fail("hallo_positive_task6_authority");
  }
  if (
    task6.authority.task7Unlock !== false ||
    task6.authority.learnerFacing !== false ||
    task6.authority.releaseAuthorized !== false ||
    task6.authority.consumerCutover !== "NONE"
  ) {
    fail("hallo_positive_global_hold");
  }
  exact(task6.registry?.lexicalSenses, lexical, "hallo_positive_lexical_sense");
  const lexicalMapping = task6.authorityContext?.lexicalMappings?.filter(
    (row: JsonRecord) => row.sourcePlanId === "de_lex_plan_l01_c01_hallo_v2",
  );
  exact(
    lexicalMapping,
    [
      {
        sourcePlanId: "de_lex_plan_l01_c01_hallo_v2",
        canonicalId: "de_lex_l01_c01_hallo_v2",
        plannedWordFirstPacketId: "de_l01_c01_s01",
        plannedFirstScoredUsePacketId: "de_l01_c01_s08",
      },
    ],
    "hallo_positive_plan_sense_mapping",
  );
  const phrase = task6.registry?.phraseFrames?.filter(
    (row: JsonRecord) => row.id === "de_pf_l01_c01_hallo_v2",
  );
  if (
    phrase?.length !== 1 ||
    phrase[0].frame !== "Hallo!" ||
    /Nachbarin|,/u.test(phrase[0].frame)
  ) {
    fail("hallo_positive_exact_surface");
  }
  exact(
    phrase[0].lexicalSenseIds,
    ["de_lex_l01_c01_hallo_v2"],
    "hallo_positive_plan_sense_mapping",
  );
  exact(
    phrase[0].communicativeOutcomeIds,
    ["de_out_l01_ch01_greeting_v2"],
    "hallo_positive_interaction_separation",
  );
}

function validateInventory(inventory: JsonRecord, task5: JsonRecord): void {
  if (
    inventory.schemaVersion !==
      "learning-v2-german-task7-allocation-inventory.v3" ||
    inventory.counts?.task5PlanIds !== 288 ||
    inventory.counts?.resolvedPlanIds !== 7 ||
    inventory.counts?.unresolvedPlanIds !== 281 ||
    inventory.counts?.packetIds !== 1792 ||
    inventory.counts?.materializedPackets !== 0
  ) {
    fail("hallo_positive_inventory");
  }
  if (
    inventory.authority?.task7Unlock !== false ||
    inventory.authority?.preauthoringAuthority !== false ||
    inventory.authority?.learnerFacing !== false ||
    inventory.authority?.releaseAuthorized !== false ||
    inventory.authority?.consumerCutover !== "NONE"
  ) {
    fail("hallo_positive_global_hold");
  }
  const resolutions = inventory.resolutions as JsonRecord[];
  const hallo = resolutions.filter(
    (row) => row.sourcePlanId === "de_lex_plan_l01_c01_hallo_v2",
  );
  exact(
    hallo,
    [
      {
        sourcePlanId: "de_lex_plan_l01_c01_hallo_v2",
        checkpointPacketId: "de_l01_c01_s08",
        canonicalSenseId: "de_lex_l01_c01_hallo_v2",
        firstIntroductionPacketId: "de_l01_c01_s01",
      },
    ],
    "hallo_positive_inventory",
  );
  const plans = allPlans(task5).map((row) => row.id);
  const resolved = resolutions.map((row) => row.sourcePlanId);
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
    "hallo_positive_inventory",
  );
}

function validateManifest(manifest: JsonRecord): void {
  if (
    manifest.schemaVersion !==
      "learning-v2-de-task6c-l01-hallo-positive-admission.v1" ||
    manifest.status !== "PASS" ||
    manifest.decision !== "EXACT_POSITIVE_CANONICAL_ADMISSION"
  ) {
    fail("hallo_positive_manifest");
  }
  exact(
    manifest.authority,
    {
      canonicalAdmission: true,
      admissionScope: "EXACT_HALLO_SENSE_AND_FRAME_ONLY",
      task7Unlock: false,
      preauthoringAuthority: false,
      learnerFacing: false,
      releaseAuthorized: false,
      consumerCutover: "NONE",
      defaultConsumerChanged: false,
    },
    "hallo_positive_manifest",
  );
  exact(
    manifest.sourceBindings?.englishSurface,
    ENGLISH_SURFACE,
    "hallo_positive_english_binding",
  );
}

function receiptBinding(receipt: string, label: string): string {
  const match = receipt.match(
    new RegExp(`^<!-- ${label}: ([a-f0-9]{64}) -->$`, "mu"),
  );
  if (!match) fail(`hallo_positive_receipt_binding:${label}`);
  return match[1];
}

function reviewRecords(receipt: string): JsonRecord[] {
  const records = [
    ...receipt.matchAll(/^<!-- HALLO_REVIEW_RECORD (\{.*\}) -->$/gmu),
  ];
  try {
    return records.map((match) => JSON.parse(match[1]) as JsonRecord);
  } catch {
    return fail("hallo_positive_review_closure");
  }
}

const REVIEW_RECORDS = Object.freeze([
  Object.freeze({
    lens: "native_linguistic",
    reviewerTask: "/root/de_hallo_native_review",
    evidenceClass: "ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY",
    reviewedBytes: "PRE_REPAIR_EXACT_HASHES_UNAVAILABLE",
    temporalScope: "PREDATES_P1_AUTHORITY_BOUNDARY_REPAIR",
    controlling: false,
    verdict: "PASS",
    p0: 0,
    p1: 0,
    p2: 0,
    findings: Object.freeze([]),
    independence: "NOT_SELF_PROVED_BY_THIS_RECEIPT",
    authority: "NO_AUTHORITY",
  }),
  Object.freeze({
    lens: "post_repair_spec",
    reviewerTask: "/root/de_hallo_postrepair_spec_review",
    evidenceClass: "ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY",
    moduleSha256:
      "def576446c54a6f26660095ecdcfcad1c31948ebc20c8bc3469ba9fb9239351b",
    gateSha256:
      "84f72f8e27342dd778be6c3bc6d066bbfb27eb3b9f933394201c3279a92a0dda",
    receiptSha256:
      "6d480cec6002889081b0db915915a30427b3df28f7e1f16e17fb141655279691",
    verdict: "PASS",
    p0: 0,
    p1: 0,
    p2: 0,
    findings: Object.freeze([]),
    hostileCases: Object.freeze([
      "preauthoring=true",
      "learner-facing=true",
      "release=true",
    ]),
    independence: "NOT_SELF_PROVED_BY_THIS_RECEIPT",
    authority: "NO_AUTHORITY",
  }),
  Object.freeze({
    lens: "adversarial",
    reviewerTask: "/root/de_hallo_adversarial_review",
    evidenceClass: "ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY",
    moduleSha256:
      "def576446c54a6f26660095ecdcfcad1c31948ebc20c8bc3469ba9fb9239351b",
    gateSha256:
      "84f72f8e27342dd778be6c3bc6d066bbfb27eb3b9f933394201c3279a92a0dda",
    receiptSha256:
      "6d480cec6002889081b0db915915a30427b3df28f7e1f16e17fb141655279691",
    verdict: "PASS",
    p0: 0,
    p1: 0,
    p2: 0,
    findings: Object.freeze([]),
    attackClasses: Object.freeze([
      "source",
      "interaction",
      "hash",
      "authority",
    ]),
    independence: "NOT_SELF_PROVED_BY_THIS_RECEIPT",
    authority: "NO_AUTHORITY",
  }),
]);

export function inspectGermanTask6cL01HalloPositiveAdmissionDeV1(
  options: GermanTask6cL01HalloPositiveAdmissionOptionsDeV1 = {},
): GermanTask6cL01HalloPositiveAdmissionResultDeV1 {
  const allowedOptions = new Set([
    "task5PathForTest",
    "lexicalEvidencePathForTest",
    "lexicalRegistryPathForTest",
    "task6PathForTest",
    "inventoryPathForTest",
    "manifestPathForTest",
    "receiptPathForTest",
  ]);
  if (Object.keys(options).some((key) => !allowedOptions.has(key)))
    fail("hallo_positive_options_schema");

  const task5Bytes = readBytes(options.task5PathForTest, PATHS.task5);
  const evidenceBytes = readBytes(
    options.lexicalEvidencePathForTest,
    PATHS.evidence,
  );
  const lexicalBytes = readBytes(
    options.lexicalRegistryPathForTest,
    PATHS.lexical,
  );
  const task6Bytes = readBytes(options.task6PathForTest, PATHS.task6);
  const inventoryBytes = readBytes(
    options.inventoryPathForTest,
    PATHS.inventory,
  );
  const manifestBytes = readBytes(options.manifestPathForTest, PATHS.manifest);

  const task5 = parseJson(task5Bytes, "hallo_positive_task5_schema");
  const evidence = parseJson(evidenceBytes, "hallo_positive_evidence_identity");
  const lexical = parseJson(lexicalBytes, "hallo_positive_lexical_sense");
  const task6 = parseJson(task6Bytes, "hallo_positive_task6_authority");
  const inventory = parseJson(inventoryBytes, "hallo_positive_inventory");
  const manifest = parseJson(manifestBytes, "hallo_positive_manifest");

  validateTask5(task5);
  validateEvidence(evidence);
  const parsedLexical = validateLexicalRegistry(lexical);
  validateTask6(task6, parsedLexical);
  validateInventory(inventory, task5);
  validateManifest(manifest);

  for (const [name, binding] of Object.entries(
    manifest.sourceBindings as JsonRecord,
  )) {
    if (name === "englishSurface") continue;
    if (
      typeof binding?.path !== "string" ||
      typeof binding?.sha256 !== "string" ||
      sha256(fs.readFileSync(path.join(ROOT, binding.path))) !== binding.sha256
    ) {
      fail("hallo_positive_source_binding_drift");
    }
  }

  for (const [relativePath, expected] of Object.entries(HASHES)) {
    const bytes =
      relativePath === PATHS.task5
        ? task5Bytes
        : relativePath === PATHS.evidence
          ? evidenceBytes
          : relativePath === PATHS.lexical
            ? lexicalBytes
            : relativePath === PATHS.task6
              ? task6Bytes
              : relativePath === PATHS.inventory
                ? inventoryBytes
                : relativePath === PATHS.manifest
                  ? manifestBytes
                  : fs.readFileSync(path.join(ROOT, relativePath));
    if (sha256(bytes) !== expected) fail("hallo_positive_artifact_drift");
  }
  exact(
    englishSurfaceDigest(),
    { count: ENGLISH_SURFACE.fileCount, sha256: ENGLISH_SURFACE.sha256 },
    "hallo_positive_english_binding",
  );

  const receipt = readBytes(options.receiptPathForTest, PATHS.receipt).toString(
    "utf8",
  );
  for (const [label, relativePath] of [
    ["TASK5_V3_SHA256", PATHS.task5],
    ["LEXICAL_EVIDENCE_SHA256", PATHS.evidence],
    ["LEXICAL_REGISTRY_V3_SHA256", PATHS.lexical],
    ["TASK6_V3_SHA256", PATHS.task6],
    ["INVENTORY_V3_SHA256", PATHS.inventory],
    ["ADMISSION_MANIFEST_SHA256", PATHS.manifest],
    ["ADMISSION_MODULE_SHA256", PATHS.module],
    ["ADMISSION_GATE_SHA256", PATHS.gate],
  ] as const) {
    if (
      receiptBinding(receipt, label) !==
      sha256(fs.readFileSync(path.join(ROOT, relativePath)))
    ) {
      fail(`hallo_positive_receipt_binding:${label}`);
    }
  }
  if (
    !receipt.includes("Independent review status: `CLOSED`") ||
    receipt.includes("Independent review status: `PENDING`") ||
    JSON.stringify(reviewRecords(receipt)) !== JSON.stringify(REVIEW_RECORDS) ||
    [
      "Task 7 unlock",
      "Preauthoring authority",
      "Learner-facing authority",
      "Release authorization",
    ].some(
      (claim) =>
        !receipt.includes(`${claim}: \`false\``) ||
        receipt.includes(`${claim}: \`true\``),
    ) ||
    !receipt.includes("Consumer cutover: `NONE`") ||
    /^Consumer cutover: `(?!NONE`)[^`]+`$/mu.test(receipt)
  ) {
    fail("hallo_positive_receipt_boundary");
  }

  return Object.freeze({
    status: "PASS" as const,
    decision: "EXACT_POSITIVE_CANONICAL_ADMISSION" as const,
    sourcePlanId: "de_lex_plan_l01_c01_hallo_v2" as const,
    canonicalSenseId: "de_lex_l01_c01_hallo_v2" as const,
    phraseFrameId: "de_pf_l01_c01_hallo_v2" as const,
    exactSurface: "Hallo!" as const,
    register: "colloquial" as const,
    firstIntroductionPacketId: "de_l01_c01_s01" as const,
    firstScoredUsePacketId: "de_l01_c01_s08" as const,
    resolvedPlanIds: 7 as const,
    unresolvedPlanIds: 281 as const,
    packetIds: 1792 as const,
    task7Unlock: false as const,
    preauthoringAuthority: false as const,
    learnerFacing: false as const,
    releaseAuthorized: false as const,
    consumerCutover: "NONE" as const,
  });
}
