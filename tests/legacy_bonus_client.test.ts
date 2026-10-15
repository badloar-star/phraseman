// D195 (владелец 15.10): клиент конвертации старых бонусов — один вызов на владельца, кошелёк доливается, окно только при начислении.
const mockCall = jest.fn();
const mockMerge = jest.fn(async () => ({ balance: 4166 }));
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => (data: unknown) => mockCall(data),
}));
jest.mock('../app/level_spin_star_grants', () => ({ mergeLevelSpinServerStars: (...args: unknown[]) => mockMerge(...(args as [])) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { beginAccountGeneration } from '../app/account_generation';
import { dismissLegacyBonusWelcome, resetLegacyBonusClientForTests, runLegacyBonusConvertOnce, useLegacyBonusWelcome } from '../app/legacy_bonus_client';

const converted = {
  status: 'converted', from: { xp: 8362, pearls: 120, spins: 0 }, coins: { xp: 836, pearls: 1200, spins: 0, total: 2036 },
  cappedBy: 'none', starsBalance: 4036, starsSeq: 17,
};

describe('legacy_bonus_client', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetLegacyBonusClientForTests();
    mockCall.mockReset();
    mockMerge.mockClear();
    beginAccountGeneration('owner-legacy');
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('начислено → кошелёк доливается серверным снимком, метка владельца, повторный запуск сеть не трогает', async () => {
    mockCall.mockResolvedValueOnce({ data: converted });
    await runLegacyBonusConvertOnce('test');
    expect(mockCall).toHaveBeenCalledWith({ ownerStableId: 'owner-legacy' });
    expect(mockMerge).toHaveBeenCalledWith(expect.anything(), { stars: 4036, starsSeq: 17, serverCreditedDelta: 2036 });
    expect(JSON.parse(String(await AsyncStorage.getItem('legacy_bonus_done_v1:owner-legacy')))).toEqual({ status: 'converted', total: 2036 });
    resetLegacyBonusClientForTests();
    await runLegacyBonusConvertOnce('test');
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it('сервер выключен → без окна, повтор не раньше чем через 12 ч', async () => {
    mockCall.mockResolvedValueOnce({ data: { ...converted, status: 'disabled', coins: { xp: 0, pearls: 0, spins: 0, total: 0 } } });
    await runLegacyBonusConvertOnce('test');
    expect(mockMerge).not.toHaveBeenCalled();
    resetLegacyBonusClientForTests();
    await runLegacyBonusConvertOnce('test');
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it('ошибка сети — без окна и без метки, повтор при следующем запуске', async () => {
    mockCall.mockRejectedValueOnce(new Error('unavailable'));
    await runLegacyBonusConvertOnce('test');
    expect(await AsyncStorage.getItem('legacy_bonus_done_v1:owner-legacy')).toBeNull();
    mockCall.mockResolvedValueOnce({ data: converted });
    await runLegacyBonusConvertOnce('test');
    expect(mockCall).toHaveBeenCalledTimes(2);
  });

  it('окно: show только после начисления, закрытие убирает', async () => {
    const hook = await renderHook(() => useLegacyBonusWelcome());
    expect(hook.result.current.kind).toBe('none');
    mockCall.mockResolvedValueOnce({ data: converted });
    await act(async () => { await runLegacyBonusConvertOnce('test'); });
    expect(hook.result.current).toMatchObject({ kind: 'show', result: { coins: { total: 2036 } } });
    await act(async () => { dismissLegacyBonusWelcome(); });
    expect(hook.result.current.kind).toBe('none');
  });
});
