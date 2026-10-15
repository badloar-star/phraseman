import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

export type GermanTask7V2L01C04GutenTagSourceHoldDeV1 = Readonly<{
  status: "HOLD";
  sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1";
  checkpointPacketId: "de_l01_c04_s32";
  canonicalAdmission: false;
  inventoryResolutionApplied: false;
  task7Unlock: false;
  preauthoringAuthority: false;
  learnerFacing: false;
  releaseAuthorized: false;
  consumerCutover: "NONE";
}>;

export type GermanTask7V2L01C04GutenTagInspectionOptionsDeV1 = Readonly<{
  evidenceRootForTest?: string;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const EVIDENCE_ROOT = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c04_guten_tag_source_hold_v1",
);
const TASK5_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
);
const INVENTORY_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
);
const TASK5_SHA256 =
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const EXTRACTION_MAP_SHA256 =
  "b72e8f7ef2e66170cdbba46f34fffe1efffcbe07bbcb93e410636b34bbac1db6";
const GOETHE_SHA256 =
  "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085";
const GOETHE_METADATA_SHA256 =
  "afa2a1f9de300071b9e885fb3ade745766b53d7f7bd5bee5732f188806db8f47";
const GOETHE_URL =
  "https://lernen.goethe.de/deutschonline/A1/PDF/DE/deutschonline_Redemittel_und_Grammatik_1-18.pdf";

function fail(code: string): never {
  throw new Error(code);
}
function sha256(bytes: Buffer | string): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
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
    fail(code);
  }
}
function bound(
  root: string,
  relative: string,
  digest: string,
  bytes: number,
): Buffer {
  const rawRoot = path.resolve(root, "raw");
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${rawRoot}${path.sep}`))
    fail("task7_guten_tag_raw_path");
  const value = fs.readFileSync(file);
  if (value.length !== bytes || sha256(value) !== digest)
    fail("task7_guten_tag_raw_drift");
  return value;
}

function validateTask5(): void {
  const bytes = fs.readFileSync(TASK5_PATH);
  if (sha256(bytes) !== TASK5_SHA256) fail("task7_guten_tag_task5_drift");
  const task5 = json(TASK5_PATH, "task7_guten_tag_task5_json");
  array(task5.lessons, "task7_guten_tag_plan");
  const lesson = task5.lessons.find((value) =>
    recordLike(value, "lessonId", "de_l01"),
  );
  record(lesson, "task7_guten_tag_plan");
  array(lesson.chapters, "task7_guten_tag_plan");
  const chapter = lesson.chapters.find((value) =>
    recordLike(value, "id", "de_l01_c04"),
  );
  record(chapter, "task7_guten_tag_plan");
  record(chapter.checkpoint, "task7_guten_tag_plan");
  if (chapter.checkpoint.packetId !== "de_l01_c04_s32")
    fail("task7_guten_tag_checkpoint");
  array(chapter.checkpoint.plannedNewLexicalSenses, "task7_guten_tag_plan");
  const matches = chapter.checkpoint.plannedNewLexicalSenses.filter((value) =>
    recordLike(value, "id", "de_lex_plan_l01_c04_guten_tag_v1"),
  );
  if (matches.length !== 1) fail("task7_guten_tag_plan");
  record(matches[0], "task7_guten_tag_plan");
  if (
    matches[0].semanticIdentity !== "guten tag|neutral formal greeting" ||
    matches[0].lemmaOrExpression !== "Guten Tag"
  )
    fail("task7_guten_tag_plan");
}

function recordLike(value: unknown, key: string, expected: string): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as JsonRecord)[key] === expected
  );
}

function validateInventory(): void {
  const inventory = json(INVENTORY_PATH, "task7_guten_tag_inventory");
  record(inventory.counts, "task7_guten_tag_inventory");
  if (
    inventory.counts.resolvedPlanIds !== 6 ||
    inventory.counts.unresolvedPlanIds !== 282 ||
    inventory.counts.materializedPackets !== 0
  )
    fail("task7_guten_tag_inventory");
  array(inventory.resolutions, "task7_guten_tag_inventory");
  if (
    inventory.resolutions.some((value) =>
      recordLike(value, "sourcePlanId", "de_lex_plan_l01_c04_guten_tag_v1"),
    )
  )
    fail("task7_guten_tag_inventory_resolution_forbidden");
}

function validateEvidence(root: string): void {
  const mapPath = path.join(root, "extraction_map.json");
  const mapBytes = fs.readFileSync(mapPath);
  if (sha256(mapBytes) !== EXTRACTION_MAP_SHA256)
    fail("task7_guten_tag_extraction_map");
  const map = json(mapPath, "task7_guten_tag_extraction_map");
  if (
    map.schemaVersion !==
    "learning-v2-de-task7-v2-l01-c04-guten-tag-source-extraction-map.v1"
  )
    fail("task7_guten_tag_extraction_map");
  record(map.rawSources, "task7_guten_tag_extraction_map");
  record(map.rawSources.goetheA1Redemittel, "task7_guten_tag_extraction_map");
  const source = map.rawSources.goetheA1Redemittel;
  if (
    source.requestedUrl !== GOETHE_URL ||
    source.canonicalUrl !== GOETHE_URL ||
    source.path !== "raw/goethe_a1_redemittel.pdf" ||
    source.sha256 !== GOETHE_SHA256 ||
    source.bytes !== 3685205 ||
    source.metadataPath !== "raw/goethe_a1_redemittel.http_metadata.txt" ||
    source.metadataSha256 !== GOETHE_METADATA_SHA256 ||
    source.metadataBytes !== 400 ||
    source.transport !== "DIRECT_PUBLIC_HTTPS"
  )
    fail("task7_guten_tag_extraction_map");
  bound(root, String(source.path), GOETHE_SHA256, 3685205);
  const metadata = bound(
    root,
    String(source.metadataPath),
    GOETHE_METADATA_SHA256,
    400,
  ).toString("utf8");
  if (
    !metadata.includes(`canonical-url: ${GOETHE_URL}`) ||
    !metadata.includes("http-status: 200") ||
    !metadata.includes("transport: DIRECT_PUBLIC_HTTPS")
  )
    fail("task7_guten_tag_http_metadata");
  record(map.extraction, "task7_guten_tag_extraction_map");
  const extraction = map.extraction;
  if (
    extraction.sourcePlanId !== "de_lex_plan_l01_c04_guten_tag_v1" ||
    extraction.checkpointPacketId !== "de_l01_c04_s32" ||
    extraction.pdfPage !== 3 ||
    extraction.heading !== "WIE SAGT MAN? > BEGRÜSSEN UND VERABSCHIEDEN" ||
    extraction.exactOccurrence !== "Guten Tag! / Hallo!" ||
    extraction.exactOccurrenceUtf8Bytes !== 19 ||
    extraction.exactOccurrenceSha256 !==
      "e545fb373a9a5e0e5fa664af788d68528275b6b527241f01f684b2f4e4f31949" ||
    extraction.evidenceFunction !==
      "EXACT_OCCURRENCE_IN_OFFICIAL_LEARNING_INVENTORY"
  )
    fail("task7_guten_tag_extraction");
  if (
    Buffer.byteLength(String(extraction.exactOccurrence), "utf8") !== 19 ||
    sha256(String(extraction.exactOccurrence)) !==
      extraction.exactOccurrenceSha256
  )
    fail("task7_guten_tag_extraction");
  record(map.unsupportedClaims, "task7_guten_tag_extraction_map");
  if (
    map.unsupportedClaims.registerClassification !==
      "UNSUPPORTED_BY_CAPTURED_SOURCE" ||
    map.unsupportedClaims.usageNaturalness !==
      "UNSUPPORTED_BY_CAPTURED_SOURCE" ||
    map.unsupportedClaims.exactLearnerPhrase !== "NOT_CLAIMED"
  )
    fail("task7_guten_tag_claim_boundary");
}

function validateManifest(root: string): void {
  const manifest = json(
    path.join(root, "manifest.json"),
    "task7_guten_tag_manifest",
  );
  if (
    manifest.schemaVersion !==
      "learning-v2-de-task7-v2-l01-c04-guten-tag-source-hold.v1" ||
    manifest.status !== "HOLD"
  )
    fail("task7_guten_tag_manifest");
  record(manifest.authority, "task7_guten_tag_manifest");
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
    fail("task7_guten_tag_hold_boundary");
  record(manifest.task5V2, "task7_guten_tag_manifest");
  const task5 = manifest.task5V2;
  if (
    task5.path !==
      "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json" ||
    task5.byteSha256 !== TASK5_SHA256 ||
    task5.sourcePlanId !== "de_lex_plan_l01_c04_guten_tag_v1" ||
    task5.checkpointPacketId !== "de_l01_c04_s32" ||
    task5.semanticIdentity !== "guten tag|neutral formal greeting" ||
    task5.lemmaOrExpression !== "Guten Tag"
  )
    fail("task7_guten_tag_plan_binding");
  record(manifest.sources, "task7_guten_tag_manifest");
  record(manifest.sources.extractionMap, "task7_guten_tag_manifest");
  if (
    manifest.sources.extractionMap.path !== "extraction_map.json" ||
    manifest.sources.extractionMap.sha256 !== EXTRACTION_MAP_SHA256 ||
    manifest.sources.extractionMap.bytes !== 1425
  )
    fail("task7_guten_tag_manifest");
  record(manifest.fieldSupport, "task7_guten_tag_manifest");
  record(manifest.fieldSupport.supportedClaims, "task7_guten_tag_manifest");
  record(manifest.fieldSupport.unsupportedClaims, "task7_guten_tag_manifest");
  if (
    manifest.fieldSupport.supportedClaims.exactOccurrence !==
      "Guten Tag! / Hallo!" ||
    manifest.fieldSupport.supportedClaims.evidenceFunction !==
      "EXACT_OCCURRENCE_IN_OFFICIAL_LEARNING_INVENTORY" ||
    manifest.fieldSupport.unsupportedClaims.registerClassification !==
      "UNSUPPORTED_BY_CAPTURED_SOURCE" ||
    manifest.fieldSupport.unsupportedClaims.usageNaturalness !==
      "UNSUPPORTED_BY_CAPTURED_SOURCE" ||
    manifest.fieldSupport.unsupportedClaims.exactLearnerPhrase !== "NOT_CLAIMED"
  )
    fail("task7_guten_tag_claim_boundary");
  record(manifest.allocation, "task7_guten_tag_manifest");
  const allocation = manifest.allocation;
  if (
    allocation.sourcePlanId !== "de_lex_plan_l01_c04_guten_tag_v1" ||
    allocation.checkpointPacketId !== "de_l01_c04_s32" ||
    allocation.sessionId !== "de_l01_s04" ||
    allocation.chapterId !== "de_l01_c04" ||
    allocation.decision !==
      "SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING"
  )
    fail("task7_guten_tag_allocation");
  array(allocation.supportedFields, "task7_guten_tag_allocation");
  if (
    allocation.supportedFields.length !== 2 ||
    allocation.supportedFields[0] !== "lemmaOrExpression" ||
    allocation.supportedFields[1] !== "exactOccurrence"
  )
    fail("task7_guten_tag_allocation");
}

export function inspectGermanTask7V2L01C04GutenTagSourceHoldDeV1(
  options: GermanTask7V2L01C04GutenTagInspectionOptionsDeV1 = {},
): GermanTask7V2L01C04GutenTagSourceHoldDeV1 {
  const root = path.resolve(options.evidenceRootForTest ?? EVIDENCE_ROOT);
  validateTask5();
  validateInventory();
  validateEvidence(root);
  validateManifest(root);
  return Object.freeze({
    status: "HOLD",
    sourcePlanId: "de_lex_plan_l01_c04_guten_tag_v1",
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
