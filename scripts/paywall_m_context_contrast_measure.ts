// Запуск: npx tsx scripts/paywall_m_context_contrast_measure.ts > out.md
// зачем (координатор 25.10): контекстные окна Plus в стиле «Вариант М» (docs/design/v2-app/paywall-m-context.html, https://claude.ai/artifact/6dkmYjjEX3kCv2s1nuFT9B)
// во всех 29 темах × светлая/тёмная × Спокойно/Акцент/Максимум. Шесть мест: энергия (две равные плитки), разговор с ИИ, после успеха (защита серии),
// Мастерская, общий замок урока, plus_server_refused. Только токены темы. Поверхности — как у пейвола (paywall_surfaces, paywallPlanRowPaint),
// копия сверяется с исходником. Пороги: текст 4,5; значки, точки, рамка, полоса прогресса — 3,0.
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver, legibleOn } from '../constants/liquidGlassSurfaceRoles';
import { semanticInk } from '../constants/liquidGlassSemanticInk';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';

type G = ReturnType<typeof liquidGlassTokens>;
const SRC = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
for (const [file, line] of [
  ['components/paywall/paywall_surfaces.ts', 'export function paywallSheetBg(g: GlassTokens): string { return g.opaqueSheet; }'],
  ['components/paywall/paywall_surfaces.ts', 'export function paywallPlateBg(g: GlassTokens): string { return g.isLight ? g.opaqueControl : shadowSheetPlateTokens(g).plateFillFrom; }'],
  ['components/paywall/paywallPlanRowPaint.ts', 'const gradient: readonly [string, string] = [alpha(g.accent, 0.3), alpha(plate, 0.9)];'],
] as const) if (!SRC(file).includes(line)) throw new Error(`исходник пейвола изменился: в ${file} нет «${line}» — обнови копию в этом скрипте`);
const alpha = (hex: string, v: number): string => `${hex.slice(0, 7)}${Math.round(v * 255).toString(16).padStart(2, '0')}`;
const screen = (g: G): string => flattenOver(g.bg, '#000000');
const sheet = (g: G): string => flattenOver(g.opaqueSheet, screen(g));
const over = (fill: string, base: string): string => flattenOver(fill, base);
const plate = (g: G): string => over(g.isLight ? g.opaqueControl : g.sheetPlateFillFrom, sheet(g)); // плитка «Подождать»
const card = (g: G): string => over(g.opaqueCard, sheet(g)); // карточка фразы / недели / сборки / урока
const selected = (g: G): string[] => { const p = plate(g); return [p, over(alpha(g.accent, 0.3), p), over(alpha(p, 0.9), p)]; };
const selInk = (g: G, base: string): string => legibleOn(base, g.isLight ? g.text : '#FFFFFF', selected(g), 4.55); // theme-exempt: крайняя точка доводки, как paywallPlanRowPaint
const soft = (g: G, base: string): string => over(g.accentSoft, base);
const chipOff = (g: G, base: string): string => over(g.opaqueControl, base);
const btn2 = (g: G): string => over(g.buttonFill, sheet(g));

type Role = { id: string; area: string; what: string; pair: string; min: number; fn: (g: G) => [string, string[]] };
const ROLES: Role[] = [
  // ── общее для всех шести панелей ──
  { id: 'K1', area: 'Все панели', what: 'Строка над заголовком («5 занятий подряд сегодня», «Серия · 30 дней»)', pair: '`accentTextSafe` на листе', min: 4.5, fn: (g) => [g.accentTextSafe, [sheet(g)]] },
  { id: 'K2', area: 'Все панели', what: 'Заголовок', pair: '`text` на листе', min: 4.5, fn: (g) => [g.text, [sheet(g)]] },
  { id: 'K3', area: 'Все панели', what: 'Абзац, цена под кнопкой, «Не сейчас» / «Позже»', pair: '`secondary` на листе', min: 4.5, fn: (g) => [g.secondary, [sheet(g)]] },
  { id: 'K4', area: 'Все панели', what: 'Главная кнопка («Продолжить разговор с Plus», «Восстановить покупки»)', pair: '`ctaFillInk` на ctaFill', min: 4.5, fn: (g) => [g.ctaFillInk, [g.ctaFill]] },
  { id: 'K5', area: 'Все панели', what: 'Главная кнопка видна на листе', pair: '`ctaFill` на листе', min: 3, fn: (g) => [g.ctaFill, [sheet(g)]] },
  { id: 'K6', area: 'Все панели', what: 'Вторая кнопка («Оформить Plus»)', pair: '`text` на buttonFill', min: 4.5, fn: (g) => [g.text, [btn2(g)]] },
  // ── 1. энергия ──
  { id: 'E1', area: '1 · Энергия', what: 'Плитка «Подождать»: подпись и таймер 9:42', pair: '`text` на плашке', min: 4.5, fn: (g) => [g.text, [plate(g)]] },
  { id: 'E2', area: '1 · Энергия', what: 'Плитка «Подождать»: «и продолжишь бесплатно»', pair: '`secondary` на плашке', min: 4.5, fn: (g) => [g.secondary, [plate(g)]] },
  { id: 'E3', area: '1 · Энергия', what: 'Значок часов', pair: '`secondary` на плашке', min: 3, fn: (g) => [g.secondary, [plate(g)]] },
  { id: 'E4', area: '1 · Энергия', what: 'Плитка Plus: «Plus», «дальше» / «7 дней бесплатно»', pair: 'ink выбранного плана на градиенте', min: 4.5, fn: (g) => [selInk(g, g.text), selected(g)] },
  { id: 'E5', area: '1 · Энергия', what: 'Плитка Plus: «сейчас, ≈ €3,33 в месяц»', pair: 'mutedInk выбранного плана', min: 4.5, fn: (g) => [selInk(g, g.mutedText), selected(g)] },
  { id: 'E6', area: '1 · Энергия', what: 'Значок молнии на плитке Plus', pair: '`accentGraphic` на градиенте', min: 3, fn: (g) => [g.accentGraphic, selected(g)] },
  { id: 'E6*', area: '1 · Энергия', what: 'то же после доводки (замена)', pair: 'значок = ink выбранного плана', min: 3, fn: (g) => [selInk(g, g.text), selected(g)] },
  { id: 'E7', area: '1 · Энергия', what: 'Рамка плитки Plus к листу', pair: '`accentGraphic` на листе', min: 3, fn: (g) => [g.accentGraphic, [sheet(g)]] },
  // ── 2. разговор с ИИ ──
  { id: 'A1', area: '2 · ИИ', what: '«Твоя фраза:» и зачёркнутая фраза', pair: '`secondary` на карточке', min: 4.5, fn: (g) => [g.secondary, [card(g)]] },
  { id: 'A2', area: '2 · ИИ', what: 'Исправленная фраза', pair: '`text` на карточке', min: 4.5, fn: (g) => [g.text, [card(g)]] },
  { id: 'A3', area: '2 · ИИ', what: 'Вставленное слово «to» (зелёным)', pair: '`semanticInk.goodText` на карточке', min: 4.5, fn: (g) => [semanticInk(g).goodText, [card(g)]] },
  { id: 'A3·', area: '2 · ИИ', what: 'то же сырым `good` (для сравнения)', pair: '`good` на карточке', min: 4.5, fn: (g) => [g.good, [card(g)]] },
  // ── 3. после успеха: защита серии ──
  { id: 'S1', area: '3 · Серия', what: 'Кружок закрытого дня', pair: '`accent` на карточке', min: 3, fn: (g) => [g.accent, [card(g)]] },
  { id: 'S2', area: '3 · Серия', what: 'Галочка в кружке', pair: '`accentInk` на accent', min: 3, fn: (g) => [g.accentInk, [g.accent]] },
  { id: 'S1*', area: '3 · Серия', what: 'кружок после замены', pair: '`ctaFill` на карточке', min: 3, fn: (g) => [g.ctaFill, [card(g)]] },
  { id: 'S2*', area: '3 · Серия', what: 'галочка после замены', pair: '`ctaFillInk` на ctaFill', min: 3, fn: (g) => [g.ctaFillInk, [g.ctaFill]] },
  { id: 'S3', area: '3 · Серия', what: 'Щит пропущенного дня', pair: '`accentGraphic` на accentSoft поверх карточки', min: 3, fn: (g) => [g.accentGraphic, [soft(g, card(g))]] },
  { id: 'S4', area: '3 · Серия', what: 'Дни недели, «пропуск»', pair: '`secondary` на карточке', min: 4.5, fn: (g) => [g.secondary, [card(g)]] },
  // ── 4. Мастерская ──
  { id: 'W1', area: '4 · Мастерская', what: 'Выбранные слова сборки («I’m», «outside»)', pair: '`accentInk` на accent', min: 4.5, fn: (g) => [g.accentInk, [g.accent]] },
  { id: 'W2', area: '4 · Мастерская', what: 'Невыбранные слова на карточке', pair: '`text` на opaqueControl поверх карточки', min: 4.5, fn: (g) => [g.text, [chipOff(g, card(g))]] },
  { id: 'W3', area: '4 · Мастерская', what: 'Фразы урока («I am ready.», «+47») на листе', pair: '`text` на opaqueControl поверх листа', min: 4.5, fn: (g) => [g.text, [chipOff(g, sheet(g))]] },
  { id: 'W4', area: '4 · Мастерская', what: 'Подсказка «Я снаружи»', pair: '`secondary` на карточке', min: 4.5, fn: (g) => [g.secondary, [card(g)]] },
  // ── 5. общий замок ──
  { id: 'L1', area: '5 · Замок', what: 'Значок замка на плашке', pair: '`accentGraphic` на accentSoft поверх карточки', min: 3, fn: (g) => [g.accentGraphic, [soft(g, card(g))]] },
  { id: 'L2', area: '5 · Замок', what: '«Урок 4 · There is / are»', pair: '`accentTextSafe` на карточке', min: 4.5, fn: (g) => [g.accentTextSafe, [card(g)]] },
  { id: 'L3', area: '5 · Замок', what: 'Фраза и выделенное «is»', pair: '`text` на карточке / accentSoft', min: 4.5, fn: (g) => [g.text, [card(g), soft(g, card(g))]] },
  { id: 'L4', area: '5 · Замок', what: 'Перевод фразы', pair: '`secondary` на карточке', min: 4.5, fn: (g) => [g.secondary, [card(g)]] },
  { id: 'L5', area: '5 · Замок', what: 'Заполненная часть полосы «3 из 32»', pair: '`accentGraphic` на дорожке opaqueControl', min: 3, fn: (g) => [g.accentGraphic, [chipOff(g, sheet(g))]] },
  // ── 6. plus_server_refused ──
  { id: 'R1', area: '6 · Не видим Plus', what: 'Значок часов со стрелкой на плашке', pair: '`accentGraphic` на accentSoft поверх листа', min: 3, fn: (g) => [g.accentGraphic, [soft(g, sheet(g))]] },
];
type Hit = { role: Role; theme: string; app: string; level: string; v: number };
const hits: Hit[] = [];
for (const app of ['light', 'dark'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
  const g = liquidGlassTokens(id, { level, appearance: app } as never);
  for (const r of ROLES) { const [fg, bgs] = r.fn(g); hits.push({ role: r, theme: id, app, level, v: Math.min(...bgs.map((b) => contrastRatio(flattenOver(fg, b), b))) }); }
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
for (const r of ROLES) { const b = hits.filter((h) => h.role === r && h.v < r.min); if (b.length) console.log(`${r.id}: ${b.length} — ${b.slice(0, 24).map((h) => `${h.theme}/${ap(h.app)}/${h.level} ${f2(h.v)}`).join('; ')}`); }
const real = hits.filter((h) => !h.role.id.endsWith('·'));
console.log('\nВСЕГО', real.length, 'пар (без строк для сравнения), нарушений', real.filter((h) => h.v < h.role.min).length);
