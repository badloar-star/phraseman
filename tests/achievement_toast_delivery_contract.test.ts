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
    // Инвариант: notified проставляется ИМЕННО здесь — в рендерере, после выдачи слота
    // арбитром, а не заранее в _layout (иначе достижение «показано» без показа).
    expect(displayBlock).toContain('markAchievementsNotified(');
    // Одиночный тост гасит своё достижение, сводка — всю свёрнутую пачку (summaryIds),
    // иначе следующий flushPending поднял бы те же достижения снова.
    expect(displayBlock).toContain('currentToast.id');
    expect(displayBlock).toContain('currentToast.summaryIds');
  });

  it('collapses a burst of achievements into a single summary toast', () => {
    const contextSource = fs.readFileSync(path.join(ROOT, 'components', 'AchievementContext.tsx'), 'utf8');

    // Порог сворачивания существует и больше единицы: 1-2 достижения ещё празднуются
    // поштучно, лавина (новый аккаунт, каскад XP→уровень→достижения) — одной сводкой.
    const threshold = /TOAST_SUMMARY_THRESHOLD\s*=\s*(\d+)/.exec(contextSource);
    expect(threshold).not.toBeNull();
    expect(Number(threshold![1])).toBeGreaterThan(1);

    // Сводка несёт id всей пачки — без них рендерер не смог бы погасить её целиком.
    expect(contextSource).toContain('summaryIds');
    // Уже стоящая в очереди сводка ПОГЛОЩАЕТ следующие достижения, а не встаёт рядом.
    expect(contextSource).toContain('existingSummary');
    // У сводки нет собственной награды: XP уже начислен каждым достижением отдельно.
    expect(/xp:\s*0/.test(contextSource)).toBe(true);
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
