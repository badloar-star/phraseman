import type { DailyTask } from '../app/daily_tasks';
import { ALL_TASKS, withDailyTaskSpanishCopy } from '../app/daily_tasks';
import { DAILY_TASK_STRINGS_ES, localizedDailyTaskStrings } from '../app/daily_tasks_es_locale';

const dummyTask = (id: string): DailyTask => ({
  id,
  type: 'daily_active',
  icon: '☀️',
  target: 1,
  xp: 15,
  titleRU: 'RU title',
  titleUK: 'UK title',
  descRU: 'RU desc',
  descUK: 'UK desc',
});

describe('localizedDailyTaskStrings', () => {
  it('returns Ukrainian copy for uk', () => {
    const t = dummyTask('da1');
    const { title } = localizedDailyTaskStrings('uk', t);
    expect(title).toBe('UK title');
  });

  it('returns Spanish curated copy for known id', () => {
    const { title } = localizedDailyTaskStrings('es', dummyTask('da1'));
    expect(title).toMatch(/Solo entra/i);
  });

  it('uses direct titleES/descES fields when a task is enriched', () => {
    const task = withDailyTaskSpanishCopy(dummyTask('da1'));
    const { title, desc } = localizedDailyTaskStrings('es', task);

    expect(task.titleES).toMatch(/Solo entra/i);
    expect(title).toBe(task.titleES);
    expect(desc).toBe(task.descES);
  });

  it('has Spanish copy for every production daily task id', () => {
    const missing = ALL_TASKS
      .filter((task) => !DAILY_TASK_STRINGS_ES[task.id])
      .map((task) => task.id);

    expect(missing).toEqual([]);
  });

  it('falls back to Russian when ES map has no id', () => {
    const t = dummyTask('__unknown_id__');
    const { title, desc } = localizedDailyTaskStrings('es', t);
    expect(title).toBe('RU title');
    expect(desc).toBe('RU desc');
  });
});
