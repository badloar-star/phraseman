// зачем (координатор 18.10, «все ресурсы на авторизацию»): экраны входа и аккаунта — кнопки не сливаются, текст читается во ВСЕХ 138 сочетаниях
// тем (23 × тёмная/светлая × насыщенность 0/0,5/1). Пороги правила владельца: текст ≥ 4,5, значок/заливка кнопки ≥ 3, тон панели/вторичной кнопки ≥ 1,5.
// Поверхности: окно входа, удаление, выход — opaqueSheet; «Аккаунт» — фон экрана и плашка plateFillFrom; онбординг (вход/согласия) — bgTop/bg/bgBottom.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens, makeLiquidGlassTheme } from '../constants/liquidGlassThemePalette';
import { DARK } from '../constants/theme';
import { googleButtonVariantForSurface } from '../components/auth_google_button_style';
import { deleteButtonPaint } from '../components/account/delete_button_paint';

type Rgb = [number, number, number];
const parse = (c: string): { rgb: Rgb; a: number } => {
  const m = /^rgba?\(([^)]+)\)$/.exec(c.trim());
  if (m) { const p = m[1]!.split(',').map(Number); return { rgb: [p[0]!, p[1]!, p[2]!], a: p[3] ?? 1 }; }
  const h = c.replace('#', '');
  return { rgb: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb, a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
};
const over = (top: string, base: Rgb, alpha = 1): Rgb => { const t = parse(top); const a = t.a * alpha; return t.rgb.map((v, i) => v * a + base[i]! * (1 - a)) as Rgb; };
const solid = (c: string): Rgb => over(c, [0, 0, 0]);
const lum = (c: Rgb) => { const v = c.map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!; };
const R = (a: Rgb, b: Rgb) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

type T = Record<string, string>;
type Ctx = { g: T; t: T };
const sheet = (c: Ctx): Rgb => solid(c.g.opaqueSheet!);
const pages = (c: Ctx): Rgb[] => ['bg', 'bgTop', 'bgBottom'].map((k) => solid(c.g[k]!));
const plate = (c: Ctx): Rgb => solid(c.g.plateFillFrom!);
const onFill = (fg: string, fill: string, base: Rgb) => { const f = over(fill, base); return R(over(fg, f), f); };
const brand = (variant: 'light' | 'dark') => (variant === 'dark' ? { bg: '#1F1F1F', fg: '#FFFFFF' } : { bg: '#FFFFFF', fg: '#1F1F1F' }); // как в AuthProviderButtons (бренд Google)

const TEXT = 4.5, GRAPHIC = 3, TONE = 1.5;
type Pair = { el: string; what: string; min: number; v: (c: Ctx) => number };
const PAIRS: Pair[] = [
  // окно входа (RegistrationPromptModal), шторка opaqueSheet
  { el: 'Вход: кнопка Google (окно входа)', what: 'заливка к шторке', min: GRAPHIC, v: (c) => { const s = sheet(c); const b = brand(googleButtonVariantForSurface(c.g.opaqueSheet!)); return R(solid(b.bg), s); } },
  { el: 'Вход: кнопка Google', what: 'подпись и спиннер на заливке', min: TEXT, v: (c) => { const b = brand(googleButtonVariantForSurface(c.g.opaqueSheet!)); return R(solid(b.fg), solid(b.bg)); } },
  { el: 'Вход: кнопка Apple (окно входа)', what: 'заливка к шторке', min: GRAPHIC, v: (c) => R(solid(c.g.isLight ? '#000000' : '#FFFFFF'), sheet(c)) },
  { el: 'Вход: главные кнопки (восстановление, «Позже»)', what: 'заливка ctaFill к шторке', min: GRAPHIC, v: (c) => R(over(c.g.ctaFill!, sheet(c)), sheet(c)) },
  { el: 'Вход: главные кнопки', what: 'подпись ctaFillInk на ctaFill', min: TEXT, v: (c) => onFill(c.g.ctaFillInk!, c.g.ctaFill!, sheet(c)) },
  // панель восстановления — контейнер opaqueControl (стиль «Тень»: отделяется тенью, не тоном); на ней читаются красный и серый текст
  { el: 'Вход: текст на панели восстановления', what: 'secondary на opaqueControl', min: TEXT, v: (c) => onFill(c.g.secondary!, c.g.opaqueControl!, sheet(c)) },
  { el: 'Вход: текст ошибки', what: 'bad к шторке и к панели opaqueControl', min: TEXT, v: (c) => Math.min(R(solid(c.g.bad!), sheet(c)), onFill(c.g.bad!, c.g.opaqueControl!, sheet(c))) },
  { el: 'Вход: подписи caption (щит, разделитель)', what: 'secondary к шторке', min: TEXT, v: (c) => R(solid(c.g.secondary!), sheet(c)) },
  { el: 'Вход: заголовок и текст', what: 'text / secondary к шторке', min: TEXT, v: (c) => Math.min(R(solid(c.g.text!), sheet(c)), R(solid(c.g.secondary!), sheet(c))) },
  // онбординг: вход и согласия (CleanOnboarding), фон bgTop/bg/bgBottom
  { el: 'Онбординг: кнопка Google', what: 'заливка к фону', min: GRAPHIC, v: (c) => Math.min(...pages(c).map((p) => R(solid(brand(googleButtonVariantForSurface(c.g.bg!)).bg), p))) },
  { el: 'Онбординг: кнопка Apple', what: 'заливка к фону', min: GRAPHIC, v: (c) => Math.min(...pages(c).map((p) => R(solid(c.g.isLight ? '#000000' : '#FFFFFF'), p))) },
  // «Аккаунт» (account_details): фон экрана, плашка
  { el: 'Аккаунт: кнопки-чипы на плашке', what: 'тон buttonFill к плашке', min: TONE, v: (c) => R(over(c.g.buttonFill!, plate(c)), plate(c)) },
  { el: 'Аккаунт: кнопки-чипы', what: 'подпись text на buttonFill', min: TEXT, v: (c) => onFill(c.g.text!, c.g.buttonFill!, plate(c)) },
  { el: 'Аккаунт: строка «Удалить аккаунт»', what: 'bad к плашке', min: TEXT, v: (c) => R(solid(c.g.bad!), plate(c)) },
  // выход (AccountLogoutFlow) и удаление (DeleteAccountConfirmModal), шторка opaqueSheet
  { el: 'Выход/удаление: «Отмена»', what: 'тон buttonFill к шторке', min: TONE, v: (c) => R(over(c.g.buttonFill!, sheet(c)), sheet(c)) },
  { el: 'Выход: главная кнопка', what: 'заливка ctaFill к шторке / подпись', min: GRAPHIC, v: (c) => Math.min(R(over(c.g.ctaFill!, sheet(c)), sheet(c)), onFill(c.g.ctaFillInk!, c.g.ctaFill!, sheet(c)) / 1.5) },
  // удаление: координатор 18.10, вариант (а) — сплошная красная кнопка, подпись по контрасту; «Отмена» — buttonFill
  { el: 'Удаление: «Удалить» (слово введено)', what: 'заливка bad к шторке', min: GRAPHIC, v: (c) => R(solid(deleteButtonPaint(c.g as never, true).fill), sheet(c)) },
  { el: 'Удаление: «Удалить» (слово введено)', what: 'подпись и спиннер на заливке', min: TEXT, v: (c) => { const p = deleteButtonPaint(c.g as never, true); return R(solid(p.ink), solid(p.fill)); } },
  { el: 'Удаление: «Удалить» (до ввода слова)', what: 'подпись неактивной кнопки на заливке (≥ 3)', min: GRAPHIC, v: (c) => { const p = deleteButtonPaint(c.g as never, false); return onFill(p.ink, p.fill, sheet(c)); } },
  { el: 'Удаление: «Отмена»', what: 'тон buttonFill к шторке', min: TONE, v: (c) => R(over(c.g.buttonFill!, sheet(c)), sheet(c)) },
];
const INFO: Pair[] = [];

describe('[BLEND-AUTH] экраны входа и аккаунта — все 138 сочетаний', () => {
  const rows: string[] = [];
  const fails: string[] = [];
  for (const pair of [...PAIRS, ...INFO]) {
    let worst = 99; let where = '';
    for (const appearance of ['dark', 'light'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) for (const intensity of [0, 0.5, 1]) {
      const variant = { appearance, intensity } as never;
      const g = liquidGlassTokens(id as never, variant) as unknown as T;
      const t = makeLiquidGlassTheme(id as never, DARK as never, variant) as unknown as T;
      const v = pair.v({ g, t });
      if (v < worst) { worst = v; where = `${id}@${intensity} ${appearance}`; }
      if (v < pair.min && !pair.el.startsWith('ℹ')) fails.push(`${pair.el} · ${pair.what}`);
    }
    rows.push(`${worst < pair.min ? '❌' : '✅'} ${pair.el} · ${pair.what} · худшее ${worst.toFixed(2)} (${where}) · порог ${pair.min}`);
  }
  it('таблица', () => {
    console.log(`[BLEND-AUTH]\n${rows.join('\n')}`);
    expect(rows.length).toBe(PAIRS.length + INFO.length);
  });
  it('провалов нет', () => {
    expect([...new Set(fails)]).toEqual([]);
  });
});
