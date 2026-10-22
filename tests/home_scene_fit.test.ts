// зачем (Сверка 22.10, координатор: «Фраза дня» уходила под таб-бар; владелец — Главная без скролла): сжимается только сцена, всё под ней остаётся полного размера.
import { HOME_SCENE_FIT_MIN, homeBelowSceneHeight, homeSceneStageHeight } from '../components/home/v2/scene/home_scene_fit';
import { readSource } from './helpers/read_source';

const SHARE = 392 / 844;

describe('высота сцены Главной под «Фразу дня»', () => {
  it('390×844: всё до «Фразы дня» помещается над капсулой, сцена не больше 46 %', () => {
    const pillTop = 96;
    const stage = homeSceneStageHeight({ windowH: 844, windowW: 390, pillTop, fontScale: 1, share: SHARE });
    expect(stage).toBeLessThanOrEqual(392);
    expect(stage).toBeGreaterThanOrEqual(HOME_SCENE_FIT_MIN);
    expect(stage + homeBelowSceneHeight(390)).toBeLessThanOrEqual(844 - pillTop);
  });
  it('если места хватает, сцена остаётся 46 %', () => {
    expect(homeSceneStageHeight({ windowH: 1000, windowW: 412, pillTop: 90, fontScale: 1, share: SHARE })).toBe(Math.round(1000 * SHARE));
  });
  it('маленький экран 360×640: сцена не ужимается ниже предела (дальше прокрутка), всё остальное полного размера', () => {
    expect(homeSceneStageHeight({ windowH: 640, windowW: 360, pillTop: 96, fontScale: 1, share: SHARE })).toBe(HOME_SCENE_FIT_MIN);
  });
  it('крупный системный шрифт: сцену не сжимаем (текст растёт, прокрутка допустима)', () => {
    expect(homeSceneStageHeight({ windowH: 844, windowW: 390, pillTop: 96, fontScale: 1.3, share: SHARE })).toBe(392);
  });
  it('сцена берёт высоту из модели, текст не ужимается', () => {
    const stage = readSource('components/home/v2/scene/HomeSceneStage.tsx');
    expect(stage).toContain('homeSceneStageHeight({ windowH, windowW, pillTop, fontScale, share: HOME_SCENE_SCREEN_SHARE })');
    expect(stage).not.toContain('adjustsFontSizeToFit');
  });
});
