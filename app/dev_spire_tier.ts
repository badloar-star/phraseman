/**
 * DEV-подмена лиги башни Шпиля для ПОКАЗА: `dev_state?spireTier=N` (0..11) / `spireTier=off`.
 *
 * зачем (координатор 13.10, наряды башен): у гостя лиги нет (tier=null → Оникс прежнего вида), а Сверке нужны кадры всех 12 лиг
 * (spire-* по лигам). Подменяется ТОЛЬКО лига, по которой SpireTower выбирает наряд (память процесса): неделя, ступени, комната и
 * облако не трогаются. Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер всегда null, установка отклоняется.
 * Перезапуск приложения сбрасывает. Лог: [DEV-STATE] spireTier override=N.
 *
 * Там же — подмена карточки «Итог недели» (`dev_state?spireWeek=up|stay|down|top|marble|obsidian|off`): готовые исходы из макета «Итог недели»
 * (повышение, остаёшься, понижение, высшая лига, Мрамор, Обсидиан) вместо ответа сервера. Недели, ступени и облако не трогаются.
 */
import { IS_STORE_RELEASE } from './config';
import type { SpireWeekResultView } from './spire/spire_week_result_client';

const MAX_TIER = 11;
let override: number | null = null;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить лигу (0..11) или снять (null). В стор-сборке — отказ с логом. Возвращает true, если применено. */
export function setDevSpireTierOverride(tier: number | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] spireTier: отклонено — не dev-сборка', { tier }); // guard-ok: ранний выход логируется
    return false;
  }
  if (tier !== null && (!Number.isInteger(tier) || tier < 0 || tier > MAX_TIER)) {
    console.warn(`[DEV-STATE] spireTier: отклонено — лига вне 0..${MAX_TIER}`, { tier }); // guard-ok: ранний выход логируется
    return false;
  }
  override = tier;
  console.log(tier === null ? '[DEV-STATE] spireTier override=off' : `[DEV-STATE] spireTier override=${tier} (только наряд башни, неделя и комната не меняются)`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Подменённая лига или null. В стор-сборке всегда null. */
export function getDevSpireTierOverride(): number | null {
  return devAvailable() ? override : null;
}

// ───────────────────── Прокрутка окна башни для показа ─────────────────────
// зачем (координатор 13.10, №25б): Сверке нужен кадр верха башни (конус и навершие). `dev_state?spireScroll=top` прокручивает окно башни к началу сцены
// вместо центровки на своём этаже; `spireScroll=off` снимает. Только память процесса; в стор-сборке геттер всегда null.
export type DevSpireScroll = 'top';
let scrollOverride: DevSpireScroll | null = null;

/** Выставить прокрутку окна башни ('top') или снять (null). В стор-сборке — отказ с логом. */
export function setDevSpireScrollOverride(kind: DevSpireScroll | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] spireScroll: отклонено — не dev-сборка', { kind }); // guard-ok: ранний выход логируется
    return false;
  }
  if (kind !== null && kind !== 'top') {
    console.warn('[DEV-STATE] spireScroll: отклонено — допустимо top или off', { kind }); // guard-ok: ранний выход логируется
    return false;
  }
  scrollOverride = kind;
  console.log(kind === null ? '[DEV-STATE] spireScroll override=off' : `[DEV-STATE] spireScroll override=${kind} (окно башни прокручено к началу сцены, только показ)`);
  return true;
}

/** Подменённая прокрутка или null. В стор-сборке всегда null. */
export function getDevSpireScrollOverride(): DevSpireScroll | null {
  return devAvailable() ? scrollOverride : null;
}

// ───────────────────── Рубильник D162 для показа ─────────────────────
// зачем (координатор 14.10, кадры Сверки D162): `dev_state?spireRankBy=coins` — комната Пика по монетам недели без сервера и без
// config/spire_v1.rankBy в проде; `steps` — по ступеням; `off` — снять (решает конфиг). Только память процесса; в стор-сборке null.
export type DevSpireRankBy = 'coins' | 'steps';
let rankByOverride: DevSpireRankBy | null = null;

/** Выставить рубильник для показа ('coins' | 'steps') или снять (null). В стор-сборке — отказ с логом. */
export function setDevSpireRankByOverride(kind: DevSpireRankBy | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] spireRankBy: отклонено — не dev-сборка', { kind }); // guard-ok: ранний выход логируется
    return false;
  }
  if (kind !== null && kind !== 'coins' && kind !== 'steps') {
    console.warn('[DEV-STATE] spireRankBy: отклонено — допустимо coins, steps или off', { kind }); // guard-ok: ранний выход логируется
    return false;
  }
  rankByOverride = kind;
  console.log(kind === null ? '[DEV-STATE] spireRankBy override=off' : `[DEV-STATE] spireRankBy override=${kind} (только показ комнаты Пика; итог недели решает сервер)`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Подменённый рубильник или null. В стор-сборке всегда null. */
export function getDevSpireRankByOverride(): DevSpireRankBy | null {
  return devAvailable() ? rankByOverride : null;
}

// ───────────────────── Итог недели для показа ─────────────────────
export type DevSpireWeekKind = 'up' | 'stay' | 'down' | 'top' | 'marble' | 'obsidian';
export const DEV_SPIRE_WEEK_KINDS: readonly DevSpireWeekKind[] = ['up', 'stay', 'down', 'top', 'marble', 'obsidian'];

// зачем: значения 1-в-1 из макета spire-leagues.html (раздел «Итог недели»): место · ступени · монеты
const WEEK_FIXTURES: Readonly<Record<DevSpireWeekKind, Omit<SpireWeekResultView, 'weekId' | 'lang'>>> = {
  up: { steps: 47, roomRank: 3, roomTotal: 30, promoted: true, demoted: false, prevTier: 0, newTier: 1, placeCoins: 150, promotionCoins: 100 },
  stay: { steps: 25, roomRank: 12, roomTotal: 30, promoted: false, demoted: false, prevTier: 0, newTier: 0, placeCoins: 0, promotionCoins: 0 },
  down: { steps: 5, roomRank: 27, roomTotal: 30, promoted: false, demoted: true, prevTier: 2, newTier: 1, placeCoins: 0, promotionCoins: 0 },
  top: { steps: 112, roomRank: 1, roomTotal: 30, promoted: true, demoted: false, prevTier: 10, newTier: 11, placeCoins: 300, promotionCoins: 100 },
  marble: { steps: 64, roomRank: 2, roomTotal: 30, promoted: true, demoted: false, prevTier: 1, newTier: 2, placeCoins: 200, promotionCoins: 100 },
  obsidian: { steps: 31, roomRank: 9, roomTotal: 30, promoted: false, demoted: false, prevTier: 10, newTier: 10, placeCoins: 0, promotionCoins: 0 },
};

let weekOverride: DevSpireWeekKind | null = null;

/** Выставить исход «Итога недели» или снять (null). В стор-сборке — отказ с логом. */
export function setDevSpireWeekResultOverride(kind: DevSpireWeekKind | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] spireWeek: отклонено — не dev-сборка', { kind }); // guard-ok: ранний выход логируется
    return false;
  }
  if (kind !== null && !DEV_SPIRE_WEEK_KINDS.includes(kind)) {
    console.warn('[DEV-STATE] spireWeek: отклонено — неизвестный исход', { kind }); // guard-ok: ранний выход логируется
    return false;
  }
  weekOverride = kind;
  console.log(kind === null ? '[DEV-STATE] spireWeek override=off' : `[DEV-STATE] spireWeek override=${kind} (только карточка «Итог недели», сервер и недели не меняются)`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Подменённый итог недели для карточки или null. В стор-сборке всегда null. */
export function getDevSpireWeekResultOverride(): SpireWeekResultView | null {
  if (!devAvailable() || weekOverride === null) return null;
  const fixture = WEEK_FIXTURES[weekOverride];
  // зачем (D162, кадры Сверки): при spireRankBy=coins карточка показывает монеты недели (ступени × 30 — та же формула показа, что у ботов)
  const coinsMode = rankByOverride === 'coins';
  return { weekId: 'dev-week', lang: 'en', ...fixture, rankBy: coinsMode ? 'coins' : 'steps', weekCoins: coinsMode ? fixture.steps * 30 : 0 }; // зачем (типы, Ядро 13.10): lang — язык ИЗУЧЕНИЯ (en|es|de|fr|it), не язык интерфейса «ru»
}
