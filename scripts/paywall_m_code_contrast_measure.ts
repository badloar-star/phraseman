// Запуск: npx tsx scripts/paywall_m_code_contrast_measure.ts > out.md
// зачем (координатор 25.10, после 28b693a44 — текст М на шкале D145: 13 / 16 / заголовки ≥ 19 — и de97b53fe — живые ru-тексты с длинными
// заголовками): перемер пейвола М по ЗАКОММИЧЕННОМУ КОДУ components/paywall/m/** во всех 29 темах × светлая/тёмная × Спокойно/Акцент/Максимум.
// Подложки и цвета — настоящими функциями приложения (planRowSelectedPaint, paywallPlateBg, paywallSheetBg, ctaFillGradient), градиенты —
// по худшему краю. Скрипт сверяет со строками компонентов, какой цвет на какой подложке стоит, и падает, если они разошлись.
// Порог: текст 4,5 (мелкий 13 — без поблажек; заголовки ≥ 19 жирные тоже меряем строго 4,5), графика 3,0.
// Переносы длинных заголовков на контраст не влияют: подложки сплошные или градиент на всю высоту — худший край тот же для любой длины.
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver, legibleOn } from '../constants/liquidGlassSurfaceRoles';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { ctaFillGradient } from '../constants/accentFill';
// paywallPlanRowPaint / paywall_surfaces тянут React Native (ShadowSurface) — копии формул со сторожем исходника ниже
const PW = (f: string): string => fs.readFileSync(path.join(__dirname, '..', 'components', f), 'utf8');
for (const [file, line] of [
  ['paywall/paywall_surfaces.ts', 'export function paywallSheetBg(g: GlassTokens): string { return g.opaqueSheet; }'],
  ['paywall/paywall_surfaces.ts', 'export function paywallPlateBg(g: GlassTokens): string { return g.isLight ? g.opaqueControl : shadowSheetPlateTokens(g).plateFillFrom; }'],
  ['v2/ShadowSurface.tsx', 'const next = { ...g, plateFillFrom: g.sheetPlateFillFrom, plateFillTo: g.sheetPlateFillTo };'],
  ['paywall/paywallPlanRowPaint.ts', 'const gradient: readonly [string, string] = [alpha(g.accent, 0.3), alpha(plate, 0.9)];'],
  ['paywall/paywallPlanRowPaint.ts', 'const backgrounds = [plate, ...gradient.map((stop) => flattenOver(stop, plate))];'],
  ['paywall/paywallPlanRowPaint.ts', "const toward = g.isLight ? g.text : '#FFFFFF';"],
  ['paywall/paywallPlanRowPaint.ts', 'trialInk: legibleOn(g.accentTextSafe, toward, backgrounds, 4.55),'],
  ['paywall/paywallPlanRowPaint.ts', 'mutedInk: legibleOn(g.mutedText, toward, backgrounds, 4.55),'],
  ['paywall/paywallPlanRowPaint.ts', 'edge: g.accentGraphic,'],
] as const) if (!PW(file).includes(line)) throw new Error(`исходник пейвола изменился: в components/${file} нет «${line}» — обнови копию`);
type GT = ReturnType<typeof liquidGlassTokens>;
const a8 = (hex: string, v: number): string => `${hex.slice(0, 7)}${Math.round(v * 255).toString(16).padStart(2, '0')}`;
const paywallSheetBg = (g: GT): string => g.opaqueSheet;
const paywallPlateBg = (g: GT): string => (g.isLight ? g.opaqueControl : g.sheetPlateFillFrom);
function planRowSelectedPaint(g: GT) {
  const plate = paywallPlateBg(g);
  const gradient: readonly [string, string] = [a8(g.accent, 0.3), a8(plate, 0.9)];
  const backgrounds = [plate, ...gradient.map((stop) => flattenOver(stop, plate))];
  const toward = g.isLight ? g.text : '#FFFFFF'; // theme-exempt: копия paywallPlanRowPaint
  return { gradient, edge: g.accentGraphic, ink: legibleOn(g.text, toward, backgrounds, 4.55), trialInk: legibleOn(g.accentTextSafe, toward, backgrounds, 4.55), mutedInk: legibleOn(g.mutedText, toward, backgrounds, 4.55) };
}

type G = ReturnType<typeof liquidGlassTokens>;
const SRC = (f: string): string => fs.readFileSync(path.join(__dirname, '..', 'components/paywall/m', f), 'utf8');
for (const [file, line] of [
  ['PaywallMHeaderCard.tsx', "style={[S.card, { backgroundColor: g.opaqueCard }]}>"],
  ['PaywallMHeaderCard.tsx', '<LinearGradient pointerEvents="none" colors={paint.gradient} style={StyleSheet.absoluteFill} />'],
  ['PaywallMHeaderCard.tsx', '<Text style={[S.kicker, { color: paint.trialInk }]}>{kicker}</Text>'],
  ['PaywallMHeaderCard.tsx', "<Text accessibilityRole=\"header\" style={[S.title, { color: paint.ink }]}>{title}</Text>"],
  ['PaywallMSheet.tsx', 'style={[S.sheet, { backgroundColor: paywallSheetBg(g), maxHeight: props.maxHeight }]}'],
  ['PaywallMSheet.tsx', "<View testID=\"paywall-m-pill\" style={[S.pill, { backgroundColor: plate }]}>"],
  ['PaywallMChart.tsx', "const PLUS_FILL_ALPHA = '1F';"],
  ['PaywallMPlans.tsx', "style={[S.plan, { backgroundColor: yearOn ? undefined : plate, borderColor: yearOn ? paint.edge : 'transparent' }]}>"],
  ['PaywallMDock.tsx', 'style={[S.dock, { paddingBottom: Math.max(bottomInset, 14), backgroundColor: g.opaqueSheet }]}>'],
  ['PaywallMDock.tsx', '<LinearGradient pointerEvents="none" colors={[...ctaFillGradient(g)]} style={StyleSheet.absoluteFill} />'],
] as const) if (!SRC(file).includes(line)) throw new Error(`пейвол М изменился: в ${file} нет «${line}» — обнови модель в этом скрипте`);

const screen = (g: G): string => flattenOver(g.bg, '#000000');
const sheet = (g: G): string => flattenOver(paywallSheetBg(g), screen(g));
const card = (g: G): string => flattenOver(g.opaqueCard, sheet(g));
const plate = (g: G): string => flattenOver(paywallPlateBg(g), sheet(g));
// шапка: градиент выбранного плана поверх КАРТОЧКИ (PaywallMHeaderCard), а не поверх плашки — края градиента считаем на карточке
const headerEdges = (g: G): string[] => { const c = card(g); return [c, ...planRowSelectedPaint(g).gradient.map((s) => flattenOver(s, c))]; };
// выбранный план: фон не задан (undefined) — градиент лежит прямо на листе
const planOnEdges = (g: G): string[] => { const s = sheet(g); return [...planRowSelectedPaint(g).gradient.map((x) => flattenOver(x, s))]; };
const ctaEdges = (g: G): string[] => ctaFillGradient(g).map((c) => flattenOver(c, sheet(g)));
const plusFill = (g: G): string => flattenOver(`${g.accentGraphic.slice(0, 7)}1F`, card(g));

type Role = { id: string; area: string; what: string; min: number; fn: (g: G) => [string[], string[]] };
const P = planRowSelectedPaint;
const ROLES: Role[] = [
  { id: 'H1', area: 'Шапка', what: 'Надпись «Ты на 3-м уроке из 32» (13) — trialInk на градиенте поверх карточки', min: 4.5, fn: (g) => [[P(g).trialInk], headerEdges(g)] },
  { id: 'H2', area: 'Шапка', what: 'Заголовок (длинный, ≥ 19) — ink на градиенте поверх карточки', min: 4.5, fn: (g) => [[P(g).ink], headerEdges(g)] },
  { id: 'H3', area: 'Шапка', what: 'Плитки цифр: число и «из 32» / подпись (13)', min: 4.5, fn: (g) => [[g.text, g.secondary], [card(g)]] },
  { id: 'S1', area: 'Лист', what: '«Не сейчас», абзац под шапкой (13/16)', min: 4.5, fn: (g) => [[g.secondary], [sheet(g)]] },
  { id: 'S2', area: 'Лист', what: 'Плашка «Plus» вверху: текст и плюс', min: 4.5, fn: (g) => [[g.text], [plate(g)]] },
  { id: 'C1', area: 'График', what: 'Заголовок, «≈ 600 фраз»', min: 4.5, fn: (g) => [[g.text], [card(g), plusFill(g)]] },
  { id: 'C2', area: 'График', what: '«90», оси, легенда, пояснение (13)', min: 4.5, fn: (g) => [[g.secondary], [card(g)]] },
  { id: 'C3', area: 'График', what: 'Линия и точки Plus — на карточке и своей заливке 12 %', min: 3, fn: (g) => [[g.accentGraphic], [card(g), plusFill(g)]] },
  { id: 'C4', area: 'График', what: 'Пунктир «бесплатно»', min: 3, fn: (g) => [[g.mutedText], [card(g)]] },
  { id: 'R1', area: 'Фразы месяца', what: '«День 10 · урок 4» (13)', min: 4.5, fn: (g) => [[g.accentTextSafe], [card(g)]] },
  { id: 'R2', area: 'Фразы месяца', what: 'Фраза (19) и перевод (13)', min: 4.5, fn: (g) => [[g.text, g.secondary], [card(g)]] },
  { id: 'R3', area: 'Фразы месяца', what: 'Точки и линия дороги на листе', min: 3, fn: (g) => [[g.accentGraphic], [sheet(g)]] },
  { id: 'T1', area: 'Сравнение', what: 'Шапки «Бесплатно» / «Plus» (13)', min: 4.5, fn: (g) => [[g.secondary, g.accentTextSafe], [card(g)]] },
  { id: 'T2', area: 'Сравнение', what: 'Строка, значения (13/16)', min: 4.5, fn: (g) => [[g.text, g.secondary], [card(g)]] },
  { id: 'T3', area: 'Сравнение', what: 'Галочка Plus', min: 3, fn: (g) => [[g.accentGraphic], [card(g)]] },
  { id: 'Y1', area: 'Планы', what: 'Выбранный план: название и цена — ink на градиенте поверх листа', min: 4.5, fn: (g) => [[P(g).ink], planOnEdges(g)] },
  { id: 'Y2', area: 'Планы', what: 'Выбранный план: «≈ €3,33 в месяц» (13) — mutedInk', min: 4.5, fn: (g) => [[P(g).mutedInk], planOnEdges(g)] },
  { id: 'Y3', area: 'Планы', what: 'Рамка выбранного к листу и к соседней плашке', min: 3, fn: (g) => [[P(g).edge], [sheet(g), plate(g)]] },
  { id: 'Y4', area: 'Планы', what: 'Невыбранный план: текст и подпись на плашке', min: 4.5, fn: (g) => [[g.text, g.secondary], [plate(g)]] },
  // зачем: две замены, только токены. Шапка — доводка по ТЕМ подложкам, где она стоит (карточка); выбранный план — фон плашки, как у
  // прежних PaywallPlanRows (тогда паинт доведён ровно под свою подложку)
  { id: 'H1*', area: 'Шапка', what: 'замена: legibleOn(accentTextSafe → text/белый) по краям градиента на КАРТОЧКЕ', min: 4.5, fn: (g) => [[legibleOn(g.accentTextSafe, g.isLight ? g.text : '#FFFFFF', headerEdges(g), 4.55)], headerEdges(g)] },
  { id: 'H2*', area: 'Шапка', what: 'замена: legibleOn(text → text/белый) по краям на карточке', min: 4.5, fn: (g) => [[legibleOn(g.text, g.isLight ? g.text : '#FFFFFF', headerEdges(g), 4.55)], headerEdges(g)] },
  { id: 'Y2*', area: 'Планы', what: 'замена: выбранному плану фон плашки (backgroundColor: plate) — mutedInk на градиенте поверх плашки', min: 4.5, fn: (g) => { const pl = plate(g); return [[P(g).mutedInk], [pl, ...P(g).gradient.map((x) => flattenOver(x, pl))]]; } },
  { id: 'Y1*', area: 'Планы', what: 'то же: ink на градиенте поверх плашки', min: 4.5, fn: (g) => { const pl = plate(g); return [[P(g).ink], [pl, ...P(g).gradient.map((x) => flattenOver(x, pl))]]; } },
  { id: 'D1', area: 'Нижняя панель', what: 'Кнопка покупки — ctaFillInk на обоих концах градиента', min: 4.5, fn: (g) => [[g.ctaFillInk], ctaEdges(g)] },
  { id: 'D2', area: 'Нижняя панель', what: 'Условия списания и ссылки (13)', min: 4.5, fn: (g) => [[g.secondary], [flattenOver(g.opaqueSheet, screen(g))]] },
];
type Hit = { role: Role; theme: string; app: string; level: string; v: number };
const hits: Hit[] = [];
for (const app of ['light', 'dark'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
  const g = liquidGlassTokens(id, { level, appearance: app } as never);
  for (const r of ROLES) { const [fgs, bgs] = r.fn(g); hits.push({ role: r, theme: id, app, level, v: Math.min(...fgs.flatMap((fg) => bgs.map((b) => contrastRatio(flattenOver(fg, b), b)))) }); }
}
const f2 = (n: number): string => n.toFixed(2).replace('.', ',');
const ap = (a: string): string => (a === 'light' ? 'светлая' : 'тёмная');
console.log('| № | Где | Элемент | Порог | Минимум | Где минимум | Нарушений |');
console.log('|---|---|---|---|---|---|---|');
for (const r of ROLES) {
  const hs = hits.filter((h) => h.role === r); const w = hs.reduce((a, b) => (b.v < a.v ? b : a)); const n = hs.filter((h) => h.v < r.min).length;
  console.log(`| ${r.id} | ${r.area} | ${r.what} | ${f2(r.min)} | ${f2(w.v)} | ${w.theme} · ${ap(w.app)} · ${w.level} | ${n ? `**${n} из ${hs.length}**` : `0 из ${hs.length}`} |`);
}
console.log('\nНАРУШЕНИЯ');
for (const r of ROLES) { const b = hits.filter((h) => h.role === r && h.v < r.min); if (b.length) console.log(`${r.id}: ${b.length} — ${b.slice(0, 24).map((h) => `${h.theme}/${ap(h.app)}/${h.level} ${f2(h.v)}`).join('; ')}`); }
console.log('\nВСЕГО', hits.length, 'пар, нарушений', hits.filter((h) => h.v < h.role.min).length);
