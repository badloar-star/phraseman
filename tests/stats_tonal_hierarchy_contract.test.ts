import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const THEME_MODES = [
  'dark', 'gold', 'coral', 'minimalDark', 'business',
  'businessLight', 'midnight', 'ember', 'aurora', 'volt',
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

  it('applies the stats-only page field to the safe area and opts cards into the lighter stats scrim', () => {
    const screen = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');
    const cardSurface = fs.readFileSync(path.join(ROOT, 'components', 'StatsCardArtSurface.tsx'), 'utf8');
    const heatmap = fs.readFileSync(path.join(ROOT, 'components', 'ActivityHeatmap365.tsx'), 'utf8');
    const lifetimeTotals = screen.slice(screen.indexOf('function LifetimeTotalsBlock'), screen.indexOf('const LIFETIME_PATH_DEV_CHART_KINDS'));

    expect(screen).toContain('statsPageField');
    expect(screen).not.toContain("import ScreenGradient from '../components/ScreenGradient'");
    expect(screen).not.toContain('<ScreenGradient');
    expect(screen).toContain('<View style={{ flex: 1, backgroundColor: statsPageField(themeMode) }}>');
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
    expect(screen).toContain("scrim={freezeActive ? 'strong' : 'stats'}");
    expect(screen).toContain('<ActivityHeatmap365/>');
    expect(heatmap).not.toContain('StatsCardArtSurface');
    expect(heatmap).not.toContain('scrim?: StatsCardArtScrim');
  });

  it('keeps the statistics gifts header action borderless and separated by tonal fill', () => {
    const screen = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');
    const giftActionStart = screen.indexOf('testID="stats-header-gifts"');
    const giftActionEnd = screen.indexOf('</TouchableOpacity>', giftActionStart);
    const giftAction = screen.slice(giftActionStart, giftActionEnd);

    expect(giftActionStart).toBeGreaterThan(-1);
    expect(giftAction).toContain('borderWidth: 0');
    expect(giftAction).not.toContain('borderWidth: 1');
    expect(giftAction).not.toContain('borderColor:');
    expect(giftAction).toContain("statsSoftBg(themeMode, 'multipliers', 'strong')");
    expect(giftAction).toContain("statsSoftBg(themeMode, 'multipliers', 'quiet')");
  });

  it('gives statistics cards semantic tonal gradients without realtime blur', () => {
    const cardSurface = fs.readFileSync(path.join(ROOT, 'components', 'StatsCardArtSurface.tsx'), 'utf8');

    expect(cardSurface).toContain('function semanticTonalGradient');
    expect(cardSurface).toContain('function semanticTonalOpacity');
    for (const tone of ['streak', 'multipliers', 'practiceBalance', 'weekRhythm', 'percentiles', 'archiveMap', 'wager']) {
      expect(cardSurface).toContain(`case '${tone}':`);
    }
    expect(cardSurface).toContain('colors={semanticTonalGradient(name, theme, isGoldTheme)}');
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
