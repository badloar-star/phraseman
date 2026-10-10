import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

describe('screen wall-clock ownership', () => {
  it('keeps diagnostic timeout absolute, visible-only, and exactly once', () => {
    const source = read('app/diagnostic_test.tsx');
    expect(source).not.toContain('setInterval(');
    expect(source).toContain('const diagnosticRuntimeActive = useRuntimeActive()');
    expect(source).toContain('questionDeadlineAtRef.current = Date.now() + TIMER_SEC * 1000');
    expect(source).toContain('timerAnim.stopAnimation()');
    expect(source).toContain('duration: remainingMs');
    expect(source).toContain('Math.min(TIMER_SEC * 1000, questionDeadlineAtRef.current - diagnosticNow)');
    expect(source).toContain('if (remainingMs <= 0 && !timeUpFired.current)');
    expect(source).toContain('questionDeadlineAtRef.current = 0');
  });

  it('publishes a fresh wall time immediately after runtime activation', () => {
    const source = read('hooks/use_visible_wall_clock.ts');
    expect(source).toContain('let lastPublishedAt: number | null = null');
    expect(source).toContain('lastPublishedAt !== null && nextNow - lastPublishedAt < cadenceMs');
  });

  // снято 10.10: таблица лидеров Арены удалена (D74/D83), таймеров XP-бустов в 2.0 нет
});
