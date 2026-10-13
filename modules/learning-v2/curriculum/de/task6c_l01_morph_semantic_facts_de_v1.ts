import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadGermanTask6cL01DirectSourceCaptureDeV1 } from "./task6c_l01_direct_source_capture_de_v1";
import { loadGermanTask6cL01SourceAnchorAmendmentDeV1 } from "./task6c_l01_source_anchor_amendment_de_v1";

const ROOT = ".tmp/de-task6c-l01-morph-semantic-facts";
const DIRECT_ROOT = ".tmp/de-task6c-l01-direct-capture";
const AMENDMENT_ROOT = ".tmp/de-task6c-l01-source-anchor-amendment";
const CATALOG_PATH = ".tmp/de-task6a-exact-transport/task6a3-l01/lexical_item_evidence_de_v1.candidate.json";
const TASK5_PATH = "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json";
const DIRECT_REGISTRY_SHA256 = "5dc2a6e3c497f19d5e291daf04d4af1f944ae42b502d24d0f92a7d7adaf208cc";
const AMENDMENT_REGISTRY_SHA256 = "2e4e5d7d64594ed75a7ec7fff9afd835c58b17cd795e8ca4f5ec660ff1684a3c";
const CATALOG_SHA256 = "925fd41b11cd43fd30f18c94327353519481025a036a62c30139dbe5914a8837";
const TASK5_SHA256 = "494abd91c59c88ed652b3b4cdaaeaa118bc53ef64beb57ff54f735433612eb29";
const PLAN_IDS = Object.freeze([
  "de_lex_plan_l01_c01_nachbarin_v1", "de_lex_plan_l01_c02_aufzug_v1", "de_lex_plan_l01_c03_briefkasten_v1",
  "de_lex_plan_l01_c04_buero_v1", "de_lex_plan_l01_c05_garten_v1", "de_lex_plan_l01_c06_hausmeister_v1",
] as const);
const EXPECTED_FACTS = Object.freeze({
  de_lex_plan_l01_c01_nachbarin_v1: ["female person living nearby", "identify the neighbour in a grounded greeting scene"],
  de_lex_plan_l01_c02_aufzug_v1: ["lift in a building", "ground a departure cue without adding a sentence rule"],
  de_lex_plan_l01_c03_briefkasten_v1: ["mailbox at a residence", "ground an introduction at a mailbox area"],
  de_lex_plan_l01_c04_buero_v1: ["office: room or area for written or administrative work", "identify the caretaker office for a formal first contact"],
  de_lex_plan_l01_c05_garten_v1: ["cultivated, usually bounded garden area", "ground a communal welcome scene beside a residence"],
  de_lex_plan_l01_c06_hausmeister_v1: ["employee responsible for maintenance and cleaning of a building", "identify a participant in a shared-building scene"],
} as const);
const EXPECTED_SENSES = Object.freeze({
  de_lex_plan_l01_c01_nachbarin_v1: ["DIRECT_CAPTURE", "d-1-1"],
  de_lex_plan_l01_c02_aufzug_v1: ["ANCHOR_AMENDMENT", "d-1-2"],
  de_lex_plan_l01_c03_briefkasten_v1: ["ANCHOR_AMENDMENT", "d-1-2"],
  de_lex_plan_l01_c04_buero_v1: ["DIRECT_CAPTURE", "d-1-1"],
  de_lex_plan_l01_c05_garten_v1: ["DIRECT_CAPTURE", "d-1-1"],
  de_lex_plan_l01_c06_hausmeister_v1: ["DIRECT_CAPTURE", "d-1-1"],
} as const);
const EXPECTED_CANONICAL_REFS = Object.freeze({
  de_lex_plan_l01_c01_nachbarin_v1: "de_lex_l01_c01_nachbarin_v1",
  de_lex_plan_l01_c02_aufzug_v1: "de_lex_l01_c02_aufzug_v1",
  de_lex_plan_l01_c03_briefkasten_v1: null,
  de_lex_plan_l01_c04_buero_v1: null,
  de_lex_plan_l01_c05_garten_v1: null,
  de_lex_plan_l01_c06_hausmeister_v1: null,
} as const);
const EXPECTED_GERMAN_DEFINITIONS = Object.freeze({
  de_lex_plan_l01_c01_nachbarin_v1: "weibliche Person, die in unmittelbarer Nähe wohnt",
  de_lex_plan_l01_c02_aufzug_v1: "Vorrichtung zum Hochziehen, Lift",
  de_lex_plan_l01_c03_briefkasten_v1: "Kasten, der an der Haustür angebracht ist und in den von der Post die Sendungen für die einzelnen Empfänger eingeworfen werden",
  de_lex_plan_l01_c04_buero_v1: "Raum eines Gebäudes oder Bereich, in dem am Schreibtisch oder Computer schriftliche oder verwaltende Arbeiten erledigt werden",
  de_lex_plan_l01_c05_garten_v1: "kultiviertes, meist abgegrenztes Areal, Gelände",
  de_lex_plan_l01_c06_hausmeister_v1: "Angestellter, der für die Instandhaltung und Reinigung eines (öffentlichen) Gebäudes verantwortlich ist",
} as const);
const EXPECTED_REVIEW_DECISIONS = Object.freeze({
  de_lex_plan_l01_c01_nachbarin_v1: "FACTS_ONLY_HOLD_MATCHES_EXACT_TASK5_NOUN_SENSE",
  de_lex_plan_l01_c02_aufzug_v1: "FACTS_ONLY_HOLD_MATCHES_AMENDED_D1_2_NOT_D1_1",
  de_lex_plan_l01_c03_briefkasten_v1: "FACTS_ONLY_HOLD_MATCHES_AMENDED_D1_2_NOT_D1_1",
  de_lex_plan_l01_c04_buero_v1: "FACTS_ONLY_HOLD_CORE_SEPARATE_FROM_CONTEXT",
  de_lex_plan_l01_c05_garten_v1: "FACTS_ONLY_HOLD_CORE_SEPARATE_FROM_CONTEXT",
  de_lex_plan_l01_c06_hausmeister_v1: "FACTS_ONLY_HOLD_D1_1_ONLY_SWISS_D1_2_EXCLUDED",
} as const);
const EXPECTED_RECEIPT_DECISIONS = Object.freeze([
  "All six records have raw-byte-bound morphology and exact Task5 plan bindings.",
  "Aufzug and Briefkasten use retained d-1-2 evidence; d-1-1 is excluded.",
  "Büro and Garten retain source-supported lexical cores separate from Task5 scene contexts.",
  "Hausmeister retains only d-1-1; Swiss d-1-2 is excluded.",
  "This fact layer leaves downstream authoring closed.",
] as const);
type RecordValue = Record<string, unknown>;
export type GermanTask6cL01MorphSemanticFactsDeV1 = Readonly<{ status: "FACT_LAYER_REVIEWED_NOT_CANONICAL"; task7Unlock: false; canonicalAdmission: "FORBIDDEN"; rows: readonly Readonly<RecordValue>[] }>;
function fail(code: string): never { throw new Error(code); }
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function record(value: unknown, code: string): asserts value is RecordValue { if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code); }
function text(value: unknown, code: string): asserts value is string { if (typeof value !== "string" || value.length === 0) fail(code); }
function exactKeys(value: RecordValue, keys: readonly string[], code: string): void { if (Object.keys(value).sort().join("\u0000") !== [...keys].sort().join("\u0000")) fail(code); }
function readBound(pathname: string, expectedHash: string, code: string): Buffer { if (!fs.existsSync(pathname)) fail(`${code}_missing`); const bytes = fs.readFileSync(pathname); if (sha256(bytes) !== expectedHash) fail(`${code}_hash`); return bytes; }
function exactOuterDiv(html: string, marker: string): string {
  const start = html.indexOf(marker); if (start < 0) fail("task6c_l01_morph_form_marker_missing");
  const tags = /<\/?div\b[^>]*>/gi; tags.lastIndex = start; let depth = 0;
  for (let match = tags.exec(html); match !== null; match = tags.exec(html)) { if (match.index < start) continue; depth += match[0][1] === "/" ? -1 : 1; if (depth === 0) return html.slice(start, tags.lastIndex); }
  fail("task6c_l01_morph_form_unbalanced_div");
}
function exactSenseSpan(html: string, sourceAnchor: string): string { return exactOuterDiv(html, `<div class="dwdswb-lesart" id="${sourceAnchor}">`); }
function task5Plan(task5: RecordValue, planId: string): RecordValue {
  if (!Array.isArray(task5.lessons)) fail("task6c_l01_morph_task5_lessons_invalid");
  const lesson = task5.lessons.find((candidate) => (candidate as RecordValue)?.lessonId === "de_l01"); record(lesson, "task6c_l01_morph_task5_l01_missing");
  if (!Array.isArray(lesson.chapters)) fail("task6c_l01_morph_task5_chapters_invalid");
  for (const chapter of lesson.chapters) { const checkpoint = (chapter as RecordValue)?.checkpoint as RecordValue; if (!Array.isArray(checkpoint?.plannedNewLexicalSenses)) continue; const plan = checkpoint.plannedNewLexicalSenses.find((candidate) => (candidate as RecordValue)?.id === planId); if (plan) { record(plan, "task6c_l01_morph_task5_plan_invalid"); return plan; } }
  fail("task6c_l01_morph_task5_plan_missing");
}
function amendmentRow(registry: RecordValue, planId: string): RecordValue { if (!Array.isArray(registry.rows)) fail("task6c_l01_morph_amendment_rows_invalid"); const row = registry.rows.find((candidate) => (candidate as RecordValue)?.sourcePlanId === planId); record(row, "task6c_l01_morph_amendment_row_missing"); return row; }

/** Fact-layer loader: it verifies retained source facts but grants no admission or delivery authority. */
export function loadGermanTask6cL01MorphSemanticFactsDeV1(options: Readonly<{ rootForTest?: string; directRootForTest?: string; amendmentRootForTest?: string; catalogPathForTest?: string; task5PathForTest?: string }> = {}): GermanTask6cL01MorphSemanticFactsDeV1 {
  const root = options.rootForTest ?? ROOT, directRoot = options.directRootForTest ?? DIRECT_ROOT, amendmentRoot = options.amendmentRootForTest ?? AMENDMENT_ROOT, catalogPath = options.catalogPathForTest ?? CATALOG_PATH, task5Path = options.task5PathForTest ?? TASK5_PATH;
  const parsed: unknown = JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8")); record(parsed, "task6c_l01_morph_registry_invalid");
  exactKeys(parsed, ["schemaVersion", "status", "task7Unlock", "canonicalAdmission", "sourceCatalog", "directCapture", "sourceAnchorAmendment", "task5Blueprint", "regionalPolicy", "rows", "reviewReceipt"], "task6c_l01_morph_registry_schema");
  if (parsed.schemaVersion !== "learning-v2-de-task6c-l01-morph-semantic-facts.v1" || parsed.status !== "FACT_LAYER_REVIEWED_NOT_CANONICAL" || parsed.task7Unlock !== false || parsed.canonicalAdmission !== "FORBIDDEN") fail("task6c_l01_morph_authority_invalid");
  record(parsed.sourceCatalog, "task6c_l01_morph_catalog_binding_invalid"); exactKeys(parsed.sourceCatalog, ["path", "sha256"], "task6c_l01_morph_catalog_binding_schema"); if (parsed.sourceCatalog.path !== CATALOG_PATH || parsed.sourceCatalog.sha256 !== CATALOG_SHA256) fail("task6c_l01_morph_catalog_binding_invalid");
  record(parsed.directCapture, "task6c_l01_morph_direct_binding_invalid"); exactKeys(parsed.directCapture, ["root", "registrySha256"], "task6c_l01_morph_direct_binding_schema"); if (parsed.directCapture.root !== DIRECT_ROOT || parsed.directCapture.registrySha256 !== DIRECT_REGISTRY_SHA256) fail("task6c_l01_morph_direct_binding_invalid");
  record(parsed.sourceAnchorAmendment, "task6c_l01_morph_amendment_binding_invalid"); exactKeys(parsed.sourceAnchorAmendment, ["root", "registrySha256"], "task6c_l01_morph_amendment_binding_schema"); if (parsed.sourceAnchorAmendment.root !== AMENDMENT_ROOT || parsed.sourceAnchorAmendment.registrySha256 !== AMENDMENT_REGISTRY_SHA256) fail("task6c_l01_morph_amendment_binding_invalid");
  record(parsed.task5Blueprint, "task6c_l01_morph_task5_binding_invalid"); exactKeys(parsed.task5Blueprint, ["path", "sha256"], "task6c_l01_morph_task5_binding_schema"); if (parsed.task5Blueprint.path !== TASK5_PATH || parsed.task5Blueprint.sha256 !== TASK5_SHA256) fail("task6c_l01_morph_task5_binding_invalid");
  record(parsed.reviewReceipt, "task6c_l01_morph_receipt_invalid"); exactKeys(parsed.reviewReceipt, ["scope", "reviewerRole", "verdict", "canonicalAdmission", "task7Unlock", "decisions"], "task6c_l01_morph_receipt_schema");
  if (parsed.reviewReceipt.scope !== "SOURCE_BOUND_FACT_LAYER_ONLY" || parsed.reviewReceipt.reviewerRole !== "TASK6C_L01_MORPH_SEMANTIC_FACT_LAYER" || parsed.reviewReceipt.verdict !== "HOLD_FACTS_ONLY" || parsed.reviewReceipt.canonicalAdmission !== "FORBIDDEN" || parsed.reviewReceipt.task7Unlock !== false || !Array.isArray(parsed.reviewReceipt.decisions) || parsed.reviewReceipt.decisions.length !== EXPECTED_RECEIPT_DECISIONS.length || parsed.reviewReceipt.decisions.some((decision, index) => decision !== EXPECTED_RECEIPT_DECISIONS[index] || /\b(?:promotion|canonical|approved|unlock)\b/iu.test(decision))) fail("task6c_l01_morph_receipt_authority_invalid");
  readBound(catalogPath, CATALOG_SHA256, "task6c_l01_morph_catalog"); const task5Bytes = readBound(task5Path, TASK5_SHA256, "task6c_l01_morph_task5");
  loadGermanTask6cL01DirectSourceCaptureDeV1({ captureRootForTest: directRoot, sourceCatalogPathForTest: catalogPath });
  loadGermanTask6cL01SourceAnchorAmendmentDeV1({ amendmentRootForTest: amendmentRoot, originalRootForTest: directRoot, sourceCatalogPathForTest: catalogPath });
  if (sha256(fs.readFileSync(path.join(directRoot, "registry.json"))) !== DIRECT_REGISTRY_SHA256) fail("task6c_l01_morph_direct_registry_hash");
  const amendment: unknown = JSON.parse(readBound(path.join(amendmentRoot, "registry.json"), AMENDMENT_REGISTRY_SHA256, "task6c_l01_morph_amendment_registry").toString("utf8")); record(amendment, "task6c_l01_morph_amendment_invalid");
  const task5: unknown = JSON.parse(task5Bytes.toString("utf8")); record(task5, "task6c_l01_morph_task5_invalid");
  record(parsed.regionalPolicy, "task6c_l01_morph_region_invalid"); exactKeys(parsed.regionalPolicy, ["evidenceId", "production", "receptiveStandardVarieties", "claims"], "task6c_l01_morph_region_schema");
  record(parsed.regionalPolicy.production, "task6c_l01_morph_region_production_invalid"); exactKeys(parsed.regionalPolicy.production, ["policy", "region", "baseline"], "task6c_l01_morph_region_production_schema");
  record(parsed.regionalPolicy.claims, "task6c_l01_morph_region_claims_invalid"); exactKeys(parsed.regionalPolicy.claims, ["germanyExclusive", "atChMarkedWrong", "superiorityClaim"], "task6c_l01_morph_region_claims_schema");
  if (parsed.regionalPolicy.evidenceId !== "DE-REG-BASELINE-001" || parsed.regionalPolicy.production.policy !== "productive" || parsed.regionalPolicy.production.region !== null || parsed.regionalPolicy.production.baseline !== "DE_STANDARDDEUTSCH" || !Array.isArray(parsed.regionalPolicy.receptiveStandardVarieties) || parsed.regionalPolicy.receptiveStandardVarieties.join("|") !== "AT_STANDARD|CH_STANDARD" || parsed.regionalPolicy.claims.germanyExclusive !== false || parsed.regionalPolicy.claims.atChMarkedWrong !== false || parsed.regionalPolicy.claims.superiorityClaim !== false) fail("task6c_l01_morph_region_policy_invalid");
  if (!Array.isArray(parsed.rows) || parsed.rows.length !== PLAN_IDS.length) fail("task6c_l01_morph_roster_invalid"); const seen = new Set<string>();
  const canonicalRefs = new Set<string>();
  for (const value of parsed.rows) {
    record(value, "task6c_l01_morph_row_invalid"); exactKeys(value, ["sourcePlanId", "canonicalRegistryReference", "rawResponse", "senseSource", "senseSpan", "morphologySpan", "morphology", "lexicalCore", "task5SituationContext", "excludedSenseAnchors", "reviewDecision"], "task6c_l01_morph_row_schema");
    text(value.sourcePlanId, "task6c_l01_morph_plan_required"); if (!PLAN_IDS.includes(value.sourcePlanId as typeof PLAN_IDS[number]) || seen.has(value.sourcePlanId)) fail("task6c_l01_morph_plan_invalid"); seen.add(value.sourcePlanId);
    record(value.rawResponse, "task6c_l01_morph_raw_invalid"); exactKeys(value.rawResponse, ["path", "sha256", "bytes"], "task6c_l01_morph_raw_schema"); text(value.rawResponse.path, "task6c_l01_morph_raw_path"); const rawPath = path.resolve(directRoot, value.rawResponse.path as string); if (!rawPath.startsWith(path.resolve(directRoot, "raw") + path.sep)) fail("task6c_l01_morph_raw_escape"); const raw = fs.readFileSync(rawPath); if (sha256(raw) !== value.rawResponse.sha256 || raw.length !== value.rawResponse.bytes) fail("task6c_l01_morph_raw_integrity");
    record(value.morphologySpan, "task6c_l01_morph_span_invalid"); exactKeys(value.morphologySpan, ["sha256", "utf8Bytes"], "task6c_l01_morph_span_schema"); const span = exactOuterDiv(raw.toString("utf8"), '<div class="dwdswb-ft dwdswb-new-ft"'); if (sha256(span) !== value.morphologySpan.sha256 || Buffer.byteLength(span, "utf8") !== value.morphologySpan.utf8Bytes) fail("task6c_l01_morph_span_integrity");
    record(value.morphology, "task6c_l01_morph_values_invalid"); exactKeys(value.morphology, ["lemma", "article", "plural", "sourceGenderLabel"], "task6c_l01_morph_values_schema"); for (const key of ["lemma", "article", "plural", "sourceGenderLabel"] as const) text(value.morphology[key], "task6c_l01_morph_value_required");
    const expectedForm = `Form / Grammatik</span><b>${value.morphology.lemma}</b> · <span class="dwdswb-ft-blocktext"><span>Substantiv (${value.morphology.sourceGenderLabel})</span>`; if (!span.includes(expectedForm) || !span.includes(`Nominativ Plural: <b>${value.morphology.plural}</b>`)) fail("task6c_l01_morph_values_not_in_exact_span"); const expectedArticle = value.morphology.article === "die" ? ", die</h1>" : value.morphology.article === "der" ? ", der</h1>" : value.morphology.article === "das" ? ", das</h1>" : ""; if (!expectedArticle || !span.includes(expectedArticle)) fail("task6c_l01_morph_article_not_in_exact_span");
    const expectedFacts = EXPECTED_FACTS[value.sourcePlanId as keyof typeof EXPECTED_FACTS];
    const plan = task5Plan(task5, value.sourcePlanId); if (plan.lemmaOrExpression !== value.morphology.lemma || typeof value.lexicalCore !== "string" || typeof value.task5SituationContext !== "string" || !expectedFacts || value.lexicalCore !== expectedFacts[0] || value.task5SituationContext !== expectedFacts[1]) fail("task6c_l01_morph_task5_context_or_core_invalid");
    record(value.senseSource, "task6c_l01_morph_sense_source_invalid"); exactKeys(value.senseSource, ["layer", "sourceAnchor"], "task6c_l01_morph_sense_source_schema");
    if (value.sourcePlanId === "de_lex_plan_l01_c06_hausmeister_v1" && (!Array.isArray(value.excludedSenseAnchors) || !value.excludedSenseAnchors.includes("d-1-2") || value.senseSource.sourceAnchor !== "d-1-1")) fail("task6c_l01_morph_hausmeister_swiss_sense_included");
    const expectedSense = EXPECTED_SENSES[value.sourcePlanId as keyof typeof EXPECTED_SENSES]; if (!expectedSense || value.senseSource.layer !== expectedSense[0] || value.senseSource.sourceAnchor !== expectedSense[1]) fail("task6c_l01_morph_sense_anchor_invalid"); if (value.senseSource.layer === "ANCHOR_AMENDMENT") { const amend = amendmentRow(amendment, value.sourcePlanId); record(amend.amendment, "task6c_l01_morph_amendment_missing"); if (amend.amendment.sourceAnchor !== value.senseSource.sourceAnchor) fail("task6c_l01_morph_amendment_anchor_invalid"); if (!Array.isArray(value.excludedSenseAnchors) || !value.excludedSenseAnchors.includes("d-1-1")) fail("task6c_l01_morph_wrong_d1_1_not_excluded"); }
    record(value.senseSpan, "task6c_l01_morph_sense_span_invalid"); exactKeys(value.senseSpan, ["sourceAnchor", "sha256", "utf8Bytes", "definitionGerman"], "task6c_l01_morph_sense_span_schema");
    const senseSpan = exactSenseSpan(raw.toString("utf8"), value.senseSource.sourceAnchor as string); const expectedDefinition = EXPECTED_GERMAN_DEFINITIONS[value.sourcePlanId as keyof typeof EXPECTED_GERMAN_DEFINITIONS];
    const sensePlainText = senseSpan.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (value.senseSpan.sourceAnchor !== value.senseSource.sourceAnchor || value.senseSpan.sha256 !== sha256(senseSpan) || value.senseSpan.utf8Bytes !== Buffer.byteLength(senseSpan, "utf8") || value.senseSpan.definitionGerman !== expectedDefinition || !sensePlainText.includes(expectedDefinition)) fail("task6c_l01_morph_sense_span_integrity");
    const expectedCanonical = EXPECTED_CANONICAL_REFS[value.sourcePlanId as keyof typeof EXPECTED_CANONICAL_REFS]; if (value.canonicalRegistryReference !== expectedCanonical || (typeof value.canonicalRegistryReference === "string" && canonicalRefs.has(value.canonicalRegistryReference))) fail("task6c_l01_morph_duplicate_canonical_id"); if (typeof value.canonicalRegistryReference === "string") canonicalRefs.add(value.canonicalRegistryReference);
    if (value.reviewDecision !== EXPECTED_REVIEW_DECISIONS[value.sourcePlanId as keyof typeof EXPECTED_REVIEW_DECISIONS] || !String(value.reviewDecision).startsWith("FACTS_ONLY_HOLD_") || /(?:CANONICAL|PROMOTION|APPROVED|UNLOCK)/u.test(String(value.reviewDecision))) fail("task6c_l01_morph_row_review_decision_invalid");
  }
  if (seen.size !== PLAN_IDS.length || canonicalRefs.size !== 2) fail("task6c_l01_morph_roster_incomplete"); return parsed as GermanTask6cL01MorphSemanticFactsDeV1;
}
