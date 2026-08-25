import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(
  path.join(process.cwd(), relativePath),
  'utf8',
);

describe('Arena final score wait', () => {
  test('the focused count scene uses local score, bounded beats, and existing motion policy', () => {
    const component = read('components/arena/ArenaFinalScoreCount.tsx');

    expect(component).toContain('arenaFinalScoreBeatValues');
    expect(component).toContain('useCountUp');
    expect(component).toContain('reduceMotion');
    expect(component).toContain('ArenaStarGlyph');
    expect(component).not.toMatch(/wallet|balance|starsEarned|xpEarned|reward/i);
  });

  test('the match screen replaces the finished question with local score counting', () => {
    const match = read('app/arena_match.tsx');

    expect(match).toContain('<ArenaFinalScoreCount');
    expect(match).toContain("match.state.phase === 'finished'");
    expect(match).toContain("playSound('starLand')");
  });

  test('navigation waits, while result readiness and handoff stay authoritative', () => {
    const match = read('app/arena_match.tsx');

    expect(match).toContain('pendingCoherentResultRef');
    expect(match).toContain('finalScoreReadyRef');
    expect(match.indexOf('arenaRememberResultHandoff'))
      .toBeLessThan(match.indexOf('if (!finalScoreReadyRef.current)'));
    expect(match).toContain('arenaResultHandoffReady');
    expect(match).toContain('openPreviewResult');
  });

  test('quick mode still owns its existing authoritative ResultsSequence', () => {
    expect(read('app/arena_results.tsx')).toContain('<ResultsSequence');
  });
});
