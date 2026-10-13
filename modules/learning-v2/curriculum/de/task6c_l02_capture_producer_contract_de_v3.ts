import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

type JsonRecord = Record<string, unknown>;

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const TASK5_PATH =
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json";
const WORKFLOW_PATH =
  ".github/workflows/learning-v2-de-l02-capture-attestation.yml";
const EVIDENCE_ROOT_NAME = "learning-v2-de-task6c-l02-capture-v3";
const ARCHIVE_NAME = `${EVIDENCE_ROOT_NAME}.tar`;
const PREDICATE_NAME = `${EVIDENCE_ROOT_NAME}.predicate.json`;

const TASK5_BYTE_SHA256 =
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const TASK5_CANONICAL_BODY_SHA256 =
  "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3";
const PREDECESSOR_INPUT_DIGEST_SHA256 =
  "d241bc8dfbeb828712972d58e8070aedc7ab9f7f5edf88d143902d3ff3c1163a";
const PREDECESSOR_TRANSPORT_MODULE_SHA256 =
  "71dbacbe5c43ef32c956f8a8d1dc4c427c6ee8870232dc2bd07ea74f4afed752";
const PREDECESSOR_PREPARATION_SCRIPT_SHA256 =
  "84f32d2592cd8efdc8d7b764efe1d3e49cbe4cd7950e2717ed0b83919307192a";
const WORKFLOW_SHA256 =
  "5a0ed33bd69a70eee644e00266aecf0f35126ce1097f5f0d7f11d9fc6476b4a6";

const IMPLEMENTATION_PATHS = Object.freeze([
  "modules/learning-v2/curriculum/de/task6c_l02_capture_archive_de_v3.ts",
  "modules/learning-v2/curriculum/de/task6c_l02_capture_predicate_de_v3.ts",
  "modules/learning-v2/curriculum/de/task6c_l02_capture_producer_contract_de_v3.ts",
  "modules/learning-v2/curriculum/de/task6c_l02_capture_producer_de_v3.ts",
  "scripts/build_learning_v2_de_task6c_l02_capture_archive_v3.ts",
  "scripts/build_learning_v2_de_task6c_l02_capture_predicate_v3.ts",
  "scripts/produce_learning_v2_de_task6c_l02_capture_v3.ts",
] as const);

export const GERMAN_TASK6C_L02_CAPTURE_ROSTER_DE_V3 = Object.freeze([
  Object.freeze({
    sourcePlanId: "de_lex_plan_l02_c01_wohnen_v1",
    lemma: "wohnen",
    chapterId: "de_l02_c01",
    checkpointPacketId: "de_l02_c01_s08",
    sourceAnchor: "d-1-1",
    canonicalUrl: "https://www.dwds.de/wb/wohnen",
    outputSlug: "wohnen",
  }),
  Object.freeze({
    sourcePlanId: "de_lex_plan_l02_c01_kueche_v1",
    lemma: "Küche",
    chapterId: "de_l02_c01",
    checkpointPacketId: "de_l02_c01_s08",
    sourceAnchor: "d-1-1",
    canonicalUrl: "https://www.dwds.de/wb/K%C3%BCche",
    outputSlug: "kueche",
  }),
  Object.freeze({
    sourcePlanId: "de_lex_plan_l02_c02_tasse_v1",
    lemma: "Tasse",
    chapterId: "de_l02_c02",
    checkpointPacketId: "de_l02_c02_s16",
    sourceAnchor: "d-1-1",
    canonicalUrl: "https://www.dwds.de/wb/Tasse",
    outputSlug: "tasse",
  }),
  Object.freeze({
    sourcePlanId: "de_lex_plan_l02_c02_teller_v1",
    lemma: "Teller",
    chapterId: "de_l02_c02",
    checkpointPacketId: "de_l02_c02_s16",
    sourceAnchor: "d-1-1",
    canonicalUrl: "https://www.dwds.de/wb/Teller",
    outputSlug: "teller",
  }),
] as const);

export const GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3 = Object.freeze({
  method: "GET" as const,
  headers: Object.freeze({
    accept: "text/html,application/xhtml+xml",
    "accept-encoding": "gzip, br, deflate, identity",
    "user-agent": "Phraseman-Learning-V2-evidence/2.0",
  }),
  httpStack: "node:https" as const,
  automaticContentDecoding: false as const,
  redirectMode: "REJECT" as const,
  maxRedirects: 0 as const,
  exactScheme: "https:" as const,
  exactHost: "www.dwds.de" as const,
  exactPort: 443 as const,
  dnsPolicy: "ALL_RESOLVED_AND_CONNECTED_ADDRESSES_PUBLIC" as const,
  tlsPolicy: "AUTHORIZED_TLS_1_2_OR_1_3_EXACT_HOST" as const,
  allowedContentCodings: Object.freeze([
    "identity",
    "gzip",
    "br",
    "deflate",
  ] as const),
  headerNormalization:
    "RAW_HEADERS_TO_LOWERCASE_TRIM_OWS_SORT_NAME_VALUE_CANONICAL_JSON_LINE_V3" as const,
  encodedEntitySemantic:
    "CONTENT_CODED_ENTITY_BYTES_AFTER_TRANSFER_DECODING_BEFORE_CONTENT_DECODING" as const,
  decodedRepresentationSemantic: "DECODED_UTF8_REPRESENTATION_BYTES" as const,
  maximumEncodedBytes: 8 * 1024 * 1024,
  maximumDecodedBytes: 32 * 1024 * 1024,
  requestTimeoutMs: 15_000,
});

const EVIDENCE_FILE_ALLOWLIST = Object.freeze(
  [
    "manifest.json",
    ...GERMAN_TASK6C_L02_CAPTURE_ROSTER_DE_V3.flatMap(({ outputSlug }) => [
      `headers/${outputSlug}.normalized.json`,
      `encoded-entity/${outputSlug}.bin`,
      `decoded-representation/${outputSlug}.html`,
    ]),
  ].sort(),
);

export const GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3 = Object.freeze({
  task5: TASK5_PATH,
  workflow: WORKFLOW_PATH,
  evidenceRootName: EVIDENCE_ROOT_NAME,
  archiveName: ARCHIVE_NAME,
  predicateName: PREDICATE_NAME,
  evidenceFileAllowlist: EVIDENCE_FILE_ALLOWLIST,
});

export type GermanTask6cL02CaptureImplementationFileDeV3 = Readonly<{
  path: (typeof IMPLEMENTATION_PATHS)[number];
  sha256: string;
}>;

export type GermanTask6cL02CaptureRosterRowDeV3 =
  (typeof GERMAN_TASK6C_L02_CAPTURE_ROSTER_DE_V3)[number];

export type GermanTask6cL02CaptureProducerContractDeV3 = Readonly<{
  schemaVersion: "learning-v2-de-task6c-l02-capture-producer-contract.v3";
  targetLanguage: "de";
  predecessor: Readonly<{
    schemaVersion: "learning-v2-de-task6c-l02-capture-input-contract.v2";
    inputDigestSha256: typeof PREDECESSOR_INPUT_DIGEST_SHA256;
    transportModuleSha256: typeof PREDECESSOR_TRANSPORT_MODULE_SHA256;
    preparationScriptSha256: typeof PREDECESSOR_PREPARATION_SCRIPT_SHA256;
  }>;
  task5: Readonly<{
    path: typeof TASK5_PATH;
    byteSha256: typeof TASK5_BYTE_SHA256;
    canonicalBodySha256: typeof TASK5_CANONICAL_BODY_SHA256;
  }>;
  workflow: Readonly<{
    path: typeof WORKFLOW_PATH;
    sha256: typeof WORKFLOW_SHA256;
  }>;
  implementationFiles: readonly GermanTask6cL02CaptureImplementationFileDeV3[];
  roster: typeof GERMAN_TASK6C_L02_CAPTURE_ROSTER_DE_V3;
  networkPolicy: typeof GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3;
  inputDigestSha256: string;
}>;

function fail(code: string): never {
  throw new Error(code);
}

export function sha256GermanTask6cL02CaptureBytesDeV3(
  bytes: Buffer | string,
): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function canonicalizeGermanTask6cL02CaptureJsonDeV3(
  value: unknown,
): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeGermanTask6cL02CaptureJsonDeV3).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const object = value as JsonRecord;
    return `{${Object.keys(object)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalizeGermanTask6cL02CaptureJsonDeV3(object[key])}`,
      )
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value as string | number | boolean | null);
  if (serialized === undefined) fail("CAPTURE_V3_CANONICAL_JSON_INVALID");
  return serialized;
}

export function canonicalizeGermanTask6cL02CaptureJsonLineDeV3(
  value: unknown,
): Buffer {
  return Buffer.from(
    `${canonicalizeGermanTask6cL02CaptureJsonDeV3(value)}\n`,
    "utf8",
  );
}

function assertImplementationFiles(
  implementationFiles: readonly GermanTask6cL02CaptureImplementationFileDeV3[],
): void {
  if (
    implementationFiles.length !== IMPLEMENTATION_PATHS.length ||
    implementationFiles.some(
      (descriptor, index) =>
        descriptor.path !== IMPLEMENTATION_PATHS[index] ||
        !/^[0-9a-f]{64}$/u.test(descriptor.sha256),
    )
  ) {
    fail("CAPTURE_V3_IMPLEMENTATION_FILE_SET_INVALID");
  }
}

function unsignedContract(
  implementationFiles: readonly GermanTask6cL02CaptureImplementationFileDeV3[],
) {
  assertImplementationFiles(implementationFiles);
  return {
    schemaVersion:
      "learning-v2-de-task6c-l02-capture-producer-contract.v3" as const,
    targetLanguage: "de" as const,
    predecessor: Object.freeze({
      schemaVersion:
        "learning-v2-de-task6c-l02-capture-input-contract.v2" as const,
      inputDigestSha256: PREDECESSOR_INPUT_DIGEST_SHA256,
      transportModuleSha256: PREDECESSOR_TRANSPORT_MODULE_SHA256,
      preparationScriptSha256: PREDECESSOR_PREPARATION_SCRIPT_SHA256,
    }),
    task5: Object.freeze({
      path: TASK5_PATH,
      byteSha256: TASK5_BYTE_SHA256,
      canonicalBodySha256: TASK5_CANONICAL_BODY_SHA256,
    }),
    workflow: Object.freeze({
      path: WORKFLOW_PATH,
      sha256: WORKFLOW_SHA256,
    }),
    implementationFiles: Object.freeze(
      implementationFiles.map((descriptor) => Object.freeze({ ...descriptor })),
    ),
    roster: GERMAN_TASK6C_L02_CAPTURE_ROSTER_DE_V3,
    networkPolicy: GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3,
  };
}

export function computeGermanTask6cL02CaptureProducerInputDigestDeV3(
  implementationFiles: readonly GermanTask6cL02CaptureImplementationFileDeV3[],
): string {
  return sha256GermanTask6cL02CaptureBytesDeV3(
    canonicalizeGermanTask6cL02CaptureJsonDeV3(
      unsignedContract(implementationFiles),
    ),
  );
}

function readBoundFile(relativePath: string, expectedSha256?: string): string {
  const absolute = path.join(REPO_ROOT, ...relativePath.split("/"));
  const bytes = fs.readFileSync(absolute);
  const digest = sha256GermanTask6cL02CaptureBytesDeV3(bytes);
  if (expectedSha256 !== undefined && digest !== expectedSha256) {
    fail("CAPTURE_V3_FROZEN_INPUT_HASH_MISMATCH");
  }
  return digest;
}

export function getGermanTask6cL02CaptureProducerContractDeV3(): GermanTask6cL02CaptureProducerContractDeV3 {
  readBoundFile(TASK5_PATH, TASK5_BYTE_SHA256);
  readBoundFile(WORKFLOW_PATH, WORKFLOW_SHA256);
  readBoundFile(
    "modules/learning-v2/curriculum/de/task6c_l02_capture_transport_de_v2.ts",
    PREDECESSOR_TRANSPORT_MODULE_SHA256,
  );
  readBoundFile(
    "scripts/prepare_learning_v2_de_task6c_l02_capture_v2.ts",
    PREDECESSOR_PREPARATION_SCRIPT_SHA256,
  );
  const implementationFiles = IMPLEMENTATION_PATHS.map((filePath) => ({
    path: filePath,
    sha256: readBoundFile(filePath),
  })) as GermanTask6cL02CaptureImplementationFileDeV3[];
  const unsigned = unsignedContract(implementationFiles);
  return Object.freeze({
    ...unsigned,
    inputDigestSha256:
      computeGermanTask6cL02CaptureProducerInputDigestDeV3(implementationFiles),
  });
}
