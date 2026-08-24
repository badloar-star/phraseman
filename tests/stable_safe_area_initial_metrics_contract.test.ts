import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function readProjectFile(...parts: string[]): string {
  return fs.readFileSync(path.join(root, ...parts), 'utf8');
}

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe('stable safe-area initial metrics contract', () => {
  it('feeds root safe area from stable initial metrics, not raw native metrics', () => {
    const source = readProjectFile('app', '_layout.tsx');

    expect(source).toMatch(/import \{[^}]*stableInitialWindowMetrics[^}]*\} from '\.\/stable_safe_area_metrics';/);
    expect(source).toContain('<SafeAreaProvider initialMetrics={stableInitialWindowMetrics}>');
    expect(source).not.toContain('initialMetrics={initialWindowMetrics}');
  });

  it('keeps retained tab content on root-owned stable insets without a nested provider', () => {
    const source = readProjectFile('app', '(tabs)', 'friends.tsx');

    expect(source).toContain("import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';");
    expect(source).toContain('const insets = useStableSafeAreaInsets();');
    expect(source).not.toContain('SafeAreaProvider');
  });

  it('reserves the status-bar top inset before native safe-area updates arrive', () => {
    const source = readProjectFile('app', 'stable_safe_area_metrics.ts');

    expect(source).toMatch(/StatusBar\??\.currentHeight/);
    expect(source).toContain('Constants.statusBarHeight');
    expect(source).toContain('top: Math.max(baseInsets.top, fallbackTop)');
    expect(source).toContain('export const stableInitialWindowMetrics');
    expect(source).toContain('export function getStableSafeAreaTopInset');
    expect(source).toContain('export function useStableSafeAreaInsets');
  });

  it('keeps every app SafeAreaProvider on stable initial metrics', () => {
    const providers = listSourceFiles(path.join(root, 'app')).flatMap((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return source.includes('SafeAreaProvider') ? [{ file, source }] : [];
    });

    expect(providers.length).toBeGreaterThan(0);
    for (const provider of providers) {
      const relativePath = path.relative(root, provider.file);
      if (relativePath === path.join('app', 'stable_safe_area_metrics.ts')) continue;
      expect(provider.source).not.toContain('initialMetrics={initialWindowMetrics}');
      expect(provider.source).toContain('initialMetrics={stableInitialWindowMetrics}');
    }
  });

  it('keeps screen code on the stable safe-area hook instead of raw native insets', () => {
    const sourceFiles = ['app', 'components', 'hooks'].flatMap((dir) => listSourceFiles(path.join(root, dir)));

    for (const file of sourceFiles) {
      const relativePath = path.relative(root, file);
      if (relativePath === path.join('app', 'stable_safe_area_metrics.ts')) continue;

      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toMatch(/import\s+\{[^}]*\buseSafeAreaInsets\b[^}]*\}\s+from ['"]react-native-safe-area-context['"]/);
      expect(source).not.toMatch(/\buseSafeAreaInsets\s*\(/);
    }
  });

  it('uses stable safe-area insets for the tab scaffold padding', () => {
    const source = readProjectFile('app', '(tabs)', '_layout.tsx');

    expect(source).toContain("import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';");
    expect(source).toContain('const insets = useStableSafeAreaInsets();');
    expect(source).toContain('paddingTop: insets.top');
    expect(source).not.toContain("import { useSafeAreaInsets } from 'react-native-safe-area-context';");
  });
});
