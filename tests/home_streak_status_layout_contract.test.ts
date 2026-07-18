import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

describe('dense home streak status layout', () => {
  const start = source.indexOf('const renderExperimentalHomeStatus = () =>');
  const end = source.indexOf('return (<BouncyScrollView', start);
  const status = source.slice(start, end);

  it('places a streak panel before the level progress panel without an avatar', () => {
    expect(status).toContain('testID="home-streak-status-panel"');
    expect(status).toContain('testID="home-level-progress-panel"');
    expect(status.indexOf('home-streak-status-panel')).toBeLessThan(status.indexOf('home-level-progress-panel'));
    expect(status).toContain('{experimentalStatusLevelLabel} {level}');
    expect(status).not.toContain('<AvatarView');
  });

  it('uses a compact seven-day grid and a thick progress bar', () => {
    expect(status).toContain('height: 18');
    expect(status).toContain('width: experimentalStatusWeekDotSize');
    expect(status).toContain('maxFontSizeMultiplier={1}');
  });

  it('keeps the streak icon unboxed with a centred count and day label below it', () => {
    const streakPanelStart = status.indexOf('testID="home-streak-status-panel"');
    const streakPanelEnd = status.indexOf('</TouchableOpacity>', streakPanelStart);
    const streakPanel = status.slice(streakPanelStart, streakPanelEnd);

    expect(streakPanel).toContain("alignItems: 'center'");
    expect(streakPanel).not.toContain('backgroundColor:');
    expect(streakPanel).toContain('{displayStreak}');
    expect(streakPanel).toContain('{homeStreakDaysLabel}');
    expect(streakPanel).not.toContain('{displayStreak} {homeStreakDaysLabel}');
  });

  it('uses a Russian day-word declension without the word "подряд"', () => {
    expect(source).toContain("? 'дней'");
    expect(source).toContain("? 'дня'");
    expect(source).toContain("ru: 'день'");
    expect(source).not.toContain("ru: 'дней подряд'");
  });

  it('reverses the status-card gradient and lightens its primary labels', () => {
    const statusCardStart = source.indexOf('testID="home-stats-card"');
    const statusCardEnd = source.indexOf('{/* Декоративные круги', statusCardStart);
    const statusCard = source.slice(statusCardStart, statusCardEnd);

    expect(statusCard).toContain('start={{ x: 1, y: 1 }}');
    expect(status).toContain("fontWeight: '800'");
  });
});
