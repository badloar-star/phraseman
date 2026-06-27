import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('achievement toast delivery contract', () => {
  it('does not mark pending achievements notified before the toast renderer displays them', () => {
    const layoutSource = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
    const flushStart = layoutSource.indexOf('const flushPending = useCallback');
    const flushEnd = layoutSource.indexOf('useEffect(() => {', flushStart + 1);
    const flushBlock = layoutSource.slice(flushStart, flushEnd);

    expect(flushStart).toBeGreaterThanOrEqual(0);
    expect(flushBlock).toContain('getPendingNotifications()');
    expect(flushBlock).toContain('showAchievementRef.current(a)');
    expect(flushBlock).not.toContain('markAchievementsNotified');
  });

  it('marks an achievement notified only from AchievementToast after overlay visibility is granted', () => {
    const toastSource = fs.readFileSync(path.join(ROOT, 'components', 'AchievementToast.tsx'), 'utf8');
    const displayStart = toastSource.indexOf('if (currentToast) {');
    const displayEnd = toastSource.indexOf('// Slide up', displayStart);
    const displayBlock = toastSource.slice(displayStart, displayEnd);

    expect(displayStart).toBeGreaterThanOrEqual(0);
    expect(displayBlock).toContain('markAchievementsNotified([currentToast.id])');
  });

  it('retries pending achievement delivery if a toast expires before getting an overlay slot', () => {
    const contextSource = fs.readFileSync(path.join(ROOT, 'components', 'AchievementContext.tsx'), 'utf8');
    const retryIdx = contextSource.indexOf("emitAppEvent('achievement_unlocked')");
    const watchdogBlock = contextSource.slice(Math.max(0, retryIdx - 400), retryIdx + 120);

    expect(retryIdx).toBeGreaterThanOrEqual(0);
    expect(contextSource).toContain("import { emitAppEvent } from '../app/events'");
    expect(watchdogBlock).toContain('dismissCurrent()');
    expect(watchdogBlock).toContain("emitAppEvent('achievement_unlocked')");
  });
});
