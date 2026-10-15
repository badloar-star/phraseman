import {
  GERMAN_TASK7_V2_L01_C04_BUERO_SOURCE_HOLD_EVIDENCE_DE_V1,
  inspectGermanTask7V2L01C04BueroSourceHoldDeV1,
} from "./task7_v2_l01_c04_buero_source_hold_de_v1";

type RecordValue = Record<string, unknown>;

export type GermanTask7V2L01C04BueroCanonicalAdmissionHoldDeV1 = Readonly<{
  status: "HOLD";
  planId: "de_lex_plan_l01_c04_buero_v1";
  checkpointPacketId: "de_l01_c04_s32";
  lemmaOrExpression: "Büro";
  sourceEvidence: Readonly<{
    authority: "Task6 retained direct-HTTPS registry";
    verifiedFact: "GENERAL_OFFICE_SENSE_ONLY";
    freshDwdsCapture: false;
  }>;
  authority: Readonly<{
    generalOfficeSenseOnly: true;
    caretakerScene: false;
    register: false;
    naturalness: false;
    learnerPhrase: false;
  }>;
  output: Readonly<{
    canonical: false;
    inventory: false;
    task7: false;
    preauthoring: false;
    learner: false;
    release: false;
    cutover: "NONE";
  }>;
}>;

export type GermanTask7V2L01C04BueroCanonicalAdmissionHoldOptionsDeV1 =
  Readonly<{ sourceEvidenceRootForTest?: string }>;

function fail(code: string, detail?: string): never {
  throw new Error(detail === undefined ? code : `${code}:${detail}`);
}
function record(value: unknown): asserts value is RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("buero_admission_shape");
}
function closed(value: RecordValue, keys: readonly string[]): void {
  if (Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0"))
    fail("buero_admission_shape");
}
function equal(value: unknown, expected: unknown, detail: string): void {
  if (value !== expected) fail("buero_admission_source_evidence_drift", detail);
}

export function inspectGermanTask7V2L01C04BueroCanonicalAdmissionHoldDeV1(
  input: unknown,
  options: GermanTask7V2L01C04BueroCanonicalAdmissionHoldOptionsDeV1 = {},
): GermanTask7V2L01C04BueroCanonicalAdmissionHoldDeV1 {
  inspectGermanTask7V2L01C04BueroSourceHoldDeV1({
    evidenceRootForTest: options.sourceEvidenceRootForTest,
  });
  record(input);
  closed(input, [
    "status", "planId", "checkpointPacketId", "lemmaOrExpression",
    "sourceEvidence", "authority", "output",
  ]);
  const source = GERMAN_TASK7_V2_L01_C04_BUERO_SOURCE_HOLD_EVIDENCE_DE_V1;
  equal(input.status, "HOLD", "status");
  equal(input.planId, source.planId, "planId");
  equal(input.checkpointPacketId, source.checkpointPacketId, "checkpointPacketId");
  equal(input.lemmaOrExpression, source.lemmaOrExpression, "lemmaOrExpression");
  record(input.sourceEvidence);
  closed(input.sourceEvidence, ["authority", "verifiedFact", "freshDwdsCapture"]);
  equal(input.sourceEvidence.authority, source.authority, "authority");
  equal(input.sourceEvidence.verifiedFact, source.verifiedFact, "verifiedFact");
  equal(input.sourceEvidence.freshDwdsCapture, source.freshDwdsCapture, "freshDwdsCapture");
  record(input.authority);
  closed(input.authority, ["generalOfficeSenseOnly", "caretakerScene", "register", "naturalness", "learnerPhrase"]);
  equal(input.authority.generalOfficeSenseOnly, true, "generalOfficeSenseOnly");
  if (input.authority.caretakerScene !== false) fail("buero_admission_unsupported_caretaker_scene");
  if (input.authority.register !== false) fail("buero_admission_unsupported_register");
  if (input.authority.naturalness !== false) fail("buero_admission_unsupported_naturalness");
  if (input.authority.learnerPhrase !== false) fail("buero_admission_unsupported_learner_phrase");
  record(input.output);
  closed(input.output, ["canonical", "inventory", "task7", "preauthoring", "learner", "release", "cutover"]);
  for (const key of ["canonical", "inventory", "task7", "preauthoring", "learner", "release"] as const) {
    if (input.output[key] !== false) fail("buero_admission_hold_output", key);
  }
  if (input.output.cutover !== "NONE") fail("buero_admission_hold_output", "cutover");
  return Object.freeze(structuredClone(input)) as GermanTask7V2L01C04BueroCanonicalAdmissionHoldDeV1;
}

export const GERMAN_TASK7_V2_L01_C04_BUERO_CANONICAL_ADMISSION_HOLD_DE_V1 =
  inspectGermanTask7V2L01C04BueroCanonicalAdmissionHoldDeV1({
    status: "HOLD",
    planId: "de_lex_plan_l01_c04_buero_v1",
    checkpointPacketId: "de_l01_c04_s32",
    lemmaOrExpression: "Büro",
    sourceEvidence: {
      authority: "Task6 retained direct-HTTPS registry",
      verifiedFact: "GENERAL_OFFICE_SENSE_ONLY",
      freshDwdsCapture: false,
    },
    authority: {
      generalOfficeSenseOnly: true,
      caretakerScene: false,
      register: false,
      naturalness: false,
      learnerPhrase: false,
    },
    output: {
      canonical: false,
      inventory: false,
      task7: false,
      preauthoring: false,
      learner: false,
      release: false,
      cutover: "NONE",
    },
  });
