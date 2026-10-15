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

  it('ноль: окно только у обновившихся с 1.x, свежая установка — без окна', async () => {
    const zero = { ...converted, status: 'nothing', coins: { xp: 0, pearls: 0, spins: 0, total: 0 } };
    const hook = await renderHook(() => useLegacyBonusWelcome());
    mockCall.mockResolvedValueOnce({ data: { ...zero, upgraded: false } });
    await act(async () => { await runLegacyBonusConvertOnce('test'); });
    expect(hook.result.current.kind).toBe('none');
    await AsyncStorage.clear();
    resetLegacyBonusClientForTests();
    const hook2 = await renderHook(() => useLegacyBonusWelcome());
    mockCall.mockResolvedValueOnce({ data: { ...zero, upgraded: true } });
    await act(async () => { await runLegacyBonusConvertOnce('test'); });
    expect(hook2.result.current).toMatchObject({ kind: 'show', result: { status: 'nothing', coins: { total: 0 } } });
    expect(mockMerge).not.toHaveBeenCalled();
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

  // зачем (Ревизор P2/P11, решение координатора 15.10): ответ позже потолка 8 с не должен терять окно навсегда — метка несёт результат, окно показывается при следующем запуске ровно один раз
  it('ответ позже потолка → в этом запуске окна нет, метка с welcomePending; следующий запуск показывает окно один раз без нового вызова сервера', async () => {
    jest.useFakeTimers();
    try {
      let reply: (value: unknown) => void = () => undefined;
      mockCall.mockReturnValueOnce(new Promise((resolve) => { reply = resolve; }));
      const hook = await renderHook(() => useLegacyBonusWelcome());
      const run = runLegacyBonusConvertOnce('slow');
      await jest.advanceTimersByTimeAsync(8_500);
      reply({ data: converted });
      await act(async () => { await run; });
      expect(hook.result.current.kind).toBe('none');
      const stored = JSON.parse(String(await AsyncStorage.getItem('legacy_bonus_done_v1:owner-legacy')));
      expect(stored).toMatchObject({ status: 'converted', total: 2036, welcomePending: true, pending: { coins: { total: 2036 } } });

      resetLegacyBonusClientForTests();
      const hook2 = await renderHook(() => useLegacyBonusWelcome());
      await act(async () => { await runLegacyBonusConvertOnce('next_launch'); });
      expect(hook2.result.current).toMatchObject({ kind: 'show', result: { coins: { total: 2036 } } });
      expect(mockCall).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String(await AsyncStorage.getItem('legacy_bonus_done_v1:owner-legacy')))).toEqual({ status: 'converted', total: 2036 });

      await act(async () => { dismissLegacyBonusWelcome(); });
      resetLegacyBonusClientForTests();
      const hook3 = await renderHook(() => useLegacyBonusWelcome());
      await act(async () => { await runLegacyBonusConvertOnce('third_launch'); });
      expect(hook3.result.current.kind).toBe('none');
      expect(mockCall).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('метка с welcomePending без результата или чужой аккаунт → окна нет, флаг снят', async () => {
    await AsyncStorage.setItem('legacy_bonus_done_v1:owner-legacy', JSON.stringify({ status: 'converted', total: 10, welcomePending: true, pending: { broken: true } }));
    const hook = await renderHook(() => useLegacyBonusWelcome());
    await act(async () => { await runLegacyBonusConvertOnce('broken_pending'); });
    expect(hook.result.current.kind).toBe('none');
    expect(JSON.parse(String(await AsyncStorage.getItem('legacy_bonus_done_v1:owner-legacy')))).toEqual({ status: 'converted', total: 10 });
    expect(mockCall).not.toHaveBeenCalled();
  });
});
