// P0 владельца 05.11: «в шапке всё ещё два оттенка — шов под кнопкой». Кадр 5554: ниже границы фона до края блока видна рамка цвета ВЕРХА градиента.
// Рамка блока сцены Главной красится тоном «тела» сцены (низ), а не верха.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('рамка сцены Главной — тон тела, не верха', () => {
  const stage = read('components/home/v2/scene/HomeSceneStage.tsx');
  const palette = read('components/scene/scene_palette.ts');
  it('рамка берёт sceneFrameToneHex(scenePal) (премиум-темы — sceneBottom)', () => {
    expect(stage).toContain('<SceneBlockShadow tone={isPremium ? tokens.sceneBottom : sceneFrameToneHex(scenePal)} flat>');
    expect(stage).not.toContain('<SceneBlockShadow tone={tokens.sceneTop} flat>');
  });
  it('тон тела: светлое «А» — середина верха и низа градиента, тёмное небо — единый тон неба', () => {
    expect(palette).toContain('export function sceneFrameToneHex(p: ScenePaletteResult): string {');
    expect(palette).toContain('if (isSkyPalette(p)) return skyToneHex(p);');
    expect(palette).toContain('hex(top.map((v, i) => (v + bot[i]!) / 2))');
  });
});
