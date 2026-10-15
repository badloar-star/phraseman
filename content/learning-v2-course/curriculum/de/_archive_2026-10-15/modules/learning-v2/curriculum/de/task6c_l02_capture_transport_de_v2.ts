import {
  createHash,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";

type JsonRecord = Record<string, unknown>;

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const MODULE_PATH =
  "modules/learning-v2/curriculum/de/task6c_l02_capture_transport_de_v2.ts";
const CAPTURE_SCRIPT_PATH =
  "scripts/prepare_learning_v2_de_task6c_l02_capture_v2.ts";
const TASK5_PATH =
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json";
const EVIDENCE_ROOT = path.join(
  REPO_ROOT,
  "modules/learning-v2/curriculum/de/evidence/task6c_l02_direct_capture_v2",
);
const TASK5_BYTE_SHA256 =
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const TASK5_CANONICAL_BODY_SHA256 =
  "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3";

const ROSTER = Object.freeze([
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
]);

const REQUEST = Object.freeze({
  method: "GET" as const,
  headers: Object.freeze({
    accept: "text/html,application/xhtml+xml",
    "accept-encoding": "gzip, br, deflate, identity",
    "user-agent": "Phraseman-Learning-V2-evidence/2.0",
  }),
  redirectMode: "MANUAL_CHAIN" as const,
  maxRedirects: 3,
  httpStack: "node:https" as const,
  automaticContentDecoding: false as const,
  encodedEntitySemantic:
    "CONTENT_CODED_ENTITY_BYTES_AFTER_TRANSFER_DECODING_BEFORE_CONTENT_DECODING" as const,
  decodedRepresentationSemantic: "DECODED_REPRESENTATION_BYTES" as const,
  headerNormalization:
    "LOWERCASE_NAMES_TRIM_OWS_SORT_NAME_VALUE_JSON_V1" as const,
});

export type GermanTask6cL02CaptureInputContractDeV2 = Readonly<{
  schemaVersion: "learning-v2-de-task6c-l02-capture-input-contract.v2";
  targetLanguage: "de";
  task5: Readonly<{
    path: typeof TASK5_PATH;
    byteSha256: typeof TASK5_BYTE_SHA256;
    canonicalBodySha256: typeof TASK5_CANONICAL_BODY_SHA256;
  }>;
  contractModule: Readonly<{ path: typeof MODULE_PATH; sha256: string }>;
  captureScript: Readonly<{ path: typeof CAPTURE_SCRIPT_PATH; sha256: string }>;
  request: typeof REQUEST;
  roster: typeof ROSTER;
  inputDigestSha256: string;
}>;

export type GermanTask6cL02CaptureTransportDeV2 = Readonly<{
  status: "HOLD_CAPTURE_ONLY";
  targetLanguage: "de";
  captures: readonly Readonly<{
    sourcePlanId: string;
    lemma: string;
    contentCoding: "identity" | "gzip" | "br" | "deflate";
    encodedEntitySha256: string;
    decodedRepresentationSha256: string;
  }>[];
  canonicalAdmission: "FORBIDDEN";
  rowsPromoted: 0;
  task7Unlock: false;
  learnerFacing: false;
  releaseAuthorized: false;
}>;

type GermanTask6cL02CaptureTransportFixtureDeV2 = Readonly<{
  receiptBytes: Buffer;
  trustRootBytes: Buffer;
  manifestBytes: Buffer;
  files: ReadonlyMap<string, Buffer>;
}>;

interface GermanTask6cCaptureSignatureVerifierDeV2 {
  verify(input: GermanTask6cCaptureSignatureVerificationInputDeV2): boolean;
}

type GermanTask6cCaptureSignatureVerificationInputDeV2 = Readonly<{
  algorithm: "Ed25519";
  keyId: string;
  publicKeySpkiPem: string;
  signedPayload: Buffer;
  signature: Buffer;
}>;

const structuralTestEd25519CaptureSignatureVerifierDeV2: GermanTask6cCaptureSignatureVerifierDeV2 =
  Object.freeze({
    verify(input: GermanTask6cCaptureSignatureVerificationInputDeV2): boolean {
      try {
        return verifySignature(
          null,
          input.signedPayload,
          createPublicKey(input.publicKeySpkiPem),
          input.signature,
        );
      } catch {
        return false;
      }
    },
  });

function fail(code: string): never {
  throw new Error(code);
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as JsonRecord;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value as string | number | boolean | null);
  if (serialized === undefined) fail("CAPTURE_CANONICAL_JSON_INVALID");
  return serialized;
}

function canonicalJsonLineBytes(value: unknown): Buffer {
  return Buffer.from(`${canonicalJson(value)}\n`, "utf8");
}

function record(value: unknown, code: string): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(code);
}

function exactKeys(value: JsonRecord, keys: readonly string[], code: string) {
  if (Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0"))
    fail(code);
}

function nonEmptyString(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) fail(code);
}

function exactObject(value: unknown, expected: unknown, code: string): void {
  if (canonicalJson(value) !== canonicalJson(expected)) fail(code);
}

function parseJson(bytes: Buffer, code: string): JsonRecord {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    fail(code);
  }
  record(value, code);
  return value;
}

function parseTimestamp(value: unknown, code: string): number {
  nonEmptyString(value, code);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value)
    fail(code);
  return parsed;
}

function fileSha(relativePath: string): string {
  const absolute = path.join(REPO_ROOT, ...relativePath.split("/"));
  if (!fs.existsSync(absolute)) fail("CAPTURE_INPUT_FILE_MISSING");
  return sha256(fs.readFileSync(absolute));
}

function task5Contract(): GermanTask6cL02CaptureInputContractDeV2["task5"] {
  const absolute = path.join(REPO_ROOT, ...TASK5_PATH.split("/"));
  if (!fs.existsSync(absolute)) fail("CAPTURE_TASK5_MISSING");
  if (sha256(fs.readFileSync(absolute)) !== TASK5_BYTE_SHA256)
    fail("CAPTURE_TASK5_HASH_MISMATCH");
  return Object.freeze({
    path: TASK5_PATH,
    byteSha256: TASK5_BYTE_SHA256,
    canonicalBodySha256: TASK5_CANONICAL_BODY_SHA256,
  });
}

export function getGermanTask6cL02CaptureInputContractDeV2(): GermanTask6cL02CaptureInputContractDeV2 {
  const unsigned = {
    schemaVersion:
      "learning-v2-de-task6c-l02-capture-input-contract.v2" as const,
    targetLanguage: "de" as const,
    task5: task5Contract(),
    contractModule: Object.freeze({
      path: MODULE_PATH,
      sha256: fileSha(MODULE_PATH),
    }),
    captureScript: Object.freeze({
      path: CAPTURE_SCRIPT_PATH,
      sha256: fileSha(CAPTURE_SCRIPT_PATH),
    }),
    request: REQUEST,
    roster: ROSTER,
  };
  return Object.freeze({
    ...unsigned,
    inputDigestSha256: sha256(canonicalJson(unsigned)),
  });
}

export function canonicalizeGermanTask6cL02CaptureReceiptPayloadDeV2(
  unsignedReceipt: unknown,
): Buffer {
  record(unsignedReceipt, "CAPTURE_RECEIPT_PAYLOAD_INVALID");
  if (Object.hasOwn(unsignedReceipt, "signature"))
    fail("CAPTURE_RECEIPT_PAYLOAD_SIGNATURE_FORBIDDEN");
  return Buffer.from(canonicalJson(unsignedReceipt), "utf8");
}

export function assertGermanTask6cL02CaptureRootAvailableDeV2(
  rootExists: boolean,
): void {
  if (rootExists) fail("CAPTURE_V2_IMMUTABLE_ROOT_EXISTS");
}

function validateAuthority(value: unknown, manifest = false): void {
  record(value, "CAPTURE_AUTHORITY_INVALID");
  exactKeys(
    value,
    [
      "canonicalAdmission",
      "rowsPromoted",
      "task7Unlock",
      "learnerFacing",
      "releaseAuthorized",
      ...(manifest ? ["translationsPresent"] : []),
    ],
    "CAPTURE_AUTHORITY_SCHEMA_INVALID",
  );
  if (
    value.canonicalAdmission !== "FORBIDDEN" ||
    value.rowsPromoted !== 0 ||
    value.task7Unlock !== false ||
    value.learnerFacing !== false ||
    value.releaseAuthorized !== false
  )
    fail("CAPTURE_AUTHORITY_ESCALATION");
}

function validateTrustRoot(
  trustRoot: JsonRecord,
  receipt: JsonRecord,
  issuedAt: number,
): { keyId: string; publicKeySpkiPem: string } {
  exactKeys(
    trustRoot,
    [
      "schemaVersion",
      "status",
      "keyId",
      "runnerId",
      "algorithm",
      "publicKeySpkiPem",
      "notBefore",
      "notAfter",
      "authority",
    ],
    "CAPTURE_TRUST_ROOT_SCHEMA_INVALID",
  );
  if (
    trustRoot.schemaVersion !== "learning-v2-de-task6c-capture-trust-root.v1" ||
    trustRoot.status !== "ACTIVE" ||
    trustRoot.algorithm !== "Ed25519"
  )
    fail("CAPTURE_TRUST_ROOT_INVALID");
  nonEmptyString(trustRoot.keyId, "CAPTURE_TRUST_ROOT_INVALID");
  nonEmptyString(trustRoot.runnerId, "CAPTURE_TRUST_ROOT_INVALID");
  nonEmptyString(trustRoot.publicKeySpkiPem, "CAPTURE_TRUST_ROOT_INVALID");
  record(receipt.runner, "CAPTURE_RUNNER_INVALID");
  if (receipt.runner.runnerId !== trustRoot.runnerId)
    fail("CAPTURE_RUNNER_NOT_TRUSTED");
  const notBefore = parseTimestamp(
    trustRoot.notBefore,
    "CAPTURE_TRUST_WINDOW_INVALID",
  );
  const notAfter = parseTimestamp(
    trustRoot.notAfter,
    "CAPTURE_TRUST_WINDOW_INVALID",
  );
  if (notBefore > issuedAt || issuedAt > notAfter || notBefore >= notAfter)
    fail("CAPTURE_TRUST_WINDOW_INVALID");
  record(trustRoot.authority, "CAPTURE_TRUST_AUTHORITY_INVALID");
  exactKeys(
    trustRoot.authority,
    [
      "captureAttestationOnly",
      "canonicalAdmission",
      "task7Unlock",
      "learnerFacing",
      "releaseAuthorized",
    ],
    "CAPTURE_TRUST_AUTHORITY_SCHEMA_INVALID",
  );
  if (
    trustRoot.authority.captureAttestationOnly !== true ||
    trustRoot.authority.canonicalAdmission !== "FORBIDDEN" ||
    trustRoot.authority.task7Unlock !== false ||
    trustRoot.authority.learnerFacing !== false ||
    trustRoot.authority.releaseAuthorized !== false
  )
    fail("CAPTURE_AUTHORITY_ESCALATION");
  return {
    keyId: trustRoot.keyId,
    publicKeySpkiPem: trustRoot.publicKeySpkiPem,
  };
}

function validateReceipt(
  receipt: JsonRecord,
  trustRoot: JsonRecord,
  manifestBytes: Buffer,
  verifier: GermanTask6cCaptureSignatureVerifierDeV2,
): JsonRecord {
  exactKeys(
    receipt,
    [
      "schemaVersion",
      "receiptStatus",
      "targetLanguage",
      "issuedAt",
      "input",
      "runner",
      "manifest",
      "authority",
      "signature",
    ],
    "CAPTURE_RECEIPT_SCHEMA_INVALID",
  );
  if (
    receipt.schemaVersion !==
    "learning-v2-de-task6c-l02-capture-runner-receipt.v2"
  )
    fail("CAPTURE_RECEIPT_SCHEMA_INVALID");
  if (receipt.receiptStatus !== "RUNNER_SIGNED_CAPTURE_COMPLETE")
    fail("CAPTURE_RECEIPT_STATUS_INVALID");
  if (receipt.targetLanguage !== "de") fail("CAPTURE_TARGET_LANGUAGE_INVALID");
  const issuedAt = parseTimestamp(
    receipt.issuedAt,
    "CAPTURE_ISSUED_AT_INVALID",
  );
  const trust = validateTrustRoot(trustRoot, receipt, issuedAt);
  const contract = getGermanTask6cL02CaptureInputContractDeV2();
  record(receipt.input, "CAPTURE_INPUT_BINDING_INVALID");
  exactKeys(
    receipt.input,
    [
      "inputDigestSha256",
      "contractModulePath",
      "contractModuleSha256",
      "captureScriptPath",
      "captureScriptSha256",
      "task5",
    ],
    "CAPTURE_INPUT_BINDING_INVALID",
  );
  if (
    receipt.input.inputDigestSha256 !== contract.inputDigestSha256 ||
    receipt.input.contractModulePath !== contract.contractModule.path ||
    receipt.input.contractModuleSha256 !== contract.contractModule.sha256 ||
    receipt.input.captureScriptPath !== contract.captureScript.path ||
    receipt.input.captureScriptSha256 !== contract.captureScript.sha256
  )
    fail("CAPTURE_INPUT_BINDING_INVALID");
  exactObject(
    receipt.input.task5,
    contract.task5,
    "CAPTURE_INPUT_BINDING_INVALID",
  );
  record(receipt.runner, "CAPTURE_RUNNER_INVALID");
  exactKeys(
    receipt.runner,
    [
      "runnerId",
      "runtimeFamily",
      "runtimeVersion",
      "platform",
      "architecture",
      "httpStack",
      "automaticContentDecoding",
    ],
    "CAPTURE_RUNNER_SCHEMA_INVALID",
  );
  for (const key of ["runnerId", "runtimeVersion", "platform", "architecture"])
    nonEmptyString(receipt.runner[key], "CAPTURE_RUNNER_INVALID");
  if (
    receipt.runner.runtimeFamily !== "node" ||
    receipt.runner.httpStack !== "node:https" ||
    receipt.runner.automaticContentDecoding !== false
  )
    fail("CAPTURE_RUNNER_RUNTIME_INVALID");
  record(receipt.manifest, "CAPTURE_MANIFEST_DESCRIPTOR_INVALID");
  exactKeys(
    receipt.manifest,
    ["path", "sha256", "bytes"],
    "CAPTURE_MANIFEST_DESCRIPTOR_INVALID",
  );
  if (
    receipt.manifest.path !== "manifest.json" ||
    receipt.manifest.sha256 !== sha256(manifestBytes) ||
    receipt.manifest.bytes !== manifestBytes.length
  )
    fail("CAPTURE_MANIFEST_DESCRIPTOR_INVALID");
  validateAuthority(receipt.authority);
  record(receipt.signature, "CAPTURE_RECEIPT_SIGNATURE_INVALID");
  exactKeys(
    receipt.signature,
    ["keyId", "algorithm", "signedPayloadSha256", "signatureBase64"],
    "CAPTURE_RECEIPT_SIGNATURE_INVALID",
  );
  if (
    receipt.signature.keyId !== trust.keyId ||
    receipt.signature.algorithm !== "Ed25519"
  )
    fail("CAPTURE_RECEIPT_SIGNATURE_INVALID");
  nonEmptyString(
    receipt.signature.signatureBase64,
    "CAPTURE_RECEIPT_SIGNATURE_INVALID",
  );
  const unsigned = { ...receipt };
  delete unsigned.signature;
  const signedPayload =
    canonicalizeGermanTask6cL02CaptureReceiptPayloadDeV2(unsigned);
  if (receipt.signature.signedPayloadSha256 !== sha256(signedPayload))
    fail("CAPTURE_RECEIPT_SIGNATURE_INVALID");
  let signature: Buffer;
  try {
    signature = Buffer.from(receipt.signature.signatureBase64, "base64");
  } catch {
    fail("CAPTURE_RECEIPT_SIGNATURE_INVALID");
  }
  if (
    signature.length === 0 ||
    !verifier.verify({
      algorithm: "Ed25519",
      keyId: trust.keyId,
      publicKeySpkiPem: trust.publicKeySpkiPem,
      signedPayload,
      signature,
    })
  )
    fail("CAPTURE_RECEIPT_SIGNATURE_INVALID");
  return receipt;
}

function validateDescriptor(
  descriptor: unknown,
  expectedPath: string,
  files: ReadonlyMap<string, Buffer>,
  keys: readonly string[],
  code: string,
): Buffer {
  record(descriptor, code);
  exactKeys(descriptor, keys, code);
  if (descriptor.path !== expectedPath) fail(code);
  const bytes = files.get(expectedPath);
  if (
    bytes === undefined ||
    descriptor.sha256 !== sha256(bytes) ||
    descriptor.bytes !== bytes.length
  )
    fail(code);
  return bytes;
}

function decodedBytes(
  contentCoding: "identity" | "gzip" | "br" | "deflate",
  encoded: Buffer,
): Buffer {
  try {
    if (contentCoding === "identity") return encoded;
    if (contentCoding === "gzip") return gunzipSync(encoded);
    if (contentCoding === "br") return brotliDecompressSync(encoded);
    return inflateSync(encoded);
  } catch {
    fail("CAPTURE_CONTENT_DECODING_FAILED");
  }
}

function validateHeaderTranscript(
  bytes: Buffer,
  response: JsonRecord,
): "identity" | "gzip" | "br" | "deflate" {
  const transcript = parseJson(bytes, "CAPTURE_HEADER_TRANSCRIPT_INVALID");
  if (!bytes.equals(canonicalJsonLineBytes(transcript)))
    fail("CAPTURE_HEADER_TRANSCRIPT_NOT_CANONICAL");
  exactKeys(
    transcript,
    ["schemaVersion", "statusLine", "headers"],
    "CAPTURE_HEADER_TRANSCRIPT_SCHEMA_INVALID",
  );
  if (
    transcript.schemaVersion !==
      "learning-v2-de-task6c-normalized-http-header-transcript.v2" ||
    transcript.statusLine !== "HTTP/1.1 200 OK" ||
    !Array.isArray(transcript.headers)
  )
    fail("CAPTURE_HEADER_TRANSCRIPT_INVALID");
  let prior = "";
  const pairs = transcript.headers.map((entry) => {
    record(entry, "CAPTURE_HEADER_TRANSCRIPT_INVALID");
    exactKeys(entry, ["name", "value"], "CAPTURE_HEADER_TRANSCRIPT_INVALID");
    nonEmptyString(entry.name, "CAPTURE_HEADER_TRANSCRIPT_INVALID");
    nonEmptyString(entry.value, "CAPTURE_HEADER_TRANSCRIPT_INVALID");
    if (
      entry.name !== entry.name.toLowerCase() ||
      entry.name.trim() !== entry.name ||
      entry.value.trim() !== entry.value ||
      /[\r\n]/u.test(entry.name + entry.value)
    )
      fail("CAPTURE_HEADER_TRANSCRIPT_NOT_NORMALIZED");
    const sortable = `${entry.name}\0${entry.value}`;
    if (sortable < prior) fail("CAPTURE_HEADER_TRANSCRIPT_NOT_NORMALIZED");
    prior = sortable;
    return { name: entry.name, value: entry.value };
  });
  const contentEncodings = pairs
    .filter((entry) => entry.name === "content-encoding")
    .flatMap((entry) => entry.value.split(",").map((value) => value.trim()))
    .filter(Boolean);
  if (contentEncodings.length > 1) fail("CAPTURE_CONTENT_ENCODING_AMBIGUOUS");
  const contentCoding = (contentEncodings[0] ?? "identity").toLowerCase();
  if (!["identity", "gzip", "br", "deflate"].includes(contentCoding))
    fail("CAPTURE_CONTENT_ENCODING_UNSUPPORTED");
  if (response.contentCoding !== contentCoding)
    fail("CAPTURE_CONTENT_ENCODING_MISMATCH");
  const contentTypes = pairs.filter((entry) => entry.name === "content-type");
  if (
    contentTypes.length !== 1 ||
    contentTypes[0].value !== response.contentType
  )
    fail("CAPTURE_CONTENT_TYPE_MISMATCH");
  return contentCoding as "identity" | "gzip" | "br" | "deflate";
}

function validateManifest(
  manifest: JsonRecord,
  files: ReadonlyMap<string, Buffer>,
  receipt: JsonRecord,
): GermanTask6cL02CaptureTransportDeV2 {
  exactKeys(
    manifest,
    [
      "schemaVersion",
      "captureKind",
      "status",
      "targetLanguage",
      "upstream",
      "inputDigestSha256",
      "captureWindow",
      "captures",
      "authority",
    ],
    "CAPTURE_MANIFEST_SCHEMA_INVALID",
  );
  if (manifest.schemaVersion !== "learning-v2-de-task6c-l02-direct-capture.v2")
    fail("CAPTURE_MANIFEST_SCHEMA_INVALID");
  if (
    manifest.captureKind !==
    "HTTP_CONTENT_CODED_ENTITY_AND_DECODED_REPRESENTATION_BYTES_V2"
  )
    fail("CAPTURE_KIND_INVALID");
  if (manifest.status !== "HOLD_CAPTURE_ONLY")
    fail("CAPTURE_MANIFEST_STATUS_INVALID");
  if (manifest.targetLanguage !== "de") fail("CAPTURE_TARGET_LANGUAGE_INVALID");
  const contract = getGermanTask6cL02CaptureInputContractDeV2();
  exactObject(manifest.upstream, contract.task5, "CAPTURE_UPSTREAM_INVALID");
  if (manifest.inputDigestSha256 !== contract.inputDigestSha256)
    fail("CAPTURE_INPUT_BINDING_INVALID");
  record(manifest.captureWindow, "CAPTURE_WINDOW_INVALID");
  exactKeys(
    manifest.captureWindow,
    ["startedAt", "completedAt"],
    "CAPTURE_WINDOW_INVALID",
  );
  const startedAt = parseTimestamp(
    manifest.captureWindow.startedAt,
    "CAPTURE_WINDOW_INVALID",
  );
  const completedAt = parseTimestamp(
    manifest.captureWindow.completedAt,
    "CAPTURE_WINDOW_INVALID",
  );
  if (completedAt < startedAt) fail("CAPTURE_WINDOW_INVALID");
  const issuedAt = parseTimestamp(
    receipt.issuedAt,
    "CAPTURE_ISSUED_AT_INVALID",
  );
  if (issuedAt < completedAt) fail("CAPTURE_ISSUED_AT_INVALID");
  validateAuthority(manifest.authority, true);
  record(manifest.authority, "CAPTURE_AUTHORITY_INVALID");
  exactKeys(
    manifest.authority,
    [
      "canonicalAdmission",
      "rowsPromoted",
      "task7Unlock",
      "learnerFacing",
      "releaseAuthorized",
      "translationsPresent",
    ],
    "CAPTURE_MANIFEST_SCHEMA_INVALID",
  );
  if (manifest.authority.translationsPresent !== false)
    fail("CAPTURE_AUTHORITY_ESCALATION");
  if (!Array.isArray(manifest.captures) || manifest.captures.length !== 4)
    fail("CAPTURE_ROSTER_INVALID");
  const expectedFiles = new Set<string>();
  const captures = manifest.captures.map((capture, index) => {
    record(capture, "CAPTURE_ROW_INVALID");
    exactKeys(
      capture,
      ["sourcePlanId", "lemma", "sourceAnchor", "request", "response"],
      "CAPTURE_ROW_SCHEMA_INVALID",
    );
    const expected = contract.roster[index];
    if (
      capture.sourcePlanId !== expected.sourcePlanId ||
      capture.lemma !== expected.lemma ||
      capture.sourceAnchor !== expected.sourceAnchor
    )
      fail("CAPTURE_ROSTER_INVALID");
    record(capture.request, "CAPTURE_REQUEST_CONTRACT_INVALID");
    exactKeys(
      capture.request,
      ["method", "canonicalUrl", "headers", "redirectMode", "maxRedirects"],
      "CAPTURE_REQUEST_CONTRACT_INVALID",
    );
    if (
      capture.request.method !== contract.request.method ||
      capture.request.canonicalUrl !== expected.canonicalUrl ||
      capture.request.redirectMode !== contract.request.redirectMode ||
      capture.request.maxRedirects !== contract.request.maxRedirects ||
      canonicalJson(capture.request.headers) !==
        canonicalJson(contract.request.headers)
    )
      fail("CAPTURE_REQUEST_CONTRACT_INVALID");
    record(capture.response, "CAPTURE_RESPONSE_INVALID");
    exactKeys(
      capture.response,
      [
        "finalUrl",
        "canonicalUrl",
        "httpStatus",
        "redirectChain",
        "headerTranscript",
        "contentCoding",
        "encodedEntityBody",
        "decodedRepresentationBody",
        "contentType",
        "title",
        "headword",
      ],
      "CAPTURE_RESPONSE_SCHEMA_INVALID",
    );
    if (
      capture.response.finalUrl !== expected.canonicalUrl ||
      capture.response.canonicalUrl !== expected.canonicalUrl ||
      capture.response.httpStatus !== 200 ||
      !Array.isArray(capture.response.redirectChain) ||
      capture.response.redirectChain.length !== 0
    )
      fail("CAPTURE_NETWORK_IDENTITY_INVALID");
    const headerPath = `headers/${expected.outputSlug}.normalized.json`;
    const encodedPath = `encoded-entity/${expected.outputSlug}.bin`;
    const decodedPath = `decoded-representation/${expected.outputSlug}.html`;
    expectedFiles.add(headerPath);
    expectedFiles.add(encodedPath);
    expectedFiles.add(decodedPath);
    const headerBytes = validateDescriptor(
      capture.response.headerTranscript,
      headerPath,
      files,
      ["path", "sha256", "bytes", "format"],
      "CAPTURE_HEADER_DESCRIPTOR_INVALID",
    );
    record(
      capture.response.headerTranscript,
      "CAPTURE_HEADER_DESCRIPTOR_INVALID",
    );
    if (
      capture.response.headerTranscript.format !==
      "NORMALIZED_HTTP_RESPONSE_HEADERS_V2"
    )
      fail("CAPTURE_HEADER_DESCRIPTOR_INVALID");
    const contentCoding = validateHeaderTranscript(
      headerBytes,
      capture.response,
    );
    const encoded = validateDescriptor(
      capture.response.encodedEntityBody,
      encodedPath,
      files,
      ["path", "sha256", "bytes", "semantic"],
      "CAPTURE_ENCODED_ENTITY_INVALID",
    );
    record(
      capture.response.encodedEntityBody,
      "CAPTURE_ENCODED_ENTITY_INVALID",
    );
    if (
      capture.response.encodedEntityBody.semantic !==
      contract.request.encodedEntitySemantic
    )
      fail("CAPTURE_ENCODED_ENTITY_INVALID");
    const decoded = validateDescriptor(
      capture.response.decodedRepresentationBody,
      decodedPath,
      files,
      ["path", "sha256", "bytes", "semantic", "charset", "decoder"],
      "CAPTURE_DECODED_REPRESENTATION_INVALID",
    );
    record(
      capture.response.decodedRepresentationBody,
      "CAPTURE_DECODED_REPRESENTATION_INVALID",
    );
    const expectedDecoder = {
      identity: "IDENTITY_COPY",
      gzip: "NODE_ZLIB_GUNZIP_SYNC",
      br: "NODE_ZLIB_BROTLI_DECOMPRESS_SYNC",
      deflate: "NODE_ZLIB_INFLATE_SYNC",
    }[contentCoding];
    if (
      capture.response.decodedRepresentationBody.semantic !==
        contract.request.decodedRepresentationSemantic ||
      capture.response.decodedRepresentationBody.charset !== "utf-8" ||
      capture.response.decodedRepresentationBody.decoder !== expectedDecoder
    )
      fail("CAPTURE_DECODED_REPRESENTATION_INVALID");
    if (!decodedBytes(contentCoding, encoded).equals(decoded))
      fail("CAPTURE_DECODED_REPRESENTATION_MISMATCH");
    const html = decoded.toString("utf8");
    const expectedTitle = `${expected.lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS`;
    if (
      capture.response.contentType !== "text/html; charset=UTF-8" ||
      capture.response.title !== expectedTitle ||
      capture.response.headword !== expected.lemma ||
      !html.includes(
        `<link rel="canonical" href="${expected.canonicalUrl}"/>`,
      ) ||
      !html.includes(`<title>${expectedTitle}</title>`) ||
      !html.includes(`<h1><b>${expected.lemma}</b>`) ||
      !html.includes(`id="${expected.sourceAnchor}"`)
    )
      fail("CAPTURE_DECODED_IDENTITY_INVALID");
    return Object.freeze({
      sourcePlanId: expected.sourcePlanId,
      lemma: expected.lemma,
      contentCoding,
      encodedEntitySha256: sha256(encoded),
      decodedRepresentationSha256: sha256(decoded),
    });
  });
  if (
    files.size !== expectedFiles.size ||
    [...files.keys()].some((file) => !expectedFiles.has(file))
  )
    fail("CAPTURE_OUTPUT_FILE_SET_INVALID");
  return Object.freeze({
    status: "HOLD_CAPTURE_ONLY" as const,
    targetLanguage: "de" as const,
    captures: Object.freeze(captures),
    canonicalAdmission: "FORBIDDEN" as const,
    rowsPromoted: 0 as const,
    task7Unlock: false as const,
    learnerFacing: false as const,
    releaseAuthorized: false as const,
  });
}

/** Structural P-test only; never a production admission or trust path. */
export function validateGermanTask6cL02CaptureTransportFixtureDeV2(
  fixture: GermanTask6cL02CaptureTransportFixtureDeV2,
): GermanTask6cL02CaptureTransportDeV2 {
  const receipt = parseJson(fixture.receiptBytes, "CAPTURE_RECEIPT_INVALID");
  const trustRoot = parseJson(
    fixture.trustRootBytes,
    "CAPTURE_TRUST_ROOT_INVALID",
  );
  const manifest = parseJson(fixture.manifestBytes, "CAPTURE_MANIFEST_INVALID");
  validateReceipt(
    receipt,
    trustRoot,
    fixture.manifestBytes,
    structuralTestEd25519CaptureSignatureVerifierDeV2,
  );
  return validateManifest(manifest, fixture.files, receipt);
}

/**
 * Production entry point. Repository-local keys, receipts and manifests have
 * no authority. This remains unavailable until a separately reviewed adapter
 * verifies an externally governed GitHub-hosted Sigstore attestation.
 */
export function loadGermanTask6cL02CaptureTransportDeV2(): GermanTask6cL02CaptureTransportDeV2 {
  if (arguments.length !== 0) fail("CAPTURE_CALLER_INPUT_FORBIDDEN");
  fail("CAPTURE_EXTERNALLY_GOVERNED_ATTESTATION_UNAVAILABLE");
}

export const GERMAN_TASK6C_L02_CAPTURE_PREPARATION_PATHS_DE_V2 = Object.freeze({
  evidenceRoot: EVIDENCE_ROOT,
});
