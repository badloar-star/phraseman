import {
  GERMAN_TASK7_V2_L01_C06_HAUSMEISTER_SOURCE_HOLD_DE_V1,
  inspectGermanTask7V2L01C06HausmeisterSourceHoldDeV1,
} from "./task7_v2_l01_c06_hausmeister_source_hold_de_v1";

type RecordValue = Record<string, unknown>;

type PinnedArtifact = Readonly<{
  path: string;
  byteLength: number;
  sha256: string;
}>;

export type GermanTask7V2L01C06HausmeisterCanonicalAdmissionHoldDeV1 =
  Readonly<{
    status: "HOLD";
    sourceHold: typeof GERMAN_TASK7_V2_L01_C06_HAUSMEISTER_SOURCE_HOLD_DE_V1;
    pinnedArtifacts: readonly PinnedArtifact[];
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

const PINNED_ARTIFACTS = [
  {
    path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_hausmeister_source_hold_v1/extraction_map.json",
    byteLength: 1651,
    sha256: "de6cf30b0ee672964555d2a0a89bedd35c03e8a81a5c90d3dedbdf9daae9da49",
  },
  {
    path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_hausmeister_source_hold_v1/manifest.json",
    byteLength: 1830,
    sha256: "5d74697456a20325d4306ffe2a427b013aabde114e3e9faef3ac27e7a2e5581f",
  },
  {
    path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_hausmeister_source_hold_v1/raw/de_lex_plan_l01_c06_hausmeister_v1.html",
    byteLength: 59173,
    sha256: "ce5d7d3b6648662579068c4702d6fb252f21e165eafa043b569a1b822346a538",
  },
  {
    path: "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_hausmeister_source_hold_v1/raw/de_lex_plan_l01_c06_hausmeister_v1.http_metadata.txt",
    byteLength: 520,
    sha256: "365da893f5c85cb11a2928bb365cbc3835fbfafac8ee5c1e6c9c07ef3a787168",
  },
  {
    path: "modules/learning-v2/curriculum/de/task7_v2_l01_c06_hausmeister_source_hold_de_v1.ts",
    byteLength: 10227,
    sha256: "205a4dcdd5f1466abe8bef5a5657c7e078f3ebd4e7f172453985a26cfccff00d",
  },
  {
    path: "tests/learning_v2_de_task7_v2_l01_c06_hausmeister_source_hold_gate.ts",
    byteLength: 2736,
    sha256: "fa0d0a33e98526d34209566b833753a6acd918b10d0898a0cf0d682165ac20bd",
  },
  {
    path: "scripts/guard_learning_v2_de_task7_v2_l01_c06_hausmeister_scope.mjs",
    byteLength: 4162,
    sha256: "2655fe9af20621d3a78b772280f507e2356f71f50046901ed95e31020bbe66d6",
  },
  {
    path: "tests/learning_v2_de_task7_v2_l01_c06_hausmeister_scope_evidence_gate.ts",
    byteLength: 2733,
    sha256: "b3d04ebcbbc0277ae2086833d68f6539d46afefb7e932c3b75418276fcf073cf",
  },
] as const;

function fail(code: string, detail?: string): never {
  throw new Error(detail === undefined ? code : `${code}:${detail}`);
}
function record(value: unknown): asserts value is RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("hausmeister_admission_shape");
}
function closed(value: RecordValue, keys: readonly string[]): void {
  if (Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0"))
    fail("hausmeister_admission_shape");
}
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as RecordValue))
      deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

export function inspectGermanTask7V2L01C06HausmeisterCanonicalAdmissionHoldDeV1(
  input: unknown,
): GermanTask7V2L01C06HausmeisterCanonicalAdmissionHoldDeV1 {
  inspectGermanTask7V2L01C06HausmeisterSourceHoldDeV1();
  record(input);
  closed(input, [
    "status",
    "sourceHold",
    "pinnedArtifacts",
    "authority",
    "output",
  ]);
  if (input.status !== "HOLD") fail("hausmeister_admission_hold_required");

  record(input.sourceHold);
  for (const [key, value] of Object.entries(
    GERMAN_TASK7_V2_L01_C06_HAUSMEISTER_SOURCE_HOLD_DE_V1,
  )) {
    if (input.sourceHold[key] !== value)
      fail("hausmeister_admission_source_hold_drift", key);
  }

  if (
    !Array.isArray(input.pinnedArtifacts) ||
    input.pinnedArtifacts.length !== PINNED_ARTIFACTS.length
  )
    fail("hausmeister_admission_pinned_artifact_count");
  input.pinnedArtifacts.forEach((artifact, index) => {
    record(artifact);
    closed(artifact, ["path", "byteLength", "sha256"]);
    const expected = PINNED_ARTIFACTS[index];
    for (const key of ["path", "byteLength", "sha256"] as const) {
      if (artifact[key] !== expected[key])
        fail("hausmeister_admission_pinned_artifact_drift", `${index}.${key}`);
    }
  });

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
      fail("hausmeister_admission_authority_forbidden", key);
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
      fail("hausmeister_admission_output_forbidden", key);
  }
  if (input.output.cutover !== "NONE")
    fail("hausmeister_admission_output_forbidden", "cutover");

  return deepFreeze({
    status: "HOLD",
    sourceHold: GERMAN_TASK7_V2_L01_C06_HAUSMEISTER_SOURCE_HOLD_DE_V1,
    pinnedArtifacts: structuredClone(PINNED_ARTIFACTS),
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
  }) as GermanTask7V2L01C06HausmeisterCanonicalAdmissionHoldDeV1;
}

export const GERMAN_TASK7_V2_L01_C06_HAUSMEISTER_CANONICAL_ADMISSION_HOLD_DE_V1 =
  inspectGermanTask7V2L01C06HausmeisterCanonicalAdmissionHoldDeV1({
    status: "HOLD",
    sourceHold: GERMAN_TASK7_V2_L01_C06_HAUSMEISTER_SOURCE_HOLD_DE_V1,
    pinnedArtifacts: PINNED_ARTIFACTS,
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
