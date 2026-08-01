import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

describe('dense home streak status layout', () => {
  // зачем: якорь на фактическое имя герой-модуля. Прежний якорь указывал на
  // переименованную функцию, срез выходил пустым и весь набор проверок молчал.
  const start = source.indexOf('const renderHomeHeroStatus = () =>');
  const end = source.indexOf('return (<BouncyScrollView', start);
  const status = source.slice(start, end);

  it('anchors on the real hero status block', () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
  });

  // зачем: владелец вернул раскладку «аватар слева, серия справа сверху».
  it('places the avatar before the level progress panel', () => {
    expect(status).toContain('testID="home-hero-avatar-button"');
    expect(status).toContain('testID="home-level-progress-panel"');
    expect(status).toContain('<AvatarView');
    expect(status.indexOf('home-hero-avatar-button')).toBeLessThan(status.indexOf('home-level-progress-panel'));
    expect(status).toContain('{experimentalStatusLevelLabel} {level}');
  });

  it('keeps the streak inline on the level row, to the right of the level label', () => {
    expect(status).toContain('testID="home-streak-status-panel"');
    expect(status.indexOf('{experimentalStatusLevelLabel} {level}')).toBeLessThan(status.indexOf('home-streak-status-panel'));
    expect(status.indexOf('home-level-progress-panel')).toBeLessThan(status.indexOf('home-streak-status-panel'));
  });

  it('uses a compact seven-day grid and a thick progress bar', () => {
    expect(status).toContain('height: 18');
    expect(status).toContain('width: experimentalStatusWeekDotSize');
    expect(status).toContain('maxFontSizeMultiplier={1}');
  });

  // зачем: вариант B — ряд дней вынесен из правой колонки на всю ширину карточки,
  // иначе он прижимается вправо под аватаром и выглядит несимметрично.
  it('renders the week row full width, outside the level progress panel', () => {
    const weekRow = status.indexOf('testID="home-week-days-row"');
    const levelPanel = status.indexOf('testID="home-level-progress-panel"');

    expect(weekRow).toBeGreaterThan(-1);
    expect(weekRow).toBeGreaterThan(levelPanel);

    const levelPanelBlock = status.slice(levelPanel, weekRow);
    expect(levelPanelBlock).not.toContain('weekDays.map');
  });

  it('keeps the streak icon unboxed with the count and day label beside it', () => {
    const streakPanelStart = status.indexOf('testID="home-streak-status-panel"');
    const streakPanelEnd = status.indexOf('</TouchableOpacity>', streakPanelStart);
    const streakPanel = status.slice(streakPanelStart, streakPanelEnd);

    expect(streakPanel).toContain("flexDirection: 'row'");
    expect(streakPanel).not.toContain('backgroundColor:');
    expect(streakPanel).toContain('{displayStreak}');
    expect(streakPanel).toContain('{homeStreakDaysLabel}');
    expect(streakPanel).not.toContain('{displayStreak} {homeStreakDaysLabel}');
  });

  // зачем: аватар в карточке открывает кастомизацию внешнего вида; карточка
  // профиля осталась за бюстом в верхнем хедере. Две цели легко перепутать
  // при рефакторинге, поэтому разделение зафиксировано тестом.
  it('opens avatar customization from the hero avatar, not the profile card', () => {
    const avatarStart = status.indexOf('testID="home-hero-avatar-button"');
    const avatarEnd = status.indexOf('</TouchableOpacity>', avatarStart);
    const avatarButton = status.slice(avatarStart, avatarEnd);

    expect(avatarButton).toContain("nav.push('/avatar_select')");
    expect(avatarButton).not.toContain('openHomeProfile()');
    expect(avatarButton).not.toContain("nav.push('/streak_stats')");
    expect(avatarButton).toContain('accessibilityLabel');
  });

  it('keeps the profile card reachable from the header bust button', () => {
    expect(source).toContain('testID="home-profile-card-button"');
    const bustStart = source.indexOf('testID="home-profile-card-button"');
    const bustEnd = source.indexOf('</TouchableOpacity>', bustStart);
    expect(source.slice(bustStart, bustEnd)).toContain('openHomeProfile');
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
