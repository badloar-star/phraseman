/**
 * duel_copy — тексты «Дуэли на 5 фраз» (идея 3). Сторож: 9 языков непусты, кириллица только в ru/uk; строка итога называет,
 * что решило дуэль (точность или время); время «м:сс» без «0:60».
 */
import { duelCopy, duelFacts, duelIncomingTitle, duelOutcomeLine, duelReviewLabel, type DuelCopyKey } from '../app/friends_together/duel_copy';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const CYRILLIC = /[А-Яа-яЁёІіЇїЄєҐґ]/;
const KEYS: DuelCopyKey[] = ['title', 'challengeBody', 'start', 'freeNote', 'later', 'otherLanguage', 'notEnough', 'limit', 'openDuel', 'inviteToLesson', 'sentTitle', 'sentBody', 'offlineTitle', 'offlineBody', 'offlineStrip', 'toFriends', 'incomingBody', 'accept', 'decline', 'win', 'loss', 'draw', 'rematch', 'phrase', 'you', 'friend', 'versus', 'sentMid', 'resultMid'];

it('все тексты на 9 языках непусты; кириллица только в ru/uk', () => {
  for (const lang of LANGS) {
    const lines = [
      ...KEYS.map((key) => duelCopy(lang, key)),
      ...duelFacts(lang, null).flatMap((f) => [f.value, f.label]),
      ...duelFacts(lang, 23).flatMap((f) => [f.value, f.label]),
      duelIncomingTitle(lang, 'Alex'),
      duelOutcomeLine(lang, 'win', 4, 3, 48_000, 65_000),
      duelOutcomeLine(lang, 'loss', 3, 4, 70_000, 52_000),
      duelOutcomeLine(lang, 'win', 4, 4, 48_000, 65_000),
      duelOutcomeLine(lang, 'draw', 5, 5, 40_000, 40_000),
      duelReviewLabel(lang, 1), duelReviewLabel(lang, 2),
    ];
    for (const line of lines) {
      expect(line.trim().length).toBeGreaterThan(0);
      if (lang !== 'ru' && lang !== 'uk') expect([lang, line, CYRILLIC.test(line)]).toEqual([lang, line, false]);
    }
  }
});

it('строка итога: точность, время при равенстве, ничья', () => {
  expect(duelOutcomeLine('ru', 'win', 4, 3, 48_000, 65_000)).toBe('Точность решила: 4 из 5 против 3.');
  expect(duelOutcomeLine('ru', 'loss', 3, 4, 70_000, 52_000)).toBe('3 из 5 — разберём ошибки и возьмём реванш.');
  expect(duelOutcomeLine('ru', 'win', 4, 4, 48_000, 65_000)).toBe('Точность равная — решило время: 0:48 против 1:05.');
  expect(duelOutcomeLine('ru', 'draw', 5, 5, 40_000, 40_000)).toBe('Одинаково точно и одинаково быстро.');
});

it('время округляется до секунд целиком — без «0:60»', () => {
  expect(duelOutcomeLine('ru', 'win', 4, 4, 59_600, 61_000)).toBe('Точность равная — решило время: 1:00 против 1:01.');
});

it('факты вызова и у друга: 24 ч на ответ / N ч осталось', () => {
  expect(duelFacts('ru', null)[1]).toEqual({ value: '24 ч', label: 'на ответ' });
  expect(duelFacts('ru', 23)[1]).toEqual({ value: '23 ч', label: 'осталось' });
});
