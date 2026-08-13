/**
 * Геометрия, цвета и тайминги «плавающей капсулы» нижнего таббара.
 *
 * ИСТОЧНИК ПРАВДЫ — таббар главного экрана (`app/(tabs)/_layout.tsx`). Раздел
 * «Карточки» обязан выглядеть и вести себя РОВНО так же, поэтому все числа
 * вынесены в один модуль: правится в одном месте, а не подбирается на глаз в
 * двух файлах. Здесь нет React и RN-компонентов — только константы и чистые
 * функции, поэтому модуль дёшев и покрывается юнит-тестами.
 */

/** Зазор между капсулой и нижней safe-area. */
export const FLOATING_PILL_BOTTOM_GAP = 6;
/** Подсветка активной позиции (бегущая «таблетка» под иконкой). */
export const TAB_ACTIVE_PILL_WIDTH = 48;
export const TAB_ACTIVE_PILL_HEIGHT = 36;
/** Подложка капсулы на обычных темах. */
export const TAB_UNDERLAY_DIM_ALPHA = 0.95;
export const TAB_UNDERLAY_DIM_BG = `rgba(0,0,0,${TAB_UNDERLAY_DIM_ALPHA})`;
export const TAB_DARK_ACTIVE_BG_ALPHA = 0.18;
export const TAB_DARK_ICON_MUTED_ALPHA = 0.74;
/** Размер иконок: обычная позиция и центральная (акцентная). */
export const TAB_ICON_SIZE = 26;
export const TAB_CENTER_ICON_SIZE = 29;

/** Пружина «переезда» подсветки к активной позиции. */
export const TAB_HIGHLIGHT_SPRING = { speed: 18, bounciness: 4 } as const;
/** Пружины нажатия: вдавливание капсулы и отпускание. */
export const TAB_PRESS_IN_SPRING = { speed: 34, bounciness: 6 } as const;
export const TAB_PRESS_OUT_SPRING = { speed: 28, bounciness: 4 } as const;
/** Значения на пике нажатия (только transform/opacity). */
export const TAB_PILL_PRESS_SCALE = 0.992;
export const TAB_ACTIVE_PILL_PRESS_SCALE = 1.1;
export const TAB_ACTIVE_PILL_PRESS_OPACITY = 0.92;
export const TAB_ICON_PRESS_SCALE = 1.08;
/** Появление/уход подсветки, когда активной позиции нет (только opacity). */
export const TAB_HIGHLIGHT_FADE_MS = 160;

/** Объёмная тень: капсула «парит» над контентом. */
export const TAB_PILL_SHADOW = {
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.28,
  shadowRadius: 16,
  elevation: 12,
} as const;

/**
 * Цвет с заданной альфой. Поддерживает hex (#RGB/#RRGGBB/#RRGGBBAA);
 * для уже-rgba/прочих форматов возвращает исходник (безопасный фолбэк).
 * Копия помощника из таббара главного экрана — поведение обязано совпадать.
 */
export function withAlpha(color: string, alpha: number): string {
  if (color[0] !== '#') return color;
  let hex = color.slice(1);
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length !== 6) return color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Компактная капсула раздела «Карточки».
 *
 * На главном экране позиций четыре и капсула тянется во всю ширину — там слот
 * получается ~90pt. В «Карточках» позиций всего три, и растянутая на весь экран
 * капсула выглядела пустой (замечание владельца после теста на iPhone).
 * Поэтому здесь ширина задаётся СОДЕРЖИМЫМ: фиксированный слот + поля по краям,
 * капсула центрируется по экрану. Слот 64×`tabBarHeight` (минимум 52) —
 * зона нажатия заведомо больше требуемых 44×44.
 */
export const TAB_SLOT_WIDTH = 64;
/** Поля между краем капсулы и крайними слотами (скруглению нужен воздух). */
export const TAB_PILL_EDGE_PAD = 12;

/** Полная ширина компактной капсулы для `total` позиций. */
export function tabPillWidth(total: number): number {
  const slots = Math.max(1, Math.floor(total));
  return slots * TAB_SLOT_WIDTH + TAB_PILL_EDGE_PAD * 2;
}

/** Смещение подсветки к позиции `index` (шаг = ровно один слот). */
export function tabHighlightOffset(index: number): number {
  const i = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  return i * TAB_SLOT_WIDTH;
}

/**
 * Левый край подсветки в нулевой позиции: поле капсулы + центрирование
 * «таблетки» внутри слота. Так подсветка попадает ровно под иконку.
 */
export function tabHighlightInset(): number {
  return TAB_PILL_EDGE_PAD + (TAB_SLOT_WIDTH - TAB_ACTIVE_PILL_WIDTH) / 2;
}

// ── Сворачивание капсулы при скролле ────────────────────────────────────────
/**
 * Числа ОДИН В ОДИН с таббаром главного экрана (`app/(tabs)/_layout.tsx`,
 * константы `TAB_SCROLL_*`): вниз — капсула поджимается и слегка уезжает под
 * нижний край, вверх — возвращается; у самого верха списка всегда раскрыта.
 * Гистерезис (разные пороги на сворачивание/раскрытие + минимальная дельта)
 * не даёт капсуле дёргаться на микро-движениях пальца.
 *
 * Главный экран заперт контрактом `tests/tabbar_scroll_chrome_contract.test.ts`
 * на литералы в самом `_layout.tsx`, поэтому оттуда числа не выносились;
 * связь двух копий проверяется тем же контрактом.
 */
export const TAB_SCROLL_COLLAPSED_SCALE = 0.9;
export const TAB_SCROLL_COLLAPSED_TRANSLATE_Y = 8;
export const TAB_SCROLL_COLLAPSED_OPACITY = 0.94;
/** Ниже этого офсета сворачивания не бывает вовсе. */
export const TAB_SCROLL_COLLAPSE_TRIGGER_Y = 36;
/** У верхней кромки списка капсула всегда раскрыта — мгновенно, без анимации. */
export const TAB_SCROLL_EXPAND_TRIGGER_Y = 10;
/** Минимальная дельта кадра, которая считается «направлением». */
export const TAB_SCROLL_DIRECTION_EPSILON = 5;
export const TAB_SCROLL_COLLAPSE_MS = 220;
export const TAB_SCROLL_EXPAND_MS = 260;
/** Анти-дребезг: между переключениями состояния — не чаще этого. */
export const TAB_SCROLL_TOGGLE_COOLDOWN_MS = 140;

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
