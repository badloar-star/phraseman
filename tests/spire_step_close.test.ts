/**
 * [PEAK-CLOSE] (Сверка 24.10: кадры 1,1–1,7 с в секунду закрытия ступени; координатор 24.10): в кадр закрытия — только окно итога
 * и монеты; облако, место для Главной и «Сегодня» — один раз и только после анимаций; та же неделя не даёт второго прохода экрана.
 */
import { normalizeEol } from './helpers/read_source';

let after: (() => void) | null = null;
const runAfter = jest.fn((fn: () => void) => { after = fn; return { cancel: () => undefined }; });
jest.mock('react-native', () => ({ InteractionManager: { runAfterInteractions: (fn: () => void) => runAfter(fn) } }));

const refreshPlace = jest.fn(async () => 3);
const recordToday = jest.fn(async () => undefined);
jest.mock('../app/spire/spire_home_place', () => ({ refreshSpireHomePlaceFromMemory: (...a: unknown[]) => refreshPlace(...(a as [])) }));
jest.mock('../modules/today-tasks/today_tasks_store', () => ({ recordTodayTaskActivity: (...a: unknown[]) => recordToday(...(a as [])) }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
const addPending = jest.fn();
const removePending = jest.fn();
jest.mock('../app/spire/spire_pending_coins', () => ({
  addSpirePendingCoins: (...a: unknown[]) => addPending(...(a as [])),
  removeSpirePendingCoins: (...a: unknown[]) => removePending(...(a as [])),
  spireGoldPendingId: (id: string) => `spire_gold:${id}`,
  spirePendingCoinsHas: () => false,
  spireStepPendingCoins: (_c: unknown, floor: number, cleared: boolean) => (cleared ? 10 + floor * 10 : 10),
}));
jest.mock('../app/runes_system', () => ({ peekRunes: () => 600 }));

import { spireRunStepCloseTail, spireSameWeek, spireStepCoinsNow, spireStepCoinsUndo } from '../app/spire/spire_step_close';
import type { SpireWeekLocal } from '../modules/spire/report_queue';

const week = { weekKey: '2026-W43', floor: 5, stepInFloor: 0, stepsCleared: 26 } as unknown as SpireWeekLocal;

describe('[PEAK-CLOSE] хвост закрытия ступени', () => {
  it('до конца анимаций ничего не делает; потом облако, место и «Сегодня» — ровно по разу, неделя из памяти', async () => {
    const flush = jest.fn();
    spireRunStepCloseTail({ reportId: 'r1', t0: Date.now(), uid: 'u', lang: 'en', local: week, flush, flushTrigger: 'floor_closed', countToday: true, skipWhy: '' });
    expect(runAfter).toHaveBeenCalledTimes(1);
    expect(flush).not.toHaveBeenCalled();
    expect(refreshPlace).not.toHaveBeenCalled();
    expect(recordToday).not.toHaveBeenCalled();
    (after as unknown as () => void)();
    await new Promise((r) => setTimeout(r, 0));
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith('floor_closed');
    expect(refreshPlace).toHaveBeenCalledTimes(1);
    expect(refreshPlace).toHaveBeenCalledWith('u', 'en', week);
    expect(recordToday).toHaveBeenCalledTimes(1);
  });

  it('та же неделя по содержимому — без повторного setWeek', () => {
    expect(spireSameWeek(week, { ...week } as SpireWeekLocal)).toBe(true);
    expect(spireSameWeek(week, { ...week, stepsCleared: 27 } as SpireWeekLocal)).toBe(false);
    expect(spireSameWeek(null, week)).toBe(false);
  });

  it('движок Пика: setWeek после записи только при новой неделе, хвост — через spireRunStepCloseTail; экран Пика — этаж без второго прохода', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const read = (rel: string) => normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8'));
    const game = read('app/spire/use_spire_game.ts');
    expect(game).toContain('if (!spireSameWeek(weekRef.current, res.local)) setWeek(res.local);');
    expect(game).not.toContain('setWeek(res.local); if (kind');
    expect(game.match(/spireRunStepCloseTail\(/g)?.length).toBe(1);
    expect(read('app/spire/spire_home_place.ts')).toContain('const week = weekInMemory ?? await readCurrentLocalWeek(lang);');
    expect(read('components/spire/SpireHomeScreen.tsx')).not.toContain('useEffect(() => { if (myFloor !== null) setSelected(myFloor); }, [myFloor]);');
  });
});

describe('[PEAK-COINS] вариант A: монеты в момент итога', () => {
  const coins = { perStep: 10, perFloorPerLevel: 10, guardianMultiplier: 2, summitBonus: 100 };
  beforeEach(() => { addPending.mockClear(); removePending.mockClear(); });
  it('новая пройденная ступень — сразу +монеты с базой кошелька; закрытый этаж — со ставкой этажа', () => {
    expect(spireStepCoinsNow({ owner: 'me', reportId: 'r1', t0: 0, coins, passedNew: true, floorBefore: 4, floorCleared: false })).toBe(true);
    expect(addPending).toHaveBeenLastCalledWith('me', 'r1', 10, expect.any(Number), 600);
    spireStepCoinsNow({ owner: 'me', reportId: 'r2', t0: 0, coins, passedNew: true, floorBefore: 4, floorCleared: true });
    expect(addPending).toHaveBeenLastCalledWith('me', 'r2', 50, expect.any(Number), 600);
  });
  it('[SPIRE-GOLD] золото решено → ещё одна ставка ступени; этаж не удваивается', () => {
    spireStepCoinsNow({ owner: 'me', reportId: 'g1', t0: 0, coins, passedNew: true, floorBefore: 4, floorCleared: true, golden: true });
    // Ревизор 25.10: золото — своя строка, отказ сервера снимет только её
    expect(addPending).toHaveBeenCalledWith('me', 'g1', 50, expect.any(Number), 600);
    expect(addPending).toHaveBeenLastCalledWith('me', 'spire_gold:g1', 10, expect.any(Number), 600);
  });
  it('провал, повтор, нет владельца или конфига — монет нет', () => {
    for (const bad of [{ passedNew: false, owner: 'me', coins }, { passedNew: true, owner: null, coins }, { passedNew: true, owner: 'me', coins: null }]) {
      expect(spireStepCoinsNow({ reportId: 'x', t0: 0, floorBefore: 1, floorCleared: false, ...bad })).toBe(false);
    }
    expect(addPending).not.toHaveBeenCalled();
  });
  it('сбой записи снимает показанные монеты с причиной', () => {
    spireStepCoinsUndo('me', 'r1', 'save_failed');
    expect(removePending).toHaveBeenCalledWith('me', 'r1', 'save_failed', false);
    spireStepCoinsUndo('me', 'r2', 'save_failed', true);
    expect(removePending).toHaveBeenLastCalledWith('me', 'r2', 'save_failed', true);
  });
});
