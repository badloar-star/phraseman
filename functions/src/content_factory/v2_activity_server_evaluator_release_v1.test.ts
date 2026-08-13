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
  encodeV2ActivityServerEvaluatorReleaseIndexV1,
  encodeV2ActivityServerEvaluatorReleasePointerV1,
  materializeV2ActivityServerEvaluatorReleaseIndexV1,
  materializeV2ActivityServerEvaluatorReleasePointerV1,
  parseV2ActivityServerEvaluatorReleaseIndexV1,
  parseV2ActivityServerEvaluatorReleasePointerV1,
  v2ActivityServerEvaluatorReleasePointerDocumentPathV1,
} from "./v2_activity_server_evaluator_release_v1";
import { v2ActivitySessionProjectionObjectPath } from "./v2_activity_instances_package_v2";

const h = (value: unknown) => hashCanonicalBody(value);
const stageId = "stage-activity-1";
const episodeId = "episode-1";

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

function sessionMaterial(sessionOrdinal: number) {
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
  return Object.freeze({
    sessionId,
    sessionOrdinal,
    sidecarRaw,
    sidecarPin: Object.freeze({
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
    }),
  });
}

describe("Activity server evaluator release contract", () => {
  const view = publishedView();
  const sessions = Array.from({ length: 12 }, (_, index) =>
    sessionMaterial(index + 1),
  );

  it("binds twelve server-only sidecars to one active release and pointer", () => {
    const index = materializeV2ActivityServerEvaluatorReleaseIndexV1({
      publishedView: view,
      expectedEnvironment: "lab",
      episodeId,
      stageId,
      activityPackageFingerprint: h("package"),
      validatorSummaryFingerprint: h("validator"),
      sessions,
    });
    expect(index).toMatchObject({
      releaseId: "release-1",
      episodeId,
      stageId,
      sessionCount: 12,
      objectCount: 12,
      serverOnly: true,
      clientDelivery: "forbidden",
      evaluatorKeyAuthority: "candidate_data_only",
      evaluationAuthority: "none_server_policy_required",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      completionAuthority: "none",
      publicationAuthority: "none",
      releaseAuthority: false,
    });
    const indexRaw = encodeV2ActivityServerEvaluatorReleaseIndexV1(index);
    expect(parseV2ActivityServerEvaluatorReleaseIndexV1(indexRaw)).toEqual(
      index,
    );
    const pointer = materializeV2ActivityServerEvaluatorReleasePointerV1({
      indexRaw,
      indexObjectGeneration: "999",
    });
    const pointerRaw = encodeV2ActivityServerEvaluatorReleasePointerV1(pointer);
    expect(
      parseV2ActivityServerEvaluatorReleasePointerV1(pointerRaw, index),
    ).toEqual(pointer);
    expect(
      v2ActivityServerEvaluatorReleasePointerDocumentPathV1({
        activeManifestHash: index.activeManifestHash,
        episodeId,
      }),
    ).toMatch(/^content_v2_activity_server_evaluator_release_pointers\//u);
  });

  it("fails closed on sidecar identity, pin, authority and pointer drift", () => {
    const mutate = (value: unknown, body: (draft: any) => void): string => {
      const draft =
        typeof value === "string"
          ? JSON.parse(value)
          : JSON.parse(canonicalJsonV1(value));
      body(draft);
      return canonicalJsonV1(draft);
    };
    expect(() =>
      materializeV2ActivityServerEvaluatorReleaseIndexV1({
        publishedView: view,
        expectedEnvironment: "lab",
        episodeId,
        stageId,
        activityPackageFingerprint: h("package"),
        validatorSummaryFingerprint: h("validator"),
        sessions: sessions.map((session, index) =>
          index === 0
            ? {
                ...session,
                sidecarRaw: mutate(session.sidecarRaw, (draft) => {
                  draft.sessionOrdinal = 2;
                }),
              }
            : session,
        ),
      }),
    ).toThrow("v2_activity_server_evaluator_release_invalid");
    expect(() =>
      materializeV2ActivityServerEvaluatorReleaseIndexV1({
        publishedView: view,
        expectedEnvironment: "lab",
        episodeId,
        stageId,
        activityPackageFingerprint: h("package"),
        validatorSummaryFingerprint: h("validator"),
        sessions: sessions.map((session, index) =>
          index === 0
            ? {
                ...session,
                sidecarPin: {
                  ...session.sidecarPin,
                  objectGeneration: "0",
                },
              }
            : session,
        ),
      }),
    ).toThrow("v2_activity_server_evaluator_release_invalid");

    const index = materializeV2ActivityServerEvaluatorReleaseIndexV1({
      publishedView: view,
      expectedEnvironment: "lab",
      episodeId,
      stageId,
      activityPackageFingerprint: h("package"),
      validatorSummaryFingerprint: h("validator"),
      sessions,
    });
    const indexRaw = encodeV2ActivityServerEvaluatorReleaseIndexV1(index);
    expect(() =>
      parseV2ActivityServerEvaluatorReleaseIndexV1(
        mutate(indexRaw, (draft) => {
          draft.clientDelivery = "allowed";
          draft.indexFingerprint = h(
            Object.fromEntries(
              Object.entries(draft).filter(
                ([key]) => key !== "indexFingerprint",
              ),
            ),
          );
        }),
      ),
    ).toThrow("v2_activity_server_evaluator_release_invalid");
    const pointer = materializeV2ActivityServerEvaluatorReleasePointerV1({
      indexRaw,
      indexObjectGeneration: "999",
    });
    expect(() =>
      parseV2ActivityServerEvaluatorReleasePointerV1(
        mutate(pointer, (draft) => {
          draft.activityPackageFingerprint = h("other-package");
          draft.pointerFingerprint = h(
            Object.fromEntries(
              Object.entries(draft).filter(
                ([key]) => key !== "pointerFingerprint",
              ),
            ),
          );
        }),
        index,
      ),
    ).toThrow("v2_activity_server_evaluator_release_invalid");
  });
});
