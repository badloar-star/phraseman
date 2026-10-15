// зачем (Ревизор 15.10, R02 п.5; закон владельца 14.10 «пик башни не обрезается, свет тоже»): выбор этажа 14–15 тапом с нижнего этажа прокручивает окно башни к верху башни тем же расчётом, что свой этаж на вершине.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'spire', 'SpireTower.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('башня Пика: выбранный верхний этаж', () => {
  it('эффект на selected прокручивает окно к верху для этажей 14–15, не дублируя прокрутку своего этажа', () => {
    expect(src).toContain("selected < SPIRE_FLOOR_COUNT - 1 || selected === myFloor");
    expect(src).toContain("scrollToFloor(selected, true, 'выбран-верхний-этаж')");
  });
});
