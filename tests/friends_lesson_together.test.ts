/**
 * «Урок вместе» (идея 2, макет friends-full.html): выбор друзей для приглашения на занятие.
 * Сторож: до трёх друзей за занятие; у кого урок закрыт — не выбирается; сразу отмечены те, у кого урок открыт;
 * порядок строк — открыт, уже прошёл, закрыт; внутри — по имени, чтобы список не прыгал.
 */
import {
  LESSON_INVITE_MAX,
  defaultLessonInvitePicks,
  orderLessonInviteRows,
  toggleLessonInvitePick,
  type LessonInviteRow,
} from '../app/friends_together/lesson_together';
import {
  lessonInviteButton,
  lessonInviteCta,
  lessonInviteEmptyCopy,
  lessonInviteLimitNote,
  lessonInviteSentLine,
  lessonInviteSentToast,
  lessonInviteSheetBody,
  lessonInviteSheetTitle,
  lessonInviteStatusLine,
} from '../app/friends_together/lesson_together_copy';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const CYRILLIC = /[А-Яа-яЁёІіЇїЄєҐґ]/;

describe('тексты «Урок вместе»', () => {
  it('на всех 9 языках непусто; кириллица только в ru/uk', () => {
    for (const lang of LANGS) {
      const lines = [
        lessonInviteButton(lang), lessonInviteSheetTitle(lang), lessonInviteSheetBody(lang, 'L2 · S3'),
        lessonInviteStatusLine(lang, 'open', 2) ?? '', lessonInviteStatusLine(lang, 'done', 2) ?? '', lessonInviteStatusLine(lang, 'locked', 2) ?? '',
        lessonInviteCta(lang, 0), lessonInviteCta(lang, 1), lessonInviteCta(lang, 2), lessonInviteCta(lang, 3),
        lessonInviteLimitNote(lang, false), lessonInviteLimitNote(lang, true),
        ...Object.values(lessonInviteEmptyCopy(lang)), lessonInviteSentLine(lang, ['Ira', 'Oleg']),
      ];
      for (const line of lines) {
        expect(line.trim().length).toBeGreaterThan(0);
        if (lang !== 'ru' && lang !== 'uk') expect([lang, line, CYRILLIC.test(line)]).toEqual([lang, line, false]);
      }
    }
    for (const [key, text] of Object.entries(lessonInviteSentToast())) {
      expect(text.trim().length).toBeGreaterThan(0);
      if (key !== 'ru' && key !== 'uk') expect(CYRILLIC.test(text)).toBe(false);
    }
  });

  it('кнопка по числу отмеченных; статус неизвестен — подписи нет; имена не склоняем', () => {
    expect(lessonInviteCta('ru', 0)).toBe('Выбери друзей');
    expect(lessonInviteCta('ru', 2)).toBe('Позвать двоих');
    expect(lessonInviteCta('ru', 3)).toBe('Позвать троих');
    expect(lessonInviteStatusLine('ru', 'unknown', 2)).toBeNull();
    expect(lessonInviteStatusLine('ru', 'locked', 2)).toBe('Урок 2 ещё закрыт');
    expect(lessonInviteSentLine('ru', ['Ирина', 'Олег'])).toBe('Приглашения ушли: Ирина, Олег');
  });
});

const row = (friendUid: string, name: string, status: LessonInviteRow['status']): LessonInviteRow => ({
  friendUid, name, coinRank: null, isPlus: false, status,
});
const ira = row('ira', 'Ирина', 'open');
const oleg = row('oleg', 'Олег', 'open');
const mark = row('mark', 'Марк', 'done');
const lida = row('lida', 'Лидия', 'locked');
const den = row('den', 'Денис', 'open');
const eva = row('eva', 'Ева', 'open');

describe('выбор друзей', () => {
  it('предел — трое за занятие', () => {
    expect(LESSON_INVITE_MAX).toBe(3);
    let picked: readonly string[] = [];
    for (const r of [ira, oleg, mark, den]) picked = toggleLessonInvitePick(picked, r);
    expect(picked).toEqual(['ira', 'oleg', 'mark']);
  });

  it('повторный тап снимает отметку; снятие освобождает место', () => {
    let picked = toggleLessonInvitePick(['ira', 'oleg', 'mark'], oleg);
    expect(picked).toEqual(['ira', 'mark']);
    picked = toggleLessonInvitePick(picked, den);
    expect(picked).toEqual(['ira', 'mark', 'den']);
  });

  it('урок у друга закрыт — не выбирается', () => {
    expect(toggleLessonInvitePick([], lida)).toEqual([]);
  });

  it('сразу отмечены те, у кого урок открыт, — не больше трёх', () => {
    expect(defaultLessonInvitePicks([ira, mark, lida, oleg])).toEqual(['ira', 'oleg']);
    expect(defaultLessonInvitePicks([ira, oleg, den, eva])).toHaveLength(3);
  });

  it('прогресс друга неизвестен — выбрать можно, сразу не отмечаем', () => {
    const anna = row('anna', 'Анна', 'unknown');
    expect(toggleLessonInvitePick([], anna)).toEqual(['anna']);
    expect(defaultLessonInvitePicks([anna, ira])).toEqual(['ira']);
  });

  it('порядок: открыт → уже прошёл → закрыт, внутри по имени; входной список не меняется', () => {
    const input = [lida, mark, oleg, ira];
    expect(orderLessonInviteRows(input).map((r) => r.friendUid)).toEqual(['ira', 'oleg', 'mark', 'lida']);
    expect(input.map((r) => r.friendUid)).toEqual(['lida', 'mark', 'oleg', 'ira']);
  });
});
