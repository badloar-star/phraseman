import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import type {
  V2RepositoryImmutableCreateResultV1,
  V2RepositoryImmutableObjectMetadataV1,
  V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import { materializeV2OwnerEpisodeConfirmationV1 } from "./v2_owner_episode_confirmation_v1";
import { isV2UnifiedCourseReleaseActivationPreflightV1 } from "./v2_unified_course_release_activation_v1";
import {
  readbackV2UnifiedCourseReleaseConfirmationsV1,
  V2_UNIFIED_COURSE_RELEASE_CONFIRMATION_READBACK_MAX_CONCURRENCY_V1,
} from "./v2_unified_course_release_confirmation_readback_v1";
import {
  materializeV2UnifiedCourseReleaseRootV1,
  type V2UnifiedCourseReleaseEpisodeV1,
} from "./v2_unified_course_release_v1";

const h = (value: string) => sha256Utf8(value);

function fixture() {
  const objects = new Map<
    string,
    { bytes: Uint8Array; metadata: V2RepositoryImmutableObjectMetadataV1 }
  >();
  const planFingerprint = h("plan");
  const courseContractFingerprint = h("course");
  const episodes = Array.from({ length: 32 }, (_, index) => {
    const ordinal = index + 1;
    const prefix = `e${ordinal}`;
    const confirmation = materializeV2OwnerEpisodeConfirmationV1({
      planFingerprint,
      courseContractFingerprint,
      stageId: `stage-${ordinal}`,
      episodeId: `episode-${ordinal}`,
      ownerInputFingerprint: h(`${prefix}-owner`),
      activityAssemblyFingerprint: h(`${prefix}-assembly`),
      stageReviewFingerprint: h(`${prefix}-review`),
      ownerIdentityFingerprint: h("owner"),
      confirmedAtIso: "2026-08-13T12:00:00.000Z",
      reason: `Owner confirms episode ${ordinal}.`,
      contentClass: "production_candidate",
    });
    const raw = canonicalJsonV1(confirmation);
    const bytes = new TextEncoder().encode(raw);
    const contentHash = createHash("sha256").update(bytes).digest("hex");
    const pin = {
      objectPath: `learning-v2/confirmation/${ordinal}/${contentHash}.json`,
      contentHash,
      objectGeneration: String(ordinal),
      byteSize: bytes.byteLength,
      contentType: "application/json; charset=utf-8" as const,
    };
    objects.set(pin.objectPath, {
      bytes,
      metadata: Object.freeze({
        generation: pin.objectGeneration,
        byteSize: pin.byteSize,
        contentType: pin.contentType,
        contentHash: pin.contentHash,
      }),
    });
    const row: Omit<
      V2UnifiedCourseReleaseEpisodeV1,
      "episodeReleaseFingerprint"
    > = {
      episodeOrdinal: ordinal,
      episodeId: confirmation.episodeId,
      stageId: confirmation.stageId,
      activityAssemblyFingerprint: confirmation.activityAssemblyFingerprint,
      activityPackageFingerprint: h(`${prefix}-package`),
      ownerInputFingerprint: confirmation.ownerInputFingerprint,
      ownerConfirmationFingerprint: confirmation.confirmationFingerprint,
      ownerConfirmationObject: pin,
      learnerCoreIndexFingerprint: h(`${prefix}-learner`),
      learnerCoreIndexObject: pin,
      serverEvaluatorIndexFingerprint: h(`${prefix}-evaluator`),
      serverEvaluatorIndexObject: pin,
      auxiliaryIndexFingerprint: h(`${prefix}-auxiliary`),
      auxiliaryIndexObject: pin,
      voiceAudioIndexFingerprint: h(`${prefix}-voice`),
      voiceAudioIndexObject: pin,
      localizationIndexFingerprint: h(`${prefix}-locale`),
      localizationIndexObject: pin,
      errorGuidanceIndexFingerprint: h(`${prefix}-errors`),
      errorGuidanceIndexObject: pin,
    };
    return row;
  });
  const root = materializeV2UnifiedCourseReleaseRootV1({
    environment: "production",
    releaseId: "release-a",
    activeManifestHash: h("manifest"),
    planFingerprint,
    courseContractFingerprint,
    seasonId: "season-1",
    targetLanguage: "en-US",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
    contentClass: "production_candidate",
    releaseScope: "full_season",
    rollout: {
      revision: 1,
      state: "internal",
      percent: 0,
      cohortSaltVersion: 1,
      allowlistCohortIds: [],
      excludeCohortIds: [],
    },
    episodes,
  });
  let active = 0;
  let maximumActive = 0;
  let reads = 0;
  const storage: V2RepositoryImmutableStoragePortV1 = {
    async readMetadataExact(path) {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      const result = objects.get(path)?.metadata ?? null;
      active -= 1;
      reads += 1;
      return result;
    },
    async downloadGenerationExact(input) {
      const object = objects.get(input.objectPath);
      if (!object) return Object.freeze({ kind: "not_found" as const });
      if (object.metadata.generation !== input.ifGenerationMatch)
        return Object.freeze({ kind: "generation_mismatch" as const });
      reads += 1;
      return Object.freeze({
        kind: "downloaded" as const,
        bytes: new Uint8Array(object.bytes),
      });
    },
    async createExact(): Promise<V2RepositoryImmutableCreateResultV1> {
      throw new Error("unexpected_write");
    },
    async quarantineConflict() {
      throw new Error("unexpected_write");
    },
  };
  return {
    root,
    objects,
    storage,
    counts: () => ({ reads, maximumActive }),
  };
}

describe("Learning V2 unified release owner-confirmation readback", () => {
  it("reads all exact generations with bounded concurrency and returns authority-none preflight", async () => {
    const state = fixture();
    const result = await readbackV2UnifiedCourseReleaseConfirmationsV1({
      root: state.root,
      storage: state.storage,
    });
    expect(isV2UnifiedCourseReleaseActivationPreflightV1(result)).toBe(true);
    expect(result).toMatchObject({
      confirmationReadbackCount: 32,
      classification: "eligible_for_server_exact_leaf_readback_only",
      artifactStorageAuthority: "none",
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(state.counts().reads).toBe(64);
    expect(state.counts().maximumActive).toBeLessThanOrEqual(
      V2_UNIFIED_COURSE_RELEASE_CONFIRMATION_READBACK_MAX_CONCURRENCY_V1,
    );
  });

  it.each(["generation", "hash", "size", "bytes"] as const)(
    "fails closed on %s drift",
    async (kind) => {
      const state = fixture();
      const episode = state.root.episodes[0]!;
      const object = state.objects.get(
        episode.ownerConfirmationObject.objectPath,
      )!;
      if (kind === "generation")
        object.metadata = { ...object.metadata, generation: "999" };
      if (kind === "hash")
        object.metadata = { ...object.metadata, contentHash: h("wrong") };
      if (kind === "size")
        object.metadata = { ...object.metadata, byteSize: 1 };
      if (kind === "bytes") object.bytes[object.bytes.length - 2] ^= 1;
      await expect(
        readbackV2UnifiedCourseReleaseConfirmationsV1({
          root: state.root,
          storage: state.storage,
        }),
      ).rejects.toThrow(
        kind === "bytes" ? "bytes_mismatch" : "metadata_mismatch",
      );
    },
  );
});
