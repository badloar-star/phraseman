// зачем (Ревизор 21.10): кольцо Plus обновляется ПОСЛЕ денежной записи лучшей попыткой — только update (обрывок без имени
// не создаётся), нет профиля = тихий пропуск, любая ошибка = журнал, НИКОГДА не исключение.
import { publicProfilePlusPatch, syncPublicProfilePlusAfterCommit } from './public_profile_plus_sync';

const NOW = Date.parse('2026-10-21T12:00:00Z');
const YEARLY = { premium_plan: 'yearly', premium_expiry: String(NOW + 86_400_000) };

function fakeDb(update: (data: Record<string, unknown>) => Promise<unknown>) {
  const calls: Array<{ collection: string; id: string; data: Record<string, unknown> }> = [];
  return {
    calls,
    db: {
      collection: (collection: string) => ({
        doc: (id: string) => ({
          update: async (data: Record<string, unknown>) => { calls.push({ collection, id, data }); return update(data); },
        }),
      }),
    },
  };
}

describe('publicProfilePlusPatch', () => {
  it('real Plus → ring with its expiry; no Plus → null, never 0 (0 means «forever»)', () => {
    expect(publicProfilePlusPatch(YEARLY, NOW)).toEqual({ isPlus: true, plusUntilMs: NOW + 86_400_000 });
    expect(publicProfilePlusPatch({ premium_plan: 'lifetime', premium_expiry: '0' }, NOW)).toEqual({ isPlus: true, plusUntilMs: 0 });
    expect(publicProfilePlusPatch({}, NOW)).toEqual({ isPlus: false, plusUntilMs: null });
    expect(publicProfilePlusPatch({ intro_access_until_ms: String(NOW + 3_600_000) }, NOW)).toEqual({ isPlus: false, plusUntilMs: null });
  });

  it('VIP in the full progress keeps the ring when the subscription part expired', () => {
    const progress = { premium_plan: 'monthly', premium_expiry: String(NOW - 1), vip_plan: 'referral', vip_until: String(NOW + 5_000) };
    expect(publicProfilePlusPatch(progress, NOW)).toEqual({ isPlus: true, plusUntilMs: NOW + 5_000 });
  });
});

describe('syncPublicProfilePlusAfterCommit', () => {
  it('updates only isPlus and plusUntilMs of public_profiles/{stableUid}', async () => {
    const { db, calls } = fakeDb(async () => undefined);
    await expect(syncPublicProfilePlusAfterCommit({ db, stableUid: 'stable-1', progress: YEARLY, nowMs: NOW, source: 'test' })).resolves.toBe('updated');
    expect(calls).toEqual([{ collection: 'public_profiles', id: 'stable-1', data: { isPlus: true, plusUntilMs: NOW + 86_400_000 } }]);
  });

  it('no profile (NOT_FOUND) → quiet skip, nothing is created', async () => {
    const { db } = fakeDb(async () => { throw Object.assign(new Error('no document'), { code: 5 }); });
    await expect(syncPublicProfilePlusAfterCommit({ db, stableUid: 'stable-1', progress: YEARLY, nowMs: NOW, source: 'test' })).resolves.toBe('no_profile');
  });

  it('any other failure never throws — money is already written', async () => {
    const { db } = fakeDb(async () => { throw Object.assign(new Error('deadline'), { code: 4 }); });
    await expect(syncPublicProfilePlusAfterCommit({ db, stableUid: 'stable-1', progress: YEARLY, nowMs: NOW, source: 'test' })).resolves.toBe('failed');
  });

  it('empty stable id → skip without touching the database', async () => {
    const { db, calls } = fakeDb(async () => undefined);
    await expect(syncPublicProfilePlusAfterCommit({ db, stableUid: '', progress: YEARLY, nowMs: NOW, source: 'test' })).resolves.toBe('failed');
    expect(calls).toHaveLength(0);
  });
});
