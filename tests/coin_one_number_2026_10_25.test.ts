// «Одно число монет» (координатор 25.10, Сверка: Главная 690 / «Обучение» 1140 / Главная+Пик 1110 при офлайн-ожидающих Пика).
// зачем: правильное число одно — кошелёк + все ожидающие начисления (runes_system.peekDisplayedRunes). Сторож проверяет:
// (1) все подписчики показа видят одно число при офлайн-ожидающих; (2) подтверждение сервера переносит сумму из ожидающих в кошелёк
// одной сменой числа (без двойного счёта); (3) ни одна плашка не рисует чтение с диска или кошелёк без ожидающих.
import fs from 'node:fs';
import path from 'node:path';

const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
  },
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
}));

let mockSnapshot: { progress: { stars: number; starsEarnedTotal: number } | null } = { progress: { stars: 690, starsEarnedTotal: 0 } };
const mockSnapshotListeners = new Set<() => void>();
jest.mock('../app/app_snapshot_store', () => ({
  getAppSnapshot: () => mockSnapshot,
  patchAppSnapshot: jest.fn(),
  subscribeAppSnapshot: (listener: () => void) => { mockSnapshotListeners.add(listener); return () => mockSnapshotListeners.delete(listener); },
}));
jest.mock('../app/level_spin_star_grants', () => ({
  readUnifiedLevelSpinStars: jest.fn(async () => ({ balance: 690, earnedTotal: 0 })),
  peekStoredLevelSpinStarsForBoot: jest.fn(() => null),
}));
jest.mock('../app/debug-logger', () => ({
  reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()), noteSwallowedHandler: jest.fn(() => jest.fn()),
  DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
import { peekDisplayedRunes, runDisplayedRunesBatch, subscribeDisplayedRunes } from '../app/runes_system';
import { __resetSpirePendingCoinsForTests, addSpirePendingCoins, settleSpirePendingCoins } from '../app/spire/spire_pending_coins';

const OWNER = 'owner-a';
const setStars = (stars: number): void => {
  mockSnapshot = { progress: { stars, starsEarnedTotal: 0 } };
  for (const listener of [...mockSnapshotListeners]) listener();
};
const read = (...parts: string[]): string => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8').replace(/\r\n/g, '\n');

beforeEach(() => {
  __resetAccountGenerationForTests();
  beginAccountGeneration(OWNER);
  __resetSpirePendingCoinsForTests();
  mockSnapshot = { progress: { stars: 690, starsEarnedTotal: 0 } };
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('одно число монет', () => {
  it('три плашки (Главная, «Обучение», чип) показывают одно число при офлайн-ожидающих Пика: кошелёк + ожидающие', () => {
    addSpirePendingCoins(OWNER, 'r1', 450, Date.now(), 690);
    expect(peekDisplayedRunes()).toBe(1140);
    const shown: Record<string, number> = {};
    const offs = ['home', 'lessons', 'chip'].map((screen) => subscribeDisplayedRunes((value) => { shown[screen] = value; }));
    setStars(700); // начисление урока офлайн: кошелёк +10, ожидающие Пика те же
    expect(shown).toEqual({ home: 1150, lessons: 1150, chip: 1150 });
    offs.forEach((off) => off());
  });

  it('подтверждение сервера: сумма уходит из ожидающих в кошелёк одной сменой числа — без двойного счёта', async () => {
    addSpirePendingCoins(OWNER, 'r1', 450, Date.now(), 690);
    const seen: number[] = [];
    const off = subscribeDisplayedRunes((value) => seen.push(value));
    await runDisplayedRunesBatch('test_flush', async () => {
      setStars(1140); // кошелёк влит сервером (690 + 450)
      await Promise.resolve();
      settleSpirePendingCoins(OWNER, [{ reportId: 'r1', verdict: 'accepted' }], true, 690, 1140);
    });
    expect(seen).toEqual([1140]);
    expect(peekDisplayedRunes()).toBe(1140);
    off();
  });

  it('пакет показа не держит число вечно: зависшее слияние отпускается по предохранителю', async () => {
    jest.useFakeTimers();
    const seen: number[] = [];
    const off = subscribeDisplayedRunes((value) => seen.push(value));
    let finish: () => void = () => undefined;
    const batch = runDisplayedRunesBatch('stuck', () => new Promise<void>((resolve) => { finish = resolve; }));
    setStars(800);
    expect(seen).toEqual([]);
    jest.advanceTimersByTime(3_001);
    expect(seen).toEqual([800]);
    finish();
    await batch;
    off();
    jest.useRealTimers();
  });
});

describe('плашки берут только единый показ', () => {
  it('Главная: шапка и сцена — одно число из одной подписки; чтение с диска на экран не идёт', () => {
    const home = read('app', '(tabs)', 'home.tsx');
    expect(home).toContain("value: runesKnown ? String(homeShownCoins) : '—',");
    expect(home).toContain('runesBalance: homeShownCoins,');
    expect(home).toContain('const read = () => setHomeDisplayedCoins(peekDisplayedRunes());');
    expect(home).not.toMatch(/setRunesBalance\(balance\)/);
  });

  it('«Обучение», чип, итог урока — единый показ; магазин и все плашки пишут [COIN-DIVERGENCE] display', () => {
    const lessons = read('app', '(tabs)', 'lessons.tsx');
    expect(lessons).not.toMatch(/balance: read\.wallet\.balance/);
    expect(lessons).toContain('subscribeDisplayedRunes((shownCoins) => {');
    expect(lessons).toContain("noteCoinDisplay('lessons', legacyCoinBalance)");
    const chip = read('components', 'RuneBalanceChip.tsx');
    expect(chip).not.toMatch(/value\.balance \+ \(peekDisplayedRunes\(\) - peekRunes\(\)\)/);
    expect(read('components', 'completion', 'V2DoneScreen.tsx')).toContain('subscribeDisplayedRunes(setBalance)');
    expect(read('components', 'completion', 'V2DoneChain.tsx')).toContain('subscribeDisplayedRunes((v) =>');
    expect(read('app', 'shop.tsx')).toContain("noteCoinDisplay('shop', shownRunes)");
    expect(read('app', 'spire', 'spire_flush_wallet.ts')).toContain("deps.batch('spire_flush', work)");
  });
});
