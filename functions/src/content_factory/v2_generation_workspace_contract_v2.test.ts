import fs from "node:fs";
import path from "node:path";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
  type V2CanonicalSeasonPlanV2,
  type V2CanonicalStageNodeV2,
} from "./v2_canonical_generation_plan_v2";
import {
  V2_CANONICAL_STAGE_CANDIDATE_SCHEMA_V2,
  V2_GENERATION_STAGE_WORKSPACE_SCHEMA_V2,
  V2_STAGE_DEPENDENCY_SNAPSHOT_SCHEMA_V2,
  V2_STAGE_VALIDATOR_REGISTRY_V2,
  V2_STRUCTURAL_STAGE_RECEIPT_SCHEMA_V2,
  V2_WORKSPACE_DEPENDENCY_MAX_BYTES_V2,
  V2_WORKSPACE_DEPENDENCY_MAX_COUNT_V2,
  isV2BlockedStructuralStageReceiptV2,
  isV2CanonicalStageCandidateV2,
  isV2GenerationStageWorkspaceV2,
  isV2StageDependencySnapshotV2,
  materializeBlockedV2StructuralStageReceiptV2,
  materializeV2GenerationStageWorkspaceV2,
  parseV2CanonicalStageCandidateV2,
  parseV2StageDependencySnapshotV2,
  type V2StageDependencyEntryV2,
  type V2WorkspaceCapabilityBindingV2,
} from "./v2_generation_workspace_contract_v2";

const hash = (value: unknown) => hashCanonicalBody(value);

function plan(): V2CanonicalSeasonPlanV2 {
  return buildV2CanonicalSeasonPlanV2(
    parseV2CanonicalPlanRequestV2(
      canonicalJsonV1({
        schemaVersion: "v2-canonical-plan-request.v2",
        workspaceId: "workspace-1",
        jobId: "job-1",
        authoringRevision: 3,
        seasonId: "season-1",
        scope: "full_season",
        episodeIds: Array.from(
          { length: 32 },
          (_, index) => `episode-${index + 1}`,
        ),
        recipes: [
          { episodeId: "episode-1", dialogue: true, speakingMission: true },
        ],
        languageProfileRef: {
          profileId: "english-general",
          targetLanguage: "en",
          version: 1,
          contentHash: hash("language"),
        },
        speechProfileRef: {
          profileId: "english-speech",
          targetLanguage: "en",
          speechLocale: "en-US",
          version: 1,
          contentHash: hash("speech"),
        },
        voiceGenerationProfileRef: {
          profileId: "openai-four-voices",
          version: 1,
          contentHash: hash("voices"),
        },
        decisionRegistryRef: {
          decisionId: "HYP-V2-007",
          version: 1,
          contentHash: hash("decision"),
        },
        templateBindings: Array.from({ length: 32 }, (_, index) => ({
          episodeId: `episode-${index + 1}`,
          templateRefs: [
            {
              templateId: "phrase-builder",
              version: 1,
              contentHash: hash("template"),
            },
          ],
        })),
      }),
    ),
  );
}

const objectRef = (contentHash: string, suffix: string) => ({
  objectPath: `objects/${suffix}.json`,
  contentHash,
  objectGeneration: "generation-1",
  byteSize: 100,
});

function entriesFor(
  currentPlan: V2CanonicalSeasonPlanV2,
  stage: V2CanonicalStageNodeV2,
): V2StageDependencyEntryV2[] {
  const catalog = new Map(
    currentPlan.externalRequirementCatalog.map((entry) => [
      entry.requirementId,
      entry.requirement,
    ]),
  );
  const entries: V2StageDependencyEntryV2[] = [
    ...stage.dependsOn.map((stageId, index) => ({
      dependencyType: "stage" as const,
      stageId,
      candidateFingerprint: hash(["candidate", stageId]),
      machineReceiptFingerprint: hash(["receipt", stageId]),
      artifactRef: objectRef(hash(["artifact", stageId]), `stage-${index}`),
      lifecycleFingerprint: hash(["lifecycle", stageId]),
    })),
    ...stage.externalRequirementIds.map((requirementId, index) => {
      const requirement = catalog.get(requirementId);
      if (!requirement) throw new Error("missing fixture requirement");
      return {
        dependencyType: "external" as const,
        requirementId,
        requirement,
        artifactRef: objectRef(requirement.contentHash, `external-${index}`),
        lifecycleFingerprint: hash(["external-lifecycle", requirementId]),
      };
    }),
  ];
  return entries.sort((left, right) => {
    const leftId =
      left.dependencyType === "stage"
        ? `stage:${left.stageId}`
        : `external:${left.requirementId}`;
    const rightId =
      right.dependencyType === "stage"
        ? `stage:${right.stageId}`
        : `external:${right.requirementId}`;
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  });
}

function snapshotValue(
  currentPlan: V2CanonicalSeasonPlanV2,
  stage: V2CanonicalStageNodeV2,
) {
  const body = {
    schemaVersion: V2_STAGE_DEPENDENCY_SNAPSHOT_SCHEMA_V2,
    planFingerprint: currentPlan.planFingerprint,
    stageId: stage.stageId,
    stageKind: stage.kind,
    entries: entriesFor(currentPlan, stage),
    entryCount: stage.dependsOn.length + stage.externalRequirementIds.length,
    resolutionOrigin: "not_established" as const,
  };
  return { ...body, snapshotFingerprint: hashCanonicalBody(body) };
}

function workspaceFor(
  currentPlan: V2CanonicalSeasonPlanV2,
  stage: V2CanonicalStageNodeV2,
  capabilityBinding: V2WorkspaceCapabilityBindingV2 = { kind: "none" },
) {
  const snapshot = parseV2StageDependencySnapshotV2(
    currentPlan,
    canonicalJsonV1(snapshotValue(currentPlan, stage)),
  );
  const workspace = materializeV2GenerationStageWorkspaceV2({
    plan: currentPlan,
    stageId: stage.stageId,
    dependencySnapshot: snapshot,
    capabilityBinding,
  });
  return { snapshot, workspace };
}

function candidateRaw(
  workspace: ReturnType<typeof workspaceFor>["workspace"],
  overrides: Record<string, unknown> = {},
) {
  const body = { schemaVersion: "fixture-body.v1", title: "Fixture" };
  const provenanceRefs = [
    {
      provenanceType: "authoring_revision",
      provenanceId: "revision-3",
      objectPath: "provenance/revision-3.json",
      contentHash: hash("provenance"),
      objectGeneration: "generation-3",
      byteSize: 80,
    },
  ];
  const capabilityBindingFingerprint =
    workspace.capabilityBinding.kind === "activity_instances"
      ? workspace.capabilityBinding.bindingFingerprint
      : null;
  const base = {
    schemaVersion: V2_CANONICAL_STAGE_CANDIDATE_SCHEMA_V2,
    workspaceFingerprint: workspace.workspaceFingerprint,
    planFingerprint: workspace.planFingerprint,
    stageId: workspace.stage.stageId,
    stageKind: workspace.stage.kind,
    subjectFingerprint: workspace.subject.subjectFingerprint,
    bodySchemaVersion: "fixture-body.v1",
    body,
    bodyFingerprint: hashCanonicalBody(body),
    dependencySnapshotFingerprint: workspace.dependencySnapshotFingerprint,
    capabilityBindingFingerprint,
    contentClass: "production_candidate",
    provenanceRefs,
    provenanceFingerprint: hashCanonicalBody({
      schemaVersion: "v2-stage-artifact-provenance.v2",
      provenanceRefs,
    }),
    producerFingerprint: hash("producer"),
    configurationFingerprint: hash("configuration"),
    candidateBytesOrigin: "caller_supplied_canonical_bytes",
    candidateOriginAuthenticity: "not_established",
    contentTrackAuthority: "unverified_candidate_claim",
    artifactStorageAuthority: "none",
    repositoryAuthority: "none",
    humanReviewAuthority: "none",
    specialistEvidenceAuthority: "none",
    deviceEvidenceAuthority: "none",
    listeningEvidenceAuthority: "none",
    executionAuthority: "none",
    publicationPolicy: "draft_only_no_consumer",
    runtimeConsumer: false,
    releaseEligible: false,
    releaseAuthority: false,
    ...overrides,
  };
  return canonicalJsonV1({
    ...base,
    candidateFingerprint: hashCanonicalBody({
      schemaVersion: "v2-stage-artifact-candidate-fingerprint.v2",
      candidate: base,
    }),
  });
}

describe("Learning V2 generation workspace additive v2 contract", () => {
  it("materializes exact branded dependency, workspace, candidate and blocked structural receipt", () => {
    const currentPlan = plan();
    const stage = currentPlan.stages.find(
      (candidate) => candidate.kind === "v2_season_outline",
    )!;
    const { snapshot, workspace } = workspaceFor(currentPlan, stage);
    const raw = candidateRaw(workspace);
    const candidate = parseV2CanonicalStageCandidateV2(workspace, raw);
    const artifactRefRaw = canonicalJsonV1({
      objectPath: `learning-v2/v2-candidates/${stage.stageId}.json`,
      contentHash: sha256Utf8(raw),
      objectGeneration: "unpersisted",
      byteSize: utf8ByteLengthV1(raw),
    });
    const receipt = materializeBlockedV2StructuralStageReceiptV2({
      workspace,
      candidate,
      repositoryCapabilityBinding: null,
      artifactRefRaw,
    });

    expect(isV2StageDependencySnapshotV2(snapshot)).toBe(true);
    expect(isV2GenerationStageWorkspaceV2(workspace)).toBe(true);
    expect(isV2CanonicalStageCandidateV2(candidate)).toBe(true);
    expect(isV2BlockedStructuralStageReceiptV2(receipt)).toBe(true);
    expect(workspace.schemaVersion).toBe(
      V2_GENERATION_STAGE_WORKSPACE_SCHEMA_V2,
    );
    expect(receipt).toMatchObject({
      schemaVersion: V2_STRUCTURAL_STAGE_RECEIPT_SCHEMA_V2,
      outcome: "blocked",
      candidateClassification: "structural_candidate_only",
      machineValidationAuthority: "structural_checks_only",
      humanReviewState: "not_evaluated",
      humanApprovalAuthority: "none",
      sourceEvidenceAuthority: "unverified_canonical_bytes",
      externalDependencyAuthority: "unverified_injected_readback",
      readerEvidenceOrigin: "not_established",
      evidenceAuthority: "structural_snapshot_only",
      executionAuthority: "none",
      artifactStorageAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(receipt.blockingIssueCodes).toEqual([
      "v2_candidate_origin_authenticity_not_established",
      "v2_repository_origin_authenticity_not_established",
      "v2_stage_validator_not_installed",
    ]);
    expect(Object.values(V2_STAGE_VALIDATOR_REGISTRY_V2)).toHaveLength(13);
    expect(
      Object.entries(V2_STAGE_VALIDATOR_REGISTRY_V2)
        .filter(([, entry]) => entry.state === "installed")
        .map(([kind]) => kind),
    ).toEqual(["v2_activity_instances"]);
    expect(V2_STAGE_VALIDATOR_REGISTRY_V2.v2_activity_instances).toEqual({
      state: "installed",
      bodySchemaVersion: "v2-activity-instances-package-root.v2",
      validatorId: "learning-v2-activity-instances-validator",
      validatorVersion: 1,
    });
  });

  it.each(["test_only", "demo_content"] as const)(
    "adds the exact nonproduction blocker for %s without weakening the base blockers",
    (contentClass) => {
      const currentPlan = plan();
      const stage = currentPlan.stages.find(
        (candidate) => candidate.kind === "v2_season_outline",
      )!;
      const { workspace } = workspaceFor(currentPlan, stage);
      const raw = candidateRaw(workspace, { contentClass });
      const candidate = parseV2CanonicalStageCandidateV2(workspace, raw);
      const artifactRefRaw = canonicalJsonV1({
        objectPath: `learning-v2/v2-candidates/${stage.stageId}.json`,
        contentHash: sha256Utf8(raw),
        objectGeneration: "unpersisted",
        byteSize: utf8ByteLengthV1(raw),
      });
      const receipt = materializeBlockedV2StructuralStageReceiptV2({
        workspace,
        candidate,
        repositoryCapabilityBinding: null,
        artifactRefRaw,
      });

      expect(receipt.blockingIssueCodes).toEqual([
        "v2_candidate_origin_authenticity_not_established",
        "v2_repository_origin_authenticity_not_established",
        "v2_stage_nonproduction_content_forbidden",
        "v2_stage_validator_not_installed",
      ]);
    },
  );

  it("installs the exact Activity Instances validator and leaves twelve stages absent", () => {
    expect(V2_STAGE_VALIDATOR_REGISTRY_V2.v2_activity_instances.state).toBe(
      "installed",
    );
    expect(
      Object.entries(V2_STAGE_VALIDATOR_REGISTRY_V2)
        .filter(([, entry]) => entry.state === "not_installed")
        .map(([kind]) => kind),
    ).toHaveLength(12);
  });

  it("accepts finite fractional body data and rejects unsafe integers or literal negative zero", () => {
    const currentPlan = plan();
    const stage = currentPlan.stages.find(
      (candidate) => candidate.kind === "v2_season_outline",
    )!;
    const { workspace } = workspaceFor(currentPlan, stage);
    const fractionalBody = {
      schemaVersion: "fixture-body.v1",
      score: 0.5,
    };
    expect(
      parseV2CanonicalStageCandidateV2(
        workspace,
        candidateRaw(workspace, {
          body: fractionalBody,
          bodyFingerprint: hashCanonicalBody(fractionalBody),
        }),
      ).body,
    ).toEqual(fractionalBody);

    const unsafeBody = {
      schemaVersion: "fixture-body.v1",
      count: Number.MAX_SAFE_INTEGER + 1,
    };
    expect(() =>
      parseV2CanonicalStageCandidateV2(
        workspace,
        candidateRaw(workspace, {
          body: unsafeBody,
          bodyFingerprint: hashCanonicalBody(unsafeBody),
        }),
      ),
    ).toThrow("v2_workspace_json_number_invalid");

    const zeroBody = { schemaVersion: "fixture-body.v1", score: 0 };
    const negativeZeroRaw = candidateRaw(workspace, {
      body: zeroBody,
      bodyFingerprint: hashCanonicalBody(zeroBody),
    }).replace('"score":0', '"score":-0');
    expect(() =>
      parseV2CanonicalStageCandidateV2(workspace, negativeZeroRaw),
    ).toThrow("v2_workspace_json_number_invalid");
  });

  it("keeps activity capability binding outside the exact dependency closure", () => {
    const currentPlan = plan();
    const stage = currentPlan.stages.find(
      (candidate) =>
        candidate.kind === "v2_activity_instances" &&
        candidate.episodeId === "episode-1",
    )!;
    const bindingFingerprint = hash("activity-capability-binding");
    const { snapshot, workspace } = workspaceFor(currentPlan, stage, {
      kind: "activity_instances",
      bindingFingerprint,
      resolutionOrigin: "not_established",
    });
    expect(snapshot.entryCount).toBe(
      stage.dependsOn.length + stage.externalRequirementIds.length,
    );
    expect(snapshot.entryCount).toBeLessThanOrEqual(
      V2_WORKSPACE_DEPENDENCY_MAX_COUNT_V2,
    );
    expect(workspace.capabilityBinding).toEqual({
      kind: "activity_instances",
      bindingFingerprint,
      resolutionOrigin: "not_established",
    });
    expect(() =>
      materializeV2GenerationStageWorkspaceV2({
        plan: currentPlan,
        stageId: stage.stageId,
        dependencySnapshot: snapshot,
        capabilityBinding: { kind: "none" },
      }),
    ).toThrow("v2_workspace_capability_invalid");
  });

  it("rejects missing, extra, substituted, duplicate, unsorted and over-cap dependencies", () => {
    const currentPlan = plan();
    const stage = currentPlan.stages.find(
      (candidate) =>
        candidate.kind === "v2_activity_instances" &&
        candidate.episodeId === "episode-1",
    )!;
    const base = snapshotValue(currentPlan, stage);
    const parse = (value: Record<string, unknown>) =>
      parseV2StageDependencySnapshotV2(
        currentPlan,
        canonicalJsonV1({
          ...value,
          snapshotFingerprint: hashCanonicalBody(value),
        }),
      );
    const body = (
      value: ReturnType<typeof snapshotValue>,
    ): Record<string, any> => {
      const copy: Record<string, any> = { ...value };
      delete copy.snapshotFingerprint;
      return copy;
    };
    const missing = body(base);
    missing.entries = missing.entries.slice(1);
    missing.entryCount = missing.entries.length;
    expect(() => parse(missing)).toThrow(
      "v2_workspace_dependency_closure_invalid",
    );

    const duplicate = body(base);
    duplicate.entries = [...duplicate.entries, duplicate.entries[0]];
    duplicate.entryCount = duplicate.entries.length;
    expect(() => parse(duplicate)).toThrow(
      "v2_workspace_dependency_order_invalid",
    );

    const reversed = body(base);
    reversed.entries = [...reversed.entries].reverse();
    expect(() => parse(reversed)).toThrow(
      "v2_workspace_dependency_order_invalid",
    );

    const traversingPath = body(base);
    traversingPath.entries = traversingPath.entries.map(
      (entry: V2StageDependencyEntryV2, index: number) =>
        index === 0
          ? {
              ...entry,
              artifactRef: {
                ...entry.artifactRef,
                objectPath: "objects/../escaped.json",
              },
            }
          : entry,
    );
    expect(() => parse(traversingPath)).toThrow(
      "v2_workspace_dependency_invalid",
    );

    const substituted = body(base);
    const externalIndex = substituted.entries.findIndex(
      (entry: V2StageDependencyEntryV2) => entry.dependencyType === "external",
    );
    const external = substituted.entries[externalIndex];
    if (external.dependencyType !== "external")
      throw new Error("missing external fixture");
    substituted.entries = substituted.entries.map(
      (entry: V2StageDependencyEntryV2, index: number) =>
        index === externalIndex
          ? {
              ...external,
              requirement: {
                ...external.requirement,
                contentHash: hash("substituted"),
              },
              artifactRef: {
                ...external.artifactRef,
                contentHash: hash("substituted"),
              },
            }
          : entry,
    );
    expect(() => parse(substituted)).toThrow(
      "v2_workspace_dependency_closure_invalid",
    );

    const overCap = body(base);
    overCap.entries = Array.from(
      { length: V2_WORKSPACE_DEPENDENCY_MAX_COUNT_V2 + 1 },
      (_, index) => ({
        dependencyType: "stage" as const,
        stageId: `foreign-stage-${index}`,
        candidateFingerprint: hash(["candidate", index]),
        machineReceiptFingerprint: hash(["receipt", index]),
        artifactRef: objectRef(hash(["artifact", index]), `foreign-${index}`),
        lifecycleFingerprint: hash(["lifecycle", index]),
      }),
    );
    overCap.entryCount = overCap.entries.length;
    expect(() => parse(overCap)).toThrow(
      "v2_workspace_dependency_snapshot_invalid",
    );
  });

  it("rejects v1/clone brands, noncanonical and oversized bytes", () => {
    const currentPlan = plan();
    const stage = currentPlan.stages.find(
      (candidate) => candidate.kind === "v2_season_outline",
    )!;
    const snapshotRaw = canonicalJsonV1(snapshotValue(currentPlan, stage));
    expect(() =>
      parseV2StageDependencySnapshotV2(
        { ...currentPlan } as V2CanonicalSeasonPlanV2,
        snapshotRaw,
      ),
    ).toThrow("v2_workspace_plan_untrusted");
    const v1 = JSON.parse(snapshotRaw);
    v1.schemaVersion = "v2-dependency-snapshot.v1";
    expect(() =>
      parseV2StageDependencySnapshotV2(currentPlan, canonicalJsonV1(v1)),
    ).toThrow("v2_workspace_dependency_snapshot_invalid");
    expect(() =>
      parseV2StageDependencySnapshotV2(
        currentPlan,
        JSON.stringify(snapshotValue(currentPlan, stage), null, 2),
      ),
    ).toThrow("v2_workspace_dependency_snapshot_invalid");
    expect(() =>
      parseV2StageDependencySnapshotV2(
        currentPlan,
        "x".repeat(V2_WORKSPACE_DEPENDENCY_MAX_BYTES_V2 + 1),
      ),
    ).toThrow("v2_workspace_dependency_snapshot_invalid");

    const { workspace } = workspaceFor(currentPlan, stage);
    expect(() =>
      parseV2CanonicalStageCandidateV2(
        { ...workspace },
        candidateRaw(workspace),
      ),
    ).toThrow("v2_workspace_untrusted");
    const v1Candidate = JSON.parse(candidateRaw(workspace));
    v1Candidate.schemaVersion = "v2-canonical-stage-artifact-candidate.v1";
    expect(() =>
      parseV2CanonicalStageCandidateV2(workspace, canonicalJsonV1(v1Candidate)),
    ).toThrow("v2_workspace_candidate_invalid");
  });

  it("rejects candidate fingerprint drift and cannot self-assert eligibility", () => {
    const currentPlan = plan();
    const stage = currentPlan.stages.find(
      (candidate) => candidate.kind === "v2_season_outline",
    )!;
    const { workspace } = workspaceFor(currentPlan, stage);
    const drifted = JSON.parse(candidateRaw(workspace));
    drifted.body.title = "Drifted";
    expect(() =>
      parseV2CanonicalStageCandidateV2(workspace, canonicalJsonV1(drifted)),
    ).toThrow("v2_workspace_candidate_invalid");
    expect(() =>
      parseV2CanonicalStageCandidateV2(
        workspace,
        candidateRaw(workspace, {
          candidateOriginAuthenticity: "verified",
        }),
      ),
    ).toThrow("v2_workspace_candidate_invalid");

    const raw = candidateRaw(workspace);
    const candidate = parseV2CanonicalStageCandidateV2(workspace, raw);
    const wrongArtifact = canonicalJsonV1({
      objectPath: `learning-v2/v2-candidates/${stage.stageId}.json`,
      contentHash: hash("wrong-artifact"),
      objectGeneration: "unpersisted",
      byteSize: utf8ByteLengthV1(raw),
    });
    expect(() =>
      materializeBlockedV2StructuralStageReceiptV2({
        workspace,
        candidate,
        repositoryCapabilityBinding: null,
        artifactRefRaw: wrongArtifact,
      }),
    ).toThrow("v2_workspace_receipt_artifact_invalid");
    expect(
      materializeBlockedV2StructuralStageReceiptV2.toString(),
    ).not.toContain("eligible_for_human_review");
  });

  it("has no v1 workspace/validator fallback or live I/O import", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "v2_generation_workspace_contract_v2.ts"),
      "utf8",
    );
    expect(source).not.toMatch(
      /v2_generation_workspace_contract["']|v2_canonical_stage_validation["']/,
    );
    expect(source).not.toMatch(
      /firebase|firestore|fetch\(|https?:\/\/|from\s+["'][^"']*provider/i,
    );
  });
});
