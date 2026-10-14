// зачем: владелец 14.10 одобрил звуки лаборатории; несколько вариантов на событие, без повторов подряд.
//
// Каталог звуков V2: событие → варианты → (у серий) шаги → файл. Файл сгенерирован из рендера
// лаборатории docs/design/v2-app/sound-lab.html (см. docs/work/tasks/sound-v2-catalog.md);
// руками правится только вместе с assets/sounds/v2/. Имена событий — как в лаборатории, латиницей.
//
// Metro требует статические require с литералом, поэтому каждый файл подключён явной строкой.
// Файлы подгружаются НЕ при импорте каталога: require ассета возвращает лишь числовой идентификатор,
// нативный плеер создаёт sound_bank по первому запросу (ленивая подгрузка, холодный старт не страдает).

export type SoundV2GroupId = 'touch' | 'learn' | 'reward' | 'day' | 'peak' | 'plus';

export type SoundV2EventId =
  | 'tap'
  | 'toggle_on'
  | 'toggle_off'
  | 'sheet_open'
  | 'sheet_close'
  | 'swipe_know'
  | 'swipe_learn'
  | 'story'
  | 'correct'
  | 'wrong'
  | 'lightning'
  | 'lesson_done'
  | 'lesson_perfect'
  | 'hint'
  | 'coin'
  | 'coins_many'
  | 'coin_rank'
  | 'achievement'
  | 'ring'
  | 'day_done'
  | 'streak_small'
  | 'streak_mid'
  | 'streak_big'
  | 'streak_year'
  | 'streak_legend'
  | 'streak_risk'
  | 'step'
  | 'floor'
  | 'summit'
  | 'league_up'
  | 'league_stay'
  | 'league_down'
  | 'new_week'
  | 'plus'
  | 'energy_out'
  | 'energy_back';

export type SoundV2Clip = Readonly<{
  /** Путь относительно assets/sounds/v2 — по нему тест проверяет, что файл существует. */
  file: string;
  /** Длительность файла, мс (с округлением вверх) — по ней банк понимает, когда плеер свободен. */
  ms: number;
  /** Результат require ассета. */
  source: number;
}>;

export type SoundV2EventDef = Readonly<{
  group: SoundV2GroupId;
  /** Число шагов серии; у обычных событий 1. */
  steps: number;
  /** true — шаги идут по кругу (кольцо дня 0→1→2→0), false — после последнего держится последний. */
  cycle: boolean;
  /** variants[вариант][шаг]; у обычных событий в каждом варианте ровно один клип. */
  variants: readonly (readonly SoundV2Clip[])[];
}>;

function clip(file: string, ms: number, source: number): SoundV2Clip {
  return Object.freeze({ file, ms, source });
}

function def(
  group: SoundV2GroupId,
  steps: number,
  cycle: boolean,
  variants: readonly (readonly SoundV2Clip[])[],
): SoundV2EventDef {
  return Object.freeze({ group, steps, cycle, variants: Object.freeze(variants.map((v) => Object.freeze([...v]))) });
}

export const SOUND_V2_CATALOG: Readonly<Record<SoundV2EventId, SoundV2EventDef>> = {
  tap: def('touch', 1, false, [
    [clip('tap/v1.m4a', 138, require('../../assets/sounds/v2/tap/v1.m4a'))],
    [clip('tap/v2.m4a', 148, require('../../assets/sounds/v2/tap/v2.m4a'))],
    [clip('tap/v3.m4a', 138, require('../../assets/sounds/v2/tap/v3.m4a'))],
    [clip('tap/v4.m4a', 140, require('../../assets/sounds/v2/tap/v4.m4a'))],
  ]),
  toggle_on: def('touch', 1, false, [
    [clip('toggle_on/v1.m4a', 270, require('../../assets/sounds/v2/toggle_on/v1.m4a'))],
    [clip('toggle_on/v2.m4a', 289, require('../../assets/sounds/v2/toggle_on/v2.m4a'))],
    [clip('toggle_on/v3.m4a', 287, require('../../assets/sounds/v2/toggle_on/v3.m4a'))],
    [clip('toggle_on/v4.m4a', 264, require('../../assets/sounds/v2/toggle_on/v4.m4a'))],
  ]),
  toggle_off: def('touch', 1, false, [
    [clip('toggle_off/v1.m4a', 263, require('../../assets/sounds/v2/toggle_off/v1.m4a'))],
    [clip('toggle_off/v2.m4a', 303, require('../../assets/sounds/v2/toggle_off/v2.m4a'))],
    [clip('toggle_off/v3.m4a', 279, require('../../assets/sounds/v2/toggle_off/v3.m4a'))],
    [clip('toggle_off/v4.m4a', 258, require('../../assets/sounds/v2/toggle_off/v4.m4a'))],
  ]),
  sheet_open: def('touch', 1, false, [
    [clip('sheet_open/v1.m4a', 430, require('../../assets/sounds/v2/sheet_open/v1.m4a'))],
    [clip('sheet_open/v2.m4a', 444, require('../../assets/sounds/v2/sheet_open/v2.m4a'))],
    [clip('sheet_open/v3.m4a', 420, require('../../assets/sounds/v2/sheet_open/v3.m4a'))],
    [clip('sheet_open/v4.m4a', 449, require('../../assets/sounds/v2/sheet_open/v4.m4a'))],
  ]),
  sheet_close: def('touch', 1, false, [
    [clip('sheet_close/v1.m4a', 388, require('../../assets/sounds/v2/sheet_close/v1.m4a'))],
    [clip('sheet_close/v2.m4a', 400, require('../../assets/sounds/v2/sheet_close/v2.m4a'))],
    [clip('sheet_close/v3.m4a', 329, require('../../assets/sounds/v2/sheet_close/v3.m4a'))],
    [clip('sheet_close/v4.m4a', 326, require('../../assets/sounds/v2/sheet_close/v4.m4a'))],
  ]),
  swipe_know: def('touch', 1, false, [
    [clip('swipe_know/v1.m4a', 429, require('../../assets/sounds/v2/swipe_know/v1.m4a'))],
    [clip('swipe_know/v2.m4a', 403, require('../../assets/sounds/v2/swipe_know/v2.m4a'))],
    [clip('swipe_know/v3.m4a', 367, require('../../assets/sounds/v2/swipe_know/v3.m4a'))],
    [clip('swipe_know/v4.m4a', 348, require('../../assets/sounds/v2/swipe_know/v4.m4a'))],
  ]),
  swipe_learn: def('touch', 1, false, [
    [clip('swipe_learn/v1.m4a', 389, require('../../assets/sounds/v2/swipe_learn/v1.m4a'))],
    [clip('swipe_learn/v2.m4a', 367, require('../../assets/sounds/v2/swipe_learn/v2.m4a'))],
    [clip('swipe_learn/v3.m4a', 429, require('../../assets/sounds/v2/swipe_learn/v3.m4a'))],
    [clip('swipe_learn/v4.m4a', 434, require('../../assets/sounds/v2/swipe_learn/v4.m4a'))],
  ]),
  story: def('touch', 1, false, [
    [clip('story/v1.m4a', 207, require('../../assets/sounds/v2/story/v1.m4a'))],
    [clip('story/v2.m4a', 262, require('../../assets/sounds/v2/story/v2.m4a'))],
    [clip('story/v3.m4a', 224, require('../../assets/sounds/v2/story/v3.m4a'))],
    [clip('story/v4.m4a', 260, require('../../assets/sounds/v2/story/v4.m4a'))],
  ]),
  correct: def('learn', 8, false, [
    [clip('correct/v1_s0.m4a', 472, require('../../assets/sounds/v2/correct/v1_s0.m4a')),
      clip('correct/v1_s1.m4a', 470, require('../../assets/sounds/v2/correct/v1_s1.m4a')),
      clip('correct/v1_s2.m4a', 470, require('../../assets/sounds/v2/correct/v1_s2.m4a')),
      clip('correct/v1_s3.m4a', 470, require('../../assets/sounds/v2/correct/v1_s3.m4a')),
      clip('correct/v1_s4.m4a', 471, require('../../assets/sounds/v2/correct/v1_s4.m4a')),
      clip('correct/v1_s5.m4a', 470, require('../../assets/sounds/v2/correct/v1_s5.m4a')),
      clip('correct/v1_s6.m4a', 470, require('../../assets/sounds/v2/correct/v1_s6.m4a')),
      clip('correct/v1_s7.m4a', 471, require('../../assets/sounds/v2/correct/v1_s7.m4a'))],
    [clip('correct/v2_s0.m4a', 409, require('../../assets/sounds/v2/correct/v2_s0.m4a')),
      clip('correct/v2_s1.m4a', 407, require('../../assets/sounds/v2/correct/v2_s1.m4a')),
      clip('correct/v2_s2.m4a', 407, require('../../assets/sounds/v2/correct/v2_s2.m4a')),
      clip('correct/v2_s3.m4a', 404, require('../../assets/sounds/v2/correct/v2_s3.m4a')),
      clip('correct/v2_s4.m4a', 406, require('../../assets/sounds/v2/correct/v2_s4.m4a')),
      clip('correct/v2_s5.m4a', 406, require('../../assets/sounds/v2/correct/v2_s5.m4a')),
      clip('correct/v2_s6.m4a', 408, require('../../assets/sounds/v2/correct/v2_s6.m4a')),
      clip('correct/v2_s7.m4a', 407, require('../../assets/sounds/v2/correct/v2_s7.m4a'))],
    [clip('correct/v3_s0.m4a', 437, require('../../assets/sounds/v2/correct/v3_s0.m4a')),
      clip('correct/v3_s1.m4a', 454, require('../../assets/sounds/v2/correct/v3_s1.m4a')),
      clip('correct/v3_s2.m4a', 453, require('../../assets/sounds/v2/correct/v3_s2.m4a')),
      clip('correct/v3_s3.m4a', 444, require('../../assets/sounds/v2/correct/v3_s3.m4a')),
      clip('correct/v3_s4.m4a', 430, require('../../assets/sounds/v2/correct/v3_s4.m4a')),
      clip('correct/v3_s5.m4a', 412, require('../../assets/sounds/v2/correct/v3_s5.m4a')),
      clip('correct/v3_s6.m4a', 449, require('../../assets/sounds/v2/correct/v3_s6.m4a')),
      clip('correct/v3_s7.m4a', 452, require('../../assets/sounds/v2/correct/v3_s7.m4a'))],
    [clip('correct/v4_s0.m4a', 452, require('../../assets/sounds/v2/correct/v4_s0.m4a')),
      clip('correct/v4_s1.m4a', 453, require('../../assets/sounds/v2/correct/v4_s1.m4a')),
      clip('correct/v4_s2.m4a', 454, require('../../assets/sounds/v2/correct/v4_s2.m4a')),
      clip('correct/v4_s3.m4a', 453, require('../../assets/sounds/v2/correct/v4_s3.m4a')),
      clip('correct/v4_s4.m4a', 453, require('../../assets/sounds/v2/correct/v4_s4.m4a')),
      clip('correct/v4_s5.m4a', 454, require('../../assets/sounds/v2/correct/v4_s5.m4a')),
      clip('correct/v4_s6.m4a', 454, require('../../assets/sounds/v2/correct/v4_s6.m4a')),
      clip('correct/v4_s7.m4a', 456, require('../../assets/sounds/v2/correct/v4_s7.m4a'))],
  ]),
  wrong: def('learn', 1, false, [
    [clip('wrong/v1.m4a', 399, require('../../assets/sounds/v2/wrong/v1.m4a'))],
    [clip('wrong/v2.m4a', 390, require('../../assets/sounds/v2/wrong/v2.m4a'))],
    [clip('wrong/v3.m4a', 417, require('../../assets/sounds/v2/wrong/v3.m4a'))],
    [clip('wrong/v4.m4a', 418, require('../../assets/sounds/v2/wrong/v4.m4a'))],
  ]),
  lightning: def('learn', 4, false, [
    [clip('lightning/v1_s0.m4a', 416, require('../../assets/sounds/v2/lightning/v1_s0.m4a')),
      clip('lightning/v1_s1.m4a', 423, require('../../assets/sounds/v2/lightning/v1_s1.m4a')),
      clip('lightning/v1_s2.m4a', 428, require('../../assets/sounds/v2/lightning/v1_s2.m4a')),
      clip('lightning/v1_s3.m4a', 433, require('../../assets/sounds/v2/lightning/v1_s3.m4a'))],
    [clip('lightning/v2_s0.m4a', 419, require('../../assets/sounds/v2/lightning/v2_s0.m4a')),
      clip('lightning/v2_s1.m4a', 420, require('../../assets/sounds/v2/lightning/v2_s1.m4a')),
      clip('lightning/v2_s2.m4a', 423, require('../../assets/sounds/v2/lightning/v2_s2.m4a')),
      clip('lightning/v2_s3.m4a', 426, require('../../assets/sounds/v2/lightning/v2_s3.m4a'))],
    [clip('lightning/v3_s0.m4a', 420, require('../../assets/sounds/v2/lightning/v3_s0.m4a')),
      clip('lightning/v3_s1.m4a', 424, require('../../assets/sounds/v2/lightning/v3_s1.m4a')),
      clip('lightning/v3_s2.m4a', 427, require('../../assets/sounds/v2/lightning/v3_s2.m4a')),
      clip('lightning/v3_s3.m4a', 430, require('../../assets/sounds/v2/lightning/v3_s3.m4a'))],
    [clip('lightning/v4_s0.m4a', 397, require('../../assets/sounds/v2/lightning/v4_s0.m4a')),
      clip('lightning/v4_s1.m4a', 399, require('../../assets/sounds/v2/lightning/v4_s1.m4a')),
      clip('lightning/v4_s2.m4a', 401, require('../../assets/sounds/v2/lightning/v4_s2.m4a')),
      clip('lightning/v4_s3.m4a', 402, require('../../assets/sounds/v2/lightning/v4_s3.m4a'))],
  ]),
  lesson_done: def('learn', 1, false, [
    [clip('lesson_done/v1.m4a', 2012, require('../../assets/sounds/v2/lesson_done/v1.m4a'))],
    [clip('lesson_done/v2.m4a', 2139, require('../../assets/sounds/v2/lesson_done/v2.m4a'))],
    [clip('lesson_done/v3.m4a', 1718, require('../../assets/sounds/v2/lesson_done/v3.m4a'))],
    [clip('lesson_done/v4.m4a', 2096, require('../../assets/sounds/v2/lesson_done/v4.m4a'))],
  ]),
  lesson_perfect: def('learn', 1, false, [
    [clip('lesson_perfect/v1.m4a', 2027, require('../../assets/sounds/v2/lesson_perfect/v1.m4a'))],
    [clip('lesson_perfect/v2.m4a', 2250, require('../../assets/sounds/v2/lesson_perfect/v2.m4a'))],
    [clip('lesson_perfect/v3.m4a', 1999, require('../../assets/sounds/v2/lesson_perfect/v3.m4a'))],
    [clip('lesson_perfect/v4.m4a', 2210, require('../../assets/sounds/v2/lesson_perfect/v4.m4a'))],
  ]),
  hint: def('learn', 1, false, [
    [clip('hint/v1.m4a', 404, require('../../assets/sounds/v2/hint/v1.m4a'))],
    [clip('hint/v2.m4a', 409, require('../../assets/sounds/v2/hint/v2.m4a'))],
    [clip('hint/v3.m4a', 409, require('../../assets/sounds/v2/hint/v3.m4a'))],
    [clip('hint/v4.m4a', 406, require('../../assets/sounds/v2/hint/v4.m4a'))],
  ]),
  coin: def('reward', 5, false, [
    [clip('coin/v1_s0.m4a', 417, require('../../assets/sounds/v2/coin/v1_s0.m4a')),
      clip('coin/v1_s1.m4a', 417, require('../../assets/sounds/v2/coin/v1_s1.m4a')),
      clip('coin/v1_s2.m4a', 418, require('../../assets/sounds/v2/coin/v1_s2.m4a')),
      clip('coin/v1_s3.m4a', 418, require('../../assets/sounds/v2/coin/v1_s3.m4a')),
      clip('coin/v1_s4.m4a', 417, require('../../assets/sounds/v2/coin/v1_s4.m4a'))],
    [clip('coin/v2_s0.m4a', 368, require('../../assets/sounds/v2/coin/v2_s0.m4a')),
      clip('coin/v2_s1.m4a', 354, require('../../assets/sounds/v2/coin/v2_s1.m4a')),
      clip('coin/v2_s2.m4a', 386, require('../../assets/sounds/v2/coin/v2_s2.m4a')),
      clip('coin/v2_s3.m4a', 384, require('../../assets/sounds/v2/coin/v2_s3.m4a')),
      clip('coin/v2_s4.m4a', 362, require('../../assets/sounds/v2/coin/v2_s4.m4a'))],
    [clip('coin/v3_s0.m4a', 389, require('../../assets/sounds/v2/coin/v3_s0.m4a')),
      clip('coin/v3_s1.m4a', 388, require('../../assets/sounds/v2/coin/v3_s1.m4a')),
      clip('coin/v3_s2.m4a', 388, require('../../assets/sounds/v2/coin/v3_s2.m4a')),
      clip('coin/v3_s3.m4a', 388, require('../../assets/sounds/v2/coin/v3_s3.m4a')),
      clip('coin/v3_s4.m4a', 389, require('../../assets/sounds/v2/coin/v3_s4.m4a'))],
    [clip('coin/v4_s0.m4a', 412, require('../../assets/sounds/v2/coin/v4_s0.m4a')),
      clip('coin/v4_s1.m4a', 413, require('../../assets/sounds/v2/coin/v4_s1.m4a')),
      clip('coin/v4_s2.m4a', 412, require('../../assets/sounds/v2/coin/v4_s2.m4a')),
      clip('coin/v4_s3.m4a', 414, require('../../assets/sounds/v2/coin/v4_s3.m4a')),
      clip('coin/v4_s4.m4a', 413, require('../../assets/sounds/v2/coin/v4_s4.m4a'))],
  ]),
  coins_many: def('reward', 1, false, [
    [clip('coins_many/v1.m4a', 1290, require('../../assets/sounds/v2/coins_many/v1.m4a'))],
    [clip('coins_many/v2.m4a', 1374, require('../../assets/sounds/v2/coins_many/v2.m4a'))],
    [clip('coins_many/v3.m4a', 1417, require('../../assets/sounds/v2/coins_many/v3.m4a'))],
    [clip('coins_many/v4.m4a', 1207, require('../../assets/sounds/v2/coins_many/v4.m4a'))],
  ]),
  coin_rank: def('reward', 1, false, [
    [clip('coin_rank/v1.m4a', 1853, require('../../assets/sounds/v2/coin_rank/v1.m4a'))],
    [clip('coin_rank/v2.m4a', 1738, require('../../assets/sounds/v2/coin_rank/v2.m4a'))],
    [clip('coin_rank/v3.m4a', 1904, require('../../assets/sounds/v2/coin_rank/v3.m4a'))],
    [clip('coin_rank/v4.m4a', 2243, require('../../assets/sounds/v2/coin_rank/v4.m4a'))],
  ]),
  achievement: def('reward', 1, false, [
    [clip('achievement/v1.m4a', 2320, require('../../assets/sounds/v2/achievement/v1.m4a'))],
    [clip('achievement/v2.m4a', 2293, require('../../assets/sounds/v2/achievement/v2.m4a'))],
    [clip('achievement/v3.m4a', 2760, require('../../assets/sounds/v2/achievement/v3.m4a'))],
    [clip('achievement/v4.m4a', 2380, require('../../assets/sounds/v2/achievement/v4.m4a'))],
  ]),
  ring: def('day', 3, true, [
    [clip('ring/v1_s0.m4a', 736, require('../../assets/sounds/v2/ring/v1_s0.m4a')),
      clip('ring/v1_s1.m4a', 719, require('../../assets/sounds/v2/ring/v1_s1.m4a')),
      clip('ring/v1_s2.m4a', 718, require('../../assets/sounds/v2/ring/v1_s2.m4a'))],
    [clip('ring/v2_s0.m4a', 989, require('../../assets/sounds/v2/ring/v2_s0.m4a')),
      clip('ring/v2_s1.m4a', 944, require('../../assets/sounds/v2/ring/v2_s1.m4a')),
      clip('ring/v2_s2.m4a', 939, require('../../assets/sounds/v2/ring/v2_s2.m4a'))],
    [clip('ring/v3_s0.m4a', 666, require('../../assets/sounds/v2/ring/v3_s0.m4a')),
      clip('ring/v3_s1.m4a', 653, require('../../assets/sounds/v2/ring/v3_s1.m4a')),
      clip('ring/v3_s2.m4a', 658, require('../../assets/sounds/v2/ring/v3_s2.m4a'))],
    [clip('ring/v4_s0.m4a', 684, require('../../assets/sounds/v2/ring/v4_s0.m4a')),
      clip('ring/v4_s1.m4a', 700, require('../../assets/sounds/v2/ring/v4_s1.m4a')),
      clip('ring/v4_s2.m4a', 680, require('../../assets/sounds/v2/ring/v4_s2.m4a'))],
  ]),
  day_done: def('day', 1, false, [
    [clip('day_done/v1.m4a', 2210, require('../../assets/sounds/v2/day_done/v1.m4a'))],
    [clip('day_done/v2.m4a', 2397, require('../../assets/sounds/v2/day_done/v2.m4a'))],
    [clip('day_done/v3.m4a', 2491, require('../../assets/sounds/v2/day_done/v3.m4a'))],
    [clip('day_done/v4.m4a', 2350, require('../../assets/sounds/v2/day_done/v4.m4a'))],
  ]),
  streak_small: def('day', 1, false, [
    [clip('streak_small/v1.m4a', 1603, require('../../assets/sounds/v2/streak_small/v1.m4a'))],
    [clip('streak_small/v2.m4a', 1422, require('../../assets/sounds/v2/streak_small/v2.m4a'))],
    [clip('streak_small/v3.m4a', 1636, require('../../assets/sounds/v2/streak_small/v3.m4a'))],
    [clip('streak_small/v4.m4a', 1486, require('../../assets/sounds/v2/streak_small/v4.m4a'))],
  ]),
  streak_mid: def('day', 1, false, [
    [clip('streak_mid/v1.m4a', 2166, require('../../assets/sounds/v2/streak_mid/v1.m4a'))],
    [clip('streak_mid/v2.m4a', 2368, require('../../assets/sounds/v2/streak_mid/v2.m4a'))],
    [clip('streak_mid/v3.m4a', 2243, require('../../assets/sounds/v2/streak_mid/v3.m4a'))],
    [clip('streak_mid/v4.m4a', 2426, require('../../assets/sounds/v2/streak_mid/v4.m4a'))],
  ]),
  streak_big: def('day', 1, false, [
    [clip('streak_big/v1.m4a', 2474, require('../../assets/sounds/v2/streak_big/v1.m4a'))],
    [clip('streak_big/v2.m4a', 2404, require('../../assets/sounds/v2/streak_big/v2.m4a'))],
    [clip('streak_big/v3.m4a', 2790, require('../../assets/sounds/v2/streak_big/v3.m4a'))],
    [clip('streak_big/v4.m4a', 2524, require('../../assets/sounds/v2/streak_big/v4.m4a'))],
  ]),
  streak_year: def('day', 1, false, [
    [clip('streak_year/v1.m4a', 2788, require('../../assets/sounds/v2/streak_year/v1.m4a'))],
    [clip('streak_year/v2.m4a', 2776, require('../../assets/sounds/v2/streak_year/v2.m4a'))],
    [clip('streak_year/v3.m4a', 2757, require('../../assets/sounds/v2/streak_year/v3.m4a'))],
    [clip('streak_year/v4.m4a', 2808, require('../../assets/sounds/v2/streak_year/v4.m4a'))],
  ]),
  streak_legend: def('day', 1, false, [
    [clip('streak_legend/v1.m4a', 3573, require('../../assets/sounds/v2/streak_legend/v1.m4a'))],
    [clip('streak_legend/v2.m4a', 3899, require('../../assets/sounds/v2/streak_legend/v2.m4a'))],
    [clip('streak_legend/v3.m4a', 3913, require('../../assets/sounds/v2/streak_legend/v3.m4a'))],
    [clip('streak_legend/v4.m4a', 3712, require('../../assets/sounds/v2/streak_legend/v4.m4a'))],
  ]),
  streak_risk: def('day', 1, false, [
    [clip('streak_risk/v1.m4a', 793, require('../../assets/sounds/v2/streak_risk/v1.m4a'))],
    [clip('streak_risk/v2.m4a', 780, require('../../assets/sounds/v2/streak_risk/v2.m4a'))],
    [clip('streak_risk/v3.m4a', 751, require('../../assets/sounds/v2/streak_risk/v3.m4a'))],
    [clip('streak_risk/v4.m4a', 777, require('../../assets/sounds/v2/streak_risk/v4.m4a'))],
  ]),
  step: def('peak', 1, false, [
    [clip('step/v1.m4a', 714, require('../../assets/sounds/v2/step/v1.m4a'))],
    [clip('step/v2.m4a', 670, require('../../assets/sounds/v2/step/v2.m4a'))],
    [clip('step/v3.m4a', 620, require('../../assets/sounds/v2/step/v3.m4a'))],
    [clip('step/v4.m4a', 602, require('../../assets/sounds/v2/step/v4.m4a'))],
  ]),
  floor: def('peak', 1, false, [
    [clip('floor/v1.m4a', 1502, require('../../assets/sounds/v2/floor/v1.m4a'))],
    [clip('floor/v2.m4a', 1832, require('../../assets/sounds/v2/floor/v2.m4a'))],
    [clip('floor/v3.m4a', 1634, require('../../assets/sounds/v2/floor/v3.m4a'))],
    [clip('floor/v4.m4a', 1829, require('../../assets/sounds/v2/floor/v4.m4a'))],
  ]),
  summit: def('peak', 1, false, [
    [clip('summit/v1.m4a', 2561, require('../../assets/sounds/v2/summit/v1.m4a'))],
    [clip('summit/v2.m4a', 2960, require('../../assets/sounds/v2/summit/v2.m4a'))],
    [clip('summit/v3.m4a', 2649, require('../../assets/sounds/v2/summit/v3.m4a'))],
    [clip('summit/v4.m4a', 2758, require('../../assets/sounds/v2/summit/v4.m4a'))],
  ]),
  league_up: def('peak', 1, false, [
    [clip('league_up/v1.m4a', 2553, require('../../assets/sounds/v2/league_up/v1.m4a'))],
    [clip('league_up/v2.m4a', 2599, require('../../assets/sounds/v2/league_up/v2.m4a'))],
    [clip('league_up/v3.m4a', 2577, require('../../assets/sounds/v2/league_up/v3.m4a'))],
    [clip('league_up/v4.m4a', 2487, require('../../assets/sounds/v2/league_up/v4.m4a'))],
  ]),
  league_stay: def('peak', 1, false, [
    [clip('league_stay/v1.m4a', 1686, require('../../assets/sounds/v2/league_stay/v1.m4a'))],
    [clip('league_stay/v2.m4a', 1678, require('../../assets/sounds/v2/league_stay/v2.m4a'))],
    [clip('league_stay/v3.m4a', 1426, require('../../assets/sounds/v2/league_stay/v3.m4a'))],
    [clip('league_stay/v4.m4a', 1613, require('../../assets/sounds/v2/league_stay/v4.m4a'))],
  ]),
  league_down: def('peak', 1, false, [
    [clip('league_down/v1.m4a', 1620, require('../../assets/sounds/v2/league_down/v1.m4a'))],
    [clip('league_down/v2.m4a', 1230, require('../../assets/sounds/v2/league_down/v2.m4a'))],
    [clip('league_down/v3.m4a', 1496, require('../../assets/sounds/v2/league_down/v3.m4a'))],
    [clip('league_down/v4.m4a', 1657, require('../../assets/sounds/v2/league_down/v4.m4a'))],
  ]),
  new_week: def('peak', 1, false, [
    [clip('new_week/v1.m4a', 1610, require('../../assets/sounds/v2/new_week/v1.m4a'))],
    [clip('new_week/v2.m4a', 1550, require('../../assets/sounds/v2/new_week/v2.m4a'))],
    [clip('new_week/v3.m4a', 1404, require('../../assets/sounds/v2/new_week/v3.m4a'))],
    [clip('new_week/v4.m4a', 1599, require('../../assets/sounds/v2/new_week/v4.m4a'))],
  ]),
  plus: def('plus', 1, false, [
    [clip('plus/v1.m4a', 2190, require('../../assets/sounds/v2/plus/v1.m4a'))],
    [clip('plus/v2.m4a', 2620, require('../../assets/sounds/v2/plus/v2.m4a'))],
    [clip('plus/v3.m4a', 3038, require('../../assets/sounds/v2/plus/v3.m4a'))],
    [clip('plus/v4.m4a', 2229, require('../../assets/sounds/v2/plus/v4.m4a'))],
  ]),
  energy_out: def('plus', 1, false, [
    [clip('energy_out/v1.m4a', 669, require('../../assets/sounds/v2/energy_out/v1.m4a'))],
    [clip('energy_out/v2.m4a', 831, require('../../assets/sounds/v2/energy_out/v2.m4a'))],
    [clip('energy_out/v3.m4a', 867, require('../../assets/sounds/v2/energy_out/v3.m4a'))],
    [clip('energy_out/v4.m4a', 739, require('../../assets/sounds/v2/energy_out/v4.m4a'))],
  ]),
  energy_back: def('plus', 1, false, [
    [clip('energy_back/v1.m4a', 1029, require('../../assets/sounds/v2/energy_back/v1.m4a'))],
    [clip('energy_back/v2.m4a', 874, require('../../assets/sounds/v2/energy_back/v2.m4a'))],
    [clip('energy_back/v3.m4a', 926, require('../../assets/sounds/v2/energy_back/v3.m4a'))],
    [clip('energy_back/v4.m4a', 926, require('../../assets/sounds/v2/energy_back/v4.m4a'))],
  ]),
};

export const SOUND_V2_EVENT_IDS = Object.freeze(Object.keys(SOUND_V2_CATALOG) as SoundV2EventId[]);

export function isSoundV2EventId(value: string): value is SoundV2EventId {
  return Object.prototype.hasOwnProperty.call(SOUND_V2_CATALOG, value);
}

/** Серийные события: у них больше одного шага. */
export function isSoundV2Series(event: SoundV2EventId): boolean {
  return SOUND_V2_CATALOG[event].steps > 1;
}

/** Событие, после которого серии верных ответов обнуляются (ошибка рвёт серию). */
export const SOUND_V2_RESET_ON_ERROR_EVENT: SoundV2EventId = 'wrong';

/** Серии, которые рвёт ошибка (как в лаборатории); кольцо дня ошибкой не сбрасывается. */
export const SOUND_V2_STREAKS_RESET_BY_ERROR: readonly SoundV2EventId[] = Object.freeze([
  'correct',
  'lightning',
  'coin',
] as SoundV2EventId[]);

/** Сколько вариантов у события. */
export function soundV2VariantCount(event: SoundV2EventId): number {
  return SOUND_V2_CATALOG[event].variants.length;
}

/** Клип события: вариант (с нуля) и шаг (с нуля; за пределами шагов — держится последний или идёт по кругу). */
export function getSoundV2Clip(event: SoundV2EventId, variant: number, step = 0): SoundV2Clip {
  const entry = SOUND_V2_CATALOG[event];
  const clips = entry.variants[variant];
  const raw = Number.isFinite(step) ? Math.max(0, Math.trunc(step)) : 0;
  const index = entry.cycle ? raw % clips.length : Math.min(raw, clips.length - 1);
  return clips[index];
}
