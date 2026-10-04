import fs from 'fs';
import path from 'path';

const read = (...parts: string[]) => fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');

describe('legacy lesson purchase continuation wiring', () => {
  it('passes the exact lesson intent from every lesson lock surface', () => {
    expect(read('app', 'lesson_premium_gate.ts')).toContain('lessonPurchaseContinuationParams(lessonId)');
    expect(read('app', '(tabs)', 'lessons.tsx')).toContain('lessonPurchaseContinuationParams(lessonNum)');
    // зачем: c5db088ae (21.09) удалил внутренний модал блокировки — премиум-замок урока сходится в ОДНУ точку
    // меню (сразу пейвол), и она по-прежнему передаёт урок для продолжения после покупки.
    const lessonMenu = read('app', 'lesson_menu.tsx');
    expect((lessonMenu.match(/lessonPurchaseContinuationParams\(lessonId\)/g) ?? [])).toHaveLength(1);
    expect(lessonMenu).toContain("source: 'lesson_menu',");
    expect(read('app', 'lesson_complete.tsx')).toContain('lessonPurchaseContinuationParams(premiumBannerNextLesson.current)');
    expect(read('app', 'level_exam.tsx')).toContain('lessonPurchaseContinuationParams(firstLessonForLevel)');
  });

  it('the single Plus paywall forwards the allowlisted lesson id into the shared purchase hook', () => {
    const source = read('components', 'paywall', 'PaywallPlusScreen.tsx');
    expect(source).toContain('resume_lesson_id?: string');
    expect(source).toContain('parseResumeLessonId(params.resume_lesson_id)');
    expect(source).toContain('resumeLessonId');
  });
});
