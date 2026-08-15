import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  V2_ACTIVITY_INSTANCES_VALIDATOR_CAPABILITY_PROFILE_V1,
  V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_FINGERPRINT_V1,
  V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_FINGERPRINT_V1,
} from "./v2_activity_instances_validator_capability_v1";
import {
  isV2ActivityInstancesValidationResultV1,
  V2_ACTIVITY_INSTANCES_VALIDATION_RESULT_SCHEMA_V1,
} from "./v2_activity_instances_validator_v1";
import { V2_ACTIVITY_INSTANCES_CHILD_READBACK_SCHEMA_V1 } from "./v2_activity_instances_child_readback_v1";
import { V2_STAGE_VALIDATOR_REGISTRY_V2 } from "./v2_generation_workspace_contract_v2";

const sourcePaths = {
  capability:
    require.resolve("./v2_activity_instances_validator_capability_v1"),
  validator: require.resolve("./v2_activity_instances_validator_v1"),
  readback: require.resolve("./v2_activity_instances_child_readback_v1"),
};
const sources = Object.fromEntries(
  Object.entries(sourcePaths).map(([key, value]) => [
    key,
    readFileSync(value, "utf8"),
  ]),
) as Readonly<Record<keyof typeof sourcePaths, string>>;

function literalFields(
  sourcePath: string,
  source: string,
  marker: string,
): Readonly<Record<string, string | boolean>> {
  const file = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let body: ts.ObjectLiteralExpression | null = null;
  const visit = (node: ts.Node): void => {
    if (
      ts.isObjectLiteralExpression(node) &&
      node.properties.some(
        (property) =>
          ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.name) &&
          property.name.text === marker,
      )
    ) {
      body = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (body === null) throw new Error(`foundation_literal_missing:${marker}`);
  const fields: Record<string, string | boolean> = {};
  for (const property of (body as ts.ObjectLiteralExpression).properties) {
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

describe("V2 activity-instances validator foundation security boundary", () => {
  it("keeps the pure capability profile structural and unauthenticated", () => {
    expect(V2_ACTIVITY_INSTANCES_VALIDATOR_CAPABILITY_PROFILE_V1).toEqual({
      schemaVersion: "v2-activity-instances-validator-capability-profile.v1",
      projectorRulesFingerprint:
        V2_ACTIVITY_INSTANCES_VALIDATOR_PROJECTOR_RULES_FINGERPRINT_V1,
      supportManifestFingerprint:
        V2_ACTIVITY_INSTANCES_VALIDATOR_SUPPORT_MANIFEST_FINGERPRINT_V1,
      repositoryResolutionAuthority: "unverified_external_refs",
      runtimeKernelAuthority: "none",
      publicationAuthority: "none",
      releaseAuthority: false,
    });
  });

  it("keeps pure validation results below every repository, storage and release authority", () => {
    expect(
      literalFields(
        sourcePaths.validator,
        sources.validator,
        "machineValidationAuthority",
      ),
    ).toMatchObject({
      machineValidationAuthority:
        "deterministic_activity_instances_structural_semantic_checks_only",
      sourceEvidenceAuthority: "unverified_canonical_bytes",
      repositoryOriginAuthority: "none",
      dependencyResolutionAuthority: "none",
      artifactStorageAuthority: "none",
      humanReviewAuthority: "none",
      humanApprovalAuthority: "none",
      specialistEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      listeningEvidenceAuthority: "none",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      completionAuthority: "none",
      runtimeKernelAuthority: "none",
      executionAuthority: "none",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(
      isV2ActivityInstancesValidationResultV1(
        Object.freeze({
          schemaVersion: V2_ACTIVITY_INSTANCES_VALIDATION_RESULT_SCHEMA_V1,
          outcome: "eligible_for_human_review_only",
        }),
      ),
    ).toBe(false);
  });

  it("keeps injected child readback structural with no authenticated evidence claim", () => {
    expect(V2_ACTIVITY_INSTANCES_CHILD_READBACK_SCHEMA_V1).toBe(
      "v2-activity-instances-child-readback.v1",
    );
    expect(
      literalFields(
        sourcePaths.readback,
        sources.readback,
        "repositoryAuthority",
      ),
    ).toMatchObject({
      repositoryAuthority: "none",
      storageAuthority: "none",
      evidenceAuthority: "none",
    });
  });

  it("installs only Activity Instances and has no live or dynamic consumer", () => {
    const entries = Object.values(V2_STAGE_VALIDATOR_REGISTRY_V2);
    expect(entries).toHaveLength(13);
    expect(entries.filter((entry) => entry.state === "installed")).toEqual([
      V2_STAGE_VALIDATOR_REGISTRY_V2.v2_activity_instances,
    ]);
    for (const source of Object.values(sources)) {
      expect(source).not.toMatch(
        /\bconsole\b|\blogger\b|\.log\s*\(|firebase-admin|firebase-functions|onCall|onRequest/,
      );
      expect(source).not.toMatch(
        /(?:from|import\s*)\s*\(?["'][^"']*(?:index|callable|worker|scripts|tools|app|components|hooks|contexts)[^"']*["']/,
      );
      expect(source).not.toMatch(/\bimport\s*\(|\brequire\s*\(/);
    }
  });
});
