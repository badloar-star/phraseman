import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadGermanTask6cL01DirectSourceCaptureDeV1 } from "../modules/learning-v2/curriculum/de/task6c_l01_direct_source_capture_de_v1";

/**
 * RED baseline for L01 direct-source capture.  This is deliberately
 * independent of the old Task6A3 parsed-cache wrapper: absence of a new,
 * retained raw-response registry is a failure, rather than a reason to
 * reinterpret Task5 provenance as direct evidence.
 */
const registry = loadGermanTask6cL01DirectSourceCaptureDeV1();
assert.equal(registry.status, "PROPOSED_NOT_CANONICAL");
assert.equal(registry.task7Unlock, false);
assert.equal(registry.canonicalAdmission, "FORBIDDEN");
assert.equal(registry.rows.length, 7);
assert.equal(registry.rows.filter((row) => row.status === "HOLD").length, 7);
assert.equal(registry.rows.filter((row) => row.extractedGermanClaim !== null).length, 6);
const einladung = registry.rows.find((row) => row.sourcePlanId === "de_lex_plan_l01_c07_einladung_v1");
assert.ok(einladung);
assert.equal(einladung.extractedGermanClaim, null);
assert.equal(einladung.holdReason, "SOURCE_CATALOG_HAS_NO_EXACT_SENSE_ANCHOR");
for (const row of registry.rows) {
  assert.equal(row.sourceKind, "TASK5");
  assert.equal(row.directEvidenceStatus, "CAPTURED_RAW_UNREVIEWED");
  assert.equal(row.httpStatus, 200);
}

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const sourceRoot = ".tmp/de-task6c-l01-direct-capture";
function hostileRoot(): string {
  const result = fs.mkdtempSync(path.join(os.tmpdir(), "task6c-l01-direct-capture-hostile-"));
  fs.cpSync(sourceRoot, result, { recursive: true });
  return result;
}
function mutableRegistry(root: string): any {
  return JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8"));
}
function writeRegistry(root: string, value: unknown): void {
  fs.writeFileSync(path.join(root, "registry.json"), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
function repinRawRow(root: string, row: any): void {
  const rawPath = path.join(root, row.rawResponse.path);
  const raw = fs.readFileSync(rawPath);
  row.rawResponse.responseSha256 = sha256(raw);
  row.rawResponse.cacheSha256 = sha256(raw);
  row.rawResponse.bytes = raw.length;
}

// A registry cannot paper over a changed source catalog by patching its own hash.
{
  const root = hostileRoot();
  const catalogPath = path.join(root, "mutated-catalog.json");
  const catalog = JSON.parse(fs.readFileSync(".tmp/de-task6a-exact-transport/task6a3-l01/lexical_item_evidence_de_v1.candidate.json", "utf8"));
  catalog.evidenceCatalog.find((entry: any) => entry.sourcePlanId === "de_lex_plan_l01_c01_nachbarin_v1").senseAnchor = "d-9-9";
  const bytes = Buffer.from(`${JSON.stringify(catalog)}\n`, "utf8");
  fs.writeFileSync(catalogPath, bytes);
  const altered = mutableRegistry(root);
  altered.sourceCatalog.sha256 = sha256(bytes);
  writeRegistry(root, altered);
  assert.throws(
    () => loadGermanTask6cL01DirectSourceCaptureDeV1({ captureRootForTest: root, sourceCatalogPathForTest: catalogPath }),
    /task6c_l01_direct_catalog_binding_invalid/u,
  );
}

// A changed on-disk catalog is also rejected when registry path/SHA stay intact.
{
  const root = hostileRoot();
  const catalogPath = path.join(root, "mutated-catalog-with-unpatched-registry.json");
  const catalog = JSON.parse(fs.readFileSync(".tmp/de-task6a-exact-transport/task6a3-l01/lexical_item_evidence_de_v1.candidate.json", "utf8"));
  catalog.evidenceCatalog.find((entry: any) => entry.sourcePlanId === "de_lex_plan_l01_c01_nachbarin_v1").senseAnchor = "d-9-9";
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog)}\n`, "utf8");
  assert.throws(
    () => loadGermanTask6cL01DirectSourceCaptureDeV1({ captureRootForTest: root, sourceCatalogPathForTest: catalogPath }),
    /task6c_l01_direct_catalog_bytes_hash_invalid/u,
  );
}

// Even re-pinned raw bytes fail when their canonical identity/title is altered.
{
  const root = hostileRoot();
  const altered = mutableRegistry(root);
  const row = altered.rows.find((value: any) => value.sourcePlanId === "de_lex_plan_l01_c01_nachbarin_v1");
  const rawPath = path.join(root, row.rawResponse.path);
  const raw = fs.readFileSync(rawPath, "utf8").replace(
    '<link rel="canonical" href="https://www.dwds.de/wb/Nachbarin"/>',
    '<link rel="canonical" href="https://www.dwds.de/wb/Ungebunden"/>',
  );
  fs.writeFileSync(rawPath, raw, "utf8");
  repinRawRow(root, row);
  writeRegistry(root, altered);
  assert.throws(
    () => loadGermanTask6cL01DirectSourceCaptureDeV1({ captureRootForTest: root }),
    /task6c_l01_direct_raw_identity_invalid/u,
  );
}

{
  const root = hostileRoot();
  const altered = mutableRegistry(root);
  const row = altered.rows.find((value: any) => value.sourcePlanId === "de_lex_plan_l01_c01_nachbarin_v1");
  const rawPath = path.join(root, row.rawResponse.path);
  const raw = fs.readFileSync(rawPath, "utf8").replace(
    "<title>Nachbarin – ",
    "<title>Ungebunden – ",
  );
  fs.writeFileSync(rawPath, raw, "utf8");
  repinRawRow(root, row);
  writeRegistry(root, altered);
  assert.throws(
    () => loadGermanTask6cL01DirectSourceCaptureDeV1({ captureRootForTest: root }),
    /task6c_l01_direct_raw_identity_invalid/u,
  );
}

// A patched claim hash still cannot substitute a shorter in-span substring for the exact span.
{
  const root = hostileRoot();
  const altered = mutableRegistry(root);
  const row = altered.rows.find((value: any) => value.sourcePlanId === "de_lex_plan_l01_c01_nachbarin_v1");
  row.extractedGermanClaim.exactRawHtml = row.extractedGermanClaim.exactRawHtml.replace("weibliche Person", "weibliche Figur");
  row.extractedGermanClaim.exactRawHtmlSha256 = sha256(row.extractedGermanClaim.exactRawHtml);
  row.extractedGermanClaim.exactRawHtmlUtf8Bytes = Buffer.byteLength(row.extractedGermanClaim.exactRawHtml, "utf8");
  writeRegistry(root, altered);
  assert.throws(
    () => loadGermanTask6cL01DirectSourceCaptureDeV1({ captureRootForTest: root }),
    /task6c_l01_direct_claim_not_exact_anchor_span/u,
  );
}
process.stdout.write("TASK6C_L01_DIRECT_CAPTURE status=HOLD raw=7 exactClaims=6 admission=FORBIDDEN\n");
