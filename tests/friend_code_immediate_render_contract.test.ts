import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('friends invite code first paint', () => {
  it('starts cached friend-code render and cloud ensure before deferred friends work', () => {
    const source = read('app/(tabs)/friends.tsx');
    const effectStart = source.indexOf('useEffect(() => {\n    mountedRef.current = true;');
    const cachedRead = source.indexOf('readCachedMyInviteCodeForFriends().then', effectStart);
    const ensureRead = source.indexOf('void syncMyInviteCode();', effectStart);
    const deferredWork = source.indexOf('InteractionManager.runAfterInteractions', effectStart);

    expect(effectStart).toBeGreaterThanOrEqual(0);
    expect(cachedRead).toBeGreaterThan(effectStart);
    expect(ensureRead).toBeGreaterThan(effectStart);
    expect(deferredWork).toBeGreaterThan(effectStart);
    expect(cachedRead).toBeLessThan(deferredWork);
    expect(ensureRead).toBeLessThan(deferredWork);
  });
});
