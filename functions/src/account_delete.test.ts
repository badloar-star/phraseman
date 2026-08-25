import {
  ARENA_EXPANSION_USER_SUBCOLLECTIONS,
  __accountDeleteTestHooks,
  executeAccountDeletion,
} from './account_delete';

const {
  accountDeleteQueryPlan,
  accountDeleteCollectionGroupPlan,
  accountDeleteCollectionGroupDocumentIdPlan,
  accountDeleteDirectDocumentPlan,
  resolveStableUidForDelete,
  enqueueForAuthenticatedAccount,
  removeFromFriendGiftDailyLimits,
  deleteCrossUserDocumentIdMatches,
  deleteArenaSeasonEntries,
  deleteDirectDocs,
  deleteMergeIdentityRecords,
  resolveAccountDeleteIdentityClosure,
} = __accountDeleteTestHooks;

function makeDbStub(opts: {
  users?: Record<string, Record<string, unknown>>;
  authLinks?: Record<string, Record<string, unknown>>;
  ownerMaps?: Record<string, Record<string, unknown>>;
  mergeOutbox?: Record<string, Record<string, unknown>>;
}) {
  const users = opts.users ?? {};
  const authLinks = opts.authLinks ?? {};
  const collections: Record<string, Record<string, Record<string, unknown>>> = {
    users,
    auth_links: authLinks,
    account_identity_owner_map: opts.ownerMaps ?? {},
    account_merge_outbox: opts.mergeOutbox ?? {},
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
  it('exposes the idempotent deletion executor for the durable worker', () => {
    expect(typeof executeAccountDeletion).toBe('function');
  });

  it('resolves stable identity on the server before enqueueing', async () => {
    const db = makeDbStub({
      users: { 'stable-123': { linkedAuth: { providerUid: 'auth-456' } } },
      authLinks: { 'auth-456': { stable_id: 'stable-123' } },
    });
    const enqueue = jest.fn(async () => ({
      jobId: 'adel_hash',
      status: 'queued' as const,
      created: true,
    }));

    const result = await enqueueForAuthenticatedAccount(
      db as unknown as FirebaseFirestore.Firestore,
      'auth-456',
      'stable-123',
      enqueue,
    );

    expect(enqueue).toHaveBeenCalledWith(db, 'auth-456', 'stable-123');
    expect(result).toEqual({ ok: true, jobId: 'adel_hash', status: 'queued', created: true });
    expect(result).not.toHaveProperty('authUid');
    expect(result).not.toHaveProperty('stableUid');
  });

  it('covers the privacy-critical user data collections', () => {
    const plan = accountDeleteQueryPlan('stable-123', 'auth-456');
    const keys = new Set(plan.map((x) => `${x.collection}.${x.field}.${x.op}.${x.value}`));

    expect(keys.has('auth_links.stable_id.==.stable-123')).toBe(true);
    expect(keys.has('app_activity.uid.==.stable-123')).toBe(true);
    expect(keys.has('app_errors.uid.==.stable-123')).toBe(true);
    expect(keys.has('subscription_cancel_surveys.uid.==.stable-123')).toBe(true);
    expect(keys.has('community_packs.authorStableId.==.stable-123')).toBe(true);
    expect(keys.has('community_pack_purchases.buyerStableId.==.stable-123')).toBe(true);
    expect(keys.has('community_pack_gift_claims.buyerStableId.==.stable-123')).toBe(true);
    expect(keys.has('friend_quests.participantUids.array-contains.stable-123')).toBe(true);
    expect(keys.has('user_reports.reporterUid.==.stable-123')).toBe(true);
    expect(keys.has('revenuecat_premium_events.candidates.array-contains.stable-123')).toBe(true);
    expect(keys.has('safety_flags.uid.==.stable-123')).toBe(true);
    expect(keys.has('safety_flags.authUid.==.auth-456')).toBe(true);
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
  });

  it('keeps historical Arena identity records in the account-deletion plan after runtime retirement', () => {
    const plan = accountDeleteQueryPlan('stable-123', 'auth-456');
    const keys = new Set(plan.map((x) => `${x.collection}.${x.field}.${x.op}.${x.value}`));

    expect(keys.has('arena_hill_player_wins.stableUid.==.stable-123')).toBe(true);
    expect(keys.has('arena_hill_thrones.previousChampionUid.==.stable-123')).toBe(true);
    expect(keys.has('arena_hill_throne_rewards.championUid.==.stable-123')).toBe(true);
    expect(keys.has('arena_hill_throne_rewards.championAuthUid.==.auth-456')).toBe(true);
    expect(keys.has('arena_season_claims.uid.==.stable-123')).toBe(true);
    expect(keys.has('arena_season_claims.uid.==.auth-456')).toBe(true);
  });

  it('covers every Arena V2 public, private, queue and invite identity edge', () => {
    const queryPlan = accountDeleteQueryPlan('stable-123', 'auth-456');
    const queryKeys = new Set(queryPlan.map((x) => `${x.collection}.${x.field}.${x.op}.${x.value}`));

    expect(queryKeys.has('arena_v2_profiles.authUid.==.auth-456')).toBe(true);
    expect(queryKeys.has('arena_v2_queue.stableUid.==.stable-123')).toBe(true);
    expect(queryKeys.has('arena_v2_queue.authUid.==.auth-456')).toBe(true);
    expect(queryKeys.has('arena_v2_match_private.participantStableUids.array-contains.stable-123')).toBe(true);
    expect(queryKeys.has('arena_v2_match_private.participantAuthUids.array-contains.auth-456')).toBe(true);
    expect(queryKeys.has('arena_v2_pair_limits.participantStableUids.array-contains.stable-123')).toBe(true);
    expect(queryKeys.has('arena_v2_invites.fromStableUid.==.stable-123')).toBe(true);
    expect(queryKeys.has('arena_v2_invites.toStableUid.==.stable-123')).toBe(true);
    expect(queryKeys.has('arena_v2_invites.fromAuthUid.==.auth-456')).toBe(true);
    expect(queryKeys.has('arena_v2_invites.toAuthUid.==.auth-456')).toBe(true);
    for (const collection of ['arena_v2_ghosts', 'arena_v2_series', 'arena_v2_partnerships']) {
      expect(queryKeys.has(`${collection}.participantStableUids.array-contains.stable-123`)).toBe(true);
      expect(queryKeys.has(`${collection}.participantAuthUids.array-contains.auth-456`)).toBe(true);
    }

    const directPlan = accountDeleteDirectDocumentPlan('stable-123', 'auth-456');
    const directKeys = new Set(directPlan.map((x) => `${x.collection}.${x.id}`));
    expect(directKeys.has('arena_v2_profiles.stable-123')).toBe(true);
    expect(directKeys.has('arena_v2_queue.stable-123')).toBe(true);
  });

  it('audits every recursively deleted Arena Expansion user namespace', () => {
    expect(ARENA_EXPANSION_USER_SUBCOLLECTIONS).toEqual([
      'arena_v2_daily_attempts',
      'arena_v2_expansion_runs',
      'arena_v2_match_labs',
      'arena_v2_mastery_signatures',
      'arena_v2_activity_days',
      'arena_v2_partner_weeks',
      'arena_v2_star_ledger',
      'arena_v2_entitlements',
      'arena_v2_expansion_receipts',
      'star_operations',
    ]);
  });

  it('keeps direct Arena question history documents in the account-deletion plan', () => {
    const plan = accountDeleteDirectDocumentPlan('stable-123', 'auth-456');
    const keys = new Set(plan.map((x) => `${x.collection}.${x.id}`));

    expect(keys.has('arena_question_history.stable-123')).toBe(true);
    expect(keys.has('arena_question_history.auth-456')).toBe(true);
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
    expect(keys.has('friend_activity_likes_sent.targetUid.==.stable-123')).toBe(true);
    expect(keys.has('friend_gifts_received.fromUid.==.stable-123')).toBe(true);
    expect(keys.has('friend_gifts_sent.toUid.==.stable-123')).toBe(true);
    expect(keys.has('friend_gift_history.peerUid.==.stable-123')).toBe(true);
    expect(keys.has('friend_quest_meta.peerUid.==.stable-123')).toBe(true);
    expect(keys.has('friend_quest_weekly.peerUid.==.stable-123')).toBe(true);
    expect(keys.has('notifications.fromUid.==.stable-123')).toBe(true);
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
  it('follows a reserved loser-to-winner edge before deleting partially copied mistake history', async () => {
    const db = makeDbStub({
      users: {
        loserA: { firebaseAuthUid: 'auth-1', mistakePracticeMergePending: true },
        winnerB: { firebaseAuthUid: 'auth-1', mistakePracticeMergePending: true },
      },
      authLinks: { 'auth-1': { stable_id: 'loserA' } },
      mergeOutbox: {
        mergeAB: {
          winnerStableId: 'winnerB', loserStableId: 'loserA',
          publicationStatus: 'reserved', status: 'pending', mistakePracticeEventsCopiedAt: 123,
        },
      },
    });

    const identities = await resolveAccountDeleteIdentityClosure(db as any, 'loserA', 'auth-1');
    expect(new Set(identities)).toEqual(new Set(['loserA', 'winnerB', 'auth-1']));

    const direct = identities.flatMap((identity) => accountDeleteDirectDocumentPlan(identity, 'auth-1'));
    expect(direct).toEqual(expect.arrayContaining([
      expect.objectContaining({ collection: 'users', id: 'loserA' }),
      expect.objectContaining({ collection: 'users', id: 'winnerB' }),
      expect.objectContaining({ collection: 'auth_links', id: 'auth-1' }),
    ]));

    const stored = new Map<string, Record<string, unknown>>([
      ['users/loserA', { firebaseAuthUid: 'auth-1' }],
      ['users/loserA/progress_events/source-event', { ownerStableUid: 'loserA' }],
      ['users/winnerB', { firebaseAuthUid: 'auth-1' }],
      ['users/winnerB/progress_events/partially-copied-event', { ownerStableUid: 'winnerB' }],
      ['auth_links/auth-1', { stable_id: 'loserA' }],
      ['account_merge_outbox/mergeAB', {
        winnerStableId: 'winnerB', loserStableId: 'loserA', publicationStatus: 'reserved',
      }],
    ]);
    const refFor = (path: string) => ({ path });
    const deleteDb = {
      collection: (collection: string) => ({
        doc: (id: string) => refFor(`${collection}/${id}`),
        where: (field: string, _op: string, value: unknown) => ({
          limit: (_limit: number) => ({
            get: async () => {
              const prefix = `${collection}/`;
              const docs = [...stored.entries()].filter(([path, data]) =>
                path.startsWith(prefix) && !path.slice(prefix.length).includes('/') && data[field] === value,
              ).map(([path, data]) => ({ ref: refFor(path), data: () => data }));
              return { empty: docs.length === 0, docs };
            },
          }),
        }),
      }),
      recursiveDelete: async (ref: { path: string }) => {
        for (const path of [...stored.keys()]) {
          if (path === ref.path || path.startsWith(`${ref.path}/`)) stored.delete(path);
        }
      },
    };
    const ctx = {
      db: deleteDb,
      writer: { flush: jest.fn(async () => {}) },
      seen: new Set<string>(),
      runId: 'delete-reserved-merge', stableUidHash: 'a', authUidHash: 'b',
      startedAtMs: 0, lastProgressLogDocs: 0, writerClosed: false,
    };
    const stats = { docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false };
    for (const identity of identities) {
      await deleteDirectDocs(deleteDb as any, identity, 'auth-1', ctx as any);
    }
    await deleteMergeIdentityRecords(deleteDb as any, identities, ctx as any, stats);

    expect([...stored.keys()]).toEqual([]);
  });

  it('deduplicates bidirectional merge cycles in the identity closure', async () => {
    const db = makeDbStub({
      mergeOutbox: {
        mergeAB: { winnerStableId: 'winnerB', loserStableId: 'loserA', status: 'pending' },
        mergeBA: { winnerStableId: 'loserA', loserStableId: 'winnerB', status: 'pending' },
      },
    });

    await expect(resolveAccountDeleteIdentityClosure(db as any, 'loserA', 'auth-1'))
      .resolves.toEqual(expect.arrayContaining(['loserA', 'winnerB', 'auth-1']));
  });

  it('keeps the identity cardinality guard on loser-to-winner merge fanout', async () => {
    const mergeOutbox = Object.fromEntries(Array.from({ length: 65 }, (_, index) => [
      `merge-${index}`,
      { winnerStableId: `winner-${index}`, loserStableId: 'loserA', status: 'pending' },
    ]));
    const db = makeDbStub({ mergeOutbox });

    await expect(resolveAccountDeleteIdentityClosure(db as any, 'loserA', 'auth-1'))
      .rejects.toMatchObject({ code: 'resource-exhausted', message: 'account_delete_identity_limit' });
  });

  it('keeps merged loser aliases in the deletion closure after hidden user docs are gone', async () => {
    const db = makeDbStub({
      users: { winner: { firebaseAuthUid: 'auth-1' } },
      ownerMaps: { loser: { canonicalStableId: 'winner' } },
      mergeOutbox: { merge1: { winnerStableId: 'winner', loserStableId: 'loser' } },
    });

    const identities = await resolveAccountDeleteIdentityClosure(db as any, 'winner', 'auth-1');
    expect(new Set(identities)).toEqual(new Set(['winner', 'loser', 'auth-1']));

    const plans = identities.flatMap((identity) => accountDeleteQueryPlan(identity, 'auth-1'));
    expect(plans).toEqual(expect.arrayContaining([
      expect.objectContaining({ collection: 'revenuecat_premium_lineages', field: 'ownerUid', value: 'loser' }),
      expect.objectContaining({ collection: 'revenuecat_premium_events', field: 'uid', value: 'loser' }),
      expect.objectContaining({ collection: 'revenuecat_shard_transactions', field: 'uid', value: 'loser' }),
    ]));
  });

  it('accepts the requested stable id when it is linked to the current auth uid', async () => {
    const db = makeDbStub({ users: { stable123: { firebaseAuthUid: 'auth456' } } });

    await expect(resolveStableUidForDelete(db as any, 'auth456', 'stable123')).resolves.toBe('stable123');
  });

  // ИНЦИДЕНТ 2026-08-25: старые ожидания ниже закрепляли МОЛЧАЛИВУЮ ПОДМЕНУ
  // запрошенного stable_id на якорь текущей сессии. Протухший клиентский замок
  // удаления прислал старый stable_id, сервер подменил его на живой якорь
  // владельца и уничтожил бы живой аккаунт (спасла только упавшая попытка
  // worker'а). Новый контракт (дизайн 2026-08-20, Task 2): удаляется только
  // явно названный И доказанный аккаунт; недоказанный запрос — отказ, не замена.
  it('rejects a requested stable id that has no ownership proof (fail closed, no substitution)', async () => {
    const db = makeDbStub({});

    await expect(resolveStableUidForDelete(db as any, 'auth456', 'localStableOnly')).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
  });

  it('does not authorize an existing unowned legacy user document', async () => {
    const db = makeDbStub({ users: { victimStable: { user_name: 'victim' } } });

    await expect(resolveStableUidForDelete(db as any, 'auth456', 'victimStable')).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
  });

  it('rejects a stale requested stable id instead of silently substituting the server anchor', async () => {
    const db = makeDbStub({ users: { serverStable: { firebaseAuthUid: 'auth456' } } });

    await expect(resolveStableUidForDelete(db as any, 'auth456', 'staleLocalStable')).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
  });

  it('accepts the requested stable id when it matches the auth-link anchor', async () => {
    const db = makeDbStub({
      users: { serverStable: { user_name: 'anchored' } },
      authLinks: { auth456: { stable_id: 'serverStable' } },
    });

    await expect(resolveStableUidForDelete(db as any, 'auth456', 'serverStable')).resolves.toBe('serverStable');
  });

  it('rejects any requested stable id that differs from an existing auth-link anchor', async () => {
    const db = makeDbStub({
      users: {
        auth456: { user_name: 'stale direct' },
        staleByAuth: { firebaseAuthUid: 'auth456' },
        serverStable: { user_name: 'anchored' },
      },
      authLinks: { auth456: { stable_id: 'serverStable' } },
    });

    for (const requested of ['missingLocal', 'staleByAuth', 'auth456']) {
      await expect(resolveStableUidForDelete(db as any, 'auth456', requested)).rejects.toMatchObject({
        code: 'permission-denied',
        message: 'stable_id_mismatch',
      });
    }
  });

  it('rejects a requested stable id that belongs to a different auth uid', async () => {
    const db = makeDbStub({ users: { stable123: { firebaseAuthUid: 'otherAuth' } } });

    await expect(resolveStableUidForDelete(db as any, 'auth456', 'stable123')).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
});

describe('accountDelete query deletion safety', () => {
  it('deletes each historical Arena season entry by stable and auth document id', async () => {
    const seasonRefs = ['2025-Q4', '2026-Q1'].map((seasonId) => ({
      id: seasonId,
      collection: jest.fn((collection: string) => ({
        doc: (id: string) => ({ path: `arena_season_leaderboard/${seasonId}/${collection}/${id}` }),
      })),
    }));
    const listDocuments = jest.fn(async () => seasonRefs);
    const recursiveDelete = jest.fn(async (_ref: { path: string }) => {});
    const db = {
      collection: jest.fn((name: string) => {
        expect(name).toBe('arena_season_leaderboard');
        return { listDocuments };
      }),
      recursiveDelete,
    };
    const writer = { flush: jest.fn(async () => {}) };
    const ctx = {
      db,
      writer,
      seen: new Set<string>(),
      runId: 'test',
      stableUidHash: 'stable',
      authUidHash: 'auth',
      startedAtMs: 0,
      lastProgressLogDocs: 0,
      writerClosed: false,
    };
    const stats = { docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false };

    await deleteArenaSeasonEntries(db as any, 'stable-123', 'auth-456', ctx as any, stats);

    expect(listDocuments).toHaveBeenCalledTimes(1);
    expect(recursiveDelete.mock.calls.map(([ref]) => ref.path)).toEqual([
      'arena_season_leaderboard/2025-Q4/entries/stable-123',
      'arena_season_leaderboard/2025-Q4/entries/auth-456',
      'arena_season_leaderboard/2026-Q1/entries/stable-123',
      'arena_season_leaderboard/2026-Q1/entries/auth-456',
    ]);
    expect(writer.flush).toHaveBeenCalledTimes(1);
    expect(stats.queriesRun).toBe(1);
  });

  it('deletes reverse friend documents through concrete user paths', async () => {
    const refs: Record<string, { path: string }> = {};
    const userRef = {
      collection: jest.fn((collection: string) => ({
        doc: (id: string) => {
          const ref = { path: `users/peer/${collection}/${id}` };
          refs[ref.path] = ref;
          return ref;
        },
      })),
    };
    const listDocuments = jest.fn(async () => [userRef]);
    const recursiveDelete = jest.fn(async () => {});
    const getAll = jest.fn(async (...docRefs: { path: string }[]) => docRefs.map((ref, index) => ({
      exists: index === 0,
      ref,
    })));
    const db = {
      collection: jest.fn((name: string) => {
        expect(name).toBe('users');
        return { listDocuments, doc: () => userRef };
      }),
      collectionGroup: jest.fn(() => {
        throw new Error('document-id collection-group query must not be used');
      }),
      getAll,
      recursiveDelete,
    };
    const writer = { flush: jest.fn(async () => {}) };
    const ctx = {
      db,
      writer,
      seen: new Set<string>(),
      runId: 'test',
      stableUidHash: 'stable',
      authUidHash: 'auth',
      startedAtMs: 0,
      lastProgressLogDocs: 0,
      writerClosed: false,
    };
    const stats = { docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false };

    await deleteCrossUserDocumentIdMatches(db as any, 'stable-123', 'auth-456', ctx as any, stats);

    expect(listDocuments).toHaveBeenCalledTimes(1);
    expect(getAll).toHaveBeenCalledTimes(1);
    expect(getAll.mock.calls[0]).toHaveLength(4);
    expect(recursiveDelete).toHaveBeenCalledTimes(1);
    expect(writer.flush).toHaveBeenCalledTimes(1);
    expect(db.collectionGroup).not.toHaveBeenCalled();
    expect(stats.queriesRun).toBe(1);
  });

  it('walks only known peers instead of the whole users collection', async () => {
    // зачем: сторожит главный фикс — узкий путь по peer-uid. Если кто-то вернёт
    // listDocuments() в этот путь, удаление аккаунта снова начнёт перебирать всю
    // базу (сотни тысяч чтений и таймаут при росте) и тест упадёт.
    const touched: string[] = [];
    const makeUserRef = (uid: string) => ({
      collection: (collection: string) => ({
        doc: (id: string) => ({ path: `users/${uid}/${collection}/${id}` }),
      }),
    });
    const listDocuments = jest.fn(async () => {
      throw new Error('full users scan must not happen when peer uids are known');
    });
    const getAll = jest.fn(async (...docRefs: { path: string }[]) => {
      touched.push(...docRefs.map((ref) => ref.path));
      return docRefs.map((ref) => ({ exists: false, ref }));
    });
    const db = {
      collection: jest.fn((name: string) => {
        expect(name).toBe('users');
        return { listDocuments, doc: (uid: string) => makeUserRef(uid) };
      }),
      collectionGroup: jest.fn(() => {
        throw new Error('document-id collection-group query must not be used');
      }),
      getAll,
      recursiveDelete: jest.fn(async () => {}),
    };
    const ctx = {
      db,
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

    await deleteCrossUserDocumentIdMatches(
      db as any, 'stable-123', 'auth-456', ctx as any, stats, ['peer-a', 'peer-b'],
    );

    expect(listDocuments).not.toHaveBeenCalled();
    expect(getAll).toHaveBeenCalledTimes(2);
    expect(touched).toContain('users/peer-a/friends/stable-123');
    expect(touched).toContain('users/peer-b/friend_requests/auth-456');
  });

  it('keeps the full-scan fallback for accounts without the sent-request index', async () => {
    // зачем: гибрид (решение владельца 2026-08-23). У аккаунтов, заведённых до
    // появления индекса, отметок нет — узкий путь мог бы пропустить их заявки,
    // поэтому один раз честно платим за полный перебор.
    const userRef = {
      collection: (collection: string) => ({
        doc: (id: string) => ({ path: `users/legacy/${collection}/${id}` }),
      }),
    };
    const listDocuments = jest.fn(async () => [userRef]);
    const getAll = jest.fn(async (...docRefs: { path: string }[]) =>
      docRefs.map((ref) => ({ exists: false, ref })));
    const db = {
      collection: jest.fn(() => ({ listDocuments })),
      collectionGroup: jest.fn(() => {
        throw new Error('document-id collection-group query must not be used');
      }),
      getAll,
      recursiveDelete: jest.fn(async () => {}),
    };
    const ctx = {
      db,
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

    await deleteCrossUserDocumentIdMatches(
      db as any, 'stable-123', 'auth-456', ctx as any, stats, null,
    );

    expect(listDocuments).toHaveBeenCalledTimes(1);
    expect(getAll).toHaveBeenCalledTimes(1);
  });

  it('cleans gift limits through friends only, never the whole users collection', async () => {
    // зачем: подарок невозможен без двусторонней дружбы (friend_gifts.ts падает
    // с 'Users are not friends'), поэтому список друзей — исчерпывающий источник
    // отправителей. Возврат listDocuments() сюда снова взорвал бы стоимость.
    const recipientDoc = { path: 'users/peer-a/friend_gift_daily_limits/2026-07-14' };
    let reads = 0;
    const get = jest.fn(async () => {
      reads += 1;
      return reads === 1 ? { empty: false, docs: [{ ref: recipientDoc }] } : { empty: true, docs: [] };
    });
    const senderRef = { collection: jest.fn(() => ({ where: () => ({ limit: () => ({ get }) }) })) };
    const listDocuments = jest.fn(async () => {
      throw new Error('full users scan must not happen when peer uids are known');
    });
    const update = jest.fn();
    const commit = jest.fn(async () => {});
    const db = {
      collection: jest.fn((name: string) => {
        expect(name).toBe('users');
        return { listDocuments, doc: () => senderRef };
      }),
      collectionGroup: jest.fn(() => {
        throw new Error('collection-group query must not be used for dynamic recipient keys');
      }),
      batch: jest.fn(() => ({ update, commit })),
    };
    const stats = { docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false };

    await removeFromFriendGiftDailyLimits(db as any, 'recipient-stable', stats, ['peer-a']);

    expect(listDocuments).not.toHaveBeenCalled();
    expect(senderRef.collection).toHaveBeenCalledWith('friend_gift_daily_limits');
    expect(update).toHaveBeenCalledTimes(1);
    expect(stats.docsUpdated).toBe(1);
  });

  it('falls back to scanning all senders when peer uids are unknown', async () => {
    const recipientRef = { path: 'users/sender/friend_gift_daily_limits/2026-07-14' };
    let reads = 0;
    const get = jest.fn(async () => {
      reads += 1;
      return reads === 1 ? { empty: false, docs: [{ ref: recipientRef }] } : { empty: true, docs: [] };
    });
    const limit = jest.fn(() => ({ get }));
    const where = jest.fn(() => ({ limit }));
    const dailyLimits = { where };
    const senderRef = { collection: jest.fn(() => dailyLimits) };
    const listDocuments = jest.fn(async () => [senderRef]);
    const update = jest.fn();
    const commit = jest.fn(async () => {});
    const db = {
      collection: jest.fn((name: string) => {
        expect(name).toBe('users');
        return { listDocuments };
      }),
      collectionGroup: jest.fn(() => {
        throw new Error('collection-group query must not be used for dynamic recipient keys');
      }),
      batch: jest.fn(() => ({ update, commit })),
    };
    const stats = { docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false };

    await removeFromFriendGiftDailyLimits(db as any, 'recipient-stable', stats);

    expect(listDocuments).toHaveBeenCalledTimes(1);
    expect(senderRef.collection).toHaveBeenCalledWith('friend_gift_daily_limits');
    expect(where).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(db.collectionGroup).not.toHaveBeenCalled();
    expect(stats.docsUpdated).toBe(1);
    expect(stats.queriesRun).toBe(2);
  });

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
