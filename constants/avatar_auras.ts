export const USER_AVATAR_AURA_KEY = 'user_avatar_aura';
export const AVATAR_AURA_OWNED_KEY = 'avatar_aura_owned_v1';
export const AVATAR_AURA_GIFT_OWNED_KEY = 'avatar_aura_gift_owned_v1';
export const AVATAR_AURA_BUY_COST = 35;
export const NO_AVATAR_AURA_ID = 'none';
export const PREMIUM_AVATAR_AURA_ID = 'aura-premium';

export type AvatarAuraDef = {
  id: string;
  nameRu: string;
  nameUk: string;
  nameEs: string;
  color: string;
  softColor: string;
  premiumOnly?: boolean;
};

export const AVATAR_AURAS: AvatarAuraDef[] = [
  { id: PREMIUM_AVATAR_AURA_ID, nameRu: 'Premium', nameUk: 'Premium', nameEs: 'Premium', color: '#FACC15', softColor: 'rgba(250,204,21,0.28)', premiumOnly: true },
  { id: 'aura-aurora', nameRu: 'Аврора', nameUk: 'Аврора', nameEs: 'Aurora', color: '#22D3EE', softColor: 'rgba(34,211,238,0.22)' },
  { id: 'aura-ember', nameRu: 'Искра', nameUk: 'Іскра', nameEs: 'Brasa', color: '#FB7185', softColor: 'rgba(251,113,133,0.22)' },
  { id: 'aura-mint', nameRu: 'Мята', nameUk: 'М\'ята', nameEs: 'Menta', color: '#34D399', softColor: 'rgba(52,211,153,0.22)' },
  { id: 'aura-violet', nameRu: 'Виолет', nameUk: 'Віолет', nameEs: 'Violeta', color: '#A78BFA', softColor: 'rgba(167,139,250,0.22)' },
  { id: 'aura-gold', nameRu: 'Золото', nameUk: 'Золото', nameEs: 'Oro', color: '#FACC15', softColor: 'rgba(250,204,21,0.22)' },
  { id: 'aura-coral', nameRu: 'Коралл', nameUk: 'Корал', nameEs: 'Coral', color: '#F97316', softColor: 'rgba(249,115,22,0.22)' },
];

export function getAvatarAuraById(id?: string | null): AvatarAuraDef | undefined {
  if (!id) return undefined;
  return AVATAR_AURAS.find(aura => aura.id === id);
}

export function normalizeAvatarAuraId(id?: string | null): string | undefined {
  const trimmed = typeof id === 'string' ? id.trim() : '';
  if (!trimmed) return undefined;
  if (trimmed === NO_AVATAR_AURA_ID) return NO_AVATAR_AURA_ID;
  return getAvatarAuraById(trimmed)?.id;
}

export function isPremiumAvatarAura(id?: string | null): boolean {
  return id === PREMIUM_AVATAR_AURA_ID;
}

export function getEffectiveAvatarAuraId(id?: string | null, isPremium?: boolean): string | undefined {
  const aura = normalizeAvatarAuraId(id);
  if (aura === NO_AVATAR_AURA_ID) return undefined;
  return aura || (isPremium ? PREMIUM_AVATAR_AURA_ID : undefined);
}
