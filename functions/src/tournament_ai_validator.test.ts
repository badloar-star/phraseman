import fs from 'node:fs';
import path from 'node:path';
import {
  buildTournamentAdversarialValidatorPrompt,
  parseTournamentValidatorReply,
} from './tournament_ai_validator';

const oddity = {
  kind: 'oddity' as const,
  prompt: 'Какая фраза звучит неправильно?',
  options: ['I do great work.', 'I do a great job.', 'I work well.', 'I do an great job.'],
  correctIndex: 3,
  correctAnswer: 'I do an great job.',
  correctTokens: [],
  scenario: 'работа',
  ruleNote: 'Перед согласным нужен a, не an.',
  example: 'I do a great job. — Я отлично справляюсь.',
  wrongOptionReasons: ['x', 'x', 'x', ''],
};

const situation = {
  ...oddity,
  kind: 'situation' as const,
  prompt: 'Официант принёс не то блюдо. Что скажешь?',
  options: [
    "Sorry, this isn't what I ordered.",
    "Sorry, this aren't what I ordered.",
    "Sorry, this isn't what I order.",
    "Sorry, this isn't what I have order.",
  ],
  correctIndex: 0,
  correctAnswer: "Sorry, this isn't what I ordered.",
};

function grammarCheck(index: number, grammaticallyValid: boolean) {
  return {
    index,
    valid: grammaticallyValid,
    grammaticallyValid,
    minimalTwin: true,
    partOfSpeech: 'verb_phrase',
    reason: grammaticallyValid ? 'Natural English.' : 'The verb form is impossible here.',
  };
}

describe('tournament AI validator reply', () => {
  it('rejects an ok verdict that omits the complete option matrix', () => {
    expect(parseTournamentValidatorReply('{"ok":true,"reason":"ok","feedback":""}', oddity))
      .toMatchObject({ ok: false, reason: 'ambiguity' });
  });

  it('keeps a concrete rejection reason and feedback for regeneration', () => {
    expect(parseTournamentValidatorReply('{"ok":false,"reason":"explanation","feedback":"Не объяснено, почему второй вариант — ловушка."}', oddity)).toEqual({
      ok: false,
      reason: 'explanation',
      feedback: 'Не объяснено, почему второй вариант — ловушка.',
    });
  });

  it('fails closed when the model returns malformed or invented data', () => {
    expect(parseTournamentValidatorReply('{"ok":false,"reason":"made_up","feedback":"whatever"}', oddity)).toEqual({
      ok: false,
      reason: 'incoherent',
      feedback: 'Проверка ИИ вернула непонятный результат.',
    });
  });

  it('accepts oddity only after independently proving three valid options and one exact broken option', () => {
    const reply = JSON.stringify({
      ok: true,
      reason: 'ok',
      feedback: '',
      optionChecks: [
        grammarCheck(0, true),
        grammarCheck(1, true),
        grammarCheck(2, true),
        grammarCheck(3, false),
      ],
    });

    expect(parseTournamentValidatorReply(reply, oddity)).toEqual({
      ok: true,
      reason: 'ok',
      feedback: '',
    });
  });

  it('rejects the exact class of owner-reported oddity with two broken options', () => {
    const reply = JSON.stringify({
      ok: true,
      reason: 'ok',
      feedback: '',
      optionChecks: [
        grammarCheck(0, false),
        grammarCheck(1, true),
        grammarCheck(2, true),
        grammarCheck(3, false),
      ],
    });

    expect(parseTournamentValidatorReply(reply, oddity)).toEqual({
      ok: false,
      reason: 'ambiguity',
      feedback: 'Проверка вариантов не подтверждает единственный ответ.',
    });
  });

  it('rejects situation distractors that are only contextually wrong but grammatically valid', () => {
    const reply = JSON.stringify({
      ok: true,
      reason: 'ok',
      feedback: '',
      optionChecks: [0, 1, 2, 3].map((index) => grammarCheck(index, true)),
    });

    expect(parseTournamentValidatorReply(reply, situation)).toEqual({
      ok: false,
      reason: 'ambiguity',
      feedback: 'Проверка вариантов не подтверждает единственный ответ.',
    });
  });

  it.each([
    ['not a minimal twin', { minimalTwin: false }],
    ['another part of speech', { partOfSpeech: 'noun' }],
    ['missing grammar verdict', { grammaticallyValid: undefined }],
  ])('rejects a distractor that is %s', (_case, patch) => {
    const optionChecks: Array<Record<string, unknown>> = [
      grammarCheck(0, true),
      { ...grammarCheck(1, false), ...patch },
      grammarCheck(2, false),
      grammarCheck(3, false),
    ];
    if ('grammaticallyValid' in patch && patch.grammaticallyValid === undefined) {
      delete optionChecks[1].grammaticallyValid;
    }

    expect(parseTournamentValidatorReply(JSON.stringify({
      ok: true,
      reason: 'ok',
      feedback: '',
      optionChecks,
    }), situation)).toMatchObject({ ok: false, reason: 'ambiguity' });
  });

  it('uses an independent adversarial pass before the retired generator may accept a task', () => {
    const prompt = buildTournamentAdversarialValidatorPrompt(oddity);
    const generator = fs.readFileSync(path.join(__dirname, 'admin_tournament_full.ts'), 'utf8');

    expect(prompt).toContain('Try to disprove');
    expect(prompt).toContain('every option independently');
    expect(generator).toContain('judgeTournamentTaskPair');
    expect(generator).not.toContain('const verdict = await judgeTournamentTask({');
  });
});
