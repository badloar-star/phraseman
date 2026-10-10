import fs from 'node:fs';
import path from 'node:path';

const NL = String.fromCharCode(10);
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const kit = read('components/mistakes-panel/PracticeKit.tsx');
const screen = read('app/mistake_practice_session.tsx');

// зачем (владелец 2026-09-14, макет промаха А; с 04.10 — «стакан» макета «Панель»): вердикт показывает ОБА ответа с подсветкой расхождения,
// объяснение разбирает именно этот ответ, цепочка дней видна, персонажа и пометки «ИИ» на экране нет.
describe('mistake verdict contract', () => {
  test('shows both answers with the mismatch highlighted', () => {
    expect(screen).toContain('buildMistakeAnswerDiff');
    expect(screen).toContain('segments={diff.mine}');
    expect(screen).toContain('segments={diff.correct}');
    expect(kit).toContain("segment.tone === 'gap'");
    expect(kit).toContain("segment.tone === 'wrong'");
  });

  test('explains this very answer and never blocks on a spinner', () => {
    expect(screen).toContain('useMistakeExplain');
    expect(screen).toContain('prewarmMistakeSessionExplanations');
    expect(screen).toContain('liveExplanation ?? feedback?.explanation');
    expect(screen).not.toMatch(/ActivityIndicator/);
    expect(kit).not.toMatch(/ActivityIndicator/);
  });

  test('makes the three-day chain visible and keeps the rule as its source', () => {
    expect(screen).toContain('feedback.chain.corrected ? 3 : feedback.chain.days');
    expect(screen).toContain('afterItem.qualifyingDays.length');
    // зачем (11.10): цепочка показывается при любом верном ответе, а «засчитан ли день» решает самостоятельность
    // ответа (gainedToday); сами дни считает проекция журнала (qualifyingDays) — правило осталось источником.
    expect(screen).toContain('correct && afterItem');
    expect(screen).toContain('gainedToday: independent');
  });

  test('no character, no AI badge, no container outlines on screen', () => {
    const visible = (source: string) => source
      .split(NL)
      .filter((line) => !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*') && !line.trimStart().startsWith('{/*'))
      .join(NL);
    expect(visible(kit)).not.toMatch(/ИИ|Тео|AiBadge/);
    expect(kit).not.toMatch(/borderWidth|borderColor/);
    expect(kit).not.toMatch(/adjustsFontSizeToFit/);
  });

  test('the old six canned templates and the old panel no longer own the verdict', () => {
    expect(screen).toContain('<DiffValue');
    expect(screen).not.toContain('<MistakeVerdictPanel');
    expect(screen).not.toContain('{copy.correctAnswer}</Text>');
  });
});
