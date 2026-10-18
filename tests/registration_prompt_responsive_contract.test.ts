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
    expect(src).toContain('const cardMaxHeight = Math.max(280, viewportHeight - 64 - keyboardInset)');
    expect(src).toContain('maxHeight: cardMaxHeight');
    expect(src).toContain("overflow: 'hidden'");
    expect(src).toContain('<ScrollView');
    expect(src).toContain('contentContainerStyle={[styles.sheetContent, { paddingHorizontal: cardPadding');
    expect(src).toContain('keyboardShouldPersistTaps="handled"');
  });

  it('keeps later/privacy/legal footer from clipping on large system text', () => {
    const src = source();

    expect(src).toContain('testID="auth-prompt-later"');
    expect(src).toContain('const captionLineHeight = Math.max(18, Math.round(f.caption * 1.4))');
    expect(src).toContain('styles.footerCol');
    expect(src).toContain('styles.legalLinks');
    // зачем (макет auth-states.html, координатор 18.10): «Политика» и «Условия» — по одной на строку, без разделителя; строки не обрезаются крупным шрифтом
    expect(src).toContain("flexDirection: 'column'");
    expect(src).toContain('rowGap: 6');
    expect(src).not.toContain('>|</Text>');
    expect(src).toContain("width: '100%'");
  });

  it('shows an accessible busy state and allows truthful close only after the slow threshold', () => {
    const src = source();

    // зачем (владелец 15.10): видимой строки «Входим…» больше нет — индикатор рисует сама кнопка провайдера (loading),
    // подпись живёт только в accessibilityLabel невидимого узла прогресса.
    // + макет auth-states.html (координатор 18.10): кольцо на месте значка рисует кнопка (busy), остальные приглушены (dimmed), видимая строка «Входим…» с 3 с — отдельный SignInStatusLine без своего объявления
    expect(src).toContain('busy={loadingProvider === ');
    expect(src).toContain('dimmed={');
    // зачем (Макеты A3.2, 18.10): «Входим…» стоит НА МЕСТЕ строки «Данные на устройстве сохранятся» (та же ячейка shieldRow), а не над ней; строка доверия приглушается (A2.3) и на время статуса уступает место
    expect(src).toContain('<SignInStatusLine active={loadingProvider !== null} announce={false} flush onPhaseChange={setSignInStatusPhase} />');
    expect(src).toContain("loadingProvider !== null && signInStatusPhase !== 'quiet' ? null : (");
    expect(src).toContain('loadingProvider !== null ? { opacity: 0.38 } : null');
    expect(src.indexOf('<SignInStatusLine')).toBeGreaterThan(src.indexOf('<Animated.View style={[styles.shieldRow, rise4]}>'));
    // порог 8 с размораживает «Позже» и не меняется (строка с 3 с — собственные таймеры компонента)
    expect(src).toContain('const SIGN_IN_SLOW_THRESHOLD_MS = 8_000;');
    expect(src.split('signInSlow ? signInSlowLabel : signInBusyLabel').length - 1).toBe(1);
    expect(src).toContain('accessibilityLabel={signInSlow ? signInSlowLabel : signInBusyLabel}');
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
    expect(src).toContain('disabled={(loadingProvider !== null && !signInSlow) || !recoveryDismissAllowed}');
    expect(src).toContain('accessibilityRole="button"');
  });
});
