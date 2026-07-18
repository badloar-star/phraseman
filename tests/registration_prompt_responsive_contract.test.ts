import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function source(): string {
  return fs.readFileSync(path.join(ROOT, 'components', 'RegistrationPromptModal.tsx'), 'utf8');
}

describe('RegistrationPromptModal responsive layout contract', () => {
  it('keeps auth prompt content scrollable inside a viewport-bound card', () => {
    const src = source();

    expect(src).toContain('useWindowDimensions');
    expect(src).toContain('const cardMaxHeight = Math.max(280, viewportHeight - 64)');
    expect(src).toContain('maxHeight: cardMaxHeight');
    expect(src).toContain("overflow: 'hidden'");
    expect(src).toContain('<ScrollView');
    expect(src).toContain('contentContainerStyle={[styles.cardContent, { padding: cardPadding }]}');
    expect(src).toContain('keyboardShouldPersistTaps="handled"');
  });

  it('keeps later/privacy/legal footer from clipping on large system text', () => {
    const src = source();

    expect(src).toContain('testID="auth-prompt-later"');
    expect(src).toContain('const captionLineHeight = Math.max(18, Math.round(f.caption * 1.4))');
    expect(src).toContain('styles.privacy');
    expect(src).toContain('styles.legalLinks');
    expect(src).toContain("flexWrap: 'wrap'");
    expect(src).toContain("width: '100%'");
  });

  it('shows an accessible busy state and allows truthful close only after the slow threshold', () => {
    const src = source();

    expect(src).toContain('ActivityIndicator');
    expect(src).toContain("testID={signInSlow ? 'auth-prompt-slow' : 'auth-prompt-busy'}");
    expect(src).toContain('accessibilityRole="progressbar"');
    expect(src).toContain('accessibilityLiveRegion="polite"');
    expect(src).toContain('AccessibilityInfo.announceForAccessibility(signInSlowLabel)');
    expect(src).toContain('signInBusyLabel');
    expect(src).toContain('waitForAuthPromptBusyFrame');
    expect(src).toContain('disabled={loadingProvider !== null}');

    const signInStart = src.indexOf('const handleSignIn = useCallback');
    expect(signInStart).toBeGreaterThan(-1);
    const signInBody = src.slice(signInStart, src.indexOf('const handleResetAndRetry', signInStart));
    expect(signInBody).toContain('await waitForAuthPromptBusyFrame();');

    const laterStart = src.indexOf('const handleLater = useCallback');
    expect(laterStart).toBeGreaterThan(-1);
    const laterBody = src.slice(laterStart, src.indexOf('return (', laterStart));
    expect(laterBody).toContain('if (loadingProvider !== null && !signInSlow) return;');
    expect(laterBody).toContain('attemptLifecycle.invalidateActiveAttempt()');
    expect(laterBody).toContain('clearSlowTimer()');
    expect(src).toContain('disabled={loadingProvider !== null && !signInSlow}');
    expect(src).toContain('accessibilityRole="button"');
  });
});
