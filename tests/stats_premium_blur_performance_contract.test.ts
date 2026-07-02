import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('stats premium lock veil performance contract', () => {
  it('uses a flat static premium placeholder instead of realtime blur or live stats data', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'StatsPremiumBlur.tsx'), 'utf8');
    const streakStats = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');
    const heatmap = fs.readFileSync(path.join(ROOT, 'components', 'ActivityHeatmap365.tsx'), 'utf8');

    expect(source).not.toContain("from 'expo-blur'");
    expect(source).not.toContain('<BlurView');
    expect(source).not.toContain('dimezisBlurView');
    expect(source).not.toContain('react-native-view-shot');
    expect(source).not.toContain('captureRef');
    expect(source).not.toContain('blurRadius');
    expect(source).not.toContain('ImageBackground');
    expect(source).not.toContain('opacity: 0.16');
    expect(source).not.toContain("'rgba(0,0,0,0.86)'");
    expect(source).toContain('function PremiumStatsPlaceholder');
    expect(source).toContain('<PremiumStatsPlaceholder snapshotKey={snapshotKey} />');
    expect(source).toContain('if (isPremium || devUnlock) return <>{children}</>;');
    expect(streakStats).toContain('snapshotKey="learningCoach"');
    // «Ритм недели» слит в «Твою неделю» (learningCoach) — отдельного weekRhythm-блюра больше нет.
    expect(streakStats).not.toContain('snapshotKey="weekRhythm"');
    expect(streakStats).toContain('snapshotKey="heatmap"');
    expect(source).not.toContain('StatsPremiumObscuredContext');
    expect(streakStats).not.toContain('SKELETON_XP');
    expect(heatmap).not.toContain('SKELETON_ACTIVITY_DAYS');
  });
});
