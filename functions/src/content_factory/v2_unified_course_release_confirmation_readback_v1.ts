import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1,
  parseV2OwnerEpisodeConfirmationV1,
} from "./v2_owner_episode_confirmation_v1";
import {
  materializeV2UnifiedCourseReleaseActivationPreflightV1,
  type V2UnifiedCourseReleaseActivationPreflightV1,
  type V2UnifiedCourseReleaseConfirmationReadbackV1,
} from "./v2_unified_course_release_activation_v1";
import {
  isV2UnifiedCourseReleaseRootV1,
  type V2UnifiedCourseReleaseRootV1,
} from "./v2_unified_course_release_v1";

export const V2_UNIFIED_COURSE_RELEASE_CONFIRMATION_READBACK_MAX_CONCURRENCY_V1 = 4;
export const V2_UNIFIED_COURSE_RELEASE_CONFIRMATION_READBACK_MAX_BYTES_V1 =
  32 * V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1;

const HASH_RE = /^[a-f0-9]{64}$/u;
const decoder = new TextDecoder("utf-8", { fatal: true });

function fail(code: string): never {
  throw new Error(`v2_unified_course_release_confirmation_${code}`);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function string(value: Record<string, unknown>, key: string): string {
  const found = value[key];
  if (typeof found !== "string") fail("raw_invalid");
  return found;
}

function hash(value: Record<string, unknown>, key: string): string {
  const found = string(value, key);
  if (!HASH_RE.test(found)) fail("raw_invalid");
  return found;
}

function preflight(root: V2UnifiedCourseReleaseRootV1): void {
  if (
    !isV2UnifiedCourseReleaseRootV1(root) ||
    root.environment !== "production" ||
    root.releaseScope !== "full_season" ||
    root.contentClass !== "production_candidate" ||
    root.episodes.length !== 32
  )
    fail("root_invalid");
  let total = 0;
  for (const episode of root.episodes) {
    const pin = episode.ownerConfirmationObject;
    if (
      pin.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1 ||
      !Number.isSafeInteger(pin.byteSize) ||
      pin.byteSize < 2 ||
      pin.byteSize > V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1
    )
      fail("pin_invalid");
    total += pin.byteSize;
  }
  if (
    !Number.isSafeInteger(total) ||
    total > V2_UNIFIED_COURSE_RELEASE_CONFIRMATION_READBACK_MAX_BYTES_V1
  )
    fail("aggregate_oversize");
}

async function readOne(input: {
  readonly root: V2UnifiedCourseReleaseRootV1;
  readonly index: number;
  readonly storage: V2RepositoryImmutableStoragePortV1;
}): Promise<V2UnifiedCourseReleaseConfirmationReadbackV1> {
  const episode = input.root.episodes[input.index];
  if (!episode) fail("episode_missing");
  const pin = episode.ownerConfirmationObject;
  const metadata = await input.storage.readMetadataExact(pin.objectPath);
  if (
    !metadata ||
    metadata.generation !== pin.objectGeneration ||
    metadata.contentHash !== pin.contentHash ||
    metadata.byteSize !== pin.byteSize ||
    metadata.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
  )
    fail("metadata_mismatch");
  const downloaded = await input.storage.downloadGenerationExact({
    objectPath: pin.objectPath,
    ifGenerationMatch: pin.objectGeneration,
    maximumBytes: V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1,
  });
  if (
    downloaded.kind !== "downloaded" ||
    downloaded.bytes.byteLength !== pin.byteSize ||
    createHash("sha256").update(downloaded.bytes).digest("hex") !==
      pin.contentHash
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
    fail("raw_invalid");
  }
  if (!record(decoded) || canonicalJsonV1(decoded) !== raw) fail("raw_invalid");
  const confirmation = parseV2OwnerEpisodeConfirmationV1(raw, {
    planFingerprint: input.root.planFingerprint,
    courseContractFingerprint: input.root.courseContractFingerprint,
    stageId: episode.stageId,
    episodeId: episode.episodeId,
    ownerInputFingerprint: episode.ownerInputFingerprint,
    activityAssemblyFingerprint: hash(decoded, "activityAssemblyFingerprint"),
    stageReviewFingerprint: hash(decoded, "stageReviewFingerprint"),
    ownerIdentityFingerprint: hash(decoded, "ownerIdentityFingerprint"),
    confirmedAtIso: string(decoded, "confirmedAtIso"),
    reason: string(decoded, "reason"),
    contentClass: "production_candidate",
  });
  if (
    confirmation.confirmationFingerprint !==
    episode.ownerConfirmationFingerprint
  )
    fail("subject_mismatch");
  return Object.freeze({
    episodeOrdinal: episode.episodeOrdinal,
    confirmation,
    confirmationObject: pin,
  });
}

export async function readbackV2UnifiedCourseReleaseConfirmationsV1(input: {
  readonly root: V2UnifiedCourseReleaseRootV1;
  readonly storage: V2RepositoryImmutableStoragePortV1;
}): Promise<V2UnifiedCourseReleaseActivationPreflightV1> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "root|storage"
  )
    fail("input_invalid");
  preflight(input.root);
  const confirmations = new Array<V2UnifiedCourseReleaseConfirmationReadbackV1>(
    32,
  );
  let nextIndex = 0;
  await Promise.all(
    Array.from(
      {
        length:
          V2_UNIFIED_COURSE_RELEASE_CONFIRMATION_READBACK_MAX_CONCURRENCY_V1,
      },
      async () => {
        while (true) {
          const index = nextIndex;
          nextIndex += 1;
          if (index >= 32) return;
          confirmations[index] = await readOne({
            root: input.root,
            index,
            storage: input.storage,
          });
        }
      },
    ),
  );
  return materializeV2UnifiedCourseReleaseActivationPreflightV1({
    root: input.root,
    confirmations,
  });
}
