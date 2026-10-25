// зачем (владелец 25.10, «Удалить навсегда сейчас»): признак «сейчас» забирается в момент постановки, хранится по операции и
// возвращается при повторе после перезапуска; неиспользованный — снимается и не перетекает в обычное удаление.
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
    getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  },
}));

/* eslint-disable import/first */
import {
  armAccountDeleteNow,
  disarmAccountDeleteNow,
  resolveAccountDeleteNow,
  takeArmedAccountDeleteNow,
} from '../app/account_delete_now';

beforeEach(() => {
  mockStore.clear();
  disarmAccountDeleteNow();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('признак «Удалить навсегда сейчас»', () => {
  it('взведённый забирается один раз и сохраняется по операции; повтор читает его с диска', async () => {
    armAccountDeleteNow();
    const armed = takeArmedAccountDeleteNow();
    expect(armed).toBe(true);
    expect(takeArmedAccountDeleteNow()).toBe(false);
    await expect(resolveAccountDeleteNow('op-1', armed)).resolves.toBe(true);
    await expect(resolveAccountDeleteNow('op-1', false)).resolves.toBe(true);
    await expect(resolveAccountDeleteNow('op-2', false)).resolves.toBe(false);
  });

  it('без взвода — обычное удаление (14 дней); снятый признак не перетекает', async () => {
    armAccountDeleteNow();
    disarmAccountDeleteNow();
    expect(takeArmedAccountDeleteNow()).toBe(false);
    await expect(resolveAccountDeleteNow('op-3', false)).resolves.toBe(false);
  });
});
