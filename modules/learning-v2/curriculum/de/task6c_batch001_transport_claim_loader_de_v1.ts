import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * A read-only loader for the immutable Task 6A3 L01 transport package.
 *
 * This is intentionally a transport/provenance registry, not a lexical
 * admission registry: it does not expose a production policy, a learner
 * phrase, a sense gloss, or canonical admission.  The old package retained
 * source anchor hashes rather than copied definition text, so this loader
 * retains those source claims verbatim instead of trying to reconstruct them.
 */

const ROOT = path.resolve(__dirname, "../../../..");
const TRANSPORT_ROOT = path.join(ROOT, ".tmp/de-task6a-exact-transport");
const L01_ROOT = path.join(TRANSPORT_ROOT, "task6a3-l01");
const CANDIDATE_PATH = path.join(
  L01_ROOT,
  "lexical_item_evidence_de_v1.candidate.json",
);
const PROJECTION_PATH = path.join(L01_ROOT, "L01_AUTHORITY_PROJECTION.json");
const MANIFEST_PATH = path.join(L01_ROOT, "TRANSPORT_MANIFEST.json");
const TASK5_PATH = path.join(
  ROOT,
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
);
const EXPECTED_FILE_SHA256 = Object.freeze({
  [MANIFEST_PATH]:
    "cd4b1b95f17df4475a4149ca0b6fab96eae7a15646b68b3b46888f40109e2e65",
  [PROJECTION_PATH]:
    "176a84fc2ff9ddbe3f29533548cd04673210a57e217bb616405c7be36ce6a8c5",
  [CANDIDATE_PATH]:
    "925fd41b11cd43fd30f18c94327353519481025a036a62c30139dbe5914a8837",
});
const EXPECTED_PLAN_IDS = Object.freeze([
  "de_lex_plan_l01_c01_hallo_v1",
  "de_lex_plan_l01_c01_nachbarin_v1",
  "de_lex_plan_l01_c02_tschuess_v1",
  "de_lex_plan_l01_c02_aufzug_v1",
  "de_lex_plan_l01_c03_ich_heisse_v1",
  "de_lex_plan_l01_c03_briefkasten_v1",
  "de_lex_plan_l01_c04_guten_tag_v1",
  "de_lex_plan_l01_c04_buero_v1",
  "de_lex_plan_l01_c05_das_ist_v1",
  "de_lex_plan_l01_c05_garten_v1",
  "de_lex_plan_l01_c06_auf_wiedersehen_v1",
  "de_lex_plan_l01_c06_hausmeister_v1",
  "de_lex_plan_l01_c07_guten_abend_v1",
  "de_lex_plan_l01_c07_einladung_v1",
] as const);

type JsonRecord = Record<string, unknown>;
type MutateForTest =
  | "claimBody"
  | "cacheSha256"
  | "responseSha256"
  | "cachePath";

export type GermanTask6cBatch001TransportClaimDeV1 = Readonly<{
  sourceKind: "TASK5";
  sourcePlanId: string;
  canonicalSenseId: string;
  evidenceId: string;
  status: "HOLD";
  authority: string;
  verifiedOn: string;
  sourceUrl: string;
  sourceAnchor: string;
  claimBody: string;
  claimBodySha256: string;
  sourceEvidenceStatus:
    | "BINARY_TRANSPORT_PROVENANCE_ONLY"
    | "CATALOG_PROVENANCE_ONLY";
  directEvidenceStatus: "NOT_DIRECT_EVIDENCE";
  task5Binding: Readonly<{
    lessonId: "de_l01";
    chapterId: string;
    checkpointPacketId: string;
    semanticIdentity: string;
  }>;
  transport: Readonly<{
    cachePath: string;
    cacheSha256: string;
    responseSha256: string;
    responseBytes: number;
    responseVerification:
      | "BINARY_RAW_RESPONSE_VERIFIED"
      | "UNAVAILABLE_RAW_RESPONSE_BYTES_ABSENT";
  }>;
}>;

export type GermanTask6cBatch001TransportClaimRegistryDeV1 = Readonly<{
  authorityVersion: "learning-v2-german-task6c-batch-001-transport-claims.v1";
  status: "PROPOSED_NOT_CANONICAL";
  task7Unlock: false;
  claims: readonly GermanTask6cBatch001TransportClaimDeV1[];
}>;

export type GermanTask6cBatch001TransportLoaderOptionsDeV1 = Readonly<{
  /** Test-only hostile path.  It never permits a production override. */
  mutateForTest?: MutateForTest;
  /** Test-only count assertion proving the closed 14-plan roster. */
  expectedClaimCount?: number;
}>;

function fail(code: string): never {
  throw new Error(code);
}
function sha256(bytes: string | Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
function record(value: unknown, code: string): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(code);
}
function text(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) fail(code);
}
function integer(value: unknown, code: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    fail(code);
}
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as JsonRecord;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value as string | number | boolean | null);
  if (serialized === undefined) fail("task6c_batch001_canonical_json_invalid");
  return serialized;
}
function readJson(filePath: string, code: string): JsonRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch {
    fail(code);
  }
  record(parsed, code);
  return parsed;
}
function verifiedFile(filePath: string): Buffer {
  if (!fs.existsSync(filePath)) fail("task6c_batch001_transport_file_missing");
  const bytes = fs.readFileSync(filePath);
  if (
    sha256(bytes) !==
    EXPECTED_FILE_SHA256[filePath as keyof typeof EXPECTED_FILE_SHA256]
  ) {
    fail("task6c_batch001_transport_file_hash_mismatch");
  }
  return bytes;
}
function cachePathFor(relativePath: string): string {
  if (!relativePath.startsWith(".cache/"))
    fail("task6c_batch001_cache_path_invalid");
  const root = relativePath.endsWith(".pdf") ? L01_ROOT : TRANSPORT_ROOT;
  const result = path.resolve(root, relativePath);
  if (!result.startsWith(path.resolve(root) + path.sep))
    fail("task6c_batch001_cache_path_escape");
  return result;
}
function task5Bindings(): ReadonlyMap<
  string,
  Readonly<{
    lessonId: "de_l01";
    chapterId: string;
    checkpointPacketId: string;
    semanticIdentity: string;
  }>
> {
  const task5 = readJson(TASK5_PATH, "task6c_batch001_task5_invalid");
  if (!Array.isArray(task5.lessons))
    fail("task6c_batch001_task5_lessons_invalid");
  const bindings = new Map<
    string,
    Readonly<{
      lessonId: "de_l01";
      chapterId: string;
      checkpointPacketId: string;
      semanticIdentity: string;
    }>
  >();
  for (const lesson of task5.lessons) {
    record(lesson, "task6c_batch001_task5_lesson_invalid");
    if (lesson.lessonId !== "de_l01" || !Array.isArray(lesson.chapters))
      continue;
    for (const chapter of lesson.chapters) {
      record(chapter, "task6c_batch001_task5_chapter_invalid");
      text(chapter.id, "task6c_batch001_task5_chapter_id_required");
      record(chapter.checkpoint, "task6c_batch001_task5_checkpoint_required");
      text(
        chapter.checkpoint.packetId,
        "task6c_batch001_task5_checkpoint_packet_required",
      );
      if (!Array.isArray(chapter.checkpoint.plannedNewLexicalSenses))
        fail("task6c_batch001_task5_plan_array_required");
      for (const plan of chapter.checkpoint.plannedNewLexicalSenses) {
        record(plan, "task6c_batch001_task5_plan_invalid");
        const planId = plan.id;
        text(planId, "task6c_batch001_task5_plan_id_required");
        if (
          !EXPECTED_PLAN_IDS.includes(
            planId as (typeof EXPECTED_PLAN_IDS)[number],
          )
        )
          continue;
        const semanticIdentity = plan.semanticIdentity;
        text(
          semanticIdentity,
          "task6c_batch001_task5_semantic_identity_required",
        );
        const chapterId = chapter.id;
        const checkpointPacketId = chapter.checkpoint.packetId;
        text(chapterId, "task6c_batch001_task5_chapter_id_required");
        text(
          checkpointPacketId,
          "task6c_batch001_task5_checkpoint_packet_required",
        );
        if (bindings.has(planId)) fail("task6c_batch001_task5_plan_duplicate");
        bindings.set(
          planId,
          Object.freeze({
            lessonId: "de_l01",
            chapterId,
            checkpointPacketId,
            semanticIdentity,
          }),
        );
      }
    }
  }
  if (bindings.size !== EXPECTED_PLAN_IDS.length)
    fail("task6c_batch001_task5_roster_binding_mismatch");
  return bindings;
}

function selectEvidence(
  catalog: readonly JsonRecord[],
  planId: string,
  formulaic: boolean,
): JsonRecord {
  const candidates = catalog.filter((entry) => entry.sourcePlanId === planId);
  const exact = candidates.filter((entry) => {
    text(
      entry.cacheRelativePath,
      "task6c_batch001_catalog_cache_path_required",
    );
    return formulaic
      ? entry.cacheRelativePath.endsWith(".pdf")
      : entry.cacheRelativePath.endsWith(".json");
  });
  if (exact.length !== 1) fail("task6c_batch001_transport_selection_ambiguous");
  return exact[0];
}

function verifyEvidenceTransport(
  evidence: JsonRecord,
  mutateForTest?: MutateForTest,
): {
  cachePath: string;
  cacheSha256: string;
  responseSha256: string;
  responseBytes: number;
  responseVerification:
    | "BINARY_RAW_RESPONSE_VERIFIED"
    | "UNAVAILABLE_RAW_RESPONSE_BYTES_ABSENT";
} {
  text(
    evidence.cacheRelativePath,
    "task6c_batch001_catalog_cache_path_required",
  );
  text(evidence.cacheSha256, "task6c_batch001_catalog_cache_sha256_required");
  text(
    evidence.responseSha256,
    "task6c_batch001_catalog_response_sha256_required",
  );
  integer(
    evidence.responseBytes,
    "task6c_batch001_catalog_response_bytes_required",
  );
  const diskPath =
    mutateForTest === "cachePath"
      ? `${cachePathFor(evidence.cacheRelativePath)}.missing`
      : cachePathFor(evidence.cacheRelativePath);
  if (!fs.existsSync(diskPath)) fail("task6c_batch001_cache_missing");
  const cacheBytes = fs.readFileSync(diskPath);
  const expectedCacheSha =
    mutateForTest === "cacheSha256" ? "0".repeat(64) : evidence.cacheSha256;
  if (sha256(cacheBytes) !== expectedCacheSha)
    fail("task6c_batch001_cache_sha256_mismatch");
  const expectedResponseSha =
    mutateForTest === "responseSha256"
      ? "0".repeat(64)
      : evidence.responseSha256;
  if (evidence.cacheRelativePath.endsWith(".pdf")) {
    if (
      sha256(cacheBytes) !== expectedResponseSha ||
      cacheBytes.length !== evidence.responseBytes
    ) {
      fail("task6c_batch001_response_sha256_mismatch");
    }
    return {
      cachePath: evidence.cacheRelativePath,
      cacheSha256: evidence.cacheSha256,
      responseSha256: evidence.responseSha256,
      responseBytes: evidence.responseBytes,
      responseVerification: "BINARY_RAW_RESPONSE_VERIFIED",
    };
  } else {
    const cache = readJson(diskPath, "task6c_batch001_cache_json_invalid");
    record(cache.payload, "task6c_batch001_cache_payload_required");
    record(
      cache.payload.exactArticleEvidence,
      "task6c_batch001_exact_article_required",
    );
    const article = cache.payload.exactArticleEvidence;
    if (
      article.responseSha256 !== expectedResponseSha ||
      article.responseBytes !== evidence.responseBytes
    ) {
      fail("task6c_batch001_response_sha256_mismatch");
    }
    // The cache is a parsed metadata wrapper, not the raw HTTP response body.
    // These values are retained catalog provenance only and cannot be direct evidence.
    return {
      cachePath: evidence.cacheRelativePath,
      cacheSha256: evidence.cacheSha256,
      responseSha256: evidence.responseSha256,
      responseBytes: evidence.responseBytes,
      responseVerification: "UNAVAILABLE_RAW_RESPONSE_BYTES_ABSENT",
    };
  }
}

/**
 * Loads only the 14 existing L01 Task5 plan transport claims.  There is no
 * caller-supplied transport input and no promotion path in this function.
 */
export function loadGermanTask6cBatch001TransportClaimsDeV1(
  options: GermanTask6cBatch001TransportLoaderOptionsDeV1 = {},
): GermanTask6cBatch001TransportClaimRegistryDeV1 {
  record(options, "task6c_batch001_loader_options_record_required");
  for (const key of Object.keys(options)) {
    if (key !== "mutateForTest" && key !== "expectedClaimCount")
      fail("task6c_batch001_loader_options_unknown");
  }
  verifiedFile(MANIFEST_PATH);
  verifiedFile(PROJECTION_PATH);
  verifiedFile(CANDIDATE_PATH);
  const projection = readJson(
    PROJECTION_PATH,
    "task6c_batch001_projection_invalid",
  );
  const candidate = readJson(
    CANDIDATE_PATH,
    "task6c_batch001_candidate_invalid",
  );
  if (
    projection.targetLanguage !== "de" ||
    projection.authorityCeiling !==
      "TEMP_REVIEW_ONLY_NO_REGISTRY_OR_RELEASE_AUTHORITY"
  )
    fail("task6c_batch001_projection_authority_invalid");
  if (
    !Array.isArray(projection.allowedSourcePlanIds) ||
    canonicalJson(projection.allowedSourcePlanIds) !==
      canonicalJson(EXPECTED_PLAN_IDS)
  )
    fail("task6c_batch001_roster_mismatch");
  if (
    candidate.targetLanguage !== "de" ||
    candidate.authorityCeiling !==
      "TEMP_REVIEW_ONLY_NO_REGISTRY_OR_RELEASE_AUTHORITY"
  )
    fail("task6c_batch001_candidate_authority_invalid");
  if (
    !Array.isArray(candidate.evidenceCatalog) ||
    !Array.isArray(candidate.rows)
  )
    fail("task6c_batch001_candidate_shape_invalid");
  const catalog = candidate.evidenceCatalog.map((entry) => {
    record(entry, "task6c_batch001_catalog_record_required");
    return entry;
  });
  const bindings = task5Bindings();
  const rowsByPlan = new Map<string, JsonRecord>();
  for (const row of candidate.rows) {
    record(row, "task6c_batch001_row_record_required");
    if (
      typeof row.sourcePlanId === "string" &&
      EXPECTED_PLAN_IDS.includes(
        row.sourcePlanId as (typeof EXPECTED_PLAN_IDS)[number],
      )
    )
      rowsByPlan.set(row.sourcePlanId, row);
  }
  const claims = EXPECTED_PLAN_IDS.map((sourcePlanId) => {
    const row = rowsByPlan.get(sourcePlanId);
    if (row === undefined) fail("task6c_batch001_row_missing");
    text(row.futureLexicalSenseId, "task6c_batch001_future_sense_id_required");
    const formulaic =
      !sourcePlanId.includes("nachbarin") &&
      !sourcePlanId.includes("aufzug") &&
      !sourcePlanId.includes("briefkasten") &&
      !sourcePlanId.includes("buero") &&
      !sourcePlanId.includes("garten") &&
      !sourcePlanId.includes("hausmeister") &&
      !sourcePlanId.includes("einladung");
    const evidence = selectEvidence(catalog, sourcePlanId, formulaic);
    text(evidence.evidenceId, "task6c_batch001_evidence_id_required");
    text(evidence.provider, "task6c_batch001_authority_required");
    text(evidence.accessedOn, "task6c_batch001_verified_on_required");
    text(evidence.canonicalUrl, "task6c_batch001_source_url_required");
    text(evidence.senseAnchor, "task6c_batch001_source_anchor_required");
    const claimBody =
      options.mutateForTest === "claimBody"
        ? `${canonicalJson(evidence)}!`
        : canonicalJson(evidence);
    const claimBodySha256 = sha256(canonicalJson(evidence));
    if (sha256(claimBody) !== claimBodySha256)
      fail("task6c_batch001_claim_body_hash_mismatch");
    const transport = verifyEvidenceTransport(evidence, options.mutateForTest);
    const task5Binding = bindings.get(sourcePlanId);
    if (task5Binding === undefined)
      fail("task6c_batch001_task5_binding_missing");
    return Object.freeze({
      sourceKind: "TASK5" as const,
      sourcePlanId,
      canonicalSenseId: row.futureLexicalSenseId,
      evidenceId: evidence.evidenceId,
      status: "HOLD" as const,
      authority: evidence.provider,
      verifiedOn: evidence.accessedOn,
      sourceUrl: evidence.canonicalUrl,
      sourceAnchor: evidence.senseAnchor,
      claimBody,
      claimBodySha256,
      sourceEvidenceStatus:
        transport.responseVerification === "BINARY_RAW_RESPONSE_VERIFIED"
          ? ("BINARY_TRANSPORT_PROVENANCE_ONLY" as const)
          : ("CATALOG_PROVENANCE_ONLY" as const),
      directEvidenceStatus: "NOT_DIRECT_EVIDENCE" as const,
      task5Binding,
      transport: Object.freeze(transport),
    });
  });
  if (
    new Set(claims.map((claim) => claim.sourcePlanId)).size !==
    EXPECTED_PLAN_IDS.length
  )
    fail("task6c_batch001_duplicate_source_plan");
  if (
    options.expectedClaimCount !== undefined &&
    options.expectedClaimCount !== claims.length
  )
    fail("task6c_batch001_claim_count_mismatch");
  return Object.freeze({
    authorityVersion: "learning-v2-german-task6c-batch-001-transport-claims.v1",
    status: "PROPOSED_NOT_CANONICAL",
    task7Unlock: false,
    claims: Object.freeze(claims),
  });
}
