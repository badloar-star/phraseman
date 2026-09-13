import { createFlashcardTrainingQuotaAccess } from '../app/revenue_quota_access';
import type { AccountGenerationToken } from '../app/account_generation';
import type { RevenueQuotaReceipt } from '../app/revenue_quota_store';

const token = Object.freeze({ generation: 4, stableId: 'account-a', phase: 'active' }) as AccountGenerationToken;
const nowMs = Date.parse('2026-03-29T12:00:00.000Z');

function receipt(overrides: Partial<RevenueQuotaReceipt> & Pick<RevenueQuotaReceipt, 'receiptId'>): RevenueQuotaReceipt {
  return Object.freeze({
    schemaVersion: 'revenue-quota.v1',
    quota: 'flashcard_training_starts',
    lineage: 7,
    period: '2026-03-29@Europe/Dublin',
    timeZone: 'Europe/Dublin',
    resetAt: Date.parse('2026-03-29T23:00:00.000Z'),
    observedAtMs: Date.parse('2026-03-29T12:00:00.000Z'),
    mode: 'swipe',
    ...overrides,
  });
}

function harness(seed: RevenueQuotaReceipt[] = []) {
  let receipts = [...seed];
  let currentNowMs = nowMs;
  let currentTimeZone = 'Europe/Dublin';
  let paid = false;
  let gated = true;
  let current = true;
  let storeAvailable = true;
  const commit = jest.fn(async (_stableId: string, next: RevenueQuotaReceipt) => {
    const duplicate = receipts.some((item) => item.receiptId === next.receiptId && item.period === next.period);
    if (!duplicate) receipts.push(next);
    return { status: 'committed' as const, duplicate };
  });
  const access = createFlashcardTrainingQuotaAccess({
    now: () => currentNowMs,
    timeZone: () => currentTimeZone,
    isGateEnabled: () => gated,
    isCurrentAccount: () => current,
    withAccountLock: async (work) => work({} as never),
    verifyPaidAccess: async () => paid,
    readReceipts: async () => storeAvailable
      ? { status: 'available' as const, stableUid: 'account-a', lineage: 7, receipts }
      : { status: 'unavailable' as const },
    commitReceipt: commit,
  });
  return {
    access,
    commit,
    receipts: () => receipts,
    setPaid: (value: boolean) => { paid = value; },
    setGated: (value: boolean) => { gated = value; },
    setCurrent: (value: boolean) => { current = value; },
    setStoreAvailable: (value: boolean) => { storeAvailable = value; },
    setNow: (value: number) => { currentNowMs = value; },
    setTimeZone: (value: string) => { currentTimeZone = value; },
  };
}

describe('Revenue VNext flashcard training quota access', () => {
  test('waits for entitlement hydration without a false paywall decision', async () => {
    const h = harness();
    await expect(h.access.preview({ token, accessResolved: false, hasPremiumAccess: false })).resolves.toMatchObject({
      status: 'waiting', used: 0, limit: 3, resetAt: null, period: null, bypass: null,
    });
  });

  test('Plus and gate_flashcards_premium=false are unlimited without quota facts or boon bypass', async () => {
    const paid = harness();
    await expect(paid.access.preview({ token, accessResolved: true, hasPremiumAccess: true })).resolves.toMatchObject({
      status: 'allowed', limit: null, bypass: 'plus',
    });
    expect(paid.commit).not.toHaveBeenCalled();

    const compatible = harness();
    compatible.setGated(false);
    await expect(compatible.access.consume({ token, accessResolved: true, receiptId: 'compat-1', mode: 'blitz' })).resolves.toMatchObject({
      status: 'allowed', limit: null, bypass: 'remote_config',
    });
    expect(compatible.commit).not.toHaveBeenCalled();
  });

  test('allows exactly three shared starts, replays a stable receipt, then exhausts all modes together', async () => {
    const h = harness();
    for (const [receiptId, mode] of [['one', 'swipe'], ['two', 'blitz'], ['three', 'recall']] as const) {
      await expect(h.access.consume({ token, accessResolved: true, receiptId, mode })).resolves.toMatchObject({ status: 'allowed' });
    }
    await expect(h.access.consume({ token, accessResolved: true, receiptId: 'three', mode: 'recall' })).resolves.toMatchObject({
      status: 'allowed', used: 3, bypass: 'idempotent',
    });
    await expect(h.access.consume({ token, accessResolved: true, receiptId: 'four', mode: 'speaking' })).resolves.toMatchObject({
      status: 'exhausted', used: 3, limit: 3,
    });
    expect(h.commit).toHaveBeenCalledTimes(3);
  });

  test('fails closed for unavailable storage and stale accounts', async () => {
    const unavailable = harness();
    unavailable.setStoreAvailable(false);
    await expect(unavailable.access.preview({ token, accessResolved: true, hasPremiumAccess: false })).resolves.toMatchObject({ status: 'unavailable' });

    const stale = harness();
    stale.setCurrent(false);
    await expect(stale.access.consume({ token, accessResolved: true, receiptId: 'stale', mode: 'swipe' })).resolves.toMatchObject({ status: 'stale_account' });
    expect(stale.commit).not.toHaveBeenCalled();
  });

  /**
   * зачем: владелец 2026-09-13 — «человека нельзя наказывать за нашу аварию».
   * База phone-state не открывалась (SQLCipher: file is not a database), чеки
   * квоты были физически нечитаемы, и тренировка не запускалась ВООБЩЕ: хаб
   * молча гасил тап, а сессия выбрасывала с откатом энергии. Теперь недоступное
   * хранилище пропускает старт без списания — записать чек всё равно некуда.
   * Сам лимит не отменён: как только хранилище отвечает, счёт снова честный.
   */
  test('недоступное хранилище пускает старт без списания, но не отменяет лимит', async () => {
    const broken = harness();
    broken.setStoreAvailable(false);
    await expect(broken.access.consume({
      token, accessResolved: true, receiptId: 'storage-down', mode: 'swipe',
    })).resolves.toMatchObject({ status: 'allowed' });
    // Чек записать некуда — попытки коммита быть не должно.
    expect(broken.commit).not.toHaveBeenCalled();

    // Хранилище ожило: лимит снова действует и исчерпывается как обычно.
    const healthy = harness([
      receipt({ receiptId: 'r1' }), receipt({ receiptId: 'r2' }), receipt({ receiptId: 'r3' }),
    ]);
    await expect(healthy.access.consume({
      token, accessResolved: true, receiptId: 'r4', mode: 'swipe',
    })).resolves.toMatchObject({ status: 'exhausted' });
  });

  test('rechecks paid access only after acquiring the account transition lock', async () => {
    const order: string[] = [];
    const access = createFlashcardTrainingQuotaAccess({
      now: () => nowMs,
      timeZone: () => 'Europe/Dublin',
      isGateEnabled: () => true,
      isCurrentAccount: () => true,
      withAccountLock: async (work) => { order.push('lock'); return work({} as never); },
      verifyPaidAccess: async () => { order.push('paid'); return true; },
      readReceipts: async () => { order.push('read'); return { status: 'unavailable' as const }; },
      commitReceipt: async () => { throw new Error('must_not_commit'); },
    });
    await expect(access.consume({ token, accessResolved: true, receiptId: 'paid-now', mode: 'speaking' })).resolves.toMatchObject({
      status: 'allowed', bypass: 'plus',
    });
    expect(order).toEqual(['lock', 'paid']);
  });

  test('folds timezone-hopped receipts into one conservative epoch until the latest boundary', async () => {
    const dublinReset = Date.parse('2026-03-29T23:00:00.000Z');
    const tokyoReset = Date.parse('2026-03-29T15:00:00.000Z');
    const seed = [
      receipt({ receiptId: 'dublin-1', observedAtMs: Date.parse('2026-03-29T12:00:00.000Z'), resetAt: dublinReset }),
      receipt({ receiptId: 'tokyo-1', period: '2026-03-29@Asia/Tokyo', timeZone: 'Asia/Tokyo', observedAtMs: Date.parse('2026-03-29T12:01:00.000Z'), resetAt: tokyoReset }),
      receipt({ receiptId: 'dublin-2', observedAtMs: Date.parse('2026-03-29T12:02:00.000Z'), resetAt: dublinReset }),
      receipt({ receiptId: 'tokyo-2', period: '2026-03-29@Asia/Tokyo', timeZone: 'Asia/Tokyo', observedAtMs: Date.parse('2026-03-29T12:03:00.000Z'), resetAt: tokyoReset }),
    ];
    const h = harness(seed);
    h.setTimeZone('Asia/Tokyo');
    h.setNow(Date.parse('2026-03-29T14:00:00.000Z'));
    await expect(h.access.consume({ token, accessResolved: true, receiptId: 'fifth', mode: 'speaking' })).resolves.toMatchObject({
      status: 'exhausted', used: 4, resetAt: dublinReset,
    });
    expect(h.commit).not.toHaveBeenCalled();

    h.setNow(Date.parse('2026-03-29T16:00:00.000Z'));
    await expect(h.access.preview({ token, accessResolved: true, hasPremiumAccess: false })).resolves.toMatchObject({
      status: 'exhausted', used: 4, resetAt: dublinReset,
    });

    h.setNow(dublinReset);
    await expect(h.access.consume({ token, accessResolved: true, receiptId: 'new-epoch', mode: 'blitz' })).resolves.toMatchObject({
      status: 'allowed', used: 1,
    });
    expect(h.commit).toHaveBeenCalledTimes(1);
  });

  test('replays a stable receipt globally even after its original period has ended', async () => {
    const prior = receipt({
      receiptId: 'retry-across-midnight',
      period: '2026-03-28@Europe/Dublin',
      observedAtMs: Date.parse('2026-03-28T20:00:00.000Z'),
      resetAt: Date.parse('2026-03-29T00:00:00.000Z'),
    });
    const h = harness([prior]);
    await expect(h.access.consume({ token, accessResolved: true, receiptId: prior.receiptId, mode: prior.mode })).resolves.toMatchObject({
      status: 'allowed', bypass: 'idempotent',
    });
    expect(h.commit).not.toHaveBeenCalled();
  });

  test('counts conflicting duplicate receipt IDs once and resolves them deterministically', async () => {
    const tokyo = receipt({ receiptId: 'duplicate', period: '2026-03-29@Asia/Tokyo', timeZone: 'Asia/Tokyo', resetAt: Date.parse('2026-03-29T15:00:00.000Z') });
    const dublin = receipt({ receiptId: 'duplicate', resetAt: Date.parse('2026-03-29T23:00:00.000Z') });
    const forward = harness([tokyo, dublin]);
    const reverse = harness([dublin, tokyo]);
    const input = { token, accessResolved: true, hasPremiumAccess: false } as const;
    const [left, right] = await Promise.all([forward.access.preview(input), reverse.access.preview(input)]);
    expect(left).toEqual(right);
    expect(left).toMatchObject({ status: 'allowed', used: 1, resetAt: dublin.resetAt });
  });

  test('keeps period, timezone and reset as one tuple from the epoch member owning the latest boundary', async () => {
    const tokyo = receipt({
      receiptId: 'tokyo-first',
      period: '2026-03-29@Asia/Tokyo',
      timeZone: 'Asia/Tokyo',
      observedAtMs: Date.parse('2026-03-29T12:00:00.000Z'),
      resetAt: Date.parse('2026-03-29T15:00:00.000Z'),
    });
    const dublin = receipt({
      receiptId: 'dublin-second',
      observedAtMs: Date.parse('2026-03-29T13:00:00.000Z'),
      resetAt: Date.parse('2026-03-29T23:00:00.000Z'),
    });
    const h = harness([tokyo, dublin]);
    h.setNow(Date.parse('2026-03-29T16:00:00.000Z'));
    await expect(h.access.consume({ token, accessResolved: true, receiptId: 'third', mode: 'recall' })).resolves.toMatchObject({
      status: 'allowed', used: 3, period: dublin.period, resetAt: dublin.resetAt,
    });
    expect(h.commit).toHaveBeenCalledWith('account-a', expect.objectContaining({
      period: dublin.period,
      timeZone: dublin.timeZone,
      resetAt: dublin.resetAt,
    }));
  });
});
