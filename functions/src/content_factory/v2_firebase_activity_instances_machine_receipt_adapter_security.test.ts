import { readFileSync } from "node:fs";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  materializeV2ActivityInstancesMachineReceiptV1,
  v2ActivityInstancesMachineCommitKeyV1,
} from "./v2_activity_instances_machine_receipt_v1";
import { V2_STAGE_VALIDATOR_REGISTRY_V2 } from "./v2_generation_workspace_contract_v2";
import * as adapter from "./v2_firebase_activity_instances_machine_receipt_adapter_v1";

const sourcePath =
  require.resolve("./v2_firebase_activity_instances_machine_receipt_adapter_v1");
const source = readFileSync(sourcePath, "utf8");
const pureSource = readFileSync(
  require.resolve("./v2_activity_instances_machine_receipt_v1"),
  "utf8",
);
const h = (value: string) => hashCanonicalBody(value);

function blockedReceipt() {
  return materializeV2ActivityInstancesMachineReceiptV1({
    planFingerprint: h("plan"),
    courseContractFingerprint: h("course"),
    workspaceFingerprint: h("workspace"),
    stageId: "episode-1:activity-instances",
    episodeId: "episode-1",
    candidateFingerprint: h("candidate"),
    bodySchemaVersion: "v2-activity-instances-package-root.v2",
    bodyFingerprint: h("body"),
    packageFingerprint: null,
    capabilitySnapshotFingerprint: null,
    repositoryOriginReceiptFingerprint: h("origin"),
    repositoryObservationFingerprint: h("observation"),
    d2OuterReceiptFingerprint: h("outer"),
    d2CommittedManifestFingerprint: h("d2-manifest"),
    d2CommittedOperationFingerprint: h("d2-operation"),
    permitAggregateFingerprint: null,
    readbackAggregateFingerprint: null,
    storageReadbackFingerprint: null,
    sessionCount: null,
    childObjectCount: null,
    totalReadbackBytes: null,
    pureValidationResultFingerprint: h("pure-result"),
    validatorRulesFingerprint: h("rules"),
    registryFingerprint: h("registry"),
    checkedRuleCodes: ["canonical_root"],
    issueCodes: ["root_manifest_invalid"],
    outcome: "blocked",
  });
}

describe("V2 Firebase activity-instances machine receipt security boundary", () => {
  it("exports only a zero-argument production factory and opaque handle readers", () => {
    expect(
      adapter.createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1
        .length,
    ).toBe(0);
    expect(Object.keys(adapter).sort()).toEqual(
      [
        "V2_FIREBASE_ACTIVITY_INSTANCES_MACHINE_RECEIPT_SUMMARY_SCHEMA_V1",
        "createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1",
        "getV2FirebaseActivityInstancesMachineReceiptSummaryV1",
        "isV2FirebaseActivityInstancesMachineReceiptHandleV1",
      ].sort(),
    );
    expect(source).not.toMatch(
      /export\s+(?:async\s+)?(?:function|const)\s+\w*(?:inject|fake|mock|test|unsafe|unbranded)\w*/iu,
    );
  });

  it("keeps the public receipt authority-free and rejects it or a clone as a private handle", () => {
    const receipt = blockedReceipt();
    for (const [key, value] of Object.entries(receipt)) {
      if (key.endsWith("Authority") && key !== "releaseAuthority")
        expect(value).toBe("none");
    }
    expect(receipt).toMatchObject({
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    const clone = Object.freeze({
      kind: "v2_firebase_activity_instances_machine_receipt_handle",
    });
    for (const value of [receipt, clone]) {
      expect(
        adapter.isV2FirebaseActivityInstancesMachineReceiptHandleV1(value),
      ).toBe(false);
      expect(() =>
        adapter.getV2FirebaseActivityInstancesMachineReceiptSummaryV1(
          value as never,
        ),
      ).toThrow(
        "v2_firebase_activity_instances_machine_receipt_handle_invalid",
      );
    }
  });

  it("binds both validator rules and registry fingerprints into the commit identity", () => {
    const base = {
      planFingerprint: h("plan"),
      stageId: "episode-1:activity-instances",
      candidateFingerprint: h("candidate"),
      validatorRulesFingerprint: h("rules"),
      registryFingerprint: h("registry"),
    };
    const key = v2ActivityInstancesMachineCommitKeyV1(base);
    expect(
      v2ActivityInstancesMachineCommitKeyV1({
        ...base,
        validatorRulesFingerprint: h("other-rules"),
      }),
    ).not.toBe(key);
    expect(
      v2ActivityInstancesMachineCommitKeyV1({
        ...base,
        registryFingerprint: h("other-registry"),
      }),
    ).not.toBe(key);
  });

  it("limits authority to the private summary and distinguishes blocked storage", () => {
    expect(source).toContain(
      'repositoryOriginAuthority:\n          "authenticated_repository_snapshot_only" as const',
    );
    expect(source).toContain(
      'dependencyResolutionAuthority:\n          "authenticated_repository_stage_subset_only" as const',
    );
    expect(source).toContain(
      'durableCommitAuthority:\n          "firebase_admin_transaction_exact_readback" as const',
    );
    expect(source).toContain(
      'machineValidationAuthority:\n          "deterministic_activity_instances_structural_semantic_checks_only" as const',
    );
    expect(source).toContain("coldReceipt.storageReadbackFingerprint === null");
    expect(source).toContain('? ("none" as const)');
    for (const authority of [
      "storedReceiptAuthority",
      "candidateOriginAuthority",
      "humanReviewAuthority",
      "specialistEvidenceAuthority",
      "deviceEvidenceAuthority",
      "listeningEvidenceAuthority",
      "walletAuthority",
      "masteryAuthority",
      "evidenceAuthority",
      "completionAuthority",
      "runtimeKernelAuthority",
      "executionAuthority",
      "publicationAuthority",
    ]) {
      expect(source).toContain(`${authority}: "none" as const`);
    }
    expect(pureSource).toContain("const AUTHORITY_FIELDS = Object.freeze({");
  });

  it("keeps only Activity Instances installed and has no live, dynamic or logging consumer", () => {
    const entries = Object.values(V2_STAGE_VALIDATOR_REGISTRY_V2);
    expect(entries).toHaveLength(13);
    expect(entries.filter((entry) => entry.state === "installed")).toEqual([
      V2_STAGE_VALIDATOR_REGISTRY_V2.v2_activity_instances,
    ]);
    for (const text of [source, pureSource]) {
      expect(text).not.toMatch(
        /\bconsole\b|\blogger\b|\.log\s*\(|firebase-functions|onCall|onRequest/,
      );
      expect(text).not.toMatch(
        /(?:from|import\s*)\s*\(?["'][^"']*(?:index|callable|worker|scripts|tools|app|components|hooks|contexts)[^"']*["']/,
      );
      expect(text).not.toMatch(/\bimport\s*\(|\brequire\s*\(/);
    }
  });
});
