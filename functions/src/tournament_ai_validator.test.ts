import { parseTournamentValidatorReply } from './tournament_ai_validator';

describe('tournament AI validator reply', () => {
  it('accepts a strict passing verdict', () => {
    expect(parseTournamentValidatorReply('{"ok":true,"reason":"ok","feedback":""}')).toEqual({
      ok: true,
      reason: 'ok',
      feedback: '',
    });
  });

  it('keeps a concrete rejection reason and feedback for regeneration', () => {
    expect(parseTournamentValidatorReply('{"ok":false,"reason":"explanation","feedback":"Не объяснено, почему второй вариант — ловушка."}')).toEqual({
      ok: false,
      reason: 'explanation',
      feedback: 'Не объяснено, почему второй вариант — ловушка.',
    });
  });

  it('fails closed when the model returns malformed or invented data', () => {
    expect(parseTournamentValidatorReply('{"ok":false,"reason":"made_up","feedback":"whatever"}')).toEqual({
      ok: false,
      reason: 'incoherent',
      feedback: 'Проверка ИИ вернула непонятный результат.',
    });
  });
});
