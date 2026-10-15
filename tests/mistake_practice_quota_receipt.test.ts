// зачем (хвост R48, координатор 15.10): попытка дня «Моих ошибок» списывается в кадре тапа; если старт тренировки так и не
// состоялся — она возвращается ровно один раз и только после того, как списание записалось.
const mockRefund = jest.fn(async () => ({ status: 'refunded' }));
jest.mock('../app/revenue_daily_quota', () => ({ refundRevenueDailyQuota: (...args: unknown[]) => mockRefund(...(args as [])) }));

import {
  __resetMistakeQuotaReceiptForTests,
  rememberMistakeQuotaReceipt,
  settleMistakeQuotaStart,
} from '../app/mistake_practice_quota_receipt';

const token = { generation: 1, stableId: 'uid-a', phase: 'active' } as const;

describe('mistake practice: daily attempt refund when the start never happened', () => {
  beforeEach(() => {
    __resetMistakeQuotaReceiptForTests();
    mockRefund.mockClear();
  });

  it('attempt spent → start refused → refunded exactly once, after the spend was written', async () => {
    const order: string[] = [];
    let finishConsume: () => void = () => undefined;
    const consume = new Promise<void>((resolve) => { finishConsume = () => { order.push('consumed'); resolve(); }; });
    mockRefund.mockImplementation(async () => { order.push('refund'); return { status: 'refunded' }; });
    rememberMistakeQuotaReceipt({ receiptId: 'mistakes:a', token, consume, atMs: 1_000, surface: 'mistakes_hub_start' });

    const settling = settleMistakeQuotaStart('not_started', 'energy_insufficient', 2_000);
    finishConsume();
    await settling;
    await settleMistakeQuotaStart('not_started', 'energy_insufficient', 3_000); // повторный уход — второго возврата нет

    expect(order).toEqual(['consumed', 'refund']);
    expect(mockRefund).toHaveBeenCalledTimes(1);
    expect(mockRefund).toHaveBeenCalledWith({ kind: 'mistake_practice_starts', token, receiptId: 'mistakes:a', reason: 'energy_insufficient' });
  });

  it('a started session keeps the attempt spent', async () => {
    rememberMistakeQuotaReceipt({ receiptId: 'mistakes:b', token, consume: Promise.resolve(), atMs: 1_000, surface: 'x' });
    await settleMistakeQuotaStart('started', 'session_started', 2_000);
    await settleMistakeQuotaStart('not_started', 'left_before_start', 3_000);
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it('no remembered attempt (Plus, resume, free path) — nothing to refund', async () => {
    await settleMistakeQuotaStart('not_started', 'left_before_start', 2_000);
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it('a stale receipt (screen never opened for it) is not refunded', async () => {
    rememberMistakeQuotaReceipt({ receiptId: 'mistakes:c', token, consume: Promise.resolve(), atMs: 0, surface: 'x' });
    await settleMistakeQuotaStart('not_started', 'left_before_start', 11 * 60 * 1000);
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it('a failed spend still lets the refund run (refund itself answers not_found)', async () => {
    rememberMistakeQuotaReceipt({ receiptId: 'mistakes:d', token, consume: Promise.reject(new Error('offline')), atMs: 1_000, surface: 'x' });
    await settleMistakeQuotaStart('not_started', 'prepare_failed:x', 2_000);
    expect(mockRefund).toHaveBeenCalledTimes(1);
  });
});
