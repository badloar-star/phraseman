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

test('RegistrationPromptModal: retry only for not_uploaded; blocked has no retry and no «Сменить аккаунт» button (правило владельца 18.10)', () => {
  const source = read('components/RegistrationPromptModal.tsx');
  const start = source.indexOf('const refusalCopy = signInRefusalCopyFor(result.error, lang);');
  expect(start).toBeGreaterThan(0);
  const branch = source.slice(start, source.indexOf('return;', start));
  expect(branch).toContain('if (refusalCopy.offersAccountSwitch) {');
  expect(branch).toContain('setRetryProvider(null);');
  expect(branch).toContain('showInlineError(refusalCopy.title, refusalCopy.body);');
  // зачем (правила владельца 18.10, приёмка Сайта): перехода в «Настройки → Сменить аккаунт» из окна входа больше нет — ни кнопки, ни состояния «предложить смену»
  expect(branch).not.toContain('setSwitchAccountOffered');
  expect(branch).not.toContain('setSwitchAccountActionText');
  expect(source).not.toContain('testID="auth-switch-account"');
  expect(source).not.toContain('SETTINGS_OPEN_ACCOUNT_SWITCH_PARAM');
});

test('CleanOnboarding describeAuthError uses the same copy for both codes', () => {
  const source = read('components/CleanOnboarding.tsx');
  const start = source.indexOf('function describeAuthError(');
  const body = source.slice(start, start + 6000);
  // 12.10 (аудит Онбординга): онбординг берёт гостевой вариант — без «Настроек», куда гостю не попасть.
  expect(body).toContain("signInRefusalCopyFor(code, lang, 'onboarding')");
});

test('onboarding guest variant of backup_blocked never sends the guest to Settings (9 languages)', () => {
  const settingsWords = /Настройк|Налаштуван|Settings|Ajustes|Cài đặt|Pengaturan|Ayarlar|Ustawieni/;
  for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    const copy = signInRefusalCopyFor('local_progress_backup_blocked', lang, 'onboarding');
    expect(copy).not.toBeNull();
    expect(copy!.offersAccountSwitch).toBe(false);
    expect(`${copy!.title} ${copy!.body}`).not.toMatch(settingsWords);
  }
  // окно входа в приложении — прежний текст с кнопкой «Сменить аккаунт»
  expect(signInRefusalCopyFor('local_progress_backup_blocked', 'ru')).toEqual({ ...localProgressBackupBlockedCopy('ru'), offersAccountSwitch: true });
});
