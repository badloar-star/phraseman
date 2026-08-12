import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const plan = Object.freeze({
  planFingerprint: h("plan"),
  courseContract: Object.freeze({
    courseContractFingerprint: h("course"),
  }),
});
const workspace = Object.freeze({
  planFingerprint: plan.planFingerprint,
  workspaceFingerprint: h("workspace"),
  stage: Object.freeze({ stageId: "voice-stage-1", kind: "v2_voice_targets" }),
});
const candidate = Object.freeze({
  planFingerprint: plan.planFingerprint,
  workspaceFingerprint: workspace.workspaceFingerprint,
  stageId: workspace.stage.stageId,
  stageKind: "v2_voice_targets",
  candidateFingerprint: h("candidate"),
  contentClass: "production_candidate",
});
const speechObservation = Object.freeze({
  profileId: "speech-en",
  version: 1,
  contentHash: h("speech-body"),
});
const voiceObservation = Object.freeze({
  profileId: "voice-generation",
  version: 1,
  contentHash: h("voice-body"),
});
const voiceGenerationProfile = Object.freeze({ profileId: "voice-generation" });
const profileHandle = Object.freeze({ private: "profile" });
const profileSummary = Object.freeze({
  episodeId: "episode-1",
  speechProfileObservationFingerprint: h("speech-observation"),
  voiceGenerationProfileObservationFingerprint: h("voice-observation"),
  profileObservationAggregateFingerprint: h("profile-aggregate"),
  summaryFingerprint: h("profile-summary"),
});
const packageValue = Object.freeze({
  root: Object.freeze({
    speechProfileRef: speechObservation,
    voiceGenerationProfileRef: voiceObservation,
    artifactFingerprint: h("package"),
    targetCount: 12,
    wordTargetCount: 24,
    generationTargetCount: 144,
  }),
});
const packageInputs = Object.freeze({
  plan,
  workspace,
  voiceGenerationProfile,
});
const validationResult = Object.freeze({
  outcome: "eligible_for_human_review_only",
  resultFingerprint: h("validation"),
});

jest.mock("./v2_canonical_generation_plan_v2", () => ({
  isV2CanonicalSeasonPlanV2: (value: unknown) => value === plan,
}));
jest.mock("./v2_generation_workspace_contract_v2", () => ({
  isV2GenerationStageWorkspaceV2: (value: unknown) => value === workspace,
  isV2CanonicalStageCandidateV2: (value: unknown) => value === candidate,
}));
jest.mock("./v2_firebase_voice_profile_repository_adapter_v1", () => ({
  getV2FirebaseVoiceProfileRepositorySummaryV1: (value: unknown) => {
    if (value !== profileHandle) throw new Error("test_profile_handle_invalid");
    return profileSummary;
  },
  resolveV2FirebaseVoiceProfileRepositoryMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
  }) => {
    if (
      input.handle !== profileHandle ||
      input.plan !== plan ||
      input.stageId !== workspace.stage.stageId
    )
      throw new Error("test_profile_handle_invalid");
    return Object.freeze({
      plan,
      stageId: workspace.stage.stageId,
      summary: profileSummary,
      speechProfile: Object.freeze({ profileId: "speech-en" }),
      voiceGenerationProfile,
      speechObservation,
      voiceGenerationObservation: voiceObservation,
    });
  },
}));
jest.mock("./v2_voice_targets_package_v2", () => ({
  isV2VoiceTargetsPackageBoundToV2: (value: unknown, inputs: unknown) =>
    value === packageValue && inputs === packageInputs,
}));
jest.mock("./v2_voice_targets_validator_v1", () => ({
  validateV2VoiceTargetsCandidateV1: () => validationResult,
  isV2VoiceTargetsValidationResultV1: (value: unknown) =>
    value === validationResult,
}));

// Jest hoists all private-boundary mocks before this import.
// eslint-disable-next-line import/first
import {
  bindV2FirebaseVoiceTargetsAuthenticatedInputV1,
  getV2FirebaseVoiceTargetsAuthenticatedInputSummaryV1,
  isV2FirebaseVoiceTargetsAuthenticatedInputHandleV1,
  resolveV2FirebaseVoiceTargetsAuthenticatedInputMaterialV1,
} from "./v2_firebase_voice_targets_authenticated_input_v1";

describe("Learning V2 authenticated Voice Targets input binder", () => {
  it("binds the exact candidate/package to the private published-profile handle", () => {
    const handle = bindV2FirebaseVoiceTargetsAuthenticatedInputV1({
      profileHandle: profileHandle as never,
      plan: plan as never,
      workspace: workspace as never,
      candidate: candidate as never,
      packageValue: packageValue as never,
      packageInputs: packageInputs as never,
    });
    const summary =
      getV2FirebaseVoiceTargetsAuthenticatedInputSummaryV1(handle);
    expect(isV2FirebaseVoiceTargetsAuthenticatedInputHandleV1(handle)).toBe(
      true,
    );
    expect(summary.repositoryOriginAuthority).toBe(
      "authenticated_project_repository_snapshot",
    );
    expect(summary.profileLifecycleAuthority).toBe(
      "published_head_observation_only",
    );
    expect(summary.dependencyResolutionAuthority).toBe(
      "authenticated_profile_stage_subset_only",
    );
    expect(summary.providerExecutionAuthority).toBe("none");
    expect(summary.audioByteAuthority).toBe("none");
    expect(summary.releaseAuthority).toBe(false);
    expect(
      resolveV2FirebaseVoiceTargetsAuthenticatedInputMaterialV1({
        handle,
        plan: plan as never,
        stageId: workspace.stage.stageId,
      }).candidate,
    ).toBe(candidate);
  });

  it("rejects summary/clone/cross-stage replay and profile substitution", () => {
    const handle = bindV2FirebaseVoiceTargetsAuthenticatedInputV1({
      profileHandle: profileHandle as never,
      plan: plan as never,
      workspace: workspace as never,
      candidate: candidate as never,
      packageValue: packageValue as never,
      packageInputs: packageInputs as never,
    });
    const summary =
      getV2FirebaseVoiceTargetsAuthenticatedInputSummaryV1(handle);
    expect(isV2FirebaseVoiceTargetsAuthenticatedInputHandleV1(summary)).toBe(
      false,
    );
    expect(isV2FirebaseVoiceTargetsAuthenticatedInputHandleV1({})).toBe(false);
    expect(() =>
      resolveV2FirebaseVoiceTargetsAuthenticatedInputMaterialV1({
        handle,
        plan: plan as never,
        stageId: "voice-stage-2",
      }),
    ).toThrow("v2_firebase_voice_targets_authenticated_input_invalid");
    expect(() =>
      bindV2FirebaseVoiceTargetsAuthenticatedInputV1({
        profileHandle: {} as never,
        plan: plan as never,
        workspace: workspace as never,
        candidate: candidate as never,
        packageValue: packageValue as never,
        packageInputs: packageInputs as never,
      }),
    ).toThrow("test_profile_handle_invalid");
  });
});
