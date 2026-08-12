import { readFileSync } from "node:fs";
import ts from "typescript";
import { sha256Utf8 } from "../../../modules/learning-v2/policies/decision_registry";
import {
  encodeV2AuthenticatedRepositoryOriginReceiptStructuralClaimV1,
  v2AuthenticatedRepositoryBlobObjectPathV1,
  v2AuthenticatedRepositoryManifestObjectPathV1,
  v2AuthenticatedRepositoryObservationObjectPathV1,
} from "./v2_authenticated_repository_contract_v1";
import { V2_STAGE_VALIDATOR_REGISTRY_V2 } from "./v2_generation_workspace_contract_v2";
import * as adapterModule from "./v2_firebase_authenticated_repository_adapter_v1";

const sourcePath =
  require.resolve("./v2_firebase_authenticated_repository_adapter_v1");
const source = readFileSync(sourcePath, "utf8");

function authorityLiteralFields(
  requiredMarker: string,
): Readonly<Record<string, string | boolean>> {
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
          property.name.text === requiredMarker,
      )
    ) {
      authorityBody = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (authorityBody === null)
    throw new Error("v2_security_authority_literal_missing");
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

function auditOnlyStructuralClaim() {
  const hash = (label: string) => sha256Utf8(label);
  const planFingerprint = hash("security-plan");
  const requestFingerprint = hash("security-request");
  const manifestFingerprint = hash("security-manifest-logical");
  const manifestRawHash = hash("security-manifest-raw");
  const blobHash = hash("security-blob");
  const observationFingerprint = hash("security-observation-logical");
  const observationRawHash = hash("security-observation-raw");
  const pin = (objectPath: string, contentHash: string, byteSize: number) => ({
    objectPath,
    contentHash,
    objectGeneration: "123456789",
    byteSize,
  });
  return encodeV2AuthenticatedRepositoryOriginReceiptStructuralClaimV1({
    planFingerprint,
    courseContractFingerprint: hash("security-course"),
    repositoryScopeFingerprint: hash("security-scope"),
    resolverContractFingerprint: hash("security-resolver"),
    requestFingerprint,
    workspaceId: "security-workspace",
    authoringRevision: 1,
    targetLanguage: "en",
    requirementCount: 2,
    templateCount: 1,
    requirementAggregateFingerprint: hash("security-requirements"),
    headAggregateFingerprint: hash("security-heads"),
    bundleManifestFingerprint: manifestFingerprint,
    bundleManifestRawHash: manifestRawHash,
    bundleBlobHash: blobHash,
    bundleManifestByteSize: 128,
    bundleBlobByteSize: 256,
    bundleManifestPin: pin(
      v2AuthenticatedRepositoryManifestObjectPathV1(
        planFingerprint,
        requestFingerprint,
        manifestFingerprint,
      ),
      manifestRawHash,
      128,
    ),
    bundleBlobPin: pin(
      v2AuthenticatedRepositoryBlobObjectPathV1(
        planFingerprint,
        requestFingerprint,
        blobHash,
      ),
      blobHash,
      256,
    ),
    structuralObservationPin: pin(
      v2AuthenticatedRepositoryObservationObjectPathV1(
        planFingerprint,
        requestFingerprint,
        observationFingerprint,
      ),
      observationRawHash,
      192,
    ),
    structuralObservationFingerprint: observationFingerprint,
    structuralObservationRawHash: observationRawHash,
  }).claim;
}

describe("V2 Firebase authenticated repository security boundary", () => {
  it("exports only the zero-argument production factory and opaque readers", () => {
    expect(
      adapterModule.createFirebaseAdminV2AuthenticatedRepositoryAdapterV1
        .length,
    ).toBe(0);
    expect(Object.keys(adapterModule).sort()).toEqual(
      [
        "V2_FIREBASE_AUTHENTICATED_REPOSITORY_SESSION_SUMMARY_SCHEMA_V1",
        "V2_FIREBASE_AUTHENTICATED_ACTIVITY_STAGE_CAPABILITY_SUMMARY_SCHEMA_V1",
        "bindV2FirebaseAuthenticatedRepositorySessionToActivityStageV1",
        "createFirebaseAdminV2AuthenticatedRepositoryAdapterV1",
        "getV2FirebaseAuthenticatedActivityStageCapabilitySummaryV1",
        "getV2FirebaseAuthenticatedRepositorySessionSummaryV1",
        "isV2FirebaseAuthenticatedActivityStageCapabilityHandleV1",
        "isV2FirebaseAuthenticatedRepositorySessionHandleV1",
        "resolveV2FirebaseAuthenticatedActivityStageStructuralBindingV1",
        "resolveV2FirebaseAuthenticatedActivityStageValidatorCapabilitySnapshotV1",
      ].sort(),
    );
    expect(source).not.toMatch(
      /export\s+(?:async\s+)?(?:function|const)\s+\w*(?:inject|fake|mock|test|unsafe|unbranded)\w*/iu,
    );
  });

  it("rejects a cloned handle and a valid public audit-only structural claim", () => {
    const clone = Object.freeze({
      kind: "v2_firebase_authenticated_repository_session_handle",
    });
    const claim = auditOnlyStructuralClaim();
    expect(
      adapterModule.isV2FirebaseAuthenticatedRepositorySessionHandleV1(clone),
    ).toBe(false);
    expect(
      adapterModule.isV2FirebaseAuthenticatedRepositorySessionHandleV1(claim),
    ).toBe(false);
    expect(() =>
      adapterModule.getV2FirebaseAuthenticatedRepositorySessionSummaryV1(
        claim as never,
      ),
    ).toThrow("v2_firebase_authenticated_repository_session_handle_invalid");

    const capabilityClone = Object.freeze({
      kind: "v2_firebase_authenticated_activity_stage_capability_handle",
    });
    expect(
      adapterModule.isV2FirebaseAuthenticatedActivityStageCapabilityHandleV1(
        capabilityClone,
      ),
    ).toBe(false);
    expect(() =>
      adapterModule.getV2FirebaseAuthenticatedActivityStageCapabilitySummaryV1(
        capabilityClone as never,
      ),
    ).toThrow(
      "v2_firebase_authenticated_activity_stage_capability_handle_invalid",
    );
    expect(() =>
      adapterModule.resolveV2FirebaseAuthenticatedActivityStageStructuralBindingV1(
        {
          capability: capabilityClone as never,
          plan: {} as never,
          stageId: "activity:security",
        },
      ),
    ).toThrow(
      "v2_firebase_authenticated_activity_stage_capability_handle_invalid",
    );
    expect(() =>
      adapterModule.resolveV2FirebaseAuthenticatedActivityStageValidatorCapabilitySnapshotV1(
        {
          capability: capabilityClone as never,
          plan: {} as never,
          stageId: "activity:security",
        },
      ),
    ).toThrow(
      "v2_firebase_authenticated_activity_stage_capability_handle_invalid",
    );
    expect(() =>
      adapterModule.bindV2FirebaseAuthenticatedRepositorySessionToActivityStageV1(
        {
          session: clone as never,
          plan: {} as never,
          stageId: "activity:security",
        },
      ),
    ).toThrow(
      "v2_firebase_authenticated_activity_stage_capability_input_invalid",
    );
  });

  it("pins snapshot-only repository authority and denies every broader authority", () => {
    expect(authorityLiteralFields("namespaceAuthority")).toMatchObject({
      connectionAuthentication: "firebase_admin_default_app_exact_trust_root",
      repositoryOriginAuthenticity: "server_admin_sdk_authenticated_readback",
      repositoryOriginAuthority: "authenticated_repository_snapshot_only",
      namespaceAuthority: "code_owned_exact_production_namespace",
      storageExistenceAuthority: "exact_generation_readback",
      publishedStateAuthority: "authenticated_repository_snapshot_only",
      principalIdentityAuthority: "none",
      humanReviewAuthority: "none",
      contentValidationAuthority: "none",
      publicationDecisionAuthority: "none",
      runtimeKernelAuthority: "none",
      executionAuthority: "none",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseAuthority: false,
    });
    expect(authorityLiteralFields("capabilityBindingAuthority")).toMatchObject({
      connectionAuthentication: "firebase_admin_default_app_exact_trust_root",
      repositoryOriginAuthenticity: "server_admin_sdk_authenticated_readback",
      repositoryOriginAuthority: "authenticated_repository_snapshot_only",
      capabilityBindingAuthority: "structural_exact_match_only",
      principalIdentityAuthority: "none",
      contentValidationAuthority: "none",
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

  it("keeps only Activity Instances installed in the V2 registry", () => {
    const entries = Object.values(V2_STAGE_VALIDATOR_REGISTRY_V2);
    expect(entries).toHaveLength(13);
    expect(entries.filter((entry) => entry.state === "installed")).toEqual([
      V2_STAGE_VALIDATOR_REGISTRY_V2.v2_activity_instances,
    ]);
  });

  it("contains no logging, callable, worker, index, or client wiring", () => {
    expect(source).not.toMatch(
      /\bconsole\b|\blogger\b|\.log\s*\(|onCall|onRequest|firebase-functions/,
    );
    expect(source).not.toMatch(
      /(?:from|import\s*)\s*\(?["'][^"']*(?:index|callable|worker|scripts|tools|app|components|hooks|contexts)[^"']*["']/,
    );
  });
});
