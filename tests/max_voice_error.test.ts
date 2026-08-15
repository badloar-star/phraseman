import {
  MaxVoiceStageError,
  maxVoiceFailureReason,
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

  it('surfaces a missing admin claim for protected DEV access', () => {
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
