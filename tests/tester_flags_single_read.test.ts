// зачем ([COLD-START-IO], release, слабый профиль, 02.10): флаг тестера читали ~42 раза за 15 с старта.
// readTesterFlags: в store-сборке хранилище не трогается вовсе (флаги там игнорируются), в dev/preview
// одновременные чтения склеиваются в одно multiGet, а результат не держится дольше запроса.
const mockMultiGet = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { multiGet: (...args: unknown[]) => mockMultiGet(...args), removeItem: jest.fn(async () => undefined) },
}));
jest.mock('../app/config', () => ({ IS_STORE_RELEASE: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

import { readTesterFlags } from '../app/tester_premium_override';

describe('readTesterFlags', () => {
  beforeEach(() => mockMultiGet.mockReset());

  test('store-сборка не ходит в хранилище', async () => {
    await expect(readTesterFlags(true)).resolves.toEqual({ noPremium: null, noLimits: null });
    expect(mockMultiGet).not.toHaveBeenCalled();
  });

  test('одновременные чтения — одно multiGet; следующее после ответа — новое', async () => {
    mockMultiGet.mockResolvedValue([['tester_no_premium', 'true'], ['tester_no_limits', null]]);
    const [a, b, c] = await Promise.all([readTesterFlags(false), readTesterFlags(false), readTesterFlags(false)]);
    expect(a).toEqual({ noPremium: 'true', noLimits: null });
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(mockMultiGet).toHaveBeenCalledTimes(1);

    mockMultiGet.mockResolvedValue([['tester_no_premium', null], ['tester_no_limits', 'true']]);
    await expect(readTesterFlags(false)).resolves.toEqual({ noPremium: null, noLimits: 'true' });
    expect(mockMultiGet).toHaveBeenCalledTimes(2);
  });

  test('сбой хранилища — флаги пустые, причина в журнале', async () => {
    mockMultiGet.mockRejectedValue(new Error('storage down'));
    await expect(readTesterFlags(false)).resolves.toEqual({ noPremium: null, noLimits: null });
  });
});
