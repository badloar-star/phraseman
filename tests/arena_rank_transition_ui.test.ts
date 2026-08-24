import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Arena rank transitions on results', () => {
  it('animates all four truthful rank events', () => {
    const results = read('app/arena_results.tsx');
    expect(results).toContain("announce.rank.kind !== 'none'");
    expect(results).toContain('<ArenaRankChangeHybrid');
    expect(results).toContain('transition={announce.rank}');
  });

  it('uses current assets, deterministic particles and reduced motion', () => {
    const motion = read('components/arena/ArenaRankHybrid.tsx');
    expect(motion).toContain('ARENA_TIER_KEYS');
    expect(motion).toContain('useReduceMotion()');
    expect(motion).toContain('transition.before');
    expect(motion).toContain('transition.after');
    expect(motion).toContain('accessibilityLiveRegion="assertive"');
    expect(motion).not.toContain('Math.random');
  });
});
