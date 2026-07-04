import {
  getNetStatus,
  subscribeNetStatus,
  reportNetworkSuccess,
  reportNetworkFailure,
  checkOnlineNow,
} from '../app/net_status';

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
  jest.useRealTimers();
});

describe('net_status', () => {
  it('reportNetworkSuccess переводит статус в online и будит подписчиков', () => {
    const events: boolean[] = [];
    const unsub = subscribeNetStatus((online) => events.push(online));

    reportNetworkFailure(); // без подписчиков было бы offline сразу; с подписчиком идёт probe
    reportNetworkSuccess();

    expect(getNetStatus()).toBe('online');
    expect(events).toContain(true);
    unsub();
  });

  it('checkOnlineNow: успешный fetch -> online', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 204 }) as unknown as typeof fetch;

    await expect(checkOnlineNow()).resolves.toBe(true);
    expect(getNetStatus()).toBe('online');
  });

  it('checkOnlineNow: сетевая ошибка -> offline + уведомление подписчика', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed')) as unknown as typeof fetch;
    const events: boolean[] = [];
    const unsub = subscribeNetStatus((online) => events.push(online));

    await expect(checkOnlineNow()).resolves.toBe(false);

    expect(getNetStatus()).toBe('offline');
    expect(events).toContain(false);
    unsub();
  });

  it('после offline успешный probe возвращает online', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;
    await checkOnlineNow();
    expect(getNetStatus()).toBe('offline');

    global.fetch = jest.fn().mockResolvedValue({ status: 204 }) as unknown as typeof fetch;
    await checkOnlineNow();
    expect(getNetStatus()).toBe('online');
  });
});
