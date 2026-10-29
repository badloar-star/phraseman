// ЗАМОК (координатор 29.10 после журнала Сверки 28.10): законный отскок с меню закрытого урока — шагом назад к списку, если список
// прямо под меню; replace на вкладку — только без стека или когда под меню не список (петля lesson1 ↔ меню 15.10).
import fs from 'node:fs';
import path from 'node:path';
import { lessonMenuBounceDecisionV1 } from '../app/lesson_menu_bounce_route';

const stack = (...names: string[]) => ({ index: names.length - 1, routes: names.map((name) => ({ name })) });

test('back only when the list lies right under the menu', () => {
  expect(lessonMenuBounceDecisionV1(stack('(tabs)', 'lesson_menu'), true)).toEqual({ method: 'back', reason: 'list_under_menu', underlay: '(tabs)' });
  expect(lessonMenuBounceDecisionV1(stack('(tabs)', 'lessons_list', 'lesson_menu'), true).method).toBe('back');
  expect(lessonMenuBounceDecisionV1(stack('(tabs)', 'lesson1', 'lesson_menu'), true)).toEqual({ method: 'replace', reason: 'underlay_not_list', underlay: 'lesson1' });
  expect(lessonMenuBounceDecisionV1(stack('lesson_menu'), false)).toEqual({ method: 'replace', reason: 'no_stack', underlay: null });
  expect(lessonMenuBounceDecisionV1(undefined, true).method).toBe('replace');
});

test('the menu routes every legitimate bounce through the decision', () => {
  const menu = fs.readFileSync(path.join(__dirname, '..', 'app/lesson_menu.tsx'), 'utf8').replace(/\r\n/g, '\n');
  expect(menu).toContain('const decision = lessonMenuBounceDecisionV1(navigation.getState() as never, router.canGoBack());');
  expect(menu).toContain("if (decision.method === 'back') safeRouterBack(router, '/(tabs)/lessons' as never);");
  expect(menu).toContain("bounceToLessonList('suppressed');");
  expect(menu).toContain('bounceToLessonList(toastKind);');
  // прямого replace на вкладку в эффекте отскока больше нет — только через решение
  const at = menu.indexOf("console.log('[LESSON-LOCK] menu:bounce_back'");
  const effect = menu.slice(at, menu.indexOf('}, [bounceToLessonList,', at));
  expect(effect).not.toContain("router.replace('/(tabs)/lessons'");
});
