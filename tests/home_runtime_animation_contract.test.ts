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

  it('keeps WeeklyReviewCard activity ownership explicit', () => {
    // Карточка снята с экрана практики (редизайн «Моя практика»), но компонент
    // сохраняет контракт: активность всегда приходит явным пропом, без фоновых циклов.
    const weekly = read('app/WeeklyReviewCard.tsx');
    expect(weekly).toContain('active: boolean');
    expect(weekly).not.toContain('Animated.timing(sweep');
    expect(weekly).not.toContain('Animated.loop');
  });
});
