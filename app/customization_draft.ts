import {
  NO_AVATAR_AURA_ID,
  PLUS_AVATAR_AURA_ID,
  PRO_AVATAR_AURA_ID,
  normalizeAvatarAuraId,
} from '../constants/avatar_auras';
import {
  CUSTOM_AVATAR_RUNE_RESTYLE_COST,
  CUSTOM_AVATAR_RESTYLE_COST,
  parseCustomAvatarOwnedStyle,
  parseCustomAvatarValue,
} from '../constants/custom_avatars';
import type { CatalogAvailability, CustomizationCurrency } from './customization_catalog';

export type CustomizationTab = 'avatars' | 'auras';

export interface CustomizationDraft {
  confirmed: {
    avatarValue: string;
    storedAuraSelection: string | null;
  };
  previewAvatarValue: string;
  previewStoredAuraSelection: string | null;
  effectivePreviewAuraId: string | null;
  activeTab: CustomizationTab;
  avatarAvailability: CatalogAvailability;
  auraAvailability: CatalogAvailability;
  ownedAvatarStyles: Readonly<Record<string, string>>;
  devUnlockAll?: boolean;
}

export type CustomizationAction =
  | { kind: 'apply' }
  | { kind: 'buy-and-apply'; target: 'avatar' | 'aura'; purchaseKind: 'purchase' | 'restyle'; currency: CustomizationCurrency; cost: number }
  | { kind: 'buy-only'; target: 'avatar' | 'aura'; purchaseKind: 'purchase' | 'restyle'; currency: CustomizationCurrency; cost: number }
  | { kind: 'open-plus' }
  | { kind: 'explain-pro-reward' }
  | { kind: 'explain-level'; level: number }
  | { kind: 'explain-reward' }
  | { kind: 'unchanged' };

export function resolveEffectivePreviewAuraId(
  storedAuraSelection: string | null,
  isPremium: boolean,
  isVip: boolean,
  isPro = false,
): string | null {
  if (storedAuraSelection === NO_AVATAR_AURA_ID) return null;
  if (storedAuraSelection) return normalizeAvatarAuraId(storedAuraSelection) ?? null;
  if (isPro) return PRO_AVATAR_AURA_ID;
  if (isPremium || isVip) return PLUS_AVATAR_AURA_ID;
  return null;
}

function nonPurchaseBlocker(availability: CatalogAvailability): CustomizationAction | null {
  switch (availability.kind) {
    case 'plus':
      return { kind: 'open-plus' };
    case 'pro':
      return { kind: 'explain-pro-reward' };
    case 'level':
      return { kind: 'explain-level', level: availability.level };
    case 'reward':
      return { kind: 'explain-reward' };
    default:
      return null;
  }
}

function avatarPurchase(draft: CustomizationDraft): {
  cost: number;
  currency: CustomizationCurrency;
  purchaseKind: 'purchase' | 'restyle';
} | null {
  if (draft.devUnlockAll) return null;
  if (draft.avatarAvailability.kind === 'shards') {
    return { cost: draft.avatarAvailability.cost, currency: 'pearls', purchaseKind: 'purchase' };
  }
  if (draft.avatarAvailability.kind === 'runes') {
    return { cost: draft.avatarAvailability.cost, currency: 'runes', purchaseKind: 'purchase' };
  }
  if (draft.avatarAvailability.kind !== 'owned') return null;
  const confirmed = parseCustomAvatarValue(draft.confirmed.avatarValue);
  const preview = parseCustomAvatarValue(draft.previewAvatarValue);
  if (!preview) return null;
  // зачем: у владельцев старых аватаров стиль теперь хранится как
  // "showcase-v1|gradient:color". Наивный split(':') прочитал бы градиент как
  // "showcase-v1|graphite" — стиль «не совпал» бы сам с собой, и человеку
  // выставили бы счёт в 25 жемчужин за перекраску, которой он не делал.
  const storedStyle = parseCustomAvatarOwnedStyle(
    preview.avatarId,
    draft.ownedAvatarStyles[preview.avatarId],
  );
  const baseline = confirmed?.avatarId === preview.avatarId
    ? confirmed
    : storedStyle
      ? { gradientId: storedStyle.gradientId, logoColor: storedStyle.logoColor }
      : null;
  if (baseline && (baseline.gradientId !== preview.gradientId || baseline.logoColor !== preview.logoColor)) {
    return preview.logoColor === 'black'
      ? { cost: CUSTOM_AVATAR_RUNE_RESTYLE_COST, currency: 'runes', purchaseKind: 'restyle' }
      : { cost: CUSTOM_AVATAR_RESTYLE_COST, currency: 'pearls', purchaseKind: 'restyle' };
  }
  return null;
}

function auraPurchase(draft: CustomizationDraft): {
  cost: number;
  currency: 'pearls';
  purchaseKind: 'purchase';
} | null {
  if (draft.devUnlockAll) return null;
  return draft.auraAvailability.kind === 'shards'
    ? { cost: draft.auraAvailability.cost, currency: 'pearls', purchaseKind: 'purchase' }
    : null;
}

export function resolveCustomizationAction(draft: CustomizationDraft): CustomizationAction {
  const auraBlocker = nonPurchaseBlocker(draft.auraAvailability);
  if (auraBlocker) return auraBlocker;
  const avatarBlocker = nonPurchaseBlocker(draft.avatarAvailability);
  if (avatarBlocker) return avatarBlocker;

  const avatar = avatarPurchase(draft);
  const aura = auraPurchase(draft);
  if (avatar && aura) {
    const target = draft.activeTab === 'auras' ? 'aura' : 'avatar';
    const purchase = target === 'aura' ? aura : avatar;
    return { kind: 'buy-only', target, ...purchase };
  }
  if (avatar) return { kind: 'buy-and-apply', target: 'avatar', ...avatar };
  if (aura) return { kind: 'buy-and-apply', target: 'aura', ...aura };

  if (draft.previewAvatarValue === draft.confirmed.avatarValue
    && draft.previewStoredAuraSelection === draft.confirmed.storedAuraSelection) {
    return { kind: 'unchanged' };
  }
  return { kind: 'apply' };
}
