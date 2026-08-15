import { readFileSync } from "node:fs";
import { V2_STAGE_VALIDATOR_REGISTRY_V2 } from "./v2_generation_workspace_contract_v2";
import * as adapter from "./v2_firebase_activity_instances_validator_adapter_v1";

const sourcePath =
  require.resolve("./v2_firebase_activity_instances_validator_adapter_v1");
const source = readFileSync(sourcePath, "utf8");

describe("V2 Firebase activity-instances validator adapter security boundary", () => {
  it("exports exactly one zero-argument production factory and opaque readers", () => {
    expect(
      adapter.createFirebaseAdminV2ActivityInstancesValidatorAdapterV1.length,
    ).toBe(0);
    expect(Object.keys(adapter).sort()).toEqual(
      [
        "V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_CHILD_NAMESPACE_FINGERPRINT_V1",
        "V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_CHILD_READ_CONCURRENCY_V1",
        "V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_SUMMARY_SCHEMA_V1",
        "createFirebaseAdminV2ActivityInstancesValidatorAdapterV1",
        "getV2FirebaseActivityInstancesValidatorSummaryV1",
        "isV2FirebaseActivityInstancesValidatorResultHandleV1",
        "resolveV2FirebaseActivityInstancesPublicationSessionMaterialV1",
        "resolveV2FirebaseActivityInstancesServerEvaluatorSessionMaterialV1",
        "resolveV2FirebaseActivityInstancesValidatorResultMaterialV1",
      ].sort(),
    );
    expect(source).not.toMatch(
      /export\s+(?:async\s+)?(?:function|const)\s+\w*(?:inject|fake|mock|test|unsafe|unbranded)\w*/iu,
    );
  });

  it("rejects a cloned result handle and a raw pure-result shaped value", () => {
    const clone = Object.freeze({
      kind: "v2_firebase_activity_instances_validator_result_handle",
    });
    const rawPureResult = Object.freeze({
      schemaVersion: "v2-activity-instances-validation-result.v1",
      outcome: "eligible_for_human_review_only",
      repositoryOriginAuthority: "none",
      artifactStorageAuthority: "none",
      releaseAuthority: false,
    });
    for (const value of [clone, rawPureResult]) {
      expect(
        adapter.isV2FirebaseActivityInstancesValidatorResultHandleV1(value),
      ).toBe(false);
      expect(() =>
        adapter.getV2FirebaseActivityInstancesValidatorSummaryV1(
          value as never,
        ),
      ).toThrow(
        "v2_firebase_activity_instances_validator_result_handle_invalid",
      );
    }
  });

  it("keeps malformed roots blocked with no child storage authority", () => {
    expect(source).toContain("permitAggregate === null");
    expect(source).toContain("childReadback === null");
    expect(source).toContain('? ("none" as const)');
    expect(source).toContain("sessionBytes: childReadback?.sessions ??");
    expect(source).toContain(
      "childObjectCount: childReadback?.objectCount ?? null",
    );
    expect(source).toContain(
      "childReadbackAggregateFingerprint:\n          childReadback?.readbackAggregateFingerprint ?? null",
    );
  });

  it("separates learner publication bytes from the server-only evaluator resolver", () => {
    expect(source).toContain("publicationMaterials.get(input.handle)");
    expect(source).toContain(
      'material.summary.outcome !== "eligible_for_human_review_only"',
    );
    expect(source).toContain("material.summary.validatedSessionCount !== 12");
    expect(source).toContain("material.summary.validatedTaskCount !== 144");
    expect(source).toMatch(
      /createHash\("sha256"\)\.update\(bytes\)\.digest\("hex"\)\s*!==\s*permit\.contentHash/,
    );
    expect(source).toContain("renderRaw: session.renderRaw");
    expect(source).toContain("capsuleEnvelopeRaw: session.capsuleEnvelopeRaw");
    expect(source).not.toContain("sourceRaw: session.sourceRaw");
    expect(source).toContain("sidecarRaw: session.sidecarRaw");
    expect(source).toContain(
      'evaluatorKeyDelivery: "server_only_never_learner_projection" as const',
    );
    expect(source).toContain(
      'evaluationAuthority: "candidate_only_server_policy_required" as const',
    );
  });

  it("can report eligibility only after the shared exact 48-object readback", () => {
    expect(source).toContain("await readbackV2ActivityInstancesChildrenV1({");
    expect(source).toContain("childReadback.objectCount !== 48");
    expect(source).toContain("childReadback.sessionCount !== 12");
    expect(source).toContain(
      '"firebase_admin_generation_pinned_readback" as const',
    );
    expect(source).toContain(
      '"authenticated_repository_snapshot_only" as const',
    );
    expect(source).toContain(
      '"authenticated_repository_stage_subset_only" as const',
    );
    expect(source).toContain(
      '"deterministic_activity_instances_structural_semantic_checks_only" as const',
    );
    for (const authority of [
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
    expect(source).toContain("runtimeConsumer: false as const");
    expect(source).toContain("releaseEligible: false as const");
    expect(source).toContain("releaseAuthority: false as const");
  });

  it("keeps only Activity Instances installed and has no live, dynamic or logging consumer", () => {
    const entries = Object.values(V2_STAGE_VALIDATOR_REGISTRY_V2);
    expect(entries).toHaveLength(13);
    expect(entries.filter((entry) => entry.state === "installed")).toEqual([
      V2_STAGE_VALIDATOR_REGISTRY_V2.v2_activity_instances,
    ]);
    expect(source).not.toMatch(
      /\bconsole\b|\blogger\b|\.log\s*\(|firebase-functions|onCall|onRequest/,
    );
    expect(source).not.toMatch(
      /(?:from|import\s*)\s*\(?["'][^"']*(?:index|callable|worker|scripts|tools|app|components|hooks|contexts)[^"']*["']/,
    );
    expect(source).not.toMatch(/\bimport\s*\(|\brequire\s*\(/);
  });
});
