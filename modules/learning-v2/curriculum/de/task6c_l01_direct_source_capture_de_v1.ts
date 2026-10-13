import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = ".tmp/de-task6c-l01-direct-capture";
const REGISTRY_PATH = path.join(ROOT, "registry.json");
const PLAN_IDS = Object.freeze([
  "de_lex_plan_l01_c01_nachbarin_v1",
  "de_lex_plan_l01_c02_aufzug_v1",
  "de_lex_plan_l01_c03_briefkasten_v1",
  "de_lex_plan_l01_c04_buero_v1",
  "de_lex_plan_l01_c05_garten_v1",
  "de_lex_plan_l01_c06_hausmeister_v1",
  "de_lex_plan_l01_c07_einladung_v1",
] as const);
const EXPECTED_SOURCE = Object.freeze({
  de_lex_plan_l01_c01_nachbarin_v1: ["https://www.dwds.de/wb/Nachbarin", "Nachbarin", "d-1-1"],
  de_lex_plan_l01_c02_aufzug_v1: ["https://www.dwds.de/wb/Aufzug", "Aufzug", "d-1-1"],
  de_lex_plan_l01_c03_briefkasten_v1: ["https://www.dwds.de/wb/Briefkasten", "Briefkasten", "d-1-1"],
  de_lex_plan_l01_c04_buero_v1: ["https://www.dwds.de/wb/B%C3%BCro", "Büro", "d-1-1"],
  de_lex_plan_l01_c05_garten_v1: ["https://www.dwds.de/wb/Garten", "Garten", "d-1-1"],
  de_lex_plan_l01_c06_hausmeister_v1: ["https://www.dwds.de/wb/Hausmeister", "Hausmeister", "d-1-1"],
  de_lex_plan_l01_c07_einladung_v1: ["https://www.dwds.de/wb/Einladung", "Einladung", "article"],
} as const);
const EXPECTED_CATALOG_PATH = ".tmp/de-task6a-exact-transport/task6a3-l01/lexical_item_evidence_de_v1.candidate.json";
const EXPECTED_CATALOG_SHA256 = "925fd41b11cd43fd30f18c94327353519481025a036a62c30139dbe5914a8837";

type RecordValue = Record<string, unknown>;
export type GermanTask6cL01DirectSourceCaptureDeV1 = Readonly<{
  schemaVersion: "learning-v2-de-task6c-l01-direct-source-capture.v1";
  status: "PROPOSED_NOT_CANONICAL";
  task7Unlock: false;
  canonicalAdmission: "FORBIDDEN";
  rows: readonly Readonly<RecordValue>[];
}>;

function fail(code: string): never { throw new Error(code); }
function sha256(bytes: string | Buffer): string { return createHash("sha256").update(bytes).digest("hex"); }
function record(value: unknown, code: string): asserts value is RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
}
function text(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) fail(code);
}
function exactKeys(value: RecordValue, keys: readonly string[], code: string): void {
  if (Object.keys(value).sort().join("\u0000") !== [...keys].sort().join("\u0000")) fail(code);
}
function safeRawPath(root: string, value: string): string {
  if (!value.startsWith("raw/") || !value.endsWith(".html")) fail("task6c_l01_direct_raw_path_invalid");
  const resolved = path.resolve(root, value);
  if (!resolved.startsWith(path.resolve(root, "raw") + path.sep)) fail("task6c_l01_direct_raw_path_escape");
  return resolved;
}
function sourceCatalogMatchesExpected(bytes: Buffer): void {
  if (sha256(bytes) !== EXPECTED_CATALOG_SHA256) fail("task6c_l01_direct_catalog_bytes_hash_invalid");
  let catalog: unknown;
  try { catalog = JSON.parse(bytes.toString("utf8")); } catch { fail("task6c_l01_direct_catalog_bytes_invalid"); }
  record(catalog, "task6c_l01_direct_catalog_bytes_invalid");
  if (!Array.isArray(catalog.evidenceCatalog)) fail("task6c_l01_direct_catalog_rows_invalid");
  for (const planId of PLAN_IDS) {
    const [canonicalUrl, articleAnchor, senseAnchor] = EXPECTED_SOURCE[planId];
    const matches = catalog.evidenceCatalog.filter((value) => {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
      const item = value as RecordValue;
      return item.sourcePlanId === planId && item.canonicalUrl === canonicalUrl && item.articleOrEntryAnchor === articleAnchor && item.senseAnchor === senseAnchor;
    });
    if (matches.length !== 1) fail("task6c_l01_direct_catalog_exact_binding_invalid");
  }
}
function exactClaimSpan(rawHtml: string, sourceAnchor: string): string {
  const marker = `<div class="dwdswb-lesart" id="${sourceAnchor}">`;
  const start = rawHtml.indexOf(marker);
  if (start < 0) fail("task6c_l01_direct_claim_marker_missing");
  const next = rawHtml.indexOf('<div class="dwdswb-lesart" id="', start + marker.length);
  return rawHtml.slice(start, next < 0 ? rawHtml.length : next);
}

/** Loads retained raw bytes only; it never grants semantic, regional, or release authority. */
export function loadGermanTask6cL01DirectSourceCaptureDeV1(options: Readonly<{ captureRootForTest?: string; sourceCatalogPathForTest?: string }> = {}): GermanTask6cL01DirectSourceCaptureDeV1 {
  const root = options.captureRootForTest ?? ROOT;
  const registryPath = path.join(root, "registry.json");
  const catalogPath = options.sourceCatalogPathForTest ?? EXPECTED_CATALOG_PATH;
  if (!fs.existsSync(registryPath)) fail("task6c_l01_direct_registry_missing");
  const parsed: unknown = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  record(parsed, "task6c_l01_direct_registry_invalid");
  exactKeys(parsed, ["schemaVersion", "sourceCatalog", "captureKind", "status", "task7Unlock", "canonicalAdmission", "rows"], "task6c_l01_direct_registry_closed_schema");
  if (parsed.schemaVersion !== "learning-v2-de-task6c-l01-direct-source-capture.v1") fail("task6c_l01_direct_schema_invalid");
  if (parsed.captureKind !== "RAW_AUTHORITATIVE_RESPONSE_BYTES" || parsed.status !== "PROPOSED_NOT_CANONICAL" || parsed.task7Unlock !== false || parsed.canonicalAdmission !== "FORBIDDEN") fail("task6c_l01_direct_authority_invalid");
  record(parsed.sourceCatalog, "task6c_l01_direct_catalog_invalid");
  exactKeys(parsed.sourceCatalog, ["path", "sha256"], "task6c_l01_direct_catalog_closed_schema");
  if (parsed.sourceCatalog.path !== EXPECTED_CATALOG_PATH || parsed.sourceCatalog.sha256 !== EXPECTED_CATALOG_SHA256) fail("task6c_l01_direct_catalog_binding_invalid");
  if (!fs.existsSync(catalogPath)) fail("task6c_l01_direct_catalog_bytes_missing");
  sourceCatalogMatchesExpected(fs.readFileSync(catalogPath));
  if (!Array.isArray(parsed.rows) || parsed.rows.length !== PLAN_IDS.length) fail("task6c_l01_direct_roster_size_invalid");
  const seen = new Set<string>();
  for (const rowValue of parsed.rows) {
    record(rowValue, "task6c_l01_direct_row_invalid");
    exactKeys(rowValue, ["sourceKind", "sourcePlanId", "canonicalUrl", "articleAnchor", "expectedSourceAnchor", "status", "directEvidenceStatus", "holdReason", "httpStatus", "finalUrl", "contentType", "rawResponse", "extractedGermanClaim"], "task6c_l01_direct_row_closed_schema");
    if (rowValue.sourceKind !== "TASK5" || rowValue.status !== "HOLD" || rowValue.directEvidenceStatus !== "CAPTURED_RAW_UNREVIEWED") fail("task6c_l01_direct_row_authority_invalid");
    text(rowValue.sourcePlanId, "task6c_l01_direct_plan_required");
    if (!PLAN_IDS.includes(rowValue.sourcePlanId as typeof PLAN_IDS[number]) || seen.has(rowValue.sourcePlanId)) fail("task6c_l01_direct_plan_invalid");
    seen.add(rowValue.sourcePlanId);
    const expected = EXPECTED_SOURCE[rowValue.sourcePlanId as keyof typeof EXPECTED_SOURCE];
    if (rowValue.canonicalUrl !== expected[0] || rowValue.articleAnchor !== expected[1] || rowValue.expectedSourceAnchor !== expected[2]) fail("task6c_l01_direct_source_binding_invalid");
    if (rowValue.finalUrl !== expected[0] || rowValue.httpStatus !== 200 || typeof rowValue.contentType !== "string" || !rowValue.contentType.startsWith("text/html")) fail("task6c_l01_direct_http_identity_invalid");
    record(rowValue.rawResponse, "task6c_l01_direct_raw_response_invalid");
    exactKeys(rowValue.rawResponse, ["path", "responseSha256", "cacheSha256", "bytes"], "task6c_l01_direct_raw_response_closed_schema");
    text(rowValue.rawResponse.path, "task6c_l01_direct_raw_path_required");
    text(rowValue.rawResponse.responseSha256, "task6c_l01_direct_raw_response_hash_required");
    text(rowValue.rawResponse.cacheSha256, "task6c_l01_direct_raw_cache_hash_required");
    if (!Number.isSafeInteger(rowValue.rawResponse.bytes) || rowValue.rawResponse.bytes <= 0) fail("task6c_l01_direct_raw_bytes_invalid");
    const raw = fs.readFileSync(safeRawPath(root, rowValue.rawResponse.path));
    if (sha256(raw) !== rowValue.rawResponse.responseSha256 || sha256(raw) !== rowValue.rawResponse.cacheSha256 || raw.length !== rowValue.rawResponse.bytes) fail("task6c_l01_direct_raw_integrity_invalid");
    const rawHtml = raw.toString("utf8");
    if (!rawHtml.includes(`<link rel="canonical" href="${expected[0]}"/>`) || !rawHtml.includes(`<title>${expected[1]} – `) || !rawHtml.includes(" | DWDS</title>")) fail("task6c_l01_direct_raw_identity_invalid");
    if (rowValue.extractedGermanClaim !== null) {
      record(rowValue.extractedGermanClaim, "task6c_l01_direct_claim_invalid");
      exactKeys(rowValue.extractedGermanClaim, ["sourceAnchor", "exactRawHtml", "exactRawHtmlSha256", "exactRawHtmlUtf8Bytes"], "task6c_l01_direct_claim_closed_schema");
      text(rowValue.extractedGermanClaim.sourceAnchor, "task6c_l01_direct_claim_anchor_required");
      text(rowValue.extractedGermanClaim.exactRawHtml, "task6c_l01_direct_claim_body_required");
      if (rowValue.extractedGermanClaim.exactRawHtml !== exactClaimSpan(rawHtml, expected[2])) fail("task6c_l01_direct_claim_not_exact_anchor_span");
      if (sha256(rowValue.extractedGermanClaim.exactRawHtml) !== rowValue.extractedGermanClaim.exactRawHtmlSha256) fail("task6c_l01_direct_claim_hash_invalid");
      if (Buffer.byteLength(rowValue.extractedGermanClaim.exactRawHtml, "utf8") !== rowValue.extractedGermanClaim.exactRawHtmlUtf8Bytes) fail("task6c_l01_direct_claim_bytes_invalid");
      if (rowValue.extractedGermanClaim.sourceAnchor !== expected[2]) fail("task6c_l01_direct_claim_anchor_invalid");
      if (rowValue.holdReason !== "RAW_CAPTURE_UNREVIEWED_SEMANTIC_ADMISSION_REQUIRED") fail("task6c_l01_direct_claim_hold_invalid");
    } else if (rowValue.sourcePlanId !== "de_lex_plan_l01_c07_einladung_v1" || rowValue.holdReason !== "SOURCE_CATALOG_HAS_NO_EXACT_SENSE_ANCHOR") {
      fail("task6c_l01_direct_unexpected_missing_claim");
    }
  }
  if (seen.size !== PLAN_IDS.length) fail("task6c_l01_direct_roster_incomplete");
  return parsed as GermanTask6cL01DirectSourceCaptureDeV1;
}
