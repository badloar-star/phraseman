import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import { parseLearningV2ActivityAuxiliaryReleaseIndexV1 } from "../../../modules/learning-v2/runtime/activity_auxiliary_release_index_v1";
import {
  buildV2SeasonReleaseRecord,
  v2ManifestHash,
  type V2SeasonReleaseManifestBody,
  type V2SeasonReleasePointer,
} from "../../../modules/learning-v2/content/release_manifest";
import {
  materializeV2ActivityAuxiliaryReleasePointerV1,
  v2ActivityAuxiliaryReleasePointerDocumentPathV1,
} from "./v2_activity_auxiliary_release_pointer_v1";
import {
  createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1,
  getV2FirebaseActivityAuxiliaryReleaseSummaryV1,
  isV2FirebaseActivityAuxiliaryReleaseHandleV1,
} from "./v2_firebase_activity_auxiliary_release_adapter_v1";
import {
  v2SeasonReleaseManifestDocumentId,
  v2SeasonReleasePointerDocumentId,
  v2SeasonReleasePointerId,
} from "./v2_required_session_activation";

const h = (value: unknown) => hashCanonicalBody(value);
const encoder = new TextEncoder();
const time = Object.freeze({ seconds: "1800000000", nanoseconds: 1 });
const documents = new Map<
  string,
  Readonly<{ canonicalRaw: string; updateTime: typeof time }>
>();
const objects = new Map<
  string,
  Readonly<{
    bytes: Uint8Array;
    generation: string;
    contentHash: string;
    contentType: "application/json; charset=utf-8";
  }>
>();
let pointerReadCount = 0;
let driftPointerOnSecondRead = false;
const mockIntegrityHandle = Object.freeze({ kind: "integrity-handle" });
const mockLoadIntegrity = jest.fn(
  async (input: {
    manifest: { objects: readonly unknown[] };
    reader: { readExact(pin: unknown): Promise<unknown> };
  }) => {
    for (const pin of input.manifest.objects) await input.reader.readExact(pin);
    return mockIntegrityHandle;
  },
);

const mockIo = Object.freeze({
  readCanonicalDocumentExact: jest.fn(
    async (input: { documentPath: string; maximumBytes: number }) => {
      const value = documents.get(input.documentPath);
      if (!value) throw new Error("missing");
      pointerReadCount += input.documentPath.startsWith(
        "content_v2_season_release_pointers/",
      )
        ? 1
        : 0;
      const updateTime =
        driftPointerOnSecondRead &&
        pointerReadCount === 2 &&
        input.documentPath.startsWith("content_v2_season_release_pointers/")
          ? { seconds: "1800000001", nanoseconds: 0 }
          : value.updateTime;
      return Object.freeze({
        documentPath: input.documentPath,
        canonicalRaw: value.canonicalRaw,
        readTime: time,
        updateTime,
      });
    },
  ),
  storage: Object.freeze({
    readMetadataExact: jest.fn(async (objectPath: string) => {
      const value = objects.get(objectPath);
      return value
        ? Object.freeze({
            generation: value.generation,
            byteSize: value.bytes.byteLength,
            contentType: value.contentType,
            contentHash: value.contentHash,
          })
        : null;
    }),
    downloadGenerationExact: jest.fn(
      async (input: {
        objectPath: string;
        ifGenerationMatch: string;
        maximumBytes: number;
      }) => {
        const value = objects.get(input.objectPath);
        return !value || value.generation !== input.ifGenerationMatch
          ? Object.freeze({ kind: "not_found" as const })
          : Object.freeze({
              kind: "downloaded" as const,
              bytes: value.bytes,
            });
      },
    ),
  }),
});

jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: jest.fn(() => mockIo),
}));
jest.mock(
  "../../../modules/learning-v2/runtime/activity_auxiliary_integrity_loader_v1",
  () => ({
    loadLearningV2ActivityAuxiliaryIntegrityV1: (input: unknown) =>
      mockLoadIntegrity(input as never),
    projectLearningV2ActivityAuxiliaryClientMaterialV1: jest.fn(() => ({
      action: { kind: "action" },
      cards: { kind: "cards" },
      audio: { kind: "audio" },
      errorSourceProjectionFingerprint: "e".repeat(64),
      errorEntries: Array.from({ length: 12 }, (_, index) => ({
        explanationRef: `explanation-${index + 1}`,
        taskId: `task-${index + 1}`,
        activityId: `activity-${index + 1}`,
        textByLocale: { ru: "text" },
      })),
    })),
  }),
);
jest.mock(
  "../../../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1",
  () => ({
    materializeLearningV2ActivityAuxiliaryClientDescriptorV1: jest.fn(
      (input: unknown) => input,
    ),
    encodeLearningV2ActivityAuxiliaryClientDescriptorV1: jest.fn(
      () => "descriptor-raw",
    ),
  }),
);
jest.mock(
  "../../../modules/learning-v2/runtime/activity_auxiliary_release_manifest_v1",
  () => ({
    LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_MAX_BYTES_V1: 64 * 1024,
    parseLearningV2ActivityAuxiliaryReleaseManifestV1: (raw: string) =>
      JSON.parse(raw),
  }),
);

function setup() {
  const episodeId = "episode-1";
  const body: V2SeasonReleaseManifestBody = {
    schemaVersion: "v2-season-release-manifest-body.v1",
    releaseId: "release-1",
    courseReleaseId: "course-release-1",
    seasonId: "season-1",
    seasonRevision: 1,
    seasonContentHash: h("season"),
    studyTarget: "en",
    learnerSourceLocale: "ru",
    releaseScope: "vertical_slice",
    decisionRegistryRef: {
      id: "decision-registry",
      version: 1,
      contentHash: h("registry"),
    },
    supportManifestRefs: [
      {
        platform: "ios",
        environment: "lab",
        minAppVersion: "1.0.0",
        manifestId: "ios-support",
        contentHash: h("ios"),
      },
      {
        platform: "android",
        environment: "lab",
        minAppVersion: "1.0.0",
        manifestId: "android-support",
        contentHash: h("android"),
      },
    ],
    voiceNetworkEgressRefs: [],
    lessonUnits: [
      {
        episodeId,
        lessonId: 1,
        object: {
          path: "learning-v2/releases/episode-1.json",
          generation: "9",
          contentHash: h("lesson"),
          byteSize: 4096,
        },
      },
    ],
  };
  const manifestRaw = canonicalJsonV1(body);
  const manifestHash = v2ManifestHash(body);
  const record = buildV2SeasonReleaseRecord(
    body,
    {
      path: `learning-v2/releases/${manifestHash}.json`,
      generation: "101",
      contentHash: manifestHash,
      byteSize: encoder.encode(manifestRaw).byteLength,
    },
    "2026-08-12T00:00:00.000Z",
  );
  const pointer: V2SeasonReleasePointer = {
    schemaVersion: "v2-season-release-pointer.v1",
    pointerId: "lab:en:ru:season-1",
    environment: "lab",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    seasonId: "season-1",
    activeReleaseId: "release-1",
    activeManifestHash: manifestHash,
    rollout: {
      revision: 1,
      state: "internal",
      percent: 0,
      cohortSaltVersion: 1,
      allowlistCohortIds: [],
      excludeCohortIds: [],
    },
    expectedCatalogRevision: 1,
    updatedBy: "admin-1",
    updatedAt: "2026-08-12T00:00:00.000Z",
  };
  const activityPackageFingerprint = h("activity-package");
  const sessions = Array.from({ length: 12 }, (_, index) => {
    const ordinal = index + 1;
    const manifestFingerprint = h(["auxiliary-manifest", ordinal]);
    const childObjects = [
      "learner_action",
      "post_terminal_card_capsule",
      "audio_runtime",
      "error_explanations",
    ].map((kind, childIndex) => {
      const childRaw = canonicalJsonV1({ kind, ordinal });
      const childPath = `learning-v2/canonical/activity-auxiliary/test/${ordinal}/${childIndex + 1}.json`;
      const child = Object.freeze({
        kind,
        objectPath: childPath,
        contentHash: sha256Utf8(childRaw),
        objectGeneration: String(300 + ordinal * 4 + childIndex),
        byteSize: encoder.encode(childRaw).byteLength,
        contentType: "application/json; charset=utf-8" as const,
      });
      objects.set(childPath, {
        bytes: encoder.encode(childRaw),
        generation: child.objectGeneration,
        contentHash: child.contentHash,
        contentType: child.contentType,
      });
      return child;
    });
    const sessionId = `session-${ordinal}`;
    const sourceFingerprint = h(["source", ordinal]);
    const renderFingerprint = h(["render", ordinal]);
    const manifestRaw = canonicalJsonV1({
      stageId: "stage-activity-1",
      episodeId,
      sessionId,
      sessionOrdinal: ordinal,
      activityPackageFingerprint,
      sourceFingerprint,
      renderFingerprint,
      objects: childObjects,
    });
    const contentHash = sha256Utf8(manifestRaw);
    const objectPath = `learning-v2/canonical/activity-auxiliary-index/${manifestHash}/${sha256Utf8(episodeId)}/${activityPackageFingerprint}/sessions/${String(ordinal).padStart(2, "0")}/${manifestFingerprint}/${contentHash}.json`;
    objects.set(objectPath, {
      bytes: encoder.encode(manifestRaw),
      generation: String(200 + ordinal),
      contentHash,
      contentType: "application/json; charset=utf-8",
    });
    return {
      sessionId,
      sessionOrdinal: ordinal,
      sourceFingerprint,
      renderFingerprint,
      manifestFingerprint,
      objectPath,
      contentHash,
      objectGeneration: String(200 + ordinal),
      byteSize: encoder.encode(manifestRaw).byteLength,
      contentType: "application/json; charset=utf-8" as const,
    };
  });
  const indexBody = {
    schemaVersion: "learning-v2-activity-auxiliary-release-index.v1",
    environment: "lab" as const,
    releaseId: "release-1",
    activeManifestHash: manifestHash,
    seasonId: "season-1",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    episodeId,
    lessonId: 1,
    lessonUnitObject: body.lessonUnits[0].object,
    stageId: "stage-activity-1",
    activityPackageFingerprint,
    sessions,
    sessionCount: 12 as const,
    releaseIdentityEvidence: "validated_published_view_structure_only" as const,
    repositoryOriginAuthority: "none_server_readback_required" as const,
    storageAuthority: "none" as const,
    runtimeAuthority: "none_release_index_readback_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  const indexRaw = canonicalJsonV1({
    ...indexBody,
    indexFingerprint: h(indexBody),
  });
  const index = parseLearningV2ActivityAuxiliaryReleaseIndexV1(indexRaw);
  const auxiliaryPointer = materializeV2ActivityAuxiliaryReleasePointerV1({
    indexRaw,
    indexObjectGeneration: "102",
  });

  const pointerPath = `content_v2_season_release_pointers/${v2SeasonReleasePointerDocumentId(v2SeasonReleasePointerId("lab", "en", "ru", "season-1"))}`;
  const recordPath = `content_v2_season_release_manifests/${v2SeasonReleaseManifestDocumentId("release-1")}`;
  const auxiliaryPointerPath = v2ActivityAuxiliaryReleasePointerDocumentPathV1({
    activeManifestHash: manifestHash,
    episodeId,
  });
  documents.set(pointerPath, {
    canonicalRaw: canonicalJsonV1(pointer),
    updateTime: time,
  });
  documents.set(recordPath, {
    canonicalRaw: canonicalJsonV1(record),
    updateTime: time,
  });
  documents.set(auxiliaryPointerPath, {
    canonicalRaw: canonicalJsonV1(auxiliaryPointer),
    updateTime: time,
  });
  objects.set(record.object.path, {
    bytes: encoder.encode(manifestRaw),
    generation: record.object.generation,
    contentHash: record.object.contentHash,
    contentType: "application/json; charset=utf-8",
  });
  objects.set(auxiliaryPointer.indexObject.objectPath, {
    bytes: encoder.encode(indexRaw),
    generation: auxiliaryPointer.indexObject.objectGeneration,
    contentHash: auxiliaryPointer.indexObject.contentHash,
    contentType: "application/json; charset=utf-8",
  });
  return { index, auxiliaryPointer };
}

describe("V2 Firebase Activity auxiliary release adapter", () => {
  beforeEach(() => {
    documents.clear();
    objects.clear();
    pointerReadCount = 0;
    driftPointerOnSecondRead = false;
    mockLoadIntegrity.mockClear();
    jest.clearAllMocks();
  });

  it("cold-reads the active release and index before issuing a private handle", async () => {
    const expected = setup();
    const adapter = createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1();
    const handle = await adapter.load({
      environment: "lab",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      seasonId: "season-1",
      episodeId: "episode-1",
    });
    expect(
      getV2FirebaseActivityAuxiliaryReleaseSummaryV1(handle),
    ).toMatchObject({
      releaseId: "release-1",
      activeManifestHash: expected.index.activeManifestHash,
      indexFingerprint: expected.index.indexFingerprint,
      repositoryOriginAuthority: "firebase_admin_active_release_snapshot",
      seasonManifestAuthority: "generation_pinned_immutable_readback",
      auxiliaryIndexAuthority: "generation_pinned_immutable_readback",
      runtimeAuthority: "authenticated_release_resource_identity_only",
      walletAuthority: "none",
      releaseAuthority: false,
    });
    expect(isV2FirebaseActivityAuxiliaryReleaseHandleV1({ ...handle })).toBe(
      false,
    );
  });

  it("resolves one session only from the private release handle and exact five-object readback", async () => {
    setup();
    const adapter = createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1();
    const handle = await adapter.load({
      environment: "lab",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      seasonId: "season-1",
      episodeId: "episode-1",
    });
    const readsBefore =
      mockIo.storage.downloadGenerationExact.mock.calls.length;
    await expect(adapter.resolveSession(handle, 1)).resolves.toBe(
      mockIntegrityHandle,
    );
    expect(mockIo.storage.downloadGenerationExact.mock.calls.length).toBe(
      readsBefore + 5,
    );
    await expect(adapter.resolveSession({ ...handle }, 1)).rejects.toThrow(
      "v2_firebase_activity_auxiliary_release_invalid",
    );
    await expect(adapter.projectSessionDescriptor(handle, 1)).resolves.toBe(
      "descriptor-raw",
    );
    await expect(
      adapter.projectSessionDescriptor({ ...handle }, 1),
    ).rejects.toThrow("v2_firebase_activity_auxiliary_release_invalid");
  });

  it("rejects coordinated index byte substitution", async () => {
    const expected = setup();
    const stored = objects.get(
      expected.auxiliaryPointer.indexObject.objectPath,
    )!;
    objects.set(expected.auxiliaryPointer.indexObject.objectPath, {
      ...stored,
      bytes: encoder.encode(`${new TextDecoder().decode(stored.bytes)} `),
    });
    await expect(
      createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1().load({
        environment: "lab",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        seasonId: "season-1",
        episodeId: "episode-1",
      }),
    ).rejects.toThrow("v2_firebase_activity_auxiliary_release_invalid");
  });

  it("rejects active-pointer updateTime drift during the cold read", async () => {
    setup();
    driftPointerOnSecondRead = true;
    await expect(
      createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1().load({
        environment: "lab",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        seasonId: "season-1",
        episodeId: "episode-1",
      }),
    ).rejects.toThrow("v2_firebase_activity_auxiliary_release_invalid");
  });

  it("rejects a malformed direct-key Season manifest record before Storage I/O", async () => {
    setup();
    const recordEntry = [...documents.entries()].find(([path]) =>
      path.startsWith("content_v2_season_release_manifests/"),
    )!;
    const malformed = JSON.parse(recordEntry[1].canonicalRaw);
    delete malformed.object;
    documents.set(recordEntry[0], {
      canonicalRaw: canonicalJsonV1(malformed),
      updateTime: time,
    });
    const readsBefore = mockIo.storage.readMetadataExact.mock.calls.length;
    await expect(
      createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1().load({
        environment: "lab",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        seasonId: "season-1",
        episodeId: "episode-1",
      }),
    ).rejects.toThrow("v2_firebase_activity_auxiliary_release_invalid");
    expect(mockIo.storage.readMetadataExact.mock.calls).toHaveLength(
      readsBefore,
    );
  });
});
