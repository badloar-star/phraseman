import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { validateEpisodeGraph } from "../../../modules/learning-v2/authoring/episode_graph";
import { V2_ACTIVITY_FAMILIES } from "../../../modules/learning-v2/contracts/activity";
import { sha256Utf8 } from "../../../modules/learning-v2/policies/decision_registry";
import { normalizeAuthoringEpisodeForSemantics } from "./episode_authoring_semantics";

export interface ImmutableEpisodeRevisionArtifact extends ApprovedEpisodeRevision {
  readonly body: unknown;
  readonly bodyHash: string;
  readonly objectPath: string;
  readonly objectGeneration: string;
  readonly record?: EpisodeRevisionRecord;
  readonly lifecycle?: EpisodeLifecycleHead;
}

export interface ImmutableEpisodeObjectRecord {
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
}

export interface EpisodeRevisionRecord {
  readonly schemaVersion: "episode-authoring-record.v1";
  readonly draftId: string;
  readonly episodeId: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly revisionFingerprint: string;
  readonly object: ImmutableEpisodeObjectRecord;
  readonly provenance: Record<string, unknown>;
  readonly createdAt: string;
}

export interface EpisodeLifecycleHead {
  readonly schemaVersion: "episode-lifecycle.v1";
  readonly draftId: string;
  readonly episodeId: string;
  readonly revision: number;
  readonly revisionFingerprint: string;
  readonly status:
    | "needs_review"
    | "changes_requested"
    | "approved"
    | "archived";
  readonly changedBy: string;
  readonly changedAt: string;
  readonly lifecycleRevision: number;
}

export function validateEpisodeLifecycleHead(value: unknown): value is EpisodeLifecycleHead {
  if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "draftId", "episodeId", "revision", "revisionFingerprint", "status", "changedBy", "changedAt", "lifecycleRevision"])) return false;
  return value.schemaVersion === "episode-lifecycle.v1" &&
    typeof value.draftId === "string" && value.draftId.length > 0 &&
    typeof value.episodeId === "string" && value.episodeId.length > 0 &&
    Number.isSafeInteger(value.revision) && Number(value.revision) >= 1 &&
    typeof value.revisionFingerprint === "string" && /^[a-f0-9]{64}$/.test(value.revisionFingerprint) &&
    ["needs_review", "changes_requested", "approved", "archived"].includes(String(value.status)) &&
    typeof value.changedBy === "string" && value.changedBy.length > 0 &&
    typeof value.changedAt === "string" && value.changedAt.length > 0 &&
    Number.isSafeInteger(value.lifecycleRevision) && Number(value.lifecycleRevision) >= 1;
}

export interface CanonicalEpisodeRevisionEnvelope {
  readonly body: unknown;
  readonly record: EpisodeRevisionRecord;
  readonly lifecycle: EpisodeLifecycleHead;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));

const hasOnlyKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
) => Object.keys(value).every((key) => keys.includes(key));

export function validateEpisodeRevisionEnvelope(
  value: unknown,
): value is CanonicalEpisodeRevisionEnvelope {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["body", "record", "lifecycle"]) ||
    !Object.prototype.hasOwnProperty.call(value, "body") ||
    !isRecord(value.record) ||
    !isRecord(value.lifecycle)
  )
    return false;
  const record = value.record;
  const lifecycle = value.lifecycle;
  if (
    !hasExactKeys(record, [
      "schemaVersion",
      "draftId",
      "episodeId",
      "revision",
      "contentHash",
      "revisionFingerprint",
      "object",
      "provenance",
      "createdAt",
    ]) ||
    record.schemaVersion !== "episode-authoring-record.v1" ||
    typeof record.draftId !== "string" ||
    record.draftId.length === 0 ||
    typeof record.episodeId !== "string" ||
    record.episodeId.length === 0 ||
    !Number.isSafeInteger(record.revision) ||
    Number(record.revision) < 1 ||
    typeof record.contentHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(record.contentHash) ||
    typeof record.revisionFingerprint !== "string" ||
    !/^[a-f0-9]{64}$/.test(record.revisionFingerprint) ||
    record.revisionFingerprint !==
      episodeRevisionFingerprint(
        record.draftId,
        Number(record.revision),
        record.contentHash,
      ) ||
    !isRecord(record.object) ||
    !isRecord(record.provenance) ||
    typeof record.createdAt !== "string" ||
    record.createdAt.length === 0
  )
    return false;
  if (
    !hasOnlyKeys(record.provenance, ["createdBy", "createdAt", "basedOn", "generator"])
  )
    return false;
  if (
    record.provenance.basedOn !== undefined &&
    (!isRecord(record.provenance.basedOn) ||
      !hasExactKeys(record.provenance.basedOn, [
        "entityType",
        "entityId",
        "versionOrRevision",
        "contentHash",
      ]) ||
      typeof record.provenance.basedOn.entityType !== "string" ||
      typeof record.provenance.basedOn.entityId !== "string" ||
      !Number.isSafeInteger(record.provenance.basedOn.versionOrRevision) ||
      typeof record.provenance.basedOn.contentHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(record.provenance.basedOn.contentHash))
  )
    return false;
  if (
    record.provenance.generator !== undefined &&
    (!isRecord(record.provenance.generator) ||
      !hasExactKeys(record.provenance.generator, [
        "stageId",
        "artifactId",
        "promptVersion",
        "schemaVersion",
      ]) ||
      typeof record.provenance.generator.stageId !== "string" ||
      typeof record.provenance.generator.artifactId !== "string" ||
      typeof record.provenance.generator.promptVersion !== "string" ||
      !Number.isSafeInteger(record.provenance.generator.schemaVersion))
  )
    return false;
  if (
    typeof record.provenance.createdBy !== "string" ||
    record.provenance.createdBy.length === 0 ||
    typeof record.provenance.createdAt !== "string" ||
    record.provenance.createdAt.length === 0
  )
    return false;
  const object = record.object;
  if (
    !hasExactKeys(object, [
      "objectPath",
      "contentHash",
      "objectGeneration",
      "byteSize",
    ]) ||
    typeof object.objectPath !== "string" ||
    object.objectPath !==
      episodeRevisionObjectPath(
        String(record.draftId),
        Number(record.revision),
        String(record.contentHash),
      ) ||
    typeof object.contentHash !== "string" ||
    object.contentHash !== record.contentHash ||
    typeof object.objectGeneration !== "string" ||
    object.objectGeneration.length === 0 ||
    typeof object.byteSize !== "number" ||
    !Number.isSafeInteger(object.byteSize) ||
    object.byteSize < 1
  )
    return false;
  if (
    !hasExactKeys(lifecycle, [
      "schemaVersion",
      "draftId",
      "episodeId",
      "revision",
      "revisionFingerprint",
      "status",
      "changedBy",
      "changedAt",
      "lifecycleRevision",
    ]) ||
    lifecycle.schemaVersion !== "episode-lifecycle.v1" ||
    lifecycle.draftId !== record.draftId ||
    lifecycle.episodeId !== record.episodeId ||
    lifecycle.revision !== record.revision ||
    lifecycle.revisionFingerprint !== record.revisionFingerprint ||
    !["needs_review", "changes_requested", "approved", "archived"].includes(
      String(lifecycle.status),
    ) ||
    typeof lifecycle.changedBy !== "string" ||
    typeof lifecycle.changedAt !== "string" ||
    typeof lifecycle.lifecycleRevision !== "number" ||
    !Number.isSafeInteger(lifecycle.lifecycleRevision) ||
    lifecycle.lifecycleRevision < 1
  )
    return false;
  return true;
}

/** Firestore's immutable revision index contains record+lifecycle only; body is Storage-only. */
export function validateEpisodeRevisionRecordEnvelope(
  value: unknown,
): value is Omit<CanonicalEpisodeRevisionEnvelope, "body"> {
  if (!isRecord(value) || Object.prototype.hasOwnProperty.call(value, "body"))
    return false;
  return validateEpisodeRevisionEnvelope({ body: undefined, ...value });
}

/** Strict immutable record-only index validation for the separate lifecycle projection. */
export function validateEpisodeRevisionRecordOnly(value: unknown): value is { readonly record: EpisodeRevisionRecord } {
  if (!isRecord(value) || !hasExactKeys(value, ["record"]) || !isRecord(value.record)) return false;
  const record = value.record;
  const syntheticLifecycle = {
    schemaVersion: "episode-lifecycle.v1",
    draftId: record.draftId,
    episodeId: record.episodeId,
    revision: record.revision,
    revisionFingerprint: record.revisionFingerprint,
    status: "needs_review",
    changedBy: "record-validator",
    changedAt: record.createdAt,
    lifecycleRevision: 1,
  };
  return validateEpisodeRevisionEnvelope({ body: undefined, record, lifecycle: syntheticLifecycle });
}

export type ImmutableEpisodeBodyValidator = (body: unknown) => boolean;

export const episodeRevisionObjectPath = (
  draftId: string,
  revision: number,
  contentHash: string,
): string =>
  `content-studio/episodes/${sha256Utf8(draftId)}/r${revision}/${contentHash}.json`;

export const episodeRevisionFingerprint = (
  draftId: string,
  revision: number,
  contentHash: string,
): string =>
  hashCanonicalBody({
    schemaVersion: "authoring-revision-fingerprint.v1",
    entityType: "episode",
    entityId: draftId,
    revision,
    contentHash,
  });

export function verifyCanonicalEpisodeObjectBytes(
  bytes: Uint8Array,
  expectedHash: string,
): unknown {
  let serialized: string;
  try {
    serialized = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("episode_object_utf8_invalid");
  }
  if (sha256Utf8(serialized) !== expectedHash)
    throw new Error("episode_object_bytes_hash_mismatch");
  let body: unknown;
  try {
    body = JSON.parse(serialized) as unknown;
  } catch {
    throw new Error("episode_object_json_invalid");
  }
  if (hashCanonicalBody(body) !== expectedHash)
    throw new Error("episode_object_canonical_hash_mismatch");
  return body;
}

const AUTHORING_BODY_KEYS = [
  "schemaVersion",
  "draftId",
  "episodeId",
  "revision",
  "seasonId",
  "ordinal",
  "chapterId",
  "studyTarget",
  "learnerSourceLocale",
  "title",
  "canDoOutcome",
  "scenario",
  "phraseFrames",
  "semanticSlots",
  "contentUnits",
  "activityInstances",
  "delayedProbeDefinitions",
  "graph",
  "starSlots",
  "requiredLoops",
  "assessmentNodes",
  "capstoneContract",
  "masteryContract",
  "learningDesign",
  "voiceGovernance",
  "reviewLinks",
  "minAppVersion",
] as const;
// These fields were added to the authoring projection after the original
// envelope shipped. They stay optional at the Storage-integrity layer so old
// immutable revisions remain readable; approval/release semantics require the
// complete canonical projection. sessionSetRef is consumed by release
// publication, so its shape is validated here whenever it is present.
const OPTIONAL_AUTHORING_BODY_KEYS = [
  "checkpointContract",
  "episodeKind",
  "estimatedMinutes",
  "objectiveIds",
  "skillIds",
  "criticalConstraints",
  "grammarDistinctionIds",
  "soundFocusIds",
  "assetIds",
  "accessibilityRoutes",
  "sessionSetRef",
] as const;

export function validateEpisodeLearningDesignShape(
  input: unknown,
): boolean {
  if (!isRecord(input)) return false;
  const required = [
    "primaryOutcomeId",
    "objectiveIds",
    "prerequisiteEdges",
    "supportPlan",
    "independentProbeRef",
    "delayedProbeRef",
    "delayedWindowPolicyId",
  ] as const;
  if (!hasExactKeys(input, required)) return false;
  if (
    typeof input.primaryOutcomeId !== "string" ||
    input.primaryOutcomeId.length === 0 ||
    !Array.isArray(input.objectiveIds) ||
    input.objectiveIds.length === 0 ||
    input.objectiveIds.some((id) => typeof id !== "string" || id.length === 0) ||
    typeof input.independentProbeRef !== "string" ||
    input.independentProbeRef.length === 0 ||
    typeof input.delayedWindowPolicyId !== "string" ||
    input.delayedWindowPolicyId.length === 0 ||
    !isRecord(input.delayedProbeRef) ||
    !hasExactKeys(input.delayedProbeRef, ["probeId", "contentHash"]) ||
    typeof input.delayedProbeRef.probeId !== "string" ||
    typeof input.delayedProbeRef.contentHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(input.delayedProbeRef.contentHash) ||
    !Array.isArray(input.prerequisiteEdges) ||
    !Array.isArray(input.supportPlan)
  )
    return false;
  for (const edge of input.prerequisiteEdges) {
    if (
      !isRecord(edge) ||
      !hasExactKeys(edge, ["from", "toObjectiveId", "requiredState"]) ||
      !isRecord(edge.from) ||
      !hasExactKeys(edge.from, ["kind", "id", "sourceEpisodeId"]) ||
      !["outcome", "objective"].includes(String(edge.from.kind)) ||
      typeof edge.from.id !== "string" ||
      typeof edge.from.sourceEpisodeId !== "string" ||
      typeof edge.toObjectiveId !== "string" ||
      !["exposed", "supported_success", "independent_evidence"].includes(
        String(edge.requiredState),
      )
    )
      return false;
  }
  for (const support of input.supportPlan) {
    if (
      !isRecord(support) ||
      !hasExactKeys(support, [
        "objectiveId",
        "initialSupport",
        "fadeRuleId",
        "escalationRuleId",
      ]) ||
      typeof support.objectiveId !== "string" ||
      !["model", "full_text", "partial_cue", "visual_only", "none"].includes(
        String(support.initialSupport),
      ) ||
      typeof support.fadeRuleId !== "string" ||
      typeof support.escalationRuleId !== "string"
    )
      return false;
  }
  return true;
}

export function validateEpisodeRevisionArtifactBody(body: unknown): boolean {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    return false;
  const value = body as Record<string, unknown>;
  const keys = Object.keys(value);
  const allowed: ReadonlySet<string> = new Set([
    ...AUTHORING_BODY_KEYS,
    ...OPTIONAL_AUTHORING_BODY_KEYS,
  ]);
  if (keys.some((key) => !allowed.has(key))) return false;
  if (
    AUTHORING_BODY_KEYS.some(
      (key) => !Object.prototype.hasOwnProperty.call(value, key),
    )
  )
    return false;
  if (
    value.schemaVersion !== "episode-authoring-body.v1" ||
    typeof value.draftId !== "string" ||
    typeof value.episodeId !== "string" ||
    typeof value.seasonId !== "string" ||
    typeof value.chapterId !== "string" ||
    typeof value.studyTarget !== "string" ||
    typeof value.learnerSourceLocale !== "string" ||
    typeof value.minAppVersion !== "string" ||
    !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 1 ||
    !Number.isSafeInteger(value.ordinal) ||
    (value.ordinal as number) < 1
  )
    return false;
  if (Object.prototype.hasOwnProperty.call(value, "sessionSetRef")) {
    const ref = value.sessionSetRef;
    if (
      !isRecord(ref) ||
      !hasExactKeys(ref, ["episodeId", "version", "contentHash"]) ||
      ref.episodeId !== value.episodeId ||
      !Number.isSafeInteger(ref.version) ||
      Number(ref.version) < 1 ||
      typeof ref.contentHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(ref.contentHash)
    )
      return false;
  }
  for (const key of [
    "title",
    "canDoOutcome",
    "phraseFrames",
    "semanticSlots",
    "activityInstances",
    "delayedProbeDefinitions",
    "starSlots",
    "reviewLinks",
  ]) {
    if (!Array.isArray(value[key])) return false;
  }
  for (const key of [
    "scenario",
    "contentUnits",
    "graph",
    "requiredLoops",
    "assessmentNodes",
    "capstoneContract",
    "masteryContract",
    "learningDesign",
    "voiceGovernance",
  ]) {
    if (
      typeof value[key] !== "object" ||
      value[key] === null ||
      Array.isArray(value[key])
    )
      return false;
  }
  const graph = value.graph as Record<string, unknown>;
  if (
    typeof graph.startNodeId !== "string" ||
    typeof graph.capstoneNodeId !== "string" ||
    !Array.isArray(graph.nodes) ||
    !Array.isArray(graph.edges) ||
    graph.nodes.length === 0
  )
    return false;
  const nodeKeys = new Set([
    "nodeId",
    "activityId",
    "position",
    "visible",
    "requiredForCore",
    "voiceEvidenceOptional",
    "phase",
    "evidenceDeclarations",
    "pedagogicalContextContract",
    "gateEligible",
    "maxStars",
    "starSlotId",
    "fallback",
    "transferFromNodeId",
    "variedSemanticSlotIds",
  ]);
  for (const node of graph.nodes) {
    if (typeof node !== "object" || node === null || Array.isArray(node))
      return false;
    const nodeValue = node as Record<string, unknown>;
    if (
      Object.keys(nodeValue).some((key) => !nodeKeys.has(key)) ||
      [
        "nodeId",
        "activityId",
        "phase",
        "evidenceDeclarations",
      ].some((key) => !(key in nodeValue)) ||
      typeof nodeValue.nodeId !== "string" ||
      typeof nodeValue.activityId !== "string" ||
      !Number.isSafeInteger(nodeValue.position) ||
      typeof nodeValue.visible !== "boolean" ||
      typeof nodeValue.requiredForCore !== "boolean" ||
      typeof nodeValue.voiceEvidenceOptional !== "boolean" ||
      typeof nodeValue.phase !== "string" ||
      !Array.isArray(nodeValue.evidenceDeclarations) ||
      typeof nodeValue.gateEligible !== "boolean" ||
      !Number.isSafeInteger(nodeValue.maxStars)
    )
      return false;
  }
  for (const edge of graph.edges) {
    if (
      typeof edge !== "object" ||
      edge === null ||
      Array.isArray(edge) ||
      Object.keys(edge as Record<string, unknown>).some(
        (key) => !["edgeId", "fromNodeId", "toNodeId", "condition"].includes(key),
      ) ||
      !["edgeId", "fromNodeId", "toNodeId", "condition"].every((key) =>
        Object.prototype.hasOwnProperty.call(edge, key),
      ) ||
      typeof (edge as Record<string, unknown>).edgeId !== "string" ||
      typeof (edge as Record<string, unknown>).fromNodeId !== "string" ||
      typeof (edge as Record<string, unknown>).toNodeId !== "string" ||
      ![
        "completed",
        "passed",
        "needs_reinforcement",
        "fallback_selected",
      ].includes(String((edge as Record<string, unknown>).condition))
    )
      return false;
  }
  const activityKeys = new Set([
    "activityId",
    "progressCompatibilityKey",
    "family",
    "activityTypeKey",
    "kernelVersion",
    "templateRef",
    "payloadSchemaVersion",
    "estimatedSeconds",
    "contentUnitIds",
    "assetIds",
    "capabilities",
    "requirements",
    "targets",
    "tags",
    "payload",
  ]);
  const plainRecord = (candidate: unknown): candidate is Record<string, unknown> =>
    typeof candidate === "object" &&
    candidate !== null &&
    !Array.isArray(candidate);
  const exactNestedKeys = (
    candidate: unknown,
    required: readonly string[],
  ): candidate is Record<string, unknown> =>
    plainRecord(candidate) &&
    Object.keys(candidate).every((key) => required.includes(key)) &&
    required.every((key) => Object.prototype.hasOwnProperty.call(candidate, key));
  const validateNormativeActivityBody = (
    item: Record<string, unknown>,
  ): boolean => {
    const required = [
      "schemaVersion",
      "activityId",
      "revision",
      "episodeId",
      "progressCompatibilityKey",
      "templateRef",
      "family",
      "estimatedSeconds",
      "payload",
      "payloadHash",
      "contentUnitIds",
      "overrides",
      "tags",
      "localization",
      "assets",
    ] as const;
    if (
      !exactNestedKeys(item, required) ||
      item.schemaVersion !== "v2-activity-instance-body.v1" ||
      typeof item.activityId !== "string" ||
      !Number.isSafeInteger(item.revision) ||
      Number(item.revision) < 1 ||
      item.episodeId !== value.episodeId ||
      typeof item.progressCompatibilityKey !== "string" ||
      !exactNestedKeys(item.templateRef, ["templateId", "version", "contentHash"]) ||
      typeof item.templateRef.templateId !== "string" ||
      item.templateRef.templateId.length === 0 ||
      !Number.isSafeInteger(item.templateRef.version) ||
      Number(item.templateRef.version) < 1 ||
      typeof item.templateRef.contentHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(item.templateRef.contentHash) ||
      !V2_ACTIVITY_FAMILIES.includes(item.family as never) ||
      typeof item.estimatedSeconds !== "number" ||
      !Number.isFinite(item.estimatedSeconds) ||
      item.estimatedSeconds <= 0 ||
      typeof item.payloadHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(item.payloadHash) ||
      hashCanonicalBody(item.payload) !== item.payloadHash ||
      !Array.isArray(item.contentUnitIds) ||
      item.contentUnitIds.some((id) => typeof id !== "string" || id.length === 0) ||
      !plainRecord(item.overrides) ||
      !exactNestedKeys(item.tags, [
        "skillIds",
        "grammar",
        "vocabulary",
        "scenario",
        "modalities",
      ]) ||
      !Array.isArray(item.tags.skillIds) ||
      !Array.isArray(item.tags.grammar) ||
      !Array.isArray(item.tags.vocabulary) ||
      !Array.isArray(item.tags.scenario) ||
      !Array.isArray(item.tags.modalities) ||
      [...item.tags.skillIds, ...item.tags.grammar, ...item.tags.vocabulary, ...item.tags.scenario].some(
        (id) => typeof id !== "string" || id.length === 0,
      ) ||
      item.tags.modalities.some(
        (modality) =>
          !["reading", "listening", "writing", "speaking"].includes(
            String(modality),
          ),
      ) ||
      !exactNestedKeys(item.localization, [
        "studyTarget",
        "learnerSourceLocale",
        "requiredLocales",
        "fieldSourceHashes",
      ]) ||
      item.localization.studyTarget !== value.studyTarget ||
      item.localization.learnerSourceLocale !== value.learnerSourceLocale ||
      !Array.isArray(item.localization.requiredLocales) ||
      item.localization.requiredLocales.some(
        (locale) => typeof locale !== "string" || locale.length === 0,
      ) ||
      !plainRecord(item.localization.fieldSourceHashes) ||
      Object.values(item.localization.fieldSourceHashes).some(
        (hash) => typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash),
      ) ||
      !Array.isArray(item.assets)
    )
      return false;
    for (const asset of item.assets) {
      if (
        !exactNestedKeys(asset, ["assetId", "role", "object", "rightsId"]) ||
        typeof asset.assetId !== "string" ||
        asset.assetId.length === 0 ||
        typeof asset.role !== "string" ||
        asset.role.length === 0 ||
        typeof asset.rightsId !== "string" ||
        asset.rightsId.length === 0 ||
        !exactNestedKeys(asset.object, [
          "objectPath",
          "contentHash",
          "objectGeneration",
          "byteSize",
        ]) ||
        typeof asset.object.objectPath !== "string" ||
        typeof asset.object.contentHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(asset.object.contentHash) ||
        typeof asset.object.objectGeneration !== "string" ||
        asset.object.objectGeneration.length === 0 ||
        !Number.isSafeInteger(asset.object.byteSize) ||
        Number(asset.object.byteSize) < 1
      )
        return false;
    }
    return true;
  };
  for (const activity of value.activityInstances as unknown[]) {
    if (
      typeof activity !== "object" ||
      activity === null ||
      Array.isArray(activity)
    )
      return false;
    const item = activity as Record<string, unknown>;
    if (!validateNormativeActivityBody(item)) return false;
  }
  for (const definition of value.delayedProbeDefinitions as unknown[]) {
    if (!plainRecord(definition) || !exactNestedKeys(definition, ["ref", "body"]))
      return false;
    const ref = definition.ref;
    const delayedBody = definition.body;
    if (
      !exactNestedKeys(ref, ["probeId", "contentHash"]) ||
      typeof ref.probeId !== "string" ||
      ref.probeId.length === 0 ||
      typeof ref.contentHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(ref.contentHash) ||
      !plainRecord(delayedBody) ||
      !Object.keys(delayedBody).every((key) =>
        [
          "schemaVersion",
          "probeId",
          "targetEpisodeId",
          "probeNodeId",
          "activityBinding",
          "evidenceDeclarations",
          "pedagogicalContextContract",
          "accessibilityAlternateActivityId",
        ].includes(key),
      ) ||
      ![
        "schemaVersion",
        "probeId",
        "targetEpisodeId",
        "probeNodeId",
        "activityBinding",
        "evidenceDeclarations",
        "pedagogicalContextContract",
      ].every((key) => Object.prototype.hasOwnProperty.call(delayedBody, key)) ||
      delayedBody.schemaVersion !== "v2-delayed-probe-definition.v1" ||
      delayedBody.probeId !== ref.probeId ||
      delayedBody.targetEpisodeId !== value.episodeId ||
      typeof delayedBody.probeNodeId !== "string" ||
      delayedBody.probeNodeId.length === 0 ||
      !plainRecord(delayedBody.activityBinding) ||
      !exactNestedKeys(delayedBody.activityBinding, [
        "activityId",
        "progressCompatibilityKey",
        "templateRef",
      ]) ||
      typeof delayedBody.activityBinding.activityId !== "string" ||
      typeof delayedBody.activityBinding.progressCompatibilityKey !== "string" ||
      !exactNestedKeys(delayedBody.activityBinding.templateRef, [
        "templateId",
        "version",
        "contentHash",
      ]) ||
      !Array.isArray(delayedBody.evidenceDeclarations) ||
      delayedBody.evidenceDeclarations.length === 0 ||
      !plainRecord(delayedBody.pedagogicalContextContract) ||
      (delayedBody.accessibilityAlternateActivityId !== undefined &&
        (typeof delayedBody.accessibilityAlternateActivityId !== "string" ||
          delayedBody.accessibilityAlternateActivityId.length === 0))
    )
      return false;
    for (const declaration of delayedBody.evidenceDeclarations) {
      if (!plainRecord(declaration) || declaration.phase !== "delayed_probe")
        return false;
    }
  }
  const graphIssues = validateEpisodeGraph({
    graph: graph as never,
    activities: value.activityInstances as never,
  });
  if (graphIssues.length > 0) return false;
  const requiredLoops = value.requiredLoops as Record<string, unknown>;
  if (
    !Array.isArray(requiredLoops.encounterBuildNodeIds) ||
    !Array.isArray(requiredLoops.nearTransferNodeIds)
  )
    return false;
  const assessmentNodes = value.assessmentNodes as Record<string, unknown>;
  if (!Array.isArray(assessmentNodes.independentProbeNodeIds)) return false;
  const capstone = value.capstoneContract as Record<string, unknown>;
  for (const key of [
    "objectiveIds",
    "requiredSemanticSlotIds",
    "criticalConstraintIds",
    "primaryNodeIds",
    "deterministicAlternateNodeIds",
  ]) {
    if (!Array.isArray(capstone[key])) return false;
  }
  const voiceGovernance = value.voiceGovernance as Record<string, unknown>;
  if (!Array.isArray(voiceGovernance.requirementsByTemplate)) return false;
  const mastery = value.masteryContract as Record<string, unknown>;
  if (!Array.isArray(mastery.requirements)) return false;
  if (!validateEpisodeLearningDesignShape(value.learningDesign)) return false;
  return true;
}

/** Approval-time semantic gate; deliberately separate from Storage integrity. */
export function validateEpisodeRevisionArtifactSemantics(body: unknown) {
  return normalizeAuthoringEpisodeForSemantics(body);
}

export interface ImmutableEpisodeRevisionResolver {
  resolve(
    ref: ApprovedEpisodeRevision,
    context?: ImmutableEpisodeRevisionReadContext,
  ): Promise<ImmutableEpisodeRevisionArtifact | undefined>;
  /** Explicit authoring/evidence read; may return needs_review or changes_requested artifacts. */
  readonly resolveForAuthoring?: (
    ref: ApprovedEpisodeRevision,
    context?: ImmutableEpisodeRevisionReadContext,
  ) => Promise<ImmutableEpisodeRevisionArtifact | undefined>;
  readonly validateBody?: ImmutableEpisodeBodyValidator;
  readonly resolveModeTemplate?: (
    ref: Record<string, unknown>,
    context?: ImmutableEpisodeRevisionReadContext,
  ) => Promise<{
    readonly templateRef: Record<string, unknown>;
    readonly allowedOverridePaths: readonly string[];
    /** Exact immutable body; runtime scoring may consume it after this resolver's hash/lifecycle checks. */
    readonly body?: unknown;
  } | undefined>;
}

export interface ImmutableEpisodeRevisionReadContext {
  get(path: string): Promise<{
    readonly exists: boolean;
    data(): unknown;
  }>;
}

export async function assertEpisodeModeTemplateOverrides(
  resolver: ImmutableEpisodeRevisionResolver,
  body: unknown,
  context?: ImmutableEpisodeRevisionReadContext,
): Promise<void> {
  if (!isRecord(body) || !Array.isArray(body.activityInstances))
    throw new Error("season_episode_activity_contract_invalid");
  for (const activity of body.activityInstances) {
    if (
      !isRecord(activity) ||
      activity.schemaVersion !== "v2-activity-instance-body.v1" ||
      !isRecord(activity.overrides) ||
      !isRecord(activity.templateRef)
    )
      throw new Error("season_episode_activity_contract_invalid");
    if (!resolver.resolveModeTemplate)
      throw new Error("season_episode_template_resolver_missing");
    const resolved = await resolver.resolveModeTemplate(activity.templateRef, context);
    if (
      !resolved ||
      resolved.templateRef.templateId !== activity.templateRef.templateId ||
      resolved.templateRef.version !== activity.templateRef.version ||
      resolved.templateRef.contentHash !== activity.templateRef.contentHash ||
      Object.keys(activity.overrides).some(
        (overridePath) => !resolved.allowedOverridePaths.includes(overridePath),
      )
    )
      throw new Error("season_episode_activity_override_not_allowed");
  }
}

export async function assertExactImmutableEpisodeRevision(
  resolver: ImmutableEpisodeRevisionResolver,
  ref: ApprovedEpisodeRevision,
  context?: ImmutableEpisodeRevisionReadContext,
): Promise<ImmutableEpisodeRevisionArtifact> {
  const artifact = await resolver.resolve(ref, context);
  if (
    !artifact ||
    artifact.approvalStatus !== "approved" ||
    artifact.draftId !== ref.draftId ||
    artifact.episodeId !== ref.episodeId ||
    artifact.revision !== ref.revision ||
    artifact.revisionFingerprint !== ref.revisionFingerprint ||
    artifact.contentHash !== ref.contentHash ||
    artifact.ordinal !== ref.ordinal ||
    artifact.chapterId !== ref.chapterId ||
    artifact.revisionFingerprint !==
      episodeRevisionFingerprint(ref.draftId, ref.revision, ref.contentHash) ||
    artifact.bodyHash !== ref.contentHash ||
    hashCanonicalBody(artifact.body) !== ref.contentHash ||
    !artifact.objectGeneration
  )
    throw new Error("season_episode_revision_not_approved_or_stale");
  if (
    !artifact.record ||
    !artifact.lifecycle ||
    !validateEpisodeRevisionEnvelope({
      body: artifact.body,
      record: artifact.record,
      lifecycle: artifact.lifecycle,
    })
  )
    throw new Error("season_episode_revision_envelope_invalid");
  if (
    artifact.objectPath !==
    episodeRevisionObjectPath(ref.draftId, ref.revision, ref.contentHash)
  )
    throw new Error("season_episode_object_path_invalid");
  const record = artifact.record;
  const lifecycle = artifact.lifecycle;
  if (
    record.draftId !== ref.draftId ||
    record.episodeId !== ref.episodeId ||
    record.revision !== ref.revision ||
    record.contentHash !== ref.contentHash ||
    record.revisionFingerprint !== ref.revisionFingerprint ||
    record.contentHash !== hashCanonicalBody(artifact.body) ||
    record.object.objectPath !== artifact.objectPath ||
    record.object.contentHash !== artifact.bodyHash ||
    record.object.objectGeneration !== artifact.objectGeneration ||
    lifecycle.draftId !== ref.draftId ||
    lifecycle.episodeId !== ref.episodeId ||
    lifecycle.revision !== ref.revision ||
    lifecycle.revisionFingerprint !== ref.revisionFingerprint ||
    lifecycle.status !== "approved"
  )
    throw new Error("season_episode_revision_envelope_mismatch");
  const body = artifact.body;
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    (body as Record<string, unknown>).draftId !== ref.draftId ||
    (body as Record<string, unknown>).episodeId !== ref.episodeId ||
    (body as Record<string, unknown>).revision !== ref.revision ||
    (body as Record<string, unknown>).ordinal !== ref.ordinal ||
    (body as Record<string, unknown>).chapterId !== ref.chapterId
  )
    throw new Error("season_episode_body_identity_mismatch");
  const bodyValidation = resolver.validateBody;
  if (!bodyValidation) return artifact;
  if (!bodyValidation(artifact.body))
    throw new Error("season_episode_body_contract_invalid");
  if (isRecord(body) && Array.isArray(body.activityInstances))
    await assertEpisodeModeTemplateOverrides(resolver, body, context);
  return artifact;
}
