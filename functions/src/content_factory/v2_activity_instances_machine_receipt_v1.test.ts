import {
  canonicalJsonV1,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1 } from "./v2_activity_stage_commit_contract_v1";
import {
  V2_ACTIVITY_INSTANCES_MACHINE_MANIFEST_MAX_BYTES_V1,
  V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_BODY_V1,
  V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_FINGERPRINT_V1,
  V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_MAX_BYTES_V1,
  V2_ACTIVITY_INSTANCES_VALIDATOR_PROFILE_FINGERPRINT_V1,
  decideV2ActivityInstancesMachineManifestV1,
  materializeV2ActivityInstancesMachineManifestV1,
  materializeV2ActivityInstancesMachineReceiptV1,
  parseV2ActivityInstancesMachineManifestV1,
  parseV2ActivityInstancesMachineReceiptV1,
  v2ActivityInstancesMachineCommitKeyV1,
  v2ActivityInstancesMachineManifestDocumentPathV1,
  v2ActivityInstancesMachineReceiptObjectPathV1,
  type V2ActivityInstancesMachineReceiptDataV1,
} from "./v2_activity_instances_machine_receipt_v1";

const h = (value: string) => sha256Utf8(value);

function data(
  outcome: "blocked" | "eligible_for_human_review_only" = "blocked",
): V2ActivityInstancesMachineReceiptDataV1 {
  const eligible = outcome === "eligible_for_human_review_only";
  return Object.freeze({
    planFingerprint: h("plan"),
    courseContractFingerprint: h("course"),
    workspaceFingerprint: h("workspace"),
    stageId: "episode-1:activity-instances",
    episodeId: "episode-1",
    candidateFingerprint: h("candidate"),
    bodySchemaVersion: "v2-activity-instances-package-root.v2",
    bodyFingerprint: h("body"),
    packageFingerprint: h("package"),
    capabilitySnapshotFingerprint: h("capability"),
    repositoryOriginReceiptFingerprint: h("origin"),
    repositoryObservationFingerprint: h("observation"),
    d2OuterReceiptFingerprint: h("outer"),
    d2CommittedManifestFingerprint: h("d2-manifest"),
    d2CommittedOperationFingerprint: h("d2-operation"),
    permitAggregateFingerprint: eligible ? h("permits") : null,
    readbackAggregateFingerprint: eligible ? h("readback") : null,
    storageReadbackFingerprint: eligible ? h("storage-readback") : null,
    sessionCount: eligible ? 12 : null,
    childObjectCount: eligible ? 48 : null,
    totalReadbackBytes: eligible ? 100_000 : null,
    pureValidationResultFingerprint: h("pure-result"),
    validatorRulesFingerprint: h("validator-rules"),
    registryFingerprint: h("registry"),
    checkedRuleCodes: ["canonical_root", "exact_48_child_readback"],
    issueCodes: eligible ? [] : ["child_readback_not_established"],
    outcome,
  });
}

function chain(
  outcome: "blocked" | "eligible_for_human_review_only" = "blocked",
) {
  const receipt = materializeV2ActivityInstancesMachineReceiptV1(data(outcome));
  const receiptRaw = canonicalJsonV1(receipt);
  const manifest = materializeV2ActivityInstancesMachineManifestV1({
    receipt,
    receiptRawHash: sha256Utf8(receiptRaw),
    objectGeneration: "101",
    byteSize: utf8ByteLengthV1(receiptRaw),
    createdAtEpochMs: 1_800_000_000_000,
  });
  return { receipt, receiptRaw, manifest };
}

describe("Activity Instances validator #6 durable machine receipt", () => {
  it("links the namespace to D2 and round-trips a nullable blocked receipt", () => {
    expect(
      V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_BODY_V1.parentActivityStageCommitNamespaceFingerprint,
    ).toBe(V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1);
    expect(
      V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_BODY_V1.firestore
        .committedManifestCollection,
    ).toBe("content_v2_stage_repository_commits");
    const { receipt, receiptRaw, manifest } = chain();
    expect(parseV2ActivityInstancesMachineReceiptV1(receiptRaw)).toEqual(
      receipt,
    );
    expect(
      parseV2ActivityInstancesMachineManifestV1(canonicalJsonV1(manifest)),
    ).toEqual(manifest);
    expect(receipt).toMatchObject({
      outcome: "blocked",
      permitAggregateFingerprint: null,
      readbackAggregateFingerprint: null,
      storageReadbackFingerprint: null,
      repositoryOriginAuthority: "none",
      dependencyResolutionAuthority: "none",
      storageAuthority: "none",
      authenticationAuthority: "none",
      principalIdentityAuthority: "none",
      machineValidationAuthority: "none",
      contentValidationAuthority: "none",
      humanReviewAuthority: "none",
      deviceEvidenceAuthority: "none",
      listeningEvidenceAuthority: "none",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      completionAuthority: "none",
      publicationDecisionAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
  });

  it("requires complete 12/48 storage evidence for human-review eligibility without minting authority", () => {
    const { receipt } = chain("eligible_for_human_review_only");
    expect(receipt).toMatchObject({
      outcome: "eligible_for_human_review_only",
      sessionCount: 12,
      childObjectCount: 48,
      repositoryOriginAuthority: "none",
      storageAuthority: "none",
      machineValidationAuthority: "none",
      humanReviewAuthority: "none",
      publicationAuthority: "none",
    });
    for (const field of [
      "permitAggregateFingerprint",
      "readbackAggregateFingerprint",
      "storageReadbackFingerprint",
    ] as const) {
      expect(() =>
        materializeV2ActivityInstancesMachineReceiptV1({
          ...data("eligible_for_human_review_only"),
          [field]: null,
        }),
      ).toThrow("v2_activity_instances_machine_receipt_invalid");
    }
    expect(() =>
      materializeV2ActivityInstancesMachineReceiptV1({
        ...data("eligible_for_human_review_only"),
        childObjectCount: null,
      }),
    ).toThrow("v2_activity_instances_machine_receipt_invalid");
  });

  it("allows malformed-root blocked data without fabricating package or capability hashes", () => {
    const receipt = materializeV2ActivityInstancesMachineReceiptV1({
      ...data(),
      packageFingerprint: null,
      capabilitySnapshotFingerprint: null,
      issueCodes: ["root_manifest_invalid"],
    });
    expect(receipt).toMatchObject({
      outcome: "blocked",
      packageFingerprint: null,
      capabilitySnapshotFingerprint: null,
      repositoryOriginAuthority: "none",
      storageAuthority: "none",
    });
    expect(() =>
      materializeV2ActivityInstancesMachineReceiptV1({
        ...data("eligible_for_human_review_only"),
        packageFingerprint: null,
      }),
    ).toThrow("v2_activity_instances_machine_receipt_invalid");
  });

  it("rejects authority laundering, unsorted issues and profile substitution", () => {
    const { receiptRaw, manifest } = chain();
    const laundered = JSON.parse(receiptRaw);
    laundered.repositoryOriginAuthority =
      "authenticated_repository_snapshot_only";
    expect(() =>
      parseV2ActivityInstancesMachineReceiptV1(canonicalJsonV1(laundered)),
    ).toThrow("v2_activity_instances_machine_receipt_invalid");
    expect(() =>
      materializeV2ActivityInstancesMachineReceiptV1({
        ...data(),
        issueCodes: ["z_issue", "a_issue"],
      }),
    ).toThrow("v2_activity_instances_machine_receipt_invalid");
    const changedManifest = JSON.parse(canonicalJsonV1(manifest));
    changedManifest.validatorProfileFingerprint = h("other-profile");
    expect(() =>
      parseV2ActivityInstancesMachineManifestV1(
        canonicalJsonV1(changedManifest),
      ),
    ).toThrow("v2_activity_instances_machine_manifest_invalid");
    const changedPath = JSON.parse(canonicalJsonV1(manifest));
    changedPath.receiptObject.objectPath = `${manifest.receiptObject.objectPath}.swap`;
    expect(() =>
      parseV2ActivityInstancesMachineManifestV1(canonicalJsonV1(changedPath)),
    ).toThrow("v2_activity_instances_machine_manifest_invalid");
  });

  it("binds direct key, exact receipt path/raw hash/generation/size and rejects substitutions", () => {
    const { receipt, receiptRaw, manifest } = chain();
    const identity = {
      planFingerprint: receipt.planFingerprint,
      stageId: receipt.stageId,
      candidateFingerprint: receipt.candidateFingerprint,
      validatorRulesFingerprint: receipt.validatorRulesFingerprint,
      registryFingerprint: receipt.registryFingerprint,
    };
    expect(manifest.commitKey).toBe(
      v2ActivityInstancesMachineCommitKeyV1(identity),
    );
    expect(v2ActivityInstancesMachineManifestDocumentPathV1(identity)).toBe(
      `content_v2_stage_repository_commits/${manifest.commitKey}`,
    );
    const changedRulesIdentity = {
      ...identity,
      validatorRulesFingerprint: h("changed-rules"),
    };
    const changedRegistryIdentity = {
      ...identity,
      registryFingerprint: h("changed-registry"),
    };
    expect(
      v2ActivityInstancesMachineCommitKeyV1(changedRulesIdentity),
    ).not.toBe(manifest.commitKey);
    expect(
      v2ActivityInstancesMachineManifestDocumentPathV1(changedRulesIdentity),
    ).not.toBe(v2ActivityInstancesMachineManifestDocumentPathV1(identity));
    expect(
      v2ActivityInstancesMachineManifestDocumentPathV1(changedRegistryIdentity),
    ).not.toBe(v2ActivityInstancesMachineManifestDocumentPathV1(identity));
    expect(manifest.receiptObject.objectPath).toBe(
      v2ActivityInstancesMachineReceiptObjectPathV1({
        ...identity,
        receiptFingerprint: receipt.receiptFingerprint,
        receiptRawHash: sha256Utf8(receiptRaw),
      }),
    );
    expect(() =>
      materializeV2ActivityInstancesMachineManifestV1({
        receipt,
        receiptRawHash: h("wrong-raw"),
        objectGeneration: "101",
        byteSize: utf8ByteLengthV1(receiptRaw),
        createdAtEpochMs: 1,
      }),
    ).toThrow("v2_activity_instances_machine_manifest_invalid");
    const crossRules = JSON.parse(canonicalJsonV1(manifest));
    crossRules.validatorRulesFingerprint = h("substituted-rules");
    expect(() =>
      parseV2ActivityInstancesMachineManifestV1(canonicalJsonV1(crossRules)),
    ).toThrow("v2_activity_instances_machine_manifest_invalid");
    const crossRegistry = JSON.parse(canonicalJsonV1(manifest));
    crossRegistry.registryFingerprint = h("substituted-registry");
    expect(() =>
      parseV2ActivityInstancesMachineManifestV1(canonicalJsonV1(crossRegistry)),
    ).toThrow("v2_activity_instances_machine_manifest_invalid");
    expect(() =>
      materializeV2ActivityInstancesMachineManifestV1({
        receipt,
        receiptRawHash: sha256Utf8(receiptRaw),
        objectGeneration: "bad",
        byteSize: utf8ByteLengthV1(receiptRaw),
        createdAtEpochMs: 1,
      }),
    ).toThrow("v2_activity_instances_machine_manifest_invalid");
    expect(() =>
      materializeV2ActivityInstancesMachineManifestV1({
        receipt,
        receiptRawHash: sha256Utf8(receiptRaw),
        objectGeneration: "102",
        byteSize: utf8ByteLengthV1(receiptRaw) + 1,
        createdAtEpochMs: 1,
      }),
    ).toThrow("v2_activity_instances_machine_manifest_invalid");
  });

  it("returns create, exact replay despite timestamp drift, and conflict on receipt pin substitution", () => {
    const { receipt, receiptRaw, manifest } = chain();
    expect(
      decideV2ActivityInstancesMachineManifestV1({
        currentRaw: null,
        proposed: manifest,
      }).kind,
    ).toBe("create");
    const later = materializeV2ActivityInstancesMachineManifestV1({
      receipt,
      receiptRawHash: sha256Utf8(receiptRaw),
      objectGeneration: manifest.receiptObject.objectGeneration,
      byteSize: utf8ByteLengthV1(receiptRaw),
      createdAtEpochMs: manifest.createdAtEpochMs + 1,
    });
    expect(
      decideV2ActivityInstancesMachineManifestV1({
        currentRaw: canonicalJsonV1(manifest),
        proposed: later,
      }).kind,
    ).toBe("exact_replay");
    const other = chain("eligible_for_human_review_only").manifest;
    expect(
      decideV2ActivityInstancesMachineManifestV1({
        currentRaw: canonicalJsonV1(manifest),
        proposed: other,
      }).kind,
    ).toBe("conflict");
  });

  it("enforces receipt/manifest byte caps and immutable namespace fingerprints", () => {
    const { receipt, manifest } = chain();
    expect(utf8ByteLengthV1(canonicalJsonV1(receipt))).toBeLessThanOrEqual(
      V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_MAX_BYTES_V1,
    );
    expect(utf8ByteLengthV1(canonicalJsonV1(manifest))).toBeLessThanOrEqual(
      V2_ACTIVITY_INSTANCES_MACHINE_MANIFEST_MAX_BYTES_V1,
    );
    expect(V2_ACTIVITY_INSTANCES_MACHINE_NAMESPACE_FINGERPRINT_V1).toHaveLength(
      64,
    );
    expect(V2_ACTIVITY_INSTANCES_VALIDATOR_PROFILE_FINGERPRINT_V1).toHaveLength(
      64,
    );
    expect(() =>
      parseV2ActivityInstancesMachineReceiptV1(
        "x".repeat(V2_ACTIVITY_INSTANCES_MACHINE_RECEIPT_MAX_BYTES_V1 + 1),
      ),
    ).toThrow();
    expect(() =>
      parseV2ActivityInstancesMachineManifestV1(
        "x".repeat(V2_ACTIVITY_INSTANCES_MACHINE_MANIFEST_MAX_BYTES_V1 + 1),
      ),
    ).toThrow();
  });
});
