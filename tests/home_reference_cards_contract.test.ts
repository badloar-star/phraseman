import fs from 'fs';
import path from 'path';

const home = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');
const phraseCard = fs.readFileSync(path.join(__dirname, '..', 'components', 'DailyPhraseCard.tsx'), 'utf8');

describe('Home reference cards contract', () => {
  // зачем (координатор §46, 2026-10-01): «Задания дня» сняты в 2.0 (их полное
  // удаление сторожит retired_daily_tasks_full_removal_contract), карточка
  // «Сегодня» V1 удалена вместе с Главной V1. Остаётся запрет на цель Лиги.
  it('keeps the retired League goal and V1 daily card off Home', () => {
    expect(home).not.toContain('testID="home-league-open"');
    expect(home).not.toContain('testID="home-league-progress"');
    expect(home).not.toContain('testID="home-activity-daily"');
    expect(home).not.toContain('testID="home-daily-task-progress"');
  });

  it('honors the selected font size on the daily phrase accent', () => {
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
