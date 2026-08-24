import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

describe('Cards sibling navigation contract', () => {
  test('the three sibling roots crossfade while pack collection remains a child transition', () => {
    const layout = read('app', '_layout.tsx');

    expect(layout).toContain("animation: 'fade', animationDuration: 140");
    expect(layout).toMatch(/name="flashcards" options=\{cardsSiblingAnimationOptions\}/);
    expect(layout).toMatch(/name="flashcards_packs" options=\{cardsSiblingAnimationOptions\}/);
    expect(layout).toMatch(/name="flashcards_my_packs" options=\{cardsSiblingAnimationOptions\}/);
    expect(layout).not.toMatch(/name="flashcards_collection" options=\{cardsSiblingAnimationOptions\}/);
  });

  test('a visible sheet consumes Android Back before the tab menu or route', () => {
    const tabbar = read('app', 'flashcards', 'FlashcardsTabBar.tsx');
    const start = tabbar.indexOf("BackHandler.addEventListener('hardwareBackPress'");
    const end = tabbar.indexOf('return () => sub.remove();', start);
    const handler = tabbar.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(handler).toContain('if (pickerOption)');
    expect(handler).toContain('setPickerOption(null);');
    expect(handler).toContain('if (mistakeSheetVisible)');
    expect(handler).toContain('setMistakeSheetVisible(false);');
    expect(handler.indexOf('if (pickerOption)')).toBeLessThan(handler.indexOf('consumeFcTabBackPress(menu)'));
    expect(handler.indexOf('if (mistakeSheetVisible)')).toBeLessThan(handler.indexOf('consumeFcTabBackPress(menu)'));
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

  test('only sibling roots replace; create actions remain child pushes', () => {
    const tabbar = read('app', 'flashcards', 'FlashcardsTabBar.tsx');
    const start = tabbar.indexOf('const onCreateOption = useCallback(');
    const end = tabbar.indexOf('const onPacksOption = useCallback(', start);
    const handler = tabbar.slice(start, end);

    expect(handler).toContain('router.push({ pathname: target.pathname, params: target.params } as any);');
    expect(handler).not.toContain('go(target);');
    expect(handler).not.toContain('markNextNavigationAsReplace()');
  });
});
