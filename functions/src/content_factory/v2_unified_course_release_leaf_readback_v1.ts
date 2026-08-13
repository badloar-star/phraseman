import { createHash } from "node:crypto";
import {
  LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1,
  parseLearningV2ActivityLearnerCoreReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/activity_learner_core_release_index_v1";
import {
  LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1,
  parseLearningV2ActivityAuxiliaryReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/activity_auxiliary_release_index_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1,
  parseV2ActivityServerEvaluatorReleaseIndexV1,
} from "./v2_activity_server_evaluator_release_v1";
import {
  V2_EPISODE_ERROR_GUIDANCE_RELEASE_INDEX_MAX_BYTES_V1,
  parseV2EpisodeErrorGuidanceReleaseIndexV1,
} from "./v2_episode_error_guidance_release_index_v1";
import {
  V2_EPISODE_LOCALIZATION_RELEASE_INDEX_MAX_BYTES_V1,
  parseV2EpisodeLocalizationReleaseIndexV1,
} from "./v2_episode_localization_release_index_v1";
import {
  V2_EPISODE_VOICE_RELEASE_INDEX_MAX_BYTES_V1,
  parseV2EpisodeVoiceReleaseIndexAuditV1,
} from "./v2_episode_voice_release_index_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  type V2RepositoryImmutableObjectPinV1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  isV2UnifiedCourseReleaseActivationPreflightV1,
  type V2UnifiedCourseReleaseActivationPreflightV1,
} from "./v2_unified_course_release_activation_v1";
import {
  isV2UnifiedCourseReleaseRootV1,
  type V2UnifiedCourseReleaseRootV1,
} from "./v2_unified_course_release_v1";

export const V2_UNIFIED_COURSE_RELEASE_LEAF_READBACK_SCHEMA_V1 =
  "v2-unified-course-release-leaf-readback.v1" as const;
export const V2_UNIFIED_COURSE_RELEASE_LEAF_READBACK_COUNT_V1 = 224 as const;
export const V2_UNIFIED_COURSE_RELEASE_LEAF_READBACK_MAX_CONCURRENCY_V1 = 4;

type LeafKind =
  | "learner_core"
  | "server_evaluator"
  | "auxiliary"
  | "voice"
  | "localization"
  | "error_guidance";

export interface V2UnifiedCourseReleaseLeafReadbackV1 {
  readonly schemaVersion: typeof V2_UNIFIED_COURSE_RELEASE_LEAF_READBACK_SCHEMA_V1;
  readonly releaseId: string;
  readonly rootFingerprint: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly episodeCount: 32;
  readonly confirmationReadbackCount: 32;
  readonly releaseIndexReadbackCount: 192;
  readonly totalLeafReadbackCount: 224;
  readonly episodeReadbackFingerprints: readonly string[];
  readonly leafReadbackAggregateFingerprint: string;
  readonly classification: "eligible_for_private_root_owner_activation_adapter_only";
  readonly repositoryOriginAuthority: "firebase_admin_exact_generation_hash_size_content_type_snapshot";
  readonly artifactStorageAuthority: "firebase_admin_exact_generation_hash_size_content_type_snapshot";
  readonly semanticValidationAuthority: "strict_release_index_parsers_and_cross_leaf_identity_only";
  readonly humanApprovalAuthority: "owner_confirmation_readback_only";
  readonly publicationDecisionAuthority: "none";
  readonly executionAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly readbackFingerprint: string;
}

export interface V2UnifiedCourseReleaseNestedRawMaterialV1 {
  readonly localeIndexRaws: readonly string[];
  readonly errorCatalogRaw: string;
  readonly errorLearnerProjectionRaw: string;
}

const handles = new WeakSet<object>();
const decoder = new TextDecoder("utf-8", { fatal: true });

function fail(code: string): never {
  throw new Error(`v2_unified_course_release_leaf_readback_${code}`);
}

function preflightJson(value: unknown): void {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (++nodes > 20_000 || current.depth > 24) fail("canonical_invalid");
    if (
      current.value === null ||
      typeof current.value === "boolean" ||
      typeof current.value === "string"
    )
      continue;
    if (typeof current.value === "number") {
      if (
        !Number.isFinite(current.value) ||
        Object.is(current.value, -0) ||
        (Number.isInteger(current.value) &&
          !Number.isSafeInteger(current.value))
      )
        fail("canonical_invalid");
      continue;
    }
    if (Array.isArray(current.value)) {
      if (current.value.length > 4_000) fail("canonical_invalid");
      current.value.forEach((child) =>
        stack.push({ value: child, depth: current.depth + 1 }),
      );
      continue;
    }
    if (
      typeof current.value !== "object" ||
      Object.getPrototypeOf(current.value) !== Object.prototype
    )
      fail("canonical_invalid");
    const objectValue = current.value as Record<string, unknown>;
    const keys = Object.keys(objectValue);
    if (keys.length > 128) fail("canonical_invalid");
    keys.forEach((key) =>
      stack.push({ value: objectValue[key], depth: current.depth + 1 }),
    );
  }
}

function maximum(kind: LeafKind): number {
  switch (kind) {
    case "learner_core":
      return LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1;
    case "server_evaluator":
      return V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1;
    case "auxiliary":
      return LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1;
    case "voice":
      return V2_EPISODE_VOICE_RELEASE_INDEX_MAX_BYTES_V1;
    case "localization":
      return V2_EPISODE_LOCALIZATION_RELEASE_INDEX_MAX_BYTES_V1;
    case "error_guidance":
      return V2_EPISODE_ERROR_GUIDANCE_RELEASE_INDEX_MAX_BYTES_V1;
  }
}

async function readRaw(input: {
  readonly storage: V2RepositoryImmutableStoragePortV1;
  readonly pin: V2RepositoryImmutableObjectPinV1;
  readonly maximumBytes: number;
}): Promise<string> {
  if (
    input.pin.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1 ||
    !Number.isSafeInteger(input.pin.byteSize) ||
    input.pin.byteSize < 2 ||
    input.pin.byteSize > input.maximumBytes
  )
    fail("pin_invalid");
  const metadata = await input.storage.readMetadataExact(input.pin.objectPath);
  if (
    !metadata ||
    metadata.generation !== input.pin.objectGeneration ||
    metadata.contentHash !== input.pin.contentHash ||
    metadata.byteSize !== input.pin.byteSize ||
    metadata.contentType !== input.pin.contentType
  )
    fail("metadata_mismatch");
  const downloaded = await input.storage.downloadGenerationExact({
    objectPath: input.pin.objectPath,
    ifGenerationMatch: input.pin.objectGeneration,
    maximumBytes: input.maximumBytes,
  });
  if (
    downloaded.kind !== "downloaded" ||
    downloaded.bytes.byteLength !== input.pin.byteSize ||
    createHash("sha256").update(downloaded.bytes).digest("hex") !==
      input.pin.contentHash
  )
    fail("bytes_mismatch");
  let raw: string;
  try {
    raw = decoder.decode(downloaded.bytes);
  } catch {
    fail("utf8_invalid");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    fail("canonical_invalid");
  }
  preflightJson(decoded);
  if (canonicalJsonV1(decoded) !== raw) fail("canonical_invalid");
  return raw;
}

export async function readbackV2UnifiedCourseReleaseLeavesV1(input: {
  readonly root: V2UnifiedCourseReleaseRootV1;
  readonly confirmationPreflight: V2UnifiedCourseReleaseActivationPreflightV1;
  readonly storage: V2RepositoryImmutableStoragePortV1;
  readonly loadNested: (input: {
    readonly episodeOrdinal: number;
    readonly episodeId: string;
    readonly localizationIndexRaw: string;
    readonly errorGuidanceIndexRaw: string;
  }) => Promise<V2UnifiedCourseReleaseNestedRawMaterialV1>;
}): Promise<V2UnifiedCourseReleaseLeafReadbackV1> {
  if (
    !isV2UnifiedCourseReleaseRootV1(input.root) ||
    !isV2UnifiedCourseReleaseActivationPreflightV1(
      input.confirmationPreflight,
    ) ||
    input.root.environment !== "production" ||
    input.root.episodeCount !== 32 ||
    input.confirmationPreflight.rootFingerprint !==
      input.root.rootFingerprint ||
    typeof input.loadNested !== "function"
  )
    fail("input_invalid");
  const rows = input.root.episodes.flatMap((episode) => [
    {
      episode,
      kind: "learner_core" as const,
      fingerprint: episode.learnerCoreIndexFingerprint,
      pin: episode.learnerCoreIndexObject,
    },
    {
      episode,
      kind: "server_evaluator" as const,
      fingerprint: episode.serverEvaluatorIndexFingerprint,
      pin: episode.serverEvaluatorIndexObject,
    },
    {
      episode,
      kind: "auxiliary" as const,
      fingerprint: episode.auxiliaryIndexFingerprint,
      pin: episode.auxiliaryIndexObject,
    },
    {
      episode,
      kind: "voice" as const,
      fingerprint: episode.voiceAudioIndexFingerprint,
      pin: episode.voiceAudioIndexObject,
    },
    {
      episode,
      kind: "localization" as const,
      fingerprint: episode.localizationIndexFingerprint,
      pin: episode.localizationIndexObject,
    },
    {
      episode,
      kind: "error_guidance" as const,
      fingerprint: episode.errorGuidanceIndexFingerprint,
      pin: episode.errorGuidanceIndexObject,
    },
  ]);
  const raws = new Array<string>(rows.length);
  let cursor = 0;
  await Promise.all(
    Array.from(
      { length: V2_UNIFIED_COURSE_RELEASE_LEAF_READBACK_MAX_CONCURRENCY_V1 },
      async () => {
        while (true) {
          const index = cursor++;
          if (index >= rows.length) return;
          const row = rows[index]!;
          raws[index] = await readRaw({
            storage: input.storage,
            pin: row.pin,
            maximumBytes: maximum(row.kind),
          });
        }
      },
    ),
  );
  const episodeReadbackFingerprints: string[] = [];
  for (let index = 0; index < input.root.episodes.length; index += 1) {
    const episode = input.root.episodes[index]!;
    const offset = index * 6;
    const learner = parseLearningV2ActivityLearnerCoreReleaseIndexV1(
      raws[offset]!,
    );
    const evaluator = parseV2ActivityServerEvaluatorReleaseIndexV1(
      raws[offset + 1]!,
    );
    const auxiliary = parseLearningV2ActivityAuxiliaryReleaseIndexV1(
      raws[offset + 2]!,
    );
    const voice = parseV2EpisodeVoiceReleaseIndexAuditV1(raws[offset + 3]!);
    const nested = await input.loadNested({
      episodeOrdinal: episode.episodeOrdinal,
      episodeId: episode.episodeId,
      localizationIndexRaw: raws[offset + 4]!,
      errorGuidanceIndexRaw: raws[offset + 5]!,
    });
    const localization = parseV2EpisodeLocalizationReleaseIndexV1({
      raw: raws[offset + 4]!,
      localeIndexRaws: nested.localeIndexRaws,
    });
    const guidance = parseV2EpisodeErrorGuidanceReleaseIndexV1({
      raw: raws[offset + 5]!,
      catalogRaw: nested.errorCatalogRaw,
      learnerProjectionRaw: nested.errorLearnerProjectionRaw,
    });
    if (
      [learner, evaluator, auxiliary, localization, guidance].some(
        (value) =>
          value.episodeId !== episode.episodeId ||
          value.stageId !== episode.stageId,
      ) ||
      voice.episodeId !== episode.episodeId ||
      voice.activityStageId !== episode.stageId ||
      [learner, evaluator, auxiliary, voice, localization, guidance].some(
        (value) =>
          value.activityPackageFingerprint !==
          episode.activityPackageFingerprint,
      ) ||
      voice.activityAssemblyFingerprint !==
        episode.activityAssemblyFingerprint ||
      localization.activityAssemblyFingerprint !==
        episode.activityAssemblyFingerprint ||
      guidance.activityAssemblyFingerprint !==
        episode.activityAssemblyFingerprint ||
      learner.indexFingerprint !== episode.learnerCoreIndexFingerprint ||
      evaluator.indexFingerprint !== episode.serverEvaluatorIndexFingerprint ||
      auxiliary.indexFingerprint !== episode.auxiliaryIndexFingerprint ||
      voice.indexFingerprint !== episode.voiceAudioIndexFingerprint ||
      localization.indexFingerprint !== episode.localizationIndexFingerprint ||
      guidance.indexFingerprint !== episode.errorGuidanceIndexFingerprint
    )
      fail("cross_leaf_mismatch");
    episodeReadbackFingerprints.push(
      hashCanonicalBody({
        episodeOrdinal: episode.episodeOrdinal,
        episodeId: episode.episodeId,
        activityAssemblyFingerprint: episode.activityAssemblyFingerprint,
        activityPackageFingerprint: episode.activityPackageFingerprint,
        learnerCoreIndexFingerprint: learner.indexFingerprint,
        serverEvaluatorIndexFingerprint: evaluator.indexFingerprint,
        auxiliaryIndexFingerprint: auxiliary.indexFingerprint,
        voiceAudioIndexFingerprint: voice.indexFingerprint,
        localizationIndexFingerprint: localization.indexFingerprint,
        errorGuidanceIndexFingerprint: guidance.indexFingerprint,
      }),
    );
  }
  const frozenRows = Object.freeze(episodeReadbackFingerprints);
  const body = Object.freeze({
    schemaVersion: V2_UNIFIED_COURSE_RELEASE_LEAF_READBACK_SCHEMA_V1,
    releaseId: input.root.releaseId,
    rootFingerprint: input.root.rootFingerprint,
    planFingerprint: input.root.planFingerprint,
    courseContractFingerprint: input.root.courseContractFingerprint,
    episodeCount: 32 as const,
    confirmationReadbackCount: 32 as const,
    releaseIndexReadbackCount: 192 as const,
    totalLeafReadbackCount: V2_UNIFIED_COURSE_RELEASE_LEAF_READBACK_COUNT_V1,
    episodeReadbackFingerprints: frozenRows,
    leafReadbackAggregateFingerprint: hashCanonicalBody(frozenRows),
    classification:
      "eligible_for_private_root_owner_activation_adapter_only" as const,
    repositoryOriginAuthority:
      "firebase_admin_exact_generation_hash_size_content_type_snapshot" as const,
    artifactStorageAuthority:
      "firebase_admin_exact_generation_hash_size_content_type_snapshot" as const,
    semanticValidationAuthority:
      "strict_release_index_parsers_and_cross_leaf_identity_only" as const,
    humanApprovalAuthority: "owner_confirmation_readback_only" as const,
    publicationDecisionAuthority: "none" as const,
    executionAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  const result = Object.freeze({
    ...body,
    readbackFingerprint: hashCanonicalBody(body),
  });
  handles.add(result);
  return result;
}

export function isV2UnifiedCourseReleaseLeafReadbackV1(
  value: unknown,
): value is V2UnifiedCourseReleaseLeafReadbackV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
