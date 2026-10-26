// зачем (координатор 26.10, аудит «назад» Ядра; петля 99bc0fa02): /lessons_list — повторный экспорт вкладки «Уроки». replace/dismissTo на него
// клали поверх стека вторую копию списка, и «назад» показывал список ещё раз. Экраны «Обучения» сворачивают стек до вкладки (dismissToTabRoute),
// а запасной маршрут safeRouterBack (истории нет) — сама вкладка '/(tabs)/lessons'.
import fs from 'node:fs';
import path from 'node:path';

const SCREENS = [
  'app/hint.tsx',
  'app/lesson_words.tsx',
  'app/level_exam.tsx',
  'app/exam.tsx',
  'app/lesson1.tsx',
  'components/level-exam/LevelExamV2.tsx',
] as const;

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
// код без комментариев: в комментариях /lessons_list упоминается как объяснение
const code = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');

describe('«Обучение»: без второй копии вкладки «Уроки»', () => {
  it.each(SCREENS)('%s не ведёт на /lessons_list ни переходом, ни запасным маршрутом', (rel) => {
    expect(code(read(rel))).not.toMatch(/'\/lessons_list'/);
  });

  it('переходы «к урокам» сворачивают стек до вкладки', () => {
    for (const rel of ['app/lesson_words.tsx', 'app/level_exam.tsx', 'app/exam.tsx', 'app/lesson1.tsx', 'components/level-exam/LevelExamV2.tsx']) {
      expect(read(rel)).toContain("dismissToTabRoute(router, '/(tabs)/lessons')");
    }
  });
});
