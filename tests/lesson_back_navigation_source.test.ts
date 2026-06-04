import fs from 'fs';
import path from 'path';

describe('lesson back navigation source audit', () => {
  const lessonSource = () => fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

  it('guards lesson exit against duplicate back presses while navigation is in flight', () => {
    const source = lessonSource();

    expect(source).toContain('lessonExitInFlightRef');
    expect(source).toContain('lessonExitInFlightRef.current');
    expect(source).toMatch(/if\s*\(\s*lessonExitInFlightRef\.current\s*\)\s*return/);
  });

  it('does not wait for lesson menu prefetch before popping the lesson screen', () => {
    const source = lessonSource();
    const navSlice = source.slice(
      source.indexOf('const navigateUpFromLessonScreen'),
      source.indexOf('const handleLessonHeaderBack'),
    );

    expect(navSlice).toContain("void import('./lesson_menu')");
    expect(navSlice).not.toContain('.then(popToMenu)');
  });
});
