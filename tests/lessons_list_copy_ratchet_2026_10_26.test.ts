// зачем (координатор 26.10, запрет петель владельцем; c8dd3d872, 99bc0fa02): /lessons_list — повторный экспорт вкладки «Уроки». Переход на него
// поверх стека кладёт вторую копию списка, и «назад» показывает его ещё раз. Храповик: новые переходы на /lessons_list в коде запрещены;
// список оставшихся мест может только сокращаться (исправил — убери строку). Комментарии не считаются.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const DIRS = ['app', 'components', 'hooks', 'modules', 'constants'];
// оставшиеся места на 26.10 (ночь): реестр роли раздела, вход с Главной при скрытом V2, маршрут «Сегодня» при скрытом V2,
// тап по пушу (зона уведомлений — хозяину через координатора)
// 26.10 (Ядро, решение координатора): тап по пушу (notifications.ts, notification_tap_handler.ts) и вход «Уроки» с Главной при скрытом V2
// ведут на саму вкладку — их строки убраны, допуск 0
const ALLOWED: Readonly<Record<string, number>> = {
  'app/navigation_back.ts': 1,
  'modules/today-tasks/today_tasks_view.ts': 1,
};

const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((line) => line.replace(/(^|\s)\/\/.*$/, '')).join('\n');

function walk(dir: string, out: string[]): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(rel, out); }
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(rel);
  }
  return out;
}

describe('/lessons_list — без новых переходов на копию вкладки «Уроки»', () => {
  it('в коде нет переходов на /lessons_list сверх оставшихся мест', () => {
    const found: Record<string, number> = {};
    for (const rel of DIRS.flatMap((d) => walk(d, []))) {
      if (rel === 'app/lessons_list.tsx') continue; // сам маршрут-копия
      const n = (stripComments(fs.readFileSync(path.join(ROOT, rel), 'utf8')).match(/["'`]\/lessons_list["'`]/g) ?? []).length;
      if (n > 0) found[rel] = n;
    }
    const grown = Object.entries(found).filter(([rel, n]) => n > (ALLOWED[rel] ?? 0));
    expect(grown).toEqual([]);
  });
});
