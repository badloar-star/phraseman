import fs from 'fs';
import path from 'path';

describe('daily task progress fill layering', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'daily_tasks_screen.tsx'), 'utf8');

  it('keeps the progress fill above artwork without a baseline color wash', () => {
    const fill = source.indexOf('dailyTaskStyles.taskCapsuleFill');
    const artwork = source.indexOf('dailyTaskStyles.taskPortalArt');

    expect(fill).toBeGreaterThan(-1);
    expect(artwork).toBeGreaterThan(-1);
    expect(artwork).toBeLessThan(fill);
    expect(source).not.toContain('dailyTaskStyles.taskCapsuleGlow');
  });

  it('uses a full-width end constraint for completed cards', () => {
    expect(source).toMatch(/const taskFillSizeStyle = completed \|\| claimed[\s\S]*?\{ right: 0 \}/);
  });

  it('does not pre-fill an untouched card behind its icon', () => {
    expect(source).toContain('iconStyle={dailyTaskStyles.taskPortalIcon}');
    expect(source).not.toContain('iconStyle={[dailyTaskStyles.taskPortalIcon, { backgroundColor: dailyTaskAccentAlpha(taskAccent, 0.10) }]}');
  });
});
