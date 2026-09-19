import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import {
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { DebugLogger } from './debug-logger';
import { mergeLevelSpinServerStars } from './level_spin_star_grants';

const FUNCTIONS_REGION = 'us-central1';

export const DEV_RUNES_GRANT_AMOUNT = 5_000;

type DevRunesGrantWire = Readonly<{
  ok?: unknown;
  granted?: unknown;
  eventId?: unknown;
  stars?: unknown;
  starsEarnedTotal?: unknown;
  starsSeq?: unknown;
}>;

export type DevRunesGrantResult =
  | Readonly<{ ok: true; granted: typeof DEV_RUNES_GRANT_AMOUNT; eventId: string }>
  | Readonly<{ ok: false; reason: 'disabled' | 'stale-account' | 'failed' }>;

function newDevRunesEventId(): string {
  const now = Date.now().toString(36);
  const random = Math.floor(Math.random() * 1e12).toString(36);
  return `dev_runes:${now}-${random}`;
}

/**
 * Asks the trusted DEV adapter to append one fixed server-confirmed rune grant,
 * then merges only the returned monotonic projection into the active account.
 */
export async function grantRunesOnServerForDev(
  token: AccountGenerationToken,
): Promise<DevRunesGrantResult> {
  const stableId = token.stableId?.trim();
  if (!stableId || !isCurrentAccountGeneration(token, stableId)) {
    return { ok: false, reason: 'stale-account' };
  }

  const eventId = newDevRunesEventId();
  const createdAtMs = Date.now();
  try {
    const call = httpsCallable<
      { stableId: string; opId: string; createdAtMs: number },
      DevRunesGrantWire
    >(getFunctions(getApp(), FUNCTIONS_REGION), 'devRunesGrant');
    const response = await call({ stableId, opId: eventId, createdAtMs });
    if (!isCurrentAccountGeneration(token, stableId)) {
      return { ok: false, reason: 'stale-account' };
    }

    const granted = Number(response.data?.granted);
    const stars = Number(response.data?.stars);
    const earnedTotal = Number(response.data?.starsEarnedTotal);
    const seq = Number(response.data?.starsSeq);
    if (response.data?.ok !== true
      || granted !== DEV_RUNES_GRANT_AMOUNT
      || !Number.isSafeInteger(stars) || stars < 0
      || !Number.isSafeInteger(earnedTotal) || earnedTotal < 0
      || !Number.isSafeInteger(seq) || seq < 1) {
      throw new Error('dev_runes_grant_response_invalid');
    }

    await mergeLevelSpinServerStars(token, {
      stars,
      starsEarnedTotal: earnedTotal,
      starsSeq: seq,
    });
    if (!isCurrentAccountGeneration(token, stableId)) {
      return { ok: false, reason: 'stale-account' };
    }
    return {
      ok: true,
      granted: DEV_RUNES_GRANT_AMOUNT,
      eventId: String(response.data?.eventId ?? eventId),
    };
  } catch (error) {
    const message = String((error as { message?: unknown })?.message ?? error ?? '');
    if (message.includes('dev_runes_grant_disabled')) {
      return { ok: false, reason: 'disabled' };
    }
    DebugLogger.error('dev_runes_grant:grantRunesOnServerForDev', error, 'warning');
    return { ok: false, reason: 'failed' };
  }
}
