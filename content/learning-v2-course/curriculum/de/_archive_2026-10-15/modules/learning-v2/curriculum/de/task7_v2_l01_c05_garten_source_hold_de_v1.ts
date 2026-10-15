import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

export type GermanTask7V2L01C05GartenSourceHoldDeV1 = Readonly<{
  status: "HOLD";
  sourcePlanId: "de_lex_plan_l01_c05_garten_v1";
  checkpointPacketId: "de_l01_c05_s40";
  canonicalAdmission: false;
  inventoryResolutionApplied: false;
  task7Unlock: false;
  preauthoringAuthority: false;
  learnerFacing: false;
  releaseAuthorized: false;
  consumerCutover: "NONE";
}>;

export type GermanTask7V2L01C05GartenInspectionOptionsDeV1 = Readonly<{
  evidenceRootForTest?: string;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const EVIDENCE_ROOT = path.join(ROOT, "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c05_garten_source_hold_v1");
const TASK5_PATH = path.join(ROOT, "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json");
const DIRECT_REGISTRY_PATH = path.join(ROOT, ".tmp/de-task6c-l01-direct-capture/registry.json");
const DIRECT_RAW_PATH = path.join(ROOT, ".tmp/de-task6c-l01-direct-capture/raw/de_lex_plan_l01_c05_garten_v1.html");
const TASK5_SHA256 = "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const DIRECT_REGISTRY_SHA256 = "5dc2a6e3c497f19d5e291daf04d4af1f944ae42b502d24d0f92a7d7adaf208cc";
const EXTRACTION_MAP_SHA256 = "5057747373799689cfcf18a5037b6dddbf956f27c5a4aa32198fffd2b6f4a3bc";
const EXTRACTION_MAP_BYTES = 1345;
const RAW_SHA256 = "3b614b8fadfd2db11983a3472f60c541ed2854c3d8b589ab20ecc537db434b6d";
const RAW_BYTES = 144950;
const EXACT_SPAN_SHA256 = "b048d418f531cd71ff0fb0ccb5a9c494a8d58f62768790773e6303f989ed64fd";
const EXACT_SPAN_BYTES = 3958;
const DWDS_URL = "https://www.dwds.de/wb/Garten";

/** Exact source-HOLD boundary available to downstream HOLD receipts. */
export const GERMAN_TASK7_V2_L01_C05_GARTEN_SOURCE_HOLD_DE_V1 = Object.freeze({
  status: "HOLD" as const,
  sourcePlanId: "de_lex_plan_l01_c05_garten_v1" as const,
  checkpointPacketId: "de_l01_c05_s40" as const,
  canonicalAdmission: false as const,
  inventoryResolutionApplied: false as const,
  task7Unlock: false as const,
  preauthoringAuthority: false as const,
  learnerFacing: false as const,
  releaseAuthorized: false as const,
  consumerCutover: "NONE" as const,
});

function fail(code: string): never { throw new Error(code); }
function sha256(value: Buffer | string): string { return crypto.createHash("sha256").update(value).digest("hex"); }
function record(value: unknown, code: string): asserts value is JsonRecord { if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code); }
function array(value: unknown, code: string): asserts value is unknown[] { if (!Array.isArray(value)) fail(code); }
function json(file: string, code: string): JsonRecord { try { const value: unknown = JSON.parse(fs.readFileSync(file, "utf8")); record(value, code); return value; } catch { return fail(code); } }
function like(value: unknown, key: string, expected: string): boolean { return value !== null && typeof value === "object" && !Array.isArray(value) && (value as JsonRecord)[key] === expected; }
function forbidOutput(value: unknown): void { if (value === null || typeof value !== "object") return; if (Array.isArray(value)) return value.forEach(forbidOutput); if (["canonicalSenseId", "packetOutputPath", "releasePath", "consumerPath"].some(key => Object.hasOwn(value, key))) fail("task7_garten_output_forbidden"); Object.values(value).forEach(forbidOutput); }

function validatePlan(): void {
  const bytes = fs.readFileSync(TASK5_PATH);
  if (sha256(bytes) !== TASK5_SHA256) fail("task7_garten_task5_drift");
  const task5 = json(TASK5_PATH, "task7_garten_plan");
  array(task5.lessons, "task7_garten_plan");
  const lesson = task5.lessons.find(value => like(value, "lessonId", "de_l01")); record(lesson, "task7_garten_plan"); array(lesson.chapters, "task7_garten_plan");
  const chapter = lesson.chapters.find(value => like(value, "id", "de_l01_c05")); record(chapter, "task7_garten_plan"); record(chapter.checkpoint, "task7_garten_plan");
  if (chapter.checkpoint.packetId !== "de_l01_c05_s40") fail("task7_garten_checkpoint");
  array(chapter.checkpoint.plannedNewLexicalSenses, "task7_garten_plan");
  const rows = chapter.checkpoint.plannedNewLexicalSenses.filter(value => like(value, "id", "de_lex_plan_l01_c05_garten_v1"));
  if (rows.length !== 1) fail("task7_garten_plan_identity");
  record(rows[0], "task7_garten_plan_identity"); record(rows[0].nounPackage, "task7_garten_plan_identity");
  if (rows[0].semanticIdentity !== "garten|garden beside a residence" || rows[0].lemmaOrExpression !== "Garten" || rows[0].partOfSpeech !== "noun" || rows[0].nounPackage.article !== "der" || rows[0].nounPackage.singular !== "Garten" || rows[0].nounPackage.plural !== "Gärten") fail("task7_garten_plan_identity");
}

function validateDirectCapture(): void {
  const registryBytes = fs.readFileSync(DIRECT_REGISTRY_PATH);
  if (sha256(registryBytes) !== DIRECT_REGISTRY_SHA256) fail("task7_garten_direct_registry_drift");
  const registry = json(DIRECT_REGISTRY_PATH, "task7_garten_direct_registry"); array(registry.rows, "task7_garten_direct_registry");
  const rows = registry.rows.filter(value => like(value, "sourcePlanId", "de_lex_plan_l01_c05_garten_v1"));
  if (rows.length !== 1) fail("task7_garten_direct_registry");
  record(rows[0], "task7_garten_direct_registry"); record(rows[0].rawResponse, "task7_garten_direct_registry"); record(rows[0].extractedGermanClaim, "task7_garten_direct_registry");
  if (rows[0].canonicalUrl !== DWDS_URL || rows[0].httpStatus !== 200 || rows[0].rawResponse.path !== "raw/de_lex_plan_l01_c05_garten_v1.html" || rows[0].rawResponse.responseSha256 !== RAW_SHA256 || rows[0].rawResponse.bytes !== RAW_BYTES || rows[0].extractedGermanClaim.sourceAnchor !== "d-1-1" || rows[0].extractedGermanClaim.exactRawHtmlSha256 !== EXACT_SPAN_SHA256 || rows[0].extractedGermanClaim.exactRawHtmlUtf8Bytes !== EXACT_SPAN_BYTES) fail("task7_garten_direct_registry");
  const raw = fs.readFileSync(DIRECT_RAW_PATH);
  if (sha256(raw) !== RAW_SHA256 || raw.length !== RAW_BYTES) fail("task7_garten_raw_drift");
  const html = raw.toString("utf8");
  const start = html.indexOf('<div class="dwdswb-lesart" id="d-1-1">');
  const end = html.indexOf('<div class="dwdswb-lesart" id="', start + 1);
  if (start < 0 || sha256(html.slice(start, end < 0 ? html.length : end)) !== EXACT_SPAN_SHA256 || !html.includes("Substantiv (Maskulinum)") || !html.includes("Nominativ Plural: <b>Gärten</b>")) fail("task7_garten_direct_extraction");
}

function validateEvidence(root: string): void {
  const mapPath = path.join(root, "extraction_map.json"); const mapBytes = fs.readFileSync(mapPath);
  if (sha256(mapBytes) !== EXTRACTION_MAP_SHA256 || mapBytes.length !== EXTRACTION_MAP_BYTES) fail("task7_garten_extraction_map");
  const map = json(mapPath, "task7_garten_extraction_map"); forbidOutput(map);
  if (map.schemaVersion !== "learning-v2-de-task7-v2-l01-c05-garten-source-extraction-map.v1") fail("task7_garten_extraction_map");
  record(map.directCapture, "task7_garten_extraction_map"); const source = map.directCapture;
  if (source.registryPath !== ".tmp/de-task6c-l01-direct-capture/registry.json" || source.registrySha256 !== DIRECT_REGISTRY_SHA256 || source.canonicalUrl !== DWDS_URL || source.httpStatus !== 200 || source.contentType !== "text/html; charset=UTF-8" || source.rawResponsePath !== "raw/de_lex_plan_l01_c05_garten_v1.html" || source.rawResponseSha256 !== RAW_SHA256 || source.rawResponseBytes !== RAW_BYTES) fail("task7_garten_direct_binding");
  record(map.extraction, "task7_garten_extraction_map"); const extraction = map.extraction;
  if (extraction.sourcePlanId !== "de_lex_plan_l01_c05_garten_v1" || extraction.checkpointPacketId !== "de_l01_c05_s40" || extraction.sourceHeadword !== "Garten" || extraction.sourcePartOfSpeech !== "Substantiv (Maskulinum)" || extraction.nominativePlural !== "Gärten" || extraction.sourceAnchor !== "d-1-1" || extraction.sourceCoreGerman !== "kultiviertes, meist abgegrenztes Areal, Gelände" || extraction.exactSpanSha256 !== EXACT_SPAN_SHA256 || extraction.exactSpanUtf8Bytes !== EXACT_SPAN_BYTES) fail("task7_garten_extraction");
  record(map.unsupportedClaims, "task7_garten_extraction_map"); if (map.unsupportedClaims.residenceAdjacentGarden !== "UNSUPPORTED_BY_CAPTURED_SOURCE" || map.unsupportedClaims.communalWelcomeScene !== "UNSUPPORTED_BY_CAPTURED_SOURCE" || map.unsupportedClaims.canonicalAdmission !== "OUT_OF_SCOPE" || map.unsupportedClaims.learnerPhraseAuthority !== "OUT_OF_SCOPE" || map.unsupportedClaims.register !== "NOT_CLAIMED_BY_THIS_PACKET") fail("task7_garten_claim_boundary");
}

function validateManifest(root: string): void {
  const manifest = json(path.join(root, "manifest.json"), "task7_garten_manifest"); forbidOutput(manifest);
  if (manifest.schemaVersion !== "learning-v2-de-task7-v2-l01-c05-garten-source-hold.v1" || manifest.status !== "HOLD") fail("task7_garten_manifest");
  record(manifest.authority, "task7_garten_manifest"); const authority = manifest.authority;
  if (authority.scope !== "SOURCE_BOUND_HOLD_ONLY" || authority.decision !== "SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING" || authority.canonicalAdmission !== false || authority.inventoryResolutionApplied !== false || authority.task7Unlock !== false || authority.preauthoringAuthority !== false || authority.learnerFacing !== false || authority.releaseAuthorized !== false || authority.consumerCutover !== "NONE") fail("task7_garten_hold_boundary");
  record(manifest.task5V2, "task7_garten_manifest"); const task5 = manifest.task5V2;
  if (task5.path !== "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json" || task5.byteSha256 !== TASK5_SHA256 || task5.sourcePlanId !== "de_lex_plan_l01_c05_garten_v1" || task5.checkpointPacketId !== "de_l01_c05_s40" || task5.semanticIdentity !== "garten|garden beside a residence" || task5.lemmaOrExpression !== "Garten") fail("task7_garten_plan_binding");
  record(manifest.sources, "task7_garten_manifest"); record(manifest.sources.extractionMap, "task7_garten_manifest"); if (manifest.sources.extractionMap.path !== "extraction_map.json" || manifest.sources.extractionMap.sha256 !== EXTRACTION_MAP_SHA256 || manifest.sources.extractionMap.bytes !== EXTRACTION_MAP_BYTES) fail("task7_garten_manifest");
  record(manifest.fieldSupport, "task7_garten_manifest"); record(manifest.fieldSupport.unsupportedClaims, "task7_garten_manifest"); if (manifest.fieldSupport.unsupportedClaims.residenceAdjacentGarden !== "UNSUPPORTED_BY_CAPTURED_SOURCE" || manifest.fieldSupport.unsupportedClaims.communalWelcomeScene !== "UNSUPPORTED_BY_CAPTURED_SOURCE") fail("task7_garten_claim_boundary");
  record(manifest.allocation, "task7_garten_manifest"); const allocation = manifest.allocation;
  if (allocation.sourcePlanId !== "de_lex_plan_l01_c05_garten_v1" || allocation.checkpointPacketId !== "de_l01_c05_s40" || allocation.sessionId !== "de_l01_s05" || allocation.chapterId !== "de_l01_c05" || allocation.decision !== "SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING") fail("task7_garten_allocation");
}

export function inspectGermanTask7V2L01C05GartenSourceHoldDeV1(options: GermanTask7V2L01C05GartenInspectionOptionsDeV1 = {}): GermanTask7V2L01C05GartenSourceHoldDeV1 {
  validatePlan(); validateDirectCapture(); const root = path.resolve(options.evidenceRootForTest ?? EVIDENCE_ROOT); validateEvidence(root); validateManifest(root);
  return GERMAN_TASK7_V2_L01_C05_GARTEN_SOURCE_HOLD_DE_V1;
}
