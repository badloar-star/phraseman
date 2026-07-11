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
const { getLeagueWeekPoints, leagueJoinOrUpdateGroup, leagueUpdateMyMember } = require('./league_groups');

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
  const store: Store = {
    users: { ...(initial.users ?? {}) },
    leaderboard: { ...(initial.leaderboard ?? {}) },
    league_groups: { ...(initial.league_groups ?? {}) },
    name_index: { ...(initial.name_index ?? {}) },
    banned_users: { ...(initial.banned_users ?? {}) },
  };

  const snapFor = (id: string, data: Record<string, unknown> | undefined) => ({
    id,
    exists: !!data,
    data: () => data,
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
    get: async () => snapFor(id, store[collectionName]?.[id]),
    set: async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
      store[collectionName] = store[collectionName] ?? {};
      const base = options?.merge ? { ...(store[collectionName][id] ?? {}) } : {};
      for (const [key, value] of Object.entries(data)) setDotted(base, key, value);
      store[collectionName][id] = base;
    },
  });

  currentDb = {
    collection: (collectionName: string) => ({
      doc: (id: string) => docApi(collectionName, id),
      where: (field: string, op: string, value: unknown) => ({
        limit: () => ({
          get: async () => ({
            docs: Object.entries(store[collectionName] ?? {})
              .filter(([, data]) => data && op === '==' && readField(data, field) === value)
              .map(([id, data]) => snapFor(id, data)),
          }),
        }),
      }),
    }),
    runTransaction: async (callback: (tx: any) => Promise<unknown>) => callback({
      get: (ref: any) => ref.get(),
      set: (ref: any, data: Record<string, unknown>, options?: { merge?: boolean }) => ref.set(data, options),
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
