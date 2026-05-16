import {
  NO_AVATAR_AURA_ID,
  PREMIUM_AVATAR_AURA_ID,
  getEffectiveAvatarAuraId,
  normalizeAvatarAuraId,
} from '../constants/avatar_auras';

describe('avatar aura selection', () => {
  it('keeps explicit no-aura choice from falling back to premium aura', () => {
    expect(normalizeAvatarAuraId(NO_AVATAR_AURA_ID)).toBe(NO_AVATAR_AURA_ID);
    expect(getEffectiveAvatarAuraId(NO_AVATAR_AURA_ID, true)).toBeUndefined();
  });

  it('still falls back to premium aura when no explicit choice exists', () => {
    expect(getEffectiveAvatarAuraId('', true)).toBe(PREMIUM_AVATAR_AURA_ID);
    expect(getEffectiveAvatarAuraId(null, true)).toBe(PREMIUM_AVATAR_AURA_ID);
  });
});
