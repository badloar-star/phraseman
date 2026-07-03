import { readFileSync } from 'fs';
import path from 'path';

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

function sliceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('arena timer after answer contract', () => {
  it('keeps the real arena visible timer running after my answer', () => {
    const source = read('hooks/use-arena-session.ts');
    const submitMyAnswer = sliceBetween(
      source,
      'const submitMyAnswer = useCallback(async (answer: string) => {',
      'const submitLobbyChoice = useCallback',
    );

    expect(submitMyAnswer).toContain('hasAnsweredRef.current = true;');
    expect(submitMyAnswer.indexOf('hasAnsweredRef.current = true;')).toBeLessThan(
      submitMyAnswer.indexOf('setHasAnswered(true);'),
    );
    expect(submitMyAnswer).toContain('Keep the visible timer ticking while we wait for the opponent/reveal.');
    expect(submitMyAnswer).not.toContain('clearQuestionTimer();');
    expect(source).toContain('questionTimerRef.current = setInterval(updateVisibleTimeLeft, QUESTION_UI_TICK_MS)');
  });

  it('keeps the bot duel visible timer running while waiting for the bot answer', () => {
    const source = read('hooks/use-arena-mock.ts');
    const submitAnswer = sliceBetween(
      source,
      'const submitAnswer = useCallback((answer: string, bonusTotal = 0) => {',
      'useEffect(() => () => { clearAll(); clearBotTimer(); }, []);',
    );

    expect(submitAnswer).toContain('hasAnsweredRef.current = true;');
    expect(submitAnswer).not.toContain('clearInterval(intervalRef.current)');
    expect(source).toContain('intervalRef.current = setInterval(updateVisibleTimeLeft, QUESTION_UI_TICK_MS)');
  });
});
