import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { isIP } from "node:net";
import * as path from "node:path";

type JsonRecord = Record<string, unknown>;

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const TASK5_PATH =
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json";
const MODULE_PATH =
  "modules/learning-v2/curriculum/de/task6c_l02_identity_capture_transport_de_v4.ts";
const INSPECTION_SCRIPT_PATH =
  "scripts/inspect_learning_v2_de_task6c_l02_identity_capture_v4.ts";
const TASK5_BYTE_SHA256 =
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const TASK5_CANONICAL_BODY_SHA256 =
  "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3";

const IMPLEMENTATION_PATHS = Object.freeze([
  MODULE_PATH,
  INSPECTION_SCRIPT_PATH,
] as const);

export const GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4 = Object.freeze([
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

export const GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4 =
  Object.freeze({
    method: "GET" as const,
    headers: Object.freeze({
      accept: "text/html,application/xhtml+xml",
      "accept-encoding": "identity",
      "user-agent": "Phraseman-Learning-V2-evidence/4.0",
    }),
    redirectMode: "REJECT" as const,
    maxRedirects: 0 as const,
    exactScheme: "https:" as const,
    exactHost: "www.dwds.de" as const,
    exactPort: 443 as const,
    responseContentCoding: "identity" as const,
    responseTransferEncoding: "ABSENT_OR_SINGLE_CHUNKED_HTTP_1_1" as const,
    contentLengthPolicy:
      "FORBIDDEN_WITH_CHUNKED_OTHERWISE_ABSENT_OR_SINGLE_CANONICAL_DECIMAL_MATCHING_ENTITY_BYTES" as const,
    nodeIncomingMessagePolicy: Object.freeze({
      dataChunks:
        "BUFFER_ONLY_NO_SET_ENCODING_DECOMPRESS_OR_TRANSFORM" as const,
      validateAfterEnd: true as const,
      complete: true as const,
      aborted: false as const,
      errorObserved: false as const,
      closeBeforeEnd: false as const,
      trailers: "FORBIDDEN" as const,
    }),
    transferFramingSemantic:
      "ENTITY_BYTES_AFTER_HTTP_TRANSFER_FRAMING_REMOVAL" as const,
    maximumBodyBytes: 8 * 1024 * 1024,
  });

const AUTHORITY = Object.freeze({
  canonicalAdmission: "FORBIDDEN" as const,
  learnerFacing: false as const,
  releaseAuthorized: false as const,
  rowsPromoted: 0 as const,
  status: "HOLD_CAPTURE_ONLY" as const,
  task7Unlock: false as const,
  translationsPresent: false as const,
});

const EVIDENCE_FILE_ALLOWLIST = Object.freeze(
  [
    "manifest.json",
    ...GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4.flatMap(
      ({ outputSlug }) => [
        `headers/${outputSlug}.normalized.json`,
        `encoded-entity/${outputSlug}.bin`,
        `decoded-representation/${outputSlug}.html`,
      ],
    ),
  ].sort(),
);

export const GERMAN_TASK6C_L02_IDENTITY_CAPTURE_PATHS_DE_V4 = Object.freeze({
  task5: TASK5_PATH,
  evidenceRootName: "learning-v2-de-task6c-l02-identity-capture-v4",
  evidenceFileAllowlist: EVIDENCE_FILE_ALLOWLIST,
});

export type GermanTask6cL02IdentityCaptureRosterRowDeV4 =
  (typeof GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4)[number];

type ImplementationDescriptorDeV4 = Readonly<{
  path: (typeof IMPLEMENTATION_PATHS)[number];
  sha256: string;
}>;

export type GermanTask6cL02IdentityCaptureContractDeV4 = Readonly<{
  schemaVersion: "learning-v2-de-task6c-l02-identity-capture-contract.v4";
  targetLanguage: "de";
  task5: Readonly<{
    path: typeof TASK5_PATH;
    byteSha256: typeof TASK5_BYTE_SHA256;
    canonicalBodySha256: typeof TASK5_CANONICAL_BODY_SHA256;
  }>;
  roster: typeof GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4;
  requestPolicy: typeof GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4;
  implementationFiles: readonly ImplementationDescriptorDeV4[];
  authority: typeof AUTHORITY;
  inputDigestSha256: string;
}>;

export type GermanTask6cL02IdentityCaptureNormalizedHeaderDeV4 = Readonly<{
  name: string;
  value: string;
}>;

type TlsObservationDeV4 = Readonly<{
  authorized: boolean;
  protocol: string | null;
  servername: string;
  subjectAltName: string;
}>;

type ResponseObservationDeV4 = Readonly<{
  request: Readonly<{
    method: string;
    headers: Readonly<Record<string, string>>;
    redirectMode: string;
    maxRedirects: number;
  }>;
  finalUrl: string;
  statusCode: number;
  httpVersion: string;
  endObserved: boolean;
  complete: boolean;
  aborted: boolean;
  errorObserved: boolean;
  closeBeforeEnd: boolean;
  rawHeaders: readonly string[];
  rawTrailers: readonly string[];
  bodyChunks: readonly Buffer[];
  dnsAddresses: readonly string[];
  connectedAddress: string;
  tls: TlsObservationDeV4;
}>;

export type GermanTask6cL02IdentityCaptureValidatedResponseDeV4 = Readonly<{
  row: GermanTask6cL02IdentityCaptureRosterRowDeV4;
  finalUrl: string;
  statusCode: 200;
  httpVersion: "1.0" | "1.1" | "2.0";
  transferFraming: "NONE" | "CHUNKED_REMOVED_BY_NODE_HTTP_PARSER";
  messageComplete: true;
  nodeIncomingMessage: Readonly<{
    endObserved: true;
    complete: true;
    aborted: false;
    errorObserved: false;
    closeBeforeEnd: false;
    rawTrailers: readonly string[];
  }>;
  rawHeaders: readonly string[];
  normalizedHeaders: readonly GermanTask6cL02IdentityCaptureNormalizedHeaderDeV4[];
  contentType: "text/html; charset=UTF-8";
  contentCoding: "identity";
  encodedEntityBody: Buffer;
  decodedRepresentationBody: Buffer;
  dnsAddresses: readonly string[];
  connectedAddress: string;
  tls: TlsObservationDeV4;
  title: string;
  headword: string;
}>;

type CaptureWindowDeV4 = Readonly<{
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
  if (serialized === undefined) fail("CAPTURE_V4_CANONICAL_JSON_INVALID");
  return serialized;
}

export function canonicalizeGermanTask6cL02IdentityCaptureJsonLineDeV4(
  value: unknown,
): Buffer {
  return Buffer.from(`${canonicalJson(value)}\n`, "utf8");
}

function fileDescriptor(filePath: string, bytes: Buffer) {
  return Object.freeze({
    path: filePath,
    sha256: sha256(bytes),
    bytes: bytes.length,
  });
}

function fileSha(relativePath: string): string {
  const absolute = path.join(REPO_ROOT, ...relativePath.split("/"));
  if (!fs.existsSync(absolute)) fail("CAPTURE_V4_INPUT_FILE_MISSING");
  return sha256(fs.readFileSync(absolute));
}

function task5Contract(): GermanTask6cL02IdentityCaptureContractDeV4["task5"] {
  const actual = fileSha(TASK5_PATH);
  if (actual !== TASK5_BYTE_SHA256) fail("CAPTURE_V4_TASK5_HASH_MISMATCH");
  return Object.freeze({
    path: TASK5_PATH,
    byteSha256: TASK5_BYTE_SHA256,
    canonicalBodySha256: TASK5_CANONICAL_BODY_SHA256,
  });
}

export function getGermanTask6cL02IdentityCaptureContractDeV4(): GermanTask6cL02IdentityCaptureContractDeV4 {
  const implementationFiles = Object.freeze(
    IMPLEMENTATION_PATHS.map((filePath) =>
      Object.freeze({ path: filePath, sha256: fileSha(filePath) }),
    ),
  );
  const unsigned = Object.freeze({
    schemaVersion:
      "learning-v2-de-task6c-l02-identity-capture-contract.v4" as const,
    targetLanguage: "de" as const,
    task5: task5Contract(),
    roster: GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4,
    requestPolicy: GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4,
    implementationFiles,
    authority: AUTHORITY,
  });
  return Object.freeze({
    ...unsigned,
    inputDigestSha256: sha256(canonicalJson(unsigned)),
  });
}

function assertIsoTimestamp(value: unknown): number {
  if (typeof value !== "string") fail("CAPTURE_V4_WINDOW_INVALID");
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail("CAPTURE_V4_WINDOW_INVALID");
  }
  return parsed;
}

function normalizeHeaders(
  rawHeaders: readonly string[],
): readonly GermanTask6cL02IdentityCaptureNormalizedHeaderDeV4[] {
  if (!Array.isArray(rawHeaders) || rawHeaders.length % 2 !== 0) {
    fail("CAPTURE_V4_RAW_HEADERS_INVALID");
  }
  const normalized: GermanTask6cL02IdentityCaptureNormalizedHeaderDeV4[] = [];
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const rawName = rawHeaders[index];
    const rawValue = rawHeaders[index + 1];
    if (
      typeof rawName !== "string" ||
      !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u.test(rawName)
    ) {
      fail("CAPTURE_V4_HEADER_NAME_INVALID");
    }
    if (typeof rawValue !== "string" || /[\u0000\r\n]/u.test(rawValue)) {
      fail("CAPTURE_V4_HEADER_VALUE_INVALID");
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
  headers: readonly GermanTask6cL02IdentityCaptureNormalizedHeaderDeV4[],
  name: string,
): string {
  const matches = headers.filter((header) => header.name === name);
  if (matches.length !== 1) fail("CAPTURE_V4_CONTENT_TYPE_MISMATCH");
  return matches[0].value;
}

function strictUtf8(bytes: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("CAPTURE_V4_UTF8_INVALID");
  }
}

function assertExactDwdsHeadwordBlock(
  html: string,
  lemma: string,
  tags: readonly HtmlTagDeV4[],
  activeStartTags: readonly ParsedHtmlStartTagDeV4[],
): void {
  const body = singleHtmlElementRange(tags, "body");
  const blocks = activeStartTags.filter(({ attributes }) =>
    hasCaseSensitiveToken(attributes.get("class"), "dwdswb-ft-lemmaansatz"),
  );
  if (
    blocks.length !== 1 ||
    blocks[0].tag.name !== "h1" ||
    blocks[0].tag.start <= body.start.end ||
    blocks[0].tag.end >= body.end.start ||
    blocks[0].tag.raw !== '<h1 class="dwdswb-ft-lemmaansatz">'
  ) {
    fail("CAPTURE_V4_HEADWORD_BLOCK_INVALID");
  }
  const block = blocks[0].tag;
  const closing = tags.find(
    (tag) =>
      tag.closing &&
      tag.name === "h1" &&
      tag.start > block.end &&
      tag.end < body.end.start,
  );
  if (!closing) fail("CAPTURE_V4_HEADWORD_BLOCK_INVALID");
  const inner = html.slice(block.end + 1, closing.start);
  const expectedLemma = `<b>${lemma}</b>`;
  if (
    !inner.startsWith(expectedLemma) ||
    !/^(?:, (?:der|die|das))?$/u.test(inner.slice(expectedLemma.length))
  ) {
    fail("CAPTURE_V4_HEADWORD_BLOCK_INVALID");
  }
}

type HtmlTagDeV4 = Readonly<{
  raw: string;
  name: string;
  closing: boolean;
  start: number;
  end: number;
}>;

type ParsedHtmlStartTagDeV4 = Readonly<{
  tag: HtmlTagDeV4;
  attributes: ReadonlyMap<string, string | null>;
}>;

function singleHtmlElementRange(
  tags: readonly HtmlTagDeV4[],
  name: "html" | "head" | "body",
): Readonly<{ start: HtmlTagDeV4; end: HtmlTagDeV4 }> {
  const starts = tags.filter((tag) => !tag.closing && tag.name === name);
  const ends = tags.filter((tag) => tag.closing && tag.name === name);
  if (
    starts.length !== 1 ||
    ends.length !== 1 ||
    ends[0].start <= starts[0].end
  ) {
    fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
  }
  return Object.freeze({ start: starts[0], end: ends[0] });
}

function assertExactHtmlDocumentStructure(
  htmlSource: string,
  tags: readonly HtmlTagDeV4[],
): void {
  const html = singleHtmlElementRange(tags, "html");
  const head = singleHtmlElementRange(tags, "head");
  const body = singleHtmlElementRange(tags, "body");
  if (
    !(
      html.start.start < head.start.start &&
      head.start.end < head.end.start &&
      head.end.end < body.start.start &&
      body.start.end < body.end.start &&
      body.end.end < html.end.start
    )
  ) {
    fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
  }
  if (
    tags.some(
      (tag) =>
        tag !== html.start &&
        tag !== html.end &&
        (tag.start <= html.start.end || tag.end >= html.end.start),
    )
  ) {
    fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
  }
  if (
    tags.some(
      (tag) =>
        (tag.start > html.start.end && tag.end < head.start.start) ||
        (tag.start > head.end.end && tag.end < body.start.start) ||
        (tag.start > body.end.end && tag.end < html.end.start),
    )
  ) {
    fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
  }
  const prefix = htmlSource.slice(0, html.start.start);
  if (!/^[\t\n\f\r ]*<!doctype html>[\t\n\f\r ]*$/iu.test(prefix)) {
    fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
  }
  const parserSensitiveGaps = [
    htmlSource.slice(html.start.end + 1, head.start.start),
    htmlSource.slice(head.end.end + 1, body.start.start),
    htmlSource.slice(body.end.end + 1, html.end.start),
    htmlSource.slice(html.end.end + 1),
  ];
  if (
    parserSensitiveGaps.some((gap) => !isAsciiWhitespaceOrStrictComments(gap))
  ) {
    fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
  }
  if (
    tags.some(
      (tag) =>
        tag.name === "title" &&
        !(tag.start > head.start.end && tag.end < head.end.start),
    )
  ) {
    fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
  }
}

function strictHtmlCommentEnd(value: string, start: number): number {
  if (!value.startsWith("<!--", start)) {
    fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
  }
  const end = value.indexOf("-->", start + 4);
  if (end < 0) fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
  const body = value.slice(start + 4, end);
  if (
    body.startsWith(">") ||
    body.startsWith("->") ||
    body.includes("<!--") ||
    body.includes("--") ||
    body.endsWith("<!-")
  ) {
    fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
  }
  return end + 2;
}

function isAsciiWhitespaceOrStrictComments(value: string): boolean {
  let cursor = 0;
  while (cursor < value.length) {
    if (/[\t\n\f\r ]/u.test(value[cursor])) {
      cursor += 1;
      continue;
    }
    if (!value.startsWith("<!--", cursor)) return false;
    cursor = strictHtmlCommentEnd(value, cursor) + 1;
  }
  return true;
}

function assertHeadParserSafe(
  html: string,
  tags: readonly HtmlTagDeV4[],
): void {
  const head = singleHtmlElementRange(tags, "head");
  const directVoidChildren = new Set([
    "base",
    "basefont",
    "bgsound",
    "link",
    "meta",
  ]);
  const directContainerChildren = new Set([
    "title",
    "script",
    "style",
    "template",
  ]);
  const headTags = tags.filter(
    (tag) => tag.start > head.start.end && tag.end < head.end.start,
  );
  let cursor = head.start.end + 1;
  let activeContainer: string | null = null;
  for (const tag of headTags) {
    const gap = html.slice(cursor, tag.start);
    if (activeContainer === null && !isAsciiWhitespaceOrStrictComments(gap)) {
      fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    }
    if (activeContainer !== null) {
      if (!tag.closing || tag.name !== activeContainer) {
        fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
      }
      activeContainer = null;
      cursor = tag.end + 1;
      continue;
    }
    if (tag.closing) fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    if (directVoidChildren.has(tag.name)) {
      cursor = tag.end + 1;
      continue;
    }
    if (!directContainerChildren.has(tag.name)) {
      fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    }
    activeContainer = tag.name;
    cursor = tag.end + 1;
  }
  if (
    activeContainer !== null ||
    !isAsciiWhitespaceOrStrictComments(html.slice(cursor, head.end.start))
  ) {
    fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
  }
}

function tagEnd(html: string, start: number): number {
  let quote = "";
  for (let index = start + 1; index < html.length; index += 1) {
    const character = html[index];
    if (quote !== "") {
      if (character === quote) quote = "";
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }
  fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
}

function asciiLower(value: string): string {
  return value.replace(/[A-Z]/gu, (character) => character.toLowerCase());
}

function parseHtmlStartTagAttributes(
  tag: HtmlTagDeV4,
): ReadonlyMap<string, string | null> {
  if (tag.closing) fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
  const prefix = /^<[A-Za-z][A-Za-z0-9:-]*/u.exec(tag.raw);
  if (!prefix) fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
  const attributes = new Map<string, string | null>();
  let cursor = prefix[0].length;
  const skipWhitespace = (): void => {
    while (/[\t\n\f\r ]/u.test(tag.raw[cursor] ?? "")) cursor += 1;
  };
  while (cursor < tag.raw.length) {
    skipWhitespace();
    if (tag.raw[cursor] === ">" && cursor === tag.raw.length - 1) {
      return attributes;
    }
    if (tag.raw.startsWith("/>", cursor) && cursor + 2 === tag.raw.length) {
      return attributes;
    }
    const nameStart = cursor;
    while (
      cursor < tag.raw.length &&
      !/[\t\n\f\r "'>\/=]/u.test(tag.raw[cursor])
    ) {
      cursor += 1;
    }
    if (cursor === nameStart) {
      fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    }
    const name = asciiLower(tag.raw.slice(nameStart, cursor));
    skipWhitespace();
    let value: string | null = null;
    if (tag.raw[cursor] === "=") {
      cursor += 1;
      skipWhitespace();
      const quote = tag.raw[cursor];
      if (quote === '"' || quote === "'") {
        cursor += 1;
        const valueStart = cursor;
        const valueEnd = tag.raw.indexOf(quote, cursor);
        if (valueEnd < 0) fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
        value = tag.raw.slice(valueStart, valueEnd);
        cursor = valueEnd + 1;
      } else {
        const valueStart = cursor;
        while (
          cursor < tag.raw.length &&
          !/[\t\n\f\r "'`=<>]/u.test(tag.raw[cursor])
        ) {
          cursor += 1;
        }
        if (cursor === valueStart) {
          fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
        }
        value = tag.raw.slice(valueStart, cursor);
      }
    }
    if (attributes.has(name)) {
      fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    }
    if (
      value !== null &&
      (name === "rel" || name === "class" || name === "id") &&
      value.includes("&")
    ) {
      fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    }
    attributes.set(name, value);
  }
  fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
}

function hasAsciiCaseInsensitiveToken(
  value: string | null | undefined,
  expectedToken: string,
): boolean {
  if (value === null || value === undefined) return false;
  const expected = asciiLower(expectedToken);
  return value
    .split(/[\t\n\f\r ]+/u)
    .filter((token) => token.length > 0)
    .some((token) => asciiLower(token) === expected);
}

function hasCaseSensitiveToken(
  value: string | null | undefined,
  expectedToken: string,
): boolean {
  if (value === null || value === undefined) return false;
  return value
    .split(/[\t\n\f\r ]+/u)
    .filter((token) => token.length > 0)
    .includes(expectedToken);
}

function parseActiveHtmlStartTags(
  tags: readonly HtmlTagDeV4[],
): readonly ParsedHtmlStartTagDeV4[] {
  return Object.freeze(
    tags
      .filter((tag) => !tag.closing)
      .map((tag) =>
        Object.freeze({ tag, attributes: parseHtmlStartTagAttributes(tag) }),
      ),
  );
}

function scanSafeNoscriptFallback(
  html: string,
  contentStart: number,
): Readonly<{ closingStart: number; closingEnd: number; closingRaw: string }> {
  const allowedContainers = new Set(["div", "a", "p"]);
  const allowedVoidElements = new Set(["br", "img"]);
  const stack: string[] = [];
  let cursor = contentStart;
  while (cursor < html.length) {
    const start = html.indexOf("<", cursor);
    if (start < 0) fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    const end = tagEnd(html, start);
    const raw = html.slice(start, end + 1);
    const match = /^<(\/)?([^\t\n\f\r />]+)/u.exec(raw);
    if (!match) fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    const closing = match[1] === "/";
    const name = asciiLower(match[2]);
    if (closing) {
      if (!/^<\/[A-Za-z][A-Za-z0-9:-]*[\t\n\f\r ]*>$/u.test(raw)) {
        fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
      }
      if (name === "noscript") {
        if (stack.length !== 0) {
          fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
        }
        return Object.freeze({
          closingStart: start,
          closingEnd: end,
          closingRaw: raw,
        });
      }
      if (
        !allowedContainers.has(name) ||
        stack.length === 0 ||
        stack[stack.length - 1] !== name
      ) {
        fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
      }
      stack.pop();
      cursor = end + 1;
      continue;
    }
    if (name === "noscript") {
      fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    }
    if (!allowedContainers.has(name) && !allowedVoidElements.has(name)) {
      fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    }
    const tag = Object.freeze({ raw, name, closing: false, start, end });
    const attributes = parseHtmlStartTagAttributes(tag);
    if (
      attributes.has("id") ||
      hasCaseSensitiveToken(attributes.get("class"), "dwdswb-ft-lemmaansatz")
    ) {
      fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    }
    if (allowedContainers.has(name)) {
      if (raw.endsWith("/>")) {
        fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
      }
      stack.push(name);
    }
    cursor = end + 1;
  }
  fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
}

function scanHtmlTags(html: string): readonly HtmlTagDeV4[] {
  const tags: HtmlTagDeV4[] = [];
  const lower = html.toLowerCase();
  const rejectedRawTextElements = new Set([
    "xmp",
    "iframe",
    "noembed",
    "noframes",
    "plaintext",
  ]);
  const rejectedParserAmbiguousElements = new Set([
    "select",
    "option",
    "optgroup",
    "frameset",
    "frame",
  ]);
  const rejectedForeignNamespaceElements = new Set(["svg", "math"]);
  const skippedElements = new Set([
    "title",
    "script",
    "style",
    "textarea",
    "template",
  ]);
  let cursor = 0;
  while (cursor < html.length) {
    const start = html.indexOf("<", cursor);
    if (start < 0) break;
    if (html.startsWith("<!--", start)) {
      cursor = strictHtmlCommentEnd(html, start) + 1;
      continue;
    }
    const end = tagEnd(html, start);
    const raw = html.slice(start, end + 1);
    if (/^<!doctype html>$/iu.test(raw)) {
      cursor = end + 1;
      continue;
    }
    const match = /^<(\/)?([^\t\n\f\r />]+)/u.exec(raw);
    if (!match) {
      fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    }
    if (!/^[A-Za-z][A-Za-z0-9:-]*$/u.test(match[2])) {
      fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    }
    const closing = match[1] === "/";
    const name = match[2].toLowerCase();
    if (
      rejectedRawTextElements.has(name) ||
      rejectedParserAmbiguousElements.has(name) ||
      rejectedForeignNamespaceElements.has(name)
    ) {
      fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
    }
    tags.push(Object.freeze({ raw, name, closing, start, end }));
    if (!closing && name === "noscript") {
      if (parseHtmlStartTagAttributes(tags[tags.length - 1]).size !== 0) {
        fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
      }
      const safeFallback = scanSafeNoscriptFallback(html, end + 1);
      tags.push(
        Object.freeze({
          raw: safeFallback.closingRaw,
          name,
          closing: true,
          start: safeFallback.closingStart,
          end: safeFallback.closingEnd,
        }),
      );
      cursor = safeFallback.closingEnd + 1;
      continue;
    }
    if (!closing && skippedElements.has(name)) {
      const closingStart = lower.indexOf(`</${name}`, end + 1);
      if (closingStart < 0) fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
      if (
        name === "template" &&
        lower.indexOf("<template", end + 1) >= 0 &&
        lower.indexOf("<template", end + 1) < closingStart
      ) {
        fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
      }
      const skippedBody = lower.slice(end + 1, closingStart);
      if (
        name === "script" &&
        (skippedBody.includes("<!--") ||
          /<script(?:[\t\n\f\r />]|$)/u.test(skippedBody))
      ) {
        fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
      }
      const closingEnd = tagEnd(html, closingStart);
      const closingRaw = html.slice(closingStart, closingEnd + 1);
      if (closingRaw.toLowerCase() !== `</${name}>`) {
        fail("CAPTURE_V4_HTML_LEXICAL_STRUCTURE_INVALID");
      }
      tags.push(
        Object.freeze({
          raw: closingRaw,
          name,
          closing: true,
          start: closingStart,
          end: closingEnd,
        }),
      );
      cursor = closingEnd + 1;
      continue;
    }
    cursor = end + 1;
  }
  assertExactHtmlDocumentStructure(html, tags);
  assertHeadParserSafe(html, tags);
  return Object.freeze(tags);
}

function assertExactDwdsMetadata(
  html: string,
  row: GermanTask6cL02IdentityCaptureRosterRowDeV4,
  title: string,
  tags: readonly HtmlTagDeV4[],
  activeStartTags: readonly ParsedHtmlStartTagDeV4[],
): void {
  const head = singleHtmlElementRange(tags, "head");
  const body = singleHtmlElementRange(tags, "body");
  const titleStarts = tags.filter(
    (tag) => !tag.closing && tag.name === "title",
  );
  const titleEnds = tags.filter((tag) => tag.closing && tag.name === "title");
  if (
    titleStarts.length !== 1 ||
    titleEnds.length !== 1 ||
    titleStarts[0].start <= head.start.end ||
    titleStarts[0].end >= head.end.start ||
    titleEnds[0].start <= head.start.end ||
    titleEnds[0].end >= head.end.start ||
    titleStarts[0].raw !== "<title>" ||
    titleEnds[0].raw !== "</title>" ||
    titleEnds[0].start <= titleStarts[0].end ||
    html.slice(titleStarts[0].end + 1, titleEnds[0].start) !== title
  ) {
    fail("CAPTURE_V4_METADATA_INVALID");
  }
  const canonicalLinks = activeStartTags.filter(
    ({ tag, attributes }) =>
      tag.name === "link" &&
      hasAsciiCaseInsensitiveToken(attributes.get("rel"), "canonical"),
  );
  if (
    canonicalLinks.length !== 1 ||
    canonicalLinks[0].tag.start <= head.start.end ||
    canonicalLinks[0].tag.end >= head.end.start ||
    canonicalLinks[0].tag.raw !==
      `<link rel="canonical" href="${row.canonicalUrl}"/>`
  ) {
    fail("CAPTURE_V4_METADATA_INVALID");
  }
  const anchors = activeStartTags.filter(
    ({ attributes }) => attributes.get("id") === row.sourceAnchor,
  );
  if (
    anchors.length !== 1 ||
    anchors[0].tag.start <= body.start.end ||
    anchors[0].tag.end >= body.end.start
  ) {
    fail("CAPTURE_V4_METADATA_INVALID");
  }
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

function ipv6Prefix(value: bigint, prefix: number): bigint {
  return value >> BigInt(128 - prefix);
}

function isPublicIp(address: string): boolean {
  const ipv4 = ipv4Number(address);
  if (ipv4 !== null) {
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
    return !denied.some(([base, prefix]) => inIpv4Cidr(ipv4, base, prefix));
  }
  const ipv6 = ipv6BigInt(address);
  if (ipv6 === null) return false;
  const mappedPrefix = ipv6 >> 32n;
  if (mappedPrefix === 0xffffn) {
    const mapped = Number(ipv6 & 0xffffffffn);
    return isPublicIp(
      `${(mapped >>> 24) & 255}.${(mapped >>> 16) & 255}.${(mapped >>> 8) & 255}.${mapped & 255}`,
    );
  }
  if (ipv6Prefix(ipv6, 3) !== 1n) return false;
  const denied: readonly [bigint, number][] = [
    [BigInt("0x20010000000000000000000000000000"), 23],
    [BigInt("0x20010db8000000000000000000000000"), 32],
    [BigInt("0x20020000000000000000000000000000"), 16],
    [BigInt("0x3fff0000000000000000000000000000"), 20],
  ];
  return !denied.some(
    ([base, prefix]) => ipv6Prefix(ipv6, prefix) === ipv6Prefix(base, prefix),
  );
}

function ipIdentity(address: string): string {
  const ipv4 = ipv4Number(address);
  if (ipv4 !== null) return `4:${ipv4}`;
  const ipv6 = ipv6BigInt(address);
  if (ipv6 !== null) return `6:${ipv6.toString(16)}`;
  return "invalid";
}

function exactUrl(value: unknown, expected: string): void {
  if (typeof value !== "string" || value !== expected) {
    fail("CAPTURE_V4_FINAL_URL_MISMATCH");
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail("CAPTURE_V4_FINAL_URL_MISMATCH");
  }
  if (
    parsed.href !== expected ||
    parsed.protocol !==
      GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.exactScheme ||
    parsed.hostname !==
      GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.exactHost ||
    (parsed.port !== "" && parsed.port !== "443") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    fail("CAPTURE_V4_FINAL_URL_MISMATCH");
  }
}

function assertNetworkObservation(observation: ResponseObservationDeV4): void {
  if (
    !Array.isArray(observation.dnsAddresses) ||
    observation.dnsAddresses.length === 0 ||
    observation.dnsAddresses.some(
      (address) => typeof address !== "string" || !isPublicIp(address),
    ) ||
    typeof observation.connectedAddress !== "string" ||
    !isPublicIp(observation.connectedAddress) ||
    !new Set(observation.dnsAddresses.map(ipIdentity)).has(
      ipIdentity(observation.connectedAddress),
    )
  ) {
    fail("CAPTURE_V4_NETWORK_OBSERVATION_INVALID");
  }
  if (
    !isRecord(observation.tls) ||
    observation.tls.authorized !== true ||
    !new Set(["TLSv1.2", "TLSv1.3"]).has(observation.tls.protocol ?? "") ||
    observation.tls.servername !== "www.dwds.de" ||
    !observation.tls.subjectAltName
      .split(/\s*,\s*/u)
      .some((entry) => entry.toLowerCase() === "dns:www.dwds.de")
  ) {
    fail("CAPTURE_V4_TLS_OBSERVATION_INVALID");
  }
}

export function validateGermanTask6cL02IdentityCaptureResponseDeV4(
  row: GermanTask6cL02IdentityCaptureRosterRowDeV4,
  value: unknown,
): GermanTask6cL02IdentityCaptureValidatedResponseDeV4 {
  if (
    !GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4.includes(row) ||
    !isRecord(value)
  ) {
    fail("CAPTURE_V4_ROSTER_ROW_FORBIDDEN");
  }
  const observation = value as ResponseObservationDeV4;
  const expectedRequest = {
    method: GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.method,
    headers: GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.headers,
    redirectMode:
      GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.redirectMode,
    maxRedirects:
      GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.maxRedirects,
  };
  if (canonicalJson(observation.request) !== canonicalJson(expectedRequest)) {
    fail("CAPTURE_V4_REQUEST_OBSERVATION_MISMATCH");
  }
  exactUrl(observation.finalUrl, row.canonicalUrl);
  if (
    Number.isInteger(observation.statusCode) &&
    observation.statusCode >= 300 &&
    observation.statusCode <= 399
  ) {
    fail("CAPTURE_V4_REDIRECT_FORBIDDEN");
  }
  if (observation.statusCode !== 200) fail("CAPTURE_V4_HTTP_STATUS_INVALID");
  assertNetworkObservation(observation);
  const normalizedHeaders = normalizeHeaders(observation.rawHeaders);
  if (
    singleHeader(normalizedHeaders, "content-type") !==
    "text/html; charset=UTF-8"
  ) {
    fail("CAPTURE_V4_CONTENT_TYPE_MISMATCH");
  }
  const contentEncoding = normalizedHeaders.filter(
    (header) => header.name === "content-encoding",
  );
  if (
    contentEncoding.length > 1 ||
    (contentEncoding.length === 1 &&
      contentEncoding[0].value.toLowerCase() !== "identity")
  ) {
    fail("CAPTURE_V4_IDENTITY_CONTENT_ENCODING_REQUIRED");
  }
  const transferEncoding = normalizedHeaders.filter(
    (header) => header.name === "transfer-encoding",
  );
  const contentLength = normalizedHeaders.filter(
    (header) => header.name === "content-length",
  );
  const trailerDeclaration = normalizedHeaders.filter(
    (header) => header.name === "trailer",
  );
  const supportedHttpVersions = new Set(["1.0", "1.1", "2.0"]);
  if (
    !supportedHttpVersions.has(observation.httpVersion) ||
    observation.endObserved !== true ||
    observation.complete !== true ||
    observation.aborted !== false ||
    observation.errorObserved !== false ||
    observation.closeBeforeEnd !== false ||
    !Array.isArray(observation.rawTrailers) ||
    observation.rawTrailers.length !== 0 ||
    trailerDeclaration.length !== 0 ||
    transferEncoding.length > 1
  ) {
    fail("CAPTURE_V4_TRANSFER_FRAMING_INVALID");
  }
  const transferCoding = transferEncoding[0]?.value.toLowerCase();
  const isChunked = transferCoding !== undefined;
  if (
    (isChunked &&
      (transferCoding !== "chunked" ||
        observation.httpVersion !== "1.1" ||
        contentLength.length !== 0)) ||
    (!isChunked && contentLength.length > 1)
  ) {
    fail("CAPTURE_V4_TRANSFER_FRAMING_INVALID");
  }
  const declaredContentLength = contentLength[0]?.value;
  if (
    declaredContentLength !== undefined &&
    !/^(?:0|[1-9][0-9]*)$/u.test(declaredContentLength)
  ) {
    fail("CAPTURE_V4_TRANSFER_FRAMING_INVALID");
  }
  if (
    !Array.isArray(observation.bodyChunks) ||
    observation.bodyChunks.length === 0 ||
    observation.bodyChunks.some((chunk) => !Buffer.isBuffer(chunk))
  ) {
    fail("CAPTURE_V4_BODY_INVALID");
  }
  let bodyBytes = 0;
  for (const chunk of observation.bodyChunks) {
    bodyBytes += chunk.length;
    if (
      bodyBytes >
      GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.maximumBodyBytes
    ) {
      fail("CAPTURE_V4_BODY_SIZE_INVALID");
    }
  }
  if (bodyBytes === 0) {
    fail("CAPTURE_V4_BODY_SIZE_INVALID");
  }
  if (
    declaredContentLength !== undefined &&
    BigInt(declaredContentLength) !== BigInt(bodyBytes)
  ) {
    fail("CAPTURE_V4_TRANSFER_FRAMING_INVALID");
  }
  const body = Buffer.concat(observation.bodyChunks, bodyBytes);
  const html = strictUtf8(body);
  const title = `${row.lemma} – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS`;
  const tags = scanHtmlTags(html);
  const activeStartTags = parseActiveHtmlStartTags(tags);
  assertExactDwdsMetadata(html, row, title, tags, activeStartTags);
  assertExactDwdsHeadwordBlock(html, row.lemma, tags, activeStartTags);
  return Object.freeze({
    row,
    finalUrl: row.canonicalUrl,
    statusCode: 200 as const,
    httpVersion: observation.httpVersion as "1.0" | "1.1" | "2.0",
    transferFraming: isChunked
      ? ("CHUNKED_REMOVED_BY_NODE_HTTP_PARSER" as const)
      : ("NONE" as const),
    messageComplete: true as const,
    nodeIncomingMessage: Object.freeze({
      endObserved: true as const,
      complete: true as const,
      aborted: false as const,
      errorObserved: false as const,
      closeBeforeEnd: false as const,
      rawTrailers: Object.freeze([] as string[]),
    }),
    rawHeaders: Object.freeze([...observation.rawHeaders]),
    normalizedHeaders,
    contentType: "text/html; charset=UTF-8" as const,
    contentCoding: "identity" as const,
    encodedEntityBody: Buffer.from(body),
    decodedRepresentationBody: Buffer.from(body),
    dnsAddresses: Object.freeze([...observation.dnsAddresses]),
    connectedAddress: observation.connectedAddress,
    tls: Object.freeze({ ...observation.tls }),
    title,
    headword: row.lemma,
  });
}

export function buildGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(
  captures: readonly GermanTask6cL02IdentityCaptureValidatedResponseDeV4[],
  window: CaptureWindowDeV4,
): ReadonlyMap<string, Buffer> {
  if (
    captures.length !==
      GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4.length ||
    captures.some(
      (capture, index) =>
        capture.row !== GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4[index],
    )
  ) {
    fail("CAPTURE_V4_ROSTER_INVALID");
  }
  const startedAt = assertIsoTimestamp(window.startedAt);
  const completedAt = assertIsoTimestamp(window.completedAt);
  if (completedAt < startedAt) fail("CAPTURE_V4_WINDOW_INVALID");
  if (!/^[0-9a-f]{40}$/u.test(window.sourceSha)) {
    fail("CAPTURE_V4_SOURCE_SHA_INVALID");
  }

  const files = new Map<string, Buffer>();
  const manifestCaptures = captures.map((capture) => {
    if (!capture.encodedEntityBody.equals(capture.decodedRepresentationBody)) {
      fail("CAPTURE_V4_IDENTITY_BODY_MISMATCH");
    }
    const slug = capture.row.outputSlug;
    const headerPath = `headers/${slug}.normalized.json`;
    const encodedPath = `encoded-entity/${slug}.bin`;
    const decodedPath = `decoded-representation/${slug}.html`;
    const headerBytes = canonicalizeGermanTask6cL02IdentityCaptureJsonLineDeV4({
      schemaVersion: "learning-v2-de-task6c-l02-identity-normalized-headers.v4",
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
        method: GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.method,
        canonicalUrl: capture.row.canonicalUrl,
        headers:
          GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.headers,
        redirectMode:
          GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.redirectMode,
        maxRedirects:
          GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.maxRedirects,
      }),
      response: Object.freeze({
        finalUrl: capture.finalUrl,
        httpStatus: capture.statusCode,
        httpVersion: capture.httpVersion,
        transferFraming: capture.transferFraming,
        messageComplete: capture.messageComplete,
        nodeIncomingMessage: capture.nodeIncomingMessage,
        redirectChain: Object.freeze([]),
        dnsAddresses: capture.dnsAddresses,
        connectedAddress: capture.connectedAddress,
        tls: capture.tls,
        contentType: capture.contentType,
        contentCoding: capture.contentCoding,
        identityConfirmed: true as const,
        title: capture.title,
        headword: capture.headword,
        headerTranscript: fileDescriptor(headerPath, headerBytes),
        encodedEntityBody: Object.freeze({
          ...fileDescriptor(encodedPath, capture.encodedEntityBody),
          semantic:
            GERMAN_TASK6C_L02_IDENTITY_CAPTURE_REQUEST_POLICY_DE_V4.transferFramingSemantic,
        }),
        decodedRepresentationBody: Object.freeze({
          ...fileDescriptor(decodedPath, capture.decodedRepresentationBody),
          semantic: "IDENTITY_DECODED_REPRESENTATION_EQUALS_ENTITY_BYTES",
          charset: "utf-8",
        }),
      }),
    });
  });

  const contract = getGermanTask6cL02IdentityCaptureContractDeV4();
  const manifest = Object.freeze({
    schemaVersion: "learning-v2-de-task6c-l02-identity-capture.v4",
    captureKind: "AUTHORIZED_LIVE_IDENTITY_ENCODING_CAPTURE_REQUIRED",
    status: "HOLD_CAPTURE_ONLY",
    targetLanguage: "de",
    sourceSha: window.sourceSha,
    inputDigestSha256: contract.inputDigestSha256,
    task5: contract.task5,
    implementationFiles: contract.implementationFiles,
    requestPolicy: contract.requestPolicy,
    captureWindow: Object.freeze({
      startedAt: window.startedAt,
      completedAt: window.completedAt,
    }),
    captures: Object.freeze(manifestCaptures),
    authority: AUTHORITY,
  });
  files.set(
    "manifest.json",
    canonicalizeGermanTask6cL02IdentityCaptureJsonLineDeV4(manifest),
  );
  assertExactFileSet(files);
  return files;
}

function assertExactFileSet(files: ReadonlyMap<string, Buffer>): void {
  const actual = [...files.keys()].sort();
  const expected = EVIDENCE_FILE_ALLOWLIST;
  if (
    actual.length !== expected.length ||
    actual.some((filePath, index) => filePath !== expected[index])
  ) {
    fail("CAPTURE_V4_OUTPUT_FILE_SET_INVALID");
  }
}

function parseCanonicalJsonLine(
  bytes: Buffer,
  canonicalCode: string,
): JsonRecord {
  let value: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    value = JSON.parse(text) as unknown;
  } catch {
    fail(canonicalCode);
  }
  if (
    !isRecord(value) ||
    !canonicalizeGermanTask6cL02IdentityCaptureJsonLineDeV4(value).equals(bytes)
  ) {
    fail(canonicalCode);
  }
  return value;
}

export function validateGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(
  files: ReadonlyMap<string, Buffer>,
): JsonRecord {
  assertExactFileSet(files);
  const manifestBytes = files.get("manifest.json");
  if (!manifestBytes) fail("CAPTURE_V4_MANIFEST_INVALID");
  const manifest = parseCanonicalJsonLine(
    manifestBytes,
    "CAPTURE_V4_MANIFEST_CANONICAL_BYTES_INVALID",
  );
  if (
    !isRecord(manifest.captureWindow) ||
    typeof manifest.captureWindow.startedAt !== "string" ||
    typeof manifest.captureWindow.completedAt !== "string" ||
    typeof manifest.sourceSha !== "string" ||
    !Array.isArray(manifest.captures) ||
    manifest.captures.length !==
      GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4.length
  ) {
    fail("CAPTURE_V4_MANIFEST_INVALID");
  }
  const startedAt = assertIsoTimestamp(manifest.captureWindow.startedAt);
  const completedAt = assertIsoTimestamp(manifest.captureWindow.completedAt);
  if (completedAt < startedAt) fail("CAPTURE_V4_WINDOW_INVALID");
  const manifestCaptures = manifest.captures;

  const captures = GERMAN_TASK6C_L02_IDENTITY_CAPTURE_ROSTER_DE_V4.map(
    (row, index) => {
      const manifestCapture = manifestCaptures[index];
      if (
        !isRecord(manifestCapture) ||
        !isRecord(manifestCapture.request) ||
        !isRecord(manifestCapture.request.headers) ||
        !isRecord(manifestCapture.response)
      ) {
        fail("CAPTURE_V4_MANIFEST_INVALID");
      }
      const response = manifestCapture.response;
      const headerPath = `headers/${row.outputSlug}.normalized.json`;
      const headerBytes = files.get(headerPath);
      const encoded = files.get(`encoded-entity/${row.outputSlug}.bin`);
      const decoded = files.get(
        `decoded-representation/${row.outputSlug}.html`,
      );
      if (!headerBytes || !encoded || !decoded) {
        fail("CAPTURE_V4_OUTPUT_FILE_SET_INVALID");
      }
      if (!encoded.equals(decoded)) fail("CAPTURE_V4_IDENTITY_BODY_MISMATCH");
      const headerTranscript = parseCanonicalJsonLine(
        headerBytes,
        "CAPTURE_V4_HEADER_TRANSCRIPT_INVALID",
      );
      if (
        !Array.isArray(headerTranscript.rawHeaders) ||
        !Array.isArray(response.dnsAddresses) ||
        !isRecord(response.nodeIncomingMessage) ||
        !Array.isArray(response.nodeIncomingMessage.rawTrailers) ||
        typeof response.finalUrl !== "string" ||
        typeof response.httpStatus !== "number" ||
        typeof response.httpVersion !== "string" ||
        typeof response.nodeIncomingMessage.endObserved !== "boolean" ||
        typeof response.nodeIncomingMessage.complete !== "boolean" ||
        typeof response.nodeIncomingMessage.aborted !== "boolean" ||
        typeof response.nodeIncomingMessage.errorObserved !== "boolean" ||
        typeof response.nodeIncomingMessage.closeBeforeEnd !== "boolean" ||
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
        fail("CAPTURE_V4_MANIFEST_INVALID");
      }
      return validateGermanTask6cL02IdentityCaptureResponseDeV4(row, {
        request: {
          method: manifestCapture.request.method as string,
          headers: manifestCapture.request.headers as Record<string, string>,
          redirectMode: manifestCapture.request.redirectMode as string,
          maxRedirects: manifestCapture.request.maxRedirects as number,
        },
        finalUrl: response.finalUrl,
        statusCode: response.httpStatus,
        httpVersion: response.httpVersion,
        endObserved: response.nodeIncomingMessage.endObserved,
        complete: response.nodeIncomingMessage.complete,
        aborted: response.nodeIncomingMessage.aborted,
        errorObserved: response.nodeIncomingMessage.errorObserved,
        closeBeforeEnd: response.nodeIncomingMessage.closeBeforeEnd,
        rawHeaders: headerTranscript.rawHeaders,
        rawTrailers: response.nodeIncomingMessage.rawTrailers,
        bodyChunks: [encoded],
        dnsAddresses: response.dnsAddresses,
        connectedAddress: response.connectedAddress,
        tls: {
          authorized: response.tls.authorized,
          protocol: response.tls.protocol,
          servername: response.tls.servername,
          subjectAltName: response.tls.subjectAltName,
        },
      });
    },
  );
  const rebuilt = buildGermanTask6cL02IdentityCaptureEvidenceFilesDeV4(
    captures,
    {
      startedAt: manifest.captureWindow.startedAt,
      completedAt: manifest.captureWindow.completedAt,
      sourceSha: manifest.sourceSha,
    },
  );
  for (const filePath of EVIDENCE_FILE_ALLOWLIST) {
    if (
      !files.get(filePath)?.equals(rebuilt.get(filePath) ?? Buffer.alloc(0))
    ) {
      fail("CAPTURE_V4_OUTPUT_TAMPERED");
    }
  }
  return manifest;
}

export function loadGermanTask6cL02IdentityCaptureTransportDeV4(): never {
  if (arguments.length !== 0) fail("CAPTURE_V4_CALLER_INPUT_FORBIDDEN");
  fail("CAPTURE_V4_SEPARATE_AUTHORIZED_LIVE_TASK_REQUIRED");
}
