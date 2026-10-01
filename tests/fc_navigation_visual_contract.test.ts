import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

describe('Cards sibling navigation contract', () => {
  test('the three sibling roots switch immediately while pack collection remains a child route', () => {
    const layout = read('app', '_layout.tsx');

    expect(layout).toContain("const INSTANT_STACK_ANIMATION = { animation: 'none', animationDuration: 0 } as const;");
    expect(layout).toContain('const cardsSiblingAnimationOptions = INSTANT_STACK_ANIMATION;');
    expect(layout).toMatch(/name="flashcards" options=\{cardsSiblingAnimationOptions\}/);
    expect(layout).toMatch(/name="flashcards_packs" options=\{cardsSiblingAnimationOptions\}/);
    expect(layout).toMatch(/name="flashcards_my_packs" options=\{cardsSiblingAnimationOptions\}/);
    expect(layout).not.toMatch(/name="flashcards_collection" options=\{cardsSiblingAnimationOptions\}/);
  });

  // зачем (2.0): своя капсула «Карточек» (FlashcardsTabBar) удалена как мёртвый код —
  // раздел живёт под общим V2TabBar (координатор, 01.10). Её Back-обработчик и меню
  // «Создать» ушли вместе с ней; монтирование сторожит fc_cards_hub_entry_contract.
  test('the retired Cards capsule tab bar stays deleted', () => {
    expect(fs.existsSync(path.join(root, 'app', 'flashcards', 'FlashcardsTabBar.tsx'))).toBe(false);
  });

  test('collection Back clears local UI state before leaving the route', () => {
    const collection = read('app', 'flashcards_collection.tsx');
    const start = collection.indexOf('const handleCollectionBack = useCallback(');
    const end = collection.indexOf('React.useEffect', start);
    const handler = collection.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    const searchCondition = 'if (searchInput.length > 0 || searchActive)';
    expect(handler.indexOf('if (filterOpen)')).toBeLessThan(handler.indexOf(searchCondition));
    expect(handler.indexOf(searchCondition)).toBeLessThan(handler.indexOf("if (viewMode === 'deck')"));
    expect(handler.indexOf("if (viewMode === 'deck')")).toBeLessThan(handler.indexOf('leaveCollection();'));
    expect(collection).toContain('onBack={handleCollectionBack}');
  });

  test('collection Back clears text even before the debounced query becomes active', () => {
    const collection = read('app', 'flashcards_collection.tsx');
    const start = collection.indexOf('const handleCollectionBack = useCallback(');
    const end = collection.indexOf('const { isPremium }', start);
    const handler = collection.slice(start, end);

    expect(handler).toContain('if (searchInput.length > 0 || searchActive)');
    expect(handler).toContain("setSearchInput('');");
    expect(handler).toContain("setSearchQuery('');");
  });

});
