import {
  createEpisodeDraft,
  mutateEpisodeDraft,
  validateEpisodeDraft,
  type EpisodeDraft,
} from "../../../modules/learning-v2/authoring/episode_draft";

export interface EpisodeDraftCreateInput {
  readonly draftId: string;
  readonly episodeId: string;
  readonly seasonId: string;
  readonly ordinal: number;
  readonly chapterId: string;
}

export class InMemoryEpisodeDraftRepository {
  private readonly drafts = new Map<string, EpisodeDraft>();

  create(input: EpisodeDraftCreateInput): EpisodeDraft {
    if (this.drafts.has(input.draftId))
      throw new Error("authoring_draft_id_duplicate");
    const draft = createEpisodeDraft(input);
    this.drafts.set(input.draftId, draft);
    return draft;
  }

  get(draftId: string): EpisodeDraft | undefined {
    return this.drafts.get(draftId);
  }

  save(
    current: EpisodeDraft,
    input: {
      readonly expectedRevision: number;
      readonly expectedFingerprint: string;
    },
  ): EpisodeDraft {
    const stored = this.drafts.get(current.body.draftId);
    if (
      !stored ||
      stored.record.revision !== input.expectedRevision ||
      stored.record.fingerprint !== input.expectedFingerprint
    )
      throw new Error("authoring_revision_stale");
    const issues = validateEpisodeDraft(current);
    if (issues.length)
      throw new Error(`episode_authoring_invalid:${issues[0]}`);
    const next = mutateEpisodeDraft(
      stored,
      input.expectedRevision,
      input.expectedFingerprint,
      () => current.body,
    );
    this.drafts.set(next.body.draftId, next);
    return next;
  }
}
