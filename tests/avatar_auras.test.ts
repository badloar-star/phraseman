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

  it('still falls back to premium aura when no explicit choice exists', () => {
    expect(getEffectiveAvatarAuraId('', true)).toBe(PREMIUM_AVATAR_AURA_ID);
    expect(getEffectiveAvatarAuraId(null, true)).toBe(PREMIUM_AVATAR_AURA_ID);
  });

  it('uses Premium aura above VIP aura when both statuses are active', () => {
    expect(getEffectiveAvatarAuraId('', true, true)).toBe(PREMIUM_AVATAR_AURA_ID);
    expect(getEffectiveAvatarAuraId(null, true, true)).toBe(PREMIUM_AVATAR_AURA_ID);
    expect(getEffectiveAvatarAuraId('', false, true)).toBe(VIP_AVATAR_AURA_ID);
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
