// Запуск: npx tsx scripts/season_home_contrast_measure.ts > out.md
// зачем (координатор 25.10, после находки на Пике): тот же замер для Сезона (обложка урока, карточки эпизодов, экран урока на токенах)
// и обычных сцен Главной (не особых: с вечером, огоньком серии, чипами и подписью) — где свет сцены может ложиться на текст.
// Фон считается так же, как его рисует код:
//   Сезон (SeasonCourseView / SeasonCardFace): линейный градиент from → to (0,33;0 → 0,67;1), свет glow линейно от (1;0) к прозрачному
//   в (0,35;0,6), на обложке — затемнение низа (чёрный 0 → 36 % на нижних 320 dp). Цвета — seasonThemedArt(оттенок акцента темы, глава, эпизод).
//   Главная (HomeSceneStage): градиент sceneTop → sceneBottom, свет sceneGlow (день, слева) или eveningGlow (вечер, справа),
//   ореол героя, угли вечера sceneEmber (низ слева), затемнение низа scrim.
// Положения строк — по стилям экранов и снимкам Сверки (модель, итог подтверждать снимками). Порог: текст 4,5, графика 3,0.
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { homeSceneWarmTone } from '../components/home/v2/scene/home_scene_warm_tone';
import { hexHue, seasonThemedArt } from '../components/learning-v2/season/season_art';

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
  ['components/learning-v2/season/SeasonCourseView.tsx', "const PILL = 'rgba(255,255,255,0.16)';"],
  ['components/learning-v2/season/SeasonCourseView.tsx', "const PILL_ON_LIGHT = 'rgba(0,0,0,0.18)';"],
  ['components/learning-v2/season/SeasonCourseView.tsx', "const SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.36)'] as const;"],
  ['components/learning-v2/season/SeasonCourseView.tsx', "<LinearGradient colors={[heroArt.glow, 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.6 }}"],
  ['components/learning-v2/season/SeasonCardFace.tsx', "const CHIP = 'rgba(0,0,0,0.24)';"],
  ['components/learning-v2/season/SeasonCardFace.tsx', "const TRACK = 'rgba(255,255,255,0.26)';"],
  ['components/home/v2/scene/HomeSceneStage.tsx', "chip: { minHeight: 34, paddingVertical: 4, maxWidth: '100%', borderRadius: 17, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.14)' }"],
] as const) if (!SRC(file).includes(line)) throw new Error(`исходник изменился: в ${file} нет «${line}» — обнови копию в этом скрипте`);

type El = { id: string; what: string; fg: string; under: (dark: boolean) => string[]; x0: number; x1: number; y0: number; y1: number; min: 4.5 | 3 };
type Hit = { el: El; theme: string; app: string; ratio: number; where: string };
const W_ = '#FFFFFF';
const report = (title: string, els: El[], hits: Hit[], total: number): void => {
  console.log(`\n## ${title}\n`);
  console.log('| № | Элемент | Порог | Минимум | Где минимум | Нарушений (тема × оформление) |');
  console.log('|---|---|---|---|---|---|');
  for (const el of els) {
    const hs = hits.filter((h) => h.el === el); const w = hs.reduce((a, b) => (b.ratio < a.ratio ? b : a)); const bad = hs.filter((h) => h.ratio < el.min);
    console.log(`| ${el.id} | ${el.what} | ${f2(el.min)} | ${f2(w.ratio)} | ${w.theme} · ${ap(w.app)} · ${w.where} | ${bad.length ? `**${bad.length} из ${total}**` : `0 из ${total}`} |`);
  }
};
const failures: string[] = [];
const keepWorst = (map: Map<El, Hit>, el: El, theme: string, app: string, r: number, where: string): void => { const w = map.get(el); if (!w || r < w.ratio) map.set(el, { el, theme, app, ratio: r, where }); };

// ── 1. обложка Сезона ──
const HERO_H = 354;
const HERO: El[] = [
  { id: 'S1', what: 'Пилюля «Урок N»: белый на стекле', fg: W_, under: (d) => [d ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.18)'], x0: 20, x1: 150, y0: 52, y1: 88, min: 4.5 },
  { id: 'S2', what: 'Надзаголовок обложки (белый 86 %)', fg: 'rgba(255,255,255,0.86)', under: () => [], x0: 19, x1: 220, y0: 205, y1: 222, min: 4.5 },
  { id: 'S3', what: 'Название урока, белый', fg: W_, under: () => [], x0: 19, x1: 340, y0: 224, y1: 256, min: 4.5 },
  { id: 'S4', what: 'Плитки «Слова / Теория»: белый на стекле', fg: W_, under: (d) => [d ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.18)'], x0: 231, x1: 368, y0: 267, y1: 311, min: 4.5 },
  { id: 'S5', what: 'Строка эпизода у полоски (белый 86 %)', fg: 'rgba(255,255,255,0.86)', under: () => [], x0: 90, x1: 200, y0: 325, y1: 342, min: 4.5 },
  { id: 'S6', what: 'Полоска прогресса: белая заливка на дорожке 28 %', fg: W_, under: () => ['rgba(255,255,255,0.28)'], x0: 19, x1: 83, y0: 331, y1: 335, min: 3 },
];
const heroHits: Hit[] = [];
// ── 2. карточки эпизодов ──
const CARD_W = 160, CARD_H = 215;
const CARD: El[] = [
  { id: 'K1', what: 'Метка номера в углу: белый на чёрном 24 %', fg: W_, under: () => ['rgba(0,0,0,0.24)'], x0: 100, x1: 150, y0: 10, y1: 34, min: 4.5 },
  { id: 'K2', what: 'Большой номер, белый 56 px', fg: W_, under: () => [], x0: 30, x1: 130, y0: 70, y1: 130, min: 4.5 },
  { id: 'K3', what: 'Фраза эпизода, белый 22 px', fg: W_, under: () => [], x0: 12, x1: 150, y0: 150, y1: 200, min: 4.5 },
  { id: 'K4', what: 'Полоска прогресса карты: белая на дорожке 26 %', fg: W_, under: () => ['rgba(255,255,255,0.26)'], x0: 0, x1: 160, y0: 211, y1: 215, min: 3 },
];
const cardHits: Hit[] = [];
for (const app of ['light', 'dark'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
  const g = liquidGlassTokens(id, { level: 'max', appearance: app } as never);
  const dark = !g.isLight; const hue = hexHue(g.accent);
  const heroW = new Map<El, Hit>(); const cardW = new Map<El, Hit>();
  for (let chapter = 1; chapter <= 7; chapter += 1) {
    const art = seasonThemedArt(hue, chapter, 0, dark ? 'dark' : 'light');
    for (const W of [360, 390]) for (const el of HERO) for (let y = el.y0; y <= el.y1; y += 2) for (let x = el.x0; x <= Math.min(el.x1, W - 19); x += 4) {
      const from = parse(art.from), to = parse(art.to), glow = parse(art.glow);
      const t = along(x, y, 0.33 * W, 0, 0.67 * W, HERO_H);
      let bg: Rgb = [0, 1, 2].map((i) => from[i]! * (1 - t) + to[i]! * t) as Rgb;
      bg = over(glow, 1 - along(x, y, W, 0, 0.35 * W, 0.6 * HERO_H), bg);
      const s = (y - (HERO_H - 320)) / 320; if (s > 0) bg = over([0, 0, 0, 1], 0.36 * s, bg);
      for (const u of el.under(dark)) bg = over(parse(u), 1, bg);
      keepWorst(heroW, el, id, app, ratio(over(parse(el.fg), 1, bg), bg), `глава ${chapter}, экран ${W}, x ${x} y ${y}`);
    }
    for (let session = 0; session < 6; session += 1) for (const exam of [false, true]) {
      if (exam && session > 0) continue;
      const art2 = seasonThemedArt(hue, chapter, session, dark ? 'dark' : 'light', exam);
      for (const el of CARD) for (let y = el.y0; y <= el.y1; y += 2) for (let x = el.x0; x <= el.x1; x += 4) {
        const from = parse(art2.from), to = parse(art2.to), glow = parse(art2.glow);
        const t = along(x, y, 0.33 * CARD_W, 0, 0.67 * CARD_W, CARD_H);
        let bg: Rgb = [0, 1, 2].map((i) => from[i]! * (1 - t) + to[i]! * t) as Rgb;
        if (!exam) bg = over(glow, 1 - along(x, y, CARD_W, 0, 0.35 * CARD_W, 0.6 * CARD_H), bg); // у карты экзамена света нет (SeasonCardFace, строка 74)
        for (const u of el.under(dark)) bg = over(parse(u), 1, bg);
        keepWorst(cardW, el, id, app, ratio(over(parse(el.fg), 1, bg), bg), `глава ${chapter}, ${exam ? 'экзамен' : `эпизод ${session}`}, x ${x} y ${y}`);
      }
    }
  }
  heroHits.push(...heroW.values()); cardHits.push(...cardW.values());
}

// ── 3. обычные сцены Главной ──
// строки снизу вверх при полном наборе (заголовок длинный, огонёк, строка, кнопка, чипы, подпись): самое высокое положение текста
type HomeEl = El & { line: string };
const HOME: HomeEl[] = [
  { id: 'H1', what: 'Надзаголовок (белый 86 %)', line: 'kicker', fg: 'rgba(255,255,255,0.86)', under: () => [], x0: 20, x1: 300, y0: 0, y1: 0, min: 4.5 },
  { id: 'H2', what: 'Заголовок, белый', line: 'title', fg: W_, under: () => [], x0: 20, x1: 350, y0: 0, y1: 0, min: 4.5 },
  { id: 'H3', what: 'Огонёк серии / ноль энергии (светлый оттенок темы)', line: 'warm', fg: 'warm', under: () => [], x0: 20, x1: 260, y0: 0, y1: 0, min: 4.5 },
  { id: 'H4', what: 'Строка под заголовком (белый 88 %)', line: 'line', fg: 'rgba(255,255,255,0.88)', under: () => [], x0: 20, x1: 300, y0: 0, y1: 0, min: 4.5 },
    { id: 'H6', what: 'Подпись внизу (note, белый 86 %)', line: 'note', fg: 'rgba(255,255,255,0.86)', under: () => [], x0: 20, x1: 340, y0: 0, y1: 0, min: 4.5 },
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

// ── 4. экран урока на токенах (под обложкой) ──
type G = ReturnType<typeof liquidGlassTokens>;
const TOK: { id: string; what: string; fg: (g: G) => string; bg: (g: G) => string; name: string; min: 4.5 | 3 }[] = [
  { id: 'T1', what: '«Глава 2 из 7», «0 из 8» на фоне', name: '`secondary` на bg', fg: (g) => g.secondary, bg: (g) => g.bg, min: 4.5 },
  { id: 'T2', what: 'Название главы на фоне', name: '`text` на bg', fg: (g) => g.text, bg: (g) => g.bg, min: 4.5 },
  { id: 'T3', what: 'Плитки «Все главы / Все уроки / Старый курс»', name: '`text` на opaqueControl', fg: (g) => g.text, bg: (g) => g.opaqueControl, min: 4.5 },
  { id: 'T4', what: 'Подпись под каруселью: эпизод и название', name: '`text` / `secondary` на bg', fg: (g) => g.secondary, bg: (g) => g.bg, min: 4.5 },
  { id: 'T5', what: 'Кнопка экзамена в подписи: accentInk на accent', name: '`accentInk` на `accent`', fg: (g) => g.accentInk, bg: (g) => g.accent, min: 4.5 },
  { id: 'T6', what: 'Окно эпизода: текст и вторичный на карточке', name: '`secondary` на opaqueCard', fg: (g) => g.secondary, bg: (g) => g.opaqueCard, min: 4.5 },
  { id: 'T7', what: 'Окно эпизода: акцентная подпись', name: '`accentTextSafe` на opaqueCard', fg: (g) => g.accentTextSafe, bg: (g) => g.opaqueCard, min: 4.5 },
  { id: 'T8', what: 'Окно эпизода: графика темы (звёзды, кольцо)', name: '`accentGraphic` на opaqueCard', fg: (g) => g.accentGraphic, bg: (g) => g.opaqueCard, min: 3 },
];
console.log('# Сезон и Главная: контраст во всех темах');
report('Обложка Сезона (7 глав × экран 360/390)', HERO, heroHits, 58);
report('Карточки эпизодов (7 глав × 6 шагов эпизода + экзамен)', CARD, cardHits, 58);
report('Обычные сцены Главной (обычная, «серия под угрозой» вечером, «нет энергии»; экран 360/390, отступ 0/48, шрифт ×1/×1,2)', HOME, homeHits, 58);
console.log('\n## Экран урока на токенах (29 тем × светлая/тёмная × Спокойно/Акцент/Максимум)\n');
console.log('| № | Элемент | Пара | Порог | Минимум | Где минимум | Нарушений |');
console.log('|---|---|---|---|---|---|---|');
for (const r of TOK) {
  let worst = { ratio: 99, where: '' }; let bad = 0; let n = 0;
  for (const app of ['light', 'dark'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
    const g = liquidGlassTokens(id, { level, appearance: app } as never); const bg = flattenOver(r.bg(g), flattenOver(g.bg, '#000000'));
    const v = contrastRatio(flattenOver(r.fg(g), bg), bg); n += 1; if (v < r.min) { bad += 1; failures.push(`${r.id}: ${id}/${ap(app)}/${level} ${f2(v)}`); }
    if (v < worst.ratio) worst = { ratio: v, where: `${id} · ${ap(app)} · ${level}` };
  }
  console.log(`| ${r.id} | ${r.what} | ${r.name} | ${f2(r.min)} | ${f2(worst.ratio)} | ${worst.where} | ${bad ? `**${bad} из ${n}**` : `0 из ${n}`} |`);
}
console.log('\nНАРУШЕНИЯ');
for (const [els, hits] of [[HERO, heroHits], [CARD, cardHits], [HOME, homeHits]] as const) for (const el of els) {
  const b = hits.filter((h) => h.el === el && h.ratio < el.min); if (b.length) console.log(`${el.id}: ${b.map((h) => `${h.theme}/${ap(h.app)} ${f2(h.ratio)} (${h.where})`).join('; ')}`);
}
for (const f of failures.slice(0, 60)) console.log(f);
