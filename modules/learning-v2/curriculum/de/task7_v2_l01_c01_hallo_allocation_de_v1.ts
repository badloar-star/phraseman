import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hashCanonicalBody } from "../../policies/decision_registry";

type JsonRecord = Record<string, unknown>;

export type GermanTask7V2L01C01HalloSourceAllocationDeV1 = Readonly<{
  status: "HOLD";
  decision: "PHRASE_AUTHORITY_REQUIRED";
  sessionId: "de_l01_s01";
  sourcePlanId: "de_lex_plan_l01_c01_hallo_v1";
  checkpointPacketId: "de_l01_c01_s08";
  phraseContextId: "de_pf_l01_c01_hallo_nachbarin_v1";
  contactPacketIds: readonly ["de_l01_c01_s01", "de_l01_c01_s08"];
  excludedSourcePlanIds: readonly ["de_lex_plan_l01_c01_nachbarin_v1"];
  sourceSupport: Readonly<{
    task5PlanBodyBound: true;
    dwdsInterjection: true;
    dwdsGreetingSense: true;
    goetheOccurrence: true;
    neutralRegister: false;
  }>;
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

export type GermanTask7V2L01C01HalloInspectionOptionsDeV1 = Readonly<{
  evidenceRootForTest?: string;
  task5PathForTest?: string;
  inventoryPathForTest?: string;
  packetPathForTest?: string;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const EVIDENCE_ROOT = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_allocation_v1",
);
const TASK5_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
);
const INVENTORY_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json",
);
const PACKET_PATH = path.join(
  ROOT,
  "content/learning-v2-course/curriculum/de/packets/l01/s01.json",
);

const TASK5_BYTE_SHA256 =
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const TASK5_CANONICAL_BODY_SHA256 =
  "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3";
const PLAN_CANONICAL_BODY_SHA256 =
  "4616ba8b2c84d2f7880cca5a79d76bb8453503b9b2244004c72d455d78fae301";
const INVENTORY_SHA256 =
  "db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415";
const MANIFEST_SHA256 =
  "674f789c05922ddce29103393228ee26f4c428255baf4fc646b90c95b97bfd33";
const EXTRACTION_MAP_SHA256 =
  "3b0ab0c32c3dd8bb42b2c22f0f43bc514272f23c60c97003334418f5afaaabad";
const EXTRACTION_MAP_BYTES = 2_730;
const GOETHE_URL =
  "https://lernen.goethe.de/deutschonline/A1/PDF/DE/deutschonline_Redemittel_und_Grammatik_1-18.pdf";

const RAW = Object.freeze({
  dwdsTarget: Object.freeze({
    path: "raw/dwds_hallo_interjection.html",
    sha256: "b9dd475eb8828c1d38b000404cd519b3d66012941b2a13eead5325bda5e39467",
    bytes: 73_289,
    metadataPath: "raw/dwds_hallo_interjection.http_metadata.txt",
    metadataSha256:
      "90df7fe607e472a13d90bd0619092a81c50c61c80de7ad5e52b11fca086c1dbc",
    metadataBytes: 194,
  }),
  dwdsRejected: Object.freeze({
    path: "raw/dwds_Hallo_noun.html",
    sha256: "6a94ead9b18d74765083cff8fc6104597816d2edc1729cd2bcf33ce3948b818d",
    bytes: 57_903,
    metadataPath: "raw/dwds_Hallo_noun.http_metadata.txt",
    metadataSha256:
      "4937b58562b833fda978078095861803cd55b6d2e060ece7ab658bab99f2ac7d",
    metadataBytes: 194,
  }),
  goethe: Object.freeze({
    path: "raw/goethe_a1_redemittel.pdf",
    sha256: "5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085",
    bytes: 3_685_205,
    metadataPath: "raw/goethe_a1_redemittel.http_metadata.txt",
    metadataSha256:
      "6e87480e6363b4aefc31896ae231f796190ef191c2398aec80ff5613db651d13",
    metadataBytes: 369,
    transport: "DIRECT_PUBLIC_HTTPS",
  }),
});

function fail(code: string): never {
  throw new Error(code);
}

function record(value: unknown, code: string): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
}

function exactKeys(
  value: JsonRecord,
  keys: readonly string[],
  code: string,
): void {
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    fail(code);
  }
}

function forbidCanonicalSenseId(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const nested of value) forbidCanonicalSenseId(nested);
    return;
  }
  if (Object.hasOwn(value, "canonicalSenseId")) {
    fail("task7_hallo_canonical_sense_id_forbidden");
  }
  for (const nested of Object.values(value)) forbidCanonicalSenseId(nested);
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJsonBytes(
  file: string,
  code: string,
): {
  bytes: Buffer;
  value: unknown;
} {
  const bytes = fs.readFileSync(file);
  try {
    return { bytes, value: JSON.parse(bytes.toString("utf8")) as unknown };
  } catch {
    fail(code);
  }
}

function readBoundFile(
  evidenceRoot: string,
  binding: Readonly<{ path: string; sha256: string; bytes: number }>,
): Buffer {
  const rawRoot = path.resolve(evidenceRoot, "raw");
  const target = path.resolve(evidenceRoot, binding.path);
  if (!target.startsWith(`${rawRoot}${path.sep}`)) fail("task7_hallo_raw_path");
  const bytes = fs.readFileSync(target);
  if (bytes.length !== binding.bytes || sha256(bytes) !== binding.sha256) {
    fail("task7_hallo_raw_body");
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

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as JsonRecord)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

export function validateGermanTask7V2L01C01HalloTask5PlanForAuditDeV1(
  task5: unknown,
): Readonly<{
  sourcePlanId: "de_lex_plan_l01_c01_hallo_v1";
  checkpointPacketId: "de_l01_c01_s08";
  planCanonicalBodySha256: string;
}> {
  if (hashCanonicalBody(task5) !== TASK5_CANONICAL_BODY_SHA256) {
    fail("task7_hallo_task5_canonical_body");
  }
  record(task5, "task7_hallo_task5_record");
  if (
    task5.schemaVersion !== "learning-v2-german-chapter-blueprints.v2" ||
    task5.targetLanguage !== "de" ||
    !Array.isArray(task5.lessons)
  ) {
    fail("task7_hallo_task5_canonical_body");
  }
  const lesson = task5.lessons.find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as JsonRecord).lessonId === "de_l01",
  );
  record(lesson, "task7_hallo_task5_plan_body");
  if (!Array.isArray(lesson.chapters)) fail("task7_hallo_task5_plan_body");
  const chapter = lesson.chapters.find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as JsonRecord).id === "de_l01_c01",
  );
  record(chapter, "task7_hallo_task5_plan_body");
  record(chapter.checkpoint, "task7_hallo_task5_plan_body");
  if (
    chapter.checkpoint.packetId !== "de_l01_c01_s08" ||
    !Array.isArray(chapter.checkpoint.plannedNewLexicalSenses)
  ) {
    fail("task7_hallo_task5_plan_body");
  }
  const matches = chapter.checkpoint.plannedNewLexicalSenses.filter(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as JsonRecord).id === "de_lex_plan_l01_c01_hallo_v1",
  );
  if (matches.length !== 1) fail("task7_hallo_singleton");
  if (hashCanonicalBody(matches[0]) !== PLAN_CANONICAL_BODY_SHA256) {
    fail("task7_hallo_task5_plan_body");
  }
  return deepFreeze({
    sourcePlanId: "de_lex_plan_l01_c01_hallo_v1" as const,
    checkpointPacketId: "de_l01_c01_s08" as const,
    planCanonicalBodySha256: PLAN_CANONICAL_BODY_SHA256,
  });
}

function validateManifest(manifest: unknown): void {
  forbidCanonicalSenseId(manifest);
  record(manifest, "task7_hallo_manifest_record");
  exactKeys(
    manifest,
    [
      "schemaVersion",
      "status",
      "authority",
      "task5V2",
      "allocationScope",
      "sources",
      "fieldSupport",
      "allocations",
    ],
    "task7_hallo_manifest_schema",
  );
  if (
    manifest.schemaVersion !==
      "learning-v2-de-task7-v2-l01-c01-hallo-source-allocation.v1" ||
    manifest.status !== "HOLD"
  ) {
    fail("task7_hallo_manifest_version");
  }
  record(manifest.authority, "task7_hallo_authority");
  exactKeys(
    manifest.authority,
    [
      "scope",
      "decision",
      "canonicalAdmission",
      "inventoryResolutionApplied",
      "task7Unlock",
      "preauthoringAuthority",
      "learnerFacing",
      "releaseAuthorized",
      "consumerCutover",
    ],
    "task7_hallo_authority_schema",
  );
  if (
    manifest.authority.scope !== "SOURCE_BOUND_HOLD_ALLOCATION_ONLY" ||
    manifest.authority.decision !== "PHRASE_AUTHORITY_REQUIRED"
  ) {
    fail("task7_hallo_phrase_authority_required");
  }
  if (
    manifest.authority.canonicalAdmission !== false ||
    manifest.authority.inventoryResolutionApplied !== false ||
    manifest.authority.task7Unlock !== false ||
    manifest.authority.preauthoringAuthority !== false ||
    manifest.authority.learnerFacing !== false ||
    manifest.authority.releaseAuthorized !== false ||
    manifest.authority.consumerCutover !== "NONE"
  ) {
    fail("task7_hallo_hold_boundary");
  }

  record(manifest.task5V2, "task7_hallo_task5_binding");
  exactKeys(
    manifest.task5V2,
    [
      "path",
      "schemaVersion",
      "byteSha256",
      "canonicalBodySha256",
      "sourcePlanId",
      "checkpointPacketId",
      "planCanonicalBodySha256",
    ],
    "task7_hallo_task5_binding",
  );
  if (
    manifest.task5V2.path !==
      "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json" ||
    manifest.task5V2.schemaVersion !==
      "learning-v2-german-chapter-blueprints.v2" ||
    manifest.task5V2.byteSha256 !== TASK5_BYTE_SHA256 ||
    manifest.task5V2.canonicalBodySha256 !== TASK5_CANONICAL_BODY_SHA256 ||
    manifest.task5V2.sourcePlanId !== "de_lex_plan_l01_c01_hallo_v1" ||
    manifest.task5V2.checkpointPacketId !== "de_l01_c01_s08" ||
    manifest.task5V2.planCanonicalBodySha256 !== PLAN_CANONICAL_BODY_SHA256
  ) {
    fail("task7_hallo_task5_binding");
  }

  record(manifest.allocationScope, "task7_hallo_scope");
  exactKeys(
    manifest.allocationScope,
    [
      "sessionId",
      "phraseContextId",
      "targetSourcePlanIds",
      "excludedSourcePlanIds",
    ],
    "task7_hallo_scope_schema",
  );
  if (
    manifest.allocationScope.sessionId !== "de_l01_s01" ||
    manifest.allocationScope.phraseContextId !==
      "de_pf_l01_c01_hallo_nachbarin_v1" ||
    !Array.isArray(manifest.allocationScope.targetSourcePlanIds) ||
    manifest.allocationScope.targetSourcePlanIds.length !== 1 ||
    manifest.allocationScope.targetSourcePlanIds[0] !==
      "de_lex_plan_l01_c01_hallo_v1" ||
    !Array.isArray(manifest.allocationScope.excludedSourcePlanIds) ||
    manifest.allocationScope.excludedSourcePlanIds.length !== 1 ||
    manifest.allocationScope.excludedSourcePlanIds[0] !==
      "de_lex_plan_l01_c01_nachbarin_v1"
  ) {
    fail("task7_hallo_scope");
  }

  record(manifest.fieldSupport, "task7_hallo_field_support");
  exactKeys(
    manifest.fieldSupport,
    ["supportedClaims", "unsupportedClaims"],
    "task7_hallo_field_support_schema",
  );
  record(manifest.fieldSupport.supportedClaims, "task7_hallo_field_support");
  exactKeys(
    manifest.fieldSupport.supportedClaims,
    [
      "sourceHeadword",
      "sourcePartOfSpeech",
      "greetingDefinitionGerman",
      "officialLearningOccurrence",
    ],
    "task7_hallo_field_support_schema",
  );
  if (
    manifest.fieldSupport.supportedClaims.sourceHeadword !== "hallo" ||
    manifest.fieldSupport.supportedClaims.sourcePartOfSpeech !==
      "Interjektion" ||
    manifest.fieldSupport.supportedClaims.greetingDefinitionGerman !==
      "Anrede zur Begrüßung" ||
    manifest.fieldSupport.supportedClaims.officialLearningOccurrence !==
      "Guten Tag! / Hallo!"
  ) {
    fail("task7_hallo_field_support");
  }
  record(manifest.fieldSupport.unsupportedClaims, "task7_hallo_field_support");
  exactKeys(
    manifest.fieldSupport.unsupportedClaims,
    ["neutralRegister", "phraseContextAuthority"],
    "task7_hallo_field_support_schema",
  );
  if (
    manifest.fieldSupport.unsupportedClaims.neutralRegister !==
    "UNSUPPORTED_BY_CAPTURED_SOURCES"
  ) {
    fail("task7_hallo_neutral_unsupported");
  }
  if (
    manifest.fieldSupport.unsupportedClaims.phraseContextAuthority !==
    "REQUIRES_SEPARATE_AUTHORITY"
  ) {
    fail("task7_hallo_phrase_authority_required");
  }

  if (
    !Array.isArray(manifest.allocations) ||
    manifest.allocations.length !== 1
  ) {
    fail("task7_hallo_singleton");
  }
  const allocation = manifest.allocations[0];
  record(allocation, "task7_hallo_allocation");
  exactKeys(
    allocation,
    [
      "sourcePlanId",
      "checkpointPacketId",
      "sessionId",
      "phraseContextId",
      "contacts",
      "excludedSourcePlanIds",
      "supportedFields",
      "decision",
    ],
    "task7_hallo_allocation_schema",
  );
  if (
    allocation.sourcePlanId !== "de_lex_plan_l01_c01_hallo_v1" ||
    allocation.checkpointPacketId !== "de_l01_c01_s08" ||
    allocation.sessionId !== "de_l01_s01" ||
    allocation.phraseContextId !== "de_pf_l01_c01_hallo_nachbarin_v1" ||
    allocation.decision !== "PHRASE_AUTHORITY_REQUIRED"
  ) {
    fail("task7_hallo_phrase_authority_required");
  }
  if (!Array.isArray(allocation.contacts) || allocation.contacts.length !== 2) {
    fail("task7_hallo_contacts");
  }
  const expectedContacts = [
    ["INTRODUCTION_CONTEXT", "de_l01_c01_s01"],
    ["CHECKPOINT_PLANNED_USE", "de_l01_c01_s08"],
  ] as const;
  allocation.contacts.forEach((contact, index) => {
    record(contact, "task7_hallo_contacts");
    exactKeys(contact, ["role", "packetId"], "task7_hallo_contacts");
    if (
      contact.role !== expectedContacts[index][0] ||
      contact.packetId !== expectedContacts[index][1]
    ) {
      fail("task7_hallo_contacts");
    }
  });
  if (
    !Array.isArray(allocation.excludedSourcePlanIds) ||
    allocation.excludedSourcePlanIds.length !== 1 ||
    allocation.excludedSourcePlanIds[0] !== "de_lex_plan_l01_c01_nachbarin_v1"
  ) {
    fail("task7_hallo_scope");
  }
  if (
    !Array.isArray(allocation.supportedFields) ||
    allocation.supportedFields.length !== 4 ||
    allocation.supportedFields[0] !== "lemmaOrExpression" ||
    allocation.supportedFields[1] !== "sourcePartOfSpeech" ||
    allocation.supportedFields[2] !== "greetingFunction" ||
    allocation.supportedFields[3] !== "officialLearningOccurrence"
  ) {
    fail("task7_hallo_supported_fields");
  }
}

function validateSources(
  evidenceRoot: string,
  manifest: JsonRecord,
  extraction: unknown,
): void {
  forbidCanonicalSenseId(extraction);
  record(manifest.sources, "task7_hallo_sources");
  exactKeys(
    manifest.sources,
    ["extractionMap", "dwds", "goetheA1"],
    "task7_hallo_sources_schema",
  );
  record(manifest.sources.extractionMap, "task7_hallo_sources");
  exactKeys(
    manifest.sources.extractionMap,
    ["path", "sha256", "bytes"],
    "task7_hallo_extraction_map",
  );
  if (
    manifest.sources.extractionMap.path !== "extraction_map.json" ||
    manifest.sources.extractionMap.sha256 !== EXTRACTION_MAP_SHA256 ||
    manifest.sources.extractionMap.bytes !== EXTRACTION_MAP_BYTES
  ) {
    fail("task7_hallo_extraction_map");
  }
  record(manifest.sources.dwds, "task7_hallo_sources");
  exactKeys(
    manifest.sources.dwds,
    ["target", "rejected"],
    "task7_hallo_dwds_noun_rejected",
  );
  record(manifest.sources.dwds.target, "task7_hallo_sources");
  record(manifest.sources.dwds.rejected, "task7_hallo_sources");
  exactKeys(
    manifest.sources.dwds.target,
    ["canonicalUrl", "headword", "sourcePartOfSpeech", "greetingSenseAnchor"],
    "task7_hallo_dwds_noun_rejected",
  );
  exactKeys(
    manifest.sources.dwds.rejected,
    ["canonicalUrl", "headword", "sourcePartOfSpeech", "rejectionReason"],
    "task7_hallo_dwds_noun_rejected",
  );
  if (
    manifest.sources.dwds.target.canonicalUrl !==
      "https://www.dwds.de/wb/hallo" ||
    manifest.sources.dwds.target.headword !== "hallo" ||
    manifest.sources.dwds.target.sourcePartOfSpeech !== "Interjektion" ||
    manifest.sources.dwds.target.greetingSenseAnchor !== "d-1-1-2" ||
    manifest.sources.dwds.rejected.canonicalUrl !==
      "https://www.dwds.de/wb/Hallo" ||
    manifest.sources.dwds.rejected.headword !== "Hallo" ||
    manifest.sources.dwds.rejected.sourcePartOfSpeech !==
      "Substantiv (Neutrum)" ||
    manifest.sources.dwds.rejected.rejectionReason !==
      "NOUN_ENTRY_IS_NOT_THE_TARGET_GREETING_INTERJECTION"
  ) {
    fail("task7_hallo_dwds_noun_rejected");
  }
  record(manifest.sources.goetheA1, "task7_hallo_goethe_source_binding");
  exactKeys(
    manifest.sources.goetheA1,
    ["canonicalUrl", "rawSha256", "transport"],
    "task7_hallo_goethe_source_binding",
  );
  if (
    manifest.sources.goetheA1.canonicalUrl !== GOETHE_URL ||
    manifest.sources.goetheA1.rawSha256 !== RAW.goethe.sha256 ||
    manifest.sources.goetheA1.transport !== RAW.goethe.transport
  ) {
    fail("task7_hallo_goethe_source_binding");
  }

  record(extraction, "task7_hallo_extraction_map");
  exactKeys(
    extraction,
    ["schemaVersion", "rawSources", "extractions"],
    "task7_hallo_extraction_map_schema",
  );
  if (
    extraction.schemaVersion !==
    "learning-v2-de-task7-v2-l01-c01-hallo-source-extraction-map.v1"
  ) {
    fail("task7_hallo_extraction_map");
  }
  record(extraction.rawSources, "task7_hallo_extraction_map");
  record(extraction.extractions, "task7_hallo_extraction_map");
  const rawSources = extraction.rawSources;
  const extractions = extraction.extractions;
  exactKeys(
    rawSources,
    ["dwdsInterjection", "dwdsRejectedNoun", "goetheA1"],
    "task7_hallo_raw_binding",
  );
  exactKeys(
    extractions,
    [
      "dwdsTargetIdentity",
      "dwdsRejectedIdentity",
      "dwdsGreeting",
      "goetheOccurrence",
    ],
    "task7_hallo_extraction_map_schema",
  );
  const entries = [
    ["dwdsInterjection", RAW.dwdsTarget],
    ["dwdsRejectedNoun", RAW.dwdsRejected],
    ["goetheA1", RAW.goethe],
  ] as const;
  for (const [key, expected] of entries) {
    record(rawSources[key], "task7_hallo_raw_binding");
    exactKeys(
      rawSources[key],
      Object.keys(expected),
      "task7_hallo_raw_binding",
    );
    for (const [expectedKey, expectedValue] of Object.entries(expected)) {
      if (rawSources[key][expectedKey] !== expectedValue) {
        fail("task7_hallo_raw_binding");
      }
    }
    readBoundFile(evidenceRoot, expected);
    readBoundFile(evidenceRoot, {
      path: expected.metadataPath,
      sha256: expected.metadataSha256,
      bytes: expected.metadataBytes,
    });
  }

  const targetHtml = readBoundFile(evidenceRoot, RAW.dwdsTarget).toString(
    "utf8",
  );
  const rejectedHtml = readBoundFile(evidenceRoot, RAW.dwdsRejected).toString(
    "utf8",
  );
  record(extractions.dwdsTargetIdentity, "task7_hallo_dwds_target_span");
  exactKeys(
    extractions.dwdsTargetIdentity,
    [
      "canonicalUrl",
      "title",
      "headword",
      "sourcePartOfSpeech",
      "grammarSpanSha256",
      "grammarSpanUtf8Bytes",
    ],
    "task7_hallo_dwds_target_span",
  );
  const targetGrammar = outerDiv(
    targetHtml,
    '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
    "task7_hallo_dwds_target_span",
  );
  if (
    extractions.dwdsTargetIdentity.canonicalUrl !==
      "https://www.dwds.de/wb/hallo" ||
    extractions.dwdsTargetIdentity.title !==
      "hallo – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS" ||
    extractions.dwdsTargetIdentity.headword !== "hallo" ||
    extractions.dwdsTargetIdentity.sourcePartOfSpeech !== "Interjektion" ||
    extractions.dwdsTargetIdentity.grammarSpanSha256 !==
      sha256(targetGrammar) ||
    extractions.dwdsTargetIdentity.grammarSpanUtf8Bytes !==
      Buffer.byteLength(targetGrammar, "utf8") ||
    !targetGrammar.includes("<span>Interjektion</span>")
  ) {
    fail("task7_hallo_dwds_target_span");
  }
  record(extractions.dwdsRejectedIdentity, "task7_hallo_dwds_noun_rejected");
  exactKeys(
    extractions.dwdsRejectedIdentity,
    [
      "canonicalUrl",
      "title",
      "headword",
      "sourcePartOfSpeech",
      "grammarSpanSha256",
      "grammarSpanUtf8Bytes",
      "rejectionReason",
    ],
    "task7_hallo_dwds_noun_rejected",
  );
  const rejectedGrammar = outerDiv(
    rejectedHtml,
    '<div class="dwdswb-ft-block"><span class="dwdswb-ft-blocklabel serif italic">Form / Grammatik</span>',
    "task7_hallo_dwds_noun_rejected",
  );
  if (
    extractions.dwdsRejectedIdentity.canonicalUrl !==
      "https://www.dwds.de/wb/Hallo" ||
    extractions.dwdsRejectedIdentity.title !==
      "Hallo – Schreibung, Definition, Bedeutung, Etymologie, Synonyme, Beispiele | DWDS" ||
    extractions.dwdsRejectedIdentity.headword !== "Hallo" ||
    extractions.dwdsRejectedIdentity.sourcePartOfSpeech !==
      "Substantiv (Neutrum)" ||
    extractions.dwdsRejectedIdentity.grammarSpanSha256 !==
      sha256(rejectedGrammar) ||
    extractions.dwdsRejectedIdentity.grammarSpanUtf8Bytes !==
      Buffer.byteLength(rejectedGrammar, "utf8") ||
    extractions.dwdsRejectedIdentity.rejectionReason !==
      "NOUN_ENTRY_IS_NOT_THE_TARGET_GREETING_INTERJECTION" ||
    !rejectedGrammar.includes("<span>Substantiv (Neutrum)</span>")
  ) {
    fail("task7_hallo_dwds_noun_rejected");
  }
  record(extractions.dwdsGreeting, "task7_hallo_dwds_greeting_span");
  exactKeys(
    extractions.dwdsGreeting,
    ["sourceAnchor", "exactDefinitionGerman", "spanSha256", "spanUtf8Bytes"],
    "task7_hallo_dwds_greeting_span",
  );
  const greeting = outerDiv(
    targetHtml,
    '<div class="dwdswb-lesart" id="d-1-1-2">',
    "task7_hallo_dwds_greeting_span",
  );
  if (
    extractions.dwdsGreeting.sourceAnchor !== "d-1-1-2" ||
    extractions.dwdsGreeting.exactDefinitionGerman !== "Anrede zur Begrüßung" ||
    extractions.dwdsGreeting.spanSha256 !== sha256(greeting) ||
    extractions.dwdsGreeting.spanUtf8Bytes !==
      Buffer.byteLength(greeting, "utf8") ||
    !greeting.includes("Anrede zur Begrüßung")
  ) {
    fail("task7_hallo_dwds_greeting_span");
  }
  record(extractions.goetheOccurrence, "task7_hallo_goethe_occurrence");
  exactKeys(
    extractions.goetheOccurrence,
    ["text", "utf8Bytes", "sha256", "pdfPage", "heading", "evidenceFunction"],
    "task7_hallo_goethe_occurrence",
  );
  if (
    extractions.goetheOccurrence.text !== "Guten Tag! / Hallo!" ||
    extractions.goetheOccurrence.utf8Bytes !== 19 ||
    extractions.goetheOccurrence.sha256 !==
      "e545fb373a9a5e0e5fa664af788d68528275b6b527241f01f684b2f4e4f31949" ||
    extractions.goetheOccurrence.evidenceFunction !==
      "EXACT_OCCURRENCE_IN_OFFICIAL_A1_LEARNING_INVENTORY"
  ) {
    fail("task7_hallo_goethe_occurrence");
  }
  if (
    extractions.goetheOccurrence.pdfPage !== 3 ||
    extractions.goetheOccurrence.heading !==
      "WIE SAGT MAN? > BEGRÜSSEN UND VERABSCHIEDEN"
  ) {
    fail("task7_hallo_goethe_locator");
  }
}

export function inspectGermanTask7V2L01C01HalloSourceAllocationDeV1(
  options: GermanTask7V2L01C01HalloInspectionOptionsDeV1 = {},
): GermanTask7V2L01C01HalloSourceAllocationDeV1 {
  const evidenceRoot = options.evidenceRootForTest ?? EVIDENCE_ROOT;
  const task5Path = options.task5PathForTest ?? TASK5_PATH;
  const inventoryPath = options.inventoryPathForTest ?? INVENTORY_PATH;
  const packetPath = options.packetPathForTest ?? PACKET_PATH;
  if (fs.existsSync(packetPath))
    fail("task7_hallo_packet_materialization_forbidden");

  const manifestSource = readJsonBytes(
    path.join(evidenceRoot, "manifest.json"),
    "task7_hallo_manifest_json",
  );
  if (
    evidenceRoot === EVIDENCE_ROOT &&
    sha256(manifestSource.bytes) !== MANIFEST_SHA256
  ) {
    fail("task7_hallo_manifest_binding");
  }
  validateManifest(manifestSource.value);
  const manifest = manifestSource.value as JsonRecord;

  const extractionSource = readJsonBytes(
    path.join(evidenceRoot, "extraction_map.json"),
    "task7_hallo_extraction_map_json",
  );
  if (
    evidenceRoot === EVIDENCE_ROOT &&
    sha256(extractionSource.bytes) !== EXTRACTION_MAP_SHA256
  ) {
    fail("task7_hallo_extraction_map");
  }
  validateSources(evidenceRoot, manifest, extractionSource.value);

  const task5Bytes = fs.readFileSync(task5Path);
  if (sha256(task5Bytes) !== TASK5_BYTE_SHA256) {
    fail("task7_hallo_task5_byte_binding");
  }
  let task5: unknown;
  try {
    task5 = JSON.parse(task5Bytes.toString("utf8")) as unknown;
  } catch {
    fail("task7_hallo_task5_json");
  }
  validateGermanTask7V2L01C01HalloTask5PlanForAuditDeV1(task5);

  const inventorySource = readJsonBytes(
    inventoryPath,
    "task7_hallo_inventory_json",
  );
  if (sha256(inventorySource.bytes) !== INVENTORY_SHA256) {
    fail("task7_hallo_inventory_binding");
  }
  const inventory = inventorySource.value;
  record(inventory, "task7_hallo_inventory");
  record(inventory.counts, "task7_hallo_inventory");
  if (
    inventory.counts.resolvedPlanIds !== 6 ||
    inventory.counts.unresolvedPlanIds !== 282 ||
    inventory.counts.materializedPackets !== 0 ||
    !Array.isArray(inventory.resolutions) ||
    inventory.resolutions.length !== 6 ||
    inventory.resolutions.some(
      (resolution) =>
        resolution !== null &&
        typeof resolution === "object" &&
        !Array.isArray(resolution) &&
        (resolution as JsonRecord).sourcePlanId ===
          "de_lex_plan_l01_c01_hallo_v1",
    )
  ) {
    fail("task7_hallo_inventory_hold");
  }

  return deepFreeze({
    status: "HOLD" as const,
    decision: "PHRASE_AUTHORITY_REQUIRED" as const,
    sessionId: "de_l01_s01" as const,
    sourcePlanId: "de_lex_plan_l01_c01_hallo_v1" as const,
    checkpointPacketId: "de_l01_c01_s08" as const,
    phraseContextId: "de_pf_l01_c01_hallo_nachbarin_v1" as const,
    contactPacketIds: ["de_l01_c01_s01", "de_l01_c01_s08"] as const,
    excludedSourcePlanIds: ["de_lex_plan_l01_c01_nachbarin_v1"] as const,
    sourceSupport: {
      task5PlanBodyBound: true as const,
      dwdsInterjection: true as const,
      dwdsGreetingSense: true as const,
      goetheOccurrence: true as const,
      neutralRegister: false as const,
    },
    canonicalAdmission: false as const,
    inventoryResolutionApplied: false as const,
    task7Unlock: false as const,
    preauthoringAuthority: false as const,
    learnerFacing: false as const,
    releaseAuthorized: false as const,
    consumerCutover: "NONE" as const,
    inventory: {
      resolvedPlanIds: 6 as const,
      unresolvedPlanIds: 282 as const,
      materializedPackets: 0 as const,
    },
  });
}
