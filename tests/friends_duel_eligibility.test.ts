/**
 * duel_eligibility — «Дуэль — когда учите один язык» (идея 3; D188; ответ 1 · ЯДРО 22.10: friendsGetProfiles отдаёт
 * studyLanguagesStarted). Сторож: общий язык дуэли — английский; свой пул — только пока сейчас учишь английский;
 * список друга без английского — нельзя; списка нет или он мусорный — не запрещаем.
 */
import { duelSameLanguage, parseStudyLanguagesStarted } from '../app/friends_together/duel_eligibility';

describe('начатые языки друга из профиля', () => {
  it('берём только коды языков, без повторов', () => {
    expect(parseStudyLanguagesStarted(['en', 'fr', 'en', 42, 'pt-BR', 'not a code'])).toEqual(['en', 'fr', 'pt-BR']);
  });

  it('нет поля, не список или пусто — «не знаем», а не «ничего не учит»', () => {
    for (const value of [undefined, null, 'en', {}, [], [7]]) expect(parseStudyLanguagesStarted(value)).toBeNull();
  });
});

describe('один язык для дуэли', () => {
  it('английский у обоих — можно', () => {
    expect(duelSameLanguage('en', ['fr', 'en'])).toBe(true);
  });

  it('у друга английского нет — нельзя', () => {
    expect(duelSameLanguage('en', ['es', 'fr'])).toBe(false);
  });

  it('сейчас учу не английский — своих фраз дуэли нет', () => {
    expect(duelSameLanguage('es', ['es', 'en'])).toBe(false);
  });

  it('список друга неизвестен — не запрещаем', () => {
    expect(duelSameLanguage('en', null)).toBe(true);
  });
});
