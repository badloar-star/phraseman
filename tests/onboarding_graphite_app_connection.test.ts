const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');

describe('onboarding graphite app theme connection', () => {
  test('minimalDark is the default free theme wired into ThemeContext and settings', () => {
    const themeContext = fs.readFileSync(path.join(root, 'components', 'ThemeContext.tsx'), 'utf8');
    const settingsThemes = fs.readFileSync(path.join(root, 'app', 'settings_themes.tsx'), 'utf8');

    expect(themeContext).toContain("useState<ThemeMode>('minimalDark')");
    expect(themeContext).toContain("const defaultThemeMode: ThemeMode = 'minimalDark'");
    expect(themeContext).toContain("setThemeModeState('minimalDark')");
    expect(themeContext).toContain("const PREMIUM_ONLY_THEMES: ThemeMode[] = ['dark', 'neon', 'coral']");

    const minimalDarkOption = settingsThemes.slice(
      settingsThemes.indexOf("{ mode: 'minimalDark'"),
      settingsThemes.indexOf("{ mode: 'minimalLight'"),
    );
    expect(minimalDarkOption).toContain("bg: '#020304'");
    expect(minimalDarkOption).toContain("accent: '#F2B84B'");
    expect(minimalDarkOption).not.toContain('premiumOnly');
  });

  test('live modal surfaces point minimalDark to onboarding-graphite assets', async () => {
    const premiumModal = fs.readFileSync(path.join(root, 'app', 'premium_modal.tsx'), 'utf8');
    const rewardBackdrop = fs.readFileSync(path.join(root, 'components', 'RewardModalBackdrop.tsx'), 'utf8');

    expect(premiumModal).toContain(
      "minimalDark: require('../assets/images/paywalls/premium_hero/premium-hero-onboarding-graphite.webp')",
    );
    expect(rewardBackdrop).toContain(
      "minimalDark: require('../assets/images/reward_modals/reward-modal-onboarding-graphite.webp')",
    );
    expect(rewardBackdrop).toContain("return '#F2B84B'");
    expect(rewardBackdrop).toContain("return ['#FFF1B8', '#F2B84B']");

    await expectSize('assets/images/paywalls/premium_hero/premium-hero-onboarding-graphite.webp', 1200, 600);
    await expectSize('assets/images/reward_modals/reward-modal-onboarding-graphite.webp', 1024, 1536);
  });

  test('preload uses current onboarding graphite live assets for minimalDark arena actions', () => {
    const preload = fs.readFileSync(path.join(root, 'app', 'image_preload.ts'), 'utf8');

    expect(preload).toContain('arena-action-match-onboarding-graphite.webp');
    expect(preload).toContain('arena-action-friend-onboarding-graphite.webp');
    expect(preload).toContain('arena-action-throne-onboarding-graphite.webp');
    expect(preload).not.toContain('arena-action-match-minimalDark.webp');
  });

  test('arena lobby points minimalDark to onboarding-graphite stage and ticket assets', async () => {
    const arenaLobby = fs.readFileSync(path.join(root, 'app', 'arena_lobby.tsx'), 'utf8');

    expect(arenaLobby).toContain(
      "minimalDark: require('../assets/images/arena/knowledge-arena-onboarding-graphite.webp')",
    );
    expect(arenaLobby).toContain(
      "minimalDark: require('../assets/images/arena_tickets/ticket-onboarding-graphite.webp')",
    );
    expect(arenaLobby).not.toContain('knowledge-arena-minimal-dark.webp');
    expect(arenaLobby).not.toContain('ticket-minimal-dark.webp');

    await expectSize('assets/images/arena/knowledge-arena-onboarding-graphite.webp', 1536, 864);
    await expectSize('assets/images/arena_tickets/ticket-onboarding-graphite.webp', 396, 288);
  });

  test('home streak week markers point minimalDark to onboarding-graphite PNG assets', async () => {
    const home = fs.readFileSync(path.join(root, 'app', '(tabs)', 'home.tsx'), 'utf8');

    for (const kind of ['freeze', 'revive', 'repair']) {
      expect(home).toContain(
        `../../assets/images/streak_week_markers/onboarding-graphite/streak-week-onboarding-graphite-${kind}.png`,
      );
      expect(home).not.toContain(`streak-week-minimalDark-${kind}.png`);
      await expectSize(
        `assets/images/streak_week_markers/onboarding-graphite/streak-week-onboarding-graphite-${kind}.png`,
        724,
        724,
        'png',
      );
    }
  });

  test('first lesson sheet minimalDark chrome uses onboarding graphite amber palette', () => {
    const layout = fs.readFileSync(path.join(root, 'app', '_layout.tsx'), 'utf8');

    expect(layout).toContain("minimalDark: 'rgba(7,6,4,0.54)'");
    expect(layout).toContain("minimalDark: '#FFF8E8'");
    expect(layout).toContain("minimalDark: '#E7D4A4'");
    expect(layout).toContain("minimalDark: '#BBA46F'");
    expect(layout).toContain("minimalDark: 'rgba(242,184,75,0.28)'");
    expect(layout).toContain("minimalDark: ['#FFF1B8', '#F2B84B']");
    expect(layout).toContain("minimalDark: '#F2B84B'");
  });

  test('no energy modal minimalDark chrome uses onboarding graphite palette and square radius', () => {
    const modal = fs.readFileSync(path.join(root, 'components', 'NoEnergyModal.tsx'), 'utf8');
    const chromeStart = modal.indexOf('const NO_ENERGY_MODAL_CHROME');
    const minimalStart = modal.indexOf('  minimalDark: {', chromeStart);
    const minimalEnd = modal.indexOf('  },', minimalStart);
    const minimalBlock = modal.slice(minimalStart, minimalEnd);

    expect(minimalBlock).toContain("glow: '#F2B84B'");
    expect(minimalBlock).toContain("borderColor: 'rgba(242,184,75,0.34)'");
    expect(minimalBlock).toContain("cardGlowColors: ['rgba(242,184,75,0.24)', 'rgba(255,241,184,0.08)', 'transparent']");
    expect(minimalBlock).toContain("titleColor: '#FFF8E8'");
    expect(minimalBlock).toContain("subtitleColor: '#E7D4A4'");
    expect(minimalBlock).not.toContain('#6EA8FF');
    expect(minimalBlock).not.toContain('#9FC6FF');

    expect(modal).toContain("const graphiteRadius = themeMode === 'minimalDark'");
    expect(modal).toContain('borderRadius: graphiteRadius ? 8 : 22');
    expect(modal).toContain('borderRadius: graphiteRadius ? 6 : 14');
  });

  test('daily task reward toast minimalDark uses onboarding graphite chrome', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'DailyTaskRewardToast.tsx'), 'utf8');
    const stylesStart = source.indexOf('export const DAILY_TASK_REWARD_TOAST_THEME_STYLES');
    const minimalStart = source.indexOf('  minimalDark: {', stylesStart);
    const minimalEnd = source.indexOf('  },', minimalStart);
    const block = source.slice(minimalStart, minimalEnd);

    expect(block).toContain("cardColors: ['#171410', '#070706']");
    expect(block).toContain("accentRailColor: '#F2B84B'");
    expect(block).toContain("borderColor: 'rgba(242,184,75,0.34)'");
    expect(block).toContain('radius: 8');
    expect(block).toContain("iconColor: '#FFF1B8'");
    expect(block).toContain("claimBg: '#F2B84B'");
    expect(block).toContain("claimText: '#151008'");
    expect(block).not.toContain('#6EA8FF');
    expect(block).not.toContain('#89BAFF');
  });

  test('medal toast minimalDark uses onboarding graphite amber tier chrome', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'medalToastThemeStyles.ts'), 'utf8');
    const stylesStart = source.indexOf('export const MEDAL_TOAST_THEME_STYLES');
    const minimalStart = source.indexOf('  minimalDark: {', stylesStart);
    const nextThemeStart = source.indexOf('  dark: {', minimalStart);
    const block = source.slice(minimalStart, nextThemeStart);

    expect(block).toContain("signature: 'onboarding-graphite-amber'");
    expect(block).toContain("cardBgColors: ['rgba(23,20,16,0.97)', 'rgba(5,5,4,0.97)']");
    expect(block).toContain("borderColor: 'rgba(242,184,75,0.28)'");
    expect(block).toContain("surfaceAccent: '#F2B84B'");
    expect(block).toContain("silver: '#FFF1B8'");
    expect(block).toContain("gold: '#F2B84B'");
    expect(block).not.toContain('#72D8FF');
    expect(block).not.toContain('#9CA3AF');
  });

  test('premium comparison column uses onboarding graphite accent for minimalDark only', () => {
    const source = fs.readFileSync(path.join(root, 'app', 'premium_modal.tsx'), 'utf8');

    expect(source).toContain("const PAYWALL_COMPARISON_PREMIUM_COLOR = '#6EA8FF'");
    expect(source).toContain("themeMode === 'minimalDark' ? '#F2B84B' : PAYWALL_COMPARISON_PREMIUM_COLOR");
    expect(source).toContain('color: paywallComparisonPremiumColor');
  });

  test('friend gift sent receipt has onboarding graphite chrome for minimalDark', () => {
    const source = fs.readFileSync(path.join(root, 'app', '(tabs)', 'friends.tsx'), 'utf8');
    const chromeStart = source.indexOf("const sentGiftChrome = themeMode === 'minimalDark'");
    const fallbackStart = source.indexOf('    : {', chromeStart);
    const minimalBlock = source.slice(chromeStart, fallbackStart);
    const modalStart = source.indexOf('testID="friend-gift-sent-card"');
    const modalEnd = source.indexOf('testID="friend-gift-received-card"', modalStart);
    const modalBlock = source.slice(modalStart, modalEnd);

    expect(minimalBlock).toContain("shadowColor: '#F2B84B'");
    expect(minimalBlock).toContain("iconColors: ['#FFF1B8', '#F2B84B', '#BBA46F']");
    expect(minimalBlock).toContain('shellRadius: 8');
    expect(minimalBlock).toContain('iconRadius: 8');
    expect(minimalBlock).toContain("buttonBg: '#F2B84B'");
    expect(minimalBlock).not.toContain('#6EA8FF');
    expect(minimalBlock).not.toContain('#9FC4FF');
    expect(modalBlock).toContain('colors={sentGiftChrome.shellColors}');
    expect(modalBlock).toContain('shadowColor: sentGiftChrome.shadowColor');
    expect(modalBlock).toContain('backgroundColor: sentGiftChrome.buttonBg');
  });

  test('lessons tab minimalDark palettes use onboarding graphite amber tones', () => {
    const source = fs.readFileSync(path.join(root, 'app', '(tabs)', 'lessons.tsx'), 'utf8');
    const lessonStart = source.indexOf('const LESSON_LEVEL_PALETTES');
    const lessonMinimalStart = source.indexOf('    minimalDark: {', lessonStart);
    const lessonMinimalEnd = source.indexOf('    },', lessonMinimalStart);
    const lessonBlock = source.slice(lessonMinimalStart, lessonMinimalEnd);
    const examStart = source.indexOf('const EXAM_META_BY_THEME');
    const examMinimalStart = source.indexOf('    minimalDark: {', examStart);
    const examMinimalEnd = source.indexOf('    },', examMinimalStart);
    const examBlock = source.slice(examMinimalStart, examMinimalEnd);

    expect(lessonBlock).toContain("A1: '#FFF1B8'");
    expect(lessonBlock).toContain("A2: '#F2B84B'");
    expect(lessonBlock).toContain("B1: '#BBA46F'");
    expect(lessonBlock).toContain("B2: '#E4A936'");
    expect(examBlock).toContain("A1: { bg: '#171410', accent: '#FFF1B8'");
    expect(examBlock).toContain("A2: { bg: '#1C1710', accent: '#F2B84B'");
    expect(examBlock).toContain("B1: { bg: '#15120D', accent: '#BBA46F'");
    expect(examBlock).toContain("B2: { bg: '#21180B', accent: '#E4A936'");
    expect(`${lessonBlock}\n${examBlock}`).not.toContain('#A9B8D0');
    expect(`${lessonBlock}\n${examBlock}`).not.toContain('#DFE8F7');
  });

  test('flashcard pack paywall minimalDark uses onboarding graphite shell', () => {
    const source = fs.readFileSync(path.join(root, 'app', 'flashcards', 'cardPackPaywallTheme.ts'), 'utf8');
    const shellStart = source.indexOf('function shellOnboardingGraphite()');
    const shellEnd = source.indexOf('/** NEON:', shellStart);
    const shellBlock = source.slice(shellStart, shellEnd);
    const mapStart = source.indexOf('const SHELL: Record<ThemeMode, CardPackPaywallTheme>');
    const mapEnd = source.indexOf('};', mapStart);
    const mapBlock = source.slice(mapStart, mapEnd);

    expect(shellBlock).toContain("backdropBase: 'rgba(2,3,4,0.90)'");
    expect(shellBlock).toContain("'rgba(242,184,75,0.26)'");
    expect(shellBlock).toContain("iconBg: ['#171410', '#090806']");
    expect(shellBlock).toContain("ctaColors: ['#FFF1B8', '#F2B84B']");
    expect(shellBlock).toContain("goShopCta: ['#F2B84B', '#BBA46F']");
    expect(mapBlock).toContain('minimalDark: shellOnboardingGraphite()');
    expect(mapBlock).not.toContain('minimalDark: shellDark()');
  });

  test('lingman youtube chrome minimalDark uses onboarding graphite amber shell', () => {
    const source = fs.readFileSync(path.join(root, 'app', 'lingman_youtube_chrome.ts'), 'utf8');
    const minimalStart = source.indexOf("if (themeMode === 'minimalDark')");
    const minimalEnd = source.indexOf('  const accent =', minimalStart);
    const block = source.slice(minimalStart, minimalEnd);

    expect(block).toContain("accent: '#F2B84B'");
    expect(block).toContain("actionText: '#151008'");
    expect(block).toContain("cardBg: 'rgba(17,16,12,0.90)'");
    expect(block).toContain("cardBorder: 'rgba(242,184,75,0.18)'");
    expect(block).toContain("quietButtonBg: 'rgba(255,241,184,0.08)'");
    expect(block).toContain("noticeBorder: 'rgba(242,184,75,0.24)'");
    expect(block).not.toContain('#6EA8FF');
    expect(block).not.toContain('rgba(15,18,25,0.88)');
  });
});

async function expectSize(relativePath: string, width: number, height: number, format = 'webp') {
  const metadata = await sharp(path.join(root, relativePath)).metadata();
  expect(metadata.format).toBe(format);
  expect(metadata.width).toBe(width);
  expect(metadata.height).toBe(height);
}
