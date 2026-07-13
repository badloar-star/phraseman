import { CUSTOM_AVATAR_GIFT_ONLY } from '../constants/custom_avatars';
import {
  buildAuraCatalog,
  buildAvatarCatalog,
  filterCatalog,
} from '../app/customization_catalog';

const baseContext = {
  activeAvatar: 'custom:custom-gen-41:violet:black',
  activeAuraId: null,
  level: 1,
  ownedAuras: {},
  isPremium: false,
  isVip: false,
};

describe('customization catalog', () => {
  it('never exposes level avatars', () => {
    const items = buildAvatarCatalog({ ownedAvatars: {}, giftedAvatarId: null, activeAvatar: '1' });
    expect(items.every((item) => item.kind === 'custom-avatar')).toBe(true);
  });

  it('hides unowned secret gifts and reveals owned gifts', () => {
    const secretGiftId = CUSTOM_AVATAR_GIFT_ONLY[0].id;
    expect(buildAvatarCatalog({ ownedAvatars: {}, giftedAvatarId: null, activeAvatar: '1' })
      .some((item) => item.id === secretGiftId)).toBe(false);
    expect(buildAvatarCatalog({
      ownedAvatars: { [secretGiftId]: 'violet:black' },
      giftedAvatarId: secretGiftId,
      activeAvatar: '1',
    }).some((item) => item.id === secretGiftId)).toBe(true);
  });

  it.each([
    ['aura-premium', 'plus'],
    ['aura-flame-51', 'level'],
    ['aura-season', 'reward'],
    ['aura-aurora', 'shards'],
  ] as const)('classifies %s as %s', (id, expected) => {
    expect(buildAuraCatalog(baseContext).find((item) => item.id === id)?.availability.kind).toBe(expected);
  });

  it.each([
    ['paid Plus', { isPremium: true, isVip: false }],
    ['admin-granted Plus', { isPremium: false, isVip: true }],
  ])('unlocks every Plus aura for %s', (_label, access) => {
    const plusItems = buildAuraCatalog({ ...baseContext, ...access })
      .filter((item) => item.kind === 'aura' && (item.aura.premiumOnly || item.aura.vipOnly));

    expect(plusItems).toHaveLength(2);
    expect(plusItems.every((item) => item.isOwned && item.availability.kind === 'owned')).toBe(true);
  });

  it.each(['aura-premium', 'aura-vip'])('re-locks expired active Plus aura %s', (activeAuraId) => {
    const item = buildAuraCatalog({ ...baseContext, activeAuraId })
      .find((candidate) => candidate.id === activeAuraId);
    expect(item).toMatchObject({ isOwned: false, availability: { kind: 'plus' } });
  });

  it('mine contains only owned/access-granted items plus none aura', () => {
    const items = buildAuraCatalog({
      ...baseContext,
      activeAuraId: 'aura-aurora',
      ownedAuras: { 'aura-aurora': true },
    });
    expect(filterCatalog(items, 'mine').every((item) => item.isOwned || item.id === 'none')).toBe(true);
  });
});
