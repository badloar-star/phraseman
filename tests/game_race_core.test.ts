/**
 * «Гонка с собой»: варианты решаемы, заход кончается минутой или тремя ошибками, нижняя монета идёт по вчерашнему
 * заходу, история хранится на устройстве по владельцу и переживает сбой записи (перенос макета Elevate, D207).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  INITIAL_RACE_STATE, __raceTestHooks as hooks, answerRace, buildRaceQuestions, canStartRace, formatRaceClock,
  ghostCorrectAt, isRaceOver, parseRaceHistory, peekRaceHistory, previousRaceDay, raceDayKey, raceQuestionAt,
  raceSecondsLeft, raceShare, refreshRaceHistory, saveRaceRun, withRaceRun, yesterdayRun, type RaceItem,
} from '../modules/games/race_core';
import { RACE_MOTION } from '../modules/games/race_motion';

const item = (id: string, text: string, translation: string): RaceItem => ({ id, text, translation });
const POOL: RaceItem[] = [
  item('a', 'I am ready.', 'Я готов.'), item('b', 'She is busy.', 'Она занята.'), item('c', 'We are free.', 'Мы свободны.'),
  item('d', 'The door is open.', 'Дверь открыта.'), item('e', 'The bus is late today again for the second time.', 'Автобус снова опаздывает.'),
  item('f', 'They are here.', 'Они здесь.'),
];
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

describe('вопросы', () => {
  it('у каждой фразы четыре разных варианта, верный — её перевод', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const qs = buildRaceQuestions(POOL, seeded(seed));
      expect(qs).toHaveLength(POOL.length);
      for (const q of qs) {
        expect(q.options).toHaveLength(RACE_MOTION.options);
        expect(new Set(q.options.map((o) => o.toLowerCase())).size).toBe(RACE_MOTION.options);
        expect(q.options[q.correctIndex]).toBe(POOL.find((p) => p.id === q.id)?.translation);
      }
    }
  });

  it('короткие фразы идут первыми, длинная — в конце', () => {
    const qs = buildRaceQuestions(POOL, seeded(7));
    expect(qs[qs.length - 1].id).toBe('e');
  });

  it('одинаковые переводы и пустые фразы отбрасываются; меньше четырёх годных — игры нет', () => {
    const dup = [item('a', 'A', 'Один'), item('b', 'B', 'один'), item('c', '', 'Два'), item('d', 'D', ''), item('e', 'E', 'Три'), item('f', 'F', 'Четыре')];
    expect(canStartRace(dup)).toBe(false);
    expect(buildRaceQuestions(dup)).toEqual([]);
    expect(canStartRace(POOL)).toBe(true);
  });

  it('вопросы идут по кругу, пустой список — ни одного вопроса', () => {
    const qs = buildRaceQuestions(POOL, seeded(3));
    expect(raceQuestionAt(qs, qs.length + 2)).toBe(qs[2]);
    expect(raceQuestionAt(qs, -1)).toBe(qs[qs.length - 1]);
    expect(raceQuestionAt([], 0)).toBeNull();
  });
});

describe('ход захода', () => {
  const [q] = buildRaceQuestions(POOL, seeded(5));
  const wrong = (q.correctIndex + 1) % q.options.length;

  it('верный ответ — плюс один и отметка времени; неверный — минус сердце', () => {
    const ok = answerRace(INITIAL_RACE_STATE, q, q.correctIndex, 4200.4);
    expect(ok).toEqual({ correct: true, over: false, state: { asked: 1, correct: 1, misses: 0, lives: 3, marks: [4200] } });
    const miss = answerRace(ok.state, q, wrong, 5000);
    expect(miss.state).toEqual({ asked: 2, correct: 1, misses: 1, lives: 2, marks: [4200] });
  });

  it('три ошибки заканчивают заход; после конца ответы не принимаются', () => {
    let state = INITIAL_RACE_STATE;
    let over = false;
    for (let i = 0; i < 3; i += 1) ({ state, over } = answerRace(state, q, wrong, 1000 * i));
    expect([state.lives, over]).toEqual([0, true]);
    expect(answerRace(state, q, q.correctIndex, 4000).state).toBe(state);
  });

  it('минута заканчивает заход; ответ после минуты не засчитывается', () => {
    expect(isRaceOver(INITIAL_RACE_STATE, RACE_MOTION.durationMs - 1)).toBe(false);
    expect(isRaceOver(INITIAL_RACE_STATE, RACE_MOTION.durationMs)).toBe(true);
    expect(isRaceOver(INITIAL_RACE_STATE, Number.NaN)).toBe(true);
    expect(answerRace(INITIAL_RACE_STATE, q, q.correctIndex, 60000).correct).toBe(false);
  });

  it('таймер: 1:00 на старте, 0:47 через 13 секунд, 0:00 в конце и после', () => {
    expect(formatRaceClock(raceSecondsLeft(0))).toBe('1:00');
    expect(formatRaceClock(raceSecondsLeft(13000))).toBe('0:47');
    expect(formatRaceClock(raceSecondsLeft(13999))).toBe('0:47');
    expect(formatRaceClock(raceSecondsLeft(61000))).toBe('0:00');
    expect(formatRaceClock(raceSecondsLeft(Number.NaN))).toBe('0:00');
  });

  it('масштаб дорожек и полос — как в макете: 23 → .77, 19 → .63, 26 → .87, тридцать и больше — финиш', () => {
    expect(raceShare(23).toFixed(2)).toBe('0.77');
    expect(raceShare(19).toFixed(2)).toBe('0.63');
    expect(raceShare(26).toFixed(2)).toBe('0.87');
    expect(raceShare(30)).toBe(1);
    expect(raceShare(45)).toBe(1);
    expect(raceShare(0)).toBe(0);
    expect(raceShare(Number.NaN)).toBe(0);
  });

  it('нижняя монета: сколько верных было у вчерашнего захода к этому мгновению', () => {
    const marks = [1500, 4000, 4000, 9000];
    expect([0, 1500, 3999, 4000, 60000].map((t) => ghostCorrectAt(marks, t))).toEqual([0, 1, 1, 3, 4]);
  });
});

describe('дни и история', () => {
  it('вчера — предыдущий календарный день, через границы месяца и года; битая дата — null', () => {
    expect(previousRaceDay('2026-11-11')).toBe('2026-11-10');
    expect(previousRaceDay('2026-03-01')).toBe('2026-02-28');
    expect(previousRaceDay('2026-01-01')).toBe('2025-12-31');
    expect(previousRaceDay('garbage')).toBeNull();
    expect(raceDayKey(new Date(2026, 10, 11, 23, 59).getTime())).toBe('2026-11-11');
  });

  it('на день остаётся лучший заход, позавчерашний удаляется, рекорд только растёт', () => {
    let h = parseRaceHistory(null, 'o');
    h = withRaceRun(h, '2026-11-09', { correct: 26, marks: [] });
    h = withRaceRun(h, '2026-11-10', { correct: 19, marks: [3000, 1000] });
    expect(h.days['2026-11-10'].marks).toEqual([1000, 3000]);
    h = withRaceRun(h, '2026-11-11', { correct: 12, marks: [] });
    h = withRaceRun(h, '2026-11-11', { correct: 10, marks: [] });
    expect(Object.keys(h.days).sort()).toEqual(['2026-11-10', '2026-11-11']);
    expect(h.days['2026-11-11'].correct).toBe(12);
    expect(h.best).toBe(26);
    expect(yesterdayRun(h, '2026-11-11')?.correct).toBe(19);
    expect(yesterdayRun(h, '2026-11-13')).toBeNull();
    expect(yesterdayRun(null, '2026-11-11')).toBeNull();
  });

  it('битый диск не роняет игру: плохие дни и отметки отбрасываются', () => {
    expect(parseRaceHistory('{', 'o')).toEqual({ ownerKey: 'o', days: {}, best: 0 });
    expect(parseRaceHistory('[1]', 'o').days).toEqual({});
    const h = parseRaceHistory(JSON.stringify({ days: { '2026-11-10': { correct: 4, marks: [1, 2] }, bad: { correct: 1, marks: [] }, '2026-11-09': { correct: 2, marks: [99999] } }, best: -3 }), 'o');
    expect(Object.keys(h.days)).toEqual(['2026-11-10']);
    expect(h.best).toBe(4);
  });
});

describe('хранилище на устройстве', () => {
  let owner: string | null = 'owner-a';

  beforeEach(async () => {
    hooks.reset();
    await AsyncStorage.clear();
    owner = 'owner-a';
    hooks.setDeps({ ownerStableId: async () => owner });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('заход виден в памяти сразу, лежит на диске и переживает перезапуск', async () => {
    await saveRaceRun('2026-11-10', { correct: 19, marks: [1000] });
    expect(peekRaceHistory()?.best).toBe(19);
    const raw = await AsyncStorage.getItem('game_race_v1:owner-a');
    expect(JSON.parse(raw as string)).toEqual({ v: 1, days: { '2026-11-10': { correct: 19, marks: [1000] } }, best: 19 });
    hooks.reset();
    hooks.setDeps({ ownerStableId: async () => owner });
    expect(peekRaceHistory()).toBeNull();
    expect(yesterdayRun(await refreshRaceHistory(), '2026-11-11')?.correct).toBe(19);
  });

  it('другой владелец не видит чужой заход', async () => {
    await saveRaceRun('2026-11-10', { correct: 19, marks: [] });
    owner = 'owner-b';
    hooks.reset();
    hooks.setDeps({ ownerStableId: async () => owner });
    expect((await refreshRaceHistory()).best).toBe(0);
  });

  it('сбой записи не теряет заход: он в памяти и ложится на диск со следующим', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await saveRaceRun('2026-11-10', { correct: 19, marks: [] });
    expect(peekRaceHistory()?.best).toBe(19);
    expect(warn.mock.calls.some(([line]) => String(line).includes('[GAME-RACE] save:failed'))).toBe(true);
    await saveRaceRun('2026-11-11', { correct: 5, marks: [] });
    const raw = JSON.parse((await AsyncStorage.getItem('game_race_v1:owner-a')) as string);
    expect(raw.days['2026-11-10'].correct).toBe(19);
    expect(raw.best).toBe(19);
  });

  it('два захода подряд не затирают друг друга', async () => {
    await Promise.all([saveRaceRun('2026-11-10', { correct: 19, marks: [] }), saveRaceRun('2026-11-11', { correct: 7, marks: [] })]);
    expect(Object.keys(peekRaceHistory()?.days ?? {}).sort()).toEqual(['2026-11-10', '2026-11-11']);
  });
});
