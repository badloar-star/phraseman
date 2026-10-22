// ═══════════════════════════════════════════════════════════════════════════
// spire_scene_model.ts — «Сцена» Пика (V2 «Пьедестал перед башней»): флаг, состояние входа, комната и тексты.
//
// зачем (владелец 22.10 выбрал V2; эталон docs/design/v2-app/peak-scene-v2.html под замком 3ea39f80c; таблица входа — из страницы
// peak-scene-concepts.html): чистые функции без React, хранилища и сети. Экран передаёт то, что уже знает (комната из кэша, неделя
// с телефона, энергия из памяти, Plus, сеть); функция отдаёт состояние и ПРИЧИНУ решения — её пишет журнал [SPIRE-SCENE].
// Приоритет входа (побеждает первое подходящее): ищем комнату → неделя кончается → нет энергии → обычный день.
// «Нет сети» — строкой сверху при любом состоянии; комната и чужие монеты приглушены. Итог недели — прежняя карточка, не состояние.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { spireText, spireTimeLeftText } from '../spire_strings';
import { spireSortMembers, type SpireMemberRow, type SpireRankByView } from '../spire_room_types';
import { spireZonesFor } from '../spire_zones';
import { spireScenePromoText, spireSceneText } from './spire_scene_strings';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__ === true;

/**
 * зачем (координатор 22.10): Пик v2 в коде — в dev-сборке да, в релизе нет, пока владелец не посмотрит его на эмуляторе.
 * В релиз — заменить на true; совсем выключить — false (Пик рисует прежние заголовок, комнату, окно башни и карточку этажа).
 */
export const SPIRE_SCENE_V2_ENABLED: boolean = IS_DEV;

export const SPIRE_SCENE_STATES = ['search', 'eve', 'zero', 'day'] as const;
export type SpireSceneState = typeof SPIRE_SCENE_STATES[number];

/** «Неделя кончается»: до конца недели меньше 6 ч (таблица входа эталона, приоритет 3). */
export const SPIRE_SCENE_EVE_MS = 6 * 60 * 60 * 1000;

export type SpireSceneInput = Readonly<{
  /** Комнаты этой недели на телефоне ещё нет — идёт подбор. */
  roomSearching: boolean;
  /** До конца недели, мс. */
  msLeft: number;
  /** Мест до зоны повышения: 0 — уже в зоне; null — комната или своё место неизвестны. */
  placesToPromo: number | null;
  plus: boolean;
  /** Энергия; null — неизвестна (тогда «нет энергии» не показываем). */
  energy: number | null;
  offline: boolean;
}>;

export type SpireSceneDecision = Readonly<{
  state: SpireSceneState;
  /** Строка «Нет сети» сверху сцены. */
  offlineLine: boolean;
  /** Что решило выбор — значения, а не голое true/false; пишется в [SPIRE-SCENE]. */
  reason: string;
}>;

export function pickSpireSceneState(i: SpireSceneInput): SpireSceneDecision {
  const decide = (state: SpireSceneState, reason: string): SpireSceneDecision => Object.freeze({ state, offlineLine: i.offline, reason });
  if (i.roomSearching) return decide('search', 'roomSearching=true');
  if (i.msLeft < SPIRE_SCENE_EVE_MS && i.placesToPromo !== null && i.placesToPromo > 0) {
    return decide('eve', `msLeft=${i.msLeft} placesToPromo=${i.placesToPromo}`);
  }
  if (!i.plus && i.energy === 0) return decide('zero', 'plus=false energy=0');
  return decide('day', `default msLeft=${i.msLeft} placesToPromo=${String(i.placesToPromo)} energy=${String(i.energy)} plus=${String(i.plus)}`);
}

export type SpireSceneRoom = Readonly<{
  /** Тройка лидеров по порядку мест (1, 2, 3); пьедестал рисует их как 2-1-3. */
  top: readonly SpireMemberRow[];
  myPlace: number | null;
  /** Мест до зоны повышения: 0 — уже в зоне; null — себя в комнате нет или зоны повышения нет. */
  placesToPromo: number | null;
  count: number;
}>;

/** Комната для сцены: та же сортировка и те же зоны, что у «Всех участников» (spireSortMembers, spireZonesFor). */
export function spireSceneRoom(members: readonly SpireMemberRow[] | null, rankBy: SpireRankByView = 'steps'): SpireSceneRoom {
  if (!members || members.length === 0) return Object.freeze({ top: [], myPlace: null, placesToPromo: null, count: 0 });
  const sorted = spireSortMembers(members, rankBy);
  const zones = spireZonesFor(sorted, rankBy);
  const me = sorted.findIndex((m) => m.isMe);
  const lastUp = zones.lastIndexOf('up');
  const placesToPromo = me < 0 || lastUp < 0 ? null : zones[me] === 'up' ? 0 : Math.max(0, me - lastUp);
  return Object.freeze({ top: sorted.slice(0, 3), myPlace: me < 0 ? null : me + 1, placesToPromo, count: sorted.length });
}

/** Остаток недели: дни, часы, минуты (для «до конца недели 2 д 14 ч» и «2 ч 20 мин»). */
export function spireSceneLeft(msLeft: number): Readonly<{ days: number; hours: number; minutes: number }> {
  const left = Math.max(0, msLeft);
  return { days: Math.floor(left / 86_400_000), hours: Math.floor((left % 86_400_000) / 3_600_000), minutes: Math.floor((left % 3_600_000) / 60_000) };
}

export type SpireSceneFacts = Readonly<{
  /** Камень лиги («Гранит»); нет лиги — «—». */
  tierName: string;
  msLeft: number;
  floor: number;
  stepDone: number;
  stepTotal: number;
  /** Монеты за ступень и за этот этаж — из конфига сервера (spireFloorCoinsOf). */
  perStep: number;
  floorCoins: number;
  placesToPromo: number | null;
}>;

export type SpireSceneCopy = Readonly<{
  kicker: string;
  /** Вторая строка над заголовком (обычный день: «до конца недели 2 д 14 ч»). */
  kicker2: string | null;
  title: string;
  /** Заголовок — живой отсчёт энергии («6:40»), а не текст. */
  liveEnergyTitle: boolean;
  /** Полоска ступеней 0..1; null — нет. */
  bar: number | null;
  line: string | null;
  /** Тёплая строка вечера («Ещё 2 места до повышения»). */
  warm: string | null;
  rewards: readonly string[];
}>;

/** Тексты сцены по состоянию — дословно как в эталоне V2 (раздел V2 страницы peak-scene-v2.html). */
export function buildSpireSceneCopy(lang: Lang, state: SpireSceneState, f: SpireSceneFacts): SpireSceneCopy {
  const nb = ' ';
  const floorTitle = `${spireText(lang, 'floor')} ${f.floor}`;
  const stepLine = `${spireSceneText(lang, 'step')} ${f.stepDone} ${spireText(lang, 'outOf')} ${f.stepTotal}`;
  const bar = f.stepTotal > 0 ? Math.max(0, Math.min(1, f.stepDone / f.stepTotal)) : null;
  const rewards = [`+${f.perStep} ${spireSceneText(lang, 'perStep')}`, `+${f.floorCoins} ${spireSceneText(lang, 'perFloor')}`];
  const left = spireSceneLeft(f.msLeft);
  switch (state) {
    case 'search':
      return { kicker: `${spireSceneText(lang, 'newWeek')} · ${f.tierName}`, kicker2: null, title: floorTitle, liveEnergyTitle: false, bar, line: stepLine, warm: null, rewards };
    case 'eve': {
      const hm = left.hours > 0 ? `${left.hours}${nb}${spireText(lang, 'hourUnit')} ${left.minutes}${nb}${spireSceneText(lang, 'minUnit')}` : `${left.minutes}${nb}${spireSceneText(lang, 'minUnit')}`;
      const warm = f.placesToPromo !== null && f.placesToPromo > 0 ? spireScenePromoText(lang, f.placesToPromo, true) : null;
      return { kicker: `${f.tierName} · ${spireText(lang, 'untilEnd')}`, kicker2: null, title: hm, liveEnergyTitle: false, bar: null, line: null, warm, rewards: [] };
    }
    case 'zero':
      return { kicker: spireSceneText(lang, 'energyIn'), kicker2: null, title: '—', liveEnergyTitle: true, bar: null, line: `${spireText(lang, 'floor').toLocaleLowerCase()} ${f.floor} · ${stepLine}`, warm: null, rewards: [] };
    case 'day':
    default:
      return { kicker: f.tierName, kicker2: spireTimeLeftText(lang, left.days, left.hours), title: floorTitle, liveEnergyTitle: false, bar, line: stepLine, warm: null, rewards };
  }
}
