import {
  ARENA_V2_INVITE_TTL_MS,
  ARENA_V2_RENDEZVOUS_MS,
  transitionFriendInvite,
  type FriendInviteState,
} from '../modules/arena/friend_invite_state';

const T0 = 1_000_000;
const pending = (): FriendInviteState => ({ status: 'pending', createdAtMs: T0, expiresAtMs: T0 + ARENA_V2_INVITE_TTL_MS });

describe('Arena friend invite state machine', () => {
  it('uses the approved ten-minute invite and ninety-second rendezvous', () => {
    expect(ARENA_V2_INVITE_TTL_MS).toBe(10 * 60 * 1000);
    expect(ARENA_V2_RENDEZVOUS_MS).toBe(90 * 1000);
  });

  it('accepts once, marks guest ready, and lets either readiness order create one match', () => {
    const accepted = transitionFriendInvite(pending(), { type: 'accept' }, T0 + 1_000);
    expect(accepted.state).toMatchObject({ status: 'accepted', toReadyAtMs: T0 + 1_000, rendezvousExpiresAtMs: T0 + 1_000 + ARENA_V2_RENDEZVOUS_MS });
    expect(accepted.shouldCreateMatch).toBe(false);
    const ready = transitionFriendInvite(accepted.state, { type: 'ready', participant: 'from' }, T0 + 2_000);
    expect(ready.shouldCreateMatch).toBe(true);
    const matched = transitionFriendInvite(ready.state, { type: 'matched', matchId: 'm1' }, T0 + 2_001);
    expect(matched.state).toMatchObject({ status: 'matched', matchId: 'm1' });
    expect(transitionFriendInvite(matched.state, { type: 'ready', participant: 'from' }, T0 + 3_000)).toEqual({ state: matched.state, changed: false, shouldCreateMatch: false });
  });

  it('supports host ready before accept without losing readiness', () => {
    const hostReady = transitionFriendInvite(pending(), { type: 'ready', participant: 'from' }, T0 + 500);
    expect(hostReady.state.fromReadyAtMs).toBe(T0 + 500);
    const accepted = transitionFriendInvite(hostReady.state, { type: 'accept' }, T0 + 1_000);
    expect(accepted.shouldCreateMatch).toBe(true);
  });

  it('declines, cancels, and expires idempotently', () => {
    const declined = transitionFriendInvite(pending(), { type: 'decline' }, T0 + 1);
    expect(declined.state.status).toBe('declined');
    expect(transitionFriendInvite(declined.state, { type: 'decline' }, T0 + 2).changed).toBe(false);
    const cancelled = transitionFriendInvite(pending(), { type: 'cancel' }, T0 + 1);
    expect(cancelled.state.status).toBe('cancelled');
    const expired = transitionFriendInvite(pending(), { type: 'expire' }, T0 + ARENA_V2_INVITE_TTL_MS);
    expect(expired.state.status).toBe('expired');
  });

  it('expires an accepted rendezvous without rating or reward effects', () => {
    const accepted = transitionFriendInvite(pending(), { type: 'accept' }, T0 + 1_000).state;
    const expired = transitionFriendInvite(accepted, { type: 'expire' }, Number(accepted.rendezvousExpiresAtMs));
    expect(expired.state.status).toBe('expired');
    expect(expired.shouldCreateMatch).toBe(false);
  });
});
