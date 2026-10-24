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
  spirePendingCoinsTotal,
  spireStepPendingCoins,
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
    expect(read('app', 'spire', 'use_spire_game.ts')).toContain('spireRecordStepResult(ids.uid, lang, finish.report, { owner: ids.stableId, coins: config.coins })');
    const record = read('app', 'spire_report_client.ts');
    expect(record).toMatch(/applied\.effect !== 'duplicate_ignored'\) \{[\s\S]{0,400}if \(applied\.persisted && coins\)[\s\S]{0,300}addSpirePendingCoins\(coins\.owner, report\.reportId/);
    const flush = read('app', 'spire', 'spire_flush_wallet.ts');
    expect(flush.match(/settleSpirePendingCoins\(stableId, verdicts, true/g)?.length).toBe(2);
    expect(read('app', '(tabs)', 'home.tsx')).toContain('runesBalance: runesBalance + spirePendingCoins,');
  });
});
