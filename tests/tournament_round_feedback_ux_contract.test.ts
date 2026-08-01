import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const round = readFileSync(path.join(root, 'app/tournament_round.tsx'), 'utf8');
const countdown = readFileSync(
  path.join(root, 'components/tournament/TournamentCountdown.tsx'),
  'utf8',
);

function section(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return source.slice(from, to);
}

describe('tournament question feedback UX', () => {
  test('question TimerRing shows a numeric countdown only for the final five seconds', () => {
    const timerRing = section(countdown, 'export const TimerRing', 'const makeStyles');

    expect(timerRing).toContain('const low = seconds <= 5');
    expect(timerRing).toContain('Math.ceil(seconds)');
    expect(timerRing).toContain('styles.ringText');
    expect(timerRing).toContain('accessibilityRole="timer"');
  });

  test('reading, answer, and feedback windows come only from the absolute server task schedule', () => {
    const client = readFileSync(path.join(root, 'app/tournament_client.ts'), 'utf8');

    expect(round).toContain("type Phase = 'intro' | 'reading' | 'question' | 'feedback'");
    expect(client).toContain('readingEndsAtMs?: number;');
    expect(client).toContain('answerDeadlineAtMs?: number;');
    expect(client).toContain('feedbackStartsAtMs?: number;');
    expect(client).toContain('feedbackEndsAtMs?: number;');
    expect(round).toContain('readingEndsAtMs - tournamentNow()');
    expect(round).toContain('const feedbackAdvanceAtMs = feedbackEndsAtMs;');
    expect(round).toContain('feedbackStartsAtMs === null || tournamentNow() >= feedbackStartsAtMs');
    expect(round).toContain('isTournamentAnswerWindowOpen(questionTiming, tournamentNow())');
    expect(round).not.toContain('motion.answerFeedbackMs');
  });

  test('active forfeit requires an explicit loss-and-no-refund confirmation before the callable', () => {
    const client = readFileSync(path.join(root, 'app/tournament_client.ts'), 'utf8');

    expect(client).toContain("'tournamentForfeit'");
    expect(client).toContain('{ roomId, confirmForfeit: true }');
    expect(round).toContain('forfeitTournament(roomId)');
    expect(round).toContain('Вы покинете текущий турнир');
    expect(round).toContain('Взнос не возвращается');
    expect(round).toContain('Подтвердить выход');
  });

  test('choice feedback announces the authoritative result and paints only a server-confirmed selection green', () => {
    const client = readFileSync(path.join(root, 'app/tournament_client.ts'), 'utf8');
    const optionRow = section(round, 'const OptionRow', 'const MatchBoard');

    expect(client).toContain('earnedStars: number;');
    expect(client).toContain("zeroScoreReason: null | 'incorrect_answer' | 'speed_match_penalty';");
    expect(client).toContain('correctIndex?: number;');
    expect(round).toContain("feedbackCorrect === true ? 'Правильно!' : 'Почти!'");
    expect(round).toContain('setFeedbackEarnedStars(result.earnedStars);');
    expect(round).toContain('setFeedbackCorrectIndex(typeof result.correctIndex');
    expect(optionRow).toContain('authoritativeCorrect');
    expect(optionRow).toContain('authoritativeCorrectIndex');
    expect(optionRow).toContain("authoritativeCorrect ? 'ok' : 'bad'");
    expect(optionRow).toContain('styles.optionLetterCorrect');
  });

  test('FeedbackKit keeps tournament sound and haptic settings independent', () => {
    expect(round).toContain("import { fk } from './feedback/feedback_kit'");
    expect(round).toMatch(/if \(result\.correct\) fk\.correct\(\);\s*else fk\.wrong\(\);/);
    expect(round).not.toContain("from 'expo-haptics'");
  });

  test('all variable question and answer text is capped at two rendered lines', () => {
    expect(round).toMatch(/function TournamentTwoLineText[\s\S]*numberOfLines=\{2\}/);
    for (const style of [
      'questionPrompt',
      'questionPhrase',
      'optionText',
      'matchPromptText',
      'strictMatchText',
      'assembledChipText',
      'bankChipText',
    ]) {
      expect(round).toMatch(new RegExp(`<TournamentTwoLineText[^>]*style=\\{(?:styles\\.)?${style}`));
    }
    expect(round.match(/numberOfLines=\{2\}/g)).toHaveLength(1);
    expect(round).not.toContain('adjustsFontSizeToFit');
  });
});
