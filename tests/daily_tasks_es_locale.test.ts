import type { DailyTask } from '../app/daily_tasks';
import { localizedDailyTaskStrings } from '../app/daily_tasks_es_locale';

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

  it('falls back to Russian when ES map has no id', () => {
    const t = dummyTask('__unknown_id__');
    const { title, desc } = localizedDailyTaskStrings('es', t);
    expect(title).toBe('RU title');
    expect(desc).toBe('RU desc');
  });
});
