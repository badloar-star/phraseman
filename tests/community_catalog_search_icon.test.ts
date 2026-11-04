// зачем (удобство №3, владелец одобрил 04.11): поиск наборов в Сообществе был только за долгим нажатием «+» — теперь видимая лупа ≥44 dp в шапке;
// оба пути (лупа и долгое нажатие «+») работают.
import * as fs from 'fs';
import * as path from 'path';

const hub = fs.readFileSync(path.join(__dirname, '..', 'app/flashcards/FlashcardsCategoryHub.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('видимая лупа поиска наборов', () => {
  it('лупа стоит в шапке «Наборы» перед «+», цель 48 dp, открывает/закрывает поиск и сортировку', () => {
    const start = hub.indexOf('testID="social-catalog-search"');
    expect(start).toBeGreaterThan(-1);
    expect(start).toBeLessThan(hub.indexOf('testID="social-catalog-create"'));
    const block = hub.slice(start, start + 900);
    expect(block).toContain('width: 48, height: 48');
    expect(block).toContain('setSceneSearchOpen(v => !v)');
    expect(block).toContain('search-outline');
    expect(block).toContain('accessibilityState={{ expanded: sceneSearchOpen }}');
  });
  it('долгое нажатие «+» по-прежнему открывает поиск', () => {
    expect(hub).toContain('onLongPress={() => setSceneSearchOpen(v => !v)}');
  });
});
