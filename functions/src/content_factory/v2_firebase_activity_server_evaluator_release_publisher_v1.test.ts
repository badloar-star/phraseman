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
import { v2ActivitySessionProjectionObjectPath } from "./v2_activity_instances_package_v2";
import {
  createFirebaseAdminV2ActivityServerEvaluatorReleaseAdapterV1,
  getV2FirebaseActivityServerEvaluatorReleaseSummaryV1,
  isV2FirebaseActivityServerEvaluatorReleaseHandleV1,
} from "./v2_firebase_activity_server_evaluator_release_adapter_v1";
import * as adapterModule from "./v2_firebase_activity_server_evaluator_release_adapter_v1";
import { createFirebaseAdminV2ActivityServerEvaluatorReleasePublisherV1 } from "./v2_firebase_activity_server_evaluator_release_publisher_v1";
import * as publisherModule from "./v2_firebase_activity_server_evaluator_release_publisher_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const plan = Object.freeze({ planFingerprint: h("plan") });
const validatorHandle = Object.freeze({ kind: "validator" });
const stageId = "stage-activity-1";
const episodeId = "episode-1";
const packageFingerprint = h("activity-package");
const validatorSummary = Object.freeze({
  outcome: "eligible_for_human_review_only" as const,
  episodeId,
  stageId,
  packageFingerprint,
  summaryFingerprint: h("validator-summary"),
  validatedSessionCount: 12 as const,
  validatedTaskCount: 144 as const,
  artifactStorageAuthority:
    "firebase_admin_generation_pinned_readback" as const,
});
let validatorOutcome: "blocked" | "eligible_for_human_review_only" =
  "eligible_for_human_review_only";

function publishedView(): V2PublishedSeasonManifestView {
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
      {
        episodeId,
        lessonId: 1,
        object: {
          path: "learning-v2/releases/season-1/episode-1.json",
          generation: "8",
          contentHash: h("lesson-unit"),
          byteSize: 4096,
        },
      },
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
let generation = 800;
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
  const sessionId = `${episodeId}:session:${String(sessionOrdinal).padStart(2, "0")}`;
  const sourceFingerprint = h(["source", sessionOrdinal]);
  const sidecarRaw = canonicalJsonV1({
    schemaVersion: "v2-activity-session-server-sidecar.v2",
    sourceFingerprint,
    episodeId,
    sessionId,
    sessionOrdinal,
    tasks: Array.from({ length: 12 }, (_, taskIndex) => ({
      taskId: `task-${sessionOrdinal}-${taskIndex + 1}`,
    })),
    commitmentAggregate: h(["commitments", sessionOrdinal]),
    serverOnly: true,
    evaluationAuthority: "none",
    rewardAuthority: "none",
    releaseAuthority: false,
  });
  const contentHash = sha256Utf8(sidecarRaw);
  const sidecarPin = Object.freeze({
    objectPath: v2ActivitySessionProjectionObjectPath(
      stageId,
      sessionOrdinal,
      "sidecar",
      contentHash,
    ),
    contentHash,
    objectGeneration: String(300 + sessionOrdinal),
    byteSize: new TextEncoder().encode(sidecarRaw).byteLength,
    contentType: "application/json; charset=utf-8" as const,
  });
  store(sidecarPin.objectPath, sidecarRaw, sidecarPin.objectGeneration);
  return Object.freeze({
    stageId,
    episodeId,
    sessionId,
    sessionOrdinal,
    packageFingerprint,
    validatorSummaryFingerprint: validatorSummary.summaryFingerprint,
    sidecarRaw,
    sidecarPin,
    evaluatorKeyDelivery: "server_only_never_learner_projection" as const,
    evaluationAuthority: "candidate_only_server_policy_required" as const,
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
  resolveV2FirebaseActivityInstancesServerEvaluatorSessionMaterialV1: (input: {
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
      if (objects.has(input.objectPath))
        return { kind: "precondition_failed" as const };
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

describe("Firebase Activity server evaluator release", () => {
  beforeEach(() => {
    tamperPath = null;
    validatorOutcome = "eligible_for_human_review_only";
    jest.clearAllMocks();
  });

  it("publishes root-last, cold-readbacks and never grants economic authority", async () => {
    expect(Object.keys(publisherModule)).toEqual([
      "createFirebaseAdminV2ActivityServerEvaluatorReleasePublisherV1",
    ]);
    expect(Object.keys(adapterModule).sort()).toEqual(
      [
        "V2_FIREBASE_ACTIVITY_SERVER_EVALUATOR_RELEASE_SUMMARY_SCHEMA_V1",
        "createFirebaseAdminV2ActivityServerEvaluatorReleaseAdapterV1",
        "getV2FirebaseActivityServerEvaluatorReleaseSummaryV1",
        "isV2FirebaseActivityServerEvaluatorReleaseHandleV1",
      ].sort(),
    );
    const handle =
      await createFirebaseAdminV2ActivityServerEvaluatorReleasePublisherV1().publish(
        {
          plan: plan as never,
          validatorHandle: validatorHandle as never,
          publishedView: view,
          expectedEnvironment: "lab",
          episodeId,
        },
      );
    expect(isV2FirebaseActivityServerEvaluatorReleaseHandleV1(handle)).toBe(
      true,
    );
    expect(
      getV2FirebaseActivityServerEvaluatorReleaseSummaryV1(handle),
    ).toMatchObject({
      releaseId: "release-1",
      courseReleaseId: "course-release-1",
      episodeOrdinal: 1,
      sessionCount: 12,
      objectCount: 12,
      serverOnly: true,
      clientDelivery: "forbidden",
      repositoryOriginAuthority: "firebase_admin_active_release_snapshot",
      evaluatorIndexAuthority: "generation_pinned_immutable_readback",
      evaluationAuthority: "candidate_only_server_policy_required",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      completionAuthority: "none",
      publicationAuthority: "none",
      releaseAuthority: false,
    });
    const cold =
      await createFirebaseAdminV2ActivityServerEvaluatorReleaseAdapterV1().load(
        {
          environment: "lab",
          studyTarget: "en",
          learnerSourceLocale: "ru",
          seasonId: "season-1",
          episodeId,
        },
      );
    const session =
      await createFirebaseAdminV2ActivityServerEvaluatorReleaseAdapterV1().resolveSession(
        cold,
        7,
      );
    expect(session).toMatchObject({
      sessionOrdinal: 7,
      sidecarRaw: sessionMaterials[6]!.sidecarRaw,
      serverOnly: true,
      clientDelivery: "forbidden",
      storageIntegrity: "exact_generation_hash_size_content_type_readback",
      evaluationAuthority: "candidate_only_server_policy_required",
      walletAuthority: "none",
      masteryAuthority: "none",
      releaseAuthority: false,
    });
    expect(firestore.runTransaction).toHaveBeenCalledTimes(1);
  });

  it("rejects copied validator handles, blocked candidates and sidecar tamper", async () => {
    await expect(
      createFirebaseAdminV2ActivityServerEvaluatorReleasePublisherV1().publish({
        plan: plan as never,
        validatorHandle: { ...validatorHandle } as never,
        publishedView: view,
        expectedEnvironment: "lab",
        episodeId,
      }),
    ).rejects.toThrow("test_handle_invalid");
    validatorOutcome = "blocked";
    await expect(
      createFirebaseAdminV2ActivityServerEvaluatorReleasePublisherV1().publish({
        plan: plan as never,
        validatorHandle: validatorHandle as never,
        publishedView: view,
        expectedEnvironment: "lab",
        episodeId,
      }),
    ).rejects.toThrow(
      "v2_firebase_activity_server_evaluator_release_publish_invalid",
    );
    validatorOutcome = "eligible_for_human_review_only";
    await createFirebaseAdminV2ActivityServerEvaluatorReleasePublisherV1().publish(
      {
        plan: plan as never,
        validatorHandle: validatorHandle as never,
        publishedView: view,
        expectedEnvironment: "lab",
        episodeId,
      },
    );
    const adapter =
      createFirebaseAdminV2ActivityServerEvaluatorReleaseAdapterV1();
    const handle = await adapter.load({
      environment: "lab",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      seasonId: "season-1",
      episodeId,
    });
    tamperPath = sessionMaterials[4]!.sidecarPin.objectPath;
    await expect(adapter.resolveSession(handle, 5)).rejects.toThrow(
      "v2_firebase_activity_server_evaluator_release_invalid",
    );
    expect(
      isV2FirebaseActivityServerEvaluatorReleaseHandleV1({ ...handle }),
    ).toBe(false);
  });
});
