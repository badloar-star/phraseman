// Прогон №5 (координатор 14.10): прогрев функций входа — обычным fetch, мимо однопоточной очереди RNFirebase callable.
// Прогрев никогда не бросает и не задерживает вход; каждый исход — строка [WARM-FETCH].
import { WARM_FETCH_TIMEOUT_MS, warmCallableUrl, warmCallableViaFetch } from '../app/auth_warm_fetch';

const lines: string[] = [];
const deps = (fetchImpl: unknown) => ({ fetchImpl: fetchImpl as typeof fetch, projectId: () => 'proj-x', log: (l: string) => { lines.push(l); } });
const response = (status: number) => ({ ok: status >= 200 && status < 300, status }) as Response;

describe('warmCallableViaFetch', () => {
  beforeEach(() => { lines.length = 0; });
  afterEach(() => { jest.useRealTimers(); });

  it('бьёт в адрес callable с телом {data:{warmup:true}} без токена', async () => {
    const fetchImpl = jest.fn(async () => response(200));
    await expect(warmCallableViaFetch('authStampAnonOwnership', 'test', deps(fetchImpl))).resolves.toBe('warm_ok');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(warmCallableUrl('proj-x', 'authStampAnonOwnership'));
    expect(url).toBe('https://us-central1-proj-x.cloudfunctions.net/authStampAnonOwnership');
    expect(JSON.parse(String(init.body))).toEqual({ data: { warmup: true } });
    expect(JSON.stringify(init.headers)).not.toMatch(/Authorization/i);
    expect(lines[0]).toMatch(/^\[WARM-FETCH\] fn=authStampAnonOwnership outcome=warm_ok code=200 ms=\d+ source=test$/);
  });

  it('три прогрева уходят параллельно — до любого ответа', async () => {
    const pending: Array<(r: Response) => void> = [];
    const fetchImpl = jest.fn(() => new Promise<Response>((resolve) => { pending.push(resolve); }));
    const all = ['a', 'b', 'c'].map((n) => warmCallableViaFetch(n, 'test', deps(fetchImpl)));
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    pending.forEach((resolve) => resolve(response(200)));
    await expect(Promise.all(all)).resolves.toEqual(['warm_ok', 'warm_ok', 'warm_ok']);
  });

  it('401/403 — инстанс всё равно поднят: warm_ok_rejected; 500 — http_error', async () => {
    await expect(warmCallableViaFetch('f', 't', deps(async () => response(401)))).resolves.toBe('warm_ok_rejected');
    await expect(warmCallableViaFetch('f', 't', deps(async () => response(403)))).resolves.toBe('warm_ok_rejected');
    await expect(warmCallableViaFetch('f', 't', deps(async () => response(500)))).resolves.toBe('http_error');
  });

  it('сеть упала → failed; нет projectId → skip; не бросает', async () => {
    await expect(warmCallableViaFetch('f', 't', deps(async () => { throw new Error('Network request failed'); }))).resolves.toBe('failed');
    expect(lines.pop()).toContain('code=Network request failed');
    await expect(warmCallableViaFetch('f', 't', { ...deps(jest.fn()), projectId: () => null })).resolves.toBe('skip');
  });

  it('таймаут 10 с — обрывает запрос и пишет timeout', async () => {
    jest.useFakeTimers();
    const fetchImpl = jest.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
    }));
    const run = warmCallableViaFetch('f', 't', deps(fetchImpl));
    jest.advanceTimersByTime(WARM_FETCH_TIMEOUT_MS + 1);
    await expect(run).resolves.toBe('timeout');
  });
});
