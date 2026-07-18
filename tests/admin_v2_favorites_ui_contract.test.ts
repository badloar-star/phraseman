import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');

describe('Admin v2 Global Search favorites UI', () => {
  test('uses the existing scoped favorites store only for visible search metadata', () => {
    expect(core).toContain("from './admin-v2-favorites.js'");
    expect(core).toContain('function isFavoriteNavigationId(id)');
    expect(core).toContain('globalSearchIndex.some((entry) => entry.id === id)');
    expect(core).toContain('isAllowedId: isFavoriteNavigationId');
    expect(core).toContain('favoritesStore.setScope(scope)');
  });

  test('renders an unobtrusive pinned section with labelled pin controls inside Global Search', () => {
    expect(core).toContain('id="global-search-favorites"');
    expect(core).toContain('Закреплённые разделы');
    expect(core).toContain('Пока нет закреплённых разделов.');
    expect(core).toContain('data-global-search-favorite-id');
    expect(core).toContain('aria-label="${favorite ? \'Открепить\' : \'Закрепить\'} ${escapeHtml(entry.label)}"');
    expect(core).toContain('renderGlobalSearchFavorites();');
  });

  test('clears favorites on account change or sign-out without adding data actions or network work', () => {
    expect(core).toContain('favoritesStore.clear();');
    expect(core).toContain('favoritesStore.setScope(null);');
    expect(core).not.toContain('data-action="favorite');
    expect(core).not.toContain('toggleFavorite');
  });

  test('keeps keyboard result selection inside the search listbox, never pinned favorites', () => {
    const keyboardBlock = core.slice(core.indexOf('function moveGlobalSearchSelection'), core.indexOf('function setMobileNavOpen'));
    const enterBlock = core.slice(core.indexOf("event.key === 'Enter'"), core.indexOf("event.key === 'Enter' && event.target"));

    expect(keyboardBlock).toContain("document.querySelectorAll('#global-search-results [data-global-search-route]')");
    expect(enterBlock).toContain("document.querySelectorAll('#global-search-results [data-global-search-route]')");
    expect(keyboardBlock).not.toContain("document.querySelectorAll('[data-global-search-route]')");
    expect(enterBlock).not.toContain("document.querySelectorAll('[data-global-search-route]')");
  });

  test('announces whether favorites are still session-only while the opaque scope is unavailable', () => {
    expect(core).toContain('let favoritesScopeState = \'session\';');
    expect(core).toContain('favoritesScopeState = \'loading\';');
    expect(core).toContain('favoritesScopeState = \'ready\';');
    expect(core).toContain('role="status"');
    expect(core).toContain('сохраняются только в этом сеансе');
  });
});
