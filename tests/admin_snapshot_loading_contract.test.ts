import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

/**
 * Extracts the body of a top-level `window.<name> = async function(...) { ... }`
 * (or `= function(...)`) assignment so a contract can be scoped to one loader
 * instead of the whole file. Returns '' if not found.
 */
function extractWindowFn(source: string, name: string): string {
  const marker = `window.${name} = `;
  const start = source.indexOf(marker);
  if (start === -1) return '';
  // Skip past the parameter list so a default like `(options = {})` is not
  // mistaken for the function body.
  const parenClose = source.indexOf(')', start);
  if (parenClose === -1) return '';
  const braceOpen = source.indexOf('{', parenClose);
  if (braceOpen === -1) return '';
  let depth = 0;
  for (let i = braceOpen; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(braceOpen, i + 1);
    }
  }
  return '';
}

describe('admin snapshot loading contract', () => {
  it('does not refresh Firestore user data after the page has loaded', () => {
    const source = read('admin/v2/legacy.html');

    // No realtime listeners anywhere — the admin reads point-in-time snapshots,
    // never a live Firestore subscription.
    expect(source).not.toContain('onSnapshot(');
    // Badges must not silently re-fetch on load.
    expect(source).not.toContain('void updateTabBadges();');

    // The users loader specifically must not poll Firestore on a timer.
    // NOTE: a blanket file-wide `setInterval(` ban would be wrong — the page
    // legitimately uses setInterval for the mobile-nav readiness poller and the
    // arena live auto-refresh timer, neither of which touches user data. So we
    // scope the guard to the loadUsers function body.
    const loadUsersBody = extractWindowFn(source, 'loadUsers');
    expect(loadUsersBody).not.toBe('');
    expect(loadUsersBody).not.toContain('setInterval(');
    expect(loadUsersBody).not.toContain('onSnapshot(');
  });

  it('loads users via pagination and defaults to search-first mode', () => {
    const source = read('admin/v2/legacy.html');

    // No leftover "lightweight users" experiment.
    expect(source).not.toContain('LITE_USERS_LIMIT');
    expect(source).not.toContain('loadUsersLite');
    expect(source).not.toContain('window._usersLiteSample');
    expect(source).not.toContain("query(collection(db, 'users'), limit(");

    // No single-shot full load of the users collection — the old
    // `const usersQuery = collection(db, 'users');` + one `getDocs` is gone.
    expect(source).not.toContain("const usersQuery = collection(db, 'users');");
    expect(source).not.toContain("getDocs(collection(db, 'users'))");

    // Full load is paginated: ordered by document id with a startAfter cursor.
    const loadUsersBody = extractWindowFn(source, 'loadUsers');
    expect(loadUsersBody).not.toBe('');
    expect(loadUsersBody).toContain("orderBy('__name__')");
    expect(loadUsersBody).toContain('startAfter(cursor)');

    // Search-first is the default: the Users tab does NOT load all 10k+ users on
    // open. A "📋 Загрузить всех" toggle opts into the full paginated load.
    expect(source).toContain('window._usersLoadAllMode');
    expect(source).toContain('usersSearchLookup');
    expect(source).toContain('renderUsersSearchState');
    expect(source).toContain('toggleLoadAllUsers');
    expect(source).toContain('Загрузить всех');
  });
});
