// ═══════════════════════════════════════════════════════════════════════════
// spire_scene_preview_fixtures.ts — моки для dev-входа /dev_spire_scene_preview («Сцена» Пика, пять состояний эталона V2).
//
// зачем (координатор 22.10, «Сверка»): состояния «Сцены» Пика снимаются по ссылке рядом с docs/design/v2-app/peak-scene-v2.html.
// Состояние НЕ задаётся: факты (подбор комнаты, остаток недели, энергия, Plus, сеть) идут через ту же pickSpireSceneState, что на экране.
// Комната — та же, что в эталоне: 30 человек, «Денис» — ты, 7-е место по монетам недели, 2 места до повышения; лига «Гранит»,
// этаж 4, ступень 7 из 8. Чистые данные: без React, хранилища и сети.
// ═══════════════════════════════════════════════════════════════════════════
import type { SpireMemberRow } from '../spire_room_types';
import { spireRivalsByFloor, spireStepsIn, type SpireRival } from '../spire_tower_model';
import { spireSceneRoom, type SpireSceneInput } from './spire_scene_model';

export const SPIRE_SCENE_PREVIEW_STATES = ['day', 'search', 'eve', 'zero', 'off'] as const;
export type SpireScenePreviewState = typeof SPIRE_SCENE_PREVIEW_STATES[number];
export const isSpireScenePreviewState = (value: unknown): value is SpireScenePreviewState =>
  typeof value === 'string' && (SPIRE_SCENE_PREVIEW_STATES as readonly string[]).includes(value);

/** Лига эталона — «Гранит» (tier 0). */
export const SPIRE_SCENE_PREVIEW_TIER = 0;
export const SPIRE_SCENE_PREVIEW_COIN_RANK = 5;

const NAMES = ['Аня', 'Марк', 'Ольга', 'Тимур', 'Лея', 'Иван', 'Денис', 'Nadia', 'Kirill', 'Софья', 'Dmytro', 'Юля', 'Артём', 'Halyna', 'Роман', 'Вера', 'Oleh', 'Мария', 'Глеб', 'Ирина', 'Sergio', 'Даша', 'Павел', 'Лидия', 'Natalia', 'Егор', 'Кира', 'Богдан', 'Алина', 'Максим'];
const STEPS = [47, 39, 33, 31, 29, 27, 25, 24, 22, 21, 19, 18, 17, 15, 14, 12, 11, 11, 9, 8, 7, 6, 5, 5, 4, 3, 2, 1, 0, 0];
const RANKS = [12, 9, 7, 11, 6, 8, 5, 4, 10, 3, 7, 6, 2, 9, 5, 1, 8, 4, 3, 6, 2, 0, 7, 1, 5, 3, 0, 2, 1, 0];
const COINS = [612, 538, 455, 470, 402, 395, 340, 318, 330, 290, 268, 255, 240, 215, 198, 180, 166, 150, 140, 122, 110, 96, 88, 70, 64, 52, 40, 26, 0, 0];
const ME = 'Денис';

export const SPIRE_SCENE_PREVIEW_ROOM: readonly SpireMemberRow[] = Object.freeze(NAMES.map((name, i) => Object.freeze({
  uid: `preview-${i}`, name, steps: STEPS[i], isMe: name === ME, coinRank: name === ME ? SPIRE_SCENE_PREVIEW_COIN_RANK : RANKS[i], weekCoins: COINS[i], isPremium: false,
})));

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MIN = 60_000;

type Facts = Readonly<{ roomSearching: boolean; msLeft: number; energy: number; offline: boolean; floor: number; stepDone: number }>;
const FACTS: Readonly<Record<SpireScenePreviewState, Facts>> = {
  day: { roomSearching: false, msLeft: 2 * DAY + 14 * HOUR, energy: 3, offline: false, floor: 4, stepDone: 7 },
  // новая неделя: комнаты на телефоне ещё нет, все на первом этаже
  search: { roomSearching: true, msLeft: 6 * DAY + 14 * HOUR, energy: 5, offline: false, floor: 1, stepDone: 0 },
  // вечер воскресенья: до конца недели 2 ч 20 мин, до зоны повышения 2 места
  eve: { roomSearching: false, msLeft: 2 * HOUR + 20 * MIN, energy: 2, offline: false, floor: 4, stepDone: 7 },
  zero: { roomSearching: false, msLeft: 2 * DAY + 7 * HOUR, energy: 0, offline: false, floor: 4, stepDone: 7 },
  off: { roomSearching: false, msLeft: 2 * DAY + 9 * HOUR, energy: 3, offline: true, floor: 4, stepDone: 7 },
};
/** Отсчёт до энергии в «нет энергии» (эталон «6:40»). */
export const SPIRE_SCENE_PREVIEW_ENERGY_TIME = '6:40';

export type SpireScenePreviewSetup = Readonly<{
  input: SpireSceneInput;
  members: readonly SpireMemberRow[] | null;
  rivals: ReadonlyMap<number, readonly SpireRival[]>;
  floor: number;
  stepDone: number;
  stepTotal: number;
  msLeft: number;
  energy: number;
}>;

/** Факты состояния → вход pickSpireSceneState (комната и место — той же spireSceneRoom, что на экране). */
export function spireScenePreviewSetup(state: SpireScenePreviewState, plus: boolean): SpireScenePreviewSetup {
  const f = FACTS[state];
  const members = f.roomSearching ? null : SPIRE_SCENE_PREVIEW_ROOM;
  const room = spireSceneRoom(members, 'coins');
  // новая неделя: соперники — первые 11 комнаты на первом этаже (эталон: «+9» у этажа 1)
  const rivals = f.roomSearching
    ? spireRivalsByFloor(SPIRE_SCENE_PREVIEW_ROOM.filter((m) => !m.isMe).slice(0, 11).map((m) => ({ ...m, steps: 0 })))
    : spireRivalsByFloor(SPIRE_SCENE_PREVIEW_ROOM);
  return Object.freeze({
    input: Object.freeze({ roomSearching: f.roomSearching, msLeft: f.msLeft, placesToPromo: room.placesToPromo, plus, energy: plus ? null : f.energy, offline: f.offline }),
    members,
    rivals,
    floor: f.floor,
    stepDone: f.stepDone,
    stepTotal: spireStepsIn(f.floor),
    msLeft: f.msLeft,
    energy: f.energy,
  });
}
