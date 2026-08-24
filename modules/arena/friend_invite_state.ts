export const ARENA_V2_INVITE_TTL_MS = 10 * 60 * 1_000;
export const ARENA_V2_RENDEZVOUS_MS = 90 * 1_000;

export type FriendInviteStatus = 'pending' | 'accepted' | 'matched' | 'declined' | 'cancelled' | 'expired';

export type FriendInviteState = Readonly<{
  status: FriendInviteStatus;
  createdAtMs: number;
  expiresAtMs: number;
  acceptedAtMs?: number;
  rendezvousExpiresAtMs?: number;
  fromReadyAtMs?: number;
  toReadyAtMs?: number;
  declinedAtMs?: number;
  cancelledAtMs?: number;
  expiredAtMs?: number;
  matchedAtMs?: number;
  matchId?: string;
}>;

export type FriendInviteAction =
  | { type: 'accept' }
  | { type: 'ready'; participant: 'from' | 'to' }
  | { type: 'matched'; matchId: string }
  | { type: 'decline' }
  | { type: 'cancel' }
  | { type: 'expire' };

export type FriendInviteTransition = Readonly<{ state: FriendInviteState; changed: boolean; shouldCreateMatch: boolean }>;

const terminal = (status: FriendInviteStatus) => ['matched', 'declined', 'cancelled', 'expired'].includes(status);

export function transitionFriendInvite(state: FriendInviteState, action: FriendInviteAction, nowMs: number): FriendInviteTransition {
  if (terminal(state.status)) return { state, changed: false, shouldCreateMatch: false };
  const pendingExpired = state.status === 'pending' && nowMs >= state.expiresAtMs;
  const rendezvousExpired = state.status === 'accepted' && nowMs >= Number(state.rendezvousExpiresAtMs ?? 0);
  if (action.type === 'expire' || pendingExpired || rendezvousExpired) {
    const next = { ...state, status: 'expired' as const, expiredAtMs: nowMs };
    return { state: next, changed: true, shouldCreateMatch: false };
  }
  if (action.type === 'decline') {
    if (state.status !== 'pending') return { state, changed: false, shouldCreateMatch: false };
    return { state: { ...state, status: 'declined', declinedAtMs: nowMs }, changed: true, shouldCreateMatch: false };
  }
  if (action.type === 'cancel') {
    return { state: { ...state, status: 'cancelled', cancelledAtMs: nowMs }, changed: true, shouldCreateMatch: false };
  }
  if (action.type === 'accept') {
    if (state.status === 'accepted') return { state, changed: false, shouldCreateMatch: Boolean(state.fromReadyAtMs && state.toReadyAtMs) };
    const next = { ...state, status: 'accepted' as const, acceptedAtMs: nowMs, rendezvousExpiresAtMs: nowMs + ARENA_V2_RENDEZVOUS_MS, toReadyAtMs: state.toReadyAtMs ?? nowMs };
    return { state: next, changed: true, shouldCreateMatch: Boolean(next.fromReadyAtMs && next.toReadyAtMs) };
  }
  if (action.type === 'ready') {
    const field = action.participant === 'from' ? 'fromReadyAtMs' : 'toReadyAtMs';
    if (state[field]) return { state, changed: false, shouldCreateMatch: state.status === 'accepted' && Boolean(state.fromReadyAtMs && state.toReadyAtMs) };
    const next = { ...state, [field]: nowMs };
    return { state: next, changed: true, shouldCreateMatch: next.status === 'accepted' && Boolean(next.fromReadyAtMs && next.toReadyAtMs) };
  }
  if (action.type === 'matched') {
    if (state.status !== 'accepted' || !state.fromReadyAtMs || !state.toReadyAtMs || !action.matchId) return { state, changed: false, shouldCreateMatch: false };
    return { state: { ...state, status: 'matched', matchedAtMs: nowMs, matchId: action.matchId }, changed: true, shouldCreateMatch: false };
  }
  return { state, changed: false, shouldCreateMatch: false };
}
