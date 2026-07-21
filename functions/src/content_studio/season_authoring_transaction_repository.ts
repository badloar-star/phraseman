import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  resolveSeasonDecisionSettings,
  validateSeasonComposition,
  type SeasonDraft,
} from "../../../modules/learning-v2/authoring/season_draft";
import type { DecisionRegistryRecord } from "../../../modules/learning-v2/policies/decision_registry";
import {
  assertExactImmutableEpisodeRevision,
  type ImmutableEpisodeRevisionResolver,
} from "./episode_revision_resolver";

export interface SeasonAuthoringTransactionStore {
  runTransaction<T>(
    work: (tx: SeasonAuthoringTransactionStore) => Promise<T>,
  ): Promise<T>;
  read(
    id: string,
  ): Promise<
    { readonly ownerId: string; readonly draft: SeasonDraft } | undefined
  >;
  compareAndSet(
    id: string,
    expectedRevision: number,
    expectedFingerprint: string,
    value: { readonly ownerId: string; readonly draft: SeasonDraft },
  ): Promise<void>;
}

export interface DecisionRegistryResolver {
  resolve(ref: SeasonDraft["body"]["decisionRegistryRef"]): Promise<
    | (DecisionRegistryRecord & {
        readonly body?: { readonly decisions?: Record<string, unknown> };
      })
    | undefined
  >;
}

export class FirestoreSeasonDraftRepository {
  constructor(
    private readonly store: SeasonAuthoringTransactionStore,
    private readonly actor: { readonly ownerId: string },
    private readonly resolver: ImmutableEpisodeRevisionResolver,
    private readonly decisionRegistryResolver?: DecisionRegistryResolver,
  ) {}

  async save(
    id: string,
    candidate: SeasonDraft,
    expected: {
      readonly expectedRevision: number;
      readonly expectedFingerprint: string;
    },
  ): Promise<SeasonDraft> {
    return this.store.runTransaction(async (tx) => {
      const current = await tx.read(id);
      if (!current || current.ownerId !== this.actor.ownerId)
        throw new Error("authoring_owner_forbidden");
      if (candidate.body.draftId !== id)
        throw new Error("authoring_draft_id_mismatch");
      if (
        current.draft.record.revision !== expected.expectedRevision ||
        current.draft.record.fingerprint !== expected.expectedFingerprint
      )
        throw new Error("authoring_revision_stale");
      for (const ref of candidate.body.episodeRevisionRefs)
        await assertExactImmutableEpisodeRevision(this.resolver, ref);
      if (candidate.body.releaseScope.kind === "full_season") {
        const registry = await this.decisionRegistryResolver?.resolve(
          candidate.body.decisionRegistryRef,
        );
        if (!registry) throw new Error("season_decision_registry_unresolved");
        resolveSeasonDecisionSettings(candidate.body, registry);
      }
      const issues = validateSeasonComposition(candidate);
      if (issues.length)
        throw new Error(`season_authoring_invalid:${issues[0]}`);
      const contentHash = hashCanonicalBody(candidate.body);
      const revision = current.draft.record.revision + 1;
      const next: SeasonDraft = {
        body: candidate.body,
        record: {
          ...candidate.record,
          revision,
          contentHash,
          fingerprint: hashCanonicalBody({
            draftId: candidate.body.draftId,
            revision,
            contentHash,
          }),
        },
      };
      await tx.compareAndSet(
        id,
        expected.expectedRevision,
        expected.expectedFingerprint,
        { ownerId: current.ownerId, draft: next },
      );
      return next;
    });
  }
}
