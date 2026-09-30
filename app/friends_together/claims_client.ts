/**
 * «Вместе» — локальное закрытие достигнутого уровня дружбы.
 * Server-authority policy: текущий клиент не вызывает callable и не принимает
 * серверные решения/награды; обычная синхронизация сохраняет локальный прогресс.
 *
 * Источник: docs/plans/2026-08-16-friends-together-implementation.ru.md §1.1, §1.2, §4.
 */
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from '../account_generation';
import { markFriendLevelClaimedLocally } from './together_store';

export type ClaimLevelErrorReason = 'not_friends' | 'not_reached' | 'claimed' | 'network' | 'unknown';

export type ClaimLevelResult =
  | { ok: true; starsGranted: number; stars?: number; starsEarnedTotal?: number; starsSeq?: number }
  | { ok: false; reason: ClaimLevelErrorReason };

function isClaimContextCurrent(token: AccountGenerationToken, ownerStableId: string): boolean {
  return isCurrentAccountGeneration(token, ownerStableId);
}

export async function claimFriendLevel(friendUid: string, level: number): Promise<ClaimLevelResult> {
  const uid = String(friendUid || '').trim();
  const lvl = Math.max(1, Math.floor(level));
  if (!uid) return { ok: false, reason: 'not_friends' };

  // Server-authority policy: friendship thresholds and reward issuance are no
  // longer decided by a callable. The Together UI already projects the
  // reached level locally; close the claim idempotently and let normal sync
  // persist the local progress. No network request or server reward is made.
  const localToken = captureAccountGeneration();
  const localOwner = localToken.stableId?.trim();
  if (!localOwner || !isClaimContextCurrent(localToken, localOwner)) {
    return { ok: false, reason: 'network' };
  }
  const localCommitted = await withAccountTransitionLock(async () => {
    if (!isClaimContextCurrent(localToken, localOwner)) return false;
    await markFriendLevelClaimedLocally(uid, lvl);
    return isClaimContextCurrent(localToken, localOwner);
  });
  return localCommitted ? { ok: true, starsGranted: 0 } : { ok: false, reason: 'network' };

}

/* expo-router route shim */
export default function __RouteShim() { return null; }
