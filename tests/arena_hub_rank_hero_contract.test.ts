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
    expect(source).toContain('shield: { width: 210, height: 224 }');
    expect(source).toContain("arenaText(lang, 'rankNext')");
    expect(source).not.toContain('<V2Card');
    expect(source).not.toContain("from '../ui/v2_ui'");
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

  it('shows progress once on entry, pulses slowly, then fades it away', () => {
    const source = read('components/arena/ArenaHubSummary.tsx');
    expect(source).toContain('if (!active || !rankKnown)');
    expect(source).toContain('withDelay(2600, withTiming(0, { duration: 1000, easing }))');
    expect(source).toContain('withTiming(1.045, { duration: 1800, easing })');
    expect(source).toContain('withTiming(1, { duration: 1800, easing })');
    expect(source).toContain('opacity: progressOpacity.value');
    expect(source).toContain('transform: [{ scale: progressScale.value }]');
    expect(source).toContain('cancelAnimation(progressOpacity)');
    expect(source).toContain('cancelAnimation(progressScale)');
  });

  it('receives the existing runtime and reduced-motion state from the hub', () => {
    const source = read('components/arena/ArenaHubSurface.tsx');
    expect(source).toContain('<ArenaHubSummary model={hub} active={active} reduceMotion={reduceMotion} />');
  });

  it('reserves the full hero geometry in the loading skeleton', () => {
    const source = read('components/arena/ArenaHubSkeleton.tsx');
    expect(source).toContain('styles.rankHero');
    expect(source).toContain('styles.rankShield');
    expect(source).toContain('width={210}');
    expect(source).toContain('height={224}');
    expect(source).not.toContain('styles.rankCard');
    expect(source).not.toContain('styles.rankHead');
  });
});
