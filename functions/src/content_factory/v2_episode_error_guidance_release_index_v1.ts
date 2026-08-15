import { createHash } from "node:crypto";
import {
  LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_MAX_BYTES_V1,
  LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1,
  LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_MAX_BYTES_V1,
  parseLearningV2ActivityErrorExplanationCatalogV1,
  parseLearningV2ActivityErrorExplanationLearnerProjectionV1,
  projectLearningV2ActivityErrorExplanationsForLearnerV1,
} from "../../../modules/learning-v2/content/activity_error_explanation_catalog_v1";
import { LEARNING_V2_INTERFACE_LOCALES } from "../../../modules/learning-v2/content/generator_course_contract";
import { parseV2ExactLanguageTagV1 } from "../../../modules/learning-v2/contracts/language_tag_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  type V2RepositoryImmutableObjectPinV1,
} from "./v2_firebase_repository_persistence_v1";

export const V2_EPISODE_ERROR_GUIDANCE_RELEASE_INDEX_SCHEMA_V1 =
  "v2-episode-error-guidance-release-index.v1" as const;
export const V2_EPISODE_ERROR_GUIDANCE_RELEASE_INDEX_MAX_BYTES_V1 = 128 * 1024;

export interface V2EpisodeErrorGuidanceReleaseIndexV1 {
  readonly schemaVersion: typeof V2_EPISODE_ERROR_GUIDANCE_RELEASE_INDEX_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly episodeOrdinal: number;
  readonly activityAssemblyFingerprint: string;
  readonly activityPackageFingerprint: string;
  readonly catalogId: string;
  readonly packageId: string;
  readonly targetLanguage: string;
  readonly interfaceLocales: typeof LEARNING_V2_INTERFACE_LOCALES;
  readonly entryCount: 144;
  readonly catalogFingerprint: string;
  readonly catalogObject: V2RepositoryImmutableObjectPinV1;
  readonly learnerProjectionFingerprint: string;
  readonly learnerProjectionObject: V2RepositoryImmutableObjectPinV1;
  readonly immutableObjectAggregateFingerprint: string;
  readonly filterDimensions: readonly [
    "interface_locale",
    "family",
    "episode",
    "session",
    "task",
  ];
  readonly catalogBindingEvidence: "exact_canonical_catalog_server_readback";
  readonly learnerProjectionBindingEvidence: "code_derived_exact_selected_variant_projection";
  readonly contentOriginAuthority: "none_owner_or_generator_claim_only";
  readonly selectionAuthority: "none_owner_confirmation_required";
  readonly repositoryOriginAuthority: "none_activation_cold_readback_required";
  readonly artifactStorageAuthority: "none_activation_cold_readback_required";
  readonly humanApprovalAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly indexFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const handles = new WeakSet<object>();
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const FILTER_DIMENSIONS = Object.freeze([
  "interface_locale",
  "family",
  "episode",
  "session",
  "task",
] as const);

function fail(code: string): never {
  throw new Error(`v2_episode_error_guidance_release_index_${code}`);
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    keys.length !== wanted.length ||
    keys.some((key, index) => key !== wanted[index])
  )
    fail("fields_invalid");
}

function preflightJson(value: unknown): void {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (++nodes > 10_000 || current.depth > 24) fail("json_complexity_invalid");
    if (typeof current.value === "string") {
      if (
        current.value.length > 20_000 ||
        current.value.normalize("NFC") !== current.value ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(
          current.value,
        )
      )
        fail("json_string_invalid");
      continue;
    }
    if (current.value === null || typeof current.value === "boolean") continue;
    if (typeof current.value === "number") {
      if (
        !Number.isFinite(current.value) ||
        Object.is(current.value, -0) ||
        (Number.isInteger(current.value) &&
          !Number.isSafeInteger(current.value))
      )
        fail("json_number_invalid");
      continue;
    }
    if (Array.isArray(current.value)) {
      if (current.value.length > 2_000) fail("json_complexity_invalid");
      current.value.forEach((child) =>
        stack.push({ value: child, depth: current.depth + 1 }),
      );
      continue;
    }
    if (!record(current.value)) fail("json_shape_invalid");
    const entries = Object.entries(current.value);
    if (
      entries.length > 64 ||
      entries.some(
        ([key]) => RESERVED_KEYS.has(key) || key.normalize("NFC") !== key,
      )
    )
      fail("json_shape_invalid");
    entries.forEach(([, child]) =>
      stack.push({ value: child, depth: current.depth + 1 }),
    );
  }
}

function episodeCoordinate(episodeId: string): string {
  return createHash("sha256").update(episodeId).digest("hex");
}

function rawHash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function exactPin(input: {
  readonly value: V2RepositoryImmutableObjectPinV1;
  readonly raw: string;
  readonly maximumBytes: number;
  readonly expectedPath: string;
}): V2RepositoryImmutableObjectPinV1 {
  const { value } = input;
  if (
    !record(value) ||
    Object.keys(value).sort().join("|") !==
      "byteSize|contentHash|contentType|objectGeneration|objectPath" ||
    value.objectPath !== input.expectedPath ||
    !HASH_RE.test(value.contentHash) ||
    value.contentHash !== rawHash(input.raw) ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    value.byteSize !== utf8ByteLengthV1(input.raw) ||
    value.byteSize < 2 ||
    value.byteSize > input.maximumBytes ||
    value.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
  )
    fail("pin_invalid");
  return Object.freeze({ ...value });
}

function exactIdentity(value: unknown, kind: "hash" | "id"): string {
  if (
    typeof value !== "string" ||
    !(kind === "hash" ? HASH_RE : ID_RE).test(value)
  )
    fail("identity_invalid");
  return value;
}

export function v2EpisodeErrorGuidanceCatalogObjectPathV1(input: {
  readonly planFingerprint: string;
  readonly episodeId: string;
  readonly catalogFingerprint: string;
  readonly rawHash: string;
}): string {
  if (!record(input)) fail("path_invalid");
  exactKeys(input, [
    "planFingerprint",
    "episodeId",
    "catalogFingerprint",
    "rawHash",
  ]);
  const planFingerprint = exactIdentity(input.planFingerprint, "hash");
  const episodeId = exactIdentity(input.episodeId, "id");
  const catalogFingerprint = exactIdentity(input.catalogFingerprint, "hash");
  const contentHash = exactIdentity(input.rawHash, "hash");
  return `learning-v2/error-guidance/catalog/${planFingerprint}/${episodeCoordinate(episodeId)}/${catalogFingerprint}/${contentHash}.json`;
}

export function v2EpisodeErrorGuidanceLearnerProjectionObjectPathV1(input: {
  readonly planFingerprint: string;
  readonly episodeId: string;
  readonly projectionFingerprint: string;
  readonly rawHash: string;
}): string {
  if (!record(input)) fail("path_invalid");
  exactKeys(input, [
    "planFingerprint",
    "episodeId",
    "projectionFingerprint",
    "rawHash",
  ]);
  const planFingerprint = exactIdentity(input.planFingerprint, "hash");
  const episodeId = exactIdentity(input.episodeId, "id");
  const projectionFingerprint = exactIdentity(
    input.projectionFingerprint,
    "hash",
  );
  const contentHash = exactIdentity(input.rawHash, "hash");
  return `learning-v2/error-guidance/learner/${planFingerprint}/${episodeCoordinate(episodeId)}/${projectionFingerprint}/${contentHash}.json`;
}

export function materializeV2EpisodeErrorGuidanceReleaseIndexV1(input: {
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly episodeOrdinal: number;
  readonly activityAssemblyFingerprint: string;
  readonly activityPackageFingerprint: string;
  readonly catalogRaw: string;
  readonly catalogObject: V2RepositoryImmutableObjectPinV1;
  readonly learnerProjectionRaw: string;
  readonly learnerProjectionObject: V2RepositoryImmutableObjectPinV1;
}): V2EpisodeErrorGuidanceReleaseIndexV1 {
  if (!record(input)) fail("input_invalid");
  exactKeys(input, [
    "planFingerprint",
    "courseContractFingerprint",
    "stageId",
    "episodeId",
    "episodeOrdinal",
    "activityAssemblyFingerprint",
    "activityPackageFingerprint",
    "catalogRaw",
    "catalogObject",
    "learnerProjectionRaw",
    "learnerProjectionObject",
  ]);
  const planFingerprint = exactIdentity(input.planFingerprint, "hash");
  const courseContractFingerprint = exactIdentity(
    input.courseContractFingerprint,
    "hash",
  );
  const stageId = exactIdentity(input.stageId, "id");
  const episodeId = exactIdentity(input.episodeId, "id");
  const activityAssemblyFingerprint = exactIdentity(
    input.activityAssemblyFingerprint,
    "hash",
  );
  const activityPackageFingerprint = exactIdentity(
    input.activityPackageFingerprint,
    "hash",
  );
  if (
    !Number.isSafeInteger(input.episodeOrdinal) ||
    input.episodeOrdinal < 1 ||
    input.episodeOrdinal > 32 ||
    typeof input.catalogRaw !== "string" ||
    typeof input.learnerProjectionRaw !== "string"
  )
    fail("input_invalid");
  const catalog = parseLearningV2ActivityErrorExplanationCatalogV1(
    input.catalogRaw,
  );
  const projection = parseLearningV2ActivityErrorExplanationLearnerProjectionV1(
    input.learnerProjectionRaw,
  );
  const expectedProjection =
    projectLearningV2ActivityErrorExplanationsForLearnerV1(catalog);
  if (
    catalog.episodeId !== episodeId ||
    catalog.episodeOrdinal !== input.episodeOrdinal ||
    projection.episodeId !== episodeId ||
    projection.episodeOrdinal !== input.episodeOrdinal ||
    projection.sourceCatalogFingerprint !== catalog.catalogFingerprint ||
    parseV2ExactLanguageTagV1(catalog.targetLanguage) === null ||
    canonicalJsonV1(expectedProjection) !== input.learnerProjectionRaw
  )
    fail("content_mismatch");
  const catalogObject = exactPin({
    value: input.catalogObject,
    raw: input.catalogRaw,
    maximumBytes: LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_MAX_BYTES_V1,
    expectedPath: v2EpisodeErrorGuidanceCatalogObjectPathV1({
      planFingerprint,
      episodeId,
      catalogFingerprint: catalog.catalogFingerprint,
      rawHash: rawHash(input.catalogRaw),
    }),
  });
  const learnerProjectionObject = exactPin({
    value: input.learnerProjectionObject,
    raw: input.learnerProjectionRaw,
    maximumBytes: LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_MAX_BYTES_V1,
    expectedPath: v2EpisodeErrorGuidanceLearnerProjectionObjectPathV1({
      planFingerprint,
      episodeId,
      projectionFingerprint: projection.projectionFingerprint,
      rawHash: rawHash(input.learnerProjectionRaw),
    }),
  });
  const body = Object.freeze({
    schemaVersion: V2_EPISODE_ERROR_GUIDANCE_RELEASE_INDEX_SCHEMA_V1,
    planFingerprint,
    courseContractFingerprint,
    stageId,
    episodeId,
    episodeOrdinal: input.episodeOrdinal,
    activityAssemblyFingerprint,
    activityPackageFingerprint,
    catalogId: catalog.catalogId,
    packageId: catalog.packageId,
    targetLanguage: catalog.targetLanguage,
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    entryCount: LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1,
    catalogFingerprint: catalog.catalogFingerprint,
    catalogObject,
    learnerProjectionFingerprint: projection.projectionFingerprint,
    learnerProjectionObject,
    immutableObjectAggregateFingerprint: hashCanonicalBody([
      catalogObject,
      learnerProjectionObject,
    ]),
    filterDimensions: FILTER_DIMENSIONS,
    catalogBindingEvidence: "exact_canonical_catalog_server_readback" as const,
    learnerProjectionBindingEvidence:
      "code_derived_exact_selected_variant_projection" as const,
    contentOriginAuthority: "none_owner_or_generator_claim_only" as const,
    selectionAuthority: "none_owner_confirmation_required" as const,
    repositoryOriginAuthority:
      "none_activation_cold_readback_required" as const,
    artifactStorageAuthority: "none_activation_cold_readback_required" as const,
    humanApprovalAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  const result = Object.freeze({
    ...body,
    indexFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_EPISODE_ERROR_GUIDANCE_RELEASE_INDEX_MAX_BYTES_V1
  )
    fail("oversize");
  handles.add(result);
  return result;
}

export function isV2EpisodeErrorGuidanceReleaseIndexV1(
  value: unknown,
): value is V2EpisodeErrorGuidanceReleaseIndexV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function encodeV2EpisodeErrorGuidanceReleaseIndexV1(
  value: V2EpisodeErrorGuidanceReleaseIndexV1,
): string {
  if (!handles.has(value)) fail("handle_invalid");
  return canonicalJsonV1(value);
}

export function parseV2EpisodeErrorGuidanceReleaseIndexV1(input: {
  readonly raw: string;
  readonly catalogRaw: string;
  readonly learnerProjectionRaw: string;
}): V2EpisodeErrorGuidanceReleaseIndexV1 {
  if (
    !record(input) ||
    typeof input.raw !== "string" ||
    input.raw.length < 2 ||
    input.raw.length > V2_EPISODE_ERROR_GUIDANCE_RELEASE_INDEX_MAX_BYTES_V1 ||
    utf8ByteLengthV1(input.raw) >
      V2_EPISODE_ERROR_GUIDANCE_RELEASE_INDEX_MAX_BYTES_V1
  )
    fail("parse_invalid");
  let decoded: unknown;
  try {
    decoded = JSON.parse(input.raw);
  } catch {
    fail("parse_invalid");
  }
  preflightJson(decoded);
  if (!record(decoded) || canonicalJsonV1(decoded) !== input.raw)
    fail("parse_invalid");
  const rebuilt = materializeV2EpisodeErrorGuidanceReleaseIndexV1({
    planFingerprint: decoded.planFingerprint as string,
    courseContractFingerprint: decoded.courseContractFingerprint as string,
    stageId: decoded.stageId as string,
    episodeId: decoded.episodeId as string,
    episodeOrdinal: decoded.episodeOrdinal as number,
    activityAssemblyFingerprint: decoded.activityAssemblyFingerprint as string,
    activityPackageFingerprint: decoded.activityPackageFingerprint as string,
    catalogRaw: input.catalogRaw,
    catalogObject: decoded.catalogObject as V2RepositoryImmutableObjectPinV1,
    learnerProjectionRaw: input.learnerProjectionRaw,
    learnerProjectionObject:
      decoded.learnerProjectionObject as V2RepositoryImmutableObjectPinV1,
  });
  if (canonicalJsonV1(rebuilt) !== input.raw) fail("parse_mismatch");
  return rebuilt;
}

export function v2EpisodeErrorGuidanceReleaseIndexObjectPathV1(input: {
  readonly planFingerprint: string;
  readonly episodeId: string;
  readonly indexFingerprint: string;
  readonly rawHash: string;
}): string {
  if (!record(input)) fail("path_invalid");
  exactKeys(input, [
    "planFingerprint",
    "episodeId",
    "indexFingerprint",
    "rawHash",
  ]);
  const planFingerprint = exactIdentity(input.planFingerprint, "hash");
  const episodeId = exactIdentity(input.episodeId, "id");
  const indexFingerprint = exactIdentity(input.indexFingerprint, "hash");
  const contentHash = exactIdentity(input.rawHash, "hash");
  return `learning-v2/error-guidance/index/${planFingerprint}/${episodeCoordinate(episodeId)}/${indexFingerprint}/${contentHash}.json`;
}
