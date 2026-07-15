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

  it('prices an unowned shop avatar at 35 shards', () => {
    const item = buildAvatarCatalog({
      ownedAvatars: {},
      giftedAvatarId: null,
      activeAvatar: '1',
    }).find((candidate) => candidate.id === 'custom-gen-41');

    expect(item?.availability).toEqual({ kind: 'shards', cost: 35 });
  });

  it('prices a purchasable aura at 50 shards', () => {
    const item = buildAuraCatalog(baseContext)
      .find((candidate) => candidate.id === 'aura-aurora');

    expect(item?.availability).toEqual({ kind: 'shards', cost: 50 });
  });

  it('prices every unowned visible avatar and aura instead of unlocking cosmetics through level, Plus, or rewards', () => {
    const avatars = buildAvatarCatalog({ ownedAvatars: {}, giftedAvatarId: null, activeAvatar: '1' });
    const auras = buildAuraCatalog(baseContext).filter((item) => item.kind === 'aura');

    expect(avatars.length).toBeGreaterThan(0);
    expect(auras.length).toBeGreaterThan(0);
    expect(avatars.every((item) => item.availability.kind === 'shards')).toBe(true);
    expect(auras.every((item) => item.availability.kind === 'shards')).toBe(true);
  });

  it.each([
    ['paid Plus', { isPremium: true, isVip: false }],
    ['admin-granted Plus', { isPremium: false, isVip: true }],
  ])('does not grant unowned aura cosmetics from %s access alone', (_label, access) => {
    const plusItems = buildAuraCatalog({ ...baseContext, ...access })
      .filter((item) => item.kind === 'aura' && (item.aura.premiumOnly || item.aura.vipOnly));

    expect(plusItems).toHaveLength(2);
    expect(plusItems.every((item) => !item.isOwned && item.availability.kind === 'shards')).toBe(true);
  });

  it.each(['aura-premium', 'aura-vip'])('grandfathers an already active status aura %s', (activeAuraId) => {
    const item = buildAuraCatalog({ ...baseContext, activeAuraId })
      .find((candidate) => candidate.id === activeAuraId);
    expect(item).toMatchObject({ isOwned: true, availability: { kind: 'owned' } });
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
