// Координатор 14.10 (прогон №5, пункт 2): вызовы входа через fetch с ID-токеном — под флагом auth_callables_fetch_v1 (выкл).
// Нативный путь — только если запрос гарантированно не ушёл; ушёл и упал — ошибка наверх без повтора (merge/stamp не дважды).
import { AuthCallableFetchError, invokeAuthCallable } from '../app/auth_callable_fetch';

jest.mock('../app/remote_config_client', () => ({ readRemoteConfigCacheRaw: async () => null }));

const lines: string[] = [];
const res = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;
const deps = (over: Record<string, unknown> = {}) => ({
  flagOn: async () => true,
  idToken: async () => 'tok-123',
  projectId: () => 'proj-x',
  log: (l: string) => { lines.push(l); },
  ...over,
});

describe('invokeAuthCallable', () => {
  beforeEach(() => { lines.length = 0; });

  it('флаг выключен (по умолчанию) → только нативный путь, fetch не зовётся', async () => {
    const fetchImpl = jest.fn();
    const native = jest.fn(async () => ({ data: { ok: true } }));
    await expect(invokeAuthCallable('authEnsureStableLink', { stableId: 's' }, native, { timeoutMs: 1000 }, { fetchImpl: fetchImpl as never })).resolves.toEqual({ data: { ok: true } });
    expect(native).toHaveBeenCalledTimes(1);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('флаг включён → POST {data} с Bearer-токеном, ответ {result} возвращается как {data}', async () => {
    const fetchImpl = jest.fn(async () => res(200, { result: { ok: true, stableUid: 's' } }));
    const native = jest.fn();
    await expect(invokeAuthCallable('authMergeStableAccounts', { stableIdA: 'a', stableIdB: 'b' }, native, { timeoutMs: 1000 }, deps({ fetchImpl })))
      .resolves.toEqual({ data: { ok: true, stableUid: 's' } });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://us-central1-proj-x.cloudfunctions.net/authMergeStableAccounts');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
    expect(JSON.parse(String(init.body))).toEqual({ data: { stableIdA: 'a', stableIdB: 'b' } });
    expect(native).not.toHaveBeenCalled();
    expect(lines.join('\n')).not.toContain('tok-123');
  });

  it('ошибка сервера → code/message/details как у SDK (классификаторы читают как раньше), без нативного повтора', async () => {
    const fetchImpl = jest.fn(async () => res(400, { error: { status: 'FAILED_PRECONDITION', message: 'account_delete_pending', details: { x: 1 } } }));
    const native = jest.fn();
    const p = invokeAuthCallable('authEnsureStableLink', {}, native, { timeoutMs: 1000 }, deps({ fetchImpl }));
    await expect(p).rejects.toBeInstanceOf(AuthCallableFetchError);
    await expect(p).rejects.toMatchObject({ code: 'functions/failed-precondition', message: 'account_delete_pending', details: { x: 1 } });
    expect(native).not.toHaveBeenCalled();
  });

  it('нет токена / projectId → запрос не ушёл → нативный путь безопасен', async () => {
    const fetchImpl = jest.fn();
    const native = jest.fn(async () => ({ data: 'n' }));
    await expect(invokeAuthCallable('authStampAnonOwnership', {}, native, { timeoutMs: 1000 }, deps({ fetchImpl, idToken: async () => null }))).resolves.toEqual({ data: 'n' });
    await expect(invokeAuthCallable('authStampAnonOwnership', {}, native, { timeoutMs: 1000 }, deps({ fetchImpl, projectId: () => null }))).resolves.toEqual({ data: 'n' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(lines.filter((l) => l.includes('fallback_not_sent'))).toHaveLength(2);
  });

  it('сеть упала после отправки → ошибка наверх (transport), merge НЕ повторяется нативно', async () => {
    const native = jest.fn();
    const p = invokeAuthCallable('authMergeStableAccounts', {}, native, { timeoutMs: 1000 }, deps({ fetchImpl: async () => { throw new Error('Network request failed'); } }));
    await expect(p).rejects.toMatchObject({ code: 'functions/unavailable' });
    expect(native).not.toHaveBeenCalled();
  });

  it('таймаут → abort, deadline-exceeded, без повтора', async () => {
    const fetchImpl = jest.fn((_u: string, init?: RequestInit) => new Promise<Response>((_r, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
    }));
    const native = jest.fn();
    // реальные таймеры и короткий таймаут: до запуска таймера функция ждёт флаг, projectId и токен.
    await expect(invokeAuthCallable('authEnsureStableLink', {}, native, { timeoutMs: 30 }, deps({ fetchImpl })))
      .rejects.toMatchObject({ code: 'functions/deadline-exceeded' });
    expect(native).not.toHaveBeenCalled();
  });
});
