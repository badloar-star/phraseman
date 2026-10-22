// ═══ Кольцо Plus у аватара · ЕДИНСТВЕННЫЙ источник размеров и цветов ═══
// зачем (владелец 21.10, реестр №6; эталон docs/design/v2-app/plus-ring-etalon.html): у человека с Plus вокруг аватара-монеты
// переливающееся кольцо и значок ◆. Числа здесь — из таблицы эталона, чтобы экраны не держали свои копии (иначе кольцо на
// «Друзьях» и на «Визитке» однажды разойдётся). Чистый модуль без React Native — проверяется юнит-тестом.
//
// Цвет Plus ОДИНАКОВЫЙ во всех темах (решение владельца): это знак статуса, а не часть темы, поэтому токены темы тут не участвуют.

/** Угловой градиент от 200°: #8E7CFF → #6FA8FF → #7FE0D8 → #C69BFF → #8E7CFF (замкнут). */
export const PLUS_RING_COLORS = ['#8E7CFF', '#6FA8FF', '#7FE0D8', '#C69BFF', '#8E7CFF'] as const; // theme-exempt: знак Plus — один цвет во всех темах
export const PLUS_RING_START_DEG = 200;
/**
 * Те же пять цветов, затемнённые для СВЕТЛЫХ тем.
 * зачем (владелец 22.10, вопрос №17: «Да, затемнённое»): на светлых фонах исходные цвета давали 1,1–2,3:1 (мятный почти сливался), норма для графики — 3:1.
 * Затемнение по яркости с сохранением тона: ≥ 3:1 к фону экрана и к карточке во всех 23 светлых темах (docs/work/tasks/plus-ring-light-contrast-2026-10-22.md).
 * Тёмные темы не тронуты. Порядок цветов и вид знака те же.
 */
export const PLUS_RING_COLORS_LIGHT = ['#7A6BDB', '#527CBD', '#4B847F', '#8D6EB5', '#7A6BDB'] as const; // theme-exempt: знак Plus — затемнённый вариант для светлых тем
/** Плоское кольцо Пика в светлых темах. */
export const PLUS_FLAT_COLOR_LIGHT = '#7A6FC9'; // theme-exempt: знак Plus — затемнённый вариант для светлых тем

/** Цвета углового градиента кольца под оформление темы. */
export function plusRingColors(isLight: boolean): readonly string[] {
  return isLight ? PLUS_RING_COLORS_LIGHT : PLUS_RING_COLORS;
}
/** Значок ◆: градиент 135° сверху-слева вниз-вправо. */
// зачем: 22.10, контраст ромба; вид сохранён. Белый ромб на прежнем голубом конце #6FA8FF давал 2,41:1 (в середине градиента 2,82:1); голубой конец ×0,86 → #5F90DB,
// белый ромб ≥ 3:1 по всей диагонали (3,24 / 3,28 / 3,23). Вариант A документа docs/work/tasks/plus-pin-glyph-contrast-2026-10-22.md; откат — вернуть #6FA8FF.
export const PLUS_PIN_COLORS = ['#8E7CFF', '#5F90DB'] as const; // theme-exempt: знак Plus — один цвет во всех темах
/** Плоское кольцо жителей на башне Пика. */
export const PLUS_FLAT_COLOR = '#9B8CFF'; // theme-exempt: знак Plus — один цвет во всех темах
export const PLUS_PIN_GLYPH_COLOR = '#FFFFFF'; // theme-exempt: белый ромб на фиолетовом значке

/** list — списки, шапки, «Аккаунт»; card — монета визитки 165; flat — жители на башне Пика (кольцо без значка). */
export type PlusRingKind = 'list' | 'card' | 'flat';

/** Значок ◆ показывается у аватаров от этого размера; меньше — только кольцо. */
export const PLUS_PIN_MIN_AVATAR = 26;

export type PlusPinSpec = Readonly<{
  /** Диаметр самого значка (градиентный круг). */
  size: number;
  /** Размер ромба внутри (58 % круга; на визитке 24). */
  glyph: number;
  /** Обводка цвета фона вокруг значка (box-shadow эталона). */
  outline: number;
  /** На сколько правый/нижний край значка выходит за рамку АВАТАРА (отрицательное — внутрь). */
  overhang: number;
}>;

export type PlusRingSpec = Readonly<{
  kind: PlusRingKind;
  /** Толщина кольца. */
  ring: number;
  /** Зазор между аватаром и кольцом (прозрачный — виден фон экрана). */
  gap: number;
  /** Насколько оверлей выходит за рамку аватара с каждой стороны (ring + gap). */
  inset: number;
  /** Внешний диаметр кольца. */
  outer: number;
  /** Плоский цвет (только flat), иначе null — рисуется градиент. */
  flatColor: string | null;
  pin: PlusPinSpec | null;
}>;

/**
 * Размеры кольца для аватара `size` (dp).
 * list: кольцо 2,5, зазор 2, значок max(14; 0,4 × аватар) у аватаров от 26, правый нижний угол со сдвигом −3 от кольца.
 * card: кольцо 6, зазор 5, значок 46 (ромб 24, обводка 4), внутри угла монеты на 4.
 * flat: кольцо 3, зазор 2, без значка.
 */
export function plusRingSpec(size: number, kind: PlusRingKind = 'list', isLight = false): PlusRingSpec {
  const safeSize = Number.isFinite(size) && size > 0 ? size : 0;
  if (kind === 'card') {
    const ring = 6;
    const gap = 5;
    return {
      kind, ring, gap, inset: ring + gap, outer: safeSize + 2 * (ring + gap), flatColor: null,
      pin: { size: 46, glyph: 24, outline: 4, overhang: ring - 4 },
    };
  }
  if (kind === 'flat') {
    const ring = 3;
    const gap = 2;
    return { kind, ring, gap, inset: ring + gap, outer: safeSize + 2 * (ring + gap), flatColor: isLight ? PLUS_FLAT_COLOR_LIGHT : PLUS_FLAT_COLOR, pin: null };
  }
  const ring = 2.5;
  const gap = 2;
  const pinSize = Math.max(14, Math.round(safeSize * 0.4));
  return {
    kind, ring, gap, inset: ring + gap, outer: safeSize + 2 * (ring + gap), flatColor: null,
    pin: safeSize >= PLUS_PIN_MIN_AVATAR
      ? { size: pinSize, glyph: Math.round(pinSize * 0.58), outline: 2, overhang: ring + 3 }
      : null,
  };
}

export type PlusRingArc = Readonly<{
  /** Путь дуги SVG (центр линии кольца). */
  d: string;
  /** Концы хорды для линейного градиента дуги (userSpaceOnUse). */
  x1: number; y1: number; x2: number; y2: number;
  from: string; to: string;
}>;

const r2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Угловой (conic) градиент кольца как набор дуг: React Native не умеет conic-gradient, поэтому окружность режется на дуги
 * по числу стыков цветов (4 дуги по 90°), у каждой — линейный градиент вдоль хорды от цвета к цвету. На толщине 2,5 dp глаз
 * разницы с настоящим угловым градиентом не видит. Дуги чуть перекрываются (`overlapDeg`), чтобы на стыках не было щелей.
 * Угол — по часовой стрелке от 12 часов, как в CSS.
 */
export function plusRingArcs(outer: number, ring: number, overlapDeg = 0.9, colors: readonly string[] = PLUS_RING_COLORS): readonly PlusRingArc[] {
  const segments = colors.length - 1;
  const step = 360 / segments;
  const c = outer / 2;
  const r = outer / 2 - ring / 2;
  const point = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: c + r * Math.sin(rad), y: c - r * Math.cos(rad) };
  };
  const arcs: PlusRingArc[] = [];
  for (let k = 0; k < segments; k += 1) {
    const a0 = PLUS_RING_START_DEG + k * step;
    const a1 = a0 + step;
    const p0 = point(a0);
    const p1 = point(a1);
    const pEnd = point(a1 + overlapDeg);
    arcs.push({
      d: `M ${r2(p0.x)} ${r2(p0.y)} A ${r2(r)} ${r2(r)} 0 0 1 ${r2(pEnd.x)} ${r2(pEnd.y)}`,
      x1: r2(p0.x), y1: r2(p0.y), x2: r2(p1.x), y2: r2(p1.y),
      from: colors[k]!, to: colors[k + 1]!,
    });
  }
  return arcs;
}

/** Метка «◆ Plus» у имени (только свой профиль, «Аккаунт», визитка): тёмная — #C9C0FF на 20 % фиолетового, светлая — #5442D8 на 12 %. */
export function plusTagColors(isLight: boolean): Readonly<{ bg: string; ink: string }> {
  return isLight
    ? { bg: 'rgba(110,92,240,0.12)', ink: '#5442D8' } // theme-exempt: знак Plus — фиксированные цвета по эталону
    : { bg: 'rgba(142,124,255,0.20)', ink: '#C9C0FF' }; // theme-exempt: знак Plus — фиксированные цвета по эталону
}

/** Подпись для озвучки экрана: что значит кольцо. */
export const PLUS_RING_A11Y = 'Plus';

/**
 * Запас на продление: 72 часа после срока, пока вебхук магазина не обновил plusUntilMs.
 * зачем (Ядро cbdecef56, координатор 22.10): подписка продлевается, а срок в профиле обновится только когда придёт вебхук — без запаса
 * у платящего человека кольцо гасло бы на часы в день продления. Бессрочный Plus (plusUntilMs = 0) запас не нужен.
 */
export const PLUS_RENEWAL_GRACE_MS = 72 * 60 * 60 * 1000;

export type PlusProfileFields = Readonly<{
  /** Настоящий Plus сервера: покупка (в т.ч. пожизненная), выдача админом, VIP. Вводный 72-часовой доступ даёт false. */
  isPlus?: boolean | null;
  /** 0 = бессрочно; число — срок в мс; null/нет поля = срока нет, то есть Plus нет. */
  plusUntilMs?: number | null;
}>;

/**
 * Plus по публичному профилю другого человека (public_profiles / friends_profiles).
 * Правило (Ядро, координатор 22.10): isPlus === true И (plusUntilMs === 0 ИЛИ plusUntilMs + 72 ч > сейчас).
 * Без поля isPlus кольца нет — НЕ откатываемся на isPremium: у части профилей там устаревшее true (вводный доступ, просроченное).
 * plusUntilMs = null или нет поля при isPlus=true — срока нет, считаем «Plus нет» (сервер всегда пишет оба поля вместе).
 * Самому себе кольцо даёт useIsPlus (isPremium || isVip || isPro из PremiumContext) — этот путь не меняется.
 */
export function isPlusProfile(p: PlusProfileFields | null | undefined, nowMs: number = Date.now()): boolean {
  if (p?.isPlus !== true) return false;
  const until = p.plusUntilMs;
  if (typeof until !== 'number' || !Number.isFinite(until)) return false;
  if (until === 0) return true;
  return until + PLUS_RENEWAL_GRACE_MS > nowMs;
}

/** Срок Plus из сырого документа: число (0 = бессрочно) как есть, всё остальное — null («Plus нет»). */
export function readPlusUntilMs(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
