// Запуск: npx tsx scripts/spire_contrast_measure.ts > out.md
// зачем (координатор 25.10: Пик — частый раздел жалоб): контраст Пика во ВСЕХ темах, две части.
// 1) Сцена Пика (SpireScene + SpireScenePedestal): белые надписи и белое стекло SPIRE_SCENE_INK поверх фона сцены. Фон считается
//    так же, как его рисует spire_scene_backdrop.tsx: линейный градиент sceneTop → sceneBottom (0,22·W;0 → 0,78·W;H), свет sceneGlow
//    (день: центр 18 %·W, вечер: 82 %·W eveningGlow; радиусы 70 %·W × 50 %·H), затемнение под вкладками spireTopShadeAlpha
//    (сплошное до bleed, затухает к bleed+48). H = bleed + sceneH. Положения строк — по раскладке (COPY_TOP 12) и снимкам Сверки.
//    Варианты: экран 360/390 dp, шапка над сценой (bleed) 96/124, высота сцены 700/900, день и вечер.
// 2) Экраны Пика вне сцены (useSpirePalette): пары токенов, 29 тем × светлая/тёмная × Спокойно/Акцент/Максимум.
// Порог: текст 4,5, графика 3,0.
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver, legibleOn } from '../constants/liquidGlassSurfaceRoles';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { SPIRE_LIGHT_RY_FACTOR, SPIRE_LIGHT_STAGE_H, SPIRE_SHADE_TAIL, spireTopShadeAlpha } from '../components/spire/scene/spire_scene_backdrop_math';
import { SPIRE_SCENE_INK } from '../components/spire/scene/spire_scene_palette';

type Rgba = [number, number, number, number];
type Rgb = [number, number, number];
const parse = (c: string): Rgba => {
  const h = c.trim().match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (h) { const n = parseInt(h[1]!, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, h[2] ? parseInt(h[2], 16) / 255 : 1]; }
  const r = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (r) return [Number(r[1]), Number(r[2]), Number(r[3]), r[4] === undefined ? 1 : Number(r[4])];
  throw new Error(`цвет не разобран: ${c}`);
};
const over = (top: Rgba, alpha: number, base: Rgb): Rgb => { const a = top[3] * alpha; return [0, 1, 2].map((i) => top[i]! * a + base[i]! * (1 - a)) as Rgb; };
const lin = (v: number): number => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
const lum = (c: Rgb): number => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a: Rgb, b: Rgb): number => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const f2 = (n: number): string => n.toFixed(2).replace('.', ',');
const ap = (a: string): string => (a === 'light' ? 'светлая' : 'тёмная');

// ── часть 1: сцена ──
// строка: текст fg на (стекле glass поверх) фоне сцены; y — от верха сцены, dp
type SceneEl = { id: string; what: string; fg: string; glass: string[]; y0: number; y1: number; x0: number; x1: number; min: 4.5 | 3; trackUnder?: string };
const I = SPIRE_SCENE_INK;
// зачем (перемер 25.10 после 30dfcf973, Моменты): своя строка — подсветка 6 %, ник белый; свет размером Главной; затемнение до шапка + 140.
// Подсветку и цвет ника читаем из исходника, чтобы замер не разошёлся с кодом молча.
const PEDESTAL = fs.readFileSync(path.join(__dirname, '..', 'components/spire/scene/SpireScenePedestal.tsx'), 'utf8');
const meGlassAlpha = PEDESTAL.match(/const ME_GLASS = colorWithAlpha\(SPIRE_SCENE_INK\.text, ([\d.]+)\);/);
if (!meGlassAlpha) throw new Error('SpireScenePedestal изменился: нет ME_GLASS = colorWithAlpha(SPIRE_SCENE_INK.text, …) — обнови модель своей строки');
const subInk = PEDESTAL.match(/sub: \{ color: SPIRE_SCENE_INK\.(\w+),/);
if (!subInk) throw new Error('SpireScenePedestal изменился: нет sub: { color: SPIRE_SCENE_INK.… — обнови цвет ника');
const ME_GLASS = `rgba(255,255,255,${meGlassAlpha[1]})`;
const NICK = (SPIRE_SCENE_INK as Record<string, string>)[subInk[1]!]!;
const LINK = 'rgba(255,255,255,0.9)'; // SpireScenePedestal: colorWithAlpha(text, 0.9)
const SCENE: SceneEl[] = [
  { id: 'A1', what: 'Надзаголовок над «Этаж N» (белый 86 %)', fg: I.kicker, glass: [], y0: 12, y1: 29, x0: 20, x1: 200, min: 4.5 },
  { id: 'A2', what: '«Этаж N», белый 40 px', fg: I.text, glass: [], y0: 33, y1: 77, x0: 20, x1: 210, min: 4.5 },
  { id: 'A3', what: 'Строка «ступень 7 из 8» (белый 88 %)', fg: I.line, glass: [], y0: 85, y1: 102, x0: 76, x1: 200, min: 4.5 },
  { id: 'A4', what: 'Полоска ступеней: белая заливка на дорожке 28 %', fg: I.text, glass: [I.barTrack], y0: 91, y1: 95, x0: 20, x1: 68, min: 3 },
  { id: 'A5', what: '«Комната недели», заголовок (белый)', fg: I.text, glass: [], y0: 140, y1: 161, x0: 20, x1: 170, min: 4.5 },
  { id: 'A6', what: 'Число людей справа от заголовка (белый 78 %)', fg: I.muted, glass: [], y0: 140, y1: 161, x0: 150, x1: 190, min: 4.5 },
  { id: 'A7', what: 'Строки комнаты: место и имя на стекле 16 %', fg: I.text, glass: [I.glass], y0: 170, y1: 340, x0: 20, x1: 180, min: 4.5 },
  { id: 'A8', what: 'Своя строка: имя на стекле 16 % + подсветка своей строки', fg: I.text, glass: [I.glass, ME_GLASS], y0: 350, y1: 400, x0: 20, x1: 180, min: 4.5 },
  { id: 'A9', what: 'Своя строка: ник под местом', fg: NICK, glass: [I.glass, ME_GLASS], y0: 380, y1: 400, x0: 20, x1: 180, min: 4.5 },
  { id: 'A10', what: 'Ссылка «Все участники» (белый 90 %)', fg: LINK, glass: [], y0: 412, y1: 430, x0: 20, x1: 140, min: 4.5 },
];
type SceneHit = { el: SceneEl; theme: string; app: string; ratio: number; where: string };
const sceneHits: SceneHit[] = [];
for (const app of ['light', 'dark'] as const) for (const id of LIQUID_GLASS_THEME_IDS) for (const evening of [false, true]) {
  const t = homeSceneTokensForTheme(id, app, evening);
  const glowHex = evening ? t.eveningGlow : t.sceneGlow;
  const top = parse(t.sceneTop), bot = parse(t.sceneBottom), glow = parse(glowHex);
  const worst = new Map<SceneEl, SceneHit>();
  for (const W of [360, 390]) for (const bleed of [96, 124]) for (const sceneH of [700, 900]) {
    const H = bleed + sceneH;
    const shade = spireTopShadeAlpha({ top: t.sceneTop, bottom: t.sceneBottom, glow: glowHex, evening, bleed, sceneH }, W);
    for (const el of SCENE) for (let sy = el.y0; sy <= el.y1; sy += 2) for (let x = el.x0; x <= Math.min(el.x1, W - 20); x += 4) {
      const y = bleed + sy; // от верха экрана — так рисуется фон
      const gx0 = 0.22 * W, gx1 = 0.78 * W; const dx = gx1 - gx0, dy = H;
      const tt = Math.max(0, Math.min(1, ((x - gx0) * dx + y * dy) / (dx * dx + dy * dy)));
      let bg: Rgb = [0, 1, 2].map((i) => top[i]! * (1 - tt) + bot[i]! * tt) as Rgb;
      const cx = (evening ? 0.82 : 0.18) * W;
      bg = over(glow, Math.max(0, 1 - Math.hypot((x - cx) / (0.7 * W), y / Math.min(H, SPIRE_LIGHT_RY_FACTOR * (bleed + SPIRE_LIGHT_STAGE_H)))), bg);
      if (shade > 0) { const k = y <= bleed ? 1 : Math.max(0, 1 - (y - bleed) / SPIRE_SHADE_TAIL); bg = over([0, 0, 0, 1], shade * k, bg); }
      if (t.scrim) { const s = (y - (H - 300)) / 300; if (s > 0) bg = over([0, 0, 0, 1], 0.4 * s, bg); }
      for (const gl of el.glass) bg = over(parse(gl), 1, bg);
      const r = ratio(over(parse(el.fg), 1, bg), bg);
      const w = worst.get(el);
      if (!w || r < w.ratio) worst.set(el, { el, theme: id, app, ratio: r, where: `${evening ? 'вечер' : 'день'}, экран ${W}, шапка ${bleed}, сцена ${sceneH}, x ${x} y ${sy}` });
    }
  }
  sceneHits.push(...worst.values());
}

// ── часть 2: экраны вне сцены (useSpirePalette) ──
const SRC = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
// копия правил палитры Пика и тонов «верно/неверно»; скрипт падает, если исходник изменился
for (const [file, line] of [
  ['components/spire/useSpirePalette.ts', 'cta: g.ctaFill,'],
  ['components/spire/useSpirePalette.ts', "accentTextSafe: g.level === 'calm' ? g.text : g.accentTextSafe,"],
  ['constants/liquidGlassThemePalette.ts', 'const correctTone = legibleOn(t.good, t.text, semanticSurfaces(t.goodSoft), 4.55);'],
  ['constants/liquidGlassThemePalette.ts', 'const wrongTone = legibleOn(t.bad, t.text, semanticSurfaces(t.badSoft), 4.55);'],
  ['components/home/v2/HomeV2FeatureTiles.tsx', '<View testID="home-quick-tile-spire-place" style={[s.badge, { backgroundColor: g.ctaFill }]}>'],
] as const) if (!SRC(file).includes(line)) throw new Error(`исходник Пика изменился: в ${file} нет «${line}» — обнови копию в этом скрипте`);
type G = ReturnType<typeof liquidGlassTokens>;
type ScreenRole = { id: string; what: string; fg: string; bg: string; min: 4.5 | 3; pair: (g: G) => [string, string[]] };
const screen = (g: G): string => flattenOver(g.bg, '#000000');
const card = (g: G): string => flattenOver(g.opaqueCard, screen(g));
const control = (g: G): string => flattenOver(g.opaqueControl, screen(g));
const tones = (g: G): { correct: string; wrong: string; okSoft: string[]; badSoft: string[] } => {
  const surf = (soft: string): string[] => [g.opaqueCard, g.opaqueControl, flattenOver(soft, g.opaqueCard), flattenOver(soft, g.opaqueControl)];
  return { correct: legibleOn(g.good, g.text, surf(g.goodSoft), 4.55), wrong: legibleOn(g.bad, g.text, surf(g.badSoft), 4.55), okSoft: surf(g.goodSoft), badSoft: surf(g.badSoft) };
};
const SCREEN: ScreenRole[] = [
  { id: 'B1', what: 'Текст на фоне экрана (заголовки задания, итог недели)', fg: 'text', bg: 'bg', min: 4.5, pair: (g) => [g.text, [screen(g)]] },
  { id: 'B2', what: 'Вторичный текст на фоне', fg: 'secondary', bg: 'bg', min: 4.5, pair: (g) => [g.secondary, [screen(g)]] },
  { id: 'B3', what: 'Текст на карточке (card) и плитке (control)', fg: 'text', bg: 'opaqueCard / opaqueControl', min: 4.5, pair: (g) => [g.text, [card(g), control(g)]] },
  { id: 'B4', what: 'Вторичный текст на карточке и плитке', fg: 'secondary', bg: 'opaqueCard / opaqueControl', min: 4.5, pair: (g) => [g.secondary, [card(g), control(g)]] },
  { id: 'B5', what: 'Приглушённый текст (textMuted) на карточке и плитке', fg: 'mutedText', bg: 'opaqueCard / opaqueControl', min: 4.5, pair: (g) => [g.mutedText, [card(g), control(g)]] },
  { id: 'B6', what: 'Главная кнопка: подпись', fg: 'ctaFillInk', bg: 'ctaFill', min: 4.5, pair: (g) => [g.ctaFillInk, [g.ctaFill]] },
  { id: 'B7', what: 'Главная кнопка видна на фоне и на карточке', fg: 'ctaFill', bg: 'bg / opaqueCard', min: 3, pair: (g) => [g.ctaFill, [screen(g), card(g)]] },
  { id: 'B8', what: 'Акцентная подпись окон итога (accentTextSafe) на фоне и карточке', fg: 'accentTextSafe (calm: text)', bg: 'bg / opaqueCard', min: 4.5, pair: (g) => [g.level === 'calm' ? g.text : g.accentTextSafe, [screen(g), card(g)]] },
  { id: 'B9', what: 'Графика цвета темы: кольцо таймера, заливки поля пар', fg: 'accentGraphic', bg: 'bg / opaqueCard / opaqueControl', min: 3, pair: (g) => [g.accentGraphic, [screen(g), card(g), control(g)]] },
  { id: 'B10', what: '«Верно»: текст и значок на карточке, плитке и мягкой заливке', fg: 'correct (good, доведённый)', bg: 'card / control / goodSoft', min: 4.5, pair: (g) => { const t = tones(g); return [t.correct, t.okSoft.map((b) => flattenOver(b, screen(g)))]; } },
  { id: 'B11', what: '«Неверно»: текст и значок на карточке, плитке и мягкой заливке', fg: 'wrong (bad, доведённый)', bg: 'card / control / badSoft', min: 4.5, pair: (g) => { const t = tones(g); return [t.wrong, t.badSoft.map((b) => flattenOver(b, screen(g)))]; } },
  { id: 'B12', what: 'Главная: бейдж места «1 место» на плитке Пика', fg: 'ctaFillInk', bg: 'ctaFill', min: 4.5, pair: (g) => [g.ctaFillInk, [g.ctaFill]] },
  { id: 'B13', what: 'Главная: бейдж места виден на плитке', fg: 'ctaFill', bg: 'opaqueCard', min: 3, pair: (g) => [g.ctaFill, [card(g)]] },
];
type ScreenHit = { role: ScreenRole; theme: string; app: string; level: string; ratio: number };
const screenHits: ScreenHit[] = [];
for (const app of ['light', 'dark'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
  const g = liquidGlassTokens(id, { level, appearance: app } as never);
  for (const r of SCREEN) { const [fg, bgs] = r.pair(g); screenHits.push({ role: r, theme: id, app, level, ratio: Math.min(...bgs.map((b) => contrastRatio(flattenOver(fg, b), b))) }); }
}

console.log('## Сцена Пика\n');
console.log('| № | Элемент | Порог | Минимум | Где минимум | Нарушений (тема × оформление) |');
console.log('|---|---|---|---|---|---|');
for (const el of SCENE) {
  const hs = sceneHits.filter((h) => h.el === el); const w = hs.reduce((a, b) => (b.ratio < a.ratio ? b : a)); const bad = hs.filter((h) => h.ratio < el.min);
  console.log(`| ${el.id} | ${el.what} | ${f2(el.min)} | ${f2(w.ratio)} | ${w.theme} · ${ap(w.app)} · ${w.where} | ${bad.length ? `**${bad.length} из ${hs.length}**` : `0 из ${hs.length}`} |`);
}
console.log('\n## Экраны Пика вне сцены\n');
console.log('| № | Элемент | Цвет | Фон | Порог | Минимум | Где минимум | Нарушений |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of SCREEN) {
  const hs = screenHits.filter((h) => h.role === r); const w = hs.reduce((a, b) => (b.ratio < a.ratio ? b : a)); const n = hs.filter((h) => h.ratio < r.min).length;
  console.log(`| ${r.id} | ${r.what} | \`${r.fg}\` | ${r.bg} | ${f2(r.min)} | ${f2(w.ratio)} | ${w.theme} · ${ap(w.app)} · ${w.level} | ${n ? `**${n} из ${hs.length}**` : `0 из ${hs.length}`} |`);
}
console.log('\nНАРУШЕНИЯ');
for (const el of SCENE) { const b = sceneHits.filter((h) => h.el === el && h.ratio < el.min); if (b.length) console.log(`${el.id}: ${b.map((h) => `${h.theme}/${ap(h.app)} ${f2(h.ratio)} (${h.where})`).join('; ')}`); }
for (const r of SCREEN) { const b = screenHits.filter((h) => h.role === r && h.ratio < r.min); if (b.length) console.log(`${r.id}: ${b.length} — ${b.slice(0, 30).map((h) => `${h.theme}/${ap(h.app)}/${h.level} ${f2(h.ratio)}`).join('; ')}`); }
console.log('\nВСЕГО: сцена', sceneHits.length, 'худших точек, нарушений', sceneHits.filter((h) => h.ratio < h.el.min).length, '; экраны', screenHits.length, 'пар, нарушений', screenHits.filter((h) => h.ratio < h.role.min).length);
