// Governance-ID: TG-E7E95C0082A2
// Слово владельца 05.11 («экраны не 1:1 с одобренными макетами»), эталоны rev6-home-free-0 / rev6-home-plus-3 / rev7-home-unlock-video:
// строки блока «Сегодня» — «Пройди урок / Повтори карточки / Заверши диалог / Посмотри видео», у каждой своя короткая подпись.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { todayTasksToView } from '../modules/today-tasks/today_tasks_view';
import { createTodayTasksDay } from '../modules/today-tasks/today_tasks_core';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Главная · «Сегодня»: строки как в эталоне', () => {
  const view = read('modules/today-tasks/today_tasks_view.ts');

  it.each([
    ['Пройди урок', 'Один шаг в обычном курсе'],
    ['Повтори карточки', 'Твои сохранённые фразы'],
    ['Заверши диалог', 'Практика живого разговора'],
    ['Посмотри видео', '10 минут на изучаемом языке'],
  ])('ru: «%s» + подпись «%s»', (title, subtitle) => {
    expect(view).toContain(`ru: '${title}'`);
    expect(view).toContain(`ru: '${subtitle}'`);
  });

  it('все 9 языков у подписей: нет пустых', () => {
    for (const sub of ['Один шаг в обычном курсе', 'Твои сохранённые фразы', 'Практика живого разговора', '10 минут на изучаемом языке']) {
      const at = view.indexOf(`ru: '${sub}'`);
      const line = view.slice(at, view.indexOf('})', at));
      for (const lang of ['uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) expect(line).toContain(`${lang}: '`);
    }
  });

  it('Главная не подменяет подпись строки урока названием последнего урока (оно в герое)', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).not.toContain("subtitle: lastLessonName } : task)");
    expect(home).toContain('          todayTasks.tasks,');
  });

  it('вид задач на ru: у урока, диалога, карточек и видео есть подпись, у них нет старой «Не менее 10 слов»', () => {
    const day = createTodayTasksDay('owner', '2026-11-05', ['lesson', 'dialog', 'cards', 'video']);
    const tasks = todayTasksToView(day, 'ru');
    for (const t of tasks) {
      if (['lesson', 'dialog', 'cards', 'video'].includes(t.kind)) expect(typeof t.subtitle).toBe('string');
      expect(t.subtitle ?? '').not.toContain('Не менее 10 слов');
    }
  });
});
