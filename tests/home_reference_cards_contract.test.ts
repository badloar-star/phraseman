import fs from 'fs';
import path from 'path';

const home = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');
const phraseCard = fs.readFileSync(path.join(__dirname, '..', 'components', 'DailyPhraseCard.tsx'), 'utf8');

describe('Home reference cards contract', () => {
  it('retains Daily challenges without the retired League goal', () => {
    expect(home).toContain('testID="home-activity-daily"');
    expect(home).toContain('testID="home-daily-task-progress"');
    expect(home).not.toContain('testID="home-league-open"');
    expect(home).not.toContain('testID="home-league-progress"');
    expect(home).toContain('homeTodayCardMinHeight');
  });

  it('honors the selected font size on routine home actions', () => {
    const dailyStart = home.indexOf('testID="home-daily-tasks-title"');
    const dailyEnd = home.indexOf('</FlowText>', dailyStart);
    const dailyTitle = home.slice(dailyStart, dailyEnd);
    expect(dailyTitle).toContain('fontSize: f.bodyLg');
    expect(dailyTitle).toContain('lineHeight: f.bodyLg + 5');
    expect(dailyTitle).not.toContain('Math.max(22');

    // Фраза дня остаётся единственным крупным редакционным акцентом на главной.
    expect(phraseCard).toContain('fontSize: Math.max(22, f.bodyLg)');
  });

  it('keeps the phrase card full width with content-driven height', () => {
    const styleStart = phraseCard.indexOf('homeAdditionalEditorial: {');
    const styleEnd = phraseCard.indexOf('\n  },', styleStart);
    const style = phraseCard.slice(styleStart, styleEnd);

    expect(style).toContain("alignSelf: 'stretch'");
    expect(style).toContain('marginHorizontal: 8');
    expect(style).not.toContain('maxWidth');
    expect(style).not.toMatch(/\bheight\s*:/);
  });

  it('drives the daily phrase cue from measured home viewport visibility', () => {
    expect(home).toContain('isDailyPhraseCardHalfVisible');
    expect(home).toContain('dailyPhraseLayoutRef');
    expect(home).toContain('homeViewportHeightRef');
    expect(home).toContain('homeScrollYRef');
    expect(home).toContain('setDailyPhraseCardVisible');
    expect(home).toContain('homeCardVisible={dailyPhraseCardVisible}');
  });
});
