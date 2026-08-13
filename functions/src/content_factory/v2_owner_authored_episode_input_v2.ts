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
import {
  materializeV2OwnerAuthoredSessionIntroV1,
  parseV2OwnerAuthoredSessionIntroV1,
  resolveV2OwnerAuthoredSessionIntroMaterialV1,
  type V2OwnerAuthoredSessionIntroDraftV1,
  type V2OwnerAuthoredSessionIntroMaterialV1,
} from "./v2_owner_authored_session_intro_v1";

export const V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2 =
  "v2-owner-authored-episode-input.v2" as const;
export const V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2 = 8 * 1024 * 1024;

type ContentClass = "production_candidate" | "neutral_test_fixture";

export interface V2OwnerAuthoredEpisodeDraftInputV2 {
  readonly contentClass: ContentClass;
  readonly ownerInputId: string;
  readonly claimedAuthorId: string;
  readonly stageId: string;
  readonly sessionSources: readonly unknown[];
  readonly sessionIntros: readonly V2OwnerAuthoredSessionIntroDraftV1[];
}

export interface V2OwnerAuthoredEpisodeInputSummaryV2 {
  readonly schemaVersion: "v2-owner-authored-episode-input-summary.v2";
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
  readonly introCount: 12;
  readonly introQuestionCount: 36;
  readonly inputFingerprint: string;
  readonly activityAssemblyFingerprint: string;
  readonly introAggregateFingerprint: string;
  readonly sourceFingerprints: readonly string[];
  readonly introFingerprints: readonly string[];
  readonly ownerInputOriginAuthority: "unverified_canonical_input_claim";
  readonly introContentAuthority: "unverified_owner_input_claim";
  readonly interfaceLocalizationAuthority: "none";
  readonly languageAccuracyAuthority: "none";
  readonly curriculumAuthority: "none";
  readonly repositoryAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

export interface V2OwnerAuthoredEpisodeInputHandleV2 {
  readonly __brand: "V2OwnerAuthoredEpisodeInputHandleV2";
}

export interface V2OwnerAuthoredEpisodeInputMaterialV2 {
  readonly raw: string;
  readonly summary: V2OwnerAuthoredEpisodeInputSummaryV2;
  readonly sources: readonly V2ActivitySessionProjectionSource[];
  readonly intros: readonly V2OwnerAuthoredSessionIntroMaterialV1[];
  readonly assembly: V2ActivityEpisodeProjectionAssemblyV1;
}

interface RawBodyV2 {
  readonly schemaVersion: typeof V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2;
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
  readonly sessionIntroRaws: readonly string[];
  readonly introAggregateFingerprint: string;
  readonly ownerInputOrigin: "owner_authored_import" | "neutral_test_fixture";
  readonly ownerInputBytesOrigin: "caller_supplied_canonical_bytes";
  readonly authorIdentityAuthority: "unverified_input_claim";
  readonly introContentAuthority: "unverified_owner_input_claim";
  readonly repositoryAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly generatorMutationPolicy: "owner_content_immutable";
  readonly executionAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

interface RawV2 extends RawBodyV2 {
  readonly inputFingerprint: string;
}

const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const handles = new WeakSet<object>();
const materials = new WeakMap<object, V2OwnerAuthoredEpisodeInputMaterialV2>();
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
  "sessionIntroRaws",
  "introAggregateFingerprint",
  "ownerInputOrigin",
  "ownerInputBytesOrigin",
  "authorIdentityAuthority",
  "introContentAuthority",
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

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function preflightJson(root: unknown) {
  const stack: { value: unknown; depth: number }[] = [
    { value: root, depth: 0 },
  ];
  let nodes = 0;
  while (stack.length) {
    const current = stack.pop();
    if (!current || ++nodes > 240_000 || current.depth > 96)
      fail("v2_owner_episode_input_v2_complexity_invalid");
    if (current.value && typeof current.value === "object") {
      Object.values(current.value as Record<string, unknown>).forEach((value) =>
        stack.push({ value, depth: current.depth + 1 }),
      );
    } else if (
      typeof current.value === "number" &&
      (!Number.isFinite(current.value) ||
        Object.is(current.value, -0) ||
        (Number.isInteger(current.value) &&
          !Number.isSafeInteger(current.value)))
    )
      fail("v2_owner_episode_input_v2_complexity_invalid");
  }
}

function trustedSource(source: unknown) {
  try {
    return parseV2ActivitySessionProjectionSource(canonicalJsonV1(source));
  } catch {
    fail("v2_owner_episode_input_v2_source_invalid");
  }
}

function bindIntro(
  source: V2ActivitySessionProjectionSource,
  draft: V2OwnerAuthoredSessionIntroDraftV1,
) {
  const material = materializeV2OwnerAuthoredSessionIntroV1(draft, source);
  return { source: material.source, intro: material };
}

function assertRaw(value: unknown): asserts value is RawV2 {
  if (!isRecord(value) || !exactKeys(value, RAW_KEYS))
    fail("v2_owner_episode_input_v2_shape_invalid");
  if (
    value.schemaVersion !== V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2 ||
    (value.contentClass !== "production_candidate" &&
      value.contentClass !== "neutral_test_fixture") ||
    typeof value.ownerInputId !== "string" ||
    !TOKEN_RE.test(value.ownerInputId) ||
    typeof value.claimedAuthorId !== "string" ||
    !TOKEN_RE.test(value.claimedAuthorId) ||
    !Number.isSafeInteger(value.authoringRevision) ||
    Number(value.authoringRevision) < 1 ||
    typeof value.planFingerprint !== "string" ||
    !HASH_RE.test(value.planFingerprint) ||
    typeof value.courseContractFingerprint !== "string" ||
    !HASH_RE.test(value.courseContractFingerprint) ||
    typeof value.stageId !== "string" ||
    typeof value.episodeId !== "string" ||
    !TOKEN_RE.test(value.episodeId) ||
    typeof value.targetLanguage !== "string" ||
    canonicalJsonV1(value.requiredInterfaceLocales) !==
      canonicalJsonV1(V2_CANONICAL_INTERFACE_LOCALES) ||
    !Array.isArray(value.sessionSourceRaws) ||
    value.sessionSourceRaws.length !== 12 ||
    !value.sessionSourceRaws.every((entry) => typeof entry === "string") ||
    !Array.isArray(value.sessionIntroRaws) ||
    value.sessionIntroRaws.length !== 12 ||
    !value.sessionIntroRaws.every((entry) => typeof entry === "string") ||
    typeof value.introAggregateFingerprint !== "string" ||
    !HASH_RE.test(value.introAggregateFingerprint) ||
    value.ownerInputBytesOrigin !== "caller_supplied_canonical_bytes" ||
    value.authorIdentityAuthority !== "unverified_input_claim" ||
    value.introContentAuthority !== "unverified_owner_input_claim" ||
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
    fail("v2_owner_episode_input_v2_value_invalid");
  const expectedOrigin =
    value.contentClass === "production_candidate"
      ? "owner_authored_import"
      : "neutral_test_fixture";
  if (value.ownerInputOrigin !== expectedOrigin)
    fail("v2_owner_episode_input_v2_content_class_invalid");
}

export function materializeV2OwnerAuthoredEpisodeDraftV2(
  input: V2OwnerAuthoredEpisodeDraftInputV2,
  plan: V2CanonicalSeasonPlanV2,
): V2OwnerAuthoredEpisodeInputMaterialV2 {
  if (
    !isV2CanonicalSeasonPlanV2(plan) ||
    !isRecord(input) ||
    !exactKeys(input as unknown as Record<string, unknown>, [
      "contentClass",
      "ownerInputId",
      "claimedAuthorId",
      "stageId",
      "sessionSources",
      "sessionIntros",
    ]) ||
    (input.contentClass !== "production_candidate" &&
      input.contentClass !== "neutral_test_fixture") ||
    !TOKEN_RE.test(input.ownerInputId) ||
    !TOKEN_RE.test(input.claimedAuthorId) ||
    !Array.isArray(input.sessionSources) ||
    input.sessionSources.length !== 12 ||
    !Array.isArray(input.sessionIntros) ||
    input.sessionIntros.length !== 12
  )
    fail("v2_owner_episode_input_v2_draft_invalid");
  const stage = plan.stages.find(
    (candidate) => candidate.stageId === input.stageId,
  );
  if (!stage || stage.kind !== "v2_activity_instances" || !stage.episodeId)
    fail("v2_owner_episode_input_v2_stage_invalid");
  const bound = input.sessionSources.map((source, index) =>
    bindIntro(trustedSource(source), input.sessionIntros[index]),
  );
  const sources = bound.map((entry) => entry.source);
  const intros = bound.map((entry) => entry.intro);
  const sessionSourceRaws = sources.map(canonicalJsonV1);
  const sessionIntroRaws = intros.map((intro) => intro.raw);
  const introAggregateFingerprint = hashCanonicalBody(
    intros.map((intro) => intro.summary.introFingerprint),
  );
  const body: RawBodyV2 = {
    schemaVersion: V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2,
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
    sessionIntroRaws,
    introAggregateFingerprint,
    ownerInputOrigin:
      input.contentClass === "production_candidate"
        ? "owner_authored_import"
        : "neutral_test_fixture",
    ownerInputBytesOrigin: "caller_supplied_canonical_bytes",
    authorIdentityAuthority: "unverified_input_claim",
    introContentAuthority: "unverified_owner_input_claim",
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
  return resolveV2OwnerAuthoredEpisodeInputMaterialV2(
    parseV2OwnerAuthoredEpisodeInputV2(raw, plan, input.stageId),
  );
}

export function parseV2OwnerAuthoredEpisodeInputV2(
  raw: string,
  plan: V2CanonicalSeasonPlanV2,
  stageId: string,
): V2OwnerAuthoredEpisodeInputHandleV2 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2 ||
    utf8ByteLengthV1(raw) > V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2
  )
    fail("v2_owner_episode_input_v2_raw_invalid");
  if (!isV2CanonicalSeasonPlanV2(plan))
    fail("v2_owner_episode_input_v2_plan_untrusted");
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    fail("v2_owner_episode_input_v2_json_invalid");
  }
  preflightJson(candidate);
  assertRaw(candidate);
  if (canonicalJsonV1(candidate) !== raw)
    fail("v2_owner_episode_input_v2_noncanonical");
  const { inputFingerprint: _ignored, ...body } = candidate;
  if (hashCanonicalBody(body) !== candidate.inputFingerprint)
    fail("v2_owner_episode_input_v2_fingerprint_invalid");
  const stage = plan.stages.find((item) => item.stageId === stageId);
  if (
    !stage ||
    stage.kind !== "v2_activity_instances" ||
    stage.episodeId !== candidate.episodeId ||
    stage.locale !== null ||
    candidate.stageId !== stageId ||
    candidate.planFingerprint !== plan.planFingerprint ||
    candidate.courseContractFingerprint !==
      plan.courseContract.courseContractFingerprint ||
    candidate.authoringRevision !== plan.authoringRevision ||
    candidate.targetLanguage !== plan.targetLanguage
  )
    fail("v2_owner_episode_input_v2_plan_binding_invalid");
  const sources = candidate.sessionSourceRaws.map((sourceRaw) =>
    parseV2ActivitySessionProjectionSource(sourceRaw),
  );
  const intros = candidate.sessionIntroRaws.map((introRaw, index) => {
    const handle = parseV2OwnerAuthoredSessionIntroV1(introRaw, sources[index]);
    return resolveV2OwnerAuthoredSessionIntroMaterialV1(handle);
  });
  if (
    sources.some((source, index) => source.session.ordinal !== index + 1) ||
    intros.some(
      (intro, index) =>
        intro.summary.sessionOrdinal !== index + 1 ||
        intro.summary.contentClass !== candidate.contentClass,
    )
  )
    fail("v2_owner_episode_input_v2_intro_binding_invalid");
  const introFingerprints = intros.map(
    (intro) => intro.summary.introFingerprint,
  );
  if (
    hashCanonicalBody(introFingerprints) !== candidate.introAggregateFingerprint
  )
    fail("v2_owner_episode_input_v2_intro_aggregate_invalid");
  const assembly = assembleV2ActivityEpisodeProjectionV1(sources);
  if (
    assembly.episodeId !== candidate.episodeId ||
    assembly.targetLanguage !== candidate.targetLanguage
  )
    fail("v2_owner_episode_input_v2_activity_binding_invalid");
  const summary = Object.freeze({
    schemaVersion: "v2-owner-authored-episode-input-summary.v2" as const,
    contentClass: candidate.contentClass,
    ownerInputId: candidate.ownerInputId,
    planFingerprint: candidate.planFingerprint,
    courseContractFingerprint: candidate.courseContractFingerprint,
    stageId,
    episodeId: candidate.episodeId,
    targetLanguage: candidate.targetLanguage,
    authoringRevision: candidate.authoringRevision,
    sessionCount: 12 as const,
    taskCount: 144 as const,
    introCount: 12 as const,
    introQuestionCount: 36 as const,
    inputFingerprint: candidate.inputFingerprint,
    activityAssemblyFingerprint: assembly.assemblyFingerprint,
    introAggregateFingerprint: candidate.introAggregateFingerprint,
    sourceFingerprints: Object.freeze(sources.map(hashCanonicalBody)),
    introFingerprints: Object.freeze(introFingerprints),
    ownerInputOriginAuthority: "unverified_canonical_input_claim" as const,
    introContentAuthority: "unverified_owner_input_claim" as const,
    interfaceLocalizationAuthority: "none" as const,
    languageAccuracyAuthority: "none" as const,
    curriculumAuthority: "none" as const,
    repositoryAuthority: "none" as const,
    humanApprovalAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  const handle = Object.freeze({
    __brand: "V2OwnerAuthoredEpisodeInputHandleV2" as const,
  });
  handles.add(handle);
  materials.set(
    handle,
    Object.freeze({
      raw,
      summary,
      sources: Object.freeze(sources),
      intros: Object.freeze(intros),
      assembly,
    }),
  );
  return handle;
}

export function isV2OwnerAuthoredEpisodeInputHandleV2(
  value: unknown,
): value is V2OwnerAuthoredEpisodeInputHandleV2 {
  return isRecord(value) && handles.has(value);
}

export function getV2OwnerAuthoredEpisodeInputSummaryV2(
  handle: V2OwnerAuthoredEpisodeInputHandleV2,
) {
  const material = materials.get(handle);
  if (!material) fail("v2_owner_episode_input_v2_handle_invalid");
  return material.summary;
}

export function resolveV2OwnerAuthoredEpisodeInputMaterialV2(
  handle: V2OwnerAuthoredEpisodeInputHandleV2,
) {
  const material = materials.get(handle);
  if (!material) fail("v2_owner_episode_input_v2_handle_invalid");
  return material;
}
