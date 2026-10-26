import { readFileSync } from 'fs';
import { join } from 'path';
import {
  FRIENDS_PUSH_COPY,
  FRIENDS_PUSH_LANGS,
  type FriendsPushKey,
  friendsPushLangOf,
  friendsPushText,
  normalizeFriendsPushLang,
} from './friends_push_copy';

// зачем (координатор 22.10, 10 · ПЕРЕВОДЧИК): пуши «Друзей» на 9 языках. Сторож держит словарь равным черновику Переводчика
// и не даёт ключу остаться без языка или с потерянной меткой ({name}, {n}, {l}, {s}).

const DRAFT = join(__dirname, '..', '..', 'docs', 'work', 'tasks', 'friends-push-copy-9-lang-draft-2026-10-22.md');
const PLURAL_TOKENS: Readonly<Record<string, readonly string[]>> = {
  nudgeStreakBody: ['дней', 'днів', 'days', 'días', 'dias', 'dni'],
  lessonDoneBody: ['монеты', 'монети', 'coins', 'monedas', 'moedas', 'monet'],
};
const tokens = (s: string): string[] => (s.match(/\{[a-z]+\}/g) ?? []).filter((t) => t !== '{days}' && t !== '{coins}').sort();

describe('тексты пушей «Друзей» на 9 языках', () => {
  test('словарь дословно равен таблице черновика Переводчика (метки склонений — {days}/{coins})', () => {
    const rows = readFileSync(DRAFT, 'utf8').split(/\r?\n/).filter((l) => /^\| [a-zA-Z]+( ⚑)? \|/.test(l) && !l.startsWith('| ключ'));
    const fromDraft: Record<string, string[]> = {};
    for (const row of rows) {
      const cells = row.split('|').slice(1, -1).map((c) => c.trim());
      const key = cells[0].replace(' ⚑', '');
      fromDraft[key] = cells.slice(1).map((cell) => (PLURAL_TOKENS[key] ?? []).reduce(
        (acc, word) => acc.split(`{${word}}`).join(key === 'lessonDoneBody' ? '{coins}' : '{days}'), cell));
    }
    expect(Object.keys(fromDraft).sort()).toEqual(Object.keys(FRIENDS_PUSH_COPY).sort());
    for (const key of Object.keys(FRIENDS_PUSH_COPY) as FriendsPushKey[]) {
      expect([key, FRIENDS_PUSH_LANGS.map((lang) => FRIENDS_PUSH_COPY[key][lang])]).toEqual([key, fromDraft[key]]);
    }
  });

  test('у каждого ключа 9 непустых языков и те же метки, что в ru', () => {
    for (const key of Object.keys(FRIENDS_PUSH_COPY) as FriendsPushKey[]) {
      for (const lang of FRIENDS_PUSH_LANGS) {
        const text = FRIENDS_PUSH_COPY[key][lang];
        expect([key, lang, text.trim().length > 0]).toEqual([key, lang, true]);
        expect([key, lang, tokens(text)]).toEqual([key, lang, tokens(FRIENDS_PUSH_COPY[key].ru)]);
      }
    }
  });

  test('после подстановки не остаётся ни одной метки', () => {
    const vars = { name: 'Alex', n: 3, l: 2, s: 7 };
    for (const key of Object.keys(FRIENDS_PUSH_COPY) as FriendsPushKey[]) {
      for (const lang of FRIENDS_PUSH_LANGS) expect([key, lang, friendsPushText(lang, key, vars)]).not.toEqual([key, lang, expect.stringMatching(/\{[a-z]+\}/)]);
    }
  });

  test('склонения: дни и монеты', () => {
    expect(friendsPushText('ru', 'nudgeStreakBody', { n: 1 })).toMatch(/^1 день подряд/);
    expect(friendsPushText('ru', 'nudgeStreakBody', { n: 3 })).toMatch(/^3 дня подряд/);
    expect(friendsPushText('ru', 'nudgeStreakBody', { n: 11 })).toMatch(/^11 дней подряд/);
    expect(friendsPushText('uk', 'nudgeStreakBody', { n: 22 })).toMatch(/^22 дні поспіль/);
    expect(friendsPushText('pl', 'nudgeStreakBody', { n: 1 })).toMatch(/^1 dzień z rzędu/);
    expect(friendsPushText('en', 'nudgeStreakBody', { n: 1 })).toMatch(/^1 day in a row/);
    expect(friendsPushText('ru', 'lessonDoneBody', { n: 2 })).toBe('+2 монеты вам обоим');
    expect(friendsPushText('pl', 'lessonDoneBody', { n: 2 })).toBe('+2 monety dla was obojga');
    expect(friendsPushText('en', 'lessonDoneBody', { n: 2 })).toBe('+2 coins for both of you');
    expect(friendsPushText('tr', 'lessonDoneBody', { n: 2 })).toBe('İkinize de +2 jeton');
  });

  // зачем (координатор 26.10): пуш «Позвать» с серией уходит любому курсу, а у es/fr/de/it «Уроков» нет (D129/D130) —
  // тело не обещает урок ни на одном языке. Тот же сторож, что у streak_at_risk (re_engage_push.test.ts), с NFC: в NFD
  // диакритика — отдельный символ, и «liç»/«bài» прошли бы мимо.
  test('nudgeStreakBody не обещает урок ни на одном из 9 языков (NFC и NFD)', () => {
    const LESSON_WORD = /урок|занят|lesson|lecci|liç|pelajaran|\bders\b|lekcj|(^|\s)bài(\s|$)/i;
    const promisesLesson = (body: string): boolean => LESSON_WORD.test(body.normalize('NFC'));
    for (const lang of FRIENDS_PUSH_LANGS) {
      const body = friendsPushText(lang, 'nudgeStreakBody', { n: 3 });
      expect([lang, promisesLesson(body)]).toEqual([lang, false]);
      expect([lang, promisesLesson(body.normalize('NFD'))]).toEqual([lang, false]);
    }
    expect(promisesLesson('Uma lição curta e a sequência continua.'.normalize('NFD'))).toBe(true);
    expect(promisesLesson('Một bài ngắn là chuỗi tiếp tục.'.normalize('NFD'))).toBe(true);
  });

  test('язык получателя — цепочка админских рассылок, запасной ru', () => {
    expect(friendsPushLangOf({ lang: 'en', app_lang: 'pl' })).toBe('en');
    expect(friendsPushLangOf({ app_lang: 'pt-BR' })).toBe('pt');
    expect(friendsPushLangOf({ pushTokenLang: 'uk_UA' })).toBe('uk');
    expect(friendsPushLangOf({ progress: { app_lang: 'tr' } })).toBe('tr');
    expect(friendsPushLangOf({ lang: 'de' })).toBe('ru');
    expect(friendsPushLangOf(undefined)).toBe('ru');
    expect(normalizeFriendsPushLang('ua')).toBe('uk');
  });
});
