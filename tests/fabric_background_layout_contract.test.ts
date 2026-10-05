import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

describe('Fabric background layout guard', () => {
  const root = process.cwd();

  it('keeps decorative background layers pinned for Fabric/Yoga layout commits', () => {
    const screenGradient = normalizeEol(fs.readFileSync(path.join(root, 'components', 'ScreenGradient.tsx'), 'utf8'));
    const appArtBackdrop = normalizeEol(fs.readFileSync(path.join(root, 'components', 'AppArtBackdrop.tsx'), 'utf8'));
    const safeLinearGradient = normalizeEol(fs.readFileSync(path.join(root, 'components', 'SafeLinearGradient.tsx'), 'utf8'));
    const topFadeMask = normalizeEol(fs.readFileSync(path.join(root, 'components', 'TopFadeMask.tsx'), 'utf8'));
    const tabLayout = normalizeEol(fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8'));

    expect(screenGradient).toContain('collapsable={false}');
    expect(screenGradient).toContain("overflow: 'visible'");
    expect(screenGradient).toContain('const SCREEN_GRADIENT_MOTION_ENABLED = false');
    expect(screenGradient).toContain('!FABRIC_BACKGROUND_TRANSITIONS_ENABLED || !SCREEN_GRADIENT_MOTION_ENABLED');
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
    expect(topFadeMask).toContain('DEFAULT_FEATHER_HEIGHT');
    expect(topFadeMask).not.toContain('DEFAULT_SAFE_AREA_TRIM');
    expect(topFadeMask).not.toContain('DEFAULT_FEATHER_OVERLAP');
    expect(topFadeMask).toContain('MaskedView');
    expect(topFadeMask).toContain('maskElement=');
    expect(topFadeMask).toContain('LinearGradient');
    expect(topFadeMask).toContain('style={StyleSheet.absoluteFill}');
    expect(topFadeMask).not.toContain("from 'expo-blur'");
    expect(topFadeMask).not.toContain('<BlurView');
    expect(topFadeMask).not.toContain('dimezisBlurView');
    expect(topFadeMask).not.toContain('FEATHER_INTENSITY_STOPS');
    expect(topFadeMask).not.toContain('feather-');
    // 2.0 (D39/D43): таббар — непрозрачная панель во всю ширину, без блюра.
    expect(tabLayout).toContain('style={[s.tabBarWrap, { height: tabDockHeight }]}');
    expect(tabLayout).toContain('backgroundColor: v2.tabBar,');
    expect(tabLayout).not.toContain("from 'expo-blur'");
    expect(tabLayout).not.toContain('<BlurView');
    expect(tabLayout).toContain("position: 'absolute'");
    expect(tabLayout).toContain('bottom: 0');
    expect(tabLayout).toContain("overflow: 'hidden'");
    expect(tabLayout).not.toContain('tabBarBackdropBlur');
    expect(tabLayout).not.toContain('tabBarBackdropTint');
    expect(tabLayout).not.toContain('tabBarBottomFill');
    expect(tabLayout).not.toContain('tabBarBackdropTintBg');
    expect(tabLayout).not.toContain('tabBarBottomFillBg');
    expect(tabLayout).not.toContain('style={[s.tabBarWrap, { height: tabBarHeight + PB }]}');
    expect(tabLayout).not.toContain('key={`wrap-${layer.id}`}\n                  collapsable={false}');
    expect(tabLayout).not.toContain('key={`bar-${layer.id}`}\n                    collapsable={false}');
    expect(tabLayout).not.toContain('key={`safe-${layer.id}`}\n                    collapsable={false}');
  });
});
