import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hashCanonicalBody } from "../../policies/decision_registry";

type JsonRecord = Record<string, unknown>;

export type GermanTask7V2L01C03BriefkastenSourceHoldDeV1 = Readonly<{
  status: "HOLD";
  sourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1";
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

export type GermanTask7V2L01C03BriefkastenInspectionOptionsDeV1 = Readonly<{
  evidenceRootForTest?: string;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const EVIDENCE_ROOT = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c03_briefkasten_source_hold_v1",
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
  "9b11ed881e7bc2278fd1a03c746e81eb934c57c545a4fda7f3dbb14238c62cb9";
const MAP_SHA256 =
  "f97ccbd4f4e95f0361f7fb607cae2f60c2cb4bdac18b89ec9fe34d3568e3cc89";
const MAP_BYTES = 1319;
const DWDS_URL = "https://www.dwds.de/wb/Briefkasten";
const DWDS_SHA256 =
  "d6e63ca2942fb05841e2a89cd30a3c335228dc4d6ba296e4d010e9515bd18342";
const DWDS_METADATA_SHA256 =
  "b9314f5e8b3f0b8c884b617ef967b531f06d80fdd8b83c07f89cb172706dfb50";

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
function forbidOutputAuthority(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(forbidOutputAuthority);
    return;
  }
  if (
    Object.hasOwn(value, "canonicalSenseId") ||
    Object.hasOwn(value, "packetOutputPath") ||
    Object.hasOwn(value, "releasePath")
  )
    fail("task7_briefkasten_output_authority_forbidden");
  Object.values(value).forEach(forbidOutputAuthority);
}
function readBoundRaw(
  root: string,
  relativePath: string,
  expectedSha256: string,
  expectedBytes: number,
): Buffer {
  const rawRoot = path.resolve(root, "raw");
  const target = path.resolve(root, relativePath);
  if (!target.startsWith(`${rawRoot}${path.sep}`))
    fail("task7_briefkasten_raw_path");
  const bytes = fs.readFileSync(target);
  if (bytes.length !== expectedBytes || sha256(bytes) !== expectedSha256)
    fail("task7_briefkasten_raw_body");
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
  if (sha256(bytes) !== TASK5_BYTE_SHA256) fail("task7_briefkasten_task5_byte");
  const task5 = readJson(TASK5_PATH, "task7_briefkasten_task5_json");
  if (hashCanonicalBody(task5) !== TASK5_CANONICAL_BODY_SHA256)
    fail("task7_briefkasten_task5_canonical");
  array(task5.lessons, "task7_briefkasten_task5_plan");
  const lesson = task5.lessons.find(
    (value) =>
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as JsonRecord).lessonId === "de_l01",
  );
  record(lesson, "task7_briefkasten_task5_plan");
  array(lesson.chapters, "task7_briefkasten_task5_plan");
  const chapter = lesson.chapters.find(
    (value) =>
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as JsonRecord).id === "de_l01_c03",
  );
  record(chapter, "task7_briefkasten_task5_plan");
  record(chapter.checkpoint, "task7_briefkasten_task5_plan");
  if (chapter.checkpoint.packetId !== "de_l01_c03_s24")
    fail("task7_briefkasten_task5_plan");
  array(
    chapter.checkpoint.plannedNewLexicalSenses,
    "task7_briefkasten_task5_plan",
  );
  const found = chapter.checkpoint.plannedNewLexicalSenses.filter(
    (value) =>
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as JsonRecord).id === "de_lex_plan_l01_c03_briefkasten_v1",
  );
  if (
    found.length !== 1 ||
    hashCanonicalBody(found[0]) !== PLAN_CANONICAL_BODY_SHA256
  )
    fail("task7_briefkasten_task5_plan");
}
function validateInventory(): void {
  const inventory = readJson(
    INVENTORY_PATH,
    "task7_briefkasten_inventory_json",
  );
  record(inventory.counts, "task7_briefkasten_inventory_counts");
  if (
    inventory.counts.resolvedPlanIds !== 6 ||
    inventory.counts.unresolvedPlanIds !== 282 ||
    inventory.counts.materializedPackets !== 0
  )
    fail("task7_briefkasten_inventory_counts");
  array(inventory.resolutions, "task7_briefkasten_inventory_resolutions");
  if (
    inventory.resolutions.some(
      (value) =>
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        (value as JsonRecord).sourcePlanId ===
          "de_lex_plan_l01_c03_briefkasten_v1",
    )
  )
    fail("task7_briefkasten_inventory_already_resolved");
}
function validateEvidence(root: string): void {
  const mapPath = path.join(root, "extraction_map.json");
  const mapBytes = fs.readFileSync(mapPath);
  if (mapBytes.length !== MAP_BYTES || sha256(mapBytes) !== MAP_SHA256)
    fail("task7_briefkasten_extraction_map");
  const map = readJson(mapPath, "task7_briefkasten_extraction_map");
  exactKeys(
    map,
    ["schemaVersion", "rawSources", "extractions", "unsupportedClaims"],
    "task7_briefkasten_extraction_map",
  );
  if (
    map.schemaVersion !==
    "learning-v2-de-task7-v2-l01-c03-briefkasten-source-extraction-map.v1"
  )
    fail("task7_briefkasten_extraction_map");
  record(map.rawSources, "task7_briefkasten_extraction_map");
  exactKeys(map.rawSources, ["dwds"], "task7_briefkasten_extraction_map");
  record(map.rawSources.dwds, "task7_briefkasten_extraction_map");
  const source = map.rawSources.dwds;
  if (
    source.requestedUrl !== DWDS_URL ||
    source.canonicalUrl !== DWDS_URL ||
    source.path !== "raw/dwds_briefkasten.html" ||
    source.sha256 !== DWDS_SHA256 ||
    source.bytes !== 61841 ||
    source.metadataPath !== "raw/dwds_briefkasten.http_metadata.txt" ||
    source.metadataSha256 !== DWDS_METADATA_SHA256 ||
    source.metadataBytes !== 283 ||
    source.transport !== "DIRECT_PUBLIC_HTTPS"
  )
    fail("task7_briefkasten_extraction_map");
  const html = readBoundRaw(
    root,
    String(source.path),
    DWDS_SHA256,
    61841,
  ).toString("utf8");
  const metadata = readBoundRaw(
    root,
    String(source.metadataPath),
    DWDS_METADATA_SHA256,
    283,
  ).toString("utf8");
  if (
    !metadata.includes(`canonical-url: ${DWDS_URL}`) ||
    !metadata.includes("http-status: 200") ||
    !metadata.includes("transport: DIRECT_PUBLIC_HTTPS")
  )
    fail("task7_briefkasten_http_identity");
  const title = html.match(/<title>([^<]+)<\/title>/u)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/u)?.[1];
  const lemma = html.match(
    /<h1 class="dwdswb-ft-lemmaansatz"><b>([^<]+)<\/b>, der<\/h1>/u,
  )?.[1];
  const grammar = outerDiv(
    html,
    '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
    "task7_briefkasten_grammar",
  );
  const sense = outerDiv(
    html,
    '<div class="dwdswb-lesart" id="d-1-2">',
    "task7_briefkasten_sense",
  );
  if (
    title !==
      "Briefkasten – Schreibung, Definition, Bedeutung, Synonyme, Beispiele | DWDS" ||
    canonical !== DWDS_URL ||
    lemma !== "Briefkasten" ||
    !grammar.includes("Substantiv (Maskulinum)") ||
    !grammar.includes("<b>Briefkästen</b>") ||
    sha256(grammar) !==
      "bfd3bace6b9ddc7aadce157cf9075458b62d9d2e98a541a2afcd5c05fc9093a8" ||
    Buffer.byteLength(grammar, "utf8") !== 376 ||
    !sense.includes("Kasten, der an der Haustür angebracht ist") ||
    sha256(sense) !==
      "7d000ed49d7191bee9ececbdb19364ed04a6324980f95d307342acc11b800ac5" ||
    Buffer.byteLength(sense, "utf8") !== 638
  )
    fail("task7_briefkasten_dwds_extraction");
  record(map.extractions, "task7_briefkasten_extraction_map");
  if (
    map.extractions.sourceHeadword !== "Briefkasten" ||
    map.extractions.sourcePartOfSpeech !== "Substantiv (Maskulinum)" ||
    map.extractions.article !== "der" ||
    map.extractions.singular !== "Briefkasten" ||
    map.extractions.nominativePlural !== "Briefkästen" ||
    map.extractions.senseAnchor !== "d-1-2" ||
    map.extractions.sourceCoreGerman !==
      "Kasten, der an der Haustür angebracht ist und in den von der Post die Sendungen für die einzelnen Empfänger eingeworfen werden"
  )
    fail("task7_briefkasten_extraction_map");
  record(map.unsupportedClaims, "task7_briefkasten_extraction_map");
  if (
    map.unsupportedClaims.canonicalAdmission !== "OUT_OF_SCOPE" ||
    map.unsupportedClaims.inventoryResolution !== "OUT_OF_SCOPE" ||
    map.unsupportedClaims.learnerPhraseAuthority !== "OUT_OF_SCOPE" ||
    map.unsupportedClaims.broaderMorphology !==
      "NOT_CLAIMED_BEYOND_CAPTURED_ARTICLE_SINGULAR_NOMINATIVE_PLURAL" ||
    map.unsupportedClaims.register !== "NOT_CLAIMED_BY_THIS_PACKET"
  )
    fail("task7_briefkasten_unsupported_claim_boundary");
}
function validateManifest(root: string): void {
  const manifest = readJson(
    path.join(root, "manifest.json"),
    "task7_briefkasten_manifest_json",
  );
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
      "allocations",
    ],
    "task7_briefkasten_manifest",
  );
  if (
    manifest.schemaVersion !==
      "learning-v2-de-task7-v2-l01-c03-briefkasten-source-hold.v1" ||
    manifest.status !== "HOLD"
  )
    fail("task7_briefkasten_manifest");
  record(manifest.authority, "task7_briefkasten_manifest");
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
    fail("task7_briefkasten_hold_boundary");
  record(manifest.task5V2, "task7_briefkasten_manifest");
  if (
    manifest.task5V2.byteSha256 !== TASK5_BYTE_SHA256 ||
    manifest.task5V2.canonicalBodySha256 !== TASK5_CANONICAL_BODY_SHA256 ||
    manifest.task5V2.sourcePlanId !== "de_lex_plan_l01_c03_briefkasten_v1" ||
    manifest.task5V2.checkpointPacketId !== "de_l01_c03_s24" ||
    manifest.task5V2.planCanonicalBodySha256 !== PLAN_CANONICAL_BODY_SHA256
  )
    fail("task7_briefkasten_plan_binding");
  record(manifest.sources, "task7_briefkasten_manifest");
  record(manifest.sources.extractionMap, "task7_briefkasten_manifest");
  if (
    manifest.sources.extractionMap.path !== "extraction_map.json" ||
    manifest.sources.extractionMap.sha256 !== MAP_SHA256 ||
    manifest.sources.extractionMap.bytes !== MAP_BYTES
  )
    fail("task7_briefkasten_manifest");
  record(manifest.fieldSupport, "task7_briefkasten_manifest");
  record(manifest.fieldSupport.supportedClaims, "task7_briefkasten_manifest");
  record(manifest.fieldSupport.unsupportedClaims, "task7_briefkasten_manifest");
  if (
    manifest.fieldSupport.supportedClaims.sourceHeadword !== "Briefkasten" ||
    manifest.fieldSupport.supportedClaims.sourcePartOfSpeech !==
      "Substantiv (Maskulinum)" ||
    manifest.fieldSupport.supportedClaims.article !== "der" ||
    manifest.fieldSupport.supportedClaims.nominativePlural !== "Briefkästen" ||
    manifest.fieldSupport.supportedClaims.residenceMailboxSense !==
      "DWDS_D_1_2_HAUSTUER_POST_SENDUNGEN" ||
    manifest.fieldSupport.unsupportedClaims.broaderMorphology !==
      "NOT_CLAIMED_BEYOND_CAPTURED_ARTICLE_SINGULAR_NOMINATIVE_PLURAL" ||
    manifest.fieldSupport.unsupportedClaims.register !==
      "NOT_CLAIMED_BY_THIS_PACKET"
  )
    fail("task7_briefkasten_field_support");
  array(manifest.allocations, "task7_briefkasten_allocation");
  if (manifest.allocations.length !== 1) fail("task7_briefkasten_allocation");
  record(manifest.allocations[0], "task7_briefkasten_allocation");
  const allocation = manifest.allocations[0];
  if (
    allocation.sourcePlanId !== "de_lex_plan_l01_c03_briefkasten_v1" ||
    allocation.checkpointPacketId !== "de_l01_c03_s24" ||
    allocation.sessionId !== "de_l01_s03" ||
    allocation.chapterId !== "de_l01_c03" ||
    allocation.decision !==
      "SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING"
  )
    fail("task7_briefkasten_allocation");
  array(allocation.supportedFields, "task7_briefkasten_allocation");
  if (
    allocation.supportedFields.join("\0") !==
    [
      "lemmaOrExpression",
      "sourcePartOfSpeech",
      "article",
      "singular",
      "nominativePlural",
      "residenceMailboxSense",
    ].join("\0")
  )
    fail("task7_briefkasten_allocation");
}

export function inspectGermanTask7V2L01C03BriefkastenSourceHoldDeV1(
  options: GermanTask7V2L01C03BriefkastenInspectionOptionsDeV1 = {},
): GermanTask7V2L01C03BriefkastenSourceHoldDeV1 {
  const root = path.resolve(options.evidenceRootForTest ?? EVIDENCE_ROOT);
  validateTask5();
  validateInventory();
  validateEvidence(root);
  validateManifest(root);
  return Object.freeze({
    status: "HOLD",
    sourcePlanId: "de_lex_plan_l01_c03_briefkasten_v1",
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
