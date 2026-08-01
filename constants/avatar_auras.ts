export {
  AVATAR_AURA_GIFT_OWNED_KEY,
  AVATAR_AURA_OWNED_KEY,
  USER_AVATAR_AURA_KEY,
} from './customization_storage_keys';
// зачем: см. CUSTOM_AVATAR_BUY_COST — жемчуг только покупается, цена = ценник в евро.
// Аура дороже аватара (120 против 90): она заметнее в бою/профиле и её носят реже.
export const AVATAR_AURA_BUY_COST = 120;
export const NO_AVATAR_AURA_ID = 'none';
export const PLUS_AVATAR_AURA_ID = 'aura-plus';
export const PRO_AVATAR_AURA_ID = 'aura-pro';
export const LEGACY_PREMIUM_AVATAR_AURA_ID = 'aura-premium';
export const LEGACY_VIP_AVATAR_AURA_ID = 'aura-vip';
/** Compatibility aliases: paid and admin-granted Plus now share one catalog/render ID. */
export const PREMIUM_AVATAR_AURA_ID = PLUS_AVATAR_AURA_ID;
export const VIP_AVATAR_AURA_ID = PLUS_AVATAR_AURA_ID;
/** Аура «Нимб» — синее дышащее свечение. Выдаётся только вручную из админки бета-тестерам. */
export const BETA_NIMBUS_AURA_ID = 'aura-nimbus';

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
  | 'absolute'
  | 'nimbus';

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
  proOnly?: boolean;
  material?: 'halo' | 'satin';
  unlockLevel?: number;
  /**
   * Аура выдаётся ТОЛЬКО как награда (вручную из админки, как «Нимб») и не продаётся
   * за осколки. На экране выбора показывается без цены, тап не ведёт к покупке.
   */
  rewardOnly?: boolean;
  effect?: AvatarAuraEffect;
};

export const AVATAR_AURAS: AvatarAuraDef[] = [
  { id: PLUS_AVATAR_AURA_ID, nameRu: 'Plus', nameUk: 'Plus', nameEs: 'Plus', namePtBr: 'Plus', nameVi: 'Plus', nameId: 'Plus', nameTr: 'Plus', namePl: 'Plus', color: '#D4A72C', color2: '#FFF1B8', color3: '#9A6414', softColor: 'rgba(212,167,44,0.28)', premiumOnly: true },
  { id: PRO_AVATAR_AURA_ID, nameRu: 'Pro', nameUk: 'Pro', nameEs: 'Pro', namePtBr: 'Pro', nameVi: 'Pro', nameId: 'Pro', nameTr: 'Pro', namePl: 'Pro', color: '#2563A8', color2: '#D7ECFF', color3: '#12396B', softColor: 'rgba(37,99,168,0.28)', premiumOnly: true, proOnly: true, material: 'satin' },
  { id: 'aura-aurora', nameRu: 'Аврора', nameUk: 'Аврора', nameEs: 'Aurora', namePtBr: 'Aurora', nameVi: 'Cực quang', nameId: 'Aurora', nameTr: 'Aurora', namePl: 'Aurora', color: '#22D3EE', color2: '#C4B5FD', color3: '#0EA5E9', softColor: 'rgba(34,211,238,0.22)' },
  { id: 'aura-ember', nameRu: 'Искра', nameUk: 'Іскра', nameEs: 'Brasa', namePtBr: 'Brasa', nameVi: 'Than hồng', nameId: 'Bara', nameTr: 'Kor', namePl: 'Żar', color: '#FB7185', color2: '#FDBA74', color3: '#E11D48', softColor: 'rgba(251,113,133,0.22)' },
  { id: 'aura-mint', nameRu: 'Мята', nameUk: 'Мʼята', nameEs: 'Menta', namePtBr: 'Menta', nameVi: 'Bạc hà', nameId: 'Mint', nameTr: 'Nane', namePl: 'Mięta', color: '#34D399', color2: '#A7F3D0', color3: '#0D9488', softColor: 'rgba(52,211,153,0.22)' },
  { id: 'aura-violet', nameRu: 'Виолет', nameUk: 'Віолет', nameEs: 'Violeta', namePtBr: 'Violeta', nameVi: 'Tím', nameId: 'Violet', nameTr: 'Mor', namePl: 'Fiolet', color: '#A78BFA', color2: '#E9D5FF', color3: '#7C3AED', softColor: 'rgba(167,139,250,0.22)' },
  { id: 'aura-coral', nameRu: 'Коралл', nameUk: 'Корал', nameEs: 'Coral', namePtBr: 'Coral', nameVi: 'San hô', nameId: 'Koral', nameTr: 'Mercan', namePl: 'Koral', color: '#FB7185', color2: '#FED7AA', color3: '#EA580C', softColor: 'rgba(251,113,133,0.22)' },
  { id: 'aura-prism', nameRu: 'Призма', nameUk: 'Призма', nameEs: 'Prisma', namePtBr: 'Prisma', nameVi: 'Lăng kính', nameId: 'Prisma', nameTr: 'Prizma', namePl: 'Pryzmat', color: '#22D3EE', color2: '#A78BFA', color3: '#F9A8D4', softColor: 'rgba(34,211,238,0.22)' },
  { id: 'aura-lagoon', nameRu: 'Лагуна', nameUk: 'Лагуна', nameEs: 'Laguna', namePtBr: 'Lagoa', nameVi: 'Đầm phá', nameId: 'Laguna', nameTr: 'Lagün', namePl: 'Laguna', color: '#2DD4BF', color2: '#60A5FA', color3: '#FDE68A', softColor: 'rgba(45,212,191,0.22)' },
  { id: 'aura-sunset', nameRu: 'Закат', nameUk: 'Захід', nameEs: 'Ocaso', namePtBr: 'Pôr do sol', nameVi: 'Hoàng hôn', nameId: 'Senja', nameTr: 'Gün batımı', namePl: 'Zachód', color: '#FB7185', color2: '#FDBA74', color3: '#818CF8', softColor: 'rgba(251,113,133,0.22)' },
  { id: BETA_NIMBUS_AURA_ID, nameRu: 'Нимб', nameUk: 'Німб', nameEs: 'Nimbo', namePtBr: 'Nimbo', nameVi: 'Hào quang', nameId: 'Nimbus', nameTr: 'Hâle', namePl: 'Nimb', color: '#38BDF8', color2: '#7DD3FC', color3: '#E0F2FE', softColor: 'rgba(56,189,248,0.30)', rewardOnly: true, effect: 'nimbus' },
];

const LEGACY_AURA_ID_ALIASES: Readonly<Record<string, string>> = {
  [LEGACY_PREMIUM_AVATAR_AURA_ID]: PLUS_AVATAR_AURA_ID,
  [LEGACY_VIP_AVATAR_AURA_ID]: PLUS_AVATAR_AURA_ID,
};

export function getAvatarAuraById(id?: string | null): AvatarAuraDef | undefined {
  if (!id) return undefined;
  const canonicalId = LEGACY_AURA_ID_ALIASES[id] ?? id;
  return AVATAR_AURAS.find(aura => aura.id === canonicalId);
}

export function normalizeAvatarAuraId(id?: string | null): string | undefined {
  const trimmed = typeof id === 'string' ? id.trim() : '';
  if (!trimmed) return undefined;
  if (trimmed === NO_AVATAR_AURA_ID) return NO_AVATAR_AURA_ID;
  return getAvatarAuraById(trimmed)?.id;
}

export function isPremiumAvatarAura(id?: string | null): boolean {
  return normalizeAvatarAuraId(id) === PLUS_AVATAR_AURA_ID;
}

export function isVipAvatarAura(id?: string | null): boolean {
  return normalizeAvatarAuraId(id) === PLUS_AVATAR_AURA_ID;
}

/** true, если аура только наградная (сезон/пропуск Арены) и не продаётся за осколки. */
export function isRewardOnlyAvatarAura(id?: string | null): boolean {
  return getAvatarAuraById(id)?.rewardOnly === true;
}

export function isAvatarAuraUnlockedByLevel(aura: AvatarAuraDef, level: number): boolean {
  return aura.unlockLevel !== undefined && level >= aura.unlockLevel;
}

export function getEffectiveAvatarAuraId(
  id?: string | null,
  isPremium?: boolean,
  isVip?: boolean,
  isPro?: boolean,
): string | undefined {
  const aura = normalizeAvatarAuraId(id);
  if (aura === NO_AVATAR_AURA_ID) return undefined;
  if (aura === PLUS_AVATAR_AURA_ID) return isPremium || isVip ? PLUS_AVATAR_AURA_ID : undefined;
  // Older/public profile contracts carry only isPremium. An explicitly stored Pro
  // selection is therefore renderable for premium profiles, while local callers
  // pass isPro=false to keep selection eligibility lifetime-only.
  if (aura === PRO_AVATAR_AURA_ID) return (isPro ?? isPremium) ? PRO_AVATAR_AURA_ID : undefined;
  if (aura) return aura;
  if (isPro) return PRO_AVATAR_AURA_ID;
  return isPremium || isVip ? PLUS_AVATAR_AURA_ID : undefined;
}
