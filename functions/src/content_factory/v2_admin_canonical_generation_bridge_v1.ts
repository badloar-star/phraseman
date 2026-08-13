import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  buildV2CanonicalSeasonPlanV2,
  isV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
  type V2CanonicalPlanInputV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import type { V2AdminGenerationRequest } from "./v2_admin_generation_contract";

export const V2_ADMIN_CANONICAL_GENERATION_BRIDGE_SCHEMA_V1 =
  "v2-admin-canonical-generation-bridge.v1" as const;

export interface V2AdminCanonicalGenerationBridgeInputV1 {
  readonly schemaVersion: typeof V2_ADMIN_CANONICAL_GENERATION_BRIDGE_SCHEMA_V1;
  readonly workspaceId: string;
  readonly authoringRevision: number;
  readonly speechProfileRef: V2CanonicalPlanInputV2["speechProfileRef"];
  readonly voiceGenerationProfileRef: V2CanonicalPlanInputV2["voiceGenerationProfileRef"];
  readonly decisionRegistryRef: V2CanonicalPlanInputV2["decisionRegistryRef"];
}

export interface V2AdminCanonicalGenerationBridgeResultV1 {
  readonly planRequestRaw: string;
  readonly plan: V2CanonicalSeasonPlanV2;
}

const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/u;

function fail(code: string): never {
  throw new Error(`v2_admin_canonical_generation_bridge_${code}`);
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function bridgeV2AdminGenerationRequestToCanonicalPlanResultV2(input: {
  readonly request: V2AdminGenerationRequest;
  readonly bridge: V2AdminCanonicalGenerationBridgeInputV1;
}): V2AdminCanonicalGenerationBridgeResultV1 {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !== "bridge|request" ||
    !record(input.request) ||
    input.request.schemaVersion !== "v2-admin-generation-request.v1" ||
    !record(input.bridge) ||
    Object.keys(input.bridge).sort().join("|") !==
      "authoringRevision|decisionRegistryRef|schemaVersion|speechProfileRef|voiceGenerationProfileRef|workspaceId" ||
    input.bridge.schemaVersion !==
      V2_ADMIN_CANONICAL_GENERATION_BRIDGE_SCHEMA_V1 ||
    !TOKEN_RE.test(input.bridge.workspaceId) ||
    !Number.isSafeInteger(input.bridge.authoringRevision) ||
    input.bridge.authoringRevision < 1
  )
    fail("input_invalid");
  const requestRaw = canonicalJsonV1({
    schemaVersion: "v2-canonical-plan-request.v2",
    workspaceId: input.bridge.workspaceId,
    jobId: input.request.idempotencyKey,
    authoringRevision: input.bridge.authoringRevision,
    seasonId: input.request.seasonId,
    scope: input.request.scope,
    episodeIds: input.request.episodeIds,
    ...(input.request.recipes
      ? {
          recipes: input.request.recipes.map((recipe) => ({
            episodeId: recipe.episodeId,
            ...(recipe.dialogue === undefined
              ? {}
              : { dialogue: recipe.dialogue }),
            speakingMission: false,
          })),
        }
      : {}),
    languageProfileRef: {
      ...input.request.languageProfileRef,
      targetLanguage: input.request.studyTarget,
    },
    speechProfileRef: input.bridge.speechProfileRef,
    voiceGenerationProfileRef: input.bridge.voiceGenerationProfileRef,
    decisionRegistryRef: input.bridge.decisionRegistryRef,
    templateBindings: input.request.templateBindings,
  });
  const trusted = parseV2CanonicalPlanRequestV2(requestRaw);
  const plan = buildV2CanonicalSeasonPlanV2(trusted);
  if (
    !isV2CanonicalSeasonPlanV2(plan) ||
    plan.jobId !== input.request.idempotencyKey ||
    plan.episodeIds.length !== input.request.episodeIds.length ||
    plan.targetLanguage !== input.request.studyTarget ||
    plan.executionAuthority !== "none" ||
    plan.releaseAuthority !== false
  )
    fail("plan_invalid");
  return Object.freeze({ planRequestRaw: requestRaw, plan });
}

export function bridgeV2AdminGenerationRequestToCanonicalPlanV2(input: {
  readonly request: V2AdminGenerationRequest;
  readonly bridge: V2AdminCanonicalGenerationBridgeInputV1;
}): V2CanonicalSeasonPlanV2 {
  return bridgeV2AdminGenerationRequestToCanonicalPlanResultV2(input).plan;
}

export function v2AdminCanonicalBridgeFingerprintV1(input: {
  readonly requestFingerprint: string;
  readonly planFingerprint: string;
  readonly bridge: V2AdminCanonicalGenerationBridgeInputV1;
}): string {
  if (
    typeof input.requestFingerprint !== "string" ||
    typeof input.planFingerprint !== "string"
  )
    fail("fingerprint_invalid");
  return hashCanonicalBody({
    schemaVersion: V2_ADMIN_CANONICAL_GENERATION_BRIDGE_SCHEMA_V1,
    requestFingerprint: input.requestFingerprint,
    planFingerprint: input.planFingerprint,
    bridge: input.bridge,
  });
}
