// зачем (план ускорения первого кадра Главной, одобрен владельцем 22.10; координатор: «сторож, что каждый файл есть и совпадает с токенами»): запечённые ассеты сцены
// (assets/images/v2scene, scripts/gen_scene_assets.mts) существуют для каждой темы × оформления × день/вечер, пересчитываются из ТЕКУЩИХ токенов тем без расхождений и
// растянутые на сцену совпадают с аналитическим рендером (то, что рисуют шейдеры HomeSceneStage) в пределах 4/255 (диагональ считается в пикселях и чуть зависит от пропорций сцены). Токены изменились — запусти `npx tsx scripts/gen_scene_assets.mts`.
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { backdropAt, renderBackdrop, sampleBilinear } from '../scripts/lib/scene_backdrop_math';

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
});
