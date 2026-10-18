import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'RegistrationPromptModal.tsx'),
  'utf8',
);
const onboardingSource = fs.readFileSync(
  path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'),
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
    expect(source).toContain('color: glass.ctaFillInk'); // [BLEND-AUTH] 18.10: подпись главной кнопки — пара ctaFill/ctaFillInk
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

  it('account-switch-required in the sign-in sheet: no «phone already linked» text and no «Сменить аккаунт» button — guest gets the warning sheet, signed-in A goes straight to B', () => {
    expect(source).toContain("result.error === 'account_switch_required'");
    expect(source).toContain('setRetryProvider(null)');
    // зачем (правила владельца 18.10, приёмка Сайта account_switch_owner_rules_1018; прежнее §127 отменено): текста про привязку телефона и кнопки с переходом в Настройки в окне входа больше нет;
    // гость с прогрессом видит шторку GuestSwitchWarningSheet, а старый отказ (если пришёл) даёт мягкую карточку сбоя.
    expect(source).not.toContain('accountSwitchRequiredCopy');
    expect(source).not.toContain('SETTINGS_OPEN_ACCOUNT_SWITCH_PARAM');
    expect(source).not.toContain('testID="auth-switch-account"');
    expect(source).toContain('<GuestSwitchWarningSheet');
    expect(source).toContain("setSignInFailureKind('other')");
    // зачем (Макеты A4.8, 18.10): отмена выбора аккаунта и отказы со своей причиной — мягкая карточка, а не красный текст с кнопкой «Повторить»
    // отмена окна выбора аккаунта — ТИХО (решение координатора 18.10): журнал [AUTH-CANCEL], карточки нет
    expect(source).toContain('[AUTH-CANCEL] provider=');
    expect(source).not.toContain("setSignInFailureKind('cancelled')");
    expect(source).toContain('testID="sign-in-no-method"');
    expect(source).toContain('showFailureCopy(refusalCopy.title, refusalCopy.body);');
    expect(source).toContain('title={signInFailureCopy?.title}');
    const handleStart = source.indexOf('const handleSignIn = useCallback');
    const handleEnd = source.indexOf('const resetInFlightRef');
    const handler = source.slice(handleStart, handleEnd);
    expect(handler.match(/showInlineError\(/g)?.length ?? 0).toBeLessThanOrEqual(2); // остались только запасные ветки с видом сбоя (карточка прячет красный текст)
    const copySource = fs.readFileSync(path.join(__dirname, '..', 'app', 'account_switch_copy.ts'), 'utf8');
    expect(copySource).toContain('Твой прогресс на месте');
    expect(onboardingSource).toContain("code === 'account_switch_required'");
    // зачем (Переводчик 18.10, c073caee1): «Локальный прогресс» — слово разработчика; текст тот же по смыслу, простыми словами
    expect(onboardingSource).toContain('Прогресс на этом телефоне сохранён');
    // зачем (04.10): техническая строка с кодом ошибки добавляется к тексту ТОЛЬКО при включённых dev-инструментах (ENABLE_DEV_TOOLS) — в сборке
    // для людей её нет; прежняя проверка «этой строки в файле нет» была записана до появления dev-замка и ловила его. Охраняем суть: код
    // никогда не показывается без замка и сам текст account_switch_required берётся из простого текста, а не из кода ошибки.
    // зачем (стал строже): строки с машинным кодом в онбординге больше нет вовсе — даже под dev-замком (прежний пин «ENABLE_DEV_TOOLS && code» устарел)
    expect(onboardingSource).not.toMatch(/ENABLE_DEV_TOOLS\s*&&\s*code/);
    expect(onboardingSource).not.toMatch(/return code\s*\?/);
  });

  it('keeps identity reset tooling opt-in instead of exposing it in the login sheet', () => {
    expect(source).toContain('ENABLE_AUTH_IDENTITY_DEBUG');
    expect(source).not.toContain('{__DEV__ && context !== \'startup_recovery\' && (');
  });
});
