import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = ".tmp/de-task6c-l01-direct-capture";
const rawRoot = path.join(root, "raw");
const catalogPath = ".tmp/de-task6a-exact-transport/task6a3-l01/lexical_item_evidence_de_v1.candidate.json";
const expectedCatalogSha256 = "925fd41b11cd43fd30f18c94327353519481025a036a62c30139dbe5914a8837";
const roster = Object.freeze([
  ["de_lex_plan_l01_c01_nachbarin_v1", "https://www.dwds.de/wb/Nachbarin", "Nachbarin", "d-1-1"],
  ["de_lex_plan_l01_c02_aufzug_v1", "https://www.dwds.de/wb/Aufzug", "Aufzug", "d-1-1"],
  ["de_lex_plan_l01_c03_briefkasten_v1", "https://www.dwds.de/wb/Briefkasten", "Briefkasten", "d-1-1"],
  ["de_lex_plan_l01_c04_buero_v1", "https://www.dwds.de/wb/B%C3%BCro", "Büro", "d-1-1"],
  ["de_lex_plan_l01_c05_garten_v1", "https://www.dwds.de/wb/Garten", "Garten", "d-1-1"],
  ["de_lex_plan_l01_c06_hausmeister_v1", "https://www.dwds.de/wb/Hausmeister", "Hausmeister", "d-1-1"],
  ["de_lex_plan_l01_c07_einladung_v1", "https://www.dwds.de/wb/Einladung", "Einladung", "article"],
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fail = (code) => { throw new Error(code); };

const catalogBytes = await readFile(catalogPath);
if (sha256(catalogBytes) !== expectedCatalogSha256) fail("task6c_l01_direct_catalog_hash_mismatch");
const catalog = JSON.parse(catalogBytes.toString("utf8"));
if (!Array.isArray(catalog.evidenceCatalog)) fail("task6c_l01_direct_catalog_invalid");

await mkdir(rawRoot, { recursive: true });
const rows = [];
for (const [sourcePlanId, canonicalUrl, articleAnchor, senseAnchor] of roster) {
  const catalogMatches = catalog.evidenceCatalog.filter((entry) => entry.sourcePlanId === sourcePlanId && entry.canonicalUrl === canonicalUrl && entry.articleOrEntryAnchor === articleAnchor && entry.senseAnchor === senseAnchor);
  if (catalogMatches.length !== 1) fail(`task6c_l01_direct_catalog_binding_mismatch:${sourcePlanId}`);
  const response = await fetch(canonicalUrl, { redirect: "error", headers: { "user-agent": "PhrasemanLearningV2EvidenceCapture/1.0 (+direct-source-retention)" } });
  const bytes = Buffer.from(await response.arrayBuffer());
  const rawRelativePath = `raw/${sourcePlanId}.html`;
  await writeFile(path.join(root, rawRelativePath), bytes);
  const html = bytes.toString("utf8");
  const expectedMarker = senseAnchor === "article" ? null : `<div class="dwdswb-lesart" id="${senseAnchor}">`;
  const markerIndex = expectedMarker === null ? -1 : html.indexOf(expectedMarker);
  let extractedClaim = null;
  let holdReason = null;
  if (!response.ok) {
    holdReason = `HTTP_${response.status}`;
  } else if (expectedMarker === null) {
    holdReason = "SOURCE_CATALOG_HAS_NO_EXACT_SENSE_ANCHOR";
  } else if (markerIndex < 0) {
    holdReason = "EXPECTED_EXACT_SENSE_ANCHOR_NOT_FOUND_IN_RAW_RESPONSE";
  } else {
    const nextMarkerIndex = html.indexOf('<div class="dwdswb-lesart" id="', markerIndex + expectedMarker.length);
    const rawHtml = html.slice(markerIndex, nextMarkerIndex < 0 ? html.length : nextMarkerIndex);
    extractedClaim = {
      sourceAnchor: senseAnchor,
      exactRawHtml: rawHtml,
      exactRawHtmlSha256: sha256(rawHtml),
      exactRawHtmlUtf8Bytes: Buffer.byteLength(rawHtml, "utf8"),
    };
    holdReason = "RAW_CAPTURE_UNREVIEWED_SEMANTIC_ADMISSION_REQUIRED";
  }
  rows.push({
    sourceKind: "TASK5",
    sourcePlanId,
    canonicalUrl,
    articleAnchor,
    expectedSourceAnchor: senseAnchor,
    status: "HOLD",
    directEvidenceStatus: "CAPTURED_RAW_UNREVIEWED",
    holdReason,
    httpStatus: response.status,
    finalUrl: response.url,
    contentType: response.headers.get("content-type"),
    rawResponse: {
      path: rawRelativePath,
      // The retained cache is byte-for-byte the direct HTTP response in this
      // capture route.  Keep both labels so a future cache transformation
      // cannot be silently mistaken for raw-response provenance.
      responseSha256: sha256(bytes),
      cacheSha256: sha256(bytes),
      bytes: bytes.length,
    },
    extractedGermanClaim: extractedClaim,
  });
}
const registry = {
  schemaVersion: "learning-v2-de-task6c-l01-direct-source-capture.v1",
  sourceCatalog: { path: catalogPath, sha256: expectedCatalogSha256 },
  captureKind: "RAW_AUTHORITATIVE_RESPONSE_BYTES",
  status: "PROPOSED_NOT_CANONICAL",
  task7Unlock: false,
  canonicalAdmission: "FORBIDDEN",
  rows,
};
await writeFile(path.join(root, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`, "utf8");
process.stdout.write(`TASK6C_L01_DIRECT_CAPTURE rows=${rows.length} captured=${rows.filter((row) => row.extractedGermanClaim !== null).length} hold=${rows.filter((row) => row.status === "HOLD").length}\n`);
