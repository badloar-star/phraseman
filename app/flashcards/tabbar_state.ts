/**
 * Cards 2.1 §5.2 — чистая логика нижнего таббара раздела «Карточки».
 *
 * Таббар: слева «Тренировка» (выезжает список из трёх режимов), по центру «+»
 * (над кнопкой раскрываются «Создать карточку» / «Создать набор»), справа «Наборы».
 * Здесь только состояние раскрытия, тайминги стаггера и сборка маршрутов режимов —
 * без React и без нативных модулей, чтобы всё покрывалось юнит-тестами
 * (tests/fc_tabbar_state.test.ts). Анимация/рендер — `FlashcardsTabBar.tsx`.
 */
import { deckRouteParam, SOLO_DECK_ID, type FcDeckId } from './deck_selection';
import { FC_DEFAULT_SESSION_SIZE, presetDeckIds, type FcModePreset } from './mode_prefs';

/** Какая группа кнопок раскрыта. Одновременно раскрыта максимум одна (§5.2). */
export type FcTabMenu = 'none' | 'train' | 'create';

/** Раскрываемые группы (левая «Тренировка» и центральная «+»). */
export type FcTabMenuKind = Exclude<FcTabMenu, 'none'>;

/** Пункты списка «Тренировка» — порядок сверху вниз при раскрытии. */
export type FcTrainOption = 'train' | 'listen' | 'blitz';
export const FC_TRAIN_OPTIONS: readonly FcTrainOption[] = ['train', 'listen', 'blitz'];

/** Пункты группы «+». */
export type FcCreateOption = 'card' | 'pack';
export const FC_CREATE_OPTIONS: readonly FcCreateOption[] = ['card', 'pack'];

/**
 * Тап по кнопке-раскрывателю: та же группа — сворачиваем, другая — переключаемся
 * на неё (две группы никогда не открыты одновременно).
 */
export function toggleFcTabMenu(current: FcTabMenu, target: FcTabMenuKind): FcTabMenu {
  return current === target ? 'none' : target;
}

export function isFcTabMenuOpen(menu: FcTabMenu): boolean {
  return menu === 'train' || menu === 'create';
}

/** Раскрыта ли конкретная группа (для анимаций конкретных кнопок). */
export function isFcTabMenuKindOpen(menu: FcTabMenu, kind: FcTabMenuKind): boolean {
  return menu === kind;
}

/**
 * Закрытие по тапу вне / по системному «назад» (§5.2). Возвращает `true`,
 * если событие поглощено (было что закрывать) — Android back тогда не выходит с экрана.
 */
export function consumeFcTabBackPress(menu: FcTabMenu): { menu: FcTabMenu; handled: boolean } {
  return isFcTabMenuOpen(menu) ? { menu: 'none', handled: true } : { menu, handled: false };
}

/** Шаг стаггера между кнопками группы (§5.2 «кнопки появляются друг за другом»). */
export const FC_TABBAR_STAGGER_MS = 45;
/** Больше 4 пунктов в группах нет — каскад не должен растягиваться. */
export const FC_TABBAR_STAGGER_CAP = 4;

/**
 * Задержка появления i-й кнопки. При раскрытии — сверху вниз по индексу,
 * при сворачивании — в обратном порядке (последняя уходит первой).
 * `reduceMotion` / слабое устройство → без стаггера (§8, деградация без потери функций).
 */
export function fcTabMenuItemDelay(
  index: number,
  opts?: { open?: boolean; total?: number; reduceMotion?: boolean },
): number {
  if (opts?.reduceMotion) return 0;
  const i = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  const total = Math.max(1, Math.floor(opts?.total ?? i + 1));
  const open = opts?.open ?? true;
  const slot = open ? i : total - 1 - i;
  return Math.min(slot, FC_TABBAR_STAGGER_CAP) * FC_TABBAR_STAGGER_MS;
}

/** Поворот «+» в «×» — 45° ровно (§5.2). */
export const FC_PLUS_ROTATION_DEG = 45;
export function fcPlusRotationDeg(createMenuOpen: boolean): number {
  return createMenuOpen ? FC_PLUS_ROTATION_DEG : 0;
}

/** Прозрачность затемнения фона при раскрытии (0 — закрыто). */
export const FC_TABBAR_SCRIM_OPACITY = 0.44;
export function fcTabScrimOpacity(menu: FcTabMenu): number {
  return isFcTabMenuOpen(menu) ? FC_TABBAR_SCRIM_OPACITY : 0;
}

// ── Маршруты режимов (переиспользуют логику быстрого старта хаба) ────────────

export type FcTabRouteTarget = {
  pathname: string;
  params: Record<string, string>;
};

/** Колоды пресета без псевдо-колоды «слабые» (она — due-очередь тренера, не набор). */
function realDecks(preset: FcModePreset | null | undefined): FcDeckId[] {
  return presetDeckIds(preset).filter((d) => d !== SOLO_DECK_ID);
}

function presetSize(preset: FcModePreset | null | undefined): number {
  return preset?.size ?? FC_DEFAULT_SESSION_SIZE;
}

/**
 * Маршрут пункта списка «Тренировка» (§5.2). Пресет быстрого старта —
 * `fc_mode_prefs_v1`; без пресета каждый режим стартует со своего дефолта:
 *  • «Тренировка» — due-очередь тренера (без `?deck=`);
 *  • «Слушать»    — все сохранённые (`deck=saved`, 'weak' для аудио бессмысленна);
 *  • «Блиц»       — смешанная колода по умолчанию (без `?deck=`).
 */
export function buildFcTrainRoute(
  option: FcTrainOption,
  preset: FcModePreset | null | undefined,
): FcTabRouteTarget {
  const decks = realDecks(preset);
  const deckParam = deckRouteParam(decks);

  if (option === 'listen') {
    return {
      pathname: '/flashcards_listening_session',
      params: { deck: deckParam || 'saved', size: String(presetSize(preset)) },
    };
  }
  if (option === 'blitz') {
    return {
      pathname: '/flashcards_blitz_session',
      params: deckParam ? { deck: deckParam } : {},
    };
  }
  const params: Record<string, string> = { size: String(presetSize(preset)) };
  if (deckParam) params.deck = deckParam;
  return { pathname: '/trainer_words_session', params };
}

/** Режим `mode_prefs`, из которого читается пресет быстрого старта пункта. */
export function fcTrainOptionPresetMode(option: FcTrainOption): 'trainer' | 'listening' | 'blitz' {
  if (option === 'listen') return 'listening';
  if (option === 'blitz') return 'blitz';
  return 'trainer';
}

/** Маршрут кнопки группы «+». */
export function buildFcCreateRoute(option: FcCreateOption): FcTabRouteTarget {
  if (option === 'pack') return { pathname: '/community_pack_create', params: {} };
  return { pathname: '/flashcards_card_editor', params: { create: '1', cat: 'custom' } };
}

/** Правая позиция таббара — каталог наборов сообщества (§5.3). */
export const FC_PACKS_ROUTE = '/flashcards_packs';
/** Левая часть раздела — сохранённые карточки (§5.1, вход в раздел). */
export const FC_CARDS_ROUTE = '/flashcards';

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
