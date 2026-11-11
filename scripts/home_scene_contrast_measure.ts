// Запуск: npx tsx scripts/home_scene_contrast_measure.ts
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { HOME_SCENE_INK } from '../components/home/v2/scene/home_scene_ink';
import { homeSceneWarmTone } from '../components/home/v2/scene/home_scene_warm_tone';

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
// проекция точки на ось градиента (s → e) в долях 0…1
const along = (x: number, y: number, sx: number, sy: number, ex: number, ey: number): number => { const dx = ex - sx, dy = ey - sy; return Math.max(0, Math.min(1, ((x - sx) * dx + (y - sy) * dy) / (dx * dx + dy * dy))); };

// копии значений экранов: скрипт падает, если исходник изменился
const SRC = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
for (const [file, line] of [
  ['components/home/v2/scene/HomeSceneStage.tsx', 'kicker: { color: HOME_SCENE_INK.kicker'],
  ['components/home/v2/scene/HomeSceneStage.tsx', 'title: { color: HOME_SCENE_INK.text'],
  ['components/home/v2/scene/HomeSceneStage.tsx', 'line: { color: HOME_SCENE_INK.line'],
  ['components/home/v2/scene/HomeSceneStage.tsx', 'note: { color: HOME_SCENE_INK.note'],
] as const) if (!SRC(file).includes(line)) throw new Error(`исходник изменился: в ${file} нет «${line}» — обнови копию в этом скрипте`);

type El = { id: string; what: string; fg: string; under: (dark: boolean) => string[]; x0: number; x1: number; y0: number; y1: number; min: 4.5 | 3 };
type Hit = { el: El; theme: string; app: string; ratio: number; where: string };
const report = (title: string, els: El[], hits: Hit[], total: number): void => {
  console.log(`\n## ${title}\n`);
  console.log('| № | Элемент | Порог | Минимум | Где минимум | Нарушений (тема × оформление) |');
  console.log('|---|---|---|---|---|---|');
  for (const el of els) {
    const hs = hits.filter((h) => h.el === el); const w = hs.reduce((a, b) => (b.ratio < a.ratio ? b : a)); const bad = hs.filter((h) => h.ratio < el.min);
    console.log(`| ${el.id} | ${el.what} | ${f2(el.min)} | ${f2(w.ratio)} | ${w.theme} · ${ap(w.app)} · ${w.where} | ${bad.length ? `**${bad.length} из ${total}**` : `0 из ${total}`} |`);
  }
};
const keepWorst = (map: Map<El, Hit>, el: El, theme: string, app: string, r: number, where: string): void => { const w = map.get(el); if (!w || r < w.ratio) map.set(el, { el, theme, app, ratio: r, where }); };

// Обычные сцены Главной
// строки снизу вверх при полном наборе (заголовок длинный, огонёк, строка, кнопка, чипы, подпись): самое высокое положение текста
type HomeEl = El & { line: string };
const HOME: HomeEl[] = [
  { id: 'H1', what: 'Надзаголовок', line: 'kicker', fg: HOME_SCENE_INK.kicker, under: () => [], x0: 20, x1: 300, y0: 0, y1: 0, min: 4.5 },
  { id: 'H2', what: 'Заголовок, белый', line: 'title', fg: HOME_SCENE_INK.text, under: () => [], x0: 20, x1: 350, y0: 0, y1: 0, min: 4.5 },
  { id: 'H3', what: 'Огонёк серии / ноль энергии (светлый оттенок темы)', line: 'warm', fg: 'warm', under: () => [], x0: 20, x1: 260, y0: 0, y1: 0, min: 4.5 },
  { id: 'H4', what: 'Строка под заголовком (белый 88 %)', line: 'line', fg: HOME_SCENE_INK.line, under: () => [], x0: 20, x1: 300, y0: 0, y1: 0, min: 4.5 },
  { id: 'H6', what: 'Подпись внизу (note, белый 86 %)', line: 'note', fg: HOME_SCENE_INK.note, under: () => [], x0: 20, x1: 340, y0: 0, y1: 0, min: 4.5 },
];
// зачем: строки по состояниям home_scene_copy.ts — обычные (надзаголовок, заголовок, строка, кнопка), «серия под угрозой» (вечер:
// надзаголовок, заголовок, огонёк, кнопка), «нет энергии» (день: надзаголовок, заголовок, строка, подпись, без кнопки). Чипы сейчас
// не показываются ни в одном состоянии (chips всегда []), поэтому в замер не входят. Сцена растёт под текстом (minHeight 392):
// текст не поднимается выше места под шапкой (topSpace 52 + отступ тела 24).
type HomeState = { name: string; evening: boolean; lines: string[] };
const HOME_STATES: HomeState[] = [
  { name: 'обычная', evening: false, lines: ['kicker', 'title', 'line', 'cta'] },
  { name: 'серия под угрозой', evening: true, lines: ['kicker', 'title', 'warm', 'cta'] },
  { name: 'нет энергии', evening: false, lines: ['kicker', 'title', 'line', 'note'] },
];
const LINE_H: Record<string, [number, number]> = { note: [17, 12], cta: [50, 16], line: [17, 10], warm: [21, 8], title: [64, 4], kicker: [17, 0] };
function homeBoxes(base: number, inset: number, k: number, st: HomeState): Record<string, [number, number]> {
  const order = ['note', 'cta', 'line', 'warm', 'title', 'kicker'].filter((n) => st.lines.includes(n));
  const body = 44 + order.reduce((sum, n) => sum + LINE_H[n]![0] * k + LINE_H[n]![1], 0);
  const H = Math.max(base, inset + 52 + 24 + body);
  let y = H - 44; const b: Record<string, [number, number]> = { H: [H, H] };
  for (const n of order) { b[n] = [y - LINE_H[n]![0] * k, y]; y -= LINE_H[n]![0] * k + LINE_H[n]![1]; }
  return b;
}
const homeHits: Hit[] = [];
for (const app of ['light', 'dark'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
  const g = liquidGlassTokens(id, { level: 'max', appearance: app } as never);
  const warm = homeSceneWarmTone(g.accent);
  const worst = new Map<El, Hit>();
  for (const st of HOME_STATES) {
    const evening = st.evening;
    const t = homeSceneTokensForTheme(id, app, evening);
    const top = parse(t.sceneTop), bot = parse(t.sceneBottom), glow = parse(evening ? t.eveningGlow : t.sceneGlow), ember = parse(t.sceneEmber);
    for (const W of [360, 390]) for (const inset of [0, 48]) for (const k of [1, 1.2]) {
      const boxes = homeBoxes(392 + inset, inset, k, st); const H = boxes.H![0];
      for (const el of HOME) {
        if (!boxes[el.line]) continue;
        const [y0, y1] = boxes[el.line]!;
        for (let y = Math.round(y0); y <= y1; y += 2) for (let x = el.x0; x <= Math.min(el.x1, W - 20); x += 4) {
          let bg: Rgb = (() => { const tt = along(x, y, 0.22 * W, 0, 0.78 * W, H); return [0, 1, 2].map((i) => top[i]! * (1 - tt) + bot[i]! * tt) as Rgb; })();
          const cx = (evening ? 0.82 : 0.18) * W;
          bg = over(glow, Math.max(0, 1 - Math.hypot((x - cx) / (0.7 * W), y / (0.5 * H))), bg);
          if (k <= 1.15) { /* при крупном шрифте герой поднят над текстом, ореол остаётся — считаем его всегда */ }
          bg = over([255, 255, 255, 1], 0.22 * Math.max(0, 1 - Math.hypot(x - (0.57 * W + 84), y - (inset + 52 + 84)) / 84), bg);
          if (evening) bg = over(ember, Math.max(0, 1 - Math.hypot(x - 90, y - (H - 70)) / 130), bg);
          if (t.scrim) { const s = (y - (H - 300)) / 300; if (s > 0) bg = over([0, 0, 0, 1], 0.4 * s, bg); }
          for (const u of el.under(!g.isLight)) bg = over(parse(u), 1, bg);
          const fg = el.fg === 'warm' ? warm.flame : el.fg;
          keepWorst(worst, el, id, app, ratio(over(parse(fg), 1, bg), bg), `${st.name}, экран ${W}, отступ ${inset}, шрифт ×${k}, x ${x} y ${Math.round(y)}`);
          if (el.fg === 'warm') keepWorst(worst, el, id, app, ratio(over(parse(warm.low), 1, bg), bg), `ноль энергии, ${evening ? 'вечер' : 'день'}, экран ${W}, шрифт ×${k}`);
        }
      }
    }
  }
  homeHits.push(...worst.values());
}

console.log('# Главная: контраст во всех темах');
report('Обычные сцены Главной (обычная, «серия под угрозой» вечером, «нет энергии»; экран 360/390, отступ 0/48, шрифт ×1/×1,2)', HOME, homeHits, 58);
console.log('\nНАРУШЕНИЯ');
for (const el of HOME) {
  const b = homeHits.filter((h) => h.el === el && h.ratio < el.min); if (b.length) console.log(`${el.id}: ${b.map((h) => `${h.theme}/${ap(h.app)} ${f2(h.ratio)} (${h.where})`).join('; ')}`);
}
