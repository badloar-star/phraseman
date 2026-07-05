import { __accountDeleteTestHooks } from './account_delete';

const {
  accountDeleteQueryPlan,
  accountDeleteCollectionGroupPlan,
  accountDeleteCollectionGroupDocumentIdPlan,
  resolveStableUidForDelete,
} = __accountDeleteTestHooks;

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
    expect(keys.has('help_board_topics.authorUid.==.stable-123')).toBe(true);
    expect(keys.has('help_board_comments.authorUid.==.stable-123')).toBe(true);
    expect(keys.has('help_board_reports.reporterUid.==.stable-123')).toBe(true);
    expect(keys.has('help_board_votes.stableUid.==.stable-123')).toBe(true);
    expect(keys.has('help_board_restrictions.uid.==.stable-123')).toBe(true);
    expect(keys.has('help_board_compass_billing.uid.==.stable-123')).toBe(true);
    expect(keys.has('user_reports.reporterUid.==.stable-123')).toBe(true);
    expect(keys.has('revenuecat_premium_events.candidates.array-contains.stable-123')).toBe(true);
  });

  it('covers auth-uid arena and chat documents', () => {
    const plan = accountDeleteQueryPlan('stable-123', 'auth-456');
    const keys = new Set(plan.map((x) => `${x.collection}.${x.field}.${x.op}.${x.value}`));

    expect(keys.has('matchmaking_queue.userId.==.auth-456')).toBe(true);
    expect(keys.has('arena_rooms.hostId.==.auth-456')).toBe(true);
    expect(keys.has('arena_rooms.guestId.==.auth-456')).toBe(true);
    expect(keys.has('arena_sessions.playerIds.array-contains.auth-456')).toBe(true);
    expect(keys.has('arena_invites.fromUid.==.auth-456')).toBe(true);
    expect(keys.has('arena_room_members.authUid.==.auth-456')).toBe(true);
    expect(keys.has('league_chat_messages.authorAuthUid.==.auth-456')).toBe(true);
    expect(keys.has('league_chat_reports.reporterAuthUid.==.auth-456')).toBe(true);
    expect(keys.has('help_board_topics.authorAuthUid.==.auth-456')).toBe(true);
    expect(keys.has('help_board_comments.authorAuthUid.==.auth-456')).toBe(true);
    expect(keys.has('help_board_reports.reporterAuthUid.==.auth-456')).toBe(true);
    expect(keys.has('help_board_votes.authUid.==.auth-456')).toBe(true);
  });

  it('covers newer account-linked Firestore collections', () => {
    const plan = accountDeleteQueryPlan('stable-123', 'auth-456');
    const keys = new Set(plan.map((x) => `${x.collection}.${x.field}.${x.op}.${x.value}`));

    expect(keys.has('error_reports.uid.==.stable-123')).toBe(true);
    expect(keys.has('review_promo_claims.uid.==.stable-123')).toBe(true);
    expect(keys.has('vip_survey_responses.uid.==.stable-123')).toBe(true);
    expect(keys.has('shard_survey_responses.uid.==.stable-123')).toBe(true);
    expect(keys.has('daily_phrase_saves.uid.==.stable-123')).toBe(true);
    expect(keys.has('daily_phrase_saves.authUid.==.auth-456')).toBe(true);
    expect(keys.has('arena_club_contributions.stableUid.==.stable-123')).toBe(true);
    expect(keys.has('arena_club_contributions.arenaUid.==.auth-456')).toBe(true);
  });

  it('covers cross-user subcollection records that can reference a deleted account', () => {
    const plan = accountDeleteCollectionGroupPlan('stable-123', 'auth-456');
    const keys = new Set(plan.map((x) => `${x.collectionGroup}.${x.field}.${x.op}.${x.value}`));

    expect(keys.has('reactions.userId.==.stable-123')).toBe(true);
    expect(keys.has('poll_votes.userId.==.stable-123')).toBe(true);
    expect(keys.has('activity_likes_received.fromUid.==.stable-123')).toBe(true);
    expect(keys.has('friend_activity_like_daily_limits.targetUid.==.stable-123')).toBe(true);
    expect(keys.has('friend_gifts_received.fromUid.==.stable-123')).toBe(true);
    expect(keys.has('friend_gifts_sent.toUid.==.stable-123')).toBe(true);
    expect(keys.has('friend_gift_history.peerUid.==.stable-123')).toBe(true);
    expect(keys.has('shard_rewards.fromUid.==.stable-123')).toBe(true);
    expect(keys.has('shard_log.targetUid.==.stable-123')).toBe(true);
    expect(keys.has('my_events.payload.fromUid.==.stable-123')).toBe(true);
    expect(keys.has('my_events.payload.targetUid.==.stable-123')).toBe(true);
    expect(keys.has('boosts.activatedBy.==.stable-123')).toBe(true);
    expect(keys.has('messages.authorUid.==.auth-456')).toBe(true);
    expect(keys.has('messages.authorStableUid.==.stable-123')).toBe(true);
  });

  it('covers reverse friend and request documents by collection-group document id', () => {
    const plan = accountDeleteCollectionGroupDocumentIdPlan('stable-123', 'auth-456');
    const keys = new Set(plan.map((x) => `${x.collectionGroup}.${x.value}`));

    expect(keys.has('friends.stable-123')).toBe(true);
    expect(keys.has('friends.auth-456')).toBe(true);
    expect(keys.has('friend_requests.stable-123')).toBe(true);
    expect(keys.has('friend_requests.auth-456')).toBe(true);
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

describe('accountDelete query deletion safety', () => {
  it('returns when all query docs were already scheduled by another delete stage', async () => {
    const ref = { path: 'stuck/doc' };
    const query = {
      limit: jest.fn(() => ({
        get: jest.fn(async () => ({ empty: false, docs: [{ ref }] })),
      })),
    };
    const ctx = {
      db: { recursiveDelete: jest.fn() },
      writer: {},
      seen: new Set<string>([ref.path]),
      runId: 'test',
      stableUidHash: 'stable',
      authUidHash: 'auth',
      startedAtMs: 0,
      lastProgressLogDocs: 0,
      writerClosed: false,
    };
    const stats = { docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false };

    await expect(__accountDeleteTestHooks.deleteQuery(query as any, ctx as any, stats as any))
      .resolves.toBeUndefined();
    expect(stats.queriesRun).toBe(1);
  });

  it('flushes scheduled deletes before asking for the next page', async () => {
    const ref = { path: 'fresh/doc' };
    let calls = 0;
    const query = {
      limit: jest.fn(() => ({
        get: jest.fn(async () => {
          calls += 1;
          return calls === 1 ? { empty: false, docs: [{ ref }] } : { empty: true, docs: [] };
        }),
      })),
    };
    const ctx = {
      db: { recursiveDelete: jest.fn(async () => {}) },
      writer: { flush: jest.fn(async () => {}) },
      seen: new Set<string>(),
      runId: 'test',
      stableUidHash: 'stable',
      authUidHash: 'auth',
      startedAtMs: 0,
      lastProgressLogDocs: 0,
      writerClosed: false,
    };
    const stats = { docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false };

    await expect(__accountDeleteTestHooks.deleteQuery(query as any, ctx as any, stats as any))
      .resolves.toBeUndefined();
    expect(ctx.db.recursiveDelete).toHaveBeenCalledWith(ref, ctx.writer);
    expect(ctx.writer.flush).toHaveBeenCalledTimes(1);
    expect(stats.queriesRun).toBe(2);
  });
});
