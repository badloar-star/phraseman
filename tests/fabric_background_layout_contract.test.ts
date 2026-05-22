import fs from 'fs';
import path from 'path';

describe('Fabric background layout guard', () => {
  const root = process.cwd();

  it('keeps decorative background layers pinned for Fabric/Yoga layout commits', () => {
    const screenGradient = fs.readFileSync(path.join(root, 'components', 'ScreenGradient.tsx'), 'utf8');
    const appArtBackdrop = fs.readFileSync(path.join(root, 'components', 'AppArtBackdrop.tsx'), 'utf8');
    const safeLinearGradient = fs.readFileSync(path.join(root, 'components', 'SafeLinearGradient.tsx'), 'utf8');
    const tabLayout = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');

    expect(screenGradient).toContain('collapsable={false}');
    expect(screenGradient).toContain("overflow: 'visible'");
    expect(screenGradient).toContain('const defaultEntranceY');
    expect(screenGradient).not.toContain('styles.foreground');
    expect(screenGradient).toContain('staticParallaxY === undefined ? (entranceOffsetY ?? defaultEntranceY) : undefined');

    expect(appArtBackdrop).not.toContain('collapsable={false}');
    expect(appArtBackdrop).not.toContain('function AppArtBackdropLayer');
    expect(appArtBackdrop).not.toContain('style={styles.root}\n    >');

    expect(safeLinearGradient).toContain('return <ExpoLinearGradient {...props} />;');
    expect(safeLinearGradient).not.toContain('nativeFabricUIManager');
    expect(safeLinearGradient).not.toContain('<View');
    expect(safeLinearGradient).not.toContain('collapsable={collapsable ?? false}');
    expect(tabLayout).toContain('const showTabBackdrop = currentRouteIsTab && activeTabBackdropSource !== null;');
    expect(tabLayout).toContain("artBackdrop={false}");
    expect(tabLayout).not.toContain('key={`wrap-${layer.id}`}\n                  collapsable={false}');
    expect(tabLayout).not.toContain('key={`bar-${layer.id}`}\n                    collapsable={false}');
    expect(tabLayout).not.toContain('key={`safe-${layer.id}`}\n                    collapsable={false}');
  });
});
