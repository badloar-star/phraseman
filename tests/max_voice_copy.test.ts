import { maxVoiceFailureTitle } from '../app/max_voice_copy';

describe('MAX failure copy', () => {
  it('does not call a failed initial connection a reconnect', () => {
    expect(maxVoiceFailureTitle('media_failed', 'ru')).toBe('Не удалось начать звонок');
  });

  it('keeps reconnect wording only for an exhausted live-call reconnect', () => {
    expect(maxVoiceFailureTitle('reconnect_exhausted', 'ru')).toBe('Не удалось восстановить связь');
  });
});
