/**
 * [PEAK-COINS] Сироты ожидающих монет Пика (Сверка 25.10, критерии Ревизора): строка ожидающих снимается, ТОЛЬКО если её
 * reportId нет в живой очереди pending ни одного языка. Отправленные и ждущие вердикта лежат в той же очереди — остаются.
 * Сбой чтения очереди — ничего не снимаем. Свежие строки (моложе GRACE) не трогаем. Без сети и Firestore — только диск.
 */
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));

import {
  __resetSpirePendingCoinsForTests,
  addSpirePendingCoins,
  peekSpirePendingEntries,
  spireGoldPendingId,
  spirePendingCoinsTotal,
} from '../app/spire/spire_pending_coins';
import { SPIRE_PENDING_ORPHAN_GRACE_MS, reconcileSpirePendingOrphans } from '../app/spire/spire_pending_orphans';
import type { SpireLang } from '../modules/spire/report_queue';

const OWNER = 'owner-orphans';
const NOW = 1_800_000_000_000;
const OLD = NOW - SPIRE_PENDING_ORPHAN_GRACE_MS - 1_000;

function queue(byLang: Partial<Record<SpireLang, readonly string[] | null>>) {
  return { readQueueReportIds: jest.fn(async (_owner: string, lang: SpireLang) => byLang[lang] ?? null) };
}

beforeEach(() => {
  __resetSpirePendingCoinsForTests();
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
});

describe('reconcileSpirePendingOrphans', () => {
  it('восстановленная неделя без отчётов → ожидающие 0 (показ = кошелёк)', async () => {
    addSpirePendingCoins(OWNER, 'r1', 200, OLD);
    addSpirePendingCoins(OWNER, 'r2', 250, OLD);
    expect(spirePendingCoinsTotal(OWNER, NOW)).toBe(450);
    const removed = await reconcileSpirePendingOrphans(OWNER, 'test', queue({ en: [] }), NOW);
    expect(removed).toBe(2);
    expect(spirePendingCoinsTotal(OWNER, NOW)).toBe(0);
    expect(peekSpirePendingEntries(OWNER)).toEqual([]);
  });

  it('отправленный без вердикта (лежит в очереди) → остаётся; сирота другого языка снимается', async () => {
    addSpirePendingCoins(OWNER, 'sent-await', 30, OLD);
    addSpirePendingCoins(OWNER, 'orphan', 70, OLD);
    const removed = await reconcileSpirePendingOrphans(OWNER, 'test', queue({ es: ['sent-await'] }), NOW);
    expect(removed).toBe(1);
    expect(peekSpirePendingEntries(OWNER).map((e) => e.reportId)).toEqual(['sent-await']);
    expect(spirePendingCoinsTotal(OWNER, NOW)).toBe(30);
  });

  // зачем (координатор 28.10, жалоба «двойные очки, потом с общего счёта сняли 50»): строка золота spire_gold:{reportId} раньше
  // всегда считалась сиротой (в очереди лежит {reportId}) и снималась через 2 мин, хотя ступень ждала отправки.
  it('золото ступени, которая ещё в очереди, → остаётся; золото ступени без отчёта → снимается', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    addSpirePendingCoins(OWNER, 'step-live', 50, OLD);
    addSpirePendingCoins(OWNER, spireGoldPendingId('step-live'), 50, OLD);
    addSpirePendingCoins(OWNER, spireGoldPendingId('step-gone'), 50, OLD);
    const removed = await reconcileSpirePendingOrphans(OWNER, 'test', queue({ en: ['step-live'] }), NOW);
    expect(removed).toBe(1);
    expect(peekSpirePendingEntries(OWNER).map((e) => e.reportId)).toEqual(['step-live', spireGoldPendingId('step-live')]);
    expect(spirePendingCoinsTotal(OWNER, NOW)).toBe(100);
    jest.restoreAllMocks();
  });

  it('свежая строка без отчёта на диске (ещё пишется) → остаётся', async () => {
    addSpirePendingCoins(OWNER, 'fresh', 40, NOW - 5_000);
    const removed = await reconcileSpirePendingOrphans(OWNER, 'test', queue({}), NOW);
    expect(removed).toBe(0);
    expect(spirePendingCoinsTotal(OWNER, NOW)).toBe(40);
  });

  it('сбой чтения очереди одного языка → ничего не снимаем', async () => {
    addSpirePendingCoins(OWNER, 'r1', 200, OLD);
    const deps = {
      readQueueReportIds: jest.fn(async (_owner: string, lang: SpireLang) => {
        if (lang === 'de') throw new Error('disk');
        return [];
      }),
    };
    const removed = await reconcileSpirePendingOrphans(OWNER, 'test', deps, NOW);
    expect(removed).toBe(0);
    expect(spirePendingCoinsTotal(OWNER, NOW)).toBe(200);
  });

  it('нет ожидающих → очередь даже не читаем', async () => {
    const deps = queue({});
    expect(await reconcileSpirePendingOrphans(OWNER, 'test', deps, NOW)).toBe(0);
    expect(deps.readQueueReportIds).not.toHaveBeenCalled();
  });
});
