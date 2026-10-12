// зачем (координатор 12.10, cards-034/006): подсказка «Зажми карточку…» не висит поверх шторки действий («Удалить») и не закрывает её ручку — внизу одна плашка за раз.
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards', 'CollectionGalleryView.tsx'), 'utf8');
const container = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_collection.tsx'), 'utf8');
const sheet = fs.readFileSync(path.join(__dirname, '..', 'components', 'mistakes-panel', 'PanelSheet.tsx'), 'utf8');

describe('gallery: hint and card actions sheet', () => {
  it('the hint is rendered only while the actions sheet is closed', () => {
    expect(source).toContain('{!selectionMode && showDeleteHint && pressedCard === null ? (');
    expect(source).toContain('[CARDS-HINT] gallery: подсказка скрыта');
  });

  // зачем (Макеты cards-032, 12.10): и шторка меню «⋯» (и остальные шторки/окна экрана) закрывает подсказку
  it('the container hides the hint under the menu sheet and every other overlay of the screen', () => {
    expect(container).toMatch(/hintCoveredByOverlay = savedActionsOpen \|\| batchDeleteConfirmOpen \|\| deletePackOpen \|\| filterOpen \|\| commentsSheetOpen \|\| packReportOpen/);
    expect(container.match(/showDeleteHint=\{showDeleteHint && !undoEntry && !packUndo && !hintCoveredByOverlay\}/g)).toHaveLength(2);
  });

  it('the sheet keeps its grab handle (44×5) and the card actions testID', () => {
    expect(sheet).toMatch(/grab: \{ width: 44, height: 5/);
    expect(source).toContain('testID="fc-card-actions"');
  });
});
