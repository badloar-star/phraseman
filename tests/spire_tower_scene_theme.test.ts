// зачем (владелец 13.10, светлая тема с Обсидианом: «окно башни должно соответствовать ТЕМЕ, а не башне»): фон окна (небо, звёзды, облака, земля, тень) и подписи на нём
// (номера этажей, «СТРАЖ»/«ВЕРШИНА», «над облаками», «+N» соперников) берутся из токенов темы и шага ползунка; башня (камень, ободки, навершие, окна) — наряд лиги.
import fs from 'node:fs';
import path from 'node:path';

import { liquidGlassTokens, LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const lum = (hex: string) => {
  const h = hex.replace('#', '').slice(0, 6);
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

describe('окно башни — по теме, башня — по наряду лиги', () => {
  it('подписи сцены (secondary/text) ≥ 4,5 на плите окна во всех 23 темах, обоих оформлениях и 5 шагах ползунка', () => {
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const appearance of ['dark', 'light'] as const) {
        for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
          const t = liquidGlassTokens(id, { intensity, appearance } as never) as unknown as Record<string, string>;
          const at = `${id}|${appearance}|${intensity}`;
          for (const [name, color] of [['num/«СТРАЖ»/«над облаками»', t.secondary], ['номер своего этажа', t.text]] as const) {
            for (const surface of ['plateFillFrom', 'bgTop', 'bgBottom']) if (ratio(color!, t[surface]!) < 4.5) bad.push(`${at} ${name}→${surface}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('сцена берётся из токенов: небо не рисуется, номера/подписи/облака/земля/звёзды/тень зависят от темы; башня остаётся нарядом', () => {
    const svg = read('components/spire/SpireTowerSvg.tsx');
    expect(svg).toContain('{scene ? null : <Rect width={SPIRE_TW} height={geom.height} fill="url(#spireSky)" />}');
    expect(svg).toContain('scene ? (mine ? scene.numMine : scene.num)');
    expect(svg).toContain("fill={scene ? scene.num : '#8E8E92'}");
    expect(svg).toContain("fill={scene ? scene.cloudsLabel : '#5E5E62'}");
    expect(svg).toContain("scene ? 'url(#spireGroundTheme)' : 'url(#spireGround)'");
    expect(svg).toContain("scene ? scene.shadow : 'rgba(0,0,0,.55)'");
    // башня: градиенты камня и окон по-прежнему из наряда
    expect(svg).toContain('skin.cyl[i]');
    expect(svg).toContain('skin.lit');
    const hook = read('components/spire/useSpireScene.ts');
    expect(hook).toContain('num: g.secondary');
    expect(hook).toContain('numMine: g.text');
    expect(hook).toContain('star: light ? null : g.text');
    expect(read('components/spire/SpireTower.tsx')).toContain('scene={scene}');
    expect(read('components/spire/SpireTour.tsx')).toContain('scene={scene}');
  });
});
