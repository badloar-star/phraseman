/*
 * AA S2d раунды 2–3 (§134 (б), §135 ❓1; тексты «Дизайна» 8e3db6525 и 6eb7937ec):
 * отказы входа, когда прогресс гостя не удалось ни выгрузить, ни сохранить копией.
 *  - local_progress_not_uploaded — сбой связи/записи: текст «Прогресс на месте…»,
 *    «Повторить» остаётся, кнопки перехода нет;
 *  - local_progress_backup_blocked — копию сделать нельзя по состоянию устройства:
 *    свой текст «Дизайна», «Повторить» снимается, кнопка «Сменить аккаунт» — тот же
 *    переход, что у account_switch_required.
 * Распределение кодов отказа копии — tests/aa_s2d_presync_backup_refusal.test.ts.
 */
import * as fs from 'fs';
import * as path from 'path';
import { localProgressNotUploadedCopy, signInRefusalCopyFor } from '../app/account_sync_copy';
import { localProgressBackupBlockedCopy } from '../app/account_backup_blocked_copy';

test('not_uploaded → Design copy, retry kept, no account switch button', () => {
  expect(signInRefusalCopyFor('local_progress_not_uploaded', 'ru')).toEqual({
    ...localProgressNotUploadedCopy('ru'),
    offersAccountSwitch: false,
  });
  expect(localProgressNotUploadedCopy('ru').title).toBe('Прогресс на месте');
});

test('backup_blocked → its own Design copy and the «Сменить аккаунт» button', () => {
  expect(signInRefusalCopyFor('local_progress_backup_blocked', 'en')).toEqual({
    ...localProgressBackupBlockedCopy('en'),
    offersAccountSwitch: true,
  });
});

test('other sign-in errors are not mapped here', () => {
  expect(signInRefusalCopyFor('account_switch_required', 'ru')).toBeNull();
  expect(signInRefusalCopyFor('swap_timeout_swap_presync_20000ms', 'en')).toBeNull();
  expect(signInRefusalCopyFor('', 'en')).toBeNull();
});

function read(rel: string): string {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test('RegistrationPromptModal: retry only for not_uploaded; blocked offers the same settings switch button', () => {
  const source = read('components/RegistrationPromptModal.tsx');
  const start = source.indexOf('const refusalCopy = signInRefusalCopyFor(result.error, lang);');
  expect(start).toBeGreaterThan(0);
  const branch = source.slice(start, source.indexOf('return;', start));
  expect(branch).toContain('if (refusalCopy.offersAccountSwitch) {');
  expect(branch).toContain('setRetryProvider(null);');
  expect(branch).toContain('setSwitchAccountOffered(true);');
  expect(branch).toContain('setSwitchAccountActionText(refusalCopy.action);');
  expect(branch).toContain('showInlineError(refusalCopy.title, refusalCopy.body);');
  // Кнопка — один и тот же переход в «Сменить аккаунт?», подпись — от текущего отказа.
  const buttonStart = source.indexOf('testID="auth-switch-account"');
  const button = source.slice(buttonStart, buttonStart + 1200);
  expect(button).toContain("navigateAfterModalClose(onClose, () => router.push({ pathname: '/(tabs)/settings', params: { [SETTINGS_OPEN_ACCOUNT_SWITCH_PARAM]: '1' } }));");
  expect(button).toContain('switchAccountActionText ?? accountSwitchRequiredCopy(lang).action');
});

test('CleanOnboarding describeAuthError uses the same copy for both codes', () => {
  const source = read('components/CleanOnboarding.tsx');
  const start = source.indexOf('function describeAuthError(');
  const body = source.slice(start, start + 6000);
  expect(body).toContain('signInRefusalCopyFor(code, lang)');
});
