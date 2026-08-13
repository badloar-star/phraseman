import {
  buildV2SeasonReleaseRecord,
  v2ManifestHash,
  type V2PublishedSeasonManifestView,
  type V2SeasonReleaseManifestBody,
  type V2SeasonReleasePointer,
} from "../modules/learning-v2/content/release_manifest";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../modules/learning-v2/policies/decision_registry";
import {
  encodeLearningV2ActivityLearnerCoreReleaseIndexV1,
  isLearningV2ActivityLearnerCoreReleaseIndexV1,
  materializeLearningV2ActivityLearnerCoreReleaseIndexV1,
  parseLearningV2ActivityLearnerCoreReleaseIndexV1,
} from "../modules/learning-v2/runtime/activity_learner_core_release_index_v1";
import {
  encodeV2ActivityLearnerCoreReleasePointerV1,
  inspectV2ActivityLearnerCoreReleaseIndexPermitV1,
  isV2ActivityLearnerCoreReleasePointerV1,
  materializeV2ActivityLearnerCoreReleasePointerV1,
  parseV2ActivityLearnerCoreReleasePointerV1,
  v2ActivityLearnerCoreReleasePointerDocumentPathV1,
} from "../functions/src/content_factory/v2_activity_learner_core_release_pointer_v1";

const h = (value: unknown) => hashCanonicalBody(value);

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
      byteSize: 2048,
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

function session(sessionOrdinal: number) {
  const sourceFingerprint = h(["source", sessionOrdinal]);
  const sessionId = `episode-1:session:${String(sessionOrdinal).padStart(2, "0")}`;
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
      tasks: Array.from({ length: 12 }, (_, index) => ({
        taskId: `task-${sessionOrdinal}-${index + 1}`,
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
    capsules: Array.from({ length: 12 }, (_, index) =>
      canonicalJsonV1({ capsule: `${sessionOrdinal}-${index + 1}` }),
    ),
    commitmentAggregate: h(["commitments", sessionOrdinal]),
    consumer: "app_internal_local_evaluator_only",
    verdictAuthority: "local_provisional_only",
  });
  const renderHash = sha256Utf8(renderRaw);
  const capsuleHash = sha256Utf8(capsuleEnvelopeRaw);
  const prefix = `learning-v2/canonical/activity-instances/${sha256Utf8("stage-activity-1")}/sessions/${String(sessionOrdinal).padStart(2, "0")}`;
  return Object.freeze({
    sessionId,
    sessionOrdinal,
    renderRaw,
    capsuleEnvelopeRaw,
    renderPin: Object.freeze({
      objectPath: `${prefix}/render/${renderHash}.json`,
      contentHash: renderHash,
      objectGeneration: String(100 + sessionOrdinal),
      byteSize: utf8ByteLengthV1(renderRaw),
      contentType: "application/json; charset=utf-8" as const,
    }),
    capsulePin: Object.freeze({
      objectPath: `${prefix}/capsule/${capsuleHash}.json`,
      contentHash: capsuleHash,
      objectGeneration: String(200 + sessionOrdinal),
      byteSize: utf8ByteLengthV1(capsuleEnvelopeRaw),
      contentType: "application/json; charset=utf-8" as const,
    }),
  });
}

function build() {
  return materializeLearningV2ActivityLearnerCoreReleaseIndexV1({
    publishedView: publishedView(),
    expectedEnvironment: "lab",
    episodeId: "episode-1",
    stageId: "stage-activity-1",
    activityPackageFingerprint: h("activity-package"),
    validatorSummaryFingerprint: h("validator-summary"),
    permitAggregateFingerprint: h("permit-aggregate"),
    childReadbackAggregateFingerprint: h("child-readback"),
    storageReadbackFingerprint: h("storage-readback"),
    sessions: Array.from({ length: 12 }, (_, index) => session(index + 1)),
  });
}

describe("Learning V2 learner-core release index", () => {
  it("binds exactly twelve generation-pinned render/capsule pairs to the active release", () => {
    const index = build();
    const parsed = parseLearningV2ActivityLearnerCoreReleaseIndexV1(
      encodeLearningV2ActivityLearnerCoreReleaseIndexV1(index),
    );
    expect(parsed).toMatchObject({
      environment: "lab",
      episodeId: "episode-1",
      stageId: "stage-activity-1",
      sessionCount: 12,
      objectCount: 24,
      releaseIdentityEvidence: "validated_published_view_structure_only",
      validatorEvidence: "opaque_validator_material_projected_structurally",
      repositoryOriginAuthority: "none_server_readback_required",
      storageAuthority: "none_server_readback_required",
      runtimeAuthority: "none_active_pointer_and_readback_required",
      releaseAuthority: false,
    });
    expect(parsed.sessions).toHaveLength(12);
    expect(parsed.sessions[9]).toMatchObject({
      sessionOrdinal: 10,
      sessionId: "episode-1:session:10",
      render: { objectGeneration: "110" },
      capsule: { objectGeneration: "210" },
    });
    expect(isLearningV2ActivityLearnerCoreReleaseIndexV1({ ...parsed })).toBe(
      false,
    );
    const pointer = materializeV2ActivityLearnerCoreReleasePointerV1({
      indexRaw: encodeLearningV2ActivityLearnerCoreReleaseIndexV1(parsed),
      indexObjectGeneration: "501",
    });
    const pointerRaw = encodeV2ActivityLearnerCoreReleasePointerV1(pointer);
    expect(
      inspectV2ActivityLearnerCoreReleaseIndexPermitV1(pointerRaw, {
        environment: parsed.environment,
        releaseId: parsed.releaseId,
        activeManifestHash: parsed.activeManifestHash,
        seasonId: parsed.seasonId,
        episodeId: parsed.episodeId,
      }),
    ).toMatchObject({
      stageId: parsed.stageId,
      activityPackageFingerprint: parsed.activityPackageFingerprint,
      indexFingerprint: parsed.indexFingerprint,
      permitAuthority: "none_untrusted_read_permit_only",
    });
    expect(
      parseV2ActivityLearnerCoreReleasePointerV1(pointerRaw, parsed),
    ).toEqual(pointer);
    expect(
      v2ActivityLearnerCoreReleasePointerDocumentPathV1({
        activeManifestHash: parsed.activeManifestHash,
        episodeId: parsed.episodeId,
      }),
    ).toMatch(
      /^content_v2_activity_learner_core_release_pointers\/[a-f0-9]{64}__[a-f0-9]{64}$/u,
    );
    expect(isV2ActivityLearnerCoreReleasePointerV1({ ...pointer })).toBe(false);
  });

  it("rejects reordered sessions, path drift, byte drift and authority escalation even after refingerprinting", () => {
    const index = build();
    const mutations = [
      (value: any) => {
        [value.sessions[0], value.sessions[1]] = [
          value.sessions[1],
          value.sessions[0],
        ];
      },
      (value: any) => {
        value.sessions[0].render.objectPath =
          value.sessions[1].render.objectPath;
      },
      (value: any) => {
        value.sessions[0].render.contentType = "application/octet-stream";
      },
      (value: any) => {
        value.runtimeAuthority = "active_release_runtime";
      },
    ];
    for (const mutate of mutations) {
      const value = JSON.parse(
        encodeLearningV2ActivityLearnerCoreReleaseIndexV1(index),
      );
      mutate(value);
      const body = { ...value };
      delete body.indexFingerprint;
      value.indexFingerprint = h(body);
      expect(() =>
        parseLearningV2ActivityLearnerCoreReleaseIndexV1(
          canonicalJsonV1(value),
        ),
      ).toThrow("learning_v2_activity_learner_core_release_index_invalid");
    }
  });
});
