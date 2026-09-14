export const FEEDBACK_COMMENT_MODES = ['all', 'with', 'without'] as const;
export type FeedbackCommentMode = (typeof FEEDBACK_COMMENT_MODES)[number];

export type AdminFeedbackFilters = {
  commentMode: FeedbackCommentMode;
  rating: number | null;
};

export type AdminFeedbackRow = {
  id?: string;
  rating: number;
  message: string;
};

export type AdminFeedbackStats = {
  total: number;
  ratedTotal: number;
  withComments: number;
  unrated: number;
  average: number | null;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

const FEEDBACK_ADMIN_PERIODS = new Set([0, 7, 30, 90]);

export function parseAdminFeedbackPeriod(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || !FEEDBACK_ADMIN_PERIODS.has(value)) {
    throw new Error('feedback_period_invalid');
  }
  return value;
}

export function parseAdminFeedbackFilters(input: Record<string, unknown>): AdminFeedbackFilters {
  const commentMode = input.commentMode ?? 'all';
  const rating = input.rating ?? null;

  if (typeof commentMode !== 'string'
    || !(FEEDBACK_COMMENT_MODES as readonly string[]).includes(commentMode)) {
    throw new Error('feedback_filter_invalid');
  }
  if (rating !== null
    && (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 0 || rating > 5)) {
    throw new Error('feedback_filter_invalid');
  }

  return {
    commentMode: commentMode as FeedbackCommentMode,
    rating: rating === null ? null : rating,
  };
}

export function matchesAdminFeedback(row: AdminFeedbackRow, filters: AdminFeedbackFilters): boolean {
  const hasComment = String(row.message || '').trim().length > 0;
  if (filters.commentMode === 'with' && !hasComment) return false;
  if (filters.commentMode === 'without' && hasComment) return false;
  return filters.rating === null || row.rating === filters.rating;
}

export async function collectFilteredFeedbackPage<T extends AdminFeedbackRow & { id: string }>(
  loadBatch: (cursor: string | null) => Promise<{ rows: T[]; exhausted: boolean }>,
  filters: AdminFeedbackFilters,
  limit: number,
  startCursor: string | null,
): Promise<{ items: T[]; nextCursor: string | null }> {
  const matches: T[] = [];
  let scanCursor = startCursor;
  let exhausted = false;

  while (matches.length < limit + 1 && !exhausted) {
    const page = await loadBatch(scanCursor);
    if (!page.rows.length) break;

    for (const row of page.rows) {
      scanCursor = row.id;
      if (matchesAdminFeedback(row, filters)) matches.push(row);
      if (matches.length >= limit + 1) break;
    }
    exhausted = page.exhausted;
  }

  const items = matches.slice(0, limit);
  return {
    items,
    nextCursor: matches.length > limit ? items[items.length - 1]?.id ?? null : null,
  };
}

export function aggregateAdminFeedback(
  rows: AdminFeedbackRow[],
  commentMode: FeedbackCommentMode,
): AdminFeedbackStats {
  const filtered = rows.filter((row) => matchesAdminFeedback(row, { commentMode, rating: null }));
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  let ratedTotal = 0;
  let withComments = 0;

  for (const row of filtered) {
    if (String(row.message || '').trim()) withComments += 1;
    if (row.rating >= 1 && row.rating <= 5) {
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] += 1;
      ratedTotal += 1;
      sum += row.rating;
    }
  }

  return {
    total: filtered.length,
    ratedTotal,
    withComments,
    unrated: filtered.length - ratedTotal,
    average: ratedTotal ? Number((sum / ratedTotal).toFixed(2)) : null,
    distribution,
  };
}
