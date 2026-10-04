import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

/**
 * зачем (§126, 04.10): «Персональный план» выведен из продукта (970f8e7b8, 13.08 — retirement pass;
 * экран и прогресс удалены в снимке 2.0 efe19ae9d, 30.09). Прежний сторож проверял, что завершение задачи
 * плана считается в своём языке, — теперь он сторожит, что план не вернулся тихо: ни экрана, ни модуля
 * прогресса, ни импортов из боевого кода. Ключи старых данных живут только в retired_account_local_keys.
 */
describe('personal plan stays retired in 2.0', () => {
  it('has no plan exercise screen or plan progress module', () => {
    expect(exists('app/personal_plan_exercise.tsx')).toBe(false);
    expect(exists('app/personal_plan_progress.ts')).toBe(false);
  });

  it('production completion entry points no longer bump the retired plan metric', () => {
    for (const relativePath of ['app/lesson1.tsx', 'app/flashcards_swipe.tsx', 'app/mistake_practice_session.tsx']) {
      const source = read(relativePath);
      expect(source).not.toContain("from './personal_plan_progress'");
      expect(source).not.toContain("bumpStatsDaily('plan_tasks_completed'");
    }
  });
});
