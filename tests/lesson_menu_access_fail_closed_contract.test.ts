import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_menu.tsx'), 'utf8');

describe('lesson menu access check is fail-closed', () => {
  it('starts locked and treats the pending access check as launch-blocking', () => {
    expect(source).toContain('const [isLessonLocked, setIsLessonLocked] = useState(true);');
    expect(source).toContain('const lessonLaunchBlocked = !lockStateLoaded || isLessonLocked;');

    const primaryItem = source.slice(
      source.indexOf("testID: 'lesson-menu-primary'"),
      source.indexOf("testID: 'lesson-menu-words'"),
    );
    expect(primaryItem).toContain('disabled: lessonLaunchBlocked');
  });

  it('keeps lookup rejection locked and every lesson launch handler checks the gate', () => {
    const lockCheck = source.slice(
      source.indexOf('const loadLockState = useCallback'),
      source.indexOf('const loadProgress = useCallback'),
    );
    const accessTry = lockCheck.indexOf('try {');
    const accessCatch = lockCheck.indexOf('} catch (error) {', accessTry);
    const accessFinally = lockCheck.indexOf('} finally {', accessCatch);

    expect(lockCheck.indexOf('setIsLessonLocked(true);')).toBeLessThan(lockCheck.indexOf('(async () =>'));
    expect(accessCatch).toBeGreaterThan(accessTry);
    expect(accessFinally).toBeGreaterThan(accessCatch);
    expect(lockCheck.slice(accessCatch, accessFinally)).toContain('setIsLessonLocked(true);');
    expect(lockCheck.slice(accessCatch, accessFinally)).toContain("setLockReason('progress');");

    for (const handler of ['openLessonFromMenu', 'handleStartLesson', 'handleReplayIntroAndContinue']) {
      const start = source.indexOf(`const ${handler} = useCallback`);
      const end = source.indexOf('\n  }, [', start);
      expect(start).toBeGreaterThan(-1);
      expect(source.slice(start, end)).toContain('if (lessonLaunchBlocked) return;');
    }
  });
});
