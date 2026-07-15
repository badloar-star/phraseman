import fs from 'fs';
import path from 'path';

const read = (...parts: string[]) => fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');

describe('legacy lesson purchase continuation wiring', () => {
  it('passes the exact lesson intent from every lesson lock surface', () => {
    expect(read('app', 'lesson_premium_gate.ts')).toContain('lessonPurchaseContinuationParams(lessonId)');
    expect(read('app', '(tabs)', 'lessons.tsx')).toContain('lessonPurchaseContinuationParams(lessonNum)');
    expect((read('app', 'lesson_menu.tsx').match(/lessonPurchaseContinuationParams\(lessonId\)/g) ?? [])).toHaveLength(2);
    expect(read('app', 'lesson_complete.tsx')).toContain('lessonPurchaseContinuationParams(premiumBannerNextLesson.current)');
    expect(read('app', 'level_exam.tsx')).toContain('lessonPurchaseContinuationParams(firstLessonForLevel)');
  });

  it.each(['paywall_a.tsx', 'paywall_b.tsx', 'paywall_c.tsx'])(
    '%s forwards the allowlisted lesson id into the shared purchase hook',
    (file) => {
      const source = read('app', file);
      expect(source).toContain('resume_lesson_id?: string');
      expect(source).toContain('parseResumeLessonId(params.resume_lesson_id)');
      expect(source).toContain('resumeLessonId');
    },
  );
});
