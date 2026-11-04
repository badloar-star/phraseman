// зачем (слово владельца 29.10: «НЕМЕДЛЕННО УБРАТЬ ЗАТЕМНЕНИЕ ВНИЗУ СЦЕНЫ… вся сцена без затемнения внизу, эти 20 % убрать»): на всех экранах сцены нет ни одного слоя, темнящего низ
// (scrim, виньетка, страж низа, хвост градиента), а низ неба и светлой сцены по яркости не темнее середины.
import fs from 'node:fs';
import path from 'node:path';

import { LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { isSkyPalette, scenePalette } from '../components/scene/scene_palette';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split('\r\n').join('\n');
const lin = (v: number): number => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (c: ReadonlyArray<number>): number => 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!);
const mix = (a: ReadonlyArray<number>, b: ReadonlyArray<number>, t: number): number[] => a.map((v, i) => v + (b[i]! - v) * t);
type Stops = Array<[number, ReadonlyArray<number>]>;
const colorAt = (stops: Stops, y: number): ReadonlyArray<number> => {
  for (let i = 1; i < stops.length; i += 1) if (y <= stops[i]![0]) return mix(stops[i - 1]![1], stops[i]![1], (y - stops[i - 1]![0]) / (stops[i]![0] - stops[i - 1]![0] || 1));
  return stops[stops.length - 1]![1];
};
const avgLum = (stops: Stops, a: number, b: number): number => { let t = 0; let k = 0; for (let y = a; y <= b + 1e-9; y += 0.01) { t += lum(colorAt(stops, y)); k += 1; } return t / k; };

describe('Сцена: нет затемнения низа', () => {
  it('SceneBackdrop: небо — остановки ниже горизонта равны тону середины; виньетка, страж низа и scrim не рисуются', () => {
    const src = read('components/scene/SceneBackdrop.tsx');
    expect(src).toContain('const raw = [tone, tone, tone, tone, tone, tone];');
    expect(src).toContain('export const SCENE_HAZE_BAND = false;');
    expect(src).toContain('export const SCENE_SKY_SUN = false;');
    expect(src).toContain('export const SCENE_VIGNETTE = false;');
    expect(src).toContain('export const SCENE_DARK_BOTTOM_GUARD = false;');
    expect(src).toContain('{SCENE_VIGNETTE ? <Rect');
    expect(src).not.toContain("id('Scrim')");
    expect(src).not.toMatch(/const scrim\b/);
  });

  it.each([
    ['components/dialogs/scene/DialogsSceneStage.tsx'],
    ['components/home/v2/today_scene/TodaySceneView.tsx'],
    ['components/home/v2/scene/HomeSceneStage.tsx'],
    ['components/learning-v2/season/SeasonCourseView.tsx'],
  ])('%s: слоя scrim нет (ни стиля, ни отрисовки)', (file) => {
    const src = read(file);
    expect(src).not.toMatch(/^\s*scrim: \{ position: 'absolute'/m);
    expect(src).not.toMatch(/<LinearGradient[^>]*style=\{s\.scrim\}/);
  });

  it('тёмные темы: нижние 20 % неба не темнее середины (отношение яркости ≥ 1)', () => {
    let n = 0;
    for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const p = scenePalette(id, 'dark', 'home', 1080, 1082, { premium: false, dp: 2.625, evening: false });
      if (!isSkyPalette(p)) continue;
      const r = p.raw;
      const tone = r.mid.map((v, i) => v + (r.hor[i]! - v) * 0.25);
      const stops: Stops = [[0, tone], [0.42, tone], [0.66, tone], [0.74, tone], [0.8, tone], [1, tone]];
      expect(`${id}: ${avgLum(stops, 0.8, 1) >= avgLum(stops, 0.4, 0.6)}`).toBe(`${id}: true`);
      n += 1;
    }
    expect(n).toBeGreaterThan(20);
  });

  it('compact HomeScene без hero-art и ореола; шапка, рамка и верх/низ сцены — единый тон неба', () => {
    const stage = read('components/home/v2/scene/HomeSceneStage.tsx');
    expect(stage).not.toMatch(/ThemedArtLayers|tintAccent|MaskedView/);
    expect(stage).not.toContain('sceneHalo');
    const pal = read('components/scene/scene_palette.ts');
    expect(pal).toContain('return isSkyPalette(p) ? skyToneHex(p) : p.gradient.top.hex;');
    expect(pal).toContain('return isSkyPalette(p) ? skyToneHex(p) : p.gradient.bottom.hex;');
  });
});
