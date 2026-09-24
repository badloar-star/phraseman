import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

// PM-053: тост «Достижение разблокировано» удалён целиком (владелец — «тосты
// тосты тосты достижений»). Этот файл раньше сторожил его доставку; теперь
// сторожит ОТСУТСТВИЕ тоста/хоста/очереди показа и то, что pending-достижения
// больше не копятся durable-долгом на показ (правило «празднование не ставится
// в durable-очередь»: награда (XP) уже начислена в achievements.ts в момент
// разблокировки, независимо от notified — flushPending лишь гасит долг).
describe('achievement toast removal contract (PM-053)', () => {
  it('AchievementToast/AchievementContext components are deleted', () => {
    expect(fs.existsSync(path.join(ROOT, 'components', 'AchievementToast.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'components', 'AchievementContext.tsx'))).toBe(false);
  });

  it('app/_layout.tsx no longer mounts the achievement toast host/provider', () => {
    const layoutSource = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
    expect(layoutSource).not.toContain('AchievementProvider');
    expect(layoutSource).not.toContain('AchievementToast');
    expect(layoutSource).not.toContain('useAchievement');
    expect(layoutSource).not.toContain("from '../components/AchievementContext'");
  });

  it('flushPending consumes pending notifications without a toast queue (no durable show-debt)', () => {
    const layoutSource = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
    const flushStart = layoutSource.indexOf('const flushPending = useCallback');
    const flushEnd = layoutSource.indexOf('useEffect(() => {', flushStart + 1);
    const flushBlock = layoutSource.slice(flushStart, flushEnd);

    expect(flushStart).toBeGreaterThanOrEqual(0);
    expect(flushBlock).toContain('getPendingNotifications()');
    // Долг «непоказанный тост» гасится сразу, а не копится: показа больше нет,
    // но и вечно висящей pending-записи тоже быть не должно.
    expect(flushBlock).toContain('markAchievementsNotified(');
    expect(flushBlock).not.toContain('showAchievementRef');
  });

  it('achievement reward (XP) is granted at unlock time, independent of the notified/toast flag', () => {
    const achievementsSource = fs.readFileSync(path.join(ROOT, 'app', 'achievements.ts'), 'utf8');
    // registerXP вызывается в блоке разблокировки (justUnlocked), а не в ветке,
    // завязанной на notified/показ — удаление тоста не должно унести награду.
    const rewardIdx = achievementsSource.indexOf('for (const ach of justUnlocked)');
    expect(rewardIdx).toBeGreaterThanOrEqual(0);
    const rewardBlock = achievementsSource.slice(rewardIdx, rewardIdx + 700);
    expect(rewardBlock).toContain('registerXP(');
    expect(rewardBlock).not.toContain('.notified');
  });
});
