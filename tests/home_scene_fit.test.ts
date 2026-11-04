// зачем (владелец 02.11: утверждён только компактный верх Главной): baseline сцены 280 dp; крупный системный шрифт растит контент, а не базовую высоту.
import { homeSceneStageHeight } from '../components/home/v2/scene/home_scene_fit';
import { readSource } from './helpers/read_source';

const WINDOWS: ReadonlyArray<readonly [number, number]> = [[360, 640], [390, 844], [412, 915], [430, 932], [768, 1024]];
const SCALES = [0.85, 1, 1.15, 1.3, 1.6];

describe('Компактная высота сцены Главной', () => {
  it.each(WINDOWS)('окно %i×%i: baseline на любом масштабе шрифта равен 280 dp', (w, h) => {
    for (const fontScale of SCALES) {
      expect(homeSceneStageHeight({ windowH: h, windowW: w, pillTop: 96, fontScale, share: 392 / 844 })).toBe(280);
    }
  });

  it('Главная берёт baseline из homeSceneStageHeight и оставляет контенту minHeight для крупного шрифта', () => {
    const stage = readSource('components/home/v2/scene/HomeSceneStage.tsx');
    expect(stage).toContain('homeSceneStageHeight({ windowH, windowW, pillTop, fontScale, share: HOME_SCENE_SCREEN_SHARE })');
    expect(stage).toContain('stage: { minHeight: HOME_SCENE_STAGE_MIN_HEIGHT');
    expect(stage).toContain('useScaledTextStyles(baseStyles)');
    expect(readSource('components/home/v2/scene/home_scene_fit.ts')).not.toMatch(/Math\.min\(wanted|EDGE_SHIFT/);
  });

  it('верх сцены не монтирует старую ветку hero-art', () => {
    const stage = readSource('components/home/v2/scene/HomeSceneStage.tsx');
    expect(stage).not.toMatch(/ThemedArtLayers|homeSceneHeroFade|MaskedView/);
  });
});
