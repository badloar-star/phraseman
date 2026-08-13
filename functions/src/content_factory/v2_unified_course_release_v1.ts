import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { LEARNING_V2_INTERFACE_LOCALES } from "../../../modules/learning-v2/content/generator_course_contract";
import type { V2RepositoryImmutableObjectPinV1 } from "./v2_firebase_repository_persistence_v1";

export const V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V1 =
  "v2-unified-course-release-root.v1" as const;
export const V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V1 =
  "v2-unified-course-release-head.v1" as const;
export const V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1 = 512 * 1024;
export const V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V1 = 32 * 1024;
export const V2_UNIFIED_COURSE_RELEASE_EPISODE_COUNT_V1 = 32;

export interface V2UnifiedCourseReleaseEpisodeV1 {
  readonly episodeOrdinal: number;
  readonly episodeId: string;
  readonly stageId: string;
  readonly activityAssemblyFingerprint: string;
  readonly activityPackageFingerprint: string;
  readonly ownerInputFingerprint: string;
  readonly ownerConfirmationFingerprint: string;
  readonly ownerConfirmationObject: V2RepositoryImmutableObjectPinV1;
  readonly learnerCoreIndexFingerprint: string;
  readonly learnerCoreIndexObject: V2RepositoryImmutableObjectPinV1;
  readonly serverEvaluatorIndexFingerprint: string;
  readonly serverEvaluatorIndexObject: V2RepositoryImmutableObjectPinV1;
  readonly auxiliaryIndexFingerprint: string;
  readonly auxiliaryIndexObject: V2RepositoryImmutableObjectPinV1;
  readonly voiceAudioIndexFingerprint: string;
  readonly voiceAudioIndexObject: V2RepositoryImmutableObjectPinV1;
  readonly localizationIndexFingerprint: string;
  readonly localizationIndexObject: V2RepositoryImmutableObjectPinV1;
  readonly errorGuidanceIndexFingerprint: string;
  readonly errorGuidanceIndexObject: V2RepositoryImmutableObjectPinV1;
  readonly episodeReleaseFingerprint: string;
}

export interface V2UnifiedCourseReleaseRootV1 {
  readonly schemaVersion: typeof V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V1;
  readonly environment: "lab" | "staging" | "production";
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly seasonId: string;
  readonly targetLanguage: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly interfaceLocales: readonly string[];
  readonly contentClass: "production_candidate" | "neutral_test_fixture";
  readonly releaseScope: "vertical_slice" | "full_season";
  readonly rollout: Readonly<{
    revision: number;
    state: "internal" | "rolling_out" | "live" | "paused";
    percent: 0 | 1 | 5 | 10 | 25 | 50 | 100;
    cohortSaltVersion: number;
    allowlistCohortIds: readonly string[];
    excludeCohortIds: readonly string[];
  }>;
  readonly episodes: readonly V2UnifiedCourseReleaseEpisodeV1[];
  readonly episodeCount: number;
  readonly ownerConfirmationAggregate: string;
  readonly learnerCoreAggregate: string;
  readonly serverEvaluatorAggregate: string;
  readonly auxiliaryAggregate: string;
  readonly voiceAudioAggregate: string;
  readonly localizationAggregate: string;
  readonly errorGuidanceAggregate: string;
  readonly inventoryAggregate: string;
  readonly inventoryEvidence: "immutable_generation_hash_size_content_type_pins";
  readonly ownerContentAuthority: "none_structural_confirmation_pins_only";
  readonly machineValidationAuthority: "structural_inventory_join_only";
  readonly humanApprovalAuthority: "none_activation_confirmation_required";
  readonly publicationDecisionAuthority: "none";
  readonly executionAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly rootFingerprint: string;
}

export interface V2UnifiedCourseReleaseHeadV1 {
  readonly schemaVersion: typeof V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V1;
  readonly environment: "lab" | "staging" | "production";
  readonly seasonId: string;
  readonly targetLanguage: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly activeReleaseId: string;
  readonly activeRootFingerprint: string;
  readonly activeRootObject: V2RepositoryImmutableObjectPinV1;
  readonly previousReleaseId: string | null;
  readonly previousRootFingerprint: string | null;
  readonly previousRootObject: V2RepositoryImmutableObjectPinV1 | null;
  readonly operationRevision: number;
  readonly state: "live" | "rolled_back";
  readonly operationId: string;
  readonly operationFingerprint: string;
  readonly updatedAtIso: string;
  readonly headAuthority: "none_server_cas_and_readback_required";
  readonly runtimeConsumer: false;
  readonly releaseAuthority: false;
  readonly headFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const LOCALE_RE = /^[a-z]{2,8}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|[0-9]{3}))?$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const CONTENT_TYPE = "application/json; charset=utf-8";
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const rootHandles = new WeakSet<object>();
const headHandles = new WeakSet<object>();

const EPISODE_KEYS = Object.freeze([
  "episodeOrdinal",
  "episodeId",
  "stageId",
  "activityAssemblyFingerprint",
  "activityPackageFingerprint",
  "ownerInputFingerprint",
  "ownerConfirmationFingerprint",
  "ownerConfirmationObject",
  "learnerCoreIndexFingerprint",
  "learnerCoreIndexObject",
  "serverEvaluatorIndexFingerprint",
  "serverEvaluatorIndexObject",
  "auxiliaryIndexFingerprint",
  "auxiliaryIndexObject",
  "voiceAudioIndexFingerprint",
  "voiceAudioIndexObject",
  "localizationIndexFingerprint",
  "localizationIndexObject",
  "errorGuidanceIndexFingerprint",
  "errorGuidanceIndexObject",
  "episodeReleaseFingerprint",
] as const);
const PIN_KEYS = Object.freeze([
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
] as const);
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "environment",
  "releaseId",
  "activeManifestHash",
  "planFingerprint",
  "courseContractFingerprint",
  "seasonId",
  "targetLanguage",
  "studyTarget",
  "learnerSourceLocale",
  "interfaceLocales",
  "contentClass",
  "releaseScope",
  "rollout",
  "episodes",
  "episodeCount",
  "ownerConfirmationAggregate",
  "learnerCoreAggregate",
  "serverEvaluatorAggregate",
  "auxiliaryAggregate",
  "voiceAudioAggregate",
  "localizationAggregate",
  "errorGuidanceAggregate",
  "inventoryAggregate",
  "inventoryEvidence",
  "ownerContentAuthority",
  "machineValidationAuthority",
  "humanApprovalAuthority",
  "publicationDecisionAuthority",
  "executionAuthority",
  "runtimeConsumer",
  "releaseEligible",
  "releaseAuthority",
  "rootFingerprint",
] as const);
const HEAD_KEYS = Object.freeze([
  "schemaVersion",
  "environment",
  "seasonId",
  "targetLanguage",
  "studyTarget",
  "learnerSourceLocale",
  "activeReleaseId",
  "activeRootFingerprint",
  "activeRootObject",
  "previousReleaseId",
  "previousRootFingerprint",
  "previousRootObject",
  "operationRevision",
  "state",
  "operationId",
  "operationFingerprint",
  "updatedAtIso",
  "headAuthority",
  "runtimeConsumer",
  "releaseAuthority",
  "headFingerprint",
] as const);

function fail(code = "invalid"): never {
  throw new Error(`v2_unified_course_release_${code}`);
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
  keys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  )
    fail();
}

function exactHash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

function exactId(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value)) fail();
  return value;
}

function exactIso(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) ||
    new Date(value).toISOString() !== value
  )
    fail();
  return value;
}

function exactPin(value: unknown): V2RepositoryImmutableObjectPinV1 {
  if (!record(value)) fail();
  exactKeys(value, PIN_KEYS);
  if (
    typeof value.objectPath !== "string" ||
    value.objectPath.length > 600 ||
    value.objectPath.startsWith("/") ||
    value.objectPath.includes("..") ||
    value.objectPath.includes("\\") ||
    /%2f|%5c/iu.test(value.objectPath) ||
    !GENERATION_RE.test(String(value.objectGeneration)) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1 ||
    Number(value.byteSize) > 24 * 1024 * 1024 ||
    value.contentType !== CONTENT_TYPE
  )
    fail();
  exactHash(value.contentHash);
  return Object.freeze({
    objectPath: value.objectPath,
    contentHash: value.contentHash,
    objectGeneration: value.objectGeneration,
    byteSize: value.byteSize,
    contentType: CONTENT_TYPE,
  }) as V2RepositoryImmutableObjectPinV1;
}

function preflight(value: unknown): void {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  while (stack.length) {
    const current = stack.pop()!;
    if (++nodes > 20_000 || current.depth > 24) fail();
    if (
      typeof current.value === "number" &&
      (!Number.isFinite(current.value) ||
        Object.is(current.value, -0) ||
        (Number.isInteger(current.value) &&
          !Number.isSafeInteger(current.value)))
    )
      fail();
    if (
      typeof current.value === "string" &&
      (current.value.length > 20_000 ||
        current.value.normalize("NFC") !== current.value ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(
          current.value,
        ))
    )
      fail();
    if (Array.isArray(current.value)) {
      if (current.value.length > 256) fail();
      for (const child of current.value)
        stack.push({ value: child, depth: current.depth + 1 });
    } else if (record(current.value)) {
      const entries = Object.entries(current.value);
      if (entries.length > 64 || entries.some(([key]) => RESERVED.has(key)))
        fail();
      for (const [, child] of entries)
        stack.push({ value: child, depth: current.depth + 1 });
    } else if (
      current.value !== null &&
      !["string", "number", "boolean"].includes(typeof current.value)
    )
      fail();
  }
}

function episodeBody(
  value: unknown,
  expectedOrdinal: number,
): V2UnifiedCourseReleaseEpisodeV1 {
  if (!record(value)) fail();
  exactKeys(value, EPISODE_KEYS);
  if (value.episodeOrdinal !== expectedOrdinal) fail("episode_order_invalid");
  const body = {
    episodeOrdinal: expectedOrdinal,
    episodeId: exactId(value.episodeId),
    stageId: exactId(value.stageId),
    activityAssemblyFingerprint: exactHash(value.activityAssemblyFingerprint),
    activityPackageFingerprint: exactHash(value.activityPackageFingerprint),
    ownerInputFingerprint: exactHash(value.ownerInputFingerprint),
    ownerConfirmationFingerprint: exactHash(value.ownerConfirmationFingerprint),
    ownerConfirmationObject: exactPin(value.ownerConfirmationObject),
    learnerCoreIndexFingerprint: exactHash(value.learnerCoreIndexFingerprint),
    learnerCoreIndexObject: exactPin(value.learnerCoreIndexObject),
    serverEvaluatorIndexFingerprint: exactHash(
      value.serverEvaluatorIndexFingerprint,
    ),
    serverEvaluatorIndexObject: exactPin(value.serverEvaluatorIndexObject),
    auxiliaryIndexFingerprint: exactHash(value.auxiliaryIndexFingerprint),
    auxiliaryIndexObject: exactPin(value.auxiliaryIndexObject),
    voiceAudioIndexFingerprint: exactHash(value.voiceAudioIndexFingerprint),
    voiceAudioIndexObject: exactPin(value.voiceAudioIndexObject),
    localizationIndexFingerprint: exactHash(value.localizationIndexFingerprint),
    localizationIndexObject: exactPin(value.localizationIndexObject),
    errorGuidanceIndexFingerprint: exactHash(
      value.errorGuidanceIndexFingerprint,
    ),
    errorGuidanceIndexObject: exactPin(value.errorGuidanceIndexObject),
  };
  if (value.episodeReleaseFingerprint !== hashCanonicalBody(body))
    fail("episode_fingerprint_mismatch");
  return Object.freeze({
    ...body,
    episodeReleaseFingerprint: value.episodeReleaseFingerprint,
  });
}

function aggregate(
  episodes: readonly V2UnifiedCourseReleaseEpisodeV1[],
  key: keyof V2UnifiedCourseReleaseEpisodeV1,
): string {
  return hashCanonicalBody(
    episodes.map((episode) => ({
      episodeOrdinal: episode.episodeOrdinal,
      value: episode[key],
    })),
  );
}

export function materializeV2UnifiedCourseReleaseRootV1(input: {
  readonly environment: "lab" | "staging" | "production";
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly seasonId: string;
  readonly targetLanguage: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly interfaceLocales: readonly string[];
  readonly contentClass: "production_candidate" | "neutral_test_fixture";
  readonly releaseScope: "vertical_slice" | "full_season";
  readonly rollout: V2UnifiedCourseReleaseRootV1["rollout"];
  readonly episodes: readonly Omit<
    V2UnifiedCourseReleaseEpisodeV1,
    "episodeReleaseFingerprint"
  >[];
}): V2UnifiedCourseReleaseRootV1 {
  if (!record(input)) fail();
  const expectedCount = input.releaseScope === "full_season" ? 32 : 1;
  if (
    !Array.isArray(input.episodes) ||
    input.episodes.length !== expectedCount ||
    !["lab", "staging", "production"].includes(input.environment) ||
    !["vertical_slice", "full_season"].includes(input.releaseScope) ||
    (input.environment === "production" &&
      (input.releaseScope !== "full_season" ||
        input.contentClass !== "production_candidate")) ||
    (input.environment !== "production" &&
      input.contentClass !== "neutral_test_fixture")
  )
    fail("scope_invalid");
  const seen = new Set<string>();
  const episodes = input.episodes.map((episode, index) => {
    const body = { ...episode } as Record<string, unknown>;
    const parsed = episodeBody(
      { ...body, episodeReleaseFingerprint: hashCanonicalBody(body) },
      index + 1,
    );
    if (seen.has(parsed.episodeId) || seen.has(parsed.stageId))
      fail("episode_identity_duplicate");
    seen.add(parsed.episodeId);
    seen.add(parsed.stageId);
    return parsed;
  });
  const locales = [...input.interfaceLocales];
  if (
    !LOCALE_RE.test(input.targetLanguage) ||
    !LOCALE_RE.test(input.studyTarget) ||
    !LOCALE_RE.test(input.learnerSourceLocale) ||
    locales.length !== LEARNING_V2_INTERFACE_LOCALES.length ||
    locales.some(
      (locale, index) =>
        !LOCALE_RE.test(locale) ||
        locale !== LEARNING_V2_INTERFACE_LOCALES[index],
    )
  )
    fail("locale_invalid");
  const rollout = input.rollout;
  if (
    !record(rollout) ||
    !Number.isSafeInteger(rollout.revision) ||
    rollout.revision < 1 ||
    !["internal", "rolling_out", "live", "paused"].includes(rollout.state) ||
    ![0, 1, 5, 10, 25, 50, 100].includes(rollout.percent) ||
    !Number.isSafeInteger(rollout.cohortSaltVersion) ||
    rollout.cohortSaltVersion < 1 ||
    !Array.isArray(rollout.allowlistCohortIds) ||
    !Array.isArray(rollout.excludeCohortIds) ||
    [...rollout.allowlistCohortIds, ...rollout.excludeCohortIds].some(
      (value) => typeof value !== "string" || !HASH_RE.test(value),
    ) ||
    new Set(rollout.allowlistCohortIds).size !==
      rollout.allowlistCohortIds.length ||
    new Set(rollout.excludeCohortIds).size !==
      rollout.excludeCohortIds.length ||
    rollout.allowlistCohortIds.some(
      (value, index) =>
        index > 0 && rollout.allowlistCohortIds[index - 1]! >= value,
    ) ||
    rollout.excludeCohortIds.some(
      (value, index) =>
        index > 0 && rollout.excludeCohortIds[index - 1]! >= value,
    ) ||
    rollout.allowlistCohortIds.some((value) =>
      rollout.excludeCohortIds.includes(value),
    )
  )
    fail("rollout_invalid");
  const aggregates = {
    ownerConfirmationAggregate: aggregate(
      episodes,
      "ownerConfirmationFingerprint",
    ),
    learnerCoreAggregate: aggregate(episodes, "learnerCoreIndexFingerprint"),
    serverEvaluatorAggregate: aggregate(
      episodes,
      "serverEvaluatorIndexFingerprint",
    ),
    auxiliaryAggregate: aggregate(episodes, "auxiliaryIndexFingerprint"),
    voiceAudioAggregate: aggregate(episodes, "voiceAudioIndexFingerprint"),
    localizationAggregate: aggregate(episodes, "localizationIndexFingerprint"),
    errorGuidanceAggregate: aggregate(
      episodes,
      "errorGuidanceIndexFingerprint",
    ),
  };
  const body = {
    schemaVersion: V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V1,
    environment: input.environment,
    releaseId: exactId(input.releaseId),
    activeManifestHash: exactHash(input.activeManifestHash),
    planFingerprint: exactHash(input.planFingerprint),
    courseContractFingerprint: exactHash(input.courseContractFingerprint),
    seasonId: exactId(input.seasonId),
    targetLanguage: input.targetLanguage,
    studyTarget: input.studyTarget,
    learnerSourceLocale: input.learnerSourceLocale,
    interfaceLocales: Object.freeze(locales),
    contentClass: input.contentClass,
    releaseScope: input.releaseScope,
    rollout: Object.freeze({
      ...rollout,
      allowlistCohortIds: Object.freeze([...rollout.allowlistCohortIds]),
      excludeCohortIds: Object.freeze([...rollout.excludeCohortIds]),
    }),
    episodes: Object.freeze(episodes),
    episodeCount: episodes.length,
    ...aggregates,
    inventoryAggregate: hashCanonicalBody(episodes),
    inventoryEvidence:
      "immutable_generation_hash_size_content_type_pins" as const,
    ownerContentAuthority: "none_structural_confirmation_pins_only" as const,
    machineValidationAuthority: "structural_inventory_join_only" as const,
    humanApprovalAuthority: "none_activation_confirmation_required" as const,
    publicationDecisionAuthority: "none" as const,
    executionAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const root = Object.freeze({
    ...body,
    rootFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(root)) >
    V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1
  )
    fail("oversize");
  rootHandles.add(root);
  return root;
}

export function parseV2UnifiedCourseReleaseRootV1(
  raw: string,
): V2UnifiedCourseReleaseRootV1 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  preflight(value);
  if (!record(value) || canonicalJsonV1(value) !== raw) fail();
  exactKeys(value, ROOT_KEYS);
  if (
    value.schemaVersion !== V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V1 ||
    !Array.isArray(value.episodes) ||
    value.episodeCount !== value.episodes.length
  )
    fail();
  const expectedCount =
    value.releaseScope === "full_season"
      ? 32
      : value.releaseScope === "vertical_slice"
        ? 1
        : 0;
  if (value.episodes.length !== expectedCount) fail();
  const episodes = value.episodes.map((episode, index) =>
    episodeBody(episode, index + 1),
  );
  const rebuilt = materializeV2UnifiedCourseReleaseRootV1({
    environment: value.environment as "lab" | "staging" | "production",
    releaseId: value.releaseId as string,
    activeManifestHash: value.activeManifestHash as string,
    planFingerprint: value.planFingerprint as string,
    courseContractFingerprint: value.courseContractFingerprint as string,
    seasonId: value.seasonId as string,
    targetLanguage: value.targetLanguage as string,
    studyTarget: value.studyTarget as string,
    learnerSourceLocale: value.learnerSourceLocale as string,
    interfaceLocales: value.interfaceLocales as string[],
    contentClass: value.contentClass as
      | "production_candidate"
      | "neutral_test_fixture",
    releaseScope: value.releaseScope as "vertical_slice" | "full_season",
    rollout: value.rollout as V2UnifiedCourseReleaseRootV1["rollout"],
    episodes: episodes.map(
      ({ episodeReleaseFingerprint: _ignored, ...episode }) => episode,
    ),
  });
  if (canonicalJsonV1(rebuilt) !== raw) fail();
  return rebuilt;
}

export function isV2UnifiedCourseReleaseRootV1(
  value: unknown,
): value is V2UnifiedCourseReleaseRootV1 {
  return record(value) && rootHandles.has(value);
}

export function decideV2UnifiedCourseReleaseHeadV1(input: {
  readonly current: V2UnifiedCourseReleaseHeadV1 | null;
  readonly target: V2UnifiedCourseReleaseRootV1;
  readonly targetObject: V2RepositoryImmutableObjectPinV1;
  readonly action: "activate" | "rollback";
  readonly expectedRevision: number;
  readonly operationId: string;
  readonly updatedAtIso: string;
}): Readonly<{
  kind: "commit" | "exact_replay";
  head: V2UnifiedCourseReleaseHeadV1;
}> {
  if (
    !isV2UnifiedCourseReleaseRootV1(input.target) ||
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0
  )
    fail("head_invalid");
  const targetObject = exactPin(input.targetObject);
  const operationId = exactId(input.operationId);
  const operationFingerprint = hashCanonicalBody({
    action: input.action,
    operationId,
    targetRootFingerprint: input.target.rootFingerprint,
    targetObject,
    expectedRevision: input.expectedRevision,
  });
  if (
    input.current &&
    headHandles.has(input.current) &&
    input.current.operationFingerprint === operationFingerprint
  )
    return Object.freeze({ kind: "exact_replay", head: input.current });
  if ((input.current?.operationRevision ?? 0) !== input.expectedRevision)
    fail("head_conflict");
  if (
    input.current &&
    (input.current.environment !== input.target.environment ||
      input.current.seasonId !== input.target.seasonId ||
      input.current.targetLanguage !== input.target.targetLanguage ||
      input.current.studyTarget !== input.target.studyTarget ||
      input.current.learnerSourceLocale !== input.target.learnerSourceLocale)
  )
    fail("head_scope_mismatch");
  if (
    input.current &&
    input.current.activeRootFingerprint === input.target.rootFingerprint
  )
    fail("head_same_release");
  if (
    input.current &&
    input.current.activeReleaseId === input.target.releaseId &&
    input.current.activeRootFingerprint !== input.target.rootFingerprint
  )
    fail("release_identity_conflict");
  if (
    input.action === "rollback" &&
    (!input.current ||
      input.current.previousRootFingerprint !== input.target.rootFingerprint ||
      input.current.previousReleaseId !== input.target.releaseId ||
      canonicalJsonV1(input.current.previousRootObject) !==
        canonicalJsonV1(targetObject))
  )
    fail("rollback_target_invalid");
  if (
    input.action === "activate" &&
    input.current?.state === "rolled_back" &&
    input.current.previousRootFingerprint === input.target.rootFingerprint
  )
    fail("head_immediate_reactivate_forbidden");
  const body = {
    schemaVersion: V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V1,
    environment: input.target.environment,
    seasonId: input.target.seasonId,
    targetLanguage: input.target.targetLanguage,
    studyTarget: input.target.studyTarget,
    learnerSourceLocale: input.target.learnerSourceLocale,
    activeReleaseId: input.target.releaseId,
    activeRootFingerprint: input.target.rootFingerprint,
    activeRootObject: targetObject,
    previousReleaseId: input.current?.activeReleaseId ?? null,
    previousRootFingerprint: input.current?.activeRootFingerprint ?? null,
    previousRootObject: input.current?.activeRootObject ?? null,
    operationRevision: input.expectedRevision + 1,
    state:
      input.action === "rollback"
        ? ("rolled_back" as const)
        : ("live" as const),
    operationId,
    operationFingerprint,
    updatedAtIso: exactIso(input.updatedAtIso),
    headAuthority: "none_server_cas_and_readback_required" as const,
    runtimeConsumer: false as const,
    releaseAuthority: false as const,
  };
  const head = Object.freeze({
    ...body,
    headFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(head)) >
    V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V1
  )
    fail("head_oversize");
  headHandles.add(head);
  return Object.freeze({ kind: "commit", head });
}

export function parseV2UnifiedCourseReleaseHeadV1(
  raw: string,
): V2UnifiedCourseReleaseHeadV1 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V1
  )
    fail("head_invalid");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail("head_invalid");
  }
  preflight(value);
  if (!record(value) || canonicalJsonV1(value) !== raw) fail("head_invalid");
  exactKeys(value, HEAD_KEYS);
  const { headFingerprint, ...body } = value;
  if (
    value.schemaVersion !== V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V1 ||
    !["lab", "staging", "production"].includes(String(value.environment)) ||
    !["live", "rolled_back"].includes(String(value.state)) ||
    !Number.isSafeInteger(value.operationRevision) ||
    Number(value.operationRevision) < 1 ||
    value.headAuthority !== "none_server_cas_and_readback_required" ||
    value.runtimeConsumer !== false ||
    value.releaseAuthority !== false ||
    headFingerprint !== hashCanonicalBody(body)
  )
    fail("head_invalid");
  exactId(value.seasonId);
  exactId(value.activeReleaseId);
  exactId(value.operationId);
  exactHash(value.activeRootFingerprint);
  exactHash(value.operationFingerprint);
  exactIso(value.updatedAtIso);
  const activeRootObject = exactPin(value.activeRootObject);
  const previousValues = [
    value.previousReleaseId,
    value.previousRootFingerprint,
    value.previousRootObject,
  ];
  if (
    !LOCALE_RE.test(String(value.targetLanguage)) ||
    !LOCALE_RE.test(String(value.studyTarget)) ||
    !LOCALE_RE.test(String(value.learnerSourceLocale)) ||
    (previousValues.some((item) => item === null) &&
      !previousValues.every((item) => item === null)) ||
    (value.previousReleaseId !== null &&
      (!ID_RE.test(String(value.previousReleaseId)) ||
        !HASH_RE.test(String(value.previousRootFingerprint))))
  )
    fail("head_invalid");
  const previousRootObject =
    value.previousRootObject === null
      ? null
      : exactPin(value.previousRootObject);
  const head = Object.freeze({
    ...value,
    activeRootObject,
    previousRootObject,
  }) as unknown as V2UnifiedCourseReleaseHeadV1;
  headHandles.add(head);
  return head;
}

export function isV2UnifiedCourseReleaseHeadV1(
  value: unknown,
): value is V2UnifiedCourseReleaseHeadV1 {
  return record(value) && headHandles.has(value);
}
