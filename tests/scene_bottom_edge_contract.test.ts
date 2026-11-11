// зачем (слово владельца 29.10 со скрином: «сцена обрезана ровной линией — НИГДЕ; нижний край — со скруглением»; факт Макетов: карточка «Сегодня» начиналась на 9 dp ВЫШЕ края сцены и
// накрывала её нижние скруглённые углы): у каждой сцены нижний край скруглён одним радиусом, а то, что ниже сцены, начинается ПОД её краем с зазором и не заезжает на неё.
import fs from 'node:fs';
import path from 'node:path';

import { HOME_SCENE_PANEL_GAP_DP, HOME_SCENE_PANEL_OVERLAP_DP, homeBelowSceneHeight } from '../components/home/v2/scene/home_scene_fit';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split('\r\n').join('\n');
const BOTTOM_RADIUS = 28;

describe('Нижний край сцены: скруглён и не закрыт карточкой', () => {
  it('Главная: карточка «Сегодня» не заезжает на сцену, зазор > 0, расчёт высоты его учитывает', () => {
    // слово владельца 29.10 (после макета): край сцены заходит под карточку «Сегодня» (под её заголовок), карточка поверх сцены
    expect(HOME_SCENE_PANEL_OVERLAP_DP).toBe(44);
    expect(HOME_SCENE_PANEL_GAP_DP).toBe(0);
    expect(homeBelowSceneHeight(390)).toBeGreaterThan(80);
    const stage = read('components/home/v2/scene/HomeSceneStage.tsx');
    expect(stage).toMatch(/export const HOME_SCENE_PANEL_OVERLAP = 44;/);
    expect(read('components/home/v2/scene/HomeScene.tsx')).toContain('marginBottom: -HOME_SCENE_PANEL_OVERLAP }');
  });

  it('renders the tile row between the active Home scene and Today', () => {
    const home = read('app/(tabs)/home.tsx');
    const scene = home.indexOf('<HomeScene\n');
    const today = home.indexOf('<HomeV2TodayCard');
    const row = home.indexOf('uiLang={lang} row />');
    expect(scene).toBeGreaterThan(-1);
    expect(row).toBeGreaterThan(scene);
    expect(today).toBeGreaterThan(row);
    expect(home).toMatch(/\{HOME_SCENE_V2_ENABLED && homeV2Tiles\.length > 0 \? <HomeV2FeatureTiles/);
    expect(home).toContain('overlapNextPanel={homeV2Tiles.length === 0}');
  });

  it('Диалоги и «Сегодня»: панель ниже сцены начинается под её краем с зазором', () => {
    const stage = read('components/dialogs/scene/DialogsSceneStage.tsx');
    expect(stage).toContain('export const DIALOGS_SCENE_PANEL_OVERLAP = 0;');
    expect(stage).toMatch(/export const DIALOGS_SCENE_PANEL_GAP = (\d+);/);
    expect(read('components/dialogs/scene/DialogsScenePanel.tsx')).toContain('marginTop: DIALOGS_SCENE_PANEL_GAP - DIALOGS_SCENE_PANEL_OVERLAP,');
    const today = read('components/home/v2/today_scene/TodaySceneView.tsx');
    const m = /const PANEL_OVERLAP = (-?\d+)/.exec(today);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeLessThan(0);
  });

  // зачем (владелец 11.11, пересмотр обрезанных тестов): случай был вырезан целиком вместе с курсом занятий; живая часть возвращена
  it(`у всех сцен нижний край скруглён радиусом ${BOTTOM_RADIUS} (Главная, Диалоги, Пик)`, () => {
    const radii: Array<[string, RegExp]> = [
      ['components/home/v2/scene/HomeSceneStage.tsx', /stage: \{[^}]*borderBottomLeftRadius: 28, borderBottomRightRadius: 28/],
      ['components/dialogs/scene/DialogsSceneStage.tsx', /stage: \{[^}]*borderBottomLeftRadius: 28, borderBottomRightRadius: 28/],
      ['components/spire/scene/SpireScene.tsx', /stage: \{[^}]*borderBottomLeftRadius: 28, borderBottomRightRadius: 28/],
    ];
    for (const [file, rx] of radii) expect(`${file}: ${rx.test(read(file))}`).toBe(`${file}: true`);
  });

  // зачем (владелец 11.11, пересмотр обрезанных тестов): случай был вырезан целиком вместе с курсом занятий; живая часть возвращена
  it('сцены клипают содержимое по скруглению (overflow hidden), слой цвета не выходит за него', () => {
    for (const file of ['components/home/v2/scene/HomeSceneStage.tsx', 'components/dialogs/scene/DialogsSceneStage.tsx', 'components/spire/scene/SpireScene.tsx']) {
      expect(`${file}: ${/overflow: 'hidden'/.test(read(file))}`).toBe(`${file}: true`);
    }
  });
});
