import { CUSTOM_AVATARS, CUSTOM_AVATAR_GIFT_ONLY } from '../constants/custom_avatars';
import type { Lang } from '../constants/i18n';
import {
  buildAuraCatalog,
  buildAvatarCatalog,
  filterCatalog,
} from '../app/customization_catalog';
import { replaceCosmeticSaleOverrides } from '../constants/cosmetic_asset_availability';

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
  afterEach(() => replaceCosmeticSaleOverrides({}, 0));

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

  it.each([
    ['custom-gen-63', 50],
    ['custom-gen-73', 70],
    ['custom-gen-83', 100],
    ['custom-gen-93', 150],
    ['custom-gen-103', 300],
    ['custom-gen-113', 500],
    ['custom-gen-123', 1000],
  ] as const)('prices showcase avatar %s at %i pearls', (id, cost) => {
    const item = buildAvatarCatalog({
      ownedAvatars: {},
      giftedAvatarId: null,
      activeAvatar: '1',
    }).find((candidate) => candidate.id === id);

    expect(item?.availability).toEqual({ kind: 'shards', cost });
  });

  it('sorts purchasable avatars by price and keeps all showcase tier sizes', () => {
    const items = buildAvatarCatalog({
      ownedAvatars: {},
      giftedAvatarId: null,
      activeAvatar: '1',
    });
    const costs = items.flatMap((item) => item.availability.kind === 'shards'
      ? [item.availability.cost]
      : []);

    expect(costs).toEqual([...costs].sort((left, right) => left - right));
    expect(costs.filter((cost) => cost === 50)).toHaveLength(10);
    expect(costs.filter((cost) => cost === 70)).toHaveLength(10);
    expect(costs.filter((cost) => cost === 100)).toHaveLength(10);
    expect(costs.filter((cost) => cost === 150)).toHaveLength(10);
    expect(costs.filter((cost) => cost === 300)).toHaveLength(10);
    expect(costs.filter((cost) => cost === 500)).toHaveLength(10);
    expect(costs.filter((cost) => cost === 1000)).toHaveLength(3);
  });

  it('localizes every showcase avatar name in all supported languages', () => {
    const languages: Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
    const showcase = CUSTOM_AVATARS.filter((avatar) => avatar.collection === 'showcase-v1');

    expect(showcase).toHaveLength(63);
    showcase.forEach((avatar) => {
      languages.forEach((lang) => {
        expect(avatar.labels?.[lang]).toEqual(expect.any(String));
        expect(avatar.labels?.[lang]?.trim()).not.toBe('');
        if (lang !== 'ru') expect(avatar.labels?.[lang]).not.toBe(avatar.name);
      });
    });
  });

  it('lets the server remove an avatar from sale without taking it from an owner', () => {
    replaceCosmeticSaleOverrides({ 'avatar:custom-gen-41': false }, 1);

    expect(buildAvatarCatalog({ ownedAvatars: {}, giftedAvatarId: null, activeAvatar: '1' })
      .some((item) => item.id === 'custom-gen-41')).toBe(false);
    expect(buildAvatarCatalog({
      ownedAvatars: { 'custom-gen-41': 'violet:black' },
      giftedAvatarId: null,
      activeAvatar: '1',
    }).find((item) => item.id === 'custom-gen-41')).toMatchObject({
      isOwned: true,
      availability: { kind: 'owned' },
    });
  });

  it('lets the server return an archived reward avatar to sale', () => {
    replaceCosmeticSaleOverrides({ 'avatar:custom-gen-01': true }, 2);

    expect(buildAvatarCatalog({ ownedAvatars: {}, giftedAvatarId: null, activeAvatar: '1' })
      .find((item) => item.id === 'custom-gen-01')).toMatchObject({
      isOwned: false,
      availability: { kind: 'shards', cost: 90 },
    });
  });

  it('prices a purchasable aura at 120 shards', () => {
    const item = buildAuraCatalog(baseContext)
      .find((candidate) => candidate.id === 'aura-ember');

    expect(item?.availability).toEqual({ kind: 'shards', cost: 120 });
  });

  it.each(['aura-ember', 'aura-mint', 'aura-prism'])('keeps %s for purchase and owned selection', (id) => {
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

  it('lets the server return a retired aura to sale and later archive it again', () => {
    replaceCosmeticSaleOverrides({ 'aura:aura-aurora': true }, 3);
    expect(buildAuraCatalog(baseContext).find((item) => item.id === 'aura-aurora'))
      .toMatchObject({ isOwned: false, availability: { kind: 'shards', cost: 120 } });

    replaceCosmeticSaleOverrides({ 'aura:aura-aurora': false }, 4);
    expect(buildAuraCatalog(baseContext).some((item) => item.id === 'aura-aurora')).toBe(false);
    expect(buildAuraCatalog({
      ...baseContext,
      ownedAuras: { 'aura-aurora': true },
    }).find((item) => item.id === 'aura-aurora'))
      .toMatchObject({ isOwned: true, availability: { kind: 'owned' } });
  });

  it.each([
    ['aura-plus', 'plus'],
    ['aura-pro', 'pro'],
    ['aura-ember', 'shards'],
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
      activeAuraId: 'aura-ember',
      ownedAuras: { 'aura-ember': true },
    });
    expect(filterCatalog(items, 'mine').every((item) => item.isOwned || item.id === 'none')).toBe(true);
  });
});
