import { createFirebaseAdminV2ActivityAuxiliaryEpisodePublisherV1 } from "./v2_firebase_activity_auxiliary_episode_publisher_v1";
import { canonicalJsonV1 } from "../../../modules/learning-v2/policies/decision_registry";

const mockReleaseHandle = Object.freeze({ kind: "release-handle" });
type RootPublishInput = Readonly<{ sessionManifestRaws: readonly string[] }>;
type PersistInput = Readonly<{ objectPath: string; contentHash: string }>;
type PersistOutput = Readonly<{
  kind: "created";
  pin: Readonly<{
    objectPath: string;
    contentHash: string;
    objectGeneration: string;
    byteSize: number;
    contentType: "application/json; charset=utf-8";
  }>;
}>;
let mockGeneration = 100;
let mockReleaseDrift = false;
const mockRootPublish = jest.fn(
  async (_input: RootPublishInput) => mockReleaseHandle,
);
const mockPersist = jest.fn(
  async (input: PersistInput): Promise<PersistOutput> => ({
    kind: "created" as const,
    pin: Object.freeze({
      objectPath: input.objectPath,
      contentHash: input.contentHash,
      objectGeneration: String(++mockGeneration),
      byteSize: 1,
      contentType: "application/json; charset=utf-8" as const,
    }),
  }),
);
let mockCrossEpisode = false;

jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: jest.fn(() => ({
    storage: Object.freeze({ kind: "storage-port" }),
    readCanonicalDocumentExact: jest.fn(
      async (request: { documentPath: string }) => ({
        documentPath: request.documentPath,
        canonicalRaw: request.documentPath.includes("season_release_pointers")
          ? canonicalJsonV1(
              mockReleaseDrift
                ? { ...mockPublishedPointer, activeReleaseId: "release-2" }
                : mockPublishedPointer,
            )
          : canonicalJsonV1(mockPublishedManifestRecord),
        readTime: { seconds: "1", nanoseconds: 0 },
        updateTime: { seconds: "1", nanoseconds: 0 },
      }),
    ),
  })),
}));
jest.mock("./v2_firebase_repository_persistence_v1", () => ({
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1:
    "application/json; charset=utf-8",
  persistV2ImmutableRepositoryObjectV1: (...args: [PersistInput]) =>
    mockPersist(...args),
}));
jest.mock("./v2_firebase_activity_auxiliary_release_publisher_v1", () => ({
  createFirebaseAdminV2ActivityAuxiliaryReleasePublisherV1: jest.fn(() => ({
    publish: (input: RootPublishInput) => mockRootPublish(input),
  })),
}));
jest.mock(
  "../../../modules/learning-v2/runtime/activity_auxiliary_release_manifest_v1",
  () => ({
    materializeLearningV2ActivityAuxiliaryReleaseManifestV1: jest.fn(
      (input: {
        learnerActionRaw: string;
        learnerActionGeneration: string;
        postTerminalCardCapsuleGeneration: string;
        audioRuntimeGeneration: string;
        errorExplanationGeneration: string;
      }) => {
        const sessionOrdinal = Number(
          input.learnerActionRaw.replace("action-", ""),
        );
        const generations = [
          input.learnerActionGeneration,
          input.postTerminalCardCapsuleGeneration,
          input.audioRuntimeGeneration,
          input.errorExplanationGeneration,
        ];
        return Object.freeze({
          episodeId:
            mockCrossEpisode && sessionOrdinal === 12
              ? "episode-other"
              : "episode-1",
          sessionOrdinal,
          objects: Object.freeze(
            generations.map((generation, index) =>
              Object.freeze({
                objectPath: `learning-v2/child/${sessionOrdinal}/${index + 1}.json`,
                contentHash: String(index + 1).repeat(64),
                objectGeneration: generation,
              }),
            ),
          ),
        });
      },
    ),
    encodeLearningV2ActivityAuxiliaryReleaseManifestV1: jest.fn(
      (value: { sessionOrdinal: number; objects: readonly unknown[] }) =>
        JSON.stringify({
          sessionOrdinal: value.sessionOrdinal,
          objectCount: value.objects.length,
        }),
    ),
  }),
);

const sessions = Object.freeze(
  Array.from({ length: 12 }, (_, index) =>
    Object.freeze({
      learnerActionRaw: `action-${index + 1}`,
      postTerminalCardCapsuleRaw: `cards-${index + 1}`,
      audioRuntimeRaw: `audio-${index + 1}`,
      errorExplanationRaw: `errors-${index + 1}`,
    }),
  ),
);
const mockPublishedPointer = Object.freeze({
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "season-1",
  activeReleaseId: "release-1",
});
const mockPublishedManifestRecord = Object.freeze({
  releaseId: "release-1",
});
const input = Object.freeze({
  publishedView: Object.freeze({
    activePointer: mockPublishedPointer,
    manifestRecord: mockPublishedManifestRecord,
  }) as never,
  expectedEnvironment: "lab" as const,
  episodeId: "episode-1",
  stageId: "stage-1",
  activityPackageFingerprint: "a".repeat(64),
  sessions,
});

describe("V2 Firebase Activity auxiliary episode publisher", () => {
  beforeEach(() => {
    mockCrossEpisode = false;
    mockReleaseDrift = false;
    mockGeneration = 100;
    jest.clearAllMocks();
  });

  it("persists exactly 48 learner objects before one root-last publish", async () => {
    await expect(
      createFirebaseAdminV2ActivityAuxiliaryEpisodePublisherV1().publish(input),
    ).resolves.toBe(mockReleaseHandle);
    expect(mockPersist).toHaveBeenCalledTimes(48);
    expect(mockRootPublish).toHaveBeenCalledTimes(1);
    const rootInput = mockRootPublish.mock.calls[0]![0];
    expect(rootInput.sessionManifestRaws).toHaveLength(12);
    expect(mockPersist.mock.invocationCallOrder.at(-1)).toBeLessThan(
      mockRootPublish.mock.invocationCallOrder[0]!,
    );
  });

  it("rejects a stale release before the first learner-object write", async () => {
    mockReleaseDrift = true;
    await expect(
      createFirebaseAdminV2ActivityAuxiliaryEpisodePublisherV1().publish(input),
    ).rejects.toThrow("v2_firebase_activity_auxiliary_episode_publish_invalid");
    expect(mockPersist).not.toHaveBeenCalled();
    expect(mockRootPublish).not.toHaveBeenCalled();
  });

  it("validates all twelve session coordinates before the first write", async () => {
    mockCrossEpisode = true;
    await expect(
      createFirebaseAdminV2ActivityAuxiliaryEpisodePublisherV1().publish(input),
    ).rejects.toThrow("v2_firebase_activity_auxiliary_episode_publish_invalid");
    expect(mockPersist).not.toHaveBeenCalled();
    expect(mockRootPublish).not.toHaveBeenCalled();
  });

  it("does not publish the root after an immutable child failure", async () => {
    mockPersist.mockRejectedValueOnce(new Error("storage_failure"));
    await expect(
      createFirebaseAdminV2ActivityAuxiliaryEpisodePublisherV1().publish(input),
    ).rejects.toThrow("storage_failure");
    expect(mockRootPublish).not.toHaveBeenCalled();
  });
});
