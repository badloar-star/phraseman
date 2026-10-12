// зачем (learn-014, координатор 13.10): пилюля пейвола читает «закрытый урок = lessons_done + 1»; список уроков передавал число ПРОЙДЕННЫХ, и тап по уроку 4 у человека с 0 пройденных давал «Урок 1 закрыт».
// Контракт: список уроков передаёт номер тапнутого урока − 1 — так же, как lesson_premium_gate; пилюля по-прежнему берёт lessons_done + 1.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('пейвол закрытого урока: номер в пилюле', () => {
  it('список уроков: lessons_done = номер урока − 1, а не число пройденных', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    const at = lessons.indexOf('const openLessonPaywall = useCallback(');
    expect(at).toBeGreaterThan(0);
    const block = lessons.slice(at, lessons.indexOf('[effectiveLegacyFreeLessonCap, router]', at));
    expect(block).toContain('lessons_done: Math.max(0, lessonNum - 1),');
    expect(block).not.toContain('doneSoFar');
  });

  it('тот же расчёт в lesson_premium_gate, а пилюля читает lessons_done + 1', () => {
    expect(read('app/lesson_premium_gate.ts')).toContain('lessons_done: Math.max(0, lessonId - 1),');
    expect(read('app/paywall_context_headline.ts')).toContain('lessonsDone + 1');
  });
});
