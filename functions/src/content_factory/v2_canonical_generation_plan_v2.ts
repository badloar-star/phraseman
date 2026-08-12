import {
  V2_ACTIVITY_FAMILY_CATALOG_V2,
  V2_REQUIRED_SESSION_FAMILY_POLICY_V2,
} from "../../../modules/learning-v2/contracts/activity_catalog_v2";
import {
  V2_AUDIO_PREFETCH_POLICY_V1,
  V2_FOUR_VOICE_PLAYBACK_POLICY_V1,
  V2_REQUIRED_VOICE_IDS,
} from "../../../modules/learning-v2/contracts/voice_playback_policy_v1";
import {
  parseV2ExactLanguageTagV1,
  v2ExactLanguageTagsCompatibleV1,
} from "../../../modules/learning-v2/contracts/language_tag_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_CANONICAL_INTERFACE_LOCALES,
  V2_CANONICAL_MAX_EXTERNAL_DEPENDENCIES,
  V2_CANONICAL_STAGE_KINDS,
  buildV2CanonicalSeasonPlan,
  parseV2CanonicalPlanRequest,
  type V2CanonicalGenerationScope,
  type V2CanonicalInterfaceLocale,
  type V2CanonicalPlanInput,
  type V2CanonicalStageKind,
} from "./v2_canonical_generation_plan";

const HASH_RE = /^[0-9a-f]{64}$/;
const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const MAX_PLAN_REQUEST_BYTES = 1024 * 1024;
export const V2_CANONICAL_PLAN_V2_MAX_BYTES = 512 * 1024;

export type V2CanonicalExternalRequirementV2 =
  | Readonly<{
      dependencyType: "language_profile";
      profileId: string;
      version: number;
      contentHash: string;
    }>
  | Readonly<{
      dependencyType: "speech_profile";
      profileId: string;
      version: number;
      contentHash: string;
    }>
  | Readonly<{
      dependencyType: "voice_generation_profile";
      profileId: string;
      version: number;
      contentHash: string;
    }>
  | Readonly<{
      dependencyType: "published_template";
      templateId: string;
      version: number;
      contentHash: string;
    }>;

export interface V2CanonicalPlanInputV2 {
  readonly schemaVersion: "v2-canonical-plan-request.v2";
  readonly workspaceId: string;
  readonly jobId: string;
  readonly authoringRevision: number;
  readonly seasonId: string;
  readonly scope: V2CanonicalGenerationScope;
  readonly episodeIds: readonly string[];
  readonly recipes?: readonly Readonly<{
    episodeId: string;
    dialogue?: boolean;
    speakingMission?: boolean;
  }>[];
  readonly languageProfileRef: Readonly<{
    profileId: string;
    targetLanguage: string;
    version: number;
    contentHash: string;
  }>;
  readonly speechProfileRef: Readonly<{
    profileId: string;
    targetLanguage: string;
    speechLocale: string;
    version: number;
    contentHash: string;
  }>;
  readonly voiceGenerationProfileRef: Readonly<{
    profileId: string;
    version: number;
    contentHash: string;
  }>;
  readonly decisionRegistryRef: Readonly<{
    decisionId: "HYP-V2-007";
    version: number;
    contentHash: string;
  }>;
  readonly templateBindings: readonly Readonly<{
    episodeId: string;
    templateRefs: readonly Readonly<{
      templateId: string;
      version: number;
      contentHash: string;
    }>[];
  }>[];
}

export interface V2CanonicalStageNodeV2 {
  readonly stageId: string;
  readonly kind: V2CanonicalStageKind;
  readonly episodeId: string | null;
  readonly locale: V2CanonicalInterfaceLocale | null;
  readonly dependsOn: readonly string[];
  readonly externalRequirementIds: readonly string[];
}

export interface V2CanonicalExternalRequirementCatalogEntryV2 {
  readonly requirementId: string;
  readonly requirement: V2CanonicalExternalRequirementV2;
}

const performancePolicyBody = Object.freeze({
  schemaVersion: "v2-required-session-performance-policy.v1" as const,
  policyId: "v2-required-session-performance-3-2-1-0" as const,
  version: 1 as const,
  firstCorrectNoHint: 3 as const,
  secondCorrectNoHint: 2 as const,
  hintedOrLaterCorrect: 1 as const,
  skipped: 0 as const,
  technicalInvalid: "neutral_retry" as const,
  awardAuthority: "server_derived_policy_only" as const,
});

const performancePolicyRef = Object.freeze({
  policyId: performancePolicyBody.policyId,
  version: performancePolicyBody.version,
  contentHash: hashCanonicalBody(performancePolicyBody),
});

const courseContractBody = Object.freeze({
  schemaVersion: "v2-owner-current-course-contract.v1" as const,
  artifactModel: "episode-v2-session-set-v2" as const,
  requiredEpisodesPerCourse: 32 as const,
  requiredSessionsPerEpisode: 12 as const,
  requiredTasksPerSession: 12 as const,
  provisionalTaskStars: Object.freeze({
    firstCorrectNoHint: 3 as const,
    secondCorrectNoHint: 2 as const,
    hintedOrLaterCorrect: 1 as const,
    skipped: 0 as const,
    technicalInvalid: "neutral_retry" as const,
  }),
  maxProvisionalPerformanceStarsPerSession: 36 as const,
  performancePolicyRef,
  performanceAuthority: "server_derived_policy_only" as const,
  contentMayAward: false as const,
  masteryAuthority: "none" as const,
  evidenceAuthority: "none" as const,
  walletMutationAuthority: "none" as const,
  legacyEpisodeGraphStarAuthority: false as const,
  familyCatalogRef: V2_ACTIVITY_FAMILY_CATALOG_V2.ref,
  requiredSessionFamilyPolicyRef: V2_REQUIRED_SESSION_FAMILY_POLICY_V2.ref,
  activityInstancesSchema: "v2-activity-instances-package-root.v2" as const,
  activitySessionShardSchema: "v2-activity-session-source-shard.v2" as const,
  activityGraphSchema: "v2-activity-graph-artifact.v2" as const,
  voiceTargetsSchema: "v2-voice-targets-artifact.v2" as const,
  requiredMapSessionNodesPerEpisode: 12 as const,
  courseMapNodeUnit: "required_session" as const,
  taskNodesVisibleOnCourseMap: false as const,
  mapConnectorLinePolicy: "forbidden" as const,
  requiredVoiceIds: V2_REQUIRED_VOICE_IDS,
  voiceVariantsPerApprovedTarget: 4 as const,
  voicePlaybackPolicyRef: V2_FOUR_VOICE_PLAYBACK_POLICY_V1.ref,
  audioPrefetchPolicyRef: V2_AUDIO_PREFETCH_POLICY_V1.ref,
  audioDeliveryImplementationStatus: "contract_only_runtime_open" as const,
  requiredInterfaceLocales: V2_CANONICAL_INTERFACE_LOCALES,
  interfaceLocalesAreTtsDuplicationAxis: false as const,
  voiceTargetByteAuthority: "none" as const,
  languageAndSpeechProfileResolutionAuthority:
    "unverified_external_refs" as const,
  voiceSourceHashInvalidationAuthority:
    "future_voice_targets_validator" as const,
  historicalEightSlotGraphAcceptedAsAuthority: false as const,
  familyCatalogApplicability:
    "canonical_activity_instances_and_optional_capstones" as const,
  requiredSessionCardsUseExactSevenFamilyPolicyOnly: true as const,
});

export const V2_OWNER_CURRENT_COURSE_CONTRACT = Object.freeze({
  ...courseContractBody,
  courseContractFingerprint: hashCanonicalBody(courseContractBody),
});

export interface V2CanonicalSeasonPlanV2 {
  readonly schemaVersion: "v2-canonical-season-plan.v2";
  readonly compilerVersion: "v2-canonical-plan-compiler.v2";
  readonly coordinateSchemaVersion: "v2-stage-coordinate.v2";
  readonly workspaceId: string;
  readonly jobId: string;
  readonly authoringRevision: number;
  readonly seasonId: string;
  readonly scope: V2CanonicalGenerationScope;
  readonly targetLanguage: string;
  readonly decisionRegistryRef: V2CanonicalPlanInputV2["decisionRegistryRef"];
  readonly episodeIds: readonly string[];
  readonly optionalStageDispositions: readonly Readonly<{
    episodeId: string;
    dialogue: "required" | "not_required_by_recipe";
    speakingMission: "required" | "not_required_by_recipe";
  }>[];
  readonly courseContract: typeof V2_OWNER_CURRENT_COURSE_CONTRACT;
  readonly externalRequirementCatalog: readonly V2CanonicalExternalRequirementCatalogEntryV2[];
  readonly stages: readonly V2CanonicalStageNodeV2[];
  readonly planFingerprint: string;
  readonly executionAuthority: "none";
  readonly storageAuthority: "none";
  readonly humanReviewAuthority: "none";
  readonly specialistEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

type TrustedV2Request = Readonly<{
  v1Request: V2CanonicalPlanInput;
  speechProfileRef: V2CanonicalPlanInputV2["speechProfileRef"];
  voiceGenerationProfileRef: V2CanonicalPlanInputV2["voiceGenerationProfileRef"];
}>;

const requestHandles = new WeakMap<object, TrustedV2Request>();
const planHandles = new WeakSet<object>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length && keys.every((key) => actual.includes(key))
  );
}

function exactToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_RE.test(value);
}

function exactVersion(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= 1_000_000
  );
}

function exactHash(value: unknown): value is string {
  return typeof value === "string" && HASH_RE.test(value);
}

function exactLanguageTag(value: unknown): value is string {
  return parseV2ExactLanguageTagV1(value) !== null;
}

function deepFreezeJson<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreezeJson(child);
    }
    Object.freeze(value);
  }
  return value;
}

function parseSpeechProfile(
  value: unknown,
): V2CanonicalPlanInputV2["speechProfileRef"] {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "profileId",
      "targetLanguage",
      "speechLocale",
      "version",
      "contentHash",
    ]) ||
    !exactToken(value.profileId) ||
    !exactLanguageTag(value.targetLanguage) ||
    !exactLanguageTag(value.speechLocale) ||
    !exactVersion(value.version) ||
    !exactHash(value.contentHash)
  ) {
    throw new Error("v2_canonical_plan_v2_request_invalid");
  }
  return Object.freeze({
    profileId: value.profileId,
    targetLanguage: value.targetLanguage,
    speechLocale: value.speechLocale,
    version: value.version,
    contentHash: value.contentHash,
  });
}

function parseVoiceGenerationProfile(
  value: unknown,
): V2CanonicalPlanInputV2["voiceGenerationProfileRef"] {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["profileId", "version", "contentHash"]) ||
    !exactToken(value.profileId) ||
    !exactVersion(value.version) ||
    !exactHash(value.contentHash)
  ) {
    throw new Error("v2_canonical_plan_v2_request_invalid");
  }
  return Object.freeze({
    profileId: value.profileId,
    version: value.version,
    contentHash: value.contentHash,
  });
}

/** Canonical raw-only request boundary for the owner-current plan namespace. */
export function parseV2CanonicalPlanRequestV2(
  raw: string,
): V2CanonicalPlanInputV2 {
  if (typeof raw !== "string" || raw.length > MAX_PLAN_REQUEST_BYTES) {
    throw new Error("v2_canonical_plan_v2_request_invalid");
  }
  let byteLength: number;
  try {
    byteLength = utf8ByteLengthV1(raw);
  } catch {
    throw new Error("v2_canonical_plan_v2_request_invalid");
  }
  if (byteLength > MAX_PLAN_REQUEST_BYTES) {
    throw new Error("v2_canonical_plan_v2_request_too_large");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error("v2_canonical_plan_v2_request_invalid");
  }
  const requiredKeys = [
    "schemaVersion",
    "workspaceId",
    "jobId",
    "authoringRevision",
    "seasonId",
    "scope",
    "episodeIds",
    "languageProfileRef",
    "speechProfileRef",
    "voiceGenerationProfileRef",
    "decisionRegistryRef",
    "templateBindings",
  ] as const;
  const allowedKeys = [...requiredKeys, "recipes"] as const;
  const actualKeys = isRecord(decoded) ? Object.keys(decoded) : [];
  if (
    !isRecord(decoded) ||
    !requiredKeys.every((key) => actualKeys.includes(key)) ||
    !actualKeys.every((key) =>
      (allowedKeys as readonly string[]).includes(key),
    ) ||
    decoded.schemaVersion !== "v2-canonical-plan-request.v2"
  ) {
    throw new Error("v2_canonical_plan_v2_request_invalid");
  }
  const speechProfileRef = parseSpeechProfile(decoded.speechProfileRef);
  const voiceGenerationProfileRef = parseVoiceGenerationProfile(
    decoded.voiceGenerationProfileRef,
  );
  const v1Candidate = {
    ...decoded,
    schemaVersion: "v2-canonical-plan-request.v1",
  } as Record<string, unknown>;
  delete v1Candidate.speechProfileRef;
  delete v1Candidate.voiceGenerationProfileRef;
  let v1Request: V2CanonicalPlanInput;
  try {
    v1Request = parseV2CanonicalPlanRequest(canonicalJsonV1(v1Candidate));
  } catch {
    throw new Error("v2_canonical_plan_v2_request_invalid");
  }
  if (
    !exactLanguageTag(v1Request.languageProfileRef.targetLanguage) ||
    speechProfileRef.targetLanguage !==
      v1Request.languageProfileRef.targetLanguage
  ) {
    throw new Error("v2_canonical_plan_v2_request_invalid");
  }
  if (
    !v2ExactLanguageTagsCompatibleV1(
      v1Request.languageProfileRef.targetLanguage,
      speechProfileRef.speechLocale,
    )
  ) {
    throw new Error("v2_canonical_plan_v2_request_invalid");
  }
  let canonical: string;
  try {
    canonical = canonicalJsonV1(decoded);
  } catch {
    throw new Error("v2_canonical_plan_v2_request_invalid");
  }
  if (canonical !== raw) {
    throw new Error("v2_canonical_plan_v2_request_noncanonical");
  }
  const request = deepFreezeJson(decoded) as unknown as V2CanonicalPlanInputV2;
  requestHandles.set(request as object, {
    v1Request,
    speechProfileRef,
    voiceGenerationProfileRef,
  });
  return request;
}

function stageId(
  identity: Readonly<{
    workspaceId: string;
    jobId: string;
    authoringRevision: number;
    seasonId: string;
  }>,
  requestFingerprint: string,
  kind: V2CanonicalStageKind,
  episodeId: string | null = null,
  locale: V2CanonicalInterfaceLocale | null = null,
): string {
  const coordinateFingerprint = hashCanonicalBody({
    schemaVersion: "v2-stage-coordinate.v2",
    compilerVersion: "v2-canonical-plan-compiler.v2",
    planSchemaVersion: "v2-canonical-season-plan.v2",
    artifactModel: V2_OWNER_CURRENT_COURSE_CONTRACT.artifactModel,
    requestFingerprint,
    ...identity,
    kind,
    episodeId,
    locale,
  });
  return `v2s2:${kind}:r${identity.authoringRevision}:${coordinateFingerprint}`;
}

function immutableNode(node: V2CanonicalStageNodeV2): V2CanonicalStageNodeV2 {
  if (
    node.dependsOn.length + node.externalRequirementIds.length >
    V2_CANONICAL_MAX_EXTERNAL_DEPENDENCIES
  ) {
    throw new Error("v2_canonical_plan_v2_dependency_capacity");
  }
  return Object.freeze({
    ...node,
    dependsOn: Object.freeze([...node.dependsOn]),
    externalRequirementIds: Object.freeze([...node.externalRequirementIds]),
  });
}

function codePointCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Pure additive compiler. It performs no dependency resolution, provider,
 * storage, execution, publication or release work.
 */
export function buildV2CanonicalSeasonPlanV2(
  input: V2CanonicalPlanInputV2,
): V2CanonicalSeasonPlanV2 {
  if (!input || typeof input !== "object") {
    throw new Error("v2_canonical_plan_v2_request_untrusted");
  }
  const trusted = requestHandles.get(input as object);
  if (!trusted) throw new Error("v2_canonical_plan_v2_request_untrusted");
  const v1Plan = buildV2CanonicalSeasonPlan(trusted.v1Request);
  const identity = Object.freeze({
    workspaceId: v1Plan.workspaceId,
    jobId: v1Plan.jobId,
    authoringRevision: v1Plan.authoringRevision,
    seasonId: v1Plan.seasonId,
  });
  const optionalStageDispositions = v1Plan.optionalStageDispositions;
  const outlineV1 = v1Plan.stages.find(
    (node) => node.kind === "v2_season_outline",
  );
  const languageProfile = outlineV1?.externalRequirements.find(
    (requirement) => requirement.dependencyType === "language_profile",
  );
  if (!languageProfile)
    throw new Error("v2_canonical_plan_v2_internal_invalid");
  const templatesByEpisode = new Map<
    string,
    readonly V2CanonicalExternalRequirementV2[]
  >();
  for (const episodeId of v1Plan.episodeIds) {
    const instance = v1Plan.stages.find(
      (node) =>
        node.kind === "v2_activity_instances" && node.episodeId === episodeId,
    );
    if (!instance) throw new Error("v2_canonical_plan_v2_internal_invalid");
    templatesByEpisode.set(
      episodeId,
      Object.freeze(
        instance.externalRequirements.map((requirement) =>
          Object.freeze({ ...requirement }),
        ),
      ),
    );
  }
  const requestFingerprint = hashCanonicalBody({
    schemaVersion: "v2-canonical-plan-semantics.v2",
    ...identity,
    scope: v1Plan.scope,
    targetLanguage: v1Plan.targetLanguage,
    decisionRegistryRef: v1Plan.decisionRegistryRef,
    episodeIds: v1Plan.episodeIds,
    optionalStageDispositions,
    languageProfile,
    templateBindings: v1Plan.episodeIds.map((episodeId) => ({
      episodeId,
      templateRefs: templatesByEpisode.get(episodeId) ?? [],
    })),
    courseContractFingerprint:
      V2_OWNER_CURRENT_COURSE_CONTRACT.courseContractFingerprint,
  });
  const voiceRequestFingerprint = hashCanonicalBody({
    schemaVersion: "v2-canonical-voice-stage-semantics.v1",
    structuralRequestFingerprint: requestFingerprint,
    speechProfileRef: trusted.speechProfileRef,
    voiceGenerationProfileRef: trusted.voiceGenerationProfileRef,
    requiredVoiceIds: V2_OWNER_CURRENT_COURSE_CONTRACT.requiredVoiceIds,
    voicePlaybackPolicyRef:
      V2_OWNER_CURRENT_COURSE_CONTRACT.voicePlaybackPolicyRef,
  });
  const seasonOutline = stageId(
    identity,
    requestFingerprint,
    "v2_season_outline",
  );
  const requirementCatalog = new Map<
    string,
    V2CanonicalExternalRequirementCatalogEntryV2
  >();
  const requirementIds = (
    requirements: readonly V2CanonicalExternalRequirementV2[],
  ): readonly string[] =>
    Object.freeze(
      requirements.map((requirement) => {
        const requirementId = `v2req:${hashCanonicalBody({
          schemaVersion: "v2-plan-external-requirement.v1",
          requirement,
        })}`;
        const prior = requirementCatalog.get(requirementId);
        if (
          prior &&
          hashCanonicalBody(prior.requirement) !==
            hashCanonicalBody(requirement)
        ) {
          throw new Error("v2_canonical_plan_v2_requirement_conflict");
        }
        if (!prior) {
          requirementCatalog.set(
            requirementId,
            Object.freeze({
              requirementId,
              requirement: Object.freeze({ ...requirement }),
            }),
          );
        }
        return requirementId;
      }),
    );
  const nodes: V2CanonicalStageNodeV2[] = [
    immutableNode({
      stageId: seasonOutline,
      kind: "v2_season_outline",
      episodeId: null,
      locale: null,
      dependsOn: [],
      externalRequirementIds: requirementIds([
        Object.freeze({ ...languageProfile }),
      ]),
    }),
  ];

  for (const episodeId of v1Plan.episodeIds) {
    const disposition = optionalStageDispositions.find(
      (candidate) => candidate.episodeId === episodeId,
    );
    if (!disposition) throw new Error("v2_canonical_plan_v2_internal_invalid");
    const outline = stageId(
      identity,
      requestFingerprint,
      "v2_episode_outline",
      episodeId,
    );
    const scene = stageId(
      identity,
      requestFingerprint,
      "v2_scene_set",
      episodeId,
    );
    const dialogue = stageId(
      identity,
      requestFingerprint,
      "v2_dialogue_script",
      episodeId,
    );
    const mission = stageId(
      identity,
      requestFingerprint,
      "v2_speaking_mission",
      episodeId,
    );
    const instances = stageId(
      identity,
      requestFingerprint,
      "v2_activity_instances",
      episodeId,
    );
    const voice = stageId(
      identity,
      voiceRequestFingerprint,
      "v2_voice_targets",
      episodeId,
    );
    const graph = stageId(
      identity,
      requestFingerprint,
      "v2_activity_graph",
      episodeId,
    );
    const assets = stageId(
      identity,
      voiceRequestFingerprint,
      "v2_asset_manifest",
      episodeId,
    );
    const localeNodes = V2_CANONICAL_INTERFACE_LOCALES.map((locale) =>
      stageId(
        identity,
        requestFingerprint,
        "v2_localization",
        episodeId,
        locale,
      ),
    );
    const preview = stageId(
      identity,
      voiceRequestFingerprint,
      "v2_preview_receipt",
      episodeId,
    );
    const bundle = stageId(
      identity,
      voiceRequestFingerprint,
      "v2_episode_bundle",
      episodeId,
    );
    nodes.push(
      immutableNode({
        stageId: outline,
        kind: "v2_episode_outline",
        episodeId,
        locale: null,
        dependsOn: [seasonOutline],
        externalRequirementIds: [],
      }),
      immutableNode({
        stageId: scene,
        kind: "v2_scene_set",
        episodeId,
        locale: null,
        dependsOn: [outline],
        externalRequirementIds: [],
      }),
    );
    if (disposition.dialogue === "required") {
      nodes.push(
        immutableNode({
          stageId: dialogue,
          kind: "v2_dialogue_script",
          episodeId,
          locale: null,
          dependsOn: [outline],
          externalRequirementIds: [],
        }),
      );
    }
    if (disposition.speakingMission === "required") {
      nodes.push(
        immutableNode({
          stageId: mission,
          kind: "v2_speaking_mission",
          episodeId,
          locale: null,
          dependsOn: [outline],
          externalRequirementIds: [],
        }),
      );
    }
    const instanceDependencies = [outline, scene];
    const voiceDependencies = [scene];
    if (disposition.dialogue === "required") {
      instanceDependencies.push(dialogue);
      voiceDependencies.push(dialogue);
    }
    if (disposition.speakingMission === "required") {
      instanceDependencies.push(mission);
      voiceDependencies.push(mission);
    }
    nodes.push(
      immutableNode({
        stageId: instances,
        kind: "v2_activity_instances",
        episodeId,
        locale: null,
        dependsOn: instanceDependencies,
        externalRequirementIds: requirementIds(
          templatesByEpisode.get(episodeId) ?? [],
        ),
      }),
    );
    voiceDependencies.push(instances);
    nodes.push(
      immutableNode({
        stageId: voice,
        kind: "v2_voice_targets",
        episodeId,
        locale: null,
        dependsOn: voiceDependencies,
        externalRequirementIds: requirementIds([
          Object.freeze({ ...languageProfile }),
          Object.freeze({
            dependencyType: "speech_profile" as const,
            profileId: trusted.speechProfileRef.profileId,
            version: trusted.speechProfileRef.version,
            contentHash: trusted.speechProfileRef.contentHash,
          }),
          Object.freeze({
            dependencyType: "voice_generation_profile" as const,
            profileId: trusted.voiceGenerationProfileRef.profileId,
            version: trusted.voiceGenerationProfileRef.version,
            contentHash: trusted.voiceGenerationProfileRef.contentHash,
          }),
        ]),
      }),
      immutableNode({
        stageId: graph,
        kind: "v2_activity_graph",
        episodeId,
        locale: null,
        dependsOn: [instances],
        externalRequirementIds: [],
      }),
      immutableNode({
        stageId: assets,
        kind: "v2_asset_manifest",
        episodeId,
        locale: null,
        dependsOn: [graph, voice],
        externalRequirementIds: [],
      }),
    );
    V2_CANONICAL_INTERFACE_LOCALES.forEach((locale, index) => {
      nodes.push(
        immutableNode({
          stageId: localeNodes[index],
          kind: "v2_localization",
          episodeId,
          locale,
          dependsOn: [instances, graph],
          externalRequirementIds: [],
        }),
      );
    });
    nodes.push(
      immutableNode({
        stageId: preview,
        kind: "v2_preview_receipt",
        episodeId,
        locale: null,
        dependsOn: [assets, ...localeNodes],
        externalRequirementIds: [],
      }),
      immutableNode({
        stageId: bundle,
        kind: "v2_episode_bundle",
        episodeId,
        locale: null,
        dependsOn: [preview],
        externalRequirementIds: [],
      }),
    );
  }

  nodes.push(
    immutableNode({
      stageId: stageId(identity, voiceRequestFingerprint, "v2_season_qa"),
      kind: "v2_season_qa",
      episodeId: null,
      locale: null,
      dependsOn: v1Plan.episodeIds.map((episodeId) =>
        stageId(
          identity,
          voiceRequestFingerprint,
          "v2_episode_bundle",
          episodeId,
        ),
      ),
      externalRequirementIds: [],
    }),
  );
  if (nodes.some((node) => !V2_CANONICAL_STAGE_KINDS.includes(node.kind))) {
    throw new Error("v2_canonical_plan_v2_internal_invalid");
  }
  const body = Object.freeze({
    schemaVersion: "v2-canonical-season-plan.v2" as const,
    compilerVersion: "v2-canonical-plan-compiler.v2" as const,
    coordinateSchemaVersion: "v2-stage-coordinate.v2" as const,
    ...identity,
    scope: v1Plan.scope,
    targetLanguage: v1Plan.targetLanguage,
    decisionRegistryRef: v1Plan.decisionRegistryRef,
    episodeIds: v1Plan.episodeIds,
    optionalStageDispositions,
    courseContract: V2_OWNER_CURRENT_COURSE_CONTRACT,
    externalRequirementCatalog: Object.freeze(
      [...requirementCatalog.values()].sort((left, right) =>
        codePointCompare(left.requirementId, right.requirementId),
      ),
    ),
    stages: Object.freeze(nodes),
    executionAuthority: "none" as const,
    storageAuthority: "none" as const,
    humanReviewAuthority: "none" as const,
    specialistEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  const plan = Object.freeze({
    ...body,
    planFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(plan)) > V2_CANONICAL_PLAN_V2_MAX_BYTES
  ) {
    throw new Error("v2_canonical_plan_v2_too_large");
  }
  planHandles.add(plan);
  return plan;
}

export function isV2CanonicalSeasonPlanV2(
  value: unknown,
): value is V2CanonicalSeasonPlanV2 {
  return typeof value === "object" && value !== null && planHandles.has(value);
}
