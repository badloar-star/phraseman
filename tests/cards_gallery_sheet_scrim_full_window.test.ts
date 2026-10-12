// зачем (координатор 12.10, cards-034): затемнение за шторкой действий карточки должно покрывать весь экран, включая шапку «‹ поиск + ⋮» (образец).
// Шторка рисуется слоем внутри области под шапкой; слой растягивается вверх на положение корня в окне (measureInWindow) и на высоту окна.
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards', 'CollectionGalleryView.tsx'), 'utf8');

describe('gallery card actions sheet: scrim over the whole window', () => {
  it('measures the root position in the window while the sheet is open and logs the numbers', () => {
    expect(source).toContain('const rootRef = useRef<View>(null);');
    expect(source).toContain('rootRef.current?.measureInWindow(');
    expect(source).toContain('[CARDS-SHEET] scrim');
    expect(source).toContain('<View ref={rootRef} collapsable={false} style={styles.root}>');
  });

  it('wraps the sheet in a layer shifted up by the root offset and as tall as the window', () => {
    expect(source).toContain("style={{ position: 'absolute', left: 0, right: 0, top: -rootWindowY, height: screenH }}");
    expect(source).toContain('<PanelSheet visible={pressedCard !== null}');
    expect(source).toContain('testID="fc-card-actions">');
  });
});
