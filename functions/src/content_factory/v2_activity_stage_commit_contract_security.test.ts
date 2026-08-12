import { readFileSync } from "node:fs";
import {
  canonicalJsonV1,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_STAGE_VALIDATOR_REGISTRY_V2 } from "./v2_generation_workspace_contract_v2";
import {
  isV2FirebaseAuthenticatedActivityStageCapabilityHandleV1,
  isV2FirebaseAuthenticatedRepositorySessionHandleV1,
} from "./v2_firebase_authenticated_repository_adapter_v1";
import * as contract from "./v2_activity_stage_commit_contract_v1";

const sourcePath = require.resolve("./v2_activity_stage_commit_contract_v1");
const source = readFileSync(sourcePath, "utf8");
const hash = (label: string) => sha256Utf8(`d2-security:${label}`);

function blockedChain() {
  const planFingerprint = hash("plan");
  const stageId = "activity:season-01:episode-01";
  const candidateFingerprint = hash("candidate");
  const candidatePin = contract.materializeV2ActivityStageCandidatePinV1({
    planFingerprint,
    stageId,
    candidateFingerprint,
    candidateRawHash: hash("candidate-raw"),
    objectGeneration: "1001",
    byteSize: 1024,
  });
  const innerReceiptFingerprint = hash("inner-receipt");
  const innerReceiptPin = contract.materializeV2ActivityStageInnerReceiptPinV1({
    planFingerprint,
    stageId,
    candidateFingerprint,
    innerReceiptFingerprint,
    innerReceiptRawHash: hash("inner-receipt-raw"),
    objectGeneration: "1002",
    byteSize: 2048,
  });
  const receipt = contract.materializeV2ActivityStageBlockedCommitReceiptV1({
    planFingerprint,
    courseContractFingerprint: hash("course"),
    workspaceFingerprint: hash("workspace"),
    stageId,
    subjectFingerprint: hash("subject"),
    candidateFingerprint,
    candidatePin,
    innerReceiptFingerprint,
    innerReceiptPin,
    repositoryOriginReceiptFingerprint: hash("repository-origin"),
    repositoryObservationFingerprint: hash("repository-observation"),
    authenticatedStageBindingFingerprint: hash("stage-binding"),
  });
  return { candidatePin, innerReceiptPin, receipt };
}

describe("V2 activity-stage durable blocked commit security boundary", () => {
  it("exports only pure structural constants, parsers, materializers and the decision", () => {
    expect(Object.keys(contract).sort()).toEqual(
      [
        "V2_ACTIVITY_STAGE_BLOCKED_COMMIT_RECEIPT_SCHEMA_V1",
        "V2_ACTIVITY_STAGE_CANDIDATE_MAX_BYTES_V1",
        "V2_ACTIVITY_STAGE_CANDIDATE_PIN_SCHEMA_V1",
        "V2_ACTIVITY_STAGE_COMMITTED_MANIFEST_SCHEMA_V1",
        "V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_BODY_V1",
        "V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1",
        "V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_SCHEMA_V1",
        "V2_ACTIVITY_STAGE_INNER_RECEIPT_MAX_BYTES_V1",
        "V2_ACTIVITY_STAGE_INNER_RECEIPT_PIN_SCHEMA_V1",
        "V2_ACTIVITY_STAGE_MANIFEST_MAX_BYTES_V1",
        "V2_ACTIVITY_STAGE_OUTER_RECEIPT_MAX_BYTES_V1",
        "decideV2ActivityStageManifestCommitV1",
        "materializeV2ActivityStageBlockedCommitReceiptV1",
        "materializeV2ActivityStageCandidatePinV1",
        "materializeV2ActivityStageCommittedManifestV1",
        "materializeV2ActivityStageInnerReceiptPinV1",
        "parseV2ActivityStageBlockedCommitReceiptV1",
        "parseV2ActivityStageCandidatePinV1",
        "parseV2ActivityStageCommittedManifestV1",
        "parseV2ActivityStageInnerReceiptPinV1",
        "v2ActivityStageCandidateObjectPathV1",
        "v2ActivityStageCommitKeyV1",
        "v2ActivityStageInnerReceiptObjectPathV1",
        "v2ActivityStageManifestDocumentPathV1",
        "v2ActivityStageOuterReceiptObjectPathV1",
      ].sort(),
    );
    expect(source).not.toMatch(
      /export\s+(?:async\s+)?(?:function|const)\s+\w*(?:inject|fake|mock|test|unsafe|handle|authenticate)\w*/iu,
    );
  });

  it("uses the already sealed Firestore root and keeps every namespace private", () => {
    expect(contract.V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_BODY_V1).toEqual(
      expect.objectContaining({
        firestore: {
          committedBlockedManifestCollection:
            "content_v2_stage_repository_commits",
        },
        policy: expect.objectContaining({ publicationAuthority: "none" }),
      }),
    );
    expect(
      Object.values(
        contract.V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_BODY_V1.storage,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^learning-v2\/repository-auth\/private\/activity-stage-/,
        ),
      ]),
    );
    expect(source).not.toContain("content_v2_activity_stage_blocked_commits");
  });

  it("keeps structural receipts blocked and unable to impersonate authenticated handles", () => {
    const { candidatePin, innerReceiptPin, receipt } = blockedChain();
    expect(receipt).toMatchObject({
      authenticatedStageBindingKind: "activity_instances_exact_subset",
      outcome: "blocked",
      candidateClassification: "structural_candidate_only",
      commitAuthority: "durable_blocked_receipt_pin_commit_only",
      candidateOriginAuthority: "none",
      repositoryOriginAuthority: "none",
      dependencyResolutionAuthority: "none",
      machineValidationAuthority: "none",
      contentValidationAuthority: "none",
      principalIdentityAuthority: "none",
      humanReviewAuthority: "none",
      specialistEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      listeningEvidenceAuthority: "none",
      runtimeKernelAuthority: "none",
      executionAuthority: "none",
      publicationDecisionAuthority: "none",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseAuthority: false,
    });
    for (const value of [candidatePin, innerReceiptPin, receipt]) {
      expect(isV2FirebaseAuthenticatedRepositorySessionHandleV1(value)).toBe(
        false,
      );
      expect(
        isV2FirebaseAuthenticatedActivityStageCapabilityHandleV1(value),
      ).toBe(false);
    }
  });

  it("rejects hostile raw additions instead of laundering them through a parser", () => {
    const { receipt } = blockedChain();
    const hostile = canonicalJsonV1({
      ...receipt,
      publicationAuthority: "approved",
      injectedCapability: {
        kind: "v2_firebase_authenticated_activity_stage_capability_handle",
      },
    });
    expect(() =>
      contract.parseV2ActivityStageBlockedCommitReceiptV1(hostile),
    ).toThrow("v2_activity_stage_blocked_commit_receipt_invalid");
  });

  it("keeps only Activity Instances installed and has no live, dynamic, logging, or Firebase wiring", () => {
    const entries = Object.values(V2_STAGE_VALIDATOR_REGISTRY_V2);
    expect(entries).toHaveLength(13);
    expect(entries.filter((entry) => entry.state === "installed")).toEqual([
      V2_STAGE_VALIDATOR_REGISTRY_V2.v2_activity_instances,
    ]);
    expect(source).not.toMatch(
      /\bconsole\b|\blogger\b|\.log\s*\(|firebase-admin|firebase-functions|onCall|onRequest|WeakSet|WeakMap/,
    );
    expect(source).not.toMatch(
      /(?:from|import\s*)\s*\(?["'][^"']*(?:index|callable|worker|scripts|tools|app|components|hooks|contexts)[^"']*["']/,
    );
    expect(source).not.toMatch(/\bimport\s*\(|\brequire\s*\(/);
  });
});
