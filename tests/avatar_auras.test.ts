import {
  NO_AVATAR_AURA_ID,
  PREMIUM_AVATAR_AURA_ID,
  VIP_AVATAR_AURA_ID,
  getEffectiveAvatarAuraId,
  getAvatarAuraById,
  normalizeAvatarAuraId,
} from '../constants/avatar_auras';

describe('avatar aura selection', () => {
  it('keeps explicit no-aura choice from falling back to premium aura', () => {
    expect(normalizeAvatarAuraId(NO_AVATAR_AURA_ID)).toBe(NO_AVATAR_AURA_ID);
    expect(getEffectiveAvatarAuraId(NO_AVATAR_AURA_ID, true)).toBeUndefined();
  });

  it('does not grant an aura from Plus status without an explicit paid or owned selection', () => {
    expect(getEffectiveAvatarAuraId('', true)).toBeUndefined();
    expect(getEffectiveAvatarAuraId(null, true)).toBeUndefined();
  });

  it('keeps explicitly selected status auras independent of current entitlement', () => {
    expect(getEffectiveAvatarAuraId(PREMIUM_AVATAR_AURA_ID, false, false)).toBe(PREMIUM_AVATAR_AURA_ID);
    expect(getEffectiveAvatarAuraId(VIP_AVATAR_AURA_ID, false, false)).toBe(VIP_AVATAR_AURA_ID);
  });

  it('presents paid and admin-granted Plus aura variants under the same user-facing label', () => {
    const paidPlusAura = getAvatarAuraById(PREMIUM_AVATAR_AURA_ID);
    const vipAura = getAvatarAuraById(VIP_AVATAR_AURA_ID);

    expect(paidPlusAura).toBeDefined();
    expect(vipAura).toBeDefined();

    const labelKeys = ['nameRu', 'nameUk', 'nameEs', 'namePtBr', 'nameVi', 'nameId', 'nameTr', 'namePl'] as const;
    for (const key of labelKeys) {
      expect(paidPlusAura![key]).toBe('Plus');
      expect(vipAura![key]).toBe('Plus');
    }
  });
});
