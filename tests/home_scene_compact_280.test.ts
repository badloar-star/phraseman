import { homeSceneStageHeight } from '../components/home/v2/scene/home_scene_fit';
import { readSource } from './helpers/read_source';

describe('compact home scene', () => {
  it('uses the approved 280dp baseline', () => {
    expect(homeSceneStageHeight({ windowH: 844, windowW: 390, pillTop: 800, fontScale: 1, share: 0.46 })).toBe(280);
  });

  it('keeps the approved upper hero text-only while preserving dynamic safe-area input', () => {
    const stage = readSource('components/home/v2/scene/HomeSceneStage.tsx');
    const view = readSource('components/home/v2/scene/HomeScene.tsx');
    expect(stage).not.toMatch(/ThemedArtLayers|MaskedView|homeSceneHeroFade|heroReady|artAccent|artDim/);
    expect(view).not.toMatch(/resolveHomeSceneArt|subscribePremiumThemePackCache|art=\{null\}/);
    expect(view).toContain('const topInset = p.topInset ?? 0;');
    expect(view).toContain('topInset={topInset}');
  });

  it('reserves the measured overlay header and never caps scene accessibility text', () => {
    const stage = readSource('components/home/v2/scene/HomeSceneStage.tsx');
    const view = readSource('components/home/v2/scene/HomeScene.tsx');
    const energy = readSource('components/home/v2/scene/HomeSceneEnergy.tsx');
    const header = readSource('components/home/v2/HomeV2Header.tsx');
    expect(view).toContain('onLayout={handleHeaderLayout}');
    expect(view).toContain('headerHeight={headerHeight}');
    expect(stage).toContain('Math.max(TOP_SPACE, headerHeight - topInset)');
    expect(energy).not.toContain('maxFontSizeMultiplier={1.1}');
    expect(header).toContain('maxFontSizeMultiplier={scene ? undefined : 1.1}');
    expect(header).toContain("statsScene: { gap: 8, flexWrap: 'wrap' }");
    expect(header).toContain('const scaledSceneText = useScaledTextStyles(HEADER_TEXT_STYLES);');
    expect(header).toContain('const headerText = scene ? scaledSceneText : HEADER_TEXT_STYLES;');
  });
});
