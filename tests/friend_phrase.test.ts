// зачем (идея 8 «Фраза дня вдвоём», закон владельца «телефон решает, сервер только хранит записи»): мой ответ на фразу дня —
// одна запись friends_phrase_v1; друг видит её тем же профилем. Чужая запись разбирается строго, вчерашний ответ не показывается.
import { friendPhraseAnswerFor, parseFriendPhraseAnswer, serializeFriendPhraseAnswer } from '../app/friends_together/friend_phrase';

describe('friend phrase answer', () => {
  const good = { v: 1 as const, day: '2026-10-22', phraseId: 'en-042', optionId: 'correct', correct: true };

  it('строгий разбор: строка JSON и объект; мусор, чужая версия и неверные поля — отброшены', () => {
    expect(parseFriendPhraseAnswer(JSON.stringify(good))).toEqual(good);
    expect(parseFriendPhraseAnswer(good)).toEqual(good);
    expect(parseFriendPhraseAnswer({ ...good, v: 2 })).toBeNull();
    expect(parseFriendPhraseAnswer({ ...good, day: '22.10.2026' })).toBeNull();
    expect(parseFriendPhraseAnswer({ ...good, phraseId: 'en 042' })).toBeNull();
    expect(parseFriendPhraseAnswer({ ...good, correct: 'yes' })).toBeNull();
    expect(parseFriendPhraseAnswer('{oops')).toBeNull();
  });

  it('ответ друга — только на ту же фразу сегодня; вчерашний в полночь исчезает', () => {
    expect(friendPhraseAnswerFor(good, '2026-10-22', 'en-042')).toEqual(good);
    expect(friendPhraseAnswerFor(good, '2026-10-23', 'en-042')).toBeNull();
    expect(friendPhraseAnswerFor(good, '2026-10-22', 'es-007')).toBeNull();
    expect(friendPhraseAnswerFor(null, '2026-10-22', 'en-042')).toBeNull();
  });

  it('запись — постоянный порядок полей', () => {
    expect(serializeFriendPhraseAnswer(good)).toBe('{"v":1,"day":"2026-10-22","phraseId":"en-042","optionId":"correct","correct":true}');
  });
});
