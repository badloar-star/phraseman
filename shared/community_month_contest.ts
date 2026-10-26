/** Owner-approved contest, 26 October 2026. Shared by native UI and server. */
export type ContestMonth = Readonly<{ id: string; startMs: number; endMs: number }>;
export type ContestEntry = Readonly<{
  id: string; authorId: string; title: string; hearts: number;
  publishedAtMs: number; status: string; hasWonPrize?: boolean; myMonthHeart?: boolean;
}>;
export type ContestPrize = Readonly<{ kind: 'plus'; months: 3 }> | Readonly<{ kind: 'coins'; amount: 2000 | 1000 }>;
export const COMMUNITY_CONTEST_RULE_VERSION = 'community-month.v2';
export const COMMUNITY_CONTEST_FIRST_MONTH = '2026-11';

/** The launch is fixed, never recomputed as "next month" on each app open. */
export function communityContestSchedule(nowMs: number): Readonly<{ phase: 'upcoming' | 'active'; monthId: string; days: number }> {
  const month = contestMonth(nowMs);
  const upcoming = month.id < COMMUNITY_CONTEST_FIRST_MONTH;
  const targetMs = upcoming ? Date.UTC(2026, 10, 1) : month.endMs;
  return { phase: upcoming ? 'upcoming' : 'active', monthId: upcoming ? COMMUNITY_CONTEST_FIRST_MONTH : month.id, days: Math.max(1, Math.ceil((targetMs - nowMs) / 86400000)) };
}

export function contestMonth(nowMs: number): ContestMonth {
  if (!Number.isFinite(nowMs)) throw new Error('Invalid contest date');
  const date = new Date(nowMs);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return { id: `${year}-${String(month + 1).padStart(2, '0')}`, startMs: Date.UTC(year, month, 1), endMs: Date.UTC(year, month + 1, 1) };
}

/** Only positive, valid votes win a prize. A tie uses first publication, then stable ID. */
export function rankContestEntries(entries: readonly ContestEntry[], month: ContestMonth): ContestEntry[] {
  return entries.filter(e => e.id && e.authorId && e.title && ['published', 'update_pending'].includes(e.status)
    && !e.hasWonPrize && Number.isSafeInteger(e.hearts) && e.hearts > 0
    && Number.isFinite(e.publishedAtMs) && e.publishedAtMs > 0 && e.publishedAtMs < month.endMs)
    .sort((a, b) => b.hearts - a.hearts || a.publishedAtMs - b.publishedAtMs || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function contestPrize(place: number): ContestPrize | null {
  if (place === 1) return { kind: 'plus', months: 3 };
  if (place === 2) return { kind: 'coins', amount: 2000 };
  if (place === 3) return { kind: 'coins', amount: 1000 };
  return null;
}
