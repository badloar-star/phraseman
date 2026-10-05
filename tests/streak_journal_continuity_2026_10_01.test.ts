// зачем (баг 01.10, «Твои результаты»: «1 день подряд» при 6 отмеченных днях):
// серия обновлялась только на холодном старте, и день, прожитый из фона, её сжигал.
// Сторож: журнал времени в приложении (тот же, что рисует неделю) продолжает и лечит
// серию, заморозка не тратится зря, а день отмечается и при возврате из фона/занятии.
import * as fs from 'fs';
import * as path from 'path';
import { foregroundActiveRunEndingAt, previousDateKey } from '../app/streak_safety';
import { MIN_ACTIVE_MS } from '../modules/stats_activity_rows';
import { normalizeEol } from './helpers/read_source';

const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

describe('серия: непрерывность по журналу времени в приложении', () => {
  const day = (ms: number) => ms;

  it('считает дни подряд, заканчивая указанным днём', () => {
    const map = {
      '2026-09-25': day(120_000),
      '2026-09-26': day(61_000),
      '2026-09-27': day(60_000),
      '2026-09-28': day(300_000),
      '2026-09-29': day(90_000),
      '2026-09-30': day(70_000),
    };
    expect(foregroundActiveRunEndingAt(map, '2026-09-30', MIN_ACTIVE_MS)).toBe(6);
  });

  it('день короче порога рвёт цепочку, пустой журнал даёт 0', () => {
    const map = { '2026-09-28': 120_000, '2026-09-29': 59_999, '2026-09-30': 120_000 };
    expect(foregroundActiveRunEndingAt(map, '2026-09-30', MIN_ACTIVE_MS)).toBe(1);
    expect(foregroundActiveRunEndingAt({}, '2026-09-30', MIN_ACTIVE_MS)).toBe(0);
  });

  it('вчера считается через границу месяца и года', () => {
    expect(previousDateKey('2026-10-01')).toBe('2026-09-30');
    expect(previousDateKey('2027-01-01')).toBe('2026-12-31');
  });

  it('порог тот же, что у недели на «Твоих результатах»', () => {
    expect(MIN_ACTIVE_MS).toBe(60_000);
  });
});

describe('серия: проводка в коде', () => {
  const hall = read('app/hall_of_fame_utils.ts');

  it('журнал продолжает и лечит серию, заморозка не тратится при живом вчера', () => {
    expect(hall).toMatch(/const canFreeze = journalRunToYesterday < 1 && lastActive !== null/);
    expect(hall).toMatch(/else if \(journalRunToYesterday >= 1\)/);
    expect(hall).toMatch(/journalRunToYesterday \+ 1 > streak/);
  });

  it('на старте серия не ждёт шагов старой экономики (сбой/зависание осколков её не режет)', () => {
    const layout = read('app/_layout.tsx');
    const streakStart = layout.indexOf("touchStreakForToday('cold_start')");
    expect(streakStart).toBeGreaterThan(0);
    // шаги жемчуга сняты со старта целиком (§55) — ждать серии больше нечего
    expect(layout).not.toContain('await loadShardsFromCloud()');
    expect(layout).not.toMatch(/await updateStreakOnActivity\(\)/);
  });

  it('день отмечается при возврате из фона и при завершении занятия', () => {
    expect(read('app/_layout.tsx')).toMatch(/touchStreakForToday\('foreground'\)/);
    expect(read('modules/today-tasks/today_tasks_store.ts')).toMatch(/touchStreakForToday\(/);
  });
});

// зачем (Q106, координатор §62): «Монетная заначка» (shards_100…10000) считается по балансу монет.
describe('достижения «Монетная заначка» — по монетам', () => {
  const layout = read('app/_layout.tsx');
  it('старт и обновления баланса монет проверяют достижения, жемчуг не читается', () => {
    expect(layout).toMatch(/getRunesBalanceRead\(\)\)\s*\n\s*\.then\(\(read\) => checkAchievements\(\{ type: 'shards', balance: read\.wallet\.balance \}\)\)/);
    expect(layout).toMatch(/onAppEvent\('runes_balance_updated'/);
    expect(layout).not.toMatch(/getShardsBalance\(|getShardAchievementEligibleBalance\(|onAppEvent\('shards_balance_updated'/);
  });
});
