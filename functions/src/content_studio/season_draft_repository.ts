import {
  createSeasonDraft,
  type SeasonDraft,
  type SeasonScope,
} from "../../../modules/learning-v2/authoring/season_draft";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

export interface SeasonDraftCreateInput {
  readonly draftId: string;
  readonly seasonId: string;
  readonly scope: SeasonScope;
}

export class InMemorySeasonDraftRepository {
  private readonly drafts = new Map<string, SeasonDraft>();

  create(input: SeasonDraftCreateInput): SeasonDraft {
    if (this.drafts.has(input.draftId))
      throw new Error("authoring_draft_id_duplicate");
    const draft = createSeasonDraft(input);
    this.drafts.set(input.draftId, draft);
    return draft;
  }

  get(draftId: string): SeasonDraft | undefined {
    return this.drafts.get(draftId);
  }

  save(
    current: SeasonDraft,
    input: {
      readonly expectedRevision: number;
      readonly expectedFingerprint: string;
    },
  ): SeasonDraft {
    const stored = this.drafts.get(current.body.draftId);
    if (
      !stored ||
      stored.record.revision !== input.expectedRevision ||
      stored.record.fingerprint !== input.expectedFingerprint
    )
      throw new Error("authoring_revision_stale");
    if (stored.record.status !== "draft")
      throw new Error("authoring_published_immutable");
    const next: SeasonDraft = {
      body: current.body,
      record: {
        ...current.record,
        revision: stored.record.revision + 1,
        contentHash: hashCanonicalBody(current.body),
        fingerprint: hashCanonicalBody({
          draftId: current.body.draftId,
          revision: stored.record.revision + 1,
          contentHash: hashCanonicalBody(current.body),
        }),
      },
    };
    this.drafts.set(next.body.draftId, next);
    return next;
  }
}
