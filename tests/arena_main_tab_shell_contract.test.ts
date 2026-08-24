import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Arena main-tab shell contract', () => {
  it('owns a real physical page instead of an external tabbar shortcut', () => {
    const layout = read('app/(tabs)/_layout.tsx');
    const route = read('app/(tabs)/arena.tsx');
    expect(layout).toContain('loadArenaScreen');
    expect(layout).toContain("2: '/(tabs)/arena'");
    expect(route).toContain("runtimeOwnerId === 'arena'");
    expect(layout).not.toMatch(/key:\s*'arena'[\s\S]{0,220}logicalIdx:\s*-1/);
  });

  it('exposes /arena from the URL-transparent tabs group only', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/(tabs)/arena.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'app/arena.tsx'))).toBe(false);
    expect(read('app/_layout.tsx')).not.toContain('<Stack.Screen name="arena" />');
  });

  it('announces the center tab as Arena instead of Settings', () => {
    const layout = read('app/(tabs)/_layout.tsx');
    expect(layout).toContain("tab.key === 'arena' ? 'Арена'");
  });
});
