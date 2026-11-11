/**
 * Сторож ускорения разбора ошибки (владелец 11.11: «разбор готовится очень долго» → «Да, все четыре правки»).
 * Проверяет поведение, а не текст: память опознания, общий запрос у прогрева и вызова, порядок отказов лимитов.
 */
import {
  MISTAKE_IDENTITY_MEMO_TTL_MS,
  __resetMistakeExplainSpeedForTests,
  reserveCapAndRateTogether,
  resolveMistakeStableUid,
  warmMistakeExplainRuntime,
} from './mistake_explain_speed';
import { resolveStableUidForAuth } from './auth_identity';

jest.mock('./auth_identity', () => ({
  resolveStableUidForAuth: jest.fn(async (_db: unknown, authUid: string) => `stable-${authUid}`),
}));

const resolveMock = jest.mocked(resolveStableUidForAuth);
const db = {} as never;

beforeEach(() => {
  __resetMistakeExplainSpeedForTests();
  resolveMock.mockClear();
  resolveMock.mockImplementation(async (_db: unknown, authUid: string) => `stable-${authUid}`);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('память опознания аккаунта', () => {
  it('второй вызов в пределах срока не ходит в базу', async () => {
    await expect(resolveMistakeStableUid(db, 'u1', 1_000)).resolves.toEqual({ stableUid: 'stable-u1', source: 'database' });
    await expect(resolveMistakeStableUid(db, 'u1', Date.now() + 1_000)).resolves.toEqual({ stableUid: 'stable-u1', source: 'memory' });
    expect(resolveMock).toHaveBeenCalledTimes(1);
  });

  it('после срока опознаёт заново', async () => {
    await resolveMistakeStableUid(db, 'u1');
    await resolveMistakeStableUid(db, 'u1', Date.now() + MISTAKE_IDENTITY_MEMO_TTL_MS + 1);
    expect(resolveMock).toHaveBeenCalledTimes(2);
  });

  it('память одного аккаунта не отдаётся другому', async () => {
    await resolveMistakeStableUid(db, 'u1');
    await expect(resolveMistakeStableUid(db, 'u2')).resolves.toEqual({ stableUid: 'stable-u2', source: 'database' });
  });

  it('прогрев и настоящий запрос делят одно опознание', async () => {
    let release!: (value: string) => void;
    resolveMock.mockImplementationOnce(() => new Promise<string>((resolve) => { release = resolve; }));
    const warm = resolveMistakeStableUid(db, 'u1');
    const real = resolveMistakeStableUid(db, 'u1');
    release('stable-u1');
    await expect(warm).resolves.toEqual({ stableUid: 'stable-u1', source: 'database' });
    await expect(real).resolves.toEqual({ stableUid: 'stable-u1', source: 'in_flight' });
    expect(resolveMock).toHaveBeenCalledTimes(1);
  });

  it('отказ опознания не запоминается и доходит до вызывающего', async () => {
    resolveMock.mockRejectedValueOnce(Object.assign(new Error('account_deletion_pending'), { code: 'failed-precondition' }));
    await expect(resolveMistakeStableUid(db, 'u1')).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(resolveMistakeStableUid(db, 'u1')).resolves.toMatchObject({ source: 'database' });
    expect(resolveMock).toHaveBeenCalledTimes(2);
  });
});

describe('прогрев', () => {
  it('опознаёт аккаунт заранее — настоящий запрос берёт его из памяти', async () => {
    await warmMistakeExplainRuntime(db, 'u1');
    await expect(resolveMistakeStableUid(db, 'u1')).resolves.toMatchObject({ source: 'memory' });
    expect(resolveMock).toHaveBeenCalledTimes(1);
  });

  it('не бросает, если опознание упало, и пишет причину', async () => {
    resolveMock.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'unavailable' }));
    await expect(warmMistakeExplainRuntime(db, 'u1')).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith('[EXPLAIN-MISTAKE] warm:step_failed', expect.stringContaining('unavailable'));
  });
});

describe('дневной кап и окно частоты одновременно', () => {
  it('оба шага стартуют сразу, результат — резерв капа', async () => {
    const order: string[] = [];
    const reservation = await reserveCapAndRateTogether({
      reserveCap: async () => { order.push('cap:start'); await Promise.resolve(); order.push('cap:end'); return { id: 'r1' }; },
      enforceRate: async () => { order.push('rate:start'); },
      refundCap: jest.fn(async () => undefined),
    });
    expect(reservation).toEqual({ id: 'r1' });
    expect(order.indexOf('rate:start')).toBeLessThan(order.indexOf('cap:end'));
  });

  it('окно частоты отказало — кап возвращён, наружу уходит отказ окна', async () => {
    const refundCap = jest.fn(async () => undefined);
    const rateError = Object.assign(new Error('mistake_explain_rate_limited'), { code: 'resource-exhausted' });
    await expect(reserveCapAndRateTogether({
      reserveCap: async () => ({ id: 'r1' }),
      enforceRate: async () => { throw rateError; },
      refundCap,
    })).rejects.toBe(rateError);
    expect(refundCap).toHaveBeenCalledWith({ id: 'r1' });
  });

  it('кап отказал — возвращать нечего, наружу уходит отказ капа', async () => {
    const refundCap = jest.fn(async () => undefined);
    const capError = Object.assign(new Error('explain_free_daily_limit'), { code: 'resource-exhausted' });
    await expect(reserveCapAndRateTogether({
      reserveCap: async () => { throw capError; },
      enforceRate: async () => undefined,
      refundCap,
    })).rejects.toBe(capError);
    expect(refundCap).not.toHaveBeenCalled();
  });

  it('сбой возврата капа не подменяет отказ окна и пишется в журнал', async () => {
    const rateError = new Error('mistake_explain_rate_limited');
    await expect(reserveCapAndRateTogether({
      reserveCap: async () => ({ id: 'r1' }),
      enforceRate: async () => { throw rateError; },
      refundCap: async () => { throw new Error('refund_down'); },
    })).rejects.toBe(rateError);
    expect(console.error).toHaveBeenCalledWith('[EXPLAIN-MISTAKE] cap_refund_failed', expect.any(String));
  });
});
