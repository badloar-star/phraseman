/**
 * Cards 2.1 §5.2 — чистая логика нижнего таббара раздела «Карточки».
 *
 * Таббар: слева «Тренировка» (выезжает список режимов), по центру «+»
 * (над кнопкой раскрываются «Создать карточку» / «Создать набор»), справа «Наборы»
 * (над кнопкой раскрываются «Мои наборы» / «Наборы сообщества» — это ДВА разных
 * раздела, а не один экран).
 * Здесь только состояние раскрытия, тайминги стаггера и сборка маршрутов режимов —
 * без React и без нативных модулей, чтобы всё покрывалось юнит-тестами
 * (tests/fc_tabbar_state.test.ts). Анимация/рендер — `FlashcardsTabBar.tsx`.
 */
import { BLITZ_MIN_CARDS } from './blitz_logic';
import { deckRouteParam, SOLO_DECK_ID, type FcDeckId } from './deck_selection';
import { FC_DEFAULT_SESSION_SIZE, presetDeckIds, type FcModePreset } from './mode_prefs';
import {
  TAB_SCROLL_COLLAPSE_TRIGGER_Y,
  TAB_SCROLL_DIRECTION_EPSILON,
  TAB_SCROLL_EXPAND_TRIGGER_Y,
} from './pill_tabbar_chrome';

/** Какая группа кнопок раскрыта. Одновременно раскрыта максимум одна (§5.2). */
export type FcTabMenu = 'none' | 'train' | 'create' | 'packs';

/** Раскрываемые группы (левая «Тренировка» и центральная «+»). */
export type FcTabMenuKind = Exclude<FcTabMenu, 'none'>;

/** Пункты списка «Тренировка» — порядок сверху вниз при раскрытии. */
export type FcTrainOption = 'train' | 'listen' | 'blitz';
export const FC_TRAIN_OPTIONS: readonly FcTrainOption[] = ['train', 'listen', 'blitz'];

/** Пункты группы «+». */
export type FcCreateOption = 'card' | 'pack';
export const FC_CREATE_OPTIONS: readonly FcCreateOption[] = ['card', 'pack'];

/**
 * Пункты группы «Наборы» — это РАЗНЫЕ разделы, а не один экран:
 *  • `collection` — сохранённые карточки (вход в коллекцию);
 *  • `mine`       — только свои/добавленные наборы;
 *  • `community`  — каталог наборов сообщества.
 *
 * зачем (владелец, 2026-08-16, «входа в коллекцию просто нет кнопки»): капсула
 * таббара — это три слота-ГРУППЫ (train/+/packs), отдельного слота под коллекцию
 * в ней не осталось, поэтому из раздела нельзя было вернуться к сохранённым
 * карточкам: уход в наборы идёт через `replace`, и стек назад не помнит. Ставим
 * коллекцию ПЕРВЫМ пунктом группы — к ней возвращаются чаще, чем к каталогу.
 */
export type FcPacksOption = 'collection' | 'mine' | 'community';
export const FC_PACKS_OPTIONS: readonly FcPacksOption[] = ['collection', 'mine', 'community'];

/**
 * Блиц требует минимум `BLITZ_MIN_CARDS` карточек (нужны 4 варианта ответа):
 * если их меньше, экран блица показывает заглушку — значит пункт в меню
 * «Тренировка» показывать незачем. Предикат чистый: `null` — количество ещё не
 * известно (первый кадр), пункт скрыт до подтверждения.
 */
export function canStartFcBlitz(cardCount: number | null | undefined): boolean {
  return typeof cardCount === 'number' && Number.isFinite(cardCount) && cardCount >= BLITZ_MIN_CARDS;
}

/** Пункты «Тренировки», доступные при текущем размере пула карточек. */
export function visibleFcTrainOptions(cardCount: number | null | undefined): readonly FcTrainOption[] {
  return canStartFcBlitz(cardCount)
    ? FC_TRAIN_OPTIONS
    : FC_TRAIN_OPTIONS.filter((option) => option !== 'blitz');
}

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

// ── Сворачивание капсулы при скролле (как на главной) ───────────────────────

/**
 * Что делать с капсулой на очередном кадре скролла:
 *  • `expand_now` — мы у верхней кромки списка: раскрыть МГНОВЕННО, без анимации;
 *  • `collapse`   — палец тянет контент вверх (уходим вниз по списку) достаточно
 *                   уверенно и мы уже ниже порога сворачивания;
 *  • `expand`     — уверенное движение вверх по списку: вернуть капсулу;
 *  • `keep`       — микро-движение/дребезг: не трогать.
 *
 * Ровно та же лестница условий, что и в слушателе скролла таббара главного
 * экрана (`app/(tabs)/_layout.tsx`), с теми же порогами из `pill_tabbar_chrome`.
 * Функция чистая и помечена воркетом — считается прямо на UI-потоке из
 * `useAnimatedScrollHandler`, но так же вызывается из обычного JS-onScroll
 * (списки со своим нативным `Animated.event`) и из юнит-тестов.
 */
export type FcTabChromeAction = 'keep' | 'collapse' | 'expand' | 'expand_now';

export function fcTabChromeAction(y: number, lastY: number): FcTabChromeAction {
  'worklet';
  const current = Number.isFinite(y) ? Math.max(0, y) : 0;
  const previous = Number.isFinite(lastY) ? lastY : 0;
  const delta = current - previous;

  if (current <= TAB_SCROLL_EXPAND_TRIGGER_Y) return 'expand_now';
  if (delta >= TAB_SCROLL_DIRECTION_EPSILON && current >= TAB_SCROLL_COLLAPSE_TRIGGER_Y) return 'collapse';
  if (delta <= -TAB_SCROLL_DIRECTION_EPSILON) return 'expand';
  return 'keep';
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

/** Наборы пресета без псевдо-набора «слабые» (это due-очередь тренера, а не набор). */
function realDecks(preset: FcModePreset | null | undefined): FcDeckId[] {
  return presetDeckIds(preset).filter((d) => d !== SOLO_DECK_ID);
}

function presetSize(preset: FcModePreset | null | undefined): number {
  return preset?.size ?? FC_DEFAULT_SESSION_SIZE;
}

/**
 * Маршрут «Тренировки» раздела «Карточки» (FIX владельца, 2026-08-13).
 *
 * БЫЛО: пункт вёл в `/trainer_words_session` — это тренажёр «Моя практика»
 * (повторение ошибок и SRS-очередь), отдельная функция с главного экрана.
 * СТАЛО: «Тренировка» — самостоятельный режим раздела карточек: выбор наборов
 * → свайп «правильно / неправильно» (свайп вправо/влево + кнопки-дублёры),
 * то есть экран `flashcards_swipe`. Экран сам показывает выбор наборов, а
 * `?deck=`/`?size=` лишь предотмечают в нём последний выбор человека.
 */
export const FC_TRAIN_ROUTE = '/flashcards_swipe';

/**
 * Маршрут пункта списка «Тренировка» (§5.2). Пресет быстрого старта —
 * `fc_mode_prefs_v1`; без пресета каждый режим стартует со своего дефолта:
 *  • «Тренировка» — все доступные наборы (экран свайпа отметит их сам);
 *  • «Слушать»    — все сохранённые (`deck=saved`, 'weak' для аудио бессмысленна);
 *  • «Блиц»       — смешанный пул по умолчанию (без `?deck=`).
 */
export function buildFcTrainRoute(
  option: FcTrainOption,
  preset: FcModePreset | null | undefined,
  /**
   * Выбор наборов только что сделан в DeckPickerSheet. Тогда «Тренировка»
   * стартует сразу (`quick=1`): спрашивать наборы второй раз, уже своим
   * экраном выбора, — издевательство. Обычный тап по пункту меню флага не
   * ставит: там экран выбора и есть заявленный вход в режим.
   */
  opts?: { fromPicker?: boolean },
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
  if (opts?.fromPicker && deckParam) params.quick = '1';
  return { pathname: FC_TRAIN_ROUTE, params };
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

/**
 * The old empty custom collection was only an extra tap between the Cards
 * section and the editor. Existing authored cards still use the collection;
 * a genuinely empty custom route goes straight to creation.
 */
export function shouldBypassEmptyCustomCollection(input: {
  collectionDataReady: boolean;
  activeCat: string;
  packDeeplink: string | null;
  customCardCount: number;
}): boolean {
  return input.collectionDataReady
    && input.activeCat === 'custom'
    && !input.packDeeplink
    && input.customCardCount === 0;
}

/** Правая позиция таббара — каталог наборов сообщества (§5.3). */
export const FC_PACKS_ROUTE = '/flashcards_packs';
/** Свои и добавленные наборы — отдельный раздел, не смешан с каталогом. */
export const FC_MY_PACKS_ROUTE = '/flashcards_my_packs';

/** Маршрут пункта группы «Наборы». */
export function buildFcPacksRoute(option: FcPacksOption): FcTabRouteTarget {
  if (option === 'collection') return { pathname: FC_CARDS_ROUTE, params: {} };
  if (option === 'mine') return { pathname: FC_MY_PACKS_ROUTE, params: {} };
  return { pathname: FC_PACKS_ROUTE, params: {} };
}
/** Левая часть раздела — сохранённые карточки (§5.1, вход в раздел). */
export const FC_CARDS_ROUTE = '/flashcards';

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
