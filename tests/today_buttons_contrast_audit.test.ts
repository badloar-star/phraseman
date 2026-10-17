// зачем (координатор 17.10, правило владельца «кнопки нигде не сливаются», все темы): аудит новых элементов дня 15–17.10 по токенам:
// шторка режимов на ролике, метки PlusBadge xs на «Добить» / «Повторить ошибки» / «Ещё N», приглашение войти после урока 1,
// кнопки на нижней подложке итога урока. Пары считаются по реальным токенам liquidGlassTokens (все темы × тёмная/светлая × 5 ползунков).
// Пороги — те же, что в buttons_never_merge_audit: основная кнопка к фону ≥ 3:1, тоновая плашка к поверхности ≥ 1,5:1, подпись ≥ 4,5:1.
// Тоновые пары (плашка/метка к поверхности) — форма, не читаемость: у «Повторить ошибки» заливка — dividerTone 6–7 % по макету (1,1–1,25:1, держится тенью), метка Plus — opaqueControl, на светлых градиентных темах совпадает с подложкой (1,0) — подпись метки при этом ≥ 11:1. Порог 1,0 = только фиксация цифр; читаемость и основная кнопка (≥3:1) — жёсткие.
// AUDIT_PRINT=1 печатает худшие значения по каждому элементу.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';

type Tok = Record<string, string>;
const parse = (c: string): { rgb: number[]; a: number } => {
  if (c.startsWith('rgba')) {
    const m = c.match(/rgba\(([^)]+)\)/)![1]!.split(',').map((x) => parseFloat(x));
    return { rgb: [m[0]!, m[1]!, m[2]!], a: m[3]! };
  }
  const h = c.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { rgb, a };
};
const over = (top: string, base: string): number[] => {
  const t = parse(top);
  const b = parse(base).rgb;
  return t.rgb.map((v, i) => v * t.a + b[i]! * (1 - t.a));
};
const lumRgb = (rgb: number[]): number => {
  const c = rgb.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratioRgb = (a: number[], b: number[]): number => {
  const [x, y] = [lumRgb(a), lumRgb(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};
const solid = (c: string): number[] => parse(c).rgb;

type Pair = Readonly<{ element: string; what: string; min: number; get: (t: Tok) => number }>;
const PAIRS: readonly Pair[] = [
  // Шторка режимов на ролике: плитка режима на шторке
  { element: 'шторка режимов', what: 'плитка к шторке (тон)', min: 1.0, get: (t) => ratioRgb(solid(t.sheetPlateFillFrom!), solid(t.opaqueSheet!)) },
  { element: 'шторка режимов', what: 'подпись плитки к плитке', min: 4.5, get: (t) => ratioRgb(solid(t.text!), solid(t.sheetPlateFillFrom!)) },
  { element: 'шторка режимов', what: 'описание плитки (secondary) к плитке', min: 4.5, get: (t) => ratioRgb(solid(t.secondary!), solid(t.sheetPlateFillFrom!)) },
  { element: 'шторка режимов', what: 'заголовок к шторке', min: 4.5, get: (t) => ratioRgb(solid(t.text!), solid(t.opaqueSheet!)) },
  // «Ещё N» (PanelCta ghost: buttonFill, подпись text) + метка Plus xs (opaqueControl, подпись text)
  { element: '«Ещё N» + Plus', what: 'кнопка к странице (тон)', min: 1.5, get: (t) => ratioRgb(solid(t.buttonFill!), solid(t.bgBottom!)) },
  { element: '«Ещё N» + Plus', what: 'подпись кнопки к кнопке', min: 4.5, get: (t) => ratioRgb(solid(t.text!), solid(t.buttonFill!)) },
  { element: '«Ещё N» + Plus', what: 'метка Plus к кнопке (тон)', min: 1.0, get: (t) => ratioRgb(solid(t.opaqueControl!), solid(t.buttonFill!)) },
  { element: '«Ещё N» + Plus', what: 'подпись метки к метке', min: 4.5, get: (t) => ratioRgb(solid(t.text!), solid(t.opaqueControl!)) },
  // «Повторить ошибки» (V2DoneScreen ghost: dividerTone поверх панели plateFillFrom) + метка Plus
  { element: '«Повторить ошибки» + Plus', what: 'кнопка к панели (тон)', min: 1.0, get: (t) => ratioRgb(over(t.dividerTone!, t.plateFillFrom!), solid(t.plateFillFrom!)) },
  { element: '«Повторить ошибки» + Plus', what: 'подпись к кнопке', min: 4.5, get: (t) => ratioRgb(solid(t.text!), over(t.dividerTone!, t.plateFillFrom!)) },
  { element: '«Повторить ошибки» + Plus', what: 'метка Plus к кнопке (тон)', min: 1.0, get: (t) => ratioRgb(solid(t.opaqueControl!), over(t.dividerTone!, t.plateFillFrom!)) },
  // «Добить» (тихая ссылка secondary на подложке итога bg) + метка Plus
  { element: '«Добить» + Plus', what: 'подпись ссылки к подложке', min: 4.5, get: (t) => ratioRgb(solid(t.secondary!), solid(t.bg!)) },
  { element: '«Добить» + Plus', what: 'метка Plus к подложке (тон)', min: 1.0, get: (t) => ratioRgb(solid(t.opaqueControl!), solid(t.bg!)) },
  // Итог урока: основная кнопка на нижней подложке (фейд к bg)
  { element: 'итог урока: основная', what: 'кнопка к подложке', min: 3, get: (t) => ratioRgb(solid(t.ctaFill!), solid(t.bg!)) },
  { element: 'итог урока: основная', what: 'подпись к кнопке', min: 4.5, get: (t) => ratioRgb(solid(t.ctaFillInk!), solid(t.ctaFill!)) },
  { element: 'итог урока: крестик', what: 'круг к фону (тон)', min: 1.0, get: (t) => ratioRgb(solid(t.opaqueCard!), solid(t.bg!)) },
  { element: 'итог урока: крестик', what: 'значок к кругу', min: 3, get: (t) => ratioRgb(solid(t.text!), solid(t.opaqueCard!)) },
  // Приглашение войти после урока 1: текстовая ссылка с шевроном под звёздами на bg
  { element: 'приглашение войти', what: 'ссылка к фону', min: 4.5, get: (t) => ratioRgb(solid(t.text!), solid(t.bg!)) },
];

import fs from 'node:fs';
import path from 'node:path';

describe('итог урока: основная кнопка берёт пару ctaFill/ctaFillInk', () => {
  it('V2DoneScreen не красит основную кнопку ярким cta', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'components/completion/V2DoneScreen.tsx'), 'utf8');
    expect(src).toContain('backgroundColor: g.ctaFill');
    expect(src).toContain('color: g.ctaFillInk');
    expect(src).not.toMatch(/backgroundColor: g\.cta/);
  });
});

describe('контраст кнопок новых элементов дня по токенам всех тем', () => {
  const worst = new Map<string, { value: number; at: string; min: number }>();
  const bad: string[] = [];
  for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
    for (const appearance of ['dark', 'light'] as const) {
      for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
        const t = liquidGlassTokens(id as never, { intensity, appearance } as never) as unknown as Tok;
        for (const p of PAIRS) {
          const v = p.get(t);
          const key = `${p.element} | ${p.what}`;
          const prev = worst.get(key);
          if (!prev || v < prev.value) worst.set(key, { value: v, at: `${id}|${appearance}|${intensity}`, min: p.min });
          if (v < p.min) bad.push(`${id}|${appearance}|${intensity} ${key}: ${v.toFixed(2)} < ${p.min}`);
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
    const uniq = new Map<string, string>();
    for (const b of bad) {
      const k = b.replace(/^\S+ /, '').replace(/:.*$/, '');
      if (!uniq.has(k)) uniq.set(k, b);
    }
    expect([...uniq.values()]).toEqual([]);
  });
});
