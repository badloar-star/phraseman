// зачем (координатор 14.10, закон владельца «кнопки не сливаются»): моменты v3 (рубежи серии, кольца «Сегодня», m01–m03 Пика, сторис, «С возвращением»)
// красятся токенами ТЕКУЩЕЙ темы, поэтому по токенам считаем во всех 23 темах × светлое/тёмное × 5 шагов ползунка:
//  • текст на фоне экрана момента (градиент bgTop → bg → bgBottom) и на плашке карточки: основной, вторичный и цвет оверлайна ≥ 4,5 : 1;
//  • главная кнопка: подпись ctaFillInk на ctaFill ≥ 4,5, заливка отличима от фона (≥ 1,5) и от вторичной (≥ 1,3);
//  • вторичная: подпись text на buttonFill ≥ 4,5, сама отличима от фона/карточки (≥ 1,5) — «вторичная ≠ фон»;
//  • отключённая: подпись ≥ 4,5 к своей заливке и заливка отличима от активной вторичной (≥ 1,08);
//  • графика (кольца, дуги месяцев, кольцо огня): цвет акцента ≥ 3 : 1 к фону и к карточке.
// Красное чинится в токенах (constants/liquidGlassButtonTokens.ts и палитра), чужие компоненты — в список координатору.
import fs from 'node:fs';
import path from 'node:path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';

type Tok = Record<string, string>;
const rgb = (hex: string): number[] => { const h = hex.replace('#', '').slice(0, 6); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lum = (hex: string): number => {
  const c = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

const SCREEN = ['bgTop', 'bg', 'bgBottom'] as const;
const PLATES = ['opaqueCard'] as const;

function check(): string[] {
  const bad: string[] = [];
  const need = (at: string, what: string, value: number, min: number) => { if (value < min) bad.push(`${at} ${what}: ${value.toFixed(2)} < ${min}`); };
  for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
    for (const appearance of ['dark', 'light'] as const) {
      for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
        const t = liquidGlassTokens(id, { intensity, appearance } as never) as unknown as Tok;
        const at = `${id}|${appearance}|${intensity}`;
        for (const s of [...SCREEN, ...PLATES]) {
          need(at, `текст на ${s}`, ratio(t.text!, t[s]!), 4.5);
          need(at, `вторичный текст на ${s}`, ratio(t.secondary!, t[s]!), 4.5);
        }
        const overline = t.level === 'calm' ? t.text! : t.accentText!;
        for (const s of SCREEN) need(at, `оверлайн на ${s}`, ratio(overline, t[s]!), 4.5);
        // главная
        need(at, 'подпись главной', ratio(t.ctaFillInk!, t.ctaFill!), 4.5);
        for (const s of [...SCREEN, ...PLATES]) need(at, `главная → ${s}`, ratio(t.ctaFill!, t[s]!), 1.5);
        need(at, 'главная ≠ вторичная', ratio(t.ctaFill!, t.buttonFill!), 1.3);
        // вторичная
        need(at, 'подпись вторичной', ratio(t.text!, t.buttonFill!), 4.5);
        for (const s of [...SCREEN, ...PLATES]) need(at, `вторичная → ${s}`, ratio(t.buttonFill!, t[s]!), 1.5);
        // отключённая
        need(at, 'подпись отключённой', ratio(t.buttonInkDisabled!, t.buttonFillDisabled!), 4.5);
        need(at, 'отключённая ≠ вторичная', ratio(t.buttonFillDisabled!, t.buttonFill!), 1.08);
        // графика
        const graphic = t.accentGraphic ?? t.accent!;
        for (const s of ['bg', 'opaqueCard'] as const) need(at, `графика акцента на ${s}`, ratio(graphic, t[s]!), 3);
      }
    }
  }
  return bad;
}

describe('моменты v3 × все темы: контраст и «кнопки не сливаются»', () => {
  it('текст, кнопки (главная, вторичная, отключённая) и графика проходят пороги во всех темах и шагах', () => {
    expect((LIQUID_GLASS_THEME_IDS as readonly string[]).length).toBe(23); // не пустая проверка: все 23 темы × 2 оформления × 5 шагов
    const bad = check();
    expect(bad.slice(0, 40)).toEqual([]);
  });

  it('моменты красятся токенами темы: в исходниках моментов нет «голых» цветов вне пометки theme-exempt', () => {
    const dirs = ['components/streak/moments', 'components/spire/moments', 'components/coin_rank_moments', 'components/stories', 'components/moments'];
    // иллюстрации, не токены темы — по решению владельца/смежных сессий (причина обязательна)
    const ILLUSTRATION: Readonly<Record<string, string>> = {
      'components/moments/MomentCoin.tsx': 'металл монеты, корона, блик и тень — иллюстрация, одинаковая во всех темах (Авторизация 14.10)',
      'components/stories/StoryRing.tsx': 'красное кольцо вокруг аватара — решение владельца (s1 «Главная: красное кольцо»), не цвет темы',
    };
    const raw: string[] = [];
    for (const d of dirs) {
      const abs = path.join(__dirname, '..', d);
      if (!fs.existsSync(abs)) continue;
      for (const f of fs.readdirSync(abs).filter((x) => /\.(ts|tsx)$/.test(x) && !ILLUSTRATION[`${d}/${x}`])) {
        const lines = fs.readFileSync(path.join(abs, f), 'utf8').split(String.fromCharCode(10));
        lines.forEach((l, i) => { if (/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(l) && !/theme-exempt|^\s*\/\//.test(l)) raw.push(`${d}/${f}:${i + 1}`); });
      }
    }
    expect(raw).toEqual([]);
  });
});
