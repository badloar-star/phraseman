// зачем (подарок энергии, владелец 05.11: разрешить с лимитом; docs/work/tasks/energy-gift-design-2026-11-05.md §3): копилка подарков на устройстве.
// Сторож: потолок 3, идемпотентность по giftId, откат только неподтверждённого, трата первой, ключ в стираемом семействе, смена аккаунта чистит память.
const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
  },
}));
let accountListener: (() => void) | null = null;
jest.mock('../app/account_generation', () => ({ subscribeAccountGeneration: (l: () => void) => { accountListener = l; return () => undefined; } }));

import {
  ENERGY_GIFT_POOL_MAX, applyGiftLocal, confirmGift, energyGiftPoolKey, peekGiftPool, pendingGiftIds, readGiftPool, rollbackGift,
  spendGiftUnit, subscribeGiftPool, __resetEnergyGiftPoolForTests,
} from '../app/energy_gift_pool';

const OWNER = 'owner-1';
beforeEach(() => { __resetEnergyGiftPoolForTests(); for (const k of Object.keys(store)) delete store[k]; jest.spyOn(console, 'log').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

describe('копилка подарков энергии', () => {
  it('ключ — в стираемом семействе story_events_v1:, по аккаунту', () => {
    expect(energyGiftPoolKey(OWNER)).toBe('story_events_v1:energy_gift_pool:owner-1');
  });
  it('зачисляет сразу (до ответа сервера), максимум 3; четвёртый ждёт на сервере', () => {
    expect(ENERGY_GIFT_POOL_MAX).toBe(3);
    expect(applyGiftLocal(OWNER, 'g1')).toBe('applied');
    expect(peekGiftPool(OWNER)).toBe(1);
    expect(applyGiftLocal(OWNER, 'g2')).toBe('applied');
    expect(applyGiftLocal(OWNER, 'g3')).toBe('applied');
    expect(applyGiftLocal(OWNER, 'g4')).toBe('full');
    expect(peekGiftPool(OWNER)).toBe(3);
  });
  it('повтор того же подарка не зачисляется второй раз (двойной тап / повтор после падения)', () => {
    applyGiftLocal(OWNER, 'g1');
    expect(applyGiftLocal(OWNER, 'g1')).toBe('duplicate');
    expect(peekGiftPool(OWNER)).toBe(1);
  });
  it('откат снимает только неподтверждённое зачисление; подтверждённое откатом не трогается', () => {
    applyGiftLocal(OWNER, 'g1');
    expect(rollbackGift(OWNER, 'g1')).toBe(true);
    expect(peekGiftPool(OWNER)).toBe(0);
    applyGiftLocal(OWNER, 'g2');
    confirmGift(OWNER, 'g2');
    expect(pendingGiftIds(OWNER)).toEqual([]);
    expect(rollbackGift(OWNER, 'g2')).toBe(false);
    expect(peekGiftPool(OWNER)).toBe(1);
  });
  it('трата уменьшает копилку; на нуле — false (дальше тратится обычная энергия)', () => {
    applyGiftLocal(OWNER, 'g1');
    expect(spendGiftUnit(OWNER)).toBe(true);
    expect(peekGiftPool(OWNER)).toBe(0);
    expect(spendGiftUnit(OWNER)).toBe(false);
  });
  it('журнал и копилка переживают перезапуск: читаются с диска, неподтверждённые видны для повторного claim', async () => {
    applyGiftLocal(OWNER, 'g1');
    await Promise.resolve();
    __resetEnergyGiftPoolForTests();
    expect(await readGiftPool(OWNER)).toBe(1);
    expect(pendingGiftIds(OWNER)).toEqual(['g1']);
  });
  it('смена аккаунта сбрасывает память процесса', async () => {
    applyGiftLocal(OWNER, 'g1');
    accountListener?.();
    expect(peekGiftPool(OWNER)).toBe(0);
  });
  it('подписчики получают новое число при каждом изменении, не при дубле', () => {
    const seen: number[] = [];
    const off = subscribeGiftPool((_o, n) => seen.push(n));
    applyGiftLocal(OWNER, 'g1');
    applyGiftLocal(OWNER, 'g1');
    spendGiftUnit(OWNER);
    off();
    expect(seen).toEqual([1, 0]);
  });
  it('мусор на диске не ломает чтение: потолок и тип приводятся', async () => {
    store[energyGiftPoolKey(OWNER)] = JSON.stringify({ pool: 99, applied: ['a', 5], pending: 'x' });
    expect(await readGiftPool(OWNER)).toBe(3);
    expect(pendingGiftIds(OWNER)).toEqual([]);
  });
});
