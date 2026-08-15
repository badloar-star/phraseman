import { createHash } from "node:crypto";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const parsed = new Map<string, Record<string, unknown>>();
const root = Object.freeze({
  environment: "production",
  releaseId: "release-a",
  rootFingerprint: hash("root"),
  planFingerprint: hash("plan"),
  courseContractFingerprint: hash("course"),
  episodeCount: 32,
  episodes: Object.freeze(
    Array.from({ length: 32 }, (_, index) => {
      const ordinal = index + 1;
      const episodeId = `episode-${String(ordinal).padStart(2, "0")}`;
      const stageId = `stage-${String(ordinal).padStart(2, "0")}`;
      const packageFingerprint = hash(`package-${ordinal}`);
      const assemblyFingerprint = hash(`assembly-${ordinal}`);
      const kinds = [
        "learner_core",
        "server_evaluator",
        "auxiliary",
        "voice",
        "localization",
        "error_guidance",
      ] as const;
      const indexes = Object.fromEntries(
        kinds.map((kind) => {
          const raw = JSON.stringify({ episode: ordinal, kind });
          const indexFingerprint = hash(`${kind}-${ordinal}`);
          parsed.set(raw, {
            episodeId,
            stageId,
            activityStageId: stageId,
            activityPackageFingerprint: packageFingerprint,
            activityAssemblyFingerprint: assemblyFingerprint,
            indexFingerprint,
          });
          return [
            kind,
            {
              fingerprint: indexFingerprint,
              object: Object.freeze({
                objectPath: `learning-v2/fixture/${ordinal}/${kind}.json`,
                contentHash: hash(raw),
                objectGeneration: "7",
                byteSize: Buffer.byteLength(raw, "utf8"),
                contentType: "application/json; charset=utf-8" as const,
              }),
            },
          ];
        }),
      ) as unknown as Record<
        (typeof kinds)[number],
        { fingerprint: string; object: Record<string, unknown> }
      >;
      return Object.freeze({
        episodeOrdinal: ordinal,
        episodeId,
        stageId,
        activityAssemblyFingerprint: assemblyFingerprint,
        activityPackageFingerprint: packageFingerprint,
        learnerCoreIndexFingerprint: indexes.learner_core.fingerprint,
        learnerCoreIndexObject: indexes.learner_core.object,
        serverEvaluatorIndexFingerprint: indexes.server_evaluator.fingerprint,
        serverEvaluatorIndexObject: indexes.server_evaluator.object,
        auxiliaryIndexFingerprint: indexes.auxiliary.fingerprint,
        auxiliaryIndexObject: indexes.auxiliary.object,
        voiceAudioIndexFingerprint: indexes.voice.fingerprint,
        voiceAudioIndexObject: indexes.voice.object,
        localizationIndexFingerprint: indexes.localization.fingerprint,
        localizationIndexObject: indexes.localization.object,
        errorGuidanceIndexFingerprint: indexes.error_guidance.fingerprint,
        errorGuidanceIndexObject: indexes.error_guidance.object,
      });
    }),
  ),
});
const preflight = Object.freeze({ rootFingerprint: root.rootFingerprint });
const mockAcceptedRoots = new WeakSet<object>();
mockAcceptedRoots.add(root);

jest.mock("./v2_unified_course_release_v1", () => ({
  isV2UnifiedCourseReleaseRootV1: (value: unknown) =>
    typeof value === "object" && value !== null && mockAcceptedRoots.has(value),
}));
jest.mock("./v2_unified_course_release_activation_v1", () => ({
  isV2UnifiedCourseReleaseActivationPreflightV1: (value: unknown) =>
    value === preflight,
}));
jest.mock(
  "../../../modules/learning-v2/runtime/activity_learner_core_release_index_v1",
  () => ({
    LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1: 128 * 1024,
    parseLearningV2ActivityLearnerCoreReleaseIndexV1: (raw: string) =>
      parsed.get(raw),
  }),
);
jest.mock("./v2_activity_server_evaluator_release_v1", () => ({
  V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1: 128 * 1024,
  parseV2ActivityServerEvaluatorReleaseIndexV1: (raw: string) =>
    parsed.get(raw),
}));
jest.mock(
  "../../../modules/learning-v2/runtime/activity_auxiliary_release_index_v1",
  () => ({
    LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1: 256 * 1024,
    parseLearningV2ActivityAuxiliaryReleaseIndexV1: (raw: string) =>
      parsed.get(raw),
  }),
);
jest.mock("./v2_episode_voice_release_index_v1", () => ({
  V2_EPISODE_VOICE_RELEASE_INDEX_MAX_BYTES_V1: 2 * 1024 * 1024,
  parseV2EpisodeVoiceReleaseIndexAuditV1: (raw: string) => parsed.get(raw),
}));
jest.mock("./v2_episode_localization_release_index_v1", () => ({
  V2_EPISODE_LOCALIZATION_RELEASE_INDEX_MAX_BYTES_V1: 128 * 1024,
  parseV2EpisodeLocalizationReleaseIndexV1: (input: { raw: string }) =>
    parsed.get(input.raw),
}));
jest.mock("./v2_episode_error_guidance_release_index_v1", () => ({
  V2_EPISODE_ERROR_GUIDANCE_RELEASE_INDEX_MAX_BYTES_V1: 128 * 1024,
  parseV2EpisodeErrorGuidanceReleaseIndexV1: (input: { raw: string }) =>
    parsed.get(input.raw),
}));

/* eslint-disable import/first -- strict parsers and brands are isolated above */
import {
  isV2UnifiedCourseReleaseLeafReadbackV1,
  readbackV2UnifiedCourseReleaseLeavesV1,
} from "./v2_unified_course_release_leaf_readback_v1";
/* eslint-enable import/first */

function storage() {
  const raws = new Map(
    root.episodes.flatMap((episode) =>
      [
        episode.learnerCoreIndexObject,
        episode.serverEvaluatorIndexObject,
        episode.auxiliaryIndexObject,
        episode.voiceAudioIndexObject,
        episode.localizationIndexObject,
        episode.errorGuidanceIndexObject,
      ].map((pin) => {
        const found = [...parsed.keys()].find(
          (raw) => hash(raw) === pin.contentHash,
        )!;
        return [pin.objectPath, { pin, raw: found }] as const;
      }),
    ),
  );
  let metadataReads = 0;
  let downloads = 0;
  return {
    counters: () => ({ metadataReads, downloads }),
    port: {
      readMetadataExact: async (path: string) => {
        metadataReads += 1;
        const value = raws.get(path);
        return value
          ? {
              generation: value.pin.objectGeneration,
              contentHash: value.pin.contentHash,
              byteSize: value.pin.byteSize,
              contentType: value.pin.contentType,
            }
          : null;
      },
      downloadGenerationExact: async (input: {
        objectPath: string;
        ifGenerationMatch: string;
      }) => {
        downloads += 1;
        const value = raws.get(input.objectPath);
        return !value || value.pin.objectGeneration !== input.ifGenerationMatch
          ? { kind: "not_found" as const }
          : {
              kind: "downloaded" as const,
              bytes: new TextEncoder().encode(value.raw),
            };
      },
    },
  };
}

describe("V2 unified release leaf readback", () => {
  test("cold-reads and cross-binds all 192 indexes plus 32 confirmations", async () => {
    const server = storage();
    const result = await readbackV2UnifiedCourseReleaseLeavesV1({
      root: root as never,
      confirmationPreflight: preflight as never,
      storage: server.port as never,
      loadNested: async () => ({
        localeIndexRaws: Array.from({ length: 8 }, () => "{}"),
        errorCatalogRaw: "{}",
        errorLearnerProjectionRaw: "{}",
      }),
    });

    expect(isV2UnifiedCourseReleaseLeafReadbackV1(result)).toBe(true);
    expect(result).toMatchObject({
      episodeCount: 32,
      confirmationReadbackCount: 32,
      releaseIndexReadbackCount: 192,
      totalLeafReadbackCount: 224,
      classification: "eligible_for_private_root_owner_activation_adapter_only",
      semanticValidationAuthority:
        "strict_release_index_parsers_and_cross_leaf_identity_only",
      publicationDecisionAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(result.episodeReadbackFingerprints).toHaveLength(32);
    expect(server.counters()).toEqual({ metadataReads: 192, downloads: 192 });
    expect(isV2UnifiedCourseReleaseLeafReadbackV1({ ...result })).toBe(false);
  });

  test("fails closed on generation drift or cross-leaf package substitution", async () => {
    const first = root.episodes[0]!;
    const changedRoot = {
      ...root,
      episodes: [
        {
          ...first,
          learnerCoreIndexObject: {
            ...first.learnerCoreIndexObject,
            objectGeneration: "999",
          },
        },
        ...root.episodes.slice(1),
      ],
    };
    await expect(
      readbackV2UnifiedCourseReleaseLeavesV1({
        root: changedRoot as never,
        confirmationPreflight: preflight as never,
        storage: storage().port as never,
        loadNested: async () => ({
          localeIndexRaws: [],
          errorCatalogRaw: "{}",
          errorLearnerProjectionRaw: "{}",
        }),
      }),
    ).rejects.toThrow();

    const learnerRaw = JSON.stringify({ episode: 1, kind: "learner_core" });
    const original = parsed.get(learnerRaw)!;
    parsed.set(learnerRaw, {
      ...original,
      activityPackageFingerprint: hash("substitution"),
    });
    await expect(
      readbackV2UnifiedCourseReleaseLeavesV1({
        root: root as never,
        confirmationPreflight: preflight as never,
        storage: storage().port as never,
        loadNested: async () => ({
          localeIndexRaws: [],
          errorCatalogRaw: "{}",
          errorLearnerProjectionRaw: "{}",
        }),
      }),
    ).rejects.toThrow(
      "v2_unified_course_release_leaf_readback_cross_leaf_mismatch",
    );
    parsed.set(learnerRaw, original);
  });

  test("rejects deeply nested canonical-looking leaf JSON without overflowing the stack", async () => {
    const first = root.episodes[0]!;
    const deepRaw = `${'{"x":'.repeat(30)}0${"}".repeat(30)}`;
    const changedRoot = {
      ...root,
      episodes: [
        {
          ...first,
          learnerCoreIndexObject: {
            ...first.learnerCoreIndexObject,
            contentHash: hash(deepRaw),
            byteSize: Buffer.byteLength(deepRaw, "utf8"),
          },
        },
        ...root.episodes.slice(1),
      ],
    };
    mockAcceptedRoots.add(changedRoot);
    const server = storage();
    const originalReadMetadata = server.port.readMetadataExact;
    const originalDownload = server.port.downloadGenerationExact;
    await expect(
      readbackV2UnifiedCourseReleaseLeavesV1({
        root: changedRoot as never,
        confirmationPreflight: preflight as never,
        storage: {
          ...server.port,
          async readMetadataExact(path: string) {
            if (path === first.learnerCoreIndexObject.objectPath)
              return {
                generation: first.learnerCoreIndexObject.objectGeneration,
                contentHash: hash(deepRaw),
                byteSize: Buffer.byteLength(deepRaw, "utf8"),
                contentType: first.learnerCoreIndexObject.contentType,
              };
            return originalReadMetadata(path);
          },
          async downloadGenerationExact(input: {
            objectPath: string;
            ifGenerationMatch: string;
          }) {
            if (input.objectPath === first.learnerCoreIndexObject.objectPath)
              return {
                kind: "downloaded" as const,
                bytes: new TextEncoder().encode(deepRaw),
              };
            return originalDownload(input);
          },
        } as never,
        loadNested: async () => ({
          localeIndexRaws: [],
          errorCatalogRaw: "{}",
          errorLearnerProjectionRaw: "{}",
        }),
      }),
    ).rejects.toThrow("canonical_invalid");
  });
});
