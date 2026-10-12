// зачем (координатор 12.10, cards-009): блок «Пока пусто» (плитка · заголовок · подпись · кнопка) стоял на ≈50 dp ниже образца: первый замер родителя шёл во время анимации входа экрана (журнал: pageTop(y)=-50).
// Теперь замер повторяется после анимаций, блок показывается только по устоявшемуся замеру, высота блока (вместе с кнопкой) меряется, а журнал [CARDS-EMPTY] пишет положение всего блока.
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'cards-grid', 'CardsKit.tsx'), 'utf8');

describe('KitEmpty: centred as a whole block, re-measured after the entrance animation', () => {
  it('measures the whole block height (with the button) instead of using the 217 constant only', () => {
    expect(source).toContain('const [blockH, setBlockH] = useState(EMPTY_BLOCK_H);');
    expect(source).toContain('EMPTY_CENTER_SHIFT * blockH');
    expect(source).toContain('onLayout={onBlockLayout}');
  });

  it('re-measures after interactions and a timer, and reveals the block only when the measurement is settled', () => {
    expect(source).toMatch(/InteractionManager\.runAfterInteractions\(\(\) => measure\(true\)\)/);
    expect(source).toMatch(/setTimeout\(\(\) => measure\(true\), 800\)/);
    expect(source).toContain('const settled = final || Math.abs(y) < 1;');
    expect(source).toContain('opacity: pageTop === null || !ready ? 0 : 1');
  });

  it('logs the holder numbers and the whole block position on screen', () => {
    expect(source).toContain('[CARDS-EMPTY] holder');
    expect(source).toContain('[CARDS-EMPTY] block');
    expect(source).toContain('centerShare=');
    expect(source).toContain('hasAction=');
  });

  it('keeps the mockup centring law (top:50%, translateY(-46%))', () => {
    expect(source).toContain('const EMPTY_CENTER_SHIFT = 0.46;');
  });
});
