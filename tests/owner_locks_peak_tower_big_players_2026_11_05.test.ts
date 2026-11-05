// ЗАМОК ВЛАДЕЛЬЦА 05.11 07:38 и 07:4x (скрин эмулятора 14_peak_tower_small_emulator_0737): «на башне все еще надо показывать иконки юзеров кто где если что»;
// «башню сделать больше по возможности и опустить вниз». Реестр docs/work/OWNER_LOCKS.md, строки 05.11. Прежние запреты в силе: без цифр этажей слева, без подписей, без «+N», без обводок.
// Ослабить можно только по новому слову владельца: правка файла + реестра + KNOWN_GUARDS в tests/owner_locks_registry.test.cjs.
import { peakTowerFit, PEAK_TOWER_BODY_UNITS } from '../components/spire/peak/peak_tower_fit';
import { pickPeakTowerPlayers, peakTowerCoinSize, PEAK_TOWER_PLAYERS_MAX, PEAK_TOWER_PER_FLOOR_MAX } from '../components/spire/peak/peak_tower_players';
import { SPIRE_TOWER_GEOM } from '../components/spire/spire_tower_model';
import type { SpireRival } from '../components/spire/spire_tower_model';
import { readSource } from './helpers/read_source';

const code = (rel: string): string => readSource(rel).split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n').replace(/\/\/[^\n]*/g, '');
const HEADROOM = 300;
const rival = (uid: string): SpireRival => ({ uid, name: uid, coinRank: 1, isPremium: false });
const rivals = (spec: Record<number, number>): Map<number, readonly SpireRival[]> => new Map(Object.entries(spec).map(([f, n]) => [Number(f), Array.from({ length: n }, (_, i) => rival(`u${f}_${i}`))]));

describe('ЗАМОК ВЛАДЕЛЬЦА 05.11 — башня Пика крупная, основание внизу, иконки игроков на башне', () => {
  it('башня занимает почти всю высоту колонки (корона → основание), на 412×915 и 375×667', () => {
    for (const [railW, railH] of [[128, 640], [116, 480], [112, 420]] as const) {
      const fit = peakTowerFit({ railWidth: railW, railHeight: railH, headroomUnits: HEADROOM });
      expect(`${railW}x${railH}: ${fit.heightShare >= 0.95}`).toBe(`${railW}x${railH}: true`);
      // тело нижнего этажа помещается в колонку
      expect(PEAK_TOWER_BODY_UNITS * fit.scale).toBeLessThanOrEqual(railW + 0.5);
    }
  });

  it('башня крупнее прежней (масштаб по ширине 31 % экрана давал ≈0,33): на 412×915 не меньше 0,5', () => {
    expect(peakTowerFit({ railWidth: 128, railHeight: 640, headroomUnits: HEADROOM }).scale).toBeGreaterThanOrEqual(0.5);
  });

  it('основание опущено вниз: рисунок уходит за низ колонки на долю нижнего поля, по горизонтали центрируется на тело', () => {
    const fit = peakTowerFit({ railWidth: 128, railHeight: 640, headroomUnits: HEADROOM });
    expect(fit.sinkDown).toBeGreaterThan(0);
    expect(fit.sinkDown).toBeLessThanOrEqual(Math.round((SPIRE_TOWER_GEOM.height - SPIRE_TOWER_GEOM.base) * fit.scale));
    expect(fit.offsetLeft).toBeCloseTo(-(fit.width - 128) / 2, 5);
  });

  it('иконки игроков: ≤ 7, два лидера + по два ближайших выше и ниже меня, не больше 3 на этаже, себя нет', () => {
    const map = rivals({ 15: 1, 14: 2, 9: 3, 8: 1, 7: 1, 6: 2, 5: 1, 2: 4, 1: 1 });
    const picked = pickPeakTowerPlayers(map, 6);
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.length).toBeLessThanOrEqual(PEAK_TOWER_PLAYERS_MAX);
    const floors = new Set(picked.map((p) => p.floor));
    expect(floors.has(15)).toBe(true); // лидер
    expect(picked.some((p) => p.floor >= 6)).toBe(true); // выше меня
    expect(picked.some((p) => p.floor < 6)).toBe(true); // ниже меня
    for (const f of floors) expect(picked.filter((p) => p.floor === f).length).toBeLessThanOrEqual(PEAK_TOWER_PER_FLOOR_MAX);
    expect(new Set(picked.map((p) => p.uid)).size).toBe(picked.length);
  });

  it('пустая комната или нет соперников — иконок нет; без своего этажа показываем только лидеров', () => {
    expect(pickPeakTowerPlayers(undefined, 3)).toEqual([]);
    expect(pickPeakTowerPlayers(new Map(), 3)).toEqual([]);
    expect(pickPeakTowerPlayers(rivals({ 12: 1, 3: 1, 1: 1 }), null).map((p) => p.floor).sort((a, b) => b - a)).toEqual([12, 3]);
  });

  it('монета на башне компактная и растёт вместе с башней, но не выходит за 18–30 dp', () => {
    expect(peakTowerCoinSize(0.2)).toBe(18);
    expect(peakTowerCoinSize(0.5)).toBe(23);
    expect(peakTowerCoinSize(2)).toBe(30);
  });

  it('экран Пика B: рисует иконки игроков на башне, масштаб башни — от высоты колонки; прежние запреты на месте', () => {
    const src = code('components/spire/peak/PeakScreenV2.tsx');
    expect(src).toContain('<PeakTowerPlayers players={towerPlayers} scale={towerFit.scale} />');
    expect(src).toContain('pickPeakTowerPlayers(towerProps.rivalsByFloor, towerProps.myFloor)');
    expect(src).toContain('windowHeight={towerFit.height}');
    expect(src).toContain('themeColors={towerTheme}'); // башня — в цветах темы экрана, не серая на светлом (Макеты 05.11)
    expect(src).toContain('bottom: -towerFit.sinkDown');
    // запреты: без цифр этажей слева и без «+N» (rivalsByFloor самой башне не передаём)
    expect(src).toContain('hideFloorWords rivalsByFloor={undefined}');
    // слой иконок — без обводок и без номеров
    const layer = code('components/spire/peak/PeakTowerPlayers.tsx');
    expect(layer).not.toMatch(/borderWidth|borderColor/);
    expect(layer).toContain('plus={false}');
  });
});
