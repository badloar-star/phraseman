import { readFileSync } from "node:fs";
import ts from "typescript";
import { sha256Utf8 } from "../../../modules/learning-v2/policies/decision_registry";
import {
  materializeV2ActivityStageBlockedCommitReceiptV1,
  materializeV2ActivityStageCandidatePinV1,
  materializeV2ActivityStageInnerReceiptPinV1,
} from "./v2_activity_stage_commit_contract_v1";
import * as commitAdapter from "./v2_firebase_activity_stage_commit_adapter_v1";
import { V2_STAGE_VALIDATOR_REGISTRY_V2 } from "./v2_generation_workspace_contract_v2";

const sourcePath =
  require.resolve("./v2_firebase_activity_stage_commit_adapter_v1");
const source = readFileSync(sourcePath, "utf8");
const hash = (label: string) => sha256Utf8(`d2-c-security:${label}`);

function authorityLiteralFields(): Readonly<Record<string, string | boolean>> {
  const file = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let authorityBody: ts.ObjectLiteralExpression | null = null;
  const visit = (node: ts.Node): void => {
    if (
      ts.isObjectLiteralExpression(node) &&
      node.properties.some(
        (property) =>
          ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.name) &&
          property.name.text === "durableCommitAuthority",
      )
    ) {
      authorityBody = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (authorityBody === null)
    throw new Error("v2_activity_stage_commit_authority_literal_missing");
  const fields: Record<string, string | boolean> = {};
  for (const property of (authorityBody as ts.ObjectLiteralExpression)
    .properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name))
      continue;
    let value = property.initializer;
    if (ts.isAsExpression(value)) value = value.expression;
    if (ts.isStringLiteral(value)) fields[property.name.text] = value.text;
    if (value.kind === ts.SyntaxKind.FalseKeyword)
      fields[property.name.text] = false;
  }
  return Object.freeze(fields);
}

function publicBlockedReceipt() {
  const planFingerprint = hash("plan");
  const stageId = "activity:season-01:episode-01";
  const candidateFingerprint = hash("candidate");
  const candidatePin = materializeV2ActivityStageCandidatePinV1({
    planFingerprint,
    stageId,
    candidateFingerprint,
    candidateRawHash: hash("candidate-raw"),
    objectGeneration: "2001",
    byteSize: 1024,
  });
  const innerReceiptFingerprint = hash("inner");
  const innerReceiptPin = materializeV2ActivityStageInnerReceiptPinV1({
    planFingerprint,
    stageId,
    candidateFingerprint,
    innerReceiptFingerprint,
    innerReceiptRawHash: hash("inner-raw"),
    objectGeneration: "2002",
    byteSize: 1024,
  });
  return materializeV2ActivityStageBlockedCommitReceiptV1({
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
}

describe("V2 Firebase activity-stage commit adapter security boundary", () => {
  it("exports exactly one zero-argument factory and opaque handle readers", () => {
    expect(
      commitAdapter.createFirebaseAdminV2ActivityStageCommitAdapterV1.length,
    ).toBe(0);
    expect(Object.keys(commitAdapter).sort()).toEqual(
      [
        "V2_FIREBASE_ACTIVITY_INSTANCES_VALIDATOR_INPUT_SUMMARY_SCHEMA_V1",
        "V2_FIREBASE_ACTIVITY_STAGE_COMMIT_SUMMARY_SCHEMA_V1",
        "bindV2FirebaseActivityStageCommitToActivityInstancesValidatorV1",
        "createFirebaseAdminV2ActivityStageCommitAdapterV1",
        "getV2FirebaseActivityInstancesValidatorInputSummaryV1",
        "getV2FirebaseActivityStageCommitSummaryV1",
        "isV2FirebaseActivityInstancesValidatorInputHandleV1",
        "isV2FirebaseActivityStageCommitHandleV1",
        "resolveV2FirebaseActivityInstancesValidatorInputMaterialV1",
      ].sort(),
    );
    expect(source).not.toMatch(
      /export\s+(?:async\s+)?(?:function|const)\s+\w*(?:inject|fake|mock|test|unsafe|unbranded)\w*/iu,
    );
  });

  it("rejects cloned handles and every raw public B receipt", () => {
    const clone = Object.freeze({
      kind: "v2_firebase_activity_stage_commit_handle",
    });
    const rawReceipt = publicBlockedReceipt();
    expect(commitAdapter.isV2FirebaseActivityStageCommitHandleV1(clone)).toBe(
      false,
    );
    expect(
      commitAdapter.isV2FirebaseActivityStageCommitHandleV1(rawReceipt),
    ).toBe(false);
    expect(() =>
      commitAdapter.getV2FirebaseActivityStageCommitSummaryV1(clone as never),
    ).toThrow("v2_firebase_activity_stage_commit_handle_invalid");
    expect(() =>
      commitAdapter.getV2FirebaseActivityStageCommitSummaryV1(
        rawReceipt as never,
      ),
    ).toThrow("v2_firebase_activity_stage_commit_handle_invalid");
    expect(() =>
      commitAdapter.bindV2FirebaseActivityStageCommitToActivityInstancesValidatorV1(
        {
          commitHandle: clone as never,
          plan: {} as never,
          stageId: "activity:security",
        },
      ),
    ).toThrow("v2_firebase_activity_instances_validator_input_binding_invalid");
    const validatorInputClone = Object.freeze({
      kind: "v2_firebase_activity_instances_validator_input_handle",
    });
    expect(
      commitAdapter.isV2FirebaseActivityInstancesValidatorInputHandleV1(
        validatorInputClone,
      ),
    ).toBe(false);
    expect(() =>
      commitAdapter.getV2FirebaseActivityInstancesValidatorInputSummaryV1(
        validatorInputClone as never,
      ),
    ).toThrow("v2_firebase_activity_instances_validator_input_handle_invalid");
    expect(() =>
      commitAdapter.resolveV2FirebaseActivityInstancesValidatorInputMaterialV1({
        inputHandle: validatorInputClone as never,
        plan: {} as never,
        stageId: "activity:security",
      }),
    ).toThrow("v2_firebase_activity_instances_validator_input_resolve_invalid");
    expect(rawReceipt).toMatchObject({
      outcome: "blocked",
      repositoryOriginAuthority: "none",
      dependencyResolutionAuthority: "none",
      candidateOriginAuthority: "none",
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
  });

  it("limits authenticated authority to the private committed handle summary", () => {
    expect(authorityLiteralFields()).toMatchObject({
      outcome: "blocked",
      repositoryOriginAuthority: "authenticated_repository_snapshot_only",
      dependencyResolutionAuthority:
        "authenticated_repository_stage_subset_only",
      artifactStorageAuthority: "firebase_admin_generation_pinned_readback",
      durableCommitAuthority: "firebase_admin_transaction_exact_readback",
      candidateOriginAuthority: "none",
      machineValidationAuthority: "none",
      humanReviewAuthority: "none",
      executionAuthority: "none",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseAuthority: false,
    });
    expect(source).toContain("const commitHandles = new WeakSet<object>()");
    expect(source).toContain("const commitMetadata = new WeakMap<");
    expect(source).toContain(
      "const validatorInputHandles = new WeakSet<object>()",
    );
    expect(source).toContain("const validatorInputMetadata = new WeakMap<");
  });

  it("keeps only Activity Instances installed and contains no live, dynamic, or logging consumer", () => {
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
