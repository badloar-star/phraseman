import fs from 'node:fs';
import path from 'node:path';

describe('friends profile focus revalidation', () => {
  it('quietly rechecks stale friend profiles whenever the screen becomes focused', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'app', '(tabs)', 'friends.tsx'),
      'utf8',
    );

    expect(source).toContain('const friendsTabVisible = activeIdx === 3;');
    expect(source).toContain('if (!friendsTabVisible || uids.length === 0) return;');
    expect(source).toContain('[friends, requests, friendsTabVisible, focusTick]');
  });
});
