/**
 * duel_launch + duel_play_copy — адрес экрана дуэли (граница системы) и тексты экрана хода (идея 3).
 * Сторож: туда-обратно без потерь; кривой режим, не пять разных фраз или ответ без номера дуэли — не играем;
 * ранг монеты вне 0…19 — без монеты, длинное имя обрезаем; тексты есть на всех 9 языках, секунды склоняются, часы не «0:60».
 */
import { duelLaunchParams, parseDuelLaunch, type DuelLaunch } from '../app/friends_together/duel_launch';
import { duelClock, duelCorrectAnswerLine, duelPlayCopy, duelProgressLabel, duelVerdictTitle, type DuelPlayCopyKey } from '../app/friends_together/duel_play_copy';
import type { Lang } from '../constants/i18n';

const ids = ['en:lesson-01:session-01:i02', 'en:lesson-01:session-01:i03', 'en:lesson-01:session-02:i01', 'en:lesson-01:session-02:i05', 'en:lesson-01:session-03:i04'];
const launch: DuelLaunch = {
  mode: 'answer',
  friendUid: 'f-1',
  friendName: 'Ирина',
  friendCoinRank: 7,
  friendIsPlus: true,
  phraseIds: ids,
  duelId: 'd-1',
  myName: 'Алекс',
  notificationId: 'note-1',
  result: null,
};

describe('адрес экрана дуэли', () => {
  it('туда и обратно — то же самое', () => {
    expect(parseDuelLaunch(duelLaunchParams(launch), 'Я')).toEqual({ ok: true, launch });
    const challenge: DuelLaunch = { ...launch, mode: 'challenge', duelId: null, friendCoinRank: null, friendIsPlus: false, notificationId: null };
    expect(parseDuelLaunch(duelLaunchParams(challenge), 'Я')).toEqual({ ok: true, launch: challenge });
  });

  it('итог — только просмотр: исход, счёт и отметки обоих туда-обратно; без фраз и своих отметок — тоже', () => {
    const result: DuelLaunch = {
      ...launch,
      mode: 'result',
      notificationId: null,
      result: {
        outcome: 'loss',
        mine: { correct: 3, elapsedMs: 70_000, results: [true, false, true, true, false] },
        theirs: { correct: 4, elapsedMs: 52_000, results: [true, true, true, false, true] },
      },
    };
    expect(parseDuelLaunch(duelLaunchParams(result), 'Я')).toEqual({ ok: true, launch: result });
    const bare: DuelLaunch = { ...result, phraseIds: [], result: { ...result.result!, mine: { ...result.result!.mine, results: null } } };
    expect(parseDuelLaunch(duelLaunchParams(bare), 'Я')).toEqual({ ok: true, launch: bare });
  });

  it('итог без исхода, счёта или отметок друга — не открываем; строка уведомления — только у ответа', () => {
    const base = duelLaunchParams({ ...launch, mode: 'result', notificationId: null, result: { outcome: 'win', mine: { correct: 4, elapsedMs: 1, results: null }, theirs: { correct: 3, elapsedMs: 2, results: [true, true, true, false, false] } } });
    expect(parseDuelLaunch({ ...base, out: 'maybe' }, 'Я')).toEqual({ ok: false, reason: 'result_fields' });
    expect(parseDuelLaunch({ ...base, tr: '1101' }, 'Я')).toEqual({ ok: false, reason: 'result_fields' });
    expect(parseDuelLaunch({ ...base, mt: String(16 * 60 * 1000) }, 'Я')).toEqual({ ok: false, reason: 'result_fields' });
    const withNote = parseDuelLaunch({ ...base, n: 'note-9' }, 'Я');
    expect(withNote.ok && withNote.launch.notificationId).toBeNull();
  });

  it('не играем по кривому адресу', () => {
    const base = duelLaunchParams(launch);
    expect(parseDuelLaunch({ ...base, mode: 'hack' }, 'Я').ok).toBe(false);
    expect(parseDuelLaunch({ ...base, friend: '' }, 'Я').ok).toBe(false);
    expect(parseDuelLaunch({ ...base, ids: ids.slice(0, 4).join(',') }, 'Я').ok).toBe(false);
    expect(parseDuelLaunch({ ...base, ids: [...ids.slice(0, 4), ids[0]].join(',') }, 'Я').ok).toBe(false);
    expect(parseDuelLaunch({ ...base, duel: '' }, 'Я')).toEqual({ ok: false, reason: 'answer_without_duel' });
    expect(parseDuelLaunch({ ...base, ids: '' }, 'Я').ok).toBe(false);
  });

  it('ранг вне шкалы — без монеты; имя обрезаем; пустое — запасное; массив из адреса — первое значение', () => {
    const parsed = parseDuelLaunch({ ...duelLaunchParams(launch), rank: '42', name: `  ${'Я'.repeat(80)} `, me: '', mode: ['answer', 'challenge'] }, 'Я');
    expect(parsed.ok && parsed.launch.friendCoinRank).toBeNull();
    expect(parsed.ok && parsed.launch.friendName.length).toBe(64);
    expect(parsed.ok && parsed.launch.myName).toBe('Я');
    expect(parsed.ok && parsed.launch.mode).toBe('answer');
  });
});

const LANGS: Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const KEYS: DuelPlayCopyKey[] = ['buildPhrase', 'situation', 'sayInEnglish', 'tapWords', 'check', 'next', 'close', 'time', 'errorTitle', 'errorBody', 'rejectedTitle', 'expiredTitle', 'alreadyMoved', 'tryLater', 'friendTurn'];

describe('тексты экрана хода', () => {
  it('есть на всех языках', () => {
    for (const lang of LANGS) {
      for (const key of KEYS) expect(duelPlayCopy(lang, key).trim()).not.toBe('');
      expect(duelProgressLabel(lang, 2, 5)).toMatch(/2/);
      expect(duelCorrectAnswerLine(lang, 'I am busy.')).toContain('I am busy.');
    }
  });

  it('секунды склоняются и не бывают нулём', () => {
    expect(duelVerdictTitle('ru', true, 7_000)).toBe('Верно · 7 секунд');
    expect(duelVerdictTitle('ru', false, 2_200)).toBe('Не совсем · 2 секунды');
    expect(duelVerdictTitle('ru', true, 300)).toBe('Верно · 1 секунда');
    expect(duelVerdictTitle('uk', true, 21_000)).toBe('Правильно · 21 секунда');
    expect(duelVerdictTitle('pl', true, 22_000)).toBe('Dobrze · 22 sekundy');
    expect(duelVerdictTitle('en', true, 1_000)).toBe('Correct · 1 second');
  });

  it('часы: сначала округляем, потом делим', () => {
    expect(duelClock(59_600)).toBe('1:00');
    expect(duelClock(7_000)).toBe('0:07');
    expect(duelClock(-5)).toBe('0:00');
  });
});
