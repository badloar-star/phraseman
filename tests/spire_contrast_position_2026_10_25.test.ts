/**
 * Пик 25.10: (1) контраст сцены по замеру Тем (docs/work/spire-contrast-2026-10-25.md) — свет размером Главной, своя строка 6 % и ник
 * белый, затемнение под вкладками до шапка + 140; (2) окна мест «поднялся/обогнали» не видят ложный скачок, пока своя неделя не прочитана.
 */
import * as fs from 'fs';
import * as path from 'path';

import { SPIRE_LIGHT_RY_FACTOR, SPIRE_LIGHT_STAGE_H, SPIRE_SHADE_TAIL } from '../components/spire/scene/spire_scene_backdrop_math';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Пик: контраст сцены (Темы 25.10)', () => {
  it('свет — радиус 0,5 × (шапка + 392), затемнение до шапка + 140', () => {
    expect(SPIRE_LIGHT_RY_FACTOR).toBe(0.5);
    expect(SPIRE_LIGHT_STAGE_H).toBe(392);
    expect(SPIRE_SHADE_TAIL).toBe(140);
    const backdrop = read('components/spire/scene/spire_scene_backdrop.tsx');
    expect(backdrop).toContain('ry={lightRy}');
    expect(backdrop).toContain('b.bleed + SPIRE_SHADE_TAIL');
    expect(backdrop).not.toMatch(/'rgba\(0,0,0,0\)'/);
  });
  it('своя строка: подсветка 6 %, ник белый', () => {
    const ped = read('components/spire/scene/SpireScenePedestal.tsx');
    expect(ped).toContain('const ME_GLASS = colorWithAlpha(SPIRE_SCENE_INK.text, 0.06);');
    expect(ped).toMatch(/sub: \{ color: SPIRE_SCENE_INK\.text,/);
  });
});

describe('Пик: позиция для окон мест — только после чтения своей недели', () => {
  it('фид позиции ждёт positionReady', () => {
    const game = read('app/spire/use_spire_game.ts');
    expect(game).toContain('const positionReady = lang !== null && weekCheckedLang === lang;');
    expect(game).toContain('rows && room && ids && lang && positionReady ?');
  });
});
