import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('admin snapshot loading contract', () => {
  it('does not refresh Firestore data after the page has loaded', () => {
    const source = read('admin/index.html');

    expect(source).not.toContain('setInterval(');
    expect(source).not.toContain('onSnapshot(');
    expect(source).not.toContain('void updateTabBadges();');
  });

  it('loads full user data only and has no lightweight users mode', () => {
    const source = read('admin/index.html');

    expect(source).not.toContain('LITE_USERS_LIMIT');
    expect(source).not.toContain('loadUsersLite');
    expect(source).not.toContain('window._usersLiteSample');
    expect(source).not.toContain("query(collection(db, 'users'), limit(");
    expect(source).toContain("const usersQuery = collection(db, 'users');");
  });
});
