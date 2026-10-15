// зачем (координатор 15.10, условие 3; правило владельца 14.10 «пик башни не обрезается, свет тоже»): окно момента «Этаж пройден» 280×240 показывает ВСЮ башню — от острия и ореола (с полем) до основания — для всех 12 лиг;
// масштаб вписывает башню в окно, без прокрутки.
// react-native-svg в тестах без заглушки не грузится (навершие SpireTowerFinial рисует SVG).
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Circle: () => null, Ellipse: () => null, Path: () => null, Polygon: () => null, Rect: () => null, G: () => null, Defs: () => null, LinearGradient: () => null, RadialGradient: () => null, Stop: () => null, Line: () => null, Text: () => null, ClipPath: () => null }));

import { SPIRE_LEAGUE_SKINS } from '../modules/spire/tower_skins';
import { SPIRE_TOWER_GEOM, SPIRE_TW } from '../components/spire/spire_tower_model';
import { spireTowerHeadroom } from '../components/spire/spire_tower_bounds';
import { floorMomentFrame } from '../components/spire/moments/floor_moment_frame';

const W = 280;
const H = 240;

describe('момент «Этаж пройден»: кадр башни', () => {
  it('12 лиг в наличии (иначе сторож слеп)', () => {
    expect(SPIRE_LEAGUE_SKINS).toHaveLength(12);
  });

  it.each(SPIRE_LEAGUE_SKINS.map((skin) => [skin.id, skin] as const))('%s: вся башня — острие, ореол и основание — в окне, ширина не больше окна', (_id, skin) => {
    const frame = floorMomentFrame(skin, W, H);
    const top = (SPIRE_TOWER_GEOM.top - spireTowerHeadroom(skin, false)) * frame.k + frame.shift;
    const bottom = SPIRE_TOWER_GEOM.height * frame.k + frame.shift;
    const info = [skin.id, frame.k];
    expect([...info, top >= -0.5]).toEqual([...info, true]);
    expect([...info, bottom <= H + 0.5]).toEqual([...info, true]);
    expect([...info, frame.towerW <= W]).toEqual([...info, true]);
    expect([...info, frame.k <= W / SPIRE_TW + 1e-9]).toEqual([...info, true]);
  });
});
