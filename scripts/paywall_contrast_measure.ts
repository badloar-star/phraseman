// Запуск: npx tsx scripts/paywall_contrast_measure.ts > out.md
// зачем (координатор 25.10): Макеты делают контекстные пейволы по docs/work/research/paywall-research-2026-10-25.md — карта
// токенов пейвола готовится заранее и проверяется во ВСЕХ темах. Поверхности — те же, что у текущего PaywallPlus:
// лист paywallSheetBg, плашки планов paywallPlateBg, выбранный план planRowSelectedPaint (градиент с доводкой подписей).
// Правило сторов (исследование, раздел 5): сумма списания не тише триала — поэтому она в карте обычным текстом, не приглушённым.
// Порог: текст 4,5, графика (рамка выбранного плана, точки таймлайна, кнопка на листе) 3,0.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import * as fs from 'fs';
import * as path from 'path';
import { legibleOn } from '../constants/liquidGlassSurfaceRoles';

// зачем: модули поверхностей пейвола по цепочке тянут React Native (ShadowSurface.tsx) и в Node не грузятся. Здесь — их точная
// копия; ниже скрипт сверяет копию с исходником и падает, если исходник изменился (тогда обновить копию, а не верить старым цифрам).
const SRC = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const MUST: [string, string][] = [
  ['components/paywall/paywall_surfaces.ts', 'export function paywallSheetBg(g: GlassTokens): string { return g.opaqueSheet; }'],
  ['components/paywall/paywall_surfaces.ts', 'export function paywallPlateBg(g: GlassTokens): string { return g.isLight ? g.opaqueControl : shadowSheetPlateTokens(g).plateFillFrom; }'],
  ['components/v2/shadow_sheet_paint.ts', 'return sheetPlateTokens(g);'],
  ['components/v2/ShadowSurface.tsx', 'plateFillFrom: g.sheetPlateFillFrom'],
  ['components/paywall/paywallPlanRowPaint.ts', 'const gradient: readonly [string, string] = [alpha(g.accent, 0.3), alpha(plate, 0.9)];'],
  ['components/paywall/paywallPlanRowPaint.ts', "const toward = g.isLight ? g.text : '#FFFFFF';"],
  ['components/paywall/paywallPlanRowPaint.ts', 'trialInk: legibleOn(g.accentTextSafe, toward, backgrounds, 4.55),'],
];
for (const [file, line] of MUST) if (!SRC(file).includes(line)) throw new Error(`исходник пейвола изменился: в ${file} нет «${line}» — обнови копию в этом скрипте`);
const alpha = (hex: string, value: number): string => `${hex.slice(0, 7)}${Math.round(value * 255).toString(16).padStart(2, '0')}`;
const paywallSheetBg = (g: G): string => g.opaqueSheet;
const paywallPlateBg = (g: G): string => (g.isLight ? g.opaqueControl : g.sheetPlateFillFrom);
function planRowSelectedPaint(g: G) {
  const plate = paywallPlateBg(g);
  const gradient: readonly [string, string] = [alpha(g.accent, 0.3), alpha(plate, 0.9)];
  const backgrounds = [plate, ...gradient.map((stop) => flattenOver(stop, plate))];
  const toward = g.isLight ? g.text : '#FFFFFF'; // theme-exempt: крайняя точка доводки подписи в тёмном (как в paywallPlanRowPaint.ts)
  return { backgrounds, ink: legibleOn(g.text, toward, backgrounds, 4.55), trialInk: legibleOn(g.accentTextSafe, toward, backgrounds, 4.55), mutedInk: legibleOn(g.mutedText, toward, backgrounds, 4.55) };
}
// золото бейджа скидки — копия PAYWALL_SAVINGS_GOLD / _INK из components/paywall/PaywallPlanRows.tsx (тот файл тянет React Native)
const PAYWALL_SAVINGS_GOLD = '#FFD27A'; // theme-exempt: смысловое золото бейджа скидки
const PAYWALL_SAVINGS_GOLD_INK = '#3A2700'; // theme-exempt: чернила бейджа на золоте

type G = ReturnType<typeof liquidGlassTokens>;
type Pair = { fg: string; bgs: string[] };
type Role = { id: string; what: string; fg: string; bg: string; min: 4.5 | 3; pair: (g: G) => Pair };
const sheet = (g: G): string => flattenOver(paywallSheetBg(g), flattenOver(g.bg, '#000000'));
const plate = (g: G): string => flattenOver(paywallPlateBg(g), sheet(g));
const sel = (g: G): string[] => planRowSelectedPaint(g).backgrounds.map((b) => flattenOver(b, sheet(g)));
const on = (fg: string, bgs: string[]): Pair => ({ fg, bgs });
const ROLES: Role[] = [
  { id: 'P1', what: 'Заголовок пейвола', fg: 'text', bg: 'лист', min: 4.5, pair: (g) => on(g.text, [sheet(g)]) },
  { id: 'P2', what: 'Подзаголовок и строки «что даёт Plus»', fg: 'secondary', bg: 'лист', min: 4.5, pair: (g) => on(g.secondary, [sheet(g)]) },
  { id: 'P3', what: 'Цена плана (невыбранный план)', fg: 'text', bg: 'плашка', min: 4.5, pair: (g) => on(g.text, [plate(g)]) },
  { id: 'P4', what: 'Сумма списания «1 490 ₽ в год» (невыбранный)', fg: 'text', bg: 'плашка', min: 4.5, pair: (g) => on(g.text, [plate(g)]) },
  { id: 'P5', what: 'Пересчёт «≈ 29 ₽ в неделю», мелко', fg: 'mutedText', bg: 'плашка', min: 4.5, pair: (g) => on(g.mutedText, [plate(g)]) },
  { id: 'P6', what: 'Предвыбранный план: цена и сумма списания', fg: 'planRowSelectedPaint.ink', bg: 'выбранный план (все точки градиента)', min: 4.5, pair: (g) => on(planRowSelectedPaint(g).ink, sel(g)) },
  { id: 'P7', what: 'Предвыбранный план: строка триала «7 дней бесплатно»', fg: 'planRowSelectedPaint.trialInk', bg: 'выбранный план', min: 4.5, pair: (g) => on(planRowSelectedPaint(g).trialInk, sel(g)) },
  { id: 'P8', what: 'Предвыбранный план: пересчёт в неделю', fg: 'planRowSelectedPaint.mutedInk', bg: 'выбранный план', min: 4.5, pair: (g) => on(planRowSelectedPaint(g).mutedInk, sel(g)) },
  { id: 'P9', what: 'Предвыбранный план: рамка-подсветка к плашке', fg: 'accentGraphic', bg: 'плашка', min: 3, pair: (g) => on(g.accentGraphic, [plate(g)]) },
  { id: 'P10', what: 'Предвыбранный план: галочка выбора (цвет подписи плана; accentGraphic здесь даёт 2,80)', fg: 'planRowSelectedPaint.ink', bg: 'выбранный план', min: 3, pair: (g) => on(planRowSelectedPaint(g).ink, sel(g)) },
  { id: 'P11', what: 'Бейдж «−40 %» (смысловое золото, вне темы)', fg: 'PAYWALL_SAVINGS_GOLD_INK', bg: 'PAYWALL_SAVINGS_GOLD', min: 4.5, pair: () => on(PAYWALL_SAVINGS_GOLD_INK, [PAYWALL_SAVINGS_GOLD]) },
  { id: 'P12', what: 'Кнопка покупки: подпись', fg: 'ctaFillInk', bg: 'ctaFill', min: 4.5, pair: (g) => on(g.ctaFillInk, [g.ctaFill]) },
  { id: 'P13', what: 'Кнопка покупки на листе (видна как кнопка)', fg: 'ctaFill', bg: 'лист', min: 3, pair: (g) => on(g.ctaFill, [sheet(g)]) },
  { id: 'P14', what: 'Кнопка во время покупки (неактивна)', fg: 'buttonInkDisabled', bg: 'buttonFillDisabled', min: 4.5, pair: (g) => on(g.buttonInkDisabled, [g.buttonFillDisabled]) },
  { id: 'P15', what: '«Не сейчас»', fg: 'secondary', bg: 'лист', min: 4.5, pair: (g) => on(g.secondary, [sheet(g)]) },
  { id: 'P16', what: '«Восстановить покупки»', fg: 'secondary', bg: 'лист', min: 4.5, pair: (g) => on(g.secondary, [sheet(g)]) },
  { id: 'P17', what: 'Мелкий текст условий (продление, отмена)', fg: 'mutedText', bg: 'лист', min: 4.5, pair: (g) => on(g.mutedText, [sheet(g)]) },
  { id: 'P18', what: 'Таймлайн триала: точка шага «Сегодня»', fg: 'accentGraphic', bg: 'плашка таймлайна', min: 3, pair: (g) => on(g.accentGraphic, [plate(g)]) },
  { id: 'P19', what: 'Таймлайн: значок в кружке-впадине', fg: 'accentGraphic', bg: 'впадина (лист на плашке)', min: 3, pair: (g) => on(g.accentGraphic, [sheet(g)]) },
  { id: 'P20', what: 'Таймлайн: название шага «Сегодня / День 5 / День 7»', fg: 'text', bg: 'плашка таймлайна', min: 4.5, pair: (g) => on(g.text, [plate(g)]) },
  { id: 'P21', what: 'Таймлайн: пояснение шага и дата списания', fg: 'secondary', bg: 'плашка таймлайна', min: 4.5, pair: (g) => on(g.secondary, [plate(g)]) },
  { id: 'P22', what: 'Таймлайн: акцент «напомним за 2 дня»', fg: 'accentTextSafe', bg: 'плашка таймлайна', min: 4.5, pair: (g) => on(g.accentTextSafe, [plate(g)]) },
];
const LEVELS = ['calm', 'accent', 'max'] as const;
type Hit = { role: Role; theme: string; app: string; level: string; ratio: number };
const all: Hit[] = [];
for (const app of ['light', 'dark'] as const) for (const level of LEVELS) for (const id of LIQUID_GLASS_THEME_IDS) {
  const g = liquidGlassTokens(id, { level, appearance: app } as never);
  for (const r of ROLES) {
    const p = r.pair(g);
    const ratio = Math.min(...p.bgs.map((b) => contrastRatio(flattenOver(p.fg, b), b)));
    all.push({ role: r, theme: id, app, level, ratio });
  }
}
const f2 = (n: number): string => n.toFixed(2).replace('.', ',');
const ap = (a: string): string => (a === 'light' ? 'светлая' : 'тёмная');
console.log('| № | Элемент | Цвет | Фон | Порог | Минимум | Где минимум | Нарушений |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of ROLES) {
  const hs = all.filter((h) => h.role === r); const w = hs.reduce((a, b) => (b.ratio < a.ratio ? b : a)); const n = hs.filter((h) => h.ratio < r.min).length;
  console.log(`| ${r.id} | ${r.what} | \`${r.fg}\` | ${r.bg} | ${f2(r.min)} | ${f2(w.ratio)} | ${w.theme} · ${ap(w.app)} · ${w.level} | ${n ? `**${n} из ${hs.length}**` : `0 из ${hs.length}`} |`);
}
console.log('\nНАРУШЕНИЯ');
for (const r of ROLES) { const b = all.filter((h) => h.role === r && h.ratio < r.min); if (b.length) console.log(`${r.id}: ${b.length} — ${b.slice(0, 30).map((h) => `${h.theme}/${ap(h.app)}/${h.level} ${f2(h.ratio)}`).join('; ')}`); }
console.log('\nВСЕГО', all.length, 'пар, нарушений', all.filter((h) => h.ratio < h.role.min).length);
