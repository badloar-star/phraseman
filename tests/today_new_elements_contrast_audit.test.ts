// зачем (координатор 17.10, правило владельца «ни одна кнопка нигде не сливается», все 23 темы × свет/тьма × 5 ползунков): аудит новинок дня по токенам.
// Элементы: шторка голосового лимита (LearningV2VoiceHeadsupSheet), карточка «Продолжить» на Главной (HomeV2ContinueCard),
// кнопка «назад» на «Сегодня», кнопка «Классический курс» на карте V2. Кольца и монета «Сегодня» уже считает moments_contrast_all_themes.
// Единое правило: тоновая пара кнопка/плашка ≥ 1,5:1, графика (значок, точки, полоса) ≥ 3:1, основная кнопка к фону ≥ 3:1, подпись ≥ 4,5:1.
// Плашки-контейнеры без заливки-кнопки (сама карточка «Продолжить», лист шторки) отделены тенью — их тон к фону сюда не входит.
// AUDIT_PRINT=1 печатает худшие значения.
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
/** top (с альфой, возможно) поверх base → сплошной rgb. */
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

type Pair = Readonly<{ element: string; what: string; min: number; get: (t: Tok) => number }>;
const PAIRS: readonly Pair[] = [
  // ── шторка голосового лимита (лист = opaqueCard под скримом rgba(0,0,0,.42) поверх страницы)
  { element: 'шторка голоса', what: 'заголовок к листу', min: TEXT, get: (t) => ratio(solid(t.text!), solid(t.opaqueCard!)) },
  { element: 'шторка голоса', what: 'текст (secondary) к листу', min: TEXT, get: (t) => ratio(solid(t.secondary!), solid(t.opaqueCard!)) },
  { element: 'шторка голоса', what: 'значок микрофона к плитке', min: GRAPHIC, get: (t) => ratio(solid(t.accentGraphic!), over(t.accentSoft!, solid(t.opaqueCard!))) },
  { element: 'шторка голоса', what: 'счётчик-пилюля к листу (тон)', min: TONE, get: (t) => ratio(solid(t.buttonFill!), solid(t.opaqueCard!)) },
  { element: 'шторка голоса', what: 'подпись счётчика к пилюле', min: TEXT, get: (t) => ratio(solid(t.text!), solid(t.buttonFill!)) },
  { element: 'шторка голоса', what: 'точки (акцент) к пилюле', min: GRAPHIC, get: (t) => ratio(solid(t.accentGraphic!), solid(t.buttonFill!)) },
  { element: 'шторка голоса', what: 'бейдж числа: подпись к акценту', min: TEXT, get: (t) => ratio(solid(t.ctaFillInk!), solid(t.ctaFill!)) },
  { element: 'шторка голоса', what: 'бейдж числа: акцент к листу', min: GRAPHIC, get: (t) => ratio(solid(t.ctaFill!), solid(t.opaqueCard!)) },
  { element: 'шторка голоса', what: 'главная кнопка к листу', min: GRAPHIC, get: (t) => ratio(solid(t.ctaFill!), solid(t.opaqueCard!)) },
  { element: 'шторка голоса', what: 'подпись главной кнопки', min: TEXT, get: (t) => ratio(solid(t.ctaFillInk!), solid(t.ctaFill!)) },
  { element: 'шторка голоса', what: 'тихая кнопка «Начать» к листу', min: TEXT, get: (t) => ratio(solid(t.secondary!), solid(t.opaqueCard!)) },
  // ── карточка «Продолжить» (плашка = plateFillFrom с альфой 0,5 поверх страницы)
  { element: 'карточка «Продолжить»', what: 'название к плашке', min: TEXT, get: (t) => ratio(solid(t.text!), over(t.plateFillFrom!, solid(t.bg!), 0.5)) },
  { element: 'карточка «Продолжить»', what: 'счётчик x / N к плашке', min: TEXT, get: (t) => ratio(solid(t.secondary!), over(t.plateFillFrom!, solid(t.bg!), 0.5)) },
  { element: 'карточка «Продолжить»', what: 'дорожка полосы к плашке (тон)', min: TONE, get: (t) => ratio(solid(t.buttonFill!), over(t.plateFillFrom!, solid(t.bg!), 0.5)) },
  { element: 'карточка «Продолжить»', what: 'заливка полосы к дорожке', min: GRAPHIC, get: (t) => ratio(solid(t.accentGraphic!), solid(t.buttonFill!)) },
  { element: 'карточка «Продолжить»', what: 'круглая стрелка к плашке (тон)', min: TONE, get: (t) => ratio(over(t.buttonFill!, over(t.plateFillFrom!, solid(t.bg!), 0.5), 0.9), over(t.plateFillFrom!, solid(t.bg!), 0.5)) },
  { element: 'карточка «Продолжить»', what: 'значок стрелки к кружку', min: GRAPHIC, get: (t) => ratio(solid(t.text!), over(t.buttonFill!, over(t.plateFillFrom!, solid(t.bg!), 0.5), 0.9)) },
  // плашка номера урока лежит на арте (картинка): худший случай — белая или чёрная подложка арта, подпись должна читаться на обеих
  { element: 'карточка «Продолжить»', what: 'плашка на арте: подпись, подложка белая', min: TEXT, get: (t) => ratio(solid(t.text!), over(t.opaqueControl!, [255, 255, 255], 0.9)) },
  { element: 'карточка «Продолжить»', what: 'плашка на арте: подпись, подложка чёрная', min: TEXT, get: (t) => ratio(solid(t.text!), over(t.opaqueControl!, [0, 0, 0], 0.9)) },
  // ── «Сегодня»: круглая кнопка «назад» и «Классический курс»
  { element: '«Сегодня»: назад', what: 'круг к странице (тон)', min: TONE, get: (t) => ratio(solid(t.buttonFill!), solid(t.bg!)) },
  { element: '«Сегодня»: назад', what: 'стрелка к кругу', min: GRAPHIC, get: (t) => ratio(solid(t.text!), solid(t.buttonFill!)) },
  { element: '«Классический курс»', what: 'кнопка к странице (тон)', min: TONE, get: (t) => ratio(solid(t.buttonFill!), solid(t.bg!)) },
  { element: '«Классический курс»', what: 'подпись к кнопке', min: TEXT, get: (t) => ratio(solid(t.text!), solid(t.buttonFill!)) },
];

describe('контраст новинок дня (шторка голоса, «Продолжить», «Сегодня», «Классический курс») по токенам всех тем', () => {
  const worst = new Map<string, { value: number; at: string; min: number }>();
  const bad = new Map<string, string>();
  for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
    for (const appearance of ['dark', 'light'] as const) {
      for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
        const t = liquidGlassTokens(id as never, { intensity, appearance } as never) as unknown as Tok;
        for (const p of PAIRS) {
          const v = p.get(t);
          const key = `${p.element} | ${p.what}`;
          const prev = worst.get(key);
          if (!prev || v < prev.value) worst.set(key, { value: v, at: `${id}|${appearance}|${intensity}`, min: p.min });
          if (v < p.min && !bad.has(key)) bad.set(key, `${id}|${appearance}|${intensity} ${key}: ${v.toFixed(2)} < ${p.min}`);
        }
      }
    }
  }
  it('печать худших значений', () => {
    if (process.env.AUDIT_PRINT === '1') {
      // eslint-disable-next-line no-console
      console.log('AUDIT-TABLE\n' + [...worst.entries()].map(([k, w]) => `${k} :: худшее ${w.value.toFixed(2)} (порог ${w.min}) при ${w.at}`).join('\n'));
    }
    expect(worst.size).toBe(PAIRS.length);
  });
  it('нарушений нет', () => {
    expect([...bad.values()]).toEqual([]);
  });
});
