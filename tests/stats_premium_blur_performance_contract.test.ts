import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('stats premium blur performance contract', () => {
  it('uses a pre-blurred static snapshot instead of realtime blur or live stats data', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'StatsPremiumBlur.tsx'), 'utf8');
    const streakStats = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');
    const heatmap = fs.readFileSync(path.join(ROOT, 'components', 'ActivityHeatmap365.tsx'), 'utf8');

    expect(source).not.toContain("from 'expo-blur'");
    expect(source).not.toContain('<BlurView');
    expect(source).not.toContain('dimezisBlurView');
    expect(source).not.toContain('opacity: 0.16');
    expect(source).not.toContain("'rgba(0,0,0,0.86)'");
    expect(source).toContain('ImageBackground');
    expect(source).toContain('resizeMode="stretch"');
    expect(source).toContain('premium-learning-coach-snapshot-blurred.webp');
    expect(source).toContain('premium-week-rhythm-snapshot-blurred.webp');
    expect(source).toContain('premium-heatmap-snapshot-blurred.webp');
    expect(streakStats).toContain('snapshotKey="learningCoach"');
    expect(streakStats).toContain('snapshotKey="weekRhythm"');
    expect(streakStats).toContain('snapshotKey="heatmap"');
    expect(source).not.toContain('StatsPremiumObscuredContext');
    expect(streakStats).not.toContain('SKELETON_XP');
    expect(heatmap).not.toContain('SKELETON_ACTIVITY_DAYS');
  });
});
