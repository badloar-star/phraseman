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
  isPro: false,
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

  it('prices an unowned shop avatar at 90 shards', () => {
    const item = buildAvatarCatalog({
      ownedAvatars: {},
      giftedAvatarId: null,
      activeAvatar: '1',
    }).find((candidate) => candidate.id === 'custom-gen-41');

    expect(item?.availability).toEqual({ kind: 'shards', cost: 90 });
  });

  it('prices a purchasable aura at 120 shards', () => {
    const item = buildAuraCatalog(baseContext)
      .find((candidate) => candidate.id === 'aura-aurora');

    expect(item?.availability).toEqual({ kind: 'shards', cost: 120 });
  });

  it.each(['aura-mint', 'aura-coral'])('restores %s for purchase and owned selection', (id) => {
    const purchasable = buildAuraCatalog(baseContext)
      .find((candidate) => candidate.id === id);
    const owned = buildAuraCatalog({
      ...baseContext,
      activeAuraId: id,
      ownedAuras: { [id]: true },
    }).find((candidate) => candidate.id === id);

    expect(purchasable).toMatchObject({
      isOwned: false,
      availability: { kind: 'shards', cost: 120 },
    });
    expect(owned).toMatchObject({
      isOwned: true,
      isActive: true,
      availability: { kind: 'owned' },
    });
  });

  it.each([
    ['aura-plus', 'plus'],
    ['aura-pro', 'pro'],
    ['aura-aurora', 'shards'],
  ] as const)('classifies %s as %s', (id, expected) => {
    expect(buildAuraCatalog(baseContext).find((item) => item.id === id)?.availability.kind).toBe(expected);
  });

  it('hides the manual beta reward until it is granted or active', () => {
    expect(buildAuraCatalog(baseContext).some((item) => item.id === 'aura-nimbus')).toBe(false);

    const granted = buildAuraCatalog({
      ...baseContext,
      ownedAuras: { 'aura-nimbus': true },
    }).find((item) => item.id === 'aura-nimbus');
    expect(granted).toMatchObject({ isOwned: true, availability: { kind: 'owned' } });

    const active = buildAuraCatalog({
      ...baseContext,
      activeAuraId: 'aura-nimbus',
    }).find((item) => item.id === 'aura-nimbus');
    expect(active).toMatchObject({ isOwned: true, isActive: true, availability: { kind: 'owned' } });
  });

  it.each([
    ['paid Plus', { isPremium: true, isVip: false, isPro: false }],
    ['admin-granted Plus', { isPremium: false, isVip: true, isPro: false }],
  ])('unlocks the same canonical Plus aura for %s', (_label, access) => {
    const plusItems = buildAuraCatalog({ ...baseContext, ...access })
      .filter((item) => item.kind === 'aura' && item.id === 'aura-plus');

    expect(plusItems).toHaveLength(1);
    expect(plusItems[0]).toMatchObject({ isOwned: true, availability: { kind: 'owned' } });
  });

  it.each(['aura-plus', 'aura-premium', 'aura-vip'])('re-locks expired active Plus aura %s', (activeAuraId) => {
    const item = buildAuraCatalog({ ...baseContext, activeAuraId })
      .find((candidate) => candidate.id === 'aura-plus');
    expect(item).toMatchObject({ isOwned: false, availability: { kind: 'plus' } });
  });

  it('unlocks Pro only for the lifetime entitlement', () => {
    const monthly = buildAuraCatalog({ ...baseContext, isPremium: true, isPro: false })
      .find((item) => item.id === 'aura-pro');
    const lifetime = buildAuraCatalog({ ...baseContext, isPremium: true, isPro: true })
      .find((item) => item.id === 'aura-pro');

    expect(monthly).toMatchObject({ isOwned: false, availability: { kind: 'pro' } });
    expect(lifetime).toMatchObject({ isOwned: true, availability: { kind: 'owned' } });
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
