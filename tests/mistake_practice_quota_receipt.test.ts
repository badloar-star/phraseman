// зачем (хвост R48 + Ревизор 15.10): попытка дня «Моих ошибок» списывается в кадре тапа; если старт тренировки так и не
// состоялся — она возвращается ровно один раз, после записи списания и ПО ЧЕКУ СВОЕГО экрана (id едет в маршруте).
const mockRefund = jest.fn(async (_input: { receiptId: string }) => ({ status: 'refunded' }));
jest.mock('../app/revenue_daily_quota', () => ({
  refundRevenueDailyQuota: (input: { receiptId: string }) => mockRefund(input),
}));

import {
  __resetMistakeQuotaReceiptForTests,
  rememberMistakeQuotaReceipt,
  settleMistakeQuotaStart,
} from '../app/mistake_practice_quota_receipt';

const token = { generation: 1, stableId: 'uid-a', phase: 'active' } as const;
const remember = (receiptId: string, atMs = 1_000, consume: Promise<unknown> = Promise.resolve()) =>
  rememberMistakeQuotaReceipt({ receiptId, token, consume, atMs, surface: 'mistakes_hub_start' }, atMs);

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
    remember('mistakes:a', 1_000, consume);

    const settling = settleMistakeQuotaStart('not_started', 'energy_insufficient', 'mistakes:a', 2_000);
    finishConsume();
    await settling;
    await settleMistakeQuotaStart('not_started', 'energy_insufficient', 'mistakes:a', 3_000); // повторный уход — второго возврата нет

    expect(order).toEqual(['consumed', 'refund']);
    expect(mockRefund).toHaveBeenCalledTimes(1);
    expect(mockRefund).toHaveBeenCalledWith({ kind: 'mistake_practice_starts', token, receiptId: 'mistakes:a', reason: 'energy_insufficient' });
  });

  it('A → B: unstarted session A left under a new session B still refunds A by its own receipt; B keeps its spend', async () => {
    remember('mistakes:A', 1_000);
    remember('mistakes:B', 1_500); // новый тап, пока А в стеке
    await settleMistakeQuotaStart('started', 'session_started', 'mistakes:B', 2_000); // Б стартовала
    await settleMistakeQuotaStart('not_started', 'left_before_start', 'mistakes:A', 2_500); // уход из А
    expect(mockRefund).toHaveBeenCalledTimes(1);
    expect(mockRefund).toHaveBeenCalledWith(expect.objectContaining({ receiptId: 'mistakes:A' }));
  });

  it('A → B: B left unstarted does not refund A, and each returns only its own attempt', async () => {
    remember('mistakes:A', 1_000);
    remember('mistakes:B', 1_500);
    await settleMistakeQuotaStart('not_started', 'energy_insufficient', 'mistakes:B', 2_000);
    expect(mockRefund.mock.calls.map(([input]) => input.receiptId)).toEqual(['mistakes:B']);
    await settleMistakeQuotaStart('started', 'session_started', 'mistakes:A', 2_500);
    expect(mockRefund).toHaveBeenCalledTimes(1);
  });

  it('a started session keeps the attempt spent', async () => {
    remember('mistakes:b');
    await settleMistakeQuotaStart('started', 'session_started', 'mistakes:b', 2_000);
    await settleMistakeQuotaStart('not_started', 'left_before_start', 'mistakes:b', 3_000);
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it('no receipt in the route (Plus, free path, resume) or an unknown one — nothing to refund', async () => {
    remember('mistakes:x');
    await settleMistakeQuotaStart('not_started', 'left_before_start', undefined, 2_000);
    await settleMistakeQuotaStart('not_started', 'left_before_start', 'mistakes:other', 2_000);
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it('a stale receipt is not refunded', async () => {
    remember('mistakes:c', 0);
    await settleMistakeQuotaStart('not_started', 'left_before_start', 'mistakes:c', 11 * 60 * 1000);
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it('a failed spend still lets the refund run (refund itself answers not_found)', async () => {
    remember('mistakes:d', 1_000, Promise.reject(new Error('offline')));
    await settleMistakeQuotaStart('not_started', 'prepare_failed:x', 'mistakes:d', 2_000);
    expect(mockRefund).toHaveBeenCalledTimes(1);
  });
});
