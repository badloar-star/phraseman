// зачем (координатор 13.10, №25б): на вершине окно башни показывает верх башни (кровля, конус, навершие), а не только середину.
import fs from 'node:fs';
import path from 'node:path';
import { SPIRE_CROWN_RISE, SPIRE_FINIAL_SLACK, spireCrownTopY, spireWindowScrollY } from '../components/spire/spire_tower_crown';
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM } from '../components/spire/spire_tower_model';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('верх башни в окне', () => {
  const scale = 0.95;
  const top = SPIRE_TOWER_GEOM.floors[SPIRE_FLOOR_COUNT - 1];
  const crownTopY = spireCrownTopY(top.y, scale);

  it('подъём кровли берётся из геометрии Crown: барабан 34 + конус 168 + навершие/свечение 36', () => {
    expect(SPIRE_CROWN_RISE).toBe(238);
    const svg = read('components/spire/SpireTowerSvg.tsx');
    expect(svg).toContain('const yd = t.y - 34;');
    expect(svg).toContain('const apex = yd - 168;');
    expect(top.y).toBeGreaterThan(SPIRE_CROWN_RISE); // запас сверху в содержимом (TOP_PAD) вмещает всю кровлю: отступ добавлять не нужно
    // зачем (закон владельца 14.10): запас теперь берётся из границы башни лиги (ореол ×2.6 на вершине); крыша окна считается с этим запасом, а не с константой 238
    expect(spireCrownTopY(top.y, 1, 300)).toBe(top.y - 300);
  });

  it('вершина (15), окно 400 (по макету): окно у самого верха — запас «НАД ОБЛАКАМИ», навершие, кровля и свой этаж в кадре', () => {
    const cy = (top.y + top.h / 2) * scale;
    const y = spireWindowScrollY({ cy, windowH: 400, crownTopY, floorHalf: (top.h / 2) * scale, nearTop: true });
    expect(y).toBe(0);
    expect(cy + (top.h / 2) * scale).toBeLessThanOrEqual(400);
  });

  it('вершина (15), окно 276 (ниже нужного): свой этаж (Страж, 60) виден целиком, над ним показано максимум башни; допуск на срез навершия снят (SLACK = 0)', () => {
    // зачем (закон владельца 14.10): статичные показы не режут башню — допуск 12 снят; если окно ниже нужного, свой этаж остаётся виден, остальное — максимум башни над ним
    const cy = (top.y + top.h / 2) * scale;
    const half = (top.h / 2) * scale;
    const y = spireWindowScrollY({ cy, windowH: 276, crownTopY, floorHalf: half, nearTop: true });
    expect(SPIRE_FINIAL_SLACK).toBe(0);
    expect(y).toBeCloseTo(cy + half - 276, 5); // низ этажа у низа окна
    expect(y).toBeLessThan(cy - 138); // раньше центровка уводила окно ниже: верх башни был срезан целиком
    expect(cy + half).toBeLessThanOrEqual(y + 276);
  });

  it('14 этаж в узком окне: свой этаж важнее — прежняя центровка; в окне 400 — верх виден и этаж тоже', () => {
    const f14 = SPIRE_TOWER_GEOM.floors[13];
    const cy = (f14.y + f14.h / 2) * scale;
    const half = (f14.h / 2) * scale;
    // зачем (закон владельца 14.10): в узком окне свой 14 этаж остаётся виден, над ним — максимум башни (низ этажа у низа окна); прежняя центровка срезала верх целиком
    expect(spireWindowScrollY({ cy, windowH: 276, crownTopY, floorHalf: half, nearTop: true })).toBeCloseTo(Math.max(0, cy + half - 276), 5);
    const tall = spireWindowScrollY({ cy, windowH: 400, crownTopY, floorHalf: half, nearTop: true });
    // зачем (закон владельца 14.10): запас сверху вырос (TOP_PAD 360) — в окне 400 верх башни целиком (crownTopY) и 14 этаж помещаются вместе, но уже не от нулевого смещения
    expect(tall).toBeCloseTo(crownTopY, 5);
    expect(cy + half).toBeLessThanOrEqual(tall + 400);
  });

  it('остальные этажи и выключенный nearTop — только центровка по этажу', () => {
    const f6 = SPIRE_TOWER_GEOM.floors[5];
    const cy = (f6.y + f6.h / 2) * scale;
    expect(spireWindowScrollY({ cy, windowH: 400, crownTopY, floorHalf: 20, nearTop: false })).toBeCloseTo(Math.max(0, cy - 200), 5);
  });

  it('подпись «НАД ОБЛАКАМИ» есть в сцене башни и в словарях (запас сверху с подписью, как в образце)', () => {
    expect(read('components/spire/SpireTowerSvg.tsx')).toMatch(/aboveClouds|НАД ОБЛАКАМИ/i);
    expect(read('components/spire/spire_strings.ts')).toMatch(/aboveClouds/);
    // зачем (закон владельца 14.10): запас над верхним этажом вырос 300 → 360 — ореол «вершины недели» самой большой лиги (r = 135) не должен уходить выше верха SVG; число стережёт tests/spire_tower_no_clip_contract.test.ts
    expect(read('components/spire/spire_tower_model.ts')).toContain('TOP_PAD = 360'); // запас над верхним этажом вмещает подпись, навершие, кровлю и ореол
  });

  it('башня прокручивает через spireWindowScrollY и пишет журнал [SPIRE-DOCK-INSET]', () => {
    const tower = read('components/spire/SpireTower.tsx');
    expect(tower).toContain('spireWindowScrollY({');
    expect(tower).toContain("[SPIRE-DOCK-INSET] top");
  });
});
