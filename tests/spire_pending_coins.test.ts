/**
 * [PEAK-COINS] «Ожидающие» монеты Пика (координатор 24.10, контракт 1 · ЯДРО): ступень засчитана на телефоне → +N сразу на Главной,
 * ответ spireReportSteps гасит. Сторож: сумма — как у сервера (spireStepCoinOps); повтор reportId не добавляет; accepted/duplicate
 * гасятся только вместе с влитым балансом; rejected — без монет; без вердикта — ждёт; TTL 48 ч; у каждого владельца свои.
 */
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));

import * as fs from 'fs';
import * as path from 'path';
import { normalizeEol } from './helpers/read_source';
import {
  SPIRE_PENDING_TTL_MS,
  __resetSpirePendingCoinsForTests,
  addSpirePendingCoins,
  hydrateSpirePendingCoins,
  settleSpirePendingCoins,
  settleSpirePendingByBalance,
  spirePendingCoinsTotal,
  spireStepPendingCoins,
  subscribeSpirePendingCoins,
} from '../app/spire/spire_pending_coins';

const COINS = { perStep: 10, perFloorPerLevel: 10, guardianMultiplier: 2, summitBonus: 200 };
const NOW = 1_800_000_000_000;

beforeEach(() => {
  __resetSpirePendingCoinsForTests();
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
});

describe('сумма ступени — как spireStepCoinOps сервера', () => {
  it('ступень; закрытый этаж ×N; Страж ×2; вершина +200; над облаками — только ступень', () => {
    expect(spireStepPendingCoins(COINS, 3, false)).toBe(10);
    expect(spireStepPendingCoins(COINS, 3, true)).toBe(10 + 30);
    expect(spireStepPendingCoins(COINS, 5, true)).toBe(10 + 100);
    expect(spireStepPendingCoins(COINS, 15, true)).toBe(10 + 300 + 200);
    expect(spireStepPendingCoins(COINS, 16, true)).toBe(10);
  });
});

describe('ожидающие и сверка с ответом сервера', () => {
  it('повтор того же reportId не добавляет; владельцы раздельно', () => {
    addSpirePendingCoins('me', 'r1', 10, NOW);
    addSpirePendingCoins('me', 'r1', 10, NOW);
    addSpirePendingCoins('other', 'r9', 40, NOW);
    expect(spirePendingCoinsTotal('me', NOW)).toBe(10);
    expect(spirePendingCoinsTotal('other', NOW)).toBe(40);
    expect(spirePendingCoinsTotal(null, NOW)).toBe(0);
  });

  it('accepted/duplicate гасятся с влитым балансом; не влит — держим; rejected — снимаем; без вердикта — ждёт', () => {
    addSpirePendingCoins('me', 'a', 10, NOW);
    addSpirePendingCoins('me', 'b', 10, NOW);
    addSpirePendingCoins('me', 'c', 40, NOW);
    addSpirePendingCoins('me', 'd', 10, NOW);
    settleSpirePendingCoins('me', [{ reportId: 'a', verdict: 'accepted' }], false, 100, null);
    expect(spirePendingCoinsTotal('me', NOW)).toBe(70);
    settleSpirePendingCoins('me', [{ reportId: 'a', verdict: 'accepted' }, { reportId: 'b', verdict: 'duplicate' }, { reportId: 'c', verdict: 'rejected', reason: 'stale_week' }], true, 100, 120);
    expect(spirePendingCoinsTotal('me', NOW)).toBe(10);
  });

  it('TTL 48 ч: старое ожидающее не показывается', () => {
    addSpirePendingCoins('me', 'old', 10, NOW - SPIRE_PENDING_TTL_MS - 1);
    expect(spirePendingCoinsTotal('me', NOW)).toBe(0);
  });

  it('после перезапуска ожидающие поднимаются с диска', async () => {
    addSpirePendingCoins('me', 'r1', 30, NOW);
    await Promise.resolve();
    __resetSpirePendingCoinsForTests();
    await hydrateSpirePendingCoins('me', NOW + 1000);
    expect(spirePendingCoinsTotal('me', NOW + 1000)).toBe(30);
  });
});

describe('исходники: где кладём, где гасим, что показываем', () => {
  const read = (...p: string[]) => normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', ...p), 'utf8'));
  it('ступень записана на диск и пройдена впервые → ожидающее; ответ сервера гасит в обеих ветках; Главная — баланс + ожидающие', () => {
    // вариант A (координатор 25.10): монеты — сразу в момент итога, до записи на диск; после диска их больше не кладут
    const game = read('app', 'spire', 'use_spire_game.ts');
    expect(game).toContain("const coinsNow = spireStepCoinsNow({ owner: ids.stableId, reportId: finish.report.reportId, t0: closeT0, coins: config.coins, passedNew: finish.report.outcome === 'passed' && applied.effect !== 'duplicate_ignored'");
    expect(game.indexOf('spireStepCoinsNow({')).toBeLessThan(game.indexOf('spireRecordStepResult(ids.uid'));
    // Ревизор 25.10: снятие — до проверки «ответ пришёл поздно», иначе поздний сбой оставлял монеты на плашке до 48 ч
    const undo = game.indexOf("if (coinsNow && (!res.persisted || res.effect === 'duplicate_ignored')) spireStepCoinsUndo(ids.stableId, finish.report.reportId, res.persisted ? 'duplicate_on_disk' : 'save_failed', late);");
    expect(undo).toBeGreaterThan(-1);
    expect(undo).toBeLessThan(game.indexOf('if (late) {'));
    expect(game).toContain("if (coinsNow) spireStepCoinsUndo(ids.stableId, finish.report.reportId, 'save_threw', lastReportRef.current !== finish.report.reportId);");
    expect(game.indexOf("'save_threw', lastReportRef")).toBeLessThan(game.indexOf('if (lastReportRef.current !== finish.report.reportId) return;'));
    expect(read('app', 'spire_report_client.ts')).not.toContain('addSpirePendingCoins(');
    const flush = read('app', 'spire', 'spire_flush_wallet.ts');
    expect(flush.match(/settleSpirePendingCoins\(stableId, verdicts, true/g)?.length).toBe(2);
    // Главная — зона Ядра (25.10: переводит все пилюли на единый показ, свой сторож [COIN-DIVERGENCE]); здесь её не проверяем
  });
});

describe('Ревизор 24.10: три сценария гашения и одно число', () => {
  const read = (...p: string[]) => normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', ...p), 'utf8'));
  it('1) вердикт очереди гасит вместе с влитым балансом', () => {
    addSpirePendingCoins('me', 'v1', 10, NOW, 500);
    settleSpirePendingCoins('me', [{ reportId: 'v1', verdict: 'accepted' }], true, 500, 510);
    expect(spirePendingCoinsTotal('me', NOW)).toBe(0);
  });

  it('2) баланс вырос из облака без вердиктов: base + накопленные монеты → гасим, не задваиваем', () => {
    addSpirePendingCoins('me', 'g1', 10, NOW, 500);
    addSpirePendingCoins('me', 'g2', 40, NOW + 1, 500);
    settleSpirePendingByBalance('me', 505);
    expect(spirePendingCoinsTotal('me', NOW)).toBe(50);
    settleSpirePendingByBalance('me', 510);
    expect(spirePendingCoinsTotal('me', NOW)).toBe(40);
    settleSpirePendingByBalance('me', 550);
    expect(spirePendingCoinsTotal('me', NOW)).toBe(0);
  });

  it('3) без вердикта и без роста — через 48 ч уходит из показа', () => {
    addSpirePendingCoins('me', 't1', 10, NOW, 500);
    expect(spirePendingCoinsTotal('me', NOW + SPIRE_PENDING_TTL_MS + 1)).toBe(0);
  });

  it('одно число: Главная, магазин и чип берут показ из runes_system; Главная не перерисовывается скрытой', () => {
    const runes = read('app', 'runes_system.ts');
    expect(runes).toContain('export function peekDisplayedRunes(): number');
    expect(runes).toContain('pending.settleSpirePendingByBalance(');
    expect(read('app', 'shop.tsx')).toContain('subscribeDisplayedRunes(setShownRunes)');
    expect(read('components', 'RuneBalanceChip.tsx')).toContain('subscribeDisplayedRunes(setBalance)');
    const home = read('app', '(tabs)', 'home.tsx');
    expect(home).toContain('if (!homeRuntimeActive) return undefined;');
    expect(home).toContain('return subscribeDisplayedRunes(read);');
    expect(read('app', 'spire', 'spire_step_close.ts')).toContain('addSpirePendingCoins(i.owner, i.reportId, amount, Date.now(), peekRunes());');
  });
});

describe('вариант A (координатор 25.10): монеты сразу, сбой записи снимает', () => {
  beforeEach(() => __resetSpirePendingCoinsForTests());
  it('removeSpirePendingCoins снимает только свою строку и будит подписчиков; чужой/неизвестный — без изменений', () => {
    const { removeSpirePendingCoins } = require('../app/spire/spire_pending_coins') as typeof import('../app/spire/spire_pending_coins');
    addSpirePendingCoins('me', 'ok', 10, NOW);
    addSpirePendingCoins('me', 'bad', 50, NOW);
    const seen = jest.fn();
    const off = subscribeSpirePendingCoins(seen);
    removeSpirePendingCoins('me', 'bad', 'save_failed');
    expect(spirePendingCoinsTotal('me', NOW)).toBe(10);
    expect(seen).toHaveBeenCalledTimes(1);
    removeSpirePendingCoins('me', 'nope', 'save_failed');
    removeSpirePendingCoins('other', 'ok', 'save_failed');
    expect(spirePendingCoinsTotal('me', NOW)).toBe(10);
    expect(seen).toHaveBeenCalledTimes(1);
    off();
  });
});

describe('Ревизор 25.10: поздний сбой записи тоже снимает монеты', () => {
  beforeEach(() => __resetSpirePendingCoinsForTests());
  it('экран уже на следующей ступени (late) — строка снята, в журнале late=true', () => {
    const { removeSpirePendingCoins } = require('../app/spire/spire_pending_coins') as typeof import('../app/spire/spire_pending_coins');
    const { DebugLogger } = require('../app/debug-logger') as { DebugLogger: { warn: jest.Mock } };
    addSpirePendingCoins('me', 'old', 10, NOW);
    addSpirePendingCoins('me', 'next', 10, NOW + 1);
    DebugLogger.warn.mockClear();
    removeSpirePendingCoins('me', 'old', 'save_failed', true);
    expect(spirePendingCoinsTotal('me', NOW + 2)).toBe(10);
    expect(DebugLogger.warn.mock.calls.some((c) => String(c[1]).includes('settle reason=save_failed late=true report=old'))).toBe(true);
  });
});
