import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'streak_stats.tsx'), 'utf8');
const blur = fs.readFileSync(path.join(__dirname, '..', 'components', 'StatsPremiumBlur.tsx'), 'utf8');
const activeStart = source.indexOf('<BouncyWrap>');
const activeEnd = source.indexOf('{false &&', activeStart);
const activeSurface = source.slice(activeStart, activeEnd);

function block(text: string, start: string, end: string): string {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  expect(from).toBeGreaterThan(-1);
  expect(to).toBeGreaterThan(from);
  return text.slice(from, to);
}

describe('статистика обычного аккаунта — свободное сверху, замки целиком снизу', () => {
  test('порядок: уровень/опыт → последние достижения → аналитика', () => {
    const xp = activeSurface.indexOf('<XpLevelCard');
    const achievements = activeSurface.indexOf('<RecentAchievementsCard');
    const locked = activeSurface.indexOf('testID="stats-free-locked-analytics"');
    const plusBranch = activeSurface.indexOf('{weekAnalyticsBlock}');
    expect(xp).toBeGreaterThan(-1);
    expect(achievements).toBeGreaterThan(xp);
    expect(plusBranch).toBeGreaterThan(achievements);
    expect(locked).toBeGreaterThan(achievements);
    // «Все показатели» больше не живёт свободно между картами — только в аналитике.
    expect(activeSurface).not.toContain('<AllMetricsFoldCard');
  });

  test('обычный аккаунт: время/опыт/год, «Все показатели» и «Среди других» — под замком', () => {
    const locked = block(activeSurface, 'testID="stats-free-locked-analytics"', '</View>');
    expect(locked).toContain('{weekAnalyticsBlock}');
    expect(locked).toContain('{allMetricsBlock}');
    expect(locked).toContain('{percentilesBlock}');
    const plus = block(activeSurface, '(isPremium || statsDevUnlock) ? (', ') : (');
    expect(plus).toContain('{weekAnalyticsBlock}');
    expect(plus).toContain('{allMetricsBlock}');
    expect(plus).toContain('{percentilesBlock}');
  });

  test('замок закрывает ВСЮ карточку аналитики, включая переключатель метрик', () => {
    const card = block(source, 'function WeekAnalyticsCard(', '\nfunction AllMetricsFoldCard(');
    const blurOpen = card.indexOf('<StatsPremiumBlur isPremium={isPremium} context="stats" snapshotKey="learningCoach"');
    const surfaceOpen = card.indexOf('<StatsCardArtSurface testID="stats-primary-analytics"');
    const selector = card.indexOf('testID="stats-primary-metric-selector"');
    expect(blurOpen).toBeGreaterThan(-1);
    expect(blurOpen).toBeLessThan(surfaceOpen);
    expect(surfaceOpen).toBeLessThan(selector);
    expect(card.indexOf('</StatsCardArtSurface>')).toBeLessThan(card.indexOf('</StatsPremiumBlur>'));
    // Замок не рендерит детей — переключатель физически не интерактивен.
    expect(blur).toContain('if (isPremium || devUnlock) return <>{children}</>;');
    expect(blur).toContain('<PremiumStatsPlaceholder snapshotKey={snapshotKey} />');
  });

  test('«Все показатели» под тем же замком со своим заголовком', () => {
    const all = block(source, 'const allMetricsBlock = (', 'const percentilesBlock = (() => {');
    expect(all).toContain('<StatsPremiumBlur isPremium={isPremium} context="stats" snapshotKey="lifetimeTotals" overrideTitle={allMetricsTitle}');
    expect(all).toContain('<AllMetricsFoldCard');
  });

  test('ни одна заблокированная карточка не добавляет PlusBadge поверх замка', () => {
    const percentiles = block(source, 'const percentilesBlock = (() => {', '\n    return (\n        <View style={{ flex: 1');
    expect(percentiles).not.toContain('<PlusBadge');
    const week = block(source, 'function WeekAnalyticsCard(', '\nfunction AllMetricsFoldCard(');
    expect(week).not.toContain('<PlusBadge');
    const all = block(source, 'const allMetricsBlock = (', 'const percentilesBlock = (() => {');
    expect(all).not.toContain('<PlusBadge');
    expect(activeSurface).not.toContain('<PlusBadge');
  });

  test('замок ведёт на пейвол с source и не содержит «Free» в русском тексте', () => {
    expect(blur).toContain("params: { context, source: 'stats_locked_card' }");
    expect(blur).toContain("ru: 'Открыть с Plus'");
    expect(blur).not.toMatch(/ru: '[^']*\bFree\b[^']*'/);
    expect(source).not.toMatch(/ru: '[^']*\bFree\b[^']*'/);
  });
});
