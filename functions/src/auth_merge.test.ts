import {
  chooseSurvivingAttribution,
  mergeShards,
  mergeStableAccounts,
  mergeUserProgress,
  repointReferralOnMerge,
} from './auth_merge';

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
    const winner = { user_total_xp: '9999' }; // higher XP, but free
    const loser = {
      user_total_xp: '10',
      premium_plan: 'yearly',
      premium_expiry: String(FUTURE),
      premium_rc_store: 'app_store',
      had_premium_ever: 'true',
    };
    const out = mergeUserProgress(winner, loser, NOW);
    expect(out.premium_plan).toBe('yearly');
    expect(out.premium_expiry).toBe(String(FUTURE));
    expect(out.premium_rc_store).toBe('app_store');
    expect(out.had_premium_ever).toBe('true');
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

function makeDbStub(initial: Store = {}) {
  const store: Store = {
    users: { ...(initial.users ?? {}) },
    auth_links: { ...(initial.auth_links ?? {}) },
    leaderboard: { ...(initial.leaderboard ?? {}) },
    league_groups: { ...(initial.league_groups ?? {}) },
    name_index: { ...(initial.name_index ?? {}) },
    identity_cleanup_candidates: { ...(initial.identity_cleanup_candidates ?? {}) },
  };

  const docApi = (name: string, id: string) => ({
    id,
    get: async () => snapFor(name, id, store[name]?.[id]),
    set: async (data: DocData) => {
      store[name] = store[name] ?? {};
      store[name][id] = { ...(store[name][id] ?? {}), ...data };
    },
    delete: async () => {
      if (store[name]) delete store[name][id];
    },
  });

  // ref carries a functional handle (set/delete) so query-result .ref works in repoint logic.
  const snapFor = (name: string, id: string, data: DocData | undefined) => ({
    id,
    ref: docApi(name, id),
    exists: !!data,
    data: () => data,
  });

  const matches = (data: DocData | undefined, field: unknown, op: string, value: unknown): boolean => {
    if (!data || op !== '==') return false;
    const key = typeof field === 'string' ? field : String((field as { toString(): string }).toString());
    return (data as Record<string, unknown>)[key] === value;
  };

  const queryApi = (name: string, field: unknown, op: string, value: unknown) => ({
    limit: () => queryApi(name, field, op, value),
    get: async () => {
      const docs = Object.entries(store[name] ?? {})
        .filter(([, data]) => matches(data, field, op, value))
        .map(([id, data]) => snapFor(name, id, data));
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
        commit: async () => { for (const fn of ops) await fn(); },
      };
    },
    runTransaction: async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: async (ref: { get: () => Promise<unknown> }) => ref.get(),
        set: async (ref: { set: (d: DocData) => Promise<void> }, data: DocData) => ref.set(data),
        delete: async (ref: { delete: () => Promise<void> }) => ref.delete(),
        update: async (ref: { set: (d: DocData) => Promise<void> }, data: DocData) => ref.set(data),
      };
      return fn(tx);
    },
  };

  return { db, store };
}

describe('mergeStableAccounts', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

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
    expect(winner.firebaseAuthUid).toBe('google-1');

    const loser = store.users['stable-phone']!;
    expect(loser.identityHidden).toBe(true);
    expect(loser.canonicalStableId).toBe('stable-tablet');
  });

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
    const { db } = makeDbStub({
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
  });

  it('returns canonical without change when both ids are equal', async () => {
    const { db } = makeDbStub({
      users: { 'stable-x': { firebaseAuthUid: 'google-4', progress: { user_total_xp: '1' } } },
    });
    const res = await mergeStableAccounts(db as any, 'google-4', 'stable-x', 'stable-x', NOW);
    expect(res.alreadyMerged).toBe(true);
    expect(res.canonicalStableId).toBe('stable-x');
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

  it('no-op при winner === loser', async () => {
    const { db, store } = makeDbStub();
    store.referral_attributions = { x: { referrerStableId: 'x', status: 'pending' } };
    await repointReferralOnMerge(db as any, 'same', 'same');
    expect(store.referral_attributions.x).toBeDefined();
  });
});
