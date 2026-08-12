import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Owner lock (2026-08-10): tournaments are conserved source code, not a released product.
 * Remote Config, admin schedule documents and environment variables must never bypass this
 * constant. Re-enabling requires an explicit owner request and a reviewed source change.
 */
export const TOURNAMENTS_RELEASED = false as const;
export const TOURNAMENTS_DISABLED_REASON = 'tournaments_disabled_by_owner' as const;

export function assertTournamentsReleased(): void {
  if (!TOURNAMENTS_RELEASED) {
    throw new HttpsError('failed-precondition', TOURNAMENTS_DISABLED_REASON);
  }
}
