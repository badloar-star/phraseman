// Сторож «энергия от Пика» (владелец 04.11): запас = 5 + бонус; Plus ∞ как было; текущая энергия не выходит за рабочий потолок;
// сервер отдаёт бонус в уже идущем вызове входа в комнату; нет сети/поля — запас 5.
import fs from 'fs';
import path from 'path';

const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => (mockStorage.has(key) ? mockStorage.get(key)! : null)),
    setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
  },
}));

import { permanentEnergyCapacity } from '../app/energy_contract';
import { settleEnergyState } from '../app/energy_state_v2';
import {
  SPIRE_ENERGY_BONUS_KEY,
  __resetSpireEnergyBonusForTests,
  getSpireEnergyBonus,
  hydrateSpireEnergyBonus,
  setSpireEnergyBonus,
  subscribeSpireEnergyBonus,
} from '../app/spire_energy_bonus_store';

const root = path.join(__dirname, '..');
const NOW = 1_800_000_000_000;
const settle = (current: number, maxEnergy: number, elapsedMs = 0) => settleEnergyState(
  { schemaVersion: 2, current, lastSettledAt: NOW, recoveryCreditMicrounits: 0, recoveryDivisionRemainder: 0 },
  { nowMs: NOW + elapsedMs, unitMs: 30 * 60_000, bonusEnergy: 0, bonusCapacity: 0, bonusExpiresAt: 0, maxEnergy },
);

beforeEach(() => {
  mockStorage.clear();
  __resetSpireEnergyBonusForTests();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('энергия от Пика: клиент', () => {
  it('нет значения → запас 5 (старые игроки не меняются)', async () => {
    await hydrateSpireEnergyBonus();
    expect(getSpireEnergyBonus()).toBe(0);
    expect(permanentEnergyCapacity({ base: 5, spireBonus: getSpireEnergyBonus() })).toBe(5);
  });

  it('бонус 0..11 зажимается; сохраняется на диск; подписчики узнают сразу (оптимистично)', async () => {
    const seen: number[] = [];
    const off = subscribeSpireEnergyBonus((n) => seen.push(n));
    setSpireEnergyBonus(3, 'test');
    expect(getSpireEnergyBonus()).toBe(3);
    expect(permanentEnergyCapacity({ base: 5, spireBonus: getSpireEnergyBonus() })).toBe(8);
    setSpireEnergyBonus(99, 'test');
    expect(getSpireEnergyBonus()).toBe(11);
    setSpireEnergyBonus(-5, 'test');
    expect(getSpireEnergyBonus()).toBe(0);
    setSpireEnergyBonus(0, 'test'); // без изменений — без уведомления
    off();
    expect(seen).toEqual([3, 11, 0]);
    await Promise.resolve();
    expect(mockStorage.get(SPIRE_ENERGY_BONUS_KEY)).toBe('0');
  });

  it('локальная копия читается один раз; свежее серверное значение диск не затирает', async () => {
    mockStorage.set(SPIRE_ENERGY_BONUS_KEY, '4');
    await hydrateSpireEnergyBonus();
    expect(getSpireEnergyBonus()).toBe(4);
    __resetSpireEnergyBonusForTests();
    mockStorage.set(SPIRE_ENERGY_BONUS_KEY, '2');
    setSpireEnergyBonus(6, 'server'); // сервер успел раньше диска
    await hydrateSpireEnergyBonus();
    expect(getSpireEnergyBonus()).toBe(6);
  });

  it('текущая энергия не выходит за рабочий потолок и растёт до него', () => {
    expect(settle(6, 5).state.current).toBe(5);          // без бонуса: срез до 5
    expect(settle(6, 8).state.current).toBe(6);          // с бонусом 3: остаётся
    expect(settle(5, 8, 3 * 30 * 60_000).state.current).toBe(8); // +1 за 30 мин до нового потолка
    expect(settle(16, 16).state.current).toBe(16);
  });
});

describe('энергия от Пика: связи', () => {
  it('сервер отдаёт energyBonus во всех трёх ответах spireJoinRoom (0 новых чтений)', () => {
    const src = fs.readFileSync(path.join(root, 'functions', 'src', 'spire_groups.ts'), 'utf8');
    expect((src.match(/energyBonus: spireEnergyBonusFromDeltas\(lbData\?\.spireEnergyDeltas\)/g) ?? []).length).toBe(3);
  });

  it('клиент комнаты передаёт бонус в хранилище, а EnergyContext/energy_system/прогрев берут его', () => {
    const room = fs.readFileSync(path.join(root, 'app', 'spire', 'spire_room_client.ts'), 'utf8');
    expect(room).toMatch(/setSpireEnergyBonus\(res\.energyBonus, 'spireJoinRoom'\)/);
    for (const file of ['components/EnergyContext.tsx', 'app/energy_system.ts', 'app/energy_peek_cache.ts']) {
      expect(fs.readFileSync(path.join(root, file), 'utf8')).toContain('spireBonus: getSpireEnergyBonus()');
    }
  });

  it('ключ бонуса ходит в облачную синхронизацию общего профиля', () => {
    expect(fs.readFileSync(path.join(root, 'app', 'cloud_sync.ts'), 'utf8')).toContain("'spire_energy_bonus_v1'");
  });
});
