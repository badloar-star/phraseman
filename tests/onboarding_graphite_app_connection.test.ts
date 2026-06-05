const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');

describe('app theme connection', () => {
  test('compass is the default free theme wired into ThemeContext and settings', () => {
    const themeContext = fs.readFileSync(path.join(root, 'components', 'ThemeContext.tsx'), 'utf8');
    const settingsThemes = fs.readFileSync(path.join(root, 'app', 'settings_themes.tsx'), 'utf8');

    expect(themeContext).toContain("const DEFAULT_THEME_MODE: ThemeMode = 'compass'");
    expect(themeContext).toContain('useState<ThemeMode>(DEFAULT_THEME_MODE)');
    expect(themeContext).toContain('setThemeModeState(DEFAULT_THEME_MODE)');
    expect(themeContext).toContain("const PREMIUM_ONLY_THEMES: ThemeMode[] = ['dark', 'neon', 'coral']");

    const compassOption = settingsThemes.slice(
      settingsThemes.indexOf("{ mode: 'compass'"),
      settingsThemes.indexOf("\n  { mode: 'minimalLight'", settingsThemes.indexOf("{ mode: 'compass'")),
    );
    expect(compassOption).toContain("bg: '#171719'");
    expect(compassOption).toContain("accent: '#F2C48D'");
    expect(compassOption).not.toContain('premiumOnly');
  });

  test('live modal surfaces point compass to current premium assets', async () => {
    const premiumModal = fs.readFileSync(path.join(root, 'app', 'premium_modal.tsx'), 'utf8');
    const rewardBackdrop = fs.readFileSync(path.join(root, 'components', 'RewardModalBackdrop.tsx'), 'utf8');

    expect(premiumModal).toContain(
      "compass: require('../assets/images/paywalls/premium_hero/premium-hero-compass-premium.webp')",
    );
    expect(rewardBackdrop).toContain(
      "compass: require('../assets/images/reward_modals/reward-modal-compass-premium-v2.webp')",
    );
    expect(rewardBackdrop).toContain("return '#F2C48D'");
    expect(rewardBackdrop).toContain("return ['#FFD58A', '#E7B13F']");

    await expectSize('assets/images/paywalls/premium_hero/premium-hero-compass-premium.webp', 1200, 600);
    await expectSize('assets/images/reward_modals/reward-modal-compass-premium-v2.webp', 1024, 1536);
  });

  test('preload uses current compass live assets for arena actions', () => {
    const preload = fs.readFileSync(path.join(root, 'app', 'image_preload.ts'), 'utf8');

    expect(preload).toContain('arena-action-match-compass-premium-session.webp');
    expect(preload).toContain('arena-action-friend-compass-premium-session.webp');
    expect(preload).toContain('arena-action-throne-compass-premium-session.webp');
    expect(preload).not.toContain('arena-action-match-onboarding-graphite.webp');
  });

  test('arena lobby points compass to current stage and ticket assets', async () => {
    const arenaLobby = fs.readFileSync(path.join(root, 'app', 'arena_lobby.tsx'), 'utf8');

    expect(arenaLobby).toContain(
      "compass: require('../assets/images/arena/knowledge-arena-compass-premium-session.webp')",
    );
    expect(arenaLobby).toContain(
      "compass: require('../assets/images/arena_tickets/ticket-compass-premium-session.webp')",
    );
    expect(arenaLobby).not.toContain('knowledge-arena-onboarding-graphite.webp');
    expect(arenaLobby).not.toContain('ticket-onboarding-graphite.webp');

    await expectSize('assets/images/arena/knowledge-arena-compass-premium-session.webp', 720, 520);
    await expectSize('assets/images/arena_tickets/ticket-compass-premium-session.webp', 512, 320);
  });

  test('home streak week markers use programmatic fills and one freeze overlay', () => {
    const home = fs.readFileSync(path.join(root, 'app', '(tabs)', 'home.tsx'), 'utf8');

    expect(home).toContain("require('../../assets/images/streak_overlays/streak-freeze-ice.png')");
    expect(home).toContain("if (marker === 'revive' || marker === 'repair' || weekDone[index]) return t.correct");
    expect(home).toContain("marker === 'freeze'");
    expect(home).not.toContain('assets/images/streak_week_markers/');
    expect(home).not.toContain('streak-week-minimalDark-');
  });

  test('first lesson sheet keeps separate minimalDark and compass chrome', () => {
    const layout = fs.readFileSync(path.join(root, 'app', '_layout.tsx'), 'utf8');

    expect(layout).toContain("minimalDark: '#6EA8FF'");
    expect(layout).toContain("minimalDark: ['#D7E7FF', '#6EA8FF']");
    expect(layout).toContain("compass: '#F2C48D'");
    expect(layout).toContain("compass: ['#FFD58A', '#E7B13F']");
  });

  test('no energy modal compass chrome uses compact warm palette', () => {
    const modal = fs.readFileSync(path.join(root, 'components', 'NoEnergyModal.tsx'), 'utf8');
    const chromeStart = modal.indexOf('const NO_ENERGY_MODAL_CHROME');
    const compassStart = modal.indexOf('  compass: {', chromeStart);
    const compassEnd = modal.indexOf('  },', compassStart);
    const compassBlock = modal.slice(compassStart, compassEnd);

    expect(compassBlock).toContain("glow: '#F2C48D'");
    expect(compassBlock).toContain("borderColor: 'rgba(242,196,141,0.34)'");
    expect(compassBlock).toContain("titleColor: '#FFF8E8'");
    expect(compassBlock).toContain("subtitleColor: '#D8D2C8'");
    expect(modal).toContain("const isCompassTheme = themeMode === 'compass'");
    expect(modal).toContain('const modalRadius = isCompassTheme ? 10');
    expect(modal).toContain('const buttonRadius = isCompassTheme ? 9');
  });

  test('daily task reward toast compass uses warm chrome', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'DailyTaskRewardToast.tsx'), 'utf8');
    const stylesStart = source.indexOf('export const DAILY_TASK_REWARD_TOAST_THEME_STYLES');
    const compassStart = source.indexOf('  compass: {', stylesStart);
    const compassEnd = source.indexOf('  },', compassStart);
    const block = source.slice(compassStart, compassEnd);

    expect(block).toContain("accentRailColor: '#F2C48D'");
    expect(block).toContain("borderColor: 'rgba(242,196,141,0.30)'");
    expect(block).toContain('radius: 8');
    expect(block).toContain("claimBg: '#E7B13F'");
    expect(block).toContain("claimText: '#151008'");
  });

  test('medal toast compass uses current warm tier chrome', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'medalToastThemeStyles.ts'), 'utf8');
    const stylesStart = source.indexOf('export const MEDAL_TOAST_THEME_STYLES');
    const compassStart = source.indexOf('  compass: {', stylesStart);
    const nextThemeStart = source.indexOf('  dark: {', compassStart);
    const block = source.slice(compassStart, nextThemeStart);

    expect(block).toContain("signature: 'compass-onboarding-warm'");
    expect(block).toContain("borderColor: 'rgba(242,196,141,0.28)'");
    expect(block).toContain("surfaceAccent: '#F2C48D'");
    expect(block).toContain("bronze: '#F2C48D'");
    expect(block).toContain("silver: '#8FEFE1'");
  });

  test('premium comparison column uses compass accent only for compass', () => {
    const source = fs.readFileSync(path.join(root, 'app', 'premium_modal.tsx'), 'utf8');

    expect(source).toContain("const PAYWALL_COMPARISON_PREMIUM_COLOR = '#6EA8FF'");
    expect(source).toContain("themeMode === 'compass' ? '#F2C48D' : PAYWALL_COMPARISON_PREMIUM_COLOR");
    expect(source).toContain('color: paywallComparisonPremiumColor');
  });

  test('friend gift sent receipt has compass chrome', () => {
    const source = fs.readFileSync(path.join(root, 'app', '(tabs)', 'friends.tsx'), 'utf8');
    const chromeStart = source.indexOf("const sentGiftChrome = themeMode === 'compass'");
    const fallbackStart = source.indexOf('    : {', chromeStart);
    const compassBlock = source.slice(chromeStart, fallbackStart);
    const modalStart = source.indexOf('testID="friend-gift-sent-card"');
    const modalEnd = source.indexOf('testID="friend-gift-received-card"', modalStart);
    const modalBlock = source.slice(modalStart, modalEnd);

    expect(compassBlock).toContain("shadowColor: '#F2C48D'");
    expect(compassBlock).toContain("iconColors: ['#FFF0D2', '#F2C48D', '#B4774E']");
    expect(compassBlock).toContain('shellRadius: 8');
    expect(compassBlock).toContain('iconRadius: 8');
    expect(compassBlock).toContain("buttonBg: '#F4B978'");
    expect(modalBlock).toContain('colors={sentGiftChrome.shellColors}');
    expect(modalBlock).toContain('shadowColor: sentGiftChrome.shadowColor');
    expect(modalBlock).toContain('backgroundColor: sentGiftChrome.buttonBg');
  });

  test('lessons tab compass palettes use current warm tones', () => {
    const source = fs.readFileSync(path.join(root, 'app', '(tabs)', 'lessons.tsx'), 'utf8');
    const lessonStart = source.indexOf('const LESSON_LEVEL_PALETTES');
    const lessonCompassStart = source.indexOf('    compass: {', lessonStart);
    const lessonCompassEnd = source.indexOf('    },', lessonCompassStart);
    const lessonBlock = source.slice(lessonCompassStart, lessonCompassEnd);
    const examStart = source.indexOf('const EXAM_META_BY_THEME');
    const examCompassStart = source.indexOf('    compass: {', examStart);
    const examCompassEnd = source.indexOf('    },', examCompassStart);
    const examBlock = source.slice(examCompassStart, examCompassEnd);

    expect(lessonBlock).toContain("A1: '#F2C48D'");
    expect(lessonBlock).toContain("A2: '#F2C48D'");
    expect(lessonBlock).toContain("B1: '#F2C48D'");
    expect(lessonBlock).toContain("B2: '#F2C48D'");
    expect(examBlock).toContain("A1: { bg: '#1F1F21', accent: '#F2C48D'");
    expect(examBlock).toContain("A2: { bg: '#172523', accent: '#F2C48D'");
  });

  test('flashcard pack paywall compass uses current warm shell', () => {
    const source = fs.readFileSync(path.join(root, 'app', 'flashcards', 'cardPackPaywallTheme.ts'), 'utf8');
    const shellStart = source.indexOf('function shellOnboardingGraphite()');
    const shellEnd = source.indexOf('/** CORAL:', shellStart);
    const shellBlock = source.slice(shellStart, shellEnd);
    const mapStart = source.indexOf('const SHELL: Record<ThemeMode, CardPackPaywallTheme>');
    const mapEnd = source.indexOf('};', mapStart);
    const mapBlock = source.slice(mapStart, mapEnd);

    expect(shellBlock).toContain("backdropBase: 'rgba(2,3,4,0.90)'");
    expect(shellBlock).toContain("'rgba(242,196,141,0.22)'");
    expect(shellBlock).toContain("iconBg: ['#1F1F21', '#171719']");
    expect(shellBlock).toContain("ctaColors: ['#FFD58A', '#E7B13F']");
    expect(mapBlock).toContain('compass: shellOnboardingGraphite()');
    expect(mapBlock).toContain('minimalDark: shellDark()');
  });

  test('lingman youtube chrome compass uses current warm shell', () => {
    const source = fs.readFileSync(path.join(root, 'app', 'lingman_youtube_chrome.ts'), 'utf8');
    const compassStart = source.indexOf("if (themeMode === 'compass')");
    const compassEnd = source.indexOf('  const accent =', compassStart);
    const block = source.slice(compassStart, compassEnd);

    expect(block).toContain("accent: '#F2C48D'");
    expect(block).toContain("actionText: '#151008'");
    expect(block).toContain("cardBg: 'rgba(23,20,16,0.90)'");
    expect(block).toContain("cardBorder: 'rgba(242,196,141,0.18)'");
    expect(block).toContain("quietButtonBg: 'rgba(242,196,141,0.08)'");
    expect(block).toContain("noticeBorder: 'rgba(242,196,141,0.24)'");
  });
});

async function expectSize(relativePath: string, width: number, height: number, format = 'webp') {
  const metadata = await sharp(path.join(root, relativePath)).metadata();
  expect(metadata.format).toBe(format);
  expect(metadata.width).toBe(width);
  expect(metadata.height).toBe(height);
}
