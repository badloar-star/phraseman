import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

describe('Home runtime animation ownership', () => {
  it('gates Home repeating motion by visible tab and foreground focus', () => {
    const source = read('app/(tabs)/home.tsx');
    expect(source).toContain('const homeRuntimeActive = useRuntimeActive(activeIdx === 0)');
    expect(source).toContain('if (!USE_ELITE_HOME_STATUS || !homeRuntimeActive)');
    expect(source).toContain('if (!homeRuntimeActive || !shouldPulse)');
    expect(source).toContain('if (!homeStatsReady || !homeRuntimeActive)');
  });

  it('passes explicit activity ownership to WeeklyReviewCard', () => {
    const trainer = read('app/trainer.tsx');
    const weekly = read('app/WeeklyReviewCard.tsx');
    expect(trainer).toContain('const trainerRuntimeActive = useRuntimeActive()');
    expect(trainer).toContain('<WeeklyReviewCard active={trainerRuntimeActive}');
    expect(weekly).toContain('active: boolean');
    expect(weekly).toContain("if (!active || reduceMotion || state?.status !== 'fresh')");
    expect(weekly).toContain('Animated.timing(sweep');
    expect(weekly).not.toContain('Animated.loop');
  });
});
