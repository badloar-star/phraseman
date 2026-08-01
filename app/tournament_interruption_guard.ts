const TOURNAMENT_INTERRUPTION_PROTECTED_ROUTES = new Set([
  '/tournament_lobby',
  '/tournament_round',
  '/tournament_table',
  '/tournament_results',
  '/tournament_review',
]);

function normalizeRoutePath(pathname: string | null | undefined): string {
  const clean = String(pathname ?? '').split(/[?#]/)[0] ?? '';
  if (clean.length > 1 && clean.endsWith('/')) return clean.slice(0, -1);
  return clean;
}

/**
 * Active tournament flow is a timed competitive surface. Automatic overlays,
 * winback offers and upsells must wait until the user leaves it. This does not
 * block the tournament tab, tickets/season screens, or user-requested paywalls.
 */
export function isTournamentInterruptionProtectedPath(
  pathname: string | null | undefined,
): boolean {
  return TOURNAMENT_INTERRUPTION_PROTECTED_ROUTES.has(normalizeRoutePath(pathname));
}
