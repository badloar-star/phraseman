import { act, renderHook } from '@testing-library/react-native';

// зачем (аудит R48, координатор 15.10): при 0 энергии тап «Разобрать» тратил суточную Free-попытку, а тренировка
// открывалась и молча закрывалась. Теперь гейт спрашивает прогноз энергии ДО траты попытки.
let mockPredict: 'ok' | 'insufficient' | 'unknown' = 'ok';
let mockQuota: Record<string, unknown> = { status: 'allowed', used: 0, limit: 1, bypass: null };
const mockConsume = jest.fn(async () => ({ status: 'allowed', used: 1, limit: 1, bypass: null }));
const mockPush = jest.fn();
const mockPredictCalls: string[] = [];

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'uuid-1' }));
jest.mock('../components/PremiumContext', () => ({ usePremium: () => ({ accessResolved: true }) }));
jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({ predictStartRefusal: (activity: string) => { mockPredictCalls.push(activity); return mockPredict; } }),
}));
jest.mock('../app/analytics', () => ({ trackEvent: jest.fn(async () => undefined) }));
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => ({ token: 1 }) }));
jest.mock('../app/revenue_daily_quota', () => ({ consumeRevenueDailyQuota: (...args: unknown[]) => mockConsume(...(args as [])) }));
jest.mock('../hooks/useRevenueDailyQuotaPreview', () => ({ useRevenueDailyQuotaPreview: () => mockQuota }));

import { useMistakePracticeStartGate } from '../hooks/useMistakePracticeStartGate';

describe('mistake practice start gate: energy before the daily attempt', () => {
  beforeEach(() => {
    mockPredict = 'ok';
    mockQuota = { status: 'allowed', used: 0, limit: 1, bypass: null };
    mockConsume.mockClear();
    mockPush.mockClear();
    mockPredictCalls.length = 0;
  });

  it('paid session (5+) with no energy: no-energy sheet, the daily attempt is NOT spent, nothing opens', async () => {
    mockPredict = 'insufficient';
    const { result } = await renderHook(() => useMistakePracticeStartGate('mistakes_hub_start'));
    let opened = true;
    await act(async () => { opened = result.current.tryStartSession(6); });
    expect(opened).toBe(false);
    expect(result.current.noEnergy).toBe(true);
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockPredictCalls).toEqual(['mistake_practice']);
    await act(async () => { result.current.dismissNoEnergy(); });
    expect(result.current.noEnergy).toBe(false);
  });

  it('short session (1–4) is free: no energy check, opens and spends the attempt', async () => {
    mockPredict = 'insufficient';
    const { result } = await renderHook(() => useMistakePracticeStartGate('mistakes_hub_start'));
    let opened = false;
    await act(async () => { opened = result.current.tryStartSession(3); });
    expect(opened).toBe(true);
    expect(mockPredictCalls).toEqual([]);
    expect(mockConsume).toHaveBeenCalledTimes(1);
    // id попытки этого тапа уходит в маршрут тренировки ровно один раз (Ревизор 15.10: возврат по чеку своего экрана)
    expect(result.current.takeQuotaReceiptParam()).toEqual({ quotaReceipt: 'mistakes:uuid-1' });
    expect(result.current.takeQuotaReceiptParam()).toEqual({});
  });

  // зачем (Ревизор 2.78): второй тап, пока чек пишется, раньше пускал без чека — второй экран шёл бесплатно,
  // а первый при уходе возвращал попытку. Теперь второй тап не открывает ничего и не пишет второй чек.
  it('a second tap while the receipt is being written opens nothing and writes no second receipt', async () => {
    mockConsume.mockImplementationOnce(() => new Promise(() => {}));
    const { result } = await renderHook(() => useMistakePracticeStartGate('mistake_finale_more'));
    let first = false;
    let firstReceipt: Readonly<{ quotaReceipt?: string }> = {};
    let second = true;
    await act(async () => {
      first = result.current.tryStartSession(3);
      firstReceipt = result.current.takeQuotaReceiptParam();
      second = result.current.tryStartSession(3);
    });
    expect(first).toBe(true);
    expect(firstReceipt).toEqual({ quotaReceipt: 'mistakes:uuid-1' });
    expect(second).toBe(false);
    expect(mockConsume).toHaveBeenCalledTimes(1);
    expect(result.current.takeQuotaReceiptParam()).toEqual({});
  });

  it('a refused tap (no energy) hands no receipt to the route', async () => {
    mockPredict = 'insufficient';
    const { result } = await renderHook(() => useMistakePracticeStartGate('mistakes_hub_start'));
    await act(async () => { result.current.tryStartSession(7); });
    expect(result.current.takeQuotaReceiptParam()).toEqual({});
  });

  it('paid session with energy (or energy not read yet) opens and spends the attempt', async () => {
    for (const verdict of ['ok', 'unknown'] as const) {
      mockPredict = verdict;
      mockConsume.mockClear();
      const { result } = await renderHook(() => useMistakePracticeStartGate('mistakes_hub_start'));
      let opened = false;
      await act(async () => { opened = result.current.tryStartSession(8); });
      expect(opened).toBe(true);
      expect(result.current.noEnergy).toBe(false);
      expect(mockConsume).toHaveBeenCalledTimes(1);
    }
  });

  it('exhausted daily attempt still goes to the paywall first (Plus solves both)', async () => {
    mockPredict = 'insufficient';
    mockQuota = { status: 'exhausted', used: 1, limit: 1, bypass: null };
    const { result } = await renderHook(() => useMistakePracticeStartGate('mistakes_hub_start'));
    let opened = true;
    await act(async () => { opened = result.current.tryStartSession(6); });
    expect(opened).toBe(false);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(result.current.noEnergy).toBe(false);
  });
});
