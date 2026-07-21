"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePinnedScoringContext = resolvePinnedScoringContext;
exports.resolvePinnedServerScore = resolvePinnedServerScore;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const server_score_resolver_1 = require("./server_score_resolver");
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isSafeId = (value) => typeof value === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(value);
const isHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const isPolicyRef = (value) => isRecord(value) &&
    Object.keys(value).length === 4 &&
    value.kind === "scoring" &&
    isSafeId(value.key) &&
    Number.isSafeInteger(value.version) &&
    Number(value.version) >= 1 &&
    isHash(value.contentHash);
const isTemplateRef = (value) => isRecord(value) &&
    Object.keys(value).length === 3 &&
    isSafeId(value.templateId) &&
    Number.isSafeInteger(value.version) &&
    Number(value.version) >= 1 &&
    isHash(value.contentHash);
const exactRef = (left, right) => left.templateId === right.templateId &&
    left.version === right.version &&
    left.contentHash === right.contentHash;
const readActivities = (body) => {
    if (!isRecord(body)) {
        throw new Error("v2_server_score_episode_activities_missing");
    }
    // Canonical authoring artifacts call this collection `activityInstances`;
    // the older fixture/runtime envelope used `activities`. Accept both only at
    // this server-side adapter boundary, never from client request fields.
    const activities = Array.isArray(body.activityInstances) ? body.activityInstances : body.activities;
    if (!Array.isArray(activities))
        throw new Error("v2_server_score_episode_activities_missing");
    return activities;
};
/**
 * Resolve the activity, star slot and scoring policy from the already pinned
 * immutable Episode artifact.  Client-supplied activity/slot/policy data is
 * never used as a source of truth.
 */
async function resolvePinnedScoringContext(episodeRevision, input, templates) {
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
    if (!nodes || !nodes.some((node) => isRecord(node) && node.activityId === input.activityId && node.starSlotId === input.starSlotId && slot.acceptedNodeIds.includes(node.nodeId))) {
        throw new Error("v2_server_score_activity_slot_mismatch");
    }
    const template = await templates.read(activity.templateRef);
    if (!template || !isRecord(template.body))
        throw new Error("v2_server_score_template_missing");
    const templateBody = template.body;
    if (templateBody.templateId !== activity.templateRef.templateId || templateBody.version !== activity.templateRef.version || (0, decision_registry_1.hashCanonicalBody)(template.body) !== activity.templateRef.contentHash) {
        throw new Error("v2_server_score_template_mismatch");
    }
    const policies = templateBody.policies;
    if (!isRecord(policies) || !isPolicyRef(policies.scoring))
        throw new Error("v2_server_score_policy_missing");
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
async function resolvePinnedServerScore(input) {
    const context = await resolvePinnedScoringContext(input.episodeRevision, input, input.templates);
    const evaluate = await input.policies.resolve(context.scoringPolicyRef);
    if (!evaluate)
        throw new Error("v2_server_score_policy_missing");
    return (0, server_score_resolver_1.resolveServerScore)({
        attemptRef: input.attemptRef,
        activityId: context.activityId,
        starSlotId: context.starSlotId,
        progressCompatibilityKey: context.progressCompatibilityKey,
        scoringPolicyRef: context.scoringPolicyRef,
        resultCode: input.attemptBody.outcome.resultCode,
        evidenceComponentFingerprint: input.evidenceComponentFingerprint,
    }, evaluate);
}
