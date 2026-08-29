function nonNegativeInteger(value: unknown): number {
  const parsed = Math.trunc(Number(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

/** Keeps local league projections and week finals isolated between accounts. */
export function accountScopedLeagueRunesStorageKey(base: string, ownerStableId: string): string {
  return `${base}:${encodeURIComponent(ownerStableId.trim())}`;
}

/** Counts only new earned runes; wallet grants and spends do not move the league. */
export function leagueEarnedDelta(previousEarnedTotal: unknown, nextEarnedTotal: unknown): number {
  return Math.max(0, nonNegativeInteger(nextEarnedTotal) - nonNegativeInteger(previousEarnedTotal));
}

/** Retains local league points until the server value itself proves absorption. */
export function remainingLeagueRunesCatchup(
  catchup: Readonly<{ weekKey: string; baseWeekEarned: number | null; delta: number }>,
  weekKeyNow: string,
  serverWeekEarned: unknown,
): number {
  if (!catchup.weekKey || catchup.weekKey !== weekKeyNow) return 0;
  const delta = nonNegativeInteger(catchup.delta);
  if (catchup.baseWeekEarned === null) return delta;
  const serverAdvance = Math.max(
    0,
    nonNegativeInteger(serverWeekEarned) - nonNegativeInteger(catchup.baseWeekEarned),
  );
  return Math.max(0, delta - serverAdvance);
}

/** Exact unmaterialized earned amount; unlike event sums it cannot duplicate. */
export function canonicalLeagueLocalOverlay(
  localEarnedTotal: unknown,
  serverEarnedTotal: unknown,
): number {
  return Math.max(
    0,
    nonNegativeInteger(localEarnedTotal) - nonNegativeInteger(serverEarnedTotal),
  );
}
