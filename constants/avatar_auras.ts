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

/** Префикс id аур, которые выдаёт Боевой пропуск Арены (сезонные награды премиум-трека). */
export const ARENA_PASS_AURA_PREFIX = 'aura-arena-';

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
  { id: 'aura-coral', nameRu: 'Коралл', nameUk: 'Корал', nameEs: 'Coral', namePtBr: 'Coral', nameVi: 'San hô', nameId: 'Koral', nameTr: 'Mercan', namePl: 'Koral', color: '#F97316', softColor: 'rgba(249,115,22,0.22)' },
  { id: 'aura-flame-51', nameRu: 'Пламя', nameUk: 'Полумʼя', nameEs: 'Llama', namePtBr: 'Chama', nameVi: 'Ngọn lửa', nameId: 'Api', nameTr: 'Alev', namePl: 'Płomień', color: '#F97316', color2: '#FACC15', color3: '#FDBA74', softColor: 'rgba(249,115,22,0.23)', unlockLevel: 51, effect: 'flame' },
  { id: 'aura-season', nameRu: 'Сезонная', nameUk: 'Сезонна', nameEs: 'De temporada', namePtBr: 'Da temporada', nameVi: 'Theo mùa', nameId: 'Musiman', nameTr: 'Sezonluk', namePl: 'Sezonowa', color: '#FFD24A', color2: '#FFAE00', color3: '#FDE68A', softColor: 'rgba(255,210,74,0.28)', effect: 'ether' },
  { id: 'aura-season-champion', nameRu: 'Чемпион сезона', nameUk: 'Чемпіон сезону', nameEs: 'Campeón de temporada', namePtBr: 'Campeão da temporada', nameVi: 'Quán quân mùa', nameId: 'Juara musim', nameTr: 'Sezon şampiyonu', namePl: 'Mistrz sezonu', color: '#F59E0B', color2: '#FBBF24', color3: '#FEF3C7', softColor: 'rgba(245,158,11,0.32)', effect: 'stardust' },

  // ── Ауры Боевого пропуска Арены (выдаются на вехах премиум-трека) ──
  { id: 'aura-arena-frost', nameRu: 'Мороз арены', nameUk: 'Мороз арени', nameEs: 'Escarcha de arena', namePtBr: 'Gelo da arena', nameVi: 'Băng đấu trường', nameId: 'Beku arena', nameTr: 'Arena ayazı', namePl: 'Szron areny', color: '#38BDF8', color2: '#E0F2FE', color3: '#BAE6FD', softColor: 'rgba(56,189,248,0.26)', effect: 'frost' },
  { id: 'aura-arena-storm', nameRu: 'Гроза арены', nameUk: 'Гроза арени', nameEs: 'Tormenta de arena', namePtBr: 'Tempestade da arena', nameVi: 'Bão đấu trường', nameId: 'Badai arena', nameTr: 'Arena fırtınası', namePl: 'Burza areny', color: '#60A5FA', color2: '#BFDBFE', color3: '#E0F2FE', softColor: 'rgba(96,165,250,0.26)', effect: 'storm' },
  { id: 'aura-arena-stardust', nameRu: 'Звёздная пыль', nameUk: 'Зоряний пил', nameEs: 'Polvo estelar', namePtBr: 'Pó estelar', nameVi: 'Bụi sao', nameId: 'Debu bintang', nameTr: 'Yıldız tozu', namePl: 'Gwiezdny pył', color: '#C4B5FD', color2: '#FDE68A', color3: '#A78BFA', softColor: 'rgba(196,181,253,0.28)', effect: 'stardust' },
  { id: 'aura-arena-ether', nameRu: 'Эфир арены', nameUk: 'Ефір арени', nameEs: 'Éter de arena', namePtBr: 'Éter da arena', nameVi: 'Ê-te đấu trường', nameId: 'Eter arena', nameTr: 'Arena eteri', namePl: 'Eter areny', color: '#818CF8', color2: '#E0E7FF', color3: '#A5B4FC', softColor: 'rgba(129,140,248,0.28)', effect: 'ether' },
];

/** id аур, которые выдаёт Боевой пропуск Арены (по порядку вех). */
export const ARENA_PASS_AURA_IDS = [
  'aura-arena-frost',
  'aura-arena-storm',
  'aura-arena-stardust',
  'aura-arena-ether',
] as const;

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
