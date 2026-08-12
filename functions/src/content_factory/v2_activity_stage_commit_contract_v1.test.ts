import {
  canonicalJsonV1,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_BODY_V1,
  V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1,
  V2_ACTIVITY_STAGE_CANDIDATE_MAX_BYTES_V1,
  decideV2ActivityStageManifestCommitV1,
  materializeV2ActivityStageBlockedCommitReceiptV1,
  materializeV2ActivityStageCandidatePinV1,
  materializeV2ActivityStageCommittedManifestV1,
  materializeV2ActivityStageInnerReceiptPinV1,
  parseV2ActivityStageBlockedCommitReceiptV1,
  parseV2ActivityStageCandidatePinV1,
  parseV2ActivityStageCommittedManifestV1,
  parseV2ActivityStageInnerReceiptPinV1,
  v2ActivityStageCommitKeyV1,
} from "./v2_activity_stage_commit_contract_v1";
import { V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1 } from "./v2_firebase_repository_trust_root_v1";

const h = (value: string) => sha256Utf8(value);
const identity = {
  planFingerprint: h("plan"),
  stageId: "episode-01:activity-instances",
  candidateFingerprint: h("candidate"),
};

function chain() {
  const candidatePin = materializeV2ActivityStageCandidatePinV1({
    ...identity,
    candidateRawHash: h("candidate-raw"),
    objectGeneration: "101",
    byteSize: 1024,
  });
  const innerReceiptPin = materializeV2ActivityStageInnerReceiptPinV1({
    ...identity,
    innerReceiptFingerprint: h("inner-logical"),
    innerReceiptRawHash: h("inner-raw"),
    objectGeneration: "102",
    byteSize: 2048,
  });
  const receipt = materializeV2ActivityStageBlockedCommitReceiptV1({
    ...identity,
    courseContractFingerprint: h("course"),
    workspaceFingerprint: h("workspace"),
    subjectFingerprint: h("subject"),
    candidatePin,
    innerReceiptFingerprint: innerReceiptPin.innerReceiptFingerprint,
    innerReceiptPin,
    repositoryOriginReceiptFingerprint: h("origin"),
    repositoryObservationFingerprint: h("observation"),
    authenticatedStageBindingFingerprint: h("binding"),
  });
  const manifest = materializeV2ActivityStageCommittedManifestV1({
    receipt,
    outerReceiptRawHash: h("outer-raw"),
    objectGeneration: "103",
    byteSize: 4096,
    createdAtEpochMs: 1_800_000_000_000,
  });
  return { candidatePin, innerReceiptPin, receipt, manifest };
}

describe("D2 activity-stage durable blocked commit pure contract", () => {
  it("links an additive namespace to D1 and round-trips the complete blocked chain", () => {
    expect(
      V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_BODY_V1.parentRepositoryNamespaceFingerprint,
    ).toBe(V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1);
    expect(V2_ACTIVITY_STAGE_COMMIT_NAMESPACE_FINGERPRINT_V1).toHaveLength(64);
    const value = chain();
    expect(
      parseV2ActivityStageCandidatePinV1(canonicalJsonV1(value.candidatePin)),
    ).toEqual(value.candidatePin);
    expect(
      parseV2ActivityStageInnerReceiptPinV1(
        canonicalJsonV1(value.innerReceiptPin),
      ),
    ).toEqual(value.innerReceiptPin);
    expect(
      parseV2ActivityStageBlockedCommitReceiptV1(
        canonicalJsonV1(value.receipt),
      ),
    ).toEqual(value.receipt);
    expect(
      parseV2ActivityStageCommittedManifestV1(canonicalJsonV1(value.manifest)),
    ).toEqual(value.manifest);
    expect(value.receipt).toMatchObject({
      outcome: "blocked",
      candidateClassification: "structural_candidate_only",
      commitAuthority: "durable_blocked_receipt_pin_commit_only",
      repositoryOriginAuthority: "none",
      dependencyResolutionAuthority: "none",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseAuthority: false,
    });
  });

  it("derives the manifest key from plan, stage and candidate", () => {
    expect(chain().manifest.commitKey).toBe(
      v2ActivityStageCommitKeyV1(identity),
    );
    expect(
      v2ActivityStageCommitKeyV1({
        ...identity,
        candidateFingerprint: h("other"),
      }),
    ).not.toBe(chain().manifest.commitKey);
  });

  it("returns create, exact replay despite timestamp drift, and conflict on pin substitution", () => {
    const { receipt, manifest } = chain();
    expect(
      decideV2ActivityStageManifestCommitV1({
        currentRaw: null,
        proposed: manifest,
      }).kind,
    ).toBe("create");
    const later = materializeV2ActivityStageCommittedManifestV1({
      receipt,
      outerReceiptRawHash: manifest.outerReceiptRawHash,
      objectGeneration: manifest.outerReceiptObject.objectGeneration,
      byteSize: manifest.outerReceiptObject.byteSize,
      createdAtEpochMs: manifest.createdAtEpochMs + 1,
    });
    expect(
      decideV2ActivityStageManifestCommitV1({
        currentRaw: canonicalJsonV1(manifest),
        proposed: later,
      }).kind,
    ).toBe("exact_replay");
    const conflict = materializeV2ActivityStageCommittedManifestV1({
      receipt,
      outerReceiptRawHash: h("different-raw"),
      objectGeneration: "104",
      byteSize: 4096,
      createdAtEpochMs: manifest.createdAtEpochMs,
    });
    expect(
      decideV2ActivityStageManifestCommitV1({
        currentRaw: canonicalJsonV1(manifest),
        proposed: conflict,
      }).kind,
    ).toBe("conflict");
  });

  it("rejects traversal, raw-hash substitution, invalid generation and oversize", () => {
    expect(() =>
      materializeV2ActivityStageCandidatePinV1({
        ...identity,
        stageId: "../escape",
        candidateRawHash: h("raw"),
        objectGeneration: "1",
        byteSize: 1,
      }),
    ).toThrow();
    expect(() =>
      materializeV2ActivityStageCandidatePinV1({
        ...identity,
        candidateRawHash: h("raw"),
        objectGeneration: "0",
        byteSize: 1,
      }),
    ).toThrow();
    expect(() =>
      materializeV2ActivityStageCandidatePinV1({
        ...identity,
        candidateRawHash: h("raw"),
        objectGeneration: "1",
        byteSize: V2_ACTIVITY_STAGE_CANDIDATE_MAX_BYTES_V1 + 1,
      }),
    ).toThrow();
    const source = chain().candidatePin;
    const pin = {
      ...source,
      object: { ...source.object, contentHash: h("substituted") },
    };
    expect(() =>
      parseV2ActivityStageCandidatePinV1(canonicalJsonV1(pin)),
    ).toThrow();
  });

  it("rejects cross-bound candidate and inner receipt pins", () => {
    const value = chain();
    expect(() =>
      materializeV2ActivityStageBlockedCommitReceiptV1({
        ...identity,
        courseContractFingerprint: h("course"),
        workspaceFingerprint: h("workspace"),
        subjectFingerprint: h("subject"),
        candidatePin: value.candidatePin,
        innerReceiptFingerprint: value.innerReceiptPin.innerReceiptFingerprint,
        innerReceiptPin: { ...value.innerReceiptPin, stageId: "other-stage" },
        repositoryOriginReceiptFingerprint: h("origin"),
        repositoryObservationFingerprint: h("observation"),
        authenticatedStageBindingFingerprint: h("binding"),
      }),
    ).toThrow("v2_activity_stage_blocked_commit_cross_binding");
  });
});
