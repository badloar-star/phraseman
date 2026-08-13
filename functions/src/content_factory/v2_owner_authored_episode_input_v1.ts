import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_CANONICAL_INTERFACE_LOCALES } from "./v2_canonical_generation_plan";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  assembleV2ActivityEpisodeProjectionV1,
  parseV2ActivitySessionProjectionSource,
  type V2ActivityEpisodeProjectionAssemblyV1,
  type V2ActivitySessionProjectionSource,
} from "./v2_activity_session_projection";

export const V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V1 =
  "v2-owner-authored-episode-input.v1" as const;
export const V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V1 = 7 * 1024 * 1024;

type ContentClass = "production_candidate" | "neutral_test_fixture";

interface RawOwnerEpisodeInputBodyV1 {
  readonly schemaVersion: typeof V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V1;
  readonly contentClass: ContentClass;
  readonly ownerInputId: string;
  readonly claimedAuthorId: string;
  readonly authoringRevision: number;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly targetLanguage: string;
  readonly requiredInterfaceLocales: readonly string[];
  readonly sessionSourceRaws: readonly string[];
  readonly ownerInputOrigin: "owner_authored_import" | "neutral_test_fixture";
  readonly ownerInputBytesOrigin: "caller_supplied_canonical_bytes";
  readonly authorIdentityAuthority: "unverified_input_claim";
  readonly repositoryAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly generatorMutationPolicy: "owner_content_immutable";
  readonly executionAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

interface RawOwnerEpisodeInputV1 extends RawOwnerEpisodeInputBodyV1 {
  readonly inputFingerprint: string;
}

export interface V2OwnerAuthoredEpisodeDraftInputV1 {
  readonly contentClass: ContentClass;
  readonly ownerInputId: string;
  readonly claimedAuthorId: string;
  readonly stageId: string;
  readonly sessionSources: readonly unknown[];
}

export interface V2OwnerAuthoredEpisodeInputSummaryV1 {
  readonly schemaVersion: "v2-owner-authored-episode-input-summary.v1";
  readonly contentClass: ContentClass;
  readonly ownerInputId: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly targetLanguage: string;
  readonly authoringRevision: number;
  readonly sessionCount: 12;
  readonly taskCount: 144;
  readonly inputFingerprint: string;
  readonly activityAssemblyFingerprint: string;
  readonly sourceFingerprints: readonly string[];
  readonly ownerInputOriginAuthority: "unverified_canonical_input_claim";
  readonly interfaceLocalizationAuthority: "none";
  readonly repositoryAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

export interface V2OwnerAuthoredEpisodeInputHandleV1 {
  readonly __brand: "V2OwnerAuthoredEpisodeInputHandleV1";
}

export interface V2OwnerAuthoredEpisodeInputMaterialV1 {
  readonly raw: string;
  readonly summary: V2OwnerAuthoredEpisodeInputSummaryV1;
  readonly sources: readonly V2ActivitySessionProjectionSource[];
  readonly assembly: V2ActivityEpisodeProjectionAssemblyV1;
}

const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const handles = new WeakSet<object>();
const materials = new WeakMap<object, V2OwnerAuthoredEpisodeInputMaterialV1>();

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length && keys.every((key) => actual.includes(key))
  );
}

function preflightJson(root: unknown): void {
  const stack: { value: unknown; depth: number }[] = [
    { value: root, depth: 0 },
  ];
  let nodes = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || ++nodes > 200_000 || current.depth > 96)
      fail("v2_owner_episode_input_complexity_invalid");
    if (current.value && typeof current.value === "object") {
      for (const child of Object.values(
        current.value as Record<string, unknown>,
      ))
        stack.push({ value: child, depth: current.depth + 1 });
    }
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Builds the immutable owner-input envelope from the owner's twelve source
 * sessions. All plan identities and fingerprints are code-derived; the owner
 * never has to calculate or type cryptographic fields.
 */
export function materializeV2OwnerAuthoredEpisodeDraftV1(
  input: V2OwnerAuthoredEpisodeDraftInputV1,
  plan: V2CanonicalSeasonPlanV2,
): V2OwnerAuthoredEpisodeInputMaterialV1 {
  if (
    !isV2CanonicalSeasonPlanV2(plan) ||
    !isRecord(input) ||
    !exactKeys(input as unknown as Record<string, unknown>, [
      "contentClass",
      "ownerInputId",
      "claimedAuthorId",
      "stageId",
      "sessionSources",
    ]) ||
    (input.contentClass !== "production_candidate" &&
      input.contentClass !== "neutral_test_fixture") ||
    !TOKEN_RE.test(input.ownerInputId) ||
    !TOKEN_RE.test(input.claimedAuthorId) ||
    typeof input.stageId !== "string" ||
    !Array.isArray(input.sessionSources) ||
    input.sessionSources.length !== 12
  )
    fail("v2_owner_episode_draft_input_invalid");
  const stage = plan.stages.find(
    (candidate) => candidate.stageId === input.stageId,
  );
  if (!stage || stage.kind !== "v2_activity_instances" || !stage.episodeId)
    fail("v2_owner_episode_draft_stage_invalid");
  const sessionSourceRaws = input.sessionSources.map((source) => {
    const raw =
      typeof source === "string"
        ? source
        : canonicalJsonV1(source as Readonly<Record<string, unknown>>);
    const parsed = parseV2ActivitySessionProjectionSource(raw);
    return canonicalJsonV1(parsed);
  });
  const body: RawOwnerEpisodeInputBodyV1 = {
    schemaVersion: V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V1,
    contentClass: input.contentClass,
    ownerInputId: input.ownerInputId,
    claimedAuthorId: input.claimedAuthorId,
    authoringRevision: plan.authoringRevision,
    planFingerprint: plan.planFingerprint,
    courseContractFingerprint: plan.courseContract.courseContractFingerprint,
    stageId: input.stageId,
    episodeId: stage.episodeId,
    targetLanguage: plan.targetLanguage,
    requiredInterfaceLocales: V2_CANONICAL_INTERFACE_LOCALES,
    sessionSourceRaws,
    ownerInputOrigin:
      input.contentClass === "production_candidate"
        ? "owner_authored_import"
        : "neutral_test_fixture",
    ownerInputBytesOrigin: "caller_supplied_canonical_bytes",
    authorIdentityAuthority: "unverified_input_claim",
    repositoryAuthority: "none",
    humanApprovalAuthority: "none",
    generatorMutationPolicy: "owner_content_immutable",
    executionAuthority: "none",
    publicationPolicy: "draft_only_no_consumer",
    runtimeConsumer: false,
    releaseEligible: false,
    releaseAuthority: false,
  };
  const raw = canonicalJsonV1({
    ...body,
    inputFingerprint: hashCanonicalBody(body),
  });
  const handle = parseV2OwnerAuthoredEpisodeInputV1(raw, plan, input.stageId);
  return resolveV2OwnerAuthoredEpisodeInputMaterialV1(handle);
}

const RAW_KEYS = [
  "schemaVersion",
  "contentClass",
  "ownerInputId",
  "claimedAuthorId",
  "authoringRevision",
  "planFingerprint",
  "courseContractFingerprint",
  "stageId",
  "episodeId",
  "targetLanguage",
  "requiredInterfaceLocales",
  "sessionSourceRaws",
  "ownerInputOrigin",
  "ownerInputBytesOrigin",
  "authorIdentityAuthority",
  "repositoryAuthority",
  "humanApprovalAuthority",
  "generatorMutationPolicy",
  "executionAuthority",
  "publicationPolicy",
  "runtimeConsumer",
  "releaseEligible",
  "releaseAuthority",
  "inputFingerprint",
] as const;

function assertRaw(value: unknown): asserts value is RawOwnerEpisodeInputV1 {
  if (!isRecord(value) || !exactKeys(value, RAW_KEYS))
    fail("v2_owner_episode_input_shape_invalid");
  if (
    value.schemaVersion !== V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V1 ||
    (value.contentClass !== "production_candidate" &&
      value.contentClass !== "neutral_test_fixture") ||
    typeof value.ownerInputId !== "string" ||
    !TOKEN_RE.test(value.ownerInputId) ||
    typeof value.claimedAuthorId !== "string" ||
    !TOKEN_RE.test(value.claimedAuthorId) ||
    typeof value.authoringRevision !== "number" ||
    !Number.isSafeInteger(value.authoringRevision) ||
    value.authoringRevision < 1 ||
    typeof value.planFingerprint !== "string" ||
    !HASH_RE.test(value.planFingerprint) ||
    typeof value.courseContractFingerprint !== "string" ||
    !HASH_RE.test(value.courseContractFingerprint) ||
    typeof value.stageId !== "string" ||
    value.stageId.length > 256 ||
    typeof value.episodeId !== "string" ||
    !TOKEN_RE.test(value.episodeId) ||
    typeof value.targetLanguage !== "string" ||
    value.targetLanguage.length > 64 ||
    !Array.isArray(value.requiredInterfaceLocales) ||
    canonicalJsonV1(value.requiredInterfaceLocales) !==
      canonicalJsonV1(V2_CANONICAL_INTERFACE_LOCALES) ||
    !Array.isArray(value.sessionSourceRaws) ||
    value.sessionSourceRaws.length !== 12 ||
    !value.sessionSourceRaws.every((entry) => typeof entry === "string") ||
    value.ownerInputBytesOrigin !== "caller_supplied_canonical_bytes" ||
    value.authorIdentityAuthority !== "unverified_input_claim" ||
    value.repositoryAuthority !== "none" ||
    value.humanApprovalAuthority !== "none" ||
    value.generatorMutationPolicy !== "owner_content_immutable" ||
    value.executionAuthority !== "none" ||
    value.publicationPolicy !== "draft_only_no_consumer" ||
    value.runtimeConsumer !== false ||
    value.releaseEligible !== false ||
    value.releaseAuthority !== false ||
    typeof value.inputFingerprint !== "string" ||
    !HASH_RE.test(value.inputFingerprint)
  )
    fail("v2_owner_episode_input_value_invalid");
  const expectedOrigin =
    value.contentClass === "production_candidate"
      ? "owner_authored_import"
      : "neutral_test_fixture";
  if (value.ownerInputOrigin !== expectedOrigin)
    fail("v2_owner_episode_input_content_class_invalid");
}

export function parseV2OwnerAuthoredEpisodeInputV1(
  raw: string,
  plan: V2CanonicalSeasonPlanV2,
  stageId: string,
): V2OwnerAuthoredEpisodeInputHandleV1 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V1
  )
    fail("v2_owner_episode_input_raw_invalid");
  if (!isV2CanonicalSeasonPlanV2(plan))
    fail("v2_owner_episode_input_plan_untrusted");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail("v2_owner_episode_input_json_invalid");
  }
  preflightJson(parsed);
  assertRaw(parsed);
  if (canonicalJsonV1(parsed) !== raw)
    fail("v2_owner_episode_input_noncanonical");
  const { inputFingerprint: _ignored, ...body } = parsed;
  if (hashCanonicalBody(body) !== parsed.inputFingerprint)
    fail("v2_owner_episode_input_fingerprint_invalid");
  const stage = plan.stages.find((candidate) => candidate.stageId === stageId);
  if (
    !stage ||
    stage.kind !== "v2_activity_instances" ||
    stage.episodeId !== parsed.episodeId ||
    stage.locale !== null ||
    parsed.stageId !== stageId ||
    parsed.planFingerprint !== plan.planFingerprint ||
    parsed.courseContractFingerprint !==
      plan.courseContract.courseContractFingerprint ||
    parsed.authoringRevision !== plan.authoringRevision ||
    parsed.targetLanguage !== plan.targetLanguage
  )
    fail("v2_owner_episode_input_plan_binding_invalid");
  const sources = parsed.sessionSourceRaws.map((sourceRaw) =>
    parseV2ActivitySessionProjectionSource(sourceRaw),
  );
  const assembly = assembleV2ActivityEpisodeProjectionV1(sources);
  if (
    assembly.episodeId !== parsed.episodeId ||
    assembly.targetLanguage !== parsed.targetLanguage
  )
    fail("v2_owner_episode_input_activity_binding_invalid");
  const sourceFingerprints = Object.freeze(
    sources.map((source) => hashCanonicalBody(source)),
  );
  const summary = deepFreeze({
    schemaVersion: "v2-owner-authored-episode-input-summary.v1" as const,
    contentClass: parsed.contentClass,
    ownerInputId: parsed.ownerInputId,
    planFingerprint: parsed.planFingerprint,
    courseContractFingerprint: parsed.courseContractFingerprint,
    stageId,
    episodeId: parsed.episodeId,
    targetLanguage: parsed.targetLanguage,
    authoringRevision: parsed.authoringRevision,
    sessionCount: 12 as const,
    taskCount: 144 as const,
    inputFingerprint: parsed.inputFingerprint,
    activityAssemblyFingerprint: assembly.assemblyFingerprint,
    sourceFingerprints,
    ownerInputOriginAuthority: "unverified_canonical_input_claim" as const,
    interfaceLocalizationAuthority: "none" as const,
    repositoryAuthority: "none" as const,
    humanApprovalAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  const handle = Object.freeze({
    __brand: "V2OwnerAuthoredEpisodeInputHandleV1" as const,
  });
  handles.add(handle);
  materials.set(
    handle,
    Object.freeze({ raw, summary, sources: Object.freeze(sources), assembly }),
  );
  return handle;
}

export function isV2OwnerAuthoredEpisodeInputHandleV1(
  value: unknown,
): value is V2OwnerAuthoredEpisodeInputHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2OwnerAuthoredEpisodeInputSummaryV1(
  handle: V2OwnerAuthoredEpisodeInputHandleV1,
) {
  const material = materials.get(handle as object);
  if (!material || !handles.has(handle as object))
    fail("v2_owner_episode_input_handle_invalid");
  return material.summary;
}

export function resolveV2OwnerAuthoredEpisodeInputMaterialV1(
  handle: V2OwnerAuthoredEpisodeInputHandleV1,
) {
  const material = materials.get(handle as object);
  if (!material || !handles.has(handle as object))
    fail("v2_owner_episode_input_handle_invalid");
  return material;
}
