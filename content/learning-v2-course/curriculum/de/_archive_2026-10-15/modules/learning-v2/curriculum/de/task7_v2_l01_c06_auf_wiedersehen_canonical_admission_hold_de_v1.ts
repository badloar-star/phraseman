import {
  GERMAN_TASK7_V2_L01_C06_AUF_WIEDERSEHEN_SOURCE_HOLD_DE_V1,
  inspectGermanTask7V2L01C06AufWiedersehenSourceHoldDeV1,
} from "./task7_v2_l01_c06_auf_wiedersehen_source_hold_de_v1";

type RecordValue = Record<string, unknown>;

export type GermanTask7V2L01C06AufWiedersehenCanonicalAdmissionHoldDeV1 =
  Readonly<{
    status: "HOLD";
    sourceHold: typeof GERMAN_TASK7_V2_L01_C06_AUF_WIEDERSEHEN_SOURCE_HOLD_DE_V1;
    sourceEvidence: Readonly<{
      exactOccurrence: "Auf Wiedersehen! / Tschüs!";
      exactOccurrenceUtf8Bytes: 27;
      exactOccurrenceSha256: "fefa8907e7a90ccaa18b44c0aa3f5ce7829ccaed980c69e8f427902c3e692442";
      rawSha256: "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085";
      metadataSha256: "afa2a1f9de300071b9e885fb3ade745766b53d7f7bd5bee5732f188806db8f47";
      extractionMapSha256: "b55246c8274075182f3f534ae12470a0550cfbc79d128ac349d3fae5b0bb558e";
      manifestSha256: "360533cdb4ff0571850cbe807b6455e3393406a25327d91099d51e1218f3512a";
      neutralRegister: "UNSUPPORTED_BY_CAPTURED_SOURCE";
    }>;
    targetResolutions: 0;
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
    fail("auf_wiedersehen_admission_shape");
}
function closed(value: RecordValue, keys: readonly string[]): void {
  if (Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0"))
    fail("auf_wiedersehen_admission_shape");
}
function equal(value: unknown, expected: unknown, detail: string): void {
  if (value !== expected)
    fail("auf_wiedersehen_admission_source_evidence_drift", detail);
}

export function inspectGermanTask7V2L01C06AufWiedersehenCanonicalAdmissionHoldDeV1(
  input: unknown,
): GermanTask7V2L01C06AufWiedersehenCanonicalAdmissionHoldDeV1 {
  inspectGermanTask7V2L01C06AufWiedersehenSourceHoldDeV1();
  record(input);
  closed(input, [
    "status",
    "sourceHold",
    "sourceEvidence",
    "targetResolutions",
    "authority",
    "output",
  ]);
  equal(input.status, "HOLD", "status");

  record(input.sourceHold);
  const sourceHold = GERMAN_TASK7_V2_L01_C06_AUF_WIEDERSEHEN_SOURCE_HOLD_DE_V1;
  closed(input.sourceHold, Object.keys(sourceHold));
  for (const [key, value] of Object.entries(sourceHold)) {
    equal(input.sourceHold[key], value, `sourceHold.${key}`);
  }

  record(input.sourceEvidence);
  closed(input.sourceEvidence, [
    "exactOccurrence",
    "exactOccurrenceUtf8Bytes",
    "exactOccurrenceSha256",
    "rawSha256",
    "metadataSha256",
    "extractionMapSha256",
    "manifestSha256",
    "neutralRegister",
  ]);
  const sourceEvidence = {
    exactOccurrence: "Auf Wiedersehen! / Tschüs!",
    exactOccurrenceUtf8Bytes: 27,
    exactOccurrenceSha256:
      "fefa8907e7a90ccaa18b44c0aa3f5ce7829ccaed980c69e8f427902c3e692442",
    rawSha256:
      "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085",
    metadataSha256:
      "afa2a1f9de300071b9e885fb3ade745766b53d7f7bd5bee5732f188806db8f47",
    extractionMapSha256:
      "b55246c8274075182f3f534ae12470a0550cfbc79d128ac349d3fae5b0bb558e",
    manifestSha256:
      "360533cdb4ff0571850cbe807b6455e3393406a25327d91099d51e1218f3512a",
  } as const;
  for (const [key, value] of Object.entries(sourceEvidence)) {
    equal(input.sourceEvidence[key], value, key);
  }
  if (input.sourceEvidence.neutralRegister !== "UNSUPPORTED_BY_CAPTURED_SOURCE")
    fail("auf_wiedersehen_admission_unsupported_neutral_register");

  if (input.targetResolutions !== 0)
    fail("auf_wiedersehen_admission_target_resolutions_forbidden");

  record(input.authority);
  closed(input.authority, [
    "canonicalAdmission",
    "inventoryResolutionApplied",
    "task7Unlock",
    "preauthoringAuthority",
    "learnerFacing",
    "releaseAuthorized",
  ]);
  for (const key of Object.keys(input.authority)) {
    if (input.authority[key] !== false)
      fail("auf_wiedersehen_admission_authority_forbidden", key);
  }

  record(input.output);
  closed(input.output, [
    "canonical",
    "inventory",
    "task7",
    "preauthoring",
    "learner",
    "release",
    "cutover",
  ]);
  for (const key of [
    "canonical",
    "inventory",
    "task7",
    "preauthoring",
    "learner",
    "release",
  ] as const) {
    if (input.output[key] !== false)
      fail("auf_wiedersehen_admission_output_forbidden", key);
  }
  if (input.output.cutover !== "NONE")
    fail("auf_wiedersehen_admission_output_forbidden", "cutover");

  return Object.freeze(
    structuredClone(input),
  ) as GermanTask7V2L01C06AufWiedersehenCanonicalAdmissionHoldDeV1;
}

export const GERMAN_TASK7_V2_L01_C06_AUF_WIEDERSEHEN_CANONICAL_ADMISSION_HOLD_DE_V1 =
  inspectGermanTask7V2L01C06AufWiedersehenCanonicalAdmissionHoldDeV1({
    status: "HOLD",
    sourceHold: GERMAN_TASK7_V2_L01_C06_AUF_WIEDERSEHEN_SOURCE_HOLD_DE_V1,
    sourceEvidence: {
      exactOccurrence: "Auf Wiedersehen! / Tschüs!",
      exactOccurrenceUtf8Bytes: 27,
      exactOccurrenceSha256:
        "fefa8907e7a90ccaa18b44c0aa3f5ce7829ccaed980c69e8f427902c3e692442",
      rawSha256:
        "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085",
      metadataSha256:
        "afa2a1f9de300071b9e885fb3ade745766b53d7f7bd5bee5732f188806db8f47",
      extractionMapSha256:
        "b55246c8274075182f3f534ae12470a0550cfbc79d128ac349d3fae5b0bb558e",
      manifestSha256:
        "360533cdb4ff0571850cbe807b6455e3393406a25327d91099d51e1218f3512a",
      neutralRegister: "UNSUPPORTED_BY_CAPTURED_SOURCE",
    },
    targetResolutions: 0,
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
