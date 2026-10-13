import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hashCanonicalBody } from "../../policies/decision_registry";

type JsonRecord = Record<string, unknown>;

export type GermanTask7V2L01C03IchHeisseSourceHoldDeV1 = Readonly<{
  status: "HOLD";
  sourcePlanId: "de_lex_plan_l01_c03_ich_heisse_v1";
  checkpointPacketId: "de_l01_c03_s24";
  canonicalAdmission: false;
  inventoryResolutionApplied: false;
  task7Unlock: false;
  preauthoringAuthority: false;
  learnerFacing: false;
  releaseAuthorized: false;
  consumerCutover: "NONE";
  inventory: Readonly<{
    resolvedPlanIds: 6;
    unresolvedPlanIds: 282;
    materializedPackets: 0;
  }>;
}>;

export type GermanTask7V2L01C03IchHeisseInspectionOptionsDeV1 = Readonly<{
  evidenceRootForTest?: string;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const DEFAULT_EVIDENCE_ROOT = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_ich_heisse_source_hold_v1",
);
const TASK5_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
);
const INVENTORY_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
);
const TASK5_BYTE_SHA256 =
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const TASK5_CANONICAL_BODY_SHA256 =
  "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3";
const PLAN_CANONICAL_BODY_SHA256 =
  "a662ebaefd39513200017a67eab99380e84a5d5c45d4b0d37fb97a88585cc459";
const EXTRACTION_MAP_SHA256 =
  "8cb5f30fd298ddd1d5e058b0ff9a9984e0c79895e4a0fb9e339f4bc5e65b5b9c";
const EXTRACTION_MAP_BYTES = 2235;
const DWDS_URL = "https://www.dwds.de/wb/hei%C3%9Fen";
const DWDS_RAW_SHA256 =
  "ceb735ca72b691d06fd46f9521636bb650102ed14a19465ee71142f1a295fbf1";
const DWDS_METADATA_SHA256 =
  "df80b91b0e3944898a224e84b6ffe7cfd484a6c04e0e5c41407b4ad970c8ca9a";
const GOETHE_URL =
  "https://lernen.goethe.de/deutschonline/A1/PDF/DE/deutschonline_Redemittel_und_Grammatik_1-18.pdf";
const GOETHE_RAW_SHA256 =
  "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085";
const GOETHE_METADATA_SHA256 =
  "afa2a1f9de300071b9e885fb3ade745766b53d7f7bd5bee5732f188806db8f47";

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
function readJson(file: string, code: string): JsonRecord {
  try {
    const value: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    record(value, code);
    return value;
  } catch (error) {
    if (error instanceof Error && error.message === code) throw error;
    return fail(code);
  }
}
function exactKeys(value: JsonRecord, expected: string[], code: string): void {
  if (Object.keys(value).sort().join("\0") !== [...expected].sort().join("\0"))
    fail(code);
}
function forbidCanonicalOutput(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(forbidCanonicalOutput);
    return;
  }
  if (
    Object.hasOwn(value, "canonicalSenseId") ||
    Object.hasOwn(value, "packetOutputPath") ||
    Object.hasOwn(value, "releasePath")
  )
    fail("task7_ich_heisse_canonical_or_packet_output_forbidden");
  Object.values(value).forEach(forbidCanonicalOutput);
}
function readBoundFile(
  root: string,
  relativePath: string,
  expectedSha256: string,
  expectedBytes: number,
): Buffer {
  const rawRoot = path.resolve(root, "raw");
  const target = path.resolve(root, relativePath);
  if (!target.startsWith(`${rawRoot}${path.sep}`))
    fail("task7_ich_heisse_raw_path");
  const bytes = fs.readFileSync(target);
  if (bytes.length !== expectedBytes || sha256(bytes) !== expectedSha256)
    fail("task7_ich_heisse_raw_body");
  return bytes;
}
function outerDiv(html: string, marker: string, code: string): string {
  const start = html.indexOf(marker);
  if (start < 0) fail(code);
  const tags = /<\/?div\b[^>]*>/giu;
  tags.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tags.exec(html))) {
    depth += match[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, tags.lastIndex);
  }
  return fail(code);
}

function validateTask5(): void {
  const bytes = fs.readFileSync(TASK5_PATH);
  if (sha256(bytes) !== TASK5_BYTE_SHA256) fail("task7_ich_heisse_task5_byte");
  const task5 = readJson(TASK5_PATH, "task7_ich_heisse_task5_json");
  if (hashCanonicalBody(task5) !== TASK5_CANONICAL_BODY_SHA256)
    fail("task7_ich_heisse_task5_canonical");
  array(task5.lessons, "task7_ich_heisse_task5_plan");
  const lesson = task5.lessons.find(
    (x) =>
      x !== null &&
      typeof x === "object" &&
      !Array.isArray(x) &&
      (x as JsonRecord).lessonId === "de_l01",
  );
  record(lesson, "task7_ich_heisse_task5_plan");
  array(lesson.chapters, "task7_ich_heisse_task5_plan");
  const chapter = lesson.chapters.find(
    (x) =>
      x !== null &&
      typeof x === "object" &&
      !Array.isArray(x) &&
      (x as JsonRecord).id === "de_l01_c03",
  );
  record(chapter, "task7_ich_heisse_task5_plan");
  record(chapter.checkpoint, "task7_ich_heisse_task5_plan");
  if (chapter.checkpoint.packetId !== "de_l01_c03_s24")
    fail("task7_ich_heisse_task5_plan");
  array(
    chapter.checkpoint.plannedNewLexicalSenses,
    "task7_ich_heisse_task5_plan",
  );
  const matches = chapter.checkpoint.plannedNewLexicalSenses.filter(
    (x) =>
      x !== null &&
      typeof x === "object" &&
      !Array.isArray(x) &&
      (x as JsonRecord).id === "de_lex_plan_l01_c03_ich_heisse_v1",
  );
  if (
    matches.length !== 1 ||
    hashCanonicalBody(matches[0]) !== PLAN_CANONICAL_BODY_SHA256
  )
    fail("task7_ich_heisse_task5_plan");
}
function validateInventory(): void {
  const inventory = readJson(INVENTORY_PATH, "task7_ich_heisse_inventory_json");
  record(inventory.counts, "task7_ich_heisse_inventory_counts");
  if (
    inventory.counts.resolvedPlanIds !== 6 ||
    inventory.counts.unresolvedPlanIds !== 282 ||
    inventory.counts.materializedPackets !== 0
  )
    fail("task7_ich_heisse_inventory_counts");
  array(inventory.resolutions, "task7_ich_heisse_inventory_resolutions");
  if (
    inventory.resolutions.some(
      (x) =>
        x !== null &&
        typeof x === "object" &&
        !Array.isArray(x) &&
        (x as JsonRecord).sourcePlanId === "de_lex_plan_l01_c03_ich_heisse_v1",
    )
  )
    fail("task7_ich_heisse_inventory_already_resolved");
}
function validateEvidence(root: string): void {
  const mapPath = path.join(root, "extraction_map.json");
  const mapBytes = fs.readFileSync(mapPath);
  if (
    mapBytes.length !== EXTRACTION_MAP_BYTES ||
    sha256(mapBytes) !== EXTRACTION_MAP_SHA256
  )
    fail("task7_ich_heisse_extraction_map");
  const map = readJson(mapPath, "task7_ich_heisse_extraction_map");
  exactKeys(
    map,
    ["schemaVersion", "rawSources", "extractions", "unsupportedClaims"],
    "task7_ich_heisse_extraction_map",
  );
  if (
    map.schemaVersion !==
    "learning-v2-de-task7-v2-l01-c03-ich-heisse-source-extraction-map.v1"
  )
    fail("task7_ich_heisse_extraction_map");
  record(map.rawSources, "task7_ich_heisse_extraction_map");
  exactKeys(
    map.rawSources,
    ["dwds", "goetheA1Pdf"],
    "task7_ich_heisse_extraction_map",
  );
  record(map.rawSources.dwds, "task7_ich_heisse_extraction_map");
  const dwds = map.rawSources.dwds;
  if (
    dwds.requestedUrl !== DWDS_URL ||
    dwds.canonicalUrl !== DWDS_URL ||
    dwds.path !== "raw/dwds_heissen.html" ||
    dwds.sha256 !== DWDS_RAW_SHA256 ||
    dwds.bytes !== 113626 ||
    dwds.metadataPath !== "raw/dwds_heissen.http_metadata.txt" ||
    dwds.metadataSha256 !== DWDS_METADATA_SHA256 ||
    dwds.metadataBytes !== 284 ||
    dwds.transport !== "DIRECT_PUBLIC_HTTPS"
  )
    fail("task7_ich_heisse_extraction_map");
  record(map.rawSources.goetheA1Pdf, "task7_ich_heisse_extraction_map");
  const goethe = map.rawSources.goetheA1Pdf;
  if (
    goethe.requestedUrl !== GOETHE_URL ||
    goethe.path !== "raw/goethe_a1_redemittel.pdf" ||
    goethe.sha256 !== GOETHE_RAW_SHA256 ||
    goethe.bytes !== 3685205 ||
    goethe.metadataPath !== "raw/goethe_a1_redemittel.http_metadata.txt" ||
    goethe.metadataSha256 !== GOETHE_METADATA_SHA256 ||
    goethe.metadataBytes !== 400 ||
    goethe.transport !== "DIRECT_PUBLIC_HTTPS" ||
    goethe.extractionStatus !==
      "RAW_CAPTURED_TEXT_LOCATOR_NOT_REEXTRACTED_IN_THIS_PACKET"
  )
    fail("task7_ich_heisse_extraction_map");
  const html = readBoundFile(
    root,
    String(dwds.path),
    DWDS_RAW_SHA256,
    113626,
  ).toString("utf8");
  const metadata = readBoundFile(
    root,
    String(dwds.metadataPath),
    DWDS_METADATA_SHA256,
    284,
  ).toString("utf8");
  readBoundFile(root, String(goethe.path), GOETHE_RAW_SHA256, 3685205);
  readBoundFile(root, String(goethe.metadataPath), GOETHE_METADATA_SHA256, 400);
  if (
    !metadata.includes(`canonical-url: ${DWDS_URL}`) ||
    !metadata.includes("http-status: 200") ||
    !metadata.includes("transport: DIRECT_PUBLIC_HTTPS")
  )
    fail("task7_ich_heisse_http_identity");
  const title = html.match(/<title>([^<]+)<\/title>/u)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/u)?.[1];
  const headword = html.match(
    /<h1 class="dwdswb-ft-lemmaansatz"><b>([^<]+)<\/b><\/h1>/u,
  )?.[1];
  const grammar = outerDiv(
    html,
    '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
    "task7_ich_heisse_dwds_grammar",
  );
  const meaning = outerDiv(
    html,
    '<div class="dwdswb-lesart" id="d-1-1">',
    "task7_ich_heisse_dwds_meaning",
  );
  if (
    title !==
      "heißen – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS" ||
    canonical !== DWDS_URL ||
    headword !== "heißen" ||
    !grammar.includes("<span>Verb</span>") ||
    !grammar.includes('title="3. Person Singular Indikativ Präsens Aktiv"') ||
    !grammar.includes("<b>heißt</b>") ||
    !grammar.includes("<b>hat</b>") ||
    sha256(grammar) !==
      "9883543a35d7acb24b6a95079714f838942772047d936ec587c83f7adbe693ee" ||
    Buffer.byteLength(grammar, "utf8") !== 804 ||
    !meaning.includes("genannt werden, den Namen haben") ||
    sha256(meaning) !==
      "6fce9578d0445b2b3ce71baf95a415c7b0da3e95d6d369aa43a62108cb547033" ||
    Buffer.byteLength(meaning, "utf8") !== 2999
  )
    fail("task7_ich_heisse_dwds_extraction");
  record(map.unsupportedClaims, "task7_ich_heisse_extraction_map");
  if (
    map.unsupportedClaims.exactFirstPersonInflection !==
      "UNSUPPORTED_BY_CAPTURED_DWDS_ENTRY" ||
    map.unsupportedClaims.officialPedagogicalOccurrence !==
      "RAW_PDF_CAPTURED_TEXT_LOCATOR_NOT_REEXTRACTED_IN_THIS_PACKET" ||
    map.unsupportedClaims.canonicalAdmission !== "OUT_OF_SCOPE" ||
    map.unsupportedClaims.phraseAuthority !== "OUT_OF_SCOPE"
  )
    fail("task7_ich_heisse_unsupported_claim_boundary");
}
function validateManifest(root: string): void {
  const manifest = readJson(
    path.join(root, "manifest.json"),
    "task7_ich_heisse_manifest_json",
  );
  forbidCanonicalOutput(manifest);
  exactKeys(
    manifest,
    [
      "schemaVersion",
      "status",
      "authority",
      "task5V2",
      "sources",
      "fieldSupport",
      "allocations",
    ],
    "task7_ich_heisse_manifest",
  );
  if (
    manifest.schemaVersion !==
      "learning-v2-de-task7-v2-l01-c03-ich-heisse-source-hold.v1" ||
    manifest.status !== "HOLD"
  )
    fail("task7_ich_heisse_manifest");
  record(manifest.authority, "task7_ich_heisse_manifest");
  if (
    manifest.authority.scope !== "SOURCE_BOUND_HOLD_ALLOCATION_ONLY" ||
    manifest.authority.decision !==
      "SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING" ||
    manifest.authority.canonicalAdmission !== false ||
    manifest.authority.inventoryResolutionApplied !== false ||
    manifest.authority.task7Unlock !== false ||
    manifest.authority.preauthoringAuthority !== false ||
    manifest.authority.learnerFacing !== false ||
    manifest.authority.releaseAuthorized !== false ||
    manifest.authority.consumerCutover !== "NONE"
  )
    fail("task7_ich_heisse_hold_boundary");
  record(manifest.task5V2, "task7_ich_heisse_manifest");
  if (
    manifest.task5V2.byteSha256 !== TASK5_BYTE_SHA256 ||
    manifest.task5V2.canonicalBodySha256 !== TASK5_CANONICAL_BODY_SHA256 ||
    manifest.task5V2.sourcePlanId !== "de_lex_plan_l01_c03_ich_heisse_v1" ||
    manifest.task5V2.checkpointPacketId !== "de_l01_c03_s24" ||
    manifest.task5V2.planCanonicalBodySha256 !== PLAN_CANONICAL_BODY_SHA256
  )
    fail("task7_ich_heisse_plan_binding");
  record(manifest.sources, "task7_ich_heisse_manifest");
  record(manifest.sources.extractionMap, "task7_ich_heisse_manifest");
  if (
    manifest.sources.extractionMap.path !== "extraction_map.json" ||
    manifest.sources.extractionMap.sha256 !== EXTRACTION_MAP_SHA256 ||
    manifest.sources.extractionMap.bytes !== EXTRACTION_MAP_BYTES
  )
    fail("task7_ich_heisse_manifest");
  record(manifest.fieldSupport, "task7_ich_heisse_manifest");
  record(manifest.fieldSupport.supportedClaims, "task7_ich_heisse_manifest");
  record(manifest.fieldSupport.unsupportedClaims, "task7_ich_heisse_manifest");
  if (
    manifest.fieldSupport.supportedClaims.sourceHeadword !== "heißen" ||
    manifest.fieldSupport.supportedClaims.sourcePartOfSpeech !== "Verb" ||
    manifest.fieldSupport.supportedClaims.nameMeaning !==
      "DWDS_D_1_1_GENANNT_WERDEN_DEN_NAMEN_HABEN" ||
    manifest.fieldSupport.supportedClaims.thirdPersonPresent !== "heißt" ||
    manifest.fieldSupport.unsupportedClaims.exactFirstPersonInflection !==
      "UNSUPPORTED_BY_CAPTURED_DWDS_ENTRY" ||
    manifest.fieldSupport.unsupportedClaims.officialPedagogicalOccurrence !==
      "RAW_PDF_CAPTURED_TEXT_LOCATOR_NOT_REEXTRACTED_IN_THIS_PACKET"
  )
    fail("task7_ich_heisse_field_support");
  array(manifest.allocations, "task7_ich_heisse_allocation");
  if (manifest.allocations.length !== 1) fail("task7_ich_heisse_allocation");
  record(manifest.allocations[0], "task7_ich_heisse_allocation");
  const allocation = manifest.allocations[0];
  if (
    allocation.sourcePlanId !== "de_lex_plan_l01_c03_ich_heisse_v1" ||
    allocation.checkpointPacketId !== "de_l01_c03_s24" ||
    allocation.sessionId !== "de_l01_s03" ||
    allocation.chapterId !== "de_l01_c03" ||
    allocation.decision !==
      "SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING"
  )
    fail("task7_ich_heisse_allocation");
  array(allocation.supportedFields, "task7_ich_heisse_allocation");
  if (
    allocation.supportedFields.join("\0") !==
    [
      "lemmaOrExpression",
      "sourceHeadword",
      "sourcePartOfSpeech",
      "nameMeaning",
      "grammarAnchor",
    ].join("\0")
  )
    fail("task7_ich_heisse_allocation");
}

export function inspectGermanTask7V2L01C03IchHeisseSourceHoldDeV1(
  options: GermanTask7V2L01C03IchHeisseInspectionOptionsDeV1 = {},
): GermanTask7V2L01C03IchHeisseSourceHoldDeV1 {
  const root = path.resolve(
    options.evidenceRootForTest ?? DEFAULT_EVIDENCE_ROOT,
  );
  validateTask5();
  validateInventory();
  validateEvidence(root);
  validateManifest(root);
  return Object.freeze({
    status: "HOLD",
    sourcePlanId: "de_lex_plan_l01_c03_ich_heisse_v1",
    checkpointPacketId: "de_l01_c03_s24",
    canonicalAdmission: false,
    inventoryResolutionApplied: false,
    task7Unlock: false,
    preauthoringAuthority: false,
    learnerFacing: false,
    releaseAuthorized: false,
    consumerCutover: "NONE",
    inventory: Object.freeze({
      resolvedPlanIds: 6,
      unresolvedPlanIds: 282,
      materializedPackets: 0,
    }),
  });
}
