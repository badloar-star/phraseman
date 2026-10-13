import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

export type GermanTask7V2L01C06HausmeisterSourceHoldDeV1 = Readonly<{
  status: "HOLD";
  sourcePlanId: "de_lex_plan_l01_c06_hausmeister_v1";
  checkpointPacketId: "de_l01_c06_s48";
  canonicalAdmission: false;
  inventoryResolutionApplied: false;
  task7Unlock: false;
  preauthoringAuthority: false;
  learnerFacing: false;
  releaseAuthorized: false;
  consumerCutover: "NONE";
}>;

export type GermanTask7V2L01C06HausmeisterInspectionOptionsDeV1 = Readonly<{ evidenceRootForTest?: string }>;

const ROOT = path.resolve(__dirname, "../../../..");
const EVIDENCE_ROOT = path.join(ROOT, "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_hausmeister_source_hold_v1");
const PLAN_PATH = path.join(ROOT, "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json");
const REGISTRY_PATH = path.join(ROOT, ".tmp/de-task6c-l01-direct-capture/registry.json");
const PLAN_SHA256 = "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const REGISTRY_SHA256 = "5dc2a6e3c497f19d5e291daf04d4af1f944ae42b502d24d0f92a7d7adaf208cc";
const RAW_SHA256 = "ce5d7d3b6648662579068c4702d6fb252f21e165eafa043b569a1b822346a538";
const METADATA_SHA256 = "365da893f5c85cb11a2928bb365cbc3835fbfafac8ee5c1e6c9c07ef3a787168";
const MAP_SHA256 = "de6cf30b0ee672964555d2a0a89bedd35c03e8a81a5c90d3dedbdf9daae9da49";
const URL = "https://www.dwds.de/wb/Hausmeister";

export const GERMAN_TASK7_V2_L01_C06_HAUSMEISTER_SOURCE_HOLD_DE_V1 = Object.freeze({
  status: "HOLD" as const, sourcePlanId: "de_lex_plan_l01_c06_hausmeister_v1" as const,
  checkpointPacketId: "de_l01_c06_s48" as const, canonicalAdmission: false as const,
  inventoryResolutionApplied: false as const, task7Unlock: false as const,
  preauthoringAuthority: false as const, learnerFacing: false as const,
  releaseAuthorized: false as const, consumerCutover: "NONE" as const,
});

function fail(code: string): never { throw new Error(code); }
function hash(value: Buffer | string): string { return crypto.createHash("sha256").update(value).digest("hex"); }
function record(value: unknown, code: string): asserts value is JsonRecord { if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code); }
function array(value: unknown, code: string): asserts value is unknown[] { if (!Array.isArray(value)) fail(code); }
function json(file: string, code: string): JsonRecord { try { const value: unknown = JSON.parse(fs.readFileSync(file, "utf8")); record(value, code); return value; } catch { return fail(code); } }
function has(value: unknown, key: string, expected: string): boolean { return value !== null && typeof value === "object" && !Array.isArray(value) && (value as JsonRecord)[key] === expected; }
function forbidOutput(value: unknown): void { if (value === null || typeof value !== "object") return; if (Array.isArray(value)) return value.forEach(forbidOutput); if (["canonicalSenseId", "packetOutputPath", "releasePath", "consumerPath"].some(key => Object.hasOwn(value, key))) fail("task7_hausmeister_output_forbidden"); Object.values(value).forEach(forbidOutput); }
function bound(root: string, relative: string, digest: string, bytes: number, code: string): Buffer { const rawRoot = path.resolve(root, "raw"); const file = path.resolve(root, relative); if (!file.startsWith(`${rawRoot}${path.sep}`)) fail(code); const value = fs.readFileSync(file); if (value.length !== bytes || hash(value) !== digest) fail(code); return value; }

function validatePlan(): void {
  const bytes = fs.readFileSync(PLAN_PATH); if (hash(bytes) !== PLAN_SHA256) fail("task7_hausmeister_plan_drift");
  const plan = json(PLAN_PATH, "task7_hausmeister_plan"); array(plan.lessons, "task7_hausmeister_plan");
  const lesson = plan.lessons.find(value => has(value, "lessonId", "de_l01")); record(lesson, "task7_hausmeister_plan"); array(lesson.chapters, "task7_hausmeister_plan");
  const chapter = lesson.chapters.find(value => has(value, "id", "de_l01_c06")); record(chapter, "task7_hausmeister_plan"); record(chapter.checkpoint, "task7_hausmeister_plan");
  if (chapter.checkpoint.packetId !== "de_l01_c06_s48") fail("task7_hausmeister_checkpoint"); array(chapter.checkpoint.plannedNewLexicalSenses, "task7_hausmeister_plan");
  const rows = chapter.checkpoint.plannedNewLexicalSenses.filter(value => has(value, "id", "de_lex_plan_l01_c06_hausmeister_v1")); if (rows.length !== 1) fail("task7_hausmeister_plan_identity"); record(rows[0], "task7_hausmeister_plan_identity"); record(rows[0].nounPackage, "task7_hausmeister_plan_identity");
  if (rows[0].semanticIdentity !== "hausmeister|caretaker responsible for a building" || rows[0].lemmaOrExpression !== "Hausmeister" || rows[0].partOfSpeech !== "noun" || rows[0].nounPackage.article !== "der" || rows[0].nounPackage.singular !== "Hausmeister" || rows[0].nounPackage.plural !== "Hausmeister") fail("task7_hausmeister_plan_identity");
}

function validateRegistry(): void {
  const bytes = fs.readFileSync(REGISTRY_PATH); if (hash(bytes) !== REGISTRY_SHA256) fail("task7_hausmeister_registry_drift"); const registry = json(REGISTRY_PATH, "task7_hausmeister_registry"); array(registry.rows, "task7_hausmeister_registry");
  const rows = registry.rows.filter(value => has(value, "sourcePlanId", "de_lex_plan_l01_c06_hausmeister_v1")); if (rows.length !== 1) fail("task7_hausmeister_registry"); record(rows[0], "task7_hausmeister_registry"); record(rows[0].rawResponse, "task7_hausmeister_registry"); record(rows[0].extractedGermanClaim, "task7_hausmeister_registry");
  if (rows[0].canonicalUrl !== URL || rows[0].httpStatus !== 200 || rows[0].rawResponse.path !== "raw/de_lex_plan_l01_c06_hausmeister_v1.html" || rows[0].rawResponse.responseSha256 !== RAW_SHA256 || rows[0].rawResponse.bytes !== 59173 || rows[0].extractedGermanClaim.sourceAnchor !== "d-1-1" || rows[0].extractedGermanClaim.exactRawHtmlSha256 !== "5bff988ed5cd3a83a69c56fa29fb434a525818174736e0fe2b7207b165e0d288" || rows[0].extractedGermanClaim.exactRawHtmlUtf8Bytes !== 965) fail("task7_hausmeister_registry");
}

function validateEvidence(root: string): void {
  const raw = bound(root, "raw/de_lex_plan_l01_c06_hausmeister_v1.html", RAW_SHA256, 59173, "task7_hausmeister_raw_drift").toString("utf8");
  if (!raw.includes("Substantiv (Maskulinum)") || !raw.includes("Nominativ Plural: <b>Hausmeister</b>") || !raw.includes("Angestellter, der für die Instandhaltung und Reinigung eines (öffentlichen) Gebäudes verantwortlich ist")) fail("task7_hausmeister_raw_extraction");
  const metadata = bound(root, "raw/de_lex_plan_l01_c06_hausmeister_v1.http_metadata.txt", METADATA_SHA256, 520, "task7_hausmeister_metadata_drift").toString("utf8");
  if (!metadata.includes(`canonical-url: ${URL}`.replace("canonical-url", "final-url")) || !metadata.includes("http-status: 200") || !metadata.includes(`registry-sha256: ${REGISTRY_SHA256}`)) fail("task7_hausmeister_metadata");
  const mapPath = path.join(root, "extraction_map.json"); const mapBytes = fs.readFileSync(mapPath); if (hash(mapBytes) !== MAP_SHA256 || mapBytes.length !== 1651) fail("task7_hausmeister_extraction_map"); const map = json(mapPath, "task7_hausmeister_extraction_map"); forbidOutput(map);
  if (map.schemaVersion !== "learning-v2-de-task7-v2-l01-c06-hausmeister-source-extraction-map.v1") fail("task7_hausmeister_extraction_map"); record(map.directCapture, "task7_hausmeister_extraction_map"); record(map.extraction, "task7_hausmeister_extraction_map"); record(map.unsupportedClaims, "task7_hausmeister_extraction_map");
  if (map.directCapture.registrySha256 !== REGISTRY_SHA256 || map.directCapture.canonicalUrl !== URL || map.directCapture.rawResponseSha256 !== RAW_SHA256 || map.directCapture.metadataSha256 !== METADATA_SHA256 || map.extraction.sourcePlanId !== "de_lex_plan_l01_c06_hausmeister_v1" || map.extraction.checkpointPacketId !== "de_l01_c06_s48" || map.extraction.sourceHeadword !== "Hausmeister" || map.extraction.article !== "der" || map.extraction.nominativePlural !== "Hausmeister" || map.extraction.exactSpanSha256 !== "5bff988ed5cd3a83a69c56fa29fb434a525818174736e0fe2b7207b165e0d288" || map.unsupportedClaims.canonicalAdmission !== "OUT_OF_SCOPE") fail("task7_hausmeister_extraction_map");
  const manifest = json(path.join(root, "manifest.json"), "task7_hausmeister_manifest"); forbidOutput(manifest); if (manifest.schemaVersion !== "learning-v2-de-task7-v2-l01-c06-hausmeister-source-hold.v1" || manifest.status !== "HOLD") fail("task7_hausmeister_manifest"); record(manifest.authority, "task7_hausmeister_manifest"); record(manifest.task5V2, "task7_hausmeister_manifest"); record(manifest.sources, "task7_hausmeister_manifest"); record(manifest.sources.extractionMap, "task7_hausmeister_manifest"); record(manifest.allocation, "task7_hausmeister_manifest");
  if (manifest.authority.scope !== "SOURCE_BOUND_HOLD_ONLY" || manifest.authority.canonicalAdmission !== false || manifest.authority.inventoryResolutionApplied !== false || manifest.authority.task7Unlock !== false || manifest.authority.preauthoringAuthority !== false || manifest.authority.learnerFacing !== false || manifest.authority.releaseAuthorized !== false || manifest.authority.consumerCutover !== "NONE" || manifest.task5V2.byteSha256 !== PLAN_SHA256 || manifest.task5V2.sourcePlanId !== "de_lex_plan_l01_c06_hausmeister_v1" || manifest.task5V2.checkpointPacketId !== "de_l01_c06_s48" || manifest.sources.extractionMap.sha256 !== MAP_SHA256 || manifest.sources.extractionMap.bytes !== 1651 || manifest.allocation.sourcePlanId !== "de_lex_plan_l01_c06_hausmeister_v1" || manifest.allocation.checkpointPacketId !== "de_l01_c06_s48" || manifest.allocation.sessionId !== "de_l01_s06" || manifest.allocation.chapterId !== "de_l01_c06") fail("task7_hausmeister_manifest");
}

export function inspectGermanTask7V2L01C06HausmeisterSourceHoldDeV1(options: GermanTask7V2L01C06HausmeisterInspectionOptionsDeV1 = {}): GermanTask7V2L01C06HausmeisterSourceHoldDeV1 { validatePlan(); validateRegistry(); validateEvidence(path.resolve(options.evidenceRootForTest ?? EVIDENCE_ROOT)); return GERMAN_TASK7_V2_L01_C06_HAUSMEISTER_SOURCE_HOLD_DE_V1; }
