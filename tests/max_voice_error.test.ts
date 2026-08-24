import {
  MaxVoiceStageError,
  isMaxVoiceFailureRetryable,
  maxVoiceFailureMessage,
  maxVoiceFailureReason,
  shouldOfferMaxUpgradeForVoiceReason,
} from '../app/max_voice_error';

describe('MAX Voice error normalization', () => {
  it('extracts the server reason from a wrapped Firebase Functions error', () => {
    expect(maxVoiceFailureReason({
      code: 'functions/failed-precondition',
      message: '[functions/failed-precondition] voice_disabled',
    }, 'preflight_failed')).toBe('voice_disabled');
  });

  it('keeps quota and provider failures distinct', () => {
    expect(maxVoiceFailureReason(new Error('voice_quota_exhausted'), 'mint_failed'))
      .toBe('voice_quota_exhausted');
    expect(maxVoiceFailureReason(new Error('voice_provider_failed'), 'mint_failed'))
      .toBe('voice_provider_failed');
  });

  it('distinguishes daily and monthly quota exhaustion while accepting the legacy detail', () => {
    expect(maxVoiceFailureReason({
      message: 'voice_daily_quota_exhausted',
      details: 'voice_quota_exhausted',
    }, 'mint_failed')).toBe('voice_daily_quota_exhausted');
    expect(maxVoiceFailureReason({
      message: 'voice_monthly_quota_exhausted',
      details: 'voice_quota_exhausted',
    }, 'mint_failed')).toBe('voice_monthly_quota_exhausted');
  });

  it('explains the real reset window and keeps both quota failures non-retryable', () => {
    expect(maxVoiceFailureMessage('voice_daily_quota_exhausted', 'ru'))
      .toContain('сегодня');
    const monthlyMessage = maxVoiceFailureMessage('voice_monthly_quota_exhausted', 'ru');
    expect(monthlyMessage).toContain('следующ');
    expect(monthlyMessage).not.toContain('сегодня');
    expect(isMaxVoiceFailureRetryable('voice_daily_quota_exhausted')).toBe(false);
    expect(isMaxVoiceFailureRetryable('voice_monthly_quota_exhausted')).toBe(false);
  });

  it('offers MAX upgrade only when the lifetime trial is unavailable', () => {
    expect(shouldOfferMaxUpgradeForVoiceReason('voice_max_required')).toBe(true);
    expect(shouldOfferMaxUpgradeForVoiceReason('voice_monthly_quota_exhausted')).toBe(false);
    expect(shouldOfferMaxUpgradeForVoiceReason('voice_daily_quota_exhausted')).toBe(false);
    expect(isMaxVoiceFailureRetryable('voice_monthly_quota_exhausted')).toBe(false);
  });

  it('uses device-neutral microphone settings copy on every platform', () => {
    const message = maxVoiceFailureMessage('media_failed', 'ru');
    expect(message).toContain('настройках устройства');
    expect(message).not.toMatch(/iPhone|Android/i);
  });

  // DEV-гейт снят навсегда (владелец 2026-08-16) — свежий сервер этот reason не
  // шлёт. Парсер обязан продолжать его понимать: старые сборки в проде ещё могут
  // получить его от не обновлённой функции, и им нужен внятный текст, а не сырое
  // исключение. Экранного текста у reason больше нет — показывается общий.
  it('still parses the retired dev_admin_required reason from older builds', () => {
    expect(maxVoiceFailureReason(new Error('[functions/permission-denied] dev_admin_required'), 'mint_failed'))
      .toBe('dev_admin_required');
  });

  it('normalizes platform network and timeout text', () => {
    expect(maxVoiceFailureReason(new Error('The network connection was lost'), 'mint_failed'))
      .toBe('network_unavailable');
    expect(maxVoiceFailureReason({ code: 'functions/deadline-exceeded' }, 'mint_failed'))
      .toBe('server_timeout');
  });

  it('carries a safe machine reason across the transport boundary', () => {
    const error = new MaxVoiceStageError('voice_max_required', new Error('private raw detail'));
    expect(error.message).toBe('voice_max_required');
    expect(maxVoiceFailureReason(error, 'mint_failed')).toBe('voice_max_required');
  });
});
