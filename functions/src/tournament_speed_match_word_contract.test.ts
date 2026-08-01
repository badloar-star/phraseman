import {
  type TournamentTask,
  validateTournamentTaskForNewRoom,
} from './tournament_core';

function speedTask(): TournamentTask {
  const pairs = [
    ['ticket', 'билет'],
    ['hotel', 'отель'],
    ['coffee', 'кофе'],
    ['train', 'поезд'],
    ['airport', 'аэропорт'],
    ['passport', 'паспорт'],
  ] as const;
  const rightOptions = pairs.map(([, russian]) => russian);
  return {
    taskId: 'single-word-speed-match',
    mode: 'speed_match',
    isVoice: false,
    difficulty: 1,
    payload: {
      prompt: 'Соедините слова.',
      rightOptions,
      items: pairs.map(([english], correctIndex) => ({
        prompt: english,
        options: rightOptions,
        correctIndex,
        explanation: {
          ruleNote: `${english} образует одну авторскую словарную пару.`,
          example: `${english} — ${rightOptions[correctIndex]}.`,
          wrongOptionReasons: rightOptions.map((option, index) => (
            index === correctIndex ? '' : `${option} — другое слово.`
          )),
        },
      })),
    },
    explanation: {
      ruleNote: 'Соедините каждое английское слово с русским переводом.',
      example: 'ticket — билет.',
      wrongOptionReasons: [],
    },
    tags: [],
    verified: true,
  };
}

describe('speed_match single-word new-room boundary', () => {
  it('accepts six lexical single-word pairs', () => {
    expect(validateTournamentTaskForNewRoom(speedTask())).toEqual({ ok: true, kind: 'match' });
  });

  it.each([
    ['English phrase', 'items', 'airport shuttle'],
    ['English tab-separated phrase', 'items', 'airport\tshuttle'],
    ['English word padded with whitespace', 'items', ' ticket'],
    ['Russian phrase', 'rightOptions', 'железный вокзал'],
    ['Russian newline-separated phrase', 'rightOptions', 'железный\nвокзал'],
    ['Russian word padded with whitespace', 'rightOptions', 'билет '],
  ])('rejects a %s', (_label, field, invalidValue) => {
    const task = speedTask();
    if (field === 'items') {
      (task.payload.items as Array<{ prompt: string }>)[0].prompt = invalidValue;
    } else {
      (task.payload.rightOptions as string[])[0] = invalidValue;
    }

    expect(validateTournamentTaskForNewRoom(task)).toEqual({
      ok: false,
      reason: 'speed_match_field_contract_invalid',
    });
  });
});
