// Требование владельца 18.10: подсказка о долгом нажатии для удаления не показывается ни в галерее, ни в списке.
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards', 'CollectionGalleryView.tsx'), 'utf8');
const container = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_collection.tsx'), 'utf8');
const sheet = fs.readFileSync(path.join(__dirname, '..', 'components', 'mistakes-panel', 'PanelSheet.tsx'), 'utf8');

describe('gallery: card actions without a delete hint', () => {
  it('does not render or pass the long-press deletion hint in either view', () => {
    const list = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards', 'CollectionListView.tsx'), 'utf8');
    expect(source).not.toContain('showDeleteHint');
    expect(list).not.toContain('showDeleteHint');
    expect(container).not.toContain('showDeleteHint=');
  });

  it('the sheet keeps its grab handle (44×5) and the card actions testID', () => {
    expect(sheet).toMatch(/grab: \{ width: 44, height: 5/);
    expect(source).toContain('testID="fc-card-actions"');
  });
});
