// ═══════════════════════════════════════════════════════════════════════════
// story_template_layout.ts — чистые расчёты раскладки кадров историй (без React Native): формулы макета stories-templates-v1.html.
//
// зачем: формулы частиц (конфетти, снег, дождь монет), столбики недели, клетки месяца и недели серии, размер башни, ширина заголовка
// «как text-wrap: balance» и разбор цвета токена — в одном месте, чтобы тест сверял их с макетом построчно (tests/story_templates_v1_*).
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { SPIRE_TOWER_GEOM, SPIRE_TW } from '../../spire/spire_tower_model';
import { DAY_MS, weekdayLetter } from './story_template_dates';

// ── заголовок «как text-wrap: balance» ───────────────────────────────────────────────────────────────────────────────

/**
 * Ширина блока слов «как text-wrap: balance»: столько же строк, сколько даёт обычный перенос при maxWidth, но самая узкая ширина —
 * строки выходят ровными. widths — ширины слов, gap — пробел между словами.
 */
export function balancedWidth(widths: readonly number[], gap: number, maxWidth: number): number {
  const lines = (limit: number): number => {
    let count = 1;
    let line = 0;
    for (const w of widths) {
      const next = line === 0 ? w : line + gap + w;
      if (next > limit && line > 0) { count += 1; line = w; } else line = next;
    }
    return count;
  };
  if (widths.length === 0) return 0;
  const target = lines(maxWidth);
  let lo = Math.max(...widths);
  let hi = maxWidth;
  if (lines(hi) !== target) return maxWidth;
  for (let i = 0; i < 24 && hi - lo > 0.5; i += 1) {
    const mid = (lo + hi) / 2;
    if (lines(mid) === target) hi = mid; else lo = mid;
  }
  return Math.ceil(hi);
}

// ── частицы ──────────────────────────────────────────────────────────────────────────────────────────────────────────

export type ConfettiPiece = Readonly<{ color: string; dx: number; dy: number; rot: number; d: number }>;

/** Конфетти макета `confetti(n, d0)`: угол по кругу, радиус 120..232, цвета по кругу (accentBright, accent, текст, вторичный). */
export function confettiPieces(n: number, d0: number, colors: readonly [string, string, string, string]): ConfettiPiece[] {
  return Array.from({ length: n }, (_, i) => {
    const a = ((Math.PI * 2) / n) * i + (i % 3) * 0.3;
    const r = 120 + (i % 5) * 28;
    return { color: colors[i % 4]!, dx: Math.round(Math.cos(a) * r), dy: Math.round(Math.sin(a) * r + 90), rot: (i * 97) % 360, d: d0 + (i % 6) * 60 };
  });
}

export type Flake = Readonly<{ x: number; size: number; durMs: number; offsetMs: number; sx: number }>;

/** Снег макета: 26 снежинок, x = i·37 % 100, размер 3 + i % 4, 7 + i % 5 с, задержка −0,9·i с, снос ((i % 3) − 1)·40. */
export function snowFlakes(): Flake[] {
  return Array.from({ length: 26 }, (_, i) => ({ x: (i * 37) % 100, size: 3 + (i % 4), durMs: (7 + (i % 5)) * 1000, offsetMs: i * 900, sx: ((i % 3) - 1) * 40 }));
}

export type Drop = Readonly<{ rank: number; x: number; size: number; durMs: number; d: number; rot: number }>;
const RAIN_RANKS = [1, 7, 3, 9, 5, 12, 2, 8, 4, 10] as const;

/** Дождь монет макета: 10 монет, x = 6 + 9,4·i %, размер 26 + 7·(i % 4), 1,5 + 0,3·(i % 3) с, задержка 140·i, поворот ±(180 + 40·i). */
export function coinDrops(): Drop[] {
  return RAIN_RANKS.map((rank, i) => ({ rank, x: 6 + i * 9.4, size: 26 + (i % 4) * 7, durMs: (1.5 + (i % 3) * 0.3) * 1000, d: i * 140, rot: (i % 2 ? 1 : -1) * (180 + i * 40) }));
}

// ── календари и столбики ─────────────────────────────────────────────────────────────────────────────────────────────

export type DayCell = Readonly<{ key: string; letter: string; on: boolean }>;

/** Неделя серии: 7 дней, заканчивая днём события; горят последние min(days, 7). */
export function streakWeekCells(lang: Lang, endMs: number, days: number): DayCell[] {
  const lit = Math.max(0, Math.min(7, Math.trunc(days)));
  return Array.from({ length: 7 }, (_, i) => {
    const ms = endMs - (6 - i) * DAY_MS;
    return { key: `d${ms}`, letter: weekdayLetter(lang, ms), on: i >= 7 - lit };
  });
}

/** Высота столбика дня: макет .wk 120 − подпись (строка 21 + отступ 6) = 93 dp у самого длинного дня. */
export const WEEK_BAR_MAX = 93;

export type WeekBar = Readonly<{ key: string; letter: string; h: number; top: boolean; d: number }>;

/** Столбики недели: доля от самого длинного дня; самый длинный — в акценте; рост с 150 через 90 мс. */
export function weekBars(lang: Lang, startMs: number, dailyMinutes: readonly number[]): WeekBar[] {
  const top = Math.max(0, ...dailyMinutes.slice(0, 7).map((m) => Number(m) || 0));
  return Array.from({ length: 7 }, (_, i) => {
    const minutes = Math.max(0, Number(dailyMinutes[i]) || 0);
    return { key: `w${i}`, letter: weekdayLetter(lang, startMs + i * DAY_MS), h: top > 0 ? Math.round((WEEK_BAR_MAX * minutes) / top) : 0, top: top > 0 && minutes === top, d: 150 + i * 90 };
  });
}

export type MonthCell = Readonly<{ key: string; day: number; on: boolean; d: number }>;

/** Клетки месяца: активные дни загораются по порядку через 55 мс с 200. */
export function monthCells(daysInMonth: number, activeDays: readonly number[]): MonthCell[] {
  const on = new Set(activeDays);
  let lit = 0;
  return Array.from({ length: Math.max(0, Math.min(31, daysInMonth)) }, (_, i) => {
    const day = i + 1;
    const isOn = on.has(day);
    const d = 200 + (isOn ? lit++ : 0) * 55;
    return { key: `m${day}`, day, on: isOn, d };
  });
}

// ── башня Пика ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Размер башни: макет — ширина 200, высота ≤ 400; на низком экране — меньше, чтобы под ней поместились обзор, заголовок и подпись. */
export function summitTowerSize(winH: number): Readonly<{ width: number; height: number }> {
  // кадр между 120 и 60 (без кнопки); под башней ~190 dp текста и отступов
  const maxH = Math.max(160, Math.min(400, winH - 120 - 60 - 190));
  const width = Math.min(200, Math.floor((maxH * SPIRE_TW) / SPIRE_TOWER_GEOM.height));
  return { width, height: Math.round((SPIRE_TOWER_GEOM.height * width) / SPIRE_TW) };
}

// ── цвет токена ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Цвет токена → сплошной цвет + прозрачность (для stopOpacity SVG): #RRGGBB, #RRGGBBAA, rgb(a)(…). */
export function splitAlpha(color: string): Readonly<{ solid: string; alpha: number }> {
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color);
  if (hex) return { solid: `#${hex[1]}`, alpha: hex[2] ? parseInt(hex[2], 16) / 255 : 1 };
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(color);
  if (rgba) {
    const [r = '0', g = '0', b = '0', a = '1'] = rgba[1]!.split(',').map((s) => s.trim());
    return { solid: `rgb(${r}, ${g}, ${b})`, alpha: Math.max(0, Math.min(1, Number(a))) };
  }
  return { solid: color, alpha: 1 };
}
