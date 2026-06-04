import { ALL_TASKS } from '../app/daily_tasks';

describe('daily task copy', () => {
  it('keeps the Full Lesson card phrased for players instead of implementation timing', () => {
    const fullLesson = ALL_TASKS.find((task) => task.id === 'da3');

    expect(fullLesson?.descRU).toBe('Заверши любой урок полностью — от первой фразы до финала.');
    expect(fullLesson?.descRU).not.toMatch(/засчит|экран/i);
  });
});
