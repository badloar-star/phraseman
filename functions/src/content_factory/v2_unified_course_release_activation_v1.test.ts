import { sha256Utf8 } from "../../../modules/learning-v2/policies/decision_registry";
import {
  materializeV2OwnerEpisodeConfirmationV1,
  type V2OwnerEpisodeConfirmationV1,
} from "./v2_owner_episode_confirmation_v1";
import {
  isV2UnifiedCourseReleaseActivationPreflightV1,
  materializeV2UnifiedCourseReleaseActivationPreflightV1,
} from "./v2_unified_course_release_activation_v1";
import {
  materializeV2UnifiedCourseReleaseRootV1,
  type V2UnifiedCourseReleaseEpisodeV1,
} from "./v2_unified_course_release_v1";

const hash = (value: string) => sha256Utf8(value);
const pin = (name: string) => ({
  objectPath: `learning-v2/release/${name}/${hash(name)}.json`,
  contentHash: hash(name),
  objectGeneration: "7",
  byteSize: 100,
  contentType: "application/json; charset=utf-8" as const,
});

function episode(
  ordinal: number,
): Omit<V2UnifiedCourseReleaseEpisodeV1, "episodeReleaseFingerprint"> {
  const prefix = `e${ordinal}`;
  return {
    episodeOrdinal: ordinal,
    episodeId: `episode-${ordinal}`,
    stageId: `stage-${ordinal}`,
    activityAssemblyFingerprint: hash(`${prefix}-assembly`),
    activityPackageFingerprint: hash(`${prefix}-package`),
    ownerInputFingerprint: hash(`${prefix}-owner`),
    ownerConfirmationFingerprint: hash(`${prefix}-confirmation-logical`),
    ownerConfirmationObject: pin(`${prefix}-confirmation-object`),
    learnerCoreIndexFingerprint: hash(`${prefix}-learner`),
    learnerCoreIndexObject: pin(`${prefix}-learner`),
    serverEvaluatorIndexFingerprint: hash(`${prefix}-evaluator`),
    serverEvaluatorIndexObject: pin(`${prefix}-evaluator`),
    auxiliaryIndexFingerprint: hash(`${prefix}-auxiliary`),
    auxiliaryIndexObject: pin(`${prefix}-auxiliary`),
    voiceAudioIndexFingerprint: hash(`${prefix}-voice`),
    voiceAudioIndexObject: pin(`${prefix}-voice`),
    localizationIndexFingerprint: hash(`${prefix}-locale`),
    localizationIndexObject: pin(`${prefix}-locale`),
    errorGuidanceIndexFingerprint: hash(`${prefix}-errors`),
    errorGuidanceIndexObject: pin(`${prefix}-errors`),
  };
}

function fixture() {
  const planFingerprint = hash("plan");
  const courseContractFingerprint = hash("course");
  const confirmations: V2OwnerEpisodeConfirmationV1[] = [];
  const episodes = Array.from({ length: 32 }, (_, index) => {
    const row = episode(index + 1);
    const confirmation = materializeV2OwnerEpisodeConfirmationV1({
      planFingerprint,
      courseContractFingerprint,
      stageId: row.stageId,
      episodeId: row.episodeId,
      ownerInputFingerprint: row.ownerInputFingerprint,
      activityAssemblyFingerprint: row.activityAssemblyFingerprint,
      stageReviewFingerprint: hash(`review-${index + 1}`),
      ownerIdentityFingerprint: hash("owner"),
      confirmedAtIso: "2026-08-13T12:00:00.000Z",
      reason: `Owner confirms episode ${index + 1}.`,
      contentClass: "production_candidate",
    });
    confirmations.push(confirmation);
    return {
      ...row,
      ownerConfirmationFingerprint: confirmation.confirmationFingerprint,
    };
  });
  const root = materializeV2UnifiedCourseReleaseRootV1({
    environment: "production",
    releaseId: "release-owner-confirmed",
    activeManifestHash: hash("active-manifest"),
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
  return {
    root,
    confirmations: confirmations.map((confirmation, index) => ({
      episodeOrdinal: index + 1,
      confirmation,
      confirmationObject: root.episodes[index]!.ownerConfirmationObject,
    })),
  };
}

describe("Learning V2 unified release activation preflight", () => {
  it("binds all 32 exact owner confirmations without granting activation authority", () => {
    const input = fixture();
    const result =
      materializeV2UnifiedCourseReleaseActivationPreflightV1(input);
    expect(result).toMatchObject({
      confirmationReadbackCount: 32,
      classification: "eligible_for_server_exact_leaf_readback_only",
      ownerAuthenticationAuthority: "none",
      ownerConfirmationAuthority: "none_structural_brands_only",
      artifactStorageAuthority: "none",
      humanApprovalAuthority: "none",
      publicationDecisionAuthority: "none",
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(isV2UnifiedCourseReleaseActivationPreflightV1(result)).toBe(true);
    expect(isV2UnifiedCourseReleaseActivationPreflightV1({ ...result })).toBe(
      false,
    );
  });

  it("rejects missing, reordered, substituted and cloned confirmations", () => {
    const input = fixture();
    expect(() =>
      materializeV2UnifiedCourseReleaseActivationPreflightV1({
        ...input,
        confirmations: input.confirmations.slice(0, 31),
      }),
    ).toThrow("input_invalid");
    expect(() =>
      materializeV2UnifiedCourseReleaseActivationPreflightV1({
        ...input,
        confirmations: [
          input.confirmations[1]!,
          input.confirmations[0]!,
          ...input.confirmations.slice(2),
        ],
      }),
    ).toThrow("confirmation_invalid");
    expect(() =>
      materializeV2UnifiedCourseReleaseActivationPreflightV1({
        ...input,
        confirmations: input.confirmations.map((entry, index) =>
          index === 0
            ? {
                ...entry,
                confirmationObject: pin("substituted-confirmation"),
              }
            : entry,
        ),
      }),
    ).toThrow("confirmation_subject_mismatch");
    expect(() =>
      materializeV2UnifiedCourseReleaseActivationPreflightV1({
        ...input,
        confirmations: input.confirmations.map((entry, index) =>
          index === 0
            ? { ...entry, confirmation: { ...entry.confirmation } }
            : entry,
        ) as typeof input.confirmations,
      }),
    ).toThrow("confirmation_invalid");
  });
});
