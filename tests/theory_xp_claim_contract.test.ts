import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

describe('theory XP claim contract', () => {
  it('hydrates the new theory claim marker before showing a claimable screen', () => {
    const source = readFileSync(join(ROOT, 'app', 'hint.tsx'), 'utf8');

    expect(source).toContain('const [claimHydrated, setClaimHydrated] = React.useState(false)');
    expect(source).toContain('if (!claimHydrated)');
    expect(source).toContain('claimInFlightRef.current');
    expect(source).toContain("(await AsyncStorage.getItem(claimStorageKey)) === '1'");
  });

  it('keeps the legacy theory XP button disabled until the marker is hydrated and blocks fast double taps', () => {
    const source = readFileSync(join(ROOT, 'app', 'lesson_help.tsx'), 'utf8');

    expect(source).toContain('const [xpClaimHydrated, setXpClaimHydrated] = useState(false)');
    expect(source).toContain('claimInFlightRef.current');
    expect(source).toContain("AsyncStorage.getItem(key).catch(() => null)) === '1'");
    expect(source).toContain('disabled={xpClaimed || !xpClaimHydrated}');
  });

  it('counts interactive theory drills in menu progress and blocks XP until all theory steps are done', () => {
    const menuSource = readFileSync(join(ROOT, 'app', 'lesson_menu.tsx'), 'utf8');
    const theorySource = readFileSync(join(ROOT, 'components', 'theory', 'TheoryLessonView.tsx'), 'utf8');

    expect(menuSource).toContain('theoryOverallProgressPct(');
    expect(menuSource).toContain('countCompletedTheoryDrills(seenProgress.drills)');
    expect(theorySource).toContain('allTheoryStepsDone');
    expect(theorySource).toContain('serializeTheorySeenProgress(seenSet, sections.length, openSet, drillProgress, drillIds.length)');
    expect(theorySource).toContain('initialProgress={drillProgress[key]}');
    expect(theorySource).toContain('onProgressChange={(state) => updateDrillProgress');
  });
});
