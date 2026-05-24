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
    expect(source).toContain('accessibilityLabel="Закрыть онбординг"');
    expect(source).toContain('await handleFinishOnboarding()');
    expect(source).toContain("AsyncStorage.setItem('onboarding_done', '1')");
  });

  it('pins every onboarding step to the welcome background image', () => {
    expect(source).toContain("const ONBOARDING_BG_WELCOME = require('../assets/images/onboarding/onboarding-bg-welcome-wide.webp')");
    for (const key of ['BETA', 'NAME', 'BUILDER', 'QUIZ', 'STREAK', 'AUTH']) {
      expect(source).toContain(`const ONBOARDING_BG_${key} = ONBOARDING_BG_WELCOME;`);
    }
    expect(source).not.toMatch(/require\('\.\.\/assets\/images\/onboarding\/onboarding-bg-(beta|name|builder|quiz|streak|auth)-wide\.webp'\)/);
  });
});
