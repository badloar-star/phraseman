// зачем (координатор 18.10): контраст и «кнопки не сливаются» для элементов, появившихся 18.10, во ВСЕХ 138 сочетаниях тем
// (23 темы × тёмная/светлая × насыщенность 0/0,5/1). Пороги правила владельца: текст ≥ 4,5, значок/графика/заливка кнопки ≥ 3, тон плашки ≥ 1,5.
// Поверхности и токены — как в коде (пути в подписях). Печатает таблицу худших значений; проверка — без провалов.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';

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
const ratio = (a: Rgb, b: Rgb) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

type T = Record<string, string>;
const pages = (t: T): Rgb[] => ['bg', 'bgTop', 'bgBottom'].map((k) => solid(t[k]!));
const plates = (t: T): Rgb[] => [solid(t.plateFillFrom!), solid(t.plateFillTo!)];
const worstOn = (fg: string, bases: Rgb[], alpha = 1) => Math.min(...bases.map((b) => ratio(over(fg, b, alpha), b)));
const toneOn = (fill: string, bases: Rgb[], alpha = 1) => Math.min(...bases.map((b) => ratio(over(fill, b, alpha), b)));

const TEXT = 4.5, GRAPHIC = 3, TONE = 1.5;
type Pair = { el: string; what: string; min: number; v: (t: T) => number };
const PAIRS: Pair[] = [
  { el: 'Премьера (YoutubePremiereHero)', what: 'строка состояния secondary к плашке', min: TEXT, v: (t) => worstOn(t.secondary!, plates(t)) },
  { el: 'Премьера', what: 'значок флажка secondary к плашке', min: GRAPHIC, v: (t) => worstOn(t.secondary!, plates(t)) },
  { el: 'Премьера', what: 'точка «в эфире» text к плашке', min: GRAPHIC, v: (t) => worstOn(t.text!, plates(t)) },
  { el: 'Премьера', what: 'кнопка «Смотреть/Напомнить» ctaFill к плашке', min: GRAPHIC, v: (t) => toneOn(t.ctaFill!, plates(t)) },
  { el: 'Премьера', what: 'подпись ctaFillInk на ctaFill', min: TEXT, v: (t) => ratio(solid(t.ctaFillInk!), solid(t.ctaFill!)) },
  { el: 'Премьера', what: '«Напомню» buttonFill к плашке (тон)', min: TONE, v: (t) => toneOn(t.buttonFill!, plates(t)) },
  { el: 'Премьера', what: '«Напомню» text на buttonFill', min: TEXT, v: (t) => Math.min(...plates(t).map((p) => { const f = over(t.buttonFill!, p); return ratio(over(t.text!, f), f); })) },
  { el: 'Видео-карточка (YoutubeVideoGridCard)', what: 'мета accentTextSafe к странице', min: TEXT, v: (t) => worstOn(t.accentTextSafe!, pages(t)) },
  { el: 'Видео-карточка', what: 'закладка: круг buttonFill к странице (тон)', min: TONE, v: (t) => toneOn(t.buttonFill!, pages(t)) },
  { el: 'Видео-карточка', what: 'закладка: значок text на круге', min: GRAPHIC, v: (t) => Math.min(...pages(t).map((p) => { const f = over(t.buttonFill!, p); return ratio(over(t.text!, f), f); })) },
  { el: 'Видео-карточка', what: 'закладка сохранена: ctaFill к странице', min: GRAPHIC, v: (t) => toneOn(t.ctaFill!, pages(t)) },
  { el: 'Видео-карточка', what: 'закладка сохранена: ctaFillInk на ctaFill', min: GRAPHIC, v: (t) => ratio(solid(t.ctaFillInk!), solid(t.ctaFill!)) },
  { el: '«Получить приз» без ключей (referrals)', what: 'заливка buttonFillDisabled к карточке (тон)', min: 1.05, v: (t) => toneOn(t.buttonFillDisabled!, [solid(t.opaqueCard!)]) },
  { el: '«Получить приз» без ключей', what: 'подпись buttonInkDisabled на заливке (неактивна, ≥ 3)', min: GRAPHIC, v: (t) => { const f = over(t.buttonFillDisabled!, solid(t.opaqueCard!)); return ratio(over(t.buttonInkDisabled!, f), f); } },
  { el: '«Сохранить» на карточке (FlashcardListItem)', what: 'круг buttonFill к карточке (тон)', min: TONE, v: (t) => toneOn(t.buttonFill!, [solid(t.opaqueCard!)]) },
  { el: '«Сохранить» на карточке', what: 'значок text / сохранённый accentGraphic на круге', min: GRAPHIC, v: (t) => { const f = over(t.buttonFill!, solid(t.opaqueCard!)); return Math.min(ratio(over(t.text!, f), f), ratio(over(t.accentGraphic!, f), f)); } },
  { el: '«Сохранить» в наборе из видео (VideoSetView)', what: 'круг buttonFill к плашке (тон)', min: TONE, v: (t) => toneOn(t.buttonFill!, plates(t)) },
  { el: '«Сохранить» в наборе из видео', what: 'значок text / сохранённый accentGraphic на круге', min: GRAPHIC, v: (t) => Math.min(...plates(t).flatMap((p) => { const f = over(t.buttonFill!, p); return [ratio(over(t.text!, f), f), ratio(over(t.accentGraphic!, f), f)]; })) },
  { el: 'Каркас «Настроек»', what: 'плашки plateFillFrom к фону (тон, каркас ≥ 1,05)', min: 1.05, v: (t) => toneOn(t.plateFillFrom!, [solid(t.bg!)]) },
  { el: 'Каркас «Настроек»', what: 'заголовок text к фону', min: TEXT, v: (t) => worstOn(t.text!, [solid(t.bg!)]) },
];

describe('[BLEND-1018B] новые элементы 18.10 — все 138 сочетаний', () => {
  const rows: string[] = [];
  const fails: string[] = [];
  for (const pair of PAIRS) {
    let worst = 99; let where = '';
    for (const appearance of ['dark', 'light'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) for (const intensity of [0, 0.5, 1]) {
      const t = liquidGlassTokens(id as never, { appearance, intensity } as never) as unknown as T;
      const v = pair.v(t);
      if (v < worst) { worst = v; where = `${id}@${intensity} ${appearance}`; }
      if (v < pair.min) fails.push(`${pair.el} · ${pair.what}: ${v.toFixed(2)} (${id}@${intensity} ${appearance})`);
    }
    rows.push(`${worst < pair.min ? '❌' : '✅'} ${pair.el} · ${pair.what} · худшее ${worst.toFixed(2)} (${where}) · порог ${pair.min}`);
  }
  it('таблица', () => {
    console.log(`[BLEND-1018B]\n${rows.join('\n')}\nпровалов: ${fails.length}`);
    expect(rows.length).toBe(PAIRS.length);
  });
  it('провалов нет', () => {
    const grouped = [...new Set(fails.map((f) => f.split(':')[0]))];
    expect(grouped).toEqual([]);
  });
});
