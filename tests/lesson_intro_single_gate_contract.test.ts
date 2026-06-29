import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

describe('lesson intro gate', () => {
  it('renders lesson intro only from the top-level gate', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');
    const lessonContentStart = source.indexOf('const LessonContent = React.memo');
    const lessonScreenStart = source.indexOf('export default function LessonScreen');
    const lessonContentSource = source.slice(lessonContentStart, lessonScreenStart);

    expect(source.match(/<LessonIntroScreens/g)?.length).toBe(1);
    expect(lessonContentSource).not.toContain('<LessonIntroScreens');
    expect(lessonContentSource).not.toContain('showIntroScreens');
    expect(source).toContain('if (introGateReady && showIntroScreens)');
  });
});
