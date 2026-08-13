import { createHash } from "node:crypto";

const parsedReleaseIndexes = new Map<string, Record<string, unknown>>();
const releasedSessionState = {
  descriptor: {} as Record<string, unknown>,
  summary: {} as Record<string, unknown>,
};

jest.mock(
  "../../../../modules/learning-v2/runtime/activity_learner_core_release_index_v1",
  () => ({
    LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1: 128 * 1024,
    parseLearningV2ActivityLearnerCoreReleaseIndexV1: (raw: string) =>
      parsedReleaseIndexes.get(raw),
  }),
);
jest.mock("../v2_activity_server_evaluator_release_v1", () => ({
  V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1: 128 * 1024,
  parseV2ActivityServerEvaluatorReleaseIndexV1: (raw: string) =>
    parsedReleaseIndexes.get(raw),
}));
jest.mock(
  "../../../../modules/learning-v2/runtime/activity_auxiliary_release_index_v1",
  () => ({
    LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1: 256 * 1024,
    parseLearningV2ActivityAuxiliaryReleaseIndexV1: (raw: string) =>
      parsedReleaseIndexes.get(raw),
  }),
);
jest.mock("../v2_episode_voice_release_index_v1", () => ({
  V2_EPISODE_VOICE_RELEASE_INDEX_MAX_BYTES_V1: 2 * 1024 * 1024,
  parseV2EpisodeVoiceReleaseIndexAuditV1: (raw: string) =>
    parsedReleaseIndexes.get(raw),
}));
jest.mock("../v2_episode_localization_release_index_v1", () => ({
  V2_EPISODE_LOCALIZATION_RELEASE_INDEX_MAX_BYTES_V1: 128 * 1024,
  parseV2EpisodeLocalizationReleaseIndexV1: (input: { raw: string }) =>
    parsedReleaseIndexes.get(input.raw),
}));
jest.mock("../v2_episode_error_guidance_release_index_v1", () => ({
  V2_EPISODE_ERROR_GUIDANCE_RELEASE_INDEX_MAX_BYTES_V1: 128 * 1024,
  parseV2EpisodeErrorGuidanceReleaseIndexV1: (input: { raw: string }) =>
    parsedReleaseIndexes.get(input.raw),
}));
jest.mock(
  "../../../../modules/learning-v2/runtime/activity_released_session_package_v1",
  () => ({
    parseLearningV2ActivityReleasedSessionPackageV1: () =>
      Object.freeze({ kind: "neutral-released-session" }),
    getLearningV2ActivityReleasedSessionPackageSummaryV1: () =>
      releasedSessionState.summary,
    materializeLearningV2ActivityReleasedSessionPackageV1: jest.fn(),
  }),
);
jest.mock(
  "../../../../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1",
  () => ({
    parseLearningV2ActivityAuxiliaryClientDescriptorV1: () =>
      releasedSessionState.descriptor,
  }),
);

/* eslint-disable import/first -- strict semantic parsers are replaced by neutral fixture projections above */
import * as admin from "firebase-admin";
import {
  canonicalJsonV1,
  sha256Utf8,
} from "../../../../modules/learning-v2/policies/decision_registry";
import type {
  V2RepositoryFirestorePortV1,
  V2RepositoryImmutableContentTypeV1,
  V2RepositoryImmutableObjectMetadataV1,
  V2RepositoryImmutableStoragePortV1,
} from "../v2_firebase_repository_persistence_v1";
import {
  persistV2ImmutableRepositoryObjectV1,
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
} from "../v2_firebase_repository_persistence_v1";
import { materializeV2OwnerEpisodeConfirmationV1 } from "../v2_owner_episode_confirmation_v1";
import { readbackV2UnifiedCourseReleaseConfirmationsV1 } from "../v2_unified_course_release_confirmation_readback_v1";
import {
  isV2UnifiedCourseReleaseLeafReadbackV1,
  readbackV2UnifiedCourseReleaseLeavesV1,
} from "../v2_unified_course_release_leaf_readback_v1";
import { createV2UnifiedCourseReleaseRepositoryV1 } from "../v2_unified_course_release_repository_v1";
import {
  materializeV2UnifiedCourseReleaseRootV1,
  type V2UnifiedCourseReleaseEpisodeV1,
} from "../v2_unified_course_release_v1";
import { createV2ActivityReleasedSessionHandlerV1 } from "../v2_activity_released_session_callable_v1";
/* eslint-enable import/first */

const PROJECT_ID = "demo-phraseman-learning-v2-release";
const BUCKET_NAME = `${PROJECT_ID}.appspot.com`;
const APP_NAME = `learning-v2-release-224-${process.pid}`;
const h = (value: string) => sha256Utf8(value);
const encoder = new TextEncoder();

type StoredMetadata = V2RepositoryImmutableObjectMetadataV1;

function errorCode(error: unknown): string | number | null {
  if (!error || typeof error !== "object") return null;
  const value = (error as { code?: unknown }).code;
  return typeof value === "string" || typeof value === "number" ? value : null;
}

function exactMetadata(value: Record<string, unknown>): StoredMetadata {
  const custom = value.metadata as Record<string, unknown> | undefined;
  return Object.freeze({
    generation: String(value.generation),
    byteSize: Number(value.size),
    contentType: String(
      value.contentType,
    ) as V2RepositoryImmutableContentTypeV1,
    contentHash: String(custom?.contentHash),
  });
}

function createFirestorePort(
  db: admin.firestore.Firestore,
): V2RepositoryFirestorePortV1 {
  return Object.freeze({
    runTransaction: async <T>(body: (transaction: never) => Promise<T>) =>
      db.runTransaction(async (nativeTransaction) => {
        const snapshots = new Map<string, admin.firestore.DocumentSnapshot>();
        const port = Object.freeze({
          readExact: async (documentPath: string) => {
            const snapshot = await nativeTransaction.get(db.doc(documentPath));
            snapshots.set(documentPath, snapshot);
            return snapshot.exists
              ? Object.freeze({
                  exists: true as const,
                  raw: String(snapshot.data()?.canonicalRaw),
                })
              : Object.freeze({ exists: false as const });
          },
          createExact: async (documentPath: string, canonicalRaw: string) => {
            nativeTransaction.create(db.doc(documentPath), { canonicalRaw });
          },
          compareAndSetExact: async (
            documentPath: string,
            expected: Readonly<{
              operationRevision: number;
              operationFingerprint: string;
            }>,
            canonicalRaw: string,
          ) => {
            const snapshot = snapshots.get(documentPath);
            const current = JSON.parse(
              String(snapshot?.data()?.canonicalRaw ?? "null"),
            ) as Record<string, unknown> | null;
            if (
              !snapshot?.exists ||
              current?.operationRevision !== expected.operationRevision ||
              current?.operationFingerprint !== expected.operationFingerprint
            )
              throw new Error("emulator_release_cas_conflict");
            nativeTransaction.update(db.doc(documentPath), { canonicalRaw });
          },
        });
        return body(port as never);
      }),
  });
}

function createStoragePort(
  bucket: ReturnType<admin.storage.Storage["bucket"]>,
) {
  let metadataReads = 0;
  let downloads = 0;
  let creates = 0;
  const port: V2RepositoryImmutableStoragePortV1 = Object.freeze({
    async readMetadataExact(objectPath: string) {
      metadataReads += 1;
      try {
        const [value] = await bucket.file(objectPath).getMetadata();
        return exactMetadata(value as unknown as Record<string, unknown>);
      } catch (error) {
        if (errorCode(error) === 404) return null;
        throw error;
      }
    },
    async createExact(
      input: Parameters<V2RepositoryImmutableStoragePortV1["createExact"]>[0],
    ) {
      try {
        await bucket.file(input.objectPath).save(Buffer.from(input.bytes), {
          resumable: false,
          validation: false,
          preconditionOpts: { ifGenerationMatch: 0 },
          metadata: {
            contentType: input.contentType,
            metadata: { contentHash: input.contentHash },
          },
        });
        creates += 1;
        const [value] = await bucket.file(input.objectPath).getMetadata();
        return Object.freeze({
          kind: "created" as const,
          metadata: exactMetadata(value as unknown as Record<string, unknown>),
        });
      } catch (error) {
        if (errorCode(error) === 412)
          return Object.freeze({ kind: "precondition_failed" as const });
        throw error;
      }
    },
    async downloadGenerationExact(
      input: Parameters<
        V2RepositoryImmutableStoragePortV1["downloadGenerationExact"]
      >[0],
    ) {
      downloads += 1;
      try {
        const [bytes] = await bucket
          .file(input.objectPath, { generation: input.ifGenerationMatch })
          .download({ validation: false });
        if (bytes.byteLength > input.maximumBytes)
          throw new Error("emulator_release_download_oversize");
        return Object.freeze({
          kind: "downloaded" as const,
          bytes: new Uint8Array(bytes),
        });
      } catch (error) {
        if (errorCode(error) === 404)
          return Object.freeze({ kind: "not_found" as const });
        if (errorCode(error) === 412)
          return Object.freeze({ kind: "generation_mismatch" as const });
        throw error;
      }
    },
    async quarantineConflict() {
      throw new Error("emulator_release_immutable_conflict");
    },
  });
  return {
    port,
    counters: () => ({ metadataReads, downloads, creates }),
    resetReadCounters: () => {
      metadataReads = 0;
      downloads = 0;
    },
  };
}

async function persistJson(
  storage: V2RepositoryImmutableStoragePortV1,
  objectPath: string,
  raw: string,
) {
  const bytes = encoder.encode(raw);
  return (
    await persistV2ImmutableRepositoryObjectV1({
      storage,
      objectPath,
      bytes,
      maximumBytes: 2 * 1024 * 1024,
      contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
      contentHash: createHash("sha256").update(bytes).digest("hex"),
    })
  ).pin;
}

jest.setTimeout(240_000);

describe("Learning V2 unified 224-leaf release (Firestore + Storage Emulator)", () => {
  const app =
    admin.apps.find((candidate) => candidate?.name === APP_NAME) ??
    admin.initializeApp(
      { projectId: PROJECT_ID, storageBucket: BUCKET_NAME },
      APP_NAME,
    );
  const db = app.firestore();
  const bucket = app.storage().bucket(BUCKET_NAME);
  const firestore = createFirestorePort(db);
  const storage = createStoragePort(bucket);

  beforeAll(() => {
    if (!process.env.FIRESTORE_EMULATOR_HOST)
      throw new Error("FIRESTORE_EMULATOR_HOST is required");
    if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST)
      throw new Error("FIREBASE_STORAGE_EMULATOR_HOST is required");
  });

  afterAll(async () => {
    for (const collection of [
      "content_v2_unified_course_release_heads",
      "content_v2_unified_course_release_roots",
    ]) {
      const snapshot = await db.collection(collection).get();
      await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
    }
    await bucket.deleteFiles({ prefix: "learning-v2/emulator-release-224/" });
    await bucket.deleteFiles({
      prefix: "learning-v2/unified-course-releases/",
    });
    await db.terminate();
    await app.delete();
  });

  test("reads 32 confirmations + 192 indexes, then activates A/B, rolls back A and serves A", async () => {
    const planFingerprint = h("neutral-plan");
    const courseContractFingerprint = h("neutral-course-contract");
    const ownerIdentityFingerprint = h("neutral-owner-identity");
    const kinds = [
      "learner_core",
      "server_evaluator",
      "auxiliary",
      "voice",
      "localization",
      "error_guidance",
    ] as const;

    const episodes = await Promise.all(
      Array.from({ length: 32 }, async (_, index) => {
        const ordinal = index + 1;
        const episodeId = `neutral-episode-${String(ordinal).padStart(2, "0")}`;
        const stageId = `neutral-stage-${String(ordinal).padStart(2, "0")}`;
        const activityAssemblyFingerprint = h(`assembly-${ordinal}`);
        const activityPackageFingerprint = h(`package-${ordinal}`);
        const ownerInputFingerprint = h(`owner-input-${ordinal}`);
        const confirmation = materializeV2OwnerEpisodeConfirmationV1({
          planFingerprint,
          courseContractFingerprint,
          stageId,
          episodeId,
          ownerInputFingerprint,
          activityAssemblyFingerprint,
          stageReviewFingerprint: h(`review-${ordinal}`),
          ownerIdentityFingerprint,
          confirmedAtIso: "2026-08-13T12:00:00.000Z",
          reason: `Neutral emulator confirmation ${ordinal}.`,
          contentClass: "production_candidate",
        });
        const confirmationRaw = canonicalJsonV1(confirmation);
        const confirmationPin = await persistJson(
          storage.port,
          `learning-v2/emulator-release-224/confirmations/${ordinal}/${h(confirmationRaw)}.json`,
          confirmationRaw,
        );

        const indexes = Object.fromEntries(
          await Promise.all(
            kinds.map(async (kind) => {
              const raw = canonicalJsonV1({
                schemaVersion: "neutral-release-index-fixture.v1",
                episodeOrdinal: ordinal,
                kind,
              });
              const indexFingerprint = h(`${kind}-${ordinal}`);
              parsedReleaseIndexes.set(raw, {
                episodeId,
                stageId,
                activityStageId: stageId,
                activityPackageFingerprint,
                activityAssemblyFingerprint,
                indexFingerprint,
              });
              const pin = await persistJson(
                storage.port,
                `learning-v2/emulator-release-224/indexes/${ordinal}/${kind}/${h(raw)}.json`,
                raw,
              );
              return [kind, { fingerprint: indexFingerprint, pin }] as const;
            }),
          ),
        ) as Record<
          (typeof kinds)[number],
          { fingerprint: string; pin: Awaited<ReturnType<typeof persistJson>> }
        >;

        return {
          episodeOrdinal: ordinal,
          episodeId,
          stageId,
          activityAssemblyFingerprint,
          activityPackageFingerprint,
          ownerInputFingerprint,
          ownerConfirmationFingerprint: confirmation.confirmationFingerprint,
          ownerConfirmationObject: confirmationPin,
          learnerCoreIndexFingerprint: indexes.learner_core.fingerprint,
          learnerCoreIndexObject: indexes.learner_core.pin,
          serverEvaluatorIndexFingerprint: indexes.server_evaluator.fingerprint,
          serverEvaluatorIndexObject: indexes.server_evaluator.pin,
          auxiliaryIndexFingerprint: indexes.auxiliary.fingerprint,
          auxiliaryIndexObject: indexes.auxiliary.pin,
          voiceAudioIndexFingerprint: indexes.voice.fingerprint,
          voiceAudioIndexObject: indexes.voice.pin,
          localizationIndexFingerprint: indexes.localization.fingerprint,
          localizationIndexObject: indexes.localization.pin,
          errorGuidanceIndexFingerprint: indexes.error_guidance.fingerprint,
          errorGuidanceIndexObject: indexes.error_guidance.pin,
        } satisfies Omit<
          V2UnifiedCourseReleaseEpisodeV1,
          "episodeReleaseFingerprint"
        >;
      }),
    );

    const release = (releaseId: string, activeManifestHash: string) =>
      materializeV2UnifiedCourseReleaseRootV1({
        environment: "production",
        releaseId,
        activeManifestHash,
        planFingerprint,
        courseContractFingerprint,
        seasonId: "neutral-season-1",
        targetLanguage: "en-US",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
        contentClass: "production_candidate",
        releaseScope: "full_season",
        rollout: {
          revision: 1,
          state: "live",
          percent: 100,
          cohortSaltVersion: 1,
          allowlistCohortIds: [],
          excludeCohortIds: [],
        },
        episodes,
      });

    const releaseA = release("neutral-release-a", h("manifest-a"));
    const releaseB = release("neutral-release-b", h("manifest-b"));
    storage.resetReadCounters();
    const confirmationPreflight =
      await readbackV2UnifiedCourseReleaseConfirmationsV1({
        root: releaseA,
        storage: storage.port,
      });
    const leaves = await readbackV2UnifiedCourseReleaseLeavesV1({
      root: releaseA,
      confirmationPreflight,
      storage: storage.port,
      loadNested: async () => ({
        localeIndexRaws: Array.from({ length: 8 }, () => "{}"),
        errorCatalogRaw: "{}",
        errorLearnerProjectionRaw: "{}",
      }),
    });

    expect(isV2UnifiedCourseReleaseLeafReadbackV1(leaves)).toBe(true);
    expect(leaves).toMatchObject({
      confirmationReadbackCount: 32,
      releaseIndexReadbackCount: 192,
      totalLeafReadbackCount: 224,
      releaseAuthority: false,
    });
    expect(storage.counters()).toMatchObject({
      metadataReads: 224,
      downloads: 224,
      creates: 224,
    });

    const repository = createV2UnifiedCourseReleaseRepositoryV1({
      firestore,
      storage: storage.port,
    });
    const activatedA = await repository.persistAndAdvance({
      target: releaseA,
      action: "activate",
      expectedRevision: 0,
      operationId: "neutral-activate-a",
      updatedAtIso: "2026-08-13T12:10:00.000Z",
    });
    await repository.persistAndAdvance({
      target: releaseB,
      action: "activate",
      expectedRevision: 1,
      operationId: "neutral-activate-b",
      updatedAtIso: "2026-08-13T12:11:00.000Z",
    });
    const rolledBack = await repository.persistAndAdvance({
      target: releaseA,
      action: "rollback",
      expectedRevision: 2,
      operationId: "neutral-rollback-a",
      updatedAtIso: "2026-08-13T12:12:00.000Z",
    });
    const active = await repository.readActive({
      environment: "production",
      seasonId: "neutral-season-1",
      studyTarget: "en",
      learnerSourceLocale: "ru",
    });

    expect(activatedA.head.state).toBe("live");
    expect(rolledBack.head.state).toBe("rolled_back");
    expect(active.root.releaseId).toBe("neutral-release-a");
    expect(active.root.rootFingerprint).toBe(releaseA.rootFingerprint);
    expect(active.rootObject.objectGeneration).toBe(
      activatedA.rootObject.objectGeneration,
    );

    const firstEpisode = releaseA.episodes[0]!;
    const canonicalPackageRaw = canonicalJsonV1({
      auxiliaryDescriptorRaw: canonicalJsonV1({ neutral: true }),
    });
    Object.assign(releasedSessionState.descriptor, {
      environment: "production",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      seasonId: "neutral-season-1",
      activeManifestHash: releaseA.activeManifestHash,
      episodeId: firstEpisode.episodeId,
      sessionId: "neutral-session-01",
      sessionOrdinal: 1,
      auxiliaryIndexFingerprint: firstEpisode.auxiliaryIndexFingerprint,
      descriptorFingerprint: h("neutral-descriptor"),
    });
    Object.assign(releasedSessionState.summary, {
      episodeId: firstEpisode.episodeId,
      sessionId: "neutral-session-01",
      sessionOrdinal: 1,
      activityPackageFingerprint: firstEpisode.activityPackageFingerprint,
      auxiliaryDescriptorFingerprint: h("neutral-descriptor"),
      sourceFingerprint: h("neutral-source"),
      renderFingerprint: h("neutral-render"),
      capsuleEnvelopeFingerprint: h("neutral-capsule"),
      packageFingerprint: h("neutral-package"),
    });
    const handler = createV2ActivityReleasedSessionHandlerV1(
      async (request) => {
        const current = await repository.readActive({
          environment: request.environment,
          seasonId: request.seasonId,
          studyTarget: request.studyTarget,
          learnerSourceLocale: request.learnerSourceLocale,
        });
        const episode = current.root.episodes.find(
          (row) => row.episodeId === request.episodeId,
        );
        if (!episode) throw new Error("neutral_episode_missing");
        return Object.freeze({
          activeManifestHash: current.root.activeManifestHash,
          unifiedReleaseId: current.root.releaseId,
          unifiedRootFingerprint: current.root.rootFingerprint,
          auxiliaryIndexFingerprint: episode.auxiliaryIndexFingerprint,
          canonicalPackageRaw,
        });
      },
      async () => "neutral-stable-account",
    );
    const response = await handler({
      auth: { uid: "neutral-auth-account" },
      data: {
        environment: "production",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        seasonId: "neutral-season-1",
        expectedActiveManifestHash: releaseA.activeManifestHash,
        episodeId: firstEpisode.episodeId,
        sessionOrdinal: 1,
      },
    });
    expect(response).toMatchObject({
      activeManifestHash: releaseA.activeManifestHash,
      unifiedReleaseId: "neutral-release-a",
      unifiedRootFingerprint: releaseA.rootFingerprint,
      episodeId: firstEpisode.episodeId,
      sessionOrdinal: 1,
      releaseAuthority: false,
    });
  });
});
