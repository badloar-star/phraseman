// зачем (R1 cards-034, 12.10; журнал [CARDS-SHEET] rootWindowY=50): смещение слоя шторки действий карточки измеряется при раскладке корня, а не только после тапа, — иначе первый кадр шторки стоит на 50 dp ниже.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/flashcards/CollectionGalleryView.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('«Сохранённые»: смещение слоя шторки известно до тапа', () => {
  it('корень меряется в onLayout, значение не плодит лишних перерисовок (одинаковое не пишется), замер при тапе остаётся', () => {
    expect(src).toContain('const measureRoot = useCallback(() => {');
    expect(src).toContain('<View ref={rootRef} collapsable={false} onLayout={measureRoot} style={styles.root}>');
    expect(src).toContain('setRootWindowY((prev) => (prev === next ? prev : next));');
    expect(src).toContain('[CARDS-SHEET] root:layout rootWindowY=');
    // страховка при тапе по карточке осталась
    expect(src).toContain('[CARDS-SHEET] scrim card=');
    // слой шторки по-прежнему стоит на top: -rootWindowY высотой в окно
    expect(src).toContain("style={{ position: 'absolute', left: 0, right: 0, top: -rootWindowY, height: screenH }}");
  });
});
