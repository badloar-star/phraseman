import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

describe('lesson intro gate', () => {
  it('renders lesson intro only from the top-level gate', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');
    const lessonContentStart = source.indexOf('const LessonContent = React.memo');
    // зачем: экспорт давно обёрнут в withOptionalPersonalPlanSunsetGuard(LessonScreen, ...)
    // — якорь 'export default function LessonScreen' устарел и не находился (indexOf
    // возвращал -1), из-за чего slice захватывал почти весь файл и тест ловил ложное
    // совпадение. Настоящая граница LessonContent — начало function LessonScreen().
    const lessonScreenStart = source.indexOf('function LessonScreen()');
    expect(lessonContentStart).toBeGreaterThan(-1);
    expect(lessonScreenStart).toBeGreaterThan(lessonContentStart);
    const lessonContentSource = source.slice(lessonContentStart, lessonScreenStart);

    expect(source.match(/<LessonIntroScreens/g)?.length).toBe(1);
    expect(lessonContentSource).not.toContain('<LessonIntroScreens');
    expect(lessonContentSource).not.toContain('showIntroScreens');
    expect(source).toContain('if (introGateReady && showIntroScreens)');
  });
});
