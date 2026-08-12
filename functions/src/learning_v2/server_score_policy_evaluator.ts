import type { V2AttemptEventBody } from "../../../modules/learning-v2/contracts/attempt";
import type {
  ModeTemplateArtifactBody,
  PublishedModeTemplateRef,
  V2ActivityInstance,
  VersionedPolicyRef,
} from "../../../modules/learning-v2/contracts/activity";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  resolveServerScore,
  type ServerScoreEvaluator,
  type ServerScoreResolution,
} from "./server_score_resolver";

/**
 * The runtime has descriptors for policies, but descriptors do not contain an
 * executable scoring formula. Functions must therefore receive a code-owned
 * evaluator for the exact policy ref; missing entries fail closed. The
 * attempt's resultCode is only an input hint here: a production evaluator
 * must derive its verdict from trusted evidence and may not award stars
 * merely because a client labelled the attempt CORRECT.
 */
export interface ScoringPolicyCatalog {
  resolve(ref: VersionedPolicyRef<"scoring">):
    | ServerScoreEvaluator
    | undefined
    | Promise<ServerScoreEvaluator | undefined>;
}

export interface ModeTemplateArtifactReader {
  read(ref: PublishedModeTemplateRef):
    | { readonly body: unknown }
    | undefined
    | Promise<{ readonly body: unknown } | undefined>;
}

export interface PinnedScoringContext {
  readonly activityId: string;
  readonly activityTypeKey: string;
  readonly progressCompatibilityKey: string;
  readonly starSlotId: string;
  readonly templateRef: PublishedModeTemplateRef;
  readonly scoringPolicyRef: VersionedPolicyRef<"scoring">;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isSafeId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(value);
const isHash = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const isPolicyRef = (value: unknown): value is VersionedPolicyRef<"scoring"> =>
  isRecord(value) &&
  Object.keys(value).length === 4 &&
  value.kind === "scoring" &&
  isSafeId(value.key) &&
  Number.isSafeInteger(value.version) &&
  Number(value.version) >= 1 &&
  isHash(value.contentHash);
const isTemplateRef = (value: unknown): value is PublishedModeTemplateRef =>
  isRecord(value) &&
  Object.keys(value).length === 3 &&
  isSafeId(value.templateId) &&
  Number.isSafeInteger(value.version) &&
  Number(value.version) >= 1 &&
  isHash(value.contentHash);

const exactRef = (left: PublishedModeTemplateRef, right: PublishedModeTemplateRef): boolean =>
  left.templateId === right.templateId &&
  left.version === right.version &&
  left.contentHash === right.contentHash;

const readActivities = (body: unknown): readonly V2ActivityInstance[] => {
  if (!isRecord(body)) {
    throw new Error("v2_server_score_episode_activities_missing");
  }
  // Canonical authoring artifacts call this collection `activityInstances`;
  // the older fixture/runtime envelope used `activities`. Accept both only at
  // this server-side adapter boundary, never from client request fields.
  const activities = Array.isArray(body.activityInstances) ? body.activityInstances : body.activities;
  if (!Array.isArray(activities)) throw new Error("v2_server_score_episode_activities_missing");
  return activities as readonly V2ActivityInstance[];
};

/**
 * Resolve the activity, star slot and scoring policy from the already pinned
 * immutable Episode artifact.  Client-supplied activity/slot/policy data is
 * never used as a source of truth.
 */
export async function resolvePinnedScoringContext(
  episodeRevision: { readonly body: unknown },
  input: {
    readonly activityId: string;
    readonly starSlotId: string;
    readonly progressCompatibilityKey: string;
  },
  templates: ModeTemplateArtifactReader,
): Promise<PinnedScoringContext> {
  if (!isSafeId(input.activityId) || !isSafeId(input.starSlotId) || !input.progressCompatibilityKey.trim()) {
    throw new Error("v2_server_score_context_identity_invalid");
  }
  const activities = readActivities(episodeRevision.body);
  const activity = activities.find((candidate) => candidate && candidate.activityId === input.activityId);
  if (!activity || activity.progressCompatibilityKey !== input.progressCompatibilityKey || !isTemplateRef(activity.templateRef)) {
    throw new Error("v2_server_score_activity_not_pinned");
  }
  const body = episodeRevision.body;
  if (!isRecord(body) || !Array.isArray(body.starSlots) || !isRecord(body.graph)) {
    throw new Error("v2_server_score_episode_graph_missing");
  }
  const slot = body.starSlots.find((candidate) => isRecord(candidate) && candidate.starSlotId === input.starSlotId);
  if (!isRecord(slot) || !Array.isArray(slot.acceptedNodeIds)) {
    throw new Error("v2_server_score_star_slot_not_pinned");
  }
  const nodes = Array.isArray(body.graph.nodes) ? body.graph.nodes : undefined;
  if (!nodes || !nodes.some((node) => isRecord(node) && node.activityId === input.activityId && node.starSlotId === input.starSlotId && (slot.acceptedNodeIds as unknown[]).includes(node.nodeId))) {
    throw new Error("v2_server_score_activity_slot_mismatch");
  }
  const template = await templates.read(activity.templateRef);
  if (!template || !isRecord(template.body)) throw new Error("v2_server_score_template_missing");
  const templateBody = template.body as Partial<ModeTemplateArtifactBody> & Record<string, unknown>;
  if (templateBody.templateId !== activity.templateRef.templateId || templateBody.version !== activity.templateRef.version || hashCanonicalBody(template.body) !== activity.templateRef.contentHash) {
    throw new Error("v2_server_score_template_mismatch");
  }
  const policies = templateBody.policies;
  if (!isRecord(policies) || !isPolicyRef(policies.scoring)) throw new Error("v2_server_score_policy_missing");
  return Object.freeze({
    activityId: activity.activityId,
    activityTypeKey: activity.activityTypeKey,
    progressCompatibilityKey: activity.progressCompatibilityKey,
    starSlotId: input.starSlotId,
    templateRef: activity.templateRef,
    scoringPolicyRef: policies.scoring,
  });
}

/** Resolve and evaluate only the exact scoring policy pinned by Episode data. */
export async function resolvePinnedServerScore(input: {
  readonly episodeRevision: { readonly body: unknown };
  readonly attemptRef: Parameters<typeof resolveServerScore>[0]["attemptRef"];
  readonly attemptBody: V2AttemptEventBody;
  /** Functions-derived outcome; required for any server-authoritative positive path. */
  readonly verifiedResultCode?: V2AttemptEventBody["outcome"]["resultCode"];
  readonly activityId: string;
  readonly starSlotId: string;
  readonly progressCompatibilityKey: string;
  readonly evidenceComponentFingerprint: string;
  readonly templates: ModeTemplateArtifactReader;
  readonly policies: ScoringPolicyCatalog;
}): Promise<ServerScoreResolution> {
  const context = await resolvePinnedScoringContext(input.episodeRevision, input, input.templates);
  const evaluate = await input.policies.resolve(context.scoringPolicyRef);
  if (!evaluate) throw new Error("v2_server_score_policy_missing");
  return resolveServerScore({
    attemptRef: input.attemptRef,
    activityId: context.activityId,
    starSlotId: context.starSlotId,
    progressCompatibilityKey: context.progressCompatibilityKey,
    scoringPolicyRef: context.scoringPolicyRef,
    resultCode: input.verifiedResultCode ?? input.attemptBody.outcome.resultCode,
    evidenceComponentFingerprint: input.evidenceComponentFingerprint,
  }, evaluate);
}
