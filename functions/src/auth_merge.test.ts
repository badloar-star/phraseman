import {
  chooseSurvivingAttribution,
  mergeShards,
  mergeStableAccounts,
  mergeUserProgress,
  processAccountMergeOutboxJob,
  repointReferralOnMerge,
} from './auth_merge';
import { createHash } from 'crypto';
import { accountDeletePermanentDenialId } from './account_delete_job';
import { LEVEL_UP_ANNUAL_GIFT_OFFERING_ID } from './level_up_annual_gift';
import {
  LEVEL_UP_ANNUAL_GIFT_ATTEMPT_ATTRIBUTE,
  decideLevelUpAnnualGiftWebhook,
  type LevelUpAnnualGiftOfferRecord,
  type LevelUpAnnualGiftPurchaseAttemptRecord,
} from './level_up_annual_gift_server';

const NOW = 1_777_000_000_000;
const FUTURE = NOW + 30 * 24 * 60 * 60 * 1000; // +30d
const PAST = NOW - 30 * 24 * 60 * 60 * 1000; // -30d

// ── Referral repoint on merge ───────────────────────────────────────────────────

describe('mergeUserProgress — referral claim counters (анти-сброс капа через мерж)', () => {
  it('СУММИРУЕТ месячные счётчики наград по месяцам (не теряет счёт лузера)', () => {
    const out = mergeUserProgress(
      { referral_vip_claims_monthly: { '2026-06': 20 } as unknown as string },
      { referral_vip_claims_monthly: { '2026-06': 15, '2026-05': 7 } as unknown as string },
      NOW,
    );
    const m = out.referral_vip_claims_monthly as unknown as Record<string, number>;
    expect(m['2026-06']).toBe(35); // 20 + 15 — иначе мерж сбрасывал бы кап
    expect(m['2026-05']).toBe(7);
  });

  it('суммирует дневные счётчики по дням', () => {
    const out = mergeUserProgress(
      { referral_vip_claims_daily: { '2026-06-14': 3 } as unknown as string },
      { referral_vip_claims_daily: { '2026-06-14': 2, '2026-06-13': 1 } as unknown as string },
      NOW,
    );
    const d = out.referral_vip_claims_daily as unknown as Record<string, number>;
    expect(d['2026-06-14']).toBe(5);
    expect(d['2026-06-13']).toBe(1);
  });

  it('берёт сторону, где есть данные, если у другой пусто', () => {
    const out = mergeUserProgress(
      {},
      { referral_vip_claims_monthly: { '2026-06': 9 } as unknown as string },
      NOW,
    );
    expect((out.referral_vip_claims_monthly as unknown as Record<string, number>)['2026-06']).toBe(9);
  });
});

describe('chooseSurvivingAttribution — какой referee-attribution оставить при коллизии', () => {
  // На новый id (winner) переезжает attribution лузера; если у winner уже есть свой —
  // оставляем «дальше прошедший» по статусу, чтобы НЕ потерять награду и НЕ выдать дважды.
  const att = (status: string, extra: Record<string, unknown> = {}): { status: string; refCode?: string } => ({ status, ...extra });

  it('rewarded побеждает qualified и pending', () => {
    expect(chooseSurvivingAttribution(att('rewarded'), att('qualified')).status).toBe('rewarded');
    expect(chooseSurvivingAttribution(att('pending'), att('rewarded')).status).toBe('rewarded');
  });

  it('qualified побеждает pending', () => {
    expect(chooseSurvivingAttribution(att('qualified'), att('pending')).status).toBe('qualified');
  });

  it('при равном статусе берёт существующий у winner (a)', () => {
    const a = att('qualified', { refCode: 'AAA' });
    const b = att('qualified', { refCode: 'BBB' });
    expect(chooseSurvivingAttribution(a, b).refCode).toBe('AAA');
  });

  it('если одна сторона отсутствует — берёт имеющуюся', () => {
    expect(chooseSurvivingAttribution(undefined, att('pending')).status).toBe('pending');
    expect(chooseSurvivingAttribution(att('qualified'), undefined).status).toBe('qualified');
  });
});

// ── Pure merge math ───────────────────────────────────────────────────────────

describe('mergeUserProgress — numeric accumulation', () => {
  it('takes the max of integer-string fields', () => {
    const out = mergeUserProgress(
      { user_total_xp: '6812', streak_count: '2', achievement_quiz_total_count: '40' },
      { user_total_xp: '2309', streak_count: '9', achievement_quiz_total_count: '12' },
      NOW,
    );
    expect(out.user_total_xp).toBe('6812');
    expect(out.streak_count).toBe('9'); // loser had a higher streak — kept
    expect(out.achievement_quiz_total_count).toBe('40');
  });

  it('keeps numeric strings as strings (progress is a string map)', () => {
    const out = mergeUserProgress({ user_total_xp: '100' }, { user_total_xp: '200' }, NOW);
    expect(out.user_total_xp).toBe('200');
    expect(typeof out.user_total_xp).toBe('string');
  });

  it('does NOT max JSON-blob / non-integer fields (treats as opaque, winner wins)', () => {
    const winnerLessons = JSON.stringify(['l1', 'l2', 'l3']);
    const loserLessons = JSON.stringify(['l9']);
    const out = mergeUserProgress(
      { unlocked_lessons: winnerLessons },
      { unlocked_lessons: loserLessons },
      NOW,
    );
    expect(out.unlocked_lessons).toBe(winnerLessons); // winner's, not numerically maxed
  });

  it('fills a field from loser when winner is missing it', () => {
    const out = mergeUserProgress({ user_total_xp: '100' }, { user_avatar: 'cat' }, NOW);
    expect(out.user_total_xp).toBe('100');
    expect(out.user_avatar).toBe('cat');
  });

  it('fills from loser when winner value is blank/null-ish', () => {
    const out = mergeUserProgress(
      { user_name: '', user_avatar: 'null' },
      { user_name: 'Civi', user_avatar: 'fox' },
      NOW,
    );
    expect(out.user_name).toBe('Civi');
    expect(out.user_avatar).toBe('fox');
  });

  it('prefers winner for conflicting opaque strings', () => {
    const out = mergeUserProgress({ user_name: 'Winner' }, { user_name: 'Loser' }, NOW);
    expect(out.user_name).toBe('Winner');
  });

  it('does not mutate the inputs', () => {
    const w = { user_total_xp: '1' };
    const l = { user_total_xp: '2' };
    mergeUserProgress(w, l, NOW);
    expect(w).toEqual({ user_total_xp: '1' });
    expect(l).toEqual({ user_total_xp: '2' });
  });
});

describe('mergeUserProgress — premium carries over (must never drop a paid user)', () => {
  it('carries an active store-premium block from the LOSER onto the result', () => {
    const winner = { user_total_xp: '9999', premium_rc_active_lineage: 'stale-winner-lineage' }; // higher XP, but free
    const loser = {
      user_total_xp: '10',
      premium_plan: 'yearly',
      premium_expiry: String(FUTURE),
      premium_rc_store: 'app_store',
      had_premium_ever: 'true',
      premium_rc_active_lineage: 'paid-loser-lineage',
      premium_rc_reconcile_needed: 'false',
    };
    const out = mergeUserProgress(winner, loser, NOW);
    expect(out.premium_plan).toBe('yearly');
    expect(out.premium_expiry).toBe(String(FUTURE));
    expect(out.premium_rc_store).toBe('app_store');
    expect(out.had_premium_ever).toBe('true');
    expect(out.premium_rc_active_lineage).toBe('paid-loser-lineage');
    expect(out.premium_rc_reconcile_needed).toBe('false');
  });

  it('prefers the side with the furthest premium expiry', () => {
    const a = { user_total_xp: '50', premium_plan: 'monthly', premium_expiry: String(NOW + 1000) };
    const b = { user_total_xp: '10', premium_plan: 'yearly', premium_expiry: String(FUTURE) };
    const out = mergeUserProgress(a, b, NOW);
    expect(out.premium_plan).toBe('yearly');
    expect(out.premium_expiry).toBe(String(FUTURE));
  });

  it('treats an open-ended (expiry<=0) subscription as the strongest', () => {
    const a = { premium_plan: 'monthly', premium_expiry: String(FUTURE) };
    const b = { premium_plan: 'yearly', premium_expiry: '0' }; // no expiry = lifetime
    const out = mergeUserProgress(a, b, NOW);
    expect(out.premium_plan).toBe('yearly');
    expect(out.premium_expiry).toBe('0');
  });

  it('does not mix premium keys across the two sides (consistent block)', () => {
    const a = { premium_plan: 'yearly', premium_expiry: String(FUTURE), premium_rc_store: 'A' };
    const b = { premium_plan: 'monthly', premium_expiry: String(NOW + 5), premium_rc_store: 'B' };
    const out = mergeUserProgress(a, b, NOW);
    // Winning side is A (further expiry) — store must also be A's, not B's.
    expect(out.premium_plan).toBe('yearly');
    expect(out.premium_rc_store).toBe('A');
  });

  it('had_premium_ever is sticky-true if either side ever had premium', () => {
    const out = mergeUserProgress({ had_premium_ever: 'false' }, { had_premium_ever: 'true' }, NOW);
    expect(out.had_premium_ever).toBe('true');
  });

  it('lifetime (plan=lifetime, expiry=0) wins over an active subscription', () => {
    const a = { premium_plan: 'yearly', premium_expiry: String(FUTURE), premium_rc_store: 'APP_STORE' };
    const b = { premium_plan: 'lifetime', premium_expiry: '0', premium_rc_store: 'APP_STORE' };
    const out = mergeUserProgress(a, b, NOW);
    // lifetime expiry=0 → MAX_SAFE_INTEGER strength → wins
    expect(out.premium_plan).toBe('lifetime');
    expect(out.premium_expiry).toBe('0');
  });

  it('lifetime from loser side carries over to winner with no premium', () => {
    const winner = { user_total_xp: '9999', premium_plan: '' };
    const loser = { user_total_xp: '5', premium_plan: 'lifetime', premium_expiry: '0' };
    const out = mergeUserProgress(winner, loser, NOW);
    expect(out.premium_plan).toBe('lifetime');
    expect(out.premium_expiry).toBe('0');
  });
});

describe('mergeUserProgress — VIP carries over', () => {
  it('carries an active VIP block from the loser', () => {
    const winner = { user_total_xp: '9999' };
    const loser = {
      user_total_xp: '5',
      vip_active: 'true',
      vip_plan: 'admin_vip',
      vip_until: String(FUTURE),
      vip_admin_override: 'true',
    };
    const out = mergeUserProgress(winner, loser, NOW);
    expect(out.vip_active).toBe('true');
    expect(out.vip_plan).toBe('admin_vip');
    expect(out.vip_until).toBe(String(FUTURE));
  });

  it('prefers active VIP over expired VIP', () => {
    const a = { vip_active: 'true', vip_plan: 'admin_vip', vip_until: String(PAST) }; // expired
    const b = { vip_active: 'true', vip_plan: 'referral', vip_until: String(FUTURE) }; // active
    const out = mergeUserProgress(a, b, NOW);
    expect(out.vip_plan).toBe('referral');
    expect(out.vip_until).toBe(String(FUTURE));
  });

  it('keeps premium and VIP independent (both can carry from different sides)', () => {
    const a = { premium_plan: 'yearly', premium_expiry: String(FUTURE) }; // premium, no vip
    const b = { vip_active: 'true', vip_plan: 'admin_vip', vip_until: String(FUTURE) }; // vip, no premium
    const out = mergeUserProgress(a, b, NOW);
    expect(out.premium_plan).toBe('yearly');
    expect(out.vip_active).toBe('true');
    expect(out.vip_plan).toBe('admin_vip');
  });
});

describe('mergeShards', () => {
  it('takes the max balance', () => {
    expect(mergeShards(491, 1325)).toBe(1325);
    expect(mergeShards('100', '50')).toBe(100);
  });
  it('handles missing sides', () => {
    expect(mergeShards(undefined, 10)).toBe(10);
    expect(mergeShards(10, undefined)).toBe(10);
    expect(mergeShards(undefined, undefined)).toBeUndefined();
  });
});

// ── Integration: mergeStableAccounts (Admin-SDK path) ─────────────────────────

type DocData = Record<string, unknown>;
type Store = Record<string, Record<string, DocData | undefined>>;

function makeDbStub(
  initial: Store = {},
  options?: {
    afterDocGet?: (
      collection: string,
      id: string,
      count: number,
      mutate: (data: DocData | undefined) => void,
    ) => void;
    afterQueryGet?: (
      collection: string,
      ids: string[],
      mutate: (id: string, data: DocData | undefined) => void,
    ) => void;
    afterQueryGetAny?: (
      collection: string,
      ids: string[],
      mutate: (collection: string, id: string, data: DocData | undefined) => void,
    ) => void;
  },
) {
  const store: Store = {
    ...Object.fromEntries(Object.entries(initial).map(([name, docs]) => [name, { ...docs }])),
    users: { ...(initial.users ?? {}) },
    auth_links: { ...(initial.auth_links ?? {}) },
    leaderboard: { ...(initial.leaderboard ?? {}) },
    league_groups: { ...(initial.league_groups ?? {}) },
    name_index: { ...(initial.name_index ?? {}) },
    identity_cleanup_candidates: { ...(initial.identity_cleanup_candidates ?? {}) },
    account_deletion_auth_markers: { ...(initial.account_deletion_auth_markers ?? {}) },
    account_deletion_tombstones: { ...(initial.account_deletion_tombstones ?? {}) },
    revenuecat_premium_lineages: { ...(initial.revenuecat_premium_lineages ?? {}) },
    account_identity_owner_map: { ...(initial.account_identity_owner_map ?? {}) },
    account_merge_outbox: { ...(initial.account_merge_outbox ?? {}) },
    account_deletion_permanent_denials: { ...(initial.account_deletion_permanent_denials ?? {}) },
    revenuecat_premium_events: { ...(initial.revenuecat_premium_events ?? {}) },
    revenuecat_premium_denials: { ...(initial.revenuecat_premium_denials ?? {}) },
    revenuecat_shard_transactions: { ...(initial.revenuecat_shard_transactions ?? {}) },
    revenuecat_shard_refunds: { ...(initial.revenuecat_shard_refunds ?? {}) },
  };
  let docGetCount = 0;
  const queryLog: Array<{ collection: string; cursor: string; limit: number; ids: string[] }> = [];
  const versions = new Map<string, number>();
  const pathFor = (name: string, id: string) => `${name}/${id}`;
  const mutate = (name: string, id: string, data: DocData | undefined) => {
    store[name] = store[name] ?? {};
    if (data === undefined) delete store[name][id];
    else store[name][id] = { ...data };
    const path = pathFor(name, id);
    versions.set(path, (versions.get(path) ?? 0) + 1);
  };

  const docApi = (name: string, id: string): any => ({
    id,
    path: pathFor(name, id),
    get: async () => {
      const snapshot = snapFor(name, id, store[name]?.[id]);
      docGetCount += 1;
      options?.afterDocGet?.(name, id, docGetCount, (data) => mutate(name, id, data));
      return snapshot;
    },
    set: async (data: DocData) => {
      store[name] = store[name] ?? {};
      const next = { ...(store[name][id] ?? {}), ...data };
      for (const [key, value] of Object.entries(data)) {
        if (!key.startsWith('progress.')) continue;
        const progressKey = key.slice('progress.'.length);
        const progress = { ...((next.progress as DocData | undefined) ?? {}) };
        if (value && typeof value === 'object') delete progress[progressKey];
        else progress[progressKey] = value;
        next.progress = progress;
        delete next[key];
      }
      store[name][id] = next;
      const path = pathFor(name, id);
      versions.set(path, (versions.get(path) ?? 0) + 1);
    },
    delete: async () => {
      if (store[name]) delete store[name][id];
      const path = pathFor(name, id);
      versions.set(path, (versions.get(path) ?? 0) + 1);
    },
    collection: (childName: string) => ({
      doc: (childId: string) => docApi(`${name}/${id}/${childName}`, childId),
    }),
  });

  // ref carries a functional handle (set/delete) so query-result .ref works in repoint logic.
  const snapFor = (name: string, id: string, data: DocData | undefined) => ({
    id,
    ref: docApi(name, id),
    exists: !!data,
    data: () => data,
  });

  const matches = (data: DocData | undefined, field: unknown, op: string, value: unknown): boolean => {
    if (!data || (op !== '==' && op !== 'array-contains')) return false;
    const key = typeof field === 'string' ? field : String((field as { toString(): string }).toString());
    const fieldValue = (data as Record<string, unknown>)[key];
    return op === 'array-contains'
      ? Array.isArray(fieldValue) && fieldValue.includes(value)
      : fieldValue === value;
  };

  const queryApi = (
    name: string,
    field: unknown,
    op: string,
    value: unknown,
    pageLimit = Number.POSITIVE_INFINITY,
    cursor = '',
  ): any => ({
    orderBy: () => queryApi(name, field, op, value, pageLimit, cursor),
    startAfter: (nextCursor: unknown) => queryApi(
      name,
      field,
      op,
      value,
      pageLimit,
      String((nextCursor as { id?: unknown })?.id ?? nextCursor ?? ''),
    ),
    limit: (nextLimit: number) => queryApi(name, field, op, value, nextLimit, cursor),
    get: async () => {
      const docs = Object.entries(store[name] ?? {})
        .filter(([id, data]) => id > cursor && matches(data, field, op, value))
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(0, pageLimit)
        .map(([id, data]) => snapFor(name, id, data));
      queryLog.push({
        collection: name,
        cursor,
        limit: pageLimit,
        ids: docs.map((doc) => doc.id),
      });
      options?.afterQueryGet?.(
        name,
        docs.map((doc) => doc.id),
        (id, data) => mutate(name, id, data),
      );
      options?.afterQueryGetAny?.(name, docs.map((doc) => doc.id), mutate);
      return { empty: docs.length === 0, docs, size: docs.length };
    },
  });

  const db: any = {
    collection: (name: string) => ({
      doc: (id: string) => docApi(name, id),
      where: (field: unknown, op: string, value: unknown) => queryApi(name, field, op, value),
    }),
    batch: () => {
      const ops: Array<() => Promise<void>> = [];
      return {
        // ref (from docApi/snapFor.ref) carries its own collection via closure — write
        // through it directly. Раньше стаб сканировал коллекции по ref.id и писал в ПЕРВУЮ
        // совпавшую — это ломалось, как только один и тот же id жил в двух коллекциях
        // (напр. auth_links/{authUid} + users/{authUid}). Пишем по настоящей ссылке.
        set: (ref: { set: (d: DocData) => Promise<void> }, data: DocData) => {
          ops.push(() => ref.set(data));
        },
        delete: (ref: { delete: () => Promise<void> }) => {
          ops.push(() => ref.delete());
        },
        update: (ref: { set: (d: DocData) => Promise<void> }, data: DocData) => {
          ops.push(() => ref.set(data));
        },
        commit: async () => { for (const fn of ops) await fn(); },
      };
    },
    runTransaction: async (fn: (tx: any) => Promise<unknown>) => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        let hasWritten = false;
        const reads = new Map<string, number>();
        const writes: Array<() => Promise<void>> = [];
        const tx = {
          get: async (ref: { path: string; get: () => Promise<unknown> }) => {
            if (hasWritten) throw new Error('transaction_read_after_write');
            reads.set(ref.path, versions.get(ref.path) ?? 0);
            return ref.get();
          },
          set: (ref: { set: (d: DocData) => Promise<void> }, data: DocData) => {
            hasWritten = true;
            writes.push(() => ref.set(data));
          },
          delete: (ref: { delete: () => Promise<void> }) => {
            hasWritten = true;
            writes.push(() => ref.delete());
          },
          update: (ref: { set: (d: DocData) => Promise<void> }, data: DocData) => {
            hasWritten = true;
            writes.push(() => ref.set(data));
          },
        };
        const result = await fn(tx);
        const conflicted = [...reads].some(([path, version]) => (versions.get(path) ?? 0) !== version);
        if (conflicted) continue;
        for (const write of writes) await write();
        return result;
      }
      throw new Error('transaction_retry_limit');
    },
  };

  return { db, store, queryLog };
}

describe('mergeStableAccounts', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('leases and idempotently completes merge outbox receipt repointing', async () => {
    const bulkReceipts = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [
      `bulk-${index}`,
      { uid: 'loser', eventId: `evt-bulk-${index}` },
    ]));
    const candidateOnlyReceipts = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [
      `candidate-only-${String(index).padStart(3, '0')}`,
      { candidates: ['other', 'loser'], eventId: `evt-candidate-${index}` },
    ]));
    let mergeAdvanced = false;
    const { db, store, queryLog } = makeDbStub({
      account_merge_outbox: {
        merge1: { winnerStableId: 'winner', loserStableId: 'loser', status: 'pending', attempts: 0 },
      },
      revenuecat_premium_events: {
        ...bulkReceipts,
        ...candidateOnlyReceipts,
        receipt1: { uid: 'loser', eventId: 'evt-1' },
        transfer1: { donorIds: ['loser', 'other'], candidates: ['loser', 'other'], recipientId: 'winner' },
      },
    }, {
      afterQueryGetAny: (collection, ids, mutate) => {
        if (!mergeAdvanced && collection === 'revenuecat_premium_events' && ids.length > 0) {
          mergeAdvanced = true;
          mutate('account_identity_owner_map', 'winner', { canonicalStableId: 'winner-next' });
        }
      },
    });

    await expect(processAccountMergeOutboxJob(db as any, 'merge1', NOW)).resolves.toEqual({
      status: 'completed',
      updated: 205,
    });
    expect(store.revenuecat_premium_events.receipt1).toMatchObject({
      uid: 'winner-next',
      canonicalOwnerUid: 'winner-next',
    });
    expect(store.revenuecat_premium_events.transfer1).toMatchObject({
      donorIds: ['winner-next', 'other'],
      candidates: ['winner-next', 'other'],
      canonicalOwnerUid: 'winner-next',
    });
    expect(store.revenuecat_premium_events['bulk-100']).toMatchObject({ uid: 'winner-next' });
    const candidateOnlyPages = queryLog.filter(({ ids }) => (
      ids.some((id) => id.startsWith('candidate-only-'))
    ));
    expect(candidateOnlyPages).toHaveLength(2);
    expect(candidateOnlyPages[0]?.ids).toHaveLength(100);
    expect(candidateOnlyPages[1]?.ids).toContain('candidate-only-100');
    const finalCandidateOnlyReceipt = store.revenuecat_premium_events['candidate-only-100']!;
    expect(finalCandidateOnlyReceipt).toMatchObject({
      candidates: ['other', 'winner-next'],
      canonicalOwnerUid: 'winner-next',
      previousOwnerUidHash: createHash('sha256').update('loser').digest('hex'),
    });
    expect(JSON.stringify(finalCandidateOnlyReceipt)).not.toContain('"loser"');
    expect(store.account_merge_outbox.merge1).toMatchObject({ status: 'completed', updatedDocs: 205 });
    await expect(processAccountMergeOutboxJob(db as any, 'merge1', NOW + 1)).resolves.toEqual({
      status: 'already_completed',
      updated: 0,
    });
  });

  it('cancels receipt repointing when deletion denial wins the race', async () => {
    let deletionStarted = false;
    const { db, store } = makeDbStub({
      account_merge_outbox: {
        mergeDelete: { winnerStableId: 'winner', loserStableId: 'loser', status: 'pending' },
      },
      revenuecat_premium_events: {
        receipt: { uid: 'loser' },
      },
    }, {
      afterQueryGetAny: (collection, ids, mutate) => {
        if (!deletionStarted && collection === 'revenuecat_premium_events' && ids.length > 0) {
          deletionStarted = true;
          mutate('account_deletion_permanent_denials', accountDeletePermanentDenialId('winner'), {
            status: 'denied',
          });
        }
      },
    });

    await expect(processAccountMergeOutboxJob(db as any, 'mergeDelete', NOW)).resolves.toEqual({
      status: 'cancelled',
      updated: 0,
    });
    expect(store.revenuecat_premium_events.receipt).toEqual({ uid: 'loser' });
    expect(store.account_merge_outbox.mergeDelete).toMatchObject({ status: 'cancelled_by_deletion' });
  });

  it('fails closed when the latest canonical owner chain exceeds the bounded hop limit', async () => {
    const ownerMaps = Object.fromEntries(Array.from({ length: 65 }, (_, index) => [
      index === 0 ? 'winner' : `winner-${index}`,
      { canonicalStableId: `winner-${index + 1}` },
    ]));
    const { db, store } = makeDbStub({
      account_merge_outbox: {
        mergeOverflow: { winnerStableId: 'winner', loserStableId: 'loser', status: 'pending' },
      },
      account_identity_owner_map: ownerMaps,
      revenuecat_premium_events: { receipt: { uid: 'loser' } },
    });

    await expect(processAccountMergeOutboxJob(db as any, 'mergeOverflow', NOW))
      .rejects.toThrow('account_merge_owner_map_overflow');
    expect(store.revenuecat_premium_events.receipt).toEqual({ uid: 'loser' });
    expect(store.account_merge_outbox.mergeOverflow).toMatchObject({ status: 'pending' });
  });

  it('repoints through a valid long canonical owner chain within the system cap', async () => {
    const ownerMaps = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [
      index === 0 ? 'winner' : `winner-${index}`,
      { canonicalStableId: `winner-${index + 1}` },
    ]));
    const { db, store } = makeDbStub({
      account_merge_outbox: {
        mergeLong: { winnerStableId: 'winner', loserStableId: 'loser', status: 'pending' },
      },
      account_identity_owner_map: ownerMaps,
      revenuecat_premium_events: { receipt: { uid: 'loser' } },
    });

    await expect(processAccountMergeOutboxJob(db as any, 'mergeLong', NOW)).resolves.toEqual({
      status: 'completed', updated: 1,
    });
    expect(store.revenuecat_premium_events.receipt).toMatchObject({
      uid: 'winner-9', canonicalOwnerUid: 'winner-9',
    });
  });

  it('does not let a stale failed worker overwrite a reclaimed terminal outbox state', async () => {
    let reclaimed = false;
    const { db, store } = makeDbStub({
      account_merge_outbox: {
        mergeReclaimed: { winnerStableId: 'winner', loserStableId: 'loser', status: 'pending' },
      },
      revenuecat_premium_events: { receipt: { uid: 'loser' } },
    }, {
      afterQueryGetAny: (collection, ids, mutate) => {
        if (!reclaimed && collection === 'revenuecat_premium_events' && ids.length > 0) {
          reclaimed = true;
          mutate('account_merge_outbox', 'mergeReclaimed', {
            winnerStableId: 'winner',
            loserStableId: 'loser',
            status: 'completed',
            leaseToken: 'new-worker-token',
          });
        }
      },
    });

    await expect(processAccountMergeOutboxJob(db as any, 'mergeReclaimed', NOW))
      .rejects.toThrow('account_merge_outbox_lease_lost');
    expect(store.account_merge_outbox.mergeReclaimed).toMatchObject({
      status: 'completed', leaseToken: 'new-worker-token',
    });
    expect(store.revenuecat_premium_events.receipt).toEqual({ uid: 'loser' });
  });

  it('atomically rekeys loser RevenueCat lineages and records durable owner mapping/outbox', async () => {
    const lineageHash = 'lineage-hash';
    const oldLineageId = 'loser-owned-lineage';
    const { db, store } = makeDbStub({
      users: {
        winner: { firebaseAuthUid: 'auth-rc', progress: { user_total_xp: '10' } },
        loser: {
          firebaseAuthUid: 'auth-rc',
          progress: {
            user_total_xp: '1',
            premium_plan: 'yearly',
            premium_expiry: '0',
            premium_rc_active_lineage: lineageHash,
          },
        },
      },
      revenuecat_premium_lineages: {
        [oldLineageId]: {
          ownerUid: 'loser',
          lineageHash,
          plan: 'yearly',
          revoked: false,
          activeThroughMs: FUTURE,
          productId: 'premium_yearly',
          store: 'APP_STORE',
          environment: 'PRODUCTION',
          lastEventType: 'RENEWAL',
          lastAccessEventTimeMs: 10,
          lastAccessEventRank: 50,
          lastAccessEventTieValue: 20,
          lastAccessEventId: 'grant',
          lastEventTimeMs: 10,
          lastEventRank: 30,
          lastEventId: 'grant',
          lastEventFingerprint: 'fp',
        },
      },
    });

    await mergeStableAccounts(db as any, 'auth-rc', 'winner', 'loser', NOW);

    const ownerHash = createHash('sha256').update('winner').digest('hex').slice(0, 32);
    const canonicalLineageId = `lin_${ownerHash}_${lineageHash}`;
    expect(store.revenuecat_premium_lineages[oldLineageId]).toBeUndefined();
    expect(store.revenuecat_premium_lineages[canonicalLineageId]).toMatchObject({ ownerUid: 'winner', lineageHash });
    expect(store.account_identity_owner_map.loser).toMatchObject({ canonicalStableId: 'winner' });
    expect(Object.values(store.account_merge_outbox)).toEqual(expect.arrayContaining([
      expect.objectContaining({ winnerStableId: 'winner', loserStableId: 'loser', status: 'pending' }),
    ]));
    expect(store.users.loser).toMatchObject({ identityHidden: true, canonicalStableId: 'winner' });
    expect((store.users.loser!.progress as DocData).premium_plan).toBeUndefined();
    expect((store.users.loser!.progress as DocData).premium_rc_active_lineage).toBeUndefined();
    expect(store.users.winner!.progress).toMatchObject({
      premium_plan: 'yearly',
      premium_rc_active_lineage: lineageHash,
      premium_rc_reconcile_needed: 'false',
    });
  });

  it('atomically migrates a granted annual gift and immutable receipt to the canonical account', async () => {
    const offerId = 'gift-before-merge';
    const lineageHash = 'gift-lineage';
    const bonusExpiryAtMs = FUTURE + 180 * 24 * 60 * 60 * 1000;
    const offerCollection = 'users/loser/level_up_annual_gifts';
    const receiptCollection = `users/loser/level_up_annual_gifts/${LEVEL_UP_ANNUAL_GIFT_OFFERING_ID}/grant_receipts`;
    const winnerOfferCollection = 'users/winner/level_up_annual_gifts';
    const winnerReceiptCollection = `users/winner/level_up_annual_gifts/${LEVEL_UP_ANNUAL_GIFT_OFFERING_ID}/grant_receipts`;
    const { db, store } = makeDbStub({
      users: {
        winner: { firebaseAuthUid: 'auth-gift', progress: { user_total_xp: '1000' } },
        loser: {
          firebaseAuthUid: 'auth-gift',
          progress: {
            user_total_xp: '10',
            premium_plan: 'yearly',
            premium_expiry: '0',
            premium_rc_active_lineage: lineageHash,
            premium_level_up_annual_gift_granted: 'true',
            premium_level_up_annual_gift_lineage_hash: lineageHash,
            premium_level_up_annual_gift_bonus_expiry_ms: String(bonusExpiryAtMs),
          },
        },
      },
      [offerCollection]: {
        [LEVEL_UP_ANNUAL_GIFT_OFFERING_ID]: {
          offerId,
          uid: 'loser',
          level: 12,
          state: 'granted',
          offeringId: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
          createdAtMs: NOW - 10_000,
          offerExpiresAtMs: NOW + 10_000,
          grantedLineageHash: lineageHash,
          bonusExpiryAtMs,
        },
      },
      [receiptCollection]: {
        bonus_v1: {
          uid: 'loser',
          offerId,
          eventId: 'gift-event',
          originalTransactionId: 'original-gift-tx',
          lineageHash,
          annualProductId: 'phraseman_yearly',
          offeringId: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
          bonusMonths: 6,
          bonusExpiryAtMs,
          environment: 'PRODUCTION',
        },
      },
    });

    await mergeStableAccounts(db as any, 'auth-gift', 'winner', 'loser', NOW);

    expect(store[winnerOfferCollection]?.[LEVEL_UP_ANNUAL_GIFT_OFFERING_ID]).toMatchObject({
      uid: 'winner', offerId, state: 'granted', grantedLineageHash: lineageHash,
    });
    expect(store[winnerReceiptCollection]?.bonus_v1).toMatchObject({
      uid: 'winner', offerId, eventId: 'gift-event', originalTransactionId: 'original-gift-tx',
    });
    expect(store[offerCollection]?.[LEVEL_UP_ANNUAL_GIFT_OFFERING_ID]).toBeUndefined();
    expect(store[receiptCollection]?.bonus_v1).toBeUndefined();
    expect(store.users.winner!.progress).toMatchObject({
      premium_level_up_annual_gift_granted: 'true',
      premium_level_up_annual_gift_lineage_hash: lineageHash,
      premium_level_up_annual_gift_bonus_expiry_ms: String(bonusExpiryAtMs),
    });
    await expect(mergeStableAccounts(db as any, 'auth-gift', 'winner', 'loser', NOW + 1))
      .resolves.toMatchObject({ canonicalStableId: 'winner', alreadyMerged: true });
    expect(Object.keys(store[winnerOfferCollection] ?? {})).toEqual([
      LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
    ]);
    expect(Object.keys(store[winnerReceiptCollection] ?? {})).toEqual(['bonus_v1']);
  });

  it('fails closed instead of discarding conflicting immutable annual-gift receipts', async () => {
    const winnerOfferCollection = 'users/winner/level_up_annual_gifts';
    const loserOfferCollection = 'users/loser/level_up_annual_gifts';
    const winnerReceiptCollection = `users/winner/level_up_annual_gifts/${LEVEL_UP_ANNUAL_GIFT_OFFERING_ID}/grant_receipts`;
    const loserReceiptCollection = `users/loser/level_up_annual_gifts/${LEVEL_UP_ANNUAL_GIFT_OFFERING_ID}/grant_receipts`;
    const giftOffer = (uid: string, offerId: string) => ({
      uid,
      offerId,
      level: 12,
      state: 'granted',
      offeringId: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
      createdAtMs: NOW - 1_000,
      offerExpiresAtMs: NOW + 1_000,
      grantedLineageHash: `${uid}-lineage`,
      bonusExpiryAtMs: FUTURE,
    });
    const { db, store } = makeDbStub({
      users: {
        winner: { firebaseAuthUid: 'auth-conflict', progress: { user_total_xp: '100' } },
        loser: { firebaseAuthUid: 'auth-conflict', progress: { user_total_xp: '10' } },
      },
      [winnerOfferCollection]: {
        [LEVEL_UP_ANNUAL_GIFT_OFFERING_ID]: giftOffer('winner', 'offer-winner'),
      },
      [loserOfferCollection]: {
        [LEVEL_UP_ANNUAL_GIFT_OFFERING_ID]: giftOffer('loser', 'offer-loser'),
      },
      [winnerReceiptCollection]: {
        bonus_v1: {
          uid: 'winner', eventId: 'event-winner', originalTransactionId: 'tx-winner',
          lineageHash: 'winner-lineage', annualProductId: 'phraseman_yearly', bonusExpiryAtMs: FUTURE,
        },
      },
      [loserReceiptCollection]: {
        bonus_v1: {
          uid: 'loser', eventId: 'event-loser', originalTransactionId: 'tx-loser',
          lineageHash: 'loser-lineage', annualProductId: 'phraseman_yearly', bonusExpiryAtMs: FUTURE,
        },
      },
    });

    await expect(mergeStableAccounts(db as any, 'auth-conflict', 'winner', 'loser', NOW))
      .rejects.toThrow('level_up_annual_gift_grant_conflict');
    expect(store[winnerReceiptCollection]?.bonus_v1).toMatchObject({ eventId: 'event-winner' });
    expect(store[loserReceiptCollection]?.bonus_v1).toMatchObject({ eventId: 'event-loser' });
  });

  it('rekeys one in-flight annual-gift purchase attempt to the canonical account', async () => {
    const offerId = 'gift-in-flight';
    const attemptId = '12345678-1234-1234-1234-123456789abc';
    const offerCollection = 'users/loser/level_up_annual_gifts';
    const winnerOfferCollection = 'users/winner/level_up_annual_gifts';
    const { db, store } = makeDbStub({
      users: {
        winner: { firebaseAuthUid: 'auth-flight', progress: { user_total_xp: '1000' } },
        loser: { firebaseAuthUid: 'auth-flight', progress: { user_total_xp: '10' } },
      },
      [offerCollection]: {
        [LEVEL_UP_ANNUAL_GIFT_OFFERING_ID]: {
          offerId, uid: 'loser', level: 12, state: 'trial_pending',
          offeringId: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
          createdAtMs: NOW - 1_000, offerExpiresAtMs: NOW + 60_000,
          activePurchaseAttemptId: attemptId,
        },
      },
      level_up_annual_gift_purchase_attempts: {
        [attemptId]: {
          purchaseAttemptId: attemptId, offerId, uid: 'loser', revenueCatAppUserId: 'loser',
          offeringId: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID, annualProductId: 'phraseman_yearly',
          createdAtMs: NOW - 500, expiresAtMs: NOW + 60_000, preview: false,
        },
      },
    });

    await mergeStableAccounts(db as any, 'auth-flight', 'winner', 'loser', NOW);

    const migratedOffer = (
      store[winnerOfferCollection]?.[LEVEL_UP_ANNUAL_GIFT_OFFERING_ID]
    ) as unknown as LevelUpAnnualGiftOfferRecord;
    const migratedAttempt = (
      store.level_up_annual_gift_purchase_attempts[attemptId]
    ) as unknown as LevelUpAnnualGiftPurchaseAttemptRecord;
    expect(migratedOffer).toMatchObject({ uid: 'winner', offerId, activePurchaseAttemptId: attemptId });
    expect(migratedAttempt).toMatchObject({
      purchaseAttemptId: attemptId,
      offerId,
      uid: 'winner',
      revenueCatAppUserId: 'loser',
      preview: false,
      identityMigration: {
        fromStableUid: 'loser',
        toStableUid: 'winner',
        boundRevenueCatAppUserId: 'loser',
      },
    });
    expect(Object.keys(store.level_up_annual_gift_purchase_attempts)).toEqual([attemptId]);
    expect(decideLevelUpAnnualGiftWebhook({
      ownerUid: 'winner', offer: migratedOffer, attempt: migratedAttempt,
      event: {
        id: 'rc-after-merge', type: 'INITIAL_PURCHASE', app_user_id: 'loser',
        product_id: 'phraseman_yearly', original_transaction_id: 'original-after-merge',
        environment: 'PRODUCTION', period_type: 'NORMAL',
        presented_offering_id: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
        purchased_at_ms: NOW + 1_000, expiration_at_ms: FUTURE, price: 29.99,
        subscriber_attributes: { [LEVEL_UP_ANNUAL_GIFT_ATTEMPT_ATTRIBUTE]: { value: attemptId } },
      },
    })).toMatchObject({ action: 'grant', originalTransactionId: 'original-after-merge' });
    expect(decideLevelUpAnnualGiftWebhook({
      ownerUid: 'winner', offer: migratedOffer, attempt: migratedAttempt,
      event: {
        id: 'rc-wrong-identity', type: 'INITIAL_PURCHASE', app_user_id: 'winner',
        product_id: 'phraseman_yearly', original_transaction_id: 'original-after-merge',
        environment: 'PRODUCTION', period_type: 'NORMAL',
        presented_offering_id: LEVEL_UP_ANNUAL_GIFT_OFFERING_ID,
        purchased_at_ms: NOW + 1_000, expiration_at_ms: FUTURE, price: 29.99,
        subscriber_attributes: { [LEVEL_UP_ANNUAL_GIFT_ATTEMPT_ATTRIBUTE]: { value: attemptId } },
      },
    })).toEqual({ action: 'reject', reason: 'revenuecat_identity_mismatch' });
  });

  it('merges two stable ids into the higher-XP one and hides the loser', async () => {
    const { db, store } = makeDbStub({
      users: {
        'stable-tablet': {
          firebaseAuthUid: 'google-1',
          progress: { user_total_xp: '6812', streak_count: '2' },
          shards: 491,
        },
        'stable-phone': {
          firebaseAuthUid: 'google-1',
          progress: { user_total_xp: '2309', streak_count: '9' },
          shards: 1325,
        },
      },
    });

    const res = await mergeStableAccounts(db as any, 'google-1', 'stable-phone', 'stable-tablet', NOW);

    expect(res.canonicalStableId).toBe('stable-tablet'); // higher XP wins
    expect(res.mergedFromStableId).toBe('stable-phone');
    expect(res.alreadyMerged).toBe(false);

    const winner = store.users['stable-tablet']!;
    expect((winner.progress as DocData).user_total_xp).toBe('6812');
    expect((winner.progress as DocData).streak_count).toBe('9'); // best-of
    expect(winner.shards).toBe(1325); // max
    expect(winner.shards_updated_at_ms).toBe(NOW);
    expect(winner.shards_updated_op).toBe('replace');
    expect(winner.shards_updated_reason).toBe('account_merge');
    expect(winner.firebaseAuthUid).toBe('google-1');

    const loser = store.users['stable-phone']!;
    expect(loser.identityHidden).toBe(true);
    expect(loser.canonicalStableId).toBe('stable-tablet');
    expect(store.auth_links['google-1']).toMatchObject({ stable_id: 'stable-tablet' });
  });

  it('chooses the winner and merge payload from transaction snapshots', async () => {
    const { db, store } = makeDbStub({
      users: {
        'stable-a': {
          firebaseAuthUid: 'google-transaction',
          progress: { user_total_xp: '100', streak_count: '2' },
          shards: 10,
        },
        'stable-b': {
          firebaseAuthUid: 'google-transaction',
          progress: { user_total_xp: '50', streak_count: '1' },
          shards: 5,
        },
      },
    });
    const runTransaction = db.runTransaction;
    db.runTransaction = async (fn: (tx: any) => Promise<unknown>) => {
      store.users['stable-b'] = {
        ...store.users['stable-b'],
        progress: { user_total_xp: '1000', streak_count: '99' },
        shards: 999,
      };
      return runTransaction(fn);
    };

    const result = await mergeStableAccounts(
      db as any,
      'google-transaction',
      'stable-a',
      'stable-b',
      NOW,
    );

    expect(result).toEqual({
      canonicalStableId: 'stable-b',
      mergedFromStableId: 'stable-a',
      alreadyMerged: false,
    });
    expect(store.users['stable-b']?.shards).toBe(999);
    expect((store.users['stable-b']?.progress as DocData).streak_count).toBe('99');
    expect(store.users['stable-a']).toMatchObject({
      identityHidden: true,
      canonicalStableId: 'stable-b',
    });
  });

  it('fails closed when winner ownership changes before the transaction reads it', async () => {
    const { db, store } = makeDbStub({
      users: {
        'stable-owned': {
          firebaseAuthUid: 'google-owner-race',
          progress: { user_total_xp: '100' },
        },
        'stable-loser': {
          firebaseAuthUid: 'google-owner-race',
          progress: { user_total_xp: '50' },
        },
      },
    });
    const runTransaction = db.runTransaction;
    db.runTransaction = async (fn: (tx: any) => Promise<unknown>) => {
      store.users['stable-owned'] = {
        ...store.users['stable-owned'],
        firebaseAuthUid: 'attacker-uid',
      };
      return runTransaction(fn);
    };

    await expect(
      mergeStableAccounts(
        db as any,
        'google-owner-race',
        'stable-owned',
        'stable-loser',
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });

    expect(store.users['stable-owned']?.firebaseAuthUid).toBe('attacker-uid');
    expect(store.users['stable-loser']?.identityHidden).not.toBe(true);
  });

  it('fails closed when an account-deletion marker appears before the transaction reads', async () => {
    const { db, store } = makeDbStub({
      users: {
        'stable-a': { firebaseAuthUid: 'google-delete-race', progress: { user_total_xp: '100' } },
        'stable-b': { firebaseAuthUid: 'google-delete-race', progress: { user_total_xp: '50' } },
      },
    });
    const runTransaction = db.runTransaction;
    db.runTransaction = async (fn: (tx: any) => Promise<unknown>) => {
      store.account_deletion_auth_markers['google-delete-race'] = { status: 'pending' };
      return runTransaction(fn);
    };

    await expect(
      mergeStableAccounts(db as any, 'google-delete-race', 'stable-a', 'stable-b', NOW),
    ).rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
    expect(store.users['stable-b']?.identityHidden).not.toBe(true);
  });

  it.each([
    ['raw', 'stable-raw'],
    ['resolved', 'stable-a'],
    ['terminal', 'stable-terminal'],
  ])('fails closed when a %s stable-id tombstone appears before the transaction reads', async (_kind, tombstonedId) => {
    const { db, store } = makeDbStub({
      users: {
        'stable-raw': {
          identityHidden: true,
          canonicalStableId: 'stable-a',
          progress: { user_total_xp: '1' },
        },
        'stable-a': { firebaseAuthUid: 'google-tombstone-race', progress: { user_total_xp: '100' } },
        'stable-b': { firebaseAuthUid: 'google-tombstone-race', progress: { user_total_xp: '50' } },
        'stable-terminal': {
          firebaseAuthUid: 'google-tombstone-race',
          progress: { user_total_xp: '200' },
        },
      },
    });
    const runTransaction = db.runTransaction;
    db.runTransaction = async (fn: (tx: any) => Promise<unknown>) => {
      if (tombstonedId === 'stable-terminal') {
        store.users['stable-a'] = {
          ...store.users['stable-a'],
          identityHidden: true,
          canonicalStableId: 'stable-terminal',
        };
      }
      store.account_deletion_tombstones[tombstonedId] = { status: 'pending' };
      return runTransaction(fn);
    };

    await expect(
      mergeStableAccounts(db as any, 'google-tombstone-race', 'stable-raw', 'stable-b', NOW),
    ).rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
    expect(store.users['stable-b']?.identityHidden).not.toBe(true);
  });

  it('does not recreate a user that disappears before the transaction reads it', async () => {
    const { db, store } = makeDbStub({
      users: {
        'stable-a': { firebaseAuthUid: 'google-missing-race', progress: { user_total_xp: '100' } },
        'stable-b': { firebaseAuthUid: 'google-missing-race', progress: { user_total_xp: '50' } },
      },
    });
    const runTransaction = db.runTransaction;
    db.runTransaction = async (fn: (tx: any) => Promise<unknown>) => {
      delete store.users['stable-b'];
      store.auth_links['google-missing-race'] = { stable_id: 'stable-b' };
      return runTransaction(fn);
    };

    await expect(
      mergeStableAccounts(db as any, 'google-missing-race', 'stable-a', 'stable-b', NOW),
    ).rejects.toMatchObject({ code: 'failed-precondition', message: 'stable_id_missing' });
    expect(store.users['stable-b']).toBeUndefined();
    expect(store.users['stable-a']?.identityHidden).not.toBe(true);
  });

  it('fails closed when auth_links moves to a third account before the transaction reads', async () => {
    let moved = false;
    const { db, store } = makeDbStub({
      users: {
        'stable-a': { firebaseAuthUid: 'google-link-race', progress: { user_total_xp: '100' } },
        'stable-b': { firebaseAuthUid: 'google-link-race', progress: { user_total_xp: '50' } },
        'stable-third': { firebaseAuthUid: 'google-link-race', progress: { user_total_xp: '200' } },
      },
    }, {
      afterDocGet: (collection, id, _count, mutate) => {
        if (!moved && collection === 'auth_links' && id === 'google-link-race') {
          moved = true;
          mutate({ stable_id: 'stable-third' });
        }
      },
    });

    await expect(
      mergeStableAccounts(db as any, 'google-link-race', 'stable-a', 'stable-b', NOW),
    ).rejects.toMatchObject({ code: 'failed-precondition', message: 'stable_identity_changed' });
    expect(store.users['stable-b']?.identityHidden).not.toBe(true);
  });

  it('rejects a foreign direct auth_links anchor with zero mutations', async () => {
    const { db, store } = makeDbStub({
      auth_links: {
        'attacker-uid': { stable_id: 'stable-victim', provider: 'google', updatedAt: 111 },
      },
      users: {
        'stable-victim': {
          firebaseAuthUid: 'victim-uid',
          progress: { user_total_xp: '9000' },
        },
        'stable-attacker-a': {
          firebaseAuthUid: 'attacker-uid',
          progress: { user_total_xp: '100' },
        },
        'stable-attacker-b': {
          firebaseAuthUid: 'attacker-uid',
          progress: { user_total_xp: '50' },
        },
      },
    });
    const before = JSON.parse(JSON.stringify(store));

    await expect(
      mergeStableAccounts(
        db as any,
        'attacker-uid',
        'stable-attacker-a',
        'stable-attacker-b',
        NOW,
      ),
    ).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });

    expect(store).toEqual(before);
  });

  it('does not overwrite an auth_links anchor that moves to a protected raw id after preflight', async () => {
    let moved = false;
    const { db, store } = makeDbStub({
      users: {
        'stable-raw-a': {
          identityHidden: true,
          canonicalStableId: 'stable-canonical-a',
          progress: { user_total_xp: '1' },
        },
        'stable-canonical-a': {
          firebaseAuthUid: 'google-protected-link-race',
          progress: { user_total_xp: '100' },
        },
        'stable-b': {
          firebaseAuthUid: 'google-protected-link-race',
          progress: { user_total_xp: '50' },
        },
      },
    }, {
      afterDocGet: (collection, id, _count, mutate) => {
        if (!moved && collection === 'auth_links' && id === 'google-protected-link-race') {
          moved = true;
          mutate({ stable_id: 'stable-raw-a', updatedAt: NOW + 1 });
        }
      },
    });

    await expect(
      mergeStableAccounts(
        db as any,
        'google-protected-link-race',
        'stable-raw-a',
        'stable-b',
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'failed-precondition', message: 'stable_identity_changed' });

    expect(store.auth_links['google-protected-link-race']).toEqual({
      stable_id: 'stable-raw-a',
      updatedAt: NOW + 1,
    });
    expect(store.users['stable-b']?.identityHidden).not.toBe(true);
    expect(store.users['stable-canonical-a']?.identityMergedAt).toBeUndefined();
  });

  it('rejects auth_links drift after resolver reads but before the post-resolution baseline', async () => {
    let moved = false;
    const { db, store } = makeDbStub({
      users: {
        'stable-raw-a': {
          identityHidden: true,
          canonicalStableId: 'stable-canonical-a',
          progress: { user_total_xp: '1' },
        },
        'stable-canonical-a': {
          firebaseAuthUid: 'google-resolver-link-race',
          progress: { user_total_xp: '100' },
        },
        'stable-b': {
          firebaseAuthUid: 'google-resolver-link-race',
          progress: { user_total_xp: '50' },
        },
      },
    }, {
      afterDocGet: (collection, id, _count, mutate) => {
        if (!moved && collection === 'auth_links' && id === 'google-resolver-link-race') {
          moved = true;
          mutate({
            stable_id: 'stable-raw-a',
            updatedAt: NOW + 1,
          });
        }
      },
    });

    await expect(
      mergeStableAccounts(
        db as any,
        'google-resolver-link-race',
        'stable-raw-a',
        'stable-b',
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'failed-precondition', message: 'stable_identity_changed' });

    expect(store.auth_links['google-resolver-link-race']).toEqual({
      stable_id: 'stable-raw-a',
      updatedAt: NOW + 1,
    });
    expect(store.users['stable-b']?.identityHidden).not.toBe(true);
    expect(store.users['stable-canonical-a']?.identityMergedAt).toBeUndefined();
  });

  it('rejects an absent-to-anchor-to-absent ABA during resolution with zero stale writes', async () => {
    let authLinkReads = 0;
    const { db, store } = makeDbStub({
      users: {
        'stable-raw-a': {
          identityHidden: true,
          canonicalStableId: 'stable-canonical-a',
          progress: { user_total_xp: '1' },
        },
        'stable-canonical-a': {
          firebaseAuthUid: 'google-resolver-aba',
          progress: { user_total_xp: '100' },
        },
        'stable-b': {
          firebaseAuthUid: 'google-resolver-aba',
          progress: { user_total_xp: '50' },
        },
      },
    }, {
      afterDocGet: (collection, id, _count, mutate) => {
        if (collection !== 'auth_links' || id !== 'google-resolver-aba') return;
        authLinkReads += 1;
        if (authLinkReads === 1) {
          mutate({ stable_id: 'stable-raw-a', updatedAt: NOW + 1 });
          mutate(undefined);
        }
      },
    });

    await expect(
      mergeStableAccounts(
        db as any,
        'google-resolver-aba',
        'stable-raw-a',
        'stable-b',
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'failed-precondition', message: 'stable_identity_changed' });

    expect(store.auth_links['google-resolver-aba']).toBeUndefined();
    expect(store.users['stable-b']?.identityHidden).not.toBe(true);
    expect(store.users['stable-canonical-a']?.identityMergedAt).toBeUndefined();
  });

  it.each(['changed', 'cycle'])(
    'fails closed when canonical targets become %s after preflight',
    async (mode) => {
      let changed = false;
      let storeRef: Store;
      const { db, store } = makeDbStub({
        users: {
          'stable-a': { firebaseAuthUid: 'google-canonical-race', progress: { user_total_xp: '100' } },
          'stable-b': { firebaseAuthUid: 'google-canonical-race', progress: { user_total_xp: '50' } },
          'stable-terminal': {
            firebaseAuthUid: 'google-canonical-race',
            progress: { user_total_xp: '200' },
          },
        },
      }, {
        afterDocGet: (collection, id, _count, mutate) => {
          if (changed || collection !== 'users' || id !== 'stable-a') return;
          changed = true;
          mutate({
            ...storeRef.users['stable-a'],
            identityHidden: true,
            canonicalStableId: mode === 'cycle' ? 'stable-b' : 'stable-terminal',
          });
          if (mode === 'cycle') {
            storeRef.users['stable-b'] = {
              ...storeRef.users['stable-b'],
              identityHidden: true,
              canonicalStableId: 'stable-a',
            };
          }
        },
      });
      storeRef = store;

      await expect(
        mergeStableAccounts(db as any, 'google-canonical-race', 'stable-a', 'stable-b', NOW),
      ).rejects.toMatchObject({ code: 'failed-precondition', message: 'stable_identity_changed' });
      expect(store.users['stable-a']?.duplicateOfStableId).toBeUndefined();
      expect(store.users['stable-b']?.duplicateOfStableId).toBeUndefined();
      expect(store.auth_links['google-canonical-race']).toBeUndefined();
    },
  );

  it('carries the loser\'s active premium onto the winner', async () => {
    const { db, store } = makeDbStub({
      users: {
        'stable-rich': {
          firebaseAuthUid: 'google-2',
          progress: {
            user_total_xp: '10',
            premium_plan: 'yearly',
            premium_expiry: String(FUTURE),
            had_premium_ever: 'true',
          },
        },
        'stable-active': {
          firebaseAuthUid: 'google-2',
          progress: { user_total_xp: '9999' }, // higher XP but free
        },
      },
    });

    const res = await mergeStableAccounts(db as any, 'google-2', 'stable-active', 'stable-rich', NOW);

    expect(res.canonicalStableId).toBe('stable-active'); // higher XP
    const winner = store.users['stable-active']!.progress as DocData;
    expect(winner.premium_plan).toBe('yearly'); // premium preserved from loser
    expect(winner.premium_expiry).toBe(String(FUTURE));
    expect(winner.had_premium_ever).toBe('true');
  });

  it('is idempotent when already merged (loser hidden → winner)', async () => {
    const originalLink = { stable_id: 'stable-canon', provider: 'google', updatedAt: 111 };
    const { db, store } = makeDbStub({
      auth_links: { 'google-3': originalLink },
      users: {
        'stable-canon': { firebaseAuthUid: 'google-3', progress: { user_total_xp: '500' } },
        'stable-old': {
          firebaseAuthUid: 'google-3',
          identityHidden: true,
          canonicalStableId: 'stable-canon',
          progress: { user_total_xp: '100' },
        },
      },
    });

    const res = await mergeStableAccounts(db as any, 'google-3', 'stable-old', 'stable-canon', NOW);
    expect(res.alreadyMerged).toBe(true);
    expect(res.canonicalStableId).toBe('stable-canon');
    expect(store.auth_links['google-3']).toEqual(originalLink);
  });

  it('accepts an auth_links anchor that resolves from hidden to an owned canonical account', async () => {
    const originalLink = { stable_id: 'stable-hidden', provider: 'google', updatedAt: 111 };
    const { db, store } = makeDbStub({
      auth_links: { 'google-hidden': originalLink },
      users: {
        'stable-hidden': {
          identityHidden: true,
          canonicalStableId: 'stable-canonical',
          progress: { user_total_xp: '10' },
        },
        'stable-canonical': {
          firebaseAuthUid: 'google-hidden',
          progress: { user_total_xp: '500' },
        },
      },
    });

    await expect(
      mergeStableAccounts(
        db as any,
        'google-hidden',
        'stable-hidden',
        'stable-canonical',
        NOW,
      ),
    ).resolves.toEqual({
      canonicalStableId: 'stable-canonical',
      mergedFromStableId: null,
      alreadyMerged: true,
    });
    expect(store.auth_links['google-hidden']).toEqual(originalLink);
  });

  it('returns canonical without change when both ids are equal', async () => {
    const originalLink = { stable_id: 'stable-x', provider: 'google', updatedAt: 111 };
    const { db, store } = makeDbStub({
      auth_links: { 'google-4': originalLink },
      users: { 'stable-x': { firebaseAuthUid: 'google-4', progress: { user_total_xp: '1' } } },
    });
    const res = await mergeStableAccounts(db as any, 'google-4', 'stable-x', 'stable-x', NOW);
    expect(res.alreadyMerged).toBe(true);
    expect(res.canonicalStableId).toBe('stable-x');
    expect(store.auth_links['google-4']).toEqual(originalLink);
  });

  it('keeps auth_links unchanged when distinct inputs resolve to one winner before merge', async () => {
    const originalLink = { stable_id: 'stable-canonical', provider: 'google', updatedAt: 111 };
    const { db, store } = makeDbStub({
      auth_links: { 'google-converged': originalLink },
      users: {
        'stable-canonical': { firebaseAuthUid: 'google-converged', progress: { user_total_xp: '500' } },
        'stable-input-a': { progress: { user_total_xp: '10' } },
        'stable-input-b': { progress: { user_total_xp: '20' } },
      },
    });

    const res = await mergeStableAccounts(
      db as any,
      'google-converged',
      'stable-input-a',
      'stable-input-b',
      NOW,
    );

    expect(res).toEqual({
      canonicalStableId: 'stable-canonical',
      mergedFromStableId: null,
      alreadyMerged: true,
    });
    expect(store.auth_links['google-converged']).toEqual(originalLink);
  });

  it('rejects when caller does not own one of the accounts', async () => {
    const { db } = makeDbStub({
      users: {
        'stable-mine': { firebaseAuthUid: 'google-5', progress: { user_total_xp: '10' } },
        'stable-someone-else': { firebaseAuthUid: 'google-OTHER', progress: { user_total_xp: '10' } },
      },
    });

    await expect(
      mergeStableAccounts(db as any, 'google-5', 'stable-mine', 'stable-someone-else', NOW),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  // ── #11: absorb a device-held anonymous account via a fresh self-stamped claim ──
  it('absorbs an unowned anonymous LOSER that carries a fresh anon_merge_claim', async () => {
    // 2nd device played anonymously as anon-uid-2; it stamped anon_merge_claim
    // while still anonymous, then signed into the existing account (owned by
    // google-11, higher XP). The anon progress must merge in, not orphan.
    const { db, store } = makeDbStub({
      users: {
        'stable-mine': { firebaseAuthUid: 'google-11', progress: { user_total_xp: '5000' }, shards: 100 },
        'stable-anon': {
          firebaseAuthUid: 'anon-uid-2',
          anon_merge_claim: { authUid: 'anon-uid-2', at: NOW - 60_000 }, // 1 min ago = fresh
          progress: { user_total_xp: '300', streak_count: '7' },
          shards: 40,
        },
      },
    });

    const res = await mergeStableAccounts(db as any, 'google-11', 'stable-anon', 'stable-mine', NOW);

    expect(res.canonicalStableId).toBe('stable-mine'); // owned + higher XP wins
    expect(res.mergedFromStableId).toBe('stable-anon');
    const winner = store.users['stable-mine']!;
    expect((winner.progress as DocData).streak_count).toBe('7'); // absorbed from anon
    expect(winner.shards).toBe(100); // max(100,40)
    expect(winner.shards_updated_at_ms).toBe(NOW);
    expect(winner.shards_updated_reason).toBe('account_merge');
    expect(store.users['stable-anon']!.identityHidden).toBe(true);
  });

  it('rejects absorbing an unowned account with NO claim', async () => {
    const { db } = makeDbStub({
      users: {
        'stable-mine': { firebaseAuthUid: 'google-12', progress: { user_total_xp: '5000' } },
        'stable-anon': { firebaseAuthUid: 'anon-x', progress: { user_total_xp: '300' } }, // no claim
      },
    });
    await expect(
      mergeStableAccounts(db as any, 'google-12', 'stable-anon', 'stable-mine', NOW),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('rejects a STALE anon_merge_claim (older than the TTL)', async () => {
    const { db } = makeDbStub({
      users: {
        'stable-mine': { firebaseAuthUid: 'google-13', progress: { user_total_xp: '5000' } },
        'stable-anon': {
          firebaseAuthUid: 'anon-y',
          anon_merge_claim: { authUid: 'anon-y', at: NOW - 60 * 60 * 1000 }, // 1h ago = stale
          progress: { user_total_xp: '300' },
        },
      },
    });
    await expect(
      mergeStableAccounts(db as any, 'google-13', 'stable-anon', 'stable-mine', NOW),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('rejects a claim whose authUid does NOT match the loser doc owner', async () => {
    // An attacker who learned a stable_id could try to forge a claim, but the
    // claim.authUid must equal the loser doc's firebaseAuthUid (the anon uid that
    // truly held it). A mismatch is rejected.
    const { db } = makeDbStub({
      users: {
        'stable-mine': { firebaseAuthUid: 'google-14', progress: { user_total_xp: '5000' } },
        'stable-anon': {
          firebaseAuthUid: 'anon-real-owner',
          anon_merge_claim: { authUid: 'attacker-uid', at: NOW - 1000 }, // mismatched
          progress: { user_total_xp: '300' },
        },
      },
    });
    await expect(
      mergeStableAccounts(db as any, 'google-14', 'stable-anon', 'stable-mine', NOW),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('still rejects when the unowned side would WIN even with a claim (never overwrite owned)', async () => {
    const { db } = makeDbStub({
      users: {
        'stable-mine': { firebaseAuthUid: 'google-15', progress: { user_total_xp: '10' } },
        'stable-anon-rich': {
          firebaseAuthUid: 'anon-z',
          anon_merge_claim: { authUid: 'anon-z', at: NOW - 1000 },
          progress: { user_total_xp: '99999' }, // higher XP → would be winner
        },
      },
    });
    await expect(
      mergeStableAccounts(db as any, 'google-15', 'stable-anon-rich', 'stable-mine', NOW),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  // ── Account-takeover regressions (#11 / #12): a leaked stable_id (public as a
  //    leaderboard doc id) must NEVER let a caller who does not own the account
  //    rebind it to their own auth uid. ─────────────────────────────────────────
  it('#11: a===b — attacker with NO users doc cannot rebind a stranger account', async () => {
    // Attacker signed in fresh (attacker-uid), has no users doc of their own.
    // They pass a victim stable_id (harvested from the public leaderboard) as BOTH
    // ids to hit the a===b short-circuit. Must be rejected, and the victim's
    // firebaseAuthUid must be left untouched.
    const { db, store } = makeDbStub({
      users: {
        'victim-anon': { firebaseAuthUid: 'victim-uid', progress: { user_total_xp: '4200' } },
      },
    });
    await expect(
      mergeStableAccounts(db as any, 'attacker-uid', 'victim-anon', 'victim-anon', NOW),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(store.users['victim-anon']!.firebaseAuthUid).toBe('victim-uid'); // NOT rebound
  });

  it('#12: attacker with no users doc cannot win-merge a purely-anonymous victim', async () => {
    // Two purely-anonymous victim accounts harvested from the leaderboard. Attacker
    // has no users doc, so the old anon-relink probe reported owned:true. The winner
    // gate now requires GENUINE ownership → rejected, and neither victim is rebound.
    const { db, store } = makeDbStub({
      users: {
        'victim-a': { firebaseAuthUid: 'victim-a-uid', progress: { user_total_xp: '9000' } },
        'victim-b': { firebaseAuthUid: 'victim-b-uid', progress: { user_total_xp: '100' } },
      },
    });
    await expect(
      mergeStableAccounts(db as any, 'attacker-uid', 'victim-a', 'victim-b', NOW),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(store.users['victim-a']!.firebaseAuthUid).toBe('victim-a-uid'); // NOT rebound
    expect(store.users['victim-b']!.firebaseAuthUid).toBe('victim-b-uid'); // NOT rebound
  });

  it('legit: idempotent a===b still works for the genuine owner', async () => {
    const { db } = makeDbStub({
      users: { 'stable-own': { firebaseAuthUid: 'google-99', progress: { user_total_xp: '7' } } },
    });
    const res = await mergeStableAccounts(db as any, 'google-99', 'stable-own', 'stable-own', NOW);
    expect(res.alreadyMerged).toBe(true);
    expect(res.canonicalStableId).toBe('stable-own');
  });
});

// ── Integration: repointReferralOnMerge ──────────────────────────────────────
describe('repointReferralOnMerge — перенос реферальных данных loser → winner', () => {
  it('переносит attribution-роль REFEREE (doc loser → winner) и удаляет лузерский', async () => {
    const { db, store } = makeDbStub();
    store.referral_attributions = {
      loser: { referrerStableId: 'someoneElse', status: 'qualified', refCode: 'ABC123' },
    };
    await repointReferralOnMerge(db as any, 'winner', 'loser');
    expect(store.referral_attributions.loser).toBeUndefined();
    expect(store.referral_attributions.winner).toMatchObject({ referrerStableId: 'someoneElse', status: 'qualified' });
  });

  it('переносит роль REFERRER (referrerStableId loser → winner) на всех приглашённых', async () => {
    const { db, store } = makeDbStub();
    store.referral_attributions = {
      friendA: { referrerStableId: 'loser', status: 'qualified' },
      friendB: { referrerStableId: 'loser', status: 'pending' },
      other: { referrerStableId: 'unrelated', status: 'qualified' },
    };
    await repointReferralOnMerge(db as any, 'winner', 'loser');
    expect(store.referral_attributions.friendA?.referrerStableId).toBe('winner');
    expect(store.referral_attributions.friendB?.referrerStableId).toBe('winner');
    expect(store.referral_attributions.other?.referrerStableId).toBe('unrelated');
  });

  it('НЕ создаёт self-referral: удаляет запись, где referrer стал бы == referee', async () => {
    const { db, store } = makeDbStub();
    store.referral_attributions = {
      // loser пригласил winner → после слияния это сам себя пригласил
      winner: { referrerStableId: 'loser', status: 'pending' },
    };
    await repointReferralOnMerge(db as any, 'winner', 'loser');
    expect(store.referral_attributions.winner).toBeUndefined();
  });

  it('при коллизии referee-доков оставляет дальше прошедший статус (rewarded > pending)', async () => {
    const { db, store } = makeDbStub();
    store.referral_attributions = {
      winner: { referrerStableId: 'refX', status: 'pending' },
      loser: { referrerStableId: 'refY', status: 'rewarded' },
    };
    await repointReferralOnMerge(db as any, 'winner', 'loser');
    expect(store.referral_attributions.loser).toBeUndefined();
    expect(store.referral_attributions.winner?.status).toBe('rewarded');
  });

  it('переносит владение кодом (referral_codes.ownerStableId + referral_owners)', async () => {
    const { db, store } = makeDbStub();
    store.referral_codes = { ZZZ999: { ownerStableId: 'loser', normalized: 'ZZZ999' } };
    store.referral_owners = { loser: { code: 'ZZZ999', ownerStableId: 'loser' } };
    await repointReferralOnMerge(db as any, 'winner', 'loser');
    expect(store.referral_codes.ZZZ999?.ownerStableId).toBe('winner');
    expect(store.referral_owners.loser).toBeUndefined();
    expect(store.referral_owners.winner).toMatchObject({ ownerStableId: 'winner', code: 'ZZZ999' });
  });

  it('deterministically paginates 501 attributions and 51 codes without truncation', async () => {
    const { db, store, queryLog } = makeDbStub();
    store.referral_attributions = Object.fromEntries(
      Array.from({ length: 501 }, (_, index) => [
        `attr-${String(index).padStart(4, '0')}`,
        { referrerStableId: 'loser', status: index % 2 ? 'pending' : 'qualified' },
      ]),
    );
    store.referral_codes = Object.fromEntries(
      Array.from({ length: 51 }, (_, index) => [
        `code-${String(index).padStart(4, '0')}`,
        { ownerStableId: 'loser', normalized: `CODE${index}` },
      ]),
    );

    const result = await repointReferralOnMerge(db as any, 'winner', 'loser');

    expect(result).toMatchObject({
      complete: true,
      attributionDocsRepointed: 501,
      codeDocsRepointed: 51,
    });
    expect(Object.values(store.referral_attributions))
      .toHaveLength(501);
    expect(Object.values(store.referral_attributions).every(
      (data) => data?.referrerStableId === 'winner',
    )).toBe(true);
    expect(Object.values(store.referral_codes).every(
      (data) => data?.ownerStableId === 'winner',
    )).toBe(true);
    expect(queryLog.filter(({ collection }) => collection === 'referral_attributions')
      .map(({ cursor, limit, ids }) => ({ cursor, limit, size: ids.length })))
      .toEqual([
        { cursor: '', limit: 500, size: 500 },
        { cursor: 'attr-0499', limit: 500, size: 1 },
      ]);
    expect(queryLog.filter(({ collection }) => collection === 'referral_codes')
      .map(({ cursor, limit, ids }) => ({ cursor, limit, size: ids.length })))
      .toEqual([
        { cursor: '', limit: 50, size: 50 },
        { cursor: 'code-0049', limit: 50, size: 1 },
      ]);
  });

  it('is idempotent on rerun after all referral pages and owner docs are complete', async () => {
    const { db, store } = makeDbStub();
    store.referral_attributions = Object.fromEntries(
      Array.from({ length: 501 }, (_, index) => [
        `attr-${String(index).padStart(4, '0')}`,
        { referrerStableId: 'loser', status: 'qualified' },
      ]),
    );
    store.referral_codes = Object.fromEntries(
      Array.from({ length: 51 }, (_, index) => [
        `code-${String(index).padStart(4, '0')}`,
        { ownerStableId: 'loser' },
      ]),
    );
    store.referral_owners = {
      loser: { ownerStableId: 'loser', code: 'LOSER1' },
      winner: { ownerStableId: 'winner', code: 'WINNER1' },
    };

    await repointReferralOnMerge(db as any, 'winner', 'loser');
    const afterFirstRun = JSON.parse(JSON.stringify(store));
    const second = await repointReferralOnMerge(db as any, 'winner', 'loser');

    expect(store).toEqual(afterFirstRun);
    expect(second).toMatchObject({
      complete: true,
      attributionDocsRepointed: 0,
      codeDocsRepointed: 0,
    });
    expect(store.referral_owners.winner).toMatchObject({ code: 'WINNER1' });
    expect(store.referral_owners.loser).toBeUndefined();
  });

  it('preserves a concurrent attribution reward and new owner instead of overwriting a stale query row', async () => {
    let injected = false;
    const { db, store } = makeDbStub({}, {
      afterQueryGet: (collection, ids, mutate) => {
        if (!injected && collection === 'referral_attributions' && ids.includes('friend')) {
          injected = true;
          mutate('friend', {
            referrerStableId: 'new-owner',
            status: 'rewarded',
            referrerRewardedAtMs: NOW + 1,
          });
        }
      },
    });
    store.referral_attributions = {
      friend: { referrerStableId: 'loser', status: 'pending' },
    };

    await repointReferralOnMerge(db as any, 'winner', 'loser');

    expect(store.referral_attributions.friend).toEqual({
      referrerStableId: 'new-owner',
      status: 'rewarded',
      referrerRewardedAtMs: NOW + 1,
    });
  });

  it('preserves winner owner-code on collision while repointing loser-owned codes', async () => {
    const { db, store } = makeDbStub();
    store.referral_codes = {
      LOSER1: { ownerStableId: 'loser' },
      WINNER1: { ownerStableId: 'winner' },
    };
    store.referral_owners = {
      loser: { ownerStableId: 'loser', code: 'LOSER1' },
      winner: { ownerStableId: 'winner', code: 'WINNER1' },
    };

    await repointReferralOnMerge(db as any, 'winner', 'loser');

    expect(store.referral_owners.winner).toEqual({ ownerStableId: 'winner', code: 'WINNER1' });
    expect(store.referral_owners.loser).toBeUndefined();
    expect(store.referral_codes.LOSER1?.ownerStableId).toBe('winner');
    expect(store.referral_codes.WINNER1?.ownerStableId).toBe('winner');
  });

  it('returns incomplete without writes when either stable id is tombstoned before repoint', async () => {
    const { db, store } = makeDbStub({
      account_deletion_tombstones: { loser: { status: 'pending' } },
    });
    store.referral_attributions = {
      friend: { referrerStableId: 'loser', status: 'qualified' },
    };

    const result = await repointReferralOnMerge(db as any, 'winner', 'loser');

    expect(result).toMatchObject({
      complete: false,
      stoppedReason: 'account_delete_pending',
      stoppedPhase: 'referee',
      attributionDocsRepointed: 0,
      codeDocsRepointed: 0,
    });
    expect(store.referral_attributions.friend?.referrerStableId).toBe('loser');
  });

  it('stops observably when a tombstone appears mid-page and leaves the remainder retryable', async () => {
    let loserTombstoneReads = 0;
    const { db, store } = makeDbStub({}, {
      afterDocGet: (collection, id, _count, mutate) => {
        if (collection === 'account_deletion_tombstones' && id === 'loser') {
          loserTombstoneReads += 1;
          // Referee guard is read #1, the first 10-row chunk is #2, and the
          // tombstone appears inside the next chunk's transaction (#3).
          if (loserTombstoneReads === 3) mutate({ status: 'pending' });
        }
      },
    });
    store.referral_attributions = Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [
        `friend-${String(index).padStart(2, '0')}`,
        { referrerStableId: 'loser', status: 'qualified' },
      ]),
    );

    const result = await repointReferralOnMerge(db as any, 'winner', 'loser');
    const moved = Object.values(store.referral_attributions)
      .filter((data) => data?.referrerStableId === 'winner').length;
    const remaining = Object.values(store.referral_attributions)
      .filter((data) => data?.referrerStableId === 'loser').length;

    expect(result).toMatchObject({
      complete: false,
      stoppedReason: 'account_delete_pending',
      stoppedPhase: 'attributions',
      attributionDocsRepointed: moved,
      codeDocsRepointed: 0,
    });
    expect(moved).toBeGreaterThan(0);
    expect(remaining).toBeGreaterThan(0);
    expect(moved + remaining).toBe(20);
  });

  it('no-op при winner === loser', async () => {
    const { db, store } = makeDbStub();
    store.referral_attributions = { x: { referrerStableId: 'x', status: 'pending' } };
    await repointReferralOnMerge(db as any, 'same', 'same');
    expect(store.referral_attributions.x).toBeDefined();
  });
});
