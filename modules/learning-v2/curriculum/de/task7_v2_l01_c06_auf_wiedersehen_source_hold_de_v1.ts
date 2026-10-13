import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

export type GermanTask7V2L01C06AufWiedersehenSourceHoldDeV1 = Readonly<{
  status: "HOLD";
  sourcePlanId: "de_lex_plan_l01_c06_auf_wiedersehen_v1";
  checkpointPacketId: "de_l01_c06_s48";
  canonicalAdmission: false;
  inventoryResolutionApplied: false;
  task7Unlock: false;
  preauthoringAuthority: false;
  learnerFacing: false;
  releaseAuthorized: false;
  consumerCutover: "NONE";
}>;

export type GermanTask7V2L01C06AufWiedersehenInspectionOptionsDeV1 = Readonly<{
  evidenceRootForTest?: string;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const EVIDENCE_ROOT = path.join(ROOT, "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_auf_wiedersehen_source_hold_v1");
const TASK5_PATH = path.join(ROOT, "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json");
const INVENTORY_PATH = path.join(ROOT, "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json");
const TASK5_SHA256 = "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const RAW_SHA256 = "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085";
const METADATA_SHA256 = "afa2a1f9de300071b9e885fb3ade745766b53d7f7bd5bee5732f188806db8f47";
const EXTRACTION_MAP_SHA256 = "b55246c8274075182f3f534ae12470a0550cfbc79d128ac349d3fae5b0bb558e";
const MANIFEST_SHA256 = "360533cdb4ff0571850cbe807b6455e3393406a25327d91099d51e1218f3512a";
const GOETHE_URL = "https://lernen.goethe.de/deutschonline/A1/PDF/DE/deutschonline_Redemittel_und_Grammatik_1-18.pdf";

export const GERMAN_TASK7_V2_L01_C06_AUF_WIEDERSEHEN_SOURCE_HOLD_DE_V1 = Object.freeze({
  status: "HOLD" as const,
  sourcePlanId: "de_lex_plan_l01_c06_auf_wiedersehen_v1" as const,
  checkpointPacketId: "de_l01_c06_s48" as const,
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
function bound(root: string, relative: string, digest: string, bytes: number): Buffer { const rawRoot = path.resolve(root, "raw"); const file = path.resolve(root, relative); if (!file.startsWith(`${rawRoot}${path.sep}`)) fail("task7_auf_wiedersehen_raw_path"); const value = fs.readFileSync(file); if (value.length !== bytes || sha256(value) !== digest) fail("task7_auf_wiedersehen_raw_drift"); return value; }
function forbidOutput(value: unknown): void { if (value === null || typeof value !== "object") return; if (Array.isArray(value)) return value.forEach(forbidOutput); if (["canonicalSenseId", "packetOutputPath", "releasePath", "consumerPath"].some(key => Object.hasOwn(value, key))) fail("task7_auf_wiedersehen_output_forbidden"); Object.values(value).forEach(forbidOutput); }

function validatePlan(): void {
  const bytes = fs.readFileSync(TASK5_PATH); if (sha256(bytes) !== TASK5_SHA256) fail("task7_auf_wiedersehen_task5_drift");
  const task5 = json(TASK5_PATH, "task7_auf_wiedersehen_plan"); array(task5.lessons, "task7_auf_wiedersehen_plan");
  const lesson = task5.lessons.find(value => like(value, "lessonId", "de_l01")); record(lesson, "task7_auf_wiedersehen_plan"); array(lesson.chapters, "task7_auf_wiedersehen_plan");
  const chapter = lesson.chapters.find(value => like(value, "id", "de_l01_c06")); record(chapter, "task7_auf_wiedersehen_plan"); record(chapter.checkpoint, "task7_auf_wiedersehen_plan");
  if (chapter.checkpoint.packetId !== "de_l01_c06_s48") fail("task7_auf_wiedersehen_checkpoint"); array(chapter.checkpoint.plannedNewLexicalSenses, "task7_auf_wiedersehen_plan");
  const rows = chapter.checkpoint.plannedNewLexicalSenses.filter(value => like(value, "id", "de_lex_plan_l01_c06_auf_wiedersehen_v1"));
  if (rows.length !== 1) fail("task7_auf_wiedersehen_plan_identity"); record(rows[0], "task7_auf_wiedersehen_plan_identity");
  if (rows[0].semanticIdentity !== "auf wiedersehen|neutral formal leave taking" || rows[0].lemmaOrExpression !== "Auf Wiedersehen" || rows[0].partOfSpeech !== "fixed_expression") fail("task7_auf_wiedersehen_plan_identity");
}

function validateInventory(): void {
  const inventory = json(INVENTORY_PATH, "task7_auf_wiedersehen_inventory"); record(inventory.counts, "task7_auf_wiedersehen_inventory");
  if (inventory.counts.resolvedPlanIds !== 6 || inventory.counts.unresolvedPlanIds !== 282 || inventory.counts.materializedPackets !== 0) fail("task7_auf_wiedersehen_inventory");
  array(inventory.resolutions, "task7_auf_wiedersehen_inventory"); if (inventory.resolutions.some(value => like(value, "sourcePlanId", "de_lex_plan_l01_c06_auf_wiedersehen_v1"))) fail("task7_auf_wiedersehen_inventory_resolution_forbidden");
}

function validateEvidence(root: string): void {
  const mapPath = path.join(root, "extraction_map.json"); const mapBytes = fs.readFileSync(mapPath);
  if (mapBytes.length !== 1427 || sha256(mapBytes) !== EXTRACTION_MAP_SHA256) fail("task7_auf_wiedersehen_extraction_map");
  const map = json(mapPath, "task7_auf_wiedersehen_extraction_map"); forbidOutput(map);
  if (map.schemaVersion !== "learning-v2-de-task7-v2-l01-c06-auf-wiedersehen-source-extraction-map.v1") fail("task7_auf_wiedersehen_extraction_map");
  record(map.rawSources, "task7_auf_wiedersehen_extraction_map"); record(map.rawSources.goetheA1Redemittel, "task7_auf_wiedersehen_extraction_map"); const source = map.rawSources.goetheA1Redemittel;
  if (source.requestedUrl !== GOETHE_URL || source.canonicalUrl !== GOETHE_URL || source.path !== "raw/goethe_a1_redemittel.pdf" || source.sha256 !== RAW_SHA256 || source.bytes !== 3685205 || source.metadataPath !== "raw/goethe_a1_redemittel.http_metadata.txt" || source.metadataSha256 !== METADATA_SHA256 || source.metadataBytes !== 400 || source.transport !== "DIRECT_PUBLIC_HTTPS") fail("task7_auf_wiedersehen_source");
  bound(root, String(source.path), RAW_SHA256, 3685205); const metadata = bound(root, String(source.metadataPath), METADATA_SHA256, 400).toString("utf8");
  if (!metadata.includes(`canonical-url: ${GOETHE_URL}`) || !metadata.includes("http-status: 200") || !metadata.includes("transport: DIRECT_PUBLIC_HTTPS")) fail("task7_auf_wiedersehen_http_metadata");
  record(map.extraction, "task7_auf_wiedersehen_extraction_map"); const extraction = map.extraction;
  if (extraction.sourcePlanId !== "de_lex_plan_l01_c06_auf_wiedersehen_v1" || extraction.checkpointPacketId !== "de_l01_c06_s48" || extraction.pdfPage !== 3 || extraction.heading !== "WIE SAGT MAN? > BEGRÜSSEN UND VERABSCHIEDEN" || extraction.exactOccurrence !== "Auf Wiedersehen! / Tschüs!" || extraction.exactOccurrenceUtf8Bytes !== 27 || extraction.exactOccurrenceSha256 !== "fefa8907e7a90ccaa18b44c0aa3f5ce7829ccaed980c69e8f427902c3e692442" || extraction.evidenceFunction !== "EXACT_OCCURRENCE_IN_OFFICIAL_LEARNING_INVENTORY") fail("task7_auf_wiedersehen_extraction");
  record(map.unsupportedClaims, "task7_auf_wiedersehen_extraction_map"); if (map.unsupportedClaims.neutralRegister !== "UNSUPPORTED_BY_CAPTURED_SOURCE" || map.unsupportedClaims.canonicalAdmission !== "OUT_OF_SCOPE" || map.unsupportedClaims.learnerPhraseAuthority !== "OUT_OF_SCOPE") fail("task7_auf_wiedersehen_claim_boundary");
}

function validateManifest(root: string): void {
  const manifestPath = path.join(root, "manifest.json"); const manifestBytes = fs.readFileSync(manifestPath); if (sha256(manifestBytes) !== MANIFEST_SHA256) fail("task7_auf_wiedersehen_manifest");
  const manifest = json(manifestPath, "task7_auf_wiedersehen_manifest"); forbidOutput(manifest); if (manifest.schemaVersion !== "learning-v2-de-task7-v2-l01-c06-auf-wiedersehen-source-hold.v1" || manifest.status !== "HOLD") fail("task7_auf_wiedersehen_manifest");
  record(manifest.authority, "task7_auf_wiedersehen_manifest"); const authority = manifest.authority;
  if (authority.scope !== "SOURCE_BOUND_HOLD_ONLY" || authority.decision !== "SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING" || authority.canonicalAdmission !== false || authority.inventoryResolutionApplied !== false || authority.task7Unlock !== false || authority.preauthoringAuthority !== false || authority.learnerFacing !== false || authority.releaseAuthorized !== false || authority.consumerCutover !== "NONE") fail("task7_auf_wiedersehen_hold_boundary");
  record(manifest.task5V2, "task7_auf_wiedersehen_manifest"); const task5 = manifest.task5V2;
  if (task5.path !== "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json" || task5.byteSha256 !== TASK5_SHA256 || task5.sourcePlanId !== "de_lex_plan_l01_c06_auf_wiedersehen_v1" || task5.checkpointPacketId !== "de_l01_c06_s48" || task5.semanticIdentity !== "auf wiedersehen|neutral formal leave taking" || task5.lemmaOrExpression !== "Auf Wiedersehen") fail("task7_auf_wiedersehen_plan_binding");
  record(manifest.sources, "task7_auf_wiedersehen_manifest"); record(manifest.sources.extractionMap, "task7_auf_wiedersehen_manifest"); if (manifest.sources.extractionMap.path !== "extraction_map.json" || manifest.sources.extractionMap.sha256 !== EXTRACTION_MAP_SHA256 || manifest.sources.extractionMap.bytes !== 1427) fail("task7_auf_wiedersehen_manifest");
  record(manifest.allocation, "task7_auf_wiedersehen_manifest"); const allocation = manifest.allocation;
  if (allocation.sourcePlanId !== "de_lex_plan_l01_c06_auf_wiedersehen_v1" || allocation.checkpointPacketId !== "de_l01_c06_s48" || allocation.sessionId !== "de_l01_s06" || allocation.chapterId !== "de_l01_c06" || allocation.decision !== "SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING") fail("task7_auf_wiedersehen_allocation");
}

export function inspectGermanTask7V2L01C06AufWiedersehenSourceHoldDeV1(options: GermanTask7V2L01C06AufWiedersehenInspectionOptionsDeV1 = {}): GermanTask7V2L01C06AufWiedersehenSourceHoldDeV1 {
  validatePlan(); validateInventory(); const root = path.resolve(options.evidenceRootForTest ?? EVIDENCE_ROOT); validateEvidence(root); validateManifest(root);
  return GERMAN_TASK7_V2_L01_C06_AUF_WIEDERSEHEN_SOURCE_HOLD_DE_V1;
}
