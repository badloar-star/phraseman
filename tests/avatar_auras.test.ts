import {
  NO_AVATAR_AURA_ID,
  PLUS_AVATAR_AURA_ID,
  PRO_AVATAR_AURA_ID,
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
    expect(getEffectiveAvatarAuraId('', true)).toBe(PLUS_AVATAR_AURA_ID);
    expect(getEffectiveAvatarAuraId(null, true)).toBe(PLUS_AVATAR_AURA_ID);
  });

  it('resolves paid and admin-granted Plus to one canonical gold aura', () => {
    expect(PREMIUM_AVATAR_AURA_ID).toBe(PLUS_AVATAR_AURA_ID);
    expect(VIP_AVATAR_AURA_ID).toBe(PLUS_AVATAR_AURA_ID);
    expect(getEffectiveAvatarAuraId('', true, true)).toBe(PLUS_AVATAR_AURA_ID);
    expect(getEffectiveAvatarAuraId('', false, true)).toBe(PLUS_AVATAR_AURA_ID);
    expect(normalizeAvatarAuraId('aura-premium')).toBe(PLUS_AVATAR_AURA_ID);
    expect(normalizeAvatarAuraId('aura-vip')).toBe(PLUS_AVATAR_AURA_ID);
  });

  it('renders legacy Plus IDs through the canonical catalog definition', () => {
    const paidPlusAura = getAvatarAuraById('aura-premium');
    const vipAura = getAvatarAuraById('aura-vip');

    expect(paidPlusAura).toBeDefined();
    expect(vipAura).toBeDefined();
    expect(paidPlusAura).toBe(vipAura);
    expect(paidPlusAura?.id).toBe(PLUS_AVATAR_AURA_ID);

    const labelKeys = ['nameRu', 'nameUk', 'nameEs', 'namePtBr', 'nameVi', 'nameId', 'nameTr', 'namePl'] as const;
    for (const key of labelKeys) {
      expect(paidPlusAura![key]).toBe(vipAura![key]);
      expect(paidPlusAura![key].trim()).not.toBe('');
    }
    expect(paidPlusAura?.nameRu).toBe('Солнечный Владыка');
    expect(new Set(labelKeys.map((key) => paidPlusAura![key])).size).toBeGreaterThan(1);
  });

  it('exposes Pro only to a verified lifetime plan while still allowing locked preview lookup', () => {
    expect(getAvatarAuraById(PRO_AVATAR_AURA_ID)).toMatchObject({ id: PRO_AVATAR_AURA_ID, proOnly: true, material: 'satin' });
    expect(getEffectiveAvatarAuraId(PRO_AVATAR_AURA_ID, true, false, false)).toBeUndefined();
    expect(getEffectiveAvatarAuraId(PRO_AVATAR_AURA_ID, true, false, true)).toBe(PRO_AVATAR_AURA_ID);
    expect(getEffectiveAvatarAuraId(PRO_AVATAR_AURA_ID, true, false)).toBe(PRO_AVATAR_AURA_ID);
  });
});
