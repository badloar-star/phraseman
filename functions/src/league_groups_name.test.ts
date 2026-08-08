export {};

type Store = Record<string, Record<string, Record<string, unknown> | undefined>>;

let currentDb: any = null;

jest.mock('firebase-admin', () => ({
  firestore: Object.assign(() => currentDb, {
    FieldValue: { delete: () => ({ __delete: true }) },
  }),
}));

jest.mock('./auth_identity', () => ({
  resolveStableUidForAuth: jest.fn(async (_db, _authUid, requestedStableId) => String(requestedStableId || 'stable-self')),
}));

jest.mock('./premium_status', () => ({
  isVipActive: jest.fn(() => false),
  resolvePremiumAccess: jest.fn(async () => false),
  resolveIsLifetimePlan: jest.fn(async () => false),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  getLeagueWeekPoints,
  leagueActivateGroupBoost,
  leagueJoinOrUpdateGroup,
  leagueUpdateMyMember,
} = require('./league_groups');

function currentWeekId(): string {
  const d = new Date();
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function currentMondayUtcIso(): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function setDotted(target: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split('.');
  let cur = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const next = cur[part];
    if (!next || typeof next !== 'object') cur[part] = {};
    cur = cur[part] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function makeDb(initial: Store) {
  const store: Store = {};
  for (const [collectionName, docs] of Object.entries(initial)) {
    store[collectionName] = { ...(docs ?? {}) };
  }
  for (const collectionName of ['users', 'leaderboard', 'league_groups', 'name_index', 'banned_users']) {
    store[collectionName] = store[collectionName] ?? {};
  }

  const snapFor = (collectionName: string, id: string, data: Record<string, unknown> | undefined) => ({
    id,
    exists: !!data,
    data: () => data,
    ref: docApi(collectionName, id),
  });

  const readField = (data: Record<string, unknown>, field: string): unknown => {
    let cur: unknown = data;
    for (const part of field.split('.')) {
      if (!cur || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[part];
    }
    return cur;
  };

  const docApi = (collectionName: string, id: string) => ({
    collection: (subcollectionName: string) => collectionApi(`${collectionName}/${id}/${subcollectionName}`),
    get: async () => snapFor(collectionName, id, store[collectionName]?.[id]),
    set: async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
      store[collectionName] = store[collectionName] ?? {};
      const base = options?.merge ? { ...(store[collectionName][id] ?? {}) } : {};
      for (const [key, value] of Object.entries(data)) setDotted(base, key, value);
      store[collectionName][id] = base;
    },
  });

  const queryApi = (
    collectionName: string,
    filters: Array<{ field: string; op: string; value: unknown }> = [],
    max = Number.POSITIVE_INFINITY,
    afterId = '',
  ): any => ({
    where: (field: string, op: string, value: unknown) => queryApi(
      collectionName,
      [...filters, { field, op, value }],
      max,
      afterId,
    ),
    orderBy: () => queryApi(collectionName, filters, max, afterId),
    startAfter: (doc: { id?: string }) => queryApi(collectionName, filters, max, String(doc?.id || '')),
    limit: (value: number) => queryApi(collectionName, filters, value, afterId),
    get: async () => ({
      docs: Object.entries(store[collectionName] ?? {})
        .filter(([, data]) => data && filters.every(({ field, op, value }) => {
          const actual = readField(data, field);
          if (op === '==') return actual === value;
          if (op === '<') return Number(actual) < Number(value);
          return false;
        }))
        .filter(([id]) => !afterId || id > afterId)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, max)
        .map(([id, data]) => snapFor(collectionName, id, data)),
    }),
  });

  const collectionApi = (collectionName: string) => ({
    doc: (id: string) => docApi(collectionName, id),
    where: (field: string, op: string, value: unknown) => queryApi(collectionName)
      .where(field, op, value),
  });

  currentDb = {
    collection: collectionApi,
    batch: () => {
      const writes: Promise<unknown>[] = [];
      return {
        set: (ref: any, data: Record<string, unknown>, options?: { merge?: boolean }) => {
          writes.push(ref.set(data, options));
        },
        commit: async () => { await Promise.all(writes); },
      };
    },
    runTransaction: async (callback: (tx: any) => Promise<unknown>) => callback({
      get: (ref: any) => ref.get(),
      set: (ref: any, data: Record<string, unknown>, options?: { merge?: boolean }) => ref.set(data, options),
      update: (ref: any, data: Record<string, unknown>) => ref.set(data, { merge: true }),
      create: (ref: any, data: Record<string, unknown>) => ref.set(data),
    }),
  };

  return store;
}

function callableRun(fn: any, data: Record<string, unknown>, authUid: string) {
  const req = { auth: { uid: authUid, token: {} }, data, rawRequest: { headers: {} }, app: {} };
  if (typeof fn.run === 'function') return fn.run(req);
  return fn(req);
}

describe('league member display name ownership', () => {
  it('consumes exactly one numeric club gift voucher and preserves unrelated progress', async () => {
    const weekId = currentWeekId();
    const store = makeDb({
      users: {
        'stable-self': {
          firebaseAuthUid: 'auth-self',
          shards: 0,
          club_gift_free_boost_v1: '1',
          progress: { club_gift_free_boost_v1: '2', user_total_xp: '900' },
        },
      },
      leaderboard: {
        'stable-self': { groupId: 'group-1', groupWeekId: weekId, leagueId: 2 },
      },
      league_groups: {
        'group-1': {
          weekId,
          leagueId: 2,
          members: { 'stable-self': { uid: 'stable-self', name: 'Self' } },
        },
      },
    });

    const result = await callableRun(leagueActivateGroupBoost, { stableId: 'stable-self' }, 'auth-self');

    expect(result).toMatchObject({
      ok: true,
      usedGiftVoucher: true,
      clubGiftFreeBoostCountAfter: 1,
      shardsBalance: 0,
    });
    expect(store.users['stable-self']).toMatchObject({
      club_gift_free_boost_v1: '1',
      progress: { club_gift_free_boost_v1: '1', user_total_xp: '900' },
    });

    const replay = await callableRun(leagueActivateGroupBoost, { stableId: 'stable-self' }, 'auth-self');
    expect(replay).toMatchObject({
      ok: true,
      usedGiftVoucher: true,
      clubGiftFreeBoostCountAfter: 1,
      shardsBalance: 0,
    });
    expect(store.users['stable-self']).toMatchObject({
      club_gift_free_boost_v1: '1',
      progress: { club_gift_free_boost_v1: '1', user_total_xp: '900' },
    });
  });

  it('does not let leagueUpdateMyMember publish a nickname reserved by another live account', async () => {
    const weekId = currentWeekId();
    const store = makeDb({
      users: {
        'stable-self': {
          firebaseAuthUid: 'auth-self',
          progress: {
            user_name: 'Self Name',
            user_name_lower: 'self name',
            weekly_xp: '413',
            weekly_xp_period_start: currentMondayUtcIso(),
            streak_count: '2',
            user_total_xp: '900',
          },
        },
        'stable-owner': { firebaseAuthUid: 'auth-owner', progress: { user_name: 'Professor L' } },
      },
      leaderboard: {
        'stable-self': { groupId: 'group-1', groupWeekId: weekId, leagueId: 0 },
      },
      name_index: {
        'professor l': { uid: 'stable-owner', name: 'Professor L', nameLower: 'professor l' },
      },
      league_groups: {
        'group-1': { weekId, leagueId: 0, members: { 'stable-self': { uid: 'stable-self', name: 'Old' } } },
      },
    });

    const res = await callableRun(
      leagueUpdateMyMember,
      { stableId: 'stable-self', member: { name: 'Professor L', points: 999_999 } },
      'auth-self',
    );

    expect(res.ok).toBe(true);
    const member = (store.league_groups['group-1']?.members as Record<string, Record<string, unknown>>)['stable-self'];
    expect(member.name).toBe('Self Name');
    expect(member.points).toBe(413);
  });
});

describe('league current-week points', () => {
  const now = Date.parse('2026-07-10T12:00:00.000Z');

  it('resets a stale 13500 snapshot to zero when both sources are stale', () => {
    expect(getLeagueWeekPoints({
      weekly_xp: '13500',
      weekly_xp_period_start: '2026-06-29',
      week_points_v2: JSON.stringify({ weekKey: '2026-W27', points: 13500 }),
    }, now)).toBe(0);
  });

  it('takes the maximum of valid current-week sources and ignores either stale source', () => {
    expect(getLeagueWeekPoints({
      weekly_xp: '13429',
      weekly_xp_period_start: '2026-07-06',
      week_points_v2: JSON.stringify({ weekKey: '2026-W28', points: 12000 }),
    }, now)).toBe(13429);

    expect(getLeagueWeekPoints({
      weekly_xp: '13429',
      weekly_xp_period_start: '2026-06-29',
      week_points_v2: JSON.stringify({ weekKey: '2026-W28', points: 700 }),
    }, now)).toBe(700);

    expect(getLeagueWeekPoints({
      weekly_xp: '500',
      weekly_xp_period_start: '2026-07-06',
      week_points_v2: JSON.stringify({ weekKey: '2026-W27', points: 13500 }),
    }, now)).toBe(500);
  });
});

describe('league join authoritative projection', () => {
  it('waits for the previous-week server finalizer before an old client can join on Monday', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-03T00:04:00.000Z'));
    try {
      const weekId = currentWeekId();
      const previousWeekId = '2026-W31';
      const store = makeDb({
        users: { 'stable-self': { progress: { user_name: 'Vitalii' } } },
        leaderboard: {
          'stable-self': { groupId: 'group-prev', groupWeekId: previousWeekId, leagueId: 2 },
        },
      });

      await expect(callableRun(leagueJoinOrUpdateGroup, {
        stableId: 'stable-self',
        weekId,
        leagueId: 2,
        member: { name: 'Vitalii', points: 0 },
      }, 'auth-self')).rejects.toMatchObject({ code: 'failed-precondition' });

      expect(Object.keys(store.league_groups)).toHaveLength(0);
      expect(store.leaderboard['stable-self']?.groupWeekId).toBe(previousWeekId);
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps the server-owned current league when the client requests another tier', async () => {
    const weekId = currentWeekId();
    const store = makeDb({
      users: {
        'stable-self': {
          progress: {
            user_name: 'Vitalii',
            weekly_xp: '50',
            weekly_xp_period_start: currentMondayUtcIso(),
          },
        },
      },
      leaderboard: {
        'stable-self': { groupId: 'group-1', groupWeekId: weekId, leagueId: 2 },
      },
      league_groups: {
        'group-1': {
          weekId,
          leagueId: 2,
          members: { 'stable-self': { uid: 'stable-self', name: 'Vitalii', points: 0 } },
        },
      },
    });

    const res = await callableRun(leagueJoinOrUpdateGroup, {
      stableId: 'stable-self',
      weekId,
      leagueId: 50,
      member: { name: 'Vitalii', points: 50 },
    }, 'auth-self');

    expect(res).toMatchObject({ ok: true, groupId: 'group-1', weekId, leagueId: 2 });
    expect(store.league_groups['group-1']?.leagueId).toBe(2);
    expect(Object.values(store.league_groups).some((group) => group?.leagueId === 50)).toBe(false);
  });

  it('repairs stale group XP from current-week server sources instead of preserving an old maximum', async () => {
    const weekId = currentWeekId();
    const store = makeDb({
      users: {
        'stable-self': { progress: { user_name: 'Vitalii' } },
      },
      leaderboard: {
        'stable-self': {
          groupId: 'group-1',
          groupWeekId: weekId,
          leagueId: 2,
          weekKey: weekId,
          weekPoints: 300,
        },
      },
      league_groups: {
        'group-1': {
          weekId,
          leagueId: 2,
          members: { 'stable-self': { uid: 'stable-self', name: 'Vitalii', points: 3022 } },
        },
      },
    });

    const res = await callableRun(leagueJoinOrUpdateGroup, {
      stableId: 'stable-self',
      weekId,
      leagueId: 2,
      member: { name: 'Vitalii', points: 999_999 },
    }, 'auth-self');

    expect(res).toMatchObject({ ok: true, groupId: 'group-1', weekId, leagueId: 2 });
    const member = (store.league_groups['group-1']?.members as Record<string, Record<string, unknown>>)['stable-self'];
    expect(member.points).toBe(300);
    expect(store.leaderboard['stable-self']?.weekPoints).toBe(300);
  });

  it('uses the finalized previous-week result for the first join of a new week', async () => {
    const weekId = currentWeekId();
    const previousWeekId = (() => {
      const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const day = utc.getUTCDay() || 7;
      utc.setUTCDate(utc.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
      const weekNum = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    })();
    const store = makeDb({
      users: {
        'stable-self': { progress: { user_name: 'Vitalii' } },
      },
      leaderboard: {
        'stable-self': { groupId: 'group-prev', groupWeekId: previousWeekId, leagueId: 2 },
      },
      'users/stable-self/league_week_results': {
        [previousWeekId]: {
          weekId: previousWeekId,
          groupId: 'group-prev',
          prevLeagueId: 2,
          newLeagueId: 3,
          promoted: true,
        },
      },
    });

    const res = await callableRun(leagueJoinOrUpdateGroup, {
      stableId: 'stable-self',
      weekId,
      leagueId: 9,
      member: { name: 'Vitalii', points: 0 },
    }, 'auth-self');

    expect(res).toMatchObject({ ok: true, weekId, leagueId: 3 });
    expect(Object.values(store.league_groups).some((group) => group?.leagueId === 9)).toBe(false);
  });

  it('finds an existing membership after the first 500 groups instead of creating a duplicate', async () => {
    const weekId = currentWeekId();
    const groups = Object.fromEntries(Array.from({ length: 501 }, (_, index) => {
      const id = `group-${String(index).padStart(3, '0')}`;
      return [id, {
        weekId,
        leagueId: 2,
        memberCount: 1,
        members: index === 500
          ? { 'stable-self': { uid: 'stable-self', name: 'Vitalii', points: 10 } }
          : { [`other-${index}`]: { uid: `other-${index}`, name: `Other ${index}`, points: 1 } },
      }];
    }));
    const store = makeDb({
      users: { 'stable-self': { progress: { user_name: 'Vitalii' } } },
      leaderboard: { 'stable-self': { leagueId: 2, groupWeekId: weekId } },
      league_groups: groups,
    });

    const res = await callableRun(leagueJoinOrUpdateGroup, {
      stableId: 'stable-self',
      weekId,
      leagueId: 2,
      member: { name: 'Vitalii', points: 10 },
    }, 'auth-self');

    expect(res).toMatchObject({ ok: true, groupId: 'group-500', weekId, leagueId: 2 });
    expect(Object.keys(store.league_groups)).toHaveLength(501);
  });

  it('hides a duplicate membership on another 500-document page', async () => {
    const weekId = currentWeekId();
    const groups = Object.fromEntries(Array.from({ length: 501 }, (_, index) => {
      const id = `group-${String(index).padStart(3, '0')}`;
      const members: Record<string, Record<string, unknown>> = {
        [`other-${index}`]: { uid: `other-${index}`, name: `Other ${index}`, points: 1 },
      };
      if (index === 0 || index === 500) {
        members['stable-self'] = { uid: 'stable-self', name: 'Vitalii', points: 10 };
      }
      if (index === 500) {
        members['canonical-peer'] = { uid: 'canonical-peer', name: 'Peer', points: 20 };
      }
      return [id, { weekId, leagueId: 2, memberCount: Object.keys(members).length, members }];
    }));
    const store = makeDb({
      users: { 'stable-self': { progress: { user_name: 'Vitalii' } } },
      leaderboard: { 'stable-self': { leagueId: 2 } },
      league_groups: groups,
    });

    const res = await callableRun(leagueJoinOrUpdateGroup, {
      stableId: 'stable-self',
      weekId,
      leagueId: 2,
      member: { name: 'Vitalii', points: 10 },
    }, 'auth-self');

    expect(res).toMatchObject({ ok: true, groupId: 'group-500', weekId, leagueId: 2 });
    const duplicate = (store.league_groups['group-000']?.members as Record<string, Record<string, unknown>>)['stable-self'];
    expect(duplicate).toMatchObject({
      identityHidden: true,
      canonicalStableId: 'stable-self',
      duplicateOfGroupId: 'group-500',
    });
  });

  it('overrides protected client fields and refreshes leaderboard without dropping group fields', async () => {
    const weekId = currentWeekId();
    const store = makeDb({
      users: {
        'stable-self': {
          progress: {
            user_name: 'Vitalii',
            weekly_xp: '413',
            weekly_xp_period_start: currentMondayUtcIso(),
            streak_count: '89',
            user_total_xp: '900',
          },
        },
      },
      leaderboard: {
        'stable-self': {
          groupId: 'group-1',
          groupWeekId: weekId,
          leagueId: 2,
          streak: 47,
          points: 47,
          preservedProjection: 'keep',
        },
      },
      league_groups: {
        'group-1': {
          weekId,
          leagueId: 2,
          members: { 'stable-self': { uid: 'stable-self', name: 'Old', preservedGroupField: 'keep' } },
        },
      },
    });

    const res = await callableRun(leagueJoinOrUpdateGroup, {
      stableId: 'stable-self',
      weekId,
      leagueId: 2,
      member: {
        name: 'Spoofed',
        points: 999_999,
        streak: 1,
        totalXp: 1,
        isPremium: true,
        isVip: true,
        isLifetime: true,
      },
    }, 'auth-self');

    expect(res.ok).toBe(true);
    const member = (store.league_groups['group-1']?.members as Record<string, Record<string, unknown>>)['stable-self'];
    expect(member).toMatchObject({
      name: 'Vitalii',
      points: 413,
      streak: 89,
      totalXp: 900,
      isPremium: false,
      isVip: false,
      isLifetime: false,
      preservedGroupField: 'keep',
    });
    expect(store.leaderboard['stable-self']).toMatchObject({
      groupId: 'group-1',
      groupWeekId: weekId,
      leagueId: 2,
      weekKey: weekId,
      weekPoints: 413,
      streak: 89,
      points: 900,
      preservedProjection: 'keep',
    });
  });
});
