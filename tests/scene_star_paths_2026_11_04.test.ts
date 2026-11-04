// Статичные звёзды сцены → ≤5 Path по ступеням прозрачности (координатор 04.11, дамп Главной: Circle 312 из 1 334 View).
import fs from 'node:fs';
import path from 'node:path';
import { groupStarsByAlpha, STAR_ALPHA_STEPS } from '../components/scene/scene_star_paths';

const stars = (() => {
  let st = 12345;
  const rnd = () => { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
  return Array.from({ length: 172 }, () => ({ x: rnd(), y: rnd(), r: 0.9 + rnd() * 0.9, a: 0.3 + rnd() * 0.35 }));
})();

describe('groupStarsByAlpha', () => {
  const groups = groupStarsByAlpha(stars, 390, 800, 8);
  it('не более 5 групп; мерцающие (каждая 8-я) не рисуются, остальные сохранены все', () => {
    expect(groups.length).toBeLessThanOrEqual(STAR_ALPHA_STEPS);
    const expected = stars.filter((_, i) => i % 8 !== 0).length;
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(expected);
    expect(groups.reduce((n, g) => n + (g.d.match(/M/g)?.length ?? 0), 0)).toBe(expected);
  });
  it('сдвиг прозрачности не больше половины шага (≈0,035)', () => {
    const kept = stars.filter((_, i) => i % 8 !== 0);
    const lo = Math.min(...kept.map((s) => s.a)); const hi = Math.max(...kept.map((s) => s.a));
    const half = (hi - lo) / STAR_ALPHA_STEPS / 2 + 0.002;
    for (const s of kept) expect(Math.min(...groups.map((g) => Math.abs(g.a - s.a)))).toBeLessThanOrEqual(half);
    expect(half).toBeLessThan(0.04);
  });
  it('пустой список и одна прозрачность — без падений', () => {
    expect(groupStarsByAlpha([], 10, 10, 8)).toEqual([]);
    expect(groupStarsByAlpha([{ x: 0.5, y: 0.5, r: 1, a: 0.4 }, { x: 0.2, y: 0.2, r: 1, a: 0.4 }], 100, 100, 8).length).toBe(1);
  });
});

describe('подключение в SceneBackdrop', () => {
  it('цикла Circle по звёздам больше нет, звёзды идут группами Path; мерцание SceneStarTwinkle сохранено', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/scene/SceneBackdrop.tsx'), 'utf8');
    expect(src).not.toMatch(/<Circle\b/);
    expect(src).toContain('groupStarsByAlpha(');
    expect(src).toContain('<SceneStarTwinkle');
  });
});
