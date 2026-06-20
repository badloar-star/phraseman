import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'onboarding.tsx'), 'utf8');

describe('onboarding responsive layout contract', () => {
  it('keeps every onboarding ScrollView constrained so small screens can scroll', () => {
    expect(source).toContain('style: styles.onboardingScroll');
    expect(source).toContain('onboardingScroll: { flex: 1 }');
    expect(source).toContain('nestedScrollEnabled: true');
  });

  it('uses compact sizing for narrow or short onboarding viewports', () => {
    expect(source).toContain('viewportH < 740');
    expect(source).toContain('narrowViewport < 380');
    expect(source).toContain('uiScale * (shortViewport ? 0.94 : 1)');
    expect(source).toContain('scaleOnboarding(compactOnboarding ? 38 : 52, 34)');
  });

  it('keeps the name step usable when the keyboard is open', () => {
    expect(source).toContain("behavior={Platform.OS === 'ios' ? 'padding' : 'height'}");
    expect(source).toContain("justifyContent: keyboardVisible ? 'flex-start' : 'center'");
    expect(source).toContain('paddingBottom: (keyboardVisible ? 44 : 24) + keyboardPad + insets.bottom');
  });

  it('offers a top-right emergency close that completes onboarding', () => {
    expect(source).toContain('testID="onboarding-close"');
    expect(source).toContain('accessibilityLabel=');
    expect(source).toContain('await handleFinishOnboarding()');
    expect(source).toContain("AsyncStorage.setItem('onboarding_done', '1')");
  });

  it('keeps one moving library background with the graphite dim layer', () => {
    expect(source).toContain("const ONBOARDING_BG_LIBRARY = require('../assets/images/onboarding/onboarding-bg-welcome-wide.webp');");
    for (const key of ['WELCOME', 'BETA', 'NAME', 'BUILDER', 'QUIZ', 'STREAK', 'AUTH']) {
      expect(source).toContain(`const ONBOARDING_BG_${key} = ONBOARDING_BG_LIBRARY;`);
      expect(source).not.toContain(`const ONBOARDING_BG_${key} = null;`);
    }
    expect(source).toContain('ONBOARDING_BG_LIBRARY,');
    expect(source).toContain('<Animated.Image');
    expect(source).toContain('Animated.loop');
    expect(source).toContain('baseGradientColors');
    expect(source).toContain('dimGradientColors');
    expect(source).toContain("'rgba(0,0,0,0.92)'");
    expect(source).not.toContain('colors={[theme.bgBottom, theme.bgTop, theme.bgEdge]}');
    expect(source).not.toContain('onboarding-professor-observatory.webp');
    expect(source).not.toContain('onboarding-phrase-archive.webp');
    expect(source).not.toContain('onboarding-sage-council.webp');
    expect(source).not.toContain('ONBOARDING_THEME_BLUE');
    expect(source).not.toContain('ONBOARDING_THEME_GREEN');
  });
});
