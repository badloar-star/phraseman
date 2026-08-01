/**
 * Owner-approved modes for every newly assembled tournament room.
 *
 * Stored legacy tasks are intentionally left untouched for audit/history and
 * for already-running rooms, but no planner, publisher or selector may treat
 * them as eligible for a new room.
 */
export const OWNER_APPROVED_TOURNAMENT_MODES = Object.freeze([
  'guess_phrase',
  'fill_gap',
  'find_oddity',
  'translate_build',
  'speed_match',
] as const);

export type OwnerApprovedTournamentMode = typeof OWNER_APPROVED_TOURNAMENT_MODES[number];

export function isOwnerApprovedTournamentMode(
  value: unknown,
): value is OwnerApprovedTournamentMode {
  return typeof value === 'string'
    && (OWNER_APPROVED_TOURNAMENT_MODES as readonly string[]).includes(value);
}
