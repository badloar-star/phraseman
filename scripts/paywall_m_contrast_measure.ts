// Запуск: npx tsx scripts/paywall_m_contrast_measure.ts > out.md
// зачем (координатор 25.10: владелец выбрал пейвол «Вариант М», https://claude.ai/artifact/AKuWv3RWqbu3a4Xe7EBj7q): карта токенов и контраст
// для М во ВСЕХ темах (29 × светлая/тёмная × Спокойно/Акцент/Максимум), отдельно — график «Plus / бесплатно», таблица сравнения и кнопка года.
// Только токены текущей темы, без новых цветов. Поверхности — те же, что у текущего PaywallPlus (paywall_surfaces, paywallPlanRowPaint),
// их копия сверяется с исходником. Порог: текст 4,5; графика (линии, точки, рамка, галочки) 3,0; различимость двух линий графика — ΔE OKLab ≥ 0,10.
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver, legibleOn } from '../constants/liquidGlassSurfaceRoles';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';

type G = ReturnType<typeof liquidGlassTokens>;
const SRC = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
for (const [file, line] of [
  ['components/paywall/paywall_surfaces.ts', 'export function paywallSheetBg(g: GlassTokens): string { return g.opaqueSheet; }'],
  ['components/paywall/paywall_surfaces.ts', 'export function paywallPlateBg(g: GlassTokens): string { return g.isLight ? g.opaqueControl : shadowSheetPlateTokens(g).plateFillFrom; }'],
  ['components/v2/ShadowSurface.tsx', 'plateFillFrom: g.sheetPlateFillFrom'],
  ['components/paywall/paywallPlanRowPaint.ts', 'const gradient: readonly [string, string] = [alpha(g.accent, 0.3), alpha(plate, 0.9)];'],
  ['components/paywall/paywallPlanRowPaint.ts', 'trialInk: legibleOn(g.accentTextSafe, toward, backgrounds, 4.55),'],
  ['components/paywall/PaywallPlanRows.tsx', "export const PAYWALL_SAVINGS_GOLD = '#FFD27A';"],
] as const) if (!SRC(file).includes(line)) throw new Error(`исходник пейвола изменился: в ${file} нет «${line}» — обнови копию в этом скрипте`);
const alpha = (hex: string, v: number): string => `${hex.slice(0, 7)}${Math.round(v * 255).toString(16).padStart(2, '0')}`;
const screen = (g: G): string => flattenOver(g.bg, '#000000');
const sheet = (g: G): string => flattenOver(g.opaqueSheet, screen(g));
const plate = (g: G): string => flattenOver(g.isLight ? g.opaqueControl : g.sheetPlateFillFrom, sheet(g));
const card = (g: G): string => flattenOver(g.opaqueCard, sheet(g));
const selected = (g: G): string[] => { const p = plate(g); return [p, flattenOver(alpha(g.accent, 0.3), p), flattenOver(alpha(p, 0.9), p)]; };
const selInk = (g: G, base: string): string => legibleOn(base, g.isLight ? g.text : '#FFFFFF', selected(g), 4.55); // theme-exempt: крайняя точка доводки в тёмном, как paywallPlanRowPaint
const header = (g: G): string => flattenOver(g.accentSoft, card(g)); // шапка «Ты на 3-м уроке» — мягкий акцент на карточке
const plusFill = (g: G): string => flattenOver(alpha(g.accentGraphic, 0.12), card(g)); // заливка под линией Plus на графике
const lab = (h: string): number[] => {
  const n = parseInt(h.slice(1, 7), 16); const L = (v: number): number => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const r = L((n >> 16) & 255), gg = L((n >> 8) & 255), b = L(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * gg + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * gg + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * gg + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const dE = (a: string, b: string): number => { const x = lab(a), y = lab(b); return Math.hypot(x[0]! - y[0]!, x[1]! - y[1]!, x[2]! - y[2]!); };

type Role = { id: string; area: string; what: string; pair: string; min: number; kind?: 'dE'; fn: (g: G) => [string, string[]] };
const ROLES: Role[] = [
  // ── шапка и общий текст ──
  { id: 'M1', area: 'Шапка', what: '«Ты на 3-м уроке из 32»', pair: '`accentTextSafe` на accentSoft поверх карточки', min: 4.5, fn: (g) => [g.accentTextSafe, [header(g)]] },
  { id: 'M1*', area: 'Шапка', what: 'то же после доводки (замена)', pair: 'legibleOn(accentTextSafe → text) по подложке шапки', min: 4.5, fn: (g) => [legibleOn(g.accentTextSafe, g.text, [header(g)], 4.55), [header(g)]] },
  { id: 'M2', area: 'Шапка', what: 'Личный заголовок «Через месяц ты расскажешь…»', pair: '`text` на accentSoft поверх карточки', min: 4.5, fn: (g) => [g.text, [header(g)]] },
  { id: 'M3', area: 'Шапка', what: 'Плитки цифр: число', pair: '`text` на opaqueCard', min: 4.5, fn: (g) => [g.text, [card(g)]] },
  { id: 'M4', area: 'Шапка', what: 'Плитки цифр: подпись («дней подряд»)', pair: '`secondary` на opaqueCard', min: 4.5, fn: (g) => [g.secondary, [card(g)]] },
  { id: 'M5', area: 'Лист', what: '«Не сейчас», абзац, «Восстановить покупки», «Условия»', pair: '`secondary` на листе', min: 4.5, fn: (g) => [g.secondary, [sheet(g)]] },
  { id: 'M6', area: 'Лист', what: 'Заголовки разделов («Что ты скажешь через 30 дней», «Выбери план»)', pair: '`text` на листе', min: 4.5, fn: (g) => [g.text, [sheet(g)]] },
  // ── график ──
  { id: 'G1', area: 'График', what: 'Линия и точки Plus', pair: '`accentGraphic` на карточке', min: 3, fn: (g) => [g.accentGraphic, [card(g)]] },
  { id: 'G2', area: 'График', what: 'Линия Plus поверх своей заливки 12 %', pair: '`accentGraphic` на accentGraphic 12 %', min: 3, fn: (g) => [g.accentGraphic, [plusFill(g)]] },
  { id: 'G3', area: 'График', what: 'Линия и точка «бесплатно»', pair: '`mutedText` на карточке', min: 3, fn: (g) => [g.mutedText, [card(g)]] },
  { id: 'G4', area: 'График', what: 'Две линии отличимы друг от друга', pair: 'ΔE accentGraphic ↔ mutedText', min: 0.1, kind: 'dE', fn: (g) => [g.accentGraphic, [g.mutedText]] },
  { id: 'G5', area: 'График', what: 'Подпись «≈ 600 фраз» у линии Plus', pair: '`text` на заливке Plus', min: 4.5, fn: (g) => [g.text, [plusFill(g), card(g)]] },
  { id: 'G6', area: 'График', what: 'Подпись «90», оси, легенда, пояснение', pair: '`secondary` на карточке', min: 4.5, fn: (g) => [g.secondary, [card(g)]] },
  { id: 'G7', area: 'График (разговор с ИИ)', what: 'Потолок лимита «30 реплик»', pair: '`mutedText` на карточке', min: 3, fn: (g) => [g.mutedText, [card(g)]] },
  // ── «Что ты скажешь через 30 дней» ──
  { id: 'P1', area: 'Фразы месяца', what: '«День 10 · урок 4»', pair: '`accentTextSafe` на карточке', min: 4.5, fn: (g) => [g.accentTextSafe, [card(g)]] },
  { id: 'P2', area: 'Фразы месяца', what: 'Фраза и выделенное слово на подложке', pair: '`text` на карточке / accentSoft', min: 4.5, fn: (g) => [g.text, [card(g), flattenOver(g.accentSoft, card(g))]] },
  { id: 'P3', area: 'Фразы месяца', what: 'Перевод', pair: '`secondary` на карточке', min: 4.5, fn: (g) => [g.secondary, [card(g)]] },
  { id: 'P4', area: 'Фразы месяца', what: 'Точки таймлайна', pair: '`accentGraphic` на листе', min: 3, fn: (g) => [g.accentGraphic, [sheet(g)]] },
  // ── таблица сравнения ──
  { id: 'T1', area: 'Таблица', what: 'Шапка «Бесплатно»', pair: '`secondary` на карточке', min: 4.5, fn: (g) => [g.secondary, [card(g)]] },
  { id: 'T2', area: 'Таблица', what: 'Шапка «Plus»', pair: '`accentTextSafe` на карточке', min: 4.5, fn: (g) => [g.accentTextSafe, [card(g)]] },
  { id: 'T3', area: 'Таблица', what: 'Название строки', pair: '`text` на карточке', min: 4.5, fn: (g) => [g.text, [card(g)]] },
  { id: 'T4', area: 'Таблица', what: 'Значение «бесплатно» («3 в день», «–»)', pair: '`secondary` на карточке', min: 4.5, fn: (g) => [g.secondary, [card(g)]] },
  { id: 'T5', area: 'Таблица', what: 'Значение Plus («без лимита»), жирное', pair: '`text` на карточке', min: 4.5, fn: (g) => [g.text, [card(g)]] },
  { id: 'T6', area: 'Таблица', what: 'Галочка Plus', pair: '`accentGraphic` на карточке', min: 3, fn: (g) => [g.accentGraphic, [card(g)]] },
  // ── планы и кнопка года ──
  { id: 'Y1', area: 'Кнопка года (выбрана)', what: '«Год», цена €39,99 — крупно', pair: 'ink выбранного плана на градиенте', min: 4.5, fn: (g) => [selInk(g, g.text), selected(g)] },
  { id: 'Y2', area: 'Кнопка года (выбрана)', what: '«≈ €3,33 в месяц»', pair: 'mutedInk выбранного плана', min: 4.5, fn: (g) => [selInk(g, g.mutedText), selected(g)] },
  { id: 'Y3', area: 'Кнопка года (выбрана)', what: 'Рамка-подсветка выбранного к листу', pair: '`accentGraphic` на листе', min: 3, fn: (g) => [g.accentGraphic, [sheet(g)]] },
  { id: 'Y4', area: 'Кнопка года (выбрана)', what: 'Рамка-подсветка к соседней плашке «Месяц»', pair: '`accentGraphic` на плашке', min: 3, fn: (g) => [g.accentGraphic, [plate(g)]] },
  { id: 'Y5', area: 'Кнопка года (выбрана)', what: 'Бейдж «−58 %» (утверждённое золото)', pair: '#3A2700 на #FFD27A', min: 4.5, fn: () => ['#3A2700', ['#FFD27A']] },
  { id: 'Y6', area: 'План «Месяц»', what: 'Цена и подпись', pair: '`text` / `secondary` на плашке', min: 4.5, fn: (g) => [g.secondary, [plate(g)]] },
  { id: 'Y7', area: 'Кнопка покупки', what: '«Начать 7 дней бесплатно» / «Оформить за €39,99 в год»', pair: '`ctaFillInk` на ctaFill', min: 4.5, fn: (g) => [g.ctaFillInk, [g.ctaFill]] },
  { id: 'Y8', area: 'Кнопка покупки', what: 'Кнопка видна на листе', pair: '`ctaFill` на листе', min: 3, fn: (g) => [g.ctaFill, [sheet(g)]] },
  { id: 'Y9', area: 'Условия', what: '«Сегодня 0 €. Потом €39,99 в год…» (сумма списания)', pair: '`secondary` на листе', min: 4.5, fn: (g) => [g.secondary, [sheet(g)]] },
  // ── панель энергии ──
  { id: 'E1', area: 'Энергия', what: 'Таймер «+1 энергия за 10 минут» и текст', pair: '`text` / `secondary` на листе', min: 4.5, fn: (g) => [g.secondary, [sheet(g)]] },
  { id: 'E2', area: 'Энергия', what: 'Кнопка «Подождать»', pair: '`text` на buttonFill', min: 4.5, fn: (g) => [g.text, [flattenOver(g.buttonFill, sheet(g))]] },
];
type Hit = { role: Role; theme: string; app: string; level: string; v: number };
const hits: Hit[] = [];
for (const app of ['light', 'dark'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
  const g = liquidGlassTokens(id, { level, appearance: app } as never);
  for (const r of ROLES) {
    const [fg, bgs] = r.fn(g);
    const v = r.kind === 'dE' ? Math.min(...bgs.map((b) => dE(fg, b))) : Math.min(...bgs.map((b) => contrastRatio(flattenOver(fg, b), b)));
    hits.push({ role: r, theme: id, app, level, v });
  }
}
const f2 = (n: number): string => n.toFixed(2).replace('.', ',');
const ap = (a: string): string => (a === 'light' ? 'светлая' : 'тёмная');
console.log('| № | Где | Элемент | Пара | Порог | Минимум | Где минимум | Нарушений |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of ROLES) {
  const hs = hits.filter((h) => h.role === r); const w = hs.reduce((a, b) => (b.v < a.v ? b : a)); const n = hs.filter((h) => h.v < r.min).length;
  console.log(`| ${r.id} | ${r.area} | ${r.what} | ${r.pair} | ${f2(r.min)} | ${f2(w.v)} | ${w.theme} · ${ap(w.app)} · ${w.level} | ${n ? `**${n} из ${hs.length}**` : `0 из ${hs.length}`} |`);
}
console.log('\nНАРУШЕНИЯ');
for (const r of ROLES) { const b = hits.filter((h) => h.role === r && h.v < r.min); if (b.length) console.log(`${r.id}: ${b.length} — ${b.slice(0, 30).map((h) => `${h.theme}/${ap(h.app)}/${h.level} ${f2(h.v)}`).join('; ')}`); }
console.log('\nВСЕГО', hits.length, 'пар, нарушений', hits.filter((h) => h.v < h.role.min).length);
