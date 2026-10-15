import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

export type GermanTask7V2L01C04BueroSourceHoldDeV1 = Readonly<{
  status: "HOLD";
  sourcePlanId: "de_lex_plan_l01_c04_buero_v1";
  checkpointPacketId: "de_l01_c04_s32";
  canonicalAdmission: false;
  inventoryResolutionApplied: false;
  task7Unlock: false;
  preauthoringAuthority: false;
  learnerFacing: false;
  releaseAuthorized: false;
  consumerCutover: "NONE";
}>;

export type GermanTask7V2L01C04BueroInspectionOptionsDeV1 = Readonly<{
  evidenceRootForTest?: string;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const EVIDENCE_ROOT = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_buero_source_hold_v1",
);
const TASK5_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
);
const TASK5_SHA256 =
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const MAP_SHA256 =
  "b6100ea79a11b831e129069e8d33fac532d5ad6b293294b12afdd77824dc6963";
const MANIFEST_SHA256 =
  "ee05107b00e14e18b7ed69f50de882ac62bb38b11f2f8c7df1e70467fba69b5d";
const DIRECT_REGISTRY_PATH = path.join(
  ROOT,
  ".tmp/de-task6c-l01-direct-capture/registry.json",
);
const DIRECT_REGISTRY_SHA256 =
  "5dc2a6e3c497f19d5e291daf04d4af1f944ae42b502d24d0f92a7d7adaf208cc";
const RAW_SHA256 =
  "8a33bb90ed67602206a65824a5e3e19c69c9b85384cc1426b62f3628675e5787";
const RAW_BYTES = 142698;
const EXACT_SPAN_SHA256 =
  "347d9d22d6af7a1cc1d2694ab688aebe11886eb7b4f2d41fdf17862ea990ea23";
const EXACT_SPAN_BYTES = 4753;
const DWDS_URL = "https://www.dwds.de/wb/B%C3%BCro";

/** Exact facts validated by this source-HOLD inspector for downstream HOLD receipts. */
export const GERMAN_TASK7_V2_L01_C04_BUERO_SOURCE_HOLD_EVIDENCE_DE_V1 =
  Object.freeze({
    planId: "de_lex_plan_l01_c04_buero_v1" as const,
    checkpointPacketId: "de_l01_c04_s32" as const,
    lemmaOrExpression: "Büro" as const,
    authority: "Task6 retained direct-HTTPS registry" as const,
    verifiedFact: "GENERAL_OFFICE_SENSE_ONLY" as const,
    freshDwdsCapture: false as const,
    generalOfficeSenseOnly: true as const,
    caretakerScene: false as const,
    register: false as const,
    naturalness: false as const,
    learnerPhrase: false as const,
  });

function fail(code: string): never {
  throw new Error(code);
}
function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function record(value: unknown, code: string): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(code);
}
function array(value: unknown, code: string): asserts value is unknown[] {
  if (!Array.isArray(value)) fail(code);
}
function json(file: string, code: string): JsonRecord {
  try {
    const value: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    record(value, code);
    return value;
  } catch {
    return fail(code);
  }
}
function exactKeys(value: JsonRecord, expected: string[], code: string): void {
  if (Object.keys(value).sort().join("\0") !== [...expected].sort().join("\0"))
    fail(code);
}
function has(value: unknown, key: string, expected: string): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as JsonRecord)[key] === expected
  );
}
function forbidOutputAuthority(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) return value.forEach(forbidOutputAuthority);
  if (
    [
      "canonicalSenseId",
      "packetOutputPath",
      "releasePath",
      "consumerPath",
    ].some((key) => Object.hasOwn(value, key))
  )
    fail("task7_buero_output_authority_forbidden");
  Object.values(value).forEach(forbidOutputAuthority);
}

function validateTask5(): void {
  const bytes = fs.readFileSync(TASK5_PATH);
  if (sha256(bytes) !== TASK5_SHA256) fail("task7_buero_task5_drift");
  const root = json(TASK5_PATH, "task7_buero_task5_json");
  array(root.lessons, "task7_buero_task5_shape");
  const lesson = root.lessons.find((value) => has(value, "lessonId", "de_l01"));
  record(lesson, "task7_buero_task5_shape");
  array(lesson.chapters, "task7_buero_task5_shape");
  const chapter = lesson.chapters.find((value) =>
    has(value, "id", "de_l01_c04"),
  );
  record(chapter, "task7_buero_task5_shape");
  record(chapter.checkpoint, "task7_buero_task5_shape");
  if (chapter.checkpoint.packetId !== "de_l01_c04_s32")
    fail("task7_buero_checkpoint");
  array(chapter.checkpoint.plannedNewLexicalSenses, "task7_buero_task5_shape");
  const rows = chapter.checkpoint.plannedNewLexicalSenses.filter((value) =>
    has(value, "id", "de_lex_plan_l01_c04_buero_v1"),
  );
  if (rows.length !== 1) fail("task7_buero_plan_identity");
  record(rows[0], "task7_buero_plan_identity");
  record(rows[0].nounPackage, "task7_buero_plan_identity");
  if (
    rows[0].semanticIdentity !==
      "buro|caretaker office where a resident meets the caretaker" ||
    rows[0].lemmaOrExpression !== "Büro" ||
    rows[0].partOfSpeech !== "noun" ||
    rows[0].nounPackage.article !== "das" ||
    rows[0].nounPackage.singular !== "Büro" ||
    rows[0].nounPackage.plural !== "Büros"
  )
    fail("task7_buero_plan_identity");
}

function validateMap(root: string): void {
  const file = path.join(root, "extraction_map.json");
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== MAP_SHA256) fail("task7_buero_extraction_map");
  const map = json(file, "task7_buero_extraction_map");
  exactKeys(
    map,
    ["schemaVersion", "directCapture", "extraction", "unsupportedClaims"],
    "task7_buero_extraction_map",
  );
  if (
    map.schemaVersion !==
    "learning-v2-de-task7-v2-l01-c04-buero-source-extraction-map.v1"
  )
    fail("task7_buero_extraction_map");
  record(map.directCapture, "task7_buero_extraction_map");
  const source = map.directCapture;
  if (
    source.registryPath !== ".tmp/de-task6c-l01-direct-capture/registry.json" ||
    source.registrySha256 !== DIRECT_REGISTRY_SHA256 ||
    source.canonicalUrl !== DWDS_URL ||
    source.httpStatus !== 200 ||
    source.contentType !== "text/html; charset=UTF-8" ||
    source.rawResponseSha256 !== RAW_SHA256 ||
    source.rawResponseBytes !== RAW_BYTES
  )
    fail("task7_buero_direct_capture_binding");
  const registryBytes = fs.readFileSync(DIRECT_REGISTRY_PATH);
  if (sha256(registryBytes) !== DIRECT_REGISTRY_SHA256)
    fail("task7_buero_direct_registry_drift");
  const registry = json(DIRECT_REGISTRY_PATH, "task7_buero_direct_registry");
  array(registry.rows, "task7_buero_direct_registry");
  const rows = registry.rows.filter((value) =>
    has(value, "sourcePlanId", "de_lex_plan_l01_c04_buero_v1"),
  );
  if (rows.length !== 1) fail("task7_buero_direct_registry");
  record(rows[0], "task7_buero_direct_registry");
  record(rows[0].rawResponse, "task7_buero_direct_registry");
  record(rows[0].extractedGermanClaim, "task7_buero_direct_registry");
  if (
    rows[0].canonicalUrl !== DWDS_URL ||
    rows[0].httpStatus !== 200 ||
    rows[0].rawResponse.responseSha256 !== RAW_SHA256 ||
    rows[0].rawResponse.bytes !== RAW_BYTES ||
    rows[0].extractedGermanClaim.sourceAnchor !== "d-1-1" ||
    rows[0].extractedGermanClaim.exactRawHtmlSha256 !== EXACT_SPAN_SHA256 ||
    rows[0].extractedGermanClaim.exactRawHtmlUtf8Bytes !== EXACT_SPAN_BYTES
  )
    fail("task7_buero_direct_registry");
  record(map.extraction, "task7_buero_extraction_map");
  if (
    map.extraction.sourcePlanId !== "de_lex_plan_l01_c04_buero_v1" ||
    map.extraction.checkpointPacketId !== "de_l01_c04_s32" ||
    map.extraction.sourceHeadword !== "Büro" ||
    map.extraction.sourcePartOfSpeech !== "Substantiv (Neutrum)" ||
    map.extraction.article !== "das" ||
    map.extraction.nominativePlural !== "Büros" ||
    map.extraction.sourceAnchor !== "d-1-1" ||
    map.extraction.sourceCoreGerman !==
      "Raum eines Gebäudes oder Bereich, in dem am Schreibtisch oder Computer schriftliche oder verwaltende Arbeiten erledigt werden" ||
    map.extraction.exactSpanSha256 !== EXACT_SPAN_SHA256 ||
    map.extraction.exactSpanUtf8Bytes !== EXACT_SPAN_BYTES
  )
    fail("task7_buero_extraction");
  record(map.unsupportedClaims, "task7_buero_extraction_map");
  if (
    map.unsupportedClaims.caretakerSpecificOffice !==
      "UNSUPPORTED_BY_CAPTURED_SOURCE" ||
    map.unsupportedClaims.canonicalAdmission !== "OUT_OF_SCOPE" ||
    map.unsupportedClaims.learnerPhraseAuthority !== "OUT_OF_SCOPE" ||
    map.unsupportedClaims.register !== "NOT_CLAIMED_BY_THIS_PACKET"
  )
    fail("task7_buero_claim_boundary");
}

function validateManifest(root: string): void {
  const file = path.join(root, "manifest.json");
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== MANIFEST_SHA256) fail("task7_buero_manifest");
  const manifest = json(file, "task7_buero_manifest");
  forbidOutputAuthority(manifest);
  exactKeys(
    manifest,
    [
      "schemaVersion",
      "status",
      "authority",
      "task5V2",
      "sources",
      "fieldSupport",
      "allocation",
    ],
    "task7_buero_manifest",
  );
  if (
    manifest.schemaVersion !==
      "learning-v2-de-task7-v2-l01-c04-buero-source-hold.v1" ||
    manifest.status !== "HOLD"
  )
    fail("task7_buero_manifest");
  record(manifest.authority, "task7_buero_manifest");
  const authority = manifest.authority;
  if (
    authority.scope !== "SOURCE_BOUND_HOLD_ONLY" ||
    authority.decision !==
      "SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING" ||
    authority.canonicalAdmission !== false ||
    authority.inventoryResolutionApplied !== false ||
    authority.task7Unlock !== false ||
    authority.preauthoringAuthority !== false ||
    authority.learnerFacing !== false ||
    authority.releaseAuthorized !== false ||
    authority.consumerCutover !== "NONE"
  )
    fail("task7_buero_hold_boundary");
  record(manifest.task5V2, "task7_buero_manifest");
  if (
    manifest.task5V2.byteSha256 !== TASK5_SHA256 ||
    manifest.task5V2.sourcePlanId !== "de_lex_plan_l01_c04_buero_v1" ||
    manifest.task5V2.checkpointPacketId !== "de_l01_c04_s32"
  )
    fail("task7_buero_task5_binding");
  record(manifest.sources, "task7_buero_manifest");
  record(manifest.sources.extractionMap, "task7_buero_manifest");
  if (
    manifest.sources.extractionMap.path !== "extraction_map.json" ||
    manifest.sources.extractionMap.sha256 !== MAP_SHA256
  )
    fail("task7_buero_manifest");
  record(manifest.fieldSupport, "task7_buero_manifest");
  record(manifest.fieldSupport.unsupportedClaims, "task7_buero_manifest");
  if (
    manifest.fieldSupport.unsupportedClaims.caretakerSpecificOffice !==
    "UNSUPPORTED_BY_CAPTURED_SOURCE"
  )
    fail("task7_buero_claim_boundary");
  record(manifest.allocation, "task7_buero_manifest");
  if (
    manifest.allocation.sourcePlanId !== "de_lex_plan_l01_c04_buero_v1" ||
    manifest.allocation.checkpointPacketId !== "de_l01_c04_s32" ||
    manifest.allocation.decision !==
      "SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING"
  )
    fail("task7_buero_allocation");
}

export function inspectGermanTask7V2L01C04BueroSourceHoldDeV1(
  options: GermanTask7V2L01C04BueroInspectionOptionsDeV1 = {},
): GermanTask7V2L01C04BueroSourceHoldDeV1 {
  validateTask5();
  const root = path.resolve(options.evidenceRootForTest ?? EVIDENCE_ROOT);
  validateMap(root);
  validateManifest(root);
  return Object.freeze({
    status: "HOLD",
    sourcePlanId: "de_lex_plan_l01_c04_buero_v1",
    checkpointPacketId: "de_l01_c04_s32",
    canonicalAdmission: false,
    inventoryResolutionApplied: false,
    task7Unlock: false,
    preauthoringAuthority: false,
    learnerFacing: false,
    releaseAuthorized: false,
    consumerCutover: "NONE",
  });
}
