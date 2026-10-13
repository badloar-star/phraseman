// зачем (аудит Optimistic UI «Профиль и Уроки», координатор 13.10): правки аудита старых уроков закреплены тестами —
// замок двойного тапа навигации; тип ошибки из урока считается по фактическому ответу (раньше — по устаревшему selectedWords, пустому в режиме ввода);
// таймер перехода на итог гасится при выходе; вставляемые блоки и немые выходы получили переход/причину. Learning V2 не затрагивается.
import fs from 'node:fs';
import path from 'node:path';

import { NAV_ONCE_WINDOW_MS, __resetNavOnceForTests, navOnce } from '../app/nav_once';
import { lessonMistakeFacet } from '../app/lesson_mistake_facet';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('navOnce: двойной тап по навигации', () => {
  beforeEach(() => __resetNavOnceForTests());

  it('первый тап проходит, повтор в окне — нет, после окна — снова проходит', () => {
    expect(navOnce('lessons:menu:3', NAV_ONCE_WINDOW_MS, 1000)).toBe(true);
    expect(navOnce('lessons:menu:3', NAV_ONCE_WINDOW_MS, 1000 + NAV_ONCE_WINDOW_MS - 1)).toBe(false);
    expect(navOnce('lessons:menu:3', NAV_ONCE_WINDOW_MS, 1000 + NAV_ONCE_WINDOW_MS)).toBe(true);
  });

  it('разные ключи не мешают друг другу (другой урок открывается сразу)', () => {
    expect(navOnce('lessons:menu:3', NAV_ONCE_WINDOW_MS, 1000)).toBe(true);
    expect(navOnce('lessons:menu:4', NAV_ONCE_WINDOW_MS, 1001)).toBe(true);
    expect(navOnce('lesson_menu:open:3', NAV_ONCE_WINDOW_MS, 1002)).toBe(true);
  });

  it('часы, ушедшие назад, не блокируют навсегда', () => {
    expect(navOnce('k', NAV_ONCE_WINDOW_MS, 5000)).toBe(true);
    expect(navOnce('k', NAV_ONCE_WINDOW_MS, 100)).toBe(true);
  });
});

describe('тип ошибки из урока считается по фактическому ответу', () => {
  it('при пустом ответе даёт «пропущено слово», при полном неверном — иной тип (поэтому пустой ответ в записи был бедой)', () => {
    const empty = lessonMistakeFacet({ expectedPhrase: 'i am happy', answeredPhrase: '' });
    const wrongWord = lessonMistakeFacet({ expectedPhrase: 'i am happy', answeredPhrase: 'i am sad' });
    expect(empty).toBe('missing_token');
    expect(wrongWord).not.toBe('missing_token');
  });

  it('lesson1: запись «Мои ошибки» берёт аргумент answer, а не selectedWords из замыкания; факет и ответ пишутся в журнал', () => {
    const src = read('app/lesson1.tsx');
    expect(src).toMatch(/resolvePhraseMistakeToken\(canonKey, answer\)/);
    expect(src).toMatch(/const mistakeFacetKind = lessonMistakeFacet\(\{ expectedPhrase: canonKey, answeredPhrase: answer \}\)/);
    expect(src).toMatch(/kind: mistakeFacetKind,/);
    expect(src).toMatch(/\[MISTAKE-CAPTURE\] facet/);
    // в самом вызове записи больше нет selectedWords.join
    const capture = src.slice(src.indexOf('const mistakeFacetKind'), src.indexOf("noteSwallowedHandler('lesson1:useCallback.getStableId')"));
    expect(capture).not.toMatch(/selectedWords\.join\(' '\),?\n\s*\}\),/);
  });
});

describe('замки и таймеры экранов уроков', () => {
  it('lesson1: таймер перехода на итог без озвучки лежит в ref, а «Теория» защищена замком', () => {
    const src = read('app/lesson1.tsx');
    expect(src).toMatch(/lessonCompletionFallbackTimerRef\.current = setTimeout\(\(\) => \{\n\s*lessonCompletionFallbackTimerRef\.current = null;\n\s*void runLessonCompletionNavigation\(\);\n\s*\}, 1500\);/);
    expect(src).not.toMatch(/setTimeout\(\(\) => \{ void runLessonCompletionNavigation\(\); \}, 1500\)/);
    expect(src).toMatch(/navOnce\(`lesson1:theory:\$\{topicLessonId\}`\)/);
  });

  it('меню урока: обе кнопки входа (Начать и Продолжить) защищены одним ключом, список уроков — ключом урока', () => {
    const menu = read('app/lesson_menu.tsx');
    expect((menu.match(/navOnce\(`lesson_menu:open:\$\{lessonId\}`\)/g) ?? []).length).toBe(2);
    expect(read('app/(tabs)/lessons.tsx')).toMatch(/if \(!navOnce\(`lessons:menu:\$\{num\}`\)\) return;/);
  });

  it('итог урока: карточка «Всё было понятно?» вставляется плавно', () => {
    expect(read('app/lesson_complete.tsx')).toMatch(/animateNextLayoutTransition\(\);[^\n]*\n\s*setShowLessonFeedback\(true\);/);
  });

  it('немые выходы и catch получили причину', () => {
    const menu = read('app/lesson_menu.tsx');
    for (const tag of ['lesson_menu:prepHint', 'lesson_menu:prepositionProgress', 'lesson_menu:theoryProgress']) expect(menu).toContain(`noteSwallowedHandler('${tag}')`);
    expect(read('app/lesson1.tsx')).toContain("noteSwallowedHandler('lesson1:remoteFrenchLessons')");
    expect(read('app/mistake_practice_session.tsx')).toContain('[MISTAKE-SESSION] verdict:ignored');
    expect(read('app/mistake_detail.tsx')).toContain('[MISTAKE-DETAIL] practise:ignored');
  });
});
