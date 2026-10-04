import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
// 04.10: список тем — ровно союз ThemeMode (constants/theme.ts). minimalDark/business/businessLight
// удалены из приложения раньше; сторож держал старый набор и падал на каждом прогоне.
const THEME_MODES = [
  'dark', 'gold', 'olive', 'midnight', 'ember', 'aurora', 'volt', 'indigo', 'sagePorcelain',
];

describe('statistics tonal hierarchy contract', () => {
  it('defines a dedicated page field for every supported theme without changing global theme tokens', () => {
    const chrome = fs.readFileSync(path.join(ROOT, 'constants', 'statsThemeChrome.ts'), 'utf8');
    const pageFieldStart = chrome.indexOf('const STATS_PAGE_FIELD_BY_THEME');
    const pageFieldEnd = chrome.indexOf('};', pageFieldStart) + 2;
    const pageField = chrome.slice(pageFieldStart, pageFieldEnd);

    expect(chrome).toContain('STATS_PAGE_FIELD_BY_THEME');
    expect(chrome).toContain('export function statsPageField');
    for (const themeMode of THEME_MODES) {
      expect(pageField).toMatch(new RegExp(`\\b${themeMode}:\\s*['\"]#`));
    }
  });

  it('gives Sage Porcelain a distinct page, card, quiet surface, text, and accent hierarchy', () => {
    const chrome = fs.readFileSync(path.join(ROOT, 'constants', 'statsThemeChrome.ts'), 'utf8');
    const pageFieldStart = chrome.indexOf('const STATS_PAGE_FIELD_BY_THEME');
    const pageFieldEnd = chrome.indexOf('};', pageFieldStart) + 2;
    const accentsStart = chrome.indexOf('const STATS_CHROME_ACCENT_BY_THEME');
    const accentsEnd = chrome.indexOf('};', accentsStart) + 2;

    // Кавычки в исходнике — двойные (форматтер); проверяем значение, а не стиль кавычек.
    expect(chrome.slice(pageFieldStart, pageFieldEnd)).toMatch(/sagePorcelain:\s*['"]#F0F1EC['"]/);
    expect(chrome.slice(accentsStart, accentsEnd)).toContain('sagePorcelain: SAGE_PORCELAIN.accent');
    expect(chrome).toContain('SAGE_PORCELAIN');
    expect(chrome).toMatch(/const alpha =\s*strength === ['"]strong['"] \? ['"]2E['"] : strength === ['"]quiet['"] \? ['"]14['"] : ['"]22['"]/);
  });

  it('applies the stats-only page field to the safe area and opts cards into the lighter stats scrim', () => {
    const screen = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');
    const cardSurface = fs.readFileSync(path.join(ROOT, 'components', 'StatsCardArtSurface.tsx'), 'utf8');
    const heatmap = fs.readFileSync(path.join(ROOT, 'components', 'ActivityHeatmap365.tsx'), 'utf8');
    const lifetimeTotals = screen.slice(screen.indexOf('function LifetimeTotalsBlock'), screen.indexOf('const LIFETIME_PATH_DEV_CHART_KINDS'));

    expect(screen).toContain('statsGlass.bg');
    expect(screen).not.toContain("import ScreenGradient from '../components/ScreenGradient'");
    expect(screen).not.toContain('<ScreenGradient');
    expect(screen).toContain('<View style={{ flex: 1, backgroundColor: statsGlass.bg }}>');
    const backdropIndex = screen.indexOf('<StatsArtBackdrop />');
    const safeAreaIndex = screen.indexOf('<SafeAreaView testID="screen-streak-stats"');
    expect(backdropIndex).toBeGreaterThan(-1);
    expect(backdropIndex).toBeLessThan(safeAreaIndex);
    expect(screen.slice(safeAreaIndex, safeAreaIndex + 160)).not.toContain('backgroundColor');
    expect(screen).toContain('scrim="stats"');
    expect(cardSurface).toContain("| 'stats'");
    expect(cardSurface).toContain("scrim === 'stats'");
    expect(cardSurface).toContain("scrim = 'medium'");
    const lightBranchStart = cardSurface.indexOf('if (light)');
    const goldBranchStart = cardSurface.indexOf('if (isGoldTheme)');
    const darkBranchStart = cardSurface.indexOf('const darkLevel');
    expect(cardSurface.slice(lightBranchStart, goldBranchStart)).not.toContain("scrim === 'stats'");
    expect(cardSurface.slice(goldBranchStart, darkBranchStart)).not.toContain("scrim === 'stats'");
    expect(cardSurface.slice(darkBranchStart)).toContain("scrim === 'stats'");
    expect(cardSurface).not.toContain('<BlurView');
    expect(screen).not.toContain('<BlurView');
    expect(lifetimeTotals).toContain('scrim="stats"');
    expect(lifetimeTotals).not.toContain('scrim="strong"');
    // 04.10 (results.html «Серия и результаты», решение (б)): серия — герой по центру без карточки-подложки,
    // поэтому усиленной подложки при заморозке больше нет.
    expect(screen).toContain('testID="stats-streak-hero"');
    expect(screen).not.toContain("scrim={freezeActive ? 'strong' : 'stats'}");
    expect(screen).toContain('<ActivityHeatmap365/>');
    expect(heatmap).not.toContain('StatsCardArtSurface');
    expect(heatmap).not.toContain('scrim?: StatsCardArtScrim');
  });

  it('D49: кнопки «Подарки» «Дневного пути» в шапке Статистики больше нет', () => {
    const screen = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');
    expect(screen).not.toContain('stats-header-gifts');
    expect(screen).not.toMatch(/daily_journey|DailyJourney/);
  });

  it('gives statistics cards semantic tonal gradients without realtime blur', () => {
    const cardSurface = fs.readFileSync(path.join(ROOT, 'components', 'StatsCardArtSurface.tsx'), 'utf8');

    expect(cardSurface).toContain('function semanticTonalGradient');
    expect(cardSurface).toContain('function semanticTonalOpacity');
    for (const tone of ['streak', 'multipliers', 'practiceBalance', 'weekRhythm', 'percentiles', 'archiveMap', 'wager']) {
      expect(cardSurface).toContain(`case '${tone}':`);
    }
    // Градиент учитывает тему (themeMode) — подпись функции расширена.
    expect(cardSurface).toContain('colors={semanticTonalGradient(name, theme, isGoldTheme, resolvedThemeMode)}');
    expect(cardSurface).toContain('opacity: semanticTonalOpacity(theme, isGoldTheme, scrim)');
    expect(cardSurface).not.toContain('BlurView');
    expect(cardSurface).not.toContain('backdropFilter');
    expect(cardSurface).not.toContain('filter: blur');
  });

  it('keeps the yearly activity map as one tonal surface without a detached month header', () => {
    const heatmap = fs.readFileSync(path.join(ROOT, 'components', 'ActivityHeatmap365.tsx'), 'utf8');

    expect(heatmap).toContain('const activityMapSurface =');
    expect(heatmap).toContain('const activityNudgeSurface =');
    expect(heatmap).toContain('styles.yearMapSurface');
    expect(heatmap).not.toContain('activityGoalSurface');
    expect(heatmap).not.toContain('styles.yearHeaderSurface');
    expect(heatmap).not.toContain('styles.monthLabels');
    expect(heatmap).not.toContain("backgroundColor: isGoldTheme ? GOLD_RICH.blackPiano : t.bgSurface");
    expect(heatmap).not.toContain('backgroundColor: quietPanel');
  });
});
