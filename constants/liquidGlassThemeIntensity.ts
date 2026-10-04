// ═══════════════════════════════════════════════════════════════════════════
// Темы 2.0: непрерывная интенсивность цвета вместо «Спокойно / Акцент / Максимум».
//
// зачем (владелец 2026-10-04): «убираем 3 кнопки и вместо этого делаем только ползунок —
// тянешь, и на глазах меняется насыщенность». Три одобренные формулы палитры остаются
// опорными точками шкалы: Спокойно = 0, Акцент = 0.5, Максимум = 1. Между ними токены
// смешиваются поканально. На опорной точке палитра байт-в-байт прежняя — у тех, кто уже
// выбрал уровень, после обновления ничего не прыгает.
// ═══════════════════════════════════════════════════════════════════════════

import {
  buildLiquidGlassVariant,
  type LiquidGlassAccentRoles,
  type LiquidGlassAppearance,
  type LiquidGlassBaseTokens,
  type LiquidGlassColorLevel,
} from './liquidGlassThemeVariants';

/** Опорные точки шкалы: прежние три уровня. */
export const LIQUID_GLASS_LEVEL_INTENSITY: Readonly<Record<LiquidGlassColorLevel, number>> = Object.freeze({
  calm: 0,
  accent: 0.5,
  max: 1,
});

/**
 * Шаг перекраски и ключа кэша: 21 значение на всю шкалу. Мельче глаз не различает, а
 * каждый шаг во время перетаскивания — одна перерисовка дерева, не на каждый кадр.
 */
export const LIQUID_GLASS_INTENSITY_STEP = 0.05;

/** Точки, где ползунок щёлкает хаптиком (не на каждом шаге). */
export const LIQUID_GLASS_INTENSITY_DETENTS: readonly number[] = Object.freeze([0, 0.25, 0.5, 0.75, 1]);

/** С этой интенсивности поверхности считаются «Максимумом» для экранов, ветвящихся по уровню. */
const MAX_BUCKET_FROM = 0.75;

export function clampLiquidGlassIntensity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function quantizeLiquidGlassIntensity(value: number): number {
  const steps = Math.round(clampLiquidGlassIntensity(value) / LIQUID_GLASS_INTENSITY_STEP);
  // зачем: 0.05 * 7 = 0.35000000000000003 — округляем до сотых, иначе ключ кэша и
  // сравнение с опорной точкой ломаются на плавающей точке.
  return Math.round(steps * LIQUID_GLASS_INTENSITY_STEP * 100) / 100;
}

/**
 * Уровень-«корзина» для ~10 экранов, которые ветвятся по `level` (EnergyBar, V2-палитра,
 * Друзья, Learning V2). 0 — ровно «Спокойно»; всё цветное — «Акцент», с 0.75 — «Максимум».
 */
export function liquidGlassLevelForIntensity(value: number): LiquidGlassColorLevel {
  const q = quantizeLiquidGlassIntensity(value);
  if (q === 0) return 'calm';
  return q >= MAX_BUCKET_FROM ? 'max' : 'accent';
}

export function intensityForLiquidGlassLevel(level: LiquidGlassColorLevel): number {
  return LIQUID_GLASS_LEVEL_INTENSITY[level];
}

export type LiquidGlassIntensitySource = 'intensity' | 'legacy_level' | 'default';
export type LiquidGlassIntensityMigration = Readonly<{
  intensity: number;
  source: LiquidGlassIntensitySource;
  /** true — нового ключа ещё нет, его надо дописать (одна запись при первом старте). */
  needsWrite: boolean;
}>;

/**
 * Что показать при старте. Новый ключ главнее; без него — прежний уровень переводится в
 * опорную точку («Спокойно / Акцент / Максимум» → 0 / 0.5 / 1); мусор → 0 (как раньше).
 */
export function migrateStoredLiquidGlassIntensity(storedIntensity: unknown, storedLevel: unknown): LiquidGlassIntensityMigration {
  if (typeof storedIntensity === 'string' && storedIntensity.trim() !== '') {
    const parsed = Number(storedIntensity);
    if (Number.isFinite(parsed)) {
      return Object.freeze({ intensity: quantizeLiquidGlassIntensity(parsed), source: 'intensity', needsWrite: false });
    }
  }
  if (storedLevel === 'calm' || storedLevel === 'accent' || storedLevel === 'max') {
    return Object.freeze({ intensity: LIQUID_GLASS_LEVEL_INTENSITY[storedLevel], source: 'legacy_level', needsWrite: true });
  }
  return Object.freeze({ intensity: 0, source: 'default', needsWrite: false });
}

// ─── смешивание цветов ────────────────────────────────────────────────────

type Rgba = { r: number; g: number; b: number; a: number; hasAlpha: boolean };

function parseColor(value: string): Rgba | null {
  const s = value.trim();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return { r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16), b: parseInt(hex[2] + hex[2], 16), a: 1, hasAlpha: false };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
        hasAlpha: hex.length === 8,
      };
    }
    return null;
  }
  const m = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (!m) return null;
  const parts = m[1].split(',').map(p => Number(p.trim()));
  if (parts.length < 3 || parts.some(n => !Number.isFinite(n))) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1, hasAlpha: true };
}

const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0').toUpperCase();

/**
 * Смешать два цвета. Альфа — с премультипликацией: прозрачный «#00000000» уходит в цвет,
 * не затемняя его. Восьмизначный hex — только если у входа была альфа: экраны дописывают
 * к шестизначным цветам свой суффикс прозрачности (`${accentCap}38`).
 */
export function mixLiquidGlassColor(from: string, to: string, t: number): string {
  if (t <= 0) return from;
  if (t >= 1) return to;
  const a = parseColor(from);
  const b = parseColor(to);
  if (!a || !b) return t < 0.5 ? from : to;
  const alpha = a.a + (b.a - a.a) * t;
  const ch = (x: number, y: number) => (alpha <= 0 ? x + (y - x) * t : (x * a.a * (1 - t) + y * b.a * t) / alpha);
  const rgb = `#${hex2(ch(a.r, b.r))}${hex2(ch(a.g, b.g))}${hex2(ch(a.b, b.b))}`;
  return a.hasAlpha || b.hasAlpha ? `${rgb}${hex2(alpha * 255)}` : rgb;
}

/** Цвет градиента в точке 0…1 (стопы равномерные, как в LinearGradient без locations). */
function sampleGradient(stops: readonly string[], at: number): string {
  if (stops.length === 1) return stops[0];
  const pos = at * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(pos));
  return mixLiquidGlassColor(stops[i], stops[i + 1], pos - i);
}

function mixGradient(from: readonly string[], to: readonly string[], t: number): readonly string[] {
  const n = Math.max(from.length, to.length);
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const at = n === 1 ? 0 : i / (n - 1);
    out.push(mixLiquidGlassColor(sampleGradient(from, at), sampleGradient(to, at), t));
  }
  return Object.freeze(out);
}

type Point = Readonly<{ x: number; y: number }>;
const isPoint = (v: unknown): v is Point => typeof v === 'object' && v !== null && !Array.isArray(v)
  && typeof (v as Point).x === 'number' && typeof (v as Point).y === 'number';

type Tokens = LiquidGlassBaseTokens & LiquidGlassAccentRoles;

/** Поканальное смешивание двух палитр (цвета, градиенты, направления). */
export function blendLiquidGlassTokens(from: Tokens, to: Tokens, t: number): Tokens {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(to) as (keyof Tokens)[]) {
    const a = from[key] as unknown;
    const b = to[key] as unknown;
    if (typeof a === 'string' && typeof b === 'string') out[key] = mixLiquidGlassColor(a, b, t);
    else if (Array.isArray(a) && Array.isArray(b)) out[key] = mixGradient(a as string[], b as string[], t);
    else if (isPoint(a) && isPoint(b)) {
      const r = (n: number) => Math.round(n * 1000) / 1000;
      out[key] = Object.freeze({ x: r(a.x + (b.x - a.x) * t), y: r(a.y + (b.y - a.y) * t) });
    } else out[key] = b;
  }
  return out as Tokens;
}

/**
 * Палитра темы на произвольной интенсивности. На опорной точке — опорная палитра без
 * пересчёта (байт-в-байт), между ними — смешивание двух соседних.
 */
export function buildLiquidGlassIntensityTokens(
  id: string,
  calmDark: LiquidGlassBaseTokens,
  appearance: LiquidGlassAppearance,
  intensity: number,
): Tokens {
  const q = quantizeLiquidGlassIntensity(intensity);
  const at = (level: LiquidGlassColorLevel) => buildLiquidGlassVariant(id, calmDark, { level, appearance });
  if (q === 0) return at('calm');
  if (q === 0.5) return at('accent');
  if (q === 1) return at('max');
  const [from, to, t] = q < 0.5
    ? [at('calm'), at('accent'), q / 0.5] as const
    : [at('accent'), at('max'), (q - 0.5) / 0.5] as const;
  const level = liquidGlassLevelForIntensity(q);
  return Object.freeze({ ...blendLiquidGlassTokens(from, to, t), level });
}
