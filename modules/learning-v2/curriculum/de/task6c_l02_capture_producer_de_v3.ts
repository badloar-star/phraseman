import { spawnSync } from "node:child_process";
import { promises as dns } from "node:dns";
import * as fs from "node:fs";
import { request } from "node:https";
import { isIP } from "node:net";
import * as path from "node:path";
import type { TLSSocket } from "node:tls";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";

import {
  GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3,
  GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3,
  GERMAN_TASK6C_L02_CAPTURE_ROSTER_DE_V3,
  canonicalizeGermanTask6cL02CaptureJsonLineDeV3,
  getGermanTask6cL02CaptureProducerContractDeV3,
  sha256GermanTask6cL02CaptureBytesDeV3,
  type GermanTask6cL02CaptureRosterRowDeV3,
} from "./task6c_l02_capture_producer_contract_de_v3";

type JsonRecord = Record<string, unknown>;

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const EXPECTED_REPOSITORY = "badloar-star/phraseman";
const EXPECTED_EVENT = "workflow_dispatch";
const EXPECTED_REF = "refs/heads/master";
const EXPECTED_WORKFLOW_REF =
  "badloar-star/phraseman/.github/workflows/learning-v2-de-l02-capture-attestation.yml@refs/heads/master";

type RuntimeEnvironmentDeV3 = Readonly<{
  GITHUB_ACTIONS?: string;
  CI?: string;
  RUNNER_ENVIRONMENT?: string;
  GITHUB_REPOSITORY?: string;
  GITHUB_EVENT_NAME?: string;
  GITHUB_REF?: string;
  GITHUB_REF_PROTECTED?: string;
  GITHUB_WORKFLOW_REF?: string;
  GITHUB_SHA?: string;
  GITHUB_WORKFLOW_SHA?: string;
  GITHUB_WORKSPACE?: string;
  RUNNER_TEMP?: string;
}>;

export type GermanTask6cL02CaptureProducerRuntimeSnapshotDeV3 = Readonly<{
  argumentCount: number;
  env: RuntimeEnvironmentDeV3;
  cwdRealpath: string;
  workspaceRealpath: string;
  gitHead: string;
  gitStatusPorcelain: string;
  runnerTempIsAbsolute: boolean;
  runnerTempIsSymlink: boolean;
  runnerTempIsDirectory: boolean;
  outputRootExists: boolean;
}>;

export type GermanTask6cL02CaptureNormalizedHeaderDeV3 = Readonly<{
  name: string;
  value: string;
}>;

export type GermanTask6cL02CaptureTlsObservationDeV3 = Readonly<{
  authorized: boolean;
  protocol: string | null;
  servername: string;
  subjectAltName: string;
}>;

export type GermanTask6cL02CaptureResponseObservationDeV3 = Readonly<{
  canonicalUrl: string;
  statusCode: number;
  rawHeaders: readonly string[];
  encodedEntityChunks: readonly Buffer[];
  dnsAddresses: readonly string[];
  connectedAddress: string;
  tls: GermanTask6cL02CaptureTlsObservationDeV3;
}>;

export type GermanTask6cL02CaptureValidatedResponseDeV3 = Readonly<{
  row: GermanTask6cL02CaptureRosterRowDeV3;
  statusCode: 200;
  rawHeaders: readonly string[];
  normalizedHeaders: readonly GermanTask6cL02CaptureNormalizedHeaderDeV3[];
  contentType: "text/html; charset=UTF-8";
  contentCoding: "identity" | "gzip" | "br" | "deflate";
  encodedEntityBody: Buffer;
  decodedRepresentationBody: Buffer;
  dnsAddresses: readonly string[];
  connectedAddress: string;
  tls: GermanTask6cL02CaptureTlsObservationDeV3;
  title: string;
  headword: string;
}>;

type BuildWindowDeV3 = Readonly<{
  startedAt: string;
  completedAt: string;
  sourceSha: string;
}>;

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertIsoTimestamp(value: string, code: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail(code);
  }
  return parsed;
}

function assertExactUrl(
  value: string,
  expected: GermanTask6cL02CaptureRosterRowDeV3["canonicalUrl"],
): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail("CAPTURE_URL_INVALID");
  }
  if (
    value !== expected ||
    parsed.href !== expected ||
    parsed.protocol !==
      GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.exactScheme ||
    parsed.hostname !==
      GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.exactHost ||
    (parsed.port !== "" && parsed.port !== "443") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    fail("CAPTURE_URL_INVALID");
  }
  return parsed;
}

export function assertGermanTask6cL02CaptureProducerRuntimeSnapshotDeV3(
  value: unknown,
): void {
  if (!isRecord(value) || !isRecord(value.env)) {
    fail("CAPTURE_PRODUCER_RUNTIME_SNAPSHOT_INVALID");
  }
  const snapshot = value as GermanTask6cL02CaptureProducerRuntimeSnapshotDeV3;
  const env = snapshot.env;
  if (snapshot.argumentCount !== 0)
    fail("CAPTURE_PRODUCER_CALLER_INPUT_FORBIDDEN");
  if (env.GITHUB_ACTIONS !== "true")
    fail("CAPTURE_PRODUCER_GITHUB_ACTIONS_REQUIRED");
  if (env.CI !== "true") fail("CAPTURE_PRODUCER_CI_REQUIRED");
  if (env.RUNNER_ENVIRONMENT !== "github-hosted") {
    fail("CAPTURE_PRODUCER_RUNNER_NOT_GITHUB_HOSTED");
  }
  if (env.GITHUB_REPOSITORY !== EXPECTED_REPOSITORY) {
    fail("CAPTURE_PRODUCER_REPOSITORY_MISMATCH");
  }
  if (env.GITHUB_EVENT_NAME !== EXPECTED_EVENT) {
    fail("CAPTURE_PRODUCER_EVENT_MISMATCH");
  }
  if (env.GITHUB_REF !== EXPECTED_REF) fail("CAPTURE_PRODUCER_REF_MISMATCH");
  if (env.GITHUB_REF_PROTECTED !== "true") {
    fail("CAPTURE_PRODUCER_REF_UNPROTECTED");
  }
  if (env.GITHUB_WORKFLOW_REF !== EXPECTED_WORKFLOW_REF) {
    fail("CAPTURE_PRODUCER_WORKFLOW_REF_MISMATCH");
  }
  if (!/^[0-9a-f]{40}$/u.test(env.GITHUB_SHA ?? "")) {
    fail("CAPTURE_PRODUCER_SHA_INVALID");
  }
  if (env.GITHUB_WORKFLOW_SHA !== env.GITHUB_SHA) {
    fail("CAPTURE_PRODUCER_WORKFLOW_SHA_MISMATCH");
  }
  if (
    typeof env.GITHUB_WORKSPACE !== "string" ||
    env.GITHUB_WORKSPACE.length === 0 ||
    snapshot.workspaceRealpath !== snapshot.cwdRealpath ||
    snapshot.workspaceRealpath.length === 0
  ) {
    fail("CAPTURE_PRODUCER_WORKSPACE_MISMATCH");
  }
  if (snapshot.gitHead !== env.GITHUB_SHA)
    fail("CAPTURE_PRODUCER_HEAD_MISMATCH");
  if (snapshot.gitStatusPorcelain !== "")
    fail("CAPTURE_PRODUCER_CHECKOUT_DIRTY");
  if (
    typeof env.RUNNER_TEMP !== "string" ||
    env.RUNNER_TEMP.length === 0 ||
    snapshot.runnerTempIsAbsolute !== true ||
    snapshot.runnerTempIsDirectory !== true
  ) {
    fail("CAPTURE_PRODUCER_RUNNER_TEMP_INVALID");
  }
  if (snapshot.runnerTempIsSymlink)
    fail("CAPTURE_PRODUCER_RUNNER_TEMP_SYMLINK");
  if (snapshot.outputRootExists) fail("CAPTURE_PRODUCER_IMMUTABLE_ROOT_EXISTS");
}

function ipv4Number(address: string): number | null {
  if (isIP(address) !== 4) return null;
  const octets = address.split(".").map(Number);
  return (
    ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3]
  );
}

function inIpv4Cidr(value: number, base: number, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) >>> 0 === (base & mask) >>> 0;
}

function ipv6BigInt(address: string): bigint | null {
  if (isIP(address) !== 6 || address.includes("%")) return null;
  let normalized = address.toLowerCase();
  const dottedIndex = normalized.lastIndexOf(":");
  const dotted = normalized.slice(dottedIndex + 1);
  if (dotted.includes(".")) {
    const ipv4 = ipv4Number(dotted);
    if (ipv4 === null) return null;
    normalized = `${normalized.slice(0, dottedIndex)}:${((ipv4 >>> 16) & 0xffff).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }
  const parts = normalized.split("::");
  if (parts.length > 2) return null;
  const left = parts[0] === "" ? [] : parts[0].split(":");
  const right =
    parts.length === 1 || parts[1] === "" ? [] : parts[1].split(":");
  const fill = parts.length === 2 ? 8 - left.length - right.length : 0;
  if (fill < 0 || (parts.length === 1 && left.length !== 8)) return null;
  const words = [...left, ...Array(fill).fill("0"), ...right];
  if (
    words.length !== 8 ||
    words.some((word) => !/^[0-9a-f]{1,4}$/u.test(word))
  ) {
    return null;
  }
  return words.reduce(
    (accumulator, word) => (accumulator << 16n) | BigInt(`0x${word}`),
    0n,
  );
}

function isPublicIpv4(address: string): boolean {
  const value = ipv4Number(address);
  if (value === null) return false;
  const denied: readonly [number, number][] = [
    [0x00000000, 8],
    [0x0a000000, 8],
    [0x64400000, 10],
    [0x7f000000, 8],
    [0xa9fe0000, 16],
    [0xac100000, 12],
    [0xc0000000, 24],
    [0xc0000200, 24],
    [0xc0586300, 24],
    [0xc0a80000, 16],
    [0xc6120000, 15],
    [0xc6336400, 24],
    [0xcb007100, 24],
    [0xe0000000, 4],
    [0xf0000000, 4],
  ];
  return !denied.some(([base, prefix]) => inIpv4Cidr(value, base, prefix));
}

function ipv6Prefix(value: bigint, prefix: number): bigint {
  return value >> BigInt(128 - prefix);
}

function inIpv6Cidr(value: bigint, base: bigint, prefix: number): boolean {
  return ipv6Prefix(value, prefix) === ipv6Prefix(base, prefix);
}

const DENIED_IPV6_GLOBAL_UNICAST_RANGES = Object.freeze([
  Object.freeze({
    base: BigInt("0x20010000000000000000000000000000"),
    prefix: 23,
  }),
  Object.freeze({
    base: BigInt("0x20010db8000000000000000000000000"),
    prefix: 32,
  }),
  Object.freeze({
    base: BigInt("0x20020000000000000000000000000000"),
    prefix: 16,
  }),
  Object.freeze({
    base: BigInt("0x3fff0000000000000000000000000000"),
    prefix: 20,
  }),
] as const);

export function isGermanTask6cL02CapturePublicIpDeV3(address: string): boolean {
  if (isIP(address) === 4) return isPublicIpv4(address);
  const value = ipv6BigInt(address);
  if (value === null) return false;
  const mappedPrefix = value >> 32n;
  if (mappedPrefix === 0xffffn) {
    const ipv4 = Number(value & 0xffffffffn);
    return isPublicIpv4(
      `${(ipv4 >>> 24) & 255}.${(ipv4 >>> 16) & 255}.${(ipv4 >>> 8) & 255}.${ipv4 & 255}`,
    );
  }
  if (ipv6Prefix(value, 3) !== 1n) return false;
  return !DENIED_IPV6_GLOBAL_UNICAST_RANGES.some(({ base, prefix }) =>
    inIpv6Cidr(value, base, prefix),
  );
}

function ipIdentity(address: string): string {
  const v4 = ipv4Number(address);
  if (v4 !== null) return `4:${v4}`;
  const v6 = ipv6BigInt(address);
  if (v6 !== null) return `6:${v6.toString(16)}`;
  return "invalid";
}

export function normalizeGermanTask6cL02CaptureHeadersDeV3(
  rawHeaders: readonly string[],
): readonly GermanTask6cL02CaptureNormalizedHeaderDeV3[] {
  if (!Array.isArray(rawHeaders) || rawHeaders.length % 2 !== 0) {
    fail("CAPTURE_RAW_HEADERS_INVALID");
  }
  const normalized: GermanTask6cL02CaptureNormalizedHeaderDeV3[] = [];
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const rawName = rawHeaders[index];
    const rawValue = rawHeaders[index + 1];
    if (
      typeof rawName !== "string" ||
      !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u.test(rawName)
    ) {
      fail("CAPTURE_HEADER_NAME_INVALID");
    }
    if (typeof rawValue !== "string" || /[\u0000\r\n]/u.test(rawValue)) {
      fail("CAPTURE_HEADER_VALUE_INVALID");
    }
    normalized.push(
      Object.freeze({
        name: rawName.toLowerCase(),
        value: rawValue.replace(/^[\t ]+|[\t ]+$/gu, ""),
      }),
    );
  }
  normalized.sort((left, right) => {
    const leftKey = `${left.name}\0${left.value}`;
    const rightKey = `${right.name}\0${right.value}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  return Object.freeze(normalized);
}

function singleHeader(
  headers: readonly GermanTask6cL02CaptureNormalizedHeaderDeV3[],
  name: string,
  missingCode: string,
): string {
  const matches = headers.filter((header) => header.name === name);
  if (matches.length !== 1) fail(missingCode);
  return matches[0].value;
}

function decodeEntity(
  coding: "identity" | "gzip" | "br" | "deflate",
  encoded: Buffer,
): Buffer {
  const maximumDecodedBytes =
    GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.maximumDecodedBytes;
  if (coding === "identity") {
    if (encoded.length > maximumDecodedBytes) {
      fail("CAPTURE_DECODED_BODY_TOO_LARGE");
    }
    return Buffer.from(encoded);
  }
  try {
    const options = { maxOutputLength: maximumDecodedBytes } as const;
    const decoded =
      coding === "gzip"
        ? gunzipSync(encoded, options)
        : coding === "br"
          ? brotliDecompressSync(encoded, options)
          : inflateSync(encoded, options);
    if (decoded.length > maximumDecodedBytes) {
      fail("CAPTURE_DECODED_BODY_TOO_LARGE");
    }
    return decoded;
  } catch (error) {
    if (
      (error instanceof Error &&
        error.message === "CAPTURE_DECODED_BODY_TOO_LARGE") ||
      (isRecord(error) && error.code === "ERR_BUFFER_TOO_LARGE")
    ) {
      fail("CAPTURE_DECODED_BODY_TOO_LARGE");
    }
    fail("CAPTURE_CONTENT_DECODING_FAILED");
  }
}

function strictUtf8(bytes: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("CAPTURE_UTF8_INVALID");
  }
}

function validateTlsAndNetwork(
  observation: GermanTask6cL02CaptureResponseObservationDeV3,
): void {
  if (
    !Array.isArray(observation.dnsAddresses) ||
    observation.dnsAddresses.length === 0 ||
    observation.dnsAddresses.some(
      (address) =>
        typeof address !== "string" ||
        !isGermanTask6cL02CapturePublicIpDeV3(address),
    )
  ) {
    fail("CAPTURE_DNS_ADDRESS_FORBIDDEN");
  }
  if (!isGermanTask6cL02CapturePublicIpDeV3(observation.connectedAddress)) {
    fail("CAPTURE_PEER_ADDRESS_FORBIDDEN");
  }
  const resolved = new Set(observation.dnsAddresses.map(ipIdentity));
  if (!resolved.has(ipIdentity(observation.connectedAddress))) {
    fail("CAPTURE_PEER_ADDRESS_MISMATCH");
  }
  if (observation.tls.authorized !== true) fail("CAPTURE_TLS_UNAUTHORIZED");
  if (!new Set(["TLSv1.2", "TLSv1.3"]).has(observation.tls.protocol ?? "")) {
    fail("CAPTURE_TLS_PROTOCOL_INVALID");
  }
  if (
    observation.tls.servername !== "www.dwds.de" ||
    !observation.tls.subjectAltName
      .split(/\s*,\s*/u)
      .some((entry) => entry.toLowerCase() === "dns:www.dwds.de")
  ) {
    fail("CAPTURE_TLS_HOST_MISMATCH");
  }
}

export function validateGermanTask6cL02CaptureResponseDeV3(
  row: GermanTask6cL02CaptureRosterRowDeV3,
  value: unknown,
): GermanTask6cL02CaptureValidatedResponseDeV3 {
  if (
    !GERMAN_TASK6C_L02_CAPTURE_ROSTER_DE_V3.includes(row) ||
    !isRecord(value)
  ) {
    fail("CAPTURE_RESPONSE_INVALID");
  }
  const observation = value as GermanTask6cL02CaptureResponseObservationDeV3;
  assertExactUrl(observation.canonicalUrl, row.canonicalUrl);
  if (
    Number.isInteger(observation.statusCode) &&
    observation.statusCode >= 300 &&
    observation.statusCode <= 399
  ) {
    fail("CAPTURE_REDIRECT_FORBIDDEN");
  }
  if (observation.statusCode !== 200) fail("CAPTURE_HTTP_STATUS_INVALID");
  validateTlsAndNetwork(observation);
  const normalizedHeaders = normalizeGermanTask6cL02CaptureHeadersDeV3(
    observation.rawHeaders,
  );
  const contentType = singleHeader(
    normalizedHeaders,
    "content-type",
    "CAPTURE_CONTENT_TYPE_MISMATCH",
  );
  if (contentType !== "text/html; charset=UTF-8") {
    fail("CAPTURE_CONTENT_TYPE_MISMATCH");
  }
  const encodingHeaders = normalizedHeaders.filter(
    (header) => header.name === "content-encoding",
  );
  if (
    encodingHeaders.length > 1 ||
    (encodingHeaders.length === 1 && encodingHeaders[0].value.includes(","))
  ) {
    fail("CAPTURE_CONTENT_ENCODING_AMBIGUOUS");
  }
  const contentCoding =
    encodingHeaders.length === 0
      ? "identity"
      : encodingHeaders[0].value.toLowerCase();
  if (
    !GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.allowedContentCodings.includes(
      contentCoding as "identity" | "gzip" | "br" | "deflate",
    )
  ) {
    fail("CAPTURE_CONTENT_ENCODING_UNSUPPORTED");
  }
  if (
    !Array.isArray(observation.encodedEntityChunks) ||
    observation.encodedEntityChunks.length === 0 ||
    observation.encodedEntityChunks.some((chunk) => !Buffer.isBuffer(chunk))
  ) {
    fail("CAPTURE_ENCODED_BODY_INVALID");
  }
  const encodedEntityBody = Buffer.concat(observation.encodedEntityChunks);
  if (
    encodedEntityBody.length === 0 ||
    encodedEntityBody.length >
      GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.maximumEncodedBytes
  ) {
    fail("CAPTURE_ENCODED_BODY_SIZE_INVALID");
  }
  const decodedRepresentationBody = decodeEntity(
    contentCoding as "identity" | "gzip" | "br" | "deflate",
    encodedEntityBody,
  );
  const html = strictUtf8(decodedRepresentationBody);
  const title = `${row.lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS`;
  if (
    !html.includes(`<link rel="canonical" href="${row.canonicalUrl}"/>`) ||
    !html.includes(`<title>${title}</title>`) ||
    !html.includes(`<h1><b>${row.lemma}</b>`) ||
    !new RegExp(`\\bid=["']${row.sourceAnchor}["']`, "u").test(html)
  ) {
    fail("CAPTURE_DECODED_IDENTITY_INVALID");
  }
  return Object.freeze({
    row,
    statusCode: 200 as const,
    rawHeaders: Object.freeze([...observation.rawHeaders]),
    normalizedHeaders,
    contentType: "text/html; charset=UTF-8" as const,
    contentCoding: contentCoding as "identity" | "gzip" | "br" | "deflate",
    encodedEntityBody: Buffer.from(encodedEntityBody),
    decodedRepresentationBody: Buffer.from(decodedRepresentationBody),
    dnsAddresses: Object.freeze([...observation.dnsAddresses]),
    connectedAddress: observation.connectedAddress,
    tls: Object.freeze({ ...observation.tls }),
    title,
    headword: row.lemma,
  });
}

function descriptor(pathValue: string, bytes: Buffer) {
  return Object.freeze({
    path: pathValue,
    sha256: sha256GermanTask6cL02CaptureBytesDeV3(bytes),
    bytes: bytes.length,
  });
}

export function buildGermanTask6cL02CaptureEvidenceFilesDeV3(
  captures: readonly GermanTask6cL02CaptureValidatedResponseDeV3[],
  window: BuildWindowDeV3,
): ReadonlyMap<string, Buffer> {
  if (
    captures.length !== GERMAN_TASK6C_L02_CAPTURE_ROSTER_DE_V3.length ||
    captures.some(
      (capture, index) =>
        capture.row !== GERMAN_TASK6C_L02_CAPTURE_ROSTER_DE_V3[index],
    )
  ) {
    fail("CAPTURE_ROSTER_INVALID");
  }
  const startedAt = assertIsoTimestamp(
    window.startedAt,
    "CAPTURE_WINDOW_INVALID",
  );
  const completedAt = assertIsoTimestamp(
    window.completedAt,
    "CAPTURE_WINDOW_INVALID",
  );
  if (completedAt < startedAt) fail("CAPTURE_WINDOW_INVALID");
  if (!/^[0-9a-f]{40}$/u.test(window.sourceSha))
    fail("CAPTURE_SOURCE_SHA_INVALID");

  const files = new Map<string, Buffer>();
  const manifestCaptures = captures.map((capture) => {
    const slug = capture.row.outputSlug;
    const headerPath = `headers/${slug}.normalized.json`;
    const encodedPath = `encoded-entity/${slug}.bin`;
    const decodedPath = `decoded-representation/${slug}.html`;
    const headerBytes = canonicalizeGermanTask6cL02CaptureJsonLineDeV3({
      schemaVersion: "learning-v2-de-task6c-l02-normalized-headers.v3",
      rawHeaders: capture.rawHeaders,
      normalizedHeaders: capture.normalizedHeaders,
    });
    files.set(headerPath, headerBytes);
    files.set(encodedPath, Buffer.from(capture.encodedEntityBody));
    files.set(decodedPath, Buffer.from(capture.decodedRepresentationBody));
    return Object.freeze({
      sourcePlanId: capture.row.sourcePlanId,
      lemma: capture.row.lemma,
      chapterId: capture.row.chapterId,
      checkpointPacketId: capture.row.checkpointPacketId,
      sourceAnchor: capture.row.sourceAnchor,
      request: Object.freeze({
        method: GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.method,
        canonicalUrl: capture.row.canonicalUrl,
        headers: GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.headers,
        redirectMode:
          GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.redirectMode,
        maxRedirects:
          GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.maxRedirects,
      }),
      response: Object.freeze({
        finalUrl: capture.row.canonicalUrl,
        httpStatus: capture.statusCode,
        redirectChain: Object.freeze([]),
        dnsAddresses: capture.dnsAddresses,
        connectedAddress: capture.connectedAddress,
        tls: capture.tls,
        contentType: capture.contentType,
        contentCoding: capture.contentCoding,
        title: capture.title,
        headword: capture.headword,
        headerTranscript: descriptor(headerPath, headerBytes),
        encodedEntityBody: Object.freeze({
          ...descriptor(encodedPath, capture.encodedEntityBody),
          semantic:
            GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.encodedEntitySemantic,
        }),
        decodedRepresentationBody: Object.freeze({
          ...descriptor(decodedPath, capture.decodedRepresentationBody),
          semantic:
            GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.decodedRepresentationSemantic,
          charset: "utf-8",
        }),
      }),
    });
  });
  const contract = getGermanTask6cL02CaptureProducerContractDeV3();
  const manifest = Object.freeze({
    schemaVersion: "learning-v2-de-task6c-l02-direct-capture.v3",
    captureKind:
      "GITHUB_HOSTED_NODE_HTTPS_CONTENT_CODED_ENTITY_AND_DECODED_REPRESENTATION_BYTES_V3",
    status: "HOLD_CAPTURE_ONLY",
    targetLanguage: "de",
    sourceSha: window.sourceSha,
    inputDigestSha256: contract.inputDigestSha256,
    predecessor: contract.predecessor,
    task5: contract.task5,
    workflow: Object.freeze({
      ...contract.workflow,
      repository: EXPECTED_REPOSITORY,
      ref: EXPECTED_REF,
    }),
    networkPolicy: contract.networkPolicy,
    captureWindow: Object.freeze({
      startedAt: window.startedAt,
      completedAt: window.completedAt,
    }),
    captures: Object.freeze(manifestCaptures),
    authority: Object.freeze({
      canonicalAdmission: "FORBIDDEN",
      learnerFacing: false,
      releaseAuthorized: false,
      rowsPromoted: 0,
      task7Unlock: false,
      translationsPresent: false,
    }),
  });
  files.set(
    "manifest.json",
    canonicalizeGermanTask6cL02CaptureJsonLineDeV3(manifest),
  );
  const actual = [...files.keys()].sort();
  const expected =
    GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceFileAllowlist;
  if (
    actual.length !== expected.length ||
    actual.some((filePath, index) => filePath !== expected[index])
  ) {
    fail("CAPTURE_OUTPUT_FILE_SET_INVALID");
  }
  return files;
}

export function validateGermanTask6cL02CaptureEvidenceFilesDeV3(
  files: ReadonlyMap<string, Buffer>,
): JsonRecord {
  const actual = [...files.keys()].sort();
  const expected =
    GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceFileAllowlist;
  if (
    actual.length !== expected.length ||
    actual.some((filePath, index) => filePath !== expected[index])
  ) {
    fail("CAPTURE_OUTPUT_FILE_SET_INVALID");
  }
  const manifestBytes = files.get("manifest.json");
  if (!manifestBytes) fail("CAPTURE_MANIFEST_INVALID");
  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8")) as unknown;
  } catch {
    fail("CAPTURE_MANIFEST_INVALID");
  }
  if (
    !isRecord(manifest) ||
    !canonicalizeGermanTask6cL02CaptureJsonLineDeV3(manifest).equals(
      manifestBytes,
    ) ||
    !isRecord(manifest.captureWindow) ||
    typeof manifest.captureWindow.startedAt !== "string" ||
    typeof manifest.captureWindow.completedAt !== "string" ||
    typeof manifest.sourceSha !== "string" ||
    !Array.isArray(manifest.captures) ||
    manifest.captures.length !== GERMAN_TASK6C_L02_CAPTURE_ROSTER_DE_V3.length
  ) {
    fail("CAPTURE_MANIFEST_INVALID");
  }
  const manifestCaptures = manifest.captures;
  const captures = GERMAN_TASK6C_L02_CAPTURE_ROSTER_DE_V3.map((row, index) => {
    const manifestCapture = manifestCaptures[index];
    if (!isRecord(manifestCapture) || !isRecord(manifestCapture.response)) {
      fail("CAPTURE_MANIFEST_INVALID");
    }
    const response = manifestCapture.response;
    const headerPath = `headers/${row.outputSlug}.normalized.json`;
    const headerBytes = files.get(headerPath);
    const encoded = files.get(`encoded-entity/${row.outputSlug}.bin`);
    if (!headerBytes || !encoded) fail("CAPTURE_OUTPUT_FILE_SET_INVALID");
    let headerTranscript: unknown;
    try {
      headerTranscript = JSON.parse(headerBytes.toString("utf8")) as unknown;
    } catch {
      fail("CAPTURE_HEADER_TRANSCRIPT_INVALID");
    }
    if (
      !isRecord(headerTranscript) ||
      !canonicalizeGermanTask6cL02CaptureJsonLineDeV3(headerTranscript).equals(
        headerBytes,
      ) ||
      !Array.isArray(headerTranscript.rawHeaders) ||
      !Array.isArray(response.dnsAddresses) ||
      typeof response.finalUrl !== "string" ||
      typeof response.httpStatus !== "number" ||
      typeof response.connectedAddress !== "string" ||
      !isRecord(response.tls) ||
      typeof response.tls.authorized !== "boolean" ||
      !(
        typeof response.tls.protocol === "string" ||
        response.tls.protocol === null
      ) ||
      typeof response.tls.servername !== "string" ||
      typeof response.tls.subjectAltName !== "string"
    ) {
      fail("CAPTURE_HEADER_TRANSCRIPT_INVALID");
    }
    return validateGermanTask6cL02CaptureResponseDeV3(row, {
      canonicalUrl: response.finalUrl,
      statusCode: response.httpStatus,
      rawHeaders: headerTranscript.rawHeaders as string[],
      encodedEntityChunks: [encoded],
      dnsAddresses: response.dnsAddresses as string[],
      connectedAddress: response.connectedAddress,
      tls: {
        authorized: response.tls.authorized,
        protocol: response.tls.protocol,
        servername: response.tls.servername,
        subjectAltName: response.tls.subjectAltName,
      },
    });
  });
  const rebuilt = buildGermanTask6cL02CaptureEvidenceFilesDeV3(captures, {
    startedAt: manifest.captureWindow.startedAt,
    completedAt: manifest.captureWindow.completedAt,
    sourceSha: manifest.sourceSha,
  });
  for (const filePath of expected) {
    if (
      !files.get(filePath)?.equals(rebuilt.get(filePath) ?? Buffer.alloc(0))
    ) {
      fail("CAPTURE_OUTPUT_TAMPERED");
    }
  }
  return manifest;
}

function gitText(args: readonly string[]): string {
  const result = spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) fail("CAPTURE_PRODUCER_GIT_STATE_UNAVAILABLE");
  return result.stdout.trimEnd();
}

function captureRuntimeSnapshot(): GermanTask6cL02CaptureProducerRuntimeSnapshotDeV3 {
  const workspace = process.env.GITHUB_WORKSPACE ?? "";
  const runnerTemp = process.env.RUNNER_TEMP ?? "";
  let workspaceRealpath = "";
  let runnerTempIsSymlink = false;
  let runnerTempIsDirectory = false;
  try {
    if (workspace !== "") workspaceRealpath = fs.realpathSync.native(workspace);
    if (runnerTemp !== "") {
      const stat = fs.lstatSync(runnerTemp);
      runnerTempIsSymlink = stat.isSymbolicLink();
      runnerTempIsDirectory = stat.isDirectory();
    }
  } catch {
    // The pure validator maps missing/unreadable paths to a stable denial.
  }
  return Object.freeze({
    argumentCount: process.argv.slice(2).length,
    env: Object.freeze({
      GITHUB_ACTIONS: process.env.GITHUB_ACTIONS,
      CI: process.env.CI,
      RUNNER_ENVIRONMENT: process.env.RUNNER_ENVIRONMENT,
      GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
      GITHUB_EVENT_NAME: process.env.GITHUB_EVENT_NAME,
      GITHUB_REF: process.env.GITHUB_REF,
      GITHUB_REF_PROTECTED: process.env.GITHUB_REF_PROTECTED,
      GITHUB_WORKFLOW_REF: process.env.GITHUB_WORKFLOW_REF,
      GITHUB_SHA: process.env.GITHUB_SHA,
      GITHUB_WORKFLOW_SHA: process.env.GITHUB_WORKFLOW_SHA,
      GITHUB_WORKSPACE: workspace,
      RUNNER_TEMP: runnerTemp,
    }),
    cwdRealpath: fs.realpathSync.native(process.cwd()),
    workspaceRealpath,
    gitHead: gitText(["rev-parse", "HEAD"]),
    gitStatusPorcelain: gitText([
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ]),
    runnerTempIsAbsolute: path.isAbsolute(runnerTemp),
    runnerTempIsSymlink,
    runnerTempIsDirectory,
    outputRootExists:
      runnerTemp !== "" &&
      fs.existsSync(
        path.join(
          runnerTemp,
          GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceRootName,
        ),
      ),
  });
}

export function assertGermanTask6cL02CaptureProducerRuntimeDeV3(): void {
  if (arguments.length !== 0) fail("CAPTURE_PRODUCER_CALLER_INPUT_FORBIDDEN");
  assertGermanTask6cL02CaptureProducerRuntimeSnapshotDeV3(
    captureRuntimeSnapshot(),
  );
}

export function assertGermanTask6cL02CapturePostCaptureRuntimeDeV3(): void {
  if (arguments.length !== 0) fail("CAPTURE_PRODUCER_CALLER_INPUT_FORBIDDEN");
  const snapshot = captureRuntimeSnapshot();
  assertGermanTask6cL02CaptureProducerRuntimeSnapshotDeV3({
    ...snapshot,
    outputRootExists: false,
  });
  if (!snapshot.outputRootExists)
    fail("CAPTURE_PRODUCER_EVIDENCE_ROOT_MISSING");
  const runnerTemp = snapshot.env.RUNNER_TEMP;
  if (!runnerTemp) fail("CAPTURE_PRODUCER_RUNNER_TEMP_INVALID");
  const root = path.join(
    runnerTemp,
    GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceRootName,
  );
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    fail("CAPTURE_PRODUCER_EVIDENCE_ROOT_INVALID");
  }
}

async function resolvePublicAddresses(): Promise<readonly string[]> {
  const results = await dns.lookup("www.dwds.de", {
    all: true,
    verbatim: true,
  });
  const addresses = [...new Set(results.map(({ address }) => address))].sort();
  if (
    addresses.length === 0 ||
    addresses.some((address) => !isGermanTask6cL02CapturePublicIpDeV3(address))
  ) {
    fail("CAPTURE_DNS_ADDRESS_FORBIDDEN");
  }
  return Object.freeze(addresses);
}

async function captureRosterRowDeV3(
  row: GermanTask6cL02CaptureRosterRowDeV3,
): Promise<GermanTask6cL02CaptureValidatedResponseDeV3> {
  const parsed = assertExactUrl(row.canonicalUrl, row.canonicalUrl);
  const dnsAddresses = await resolvePublicAddresses();
  const pinnedAddress = dnsAddresses[0];
  const family = isIP(pinnedAddress);
  return await new Promise((resolve, reject) => {
    const requestHandle = request(
      parsed,
      {
        method: GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.method,
        headers: GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.headers,
        agent: false,
        servername: "www.dwds.de",
        lookup: (_hostname, _options, callback) => {
          callback(null, pinnedAddress, family);
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let totalBytes = 0;
        response.on("data", (chunk: Buffer | string) => {
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          totalBytes += bytes.length;
          if (
            totalBytes >
            GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.maximumEncodedBytes
          ) {
            requestHandle.destroy(
              new Error("CAPTURE_ENCODED_BODY_SIZE_INVALID"),
            );
            return;
          }
          chunks.push(Buffer.from(bytes));
        });
        response.once("end", () => {
          try {
            const socket = response.socket as TLSSocket;
            const certificate = socket.getPeerCertificate();
            resolve(
              validateGermanTask6cL02CaptureResponseDeV3(row, {
                canonicalUrl: row.canonicalUrl,
                statusCode: response.statusCode ?? 0,
                rawHeaders: response.rawHeaders,
                encodedEntityChunks: chunks,
                dnsAddresses,
                connectedAddress: socket.remoteAddress ?? "",
                tls: {
                  authorized: socket.authorized,
                  protocol: socket.getProtocol(),
                  servername: socket.servername,
                  subjectAltName: certificate.subjectaltname ?? "",
                },
              }),
            );
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    requestHandle.setTimeout(
      GERMAN_TASK6C_L02_CAPTURE_NETWORK_POLICY_DE_V3.requestTimeoutMs,
      () => requestHandle.destroy(new Error("CAPTURE_REQUEST_TIMEOUT")),
    );
    requestHandle.once("error", reject);
    requestHandle.end();
  });
}

function writeEvidenceRoot(
  outputRoot: string,
  files: ReadonlyMap<string, Buffer>,
): void {
  if (fs.existsSync(outputRoot)) fail("CAPTURE_PRODUCER_IMMUTABLE_ROOT_EXISTS");
  fs.mkdirSync(outputRoot, { recursive: false, mode: 0o700 });
  for (const filePath of GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceFileAllowlist) {
    const bytes = files.get(filePath);
    if (!bytes) fail("CAPTURE_OUTPUT_FILE_SET_INVALID");
    const absolute = path.join(outputRoot, ...filePath.split("/"));
    fs.mkdirSync(path.dirname(absolute), { recursive: true, mode: 0o700 });
    fs.writeFileSync(absolute, bytes, { flag: "wx", mode: 0o644 });
  }
}

export async function runGermanTask6cL02CaptureProducerDeV3(): Promise<void> {
  if (arguments.length !== 0) fail("CAPTURE_PRODUCER_CALLER_INPUT_FORBIDDEN");
  assertGermanTask6cL02CaptureProducerRuntimeDeV3();
  const startedAt = new Date().toISOString();
  const captures: GermanTask6cL02CaptureValidatedResponseDeV3[] = [];
  for (const row of GERMAN_TASK6C_L02_CAPTURE_ROSTER_DE_V3) {
    captures.push(await captureRosterRowDeV3(row));
  }
  const files = buildGermanTask6cL02CaptureEvidenceFilesDeV3(captures, {
    startedAt,
    completedAt: new Date().toISOString(),
    sourceSha: process.env.GITHUB_SHA ?? "",
  });
  validateGermanTask6cL02CaptureEvidenceFilesDeV3(files);
  assertGermanTask6cL02CaptureProducerRuntimeDeV3();
  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) fail("CAPTURE_PRODUCER_RUNNER_TEMP_INVALID");
  const outputRoot = path.join(
    runnerTemp,
    GERMAN_TASK6C_L02_CAPTURE_PRODUCER_PATHS_DE_V3.evidenceRootName,
  );
  writeEvidenceRoot(outputRoot, files);
  process.stdout.write(
    `CAPTURE_V3_COMPLETE status=HOLD_CAPTURE_ONLY files=${files.size} root=${outputRoot}\n`,
  );
}
