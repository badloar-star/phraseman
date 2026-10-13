import {
  GERMAN_TASK7_V2_L01_C05_DAS_IST_SOURCE_HOLD_DE_V1,
  inspectGermanTask7V2L01C05DasIstSourceHoldDeV1,
} from "./task7_v2_l01_c05_das_ist_source_hold_de_v1";

type RecordValue = Record<string, unknown>;

export type GermanTask7V2L01C05DasIstCanonicalAdmissionHoldDeV1 = Readonly<{
  status: "HOLD";
  sourceHold: typeof GERMAN_TASK7_V2_L01_C05_DAS_IST_SOURCE_HOLD_DE_V1;
  sourceEvidence: Readonly<{
    headword: "sein";
    verifiedForm: "ist";
    checkpointPacketId: "de_l01_c05_s40";
    exactLearnerPhrase: "NOT_CLAIMED:_CAPTURE_DOES_NOT_PROVE_THE_EXACT_CASED_PHRASE_DAS_IST";
  }>;
  authority: Readonly<{
    canonicalAdmission: false;
    inventoryResolutionApplied: false;
    task7Unlock: false;
    preauthoringAuthority: false;
    learnerFacing: false;
    releaseAuthorized: false;
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

function fail(code: string, detail?: string): never {
  throw new Error(detail === undefined ? code : `${code}:${detail}`);
}
function record(value: unknown): asserts value is RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("das_ist_admission_shape");
}
function closed(value: RecordValue, keys: readonly string[]): void {
  if (Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0"))
    fail("das_ist_admission_shape");
}
function equal(value: unknown, expected: unknown, detail: string): void {
  if (value !== expected) fail("das_ist_admission_source_evidence_drift", detail);
}

export function inspectGermanTask7V2L01C05DasIstCanonicalAdmissionHoldDeV1(
  input: unknown,
): GermanTask7V2L01C05DasIstCanonicalAdmissionHoldDeV1 {
  inspectGermanTask7V2L01C05DasIstSourceHoldDeV1();
  record(input);
  closed(input, ["status", "sourceHold", "sourceEvidence", "authority", "output"]);
  equal(input.status, "HOLD", "status");

  record(input.sourceHold);
  const sourceHold = GERMAN_TASK7_V2_L01_C05_DAS_IST_SOURCE_HOLD_DE_V1;
  closed(input.sourceHold, Object.keys(sourceHold));
  for (const [key, value] of Object.entries(sourceHold)) {
    equal(input.sourceHold[key], value, `sourceHold.${key}`);
  }

  record(input.sourceEvidence);
  closed(input.sourceEvidence, [
    "headword", "verifiedForm", "checkpointPacketId", "exactLearnerPhrase",
  ]);
  equal(input.sourceEvidence.headword, "sein", "headword");
  equal(input.sourceEvidence.verifiedForm, "ist", "verifiedForm");
  equal(input.sourceEvidence.checkpointPacketId, sourceHold.checkpointPacketId, "checkpointPacketId");
  if (input.sourceEvidence.exactLearnerPhrase !== "NOT_CLAIMED:_CAPTURE_DOES_NOT_PROVE_THE_EXACT_CASED_PHRASE_DAS_IST")
    fail("das_ist_admission_exact_phrase_not_claimed");

  record(input.authority);
  closed(input.authority, [
    "canonicalAdmission", "inventoryResolutionApplied", "task7Unlock",
    "preauthoringAuthority", "learnerFacing", "releaseAuthorized",
  ]);
  for (const key of Object.keys(input.authority)) {
    if (input.authority[key] !== false)
      fail("das_ist_admission_authority_forbidden", key);
  }

  record(input.output);
  closed(input.output, [
    "canonical", "inventory", "task7", "preauthoring", "learner", "release", "cutover",
  ]);
  for (const key of ["canonical", "inventory", "task7", "preauthoring", "learner", "release"] as const) {
    if (input.output[key] !== false)
      fail("das_ist_admission_output_forbidden", key);
  }
  if (input.output.cutover !== "NONE")
    fail("das_ist_admission_output_forbidden", "cutover");

  return Object.freeze(structuredClone(input)) as GermanTask7V2L01C05DasIstCanonicalAdmissionHoldDeV1;
}

export const GERMAN_TASK7_V2_L01_C05_DAS_IST_CANONICAL_ADMISSION_HOLD_DE_V1 =
  inspectGermanTask7V2L01C05DasIstCanonicalAdmissionHoldDeV1({
    status: "HOLD",
    sourceHold: GERMAN_TASK7_V2_L01_C05_DAS_IST_SOURCE_HOLD_DE_V1,
    sourceEvidence: {
      headword: "sein",
      verifiedForm: "ist",
      checkpointPacketId: "de_l01_c05_s40",
      exactLearnerPhrase: "NOT_CLAIMED:_CAPTURE_DOES_NOT_PROVE_THE_EXACT_CASED_PHRASE_DAS_IST",
    },
    authority: {
      canonicalAdmission: false,
      inventoryResolutionApplied: false,
      task7Unlock: false,
      preauthoringAuthority: false,
      learnerFacing: false,
      releaseAuthorized: false,
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
