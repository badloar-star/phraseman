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

describe('lesson complete back loop guard', () => {
  const completeSource = () =>
    fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_complete.tsx'), 'utf8');

  it('imports BackHandler and Platform from react-native', () => {
    const source = completeSource();
    expect(source).toMatch(/import\s*{[^}]*\bBackHandler\b[^}]*}\s*from\s*'react-native'/);
    expect(source).toMatch(/import\s*{[^}]*\bPlatform\b[^}]*}\s*from\s*'react-native'/);
  });

  it('intercepts the Android hardware back button on the completion screen', () => {
    const source = completeSource();
    expect(source).toContain("Platform.OS !== 'android'");
    expect(source).toContain("BackHandler.addEventListener('hardwareBackPress'");
    // Must consume the event (return true) so the OS does not pop back into the lesson.
    const handlerSlice = source.slice(
      source.indexOf("BackHandler.addEventListener('hardwareBackPress'"),
      source.indexOf('return () => sub.remove();'),
    );
    expect(handlerSlice).toContain('return true;');
  });

  it('routes hardware back to the lesson menu, never back into the lesson screen', () => {
    const source = completeSource();
    const handlerSlice = source.slice(
      source.indexOf("BackHandler.addEventListener('hardwareBackPress'"),
      source.indexOf('return () => sub.remove();'),
    );
    // The terminal action is the same safe exit as the header back button.
    expect(handlerSlice).toContain('goBackFromComplete();');
    // It must NOT navigate to the lesson engine (that is what caused the loop).
    expect(handlerSlice).not.toContain("'/lesson1'");
  });

  it('header back and hardware back share one safe destination (lessons_list)', () => {
    const source = completeSource();
    expect(source).toContain('const goBackFromComplete = useCallback(');
    const backFn = source.slice(
      source.indexOf('const goBackFromComplete = useCallback('),
      source.indexOf('const goBackFromComplete = useCallback(') + 220,
    );
    expect(backFn).toContain("pathname: '/lessons_list'");
    expect(backFn.indexOf('markNextNavigationAsReplace()')).toBeLessThan(backFn.indexOf('router.replace'));
  });

  it('marks both lesson-to-result replacements so the abandoned lesson leaves custom history', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');
    expect(source.match(/markNextNavigationAsReplace\(\);\s*router\.replace\(\{\s*pathname: '\/lesson_complete'/g)).toHaveLength(2);
  });
});
