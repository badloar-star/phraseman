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
}>;

const SURFACE_MIN = 1.6;
const TEXT_MIN = 4.6;
const CTA_SURFACE_MIN = 1.8;
const CTA_INK_MIN = 4.5;
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

/** Вторичная заливка: сдвигаем `opaqueControl` к тексту темы, пока она отличима от поверхностей и подпись читается. */
function secondaryFill(t: Surfaces): string {
  const under = underSurfaces(t);
  let best = hex6(t.opaqueControl);
  let bestScore = -1;
  for (let k = 0; k <= 0.9001; k += 0.02) {
    const c = mix(t.opaqueControl, t.text, k);
    const rs = minOver(c, under);
    const rt = ratio(t.text, c);
    if (rs >= SURFACE_MIN && rt >= TEXT_MIN) return c;
    const score = Math.min(rs / SURFACE_MIN, 1) + Math.min(rt / TEXT_MIN, 1);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

/** Главная заливка: cta, а при слиянии с фоном — глубже в сторону текста темы (подпись ctaInk должна остаться читаемой). */
function primaryFill(t: Surfaces): string {
  const under = underSurfaces(t);
  const cta = hex6(t.cta);
  if (minOver(cta, under) >= CTA_SURFACE_MIN) return cta;
  for (let k = 0.04; k <= 0.8001; k += 0.02) {
    const c = mix(cta, t.text, k);
    if (ratio(t.ctaInk, c) < CTA_INK_MIN) break; // дальше подпись не читается — оставляем лучшее из достигнутого
    if (minOver(c, under) >= CTA_SURFACE_MIN) return c;
  }
  return cta;
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
  const buttonFillDisabled = mix(buttonFill, t.opaqueSheet, 0.5);
  // подпись приглушаем (отличие от активной), но не ниже порога: берём последнюю смесь, которая ещё держит DISABLED_INK_TARGET
  let buttonInkDisabled = hex6(t.text);
  for (let a = 0.98; a >= 0.2; a -= 0.02) {
    const candidate = mix(buttonFillDisabled, t.text, a);
    if (ratio(candidate, buttonFillDisabled) < DISABLED_INK_TARGET) break;
    buttonInkDisabled = candidate;
  }
  return { buttonFill, buttonFillDisabled, buttonInkDisabled, ctaFill: primaryFill(t), ...dangerRoles(t) };
}
