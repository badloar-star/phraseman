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
  | 'starvortex'
  | 'voidamethyst'
  | 'lava'
  | 'typhoon'
  | 'gravity'
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
  { id: PREMIUM_AVATAR_AURA_ID, nameRu: 'Plus', nameUk: 'Plus', nameEs: 'Plus', namePtBr: 'Plus', nameVi: 'Plus', nameId: 'Plus', nameTr: 'Plus', namePl: 'Plus', color: '#FACC15', softColor: 'rgba(250,204,21,0.28)', premiumOnly: true },
  { id: VIP_AVATAR_AURA_ID, nameRu: 'Plus', nameUk: 'Plus', nameEs: 'Plus', namePtBr: 'Plus', nameVi: 'Plus', nameId: 'Plus', nameTr: 'Plus', namePl: 'Plus', color: '#22C55E', color2: '#86EFAC', softColor: 'rgba(34,197,94,0.28)', vipOnly: true },
  { id: 'aura-aurora', nameRu: 'Аврора', nameUk: 'Аврора', nameEs: 'Aurora', namePtBr: 'Aurora', nameVi: 'Cực quang', nameId: 'Aurora', nameTr: 'Aurora', namePl: 'Aurora', color: '#22D3EE', softColor: 'rgba(34,211,238,0.22)' },
  { id: 'aura-ember', nameRu: 'Искра', nameUk: 'Іскра', nameEs: 'Brasa', namePtBr: 'Brasa', nameVi: 'Than hồng', nameId: 'Bara', nameTr: 'Kor', namePl: 'Żar', color: '#FB7185', softColor: 'rgba(251,113,133,0.22)' },
  { id: 'aura-mint', nameRu: 'Мята', nameUk: 'М\'ята', nameEs: 'Menta', namePtBr: 'Menta', nameVi: 'Bạc hà', nameId: 'Mint', nameTr: 'Nane', namePl: 'Mięta', color: '#34D399', softColor: 'rgba(52,211,153,0.22)' },
  { id: 'aura-violet', nameRu: 'Виолет', nameUk: 'Віолет', nameEs: 'Violeta', namePtBr: 'Violeta', nameVi: 'Tím', nameId: 'Violet', nameTr: 'Mor', namePl: 'Fiolet', color: '#A78BFA', softColor: 'rgba(167,139,250,0.22)' },
  { id: 'aura-coral', nameRu: 'Коралл', nameUk: 'Корал', nameEs: 'Coral', namePtBr: 'Coral', nameVi: 'San hô', nameId: 'Koral', nameTr: 'Mercan', namePl: 'Koral', color: '#F97316', softColor: 'rgba(249,115,22,0.22)' },
  { id: 'aura-flame-51', nameRu: 'Пламя', nameUk: 'Полумʼя', nameEs: 'Llama', namePtBr: 'Chama', nameVi: 'Ngọn lửa', nameId: 'Api', nameTr: 'Alev', namePl: 'Płomień', color: '#F97316', color2: '#FACC15', color3: '#FDBA74', softColor: 'rgba(249,115,22,0.23)', unlockLevel: 51, effect: 'flame' },
  { id: 'aura-season', nameRu: 'Сезонная', nameUk: 'Сезонна', nameEs: 'De temporada', namePtBr: 'Da temporada', nameVi: 'Theo mùa', nameId: 'Musiman', nameTr: 'Sezonluk', namePl: 'Sezonowa', color: '#FFD24A', color2: '#FFAE00', color3: '#FDE68A', softColor: 'rgba(255,210,74,0.28)', effect: 'starvortex' },
  { id: 'aura-season-champion', nameRu: 'Чемпион сезона', nameUk: 'Чемпіон сезону', nameEs: 'Campeón de temporada', namePtBr: 'Campeão da temporada', nameVi: 'Quán quân mùa', nameId: 'Juara musim', nameTr: 'Sezon şampiyonu', namePl: 'Mistrz sezonu', color: '#F59E0B', color2: '#FBBF24', color3: '#FEF3C7', softColor: 'rgba(245,158,11,0.32)', effect: 'voidamethyst' },

  // ── Ауры Боевого пропуска Арены (2 эксклюзивные, на финальных вехах премиум-трека) ──
  // D · Звёздный вихрь — космос: 3 орбиты + созвездие.
  { id: 'aura-arena-starvortex', nameRu: 'Звёздный вихрь', nameUk: 'Зоряний вихор', nameEs: 'Vórtice estelar', namePtBr: 'Vórtice estelar', nameVi: 'Xoáy sao', nameId: 'Pusaran bintang', nameTr: 'Yıldız girdabı', namePl: 'Gwiezdny wir', color: '#C084FC', color2: '#F5D0FE', color3: '#FEF9C3', softColor: 'rgba(192,132,252,0.30)', effect: 'starvortex' },
  // E · Аметистовая бездна — вуаль + неоновые орбы (фиолет+бирюза).
  { id: 'aura-arena-voidamethyst', nameRu: 'Аметистовая бездна', nameUk: 'Аметистова безодня', nameEs: 'Abismo de amatista', namePtBr: 'Abismo de ametista', nameVi: 'Vực thẳm thạch anh tím', nameId: 'Jurang ametis', nameTr: 'Ametist uçurumu', namePl: 'Ametystowa otchłań', color: '#8B5CF6', color2: '#67E8F9', color3: '#C4B5FD', softColor: 'rgba(139,92,246,0.30)', effect: 'voidamethyst' },
];

/** id аур, которые выдаёт Боевой пропуск Арены (по порядку финальных вех). */
export const ARENA_PASS_AURA_IDS = [
  'aura-arena-starvortex',
  'aura-arena-voidamethyst',
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
