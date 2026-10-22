import { addLocalDays } from '../app/local_date';
import { buildTodayActivityHistory } from '../app/today_activity_history';
import fs from 'node:fs';
import path from 'node:path';

describe('история активности блока «Сегодня»', () => {
  it('показывает только дни с фактической активностью, без пустого тридцатидневного хвоста', () => {
    const rows = buildTodayActivityHistory('2026-10-19', [1, 0, 3], [1, 1, 3]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ dayKey: '2026-10-19', progress: [1, 0, 3], targets: [1, 1, 3] });
  });

  it('не рисует ленту, когда сегодня ещё нет ни одного занятия', () => {
    expect(buildTodayActivityHistory('2026-10-19', [0, 0, 0], [1, 1, 3])).toEqual([]);
  });

  it('не показывает невозможный прогресс: значения ограничены диапазоном цели', () => {
    const [today] = buildTodayActivityHistory('2026-10-19', [4, -1, 2], [1, 1, 0]).slice(-1);

    expect(today.progress).toEqual([1, 0, 0]);
  });

  it('показывает ленту только на экране «Сегодня», а не на Главной', () => {
    const card = fs.readFileSync(path.join(__dirname, '..', 'components/home/v2/HomeV2TodayCard.tsx'), 'utf8');
    const screen = fs.readFileSync(path.join(__dirname, '..', 'app/today_tasks.tsx'), 'utf8');
    expect(card).not.toContain('TodayActivityHistory');
    expect(screen).toContain('<TodayActivityHistory dayKey={todayTasks.dayKey} tasks={tasks} />');
  });

});
