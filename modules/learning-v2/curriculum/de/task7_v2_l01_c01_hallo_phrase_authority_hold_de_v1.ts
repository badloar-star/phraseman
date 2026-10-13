import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { inspectGermanTask7V2L01C01HalloSourceAllocationDeV1 } from "./task7_v2_l01_c01_hallo_allocation_de_v1";

type JsonRecord = Record<string, unknown>;

export type GermanTask7V2L01C01HalloPhraseAuthorityHoldDeV1 = Readonly<{
  status: "HOLD";
  decision: "EXACT_PHRASE_AUTHORITY_NOT_ESTABLISHED";
  sessionId: "de_l01_s01";
  phraseContextId: "de_pf_l01_c01_hallo_nachbarin_v1";
  exactPhrase: "Hallo, Nachbarin!";
  greetingFunction: "SUPPORTED";
  dwdsRegisterLabel: "UMGANGSSPRACHLIC_SUPPORTED";
  neutralRegister: "UNVERIFIED";
  exactPhraseAttestation: "ABSENT_FROM_BOUND_EVIDENCE";
  phraseNaturalness: "UNVERIFIED";
  nativePhraseJudgement: "REQUIRED";
  resolutionRoute: "NEW_EXACT_AUTHORITY_OR_VERSIONED_TASK5_TASK6_REPAIR";
  canonicalAdmission: false;
  inventoryResolutionApplied: false;
  task7Unlock: false;
  preauthoringAuthority: false;
  learnerFacing: false;
  releaseAuthorized: false;
  consumerCutover: "NONE";
  inventory: Readonly<{
    resolvedPlanIds: 6;
    unresolvedPlanIds: 282;
    packetIds: 1792;
    materializedPackets: 0;
  }>;
}>;

export type GermanTask7V2L01C01HalloPhraseAuthorityInspectionOptionsDeV1 =
  Readonly<{
    adjudicationPathForTest?: string;
    task5PathForTest?: string;
    task6V2PathForTest?: string;
    sourceManifestPathForTest?: string;
    extractionPathForTest?: string;
    sourceValidatorPathForTest?: string;
    inventoryPathForTest?: string;
    boundEvidenceRootForTest?: string;
    packetPathForTest?: string;
  }>;

const ROOT = path.resolve(__dirname, "../../../..");
const ADJUDICATION_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_phrase_authority_hold_v1/adjudication.json",
);
const TASK5_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
);
const TASK6_V2_FILE = `${["task6", "canonical", "registry", "de", "v2"].join("_")}.json`;
const TASK6_V2_RELATIVE_PATH = `modules/learning-v2/curriculum/de/registries/${TASK6_V2_FILE}`;
const TASK6_V2_PATH = path.join(ROOT, TASK6_V2_RELATIVE_PATH);
const BOUND_EVIDENCE_ROOT = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1",
);
const SOURCE_MANIFEST_PATH = path.join(BOUND_EVIDENCE_ROOT, "manifest.json");
const EXTRACTION_PATH = path.join(BOUND_EVIDENCE_ROOT, "extraction_map.json");
const SOURCE_VALIDATOR_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_allocation_de_v1.ts",
);
const INVENTORY_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
);
const PACKET_PATH = path.join(
  ROOT,
  "content/learning-v2-course/curriculum/de/packets/l01/s01.json",
);
const EXACT_PHRASE = "Hallo, Nachbarin!";

const INPUTS = Object.freeze({
  task5V2: Object.freeze({
    path: "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
    sha256: "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
  }),
  task6V2Canonical: Object.freeze({
    path: TASK6_V2_RELATIVE_PATH,
    sha256: "ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f",
  }),
  sourceManifest: Object.freeze({
    path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/manifest.json",
    sha256: "674f789c05922ddce29103393228ee26f4c428255baf4fc646b90c95b97bfd33",
  }),
  sourceExtraction: Object.freeze({
    path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1/extraction_map.json",
    sha256: "3b0ab0c32c3dd8bb42b2c22f0f43bc514272f23c60c97003334418f5afaaabad",
  }),
  sourceValidator: Object.freeze({
    path: "modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_allocation_de_v1.ts",
    sha256: "71e96a433e2906ffd86e05aa0ea42a09300c1d83a46ecae680bfa842a637e5aa",
  }),
  allocationInventory: Object.freeze({
    path: "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
    sha256: "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415",
  }),
});

function fail(code: string): never {
  throw new Error(code);
}

function record(value: unknown, code: string): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
}

function exactKeys(
  value: JsonRecord,
  keys: readonly string[],
  code: string,
): void {
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    fail(code);
  }
}

function forbidKeys(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const nested of value) forbidKeys(nested);
    return;
  }
  if (Object.hasOwn(value, "canonicalSenseId")) {
    fail("hallo_phrase_canonical_sense_id_forbidden");
  }
  if (Object.hasOwn(value, "ownerApproval")) {
    fail("hallo_phrase_owner_approval_forbidden");
  }
  for (const nested of Object.values(value)) forbidKeys(nested);
}

function sha256(bytes: Buffer | string): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readBoundBytes(file: string, expected: string, code: string): Buffer {
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== expected) fail(code);
  return bytes;
}

function parseJson(bytes: Buffer, code: string): JsonRecord {
  try {
    const value = JSON.parse(bytes.toString("utf8")) as unknown;
    record(value, code);
    return value;
  } catch {
    fail(code);
  }
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as JsonRecord)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function validateBindings(value: unknown): void {
  record(value, "hallo_phrase_input_bindings");
  exactKeys(value, Object.keys(INPUTS), "hallo_phrase_input_bindings");
  for (const [key, expected] of Object.entries(INPUTS)) {
    record(value[key], "hallo_phrase_input_bindings");
    exactKeys(value[key], ["path", "sha256"], "hallo_phrase_input_bindings");
    if (
      value[key].path !== expected.path ||
      value[key].sha256 !== expected.sha256
    ) {
      fail("hallo_phrase_input_bindings");
    }
  }
}

function validateAdjudication(value: unknown): void {
  forbidKeys(value);
  record(value, "hallo_phrase_adjudication_record");
  exactKeys(
    value,
    [
      "schemaVersion",
      "status",
      "decision",
      "scope",
      "inputBindings",
      "findings",
      "sourceBoundaries",
      "absenceProof",
      "resolutionRoute",
      "authority",
      "inventory",
    ],
    "hallo_phrase_adjudication_schema",
  );
  if (
    value.schemaVersion !==
    "learning-v2-de-task7-v2-l01-c01-hallo-phrase-authority-adjudication-hold.v1"
  ) {
    fail("hallo_phrase_adjudication_schema");
  }
  if (value.status !== "HOLD") fail("hallo_phrase_hold_required");
  if (value.decision !== "EXACT_PHRASE_AUTHORITY_NOT_ESTABLISHED") {
    fail("hallo_phrase_authority_not_established");
  }

  record(value.scope, "hallo_phrase_scope");
  exactKeys(
    value.scope,
    [
      "targetLanguage",
      "sessionId",
      "sourcePlanId",
      "checkpointPacketId",
      "phraseContextId",
      "exactPhrase",
      "contactPacketIds",
    ],
    "hallo_phrase_scope",
  );
  if (
    value.scope.targetLanguage !== "de" ||
    value.scope.sessionId !== "de_l01_s01" ||
    value.scope.sourcePlanId !== "de_lex_plan_l01_c01_hallo_v1" ||
    value.scope.checkpointPacketId !== "de_l01_c01_s08" ||
    value.scope.phraseContextId !== "de_pf_l01_c01_hallo_nachbarin_v1" ||
    value.scope.exactPhrase !== EXACT_PHRASE
  ) {
    fail("hallo_phrase_exact_identity");
  }
  if (
    !Array.isArray(value.scope.contactPacketIds) ||
    value.scope.contactPacketIds.length !== 2 ||
    value.scope.contactPacketIds[0] !== "de_l01_c01_s01" ||
    value.scope.contactPacketIds[1] !== "de_l01_c01_s08"
  ) {
    fail("hallo_phrase_exact_contacts");
  }
  validateBindings(value.inputBindings);

  record(value.findings, "hallo_phrase_findings");
  exactKeys(
    value.findings,
    [
      "greetingFunction",
      "dwdsRegisterLabel",
      "neutralRegister",
      "exactPhraseAttestation",
      "phraseNaturalness",
      "nativePhraseJudgement",
    ],
    "hallo_phrase_findings",
  );
  if (value.findings.greetingFunction !== "SUPPORTED") {
    fail("hallo_phrase_greeting_function");
  }
  if (value.findings.dwdsRegisterLabel !== "UMGANGSSPRACHLIC_SUPPORTED") {
    fail("hallo_phrase_dwds_register");
  }
  if (value.findings.neutralRegister !== "UNVERIFIED") {
    fail("hallo_phrase_neutral_register_unverified");
  }
  if (value.findings.exactPhraseAttestation !== "ABSENT_FROM_BOUND_EVIDENCE") {
    fail("hallo_phrase_exact_attestation_absent");
  }
  if (value.findings.phraseNaturalness !== "UNVERIFIED") {
    fail("hallo_phrase_naturalness_unverified");
  }
  if (value.findings.nativePhraseJudgement !== "REQUIRED") {
    fail("hallo_phrase_native_judgement_required");
  }

  record(value.sourceBoundaries, "hallo_phrase_source_boundaries");
  exactKeys(
    value.sourceBoundaries,
    ["dwds", "goethe", "task6PhraseFrame"],
    "hallo_phrase_source_boundaries",
  );
  if (
    value.sourceBoundaries.dwds !==
    "GREETING_FUNCTION_AND_UMGANGSSPRACHLIC_REGISTER_ONLY"
  ) {
    fail("hallo_phrase_colloquial_not_neutral");
  }
  if (
    value.sourceBoundaries.goethe !==
    "HALLO_OCCURRENCE_ONLY_NOT_COMPOSED_PHRASE"
  ) {
    fail("hallo_phrase_goethe_scope");
  }
  if (
    value.sourceBoundaries.task6PhraseFrame !==
    "GENERAL_CEFR_EVIDENCE_NOT_EXACT_PHRASE_ATTESTATION"
  ) {
    fail("hallo_phrase_cefr_scope");
  }

  record(value.absenceProof, "hallo_phrase_absence_proof");
  exactKeys(
    value.absenceProof,
    ["matchMode", "inspectedArtifacts", "exactMatchCount"],
    "hallo_phrase_absence_proof",
  );
  if (
    value.absenceProof.matchMode !== "EXACT_UTF8_LITERAL" ||
    !Array.isArray(value.absenceProof.inspectedArtifacts) ||
    value.absenceProof.inspectedArtifacts.length !== 4 ||
    value.absenceProof.inspectedArtifacts[0] !==
      "raw/dwds_hallo_interjection.html" ||
    value.absenceProof.inspectedArtifacts[1] !== "raw/dwds_Hallo_noun.html" ||
    value.absenceProof.inspectedArtifacts[2] !==
      "raw/goethe_a1_redemittel.pdf" ||
    value.absenceProof.inspectedArtifacts[3] !== "extraction_map.json" ||
    value.absenceProof.exactMatchCount !== 0
  ) {
    fail("hallo_phrase_absence_proof");
  }
  if (
    value.resolutionRoute !==
    "NEW_EXACT_AUTHORITY_OR_VERSIONED_TASK5_TASK6_REPAIR"
  ) {
    fail("hallo_phrase_resolution_route");
  }

  record(value.authority, "hallo_phrase_authority");
  exactKeys(
    value.authority,
    [
      "canonicalAdmission",
      "inventoryResolutionApplied",
      "task7Unlock",
      "preauthoringAuthority",
      "learnerFacing",
      "releaseAuthorized",
      "consumerCutover",
    ],
    "hallo_phrase_authority",
  );
  if (
    value.authority.canonicalAdmission !== false ||
    value.authority.inventoryResolutionApplied !== false ||
    value.authority.task7Unlock !== false ||
    value.authority.preauthoringAuthority !== false ||
    value.authority.learnerFacing !== false ||
    value.authority.releaseAuthorized !== false ||
    value.authority.consumerCutover !== "NONE"
  ) {
    fail("hallo_phrase_hold_boundary");
  }

  record(value.inventory, "hallo_phrase_inventory");
  exactKeys(
    value.inventory,
    [
      "resolvedPlanIds",
      "unresolvedPlanIds",
      "packetIds",
      "materializedPackets",
    ],
    "hallo_phrase_inventory",
  );
  if (
    value.inventory.resolvedPlanIds !== 6 ||
    value.inventory.unresolvedPlanIds !== 282 ||
    value.inventory.packetIds !== 1792 ||
    value.inventory.materializedPackets !== 0
  ) {
    fail("hallo_phrase_inventory");
  }
}

function assertTask5Plan(task5: JsonRecord): void {
  if (!Array.isArray(task5.lessons)) fail("hallo_phrase_task5_plan");
  const lesson = task5.lessons.find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as JsonRecord).lessonId === "de_l01",
  ) as JsonRecord | undefined;
  record(lesson, "hallo_phrase_task5_plan");
  if (!Array.isArray(lesson.chapters)) fail("hallo_phrase_task5_plan");
  const chapter = lesson.chapters.find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as JsonRecord).id === "de_l01_c01",
  ) as JsonRecord | undefined;
  record(chapter, "hallo_phrase_task5_plan");
  record(chapter.checkpoint, "hallo_phrase_task5_plan");
  if (!Array.isArray(chapter.checkpoint.plannedNewLexicalSenses)) {
    fail("hallo_phrase_task5_plan");
  }
  const plan = chapter.checkpoint.plannedNewLexicalSenses.find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as JsonRecord).id === "de_lex_plan_l01_c01_hallo_v1",
  ) as JsonRecord | undefined;
  record(plan, "hallo_phrase_task5_plan");
  if (
    plan.semanticIdentity !== "hallo|neutral informal greeting on meeting" ||
    plan.senseGloss !== "neutral informal greeting on meeting" ||
    plan.communicativeUse !== "open a first contact with a neighbour"
  ) {
    fail("hallo_phrase_task5_plan");
  }
}

function assertTask6Frame(task6: JsonRecord): void {
  record(task6.registry, "hallo_phrase_task6_frame");
  if (!Array.isArray(task6.registry.phraseFrames)) {
    fail("hallo_phrase_task6_frame");
  }
  const frames = task6.registry.phraseFrames.filter(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as JsonRecord).id === "de_pf_l01_c01_hallo_nachbarin_v1",
  ) as JsonRecord[];
  if (frames.length !== 1) fail("hallo_phrase_task6_frame");
  const frame = frames[0];
  exactKeys(
    frame,
    [
      "id",
      "frame",
      "grammarConstructIds",
      "lexicalSenseIds",
      "communicativeOutcomeIds",
      "forbiddenSurfaceFormIds",
      "evidenceIds",
    ],
    "hallo_phrase_task6_frame",
  );
  if (
    frame.frame !== EXACT_PHRASE ||
    !Array.isArray(frame.evidenceIds) ||
    frame.evidenceIds.length !== 1 ||
    frame.evidenceIds[0] !== "DE-RSCH-CEFR-003"
  ) {
    fail("hallo_phrase_task6_frame");
  }
}

function assertSourceClaims(
  manifest: JsonRecord,
  extraction: JsonRecord,
): void {
  record(manifest.fieldSupport, "hallo_phrase_source_claims");
  record(manifest.fieldSupport.supportedClaims, "hallo_phrase_source_claims");
  record(manifest.fieldSupport.unsupportedClaims, "hallo_phrase_source_claims");
  if (
    manifest.fieldSupport.supportedClaims.greetingDefinitionGerman !==
      "Anrede zur Begrüßung" ||
    manifest.fieldSupport.unsupportedClaims.neutralRegister !==
      "UNSUPPORTED_BY_CAPTURED_SOURCES"
  ) {
    fail("hallo_phrase_source_claims");
  }
  record(extraction.extractions, "hallo_phrase_source_claims");
  record(extraction.extractions.dwdsGreeting, "hallo_phrase_source_claims");
  record(extraction.extractions.goetheOccurrence, "hallo_phrase_source_claims");
  if (
    extraction.extractions.dwdsGreeting.exactDefinitionGerman !==
      "Anrede zur Begrüßung" ||
    extraction.extractions.goetheOccurrence.text !== "Guten Tag! / Hallo!"
  ) {
    fail("hallo_phrase_source_claims");
  }
}

function assertAbsenceAndRegister(evidenceRoot: string): void {
  const artifacts = [
    "raw/dwds_hallo_interjection.html",
    "raw/dwds_Hallo_noun.html",
    "raw/goethe_a1_redemittel.pdf",
    "extraction_map.json",
  ] as const;
  for (const relative of artifacts) {
    const target = path.resolve(evidenceRoot, relative);
    if (!target.startsWith(`${path.resolve(evidenceRoot)}${path.sep}`)) {
      fail("hallo_phrase_evidence_path");
    }
    if (fs.readFileSync(target).includes(Buffer.from(EXACT_PHRASE, "utf8"))) {
      fail("hallo_phrase_exact_attestation_present");
    }
  }
  const dwds = fs.readFileSync(
    path.join(evidenceRoot, "raw/dwds_hallo_interjection.html"),
    "utf8",
  );
  if (
    !/id="d-1-1"[\s\S]*?dwdswb-stilebene">umgangssprachlich<[\s\S]*?id="d-1-1-2"[\s\S]*?Anrede zur Begrüßung/u.test(
      dwds,
    )
  ) {
    fail("hallo_phrase_dwds_register");
  }
}

export function inspectGermanTask7V2L01C01HalloPhraseAuthorityHoldDeV1(
  options: GermanTask7V2L01C01HalloPhraseAuthorityInspectionOptionsDeV1 = {},
): GermanTask7V2L01C01HalloPhraseAuthorityHoldDeV1 {
  const task5Path = options.task5PathForTest ?? TASK5_PATH;
  const task6V2Path = options.task6V2PathForTest ?? TASK6_V2_PATH;
  const sourceManifestPath =
    options.sourceManifestPathForTest ?? SOURCE_MANIFEST_PATH;
  const extractionPath = options.extractionPathForTest ?? EXTRACTION_PATH;
  const sourceValidatorPath =
    options.sourceValidatorPathForTest ?? SOURCE_VALIDATOR_PATH;
  const inventoryPath = options.inventoryPathForTest ?? INVENTORY_PATH;
  const evidenceRoot = options.boundEvidenceRootForTest ?? BOUND_EVIDENCE_ROOT;
  const packetPath = options.packetPathForTest ?? PACKET_PATH;

  const task5 = parseJson(
    readBoundBytes(
      task5Path,
      INPUTS.task5V2.sha256,
      "hallo_phrase_task5_input_drift",
    ),
    "hallo_phrase_task5_json",
  );
  const task6V2 = parseJson(
    readBoundBytes(
      task6V2Path,
      INPUTS.task6V2Canonical.sha256,
      "hallo_phrase_task6_v2_input_drift",
    ),
    "hallo_phrase_task6_v2_json",
  );
  const sourceManifest = parseJson(
    readBoundBytes(
      sourceManifestPath,
      INPUTS.sourceManifest.sha256,
      "hallo_phrase_source_manifest_input_drift",
    ),
    "hallo_phrase_source_manifest_json",
  );
  const extraction = parseJson(
    readBoundBytes(
      extractionPath,
      INPUTS.sourceExtraction.sha256,
      "hallo_phrase_extraction_input_drift",
    ),
    "hallo_phrase_extraction_json",
  );
  readBoundBytes(
    sourceValidatorPath,
    INPUTS.sourceValidator.sha256,
    "hallo_phrase_source_validator_input_drift",
  );
  const inventory = parseJson(
    readBoundBytes(
      inventoryPath,
      INPUTS.allocationInventory.sha256,
      "hallo_phrase_inventory_input_drift",
    ),
    "hallo_phrase_inventory_json",
  );
  const adjudication = parseJson(
    fs.readFileSync(options.adjudicationPathForTest ?? ADJUDICATION_PATH),
    "hallo_phrase_adjudication_json",
  );

  validateAdjudication(adjudication);
  assertTask5Plan(task5);
  assertTask6Frame(task6V2);
  assertSourceClaims(sourceManifest, extraction);
  assertAbsenceAndRegister(evidenceRoot);
  if (fs.existsSync(packetPath)) {
    fail("hallo_phrase_packet_materialization_forbidden");
  }
  inspectGermanTask7V2L01C01HalloSourceAllocationDeV1({
    evidenceRootForTest: evidenceRoot,
    task5PathForTest: task5Path,
    inventoryPathForTest: inventoryPath,
    packetPathForTest: packetPath,
  });

  record(inventory.counts, "hallo_phrase_inventory");
  if (
    inventory.counts.resolvedPlanIds !== 6 ||
    inventory.counts.unresolvedPlanIds !== 282 ||
    inventory.counts.packetIds !== 1792 ||
    inventory.counts.materializedPackets !== 0
  ) {
    fail("hallo_phrase_inventory");
  }
  const scope = adjudication.scope as JsonRecord;
  const findings = adjudication.findings as JsonRecord;
  const authority = adjudication.authority as JsonRecord;
  const adjudicationInventory = adjudication.inventory as JsonRecord;
  return deepFreeze({
    status: "HOLD" as const,
    decision: "EXACT_PHRASE_AUTHORITY_NOT_ESTABLISHED" as const,
    sessionId: scope.sessionId as "de_l01_s01",
    phraseContextId:
      scope.phraseContextId as "de_pf_l01_c01_hallo_nachbarin_v1",
    exactPhrase: scope.exactPhrase as "Hallo, Nachbarin!",
    greetingFunction: findings.greetingFunction as "SUPPORTED",
    dwdsRegisterLabel:
      findings.dwdsRegisterLabel as "UMGANGSSPRACHLIC_SUPPORTED",
    neutralRegister: findings.neutralRegister as "UNVERIFIED",
    exactPhraseAttestation:
      findings.exactPhraseAttestation as "ABSENT_FROM_BOUND_EVIDENCE",
    phraseNaturalness: findings.phraseNaturalness as "UNVERIFIED",
    nativePhraseJudgement: findings.nativePhraseJudgement as "REQUIRED",
    resolutionRoute:
      adjudication.resolutionRoute as "NEW_EXACT_AUTHORITY_OR_VERSIONED_TASK5_TASK6_REPAIR",
    canonicalAdmission: authority.canonicalAdmission as false,
    inventoryResolutionApplied: authority.inventoryResolutionApplied as false,
    task7Unlock: authority.task7Unlock as false,
    preauthoringAuthority: authority.preauthoringAuthority as false,
    learnerFacing: authority.learnerFacing as false,
    releaseAuthorized: authority.releaseAuthorized as false,
    consumerCutover: authority.consumerCutover as "NONE",
    inventory: {
      resolvedPlanIds: adjudicationInventory.resolvedPlanIds as 6,
      unresolvedPlanIds: adjudicationInventory.unresolvedPlanIds as 282,
      packetIds: adjudicationInventory.packetIds as 1792,
      materializedPackets: adjudicationInventory.materializedPackets as 0,
    },
  });
}
