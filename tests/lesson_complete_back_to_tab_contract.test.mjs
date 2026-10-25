// зачем (аудит «назад» 26.10, наблюдение Дизайна; запрет петель владельцем): /lessons_list — повторный экспорт вкладки «Уроки».
// «К урокам» и «Следующий урок» на итоге урока делали replace на /lessons_list и клали поверх вкладки вторую копию списка;
// свайп iOS снимал копию и показывал тот же список ещё раз. Теперь итог сворачивает стек до вкладки (dismissToTabRoute).
// Сторож:
// - оба выхода — через dismissToTabRoute на /(tabs)/lessons;
// - без replace на список;
// - вкладка «Уроки» не читает параметры маршрута, иначе возврат на вкладку терял бы id.
// Автопереход французского курса (canApplyCompletionRewards=false) намеренно не тронут: его держит
// gustav_french_curriculum_contract, у владельца курса он — отдельной строкой в отчёте.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const src = read('app/lesson_complete.tsx');

const body = (name) => {
  const at = src.indexOf(`const ${name} = useCallback(`);
  assert.ok(at > 0, `${name} не найден`);
  return src.slice(at, src.indexOf('}, [', at));
};

test('«К урокам» и «Назад» с итога сворачивают стек до вкладки «Уроки», а не кладут вторую копию списка', () => {
  assert.match(src, /const COMPLETE_TO_LESSONS_TAB = '\/\(tabs\)\/lessons';/);
  const back = body('goBackFromComplete');
  assert.match(back, /dismissToTabRoute\(router, COMPLETE_TO_LESSONS_TAB\)/);
  assert.doesNotMatch(back, /router\.replace/);
  assert.match(back, /navOnce\(`lesson_complete:back:\$\{lessonId\}`\)/); // защита от двойного тапа осталась
});

test('«Следующий урок» после проверок доступа — тоже на вкладку, без replace со списком и id', () => {
  assert.doesNotMatch(src, /router\.replace\(\{\s*pathname: '\/lessons_list'/);
  const nextAt = src.indexOf('уходим на список');
  assert.ok(nextAt > 0);
  assert.match(src.slice(nextAt, nextAt + 220), /dismissToTabRoute\(router, COMPLETE_TO_LESSONS_TAB\)/);
});

test('/lessons_list — та же вкладка, и вкладка не читает параметры маршрута (возврат на вкладку ничего не теряет)', () => {
  assert.match(read('app/lessons_list.tsx'), /export \{ default \} from '\.\/\(tabs\)\/lessons';/);
  assert.doesNotMatch(read('app/(tabs)/lessons.tsx'), /use(Local|Global)SearchParams/);
});

test('dismissToTabRoute — из navigation_back (журнал [NAV-BACK] dismiss_to_tab, только цели /(tabs)/…)', () => {
  assert.match(src, /import \{ dismissToTabRoute, markNextNavigationAsReplace \} from '\.\/navigation_back';/);
  assert.match(read('app/navigation_back.ts'), /console\.log\('\[NAV-BACK\] dismiss_to_tab'/);
});
