// зачем (Ядро 05.11, вариант B; владелец: «разрешить с лимитом»): контракт траты копилки подарка энергии. Сама трата идёт
// внутри durable-операции журнала энергии (патч Ядра), а здесь — сторона копилки: readGiftBank / spendGiftUnit(operationId) /
// creditGiftUnit(operationId). Сторож: копилка пуста — ничего не меняется; повтор operationId не списывает вторую единицу;
// возврат идемпотентен и не превышает потолок копилки; потолок запаса 16 и ENERGY_BASE_CAPACITY модуль копилки не трогает.
import fs from 'node:fs';
import path from 'node:path';

const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
  },
}));
jest.mock('../app/account_generation', () => ({ subscribeAccountGeneration: () => () => undefined }));

import {
  ENERGY_GIFT_POOL_MAX, applyGiftLocal, creditGiftUnit, peekGiftPool, readGiftBank, spendGiftUnit, __resetEnergyGiftPoolForTests,
} from '../app/energy_gift_pool';
import { ENERGY_PERMANENT_CAPACITY_LIMIT, permanentEnergyCapacity } from '../app/energy_contract';

const OWNER = 'owner-spend';
beforeEach(() => { __resetEnergyGiftPoolForTests(); for (const k of Object.keys(store)) delete store[k]; jest.spyOn(console, 'log').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

describe('трата копилки подарка энергии (контракт для журнала)', () => {
  it('readGiftBank — зеркало копилки, синхронно, без записи', () => {
    expect(readGiftBank(OWNER)).toBe(0);
    applyGiftLocal(OWNER, 'g1');
    expect(readGiftBank(OWNER)).toBe(1);
    expect(readGiftBank(OWNER)).toBe(peekGiftPool(OWNER));
  });

  it('bank=0: трата отказывает и ничего не меняет (запас считает журнал как раньше)', () => {
    expect(spendGiftUnit(OWNER, 'op-1')).toBe(false);
    expect(readGiftBank(OWNER)).toBe(0);
    expect(creditGiftUnit(OWNER, 'op-1')).toBe(false);
    expect(readGiftBank(OWNER)).toBe(0);
  });

  it('bank>0: тратит единицу копилки; повтор того же operationId не списывает вторую', () => {
    applyGiftLocal(OWNER, 'g1');
    applyGiftLocal(OWNER, 'g2');
    expect(spendGiftUnit(OWNER, 'op-1')).toBe(true);
    expect(readGiftBank(OWNER)).toBe(1);
    expect(spendGiftUnit(OWNER, 'op-1')).toBe(true);
    expect(readGiftBank(OWNER)).toBe(1);
    expect(spendGiftUnit(OWNER, 'op-2')).toBe(true);
    expect(readGiftBank(OWNER)).toBe(0);
  });

  it('возврат занятия возвращает единицу в копилку один раз и только за потраченную операцию', () => {
    applyGiftLocal(OWNER, 'g1');
    spendGiftUnit(OWNER, 'op-1');
    expect(creditGiftUnit(OWNER, 'op-1')).toBe(true);
    expect(readGiftBank(OWNER)).toBe(1);
    expect(creditGiftUnit(OWNER, 'op-1')).toBe(false);
    expect(creditGiftUnit(OWNER, 'op-never')).toBe(false);
    expect(readGiftBank(OWNER)).toBe(1);
  });

  it('возврат не превышает потолок копилки', () => {
    applyGiftLocal(OWNER, 'g1');
    spendGiftUnit(OWNER, 'op-1');
    applyGiftLocal(OWNER, 'g2');
    applyGiftLocal(OWNER, 'g3');
    applyGiftLocal(OWNER, 'g4');
    expect(readGiftBank(OWNER)).toBe(ENERGY_GIFT_POOL_MAX);
    expect(creditGiftUnit(OWNER, 'op-1')).toBe(true);
    expect(readGiftBank(OWNER)).toBe(ENERGY_GIFT_POOL_MAX);
  });

  it('потолок запаса 16 и бонус Пика копилка не меняет: ни импортов запаса, ни записи в energy_state_v2', () => {
    expect(ENERGY_PERMANENT_CAPACITY_LIMIT).toBe(16);
    expect(permanentEnergyCapacity({ base: 5, spireBonus: 11 })).toBe(16);
    applyGiftLocal(OWNER, 'g1');
    spendGiftUnit(OWNER, 'op-1');
    expect(permanentEnergyCapacity({ base: 5, spireBonus: 11 })).toBe(16);
    const raw = fs.readFileSync(path.join(__dirname, '..', 'app/energy_gift_pool.ts'), 'utf8');
    const src = raw.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join(' ').replace(/\/\/[^\n]*/g, '');
    expect(src).not.toMatch(/energy_state_v2|energy_contract|energy_system|EnergyContext/);
    expect(Object.keys(store).every((k) => k.startsWith('story_events_v1:energy_gift_pool:'))).toBe(true);
  });

  it('каждая ветка траты и возврата пишет [ENERGY-GIFT] (ранние выходы не немые)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app/energy_gift_pool.ts'), 'utf8');
    for (const tag of ['spend_skipped duplicate_op', 'spend_skipped pool_empty', 'credit_skipped not_spent']) expect(src).toContain(tag);
  });
});
