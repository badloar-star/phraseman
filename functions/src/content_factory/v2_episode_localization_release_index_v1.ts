import { createHash } from "node:crypto";
import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from "../../../modules/learning-v2/content/generator_course_contract";
import { parseV2ExactLanguageTagV1 } from "../../../modules/learning-v2/contracts/language_tag_v1";
import {
  validateLearningV2EpisodeLocaleIndexV1,
  type LearningV2EpisodeLocaleIndexV1,
} from "../../../modules/learning-v2/content/generator_course_manifest";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  type V2RepositoryImmutableObjectPinV1,
} from "./v2_firebase_repository_persistence_v1";

export const V2_EPISODE_LOCALIZATION_RELEASE_INDEX_SCHEMA_V1 =
  "v2-episode-localization-release-index.v1" as const;
export const V2_EPISODE_LOCALIZATION_RELEASE_INDEX_MAX_BYTES_V1 = 128 * 1024;

export interface V2EpisodeLocalizationReleaseRowV1 {
  readonly locale: LearningV2InterfaceLocale;
  readonly generationInputAggregateFingerprint: string;
  readonly sessionAggregateFingerprint: string;
  readonly localeIndexFingerprint: string;
  readonly localeIndexObject: V2RepositoryImmutableObjectPinV1;
  readonly rowFingerprint: string;
}

export interface V2EpisodeLocalizationReleaseIndexV1 {
  readonly schemaVersion: typeof V2_EPISODE_LOCALIZATION_RELEASE_INDEX_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly episodeOrdinal: number;
  readonly packageId: string;
  readonly targetLanguage: string;
  readonly activityAssemblyFingerprint: string;
  readonly activityPackageFingerprint: string;
  readonly interfaceLocales: typeof LEARNING_V2_INTERFACE_LOCALES;
  readonly localeCount: 8;
  readonly locales: readonly V2EpisodeLocalizationReleaseRowV1[];
  readonly orderedLocaleAggregateFingerprint: string;
  readonly localizationBindingEvidence: "canonical_locale_indexes_server_readback_required";
  readonly repositoryOriginAuthority: "none_server_readback_required";
  readonly storageAuthority: "none_server_readback_required";
  readonly linguisticApprovalAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly indexFingerprint: string;
}

export interface V2EpisodeLocalizationReleaseMaterialV1 {
  readonly raw: string;
  readonly object: V2RepositoryImmutableObjectPinV1;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const handles = new WeakSet<object>();

function fail(code: string): never {
  throw new Error(`v2_episode_localization_release_index_${code}`);
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function preflightJson(value: unknown): void {
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  let arrayEntries = 0;
  while (pending.length > 0) {
    const current = pending.pop()!;
    nodes += 1;
    if (nodes > 20_000 || current.depth > 24) fail("json_complexity_invalid");
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
      arrayEntries += current.value.length;
      if (arrayEntries > 2_000) fail("json_complexity_invalid");
      current.value.forEach((child) =>
        pending.push({ value: child, depth: current.depth + 1 }),
      );
      continue;
    }
    if (!record(current.value)) fail("json_shape_invalid");
    const objectValue = current.value as Record<string, unknown>;
    const keys = Object.keys(objectValue);
    if (
      keys.length > 64 ||
      keys.some((key) => RESERVED.has(key) || key.normalize("NFC") !== key)
    )
      fail("json_shape_invalid");
    keys.forEach((key) =>
      pending.push({
        value: objectValue[key],
        depth: current.depth + 1,
      }),
    );
  }
}

function exactPin(
  value: V2RepositoryImmutableObjectPinV1,
): V2RepositoryImmutableObjectPinV1 {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).sort().join("|") !==
      "byteSize|contentHash|contentType|objectGeneration|objectPath" ||
    typeof value.objectPath !== "string" ||
    value.objectPath.length > 1_000 ||
    value.objectPath.startsWith("/") ||
    value.objectPath.includes("..") ||
    value.objectPath.includes("\\") ||
    /%2f|%5c/iu.test(value.objectPath) ||
    !HASH_RE.test(value.contentHash) ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    value.byteSize < 2 ||
    value.byteSize > 512 * 1024 ||
    value.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
  )
    fail("pin_invalid");
  return Object.freeze({ ...value });
}

function exactMaterial(input: {
  readonly expectedLocale: LearningV2InterfaceLocale;
  readonly packageId: string;
  readonly targetLanguage: string;
  readonly episodeOrdinal: number;
  readonly material: V2EpisodeLocalizationReleaseMaterialV1;
}): V2EpisodeLocalizationReleaseRowV1 {
  if (
    !record(input.material) ||
    Object.keys(input.material).sort().join("|") !== "object|raw"
  )
    fail("material_invalid");
  const pin = exactPin(input.material.object);
  if (
    typeof input.material.raw !== "string" ||
    input.material.raw.length < 2 ||
    input.material.raw.length > 512 * 1024 ||
    utf8ByteLengthV1(input.material.raw) !== pin.byteSize ||
    createHash("sha256").update(input.material.raw).digest("hex") !==
      pin.contentHash
  )
    fail("raw_invalid");
  let decoded: unknown;
  try {
    decoded = JSON.parse(input.material.raw);
  } catch {
    fail("raw_invalid");
  }
  preflightJson(decoded);
  if (canonicalJsonV1(decoded) !== input.material.raw) fail("raw_invalid");
  let index: LearningV2EpisodeLocaleIndexV1;
  try {
    index = validateLearningV2EpisodeLocaleIndexV1(
      decoded as LearningV2EpisodeLocaleIndexV1,
    );
  } catch {
    fail("locale_index_invalid");
  }
  if (
    index.packageId !== input.packageId ||
    index.targetLanguage !== input.targetLanguage ||
    index.episodeOrdinal !== input.episodeOrdinal ||
    index.locale !== input.expectedLocale ||
    pin.objectPath !==
      `learning-v2/course-packages/${input.packageId}/episodes/${String(input.episodeOrdinal).padStart(2, "0")}/${input.expectedLocale}/content.json`
  )
    fail("locale_subject_mismatch");
  const body = Object.freeze({
    locale: input.expectedLocale,
    generationInputAggregateFingerprint: hashCanonicalBody(
      index.sessionShards.map((row) =>
        Object.freeze({
          requiredSessionOrdinal: row.requiredSessionOrdinal,
          generationInputFingerprint: row.generationInputFingerprint,
        }),
      ),
    ),
    sessionAggregateFingerprint: index.sessionAggregateFingerprint,
    localeIndexFingerprint: hashCanonicalBody(index),
    localeIndexObject: pin,
  });
  return Object.freeze({ ...body, rowFingerprint: hashCanonicalBody(body) });
}

export function materializeV2EpisodeLocalizationReleaseIndexV1(input: {
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly episodeOrdinal: number;
  readonly packageId: string;
  readonly targetLanguage: string;
  readonly activityAssemblyFingerprint: string;
  readonly activityPackageFingerprint: string;
  readonly localeIndexes: readonly V2EpisodeLocalizationReleaseMaterialV1[];
}): V2EpisodeLocalizationReleaseIndexV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !==
      [
        "activityAssemblyFingerprint",
        "activityPackageFingerprint",
        "courseContractFingerprint",
        "episodeId",
        "episodeOrdinal",
        "localeIndexes",
        "packageId",
        "planFingerprint",
        "stageId",
        "targetLanguage",
      ]
        .sort()
        .join("|") ||
    !HASH_RE.test(input.planFingerprint) ||
    !HASH_RE.test(input.courseContractFingerprint) ||
    !HASH_RE.test(input.activityAssemblyFingerprint) ||
    !HASH_RE.test(input.activityPackageFingerprint) ||
    !TOKEN_RE.test(input.stageId) ||
    !TOKEN_RE.test(input.episodeId) ||
    !TOKEN_RE.test(input.packageId) ||
    parseV2ExactLanguageTagV1(input.targetLanguage) === null ||
    !Number.isSafeInteger(input.episodeOrdinal) ||
    input.episodeOrdinal < 1 ||
    input.episodeOrdinal > 32 ||
    !Array.isArray(input.localeIndexes) ||
    input.localeIndexes.length !== LEARNING_V2_INTERFACE_LOCALES.length
  )
    fail("input_invalid");
  const locales = Object.freeze(
    input.localeIndexes.map((material, index) =>
      exactMaterial({
        expectedLocale: LEARNING_V2_INTERFACE_LOCALES[index]!,
        packageId: input.packageId,
        targetLanguage: input.targetLanguage,
        episodeOrdinal: input.episodeOrdinal,
        material,
      }),
    ),
  );
  const body = Object.freeze({
    schemaVersion: V2_EPISODE_LOCALIZATION_RELEASE_INDEX_SCHEMA_V1,
    planFingerprint: input.planFingerprint,
    courseContractFingerprint: input.courseContractFingerprint,
    stageId: input.stageId,
    episodeId: input.episodeId,
    episodeOrdinal: input.episodeOrdinal,
    packageId: input.packageId,
    targetLanguage: input.targetLanguage,
    activityAssemblyFingerprint: input.activityAssemblyFingerprint,
    activityPackageFingerprint: input.activityPackageFingerprint,
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    localeCount: 8 as const,
    locales,
    orderedLocaleAggregateFingerprint: hashCanonicalBody(
      locales.map((locale) => locale.rowFingerprint),
    ),
    localizationBindingEvidence:
      "canonical_locale_indexes_server_readback_required" as const,
    repositoryOriginAuthority: "none_server_readback_required" as const,
    storageAuthority: "none_server_readback_required" as const,
    linguisticApprovalAuthority: "none" as const,
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
    V2_EPISODE_LOCALIZATION_RELEASE_INDEX_MAX_BYTES_V1
  )
    fail("oversize");
  handles.add(result);
  return result;
}

export function isV2EpisodeLocalizationReleaseIndexV1(
  value: unknown,
): value is V2EpisodeLocalizationReleaseIndexV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function encodeV2EpisodeLocalizationReleaseIndexV1(
  value: V2EpisodeLocalizationReleaseIndexV1,
): string {
  if (!handles.has(value)) fail("handle_invalid");
  return canonicalJsonV1(value);
}

export function parseV2EpisodeLocalizationReleaseIndexV1(input: {
  readonly raw: string;
  readonly localeIndexRaws: readonly string[];
}): V2EpisodeLocalizationReleaseIndexV1 {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !== "localeIndexRaws|raw" ||
    typeof input.raw !== "string" ||
    input.raw.length < 2 ||
    input.raw.length > V2_EPISODE_LOCALIZATION_RELEASE_INDEX_MAX_BYTES_V1 ||
    utf8ByteLengthV1(input.raw) >
      V2_EPISODE_LOCALIZATION_RELEASE_INDEX_MAX_BYTES_V1 ||
    !Array.isArray(input.localeIndexRaws) ||
    input.localeIndexRaws.length !== LEARNING_V2_INTERFACE_LOCALES.length
  )
    fail("parse_input_invalid");
  let decoded: unknown;
  try {
    decoded = JSON.parse(input.raw);
  } catch {
    fail("parse_input_invalid");
  }
  preflightJson(decoded);
  if (!record(decoded) || canonicalJsonV1(decoded) !== input.raw)
    fail("parse_input_invalid");
  const locales = decoded.locales;
  if (!Array.isArray(locales) || locales.length !== 8)
    fail("parse_input_invalid");
  const localeIndexes = locales.map((row, index) => {
    if (!record(row) || typeof input.localeIndexRaws[index] !== "string")
      fail("parse_input_invalid");
    return Object.freeze({
      raw: input.localeIndexRaws[index]!,
      object: exactPin(
        row.localeIndexObject as V2RepositoryImmutableObjectPinV1,
      ),
    });
  });
  const rebuilt = materializeV2EpisodeLocalizationReleaseIndexV1({
    planFingerprint: decoded.planFingerprint as string,
    courseContractFingerprint: decoded.courseContractFingerprint as string,
    stageId: decoded.stageId as string,
    episodeId: decoded.episodeId as string,
    episodeOrdinal: decoded.episodeOrdinal as number,
    packageId: decoded.packageId as string,
    targetLanguage: decoded.targetLanguage as string,
    activityAssemblyFingerprint: decoded.activityAssemblyFingerprint as string,
    activityPackageFingerprint: decoded.activityPackageFingerprint as string,
    localeIndexes,
  });
  if (canonicalJsonV1(rebuilt) !== input.raw) fail("parse_mismatch");
  return rebuilt;
}

export function v2EpisodeLocalizationReleaseIndexObjectPathV1(input: {
  readonly planFingerprint: string;
  readonly episodeId: string;
  readonly indexFingerprint: string;
  readonly rawHash: string;
}): string {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "episodeId|indexFingerprint|planFingerprint|rawHash" ||
    !HASH_RE.test(input.planFingerprint) ||
    !TOKEN_RE.test(input.episodeId) ||
    !HASH_RE.test(input.indexFingerprint) ||
    !HASH_RE.test(input.rawHash)
  )
    fail("path_input_invalid");
  const episodeCoordinate = createHash("sha256")
    .update(input.episodeId)
    .digest("hex");
  return `learning-v2/episode-localization-release-index/${input.planFingerprint}/${episodeCoordinate}/${input.indexFingerprint}/${input.rawHash}.json`;
}
