// зачем (координатор 15.10): полоса состояний dev-превью Шпиля перекрывала низ кадров — spirePanel=off скрывает её, spirePanel=dot сворачивает в точку.
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '..', 'app', 'dev_spire_preview.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('dev-превью Шпиля: скрытие полосы состояний', () => {
  it('off — без полосы и точки; dot — точка, тап раскрывает; по умолчанию как раньше (только при selector=1)', () => {
    expect(src).toMatch(/params\.spirePanel === 'off' \? 'off' : params\.spirePanel === 'dot' \? 'dot' : 'strip'/);
    expect(src).toMatch(/const showStrip = panelMode !== 'off' && \(params\.selector === '1' \|\| panelMode === 'dot'\) && \(panelMode === 'strip' \|\| dotOpen\);/);
    expect(src).toMatch(/const showDot = panelMode === 'dot';/);
    expect(src).toContain('testID="dev-spire-panel-dot"');
  });
});
