"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreSeasonDraftRepository = void 0;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const season_draft_1 = require("../../../modules/learning-v2/authoring/season_draft");
const episode_revision_resolver_1 = require("./episode_revision_resolver");
class FirestoreSeasonDraftRepository {
    constructor(store, actor, resolver, decisionRegistryResolver) {
        this.store = store;
        this.actor = actor;
        this.resolver = resolver;
        this.decisionRegistryResolver = decisionRegistryResolver;
    }
    async save(id, candidate, expected) {
        return this.store.runTransaction(async (tx) => {
            const current = await tx.read(id);
            if (!current) {
                if (expected.expectedRevision !== 0 ||
                    expected.expectedFingerprint !== "")
                    throw new Error("authoring_head_missing");
                if (candidate.body.draftId !== id)
                    throw new Error("authoring_draft_id_mismatch");
                const createResolver = tx.episodeRevisionReadContext
                    ? {
                        ...this.resolver,
                        resolve: (ref) => this.resolver.resolve(ref, tx.episodeRevisionReadContext),
                        resolveModeTemplate: this.resolver.resolveModeTemplate
                            ? (ref) => this.resolver.resolveModeTemplate(ref, tx.episodeRevisionReadContext)
                            : undefined,
                    }
                    : this.resolver;
                for (const ref of candidate.body.episodeRevisionRefs) {
                    const artifact = await (0, episode_revision_resolver_1.assertExactImmutableEpisodeRevision)(createResolver, ref);
                    if (artifact.body.seasonId !==
                        candidate.body.seasonId)
                        throw new Error("season_episode_season_identity_mismatch");
                }
                if (candidate.body.releaseScope.kind === "full_season") {
                    const registry = await this.decisionRegistryResolver?.resolve(candidate.body.decisionRegistryRef, tx.decisionRegistryReadContext);
                    if (!registry)
                        throw new Error("season_decision_registry_unresolved");
                    (0, season_draft_1.resolveSeasonDecisionSettings)(candidate.body, registry);
                }
                const issues = (0, season_draft_1.validateSeasonComposition)(candidate);
                if (issues.length)
                    throw new Error(`season_authoring_invalid:${issues[0]}`);
                const contentHash = (0, decision_registry_1.hashCanonicalBody)(candidate.body);
                const next = {
                    body: candidate.body,
                    record: {
                        schemaVersion: "season-draft-record.v1",
                        draftId: candidate.body.draftId,
                        seasonId: candidate.body.seasonId,
                        revision: 1,
                        contentHash,
                        fingerprint: (0, decision_registry_1.hashCanonicalBody)({
                            draftId: candidate.body.draftId,
                            revision: 1,
                            contentHash,
                        }),
                        status: "draft",
                    },
                };
                if (!tx.createIfAbsent)
                    throw new Error("authoring_create_not_supported");
                await tx.createIfAbsent(id, {
                    ownerId: this.actor.ownerId,
                    draft: next,
                });
                return next;
            }
            if (current.ownerId !== this.actor.ownerId)
                throw new Error("authoring_owner_forbidden");
            if (candidate.body.draftId !== id)
                throw new Error("authoring_draft_id_mismatch");
            if (candidate.body.seasonId !== current?.draft.body.seasonId)
                throw new Error("authoring_identity_mismatch");
            if (current.draft.record.revision !== expected.expectedRevision ||
                current.draft.record.fingerprint !== expected.expectedFingerprint)
                throw new Error("authoring_revision_stale");
            const resolver = tx.episodeRevisionReadContext
                ? {
                    ...this.resolver,
                    resolve: (ref) => this.resolver.resolve(ref, tx.episodeRevisionReadContext),
                    resolveModeTemplate: this.resolver.resolveModeTemplate
                        ? (ref) => this.resolver.resolveModeTemplate(ref, tx.episodeRevisionReadContext)
                        : undefined,
                }
                : this.resolver;
            for (const ref of candidate.body.episodeRevisionRefs) {
                const artifact = await (0, episode_revision_resolver_1.assertExactImmutableEpisodeRevision)(resolver, ref);
                const body = artifact.body;
                if (body.seasonId !== candidate.body.seasonId)
                    throw new Error("season_episode_season_identity_mismatch");
            }
            if (candidate.body.releaseScope.kind === "full_season") {
                const registry = await this.decisionRegistryResolver?.resolve(candidate.body.decisionRegistryRef, tx.decisionRegistryReadContext);
                if (!registry)
                    throw new Error("season_decision_registry_unresolved");
                (0, season_draft_1.resolveSeasonDecisionSettings)(candidate.body, registry);
            }
            const issues = (0, season_draft_1.validateSeasonComposition)(candidate);
            if (issues.length)
                throw new Error(`season_authoring_invalid:${issues[0]}`);
            const contentHash = (0, decision_registry_1.hashCanonicalBody)(candidate.body);
            const revision = current.draft.record.revision + 1;
            const next = {
                body: candidate.body,
                record: {
                    schemaVersion: "season-draft-record.v1",
                    draftId: candidate.body.draftId,
                    seasonId: candidate.body.seasonId,
                    revision,
                    contentHash,
                    fingerprint: (0, decision_registry_1.hashCanonicalBody)({
                        draftId: candidate.body.draftId,
                        revision,
                        contentHash,
                    }),
                    status: "draft",
                },
            };
            await tx.compareAndSet(id, expected.expectedRevision, expected.expectedFingerprint, { ownerId: current.ownerId, draft: next });
            return next;
        });
    }
}
exports.FirestoreSeasonDraftRepository = FirestoreSeasonDraftRepository;
