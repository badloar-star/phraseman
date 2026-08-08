// ═══════════════════════════════════════════════════════════════════════════
// Страж единого реестра синтетических персонажей.
//
// зачем: правила владельца от 2026-08-04 («все с нуля», «каждые 6 часов
// 10..800 с шансом 50% на ноль», «уровень и аватар пропорционально опыту»,
// «один персонаж — один опыт везде») легко нарушить случайной правкой темпа
// или эпохи. Тест ловит именно это, а не внутреннее устройство функций.
// ═══════════════════════════════════════════════════════════════════════════

import {
  RESIDENT_EPOCH_MS,
  RESIDENT_MAX_LEVEL,
  RESIDENT_SLOT_COUNT,
  RESIDENT_TICK_MS,
  residentGeneration,
  residentLevelFromXp,
  residentPace,
  residentSignupMs,
  residentProfileAt,
  residentTickGain,
  residentTotalXpAt,
  residentStreakAt,
  RESIDENT_STREAK_MAX,
  RESIDENT_STREAK_MAX_RESETS_PER_MONTH,
  residentXpGainedBetween,
} from './synthetic_residents';
import { residentStreakAt as clientResidentStreakAt } from '../../constants/synthetic_residents';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('synthetic residents — правила владельца', () => {
  it('КАЖДЫЙ персонаж начинает жизнь с нуля опыта и первого уровня', () => {
    // Требование владельца «все жители должны начать с 0 опыта и уровня»
    // выполняется для каждого персонажа в момент его собственной регистрации.
    // Общий старт для всех давал бы комнату из 28 одинаковых новичков — замер
    // 2026-08-04 показал ровно 1 уникальный уровень на день запуска.
    for (let index = 0; index < 40; index++) {
      const signup = residentSignupMs(index, RESIDENT_EPOCH_MS);
      const profile = residentProfileAt(index, signup);
      expect(profile.totalXp).toBe(0);
      expect(profile.level).toBe(1);
      expect(profile.avatar).toBe('1');
    }
  });

  it('до самой первой регистрации слот пуст — персонажа ещё не существует', () => {
    for (let index = 0; index < 20; index++) {
      // Берём момент ДО первого поколения: за день до регистрации текущего
      // поколения слот занимало предыдущее, и опыт там законно ненулевой.
      const firstSignup = residentSignupMs(index, RESIDENT_EPOCH_MS - 10 * 365 * DAY_MS);
      expect(residentTotalXpAt(index, firstSignup - DAY_MS)).toBe(0);
    }
  });

  it('в день запуска комната разнообразна, а не строй клонов', () => {
    // Прямая защита от дефекта, найденного замером: общий старт давал всем
    // 1 уровень и одинаковый аватар.
    const levels = Array.from(
      { length: 28 },
      (_, index) => residentProfileAt(index, RESIDENT_EPOCH_MS).level,
    );
    expect(new Set(levels).size).toBeGreaterThanOrEqual(10);
  });

  it('опыт только растёт и меняется ступеньками по часу', () => {
    const index = 7;
    const signup = residentSignupMs(index, RESIDENT_EPOCH_MS);
    let previous = 0;
    for (let tick = 0; tick < 40; tick++) {
      const atTickStart = residentTotalXpAt(index, signup + tick * RESIDENT_TICK_MS);
      // Внутри тика значение не меняется — документ честно статичен между кронами.
      const midTick = residentTotalXpAt(
        index,
        signup + tick * RESIDENT_TICK_MS + RESIDENT_TICK_MS / 2,
      );
      expect(midTick).toBe(atTickStart);
      expect(atTickStart).toBeGreaterThanOrEqual(previous);
      previous = atTickStart;
    }
  });

  it('прибавка за час либо ноль, либо в границах 2..134 с учётом темпа', () => {
    for (let index = 0; index < 20; index++) {
      const pace = residentPace(index);
      for (let tick = 0; tick < 60; tick++) {
        const gain = residentTickGain(index, tick);
        if (gain === 0) continue;
        expect(gain).toBeGreaterThanOrEqual(1);
        expect(gain).toBeLessThanOrEqual(Math.round(134 * pace));
      }
    }
  });

  it('примерно половина тиков — нулевые (персонаж «не заходил»)', () => {
    let zero = 0;
    let total = 0;
    for (let index = 0; index < 30; index++) {
      for (let tick = 0; tick < 200; tick++) {
        if (residentTickGain(index, tick) === 0) zero++;
        total++;
      }
    }
    const share = zero / total;
    expect(share).toBeGreaterThan(0.42);
    expect(share).toBeLessThan(0.58);
  });

  it('детерминизм: один и тот же персонаж в один и тот же момент одинаков', () => {
    const at = RESIDENT_EPOCH_MS + 123 * DAY_MS;
    for (let index = 0; index < 10; index++) {
      expect(residentProfileAt(index, at)).toEqual(residentProfileAt(index, at));
    }
  });

  it('аватар строго равен уровню — растут пропорционально опыту', () => {
    for (const days of [1, 30, 200, 900]) {
      for (let index = 0; index < 15; index++) {
        const profile = residentProfileAt(index, RESIDENT_EPOCH_MS + days * DAY_MS);
        expect(profile.avatar).toBe(String(profile.level));
        expect(profile.level).toBe(residentLevelFromXp(profile.totalXp));
      }
    }
  });

  it('уровень никогда не превышает потолок живого игрока', () => {
    for (let index = 0; index < 30; index++) {
      const profile = residentProfileAt(index, RESIDENT_EPOCH_MS + 5000 * DAY_MS);
      expect(profile.level).toBeLessThanOrEqual(RESIDENT_MAX_LEVEL);
      expect(Number(profile.avatar)).toBeLessThanOrEqual(RESIDENT_MAX_LEVEL);
    }
  });

  it('комната не превращается в строй клонов: уровни заметно разные', () => {
    // Ровно тот дефект, который вскрыла проверка 2026-08-04 до введения темпа:
    // без множителя за 90 дней все 28 персонажей сходились к уровням 17..19.
    const at = RESIDENT_EPOCH_MS + 90 * DAY_MS;
    const levels = Array.from({ length: 28 }, (_, i) => residentProfileAt(i, at).level);
    const spread = Math.max(...levels) - Math.min(...levels);
    expect(spread).toBeGreaterThanOrEqual(8);
  });

  it('вклад за период равен разнице накопленного опыта', () => {
    const from = RESIDENT_EPOCH_MS + 40 * DAY_MS;
    const to = from + 7 * DAY_MS;
    for (let index = 0; index < 12; index++) {
      // Сверяем только персонажей, не сменивших поколение внутри окна: на
      // границе смены разница накопленного опыта отрицательна (новый персонаж
      // начинает с нуля), и сравнивать её с приростом бессмысленно.
      if (residentGeneration(index, from).generation !== residentGeneration(index, to).generation) {
        continue;
      }
      expect(residentXpGainedBetween(index, from, to))
        .toBe(residentTotalXpAt(index, to) - residentTotalXpAt(index, from));
    }
  });

  it('имя не меняется, пока живёт поколение — сосед не переименовывается', () => {
    for (let index = 0; index < 20; index++) {
      const { generation, signupMs } = residentGeneration(index, RESIDENT_EPOCH_MS);
      const early = residentProfileAt(index, signupMs + DAY_MS).name;
      const late = residentProfileAt(index, signupMs + 100 * DAY_MS).name;
      // Сравниваем внутри ОДНОГО поколения: смена поколения — это другой
      // человек, и ник у него законно другой.
      const stillSame = residentGeneration(index, signupMs + 100 * DAY_MS).generation === generation;
      if (stillSame) expect(early).toBe(late);
      expect(early.length).toBeGreaterThan(0);
    }
  });

  it('в одной комнате нет двойников: имена уникальны в любом поколении', () => {
    // Регрессия 2026-08-04: сдвиг имён по поколениям давал коллизии (184
    // уникальных имени на 200 слотов), потому что рядом живут разные
    // поколения и раскладки накладывались. Два игрока с одним ником в комнате
    // выдали бы подделку мгновенно. Лечится блоками имён на слот.
    for (const days of [0, 500, 1200, 2500, 5000]) {
      const at = RESIDENT_EPOCH_MS + days * DAY_MS;
      const names = new Set(
        Array.from({ length: RESIDENT_SLOT_COUNT }, (_, i) => residentProfileAt(i, at).name),
      );
      expect(names.size).toBe(RESIDENT_SLOT_COUNT);
    }
  });

  it('слотов хватает, чтобы заполнить комнату лиги без повторов', () => {
    // Комната дозаполняется до 28 участников — блоков имён должно хватать.
    expect(RESIDENT_SLOT_COUNT).toBeGreaterThanOrEqual(28);
  });
});

// ── Серия дней ──────────────────────────────────────────────────────────────
// Правило владельца (2026-08-04): «цепочка у ботов всегда 0 — исправь, чтобы
// показывалась рандомно, в рандомные дни сбрасывалась на 0 и дальше +1 в день,
// не более 3 сбросов в месяц». До этого серия была одним числом из хэша: она
// не двигалась во времени, а у трети персонажей была намертво нулевой.
describe('synthetic residents — серия дней', () => {
  const LONG_SIGNUP = Date.UTC(2024, 0, 1);

  it('растёт ровно на +1 в день, пока не случился срыв', () => {
    for (let index = 0; index < 30; index++) {
      let prev = residentStreakAt(index, RESIDENT_EPOCH_MS, LONG_SIGNUP);
      for (let day = 1; day <= 120; day++) {
        const cur = residentStreakAt(index, RESIDENT_EPOCH_MS + day * DAY_MS, LONG_SIGNUP);
        // Либо срыв (0), либо ровно +1, либо упор в потолок.
        const ok = cur === 0 || cur === prev + 1 || (cur === RESIDENT_STREAK_MAX && prev === RESIDENT_STREAK_MAX);
        expect({ index, day, prev, cur, ok }).toEqual({ index, day, prev, cur, ok: true });
        prev = cur;
      }
    }
  });

  it('срывов не больше трёх за календарный месяц', () => {
    for (let index = 0; index < 60; index++) {
      for (let month = 0; month < 12; month++) {
        const start = Date.UTC(2026, month, 1);
        const end = Date.UTC(2026, month + 1, 1);
        let resets = 0;
        for (let t = start; t < end; t += DAY_MS) {
          if (residentStreakAt(index, t, LONG_SIGNUP) === 0) resets++;
        }
        expect(resets).toBeLessThanOrEqual(RESIDENT_STREAK_MAX_RESETS_PER_MONTH);
      }
    }
  });

  it('ноль виден только в день срыва, а не постоянно у трети персонажей', () => {
    // Регрессия, ради которой всё и переписано: старая формула держала ~30%
    // персонажей на нуле НАВСЕГДА, и владелец видел комнату с нулями.
    const room = Array.from(
      { length: 28 },
      (_, slot) => residentProfileAt(slot, RESIDENT_EPOCH_MS).streak,
    );
    const zeros = room.filter((v) => v === 0).length;
    expect(zeros).toBeLessThanOrEqual(4);
    // И разброс живой, а не одно значение на всех.
    expect(new Set(room).size).toBeGreaterThanOrEqual(10);
  });

  it('серия не длиннее стажа персонажа в приложении', () => {
    // Новичок, зарегистрированный 5 дней назад, не может показать 40 дней
    // серии — это выдало бы подделку.
    for (let index = 0; index < 40; index++) {
      const streak = residentStreakAt(index, RESIDENT_EPOCH_MS, RESIDENT_EPOCH_MS - 5 * DAY_MS);
      expect(streak).toBeLessThanOrEqual(5);
    }
  });

  it('клиентское зеркало считает серию так же, как сервер', () => {
    // Житель лиги (сервер) и бот турнира (клиент) — один и тот же персонаж:
    // разойтись в цифре они не имеют права.
    for (let index = 0; index < 200; index++) {
      expect(clientResidentStreakAt(index, RESIDENT_EPOCH_MS, LONG_SIGNUP))
        .toBe(residentStreakAt(index, RESIDENT_EPOCH_MS, LONG_SIGNUP));
    }
  });
});
