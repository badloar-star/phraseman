export type IdeaTab = 'top' | 'new';

export type PublicIdea = {
  id: string;
  title: string;
  description: string;
  /** Legacy ideas may not have a benefit field; new details include it. */
  benefit?: string;
  /** Present on newer records; legacy public responses may omit it. */
  lang?: string;
  authorUid: string;
  authorName: string;
  category: string;
  likeCount: number;
  createdAtMs: number;
  status: 'published' | 'approved' | 'in_progress' | 'implemented';
};

export type IdeaPage = {
  ok: boolean;
  tab: IdeaTab;
  ideas: PublicIdea[];
  nextCursor: string | null;
};

export type IdeaClientErrorCode = 'offline' | 'not-found' | 'rate-limited' | 'permission-denied' | 'idea-restricted' | 'service-unavailable' | 'unknown';

export type IdeaLikeResult = {
  ok: boolean;
  liked?: boolean;
  removed?: boolean;
  ideaId: string;
  likeCount: number;
  authorLikeTotal: number;
  idempotentReplay?: boolean;
};

export type IdeaReportReason = 'inappropriate' | 'spam' | 'personal_data' | 'other';

export type IdeaReportResult = {
  ok: boolean;
  ideaId: string;
  reportCount: number;
  alreadyReported?: boolean;
  autoHidden?: boolean;
};
