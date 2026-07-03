import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('deferred redirect route contract', () => {
  it('redirects from an effect instead of during route render', () => {
    const source = read('components/DeferredRedirect.tsx');

    expect(source).toContain('useEffect');
    expect(source).toContain('useRootNavigationState');
    expect(source).toContain('rootNavigationReady');
    expect(source).toContain('InteractionManager.runAfterInteractions');
    expect(source).toContain('setTimeout');
    expect(source).toContain('router.replace(href)');
    expect(source).toContain('return <View');
    expect(source.indexOf('if (!rootNavigationReady) return')).toBeLessThan(source.indexOf('router.replace(href)'));
    expect(source.indexOf('useEffect')).toBeLessThan(source.indexOf('router.replace(href)'));
    expect(source.indexOf('router.replace(href)')).toBeLessThan(source.indexOf('return <View'));
  });

  it.each([
    'app/index.tsx',
    'app/(tabs)/index.tsx',
    'app/+not-found.tsx',
    'app/league_screen.tsx',
    'app/lesson_verbs.tsx',
    'app/pos_analytics_audit.tsx',
    'app/admin_review_test.tsx',
    'app/settings_testers.tsx',
  ])('%s avoids calling router.replace in render', (relativePath) => {
    const source = read(relativePath);
    const isPureRouteAlias = /^export \{ default \} from ['"].+['"];?$/.test(source.trim());

    expect(source.includes('DeferredRedirect') || isPureRouteAlias).toBe(true);
    expect(source).not.toContain('useRouter');
    expect(source).not.toMatch(/router\.replace\(/);
  });
});
