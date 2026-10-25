// Запуск: npx tsx scripts/home_scene_special_contrast_measure.ts > out.md
// зачем (координатор 25.10): 12 особых сцен Главной (Моменты) рисуются той же сценой HomeSceneStage — белый текст прямо
// на градиенте сцены, белая кнопка, у «личного рекорда» полоска. Сцена всегда на уровне «Максимум» (homeSceneTokensForTheme);
// вечера у особых сцен нет (вечер — только streak_risk, а он срочный и особую сцену не пускает).
// Фон считается ПО ГЕОМЕТРИИ HomeSceneStage, а не в худшей точке сцены: текст стоит у нижнего края (paddingBottom 44,
// кнопка 50 + 16, строка 17 + 10, заголовок 36 или 2×32, надзаголовок 17), фон под ним = линейный градиент верх→низ
// (0,22·W;0 → 0,78·W;H) + пятно света sceneGlow (центр 18 %·W;0, радиусы 70 %·W × 50 %·H) + ореол героя (белый 22 %,
// центр 57 %·W+84; inset+52+84, радиус 84) + затемнение низа scrim (0→40 % на нижних 300), если оно есть у темы.
// Худшее по каждой строке текста на сетке 4×2 dp, для экранов 360 и 390 dp, сцены 392 dp (минимум), отступа сверху 0 и 48,
// системного шрифта ×1 и ×1,2 (крупнее — сцена растёт сама, home_scene_fit).
// Порог: текст 4,5, полоска (графика) 3,0.
import { LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';

type Rgba = [number, number, number, number];
const parse = (c: string): Rgba => {
  const h = c.trim().match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (h) { const n = parseInt(h[1]!, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, h[2] ? parseInt(h[2], 16) / 255 : 1]; }
  const r = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (r) return [Number(r[1]), Number(r[2]), Number(r[3]), r[4] === undefined ? 1 : Number(r[4])];
  throw new Error(`цвет не разобран: ${c}`);
};
type Rgb = [number, number, number];
const over = (top: Rgba, alpha: number, base: Rgb): Rgb => { const a = top[3] * alpha; return [0, 1, 2].map((i) => top[i]! * a + base[i]! * (1 - a)) as Rgb; };
const lin = (v: number): number => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
const lum = (c: Rgb): number => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a: Rgb, b: Rgb): number => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const WHITE: Rgba = [255, 255, 255, 1];

// строки текста снизу вверх: [имя, высота строки, отступ над ней]; кнопка с отступом 16 и низ 44 — под текстом
type Line = { id: string; what: string; fg: Rgba; graphic?: boolean };
const KICKER: Line = { id: 'S1', what: 'Надзаголовок, белый 86 %', fg: [255, 255, 255, 0.86] };
const TITLE: Line = { id: 'S2', what: 'Заголовок, белый', fg: WHITE };
const LINE: Line = { id: 'S3', what: 'Строка под заголовком, белый 88 %', fg: [255, 255, 255, 0.88] };
const BAR: Line = { id: 'S4', what: 'Полоска рекорда: белая заливка на дорожке 28 %', fg: WHITE, graphic: true };
function boxes(H: number, longTitle: boolean, k: number): { line: Line; y0: number; y1: number; x1: number }[] {
  let y = H - 44 - 50 * k - 16;
  const lineBox = { line: LINE, y0: y - 17 * k, y1: y, x1: 0.9 }; y -= 17 * k + 10;
  const titleH = (longTitle ? 64 : 36) * k;
  const titleBox = { line: TITLE, y0: y - titleH, y1: y, x1: 0.95 }; y -= titleH + 4;
  const kickerBox = { line: KICKER, y0: y - 17 * k, y1: y, x1: 0.8 };
  return [kickerBox, titleBox, lineBox, { line: BAR, y0: lineBox.y0 + 6, y1: lineBox.y0 + 10, x1: 0.24 }];
}
type Hit = { line: Line; theme: string; app: string; ratio: number; where: string };
const all: Hit[] = [];
for (const app of ['light', 'dark'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
  const t = homeSceneTokensForTheme(id, app, false);
  const top = parse(t.sceneTop), bot = parse(t.sceneBottom), glow = parse(t.sceneGlow);
  const worst = new Map<Line, Hit>();
  for (const W of [360, 390]) for (const inset of [0, 48]) for (const longTitle of [false, true]) for (const k of [1, 1.2]) {
    const H = 392 + inset;
    for (const b of boxes(H, longTitle, k)) for (let y = b.y0; y <= b.y1; y += 2) for (let x = 20; x <= 20 + (W - 40) * b.x1; x += 4) {
      const gx0 = 0.22 * W, gx1 = 0.78 * W; const dx = gx1 - gx0, dy = H;
      const tt = Math.max(0, Math.min(1, ((x - gx0) * dx + y * dy) / (dx * dx + dy * dy)));
      let bg: Rgb = [0, 1, 2].map((i) => top[i]! * (1 - tt) + bot[i]! * tt) as Rgb;
      const dg = Math.hypot((x - 0.18 * W) / (0.7 * W), y / (0.5 * H)); bg = over(glow, Math.max(0, 1 - dg), bg);
      const dh = Math.hypot(x - (0.57 * W + 84), y - (inset + 52 + 84)) / 84; bg = over(WHITE, 0.22 * Math.max(0, 1 - dh), bg);
      if (t.scrim) { const s = (y - (H - 300)) / 300; if (s > 0) bg = over([0, 0, 0, 1], 0.4 * s, bg); }
      const back: Rgb = b.line.graphic ? over(WHITE, 0.28, bg) : bg;
      const r = ratio(over(b.line.fg, 1, back), back);
      const w = worst.get(b.line);
      if (!w || r < w.ratio) worst.set(b.line, { line: b.line, theme: id, app, ratio: r, where: `экран ${W}, отступ ${inset}, ${longTitle ? 'длинный' : 'короткий'} заголовок, шрифт ×${k}, x ${Math.round(x)} y ${Math.round(y)}` });
    }
  }
  all.push(...worst.values());
}
const f2 = (n: number): string => n.toFixed(2).replace('.', ',');
const ap = (a: string): string => (a === 'light' ? 'светлая' : 'тёмная');
console.log('| № | Элемент | Порог | Минимум | Где минимум | Нарушений (тема × оформление) |');
console.log('|---|---|---|---|---|---|');
for (const line of [KICKER, TITLE, LINE, BAR]) {
  const hs = all.filter((h) => h.line === line); const min = line.graphic ? 3 : 4.5;
  const w = hs.reduce((a, b) => (b.ratio < a.ratio ? b : a)); const bad = hs.filter((h) => h.ratio < min);
  console.log(`| ${line.id} | ${line.what} | ${f2(min)} | ${f2(w.ratio)} | ${w.theme} · ${ap(w.app)} · ${w.where} | ${bad.length ? `**${bad.length} из 58**` : '0 из 58'} |`);
}
console.log('| S5 | Кнопка: подпись #121318 на белом | 4,50 | ' + f2(ratio([18, 19, 24], [255, 255, 255])) + ' | одна во всех темах | 0 из 58 |');
console.log('\nНАРУШЕНИЯ');
for (const line of [KICKER, TITLE, LINE, BAR]) {
  const min = line.graphic ? 3 : 4.5; const bad = all.filter((h) => h.line === line && h.ratio < min);
  if (bad.length) console.log(`${line.id}: ${bad.map((h) => `${h.theme}/${ap(h.app)} ${f2(h.ratio)} (${h.where})`).join('; ')}`);
}
console.log('\nВСЕГО', all.length, 'худших точек, нарушений', all.filter((h) => h.ratio < (h.line.graphic ? 3 : 4.5)).length);
