import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadGermanTask6cL01SourceAnchorAmendmentDeV1 } from "../modules/learning-v2/curriculum/de/task6c_l01_source_anchor_amendment_de_v1";

const registry = loadGermanTask6cL01SourceAnchorAmendmentDeV1();
assert.equal(registry.status, "PROPOSED_NOT_CANONICAL");
assert.equal(registry.task7Unlock, false);
assert.equal(registry.canonicalAdmission, "FORBIDDEN");
assert.deepEqual(registry.rows.map((row) => row.sourcePlanId), ["de_lex_plan_l01_c02_aufzug_v1", "de_lex_plan_l01_c03_briefkasten_v1"]);
for (const row of registry.rows as any[]) {
  assert.equal(row.originalRejected.sourceAnchor, "d-1-1");
  assert.equal(row.amendment.sourceAnchor, "d-1-2");
}
const briefkasten = (registry.rows as any[]).find((row) => row.sourcePlanId === "de_lex_plan_l01_c03_briefkasten_v1");
assert.ok(briefkasten);
assert.equal(briefkasten.amendment.exactRawHtmlUtf8Bytes, 638);
assert.equal(briefkasten.amendment.exactRawHtmlSha256, "7d000ed49d7191bee9ececbdb19364ed04a6324980f95d307342acc11b800ac5");
assert.ok(briefkasten.amendment.exactRawHtml.endsWith("</div></div></div></div>"));
assert.equal(briefkasten.amendment.exactRawHtml.includes("goethe sans"), false);
assert.equal(briefkasten.amendment.exactRawHtml.includes("ext-separator"), false);

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const amendmentSource = ".tmp/de-task6c-l01-source-anchor-amendment";
const originalSource = ".tmp/de-task6c-l01-direct-capture";
function hostileRoots(): { amendment: string; original: string } {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "task6c-l01-anchor-hostile-"));
  const amendment = path.join(base, "amendment");
  const original = path.join(base, "original");
  fs.cpSync(amendmentSource, amendment, { recursive: true });
  fs.cpSync(originalSource, original, { recursive: true });
  return { amendment, original };
}
function registryAt(root: string): any { return JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8")); }
function save(root: string, value: unknown): void { fs.writeFileSync(path.join(root, "registry.json"), `${JSON.stringify(value, null, 2)}\n`, "utf8"); }

// d-1-1 is retained only as rejected provenance; it cannot be reused as the amendment.
{
  const { amendment, original } = hostileRoots();
  const value = registryAt(amendment);
  const row = value.rows[0];
  row.amendment = { ...row.originalRejected };
  save(amendment, value);
  assert.throws(() => loadGermanTask6cL01SourceAnchorAmendmentDeV1({ amendmentRootForTest: amendment, originalRootForTest: original }), /task6c_l01_anchor_amendment_anchor/u);
}

// The amendment cannot silently repin an altered original raw response.
{
  const { amendment, original } = hostileRoots();
  const value = registryAt(amendment);
  const rawPath = path.join(original, "raw/de_lex_plan_l01_c02_aufzug_v1.html");
  fs.writeFileSync(rawPath, fs.readFileSync(rawPath, "utf8").replace("Vorrichtung zum Hochziehen, Lift", "Vorrichtung zum Hochziehen, Ersatz"), "utf8");
  const raw = fs.readFileSync(rawPath);
  value.rows[0].rawResponse.sha256 = sha256(raw);
  value.rows[0].rawResponse.bytes = raw.length;
  save(amendment, value);
  assert.throws(() => loadGermanTask6cL01SourceAnchorAmendmentDeV1({ amendmentRootForTest: amendment, originalRootForTest: original }), /task6c_l01_anchor_original_registry_changed|task6c_l01_anchor_raw_changed|task6c_l01_anchor_original_raw_changed/u);
}

// Authority fields are fail-closed: anchor repair is never semantic admission or Task 7 unlock.
{
  const { amendment, original } = hostileRoots();
  const value = registryAt(amendment);
  value.task7Unlock = true;
  save(amendment, value);
  assert.throws(() => loadGermanTask6cL01SourceAnchorAmendmentDeV1({ amendmentRootForTest: amendment, originalRootForTest: original }), /task6c_l01_anchor_authority_invalid/u);
}

// A terminal sense may not absorb post-lesart footer/article bytes even when
// a hostile registry recomputes its own claim hash and byte count.
{
  const { amendment, original } = hostileRoots();
  const value = registryAt(amendment);
  const row = value.rows.find((candidate: any) => candidate.sourcePlanId === "de_lex_plan_l01_c03_briefkasten_v1");
  row.amendment.exactRawHtml += '<p class="goethe sans">post-lesart content</p>';
  row.amendment.exactRawHtmlSha256 = sha256(row.amendment.exactRawHtml);
  row.amendment.exactRawHtmlUtf8Bytes = Buffer.byteLength(row.amendment.exactRawHtml, "utf8");
  save(amendment, value);
  assert.throws(() => loadGermanTask6cL01SourceAnchorAmendmentDeV1({ amendmentRootForTest: amendment, originalRootForTest: original }), /task6c_l01_anchor_amendment_not_exact/u);
}
process.stdout.write("TASK6C_L01_ANCHOR_AMENDMENT status=HOLD rows=2 d1_1=REJECTED d1_2=EXACT admission=FORBIDDEN\n");
