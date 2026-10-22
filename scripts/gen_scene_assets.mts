// ═══════════════════════════════════════════════════════════════════════════
// gen_scene_assets.mts — запекает ассеты первого кадра Главной из токенов тем (план «эффекты первого кадра», одобрен владельцем 22.10).
//   npx tsx scripts/gen_scene_assets.mts          → пишет assets/images/v2scene/* и components/home/v2/scene/home_scene_baked_assets.generated.ts
//   npx tsx scripts/gen_scene_assets.mts --check  → ничего не пишет; выходит с 1, если файлы отличаются от пересчёта (сторож использует ту же математику)
// Что запекается:
//  (а) фон сцены scene_bg_<тема>_<тёмное|светлое>_<day|eve>.webp 232×225 — диагональный градиент + свет (scripts/lib/scene_backdrop_math.ts), 23 × 2 × 2 = 92 файла;
//  (б) общие детали: scene_halo (белый ореол 22 %), scene_ember (угли вечера), scene_scrim (затемнение низа 0 → 40 %);
//  (в) маски теней плит (белые, альфа = тень): класс tile 86×92 r20 · today 358×209 r28 · phrase 358×80 r18 × слои dark (16,28,−14) / light (14,26,−14) / lightSoft (1,3,0).
// Цвет и прозрачность тени задаёт tintColor из токенов plateShadow / plateShadowSoft (маска нормирована: пик альфы — единица).
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { parseColor, renderBackdrop } from './lib/scene_backdrop_math';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'images', 'v2scene');
const TABLE = path.join(ROOT, 'components', 'home', 'v2', 'scene', 'home_scene_baked_assets.generated.ts');
export const BACKDROP_W = 232;
export const BACKDROP_H = 225;
const CHECK = process.argv.includes('--check');

const files: Record<string, Buffer> = {};
async function webp(name: string, rgba: Uint8Array, w: number, h: number): Promise<void> {
  files[name] = await sharp(Buffer.from(rgba), { raw: { width: w, height: h, channels: 4 } }).webp({ lossless: true, effort: 6 }).toBuffer();
}

// ── (а) фон сцены ──
const backdropKeys: { key: string; file: string }[] = [];
for (const appearance of ['dark', 'light'] as const) {
  for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const evening of [false, true]) {
      const t = homeSceneTokensForTheme(id, appearance, evening);
      const file = `scene_bg_${id}_${appearance}_${evening ? 'eve' : 'day'}.webp`;
      await webp(file, renderBackdrop({ sceneTop: t.sceneTop, sceneBottom: t.sceneBottom, glow: evening ? t.eveningGlow : t.sceneGlow, evening }, BACKDROP_W, BACKDROP_H), BACKDROP_W, BACKDROP_H);
      backdropKeys.push({ key: `${id}|${appearance}|${evening ? 'eve' : 'day'}`, file });
    }
  }
}

// ── (б) общие детали ──
function radial(size: number, rgba: readonly [number, number, number, number]): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j += 1) for (let i = 0; i < size; i += 1) {
    const d = Math.hypot((i + 0.5) / size - 0.5, (j + 0.5) / size - 0.5) / 0.5;
    const o = (j * size + i) * 4;
    out[o] = rgba[0]; out[o + 1] = rgba[1]; out[o + 2] = rgba[2];
    out[o + 3] = Math.round(255 * rgba[3] * Math.max(0, 1 - d));
  }
  return out;
}
await webp('scene_halo.webp', radial(128, [255, 255, 255, 0.22]), 128, 128);
const ember = parseColor(homeSceneTokensForTheme(LIQUID_GLASS_THEME_IDS[0]!, 'dark', true).sceneEmber);
await webp('scene_ember.webp', radial(256, [ember[0], ember[1], ember[2], ember[3]]), 256, 256);
{
  const w = 4;
  const h = 64;
  const out = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) out[(j * w + i) * 4 + 3] = Math.round(255 * 0.4 * ((j + 0.5) / h));
  await webp('scene_scrim.webp', out, w, h);
}

// ── (в) маски теней плит ──
type ShadowLayer = { name: string; offsetY: number; blur: number; spread: number };
const LAYERS: ShadowLayer[] = [
  { name: 'dark', offsetY: 16, blur: 28, spread: -14 },
  { name: 'light', offsetY: 14, blur: 26, spread: -14 },
  { name: 'lightSoft', offsetY: 1, blur: 3, spread: 0 },
];
const CLASSES = [
  { name: 'tile', w: 86, h: 92, r: 20 },
  { name: 'today', w: 358, h: 209, r: 28 },
  { name: 'phrase', w: 358, h: 80, r: 18 },
] as const;

function sdRoundRect(px: number, py: number, cx: number, cy: number, hw: number, hh: number, r: number): number {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function gaussianKernel(sigma: number): Float32Array {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i += 1) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k[i + radius] = v; sum += v; }
  for (let i = 0; i < k.length; i += 1) k[i]! /= sum;
  return k;
}

function blur(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const k = gaussianKernel(sigma);
  const rad = (k.length - 1) / 2;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    let acc = 0;
    for (let i = -rad; i <= rad; i += 1) { const xx = x + i; if (xx >= 0 && xx < w) acc += src[y * w + xx]! * k[i + rad]!; }
    tmp[y * w + x] = acc;
  }
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    let acc = 0;
    for (let i = -rad; i <= rad; i += 1) { const yy = y + i; if (yy >= 0 && yy < h) acc += tmp[yy * w + x]! * k[i + rad]!; }
    out[y * w + x] = acc;
  }
  return out;
}

const shadowTable: Record<string, Record<string, { file: string; width: number; height: number; margin: number; offsetY: number }>> = {};
for (const cls of CLASSES) {
  shadowTable[cls.name] = {};
  for (const layer of LAYERS) {
    const sigma = layer.blur / 2;
    const margin = Math.max(2, Math.ceil(sigma * 3 + Math.abs(layer.offsetY) + Math.max(0, layer.spread)) + Math.min(0, layer.spread));
    const W = cls.w + margin * 2;
    const H = cls.h + margin * 2;
    // фигура тени: плита, сдвинутая на offsetY и расширенная на spread (минус — сужается); радиус меняется вместе с отступом
    const hw = Math.max(0.5, cls.w / 2 + layer.spread);
    const hh = Math.max(0.5, cls.h / 2 + layer.spread);
    const r = Math.max(0, Math.min(cls.r + layer.spread, hw, hh));
    const shape = new Float32Array(W * H);
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const d = sdRoundRect(x + 0.5, y + 0.5, W / 2, H / 2 + layer.offsetY, hw, hh, r);
      shape[y * W + x] = Math.min(1, Math.max(0, 0.5 - d));
    }
    const mask = blur(shape, W, H, sigma);
    const rgba = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i += 1) { rgba[i * 4] = 255; rgba[i * 4 + 1] = 255; rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = Math.round(255 * Math.min(1, mask[i]!)); }
    const file = `shadow_${cls.name}_${layer.name}.webp`;
    await webp(file, rgba, W, H);
    shadowTable[cls.name]![layer.name] = { file, width: W, height: H, margin, offsetY: layer.offsetY };
  }
}

// ── таблица ──
const rel = (f: string): string => `../../../../assets/images/v2scene/${f}`;
let ts = `// ═══ АВТОГЕНЕРАЦИЯ: npx tsx scripts/gen_scene_assets.mts — не править руками ═══
// Запечённые ассеты первого кадра Главной (фон сцены, ореол, угли, затемнение, маски теней плит). Сторож: tests/home_scene_baked_assets.test.ts.
// Подключает 3 · МАКЕТЫ: вместо LinearGradient + SVG-радиала сцены — <Image source={homeSceneBackdrop(...)} style=absoluteFill resizeMode="stretch" />; вместо boxShadow плит — маска, окрашенная tintColor (plateShadow / plateShadowSoft).

/** Размер запечённого фона сцены (растягивается на любую сцену). */
export const HOME_SCENE_BACKDROP_SIZE = { width: ${BACKDROP_W}, height: ${BACKDROP_H} } as const;

/** Ключ: \`\${themeId}|\${appearance}|\${day|eve}\`. */
export const HOME_SCENE_BACKDROPS: Readonly<Record<string, number>> = Object.freeze({
${backdropKeys.map((b) => `  '${b.key}': require('${rel(b.file)}'),`).join('\n')}
});

export function homeSceneBackdropKey(themeId: string, appearance: 'dark' | 'light', evening: boolean): string {
  return \`\${themeId}|\${appearance}|\${evening ? 'eve' : 'day'}\`;
}

/** Фон сцены или null (тема без запечённого файла — вызывающий рисует прежние шейдеры). */
export function homeSceneBackdrop(themeId: string, appearance: 'dark' | 'light', evening: boolean): number | null {
  return HOME_SCENE_BACKDROPS[homeSceneBackdropKey(themeId, appearance, evening)] ?? null;
}

/** Белый ореол за героем: 128×128, радиальный, альфа 22 % в центре (положение/размер задаёт сцена: 168×168, x 57 %, y = topInset + HERO_TOP). */
export const HOME_SCENE_HALO: number = require('${rel('scene_halo.webp')}');
/** Угли вечера: 256×256 (на сцене 260×260, x −40, y = stageH − 200). */
export const HOME_SCENE_EMBER: number = require('${rel('scene_ember.webp')}');
/** Затемнение низа светлой сцены: 4×64, альфа 0 → 40 % сверху вниз; растягивается на высоту 300 у нижнего края. */
export const HOME_SCENE_SCRIM: number = require('${rel('scene_scrim.webp')}');

export type HomeSceneShadowMask = Readonly<{ source: number; width: number; height: number; margin: number; offsetY: number }>;
/**
 * Маски теней плит (белые, альфа = тень). Класс: tile (86×92, r20) · today (358×209, r28) · phrase (358×80, r18). Слой: dark · light · lightSoft.
 * Рисовать: Image позади плиты, разместить на (−margin) от каждого края плиты, растянуть на (ширина плиты + 2·margin) × (высота + 2·margin), tintColor = токен
 * (dark/light → g.plateShadow, lightSoft → g.plateShadowSoft); тёмная тема — один слой dark, светлая — light + lightSoft.
 */
export const HOME_SCENE_SHADOW_MASKS: Readonly<Record<'tile' | 'today' | 'phrase', Readonly<Record<'dark' | 'light' | 'lightSoft', HomeSceneShadowMask>>>> = Object.freeze({
${Object.entries(shadowTable).map(([cls, layers]) => `  ${cls}: Object.freeze({
${Object.entries(layers).map(([ln, m]) => `    ${ln}: { source: require('${rel(m.file)}'), width: ${m.width}, height: ${m.height}, margin: ${m.margin}, offsetY: ${m.offsetY} },`).join('\n')}
  }),`).join('\n')}
});
`;
ts = ts.replace(/\r\n/g, '\n');

if (CHECK) {
  let bad = 0;
  for (const [name, buf] of Object.entries(files)) {
    const p = path.join(OUT_DIR, name);
    if (!fs.existsSync(p)) { console.error(`нет файла ${name}`); bad += 1; continue; }
    if (!fs.readFileSync(p).equals(buf)) { console.error(`отличается ${name}`); bad += 1; }
  }
  if (!fs.existsSync(TABLE) || fs.readFileSync(TABLE, 'utf8').replace(/\r\n/g, '\n') !== ts) { console.error('таблица устарела'); bad += 1; }
  console.log(bad === 0 ? `scene assets: ${Object.keys(files).length} файлов совпадают` : `scene assets: расхождений ${bad}`);
  process.exit(bad === 0 ? 0 : 1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, buf] of Object.entries(files)) fs.writeFileSync(path.join(OUT_DIR, name), buf);
fs.writeFileSync(TABLE, ts);
console.log(`scene assets: записано ${Object.keys(files).length} файлов, таблица ${path.relative(ROOT, TABLE)}`);
