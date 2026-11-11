// зачем: владелец 14.10 одобрил звуки лаборатории; несколько вариантов на событие, без повторов подряд.
//
// 11.11, владелец («звуки должны быть точно закреплены за событием и воспроизводиться мгновенно»): у событий, для которых он выбрал
// звук в лаборатории, вариант ОДИН — тот самый выбранный файл. Четыре варианта остались только у событий без выбора.
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
  | 'energy_back'
  | 'countdown'
  | 'duel_invite'
  | 'duel_win'
  | 'duel_lose'
  | 'duel_draw'
  | 'roulette_win';

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
    [clip('tap/v1.m4a', 220, require('../../assets/sounds/v2/tap/v1.m4a'))],
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
    [clip('sheet_open/v1.m4a', 1109, require('../../assets/sounds/v2/sheet_open/v1.m4a'))],
  ]),
  sheet_close: def('touch', 1, false, [
    [clip('sheet_close/v1.m4a', 1089, require('../../assets/sounds/v2/sheet_close/v1.m4a'))],
  ]),
  swipe_know: def('touch', 1, false, [
    [clip('swipe_know/v1.m4a', 950, require('../../assets/sounds/v2/swipe_know/v1.m4a'))],
  ]),
  swipe_learn: def('touch', 1, false, [
    [clip('swipe_learn/v1.m4a', 389, require('../../assets/sounds/v2/swipe_learn/v1.m4a'))],
    [clip('swipe_learn/v2.m4a', 367, require('../../assets/sounds/v2/swipe_learn/v2.m4a'))],
    [clip('swipe_learn/v3.m4a', 429, require('../../assets/sounds/v2/swipe_learn/v3.m4a'))],
    [clip('swipe_learn/v4.m4a', 434, require('../../assets/sounds/v2/swipe_learn/v4.m4a'))],
  ]),
  story: def('touch', 1, false, [
    [clip('story/v1.m4a', 752, require('../../assets/sounds/v2/story/v1.m4a'))],
  ]),
  correct: def('learn', 8, false, [
    [clip('correct/v1_s0.m4a', 850, require('../../assets/sounds/v2/correct/v1_s0.m4a')),
      clip('correct/v1_s1.m4a', 850, require('../../assets/sounds/v2/correct/v1_s1.m4a')),
      clip('correct/v1_s2.m4a', 850, require('../../assets/sounds/v2/correct/v1_s2.m4a')),
      clip('correct/v1_s3.m4a', 850, require('../../assets/sounds/v2/correct/v1_s3.m4a')),
      clip('correct/v1_s4.m4a', 850, require('../../assets/sounds/v2/correct/v1_s4.m4a')),
      clip('correct/v1_s5.m4a', 850, require('../../assets/sounds/v2/correct/v1_s5.m4a')),
      clip('correct/v1_s6.m4a', 850, require('../../assets/sounds/v2/correct/v1_s6.m4a')),
      clip('correct/v1_s7.m4a', 850, require('../../assets/sounds/v2/correct/v1_s7.m4a'))],
  ]),
  wrong: def('learn', 1, false, [
    [clip('wrong/v1.m4a', 800, require('../../assets/sounds/v2/wrong/v1.m4a'))],
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
    [clip('lesson_done/v1.m4a', 2400, require('../../assets/sounds/v2/lesson_done/v1.m4a'))],
  ]),
  lesson_perfect: def('learn', 1, false, [
    [clip('lesson_perfect/v1.m4a', 2027, require('../../assets/sounds/v2/lesson_perfect/v1.m4a'))],
    [clip('lesson_perfect/v2.m4a', 2250, require('../../assets/sounds/v2/lesson_perfect/v2.m4a'))],
    [clip('lesson_perfect/v3.m4a', 1999, require('../../assets/sounds/v2/lesson_perfect/v3.m4a'))],
    [clip('lesson_perfect/v4.m4a', 2210, require('../../assets/sounds/v2/lesson_perfect/v4.m4a'))],
  ]),
  hint: def('learn', 1, false, [
    [clip('hint/v1.m4a', 846, require('../../assets/sounds/v2/hint/v1.m4a'))],
  ]),
  coin: def('reward', 5, false, [
    [clip('coin/v1_s0.m4a', 1018, require('../../assets/sounds/v2/coin/v1_s0.m4a')),
      clip('coin/v1_s1.m4a', 1020, require('../../assets/sounds/v2/coin/v1_s1.m4a')),
      clip('coin/v1_s2.m4a', 951, require('../../assets/sounds/v2/coin/v1_s2.m4a')),
      clip('coin/v1_s3.m4a', 953, require('../../assets/sounds/v2/coin/v1_s3.m4a')),
      clip('coin/v1_s4.m4a', 1144, require('../../assets/sounds/v2/coin/v1_s4.m4a'))],
  ]),
  coins_many: def('reward', 1, false, [
    [clip('coins_many/v1.m4a', 1200, require('../../assets/sounds/v2/coins_many/v1.m4a'))],
  ]),
  coin_rank: def('reward', 1, false, [
    [clip('coin_rank/v1.m4a', 2400, require('../../assets/sounds/v2/coin_rank/v1.m4a'))],
  ]),
  achievement: def('reward', 1, false, [
    [clip('achievement/v1.m4a', 2320, require('../../assets/sounds/v2/achievement/v1.m4a'))],
    [clip('achievement/v2.m4a', 2293, require('../../assets/sounds/v2/achievement/v2.m4a'))],
    [clip('achievement/v3.m4a', 2760, require('../../assets/sounds/v2/achievement/v3.m4a'))],
    [clip('achievement/v4.m4a', 2380, require('../../assets/sounds/v2/achievement/v4.m4a'))],
  ]),
  ring: def('day', 3, true, [
    [clip('ring/v1_s0.m4a', 1000, require('../../assets/sounds/v2/ring/v1_s0.m4a')),
      clip('ring/v1_s1.m4a', 1000, require('../../assets/sounds/v2/ring/v1_s1.m4a')),
      clip('ring/v1_s2.m4a', 1000, require('../../assets/sounds/v2/ring/v1_s2.m4a'))],
  ]),
  day_done: def('day', 1, false, [
    [clip('day_done/v1.m4a', 1800, require('../../assets/sounds/v2/day_done/v1.m4a'))],
  ]),
  streak_small: def('day', 1, false, [
    [clip('streak_small/v1.m4a', 1400, require('../../assets/sounds/v2/streak_small/v1.m4a'))],
  ]),
  streak_mid: def('day', 1, false, [
    [clip('streak_mid/v1.m4a', 2300, require('../../assets/sounds/v2/streak_mid/v1.m4a'))],
  ]),
  streak_big: def('day', 1, false, [
    [clip('streak_big/v1.m4a', 2800, require('../../assets/sounds/v2/streak_big/v1.m4a'))],
  ]),
  streak_year: def('day', 1, false, [
    [clip('streak_year/v1.m4a', 3200, require('../../assets/sounds/v2/streak_year/v1.m4a'))],
  ]),
  streak_legend: def('day', 1, false, [
    [clip('streak_legend/v1.m4a', 3400, require('../../assets/sounds/v2/streak_legend/v1.m4a'))],
  ]),
  streak_risk: def('day', 1, false, [
    [clip('streak_risk/v1.m4a', 1100, require('../../assets/sounds/v2/streak_risk/v1.m4a'))],
  ]),
  step: def('peak', 1, false, [
    [clip('step/v1.m4a', 1100, require('../../assets/sounds/v2/step/v1.m4a'))],
  ]),
  floor: def('peak', 1, false, [
    [clip('floor/v1.m4a', 2000, require('../../assets/sounds/v2/floor/v1.m4a'))],
  ]),
  summit: def('peak', 1, false, [
    [clip('summit/v1.m4a', 3000, require('../../assets/sounds/v2/summit/v1.m4a'))],
  ]),
  league_up: def('peak', 1, false, [
    [clip('league_up/v1.m4a', 2600, require('../../assets/sounds/v2/league_up/v1.m4a'))],
  ]),
  league_stay: def('peak', 1, false, [
    [clip('league_stay/v1.m4a', 1200, require('../../assets/sounds/v2/league_stay/v1.m4a'))],
  ]),
  league_down: def('peak', 1, false, [
    [clip('league_down/v1.m4a', 1300, require('../../assets/sounds/v2/league_down/v1.m4a'))],
  ]),
  new_week: def('peak', 1, false, [
    [clip('new_week/v1.m4a', 1400, require('../../assets/sounds/v2/new_week/v1.m4a'))],
  ]),
  plus: def('plus', 1, false, [
    [clip('plus/v1.m4a', 3200, require('../../assets/sounds/v2/plus/v1.m4a'))],
  ]),
  energy_out: def('plus', 1, false, [
    [clip('energy_out/v1.m4a', 1300, require('../../assets/sounds/v2/energy_out/v1.m4a'))],
  ]),
  energy_back: def('plus', 1, false, [
    [clip('energy_back/v1.m4a', 1591, require('../../assets/sounds/v2/energy_back/v1.m4a'))],
  ]),
  // зачем (владелец 11.11, «подключить пять оставшихся мест»): он выбрал звук для этих мест в лаборатории (набор «Тёплые палочки»,
  // вариант A), но слота в каталоге у них не было. Файлы кладёт prototypes/sound-lab/apply_extra_to_app.py.
  countdown: def('peak', 1, false, [
    [clip('countdown/v1.m4a', 551, require('../../assets/sounds/v2/countdown/v1.m4a'))],
  ]),
  duel_invite: def('day', 1, false, [
    [clip('duel_invite/v1.m4a', 1101, require('../../assets/sounds/v2/duel_invite/v1.m4a'))],
  ]),
  duel_win: def('reward', 1, false, [
    [clip('duel_win/v1.m4a', 2401, require('../../assets/sounds/v2/duel_win/v1.m4a'))],
  ]),
  duel_lose: def('reward', 1, false, [
    [clip('duel_lose/v1.m4a', 1401, require('../../assets/sounds/v2/duel_lose/v1.m4a'))],
  ]),
  duel_draw: def('reward', 1, false, [
    [clip('duel_draw/v1.m4a', 1201, require('../../assets/sounds/v2/duel_draw/v1.m4a'))],
  ]),
  roulette_win: def('reward', 1, false, [
    [clip('roulette_win/v1.m4a', 2301, require('../../assets/sounds/v2/roulette_win/v1.m4a'))],
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
