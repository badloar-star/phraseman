export const USER_AVATAR_AURA_KEY = 'user_avatar_aura';
export const AVATAR_AURA_OWNED_KEY = 'avatar_aura_owned_v1';
export const AVATAR_AURA_GIFT_OWNED_KEY = 'avatar_aura_gift_owned_v1';
export const AVATAR_AURA_BUY_COST = 35;
export const NO_AVATAR_AURA_ID = 'none';
export const PREMIUM_AVATAR_AURA_ID = 'aura-premium';
export const VIP_AVATAR_AURA_ID = 'aura-vip';

export type AvatarAuraEffect =
  | 'flame'
  | 'storm'
  | 'frost'
  | 'lava'
  | 'typhoon'
  | 'gravity'
  | 'stardust'
  | 'plasma'
  | 'ether'
  | 'absolute';

export type AvatarAuraDef = {
  id: string;
  nameRu: string;
  nameUk: string;
  nameEs: string;
  namePtBr: string;
  nameVi: string;
  nameId: string;
  nameTr: string;
  namePl: string;
  color: string;
  color2?: string;
  color3?: string;
  softColor: string;
  premiumOnly?: boolean;
  vipOnly?: boolean;
  unlockLevel?: number;
  effect?: AvatarAuraEffect;
};

export const AVATAR_AURAS: AvatarAuraDef[] = [
  { id: PREMIUM_AVATAR_AURA_ID, nameRu: 'Premium', nameUk: 'Premium', nameEs: 'Premium', namePtBr: 'Premium', nameVi: 'Premium', nameId: 'Premium', nameTr: 'Premium', namePl: 'Premium', color: '#FACC15', softColor: 'rgba(250,204,21,0.28)', premiumOnly: true },
  { id: VIP_AVATAR_AURA_ID, nameRu: 'VIP', nameUk: 'VIP', nameEs: 'VIP', namePtBr: 'VIP', nameVi: 'VIP', nameId: 'VIP', nameTr: 'VIP', namePl: 'VIP', color: '#22C55E', color2: '#86EFAC', softColor: 'rgba(34,197,94,0.28)', vipOnly: true },
  { id: 'aura-aurora', nameRu: 'Аврора', nameUk: 'Аврора', nameEs: 'Aurora', namePtBr: 'Aurora', nameVi: 'Cực quang', nameId: 'Aurora', nameTr: 'Aurora', namePl: 'Aurora', color: '#22D3EE', softColor: 'rgba(34,211,238,0.22)' },
  { id: 'aura-ember', nameRu: 'Искра', nameUk: 'Іскра', nameEs: 'Brasa', namePtBr: 'Brasa', nameVi: 'Than hồng', nameId: 'Bara', nameTr: 'Kor', namePl: 'Żar', color: '#FB7185', softColor: 'rgba(251,113,133,0.22)' },
  { id: 'aura-mint', nameRu: 'Мята', nameUk: 'М\'ята', nameEs: 'Menta', namePtBr: 'Menta', nameVi: 'Bạc hà', nameId: 'Mint', nameTr: 'Nane', namePl: 'Mięta', color: '#34D399', softColor: 'rgba(52,211,153,0.22)' },
  { id: 'aura-violet', nameRu: 'Виолет', nameUk: 'Віолет', nameEs: 'Violeta', namePtBr: 'Violeta', nameVi: 'Tím', nameId: 'Violet', nameTr: 'Mor', namePl: 'Fiolet', color: '#A78BFA', softColor: 'rgba(167,139,250,0.22)' },
  { id: 'aura-gold', nameRu: 'Золото', nameUk: 'Золото', nameEs: 'Oro', namePtBr: 'Ouro', nameVi: 'Vàng', nameId: 'Emas', nameTr: 'Altın', namePl: 'Złoto', color: '#FACC15', softColor: 'rgba(250,204,21,0.22)' },
  { id: 'aura-coral', nameRu: 'Коралл', nameUk: 'Корал', nameEs: 'Coral', namePtBr: 'Coral', nameVi: 'San hô', nameId: 'Koral', nameTr: 'Mercan', namePl: 'Koral', color: '#F97316', softColor: 'rgba(249,115,22,0.22)' },
  { id: 'aura-flame-51', nameRu: 'Пламя', nameUk: 'Полумʼя', nameEs: 'Llama', namePtBr: 'Chama', nameVi: 'Ngọn lửa', nameId: 'Api', nameTr: 'Alev', namePl: 'Płomień', color: '#F97316', color2: '#FACC15', color3: '#FDBA74', softColor: 'rgba(249,115,22,0.23)', unlockLevel: 51, effect: 'flame' },
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

export function isVipAvatarAura(id?: string | null): boolean {
  return id === VIP_AVATAR_AURA_ID;
}

export function isAvatarAuraUnlockedByLevel(aura: AvatarAuraDef, level: number): boolean {
  return aura.unlockLevel !== undefined && level >= aura.unlockLevel;
}

export function getEffectiveAvatarAuraId(id?: string | null, isPremium?: boolean, isVip?: boolean): string | undefined {
  const aura = normalizeAvatarAuraId(id);
  if (aura === NO_AVATAR_AURA_ID) return undefined;
  return aura || (isPremium ? PREMIUM_AVATAR_AURA_ID : isVip ? VIP_AVATAR_AURA_ID : undefined);
}
