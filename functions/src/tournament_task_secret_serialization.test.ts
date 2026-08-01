import { parseTournamentTaskDocument } from './tournaments';

describe('tournament task secret serialization', () => {
  test('a valid legacy task without an explanation omits the field instead of carrying undefined', () => {
    const task = parseTournamentTaskDocument('legacy-without-explanation', {
      mode: 'guess_phrase',
      isVoice: false,
      difficulty: 1,
      payload: {
        phrase: 'Choose the answer',
        options: ['one', 'two', 'three', 'four'],
        correctIndex: 0,
      },
      tags: ['legacy'],
      verified: true,
    });

    expect(task).not.toBeNull();
    expect(Object.prototype.hasOwnProperty.call(task, 'explanation')).toBe(false);
    expect(JSON.stringify(task)).not.toContain('"explanation"');
  });

  test('an authored explanation remains present with all trap reasons', () => {
    const task = parseTournamentTaskDocument('modern-with-explanation', {
      mode: 'guess_phrase',
      isVoice: false,
      difficulty: 1,
      payload: {
        phrase: 'Choose the answer',
        options: ['one', 'two', 'three', 'four'],
        correctIndex: 0,
      },
      explanation: {
        ruleNote: 'Rule',
        example: 'Example',
        wrongOptionReasons: ['', 'trap two', 'trap three', 'trap four'],
      },
      tags: ['modern'],
      verified: true,
    });

    expect(task?.explanation?.wrongOptionReasons).toEqual([
      '', 'trap two', 'trap three', 'trap four',
    ]);
  });
});
