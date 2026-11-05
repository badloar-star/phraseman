// Governance-ID: TG-23AF8AB62312
import * as fs from 'node:fs';
import * as path from 'node:path';

// зачем (замечание координатора 06.11): иконка плитки «Фразы из видео» в светлой теме — той же посадки, что у соседей; масштаб только для неё и только в светлой теме.
const tiles = fs.readFileSync(path.join(__dirname, '..', 'components', 'home', 'v2', 'HomeV2FeatureTiles.tsx'), 'utf8');

describe('плитка «Фразы из видео»: посадка арта', () => {
  test('масштаб применяется только к video_packs в светлой теме', () => {
    expect(tiles).toContain("tile.key === 'video_packs' && g.isLight");
    expect(tiles).toContain('VIDEO_PACKS_LIGHT_ART_SCALE');
  });

  test('множитель разумный: арт растёт не больше чем на 20 %', () => {
    const m = tiles.match(/VIDEO_PACKS_LIGHT_ART_SCALE = ([0-9.]+);/);
    expect(m).not.toBeNull();
    const value = Number(m![1]);
    expect(value).toBeGreaterThan(1);
    expect(value).toBeLessThanOrEqual(1.2);
  });
});
