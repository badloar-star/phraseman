import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { inspectGermanTask7V2L01C02TschuessSourceHoldDeV1 } from "./task7_v2_l01_c02_tschuess_source_hold_de_v1";

type RecordValue = Record<string, unknown>;
export type GermanTask7V2L01C02TschuessAdmissionAdjudicationHoldDeV1 =
  Readonly<{
    status: "HOLD";
    decision: "CANONICAL_ADMISSION_WITHHELD_MISSING_REQUIRED_AUTHORITIES";
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
export type GermanTask7V2L01C02TschuessAdmissionOptionsDeV1 = Readonly<{
  adjudicationPathForTest?: string;
  sourceEvidenceRootForTest?: string;
  task5PathForTest?: string;
  inventoryPathForTest?: string;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const ADJUDICATION_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c02_tschuess_admission_adjudication_hold_v1/adjudication.json",
);
const BINDINGS = Object.freeze({
  task5V2: [
    "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
    "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23",
  ],
  sourceHoldValidator: [
    "modules/learning-v2/curriculum/de/task7_v2_l01_c02_tschuess_source_hold_de_v1.ts",
    "f0b2804c6bd099fd388ceb6aa7bfe2a71c89e238c84622e0632a7a4a996c7993",
  ],
  sourceManifest: [
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c02_tschuess_source_hold_v1/manifest.json",
    "d7aa6eed248a5d24c57eafcfdbf4560d433e985fc0a054a86c9836f38fadd612",
  ],
  sourceExtractionMap: [
    "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c02_tschuess_source_hold_v1/extraction_map.json",
    "072ae39ffa27ca489d4152bac243dd2ee50de90765d3089dd8f87b7d48d6d0fe",
  ],
  allocationInventory: [
    "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
    "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415",
  ],
} as const);
function fail(code: string): never {
  throw new Error(code);
}
function record(value: unknown, code: string): asserts value is RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(code);
}
function keys(
  value: RecordValue,
  expected: readonly string[],
  code: string,
): void {
  if (Object.keys(value).sort().join("\0") !== [...expected].sort().join("\0"))
    fail(code);
}
function sha256(value: Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function readJson(file: string, code: string): RecordValue {
  try {
    const value: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    record(value, code);
    return value;
  } catch {
    fail(code);
  }
}
function boundFile(relative: string, digest: string, override?: string): void {
  const file = override ?? path.join(ROOT, relative);
  if (sha256(fs.readFileSync(file)) !== digest)
    fail("tschuss_admission_input_drift");
}
function assertNoOutput(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertNoOutput);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (
      [
        "canonicalSenseId",
        "packetOutputPath",
        "releasePath",
        "ownerApproval",
      ].includes(key)
    )
      fail("tschuss_admission_output_forbidden");
    assertNoOutput(child);
  }
}

export function inspectGermanTask7V2L01C02TschuessAdmissionAdjudicationHoldDeV1(
  options: GermanTask7V2L01C02TschuessAdmissionOptionsDeV1 = {},
): GermanTask7V2L01C02TschuessAdmissionAdjudicationHoldDeV1 {
  boundFile(BINDINGS.task5V2[0], BINDINGS.task5V2[1], options.task5PathForTest);
  boundFile(BINDINGS.sourceHoldValidator[0], BINDINGS.sourceHoldValidator[1]);
  boundFile(BINDINGS.sourceManifest[0], BINDINGS.sourceManifest[1]);
  boundFile(BINDINGS.sourceExtractionMap[0], BINDINGS.sourceExtractionMap[1]);
  boundFile(
    BINDINGS.allocationInventory[0],
    BINDINGS.allocationInventory[1],
    options.inventoryPathForTest,
  );
  inspectGermanTask7V2L01C02TschuessSourceHoldDeV1({
    evidenceRootForTest: options.sourceEvidenceRootForTest,
  });
  const value = readJson(
    options.adjudicationPathForTest ?? ADJUDICATION_PATH,
    "tschuss_admission_json",
  );
  assertNoOutput(value);
  keys(
    value,
    [
      "schemaVersion",
      "status",
      "decision",
      "scope",
      "inputBindings",
      "sourceFindings",
      "fieldSupportMatrix",
      "requiredAuthorities",
      "authority",
      "inventory",
      "resolutionRoute",
    ],
    "tschuss_admission_schema",
  );
  if (
    value.schemaVersion !==
      "learning-v2-de-task7-v2-l01-c02-tschuess-admission-adjudication-hold.v1" ||
    value.status !== "HOLD" ||
    value.decision !==
      "CANONICAL_ADMISSION_WITHHELD_MISSING_REQUIRED_AUTHORITIES"
  )
    fail("tschuss_admission_status");
  record(value.scope, "tschuss_admission_scope");
  keys(
    value.scope,
    [
      "targetLanguage",
      "sourcePlanId",
      "checkpointPacketId",
      "chapterId",
      "sessionId",
    ],
    "tschuss_admission_scope",
  );
  if (
    value.scope.targetLanguage !== "de" ||
    value.scope.sourcePlanId !== "de_lex_plan_l01_c02_tschuess_v1" ||
    value.scope.checkpointPacketId !== "de_l01_c02_s16" ||
    value.scope.chapterId !== "de_l01_c02" ||
    value.scope.sessionId !== "de_l01_s02"
  )
    fail("tschuss_admission_scope");
  record(value.inputBindings, "tschuss_admission_bindings");
  keys(
    value.inputBindings,
    Object.keys(BINDINGS),
    "tschuss_admission_bindings",
  );
  for (const [name, binding] of Object.entries(BINDINGS)) {
    record(value.inputBindings[name], "tschuss_admission_bindings");
    keys(
      value.inputBindings[name],
      ["path", "sha256"],
      "tschuss_admission_bindings",
    );
    if (
      value.inputBindings[name].path !== binding[0] ||
      value.inputBindings[name].sha256 !== binding[1]
    )
      fail("tschuss_admission_bindings");
  }
  record(value.sourceFindings, "tschuss_admission_findings");
  keys(
    value.sourceFindings,
    [
      "lemma",
      "partOfSpeech",
      "register",
      "meaning",
      "neutralRegister",
      "officialPedagogicalOccurrence",
    ],
    "tschuss_admission_findings",
  );
  if (
    value.sourceFindings.lemma !== "Tschüss" ||
    value.sourceFindings.partOfSpeech !== "Interjektion" ||
    value.sourceFindings.register !== "UMGANGSSPRACHLICH_SUPPORTED" ||
    value.sourceFindings.meaning !== "LEBE_WOHL_AUF_WIEDERSEHEN_SUPPORTED" ||
    value.sourceFindings.neutralRegister !==
      "UNSUPPORTED_BY_CAPTURED_SOURCES" ||
    value.sourceFindings.officialPedagogicalOccurrence !==
      "NOT_EXTRACTED_NO_TEXT_LOCATOR_IN_THIS_PACKET"
  )
    fail("tschuss_admission_findings");
  if (
    !Array.isArray(value.fieldSupportMatrix) ||
    value.fieldSupportMatrix.length !== 5
  )
    fail("tschuss_admission_matrix");
  const matrix = value.fieldSupportMatrix;
  if (
    !(matrix[0] as RecordValue).value ||
    (matrix[3] as RecordValue).support !== "UNSUPPORTED" ||
    (matrix[4] as RecordValue).support !== "NOT_EXTRACTED"
  )
    fail("tschuss_admission_matrix");
  record(value.requiredAuthorities, "tschuss_admission_authorities");
  keys(
    value.requiredAuthorities,
    [
      "sourceCharacterization",
      "task6CanonicalAllocation",
      "inventoryResolutionTransaction",
      "task7WholeCourseAuthority",
    ],
    "tschuss_admission_authorities",
  );
  if (
    value.requiredAuthorities.sourceCharacterization !==
      "SATISFIED_SOURCE_HOLD_ONLY" ||
    value.requiredAuthorities.task6CanonicalAllocation !== "MISSING" ||
    value.requiredAuthorities.inventoryResolutionTransaction !== "MISSING" ||
    value.requiredAuthorities.task7WholeCourseAuthority !== "MISSING"
  )
    fail("tschuss_admission_authorities");
  record(value.authority, "tschuss_admission_boundary");
  keys(
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
    "tschuss_admission_boundary",
  );
  if (
    value.authority.canonicalAdmission !== false ||
    value.authority.inventoryResolutionApplied !== false ||
    value.authority.task7Unlock !== false ||
    value.authority.preauthoringAuthority !== false ||
    value.authority.learnerFacing !== false ||
    value.authority.releaseAuthorized !== false ||
    value.authority.consumerCutover !== "NONE"
  )
    fail("tschuss_admission_boundary");
  record(value.inventory, "tschuss_admission_inventory");
  if (
    value.inventory.resolvedPlanIds !== 6 ||
    value.inventory.unresolvedPlanIds !== 282 ||
    value.inventory.packetIds !== 1792 ||
    value.inventory.materializedPackets !== 0
  )
    fail("tschuss_admission_inventory");
  if (
    value.resolutionRoute !==
    "VERSIONED_TASK6_ALLOCATION_AND_INVENTORY_TRANSACTION_AFTER_REQUIRED_AUTHORITIES"
  )
    fail("tschuss_admission_route");
  return Object.freeze({
    status: "HOLD",
    decision: "CANONICAL_ADMISSION_WITHHELD_MISSING_REQUIRED_AUTHORITIES",
    canonicalAdmission: false,
    inventoryResolutionApplied: false,
    task7Unlock: false,
    preauthoringAuthority: false,
    learnerFacing: false,
    releaseAuthorized: false,
    consumerCutover: "NONE",
    inventory: Object.freeze({
      resolvedPlanIds: 6,
      unresolvedPlanIds: 282,
      packetIds: 1792,
      materializedPackets: 0,
    }),
  });
}
