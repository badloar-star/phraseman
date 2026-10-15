import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadGermanTask6cL01MorphSemanticFactsDeV1 } from "../modules/learning-v2/curriculum/de/task6c_l01_morph_semantic_facts_de_v1";

const registry = loadGermanTask6cL01MorphSemanticFactsDeV1();
assert.equal(registry.status, "FACT_LAYER_REVIEWED_NOT_CANONICAL");
assert.equal(registry.task7Unlock, false); assert.equal(registry.canonicalAdmission, "FORBIDDEN"); assert.equal(registry.rows.length, 6);
const rows = registry.rows as any[];
assert.deepEqual(rows.filter((row) => row.canonicalRegistryReference !== null).map((row) => row.canonicalRegistryReference).sort(), ["de_lex_l01_c01_nachbarin_v1", "de_lex_l01_c02_aufzug_v1"]);
assert.equal(rows.find((row) => row.sourcePlanId.includes("hausmeister")).senseSource.sourceAnchor, "d-1-1");
function hostileRoot(): string { const root = fs.mkdtempSync(path.join(os.tmpdir(), "task6c-l01-morph-hostile-")); fs.cpSync(".tmp/de-task6c-l01-morph-semantic-facts", root, { recursive: true }); return root; }
function hostileRoots(): { facts: string; direct: string; amendment: string } { const base = fs.mkdtempSync(path.join(os.tmpdir(), "task6c-l01-morph-all-hostile-")); const facts = path.join(base, "facts"), direct = path.join(base, "direct"), amendment = path.join(base, "amendment"); fs.cpSync(".tmp/de-task6c-l01-morph-semantic-facts", facts, { recursive: true }); fs.cpSync(".tmp/de-task6c-l01-direct-capture", direct, { recursive: true }); fs.cpSync(".tmp/de-task6c-l01-source-anchor-amendment", amendment, { recursive: true }); return { facts, direct, amendment }; }
function read(root: string): any { return JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8")); }
function write(root: string, value: unknown): void { fs.writeFileSync(path.join(root, "registry.json"), `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
// Wrong d-1-1 may not replace the amended target sense.
{ const root = hostileRoot(), value = read(root); value.rows.find((row: any) => row.sourcePlanId.includes("aufzug")).senseSource.sourceAnchor = "d-1-1"; write(root, value); assert.throws(() => loadGermanTask6cL01MorphSemanticFactsDeV1({ rootForTest: root }), /task6c_l01_morph_sense_anchor_invalid/u); }
// A rehashed fake morphology span remains bound to the immutable raw response.
{ const root = hostileRoot(), value = read(root), row = value.rows[0]; row.morphologySpan.sha256 = createHash("sha256").update("fake").digest("hex"); row.morphologySpan.utf8Bytes = 4; write(root, value); assert.throws(() => loadGermanTask6cL01MorphSemanticFactsDeV1({ rootForTest: root }), /task6c_l01_morph_span_integrity/u); }
// A scene may not silently become the lexical core.
{ const root = hostileRoot(), value = read(root), row = value.rows.find((candidate: any) => candidate.sourcePlanId.includes("buero")); row.lexicalCore = row.task5SituationContext; write(root, value); assert.throws(() => loadGermanTask6cL01MorphSemanticFactsDeV1({ rootForTest: root }), /task6c_l01_morph_task5_context_or_core_invalid/u); }
// Swiss Hausmeister d-1-2 is deliberately outside this fact layer.
{ const root = hostileRoot(), value = read(root), row = value.rows.find((candidate: any) => candidate.sourcePlanId.includes("hausmeister")); row.senseSource.sourceAnchor = "d-1-2"; row.excludedSenseAnchors = []; write(root, value); assert.throws(() => loadGermanTask6cL01MorphSemanticFactsDeV1({ rootForTest: root }), /task6c_l01_morph_hausmeister_swiss_sense_included/u); }
// No new pseudo-canonical registry identity can be smuggled in.
{ const root = hostileRoot(), value = read(root); value.rows.find((row: any) => row.sourcePlanId.includes("garten")).canonicalRegistryReference = "de_lex_l01_c05_garten_v1"; write(root, value); assert.throws(() => loadGermanTask6cL01MorphSemanticFactsDeV1({ rootForTest: root }), /task6c_l01_morph_duplicate_canonical_id/u); }
// The fact layer is permanently delivery-inert.
{ const root = hostileRoot(), value = read(root); value.task7Unlock = true; write(root, value); assert.throws(() => loadGermanTask6cL01MorphSemanticFactsDeV1({ rootForTest: root }), /task6c_l01_morph_authority_invalid/u); }
// Even a fact-layer re-pin after altered target-sense bytes cannot bypass the immutable direct raw capture.
{ const { facts, direct, amendment } = hostileRoots(), value = read(facts), rawPath = path.join(direct, "raw/de_lex_plan_l01_c02_aufzug_v1.html"); const altered = fs.readFileSync(rawPath, "utf8").replace("Vorrichtung zum Hochziehen, Lift", "Vorrichtung zum Hochziehen, Ersatz"); fs.writeFileSync(rawPath, altered, "utf8"); const row = value.rows.find((candidate: any) => candidate.sourcePlanId.includes("aufzug")); row.rawResponse.sha256 = createHash("sha256").update(fs.readFileSync(rawPath)).digest("hex"); row.senseSpan.sha256 = createHash("sha256").update("rehashed-altered-sense").digest("hex"); write(facts, value); assert.throws(() => loadGermanTask6cL01MorphSemanticFactsDeV1({ rootForTest: facts, directRootForTest: direct, amendmentRootForTest: amendment }), /task6c_l01_direct_raw_integrity_invalid/u); }
// Existing canonical references are one-to-one and plan-specific; cross-wiring them is forbidden.
{ const root = hostileRoot(), value = read(root); value.rows.find((row: any) => row.sourcePlanId.includes("aufzug")).canonicalRegistryReference = "de_lex_l01_c01_nachbarin_v1"; write(root, value); assert.throws(() => loadGermanTask6cL01MorphSemanticFactsDeV1({ rootForTest: root }), /task6c_l01_morph_duplicate_canonical_id/u); }
// A prose disclaimer cannot compensate for a structured Germany-exclusive policy assertion.
{ const root = hostileRoot(), value = read(root); value.regionalPolicy.claims.germanyExclusive = true; value.regionalPolicy.nonExclusivity = "AT/CH are not wrong"; write(root, value); assert.throws(() => loadGermanTask6cL01MorphSemanticFactsDeV1({ rootForTest: root }), /task6c_l01_morph_region_schema|task6c_l01_morph_region_claims_schema|task6c_l01_morph_region_policy_invalid/u); }
// A facts receipt cannot be changed into an admission/approval decision.
{ const root = hostileRoot(), value = read(root); value.reviewReceipt.verdict = "CANONICAL_ADMISSION_APPROVED"; write(root, value); assert.throws(() => loadGermanTask6cL01MorphSemanticFactsDeV1({ rootForTest: root }), /task6c_l01_morph_receipt_authority_invalid/u); }
// Promotion prose is rejected even if all explicit authority booleans remain closed.
{ const root = hostileRoot(), value = read(root); value.reviewReceipt.decisions.push("promotion is approved"); write(root, value); assert.throws(() => loadGermanTask6cL01MorphSemanticFactsDeV1({ rootForTest: root }), /task6c_l01_morph_receipt_authority_invalid/u); }
// A per-row decision cannot smuggle a canonical admission through the fact layer.
{ const root = hostileRoot(), value = read(root); value.rows[0].reviewDecision = "CANONICAL_ADMISSION_APPROVED"; write(root, value); assert.throws(() => loadGermanTask6cL01MorphSemanticFactsDeV1({ rootForTest: root }), /task6c_l01_morph_row_review_decision_invalid/u); }
process.stdout.write("TASK6C_L01_MORPH_SEMANTIC_FACTS status=HOLD_FACTS_ONLY canonicalAdmission=FORBIDDEN task7Unlock=false rows=6\n");
