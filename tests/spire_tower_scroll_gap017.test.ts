// зачем (Макеты spire-gap-017): scrollTo до измерения содержимого уходил в 0 — башня оставалась на вершине при этаже игрока. Теперь запрос откладывается до onContentSizeChange.
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '..', 'components', 'spire', 'SpireTower.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('Шпиль: башня встаёт на этаж игрока', () => {
  it('прокрутка откладывается, пока содержимое не измерено, и повторяется после layout', () => {
    expect(src).toMatch(/const ready = contentHRef\.current >= needH - 1;/);
    expect(src).toMatch(/if \(!ready\) \{ pendingRef\.current = \{ floor \}; return; \}/);
    expect(src).toMatch(/onContentSizeChange=\{onContentSizeChange\}/);
    expect(src).toMatch(/if \(pending\) scrollToFloor\(pending\.floor, false, 'после-layout'\);/);
  });
  it('все пути вызова размечены причиной и логируются [SPIRE-SCROLL]', () => {
    for (const why of ["'нет-этажа'", "'первый-показ'", "'смена-этажа'"]) expect(src).toContain(why);
    expect(src).toContain('[SPIRE-SCROLL] получено');
    expect(src).toContain('[SPIRE-SCROLL] пропуск');
  });
  it('логику этажей и Ядро не импортирует', () => {
    expect(src).not.toMatch(/app\/spire|use_spire_game|SPIRE-GATE/);
  });
});
