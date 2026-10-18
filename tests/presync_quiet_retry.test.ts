// зачем (владелец 18.10 «ни один вход без ошибки, кроме «нет сети»»; разбор sign-in-refusals-audit п.2): тихие повторы
// выгрузки и аварийной копии гостя перед отказом local_progress_not_uploaded; и фоновая выгрузка гостя не чаще раза в 6 ч.
import { presyncBackupWithQuietRetry, presyncUploadWithQuietRetry } from '../app/presync_quiet_retry';
import {
  GUEST_BACKGROUND_UPLOAD_MIN_INTERVAL_MS,
  maybeUploadGuestOnBackground,
  resetGuestBackgroundUploadForTest,
} from '../app/guest_background_upload';

const quiet = () => undefined;

describe('presyncUploadWithQuietRetry', () => {
  it('быстрый сбой повторяется; со второго раза — выгружено', async () => {
    const attempt = jest.fn()
      .mockResolvedValueOnce({ uploaded: false, refusal: 'error', errorCode: 'x' })
      .mockResolvedValueOnce({ uploaded: true, refusal: 'not_uploaded', errorCode: null });
    await expect(presyncUploadWithQuietRetry(attempt, [0, 0], quiet)).resolves.toMatchObject({ uploaded: true, attempts: 2 });
  });

  it('таймаут не повторяется (ещё 20 с ожидания хуже)', async () => {
    const attempt = jest.fn().mockResolvedValue({ uploaded: false, refusal: 'timeout', errorCode: 'timeout_swap_presync' });
    await expect(presyncUploadWithQuietRetry(attempt, [0, 0], quiet)).resolves.toMatchObject({ uploaded: false, attempts: 1 });
  });

  // зачем (Авторизация 18.10): отказ по существу (сервер не даёт писать гостя) повтор не исправит.
  it('отказ по существу (identity_mismatch) не повторяется', async () => {
    const attempt = jest.fn().mockResolvedValue({ uploaded: false, refusal: 'identity_mismatch', errorCode: null });
    await expect(presyncUploadWithQuietRetry(attempt, [0, 0], quiet)).resolves.toMatchObject({ uploaded: false, attempts: 1 });
  });

  it('не больше трёх попыток', async () => {
    const attempt = jest.fn().mockResolvedValue({ uploaded: false, refusal: 'error', errorCode: 'x' });
    await expect(presyncUploadWithQuietRetry(attempt, [0, 0], quiet)).resolves.toMatchObject({ uploaded: false, attempts: 3 });
  });
});

describe('presyncBackupWithQuietRetry', () => {
  it('сбой проверки копии повторяется; со второго раза — копия есть', async () => {
    const attempt = jest.fn().mockResolvedValueOnce('account_switch_backup_verification_failed').mockResolvedValueOnce(null);
    await expect(presyncBackupWithQuietRetry(attempt, [0, 0], quiet)).resolves.toEqual({ backupCode: null, attempts: 2 });
  });

  it('«нельзя по состоянию устройства» не повторяется', async () => {
    const attempt = jest.fn().mockResolvedValue('account_switch_backup_other_owner_pending');
    await expect(presyncBackupWithQuietRetry(attempt, [0, 0], quiet)).resolves.toEqual({ backupCode: 'account_switch_backup_other_owner_pending', attempts: 1 });
  });
});

describe('maybeUploadGuestOnBackground', () => {
  const T = 1_800_000_000_000;
  const deps = (over: Record<string, unknown> = {}) => ({
    isGuest: () => true,
    hasMeaningfulProgress: async () => true,
    upload: jest.fn(async () => true),
    readLastAtMs: async () => null,
    writeLastAtMs: jest.fn(async () => undefined),
    nowMs: () => T,
    log: quiet,
    ...over,
  });
  beforeEach(() => resetGuestBackgroundUploadForTest());

  it('гость с прогрессом, давно не выгружался — выгрузка и метка времени', async () => {
    const d = deps();
    await expect(maybeUploadGuestOnBackground(d)).resolves.toBe('uploaded');
    expect(d.writeLastAtMs).toHaveBeenCalledWith(T);
  });

  it('💸 не чаще раза в 6 часов', async () => {
    const d = deps({ readLastAtMs: async () => T - GUEST_BACKGROUND_UPLOAD_MIN_INTERVAL_MS + 1 });
    await expect(maybeUploadGuestOnBackground(d)).resolves.toBe('skipped_recent');
    expect(d.upload).not.toHaveBeenCalled();
  });

  it('не гость и гость без прогресса — без выгрузки', async () => {
    const a = deps({ isGuest: () => false });
    await expect(maybeUploadGuestOnBackground(a)).resolves.toBe('skipped_not_guest');
    const b = deps({ hasMeaningfulProgress: async () => false });
    await expect(maybeUploadGuestOnBackground(b)).resolves.toBe('skipped_no_progress');
    expect(a.upload).not.toHaveBeenCalled();
    expect(b.upload).not.toHaveBeenCalled();
  });

  it('сбой выгрузки не бросает и не ставит метку — повтор при следующем уходе в фон', async () => {
    const d = deps({ upload: jest.fn(async () => { throw new Error('network'); }) });
    await expect(maybeUploadGuestOnBackground(d)).resolves.toBe('failed');
    expect(d.writeLastAtMs).not.toHaveBeenCalled();
  });
});
