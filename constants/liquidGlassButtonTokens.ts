// ═══════════════════════════════════════════════════════════════════════════
// liquidGlassButtonTokens.ts — цвета кнопок, которые не сливаются с фоном ни в одной теме.
//
// зачем (владелец 13.10: «НИКАКИЕ КНОПКИ ВООБЩЕ ЧТОБЫ НЕ СЛИВАЛИСЬ»; повод — вторичная «Напомнить за день» почти слилась с шторкой и стояла
// впритык к главной): раньше вторичная кнопка брала `opaqueControl`, а тот отличается от шторки/карточки/фона лишь на 1,18–1,3 : 1, у отключённой кнопки
// всё было «opacity 0.45» — подпись уходила ниже 3 : 1. Здесь считаются отдельные роли кнопок от токенов темы (без ручных цветов):
//   buttonFill          — заливка вторичной кнопки: ≥ 1,6 : 1 к фону, верхнему/нижнему краю фона, карточке и шторке; подпись text на ней ≥ 4,6 : 1;
//   buttonFillDisabled  — заливка отключённой: плоская (ближе к шторке), заметно отличается от вторичной (≥ 1,08 : 1);
//   buttonInkDisabled   — подпись отключённой: ≥ 4,5 : 1 к своей заливке (находка Макетов 13.10: образец #8E8E93, 5,1 : 1) — читается; отличима от активной плоской заливкой;
//   dangerFill/dangerInk — опасные «Удалить/Убрать/Очистить/Сменить без сохранения»: своя заливка цвета bad темы и подпись ≥ 4,5 : 1 (образец Макетов: #6A2A25 / #FFC2BB);
//   ctaFill             — заливка главной кнопки: цвет cta, а там где пастельный cta слился бы с фоном (светлые градиентные темы на «Максимуме»,
//                         1,0–1,3 : 1) — углублён в сторону текста темы до ≥ 1,8 : 1, подпись ctaInk остаётся ≥ 4,5 : 1.
// Сторож: tests/button_tokens_contrast.test.ts (23 темы × светлое/тёмное × 5 шагов ползунка).
// ═══════════════════════════════════════════════════════════════════════════

type Surfaces = Readonly<{
  bg: string; bgTop: string; bgBottom: string; opaqueCard: string; opaqueSheet: string; opaqueControl: string;
  text: string; cta: string; ctaInk: string; bad: string;
}>;

export type LiquidGlassButtonRoles = Readonly<{
  /** Заливка вторичной кнопки: ≥ 1,6 : 1 к любой поверхности под ней, подпись `text` ≥ 4,6 : 1. */
  buttonFill: string;
  /** Заливка отключённой кнопки: плоская, но отличима от вторичной. */
  buttonFillDisabled: string;
  /** Подпись отключённой кнопки: ≥ 4,5 : 1 к своей заливке. */
  buttonInkDisabled: string;
  /** Заливка опасной кнопки: оттенок bad темы, отличима от поверхностей (≥ 1,5 : 1). */
  dangerFill: string;
  /** Подпись опасной кнопки: ≥ 4,5 : 1 к dangerFill. */
  dangerInk: string;
  /** Заливка главной кнопки: cta, при слиянии с фоном — глубже, подпись ctaInk ≥ 4,5 : 1. */
  ctaFill: string;
  /** Подпись на ЗАЛИВКЕ главной кнопки (ctaFill): исходная ctaInk, а там где ≥ 3 : 1 к поверхностям с ней недостижимо (светлые градиентные темы) — белая на углублённой заливке того же оттенка. ctaInk остаётся подписью на «сыром» cta. */
  ctaFillInk: string;
}>;

const SURFACE_MIN = 1.7;
// зачем (координатор 15.10, правило владельца «кнопки не сливаются» для НЕАКТИВНЫХ): отключённая кнопка тоже ≥ 1,5 : 1 к любой поверхности под ней;
// вторичная поднята до 1,9 : 1, чтобы отключённая (≥ 1,5) оставалась от неё отличимой (≥ 1,25 : 1) и читалась как «выключена», а не как «другая кнопка».
const DISABLED_SURFACE_MIN = 1.5;
const TEXT_MIN = 4.6;
// зачем: правило владельца 13.10 "кнопки не сливаются", аудит 15.10 — заливка главной кнопки не слабее 3 : 1 к странице, карточке и шторке (фон кнопки как графика); раньше 1,8 и в 10 светлых градиентных темах было 2,1–2,9
const CTA_SURFACE_MIN = 3.0;
const CTA_INK_MIN = 4.5;
const CTA_VS_SECONDARY_MIN = 1.3;
const DISABLED_INK_TARGET = 4.6;
const DANGER_SURFACE_MIN = 1.5;
const DANGER_INK_MIN = 4.6;

const hex6 = (hex: string): string => (/^#[0-9A-Fa-f]{6}/.test(hex) ? hex.slice(0, 7).toUpperCase() : '#000000');
const rgb = (hex: string): readonly [number, number, number] => {
  const h = hex6(hex).slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const lum = (hex: string): number => {
  const [r, g, b] = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string): number => {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** k — доля `to` в смеси: 0 → from, 1 → to. */
const mix = (from: string, to: string, k: number): string => {
  const a = rgb(from);
  const b = rgb(to);
  const c = (i: number): string => Math.round(a[i]! * (1 - k) + b[i]! * k).toString(16).padStart(2, '0');
  return `#${c(0)}${c(1)}${c(2)}`.toUpperCase();
};

function underSurfaces(t: Surfaces): readonly string[] {
  return [t.bg, t.bgTop, t.bgBottom, t.opaqueCard, t.opaqueSheet];
}
const minOver = (color: string, under: readonly string[]): number => Math.min(...under.map((s) => ratio(color, s)));

const chroma = (hex: string): number => { const c = rgb(hex); return (Math.max(...c) - Math.min(...c)) / 255; };
/** Нейтральная серая поверхность при цветном акценте темы (светлые градиентные темы на «Акценте/Максимуме»): вторичная кнопка на ней читалась как отключённая. */
const NEUTRAL_CHROMA_MAX = 0.03;
const ACCENT_CHROMA_MIN = 0.05;
const TONE_SHARE = 0.3;

/**
 * Вторичная заливка: сдвигаем `opaqueControl` к тексту темы, пока она отличима от поверхностей и подпись читается.
 * зачем (координатор 14.10, находка Макетов): в светлых градиентных темах opaqueControl нейтрально-серый (#AAAAAD), рядом с отключённой (#D5D5D6) вторичная читалась как ОТКЛЮЧЁННАЯ —
 * владелец такое уже браковал. Если поверхность нейтральна, а акцент темы цветной, подмешиваем акцент (и в тёмный конец сдвига) — вторичная получает тон темы; «Спокойно» (акцент нейтрален) не меняется.
 */
/** Линия заливок кнопок: от opaqueControl (с тоном темы там, где поверхность серая) к тексту темы — по ней идут вторичная и отключённая. */
function fillLine(t: Surfaces): Readonly<{ start: string; toward: string }> {
  const tone = chroma(t.opaqueControl) < NEUTRAL_CHROMA_MAX && chroma(t.cta) >= ACCENT_CHROMA_MIN;
  return { start: tone ? mix(t.opaqueControl, t.cta, TONE_SHARE) : hex6(t.opaqueControl), toward: tone ? mix(t.text, t.cta, 0.2) : t.text };
}

/**
 * Отключённая заливка: от вторичной в сторону шторки (плоше, мягче), пока ещё ≥ 1,5 : 1 к каждой поверхности под кнопкой — дальше начинается «слилась с фоном».
 * Идём подряд от вторичной и останавливаемся на последнем шаге, где порог держится; вторичная при этом ≥ 1,9 : 1, поэтому отличие от неё остаётся заметным.
 */
function disabledFill(t: Surfaces, secondary: string): string {
  const under = underSurfaces(t);
  let best = secondary;
  for (let k = 0.02; k <= 1.0001; k += 0.02) {
    const c = mix(secondary, t.opaqueSheet, k);
    if (minOver(c, under) < DISABLED_SURFACE_MIN) break;
    best = c;
  }
  return best;
}

function secondaryFill(t: Surfaces): string {
  const under = underSurfaces(t);
  const { start, toward } = fillLine(t);
  let best = start;
  let bestScore = -1;
  for (let k = 0; k <= 0.9001; k += 0.02) {
    const c = mix(start, toward, k);
    const rs = minOver(c, under);
    const rt = ratio(t.text, c);
    if (rs >= SURFACE_MIN && rt >= TEXT_MIN) return c;
    const score = Math.min(rs / SURFACE_MIN, 1) + Math.min(rt / TEXT_MIN, 1);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

type PrimaryTry = Readonly<{ fill: string; ok: boolean; surface: number }>;

/** Подбор заливки главной кнопки под заданную подпись `ink`: от cta к `toward`, пока подпись ≥ 4,5 : 1, заливка ≥ 3 : 1 к поверхностям и отличима от вторичной. */
function primaryFor(t: Surfaces, secondary: string, ink: string, toward: string): PrimaryTry {
  const under = underSurfaces(t);
  const cta = hex6(t.cta);
  const inkIsLight = lum(ink) > 0.5;
  // зачем (закон владельца 13.10: вторичная и основная не сливаются): основная должна и отличаться от поверхностей, и быть заметно ярче/темнее вторичной
  const ok = (c: string): boolean => minOver(c, under) >= CTA_SURFACE_MIN && ratio(c, secondary) >= CTA_VS_SECONDARY_MIN && ratio(ink, c) >= CTA_INK_MIN;
  let best = cta;
  let bestSurface = -1;
  for (let k = 0; k <= 0.9001; k += 0.004) {
    const c = k === 0 ? cta : mix(cta, toward, k);
    const inkOk = ratio(ink, c) >= CTA_INK_MIN;
    // дальше по этой линии подпись только хуже (тёмная на тёмнеющей / светлая на светлеющей) — стоп; светлая на темнеющей — пока не читается, идём глубже
    if (!inkOk && k > 0 && !inkIsLight) break;
    if (!inkOk) continue;
    if (ok(c)) return { fill: c, ok: true, surface: minOver(c, under) };
    const surface = minOver(c, under);
    if (ratio(c, secondary) >= CTA_VS_SECONDARY_MIN && surface > bestSurface) { bestSurface = surface; best = c; }
  }
  return { fill: best, ok: false, surface: bestSurface < 0 ? minOver(cta, under) : bestSurface };
}

/**
 * Главная кнопка: заливка и подпись вместе. Сначала исходная подпись ctaInk (заливка идёт к тексту темы); если ≥ 3 : 1 к поверхностям с ней недостижимо
 * (аудит 15.10: светлые градиентные темы — пастельный cta и тёмная подпись), берём ту подпись — белую на углублённой заливке того же оттенка, — что даёт
 * большую отличимость от поверхностей. Решение координатора 15.10: заливку углубляем в оттенке темы, подпись выбираем по большему контрасту; фон экрана не трогаем.
 */
function primaryRoles(t: Surfaces, secondary: string): Readonly<{ fill: string; ink: string }> {
  const ink = hex6(t.ctaInk);
  const first = primaryFor(t, secondary, ink, t.text);
  if (first.ok) return { fill: first.fill, ink };
  const white = '#FFFFFF';
  if (ink !== white) {
    const alt = primaryFor(t, secondary, white, '#000000');
    if (alt.ok || alt.surface > first.surface) return { fill: alt.fill, ink: white };
  }
  return { fill: first.fill, ink };
}

/** Опасная кнопка: заливка — bad, растворённый в шторке (от слабого к сильному), подпись — bad, сдвинутый к тексту темы, пока не станет читаемой. */
function dangerRoles(t: Surfaces): Readonly<{ dangerFill: string; dangerInk: string }> {
  const under = underSurfaces(t);
  let fallback = { dangerFill: mix(t.opaqueSheet, t.bad, 0.4), dangerInk: hex6(t.text) };
  for (let k = 0.1; k <= 0.7001; k += 0.02) {
    const fill = mix(t.opaqueSheet, t.bad, k);
    if (minOver(fill, under) < DANGER_SURFACE_MIN) continue;
    for (let m = 0.2; m <= 1.0001; m += 0.05) {
      const ink = mix(t.bad, t.text, Math.min(m, 1));
      if (ratio(ink, fill) >= DANGER_INK_MIN) return { dangerFill: fill, dangerInk: ink };
    }
    fallback = { dangerFill: fill, dangerInk: hex6(t.text) };
  }
  return fallback;
}

export function deriveLiquidGlassButtonRoles(t: Surfaces): LiquidGlassButtonRoles {
  const buttonFill = secondaryFill(t);
  const buttonFillDisabled = disabledFill(t, buttonFill);
  // подпись приглушаем (отличие от активной), но не ниже порога: берём последнюю смесь, которая ещё держит DISABLED_INK_TARGET
  let buttonInkDisabled = hex6(t.text);
  for (let a = 0.98; a >= 0.2; a -= 0.02) {
    const candidate = mix(buttonFillDisabled, t.text, a);
    if (ratio(candidate, buttonFillDisabled) < DISABLED_INK_TARGET) break;
    buttonInkDisabled = candidate;
  }
  const primary = primaryRoles(t, buttonFill);
  return { buttonFill, buttonFillDisabled, buttonInkDisabled, ctaFill: primary.fill, ctaFillInk: primary.ink, ...dangerRoles(t) };
}
