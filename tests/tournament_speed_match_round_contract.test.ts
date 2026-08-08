import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(__dirname, '..', 'app', 'tournament_round.tsx'), 'utf8');

describe('tournament speed-match round', () => {
  it('renders one six-pair match board with server-authored timing and instant local feedback', () => {
    expect(source).not.toContain('SECONDS_PER_MATCH');
    expect(source).toContain('questionTiming?.durationMs');
    expect(source).toContain('questionTiming.deadlineAtMs');
    expect(source).toContain("task.kind === 'match'");
    expect(source).toContain('items.length !== SPEED_MATCH_PAIRS');
    expect(source).toContain('MatchBoard');
    // Владелец 2026-08-04: правильная пара сразу добавляет звезду, неверная
    // снимает одну, а сервер затем подтверждает либо корректирует прогноз.
    expect(source).toContain('const optimisticStarDelta = localCorrect ? 1 : -1;');
    expect(source).toContain('addPendingStars(optimisticStarDelta);');
    expect(source).toContain('result.penaltyApplied ? -1 : 0');
    expect(source).toContain('setMatchStatus');
    expect(source).toContain('submitSpeedMatchAttempt(roomId, roundNo, question.taskId, pairIndex, selectedIndex)');
    expect(source).toContain('answerFingerprints');
    expect(source).toContain("import { answerFingerprint } from './tournament_answer_fingerprint';");
    const answerMatch = source.slice(source.indexOf('const answerMatch'), source.indexOf('const matchComplete'));
    expect(answerMatch).toMatch(/const localCorrect = localAnswerVerdict\([\s\S]*setMatchStatus\([\s\S]*submitSpeedMatchAttempt/);
    expect(answerMatch.indexOf('setMatchStatus')).toBeLessThan(answerMatch.indexOf('submitSpeedMatchAttempt'));
    expect(answerMatch).toContain('return Promise.resolve(localVerdict);');
  });

  it('locks a correct pair after server confirmation but releases a wrong pair for retry', () => {
    const answerMatch = source.slice(source.indexOf('const answerMatch'), source.indexOf('const matchComplete'));
    const strictBoard = source.slice(source.indexOf('const StrictMatchBoard'), source.indexOf('const WordBank'));

    expect(answerMatch).toContain('if (isCorrect) next.add(pairIndex);');
    expect(answerMatch).toContain("delete next[pairIndex]");
    expect(strictBoard).toContain("status[index]?.verdict === 'correct'");
    expect(strictBoard).toContain("if (verdict === 'wrong')");
    expect(strictBoard).toContain('clearTupleSelection(tuple);');
  });

  it('reserves an immutable tuple and resolves its color from the immediate local verdict', () => {
    const strictBoard = source.slice(source.indexOf('const StrictMatchBoard'), source.indexOf('const WordBank'));

    expect(strictBoard).toContain('const reserveTuple');
    expect(strictBoard).toContain('const tuple = { left, right };');
    expect(strictBoard).toContain('const [pendingTuple, setPendingTuple]');
    const beforeLocalVerdict = strictBoard.slice(
      strictBoard.indexOf('const tuple = { left, right };'),
      strictBoard.indexOf('onSelect(tuple.left, tuple.right)'),
    );
    expect(beforeLocalVerdict).not.toContain('setPickedLeft(null)');
    expect(beforeLocalVerdict).not.toContain('setPickedRight(null)');
    expect(strictBoard).toContain('if (pendingTuple) return;');
    expect(strictBoard).toContain('reservedLeft.has(index)');
    expect(strictBoard).toContain('reservedRight.has(index)');
  });

  it('ignores a stale server completion after the player selects a newer pair', () => {
    const answerMatch = source.slice(source.indexOf('const answerMatch'), source.indexOf('const matchComplete'));

    expect(source).toContain('const activeMatchSelectionsRef = useRef(new Map<number, number>());');
    expect(answerMatch).toContain('const attemptKey = `${question.taskId}:${pairIndex}:${selectedIndex}`;');
    expect(answerMatch).toContain('activeMatchSelectionsRef.current.set(pairIndex, selectedIndex);');
    expect(answerMatch).toContain('activeMatchSelectionsRef.current.get(pairIndex) !== selectedIndex');
  });
});
