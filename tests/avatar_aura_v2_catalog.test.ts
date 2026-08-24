import {
  APPROVED_AVATAR_AURAS,
  getAvatarAuraById,
} from '../constants/avatar_auras';

const STABLE_REPLACEMENTS = {
  'aura-aurora': 'quiet-orbit',
  'aura-ember': 'ember-claw',
  'aura-mint': 'moss-current',
  'aura-violet': 'quantum-grid',
  'aura-coral': 'coral-bloom',
  'aura-prism': 'candy-comet',
  'aura-lagoon': 'soft-tide',
  'aura-sunset': 'nebula-gate',
  'aura-plus': 'solar-sovereign',
  'aura-pro': 'reality-breaker',
} as const;

const localizedNameFields = [
  'nameRu', 'nameUk', 'nameEs', 'namePtBr', 'nameVi', 'nameId', 'nameTr', 'namePl',
] as const;

function galleryName(designId: string): string {
  return designId.split('-').map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join(' ');
}

describe('approved avatar aura v2 catalog', () => {
  it('contains exactly 37 ordinary auras plus the entitlement-only Plus and Pro signatures', () => {
    expect(APPROVED_AVATAR_AURAS).toHaveLength(39);
    expect(APPROVED_AVATAR_AURAS.filter((aura) => !aura.premiumOnly)).toHaveLength(37);
    expect(APPROVED_AVATAR_AURAS.filter((aura) => aura.premiumOnly)).toHaveLength(2);
    expect(new Set(APPROVED_AVATAR_AURAS.map((aura) => aura.id)).size).toBe(39);
    expect(new Set(APPROVED_AVATAR_AURAS.map((aura) => aura.designId)).size).toBe(39);
  });

  it.each(Object.entries(STABLE_REPLACEMENTS))(
    'keeps stable runtime ID %s while replacing its art with %s',
    (runtimeId, designId) => {
      expect(getAvatarAuraById(runtimeId)?.designId).toBe(designId);
    },
  );

  it('keeps Rainbow Loop as its own new product after Prism receives the closest-color Candy Comet art', () => {
    expect(getAvatarAuraById('aura-prism')?.designId).toBe('candy-comet');
    expect(getAvatarAuraById('aura-rainbow-loop')?.designId).toBe('rainbow-loop');
  });

  it.each([
    'aura-aurora',
    'aura-ember',
    'aura-mint',
    'aura-violet',
    'aura-coral',
    'aura-prism',
    'aura-lagoon',
    'aura-sunset',
  ])('returns the ordinary stable slot %s to sale', (id) => {
    const aura = getAvatarAuraById(id);
    expect(aura).toBeDefined();
    expect(aura?.premiumOnly).not.toBe(true);
    expect(aura?.rewardOnly).not.toBe(true);
    expect(aura?.retiredFromShop).not.toBe(true);
  });

  it('preserves Plus and Pro access flags', () => {
    expect(getAvatarAuraById('aura-plus')).toMatchObject({ premiumOnly: true });
    expect(getAvatarAuraById('aura-plus')?.proOnly).not.toBe(true);
    expect(getAvatarAuraById('aura-pro')).toMatchObject({ premiumOnly: true, proOnly: true });
  });

  it('authors all eight locale fields instead of flattening the English gallery name', () => {
    for (const aura of APPROVED_AVATAR_AURAS) {
      const localizedNames = localizedNameFields.map((field) => aura[field]);
      expect(localizedNames.every((name) => name.trim().length > 0)).toBe(true);
      expect(new Set(localizedNames).size).toBeGreaterThan(1);
    }
    const russianNamesRetainingEnglishGalleryCopy = APPROVED_AVATAR_AURAS.filter((aura) => (
      aura.nameRu === galleryName(aura.designId!)
    ));
    expect(russianNamesRetainingEnglishGalleryCopy.length).toBeLessThan(APPROVED_AVATAR_AURAS.length);
  });
});
