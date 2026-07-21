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
            if (!current || current.ownerId !== this.actor.ownerId)
                throw new Error("authoring_owner_forbidden");
            if (candidate.body.draftId !== id)
                throw new Error("authoring_draft_id_mismatch");
            if (current.draft.record.revision !== expected.expectedRevision ||
                current.draft.record.fingerprint !== expected.expectedFingerprint)
                throw new Error("authoring_revision_stale");
            for (const ref of candidate.body.episodeRevisionRefs)
                await (0, episode_revision_resolver_1.assertExactImmutableEpisodeRevision)(this.resolver, ref);
            if (candidate.body.releaseScope.kind === "full_season") {
                const registry = await this.decisionRegistryResolver?.resolve(candidate.body.decisionRegistryRef);
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
                    ...candidate.record,
                    revision,
                    contentHash,
                    fingerprint: (0, decision_registry_1.hashCanonicalBody)({
                        draftId: candidate.body.draftId,
                        revision,
                        contentHash,
                    }),
                },
            };
            await tx.compareAndSet(id, expected.expectedRevision, expected.expectedFingerprint, { ownerId: current.ownerId, draft: next });
            return next;
        });
    }
}
exports.FirestoreSeasonDraftRepository = FirestoreSeasonDraftRepository;
//# sourceMappingURL=season_authoring_transaction_repository.js.map