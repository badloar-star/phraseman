export const USER_AVATAR_AURA_KEY = 'user_avatar_aura';
export const AVATAR_AURA_OWNED_KEY = 'avatar_aura_owned_v1';
export const AVATAR_AURA_GIFT_OWNED_KEY = 'avatar_aura_gift_owned_v1';
export const AVATAR_AURA_BUY_COST = 35;
export const NO_AVATAR_AURA_ID = 'none';
export const PREMIUM_AVATAR_AURA_ID = 'aura-premium';

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
  unlockLevel?: number;
  effect?: AvatarAuraEffect;
};

export const AVATAR_AURAS: AvatarAuraDef[] = [
  { id: PREMIUM_AVATAR_AURA_ID, nameRu: 'Premium', nameUk: 'Premium', nameEs: 'Premium', namePtBr: 'Premium', nameVi: 'Premium', nameId: 'Premium', nameTr: 'Premium', namePl: 'Premium', color: '#FACC15', softColor: 'rgba(250,204,21,0.28)', premiumOnly: true },
  { id: 'aura-aurora', nameRu: 'Аврора', nameUk: 'Аврора', nameEs: 'Aurora', namePtBr: 'Aurora', nameVi: 'Cực quang', nameId: 'Aurora', nameTr: 'Aurora', namePl: 'Aurora', color: '#22D3EE', softColor: 'rgba(34,211,238,0.22)' },
  { id: 'aura-ember', nameRu: 'Искра', nameUk: 'Іскра', nameEs: 'Brasa', namePtBr: 'Brasa', nameVi: 'Than hồng', nameId: 'Bara', nameTr: 'Kor', namePl: 'Żar', color: '#FB7185', softColor: 'rgba(251,113,133,0.22)' },
  { id: 'aura-mint', nameRu: 'Мята', nameUk: 'М\'ята', nameEs: 'Menta', namePtBr: 'Menta', nameVi: 'Bạc hà', nameId: 'Mint', nameTr: 'Nane', namePl: 'Mięta', color: '#34D399', softColor: 'rgba(52,211,153,0.22)' },
  { id: 'aura-violet', nameRu: 'Виолет', nameUk: 'Віолет', nameEs: 'Violeta', namePtBr: 'Violeta', nameVi: 'Tím', nameId: 'Violet', nameTr: 'Mor', namePl: 'Fiolet', color: '#A78BFA', softColor: 'rgba(167,139,250,0.22)' },
  { id: 'aura-gold', nameRu: 'Золото', nameUk: 'Золото', nameEs: 'Oro', namePtBr: 'Ouro', nameVi: 'Vàng', nameId: 'Emas', nameTr: 'Altın', namePl: 'Złoto', color: '#FACC15', softColor: 'rgba(250,204,21,0.22)' },
  { id: 'aura-coral', nameRu: 'Коралл', nameUk: 'Корал', nameEs: 'Coral', namePtBr: 'Coral', nameVi: 'San hô', nameId: 'Koral', nameTr: 'Mercan', namePl: 'Koral', color: '#F97316', softColor: 'rgba(249,115,22,0.22)' },
  { id: 'aura-flame-51', nameRu: 'Пламя', nameUk: 'Полумʼя', nameEs: 'Llama', namePtBr: 'Chama', nameVi: 'Ngọn lửa', nameId: 'Api', nameTr: 'Alev', namePl: 'Płomień', color: '#F97316', color2: '#FACC15', color3: '#FDBA74', softColor: 'rgba(249,115,22,0.23)', unlockLevel: 51, effect: 'flame' },
  { id: 'aura-storm-52', nameRu: 'Буря', nameUk: 'Буря', nameEs: 'Tormenta', namePtBr: 'Tempestade', nameVi: 'Bão', nameId: 'Badai', nameTr: 'Fırtına', namePl: 'Burza', color: '#38BDF8', color2: '#60A5FA', color3: '#E0F2FE', softColor: 'rgba(56,189,248,0.22)', unlockLevel: 52, effect: 'storm' },
  { id: 'aura-frost-53', nameRu: 'Мороз', nameUk: 'Мороз', nameEs: 'Escarcha', namePtBr: 'Geada', nameVi: 'Băng giá', nameId: 'Embun beku', nameTr: 'Kırağı', namePl: 'Szron', color: '#67E8F9', color2: '#BAE6FD', color3: '#FFFFFF', softColor: 'rgba(103,232,249,0.20)', unlockLevel: 53, effect: 'frost' },
  { id: 'aura-lava-54', nameRu: 'Лава', nameUk: 'Лава', nameEs: 'Lava', namePtBr: 'Lava', nameVi: 'Dung nham', nameId: 'Lava', nameTr: 'Lav', namePl: 'Lawa', color: '#FB923C', color2: '#EF4444', color3: '#FDE68A', softColor: 'rgba(251,146,60,0.22)', unlockLevel: 54, effect: 'lava' },
  { id: 'aura-typhoon-55', nameRu: 'Тайфун', nameUk: 'Тайфун', nameEs: 'Tifón', namePtBr: 'Tufão', nameVi: 'Bão nhiệt đới', nameId: 'Topan', nameTr: 'Tayfun', namePl: 'Tajfun', color: '#2DD4BF', color2: '#22D3EE', color3: '#CCFBF1', softColor: 'rgba(45,212,191,0.22)', unlockLevel: 55, effect: 'typhoon' },
  { id: 'aura-gravity-56', nameRu: 'Гравитация', nameUk: 'Гравітація', nameEs: 'Gravedad', namePtBr: 'Gravidade', nameVi: 'Trọng lực', nameId: 'Gravitasi', nameTr: 'Yerçekimi', namePl: 'Grawitacja', color: '#A78BFA', color2: '#6D28D9', color3: '#F0ABFC', softColor: 'rgba(167,139,250,0.22)', unlockLevel: 56, effect: 'gravity' },
  { id: 'aura-stardust-57', nameRu: 'Звездная пыль', nameUk: 'Зоряний пил', nameEs: 'Polvo estelar', namePtBr: 'Poeira estelar', nameVi: 'Bụi sao', nameId: 'Debu bintang', nameTr: 'Yıldız tozu', namePl: 'Gwiezdny pył', color: '#FDE68A', color2: '#FACC15', color3: '#FFFFFF', softColor: 'rgba(253,230,138,0.22)', unlockLevel: 57, effect: 'stardust' },
  { id: 'aura-plasma-58', nameRu: 'Плазма', nameUk: 'Плазма', nameEs: 'Plasma', namePtBr: 'Plasma', nameVi: 'Plasma', nameId: 'Plasma', nameTr: 'Plazma', namePl: 'Plazma', color: '#F0ABFC', color2: '#38BDF8', color3: '#EC4899', softColor: 'rgba(240,171,252,0.22)', unlockLevel: 58, effect: 'plasma' },
  { id: 'aura-ether-59', nameRu: 'Эфир', nameUk: 'Ефір', nameEs: 'Éter', namePtBr: 'Éter', nameVi: 'Ê-te', nameId: 'Eter', nameTr: 'Eter', namePl: 'Eter', color: '#A5B4FC', color2: '#FBCFE8', color3: '#FFFFFF', softColor: 'rgba(165,180,252,0.20)', unlockLevel: 59, effect: 'ether' },
  { id: 'aura-absolute-60', nameRu: 'Абсолют', nameUk: 'Абсолют', nameEs: 'Absoluto', namePtBr: 'Absoluto', nameVi: 'Tuyệt đối', nameId: 'Absolut', nameTr: 'Mutlak', namePl: 'Absolut', color: '#FACC15', color2: '#A5B4FC', color3: '#FB7185', softColor: 'rgba(250,204,21,0.24)', unlockLevel: 60, effect: 'absolute' },
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

export function isAvatarAuraUnlockedByLevel(aura: AvatarAuraDef, level: number): boolean {
  return aura.unlockLevel !== undefined && level >= aura.unlockLevel;
}

export function getEffectiveAvatarAuraId(id?: string | null, isPremium?: boolean): string | undefined {
  const aura = normalizeAvatarAuraId(id);
  if (aura === NO_AVATAR_AURA_ID) return undefined;
  return aura || (isPremium ? PREMIUM_AVATAR_AURA_ID : undefined);
}
