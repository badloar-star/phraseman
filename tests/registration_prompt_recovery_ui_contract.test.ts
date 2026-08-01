import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'RegistrationPromptModal.tsx'),
  'utf8',
);

describe('RegistrationPromptModal recovery UI contract', () => {
  it('uses the accepted flow and never calls legacy recovery wrappers', () => {
    expect(source).toContain('createAuthRecoveryFlow');
    expect(source).not.toContain('requestAuthRecoveryCode');
    expect(source).not.toContain('confirmAuthRecoveryCode');
    expect(source).toContain("testID=\"auth-recovery-entry\"");
    expect(source).toContain("testID=\"auth-recovery-code-input\"");
    expect(source).toContain('keyboardType="number-pad"');
    expect(source).toContain('maxLength={6}');
  });

  it('adds a separate reachable clean-install recovery path without replacing legacy recovery', () => {
    expect(source).toContain('createCleanInstallRecoveryFlow');
    expect(source).toContain('getCleanInstallRecoveryCopy');
    expect(source).toContain('getCleanInstallRecoveryScreen');
    expect(source).toContain('flow.resumeConfirmed()');
    expect(source).toContain('flow.resendCode(cleanRecoveryEmail)');
    expect(source).toContain('testID="auth-clean-recovery-entry"');
    expect(source).toContain('testID="auth-clean-recovery-email-input"');
    expect(source).toContain('testID="auth-clean-recovery-code-input"');
    expect(source).toContain('testID="auth-clean-recovery-resend"');
    expect(source).toContain('testID="auth-clean-recovery-resend-email-input"');
    expect(source).toContain('autoComplete="email"');
    expect(source).toContain('keyboardType="email-address"');
    expect(source).toContain('normalizeRecoveryCodeInput(value)');
    expect(source).toContain('const cancelTask = flow.cancel()');
    expect(source).toContain('cleanRecoveryCancelPromiseRef.current = cancelTask');
    expect(source).toContain('await cancelTask');
    expect(source).toContain('cleanRecoveryCopy.changeEmail');
    expect(source.match(/testID="auth-recovery-entry"/g)?.length).toBe(1);
  });

  it('keeps clean-install sent messaging generic and gives every action an accessible state', () => {
    expect(source).toContain('cleanRecoveryCopy.sentBody');
    expect(source).not.toContain('cleanRecoveryFlowState.maskedEmail');
    expect(source).toContain("authOperationGateRef.current.tryBegin('clean_recovery')");
    expect(source).toContain("authOperationGateRef.current.release('clean_recovery')");
    expect(source).toContain('cleanRecoveryDismissAllowed');
    expect(source).toContain('accessibilityLiveRegion="polite"');
  });

  it('offers tertiary recovery at startup and after a provider mismatch', () => {
    expect(source).toContain("context === 'startup_recovery'");
    expect(source).toContain("result.error === 'recovery_provider_mismatch'");
    expect(source).toContain('setRecoveryOfferedAfterMismatch(true)');
    expect(source.match(/testID="auth-recovery-entry"/g)?.length).toBe(1);
  });

  it('uses stable insets, gated timer cleanup, accessible targets, and fail-closed support', () => {
    expect(source).toContain('useStableSafeAreaInsets');
    expect(source).not.toContain("from 'react-native-safe-area-context'");
    expect(source).toContain('useIsScreenFocused');
    expect(source).toContain("AppState.addEventListener('change'");
    expect(source).toContain('clearInterval');
    expect(source).toContain('accessibilityLiveRegion="polite"');
    expect(source).toContain('minHeight: 44');
    expect(source).toContain('color: t.correctText');
    expect(source).toContain("recoveryStage === 'adopting'");
    expect(source).toContain('const recoveryDismissAllowed = isRecoveryDismissible(recoveryStage)');
    expect(source).toContain('disabled={!recoveryDismissAllowed}');
    expect(source).toContain('recoveryExpiryCountdown');
    expect(source).toContain('recoveryCopy.errorExpired');
    expect(source).toContain('recoveryHint?.maskedEmail');
    expect(source).toContain("testID=\"auth-recovery-support\"");
  });

  it('disposes the named secondary flow and restores cloud once after silent success', () => {
    expect(source).toContain('flow.dispose()');
    expect(source).toContain('createAuthRecoveryCompletion');
    expect(source).toContain('restoreFromCloudDetailed');
    expect(source).toContain("emitAppEvent('auth_provider_linked')");
    const completionStart = source.indexOf('createAuthRecoveryCompletion');
    expect(source.slice(completionStart, completionStart + 600)).not.toContain('action_toast');
  });
});
