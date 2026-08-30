import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Arena hub floating rank hero', () => {
  it('renders the shield, three-star progress and no old stats grid', () => {
    const source = read('components/arena/ArenaHubSummary.tsx');
    expect(source).toContain('arenaRankShieldAsset');
    expect(source).toContain('<ArenaRankStars');
    expect(source).toContain('size={38}');
    expect(source).toContain("arenaText(lang, 'rankNext')");
    expect(source).not.toContain("arenaText(lang, 'wins')");
    expect(source).not.toContain("arenaText(lang, 'losses')");
    expect(source).not.toContain("arenaText(lang, 'streakLabel')");
  });

  it('runs transform-only motion only while active and motion is allowed', () => {
    const source = read('components/arena/ArenaHubSummary.tsx');
    expect(source).toContain('if (!active || reduceMotion)');
    expect(source).toContain('withRepeat(');
    expect(source).toContain('cancelAnimation(shieldY)');
    expect(source).toContain('cancelAnimation(starsY)');
    expect(source).toContain('translateY: shieldY.value');
    expect(source).toContain('translateY: starsY.value');
    expect(source).not.toMatch(/withTiming\([^\n]*(width|height|top|left)/);
  });

  it('receives the existing runtime and reduced-motion state from the hub', () => {
    const source = read('components/arena/ArenaHubSurface.tsx');
    expect(source).toContain('<ArenaHubSummary model={hub} active={active} reduceMotion={reduceMotion} />');
  });
});
