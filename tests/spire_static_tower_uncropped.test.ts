// зачем (правило владельца 14.10 «пик башни не обрезается, свет тоже»; координатор 15.10): статичные показы башни в моментах — повышение лиги
// (m01, MomentPromotion), неделя в историях (StorySlides) и карточка «Итог недели» — показывают башню от острия с ореолом до основания (карточка —
// верхушку по макету, но с острием и ореолом целиком). Сторож проверяет числами для всех 12 лиг в обоих состояниях (обычное и вершина), без
// измерений; и что на экране 360×640 башня m01 и историй помещается по высоте, а не вылезает.
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Circle: () => null, Ellipse: () => null, Path: () => null, Polygon: () => null, Rect: () => null, G: () => null, Defs: () => null, LinearGradient: () => null, RadialGradient: () => null, Stop: () => null, Line: () => null, Text: () => null, ClipPath: () => null }));

import fs from 'node:fs';
import path from 'node:path';
import { SPIRE_LEAGUE_SKINS } from '../modules/spire/tower_skins';
import { SPIRE_TOWER_GEOM, SPIRE_TW } from '../components/spire/spire_tower_model';
import { spireTowerBounds, spireWeekTopViewBox } from '../components/spire/spire_tower_bounds';

const cases = SPIRE_LEAGUE_SKINS.flatMap((skin) => [false, true].map((summit) => [`${skin.id}${summit ? ' (вершина)' : ''}`, skin, summit] as const));

describe('статичные показы башни — без обрезки', () => {
  it('12 лиг в наличии (иначе сторож слеп)', () => {
    expect(SPIRE_LEAGUE_SKINS).toHaveLength(12);
  });

  it.each(cases)('%s: полная башня (m01, истории) — острие и ореол внутри холста 0…height', (_id, skin, summit) => {
    const b = spireTowerBounds(skin, summit);
    expect([_id, b.minY >= -0.5]).toEqual([_id, true]);
  });

  it.each(cases)('%s: карточка «Итог недели» — острие и ореол внутри её кадра', (_id, skin, summit) => {
    const b = spireTowerBounds(skin, summit);
    const vb = spireWeekTopViewBox(skin, summit);
    expect([_id, vb.y <= b.minY + 0.5]).toEqual([_id, true]);
  });

  it('на экране 360×640 башня m01 и историй помещается по высоте (вписана масштабом, не вылезает)', () => {
    const ratio = SPIRE_TOWER_GEOM.height / SPIRE_TW;
    const winH = 640;
    // m01: та же формула, что в MomentPromotion (верх ≥ 76, низ — блок 190 + отступ 12)
    const m01Avail = winH - 76 - (190 + 12);
    const m01W = Math.max(60, Math.min(196, Math.floor(m01Avail / ratio)));
    expect(Math.round(SPIRE_TOWER_GEOM.height * (m01W / SPIRE_TW))).toBeLessThanOrEqual(m01Avail + 1);
    // истории: формула StorySlides
    const storyAvail = winH - 120 - 60 - 150 - 40;
    const storyW = Math.max(60, Math.min(170, Math.floor(storyAvail / ratio)));
    expect(Math.round(SPIRE_TOWER_GEOM.height * (storyW / SPIRE_TW))).toBeLessThanOrEqual(storyAvail + 1);
  });

  it('формулы в исходниках совпадают с проверенными выше', () => {
    const promo = fs.readFileSync(path.join(__dirname, '..', 'components', 'spire', 'moments', 'MomentPromotion.tsx'), 'utf8');
    expect(promo).toContain('const towerW = Math.max(60, Math.min(196, Math.floor((winH - towerTop - finalBlockH) / ratio)));');
    const story = fs.readFileSync(path.join(__dirname, '..', 'components', 'stories', 'StorySlides.tsx'), 'utf8');
    expect(story).toContain('const towerW = Math.max(60, Math.min(170, Math.floor((winH - 120 - 60 - 150 - 40) / ratio)));');
  });
});
