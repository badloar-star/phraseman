import {
  buildV2SeasonReleaseRecord,
  v2ManifestHash,
  type V2PublishedSeasonManifestView,
  type V2SeasonReleaseManifestBody,
  type V2SeasonReleasePointer,
} from "../../../modules/learning-v2/content/release_manifest";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1,
  getV2FirebaseActivityLearnerCoreReleaseSummaryV1,
  isV2FirebaseActivityLearnerCoreReleaseHandleV1,
} from "./v2_firebase_activity_learner_core_release_adapter_v1";
import * as releaseAdapterModule from "./v2_firebase_activity_learner_core_release_adapter_v1";
import * as releasePublisherModule from "./v2_firebase_activity_learner_core_release_publisher_v1";
import { createFirebaseAdminV2ActivityLearnerCoreReleasePublisherV1 } from "./v2_firebase_activity_learner_core_release_publisher_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const validatorHandle = Object.freeze({ kind: "validator" });
const plan = Object.freeze({ planFingerprint: h("plan") });
const stageId = "stage-activity-1";
const packageFingerprint = h("activity-package");
const validatorSummary = Object.freeze({
  outcome: "eligible_for_human_review_only" as const,
  episodeId: "episode-1",
  stageId,
  packageFingerprint,
  summaryFingerprint: h("validator-summary"),
  permitAggregateFingerprint: h("permit-aggregate"),
  childReadbackAggregateFingerprint: h("child-readback"),
  storageReadbackFingerprint: h("storage-readback"),
  validatedSessionCount: 12 as const,
  validatedTaskCount: 144 as const,
  artifactStorageAuthority:
    "firebase_admin_generation_pinned_readback" as const,
});
let validatorOutcome: "blocked" | "eligible_for_human_review_only" =
  "eligible_for_human_review_only";

function publishedView(): V2PublishedSeasonManifestView {
  const lessonObject = {
    path: "learning-v2/releases/season-1/episode-1.json",
    generation: "8",
    contentHash: h("lesson-unit"),
    byteSize: 4096,
  };
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
      contentHash: h("decision-registry"),
    },
    supportManifestRefs: [
      {
        platform: "ios",
        environment: "lab",
        minAppVersion: "1.0.0",
        manifestId: "ios-support",
        contentHash: h("ios-support"),
      },
      {
        platform: "android",
        environment: "lab",
        minAppVersion: "1.0.0",
        manifestId: "android-support",
        contentHash: h("android-support"),
      },
    ],
    voiceNetworkEgressRefs: [],
    lessonUnits: [
      { episodeId: "episode-1", lessonId: 1, object: lessonObject },
    ],
  };
  const manifestHash = v2ManifestHash(body);
  const record = buildV2SeasonReleaseRecord(
    body,
    {
      path: "learning-v2/releases/season-1/manifest.json",
      generation: "7",
      contentHash: manifestHash,
      byteSize: new TextEncoder().encode(canonicalJsonV1(body)).byteLength,
    },
    "2026-08-13T00:00:00.000Z",
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
    updatedBy: "test-owner",
    updatedAt: "2026-08-13T00:00:00.000Z",
  };
  return Object.freeze({
    schemaVersion: "published-v2-season-manifest-view.v1" as const,
    catalogRevision: 1,
    activePointer: Object.freeze(pointer),
    manifestRecord: Object.freeze(record),
    manifestBody: Object.freeze(body),
  });
}

const view = publishedView();
const objects = new Map<
  string,
  {
    bytes: Uint8Array;
    generation: string;
    contentType: string;
    contentHash: string;
  }
>();
const documents = new Map<string, string>();
let generation = 500;
let tamperPath: string | null = null;

function store(
  objectPath: string,
  raw: string,
  objectGeneration: string,
  contentType = "application/json; charset=utf-8",
) {
  objects.set(objectPath, {
    bytes: new TextEncoder().encode(raw),
    generation: objectGeneration,
    contentType,
    contentHash: sha256Utf8(raw),
  });
}

const sessionMaterials = Array.from({ length: 12 }, (_, index) => {
  const sessionOrdinal = index + 1;
  const sessionId = `episode-1:session:${String(sessionOrdinal).padStart(2, "0")}`;
  const sourceFingerprint = h(["source", sessionOrdinal]);
  const renderRaw = canonicalJsonV1({
    schemaVersion: "v2-activity-session-render-seed.v2",
    sourceFingerprint,
    episodeId: "episode-1",
    targetLanguage: "en",
    session: {
      sessionId,
      ordinal: sessionOrdinal,
      zone:
        sessionOrdinal <= 4
          ? "understand"
          : sessionOrdinal <= 8
            ? "use"
            : "master",
      targetSeconds: 90,
      tasks: Array.from({ length: 12 }, (_, taskIndex) => ({
        taskId: `task-${sessionOrdinal}-${taskIndex + 1}`,
      })),
    },
    executionAuthority: "none",
    rewardAuthority: "none",
    runtimeConsumer: false,
    releaseAuthority: false,
  });
  const capsuleEnvelopeRaw = canonicalJsonV1({
    schemaVersion: "v2-activity-session-capsule-envelope.v1",
    sourceFingerprint,
    episodeId: "episode-1",
    sessionId,
    sessionOrdinal,
    normalizationLocale: "en",
    normalizationProfileHash: h("normalization"),
    capsules: Array.from({ length: 12 }, (_, taskIndex) =>
      canonicalJsonV1({ capsule: `${sessionOrdinal}-${taskIndex + 1}` }),
    ),
    commitmentAggregate: h(["commitments", sessionOrdinal]),
    consumer: "app_internal_local_evaluator_only",
    verdictAuthority: "local_provisional_only",
  });
  const renderHash = sha256Utf8(renderRaw);
  const capsuleHash = sha256Utf8(capsuleEnvelopeRaw);
  const prefix = `learning-v2/canonical/activity-instances/${sha256Utf8(stageId)}/sessions/${String(sessionOrdinal).padStart(2, "0")}`;
  const renderPin = Object.freeze({
    objectPath: `${prefix}/render/${renderHash}.json`,
    contentHash: renderHash,
    objectGeneration: String(100 + sessionOrdinal),
    byteSize: new TextEncoder().encode(renderRaw).byteLength,
    contentType: "application/json; charset=utf-8" as const,
  });
  const capsulePin = Object.freeze({
    objectPath: `${prefix}/capsule/${capsuleHash}.json`,
    contentHash: capsuleHash,
    objectGeneration: String(200 + sessionOrdinal),
    byteSize: new TextEncoder().encode(capsuleEnvelopeRaw).byteLength,
    contentType: "application/json; charset=utf-8" as const,
  });
  store(renderPin.objectPath, renderRaw, renderPin.objectGeneration);
  store(capsulePin.objectPath, capsuleEnvelopeRaw, capsulePin.objectGeneration);
  return Object.freeze({
    planFingerprint: plan.planFingerprint,
    courseContractFingerprint: h("course"),
    stageId,
    episodeId: "episode-1",
    sessionOrdinal,
    sessionId,
    packageFingerprint,
    validatorSummaryFingerprint: validatorSummary.summaryFingerprint,
    permitAggregateFingerprint: validatorSummary.permitAggregateFingerprint,
    childReadbackAggregateFingerprint:
      validatorSummary.childReadbackAggregateFingerprint,
    storageReadbackFingerprint: validatorSummary.storageReadbackFingerprint,
    renderRaw,
    capsuleEnvelopeRaw,
    renderPin,
    capsulePin,
  });
});

store(
  view.manifestRecord.object.path,
  canonicalJsonV1(view.manifestBody),
  view.manifestRecord.object.generation,
  "application/json",
);

jest.mock("./v2_firebase_activity_instances_validator_adapter_v1", () => ({
  getV2FirebaseActivityInstancesValidatorSummaryV1: (handle: unknown) => {
    if (handle !== validatorHandle) throw new Error("test_handle_invalid");
    return { ...validatorSummary, outcome: validatorOutcome };
  },
  resolveV2FirebaseActivityInstancesPublicationSessionMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    sessionOrdinal: number;
  }) => {
    if (input.handle !== validatorHandle || input.plan !== plan)
      throw new Error("test_resolve_invalid");
    return sessionMaterials[input.sessionOrdinal - 1];
  },
}));

const storage = Object.freeze({
  readMetadataExact: jest.fn(async (objectPath: string) => {
    const value = objects.get(objectPath);
    return value
      ? {
          generation: value.generation,
          byteSize: value.bytes.byteLength,
          contentType: value.contentType,
          contentHash: value.contentHash,
        }
      : null;
  }),
  downloadGenerationExact: jest.fn(
    async (input: { objectPath: string; ifGenerationMatch: string }) => {
      const value = objects.get(input.objectPath);
      if (!value || value.generation !== input.ifGenerationMatch)
        return { kind: "not_found" as const };
      const bytes = new Uint8Array(value.bytes);
      if (tamperPath === input.objectPath) bytes[0] ^= 1;
      return { kind: "downloaded" as const, bytes };
    },
  ),
  createExact: jest.fn(
    async (input: {
      objectPath: string;
      bytes: Uint8Array;
      contentType: string;
      contentHash: string;
    }) => {
      const existing = objects.get(input.objectPath);
      if (existing) return { kind: "precondition_failed" as const };
      generation += 1;
      const value = {
        bytes: new Uint8Array(input.bytes),
        generation: String(generation),
        contentType: input.contentType,
        contentHash: input.contentHash,
      };
      objects.set(input.objectPath, value);
      return {
        kind: "created" as const,
        metadata: {
          generation: value.generation,
          byteSize: value.bytes.byteLength,
          contentType: value.contentType,
          contentHash: value.contentHash,
        },
      };
    },
  ),
  quarantineConflict: jest.fn(async () => undefined),
});

const firestore = Object.freeze({
  runTransaction: jest.fn(
    async <T>(body: (transaction: any) => Promise<T>): Promise<T> =>
      body({
        readExact: async (path: string) => {
          const raw = documents.get(path);
          return raw === undefined
            ? { exists: false as const }
            : { exists: true as const, raw };
        },
        createExact: async (path: string, raw: string) => {
          if (documents.has(path)) throw new Error("test_conflict");
          documents.set(path, raw);
        },
      }),
  ),
});

const readCanonicalDocumentExact = jest.fn(
  async (input: { documentPath: string }) => {
    const canonicalRaw = input.documentPath.includes("season_release_pointers")
      ? canonicalJsonV1(view.activePointer)
      : input.documentPath.includes("season_release_manifests")
        ? canonicalJsonV1(view.manifestRecord)
        : documents.get(input.documentPath);
    if (canonicalRaw === undefined) throw new Error("test_document_missing");
    return {
      documentPath: input.documentPath,
      canonicalRaw,
      readTime: { seconds: "1", nanoseconds: 0 },
      updateTime: { seconds: "1", nanoseconds: 0 },
    };
  },
);

jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => ({
    storage,
    firestore,
    readCanonicalDocumentExact,
  }),
}));

describe("Firebase Activity learner-core release publisher", () => {
  beforeEach(() => {
    tamperPath = null;
    validatorOutcome = "eligible_for_human_review_only";
    jest.clearAllMocks();
  });

  it("keeps an exact zero-argument server-only export boundary", () => {
    expect(Object.keys(releasePublisherModule)).toEqual([
      "createFirebaseAdminV2ActivityLearnerCoreReleasePublisherV1",
    ]);
    expect(Object.keys(releaseAdapterModule).sort()).toEqual(
      [
        "V2_FIREBASE_ACTIVITY_LEARNER_CORE_RELEASE_SUMMARY_SCHEMA_V1",
        "createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1",
        "getV2FirebaseActivityLearnerCoreReleaseSummaryV1",
        "isV2FirebaseActivityLearnerCoreReleaseHandleV1",
      ].sort(),
    );
    expect(
      createFirebaseAdminV2ActivityLearnerCoreReleasePublisherV1.length,
    ).toBe(0);
    expect(
      createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1.length,
    ).toBe(0);
  });

  it("publishes root-last, cold-readbacks and resolves exact released session bytes", async () => {
    expect(
      createFirebaseAdminV2ActivityLearnerCoreReleasePublisherV1.length,
    ).toBe(0);
    const handle =
      await createFirebaseAdminV2ActivityLearnerCoreReleasePublisherV1().publish(
        {
          plan: plan as never,
          validatorHandle: validatorHandle as never,
          publishedView: view,
          expectedEnvironment: "lab",
          episodeId: "episode-1",
        },
      );
    expect(isV2FirebaseActivityLearnerCoreReleaseHandleV1(handle)).toBe(true);
    expect(
      getV2FirebaseActivityLearnerCoreReleaseSummaryV1(handle),
    ).toMatchObject({
      sessionCount: 12,
      objectCount: 24,
      activityPackageFingerprint: packageFingerprint,
      validatorSummaryFingerprint: validatorSummary.summaryFingerprint,
      repositoryOriginAuthority: "firebase_admin_active_release_snapshot",
      learnerCoreIndexAuthority: "generation_pinned_immutable_readback",
      runtimeAuthority: "authenticated_release_learner_core_identity_only",
      publicationAuthority: "none",
      releaseAuthority: false,
    });
    const selected =
      await createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1().load({
        environment: "lab",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        seasonId: "season-1",
        episodeId: "episode-1",
      });
    const session =
      await createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1().resolveSession(
        selected,
        7,
      );
    expect(session).toMatchObject({
      sessionOrdinal: 7,
      sessionId: "episode-1:session:07",
      activityPackageFingerprint: packageFingerprint,
      renderRaw: sessionMaterials[6]!.renderRaw,
      capsuleEnvelopeRaw: sessionMaterials[6]!.capsuleEnvelopeRaw,
      storageIntegrity: "exact_generation_hash_size_content_type_readback",
      runtimeAuthority: "authenticated_release_session_bytes_only",
      releaseAuthority: false,
    });
    expect(firestore.runTransaction).toHaveBeenCalledTimes(1);
  });

  it("fails closed on copied validator handle and generation-pinned child tamper", async () => {
    await expect(
      createFirebaseAdminV2ActivityLearnerCoreReleasePublisherV1().publish({
        plan: plan as never,
        validatorHandle: { ...validatorHandle } as never,
        publishedView: view,
        expectedEnvironment: "lab",
        episodeId: "episode-1",
      }),
    ).rejects.toThrow("test_handle_invalid");
    validatorOutcome = "blocked";
    await expect(
      createFirebaseAdminV2ActivityLearnerCoreReleasePublisherV1().publish({
        plan: plan as never,
        validatorHandle: validatorHandle as never,
        publishedView: view,
        expectedEnvironment: "lab",
        episodeId: "episode-1",
      }),
    ).rejects.toThrow(
      "v2_firebase_activity_learner_core_release_publish_invalid",
    );
    validatorOutcome = "eligible_for_human_review_only";
    await createFirebaseAdminV2ActivityLearnerCoreReleasePublisherV1().publish({
      plan: plan as never,
      validatorHandle: validatorHandle as never,
      publishedView: view,
      expectedEnvironment: "lab",
      episodeId: "episode-1",
    });
    const adapter = createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1();
    const handle = await adapter.load({
      environment: "lab",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      seasonId: "season-1",
      episodeId: "episode-1",
    });
    tamperPath = sessionMaterials[4]!.renderPin.objectPath;
    await expect(adapter.resolveSession(handle, 5)).rejects.toThrow(
      "v2_firebase_activity_learner_core_release_invalid",
    );
    expect(isV2FirebaseActivityLearnerCoreReleaseHandleV1({ ...handle })).toBe(
      false,
    );
  });
});
