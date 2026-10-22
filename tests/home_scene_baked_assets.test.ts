// зачем (план ускорения первого кадра Главной, одобрен владельцем 22.10; координатор: «сторож, что каждый файл есть и совпадает с токенами»): запечённые ассеты сцены
// (assets/images/v2scene, scripts/gen_scene_assets.mts) существуют для каждой темы × оформления × день/вечер, пересчитываются из ТЕКУЩИХ токенов тем без расхождений и
// растянутые на сцену совпадают с аналитическим рендером (то, что рисуют шейдеры HomeSceneStage) в пределах 4/255 (диагональ считается в пикселях и чуть зависит от пропорций сцены). Токены изменились — запусти `npx tsx scripts/gen_scene_assets.mts`.
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { backdropAt, parseColor, renderBackdrop, sampleBilinear } from '../scripts/lib/scene_backdrop_math';
import { capComposite, capCompositeFromMasks, capT } from '../scripts/lib/tabbar_cap_math';

const DIR = path.join(__dirname, '..', 'assets', 'images', 'v2scene');
const TABLE = fs.readFileSync(path.join(__dirname, '..', 'components', 'home', 'v2', 'scene', 'home_scene_baked_assets.generated.ts'), 'utf8').replace(/\r\n/g, '\n');
const W = 232;
const H = 225;
const SIZES: readonly (readonly [number, number])[] = [[360, 320], [390, 358], [411, 425]];

async function decode(file: string): Promise<{ data: Uint8Array; width: number; height: number }> {
  const { data, info } = await sharp(path.join(DIR, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

describe('Запечённые ассеты сцены Главной', () => {
  it('таблица содержит все 92 фона и каждый файл есть на диске', () => {
    let count = 0;
    const missing: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS) {
        for (const evening of [false, true]) {
          const key = `${id}|${appearance}|${evening ? 'eve' : 'day'}`;
          const file = `scene_bg_${id}_${appearance}_${evening ? 'eve' : 'day'}.webp`;
          count += 1;
          if (!TABLE.includes(`'${key}': require('../../../../assets/images/v2scene/${file}')`)) missing.push(`нет в таблице: ${key}`);
          if (!fs.existsSync(path.join(DIR, file))) missing.push(`нет файла: ${file}`);
        }
      }
    }
    expect(count).toBe(LIQUID_GLASS_THEME_IDS.length * 4);
    expect(missing).toEqual([]);
  });

  it('файл фона совпадает с пересчётом из текущих токенов и с аналитическим рендером на размерах 360×320, 390×358, 411×425', async () => {
    const stale: string[] = [];
    const off: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS) {
        for (const evening of [false, true]) {
          const t = homeSceneTokensForTheme(id, appearance, evening);
          const input = { sceneTop: t.sceneTop, sceneBottom: t.sceneBottom, glow: evening ? t.eveningGlow : t.sceneGlow, evening };
          const tag = `${appearance}/${id}/${evening ? 'eve' : 'day'}`;
          const img = await decode(`scene_bg_${id}_${appearance}_${evening ? 'eve' : 'day'}.webp`);
          if (img.width !== W || img.height !== H) { stale.push(`${tag}: размер ${img.width}×${img.height}`); continue; }
          const fresh = renderBackdrop(input, W, H);
          let diff = 0;
          for (let i = 0; i < fresh.length; i += 1) diff = Math.max(diff, Math.abs(fresh[i]! - img.data[i]!));
          if (diff > 1) stale.push(`${tag}: файл устарел (макс. расхождение ${diff}) — запусти scripts/gen_scene_assets.mts`);
          for (const [w, h] of SIZES) {
            let worst = 0;
            for (let j = 0; j < 20; j += 1) {
              for (let i = 0; i < 20; i += 1) {
                const u = (i + 0.5) / 20;
                const v = (j + 0.5) / 20;
                const truth = backdropAt(input, u, v, w, h);
                const got = sampleBilinear(img.data, W, H, u, v);
                for (let c = 0; c < 3; c += 1) worst = Math.max(worst, Math.abs(truth[c]! - got[c]!));
              }
            }
            if (worst > 4) off.push(`${tag} ${w}×${h}: ${worst.toFixed(2)} > 4`);
          }
        }
      }
    }
    expect(stale.slice(0, 8)).toEqual([]);
    expect(off.slice(0, 8)).toEqual([]);
  }, 120000);

  it('общие детали и маски теней на месте, размеры совпадают с таблицей', async () => {
    for (const f of ['scene_halo.webp', 'scene_ember.webp', 'scene_scrim.webp']) expect([f, fs.existsSync(path.join(DIR, f))]).toEqual([f, true]);
    const re = /(\w+): \{ source: require\('\.\.\/\.\.\/\.\.\/\.\.\/assets\/images\/v2scene\/(shadow_\w+\.webp)'\), width: (\d+), height: (\d+), margin: (\d+), offsetY: (\d+) \}/g;
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = re.exec(TABLE))) {
      const img = await decode(m[2]!);
      expect([m[2], img.width, img.height]).toEqual([m[2], Number(m[3]), Number(m[4])]);
      // альфа маски: пик не выше 1, у края изображения (за пределами тени) почти ноль
      let peak = 0;
      for (let i = 3; i < img.data.length; i += 4) peak = Math.max(peak, img.data[i]!);
      expect(peak).toBeGreaterThan(120);
      expect(img.data[3]!).toBeLessThan(6);
      n += 1;
    }
    expect(n).toBe(9);
  });
  it('таб-бар: маски плашки по классам прозрачности accentCap совпадают с градиентом SVG для ВСЕХ тем × оформлений × уровней (≤ 3/255)', async () => {
    const bad: string[] = [];
    const classes = new Set<string>();
    const loaded: Record<string, { color: Awaited<ReturnType<typeof decode>>; white: Awaited<ReturnType<typeof decode>> }> = {};
    for (const cls of ['ff', '1a', '24', '29', '2e']) loaded[cls] = { color: await decode(`tabbar_cap_color_${cls}.webp`), white: await decode(`tabbar_cap_white_${cls}.webp`) };
    for (const appearance of ['dark', 'light'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS) {
        for (const level of ['calm', 'accent', 'max'] as const) {
          const g = liquidGlassTokens(id, { level, appearance } as never) as Record<string, string>;
          const cap = g.accentCap!;
          const cls = (cap.length === 9 ? cap.slice(7) : 'ff').toLowerCase();
          classes.add(cls);
          const pair = loaded[cls];
          if (!pair) { bad.push(`${appearance}/${id}/${level}: нет класса прозрачности ${cls}`); continue; }
          const a = parseInt(cls, 16) / 255;
          const accent = parseColor(cap.slice(0, 7)).slice(0, 3);
          const bg = parseColor(g.bgBottom!).slice(0, 3);
          let worst = 0;
          for (let j = 0; j < 64; j += 4) {
            for (let i = 0; i < 128; i += 4) {
              const t = capT((i + 0.5) / 128, (j + 0.5) / 64);
              const truth = capComposite(accent, bg, t, a);
              const got = capCompositeFromMasks(accent, bg, t, pair.color.data[(j * 128 + i) * 4 + 3]! / 255, pair.white.data[(j * 128 + i) * 4 + 3]! / 255);
              for (let c = 0; c < 3; c += 1) worst = Math.max(worst, Math.abs(truth[c]! - got[c]!));
            }
          }
          if (worst > 3) bad.push(`${appearance}/${id}/${level} (${cls}): ${worst.toFixed(2)}`);
        }
      }
    }
    expect([...classes].sort()).toEqual(['1a', '24', '29', '2e', 'ff']);
    expect(bad.slice(0, 8)).toEqual([]);
    for (const [cls, pair] of Object.entries(loaded)) expect([cls, pair.color.width, pair.color.height, pair.white.width, pair.white.height]).toEqual([cls, 128, 64, 128, 64]);
  });

  it('таб-бар: маска тени капсулы есть и описана в таблице (общая для светлых и тёмных тем: на тёмных цветных фонах уровня «Максимум» тень различима до ~10/255)', () => {
    expect(fs.existsSync(path.join(DIR, 'tabbar_shadow.webp'))).toBe(true);
    expect(TABLE).toContain('HOME_TABBAR_SHADOW');
  });
});
