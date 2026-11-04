// Сторож (владелец 04.11): список уроков показывает замок дополнительного языка нового пользователя СРАЗУ (а не пейвол на тапе),
// тап по запертому ведёт на пейвол language_add; Plus/тестер/dev замок снимают. Вердикт — только из course_language_access (своей копии нет).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('список уроков: замок дополнительного языка', () => {
  const lessons = read('app/(tabs)/lessons.tsx');
  it('вердикт берётся хуком из course_language_access, без собственной логики в экране', () => {
    expect(lessons).toContain('const courseLanguageLocked = useCourseLanguageLocked(studyTarget);');
    expect(lessons).not.toContain('judgeCourseLanguageLock');
    const hook = read('app/use_course_language_locked.ts');
    expect(hook).toContain('isCourseLanguageLockedSync');
    expect(hook).toContain('resolveCourseLanguageLock');
  });
  it('карточка получает состояние «Plus» (как платный урок), если язык заперт и нет Plus/тестера/dev', () => {
    expect(lessons).toContain('const legacyLanguageLocked = courseLanguageLocked && !isPremium && !effectiveNoLimits && !effectiveDevContentUnlock;');
    expect(lessons).toContain('legacyLanguageLocked ||');
  });
  it('тап по запертому языку открывает пейвол через охранник (контекст language_add), до обычного решения по уроку', () => {
    const tap = lessons.indexOf("courseLanguageLocked && !accessInput.isPremium && !accessInput.noLimits && !accessInput.devMode");
    expect(tap).toBeGreaterThan(0);
    expect(lessons.indexOf('void openLessonPremiumPaywall(router, num, studyTarget);', tap)).toBeGreaterThan(tap);
    expect(tap).toBeLessThan(lessons.indexOf('const access = resolveLessonAccess(accessInput);', tap));
  });
  it('хук не лезет в сеть и при ошибке не запирает', () => {
    const hook = read('app/use_course_language_locked.ts');
    expect(hook).not.toMatch(/firebase|fetch\(/);
    expect(hook).toContain('setLocked(false)');
    expect(hook).toContain('console.warn');
  });
});
