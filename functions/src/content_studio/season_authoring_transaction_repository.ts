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
  type ImmutableEpisodeRevisionReadContext,
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
  createIfAbsent?(
    id: string,
    value: { readonly ownerId: string; readonly draft: SeasonDraft },
  ): Promise<void>;
  readonly episodeRevisionReadContext?: ImmutableEpisodeRevisionReadContext;
  readonly decisionRegistryReadContext?: DecisionRegistryReadContext;
}

export interface DecisionRegistryReadContext {
  get(path: string): Promise<{ readonly exists: boolean; data(): unknown }>;
}

export interface DecisionRegistryResolver {
  resolve(
    ref: SeasonDraft["body"]["decisionRegistryRef"],
    context?: DecisionRegistryReadContext,
  ): Promise<
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
      if (!current) {
        if (
          expected.expectedRevision !== 0 ||
          expected.expectedFingerprint !== ""
        )
          throw new Error("authoring_head_missing");
        if (candidate.body.draftId !== id)
          throw new Error("authoring_draft_id_mismatch");
        const createResolver = tx.episodeRevisionReadContext
          ? {
              ...this.resolver,
              resolve: (
                ref: Parameters<ImmutableEpisodeRevisionResolver["resolve"]>[0],
                ) => this.resolver.resolve(ref, tx.episodeRevisionReadContext),
              resolveModeTemplate: this.resolver.resolveModeTemplate
                ? (ref: Record<string, unknown>) => this.resolver.resolveModeTemplate!(ref, tx.episodeRevisionReadContext)
                : undefined,
            }
          : this.resolver;
        for (const ref of candidate.body.episodeRevisionRefs) {
          const artifact = await assertExactImmutableEpisodeRevision(
            createResolver,
            ref,
          );
          if (
            (artifact.body as Record<string, unknown>).seasonId !==
            candidate.body.seasonId
          )
            throw new Error("season_episode_season_identity_mismatch");
        }
        if (candidate.body.releaseScope.kind === "full_season") {
          const registry = await this.decisionRegistryResolver?.resolve(
            candidate.body.decisionRegistryRef,
            tx.decisionRegistryReadContext,
          );
          if (!registry) throw new Error("season_decision_registry_unresolved");
          resolveSeasonDecisionSettings(candidate.body, registry);
        }
        const issues = validateSeasonComposition(candidate);
        if (issues.length)
          throw new Error(`season_authoring_invalid:${issues[0]}`);
        const contentHash = hashCanonicalBody(candidate.body);
        const next: SeasonDraft = {
          body: candidate.body,
          record: {
            schemaVersion: "season-draft-record.v1",
            draftId: candidate.body.draftId,
            seasonId: candidate.body.seasonId,
            revision: 1,
            contentHash,
            fingerprint: hashCanonicalBody({
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
      if (
        current.draft.record.revision !== expected.expectedRevision ||
        current.draft.record.fingerprint !== expected.expectedFingerprint
      )
        throw new Error("authoring_revision_stale");
      const resolver = tx.episodeRevisionReadContext
        ? {
            ...this.resolver,
            resolve: (
              ref: Parameters<ImmutableEpisodeRevisionResolver["resolve"]>[0],
              ) => this.resolver.resolve(ref, tx.episodeRevisionReadContext),
            resolveModeTemplate: this.resolver.resolveModeTemplate
              ? (ref: Record<string, unknown>) => this.resolver.resolveModeTemplate!(ref, tx.episodeRevisionReadContext)
              : undefined,
          }
        : this.resolver;
      for (const ref of candidate.body.episodeRevisionRefs) {
        const artifact = await assertExactImmutableEpisodeRevision(
          resolver,
          ref,
        );
        const body = artifact.body as Record<string, unknown>;
        if (body.seasonId !== candidate.body.seasonId)
          throw new Error("season_episode_season_identity_mismatch");
      }
      if (candidate.body.releaseScope.kind === "full_season") {
        const registry = await this.decisionRegistryResolver?.resolve(
          candidate.body.decisionRegistryRef,
          tx.decisionRegistryReadContext,
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
          schemaVersion: "season-draft-record.v1",
          draftId: candidate.body.draftId,
          seasonId: candidate.body.seasonId,
          revision,
          contentHash,
          fingerprint: hashCanonicalBody({
            draftId: candidate.body.draftId,
            revision,
            contentHash,
          }),
          status: "draft",
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
