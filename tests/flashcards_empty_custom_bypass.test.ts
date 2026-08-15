import fs from 'fs';
import path from 'path';
import { shouldBypassEmptyCustomCollection } from '../app/flashcards/tabbar_state';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('empty custom cards route bypass', () => {
  it('bypasses only an empty, loaded custom-card collection', () => {
    expect(shouldBypassEmptyCustomCollection({
      collectionDataReady: true,
      activeCat: 'custom',
      packDeeplink: null,
      customCardCount: 0,
    })).toBe(true);
    expect(shouldBypassEmptyCustomCollection({
      collectionDataReady: true,
      activeCat: 'custom',
      packDeeplink: null,
      customCardCount: 1,
    })).toBe(false);
    expect(shouldBypassEmptyCustomCollection({
      collectionDataReady: true,
      activeCat: 'custom',
      packDeeplink: 'community-pack',
      customCardCount: 0,
    })).toBe(false);
  });

  it('redirects directly to the editor and removes the intermediate UI copy', () => {
    const collection = read('app', 'flashcards_collection.tsx');
    const emptyState = read('app', 'flashcards', 'CollectionListView.tsx');
    expect(collection).toContain('if (bypassEmptyCustomCollection)');
    expect(collection).toContain('if (resolvingEmptyCustomCollection)');
    expect(collection).toContain("pathname: '/flashcards_card_editor'");
    expect(collection).toMatch(/markNextNavigationAsReplace\(\);\s*router\.replace\(\{/);
    expect(collection).not.toContain('import { Redirect,');
    expect(read('app', 'flashcards_card_editor.tsx')).toMatch(
      /leaveEditorAfterSave[\s\S]*markNextNavigationAsReplace\(\);[\s\S]*pathname: '\/flashcards_collection'[\s\S]*cat: 'custom'/,
    );
    expect(emptyState).not.toContain('+ Создать первую карточку');
    expect(emptyState).not.toContain('testID="fc-create-card-empty"');
  });

  it('does not import the route screen just to use data helpers', () => {
    const editor = read('app', 'flashcards_card_editor.tsx');
    const packs = read('app', 'flashcards_packs.tsx');
    const categoryHub = read('app', 'flashcards', 'FlashcardsCategoryHub.tsx');
    const layout = read('app', '_layout.tsx');
    expect(editor).not.toContain("from './flashcards_collection'");
    expect(packs).not.toContain("from './flashcards_collection'");
    expect(categoryHub).not.toContain("from '../flashcards_collection'");
    expect(layout).not.toContain("import('./flashcards_collection')");
  });
});
