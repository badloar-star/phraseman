// Уровень, который сейчас показывает пейвол: Год = Ultra, Месяц = Plus (владелец 06.11, «МАКЕТ ПО УЛЬТРА И ПЛЮС ОДОБРЯЮ!»).
// зачем: тексты пейвола («Открой всё с Plus», кнопка, строка условий) написаны на 9 языках с названием «Plus»; «Ultra» не переводится, поэтому по выбранной плитке
// название подменяется по слову (applyTierName) — один механизм вместо копий всех строк. Без провайдера — Plus (прежнее поведение для других экранов).
import React, { createContext, useCallback, useContext } from 'react';

import { applyTierName, type SubscriptionTier } from '../../app/subscription_tier';

const PaywallTierContext = createContext<SubscriptionTier>('plus');

export const PaywallTierProvider = PaywallTierContext.Provider;

export function usePaywallTier(): SubscriptionTier {
  return useContext(PaywallTierContext);
}

/** Подставляет название выбранного уровня в готовый текст пейвола. */
export function useTierText(): (text: string) => string {
  const tier = useContext(PaywallTierContext);
  return useCallback((text: string) => applyTierName(text, tier), [tier]);
}

export function PaywallTierScope({ tier, children }: { tier: SubscriptionTier; children: React.ReactNode }) {
  return <PaywallTierContext.Provider value={tier}>{children}</PaywallTierContext.Provider>;
}

/* expo-router route shim: служебный модуль не должен становиться экраном. */
export default function __PaywallTierContextRouteShim() { return null; }
