// Сторож dev-подмены D162 для кадров Сверки: dev_state?spireRankBy=coins|steps|off — только память процесса и только dev,
// стор-заглушка всегда «нет подмены»; пустые суммы недели заполняются для показа ТОЛЬКО под флагом подмены.
import fs from 'node:fs';
import path from 'node:path';
import { getDevSpireRankByOverride, getDevSpireWeekResultOverride, setDevSpireRankByOverride, setDevSpireWeekResultOverride } from '../app/dev_spire_tier';
import { parseDevStateParams } from '../app/dev_state_fixtures';
import { spireBuildRoomRows, type SpireRoomSnapshot } from '../modules/spire/room_rows';

const ROOM: SpireRoomSnapshot = {
  schema: 'spire-room-cache.v1', uid: 'me', lang: 'en', weekId: '2026-W42', groupId: 'g1', tier: 0, cohortDay: 0,
  weekStartMs: Date.UTC(2026, 9, 12), members: [
    { uid: 'a', name: 'A', steps: 10, reachedAtMs: 1, totalMs: 1 },
    { uid: 'b', name: 'B', steps: 3, reachedAtMs: 2, totalMs: 2, weekCoins: 900 },
  ], roster: [], fetchedAtMs: 0,
};
const TUNING = { targetZoneMarginSteps: 1, maxStepsPerHour: 6 };

describe('dev_state?spireRankBy', () => {
  // подмена живёт только в dev-сборке: в jest __DEV__ по умолчанию не true — включаем на время набора
  beforeAll(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = true; });
  afterAll(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = false; });
  afterEach(() => { setDevSpireRankByOverride(null); setDevSpireWeekResultOverride(null); });

  it('разбор параметра: coins | steps | off; мусор отклоняется', () => {
    expect(parseDevStateParams({ spireRankBy: 'coins' }).request.spireRankBy).toBe('coins');
    expect(parseDevStateParams({ spireRankBy: 'off' }).request.spireRankBy).toBe('off');
    expect(parseDevStateParams({ spireRankBy: 'money' }).request.spireRankBy).toBeUndefined();
  });

  it('подмена в памяти: ставится, снимается, неверное значение отклоняется', () => {
    expect(setDevSpireRankByOverride('coins')).toBe(true);
    expect(getDevSpireRankByOverride()).toBe('coins');
    expect(setDevSpireRankByOverride('money' as never)).toBe(false);
    expect(getDevSpireRankByOverride()).toBe('coins');
    expect(setDevSpireRankByOverride(null)).toBe(true);
    expect(getDevSpireRankByOverride()).toBeNull();
  });

  it('пустые суммы заполняются для показа только под флагом; настоящий снимок не трогается', () => {
    const base = { room: ROOM, myUid: 'me', mySteps: 5, myReachedAtMs: 3, nowMs: ROOM.weekStartMs + 3600_000, tuning: TUNING, rankBy: 'coins' as const };
    const plain = spireBuildRoomRows(base);
    expect(plain.find((r) => r.uid === 'a')?.weekCoins).toBe(0);
    const preview = spireBuildRoomRows({ ...base, fillMissingWeekCoinsForPreview: true });
    expect(preview.find((r) => r.uid === 'a')?.weekCoins).toBe(300);
    expect(preview.find((r) => r.uid === 'b')?.weekCoins).toBe(900);
    expect(preview.find((r) => r.uid === 'me')?.weekCoins).toBe(150);
  });

  it('карточка «Итог недели» при подмене монет показывает монеты', () => {
    setDevSpireRankByOverride('coins');
    setDevSpireWeekResultOverride('up');
    expect(getDevSpireWeekResultOverride()).toMatchObject({ rankBy: 'coins', weekCoins: 47 * 30 });
    setDevSpireRankByOverride(null);
    expect(getDevSpireWeekResultOverride()).toMatchObject({ rankBy: 'steps', weekCoins: 0 });
  });

  it('стор-заглушка: подмены нет; хук игры берёт подмену поверх конфига', () => {
    const stub = fs.readFileSync(path.join(__dirname, '..', 'store_release_stubs', 'dev_state', 'dev_spire_tier_stub.ts'), 'utf8');
    expect(stub).toContain('export function getDevSpireRankByOverride(): null { return null; }');
    const hook = fs.readFileSync(path.join(__dirname, '..', 'app', 'spire', 'use_spire_game.ts'), 'utf8');
    // зачем (сторож «use_spire_game ≤ 400 строк»): расчёт режима вынесен в app/spire/spire_rank_by_resolve.ts.
    expect(hook).toContain('const { rankBy, devRankBy } = spireResolveRankBy(config, room?.weekId ?? null);');
    const resolve = fs.readFileSync(path.join(__dirname, '..', 'app', 'spire', 'spire_rank_by_resolve.ts'), 'utf8');
    expect(resolve).toMatch(/const rankBy: SpireRankBy = devRankBy \?\? \(config && weekId \? spireEffectiveRankBy\(config, weekId\) : 'steps'\)/);
    expect(hook).toContain("fillMissingWeekCoinsForPreview: devRankBy === 'coins'");
  });
});
