import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('timed screens own their runtime work', () => {
  test('Club listeners, clocks, and modal presentation sleep with the screen', () => {
    const source = read('app/club_screen.tsx');
    expect(source).toContain('const runtimeActive = useRuntimeActive();');
    expect(source).toContain('if (!runtimeActive) return;');
    expect(source).toContain('deferredLeagueResultRef');
    expect(source).toContain('visible={runtimeActive && leagueRaceVisible && leagueChestOpenModal !== null}');
    expect(source).toContain('visible={runtimeActive}');
  });

  test('Exam derives time from a deadline and owns countdown/back work', () => {
    const source = read('app/exam.tsx');
    expect(source).toContain('const runtimeActive = useRuntimeActive();');
    expect(source).toContain('const examDeadlineRef = useRef<number | null>(null);');
    expect(source).toContain('Math.ceil((examDeadlineRef.current - Date.now()) / 1000)');
    expect(source).toContain("phase !== 'quiz' && phase !== 'review'");
    expect(source).toContain('if (!runtimeActive || Platform.OS !==');
    expect(source).not.toMatch(/setTotalTimeLeft\(.*?=>[\s\S]*?setPhase/);
  });
});
