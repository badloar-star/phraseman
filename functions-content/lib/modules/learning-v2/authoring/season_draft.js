"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSeasonImmutablePin = validateSeasonImmutablePin;
exports.assertSeasonImmutablePin = assertSeasonImmutablePin;
exports.createSeasonDraft = createSeasonDraft;
exports.materializeSeasonGates = materializeSeasonGates;
exports.validateSeasonComposition = validateSeasonComposition;
exports.pinApprovedEpisodeRevisions = pinApprovedEpisodeRevisions;
exports.replacePinnedEpisodeRevision = replacePinnedEpisodeRevision;
exports.reorderSeasonEpisode = reorderSeasonEpisode;
exports.assertSeasonEnvironmentEligible = assertSeasonEnvironmentEligible;
exports.resolveSeasonDecisionSettings = resolveSeasonDecisionSettings;
exports.cloneSeasonDraft = cloneSeasonDraft;
const gate_policy_1 = require("../progress/gate_policy");
const decision_registry_1 = require("../policies/decision_registry");
const requiredDecisionIds = [
    "HYP-V2-001",
    "HYP-V2-002",
    "HYP-V2-003",
    "HYP-V2-004",
    "HYP-V2-005",
    "HYP-V2-006",
    "HYP-V2-007",
    "HYP-V2-008",
];
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const hasExactKeys = (value, keys) => Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const makeFingerprint = (body, revision) => (0, decision_registry_1.hashCanonicalBody)({
    draftId: body.draftId,
    revision,
    contentHash: (0, decision_registry_1.hashCanonicalBody)(body),
});
const persist = (body, revision, status = "draft") => ({
    body,
    record: {
        schemaVersion: "season-draft-record.v1",
        draftId: body.draftId,
        seasonId: body.seasonId,
        revision,
        contentHash: (0, decision_registry_1.hashCanonicalBody)(body),
        fingerprint: makeFingerprint(body, revision),
        status,
    },
});
/**
 * Validates the immutable Season body/record pair used by a release pin.
 *
 * The mutable draft head is deliberately not accepted: only an approved or
 * released record whose identity, body hash and revision fingerprint all
 * recompute exactly may be considered an active immutable pin.
 */
function validateSeasonImmutablePin(value) {
    try {
        if (!isRecord(value) || !hasExactKeys(value, ["body", "record"]))
            return false;
        if (!isRecord(value.body) || !isRecord(value.record))
            return false;
        const body = value.body;
        const record = value.record;
        if (!hasExactKeys(body, [
            "schemaVersion",
            "draftId",
            "seasonId",
            "releaseScope",
            "episodeRevisionRefs",
            "chapters",
            "gates",
            "gatePolicyVersion",
            "decisionRegistryRef",
        ]) ||
            body.schemaVersion !== "season-draft-body.v1" ||
            typeof body.draftId !== "string" ||
            body.draftId.length === 0 ||
            typeof body.seasonId !== "string" ||
            body.seasonId.length === 0 ||
            typeof body.gatePolicyVersion !== "string" ||
            body.gatePolicyVersion.length === 0 ||
            !isRecord(body.releaseScope) ||
            !hasExactKeys(body.releaseScope, [
                "kind",
                "includedChapterOrdinals",
                "includedEpisodeOrdinals",
            ]) ||
            !["vertical_slice", "chapter_internal", "full_season"].includes(String(body.releaseScope.kind)) ||
            !Array.isArray(body.releaseScope.includedChapterOrdinals) ||
            !Array.isArray(body.releaseScope.includedEpisodeOrdinals) ||
            !body.releaseScope.includedChapterOrdinals.every((item) => Number.isSafeInteger(item)) ||
            !body.releaseScope.includedEpisodeOrdinals.every((item) => Number.isSafeInteger(item)) ||
            !Array.isArray(body.episodeRevisionRefs) ||
            !Array.isArray(body.chapters) ||
            !Array.isArray(body.gates) ||
            !isRecord(body.decisionRegistryRef) ||
            !hasExactKeys(body.decisionRegistryRef, ["id", "version", "contentHash"]) ||
            typeof body.decisionRegistryRef.id !== "string" ||
            body.decisionRegistryRef.id.length === 0 ||
            !Number.isSafeInteger(body.decisionRegistryRef.version) ||
            Number(body.decisionRegistryRef.version) < 1 ||
            typeof body.decisionRegistryRef.contentHash !== "string" ||
            !HASH_PATTERN.test(body.decisionRegistryRef.contentHash))
            return false;
        if (!body.episodeRevisionRefs.every((item) => {
            if (!isRecord(item))
                return false;
            return (hasExactKeys(item, [
                "draftId",
                "episodeId",
                "revision",
                "revisionFingerprint",
                "contentHash",
                "ordinal",
                "chapterId",
                "approvalStatus",
            ]) &&
                typeof item.draftId === "string" &&
                item.draftId.length > 0 &&
                typeof item.episodeId === "string" &&
                item.episodeId.length > 0 &&
                Number.isSafeInteger(item.revision) &&
                Number(item.revision) >= 1 &&
                typeof item.revisionFingerprint === "string" &&
                HASH_PATTERN.test(item.revisionFingerprint) &&
                typeof item.contentHash === "string" &&
                HASH_PATTERN.test(item.contentHash) &&
                Number.isSafeInteger(item.ordinal) &&
                Number(item.ordinal) >= 1 &&
                typeof item.chapterId === "string" &&
                item.chapterId.length > 0 &&
                item.approvalStatus === "approved");
        }))
            return false;
        if (!hasExactKeys(record, [
            "schemaVersion",
            "draftId",
            "seasonId",
            "revision",
            "contentHash",
            "fingerprint",
            "status",
        ]) ||
            record.schemaVersion !== "season-draft-record.v1" ||
            record.draftId !== body.draftId ||
            record.seasonId !== body.seasonId ||
            !Number.isSafeInteger(record.revision) ||
            Number(record.revision) < 1 ||
            typeof record.contentHash !== "string" ||
            !HASH_PATTERN.test(record.contentHash) ||
            record.contentHash !== (0, decision_registry_1.hashCanonicalBody)(body) ||
            typeof record.fingerprint !== "string" ||
            !HASH_PATTERN.test(record.fingerprint) ||
            record.fingerprint !==
                makeFingerprint(body, Number(record.revision)) ||
            !["approved", "released"].includes(String(record.status)))
            return false;
        return validateSeasonComposition({
            body: body,
            record: record,
        }).length === 0;
    }
    catch {
        return false;
    }
}
function assertSeasonImmutablePin(value) {
    if (!validateSeasonImmutablePin(value))
        throw new Error("season_immutable_pin_invalid");
}
const ordinalsFor = (scope) => scope === "vertical_slice"
    ? [1]
    : scope === "chapter_internal"
        ? Array.from({ length: 8 }, (_, index) => index + 1)
        : Array.from({ length: 32 }, (_, index) => index + 1);
const chaptersFor = (refs) => {
    const groups = new Map();
    for (const ref of refs) {
        const chapter = Math.ceil(ref.ordinal / 8);
        groups.set(chapter, [...(groups.get(chapter) ?? []), ref]);
    }
    return [...groups.entries()]
        .sort(([left], [right]) => left - right)
        .map(([ordinal, items]) => ({
        chapterId: `chapter-${String(ordinal).padStart(2, "0")}`,
        ordinal,
        episodeIds: items.map((item) => item.episodeId),
        checkpointEpisodeId: items.at(-1)?.episodeId ?? "",
    }));
};
function createSeasonDraft(input) {
    const body = {
        schemaVersion: "season-draft-body.v1",
        draftId: input.draftId,
        seasonId: input.seasonId,
        releaseScope: {
            kind: input.scope,
            includedChapterOrdinals: input.scope === "full_season" ? [1, 2, 3, 4] : [1],
            includedEpisodeOrdinals: ordinalsFor(input.scope),
        },
        episodeRevisionRefs: [],
        chapters: [],
        gates: [],
        gatePolicyVersion: input.gatePolicyVersion ?? "v2-gates-1",
        decisionRegistryRef: input.decisionRegistryRef ?? {
            id: "phraseman-v2-product-decisions",
            version: 1,
            contentHash: "",
        },
    };
    return persist(body, 1);
}
function materializeSeasonGates(refs, policy) {
    const version = typeof policy === "string" ? policy : policy.version;
    if (version !== "v2-gates-1")
        throw new Error("season_gate_policy_unknown");
    return refs.slice(1).map((ref, index) => ({
        gateId: `gate-ep-${String(ref.ordinal).padStart(2, "0")}`,
        targetEpisodeId: ref.episodeId,
        priorEpisodeId: refs[index]?.episodeId ??
            `ep-${String(ref.ordinal - 1).padStart(2, "0")}`,
        localEarnedMinimum: (0, gate_policy_1.localPerformanceMinimum)(ref.ordinal - 1),
        requiredCumulativeAccess: (0, gate_policy_1.episodeGateRequirement)(ref.ordinal),
        requiresPriorLoopsComplete: true,
        accessBoostPolicyKey: "HYP-V2-006",
    }));
}
function validateSeasonComposition(draft, refs = draft.body.episodeRevisionRefs) {
    const issues = [];
    const expected = ordinalsFor(draft.body.releaseScope.kind);
    if (refs.length !== expected.length ||
        refs.some((ref, index) => ref.ordinal !== expected[index]))
        issues.push("season_episode_ordinals_invalid");
    if (new Set(refs.map((ref) => ref.episodeId)).size !== refs.length)
        issues.push("season_episode_duplicate");
    if (refs.some((ref) => ref.approvalStatus !== "approved" ||
        !HASH_PATTERN.test(ref.contentHash) ||
        !ref.revisionFingerprint ||
        !ref.draftId ||
        !ref.episodeId ||
        !ref.chapterId ||
        !Number.isInteger(ref.revision) ||
        ref.revision < 1))
        issues.push("season_episode_revision_not_approved_or_stale");
    if (draft.body.releaseScope.kind === "full_season" &&
        draft.body.chapters.length !== 4)
        issues.push("season_chapter_composition_invalid");
    if (draft.body.releaseScope.kind === "full_season") {
        if (draft.body.releaseScope.includedChapterOrdinals.join(",") !== "1,2,3,4" ||
            draft.body.releaseScope.includedEpisodeOrdinals.join(",") !==
                expected.join(","))
            issues.push("season_scope_composition_invalid");
        if (draft.body.chapters.some((chapter, index) => chapter.ordinal !== index + 1 ||
            chapter.episodeIds.length !== 8 ||
            chapter.checkpointEpisodeId !== refs[(index + 1) * 8 - 1]?.episodeId))
            issues.push("season_checkpoint_invalid");
    }
    if (draft.body.releaseScope.kind === "chapter_internal" &&
        draft.body.chapters[0]?.checkpointEpisodeId !== refs[7]?.episodeId)
        issues.push("season_checkpoint_invalid");
    if (draft.body.gates.length !== Math.max(0, refs.length - 1))
        issues.push("season_gate_composition_invalid");
    if (JSON.stringify(draft.body.gates) !==
        JSON.stringify(materializeSeasonGates(refs, draft.body.gatePolicyVersion)))
        issues.push("season_gate_policy_mismatch");
    return issues;
}
function pinApprovedEpisodeRevisions(draft, refs, policyCatalog) {
    if (policyCatalog.resolveEpisodeRevision &&
        refs.some((ref) => !policyCatalog.resolveEpisodeRevision?.(ref)))
        throw new Error("season_episode_revision_not_approved_or_stale");
    const body = {
        ...draft.body,
        episodeRevisionRefs: refs.map((ref) => ({ ...ref })),
        chapters: chaptersFor(refs),
        gates: materializeSeasonGates(refs, policyCatalog),
    };
    const next = persist(body, draft.record.revision + 1);
    const issues = validateSeasonComposition(next);
    if (issues.length)
        throw new Error(issues[0]);
    return next;
}
function replacePinnedEpisodeRevision(draft, replacement) {
    const refs = draft.body.episodeRevisionRefs.map((ref) => ref.ordinal === replacement.ordinal ? replacement : ref);
    return pinApprovedEpisodeRevisions(draft, refs, {
        version: draft.body.gatePolicyVersion,
    });
}
function reorderSeasonEpisode(draft, orderedOrdinals) {
    const expected = ordinalsFor(draft.body.releaseScope.kind);
    if (orderedOrdinals.length !== expected.length ||
        new Set(orderedOrdinals).size !== expected.length ||
        orderedOrdinals.some((ordinal, index) => ordinal !== expected[index]))
        throw new Error("season_episode_reorder_invalid");
    return pinApprovedEpisodeRevisions(draft, orderedOrdinals
        .map((ordinal) => draft.body.episodeRevisionRefs.find((ref) => ref.ordinal === ordinal))
        .filter(Boolean), { version: draft.body.gatePolicyVersion });
}
function assertSeasonEnvironmentEligible(draft, environment, registry) {
    if (environment === "production" &&
        draft.body.releaseScope.kind !== "full_season")
        throw new Error("season_scope_not_production_eligible");
    const issues = validateSeasonComposition(draft);
    if (issues.length)
        throw new Error(issues[0]);
    if (environment === "production") {
        if (!registry)
            throw new Error("season_decision_registry_unresolved");
        resolveSeasonDecisionSettings(draft.body, registry);
    }
    if (draft.body.releaseScope.kind === "full_season" &&
        draft.body.episodeRevisionRefs.length !== 32)
        throw new Error("season_full_scope_incomplete");
}
function resolveSeasonDecisionSettings(body, registry) {
    const registryRef = registry.ref ??
        registry
            .record?.ref;
    if (!registryRef ||
        !body.decisionRegistryRef.contentHash ||
        body.decisionRegistryRef.id !== registryRef.id ||
        body.decisionRegistryRef.version !== registryRef.version ||
        (body.decisionRegistryRef.contentHash &&
            registryRef.contentHash &&
            body.decisionRegistryRef.contentHash !== registryRef.contentHash))
        throw new Error("season_decision_registry_incomplete_or_mismatched");
    if (registry.body &&
        registryRef.contentHash !== (0, decision_registry_1.hashCanonicalBody)(registry.body))
        throw new Error("season_decision_registry_incomplete_or_mismatched");
    const decisions = registry.body?.decisions;
    if (!decisions ||
        requiredDecisionIds.some((id) => !Object.prototype.hasOwnProperty.call(decisions, id)))
        throw new Error("season_decision_registry_incomplete_or_mismatched");
    return { decisionIds: requiredDecisionIds };
}
function cloneSeasonDraft(current, ids) {
    const body = {
        ...current.body,
        draftId: ids.draftId,
        seasonId: ids.seasonId,
        episodeRevisionRefs: current.body.episodeRevisionRefs.map((ref) => ({
            ...ref,
        })),
        chapters: current.body.chapters.map((chapter) => ({
            ...chapter,
            chapterId: `${ids.seasonId}-${chapter.chapterId}`,
        })),
        gates: current.body.gates.map((gate) => ({
            ...gate,
            gateId: `${ids.seasonId}-${gate.gateId}`,
        })),
    };
    return persist(body, 1, "draft");
}
//# sourceMappingURL=season_draft.js.map