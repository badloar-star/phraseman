import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8');

describe('legacy Admin native-completion cutover', () => {
  test.each([
    ['admin/index.html', './v2/index.html#'],
    ['admin/testers.html', './v2/index.html#telegram-payments'],
    ['admin/site.html', './v2/index.html#website-payments'],
    ['admin/full.html', './v2/index.html#full-content-control'],
  ])('redirects %s normally and exposes only inert archive mode', (file, target) => {
    const source = read(file);
    expect(source).toContain(target);
    expect(source).toContain("legacyArchive') === '1'");
    expect(source).toContain('data-native-completion-archive');
    expect(source).toContain('Native completion archive: no live reads or writes');
  });

  test('redirects every final legacy tab to its exact native hash', () => {
    const source = read('admin/index.html');
    for (const id of [
      'ugc-purchases', 'refunds', 'referrals', 'community-packs', 'card-packs', 'daily-phrases', 'french-quizzes',
      'explain-reports', 'mod-queue', 'help-board', 'helpers-board', 'clubs', 'league-chat', 'arena-ranks',
      'arena-live', 'arena-bets', 'arena-rooms',
    ]) expect(source).toContain(`'${id}'`);
    expect(source).toContain('installNativeCompletionRedirects');
  });
});
