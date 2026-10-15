/**
 * [LOGIN-STAMP] предвыборка метки владения (app/auth_stamp_prefetch.ts).
 * зачем (координатор 15.10): условия предвыборки — «вход отменён → поздний ответ не кладёт nonce»,
 * «аккаунт сменился за окно → stale_id → stamp заново», попытка вытесняется новой, без исключений наружу.
 */
import {
  consumeStampPrefetch,
  currentStampPrefetch,
  settleStampPrefetch,
  startStampPrefetch,
  STAMP_PREFETCH_MAX_AGE_MS,
  type StampIdentity,
} from '../app/auth_stamp_prefetch';

const ID: StampIdentity = { stableId: 'stable-A', authUid: 'anon-1' };
const RESPONSE = { data: { mergeNonce: 'secret-nonce' } };

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function harness(identity: StampIdentity | null = ID) {
  let clock = 1_000;
  const lines: string[] = [];
  const req = deferred<unknown>();
  const request = jest.fn((_stableId: string) => req.promise);
  const deps = {
    resolveIdentity: jest.fn(async () => identity),
    request,
    now: () => clock,
    log: (line: string) => { lines.push(line); },
  };
  return {
    deps,
    lines,
    req,
    request,
    tick: (ms: number) => { clock += ms; },
    opts: () => ({ now: () => clock, log: (line: string) => { lines.push(line); } }),
  };
}

afterEach(() => { settleStampPrefetch(null, () => undefined); });

/** Дать уйти запросу (resolveIdentity — асинхронный). */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('[LOGIN-STAMP] предвыборка метки', () => {
  it('hit: та же попытка, тот же stableId и uid — ответ отдаётся с моментом ответа сервера', async () => {
    const h = harness();
    const prefetch = startStampPrefetch(h.deps);
    h.tick(1_500);
    h.req.resolve(RESPONSE);
    const result = await consumeStampPrefetch(prefetch, ID, h.opts());
    expect(result.outcome).toBe('hit');
    expect(result.hit?.response).toBe(RESPONSE);
    expect(result.hit?.receivedAtMs).toBe(2_500);
    expect(h.request).toHaveBeenCalledWith('stable-A');
    expect(h.lines.some((l) => l.includes('consume outcome=hit'))).toBe(true);
  });

  it('вход отменён → поздний ответ не принимается (late_ignored), принять его некому', async () => {
    const h = harness();
    const prefetch = startStampPrefetch(h.deps);
    await flush();
    expect(settleStampPrefetch('cancelled', (l) => { h.lines.push(l); })).toBe('wasted_cancel');
    h.req.resolve(RESPONSE);
    await expect(prefetch.result).resolves.toBeNull();
    expect(h.lines.some((l) => l.includes('prefetch_late_ignored'))).toBe(true);
    const result = await consumeStampPrefetch(prefetch, ID, h.opts());
    expect(result.outcome).toBe('stale_attempt');
    expect(result.hit).toBeNull();
  });

  it('аккаунт сменился за окно → stale_id (вызывающий ставит метку заново)', async () => {
    const h = harness();
    const prefetch = startStampPrefetch(h.deps);
    h.req.resolve(RESPONSE);
    const result = await consumeStampPrefetch(prefetch, { stableId: 'stable-B', authUid: 'anon-1' }, h.opts());
    expect(result.outcome).toBe('stale_id');
    expect(result.hit).toBeNull();
  });

  it('анонимный uid сменился → stale_uid', async () => {
    const h = harness();
    const prefetch = startStampPrefetch(h.deps);
    h.req.resolve(RESPONSE);
    const result = await consumeStampPrefetch(prefetch, { stableId: 'stable-A', authUid: 'anon-2' }, h.opts());
    expect(result.outcome).toBe('stale_uid');
  });

  it('ответ старше предела → stale_age', async () => {
    const h = harness();
    const prefetch = startStampPrefetch(h.deps);
    h.req.resolve(RESPONSE);
    await prefetch.result;
    h.tick(STAMP_PREFETCH_MAX_AGE_MS + 1);
    const result = await consumeStampPrefetch(prefetch, ID, h.opts());
    expect(result.outcome).toBe('stale_age');
  });

  it('новая попытка вытесняет прежнюю → stale_attempt для старой', async () => {
    const first = harness();
    const old = startStampPrefetch(first.deps);
    const second = harness();
    startStampPrefetch(second.deps);
    first.req.resolve(RESPONSE);
    const result = await consumeStampPrefetch(old, ID, first.opts());
    expect(result.outcome).toBe('stale_attempt');
  });

  it('ошибка запроса → miss_failed, промис не отклоняется, код в логе', async () => {
    const h = harness();
    const prefetch = startStampPrefetch(h.deps);
    h.req.reject(Object.assign(new Error('boom'), { code: 'functions/unavailable' }));
    await expect(prefetch.result).resolves.toBeNull();
    expect(h.lines.some((l) => l.includes('prefetch_failed') && l.includes('code=functions/unavailable'))).toBe(true);
    const result = await consumeStampPrefetch(prefetch, ID, h.opts());
    expect(result.outcome).toBe('miss_failed');
  });

  it('не аноним → запрос не уходит, miss_failed', async () => {
    const h = harness(null);
    const prefetch = startStampPrefetch(h.deps);
    await expect(prefetch.result).resolves.toBeNull();
    expect(h.request).not.toHaveBeenCalled();
    expect(h.lines.some((l) => l.includes('reason=not_anonymous'))).toBe(true);
    expect((await consumeStampPrefetch(prefetch, ID, h.opts())).outcome).toBe('miss_failed');
  });

  it('текущая предвыборка видна до конца входа и пропадает на итоге', () => {
    const h = harness();
    expect(currentStampPrefetch()).toBeNull();
    const prefetch = startStampPrefetch(h.deps);
    expect(currentStampPrefetch()).toBe(prefetch);
    settleStampPrefetch('cancelled', () => undefined);
    expect(currentStampPrefetch()).toBeNull();
  });

  it('нет предвыборки → miss_none', async () => {
    const h = harness();
    expect((await consumeStampPrefetch(null, ID, h.opts())).outcome).toBe('miss_none');
  });

  it('в лог не попадают ни секрет, ни stableId, ни uid', async () => {
    const h = harness();
    const prefetch = startStampPrefetch(h.deps);
    h.req.resolve(RESPONSE);
    await consumeStampPrefetch(prefetch, ID, h.opts());
    const all = h.lines.join('\n');
    expect(all).not.toContain('secret-nonce');
    expect(all).not.toContain('stable-A');
    expect(all).not.toContain('anon-1');
  });

  describe('итог входа outcome=… (доля впустую, условие координатора)', () => {
    it('used — приняли предвыборку', async () => {
      const h = harness();
      const prefetch = startStampPrefetch(h.deps);
      h.req.resolve(RESPONSE);
      await consumeStampPrefetch(prefetch, ID, h.opts());
      expect(settleStampPrefetch('merged_devices', (l) => { h.lines.push(l); })).toBe('used');
      expect(h.lines.some((l) => l.includes('outcome=used') && l.includes('signIn=merged_devices'))).toBe(true);
    });

    it('wasted_no_conflict — вход успешен без конфликта, приёма не было', async () => {
      const h = harness();
      startStampPrefetch(h.deps);
      await flush();
      expect(settleStampPrefetch('linked_existing', () => undefined)).toBe('wasted_no_conflict');
    });

    it('wasted_error — вход упал или бросил исключение', async () => {
      const h = harness();
      startStampPrefetch(h.deps);
      await flush();
      expect(settleStampPrefetch(null, () => undefined)).toBe('wasted_error');
    });

    it('wasted_stale_id — принимали, но аккаунт другой', async () => {
      const h = harness();
      const prefetch = startStampPrefetch(h.deps);
      h.req.resolve(RESPONSE);
      await consumeStampPrefetch(prefetch, { stableId: 'stable-B', authUid: 'anon-1' }, h.opts());
      expect(settleStampPrefetch('merged_devices', () => undefined)).toBe('wasted_stale_id');
    });

    it('not_sent — запрос не ушёл (не аноним), вызова не было', async () => {
      const h = harness(null);
      const prefetch = startStampPrefetch(h.deps);
      await prefetch.result;
      expect(settleStampPrefetch('cancelled', () => undefined)).toBe('not_sent');
    });

    it('none — предвыборки не было, лога нет', () => {
      const lines: string[] = [];
      expect(settleStampPrefetch('cancelled', (l) => { lines.push(l); })).toBe('none');
      expect(lines).toEqual([]);
    });
  });
});
