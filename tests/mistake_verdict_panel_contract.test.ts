import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const panel = read('components/mistake-practice/MistakeVerdictPanel.tsx');
const screen = read('app/mistake_practice_session.tsx');

// зачем (владелец 2026-09-14, макет промаха А): панель показывает ОБА ответа,
// объяснение разбирает именно этот ответ, цепочка дней видна, персонажа и
// пометки «ИИ» на экране нет.
describe('mistake verdict panel contract', () => {
  test('shows both answers with the mismatch highlighted', () => {
    expect(panel).toContain('buildMistakeAnswerDiff');
    expect(panel).toContain('<DiffLine label={copy.mine}');
    expect(panel).toContain('<DiffLine label={copy.correctLabel}');
    expect(panel).toContain("tone === 'gap'");
  });

  test('explains this very answer and never blocks on a spinner', () => {
    expect(panel).toContain('explanationLoading');
    expect(panel).toContain('SkeletonBlock');
    expect(panel).not.toMatch(/ActivityIndicator/);
    expect(screen).toContain('useMistakeExplain');
    expect(screen).toContain('prewarmMistakeSessionExplanations');
    expect(screen).toContain('liveExplanation ?? feedback.explanation');
  });

  test('makes the three-day chain visible and keeps the rule as its source', () => {
    expect(panel).toContain('chain.days');
    expect(panel).toContain('chain.corrected');
    expect(screen).toContain('afterItem.qualifyingDays.length');
    expect(screen).toContain('correct && independent && afterItem');
  });

  test('no character, no AI badge, no container outlines on screen', () => {
    const visibleCopy = panel
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*') && !line.trimStart().startsWith('{/*'))
      .join('\n');
    expect(visibleCopy).not.toMatch(/\bИИ\b|Тео|AiBadge/);
    expect(panel).not.toMatch(/borderWidth|borderColor/);
    expect(panel).not.toMatch(/adjustsFontSizeToFit/);
  });

  test('the old six canned templates no longer own the panel', () => {
    expect(screen).toContain('<MistakeVerdictPanel');
    expect(screen).not.toContain('{copy.correctAnswer}</Text>');
  });
});
