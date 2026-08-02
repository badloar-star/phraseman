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

describe('speed_match tile-length new-room boundary', () => {
  it('accepts six lexical single-word pairs', () => {
    expect(validateTournamentTaskForNewRoom(speedTask())).toEqual({ ok: true, kind: 'match' });
  });

  // зачем 2026-08-02 (владелец: «для пары максимум 3 слова в плашке»): плитка
  // имеет фиксированную геометрию и режет текст на двух строках. До трёх слов
  // помещается целиком — такие пары словарь даёт штатно («катание на лыжах»),
  // поэтому они обязаны приниматься. Всё, что длиннее, приходило к игроку с
  // многоточием и теперь отклоняется на границе.
  it.each([
    ['short English phrase', 'items', 'check in'],
    ['three-word Russian translation', 'rightOptions', 'катание на лыжах'],
  ])('accepts a %s', (_label, field, value) => {
    const task = speedTask();
    if (field === 'items') {
      (task.payload.items as Array<{ prompt: string }>)[0].prompt = value;
    } else {
      (task.payload.rightOptions as string[])[0] = value;
      (task.payload.items as Array<{ options: string[] }>).forEach((item) => {
        item.options[0] = value;
      });
    }

    expect(validateTournamentTaskForNewRoom(task)).toEqual({ ok: true, kind: 'match' });
  });

  it.each([
    ['English phrase longer than three words', 'items', 'the airport shuttle bus'],
    ['English tab-separated long phrase', 'items', 'I\tneed\tsomething\tmore'],
    ['Russian phrase longer than three words', 'rightOptions', 'мне нужно что-нибудь другое'],
    ['Russian newline-separated long phrase', 'rightOptions', 'в\nкакую\nсторону\nповернуть'],
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
