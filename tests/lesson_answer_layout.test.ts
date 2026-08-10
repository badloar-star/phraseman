import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const helperPath = path.join(ROOT, 'lib', 'lesson_answer_layout.ts');
const lessonSource = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');

describe('lesson answer layout on narrow screens', () => {
  it('reduces only long answer text on narrow screens', () => {
    const helperExists = fs.existsSync(helperPath);
    expect(helperExists).toBe(true);
    if (!helperExists) return;

    const { resolveLessonAnswerFontSize } = require(helperPath) as {
      resolveLessonAnswerFontSize: (baseFontSize: number, screenWidth: number, text: string) => number;
    };
    const base = 32;

    expect(resolveLessonAnswerFontSize(base, 360, 'Everybody understands me')).toBeLessThan(base);
    expect(resolveLessonAnswerFontSize(base, 360, 'Everyone understands me')).toBeLessThan(base);
    expect(resolveLessonAnswerFontSize(base, 360, 'I understand')).toBe(base);
    expect(resolveLessonAnswerFontSize(base, 430, 'Everybody understands me')).toBe(base);
  });

  it('uses the adaptive size for typed, assembled, and accepted result answers without changing submit', () => {
    expect(lessonSource).toContain('resolveLessonAnswerFontSize');
    expect(lessonSource).toContain('fontSize: interactiveAnswerFont');
    expect(lessonSource).toContain("fontSize: status === 'result' ? resultAnswerFont : interactiveAnswerFont");
    expect(lessonSource).toContain('onSubmitEditing={handleTypedSubmit}');
  });
});
