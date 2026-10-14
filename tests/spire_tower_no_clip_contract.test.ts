// зачем (закон владельца 14.10, скрин «ИТОГ НЕДЕЛИ»: «ПИК БАШНИ НЕ ДОЛЖЕН НИЧЕМ ОБРЕЗАТЬСЯ ВООБЩЕ (СВЕТ ТОЖЕ)»):
// граница башни (острие, навершие, древко флага, ореол ×2.6 на вершине) ⊂ контейнер — для всех 12 лиг × {обычное, вершина}.
// Сработал — увеличь запас/уменьши масштаб башни, а не режь её и не расширяй допуски.
// react-native-svg в тестах не грузится без заглушки (навершие SpireTowerFinial рисует SVG); для расчёта границы нужны только числа
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Circle: () => null, Ellipse: () => null, Path: () => null, Polygon: () => null, Rect: () => null }));

import fs from 'node:fs';
import path from 'node:path';
import { SPIRE_LEAGUE_SKINS } from '../modules/spire/tower_skins';
import { SPIRE_TOWER_GEOM, SPIRE_TW } from '../components/spire/spire_tower_model';
import { spireMaxTowerHeadroom, spireTowerBounds, spireWeekTopViewBox } from '../components/spire/spire_tower_bounds';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('башня Пика: граница ⊂ контейнер', () => {
  it('12 лиг в наличии (иначе сторож слеп)', () => {
    expect(SPIRE_LEAGUE_SKINS).toHaveLength(12);
  });

  it('экран Пика: запас сверху в геометрии башни (TOP_PAD) не меньше, чем нужен самой большой лиге на вершине; по ширине ореол ⊂ [0, SPIRE_TW]', () => {
    const need = spireMaxTowerHeadroom(SPIRE_LEAGUE_SKINS);
    // верх верхнего этажа = TOP_PAD: граница башни (вместе с ореолом) должна лежать не выше y = 0 + поле
    expect([`запас верха башни ${SPIRE_TOWER_GEOM.top}, нужно ${Math.ceil(need)}`, SPIRE_TOWER_GEOM.top >= need]).toEqual([`запас верха башни ${SPIRE_TOWER_GEOM.top}, нужно ${Math.ceil(need)}`, true]);
    for (const skin of SPIRE_LEAGUE_SKINS) {
      for (const summit of [false, true]) {
        const b = spireTowerBounds(skin, summit);
        expect([skin.id, summit, b.minY >= 0]).toEqual([skin.id, summit, true]);
        expect([skin.id, summit, b.minX >= 0 && b.maxX <= SPIRE_TW]).toEqual([skin.id, summit, true]);
      }
    }
  });

  it('карточка «Итог недели»: viewBox верхушки содержит всю границу (верх, ореол по ширине) для всех лиг и состояний', () => {
    for (const skin of SPIRE_LEAGUE_SKINS) {
      for (const summit of [false, true]) {
        const b = spireTowerBounds(skin, summit);
        const vb = spireWeekTopViewBox(skin, summit);
        expect([skin.id, summit, vb.y <= b.minY, vb.x <= b.minX, vb.x + vb.w >= b.maxX]).toEqual([skin.id, summit, true, true, true]);
      }
    }
    const card = read('components/spire/SpireWeekResultCard.tsx');
    const svg = read('components/spire/SpireTowerSvg.tsx');
    expect(svg).toContain('spireWeekTopViewBox(');
    expect(card).not.toMatch(/const TOWER_W = 58;/);
  });

  it('окно Пика: запас навершия не срезается в статичных положениях (SPIRE_FINIAL_SLACK = 0 или удалён), запас считается по границе башни', () => {
    const crown = read('components/spire/spire_tower_crown.ts');
    const slack = /SPIRE_FINIAL_SLACK\s*=\s*(\d+)/.exec(crown);
    expect(slack === null || Number(slack[1]) === 0).toBe(true);
    expect(read('components/spire/SpireTower.tsx')).toContain('spireTowerHeadroom(skin, myFloor === SPIRE_FLOOR_COUNT)');
  });

  it('тур: контейнер башни без overflow:hidden и без отрицательного marginTop', () => {
    const tour = read('components/spire/SpireTour.tsx');
    const clip = /towerClip:\s*\{[^}]*\}/.exec(tour)?.[0] ?? '';
    expect(clip).not.toContain("overflow: 'hidden'");
    expect(tour).not.toMatch(/TOWER_OFFSET\s*=\s*-\d+/);
  });
});
