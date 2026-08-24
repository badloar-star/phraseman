import fs from 'node:fs';
import path from 'node:path';

const cardPath = path.join(process.cwd(), 'components/friends_together/FriendsChestCard.tsx');

function source(): string {
  return fs.readFileSync(cardPath, 'utf8');
}

describe('friends shared flame card', () => {
  it('renders the generated theme-and-stage flame art in a fixed visual slot', () => {
    const card = source();
    expect(card).toContain("from 'expo-image'");
    expect(card).toContain('friendsFlameVisual(model)');
    expect(card).toContain('resolveFriendsSharedFlameAsset(themeMode, visual.stage)');
    expect(card).toContain('recyclingKey={flameAssetKey}');
    expect(card).toContain('contentFit="contain"');
    expect(card).toContain('styles.flameSlot');
    expect(card).toContain('width: 92');
    expect(card).toContain('height: 92');
    expect(card).toContain('accessible={false}');
    expect(card).toContain('accessibilityElementsHidden');
    expect(card).toContain('importantForAccessibility="no-hide-descendants"');
  });

  it('keeps a flame icon fallback when the image cannot load', () => {
    const card = source();
    expect(card).toContain("from '@expo/vector-icons/Ionicons'");
    expect(card).toContain('const flameAssetKey = `friends-shared-flame-${themeMode}-${visual.stage}`;');
    expect(card).toContain('const flameImageFailed = failedFlameAssetKey === flameAssetKey;');
    expect(card).toContain('onError={() => setFailedFlameAssetKey(flameAssetKey)}');
    expect(card).toContain("name=\"flame\"");
  });

  it('only breathes while active or ready, visible, and motion is allowed', () => {
    const card = source();
    expect(card).toContain('const shouldBreathe = visual.animated && !reduceMotion && runtimeActive;');
    expect(card).toContain('if (!shouldBreathe) {');
    expect(card).toContain('cancelAnimation(rock);');
    expect(card).toContain('withRepeat(');
    expect(card).toContain('opacity: 0.96 + rock.value * 0.04');
    expect(card).toContain('scale: visual.scale * (1 + rock.value * 0.035)');
  });
});
