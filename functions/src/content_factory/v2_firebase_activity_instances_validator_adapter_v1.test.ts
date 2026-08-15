import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES,
  V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES,
  V2_ACTIVITY_SESSION_RENDER_MAX_BYTES,
  V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES,
  V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES,
  v2ActivitySessionProjectionObjectPath,
  v2ActivitySessionSourceObjectPath,
} from "./v2_activity_instances_package_v2";
import {
  createFirebaseAdminV2ActivityInstancesValidatorAdapterV1,
  getV2FirebaseActivityInstancesValidatorSummaryV1,
  isV2FirebaseActivityInstancesValidatorResultHandleV1,
  resolveV2FirebaseActivityInstancesPublicationSessionMaterialV1,
  resolveV2FirebaseActivityInstancesServerEvaluatorSessionMaterialV1,
  resolveV2FirebaseActivityInstancesValidatorResultMaterialV1,
} from "./v2_firebase_activity_instances_validator_adapter_v1";

const raw = canonicalJsonV1({ value: "child" });
const rawBytes = new TextEncoder().encode(raw);
const rawHash = createHash("sha256").update(rawBytes).digest("hex");
const packageFingerprint = hashCanonicalBody("package");
const expectedCapabilitySnapshot = Object.freeze({
  snapshotFingerprint: hashCanonicalBody("capability"),
});
const plan = Object.freeze({
  planFingerprint: hashCanonicalBody("plan"),
  courseContract: Object.freeze({
    courseContractFingerprint: hashCanonicalBody("course"),
  }),
});
const commitHandle = Object.freeze({ kind: "commit" });
const validatorInputHandle = Object.freeze({ kind: "validator-input" });
const activityStageCapability = Object.freeze({ kind: "stage-capability" });
const workspace = Object.freeze({
  workspaceFingerprint: hashCanonicalBody("workspace"),
  stage: Object.freeze({ stageId: "stage-activity", episodeId: "episode-1" }),
});
const candidate = Object.freeze({
  candidateFingerprint: hashCanonicalBody("candidate"),
  bodySchemaVersion: "v2-activity-instances-package-root.v2",
  bodyFingerprint: hashCanonicalBody({ root: true }),
  body: Object.freeze({ root: true }),
});
const commitSummary = Object.freeze({
  planFingerprint: plan.planFingerprint,
  courseContractFingerprint: plan.courseContract.courseContractFingerprint,
  stageId: workspace.stage.stageId,
  candidateFingerprint: candidate.candidateFingerprint,
  repositoryOriginReceiptFingerprint: hashCanonicalBody("origin"),
  repositoryObservationFingerprint: hashCanonicalBody("observation"),
  authenticatedStageBindingFingerprint: hashCanonicalBody("authenticated"),
  outerReceiptFingerprint: hashCanonicalBody("outer"),
  committedManifestFingerprint: hashCanonicalBody("manifest"),
  committedOperationFingerprint: hashCanonicalBody("operation"),
});
const inputSummary = Object.freeze({
  ...commitSummary,
  workspaceFingerprint: workspace.workspaceFingerprint,
  episodeId: workspace.stage.episodeId,
  bodySchemaVersion: candidate.bodySchemaVersion,
  bodyFingerprint: candidate.bodyFingerprint,
  structuralBindingFingerprint: hashCanonicalBody("structural-binding"),
});
const material = Object.freeze({
  plan,
  workspace,
  candidate,
  dependencySnapshotRaw: canonicalJsonV1({ dependency: true }),
  candidateRaw: canonicalJsonV1({ candidate: true }),
  activityStageCapability,
  structuralBinding: Object.freeze({
    bindingFingerprint: inputSummary.structuralBindingFingerprint,
  }),
  committedOuterReceipt: Object.freeze({
    receiptFingerprint: commitSummary.outerReceiptFingerprint,
    planFingerprint: commitSummary.planFingerprint,
    courseContractFingerprint: commitSummary.courseContractFingerprint,
    workspaceFingerprint: workspace.workspaceFingerprint,
    stageId: commitSummary.stageId,
    candidateFingerprint: commitSummary.candidateFingerprint,
    repositoryOriginReceiptFingerprint:
      commitSummary.repositoryOriginReceiptFingerprint,
    repositoryObservationFingerprint:
      commitSummary.repositoryObservationFingerprint,
    authenticatedStageBindingFingerprint:
      commitSummary.authenticatedStageBindingFingerprint,
  }),
  committedManifest: Object.freeze({
    commitFingerprint: commitSummary.committedManifestFingerprint,
    operationFingerprint: commitSummary.committedOperationFingerprint,
    planFingerprint: commitSummary.planFingerprint,
    stageId: commitSummary.stageId,
    candidateFingerprint: commitSummary.candidateFingerprint,
    outerReceiptFingerprint: commitSummary.outerReceiptFingerprint,
  }),
});
const kinds = ["source", "render", "capsule", "sidecar"] as const;
const maximumBytes = Object.freeze({
  source: V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES,
  render: V2_ACTIVITY_SESSION_RENDER_MAX_BYTES,
  capsule: V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES,
  sidecar: V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES,
});
const permits = Object.freeze(
  Array.from({ length: 12 }, (_, sessionIndex) =>
    kinds.map((kind) =>
      Object.freeze({
        sessionOrdinal: sessionIndex + 1,
        sessionId: `episode-1:session:${String(sessionIndex + 1).padStart(2, "0")}`,
        kind,
        objectPath:
          kind === "source"
            ? v2ActivitySessionSourceObjectPath(
                workspace.stage.stageId,
                sessionIndex + 1,
                rawHash,
              )
            : v2ActivitySessionProjectionObjectPath(
                workspace.stage.stageId,
                sessionIndex + 1,
                kind,
                rawHash,
              ),
        contentHash: rawHash,
        objectGeneration: String(100 + sessionIndex),
        declaredByteSize: rawBytes.byteLength,
        maximumBytes: maximumBytes[kind],
      }),
    ),
  ).flat(),
);

const state = {
  missingPath: null as string | null,
  tamperPath: null as string | null,
  activeDownloads: 0,
  maximumActiveDownloads: 0,
  pureOutcome: "eligible_for_human_review_only" as
    | "blocked"
    | "eligible_for_human_review_only",
  invalidRoot: false,
  inputSummaryCandidateFingerprint: candidate.candidateFingerprint,
};

const storage = {
  readMetadataExact: jest.fn(async (objectPath: string) =>
    state.missingPath === objectPath
      ? null
      : {
          generation: permits.find(
            (permit) => permit.objectPath === objectPath,
          )!.objectGeneration,
          byteSize: rawBytes.byteLength,
          contentType: "application/json; charset=utf-8" as const,
          contentHash: rawHash,
        },
  ),
  downloadGenerationExact: jest.fn(async (input: { objectPath: string }) => {
    state.activeDownloads += 1;
    state.maximumActiveDownloads = Math.max(
      state.maximumActiveDownloads,
      state.activeDownloads,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 1));
    state.activeDownloads -= 1;
    const bytes = new Uint8Array(rawBytes);
    if (state.tamperPath === input.objectPath) bytes[0] ^= 1;
    return { kind: "downloaded" as const, bytes };
  }),
  createExact: jest.fn(),
  quarantineConflict: jest.fn(),
};
const createIo = jest.fn(() => ({ storage, firestore: {} }));

jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => createIo(),
}));

jest.mock("./v2_firebase_activity_stage_commit_adapter_v1", () => ({
  getV2FirebaseActivityStageCommitSummaryV1: jest.fn((handle: unknown) => {
    if (handle !== commitHandle) throw new Error("test_commit_handle_invalid");
    return commitSummary;
  }),
  bindV2FirebaseActivityStageCommitToActivityInstancesValidatorV1: jest.fn(
    (input: Record<string, unknown>) => {
      if (
        input.commitHandle !== commitHandle ||
        input.plan !== plan ||
        input.stageId !== workspace.stage.stageId
      )
        throw new Error("test_commit_binding_invalid");
      return validatorInputHandle;
    },
  ),
  getV2FirebaseActivityInstancesValidatorInputSummaryV1: jest.fn(
    (handle: unknown) => {
      if (handle !== validatorInputHandle)
        throw new Error("test_validator_input_invalid");
      return {
        ...inputSummary,
        candidateFingerprint: state.inputSummaryCandidateFingerprint,
      };
    },
  ),
  resolveV2FirebaseActivityInstancesValidatorInputMaterialV1: jest.fn(
    (input: Record<string, unknown>) => {
      if (
        input.inputHandle !== validatorInputHandle ||
        input.plan !== plan ||
        input.stageId !== workspace.stage.stageId
      )
        throw new Error("test_validator_resolve_invalid");
      return material;
    },
  ),
}));

jest.mock("./v2_firebase_authenticated_repository_adapter_v1", () => ({
  resolveV2FirebaseAuthenticatedActivityStageValidatorCapabilitySnapshotV1:
    jest.fn((input: Record<string, unknown>) => {
      if (
        input.capability !== activityStageCapability ||
        input.plan !== plan ||
        input.stageId !== workspace.stage.stageId
      )
        throw new Error("test_capability_invalid");
      return expectedCapabilitySnapshot;
    }),
}));

const permitBody = Object.freeze({
  schemaVersion: "v2-activity-instances-untrusted-read-permits.v2" as const,
  trust: "untrusted_structural_only" as const,
  planFingerprint: plan.planFingerprint,
  stageId: workspace.stage.stageId,
  episodeId: workspace.stage.episodeId,
  packageFingerprint,
  permitCount: 48 as const,
  totalDeclaredByteSize: rawBytes.byteLength * 48,
  maximumAggregateBytes: V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES,
  permits,
});
const exactPermitAggregateFingerprint = hashCanonicalBody(permitBody);
const parsePermits = jest.fn((..._args: unknown[]) => {
  if (state.invalidRoot) throw new Error("test_invalid_candidate_root");
  return Object.freeze({
    ...permitBody,
    permitAggregateFingerprint: exactPermitAggregateFingerprint,
  });
});

jest.mock("./v2_activity_instances_package_v2", () => ({
  ...jest.requireActual("./v2_activity_instances_package_v2"),
  parseV2ActivityInstancesUntrustedRootManifestPermitsV2: (
    ...args: unknown[]
  ) => parsePermits(...args),
}));

const pureResult = {
  planFingerprint: plan.planFingerprint,
  courseContractFingerprint: plan.courseContract.courseContractFingerprint,
  workspaceFingerprint: workspace.workspaceFingerprint,
  stageId: workspace.stage.stageId,
  episodeId: workspace.stage.episodeId,
  candidateFingerprint: candidate.candidateFingerprint,
  bodyFingerprint: candidate.bodyFingerprint,
  packageFingerprint,
  capabilitySnapshotFingerprint: expectedCapabilitySnapshot.snapshotFingerprint,
  validatedSessionCount: 12,
  validatedTaskCount: 144,
  resultFingerprint: hashCanonicalBody("pure-result"),
};
const blockedInvalidRootFingerprint = hashCanonicalBody("invalid-root-result");
const validatePure = jest.fn((..._args: unknown[]) =>
  state.invalidRoot
    ? {
        ...pureResult,
        packageFingerprint: null,
        capabilitySnapshotFingerprint: null,
        validatedSessionCount: null,
        validatedTaskCount: null,
        resultFingerprint: blockedInvalidRootFingerprint,
        outcome: "blocked" as const,
      }
    : {
        ...pureResult,
        outcome: state.pureOutcome,
      },
);

jest.mock("./v2_activity_instances_validator_v1", () => ({
  validateV2ActivityInstancesCandidateV1: (...args: unknown[]) =>
    validatePure(...args),
  isV2ActivityInstancesValidationResultV1: (value: unknown) =>
    value !== null &&
    typeof value === "object" &&
    [pureResult.resultFingerprint, blockedInvalidRootFingerprint].includes(
      (value as Record<string, unknown>).resultFingerprint as string,
    ),
}));

describe("Firebase Activity Instances validator adapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    state.missingPath = null;
    state.tamperPath = null;
    state.activeDownloads = 0;
    state.maximumActiveDownloads = 0;
    state.pureOutcome = "eligible_for_human_review_only";
    state.invalidRoot = false;
    state.inputSummaryCandidateFingerprint = candidate.candidateFingerprint;
  });

  it("reads exactly 48 children with bounded concurrency and mints eligible handle", async () => {
    expect(
      createFirebaseAdminV2ActivityInstancesValidatorAdapterV1.length,
    ).toBe(0);
    const handle =
      await createFirebaseAdminV2ActivityInstancesValidatorAdapterV1().validateCommittedActivityInstances(
        { plan: plan as never, commitHandle: commitHandle as never },
      );
    expect(isV2FirebaseActivityInstancesValidatorResultHandleV1(handle)).toBe(
      true,
    );
    const summary = getV2FirebaseActivityInstancesValidatorSummaryV1(handle);
    expect(summary).toMatchObject({
      planFingerprint: plan.planFingerprint,
      candidateFingerprint: candidate.candidateFingerprint,
      childObjectCount: 48,
      storageReadbackFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      permitAggregateFingerprint: exactPermitAggregateFingerprint,
      packageFingerprint,
      expectedCapabilitySnapshotFingerprint:
        expectedCapabilitySnapshot.snapshotFingerprint,
      validatedSessionCount: 12,
      validatedTaskCount: 144,
      outcome: "eligible_for_human_review_only",
      repositoryOriginAuthority: "authenticated_repository_snapshot_only",
      dependencyResolutionAuthority:
        "authenticated_repository_stage_subset_only",
      artifactStorageAuthority: "firebase_admin_generation_pinned_readback",
      machineValidationAuthority:
        "deterministic_activity_instances_structural_semantic_checks_only",
      candidateOriginAuthority: "none",
      humanReviewAuthority: "none",
      specialistEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      listeningEvidenceAuthority: "none",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      completionAuthority: "none",
      runtimeConsumer: false,
      releaseAuthority: false,
    });
    expect(storage.readMetadataExact).toHaveBeenCalledTimes(48);
    expect(storage.downloadGenerationExact).toHaveBeenCalledTimes(48);
    expect(state.maximumActiveDownloads).toBeGreaterThan(1);
    expect(state.maximumActiveDownloads).toBeLessThanOrEqual(4);
    expect(validatePure).toHaveBeenCalledTimes(1);
    expect(
      (validatePure.mock.calls[0]![0] as { sessionBytes: readonly unknown[] })
        .sessionBytes,
    ).toHaveLength(12);
    expect(
      resolveV2FirebaseActivityInstancesValidatorResultMaterialV1({
        handle,
        plan: plan as never,
      }),
    ).toMatchObject({
      plan,
      summary,
      pureValidationResult: expect.objectContaining({
        resultFingerprint: pureResult.resultFingerprint,
      }),
    });
    const releasedSession =
      resolveV2FirebaseActivityInstancesPublicationSessionMaterialV1({
        handle,
        plan: plan as never,
        sessionOrdinal: 2,
      });
    expect(releasedSession).toMatchObject({
      planFingerprint: plan.planFingerprint,
      courseContractFingerprint: plan.courseContract.courseContractFingerprint,
      stageId: workspace.stage.stageId,
      episodeId: workspace.stage.episodeId,
      sessionOrdinal: 2,
      sessionId: "episode-1:session:02",
      packageFingerprint,
      validatorSummaryFingerprint: summary.summaryFingerprint,
      permitAggregateFingerprint: exactPermitAggregateFingerprint,
      childReadbackAggregateFingerprint:
        summary.childReadbackAggregateFingerprint,
      storageReadbackFingerprint: summary.storageReadbackFingerprint,
      renderRaw: raw,
      capsuleEnvelopeRaw: raw,
      renderPin: {
        objectPath: permits[5]!.objectPath,
        contentHash: rawHash,
        objectGeneration: permits[5]!.objectGeneration,
        byteSize: rawBytes.byteLength,
      },
      capsulePin: {
        objectPath: permits[6]!.objectPath,
        contentHash: rawHash,
        objectGeneration: permits[6]!.objectGeneration,
        byteSize: rawBytes.byteLength,
      },
      repositoryOriginAuthority: "authenticated_repository_snapshot_only",
      artifactStorageAuthority: "firebase_admin_generation_pinned_readback",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(Object.isFrozen(releasedSession)).toBe(true);
    const serverEvaluatorSession =
      resolveV2FirebaseActivityInstancesServerEvaluatorSessionMaterialV1({
        handle,
        plan: plan as never,
        sessionOrdinal: 2,
      });
    expect(serverEvaluatorSession).toMatchObject({
      planFingerprint: plan.planFingerprint,
      courseContractFingerprint: plan.courseContract.courseContractFingerprint,
      stageId: workspace.stage.stageId,
      episodeId: workspace.stage.episodeId,
      sessionOrdinal: 2,
      sessionId: "episode-1:session:02",
      packageFingerprint,
      validatorSummaryFingerprint: summary.summaryFingerprint,
      sidecarRaw: raw,
      sidecarPin: {
        objectPath: permits[7]!.objectPath,
        contentHash: rawHash,
        objectGeneration: permits[7]!.objectGeneration,
        byteSize: rawBytes.byteLength,
      },
      repositoryOriginAuthority: "authenticated_repository_snapshot_only",
      artifactStorageAuthority: "firebase_admin_generation_pinned_readback",
      evaluatorKeyDelivery: "server_only_never_learner_projection",
      evaluationAuthority: "candidate_only_server_policy_required",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      completionAuthority: "none",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(Object.isFrozen(serverEvaluatorSession)).toBe(true);
    expect(() =>
      resolveV2FirebaseActivityInstancesPublicationSessionMaterialV1({
        handle: { ...handle } as never,
        plan: plan as never,
        sessionOrdinal: 2,
      }),
    ).toThrow(
      "v2_firebase_activity_instances_publication_session_resolve_invalid",
    );
    expect(() =>
      resolveV2FirebaseActivityInstancesServerEvaluatorSessionMaterialV1({
        handle: { ...handle } as never,
        plan: plan as never,
        sessionOrdinal: 2,
      }),
    ).toThrow(
      "v2_firebase_activity_instances_server_evaluator_resolve_invalid",
    );
    expect(() =>
      resolveV2FirebaseActivityInstancesPublicationSessionMaterialV1({
        handle,
        plan: { ...plan } as never,
        sessionOrdinal: 2,
      }),
    ).toThrow(
      "v2_firebase_activity_instances_publication_session_resolve_invalid",
    );
    expect(() =>
      resolveV2FirebaseActivityInstancesServerEvaluatorSessionMaterialV1({
        handle,
        plan: { ...plan } as never,
        sessionOrdinal: 2,
      }),
    ).toThrow(
      "v2_firebase_activity_instances_server_evaluator_resolve_invalid",
    );
    for (const sessionOrdinal of [0, 13, 1.5]) {
      expect(() =>
        resolveV2FirebaseActivityInstancesPublicationSessionMaterialV1({
          handle,
          plan: plan as never,
          sessionOrdinal,
        }),
      ).toThrow(
        "v2_firebase_activity_instances_publication_session_resolve_invalid",
      );
      expect(() =>
        resolveV2FirebaseActivityInstancesServerEvaluatorSessionMaterialV1({
          handle,
          plan: plan as never,
          sessionOrdinal,
        }),
      ).toThrow(
        "v2_firebase_activity_instances_server_evaluator_resolve_invalid",
      );
    }
    expect(() =>
      resolveV2FirebaseActivityInstancesValidatorResultMaterialV1({
        handle,
        plan: { ...plan } as never,
      }),
    ).toThrow(
      "v2_firebase_activity_instances_validator_result_resolve_invalid",
    );
    expect(
      isV2FirebaseActivityInstancesValidatorResultHandleV1({ ...handle }),
    ).toBe(false);
    expect(() =>
      getV2FirebaseActivityInstancesValidatorSummaryV1({ ...handle } as never),
    ).toThrow("v2_firebase_activity_instances_validator_result_handle_invalid");
  });

  it("preserves a pure test/demo block without authority escalation", async () => {
    state.pureOutcome = "blocked";
    const handle =
      await createFirebaseAdminV2ActivityInstancesValidatorAdapterV1().validateCommittedActivityInstances(
        { plan: plan as never, commitHandle: commitHandle as never },
      );
    expect(
      getV2FirebaseActivityInstancesValidatorSummaryV1(handle),
    ).toMatchObject({
      outcome: "blocked",
      machineValidationAuthority:
        "deterministic_activity_instances_structural_semantic_checks_only",
      humanReviewAuthority: "none",
      releaseAuthority: false,
    });
    expect(() =>
      resolveV2FirebaseActivityInstancesPublicationSessionMaterialV1({
        handle,
        plan: plan as never,
        sessionOrdinal: 1,
      }),
    ).toThrow(
      "v2_firebase_activity_instances_publication_session_resolve_invalid",
    );
    expect(() =>
      resolveV2FirebaseActivityInstancesServerEvaluatorSessionMaterialV1({
        handle,
        plan: plan as never,
        sessionOrdinal: 1,
      }),
    ).toThrow(
      "v2_firebase_activity_instances_server_evaluator_resolve_invalid",
    );
  });

  it("returns a blocked no-I/O handle when the candidate root cannot yield permits", async () => {
    state.invalidRoot = true;
    const handle =
      await createFirebaseAdminV2ActivityInstancesValidatorAdapterV1().validateCommittedActivityInstances(
        { plan: plan as never, commitHandle: commitHandle as never },
      );
    expect(
      getV2FirebaseActivityInstancesValidatorSummaryV1(handle),
    ).toMatchObject({
      outcome: "blocked",
      permitAggregateFingerprint: null,
      childReadbackAggregateFingerprint: null,
      storageReadbackFingerprint: null,
      childObjectCount: null,
      childTotalByteSize: null,
      packageFingerprint: null,
      candidateCapabilitySnapshotFingerprint: null,
      validatedSessionCount: null,
      validatedTaskCount: null,
      artifactStorageAuthority: "none",
      repositoryOriginAuthority: "authenticated_repository_snapshot_only",
      humanReviewAuthority: "none",
      releaseAuthority: false,
    });
    expect(storage.readMetadataExact).not.toHaveBeenCalled();
    expect(storage.downloadGenerationExact).not.toHaveBeenCalled();
    expect(validatePure).toHaveBeenCalledWith(
      expect.objectContaining({ sessionBytes: [] }),
    );
    expect(() =>
      resolveV2FirebaseActivityInstancesPublicationSessionMaterialV1({
        handle,
        plan: plan as never,
        sessionOrdinal: 1,
      }),
    ).toThrow(
      "v2_firebase_activity_instances_publication_session_resolve_invalid",
    );
  });

  it.each(["missing", "tampered"] as const)(
    "fails closed on a %s generation-pinned child",
    async (kind) => {
      const target = permits[17]!.objectPath;
      if (kind === "missing") state.missingPath = target;
      else state.tamperPath = target;
      await expect(
        createFirebaseAdminV2ActivityInstancesValidatorAdapterV1().validateCommittedActivityInstances(
          { plan: plan as never, commitHandle: commitHandle as never },
        ),
      ).rejects.toThrow(
        kind === "missing"
          ? "v2_activity_instances_child_metadata_missing"
          : "v2_activity_instances_child_readback_mismatch",
      );
      expect(validatePure).not.toHaveBeenCalled();
    },
  );

  it("rejects cloned/cross inputs and D2 candidate substitution before child I/O", async () => {
    await expect(
      createFirebaseAdminV2ActivityInstancesValidatorAdapterV1().validateCommittedActivityInstances(
        { plan: plan as never, commitHandle: { ...commitHandle } as never },
      ),
    ).rejects.toThrow("test_commit_handle_invalid");
    await expect(
      createFirebaseAdminV2ActivityInstancesValidatorAdapterV1().validateCommittedActivityInstances(
        { plan: { ...plan } as never, commitHandle: commitHandle as never },
      ),
    ).rejects.toThrow("test_commit_binding_invalid");
    state.inputSummaryCandidateFingerprint =
      hashCanonicalBody("other-candidate");
    await expect(
      createFirebaseAdminV2ActivityInstancesValidatorAdapterV1().validateCommittedActivityInstances(
        { plan: plan as never, commitHandle: commitHandle as never },
      ),
    ).rejects.toThrow(
      "v2_firebase_activity_instances_validator_binding_mismatch",
    );
    expect(storage.readMetadataExact).not.toHaveBeenCalled();
  });
});
