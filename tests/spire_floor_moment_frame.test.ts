// зачем (Ревизор 15.10, R02; закон владельца 14.10 «пик башни не обрезается, свет тоже»): окно момента «Этаж пройден» 280×240 на 13–15 этаже резало верх башни. Сторож: для всех 12 лиг и этажей 13–15
// шпиль с ореолом и следующий этаж помещаются в окно; нижние этажи — прежняя центровка по образцу.
// react-native-svg в тестах без заглушки не грузится (навершие SpireTowerFinial рисует SVG).
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Circle: () => null, Ellipse: () => null, Path: () => null, Polygon: () => null, Rect: () => null, G: () => null, Defs: () => null, LinearGradient: () => null, RadialGradient: () => null, Stop: () => null, Line: () => null, Text: () => null, ClipPath: () => null }));

import { SPIRE_LEAGUE_SKINS } from '../modules/spire/tower_skins';
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, SPIRE_TW } from '../components/spire/spire_tower_model';
import { spireTowerHeadroom } from '../components/spire/spire_tower_bounds';
import { floorMomentFrame } from '../components/spire/moments/floor_moment_frame';

const W = 280;
const H = 240;

describe('момент «Этаж пройден»: кадр башни', () => {
  it('12 лиг в наличии (иначе сторож слеп)', () => {
    expect(SPIRE_LEAGUE_SKINS).toHaveLength(12);
  });

  it.each(SPIRE_LEAGUE_SKINS.map((skin) => [skin.id, skin] as const))('%s: на 13–15 этаже шпиль с ореолом и следующий этаж целиком в окне', (_id, skin) => {
    for (const next of [SPIRE_FLOOR_COUNT - 2, SPIRE_FLOOR_COUNT - 1, SPIRE_FLOOR_COUNT]) {
      const frame = floorMomentFrame(skin, next, W, H);
      const focus = SPIRE_TOWER_GEOM.floors[next - 1]!;
      const top = (SPIRE_TOWER_GEOM.top - spireTowerHeadroom(skin, false)) * frame.k; // верх шпиля с ореолом в координатах содержимого
      const floorBottom = (focus.y + focus.h) * frame.k;
      const info = [skin.id, next, frame.k];
      expect([...info, frame.nearTop]).toEqual([...info, true]);
      // верх границы башни не выше верха окна, низ следующего этажа не ниже низа окна
      expect([...info, Math.max(0, top) + frame.shift >= -0.5]).toEqual([...info, true]);
      expect([...info, floorBottom + frame.shift <= H + 0.5]).toEqual([...info, true]);
      // башня не шире окна
      expect([...info, frame.towerW <= W]).toEqual([...info, true]);
    }
  });

  it('нижние этажи: прежняя центровка по образцу и масштаб по ширине', () => {
    const frame = floorMomentFrame(SPIRE_LEAGUE_SKINS[0]!, 5, W, H);
    const focus = SPIRE_TOWER_GEOM.floors[4]!;
    const k = W / SPIRE_TW;
    expect(frame.nearTop).toBe(false);
    expect(frame.k).toBeCloseTo(k, 6);
    expect(frame.shift).toBe(Math.round(H / 2 - (focus.y + focus.h / 2) * k));
  });
});
