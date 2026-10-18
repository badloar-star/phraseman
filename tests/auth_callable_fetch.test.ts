// Координатор 14.10 (прогон №5, пункт 2): вызовы входа через fetch с ID-токеном — под флагом auth_callables_fetch_v1 (выкл).
// Нативный путь — только если запрос гарантированно не ушёл; ушёл и упал — ошибка наверх без повтора (merge/stamp не дважды).
import { AuthCallableFetchError, authRegionFallbackReason, invokeAuthCallable } from '../app/auth_callable_fetch';
import { currentAuthCallableRegionSync, resetAuthRegionStateForTest } from '../app/auth_callable_region';

jest.mock('../app/remote_config_client', () => ({ readRemoteConfigCacheRaw: async () => null }));

const lines: string[] = [];
const res = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;
// Блок ниже проверяет транспорт в США (прежний путь) — Европа выключена выключателем; регион — в конце файла.
const deps = (over: Record<string, unknown> = {}) => ({
  euEnabled: async () => false,
  flagOn: async () => true,
  idToken: async () => 'tok-123',
  projectId: () => 'proj-x',
  log: (l: string) => { lines.push(l); },
  ...over,
});

describe('invokeAuthCallable', () => {
  beforeEach(() => { lines.length = 0; resetAuthRegionStateForTest(); });

  it('флаг выключен (по умолчанию) → только нативный путь, fetch не зовётся', async () => {
    const fetchImpl = jest.fn();
    const native = jest.fn(async () => ({ data: { ok: true } }));
    await expect(invokeAuthCallable('authEnsureStableLink', { stableId: 's' }, native, { timeoutMs: 1000 }, { euEnabled: async () => false, fetchImpl: fetchImpl as never })).resolves.toEqual({ data: { ok: true } });
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

// зачем (владелец 18.10 «Да, перенести», разбор fc30ae94a): функции входа и в europe-west1 (рядом с базой eur3), и в us-central1.
// Европа первой; США — запасной путь: not-found для всех, сбой связи — только у идемпотентной authEnsureStableLink.
describe('invokeAuthCallable: регион', () => {
  const euDeps = (over: Record<string, unknown> = {}) => ({
    flagOn: async () => false,
    log: (l: string) => { lines.push(l); },
    ...over,
  });
  const notFound = Object.assign(new Error('NOT_FOUND'), { code: 'functions/not-found' });
  const unavailable = Object.assign(new Error('unavailable'), { code: 'functions/unavailable' });

  beforeEach(() => { lines.length = 0; resetAuthRegionStateForTest(); });

  it('по умолчанию — Европа нативным вызовом; США не зовутся', async () => {
    const nativeInRegion = jest.fn(async () => ({ data: { ok: true } }));
    const native = jest.fn();
    await expect(invokeAuthCallable('authEnsureStableLink', { stableId: 's' }, native, { timeoutMs: 1000 }, euDeps({ nativeInRegion })))
      .resolves.toEqual({ data: { ok: true } });
    expect(nativeInRegion).toHaveBeenCalledWith('europe-west1', 'authEnsureStableLink', { stableId: 's' }, 1000);
    expect(native).not.toHaveBeenCalled();
    expect(lines.join('\n')).toMatch(/\[AUTH-REGION\] fn=authEnsureStableLink region=europe-west1 outcome=ok/);
  });

  it('fetch-путь в Европе бьёт в europe-west1', async () => {
    const fetchImpl = jest.fn(async () => res(200, { result: { ok: true } }));
    await invokeAuthCallable('authMergeStableAccounts', {}, jest.fn(), { timeoutMs: 1000 }, euDeps({
      flagOn: async () => true, idToken: async () => 'tok', projectId: () => 'proj-x', fetchImpl,
    }));
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe('https://europe-west1-proj-x.cloudfunctions.net/authMergeStableAccounts');
  });

  it('функции нет в Европе (not-found) → США для всех трёх; дальше в этом запуске — сразу США', async () => {
    const nativeInRegion = jest.fn(async () => { throw notFound; });
    const native = jest.fn(async () => ({ data: 'us' }));
    await expect(invokeAuthCallable('authMergeStableAccounts', {}, native, { timeoutMs: 1000 }, euDeps({ nativeInRegion }))).resolves.toEqual({ data: 'us' });
    expect(currentAuthCallableRegionSync()).toBe('us-central1');
    await expect(invokeAuthCallable('authStampAnonOwnership', {}, native, { timeoutMs: 1000 }, euDeps({ nativeInRegion }))).resolves.toEqual({ data: 'us' });
    expect(nativeInRegion).toHaveBeenCalledTimes(1);
    expect(lines.join('\n')).toContain('outcome=fallback_us reason=not_deployed');
    expect(lines.join('\n')).toContain('reason=eu_unavailable_this_run');
  });

  it('сбой связи: authEnsureStableLink → США; слияние и метка — ошибка наверх (дважды нельзя)', async () => {
    const nativeInRegion = jest.fn(async () => { throw unavailable; });
    const native = jest.fn(async () => ({ data: 'us' }));
    await expect(invokeAuthCallable('authEnsureStableLink', {}, native, { timeoutMs: 1000 }, euDeps({ nativeInRegion }))).resolves.toEqual({ data: 'us' });
    await expect(invokeAuthCallable('authMergeStableAccounts', {}, native, { timeoutMs: 1000 }, euDeps({ nativeInRegion }))).rejects.toBe(unavailable);
    await expect(invokeAuthCallable('authStampAnonOwnership', {}, native, { timeoutMs: 1000 }, euDeps({ nativeInRegion }))).rejects.toBe(unavailable);
    expect(native).toHaveBeenCalledTimes(1);
    // Сбой связи не помечает Европу мёртвой — следующий вход снова идёт в Европу.
    expect(currentAuthCallableRegionSync()).toBe('europe-west1');
  });

  it('ответ сервера (permission-denied) → наверх без США', async () => {
    const denied = Object.assign(new Error('stable_id_mismatch'), { code: 'functions/permission-denied' });
    const native = jest.fn();
    await expect(invokeAuthCallable('authEnsureStableLink', {}, native, { timeoutMs: 1000 }, euDeps({ nativeInRegion: async () => { throw denied; } }))).rejects.toBe(denied);
    expect(native).not.toHaveBeenCalled();
    expect(lines.join('\n')).toContain('outcome=error_no_fallback');
  });

  it('выключатель auth_region_eu_v1 = false → сразу США, и прогрев тоже', async () => {
    const nativeInRegion = jest.fn();
    const native = jest.fn(async () => ({ data: 'us' }));
    await expect(invokeAuthCallable('authEnsureStableLink', {}, native, { timeoutMs: 1000 }, euDeps({ nativeInRegion, euEnabled: async () => false }))).resolves.toEqual({ data: 'us' });
    expect(nativeInRegion).not.toHaveBeenCalled();
    expect(currentAuthCallableRegionSync()).toBe('us-central1');
  });

  it('fetch 404 без тела — not-found, а не «неизвестно»', () => {
    expect(authRegionFallbackReason('authStampAnonOwnership', { code: 'functions/not-found' })).toBe('not_deployed');
    expect(authRegionFallbackReason('authStampAnonOwnership', { code: 'functions/deadline-exceeded' })).toBeNull();
    expect(authRegionFallbackReason('authEnsureStableLink', { code: 'functions/deadline-exceeded' })).toBe('transport');
    expect(authRegionFallbackReason('authEnsureStableLink', { code: 'functions/failed-precondition' })).toBeNull();
  });
});
