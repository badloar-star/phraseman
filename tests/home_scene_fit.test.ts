// зачем (слово владельца 29.10: «сцена на главной такая же высота как в разделе уроки»; координатор: на любом окне и шрифте, сторож): высота сцены Главной === высоте обложки «Уроков».
import { homeSceneStageHeight } from '../components/home/v2/scene/home_scene_fit';
import { SCENE_HERO_HEIGHT_DP } from '../components/scene/scene_hero_height';
import { readSource } from './helpers/read_source';

const WINDOWS: ReadonlyArray<readonly [number, number]> = [[360, 640], [390, 844], [412, 915], [430, 932], [768, 1024]];
const SCALES = [0.85, 1, 1.15, 1.3, 1.6];

describe('Высота сцены Главной = высота сцены «Уроков»', () => {
  it.each(WINDOWS)('окно %i×%i: на любом масштабе шрифта высота равна обложке «Уроков»', (w, h) => {
    for (const fontScale of SCALES) {
      expect(homeSceneStageHeight({ windowH: h, windowW: w, pillTop: 96, fontScale, share: 392 / 844 })).toBe(SCENE_HERO_HEIGHT_DP);
    }
  });

  it('«Уроки» (Сезон, страница вкладки) держат ту же константу как minHeight обложки', () => {
    const season = readSource('components/learning-v2/season/SeasonCourseView.tsx');
    expect(season).toContain('heroTall: { minHeight: SCENE_HERO_HEIGHT_DP,');
    expect(SCENE_HERO_HEIGHT_DP).toBe(412); // зачем: два кандидата для макета (392 как «Уроки» / 412 как эталон approved/scene), выбор владельца
  });

  it('Главная берёт высоту только из homeSceneStageHeight, без вычитаний и ужатия под карточки', () => {
    const stage = readSource('components/home/v2/scene/HomeSceneStage.tsx');
    expect(stage).toContain('homeSceneStageHeight({ windowH, windowW, pillTop, fontScale, share: HOME_SCENE_SCREEN_SHARE })');
    expect(readSource('components/home/v2/scene/home_scene_fit.ts')).not.toMatch(/Math\.min\(wanted|EDGE_SHIFT/);
  });

  it('герой Главной 280 dp, справа 20, по центру, текст поверх (выбор владельца 29.10)', () => {
    const stage = readSource('components/home/v2/scene/HomeSceneStage.tsx');
    expect(stage).toContain('const HERO = 280;');
    expect(stage).toContain('const HERO_RIGHT = 20;');
    expect(stage).toContain('const HERO_OVER_TEXT = true;');
    expect(stage).toContain('const HERO_PAD = 0;');
  });
});
