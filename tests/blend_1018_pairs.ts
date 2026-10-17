// зачем ([BLEND-AUDIT], координатор 18.10, правило владельца «кнопки нигде не сливаются», все темы, светлые и тёмные): расчёт контраста по токенам
// для новинок 17.10: 4 плитки Главной (включая Пик), BackButton, карточка «Продолжить», шторка голосового лимита, поле пар Пика, плитки хаба Карточек.
// Порог: заливка кнопки к фону ≥ 3:1 (графика) или явный тон ≥ 1,5:1 (контейнеры-плашки отделены тенью — считаем только подпись), текст ≥ 4,5:1.
// Общий модуль для теста (tests/blend_1018_audit.test.ts) и отчёта (scripts/blend_1018_report.cjs). «Было» — токены до исправлений 17.10 (before), «стало» — текущие (after). BLEND_WRITE=1 пишет таблицу «тема × элемент × контраст» в docs/phraseman-2.0/evidence/blend_1018.md.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';

type Tok = Record<string, string>;
const parse = (c: string): { rgb: number[]; a: number } => {
  if (c.startsWith('rgba')) {
    const m = c.match(/rgba\(([^)]+)\)/)![1]!.split(',').map((x) => parseFloat(x));
    return { rgb: [m[0]!, m[1]!, m[2]!], a: m[3]! };
  }
  const h = c.replace('#', '');
  return { rgb: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)), a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
};
const over = (top: string, base: number[] | string, alpha?: number): number[] => {
  const t = parse(top);
  const a = alpha ?? t.a;
  const b = typeof base === 'string' ? parse(base).rgb : base;
  return t.rgb.map((v, i) => v * a + b[i]! * (1 - a));
};
const solid = (c: string): number[] => parse(c).rgb;
const lumRgb = (rgb: number[]): number => {
  const c = rgb.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: number[], b: number[]): number => {
  const [x, y] = [lumRgb(a), lumRgb(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

const TONE = 1.5;
const GRAPHIC = 3;
const TEXT = 4.5;
const plate = (t: Tok): number[] => over(t.plateFillFrom!, solid(t.bg!), 0.5); // плашка Главной: plateFillFrom с альфой 0,5

export type Pair = Readonly<{ element: string; what: string; min: number; after: (t: Tok) => number; before?: (t: Tok) => number }>;
export const PAIRS: readonly Pair[] = [
  // ── 4 плитки Главной (Диалоги / Карточки / Видео / Пик): плашка отделена тенью, проверяем подпись и бейдж места Пика
  { element: 'Главная: плитка', what: 'название к плашке', min: TEXT, after: (t) => ratio(solid(t.text!), plate(t)) },
  { element: 'Главная: плитка Пик', what: 'бейдж места: заливка к плашке', min: GRAPHIC, after: (t) => ratio(solid(t.ctaFill!), plate(t)) },
  { element: 'Главная: плитка Пик', what: 'бейдж места: подпись к заливке', min: TEXT, after: (t) => ratio(solid(t.ctaFillInk!), solid(t.ctaFill!)) },
  // ── BackButton (круг buttonFill, значок text)
  { element: 'BackButton', what: 'круг к странице (тон)', min: TONE, before: (t) => ratio(solid(t.opaqueControl!), solid(t.bg!)), after: (t) => ratio(solid(t.buttonFill!), solid(t.bg!)) },
  { element: 'BackButton', what: 'значок к кругу', min: GRAPHIC, after: (t) => ratio(solid(t.text!), solid(t.buttonFill!)) },
  // ── карточка «Продолжить»
  { element: 'Продолжить', what: 'название к плашке', min: TEXT, after: (t) => ratio(solid(t.text!), plate(t)) },
  { element: 'Продолжить', what: 'дорожка полосы к плашке (тон)', min: TONE, before: (t) => ratio(solid(t.opaqueControl!), plate(t)), after: (t) => ratio(solid(t.buttonFill!), plate(t)) },
  { element: 'Продолжить', what: 'заливка полосы к дорожке', min: GRAPHIC, before: (t) => ratio(solid(t.accentGraphic!), solid(t.opaqueControl!)), after: (t) => ratio(solid(t.accentGraphic!), solid(t.buttonFill!)) },
  { element: 'Продолжить', what: 'плашка на арте: подпись (белый арт)', min: TEXT, before: (t) => ratio(solid(t.text!), over(t.opaqueControl!, [255, 255, 255], 0.5)), after: (t) => ratio(solid(t.text!), over(t.opaqueControl!, [255, 255, 255], 0.9)) },
  { element: 'Продолжить', what: 'плашка на арте: подпись (чёрный арт)', min: TEXT, before: (t) => ratio(solid(t.text!), over(t.opaqueControl!, [0, 0, 0], 0.5)), after: (t) => ratio(solid(t.text!), over(t.opaqueControl!, [0, 0, 0], 0.9)) },
  // ── шторка голосового лимита
  { element: 'Шторка голоса', what: 'значок микрофона к плитке', min: GRAPHIC, before: (t) => ratio(solid(t.accent!), over(t.accentSoft!, solid(t.opaqueCard!))), after: (t) => ratio(solid(t.accentGraphic!), over(t.accentSoft!, solid(t.opaqueCard!))) },
  { element: 'Шторка голоса', what: 'пилюля счётчика к листу (тон)', min: TONE, before: (t) => ratio(solid(t.opaqueControl!), solid(t.opaqueCard!)), after: (t) => ratio(solid(t.buttonFill!), solid(t.opaqueCard!)) },
  { element: 'Шторка голоса', what: 'точки к пилюле', min: GRAPHIC, before: (t) => ratio(solid(t.accent!), solid(t.opaqueControl!)), after: (t) => ratio(solid(t.accentGraphic!), solid(t.buttonFill!)) },
  { element: 'Шторка голоса', what: 'главная кнопка к листу', min: GRAPHIC, after: (t) => ratio(solid(t.ctaFill!), solid(t.opaqueCard!)) },
  { element: 'Шторка голоса', what: 'подпись главной кнопки', min: TEXT, after: (t) => ratio(solid(t.ctaFillInk!), solid(t.ctaFill!)) },
  // ── поле пар Пика (плитки лежат на странице; обычная — opaqueCard с тенью nested, выбранная — accentGraphic 16 % поверх страницы)
  { element: 'Поле пар', what: 'подпись на обычной плитке', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.opaqueCard!)) },
  { element: 'Поле пар', what: 'подпись на выбранной плитке', min: TEXT, after: (t) => ratio(solid(t.text!), over(t.accentGraphic!, solid(t.bg!), 0.32)) },
  { element: 'Поле пар', what: 'подпись на плитке «неверно»', min: TEXT, after: (t) => ratio(solid(t.text!), over(t.bad!, solid(t.bg!), 0.12)) },
  { element: 'Поле пар', what: 'подпись на плитке «верно»', min: TEXT, after: (t) => ratio(solid(t.text!), over(t.good!, solid(t.bg!), 0.12)) },
  { element: 'Поле пар', what: 'выбранная к обычной плитке (тон)', min: TONE, before: (t) => ratio(over(t.accentGraphic!, solid(t.bg!), 0.16), solid(t.opaqueCard!)), after: (t) => ratio(over(t.accentGraphic!, solid(t.bg!), 0.32), solid(t.opaqueCard!)) },
  // ── плитки хаба Карточек (плашка с градиентом plateFillFrom→plateFillTo и тенью): число и название
  { element: 'Хаб Карточек: плитка', what: 'число/название к началу градиента', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.plateFillFrom!)) },
  { element: 'Хаб Карточек: плитка', what: 'число/название к концу градиента', min: TEXT, after: (t) => ratio(solid(t.text!), solid(t.plateFillTo!)) },
];

const INTENSITIES = [0, 0.25, 0.5, 0.75, 1];
type Cell = { min: number; at: string };

export function run() {
  const worstAfter = new Map<string, Map<string, Cell>>(); // тема → элемент|что → худшее
  let failsBefore = 0;
  let failsAfter = 0;
  const failList: string[] = [];
  for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
    for (const appearance of ['dark', 'light'] as const) {
      for (const intensity of INTENSITIES) {
        const t = liquidGlassTokens(id as never, { intensity, appearance } as never) as unknown as Tok;
        for (const p of PAIRS) {
          const key = `${p.element} | ${p.what}`;
          const a = p.after(t);
          const b = (p.before ?? p.after)(t);
          if (b < p.min) failsBefore += 1;
          if (a < p.min) { failsAfter += 1; failList.push(`${id}|${appearance}|${intensity} ${key}: ${a.toFixed(2)} < ${p.min}`); }
          const row = worstAfter.get(id) ?? new Map<string, Cell>();
          const prev = row.get(key);
          if (!prev || a < prev.min) row.set(key, { min: a, at: `${appearance}|${intensity}` });
          worstAfter.set(id, row);
        }
      }
    }
  }
  return { worstAfter, failsBefore, failsAfter, failList };
}

