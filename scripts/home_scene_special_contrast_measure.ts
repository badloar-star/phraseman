// Запуск: npx tsx scripts/home_scene_special_contrast_measure.ts > out.md
// зачем (координатор 25.10): 12 особых сцен Главной (Моменты) рисуются той же сценой HomeSceneStage — белый текст прямо
// на градиенте сцены, белая кнопка, у «личного рекорда» полоска. Сцена всегда на уровне «Максимум» (homeSceneTokensForTheme),
// поэтому 174 сочетания (29 тем × светлая/тёмная × 3 уровня) сводятся к 58 разным: уровень сцену не меняет.
// Вечера у особых сцен нет (вечер — только streak_risk, а он срочный и особую сцену не пускает).
// Фон считается ПО ГЕОМЕТРИИ HomeSceneStage: текст стоит у нижнего края (paddingBottom 44, кнопка 50 + 16, строка 17 + 10,
// заголовок 36 или 2×32, надзаголовок 17), фон под ним = линейный градиент верх→низ (0,22·W;0 → 0,78·W;H) + пятно света
// sceneGlow (центр 18 %·W;0, радиусы 70 %·W × 50 %·H) + ореол героя (белый 22 %, центр 57 %·W+84; inset+52+84, радиус 84,
// только при обычном шрифте) + затемнение низа scrim (0→40 % на нижних 300), если оно есть у темы.
// Перемер 25.10 (после e3b3c313e, 3a42a7e8f, a796ac60e, fdd62974d, d6dec448b): надзаголовок теперь белый 100 %; ореол при
// крупном шрифте не рисуется; добавлен АРТ ГЕРОЯ по самой светлой зоне под текстом — при шрифте ≤ ×1,15 герой (160 dp,
// right −14, верх inset+52, поля 10, непрозрачность 0,96) заходит на надзаголовок и заголовок; при шрифте > ×1,15 (heroBounded)
// герой уходит в свободное место над текстом. Картинки — настоящие home_scene_<state>.webp обеих яркостей (яркость = оформление).
// Худшее по каждой строке текста на сетке 4×2 dp, для экранов 360 и 390 dp, сцены 392 dp (минимум), отступа сверху 0 и 48,
// системного шрифта ×1, ×1,15 и ×1,2. Пороги: текст 4,5, полоска и значки (графика) 3,0.
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { HOME_SCENE_HERO } from '../components/home/v2/scene/home_scene_state';

const STAGE = fs.readFileSync(path.join(__dirname, '..', 'components/home/v2/scene/HomeSceneStage.tsx'), 'utf8');
for (const line of [
  "kicker: { color: '#FFFFFF', fontSize: 13, lineHeight: 17 },",
  "line: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 17,",
  "bar: { width: 72, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)'",
  "ctaText: { color: '#121318',",
  "backgroundColor: '#FFFFFF', flexDirection: 'row'",
  'const CTA_PREP_FILL = colorWithAlpha(CTA_INK, 0.09);',
  'const HERO_BOUND_FONT_SCALE = 1.15;',
  "hero: { position: 'absolute', right: -14, top: HERO_TOP - TOP_SPACE, width: HERO, height: HERO },",
  "heroVisual: { width: '100%', height: '100%', padding: HERO_PAD, opacity: 0.96 },",
  '{heroBounded ? null : <Rect x="57%" y={topInset + HERO_TOP} width={168} height={168} fill="url(#sceneHalo)" />}',
]) if (!STAGE.includes(line)) throw new Error(`HomeSceneStage изменился: нет «${line}» — обнови модель сцены в этом скрипте`);

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
const INK: Rgb = [18, 19, 24]; // ctaText #121318 (сторож выше)

type Line = { id: string; what: string; fg: Rgba; graphic?: boolean };
const KICKER: Line = { id: 'S1', what: 'Надзаголовок, белый', fg: WHITE };
const TITLE: Line = { id: 'S2', what: 'Заголовок, белый', fg: WHITE };
const LINE: Line = { id: 'S3', what: 'Строка под заголовком, белый 88 %', fg: [255, 255, 255, 0.88] };
const BAR: Line = { id: 'S4', what: 'Полоска рекорда: белая заливка на дорожке 28 %', fg: WHITE, graphic: true };
const LINES = [KICKER, TITLE, LINE, BAR];
function boxes(H: number, longTitle: boolean, k: number): { line: Line; y0: number; y1: number; x1: number }[] {
  let y = H - 44 - 50 * k - 16;
  const lineBox = { line: LINE, y0: y - 17 * k, y1: y, x1: 0.9 }; y -= 17 * k + 10;
  const titleH = (longTitle ? 64 : 36) * k;
  const titleBox = { line: TITLE, y0: y - titleH, y1: y, x1: 0.95 }; y -= titleH + 4;
  const kickerBox = { line: KICKER, y0: y - 17 * k, y1: y, x1: 0.8 };
  return [kickerBox, titleBox, lineBox, { line: BAR, y0: lineBox.y0 + 6, y1: lineBox.y0 + 10, x1: 0.24 }];
}

// арт героя: 140×140 (160 − поля 10×2), contain по центру, прозрачность картинки × 0,96
const ART_SIDE = 140;
type Art = { state: string; px: Buffer };
async function loadArts(tone: 'light' | 'dark'): Promise<Art[]> {
  const out: Art[] = [];
  for (const [state, hero] of Object.entries(HOME_SCENE_HERO)) {
    const file = path.join(__dirname, '..', 'assets/images/v2art', tone, `${hero.file}.webp`);
    if (!fs.existsSync(file)) throw new Error(`нет картинки героя: ${file}`);
    const px = await sharp(file).resize(ART_SIDE, ART_SIDE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer();
    out.push({ state, px });
  }
  return out;
}
const artAt = (a: Art, ix: number, iy: number): Rgba | null => {
  if (ix < 0 || iy < 0 || ix >= ART_SIDE || iy >= ART_SIDE) return null;
  const o = (iy * ART_SIDE + ix) * 4; const al = a.px[o + 3]! / 255;
  return al > 0 ? [a.px[o]!, a.px[o + 1]!, a.px[o + 2]!, al * 0.96] : null;
};

type Hit = { line: Line; theme: string; app: string; ratio: number; where: string };
async function main(): Promise<void> {
  const arts = { light: await loadArts('light'), dark: await loadArts('dark') };
  const all: Hit[] = []; const allArt: Hit[] = [];
  // зачем: сколько героя можно оставить под текстом, чтобы белый держал 4,5 — ответ для маски «герой гаснет над текстом»
  const fade: { theme: string; app: string; alpha: number; where: string; share: number }[] = [];
  for (const app of ['light', 'dark'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
    const t = homeSceneTokensForTheme(id, app, false);
    const top = parse(t.sceneTop), bot = parse(t.sceneBottom), glow = parse(t.sceneGlow);
    const worst = new Map<Line, Hit>(); const worstArt = new Map<Line, Hit>();
    let maxAlpha = 1, maxAlphaWhere = '', onArt = 0, onArtBad = 0;
    for (const W of [360, 390]) for (const inset of [0, 48]) for (const longTitle of [false, true]) for (const k of [1, 1.15, 1.2]) {
      const H = 392 + inset; const bounded = k > 1.15;
      const artX0 = W + 14 - 160 + 10, artY0 = inset + 52 + 10;
      for (const b of boxes(H, longTitle, k)) for (let y = b.y0; y <= b.y1; y += 2) for (let x = 20; x <= 20 + (W - 40) * b.x1; x += 4) {
        const gx0 = 0.22 * W, gx1 = 0.78 * W; const dx = gx1 - gx0, dy = H;
        const tt = Math.max(0, Math.min(1, ((x - gx0) * dx + y * dy) / (dx * dx + dy * dy)));
        let bg: Rgb = [0, 1, 2].map((i) => top[i]! * (1 - tt) + bot[i]! * tt) as Rgb;
        const dg = Math.hypot((x - 0.18 * W) / (0.7 * W), y / (0.5 * H)); bg = over(glow, Math.max(0, 1 - dg), bg);
        if (!bounded) { const dh = Math.hypot(x - (0.57 * W + 84), y - (inset + 52 + 84)) / 84; bg = over(WHITE, 0.22 * Math.max(0, 1 - dh), bg); }
        if (t.scrim) { const s = (y - (H - 300)) / 300; if (s > 0) bg = over([0, 0, 0, 1], 0.4 * s, bg); }
        const where = `экран ${W}, отступ ${inset}, ${longTitle ? 'длинный' : 'короткий'} заголовок, шрифт ×${k}, x ${Math.round(x)} y ${Math.round(y)}`;
        const back: Rgb = b.line.graphic ? over(WHITE, 0.28, bg) : bg;
        const r = ratio(over(b.line.fg, 1, back), back);
        const w = worst.get(b.line);
        if (!w || r < w.ratio) worst.set(b.line, { line: b.line, theme: id, app, ratio: r, where });
        // арт героя под этой точкой текста (полоска рекорда у левого края — героя под ней нет)
        if (bounded || b.line.graphic) continue;
        for (const a of arts[app]) {
          const p = artAt(a, Math.floor(x - artX0), Math.floor(y - artY0)); if (!p) continue;
          const artBg = over(p, 1, bg); const ra = ratio(over(b.line.fg, 1, artBg), artBg);
          onArt++; if (ra < 4.5) onArtBad++;
          if (ra < 4.5) { let lo = 0, hi = p[3]; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; const bb = over([p[0], p[1], p[2], m], 1, bg); if (ratio(over(b.line.fg, 1, bb), bb) >= 4.5) lo = m; else hi = m; }
            const need = lo / 0.96; if (need < maxAlpha) { maxAlpha = need; maxAlphaWhere = `${where}, герой ${a.state}`; } }
          const wa = worstArt.get(b.line);
          if (!wa || ra < wa.ratio) worstArt.set(b.line, { line: b.line, theme: id, app, ratio: ra, where: `${where}, герой ${a.state}` });
        }
      }
    }
    all.push(...worst.values()); allArt.push(...worstArt.values());
    fade.push({ theme: id, app, alpha: maxAlpha, where: maxAlphaWhere, share: onArt ? onArtBad / onArt : 0 });
  }
  const f2 = (n: number): string => n.toFixed(2).replace('.', ',');
  const ap = (a: string): string => (a === 'light' ? 'светлая' : 'тёмная');
  const table = (title: string, hits: Hit[], lines: Line[]): void => {
    console.log(`\n### ${title}\n`);
    console.log('| № | Элемент | Порог | Минимум | Где минимум | Нарушений (тема × оформление) |');
    console.log('|---|---|---|---|---|---|');
    for (const line of lines) {
      const hs = hits.filter((h) => h.line === line); if (!hs.length) continue; const min = line.graphic ? 3 : 4.5;
      const w = hs.reduce((a, b) => (b.ratio < a.ratio ? b : a)); const bad = hs.filter((h) => h.ratio < min);
      console.log(`| ${line.id} | ${line.what} | ${f2(min)} | ${f2(w.ratio)} | ${w.theme} · ${ap(w.app)} · ${w.where} | ${bad.length ? `**${bad.length} из 58**` : '0 из 58'} |`);
    }
  };
  table('Сцена без героя (градиент, свет, ореол, затемнение)', all, LINES);
  table('Текст поверх героя (самая светлая точка картинки под текстом, шрифт ≤ ×1,15)', allArt, [KICKER, TITLE, LINE]);
  // кнопка сцены одна во всех темах: белая заливка, подпись и значок #121318; «Готовим занятие…» — ход 9 % чернил внутри белой кнопки
  const prep = over([...INK, 0.09] as Rgba, 1, [255, 255, 255]);
  console.log('\n### Кнопка сцены и «Готовим занятие…» (одинаковы во всех темах)\n');
  console.log('| № | Элемент | Порог | Значение |');
  console.log('|---|---|---|---|');
  console.log(`| S5 | Подпись кнопки #121318 на белом | 4,50 | ${f2(ratio(INK, [255, 255, 255]))} |`);
  console.log(`| S6 | Значок «играть» #121318 на белом | 3,00 | ${f2(ratio(INK, [255, 255, 255]))} |`);
  console.log(`| S7 | «Готовим занятие…»: подпись на ходе 9 % | 4,50 | ${f2(ratio(INK, prep))} |`);
  console.log(`| S8 | «Готовим занятие…»: дуга кольца на ходе 9 % | 3,00 | ${f2(ratio(INK, prep))} |`);
  console.log(`| S9 | «Готовим занятие…»: ход 9 % к белой кнопке (тон, не текст) | — | ${f2(ratio(prep, [255, 255, 255]))} |`);
  console.log('\n### Сколько героя можно оставить под текстом (непрозрачность картинки в полосе текста)\n');
  console.log('| Оформление | Нужно не больше | Худшая тема | Где | Доля точек текста на герое ниже 4,5 |');
  console.log('|---|---|---|---|---|');
  for (const app of ['light', 'dark'] as const) { const fs2 = fade.filter((f) => f.app === app); const w = fs2.reduce((a, b) => (b.alpha < a.alpha ? b : a)); const sh = Math.max(...fs2.map((f) => f.share));
    console.log(`| ${ap(app)} | ${Math.round(w.alpha * 100)} % | ${w.theme} | ${w.where} | до ${Math.round(sh * 100)} % |`); }
  console.log('\nНАРУШЕНИЯ');
  for (const [name, hits] of [['сцена', all], ['герой', allArt]] as const) for (const line of LINES) {
    const min = line.graphic ? 3 : 4.5; const bad = hits.filter((h) => h.line === line && h.ratio < min);
    if (bad.length) console.log(`${name} ${line.id}: ${bad.map((h) => `${h.theme}/${ap(h.app)} ${f2(h.ratio)} (${h.where})`).join('; ')}`);
  }
  const n = [...all, ...allArt].filter((h) => h.ratio < (h.line.graphic ? 3 : 4.5)).length;
  console.log('\nВСЕГО', all.length + allArt.length, 'худших точек, нарушений', n);
}
main().catch((e: unknown) => { console.error('[HOME-SCENE-CONTRAST] замер упал:', e); process.exit(1); });
