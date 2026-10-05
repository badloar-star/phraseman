import { mistakePracticeAnsweredProgress } from '../modules/mistake-practice/session';

// зачем (п.70, решено по рекомендации 05.10): шапка «n / N» отработки — пройденные вопросы; возврат ошибки в очередь
// после промаха честно увеличивает N.
const session = (cursor: number, queueLength: number, initialCount = 12) => ({
  cursor,
  initialCount,
  queue: Array.from({ length: queueLength }, (_, index) => ({ mistakeId: `m${index % initialCount}` })) as never,
});

describe('mistakePracticeAnsweredProgress', () => {
  it('starts at 0 / initialCount', () => {
    expect(mistakePracticeAnsweredProgress(session(0, 12))).toEqual({ answered: 0, total: 12 });
  });

  it('moves on every answer, right or wrong', () => {
    expect(mistakePracticeAnsweredProgress(session(1, 12))).toEqual({ answered: 1, total: 12 });
    expect(mistakePracticeAnsweredProgress(session(7, 12))).toEqual({ answered: 7, total: 12 });
  });

  it('a requeued mistake grows the total instead of freezing the counter', () => {
    expect(mistakePracticeAnsweredProgress(session(8, 16))).toEqual({ answered: 8, total: 16 });
  });

  it('never exceeds the total', () => {
    expect(mistakePracticeAnsweredProgress(session(20, 16))).toEqual({ answered: 16, total: 16 });
  });
});
