// зачем (аудит «назад» 26.10, зона «Обучение»): «Теория» (app/hint.tsx) — экран раздела «Уроки». Без истории (глубокая ссылка, холодный старт)
// «назад» ведёт в раздел (/lessons_list = вкладка «Уроки»), а не на Главную. С историей safeRouterBack по-прежнему возвращает туда, откуда пришёл.
import fs from 'node:fs';
import path from 'node:path';

const hint = fs.readFileSync(path.join(__dirname, '..', 'app/hint.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('«Теория»: запасной маршрут «назад» — раздел «Уроки»', () => {
  it('goBack ведёт в /lessons_list', () => {
    expect(hint).toContain("const goBack = React.useCallback(() => safeRouterBack(router, '/lessons_list' as any), [router]);");
  });

  it('/lessons_list — та же вкладка «Уроки»', () => {
    const list = fs.readFileSync(path.join(__dirname, '..', 'app/lessons_list.tsx'), 'utf8');
    expect(list).toContain("export { default } from './(tabs)/lessons';");
  });
});
