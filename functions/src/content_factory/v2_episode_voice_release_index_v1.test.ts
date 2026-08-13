import { createHash } from "node:crypto";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const mockPlan = Object.freeze({
  planFingerprint: hash("plan"),
  courseContract: Object.freeze({
    courseContractFingerprint: hash("course-contract"),
  }),
  stages: Object.freeze([
    Object.freeze({
      stageId: "activity-stage",
      kind: "v2_activity_instances",
      episodeId: "episode-01",
      dependsOn: Object.freeze([]),
    }),
    Object.freeze({
      stageId: "voice-stage",
      kind: "v2_voice_targets",
      episodeId: "episode-01",
      dependsOn: Object.freeze(["activity-stage"]),
    }),
  ]),
});
const mockHandles = Object.freeze({
  activity: Object.freeze({ kind: "activity" }),
  targets: Object.freeze({ kind: "targets" }),
  manifest: Object.freeze({ kind: "manifest" }),
  audio: Object.freeze({ kind: "audio" }),
  device: Object.freeze({ kind: "device" }),
  human: Object.freeze({ kind: "human" }),
});
const pin = (name: string) =>
  Object.freeze({
    objectPath: `learning-v2/voice/${name}/${hash(name)}.json`,
    contentHash: hash(`${name}:raw`),
    objectGeneration: "7",
    byteSize: 2_000,
    contentType: "application/json; charset=utf-8" as const,
  });
const mockActivity = Object.freeze({
  summary: Object.freeze({
    outcome: "eligible_for_human_review_only",
    stageId: "activity-stage",
    episodeId: "episode-01",
    validatedSessionCount: 12,
    validatedTaskCount: 144,
    packageFingerprint: hash("activity-package"),
    summaryFingerprint: hash("activity-validator-summary"),
  }),
});
const mockCatalog = Object.freeze({
  catalogFingerprint: hash("catalog"),
  activityProjectionAssemblyFingerprint: hash("activity-assembly"),
  activitySourceAggregateFingerprint: hash("activity-sources"),
  activityRenderAggregateFingerprint: hash("activity-renders"),
});
const mockTargets = Object.freeze({
  summary: Object.freeze({
    episodeId: "episode-01",
    candidateFingerprint: hash("voice-candidate"),
    packageFingerprint: hash("voice-package"),
    summaryFingerprint: hash("voice-targets-summary"),
  }),
  packageInputs: Object.freeze({ catalog: mockCatalog }),
  packageValue: Object.freeze({
    root: Object.freeze({
      artifactFingerprint: hash("voice-package"),
      activityAudioCatalogFingerprint: hash("catalog"),
      activitySourceAggregateFingerprint: hash("activity-sources"),
      activityRenderAggregateFingerprint: hash("activity-renders"),
    }),
  }),
});
const mockManifestValue = Object.freeze({
  candidateFingerprint: hash("voice-candidate"),
  packageFingerprint: hash("voice-package"),
  manifestFingerprint: hash("manifest"),
  audioObjectCount: 64,
  totalAudioBytes: 640_000,
});
const mockManifest = Object.freeze({
  manifest: mockManifestValue,
  summary: Object.freeze({
    manifestFingerprint: hash("manifest"),
    audioObjectCount: 64,
    manifestPin: pin("manifest"),
    summaryFingerprint: hash("manifest-summary"),
  }),
});
const mockAudio = Object.freeze({
  receipt: Object.freeze({ receiptFingerprint: hash("audio-receipt") }),
  summary: Object.freeze({
    manifestFingerprint: hash("manifest"),
    receiptFingerprint: hash("audio-receipt"),
    audioObjectCount: 64,
    receiptPin: pin("audio-receipt"),
    summaryFingerprint: hash("audio-summary"),
  }),
});
const mockDevice = Object.freeze({
  pageCommitPins: Object.freeze([pin("page-commit")]),
  decoderEpisodeReceipt: Object.freeze({
    receiptFingerprint: hash("decoder-receipt"),
    nativeDecoderFamily: "avplayer" as const,
  }),
  pcmEpisodeReceipt: Object.freeze({
    receiptFingerprint: hash("pcm-receipt"),
    blockingSignalItemCount: 0,
  }),
  summary: Object.freeze({
    manifestFingerprint: hash("manifest"),
    audioEpisodeReceiptFingerprint: hash("audio-receipt"),
    decoderEpisodeReceiptFingerprint: hash("decoder-receipt"),
    decoderEpisodeReceiptPin: pin("decoder-receipt"),
    pcmEpisodeReceiptFingerprint: hash("pcm-receipt"),
    pcmEpisodeReceiptPin: pin("pcm-receipt"),
    pageCount: 1,
    orderedPageCommitAggregateFingerprint: hash("page-commit-fingerprints"),
    platform: "ios" as const,
    deviceClass: "physical_device" as const,
    pcmEpisodeDisposition: "candidate_for_human_listening" as const,
    summaryFingerprint: hash("device-summary"),
  }),
});
const mockHuman = Object.freeze({
  receipt: Object.freeze({
    receiptFingerprint: hash("human-receipt"),
    episodeDecision: "approved" as const,
  }),
  summary: Object.freeze({
    manifestFingerprint: hash("manifest"),
    deviceEpisodeReceiptFingerprint: hash("pcm-receipt"),
    receiptFingerprint: hash("human-receipt"),
    receiptPin: pin("human-receipt"),
    episodeDecision: "approved" as const,
    listeningReviewerIdentityFingerprint: hash("listener"),
    linguistReviewerIdentityFingerprint: hash("linguist"),
    summaryFingerprint: hash("human-summary"),
  }),
});
let resolvedTargets: unknown = mockTargets;
let resolvedDevice: unknown = mockDevice;
let resolvedHuman: unknown = mockHuman;

jest.mock("./v2_firebase_activity_instances_validator_adapter_v1", () => ({
  resolveV2FirebaseActivityInstancesValidatorResultMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
  }) => {
    if (input.handle !== mockHandles.activity || input.plan !== mockPlan)
      throw new Error("mock_activity_invalid");
    return mockActivity;
  },
}));
jest.mock("./v2_firebase_voice_targets_authenticated_input_v1", () => ({
  resolveV2FirebaseVoiceTargetsAuthenticatedInputMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
  }) => {
    if (
      input.handle !== mockHandles.targets ||
      input.plan !== mockPlan ||
      input.stageId !== "voice-stage"
    )
      throw new Error("mock_targets_invalid");
    return resolvedTargets as typeof mockTargets;
  },
}));
jest.mock("./v2_firebase_voice_audio_manifest_adapter_v1", () => ({
  resolveV2FirebaseVoiceAudioManifestMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
  }) => {
    if (
      input.handle !== mockHandles.manifest ||
      input.plan !== mockPlan ||
      input.stageId !== "voice-stage"
    )
      throw new Error("mock_manifest_invalid");
    return mockManifest;
  },
}));
jest.mock("./v2_firebase_voice_audio_episode_receipt_adapter_v1", () => ({
  resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
    manifest: unknown;
  }) => {
    if (
      input.handle !== mockHandles.audio ||
      input.plan !== mockPlan ||
      input.stageId !== "voice-stage" ||
      input.manifest !== mockManifestValue
    )
      throw new Error("mock_audio_invalid");
    return mockAudio;
  },
}));
jest.mock("./v2_firebase_voice_device_observation_receipt_adapter_v1", () => ({
  resolveV2FirebaseVoiceDeviceEpisodeReceiptMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
    manifest: unknown;
  }) => {
    if (
      input.handle !== mockHandles.device ||
      input.plan !== mockPlan ||
      input.stageId !== "voice-stage" ||
      input.manifest !== mockManifestValue
    )
      throw new Error("mock_device_invalid");
    return resolvedDevice as typeof mockDevice;
  },
}));
jest.mock("./v2_firebase_voice_human_episode_review_adapter_v1", () => ({
  resolveV2FirebaseVoiceHumanEpisodeReviewMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
    manifest: unknown;
  }) => {
    if (
      input.handle !== mockHandles.human ||
      input.plan !== mockPlan ||
      input.stageId !== "voice-stage" ||
      input.manifest !== mockManifestValue
    )
      throw new Error("mock_human_invalid");
    return resolvedHuman as typeof mockHuman;
  },
}));

/* eslint-disable import/first -- private resolver mocks must be installed first */
import {
  encodeV2EpisodeVoiceReleaseIndexV1,
  isV2EpisodeVoiceReleaseIndexV1,
  materializeV2EpisodeVoiceReleaseIndexV1,
  parseV2EpisodeVoiceReleaseIndexAuditV1,
  parseV2EpisodeVoiceReleaseIndexV1,
  v2EpisodeVoiceReleaseIndexObjectPathV1,
} from "./v2_episode_voice_release_index_v1";
/* eslint-enable import/first */

function validInput() {
  return {
    plan: mockPlan as never,
    activityStageId: "activity-stage",
    voiceStageId: "voice-stage",
    activityValidationHandle: mockHandles.activity as never,
    voiceTargetsInputHandle: mockHandles.targets as never,
    manifestHandle: mockHandles.manifest as never,
    audioEpisodeReceiptHandle: mockHandles.audio as never,
    deviceEpisodeReceiptHandle: mockHandles.device as never,
    humanReviewHandle: mockHandles.human as never,
  };
}

describe("V2 episode voice release index", () => {
  beforeEach(() => {
    resolvedTargets = mockTargets;
    resolvedDevice = mockDevice;
    resolvedHuman = mockHuman;
  });

  test("joins the exact Activity, Voice Targets, audio readback, physical-device PCM and two-role human review chain", () => {
    const index = materializeV2EpisodeVoiceReleaseIndexV1(validInput());

    expect(isV2EpisodeVoiceReleaseIndexV1(index)).toBe(true);
    expect(index).toMatchObject({
      episodeId: "episode-01",
      activityAssemblyFingerprint: hash("activity-assembly"),
      activityPackageFingerprint: hash("activity-package"),
      voiceTargetsPackageFingerprint: hash("voice-package"),
      audioObjectCount: 64,
      devicePlatform: "ios",
      deviceClass: "physical_device",
      decoderFamily: "avplayer",
      pcmEpisodeDisposition: "candidate_for_human_listening",
      humanReviewDecision: "approved",
      repositoryOriginAuthority: "none_activation_cold_readback_required",
      audioByteAuthority: "none_activation_cold_readback_required",
      listeningEvidenceAuthority: "none_activation_cold_readback_required",
      humanApprovalAuthority: "none_owner_activation_required",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(index.devicePageCommitObjects).toEqual([pin("page-commit")]);
    expect(index.devicePageCommitAggregateFingerprint).toBe(
      hashCanonicalBody([pin("page-commit")]),
    );
    expect(index.orderedPageCommitFingerprintAggregate).toBe(
      hash("page-commit-fingerprints"),
    );
    expect(index.listeningReviewerIdentityFingerprint).not.toBe(
      index.linguistReviewerIdentityFingerprint,
    );
  });

  test("round-trips only by replaying every original private handle", () => {
    const input = validInput();
    const index = materializeV2EpisodeVoiceReleaseIndexV1(input);
    const raw = encodeV2EpisodeVoiceReleaseIndexV1(index);
    const parsed = parseV2EpisodeVoiceReleaseIndexV1({
      raw,
      material: input,
    });

    expect(parsed).toEqual(index);
    expect(isV2EpisodeVoiceReleaseIndexV1(parsed)).toBe(true);
    expect(isV2EpisodeVoiceReleaseIndexV1(JSON.parse(raw))).toBe(false);
    expect(() => encodeV2EpisodeVoiceReleaseIndexV1(JSON.parse(raw))).toThrow(
      "v2_episode_voice_release_index_handle_invalid",
    );
    expect(() =>
      materializeV2EpisodeVoiceReleaseIndexV1({
        ...input,
        humanReviewHandle: { ...mockHandles.human } as never,
      }),
    ).toThrow("mock_human_invalid");
  });

  test("cold audit parser restores only the authority-free serialized index", () => {
    const index = materializeV2EpisodeVoiceReleaseIndexV1(validInput());
    const raw = encodeV2EpisodeVoiceReleaseIndexV1(index);
    const cold = parseV2EpisodeVoiceReleaseIndexAuditV1(raw);

    expect(cold).toEqual(index);
    expect(isV2EpisodeVoiceReleaseIndexV1(cold)).toBe(true);
    expect(cold.repositoryOriginAuthority).toBe(
      "none_activation_cold_readback_required",
    );
    expect(cold.releaseAuthority).toBe(false);

    const changed = JSON.parse(raw);
    changed.devicePageCommitObjects[0].objectGeneration = "999";
    changed.devicePageCommitAggregateFingerprint = hashCanonicalBody(
      changed.devicePageCommitObjects,
    );
    changed.immutableObjectAggregateFingerprint = hashCanonicalBody([
      changed.manifestObject,
      changed.audioEpisodeReceiptObject,
      changed.decoderEpisodeReceiptObject,
      changed.pcmEpisodeReceiptObject,
      changed.devicePageCommitObjects,
      changed.humanReviewReceiptObject,
    ]);
    const { indexFingerprint: _ignored, ...changedBody } = changed;
    changed.indexFingerprint = hashCanonicalBody(changedBody);
    expect(() =>
      parseV2EpisodeVoiceReleaseIndexAuditV1(JSON.stringify(changed)),
    ).not.toThrow();
    changed.releaseEligible = true;
    expect(() =>
      parseV2EpisodeVoiceReleaseIndexAuditV1(JSON.stringify(changed)),
    ).toThrow("v2_episode_voice_release_index_audit_parse_invalid");
  });

  test("rejects a cross-stage graph, nonphysical device, unapproved review or changed package chain", () => {
    const input = validInput();
    const crossStage = {
      ...mockPlan,
      stages: Object.freeze([
        mockPlan.stages[0],
        Object.freeze({ ...mockPlan.stages[1], dependsOn: Object.freeze([]) }),
      ]),
    };
    expect(() =>
      materializeV2EpisodeVoiceReleaseIndexV1({
        ...input,
        plan: crossStage as never,
      }),
    ).toThrow();

    resolvedDevice = Object.freeze({
      ...mockDevice,
      summary: Object.freeze({
        ...mockDevice.summary,
        deviceClass: "simulator_or_emulator" as const,
      }),
    });
    expect(() => materializeV2EpisodeVoiceReleaseIndexV1(input)).toThrow(
      "v2_episode_voice_release_index_evidence_chain_invalid",
    );
    resolvedDevice = mockDevice;
    resolvedHuman = Object.freeze({
      ...mockHuman,
      summary: Object.freeze({
        ...mockHuman.summary,
        episodeDecision: "changes_requested" as const,
      }),
    });
    expect(() => materializeV2EpisodeVoiceReleaseIndexV1(input)).toThrow(
      "v2_episode_voice_release_index_evidence_chain_invalid",
    );
    resolvedHuman = mockHuman;
    resolvedTargets = Object.freeze({
      ...mockTargets,
      summary: Object.freeze({
        ...mockTargets.summary,
        packageFingerprint: hash("changed-package"),
      }),
    });
    expect(() => materializeV2EpisodeVoiceReleaseIndexV1(input)).toThrow(
      "v2_episode_voice_release_index_evidence_chain_invalid",
    );
    resolvedTargets = mockTargets;
  });

  test("derives a content-addressed outer path without raw episode identifiers", () => {
    const index = materializeV2EpisodeVoiceReleaseIndexV1(validInput());
    const rawHash = hash(encodeV2EpisodeVoiceReleaseIndexV1(index));
    const path = v2EpisodeVoiceReleaseIndexObjectPathV1({
      planFingerprint: index.planFingerprint,
      episodeId: index.episodeId,
      indexFingerprint: index.indexFingerprint,
      rawHash,
    });

    expect(path).toBe(
      `learning-v2/episode-voice-release-index/${index.planFingerprint}/${hash(index.episodeId)}/${index.indexFingerprint}/${rawHash}.json`,
    );
    expect(path).not.toContain("episode-01");
    expect(index.evidenceAggregateFingerprint).toBe(
      hashCanonicalBody({
        activityValidatorSummaryFingerprint: hash("activity-validator-summary"),
        voiceTargetsAuthenticatedInputSummaryFingerprint: hash(
          "voice-targets-summary",
        ),
        manifestSummaryFingerprint: hash("manifest-summary"),
        audioEpisodeSummaryFingerprint: hash("audio-summary"),
        deviceEpisodeSummaryFingerprint: hash("device-summary"),
        humanReviewSummaryFingerprint: hash("human-summary"),
      }),
    );
  });
});
