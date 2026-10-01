// зачем («Дизайн» 01.10, эмулятор): «Шпиль 0/3» при выключенном Шпиле и «Ошибки 0/5»
// при пустом журнале — тупики. Невыполнимые задания не выдаём, а уже выданные
// нетронутые — меняем на выполнимые.
import {
  TODAY_TASK_POOL,
  createTodayTasksDay,
  replaceUnavailableTodayTasks,
  type TodayTaskKindCore,
} from '../modules/today-tasks/today_tasks_core';

const OWNER = 'owner-1';
const DAY = '2026-10-01';

function dayWith(kinds: readonly TodayTaskKindCore[]) {
  const base = createTodayTasksDay(OWNER, DAY, TODAY_TASK_POOL);
  return { ...base, tasks: Object.freeze(kinds.map((kind) => ({ ...base.tasks[0], kind, units: 0, unitKeys: [], done: false, doneAtMs: null, rewardCoins: 50, rewardStatus: 'none' as const }))) };
}

describe('today tasks liveness', () => {
  it('нетронутое невыполнимое задание меняется на доступный тип', () => {
    const day = dayWith(['cards', 'mistakes', 'spire_steps']);
    const available: TodayTaskKindCore[] = ['lesson', 'dialog', 'cards', 'video'];
    const { state, replaced } = replaceUnavailableTodayTasks(day, available);
    expect(replaced.map((r) => r.from)).toEqual(['mistakes', 'spire_steps']);
    expect(state.tasks.map((t) => t.kind)).toEqual(['cards', 'lesson', 'dialog']);
    expect(state.tasks.every((t) => t.units === 0 && !t.done)).toBe(true);
  });

  it('начатое или выполненное задание не трогаем, даже если тип стал недоступен', () => {
    const day = dayWith(['cards', 'mistakes', 'spire_steps']);
    const started = { ...day, tasks: Object.freeze([day.tasks[0], { ...day.tasks[1], units: 2, unitKeys: ['a', 'b'] }, { ...day.tasks[2], done: true }]) };
    const { state, replaced } = replaceUnavailableTodayTasks(started, ['lesson', 'cards']);
    expect(replaced).toHaveLength(0);
    expect(state).toBe(started);
  });

  it('нет свободных доступных типов — задание остаётся как было', () => {
    const day = dayWith(['cards', 'lesson', 'spire_steps']);
    const { replaced } = replaceUnavailableTodayTasks(day, ['cards', 'lesson']);
    expect(replaced).toHaveLength(0);
  });
});
