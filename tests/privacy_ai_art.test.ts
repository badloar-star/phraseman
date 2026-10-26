import { privacyAiStateArt } from '../modules/privacy/privacy_ai_art';

describe('privacy AI state artwork', () => {
  it('shows the approved disabled marker only while consent is off', () => {
    expect(privacyAiStateArt(false)).toBe('ai_off');
    expect(privacyAiStateArt(true)).toBeNull();
  });
});
