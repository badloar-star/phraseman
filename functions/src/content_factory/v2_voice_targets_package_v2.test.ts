import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_REQUIRED_VOICE_IDS } from "../../../modules/learning-v2/contracts/voice_playback_policy_v1";

let mockTrustedPlan: object;
let mockTrustedWorkspace: object;
let mockTrustedCatalog: object;
let mockTrustedGenerationProfile: object;
let mockTrustedCandidate: object;

jest.mock("./v2_canonical_generation_plan_v2", () => ({
  isV2CanonicalSeasonPlanV2: (value: unknown) => value === mockTrustedPlan,
}));
jest.mock("./v2_generation_workspace_contract_v2", () => ({
  isV2GenerationStageWorkspaceV2: (value: unknown) =>
    value === mockTrustedWorkspace,
  isV2CanonicalStageCandidateV2: (value: unknown) =>
    value === mockTrustedCandidate,
  V2_STAGE_VALIDATOR_REGISTRY_V2: Object.freeze({
    v2_activity_instances: Object.freeze({ state: "installed" }),
    v2_voice_targets: Object.freeze({ state: "not_installed" }),
  }),
}));
jest.mock("./v2_activity_audio_target_catalog_v1", () => ({
  isV2ActivityAudioTargetCatalogV1: (value: unknown) =>
    value === mockTrustedCatalog,
}));
jest.mock("./v2_voice_profile_contracts_v1", () => ({
  isV2VoiceGenerationProfileBodyV1: (value: unknown) =>
    value === mockTrustedGenerationProfile,
  v2VoiceGenerationProfileRefV1: (value: unknown) => {
    if (value !== mockTrustedGenerationProfile)
      throw new Error("v2_voice_generation_profile_body_untrusted");
    return Object.freeze({
      profileId: "voice-generation",
      version: 1,
      contentHash: "g".repeat(64),
    });
  },
}));

// Jest hoists the four trust-boundary mocks before this import.
// eslint-disable-next-line import/first
import {
  isV2VoiceTargetsArtifactV2,
  isV2VoiceTargetsPackageV2,
  isV2VoiceTargetsSessionShardV2,
  materializeV2VoiceTargetsPackageV2,
  parseV2VoiceTargetsPackageV2,
} from "./v2_voice_targets_package_v2";
// eslint-disable-next-line import/first
import {
  isV2VoiceTargetsValidationResultV1,
  validateV2VoiceTargetsCandidateV1,
} from "./v2_voice_targets_validator_v1";
// eslint-disable-next-line import/first
import {
  isV2VoiceTargetsMachineReceiptV1,
  decideV2VoiceTargetsMachineManifestV1,
  materializeV2VoiceTargetsMachineManifestV1,
  materializeV2VoiceTargetsMachineReceiptV1,
  parseV2VoiceTargetsMachineManifestV1,
  parseV2VoiceTargetsMachineReceiptV1,
  v2VoiceTargetsMachineReceiptObjectPathV1,
} from "./v2_voice_targets_machine_receipt_v1";

const speechRef = Object.freeze({
  profileId: "speech-en",
  version: 1,
  contentHash: "s".repeat(64),
});
const generationRef = Object.freeze({
  profileId: "voice-generation",
  version: 1,
  contentHash: "g".repeat(64),
});

function fixture() {
  const stageId = "voice-stage-episode-1";
  mockTrustedPlan = Object.freeze({
    planFingerprint: "a".repeat(64),
    targetLanguage: "en",
    courseContract: Object.freeze({
      courseContractFingerprint: "c".repeat(64),
    }),
    stages: Object.freeze([
      Object.freeze({
        stageId,
        kind: "v2_voice_targets",
        episodeId: "episode-1",
        externalRequirementIds: Object.freeze([
          "speech-requirement",
          "voice-requirement",
        ]),
      }),
    ]),
    externalRequirementCatalog: Object.freeze([
      Object.freeze({
        requirementId: "speech-requirement",
        requirement: Object.freeze({
          dependencyType: "speech_profile",
          profileId: speechRef.profileId,
          version: speechRef.version,
          contentHash: speechRef.contentHash,
        }),
      }),
      Object.freeze({
        requirementId: "voice-requirement",
        requirement: Object.freeze({
          dependencyType: "voice_generation_profile",
          profileId: generationRef.profileId,
          version: generationRef.version,
          contentHash: generationRef.contentHash,
        }),
      }),
    ]),
  });
  mockTrustedWorkspace = Object.freeze({
    planFingerprint: "a".repeat(64),
    courseContractFingerprint: "c".repeat(64),
    workspaceFingerprint: "b".repeat(64),
    stage: Object.freeze({ stageId, kind: "v2_voice_targets" }),
  });
  mockTrustedGenerationProfile = Object.freeze({
    profileId: "voice-generation",
  });
  const sessions = Array.from({ length: 12 }, (_, sessionIndex) => {
    const ordinal = sessionIndex + 1;
    const taskId = `task-${ordinal}`;
    const audioTargetId = hashCanonicalBody(["target", ordinal]);
    const targetSourceHash = hashCanonicalBody(["source", ordinal]);
    const words = ["New", "York"].map((text, wordIndex) =>
      Object.freeze({
        wordOrdinal: wordIndex + 1,
        wordId: hashCanonicalBody(["word", ordinal, wordIndex + 1]),
        text,
        textHash: hashCanonicalBody(["text", text]),
        sourceHash: hashCanonicalBody(["word-source", ordinal, wordIndex + 1]),
      }),
    );
    const taskVoiceGroupFingerprint = hashCanonicalBody([
      "voice-group",
      taskId,
    ]);
    const voiceGroupBody = {
      taskId,
      sessionId: `session-${ordinal}`,
      sessionOrdinal: ordinal,
      orderedAudioTargetIds: Object.freeze([audioTargetId]),
      orderedWordIds: Object.freeze(words.map((word) => word.wordId)),
      playbackPolicyRef: Object.freeze({
        policyId: "balanced-four-voice-shuffled-cycle",
        version: 1,
        contentHash: "f".repeat(64),
      }),
      selectionScope: "once_per_task_attempt",
    };
    const targetBody = {
      audioTargetId,
      sessionOrdinal: ordinal,
      sessionId: `session-${ordinal}`,
      taskId,
      family: "listen_choose",
      sourceRef: Object.freeze({
        kind: "learner_audio_target",
        learnerAudioTargetId: `learner-audio-${ordinal}`,
      }),
      spokenText: "New York",
      spokenTextHash: hashCanonicalBody(["spoken", ordinal]),
      pronunciationHint: null,
      speakerId: null,
      sourceHash: targetSourceHash,
      words: Object.freeze(words),
      wordCount: 2,
      taskVoicePolicy: "one_voice_for_all_task_targets_and_words",
      taskVoiceGroupFingerprint,
    };
    const target = Object.freeze({
      ...targetBody,
      targetFingerprint: hashCanonicalBody(targetBody),
    });
    return Object.freeze({
      sessionOrdinal: ordinal,
      sessionId: `session-${ordinal}`,
      sourceFingerprint: hashCanonicalBody(["activity-source", ordinal]),
      renderFingerprint: hashCanonicalBody(["activity-render", ordinal]),
      targetCount: 1,
      targets: Object.freeze([target]),
      taskVoiceGroups: Object.freeze([
        Object.freeze({
          ...voiceGroupBody,
          taskVoiceGroupFingerprint,
        }),
      ]),
      sessionTargetAggregateFingerprint: hashCanonicalBody([
        "catalog-session",
        ordinal,
      ]),
    });
  });
  mockTrustedCatalog = Object.freeze({
    episodeId: "episode-1",
    targetLanguage: "en",
    speechLocale: "en-US",
    speechProfileRef: speechRef,
    catalogFingerprint: "a".repeat(64),
    activitySourceAggregateFingerprint: "b".repeat(64),
    activityRenderAggregateFingerprint: "r".repeat(64),
    sessions: Object.freeze(sessions),
  });
  return {
    plan: mockTrustedPlan,
    workspace: mockTrustedWorkspace,
    catalog: mockTrustedCatalog,
    voiceGenerationProfile: mockTrustedGenerationProfile,
  } as Parameters<typeof materializeV2VoiceTargetsPackageV2>[0];
}

describe("Learning V2 pure Voice Targets artifact", () => {
  it("creates four variants and keeps one voice across the phrase and every word", () => {
    const input = fixture();
    const packageValue = materializeV2VoiceTargetsPackageV2(input);
    const artifact = packageValue.root;
    expect(isV2VoiceTargetsPackageV2(packageValue)).toBe(true);
    expect(isV2VoiceTargetsPackageV2({ ...packageValue })).toBe(false);
    expect(isV2VoiceTargetsArtifactV2(artifact)).toBe(true);
    expect(isV2VoiceTargetsArtifactV2({ ...artifact })).toBe(false);
    expect(packageValue.sessionShards).toHaveLength(12);
    expect(
      packageValue.sessionShards.every(isV2VoiceTargetsSessionShardV2),
    ).toBe(true);
    expect(artifact.sessionRefs).toHaveLength(12);
    expect(artifact.sessionCount).toBe(12);
    expect(artifact.targetCount).toBe(12);
    expect(artifact.wordTargetCount).toBe(24);
    expect(artifact.variantCount).toBe(48);
    expect(artifact.generationTargetCount).toBe(144);
    for (const target of packageValue.sessionShards.flatMap(
      (session) => session.targets,
    )) {
      expect(target.variants.map((variant) => variant.voiceId)).toEqual(
        V2_REQUIRED_VOICE_IDS,
      );
      for (const variant of target.variants) {
        expect(
          variant.words.every((word) => word.voiceId === variant.voiceId),
        ).toBe(true);
        expect(variant.taskVoiceGroupFingerprint).toBe(
          target.taskVoiceGroupFingerprint,
        );
      }
    }
    expect(
      packageValue.sessionShards.every((session) =>
        session.taskVoiceGroups.every(
          (group) =>
            group.selectionScope === "once_per_task_attempt" &&
            group.selectionResolution ===
              "one_voice_id_indexes_every_target_and_word_variant" &&
            group.requiredVoiceIds === V2_REQUIRED_VOICE_IDS,
        ),
      ),
    ).toBe(true);
    expect(artifact.sourceAuthority).toBe("structural_catalog_only");
    expect(artifact.providerExecutionAuthority).toBe("none");
    expect(artifact.audioByteAuthority).toBe("none");
    expect(artifact.runtimeConsumer).toBe(false);
    expect(artifact.releaseEligible).toBe(false);
  });

  it("binds every generation identity to source, profile and voice", () => {
    const packageValue = materializeV2VoiceTargetsPackageV2(fixture());
    const target = packageValue.sessionShards[0].targets[0];
    expect(
      new Set(
        target.variants.map(
          (variant) => variant.fullUtteranceGenerationTargetFingerprint,
        ),
      ).size,
    ).toBe(4);
    expect(
      new Set(
        target.variants.flatMap((variant) =>
          variant.words.map((word) => word.generationTargetFingerprint),
        ),
      ).size,
    ).toBe(8);
  });

  it("rejects clones, cross-stage bindings and profile substitutions", () => {
    const input = fixture();
    expect(() =>
      materializeV2VoiceTargetsPackageV2({
        ...input,
        catalog: { ...input.catalog } as never,
      }),
    ).toThrow("v2_voice_targets_catalog_untrusted");

    fixture();
    mockTrustedWorkspace = Object.freeze({
      ...(mockTrustedWorkspace as Record<string, unknown>),
      stage: Object.freeze({
        stageId: "wrong-stage",
        kind: "v2_voice_targets",
      }),
    });
    expect(() =>
      materializeV2VoiceTargetsPackageV2({
        plan: mockTrustedPlan,
        workspace: mockTrustedWorkspace,
        catalog: mockTrustedCatalog,
        voiceGenerationProfile: mockTrustedGenerationProfile,
      } as never),
    ).toThrow("v2_voice_targets_binding_invalid");

    const profileInput = fixture();
    const wrongPlan = {
      ...(mockTrustedPlan as Record<string, unknown>),
      externalRequirementCatalog: [
        ...(
          mockTrustedPlan as { externalRequirementCatalog: unknown[] }
        ).externalRequirementCatalog.slice(0, 1),
        {
          requirementId: "voice-requirement",
          requirement: {
            dependencyType: "voice_generation_profile",
            profileId: generationRef.profileId,
            version: generationRef.version,
            contentHash: "x".repeat(64),
          },
        },
      ],
    };
    mockTrustedPlan = Object.freeze(wrongPlan);
    expect(() =>
      materializeV2VoiceTargetsPackageV2({
        ...profileInput,
        plan: mockTrustedPlan as never,
      }),
    ).toThrow("v2_voice_targets_profile_mismatch");
  });

  it("rehydrates only exact source-derived root and session bytes", () => {
    const input = fixture();
    const expected = materializeV2VoiceTargetsPackageV2(input);
    const rootRaw = canonicalJsonV1(expected.root);
    const sessionShardRaws = expected.sessionShards.map(canonicalJsonV1);
    const parsed = parseV2VoiceTargetsPackageV2({
      ...input,
      rootRaw,
      sessionShardRaws,
    });
    expect(isV2VoiceTargetsPackageV2(parsed)).toBe(true);
    expect(() =>
      parseV2VoiceTargetsPackageV2({
        ...input,
        rootRaw: rootRaw.replace('"targetCount":12', '"targetCount":13'),
        sessionShardRaws,
      }),
    ).toThrow("v2_voice_targets_root_mismatch");
    expect(() =>
      parseV2VoiceTargetsPackageV2({
        ...input,
        rootRaw,
        sessionShardRaws: [
          sessionShardRaws[1],
          sessionShardRaws[0],
          ...sessionShardRaws.slice(2),
        ],
      }),
    ).toThrow("v2_voice_targets_session_mismatch");
  });

  it("produces only a zero-authority human-review candidate and blocks nonproduction content", () => {
    const input = fixture();
    const packageValue = materializeV2VoiceTargetsPackageV2(input);
    mockTrustedCandidate = Object.freeze({
      planFingerprint: (input.plan as { planFingerprint: string })
        .planFingerprint,
      workspaceFingerprint: (
        input.workspace as { workspaceFingerprint: string }
      ).workspaceFingerprint,
      stageId: (input.workspace as { stage: { stageId: string } }).stage
        .stageId,
      stageKind: "v2_voice_targets",
      bodySchemaVersion: "v2-voice-targets-artifact.v2",
      body: packageValue.root,
      bodyFingerprint: hashCanonicalBody(packageValue.root),
      contentClass: "production_candidate",
      candidateFingerprint: "e".repeat(64),
    });
    const result = validateV2VoiceTargetsCandidateV1({
      plan: input.plan,
      workspace: input.workspace,
      candidate: mockTrustedCandidate as never,
      packageValue,
      packageInputs: input,
    });
    expect(isV2VoiceTargetsValidationResultV1(result)).toBe(true);
    expect(isV2VoiceTargetsValidationResultV1({ ...result })).toBe(false);
    expect(result.outcome).toBe("eligible_for_human_review_only");
    expect(result.machineValidationAuthority).toBe(
      "deterministic_voice_target_identity_checks_only",
    );
    expect(result.repositoryAuthority).toBe("none");
    expect(result.audioByteAuthority).toBe("none");
    expect(result.humanReviewAuthority).toBe("none");
    expect(result.releaseEligible).toBe(false);

    mockTrustedCandidate = Object.freeze({
      ...(mockTrustedCandidate as Record<string, unknown>),
      contentClass: "test_only",
    });
    const blocked = validateV2VoiceTargetsCandidateV1({
      plan: input.plan,
      workspace: input.workspace,
      candidate: mockTrustedCandidate as never,
      packageValue,
      packageInputs: input,
    });
    expect(blocked.outcome).toBe("blocked");
    expect(blocked.blockingIssueCodes).toEqual([
      "v2_voice_targets_nonproduction_content_forbidden",
    ]);

    mockTrustedCandidate = Object.freeze({
      ...(mockTrustedCandidate as Record<string, unknown>),
      contentClass: "production_candidate",
    });
    const structural = validateV2VoiceTargetsCandidateV1({
      plan: input.plan,
      workspace: input.workspace,
      candidate: mockTrustedCandidate as never,
      packageValue,
      packageInputs: input,
    });
    const receipt = materializeV2VoiceTargetsMachineReceiptV1({
      workspace: input.workspace,
      candidate: mockTrustedCandidate as never,
      packageValue,
      validation: structural,
    });
    expect(isV2VoiceTargetsMachineReceiptV1(receipt)).toBe(true);
    expect(receipt.outcome).toBe("blocked");
    expect(receipt.issueCodes).toEqual([
      "v2_voice_targets_audio_bytes_not_established",
      "v2_voice_targets_profile_lifecycle_not_established",
      "v2_voice_targets_repository_origin_not_established",
      "v2_voice_targets_validator_not_installed",
    ]);
    expect(receipt.repositoryOriginAuthority).toBe("none");
    expect(receipt.machineValidationAuthority).toBe("none");
    expect(receipt.releaseAuthority).toBe(false);
    const raw = canonicalJsonV1(receipt);
    expect(parseV2VoiceTargetsMachineReceiptV1(raw)).toEqual(receipt);
    expect(
      v2VoiceTargetsMachineReceiptObjectPathV1({
        planFingerprint: receipt.planFingerprint,
        stageId: receipt.stageId,
        candidateFingerprint: receipt.candidateFingerprint,
        receiptFingerprint: receipt.receiptFingerprint,
        receiptRawHash: hashCanonicalBody(raw),
      }),
    ).not.toContain(receipt.stageId);
    expect(() =>
      parseV2VoiceTargetsMachineReceiptV1(
        raw.replace(
          '"repositoryOriginAuthority":"none"',
          '"repositoryOriginAuthority":"authenticated"',
        ),
      ),
    ).toThrow("v2_voice_targets_machine_receipt_invalid");
    const receiptWithExtra = JSON.parse(raw) as Record<string, unknown>;
    receiptWithExtra.hiddenAuthority = "none";
    expect(() =>
      parseV2VoiceTargetsMachineReceiptV1(canonicalJsonV1(receiptWithExtra)),
    ).toThrow("v2_voice_targets_machine_receipt_invalid");

    const manifest = materializeV2VoiceTargetsMachineManifestV1({
      receipt,
      objectGeneration: "7",
      createdAtEpochMs: 1000,
    });
    const manifestRaw = canonicalJsonV1(manifest);
    expect(parseV2VoiceTargetsMachineManifestV1(manifestRaw)).toEqual(manifest);
    const malformedManifest = JSON.parse(manifestRaw) as Record<
      string,
      unknown
    >;
    malformedManifest.receiptObject = null;
    expect(() =>
      parseV2VoiceTargetsMachineManifestV1(canonicalJsonV1(malformedManifest)),
    ).toThrow("v2_voice_targets_machine_manifest_invalid");
    expect(() =>
      parseV2VoiceTargetsMachineManifestV1(`${manifestRaw}\n`),
    ).toThrow("v2_voice_targets_machine_manifest_invalid");
    expect(
      decideV2VoiceTargetsMachineManifestV1({
        currentRaw: null,
        proposed: manifest,
      }).kind,
    ).toBe("create");
    expect(
      decideV2VoiceTargetsMachineManifestV1({
        currentRaw: manifestRaw,
        proposed: materializeV2VoiceTargetsMachineManifestV1({
          receipt,
          objectGeneration: "7",
          createdAtEpochMs: 2000,
        }),
      }).kind,
    ).toBe("exact_replay");
    const conflicting = JSON.parse(manifestRaw) as Record<string, unknown>;
    conflicting.receiptFingerprint = "f".repeat(64);
    const receiptObject = conflicting.receiptObject as Record<string, unknown>;
    receiptObject.objectPath = String(receiptObject.objectPath).replace(
      receipt.receiptFingerprint,
      "f".repeat(64),
    );
    conflicting.commitFingerprint = hashCanonicalBody({
      commitKey: conflicting.commitKey,
      receiptProfileFingerprint: conflicting.receiptProfileFingerprint,
      planFingerprint: conflicting.planFingerprint,
      stageId: conflicting.stageId,
      candidateFingerprint: conflicting.candidateFingerprint,
      validatorRulesFingerprint: conflicting.validatorRulesFingerprint,
      registryFingerprint: conflicting.registryFingerprint,
      receiptFingerprint: conflicting.receiptFingerprint,
      receiptRawHash: conflicting.receiptRawHash,
      receiptObject: conflicting.receiptObject,
    });
    const { operationFingerprint: _old, ...conflictingBase } = conflicting;
    conflicting.operationFingerprint = hashCanonicalBody(conflictingBase);
    const conflictingManifest = parseV2VoiceTargetsMachineManifestV1(
      canonicalJsonV1(conflicting),
    );
    expect(
      decideV2VoiceTargetsMachineManifestV1({
        currentRaw: canonicalJsonV1(conflictingManifest),
        proposed: manifest,
      }).kind,
    ).toBe("conflict");
  });
});
