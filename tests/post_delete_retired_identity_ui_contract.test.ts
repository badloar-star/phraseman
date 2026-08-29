import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const prompt = fs.readFileSync(path.join(root, 'components/RegistrationPromptModal.tsx'), 'utf8');
const onboarding = fs.readFileSync(path.join(root, 'components/CleanOnboarding.tsx'), 'utf8');

test('retired identity never offers recovery or repeats the same provider sign-in loop', () => {
  expect(prompt).toContain('const showRecoveryEntry = false');
  expect(prompt).toContain('const showCleanRecoveryEntry = false');
  const start = prompt.indexOf("if (result.error === 'identity_retired')");
  const end = prompt.indexOf("if (result.error?.includes(APPLE_ANDROID_MISSING_SERVICE_ID))", start);
  const branch = prompt.slice(start, end);
  expect(branch).toContain('setRetryProvider(null)');
  expect(branch).toContain('setRecoveryPanelVisible(false)');
  expect(branch).toContain('setCleanRecoveryPanelVisible(false)');
  expect(branch).toContain('onClose()');
  expect(branch).not.toContain('showInlineError');
  expect(branch).not.toContain('handleSignIn');
});

test('email and code recovery panels are unreachable from every live auth context', () => {
  expect(prompt).toContain('{showRecoveryEntry && !recoveryPanelVisible');
  expect(prompt).toContain('{showCleanRecoveryEntry && !recoveryPanelVisible');
  expect(prompt).not.toContain("const showRecoveryEntry = context === 'startup_recovery'");

  // The legacy controllers remain compiled for rollback compatibility, but the
  // only state transitions capable of exposing either panel are handlers whose
  // sole render-site is behind the literal-false owner seal above.
  expect(prompt.match(/setRecoveryPanelVisible\(true\)/g)).toHaveLength(1);
  expect(prompt.match(/setCleanRecoveryPanelVisible\(true\)/g)).toHaveLength(1);
  expect(prompt.match(/onPress=\{handleRecoveryEntry\}/g)).toHaveLength(1);
  expect(prompt.match(/onPress=\{handleCleanRecoveryEntry\}/g)).toHaveLength(1);
  expect(prompt).toContain('testID="auth-recovery-entry"');
  expect(prompt).toContain('testID="auth-clean-recovery-entry"');

  const recoveryEntry = prompt.slice(
    prompt.indexOf('{showRecoveryEntry && !recoveryPanelVisible'),
    prompt.indexOf('{showCleanRecoveryEntry && !recoveryPanelVisible'),
  );
  const cleanRecoveryEntry = prompt.slice(
    prompt.indexOf('{showCleanRecoveryEntry && !recoveryPanelVisible'),
    prompt.indexOf('{cleanRecoveryPanelVisible && ('),
  );
  expect(recoveryEntry).toContain('onPress={handleRecoveryEntry}');
  expect(cleanRecoveryEntry).toContain('onPress={handleCleanRecoveryEntry}');
});

test('ordinary onboarding treats retired identity as a fresh empty-profile transition, not an error', () => {
  expect(onboarding).toContain("if (result.error === 'identity_retired')");
  expect(onboarding).toContain("go('welcome')");
  expect(onboarding).toContain('setAuthError(null)');
  expect(onboarding).not.toContain('Попробуй войти ещё раз — откроется новый профиль');
});
