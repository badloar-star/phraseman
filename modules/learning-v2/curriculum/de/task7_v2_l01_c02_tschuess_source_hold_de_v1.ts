import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hashCanonicalBody } from "../../policies/decision_registry";

type JsonRecord = Record<string, unknown>;

export type GermanTask7V2L01C02TschuessSourceHoldDeV1 = Readonly<{
  status: "HOLD";
  sourcePlanId: "de_lex_plan_l01_c02_tschuess_v1";
  checkpointPacketId: "de_l01_c02_s16";
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

export type GermanTask7V2L01C02TschuessInspectionOptionsDeV1 = Readonly<{
  evidenceRootForTest?: string;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const DEFAULT_EVIDENCE_ROOT = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c02_tschuess_source_hold_v1",
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
  "ed66798b8c329e82e75177f883db1159e6d0e21eb805b0ca09af25a8db208f9b";
const EXTRACTION_MAP_SHA256 =
  "072ae39ffa27ca489d4152bac243dd2ee50de90765d3089dd8f87b7d48d6d0fe";
const EXTRACTION_MAP_BYTES = 2_206;
const DWDS_URL = "https://www.dwds.de/wb/tsch%C3%BCss";
const DWDS_CANONICAL_URL = "https://www.dwds.de/wb/Tsch%C3%BCss";
const DWDS_RAW_SHA256 =
  "78c9f5c885d69b0719a5910e207c5f73113ef4ea7cbf45c57a794ef55df15650";
const DWDS_METADATA_SHA256 =
  "19753582d54465ce04d3cc14c602f9e75adfe5ea7816ef947a5781535c2d09ef";
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
    fail(code);
  }
}

function forbidCanonicalOutput(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const nested of value) forbidCanonicalOutput(nested);
    return;
  }
  if (
    Object.hasOwn(value, "canonicalSenseId") ||
    Object.hasOwn(value, "packetOutputPath") ||
    Object.hasOwn(value, "releasePath")
  ) {
    fail("task7_tschuess_canonical_or_packet_output_forbidden");
  }
  for (const nested of Object.values(value)) forbidCanonicalOutput(nested);
}

function readBoundFile(
  evidenceRoot: string,
  relativePath: string,
  expectedSha256: string,
  expectedBytes: number,
): Buffer {
  const rawRoot = path.resolve(evidenceRoot, "raw");
  const target = path.resolve(evidenceRoot, relativePath);
  if (!target.startsWith(`${rawRoot}${path.sep}`))
    fail("task7_tschuess_raw_path");
  const bytes = fs.readFileSync(target);
  if (bytes.length !== expectedBytes || sha256(bytes) !== expectedSha256) {
    fail("task7_tschuess_raw_body");
  }
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
  fail(code);
}

function validateTask5(): void {
  const bytes = fs.readFileSync(TASK5_PATH);
  if (sha256(bytes) !== TASK5_BYTE_SHA256) fail("task7_tschuess_task5_byte");
  const task5 = readJson(TASK5_PATH, "task7_tschuess_task5_json");
  if (hashCanonicalBody(task5) !== TASK5_CANONICAL_BODY_SHA256) {
    fail("task7_tschuess_task5_canonical");
  }
  array(task5.lessons, "task7_tschuess_task5_plan");
  const lesson = task5.lessons.find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as JsonRecord).lessonId === "de_l01",
  );
  record(lesson, "task7_tschuess_task5_plan");
  array(lesson.chapters, "task7_tschuess_task5_plan");
  const chapter = lesson.chapters.find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as JsonRecord).id === "de_l01_c02",
  );
  record(chapter, "task7_tschuess_task5_plan");
  record(chapter.checkpoint, "task7_tschuess_task5_plan");
  if (chapter.checkpoint.packetId !== "de_l01_c02_s16") {
    fail("task7_tschuess_task5_plan");
  }
  array(
    chapter.checkpoint.plannedNewLexicalSenses,
    "task7_tschuess_task5_plan",
  );
  const matches = chapter.checkpoint.plannedNewLexicalSenses.filter(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as JsonRecord).id === "de_lex_plan_l01_c02_tschuess_v1",
  );
  if (
    matches.length !== 1 ||
    hashCanonicalBody(matches[0]) !== PLAN_CANONICAL_BODY_SHA256
  ) {
    fail("task7_tschuess_task5_plan");
  }
}

function validateInventory(): void {
  const inventory = readJson(INVENTORY_PATH, "task7_tschuess_inventory_json");
  record(inventory.counts, "task7_tschuess_inventory_counts");
  if (
    inventory.counts.resolvedPlanIds !== 6 ||
    inventory.counts.unresolvedPlanIds !== 282 ||
    inventory.counts.materializedPackets !== 0
  ) {
    fail("task7_tschuess_inventory_counts");
  }
  array(inventory.resolutions, "task7_tschuess_inventory_resolutions");
  if (
    inventory.resolutions.some(
      (candidate) =>
        candidate !== null &&
        typeof candidate === "object" &&
        !Array.isArray(candidate) &&
        (candidate as JsonRecord).sourcePlanId ===
          "de_lex_plan_l01_c02_tschuess_v1",
    )
  ) {
    fail("task7_tschuess_inventory_already_resolved");
  }
}

function validateEvidence(evidenceRoot: string): void {
  const extractionMapPath = path.join(evidenceRoot, "extraction_map.json");
  const extractionMapBytes = fs.readFileSync(extractionMapPath);
  if (
    extractionMapBytes.length !== EXTRACTION_MAP_BYTES ||
    sha256(extractionMapBytes) !== EXTRACTION_MAP_SHA256
  ) {
    fail("task7_tschuess_extraction_map");
  }
  const extractionMap = readJson(
    extractionMapPath,
    "task7_tschuess_extraction_map",
  );
  if (
    extractionMap.schemaVersion !==
    "learning-v2-de-task7-v2-l01-c02-tschuess-source-extraction-map.v1"
  ) {
    fail("task7_tschuess_extraction_map");
  }
  record(extractionMap.rawSources, "task7_tschuess_extraction_map");
  record(extractionMap.rawSources.dwds, "task7_tschuess_extraction_map");
  const dwds = extractionMap.rawSources.dwds;
  if (
    dwds.requestedUrl !== DWDS_URL ||
    dwds.canonicalUrl !== DWDS_CANONICAL_URL ||
    dwds.path !== "raw/dwds_tschuess.html" ||
    dwds.sha256 !== DWDS_RAW_SHA256 ||
    dwds.bytes !== 61_803 ||
    dwds.metadataPath !== "raw/dwds_tschuess.http_metadata.txt" ||
    dwds.metadataSha256 !== DWDS_METADATA_SHA256 ||
    dwds.metadataBytes !== 285 ||
    dwds.transport !== "DIRECT_PUBLIC_HTTPS"
  ) {
    fail("task7_tschuess_extraction_map");
  }
  record(extractionMap.rawSources.goetheA1Pdf, "task7_tschuess_extraction_map");
  const goethe = extractionMap.rawSources.goetheA1Pdf;
  if (
    goethe.path !== "raw/goethe_a1_redemittel.pdf" ||
    goethe.sha256 !== GOETHE_RAW_SHA256 ||
    goethe.bytes !== 3_685_205 ||
    goethe.metadataPath !== "raw/goethe_a1_redemittel.http_metadata.txt" ||
    goethe.metadataSha256 !== GOETHE_METADATA_SHA256 ||
    goethe.metadataBytes !== 400 ||
    goethe.transport !== "DIRECT_PUBLIC_HTTPS" ||
    goethe.extractionStatus !== "NOT_CLAIMED_NO_TEXT_LOCATOR_IN_THIS_PACKET"
  ) {
    fail("task7_tschuess_extraction_map");
  }

  const html = readBoundFile(
    evidenceRoot,
    String(dwds.path),
    DWDS_RAW_SHA256,
    61_803,
  ).toString("utf8");
  readBoundFile(
    evidenceRoot,
    String(goethe.path),
    GOETHE_RAW_SHA256,
    3_685_205,
  );
  const dwdsMetadata = readBoundFile(
    evidenceRoot,
    String(dwds.metadataPath),
    DWDS_METADATA_SHA256,
    285,
  ).toString("utf8");
  readBoundFile(
    evidenceRoot,
    String(goethe.metadataPath),
    GOETHE_METADATA_SHA256,
    400,
  );
  if (
    !dwdsMetadata.includes(`canonical-url: ${DWDS_URL}`) ||
    !dwdsMetadata.includes("http-status: 200") ||
    !dwdsMetadata.includes("transport: DIRECT_PUBLIC_HTTPS")
  ) {
    fail("task7_tschuess_http_identity");
  }
  const title = html.match(/<title>([^<]+)<\/title>/u)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/u)?.[1];
  const headword = html.match(
    /<h1 class="dwdswb-ft-lemmaansatz"><b>([^<]+)<\/b><\/h1>/u,
  )?.[1];
  const grammar = outerDiv(
    html,
    '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Formen / Grammatik</span>',
    "task7_tschuess_dwds_grammar",
  );
  const leaveTaking = outerDiv(
    html,
    '<div class="dwdswb-lesart" id="d-1-1">',
    "task7_tschuess_dwds_leave_taking",
  );
  if (
    title !==
      "Tschüss – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS" ||
    canonical !== DWDS_CANONICAL_URL ||
    headword !== "Tschüss" ||
    !grammar.includes("<span>Interjektion</span>") ||
    sha256(grammar) !==
      "3bd62a0d30a74147f14e72ff23aa04ee226863a9fd3c5f448e06a1ad71b5ff6e" ||
    Buffer.byteLength(grammar, "utf8") !== 193 ||
    !leaveTaking.includes("umgangssprachlich") ||
    !leaveTaking.includes("lebe wohl!") ||
    !leaveTaking.includes("auf Wiedersehen!") ||
    sha256(leaveTaking) !==
      "886e8ae8b66e7c5449993fcb55e89bce5892caed030927ea758ef5170fece164" ||
    Buffer.byteLength(leaveTaking, "utf8") !== 593
  ) {
    fail("task7_tschuess_dwds_extraction");
  }

  record(extractionMap.unsupportedClaims, "task7_tschuess_extraction_map");
  if (
    extractionMap.unsupportedClaims.neutralRegister !==
      "UNSUPPORTED_BY_CAPTURED_SOURCES" ||
    extractionMap.unsupportedClaims.officialPedagogicalOccurrence !==
      "NOT_EXTRACTED_NO_TEXT_LOCATOR_IN_THIS_PACKET"
  ) {
    fail("task7_tschuess_unsupported_claim_boundary");
  }
}

function validateManifest(evidenceRoot: string): void {
  const manifest = readJson(
    path.join(evidenceRoot, "manifest.json"),
    "task7_tschuess_manifest_json",
  );
  forbidCanonicalOutput(manifest);
  if (
    manifest.schemaVersion !==
      "learning-v2-de-task7-v2-l01-c02-tschuess-source-hold.v1" ||
    manifest.status !== "HOLD"
  ) {
    fail("task7_tschuess_manifest");
  }
  record(manifest.authority, "task7_tschuess_manifest");
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
  ) {
    fail("task7_tschuess_hold_boundary");
  }
  record(manifest.task5V2, "task7_tschuess_manifest");
  if (
    manifest.task5V2.byteSha256 !== TASK5_BYTE_SHA256 ||
    manifest.task5V2.canonicalBodySha256 !== TASK5_CANONICAL_BODY_SHA256 ||
    manifest.task5V2.sourcePlanId !== "de_lex_plan_l01_c02_tschuess_v1" ||
    manifest.task5V2.checkpointPacketId !== "de_l01_c02_s16" ||
    manifest.task5V2.planCanonicalBodySha256 !== PLAN_CANONICAL_BODY_SHA256
  ) {
    fail("task7_tschuess_plan_binding");
  }
  record(manifest.sources, "task7_tschuess_manifest");
  record(manifest.sources.extractionMap, "task7_tschuess_manifest");
  if (
    manifest.sources.extractionMap.path !== "extraction_map.json" ||
    manifest.sources.extractionMap.sha256 !== EXTRACTION_MAP_SHA256 ||
    manifest.sources.extractionMap.bytes !== EXTRACTION_MAP_BYTES
  ) {
    fail("task7_tschuess_manifest");
  }
  record(manifest.fieldSupport, "task7_tschuess_manifest");
  record(manifest.fieldSupport.supportedClaims, "task7_tschuess_manifest");
  record(manifest.fieldSupport.unsupportedClaims, "task7_tschuess_manifest");
  if (
    manifest.fieldSupport.supportedClaims.sourceHeadword !== "Tschüss" ||
    manifest.fieldSupport.supportedClaims.sourcePartOfSpeech !==
      "Interjektion" ||
    manifest.fieldSupport.supportedClaims.informalLeaveTaking !==
      "DWDS_MARKED_UMGANGSSPRACHLICH_WITH_LEBE_WOHL_AUF_WIEDERSEHEN" ||
    manifest.fieldSupport.unsupportedClaims.neutralRegister !==
      "UNSUPPORTED_BY_CAPTURED_SOURCES" ||
    manifest.fieldSupport.unsupportedClaims.officialPedagogicalOccurrence !==
      "NOT_EXTRACTED_NO_TEXT_LOCATOR_IN_THIS_PACKET"
  ) {
    fail("task7_tschuess_field_support");
  }
  array(manifest.allocations, "task7_tschuess_allocation");
  if (manifest.allocations.length !== 1) fail("task7_tschuess_allocation");
  record(manifest.allocations[0], "task7_tschuess_allocation");
  const allocation = manifest.allocations[0];
  if (
    allocation.sourcePlanId !== "de_lex_plan_l01_c02_tschuess_v1" ||
    allocation.checkpointPacketId !== "de_l01_c02_s16" ||
    allocation.sessionId !== "de_l01_s02" ||
    allocation.chapterId !== "de_l01_c02" ||
    allocation.decision !==
      "SOURCE_EVIDENCE_CAPTURED_CANONICAL_ADMISSION_PENDING"
  ) {
    fail("task7_tschuess_allocation");
  }
  array(allocation.supportedFields, "task7_tschuess_allocation");
  if (
    allocation.supportedFields.length !== 3 ||
    allocation.supportedFields[0] !== "lemmaOrExpression" ||
    allocation.supportedFields[1] !== "sourcePartOfSpeech" ||
    allocation.supportedFields[2] !== "informalLeaveTaking"
  ) {
    fail("task7_tschuess_allocation");
  }
}

export function inspectGermanTask7V2L01C02TschuessSourceHoldDeV1(
  options: GermanTask7V2L01C02TschuessInspectionOptionsDeV1 = {},
): GermanTask7V2L01C02TschuessSourceHoldDeV1 {
  const evidenceRoot = path.resolve(
    options.evidenceRootForTest ?? DEFAULT_EVIDENCE_ROOT,
  );
  validateTask5();
  validateInventory();
  validateEvidence(evidenceRoot);
  validateManifest(evidenceRoot);
  return Object.freeze({
    status: "HOLD",
    sourcePlanId: "de_lex_plan_l01_c02_tschuess_v1",
    checkpointPacketId: "de_l01_c02_s16",
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
