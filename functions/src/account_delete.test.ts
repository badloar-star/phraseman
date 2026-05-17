import { __accountDeleteTestHooks } from './account_delete';

const { accountDeleteQueryPlan, resolveStableUidForDelete } = __accountDeleteTestHooks;

function makeDbStub(opts: {
  users?: Record<string, Record<string, unknown>>;
  authLinks?: Record<string, Record<string, unknown>>;
}) {
  const users = opts.users ?? {};
  const authLinks = opts.authLinks ?? {};
  const collections: Record<string, Record<string, Record<string, unknown>>> = {
    users,
    auth_links: authLinks,
  };

  const snapFor = (id: string, data: Record<string, unknown> | undefined) => ({
    id,
    exists: !!data,
    data: () => data,
  });

  return {
    collection: (name: string) => {
      const data = collections[name] ?? {};
      return {
        doc: (id: string) => ({
          get: async () => snapFor(id, data[id]),
        }),
        where: (field: string, _op: string, value: unknown) => ({
          limit: (_n: number) => ({
            get: async () => {
              const docs = Object.entries(data)
                .filter(([, doc]) => doc[field] === value)
                .map(([id, doc]) => snapFor(id, doc));
              return { empty: docs.length === 0, docs };
            },
          }),
        }),
      };
    },
  };
}

describe('accountDelete query plan', () => {
  it('covers the privacy-critical user data collections', () => {
    const plan = accountDeleteQueryPlan('stable-123', 'auth-456');
    const keys = new Set(plan.map((x) => `${x.collection}.${x.field}.${x.op}.${x.value}`));

    expect(keys.has('auth_links.stable_id.==.stable-123')).toBe(true);
    expect(keys.has('app_activity.uid.==.stable-123')).toBe(true);
    expect(keys.has('app_errors.uid.==.stable-123')).toBe(true);
    expect(keys.has('subscription_cancel_surveys.uid.==.stable-123')).toBe(true);
    expect(keys.has('community_packs.authorStableId.==.stable-123')).toBe(true);
    expect(keys.has('community_pack_purchases.buyerStableId.==.stable-123')).toBe(true);
    expect(keys.has('league_chat_messages.authorUid.==.stable-123')).toBe(true);
    expect(keys.has('user_reports.reporterUid.==.stable-123')).toBe(true);
    expect(keys.has('revenuecat_premium_events.candidates.array-contains.stable-123')).toBe(true);
  });

  it('covers auth-uid arena and chat documents', () => {
    const plan = accountDeleteQueryPlan('stable-123', 'auth-456');
    const keys = new Set(plan.map((x) => `${x.collection}.${x.field}.${x.op}.${x.value}`));

    expect(keys.has('matchmaking_queue.userId.==.auth-456')).toBe(true);
    expect(keys.has('arena_sessions.playerIds.array-contains.auth-456')).toBe(true);
    expect(keys.has('arena_invites.fromUid.==.auth-456')).toBe(true);
    expect(keys.has('arena_room_members.authUid.==.auth-456')).toBe(true);
    expect(keys.has('league_chat_messages.authUid.==.auth-456')).toBe(true);
    expect(keys.has('league_chat_reports.reporterAuthUid.==.auth-456')).toBe(true);
  });

  it('deduplicates both-value specs when stable id equals auth uid', () => {
    const plan = accountDeleteQueryPlan('same-id', 'same-id');
    const leaderboardUidMatches = plan.filter((x) => x.collection === 'name_index' && x.field === 'uid');

    expect(leaderboardUidMatches).toHaveLength(1);
    expect(leaderboardUidMatches[0]).toMatchObject({ value: 'same-id' });
  });
});

describe('accountDelete stable id resolver', () => {
  it('accepts the requested stable id when it is linked to the current auth uid', async () => {
    const db = makeDbStub({ users: { stable123: { firebaseAuthUid: 'auth456' } } });

    await expect(resolveStableUidForDelete(db as any, 'auth456', 'stable123')).resolves.toBe('stable123');
  });

  it('does not fail local account deletion when the requested local stable id has no cloud link yet', async () => {
    const db = makeDbStub({});

    await expect(resolveStableUidForDelete(db as any, 'auth456', 'localStableOnly')).resolves.toBe('auth456');
  });

  it('falls back to the known server-side stable id when the local stable id is stale', async () => {
    const db = makeDbStub({ users: { serverStable: { firebaseAuthUid: 'auth456' } } });

    await expect(resolveStableUidForDelete(db as any, 'auth456', 'staleLocalStable')).resolves.toBe('serverStable');
  });

  it('rejects a requested stable id that belongs to a different auth uid', async () => {
    const db = makeDbStub({ users: { stable123: { firebaseAuthUid: 'otherAuth' } } });

    await expect(resolveStableUidForDelete(db as any, 'auth456', 'stable123')).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
});
