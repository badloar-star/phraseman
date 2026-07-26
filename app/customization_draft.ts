import {
  NO_AVATAR_AURA_ID,
  PREMIUM_AVATAR_AURA_ID,
  VIP_AVATAR_AURA_ID,
} from '../constants/avatar_auras';
import { CUSTOM_AVATAR_RESTYLE_COST, parseCustomAvatarValue } from '../constants/custom_avatars';
import type { CatalogAvailability } from './customization_catalog';

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
}

export type CustomizationAction =
  | { kind: 'apply' }
  | { kind: 'buy-and-apply'; target: 'avatar' | 'aura'; purchaseKind: 'purchase' | 'restyle'; cost: number }
  | { kind: 'buy-only'; target: 'avatar' | 'aura'; purchaseKind: 'purchase' | 'restyle'; cost: number }
  | { kind: 'open-plus' }
  | { kind: 'explain-level'; level: number }
  | { kind: 'explain-reward' }
  | { kind: 'unchanged' };

export function resolveEffectivePreviewAuraId(
  storedAuraSelection: string | null,
  isPremium: boolean,
  isVip: boolean,
): string | null {
  if (storedAuraSelection === NO_AVATAR_AURA_ID) return null;
  if ((storedAuraSelection === PREMIUM_AVATAR_AURA_ID || storedAuraSelection === VIP_AVATAR_AURA_ID)
    && !isPremium && !isVip) return null;
  if (storedAuraSelection) return storedAuraSelection;
  if (isPremium) return PREMIUM_AVATAR_AURA_ID;
  if (isVip) return VIP_AVATAR_AURA_ID;
  return null;
}

function nonPurchaseBlocker(availability: CatalogAvailability): CustomizationAction | null {
  switch (availability.kind) {
    case 'plus':
      return { kind: 'open-plus' };
    case 'level':
      return { kind: 'explain-level', level: availability.level };
    case 'reward':
      return { kind: 'explain-reward' };
    default:
      return null;
  }
}

function avatarPurchase(draft: CustomizationDraft): { cost: number; purchaseKind: 'purchase' | 'restyle' } | null {
  if (draft.avatarAvailability.kind === 'shards') {
    return { cost: draft.avatarAvailability.cost, purchaseKind: 'purchase' };
  }
  if (draft.avatarAvailability.kind !== 'owned') return null;
  const confirmed = parseCustomAvatarValue(draft.confirmed.avatarValue);
  const preview = parseCustomAvatarValue(draft.previewAvatarValue);
  if (!preview) return null;
  const storedStyle = draft.ownedAvatarStyles[preview.avatarId]?.split(':');
  const baseline = confirmed?.avatarId === preview.avatarId
    ? confirmed
    : storedStyle
      ? { gradientId: storedStyle[0], logoColor: storedStyle[1] }
      : null;
  if (baseline && (baseline.gradientId !== preview.gradientId || baseline.logoColor !== preview.logoColor)) {
    return { cost: CUSTOM_AVATAR_RESTYLE_COST, purchaseKind: 'restyle' };
  }
  return null;
}

function auraPurchase(draft: CustomizationDraft): { cost: number; purchaseKind: 'purchase' } | null {
  return draft.auraAvailability.kind === 'shards'
    ? { cost: draft.auraAvailability.cost, purchaseKind: 'purchase' }
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
