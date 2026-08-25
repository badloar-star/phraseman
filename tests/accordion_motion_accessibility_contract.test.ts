import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const hook = fs.readFileSync(path.join(root, 'hooks', 'useAccordionFaqStyle.ts'), 'utf8');

describe('accordion motion contract', () => {
  test('respects reduced motion and cleans finite animations', () => {
    expect(hook).toContain('useReduceMotion');
    expect(hook).toContain('chevronAnim.stopAnimation()');
    expect(hook).toContain('duration: reduceMotion ? 0 : MOTION_DURATION.normal');
    expect(hook).not.toMatch(/Animated\.loop|setInterval/);
  });

  // зачем (2026-08-25): кейс «недельный разбор — не ещё один аккордеон» читал
  // app/WeeklyReviewCard.tsx, а этот компонент удалён вместе с диагнозами
  // тренера (бандл-диета Ф2, −4.33 МБ). Авторитетный сторож удаления
  // tests/retired_coach_diagnosis_full_removal_contract.test.ts перечисляет
  // файл как намеренно удалённый — значит проверять в нём нечего: нет
  // компонента, нет и риска, что он станет аккордеоном.
  // Проверка выше (сам хук аккордеона) продолжает работать и остаётся здесь.
});
