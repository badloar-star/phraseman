// ═══ Кольцо Plus у аватара · ЕДИНСТВЕННЫЙ источник размеров и цветов ═══
// зачем (владелец 21.10, реестр №6; эталон docs/design/v2-app/plus-ring-etalon.html): у человека с Plus вокруг аватара-монеты
// переливающееся кольцо и значок ◆. Числа здесь — из таблицы эталона, чтобы экраны не держали свои копии (иначе кольцо на
// «Друзьях» и на «Визитке» однажды разойдётся). Чистый модуль без React Native — проверяется юнит-тестом.
//
// Цвет Plus ОДИНАКОВЫЙ во всех темах (решение владельца): это знак статуса, а не часть темы, поэтому токены темы тут не участвуют.

/** Угловой градиент от 200°: #8E7CFF → #6FA8FF → #7FE0D8 → #C69BFF → #8E7CFF (замкнут). */
export const PLUS_RING_COLORS = ['#8E7CFF', '#6FA8FF', '#7FE0D8', '#C69BFF', '#8E7CFF'] as const; // theme-exempt: знак Plus — один цвет во всех темах
export const PLUS_RING_START_DEG = 200;
/** Значок ◆: градиент 135° сверху-слева вниз-вправо. */
export const PLUS_PIN_COLORS = ['#8E7CFF', '#6FA8FF'] as const; // theme-exempt: знак Plus — один цвет во всех темах
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
export function plusRingSpec(size: number, kind: PlusRingKind = 'list'): PlusRingSpec {
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
    return { kind, ring, gap, inset: ring + gap, outer: safeSize + 2 * (ring + gap), flatColor: PLUS_FLAT_COLOR, pin: null };
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
export function plusRingArcs(outer: number, ring: number, overlapDeg = 0.9): readonly PlusRingArc[] {
  const colors = PLUS_RING_COLORS;
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
 * Plus по публичному профилю другого человека (public_profiles / friends_profiles): покупка, VIP ИЛИ пожизненный Pro.
 * зачем: у человека с «Pro — навсегда» или бессрочной выдачей isPremium=false, а isLifetime=true (комментарий в app/public_profile_snapshot.ts) —
 * без isLifetime он терял бы кольцо в чужих списках. Самому себе кольцо даёт useIsPlus (isPremium || isVip || isPro) — тот же состав.
 */
export function isPlusProfile(p: Readonly<{ isPremium?: boolean | null; isVip?: boolean | null; isLifetime?: boolean | null }> | null | undefined): boolean {
  return p?.isPremium === true || p?.isVip === true || p?.isLifetime === true;
}
