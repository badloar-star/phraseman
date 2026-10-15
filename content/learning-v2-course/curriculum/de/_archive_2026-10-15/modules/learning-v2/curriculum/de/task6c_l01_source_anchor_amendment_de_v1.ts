import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = ".tmp/de-task6c-l01-source-anchor-amendment";
const ORIGINAL_ROOT = ".tmp/de-task6c-l01-direct-capture";
const ORIGINAL_REGISTRY_SHA256 = "5dc2a6e3c497f19d5e291daf04d4af1f944ae42b502d24d0f92a7d7adaf208cc";
const SOURCE_CATALOG_PATH = ".tmp/de-task6a-exact-transport/task6a3-l01/lexical_item_evidence_de_v1.candidate.json";
const SOURCE_CATALOG_SHA256 = "925fd41b11cd43fd30f18c94327353519481025a036a62c30139dbe5914a8837";
const PLANS = Object.freeze({
  de_lex_plan_l01_c02_aufzug_v1: ["https://www.dwds.de/wb/Aufzug", "raw/de_lex_plan_l01_c02_aufzug_v1.html"],
  de_lex_plan_l01_c03_briefkasten_v1: ["https://www.dwds.de/wb/Briefkasten", "raw/de_lex_plan_l01_c03_briefkasten_v1.html"],
} as const);

type RecordValue = Record<string, unknown>;
export type GermanTask6cL01SourceAnchorAmendmentDeV1 = Readonly<{
  schemaVersion: "learning-v2-de-task6c-l01-source-anchor-amendment.v1";
  status: "PROPOSED_NOT_CANONICAL";
  task7Unlock: false;
  canonicalAdmission: "FORBIDDEN";
  rows: readonly Readonly<RecordValue>[];
}>;

function fail(code: string): never { throw new Error(code); }
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function record(value: unknown, code: string): asserts value is RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
}
function text(value: unknown, code: string): asserts value is string { if (typeof value !== "string" || value.length === 0) fail(code); }
function exactKeys(value: RecordValue, keys: readonly string[], code: string): void {
  if (Object.keys(value).sort().join("\u0000") !== [...keys].sort().join("\u0000")) fail(code);
}
function exactSpan(rawHtml: string, anchor: string): string {
  const marker = `<div class="dwdswb-lesart" id="${anchor}">`;
  const start = rawHtml.indexOf(marker);
  if (start < 0) fail("task6c_l01_anchor_marker_missing");
  // A terminal DWDS sense has no following `.dwdswb-lesart` marker. Bound the
  // actual outer div instead of treating the rest of the response (footer,
  // scripts, or adjacent article material) as lexical evidence.
  const divTag = /<\/?div\b[^>]*>/gi;
  divTag.lastIndex = start;
  let depth = 0;
  for (let match = divTag.exec(rawHtml); match !== null; match = divTag.exec(rawHtml)) {
    if (match.index < start) continue;
    if (match[0][1] === "/") depth -= 1;
    else depth += 1;
    if (depth === 0) return rawHtml.slice(start, divTag.lastIndex);
  }
  fail("task6c_l01_anchor_unbalanced_div");
}
function safeRawPath(root: string, rawPath: string): string {
  if (!rawPath.startsWith("raw/") || !rawPath.endsWith(".html")) fail("task6c_l01_anchor_raw_path_invalid");
  const resolved = path.resolve(root, rawPath);
  if (!resolved.startsWith(path.resolve(root, "raw") + path.sep)) fail("task6c_l01_anchor_raw_path_escape");
  return resolved;
}
function verifySpan(value: unknown, rawHtml: string, anchor: string, code: string): void {
  record(value, `${code}_invalid`);
  exactKeys(value, ["sourceAnchor", "exactRawHtml", "exactRawHtmlSha256", "exactRawHtmlUtf8Bytes"], `${code}_schema`);
  if (value.sourceAnchor !== anchor) fail(`${code}_anchor`);
  text(value.exactRawHtml, `${code}_body`);
  if (value.exactRawHtml !== exactSpan(rawHtml, anchor)) fail(`${code}_not_exact`);
  if (value.exactRawHtmlSha256 !== sha256(value.exactRawHtml)) fail(`${code}_hash`);
  if (value.exactRawHtmlUtf8Bytes !== Buffer.byteLength(value.exactRawHtml, "utf8")) fail(`${code}_bytes`);
}

/**
 * Reads an additive correction layer only. It preserves the rejected d-1-1
 * extraction as evidence and binds d-1-2 to the same immutable raw bytes;
 * it grants neither semantic admission nor Task 7 authority.
 */
export function loadGermanTask6cL01SourceAnchorAmendmentDeV1(options: Readonly<{ amendmentRootForTest?: string; originalRootForTest?: string; sourceCatalogPathForTest?: string }> = {}): GermanTask6cL01SourceAnchorAmendmentDeV1 {
  const amendmentRoot = options.amendmentRootForTest ?? ROOT;
  const originalRoot = options.originalRootForTest ?? ORIGINAL_ROOT;
  const sourceCatalogPath = options.sourceCatalogPathForTest ?? SOURCE_CATALOG_PATH;
  const originalRegistryPath = path.join(originalRoot, "registry.json");
  if (!fs.existsSync(originalRegistryPath) || sha256(fs.readFileSync(originalRegistryPath)) !== ORIGINAL_REGISTRY_SHA256) fail("task6c_l01_anchor_original_registry_changed");
  const originalRegistry: unknown = JSON.parse(fs.readFileSync(originalRegistryPath, "utf8"));
  record(originalRegistry, "task6c_l01_anchor_original_registry_invalid");
  if (!Array.isArray(originalRegistry.rows)) fail("task6c_l01_anchor_original_registry_rows_invalid");
  if (!fs.existsSync(sourceCatalogPath) || sha256(fs.readFileSync(sourceCatalogPath)) !== SOURCE_CATALOG_SHA256) fail("task6c_l01_anchor_catalog_changed");
  const parsed: unknown = JSON.parse(fs.readFileSync(path.join(amendmentRoot, "registry.json"), "utf8"));
  record(parsed, "task6c_l01_anchor_registry_invalid");
  exactKeys(parsed, ["schemaVersion", "status", "task7Unlock", "canonicalAdmission", "originalCapture", "sourceCatalog", "rows"], "task6c_l01_anchor_registry_schema");
  if (parsed.schemaVersion !== "learning-v2-de-task6c-l01-source-anchor-amendment.v1" || parsed.status !== "PROPOSED_NOT_CANONICAL" || parsed.task7Unlock !== false || parsed.canonicalAdmission !== "FORBIDDEN") fail("task6c_l01_anchor_authority_invalid");
  record(parsed.originalCapture, "task6c_l01_anchor_original_binding_invalid");
  exactKeys(parsed.originalCapture, ["root", "registrySha256"], "task6c_l01_anchor_original_binding_schema");
  if (parsed.originalCapture.root !== ORIGINAL_ROOT || parsed.originalCapture.registrySha256 !== ORIGINAL_REGISTRY_SHA256) fail("task6c_l01_anchor_original_binding_invalid");
  record(parsed.sourceCatalog, "task6c_l01_anchor_catalog_binding_invalid");
  exactKeys(parsed.sourceCatalog, ["path", "sha256"], "task6c_l01_anchor_catalog_binding_schema");
  if (parsed.sourceCatalog.path !== SOURCE_CATALOG_PATH || parsed.sourceCatalog.sha256 !== SOURCE_CATALOG_SHA256) fail("task6c_l01_anchor_catalog_binding_invalid");
  if (!Array.isArray(parsed.rows) || parsed.rows.length !== Object.keys(PLANS).length) fail("task6c_l01_anchor_roster_invalid");
  const seen = new Set<string>();
  for (const value of parsed.rows) {
    record(value, "task6c_l01_anchor_row_invalid");
    exactKeys(value, ["sourcePlanId", "canonicalUrl", "rawResponse", "originalRejected", "amendment"], "task6c_l01_anchor_row_schema");
    text(value.sourcePlanId, "task6c_l01_anchor_plan_required");
    const expected = PLANS[value.sourcePlanId as keyof typeof PLANS];
    if (!expected || seen.has(value.sourcePlanId) || value.canonicalUrl !== expected[0]) fail("task6c_l01_anchor_plan_invalid");
    seen.add(value.sourcePlanId);
    record(value.rawResponse, "task6c_l01_anchor_raw_invalid");
    exactKeys(value.rawResponse, ["path", "sha256", "bytes"], "task6c_l01_anchor_raw_schema");
    if (value.rawResponse.path !== expected[1]) fail("task6c_l01_anchor_raw_binding_invalid");
    text(value.rawResponse.path, "task6c_l01_anchor_raw_path_required");
    const raw = fs.readFileSync(safeRawPath(originalRoot, value.rawResponse.path));
    if (value.rawResponse.sha256 !== sha256(raw) || value.rawResponse.bytes !== raw.length) fail("task6c_l01_anchor_raw_changed");
    const originalRow = originalRegistry.rows.find((candidate) => {
      if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return false;
      return (candidate as RecordValue).sourcePlanId === value.sourcePlanId;
    });
    record(originalRow, "task6c_l01_anchor_original_row_missing");
    record(originalRow.rawResponse, "task6c_l01_anchor_original_raw_missing");
    if (originalRow.rawResponse.path !== value.rawResponse.path || originalRow.rawResponse.responseSha256 !== sha256(raw) || originalRow.rawResponse.cacheSha256 !== sha256(raw) || originalRow.rawResponse.bytes !== raw.length) fail("task6c_l01_anchor_original_raw_changed");
    const rawHtml = raw.toString("utf8");
    verifySpan(value.originalRejected, rawHtml, "d-1-1", "task6c_l01_anchor_original_rejected");
    verifySpan(value.amendment, rawHtml, "d-1-2", "task6c_l01_anchor_amendment");
  }
  if (seen.size !== Object.keys(PLANS).length) fail("task6c_l01_anchor_roster_incomplete");
  return parsed as GermanTask6cL01SourceAnchorAmendmentDeV1;
}
