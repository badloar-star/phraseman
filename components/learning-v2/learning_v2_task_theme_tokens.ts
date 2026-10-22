// ═════════════════════════════════════════════════════════════════════════
// learning_v2_task_theme_tokens.ts — недостающие токены заданий V2 по макету №23 (docs/design/v2-app/learning-v2-tasks-review.html, «Предлагаем»).
//
// зачем (владелец 22.10 через координатора: «переносим 1:1, ничего не толкуем»; таблица 4 · ТЕМЫ docs/work/tasks/tasks-23-theme-tokens-2026-10-22.md, п. 1–9): девять цветов и теней макета,
// которых нет в токенах темы, собраны здесь ОДИН раз из токенов самой темы (useLv2Glass) — экраны заданий не заводят своих цветов. Верный ответ остаётся кодовым зелёным (п. 3, контраст ≥ 4,5).
// Светлая тема: значения макета (--ctl, --solid, --sh, полка чипа); тёмная: --sh и полка из kit.css тёмной темы.
// ═════════════════════════════════════════════════════════════════════════
import type { BoxShadowValue, ViewStyle } from 'react-native';

import type { Lv2Glass } from './LearningV2Glass';

// зачем: токены не тянут рантайм LearningV2Glass (он тащит тему и ShadowSurface) — тесты режимов подменяют Glass заглушкой; копия lv2Alpha без побочных импортов
const lv2Alpha = (hex: string, opacity: number): string => {
  if (!/^#[0-9a-fA-F]{6}$/u.test(hex)) return hex;
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
};

const parseHex = (hex: string): readonly [number, number, number] | null => {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/u.exec(hex);
  return m ? [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)] : null;
};

/** Смесь двух #RRGGBB: t = доля второго цвета (0..1). Не-hex — первый цвет как есть. */
export function lv2Mix(from: string, to: string, t: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return from;
  const channel = (i: 0 | 1 | 2): string => Math.round(a[i] + (b[i] - a[i]) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0');
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

export type Lv2TaskTokens = Readonly<{
  /** п. 1 `--ctl`: чипы, таймер, пропуск, плитки-значки. Светлая: треть пути от opaqueControl к opaqueCard (≈ #E6E7F4 у «Сумерек»); тёмная — opaqueControl. */
  controlSoft: string;
  /** п. 2 `--solid`: подвал и низ интро. */
  footerSolid: string;
  /** п. 4: `.sit` — акцент 9 % поверх карточки. */
  accentWash9: string;
  /** п. 4: `.opt.sel` — акцент 14 % поверх карточки. */
  accentWash14: string;
  /** п. 5 `--sh`: тень плит заданий (`.sit .say .opt .hp .tvx`). */
  taskPlateShadow: readonly BoxShadowValue[];
  /** п. 6: полка чипа `0 3px 0`. */
  chipShelf: string;
  /** п. 7 `.tcta`: фон — цвет текста, надпись — цвет карточки. */
  ctaFill: string;
  ctaInk: string;
  /** п. 8: окно нового слова — карточка темы. */
  windowFill: string;
  /** п. 9: карточка слова — тёмный градиент 160° во всех темах. */
  wordCardGradient: Readonly<{ colors: readonly [string, string]; angleDeg: number }>;
}>;

const LIGHT_SHADOW: readonly BoxShadowValue[] = [
  { offsetX: 0, offsetY: 10, blurRadius: 26, spreadDistance: -14, color: 'rgba(51,51,87,0.30)' },
  { offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: 'rgba(255,255,255,0.9)', inset: true },
];
const DARK_SHADOW: readonly BoxShadowValue[] = [
  { offsetX: 0, offsetY: 12, blurRadius: 28, spreadDistance: -14, color: 'rgba(0,0,0,0.7)' },
  { offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: 'rgba(255,255,255,0.06)', inset: true },
];

/** `.ans { box-shadow: inset 0 -1px 0 var(--edge) }`: линия под строкой ответа — внутренняя тень 1 px снизу (не border), цвет — `hairlineSoft` (--edge = текст α .10). */
export function lv2TaskAnswerLineShadow(g: Lv2Glass): readonly BoxShadowValue[] {
  return [{ offsetX: 0, offsetY: -1, blurRadius: 0, spreadDistance: 0, color: g.hairlineSoft, inset: true }];
}

/** Плита заданий: заливка карточки + тень `--sh` макета №23 (обводок нет). Живёт здесь, чтобы тело заданий не тянуло тяжёлые импорты; публичное имя lv2TaskPlateStyle — в layout_tokens (тонкая обёртка). */
export function lv2TaskPlateBase(g: Lv2Glass): ViewStyle {
  // зачем (владелец 22.10, 1:1): тень плит заданий — `--sh` макета №23 (taskPlateShadow), а не общая «Тень»
  return { backgroundColor: g.opaqueCard, boxShadow: lv2TaskTokens(g).taskPlateShadow as ViewStyle['boxShadow'] };
}

const cache = new WeakMap<object, Lv2TaskTokens>();

export function lv2TaskTokens(g: Lv2Glass): Lv2TaskTokens {
  const hit = cache.get(g);
  if (hit) return hit;
  const light = g.isLight;
  const built: Lv2TaskTokens = Object.freeze({
    controlSoft: light ? lv2Mix(g.opaqueControl, g.opaqueCard, 1 / 3) : g.opaqueControl,
    footerSolid: light ? '#EEEFFA' : g.bg, // theme-exempt: --solid макета («Сумерки», светлая); тёмная — фон экрана
    accentWash9: lv2Alpha(g.accent, 0.09),
    accentWash14: lv2Alpha(g.accent, 0.14),
    taskPlateShadow: light ? LIGHT_SHADOW : DARK_SHADOW,
    chipShelf: light ? lv2Alpha(g.text, 0.12) : 'rgba(0,0,0,0.34)', // theme-exempt: полка чипа — чёрная α .34 в тёмной теме (kit.css)
    ctaFill: g.text,
    ctaInk: g.opaqueCard,
    windowFill: g.opaqueCard,
    wordCardGradient: Object.freeze({ colors: ['#2A2B45', '#17182A'] as const, angleDeg: 160 }), // theme-exempt: карточка слова тёмная во всех темах (.nw .fc)
  });
  cache.set(g, built);
  return built;
}
