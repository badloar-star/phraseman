/**
 * X05: immutable weekly freeze. These tests intentionally import the real
 * finalization handler/module; Firestore is an optimistic in-memory fake.
 */
jest.mock('firebase-functions/v2/scheduler', () => ({ onSchedule: (_o: unknown, fn: unknown) => fn }));
jest.mock('./cron_heartbeat', () => ({ withCronHeartbeat: (_n: string, fn: unknown) => fn }));
const mockPush = jest.fn();
jest.mock('./spire_week_result_push', () => ({ runSpireWeekResultPush: (...args: unknown[]) => mockPush(...args) }));
const mockPayout = jest.fn();
let mockUseActualPayout = false;
jest.mock('./spire_week_payout', () => {
  const actual = jest.requireActual('./spire_week_payout');
  return { ...actual, payoutSpireWeekReward: (...args: unknown[]) => mockUseActualPayout ? actual.payoutSpireWeekReward(...args) : mockPayout(...args) };
});

import {
  SPIRE_FINALIZATION_FREEZE_SCHEMA,
  classifySpireFinalizationFreeze,
  completeFrozenSpireRoom,
  freezeSpireRoom,
  loadFrozenSpireRoomResults,
} from './spire_finalization_freeze';
import { runSpireFinalizeCronHandler, spirePreviousWeek } from './spire_finalize_cron';
import { SPIRE_CONFIG_DEFAULTS } from './spire_config_contract';

describe('spire finalization freeze contract', () => {
  test('markerless partial legacy room is quarantined, never adopted as a freeze', () => {
    expect(classifySpireFinalizationFreeze({ weekId: '2026-W41', lang: 'en' }, undefined, 1)).toEqual({
      kind: 'hold', reason: 'legacy_unfrozen_result',
    });
  });

  test('zero-member room remains an explicit unfrozen hold', () => {
    expect(classifySpireFinalizationFreeze({ weekId: '2026-W41', lang: 'en', members: {} }, undefined, 0)).toEqual({
      kind: 'hold', reason: 'zero_member_unfrozen_hold',
    });
  });

  test('exports the actual handler seam used by the schedule wrapper', () => {
    expect(typeof runSpireFinalizeCronHandler).toBe('function');
    expect(SPIRE_FINALIZATION_FREEZE_SCHEMA).toBe('spire-finalization-freeze.v1');
  });
});

type Doc = Record<string, unknown>;
function clone<T>(value: T): T { return value === undefined ? value : JSON.parse(JSON.stringify(value)); }

function statefulFirestore(seed: Record<string, Doc>) {
  const docs = new Map(Object.entries(seed).map(([path, value]) => [path, clone(value)]));
  const versions = new Map([...docs.keys()].map((path) => [path, 1]));
  let transactionCalls = 0;
  let failTransactionAt = -1;
  let beforeCommit: (() => void) | null = null;
  const merge = (before: Doc, patch: Doc): Doc => {
    const next = clone(before);
    for (const [key, value] of Object.entries(clone(patch))) {
      const parts = key.split('.');
      let target = next;
      for (const part of parts.slice(0, -1)) target = (target[part] ??= {}) as Doc;
      target[parts[parts.length - 1]] = value;
    }
    return next;
  };
  const write = (path: string, value: Doc, shouldMerge = false) => {
    docs.set(path, shouldMerge ? merge(docs.get(path) ?? {}, value) : clone(value));
    versions.set(path, (versions.get(path) ?? 0) + 1);
  };
  const ref = (path: string): any => ({
    path,
    id: path.split('/').at(-1),
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) }),
    get: async () => snap(path),
    set: async (data: Doc, options?: { merge?: boolean }) => write(path, data, options?.merge === true),
    update: async (data: Doc) => write(path, data, true),
  });
  const snap = (path: string): any => ({
    id: path.split('/').at(-1), ref: ref(path), exists: docs.has(path),
    data: () => clone(docs.get(path)),
    get: (field: string) => clone((docs.get(path) ?? {})[field]),
  });
  const collection = (name: string): any => {
    const filters: Array<[string, unknown]> = [];
    let after = '';
    const query: any = {
      doc: (id: string) => ref(`${name}/${id}`),
      where: (field: string, _op: string, value: unknown) => { filters.push([field, value]); return query; },
      orderBy: () => query,
      limit: () => query,
      startAfter: (last: { id: string }) => { after = last.id; return query; },
      get: async () => {
        const rows = [...docs.entries()]
          .filter(([path]) => path.startsWith(`${name}/`) && path.split('/').length === 2)
          .filter(([, data]) => filters.every(([field, value]) => data[field] === value))
          .filter(([path]) => path.split('/')[1] > after)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([path]) => snap(path));
        return { empty: rows.length === 0, docs: rows, size: rows.length };
      },
    };
    return query;
  };
  const db: any = {
    collection,
    collectionGroup: (name: string) => {
      let field = '';
      let value: unknown;
      const query: any = {
        where: (nextField: string, _op: string, nextValue: unknown) => { field = nextField; value = nextValue; return query; },
        limit: () => query,
        get: async () => {
          const rows = [...docs.entries()]
            .filter(([path, data]) => path.includes(`/${name}/`) && data[field] === value)
            .slice(0, 1).map(([path]) => snap(path));
          return { empty: rows.length === 0, docs: rows, size: rows.length };
        },
        __queryGet: async () => query.get(),
      };
      return query;
    },
    getAll: async (...args: unknown[]) => (args.filter((arg) => typeof arg === 'object' && arg && 'path' in (arg as object)) as Array<{ path: string }>).map((r) => snap(r.path)),
    runTransaction: async (fn: (tx: any) => Promise<unknown>) => {
      transactionCalls += 1;
      if (transactionCalls === failTransactionAt) throw new Error('injected-after-partial-payout');
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const reads = new Map<string, number>();
        const writes: Array<() => void> = [];
        const tx = {
          get: async (r: { path?: string; __queryGet?: () => Promise<unknown> }) => {
            if (r.__queryGet) return r.__queryGet();
            const path = String(r.path);
            reads.set(path, versions.get(path) ?? 0);
            return snap(path);
          },
          create: (r: { path: string }, data: Doc) => writes.push(() => { if (docs.has(r.path)) throw new Error('already-exists'); write(r.path, data); }),
          set: (r: { path: string }, data: Doc, options?: { merge?: boolean }) => writes.push(() => write(r.path, data, options?.merge === true)),
          update: (r: { path: string }, data: Doc) => writes.push(() => write(r.path, data, true)),
        };
        const result = await fn(tx);
        if (beforeCommit) { const hook = beforeCommit; beforeCommit = null; hook(); }
        if ([...reads].some(([path, version]) => (versions.get(path) ?? 0) !== version)) continue;
        writes.forEach((op) => op());
        return result;
      }
      throw new Error('transaction-contention');
    },
  };
  return {
    db, docs, write,
    failTransaction: (call: number) => { failTransactionAt = call; },
    setBeforeCommit: (hook: () => void) => { beforeCommit = hook; },
  };
}

function cronFixture(roomPatch: Doc = {}) {
  const now = Date.UTC(2026, 10, 9, 0, 1);
  const { weekId, weekStartMs } = spirePreviousWeek(now);
  const fake = statefulFirestore({
    'config/spire_v1': { ...SPIRE_CONFIG_DEFAULTS, enabled: true, rankBy: 'steps' },
    'spire_groups/g1': {
      weekId, lang: 'en', tier: 3, weekStartMs, cohortDay: 1, open: true, liveMemberCount: 1,
      members: { u1: { name: 'One', steps: 2, reachedAtMs: weekStartMs + 1000, totalMs: 1000, joinedAtMs: weekStartMs } },
      ...roomPatch,
    },
    'users/u1': { stars: {} },
  });
  return { ...fake, now, weekId, weekStartMs };
}

describe('actual cron handler retry', () => {
  beforeEach(() => {
    mockUseActualPayout = false;
    mockPayout.mockReset();
    mockPush.mockReset().mockResolvedValue({ sent: 0 });
  });
  test('partial payout + late old-week earn preserves the frozen decision and reward', async () => {
    const now = Date.UTC(2026, 10, 9, 0, 1);
    const { weekId, weekStartMs } = spirePreviousWeek(now);
    const stars = (earned: number) => ({ balance: earned, earnedTotal: earned, grantedTotal: 0, spentTotal: 0, weekKey: weekId, weekEarned: earned, prevWeekKey: '', prevWeekEarned: 0, seasonId: 's', seasonEarned: earned, seq: 1, lastOpId: 'x', bySource: {} });
    const fake = statefulFirestore({
      'config/spire_v1': { ...SPIRE_CONFIG_DEFAULTS, enabled: true, rankBy: 'coins' },
      'spire_groups/g1': {
        weekId, lang: 'en', tier: 3, weekStartMs, cohortDay: 1, open: true, liveMemberCount: 2,
        members: {
          u1: { name: 'One', steps: 2, reachedAtMs: weekStartMs + 1000, totalMs: 1000, joinedAtMs: weekStartMs },
          u2: { name: 'Two', steps: 1, reachedAtMs: weekStartMs + 2000, totalMs: 2000, joinedAtMs: weekStartMs },
        },
      },
      'users/u1': { stars: stars(500) },
      'users/u2': { stars: stars(100) },
    });
    let failSecond = true;
    mockPayout.mockImplementation(async (_db: unknown, input: { uid: string; resultRef: { get: () => Promise<any>; set: (d: Doc, o: { merge: boolean }) => Promise<void> } }) => {
      if (input.uid === 'u2' && failSecond) { failSecond = false; throw new Error('injected-after-partial-payout'); }
      const result = (await input.resultRef.get()).data() as Doc;
      const coins = Number((result.rewardCoins as Doc).total ?? 0);
      await input.resultRef.set({ rewardStatus: coins > 0 ? 'paid' : 'none', settlementStatus: 'settled' }, { merge: true });
      return { uid: input.uid, status: 'already_paid', opId: 'same', coins };
    });

    await expect(runSpireFinalizeCronHandler(fake.db, now)).rejects.toThrow('spire_payouts_incomplete:1');
    const before = clone(fake.docs.get(`users/u2/spire_week_results/${weekId}_en`) as Doc);
    const user2 = clone(fake.docs.get('users/u2') as Doc);
    (user2.stars as Doc).weekEarned = 50_000;
    fake.write('users/u2', user2);

    await expect(runSpireFinalizeCronHandler(fake.db, now)).resolves.toEqual(expect.objectContaining({ rooms: 1 }));
    const after = fake.docs.get(`users/u2/spire_week_results/${weekId}_en`) as Doc;
    expect(after.decisionHash).toBe(before.decisionHash);
    expect(after.rewardCoins).toEqual(before.rewardCoins);
    expect(after.weekCoins).toBe(before.weekCoins);
    expect((fake.docs.get('spire_groups/g1') as Doc).finalizedAt).toBeDefined();
  });

  test('real payout/receipt stays bound to the same frozen reward across retry', async () => {
    mockUseActualPayout = true;
    const now = Date.UTC(2026, 10, 9, 0, 1);
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const { weekId, weekStartMs } = spirePreviousWeek(now);
    const stars = (earned: number) => ({
      balance: earned, earnedTotal: earned, grantedTotal: 0, spentTotal: 0,
      weekKey: weekId, weekEarned: earned, prevWeekKey: '', prevWeekEarned: 0,
      seasonId: '', seasonEarned: 0, seq: 0, lastOpId: '', bySource: {},
    });
    const fake = statefulFirestore({
      'config/spire_v1': { ...SPIRE_CONFIG_DEFAULTS, enabled: true, rankBy: 'coins' },
      'spire_groups/g1': {
        weekId, lang: 'en', tier: 5, weekStartMs, cohortDay: 1, open: true, liveMemberCount: 2,
        members: {
          u1: { name: 'One', steps: 2, reachedAtMs: weekStartMs + 1000, totalMs: 1000, joinedAtMs: weekStartMs },
          u2: { name: 'Two', steps: 1, reachedAtMs: weekStartMs + 2000, totalMs: 2000, joinedAtMs: weekStartMs },
        },
      },
      'users/u1': { stars: stars(1000) },
      'users/u2': { stars: stars(900) },
    });
    // 1 = freeze, 2 = first actual payout, 3 = injected second payout failure.
    fake.failTransaction(3);
    await expect(runSpireFinalizeCronHandler(fake.db, now)).rejects.toThrow('spire_payouts_incomplete:1');
    const resultPath = `users/u1/spire_week_results/${weekId}_en`;
    const receiptPath = `users/u1/star_operations/spire_week:en_${weekId}`;
    const before = clone(fake.docs.get(resultPath) as Doc);
    expect((fake.docs.get(receiptPath) as Doc).delta).toBe((before.rewardCoins as Doc).total);

    const user2 = clone(fake.docs.get('users/u2') as Doc);
    (user2.stars as Doc).balance = 1100;
    (user2.stars as Doc).earnedTotal = 1100;
    (user2.stars as Doc).weekEarned = 1100;
    fake.write('users/u2', user2);
    await expect(runSpireFinalizeCronHandler(fake.db, now)).resolves.toEqual(expect.objectContaining({ rooms: 1 }));

    const after = fake.docs.get(resultPath) as Doc;
    expect(after.decisionHash).toBe(before.decisionHash);
    expect(after.rewardCoins).toEqual(before.rewardCoins);
    expect((fake.docs.get(receiptPath) as Doc).delta).toBe((after.rewardCoins as Doc).total);
  });

  test('a present null integrity hold is incomplete, creates no freeze/result, and sends no push', async () => {
    const fake = cronFixture({ finalizationIntegrityHold: null });
    mockPayout.mockResolvedValue({ uid: 'u1', status: 'already_paid', opId: 'same', coins: 0 });

    await expect(runSpireFinalizeCronHandler(fake.db, fake.now)).rejects.toThrow('spire_payouts_incomplete:1');
    expect(mockPayout).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(fake.docs.get(`users/u1/spire_week_results/${fake.weekId}_en`)).toBeUndefined();
    expect(fake.docs.get('spire_groups/g1')?.finalizationFreeze).toBeUndefined();
  });

  test('an invalid frozen-row load is incomplete and sends no push', async () => {
    const { weekId } = spirePreviousWeek(Date.UTC(2026, 10, 9, 0, 1));
    const freeze = {
      schema: 'spire-finalization-freeze.v1', state: 'frozen', weekId, lang: 'en', rankBy: 'steps',
      frozenResultCount: 1, removedAfterFreezeCount: 0, resultsDigest: 'a'.repeat(64),
      configEvidenceSchema: 'spire-finalization-config-evidence.v1', configEvidenceHash: 'b'.repeat(64),
      inputEvidenceSchema: 'spire-finalization-input-evidence.v1', inputEvidenceHash: 'c'.repeat(64), frozenAt: 'TS',
    };
    const fake = cronFixture({ finalizationFreeze: freeze });

    await expect(runSpireFinalizeCronHandler(fake.db, fake.now)).rejects.toThrow('spire_payouts_incomplete:1');
    expect(mockPayout).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  test.each([
    ['rejected', async () => ({ uid: 'u1', status: 'rejected', opId: 'same', coins: 0 })],
    ['skipped', async () => ({ uid: 'u1', status: 'skipped_user_missing', opId: 'same', coins: 0 })],
    ['thrown', async () => { throw new Error('bounded-failure'); }],
  ])('does not enqueue push for a %s payout', async (_name, payout) => {
    const fake = cronFixture();
    mockPayout.mockImplementation(payout);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(runSpireFinalizeCronHandler(fake.db, fake.now)).rejects.toThrow('spire_payouts_incomplete:1');
    expect(mockPush).not.toHaveBeenCalled();
    expect(errorSpy.mock.calls.flat().join(' ')).not.toContain('"uid":"u1"');
  });
});

describe('optimistic freeze races and path binding', () => {
  function fixture() {
    const now = Date.UTC(2026, 10, 9, 0, 1);
    const { weekId, weekStartMs } = spirePreviousWeek(now);
    const stars = (earned: number) => ({
      balance: earned, earnedTotal: earned, grantedTotal: 0, spentTotal: 0,
      weekKey: weekId, weekEarned: earned, prevWeekKey: '', prevWeekEarned: 0,
      seasonId: '', seasonEarned: 0, seq: 0, lastOpId: '', bySource: {},
    });
    const fake = statefulFirestore({
      'config/spire_v1': { ...SPIRE_CONFIG_DEFAULTS, enabled: true, rankBy: 'coins' },
      'spire_groups/g1': {
        weekId, lang: 'en', tier: 5, weekStartMs, cohortDay: 1, open: true, liveMemberCount: 2,
        members: {
          u1: { name: 'One', steps: 2, reachedAtMs: weekStartMs + 1000, totalMs: 1000, joinedAtMs: weekStartMs },
          u2: { name: 'Two', steps: 1, reachedAtMs: weekStartMs + 2000, totalMs: 2000, joinedAtMs: weekStartMs },
        },
      },
      'users/u1': { stars: stars(1000) },
      'users/u2': { stars: stars(900) },
    });
    return { ...fake, weekId, weekStartMs, roomRef: fake.db.collection('spire_groups').doc('g1') };
  }

  test('stale score/config attempt conflicts and retry freezes new authoritative inputs', async () => {
    const f = fixture();
    f.setBeforeCommit(() => {
      const u2 = clone(f.docs.get('users/u2') as Doc);
      (u2.stars as Doc).weekEarned = 1100;
      (u2.stars as Doc).earnedTotal = 1100;
      (u2.stars as Doc).balance = 1100;
      f.write('users/u2', u2);
      const config = clone(f.docs.get('config/spire_v1') as Doc);
      config.coins = { ...(config.coins as Doc), weekPlace1: 777 };
      f.write('config/spire_v1', config);
    });
    const outcome = await freezeSpireRoom(f.db, f.roomRef, f.weekStartMs);
    expect(outcome.status).toBe('frozen');
    const u2 = f.docs.get(`users/u2/spire_week_results/${f.weekId}_en`) as Doc;
    expect(u2.weekCoins).toBe(1100);
    expect((u2.rewardCoins as Doc).place).toBe(777);
  });

  test('markerless legacy result of an already-removed member quarantines the room', async () => {
    const f = fixture();
    f.write(`users/deleted/spire_week_results/${f.weekId}_en`, { groupId: 'g1', weekId: f.weekId, lang: 'en' });
    await expect(freezeSpireRoom(f.db, f.roomRef, f.weekStartMs)).resolves.toEqual(expect.objectContaining({
      status: 'hold', reason: 'legacy_unfrozen_result',
    }));
    const room = f.docs.get('spire_groups/g1') as Doc;
    expect(room.finalizationFreeze).toBeUndefined();
    expect(room.finalizationIntegrityHold).toBeUndefined();
  });

  test('zero-member first attempt writes only a quarantine hold, never an empty freeze', async () => {
    const f = fixture();
    const room = clone(f.docs.get('spire_groups/g1') as Doc);
    room.members = {};
    room.liveMemberCount = 0;
    f.write('spire_groups/g1', room);
    await expect(freezeSpireRoom(f.db, f.roomRef, f.weekStartMs)).resolves.toEqual(expect.objectContaining({
      status: 'hold', reason: 'zero_member_unfrozen_hold',
    }));
    const stored = f.docs.get('spire_groups/g1') as Doc;
    expect(stored.finalizationFreeze).toBeUndefined();
    expect(stored.finalizationIntegrityHold).toBeUndefined();
  });

  test('swapping frozen result rows between user paths is rejected by the loader', async () => {
    const f = fixture();
    await freezeSpireRoom(f.db, f.roomRef, f.weekStartMs);
    const p1 = `users/u1/spire_week_results/${f.weekId}_en`;
    const p2 = `users/u2/spire_week_results/${f.weekId}_en`;
    const r1 = clone(f.docs.get(p1) as Doc);
    const r2 = clone(f.docs.get(p2) as Doc);
    f.write(p1, r2);
    f.write(p2, r1);
    await expect(loadFrozenSpireRoomResults(f.db, f.roomRef)).resolves.toEqual({ status: 'integrity_result_binding' });
  });

  test.each([null, false, 0, ''])('loader and completion reject any present integrity hold: %p', async (hold) => {
    const f = fixture();
    await freezeSpireRoom(f.db, f.roomRef, f.weekStartMs);
    const room = clone(f.docs.get('spire_groups/g1') as Doc);
    room.finalizationIntegrityHold = hold;
    f.write('spire_groups/g1', room);

    await expect(loadFrozenSpireRoomResults(f.db, f.roomRef)).resolves.toEqual({ status: 'integrity_room_hold' });
    await expect(completeFrozenSpireRoom(f.db, f.roomRef)).resolves.toEqual({ status: 'integrity_room_hold' });
    expect(f.docs.get('spire_groups/g1')?.finalizedAt).toBeUndefined();
  });

  test('completion retries across concurrent privacy deletion and verifies survivors', async () => {
    const f = fixture();
    await freezeSpireRoom(f.db, f.roomRef, f.weekStartMs);
    for (const uid of ['u1', 'u2']) {
      const path = `users/${uid}/spire_week_results/${f.weekId}_en`;
      f.write(path, { ...(f.docs.get(path) as Doc), settlementStatus: 'settled' });
    }
    for (const uid of ['u1', 'u2']) {
      const path = `users/${uid}/spire_week_results/${f.weekId}_en`;
      f.write(path, { ...(f.docs.get(path) as Doc), rewardStatus: 'none' });
    }
    f.setBeforeCommit(() => {
      const room = clone(f.docs.get('spire_groups/g1') as Doc);
      delete (room.members as Doc).u2;
      room.liveMemberCount = 1;
      room.finalizationFreeze = {
        ...(room.finalizationFreeze as Doc),
        removedAfterFreezeCount: Number((room.finalizationFreeze as Doc).removedAfterFreezeCount) + 1,
      };
      f.write('spire_groups/g1', room);
    });
    await expect(completeFrozenSpireRoom(f.db, f.roomRef)).resolves.toEqual({ status: 'finalized' });
    expect((f.docs.get('spire_groups/g1') as Doc).finalizedAt).toBeDefined();
  });
});
