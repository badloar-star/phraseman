import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('onboarding interface-language menu', () => {
  it('uses the persisted language callback and only offers visible interface languages', () => {
    expect(source).toContain('onLangSelect,');
    expect(source).toContain('getVisibleInterfaceLanguageOptions(IS_STORE_RELEASE)');
    expect(source).toContain('onboarding-interface-language-menu');
  });

  it('keeps the language chooser accessible and restores focus to its trigger', () => {
    expect(source).toContain('accessibilityViewIsModal');
    expect(source).toContain('restoreLanguageMenuFocus');
    expect(source).toContain('onboarding-interface-language-option-');
  });

  it('places the welcome trigger below the stable top safe-area inset', () => {
    expect(source).toContain('const insets = useStableSafeAreaInsets();');
    expect(source).toContain('style={[styles.welcomeLanguageMenu, { top: insets.top + 2 }]}');
    expect(source).not.toMatch(/welcomeLanguageMenu:\s*\{[^}]*\btop:\s*2\b/s);
  });
});
