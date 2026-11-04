// зачем (раунд 2 UX, владелец одобрил 04.11): зона пальца у стрелок месяца и «закрыть» в тепловой карте не меньше 44 dp (hitSlop 10 + сама кнопка).
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/ActivityHeatmap365.tsx'), 'utf8').split('\r\n').join('\n');

describe('тепловая карта: зона нажатия стрелок и «закрыть»', () => {
  it('у каждой кнопки навигации месяца есть hitSlop ≥ 10', () => {
    const blocks = src.split(/onPress=\{(?:onPrevious|onNext|onClose|\(\) => currentIndex)/).length - 1;
    expect(blocks).toBeGreaterThanOrEqual(5);
    const count = (src.match(/hitSlop=\{10\}/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
