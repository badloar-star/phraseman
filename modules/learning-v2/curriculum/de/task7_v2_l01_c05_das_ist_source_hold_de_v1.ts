import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

export type GermanTask7V2L01C05DasIstSourceHoldDeV1 = Readonly<{
  status: "HOLD";
  sourcePlanId: "de_lex_plan_l01_c05_das_ist_v1";
  checkpointPacketId: "de_l01_c05_s40";
  canonicalAdmission: false;
  inventoryResolutionApplied: false;
  task7Unlock: false;
  preauthoringAuthority: false;
  learnerFacing: false;
  releaseAuthorized: false;
  consumerCutover: "NONE";
}>;

export type GermanTask7V2L01C05DasIstInspectionOptionsDeV1 = Readonly<{
  evidenceRootForTest?: string;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const EVIDENCE_ROOT = path.join(ROOT, "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c05_das_ist_source_hold_v1");
const TASK5_PATH = path.join(ROOT, "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json");
const INVENTORY_PATH = path.join(ROOT, "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json");
const TASK5_SHA256 = "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const EXTRACTION_MAP_SHA256 = "ad28cd1bebe17ece14402777a0a3e15e1727d2ea2440209d90e3aeb7890c1644";
const EXTRACTION_MAP_BYTES = 1175;
const DWDS_SHA256 = "bcc581983ae4bb68c698ab512ac0bf15e522fdde800bc87b0b898d573761d915";
const DWDS_METADATA_SHA256 = "c85ed9d1a13bf1b124584cdc65cbefff56e8befd93d0000971c557428d0443d5";
const DWDS_URL = "https://www.dwds.de/wb/sein";

/** Exact source-HOLD boundary available to downstream HOLD receipts. */
export const GERMAN_TASK7_V2_L01_C05_DAS_IST_SOURCE_HOLD_DE_V1 =
  Object.freeze({
    status: "HOLD" as const,
    sourcePlanId: "de_lex_plan_l01_c05_das_ist_v1" as const,
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
function recordLike(value: unknown, key: string, expected: string): boolean { return value !== null && typeof value === "object" && !Array.isArray(value) && (value as JsonRecord)[key] === expected; }
function bound(root: string, relative: string, digest: string, bytes: number): Buffer { const rawRoot = path.resolve(root, "raw"); const file = path.resolve(root, relative); if (!file.startsWith(`${rawRoot}${path.sep}`)) fail("task7_das_ist_raw_path"); const value = fs.readFileSync(file); if (value.length !== bytes || sha256(value) !== digest) fail("task7_das_ist_raw_drift"); return value; }
function forbidOutput(value: unknown): void { if (value === null || typeof value !== "object") return; if (Array.isArray(value)) return value.forEach(forbidOutput); if (Object.hasOwn(value, "canonicalSenseId") || Object.hasOwn(value, "packetOutputPath") || Object.hasOwn(value, "releasePath")) fail("task7_das_ist_output_forbidden"); Object.values(value).forEach(forbidOutput); }

function validatePlan(): void {
  const bytes = fs.readFileSync(TASK5_PATH); if (sha256(bytes) !== TASK5_SHA256) fail("task7_das_ist_task5_drift");
  const task5 = json(TASK5_PATH, "task7_das_ist_plan"); array(task5.lessons, "task7_das_ist_plan");
  const lesson = task5.lessons.find(value => recordLike(value, "lessonId", "de_l01")); record(lesson, "task7_das_ist_plan"); array(lesson.chapters, "task7_das_ist_plan");
  const chapter = lesson.chapters.find(value => recordLike(value, "id", "de_l01_c05")); record(chapter, "task7_das_ist_plan"); record(chapter.checkpoint, "task7_das_ist_plan");
  if (chapter.checkpoint.packetId !== "de_l01_c05_s40") fail("task7_das_ist_checkpoint"); array(chapter.checkpoint.plannedNewLexicalSenses, "task7_das_ist_plan");
  const found = chapter.checkpoint.plannedNewLexicalSenses.filter(value => recordLike(value, "id", "de_lex_plan_l01_c05_das_ist_v1"));
  if (found.length !== 1) fail("task7_das_ist_plan"); record(found[0], "task7_das_ist_plan");
  if (found[0].semanticIdentity !== "das ist|fixed chunk for identifying a person" || found[0].lemmaOrExpression !== "Das ist") fail("task7_das_ist_lemma");
}
function validateInventory(): void {
  const inventory = json(INVENTORY_PATH, "task7_das_ist_inventory"); record(inventory.counts, "task7_das_ist_inventory");
  if (inventory.counts.resolvedPlanIds !== 6 || inventory.counts.unresolvedPlanIds !== 282 || inventory.counts.materializedPackets !== 0) fail("task7_das_ist_inventory");
  array(inventory.resolutions, "task7_das_ist_inventory"); if (inventory.resolutions.some(value => recordLike(value, "sourcePlanId", "de_lex_plan_l01_c05_das_ist_v1"))) fail("task7_das_ist_inventory_resolution_forbidden");
}
function validateEvidence(root: string): void {
  const mapPath = path.join(root, "extraction_map.json"); const mapBytes = fs.readFileSync(mapPath); if (sha256(mapBytes) !== EXTRACTION_MAP_SHA256 || mapBytes.length !== EXTRACTION_MAP_BYTES) fail("task7_das_ist_extraction_map");
  const map = json(mapPath, "task7_das_ist_extraction_map"); forbidOutput(map); if (map.schemaVersion !== "learning-v2-de-task7-v2-l01-c05-das-ist-source-extraction-map.v1") fail("task7_das_ist_extraction_map");
  record(map.rawSources, "task7_das_ist_extraction_map"); record(map.rawSources.dwdsSein, "task7_das_ist_extraction_map"); const source = map.rawSources.dwdsSein;
  if (source.requestedUrl !== DWDS_URL || source.canonicalUrl !== DWDS_URL || source.path !== "raw/dwds_sein.html" || source.sha256 !== DWDS_SHA256 || source.bytes !== 220384 || source.metadataPath !== "raw/dwds_sein.http_metadata.txt" || source.metadataSha256 !== DWDS_METADATA_SHA256 || source.metadataBytes !== 270 || source.transport !== "DIRECT_PUBLIC_HTTPS") fail("task7_das_ist_source");
  const raw = bound(root, String(source.path), DWDS_SHA256, 220384).toString("utf8"); const metadata = bound(root, String(source.metadataPath), DWDS_METADATA_SHA256, 270).toString("utf8");
  if (!raw.includes('title="3. Person Singular Indikativ Präsens Aktiv"') || !raw.includes("><b>ist</b></span>")) fail("task7_das_ist_extraction");
  if (!metadata.includes(`canonical-url: ${DWDS_URL}`) || !metadata.includes("http-status: 200") || !metadata.includes("transport: DIRECT_PUBLIC_HTTPS")) fail("task7_das_ist_http_metadata");
  record(map.extraction, "task7_das_ist_extraction_map"); const extraction = map.extraction;
  if (extraction.sourcePlanId !== "de_lex_plan_l01_c05_das_ist_v1" || extraction.checkpointPacketId !== "de_l01_c05_s40" || extraction.headword !== "sein" || extraction.verifiedForm !== "ist" || extraction.verifiedFormLocator !== "3. Person Singular Indikativ Präsens Aktiv" || extraction.evidenceFunction !== "THIRD_PERSON_PRESENT_FORM_IN_AUTHORITATIVE_LEXICAL_ENTRY") fail("task7_das_ist_extraction");
  record(map.unsupportedClaims, "task7_das_ist_extraction_map"); if (map.unsupportedClaims.exactLearnerPhrase !== "NOT_CLAIMED:_CAPTURE_DOES_NOT_PROVE_THE_EXACT_CASED_PHRASE_DAS_IST") fail("task7_das_ist_claim_boundary");
}
function validateManifest(root: string): void {
  const manifest = json(path.join(root, "manifest.json"), "task7_das_ist_manifest"); forbidOutput(manifest); if (manifest.schemaVersion !== "learning-v2-de-task7-v2-l01-c05-das-ist-source-hold.v1" || manifest.status !== "HOLD") fail("task7_das_ist_manifest");
  record(manifest.authority, "task7_das_ist_manifest"); const authority = manifest.authority; if (authority.scope !== "SOURCE_BOUND_HOLD_ONLY" || authority.decision !== "SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING" || authority.canonicalAdmission !== false || authority.inventoryResolutionApplied !== false || authority.task7Unlock !== false || authority.preauthoringAuthority !== false || authority.learnerFacing !== false || authority.releaseAuthorized !== false || authority.consumerCutover !== "NONE") fail("task7_das_ist_hold_boundary");
  record(manifest.task5V2, "task7_das_ist_manifest"); const task5 = manifest.task5V2; if (task5.path !== "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json" || task5.byteSha256 !== TASK5_SHA256 || task5.sourcePlanId !== "de_lex_plan_l01_c05_das_ist_v1" || task5.checkpointPacketId !== "de_l01_c05_s40" || task5.semanticIdentity !== "das ist|fixed chunk for identifying a person" || task5.lemmaOrExpression !== "Das ist") fail("task7_das_ist_plan_binding");
  record(manifest.sources, "task7_das_ist_manifest"); record(manifest.sources.extractionMap, "task7_das_ist_manifest"); if (manifest.sources.extractionMap.path !== "extraction_map.json" || manifest.sources.extractionMap.sha256 !== EXTRACTION_MAP_SHA256 || manifest.sources.extractionMap.bytes !== EXTRACTION_MAP_BYTES) fail("task7_das_ist_manifest");
  record(manifest.allocation, "task7_das_ist_manifest"); const allocation = manifest.allocation; if (allocation.sourcePlanId !== "de_lex_plan_l01_c05_das_ist_v1" || allocation.checkpointPacketId !== "de_l01_c05_s40" || allocation.sessionId !== "de_l01_s05" || allocation.chapterId !== "de_l01_c05" || allocation.decision !== "SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING") fail("task7_das_ist_allocation");
}
export function inspectGermanTask7V2L01C05DasIstSourceHoldDeV1(options: GermanTask7V2L01C05DasIstInspectionOptionsDeV1 = {}): GermanTask7V2L01C05DasIstSourceHoldDeV1 {
  const root = path.resolve(options.evidenceRootForTest ?? EVIDENCE_ROOT); validatePlan(); validateInventory(); validateEvidence(root); validateManifest(root);
  return GERMAN_TASK7_V2_L01_C05_DAS_IST_SOURCE_HOLD_DE_V1;
}
