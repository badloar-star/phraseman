// «Мой уровень подписки»: Plus (месячная) / Ultra (годовая) — для своего кольца, метки, профиля, Настроек, шапки Главной, пейволов.
// зачем (владелец 06.11, шаг 2 «Plus/Ultra»): уровень определяет ОДНА функция по продукту магазина (app/subscription_tier.ts). Данные — уже загруженные:
// 1) память плана (peekPremiumPlan — первый кадр, без IO), 2) локальное хранилище (premium_plan / premium_rc_product_id), 3) пересчёт по событиям подписки.
// Новых сетевых запросов нет. Неизвестный план при активной подписке = Plus: Ultra по догадке не показываем. null — подписки нет.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAppEvent } from '../../app/events';
import { peekPremiumPlan } from '../../app/premium_plan_peek';
import { logSubscriptionTier, tierFromPlan, tierFromProductId, type SubscriptionTier } from '../../app/subscription_tier';
import { usePremium } from '../PremiumContext';

type KnownPlan = Readonly<{ plan: string | null; productId: string | null; source: string }>;

function readPeek(): KnownPlan | null {
  const peek = peekPremiumPlan();
  return peek ? { plan: peek.plan, productId: peek.productId, source: `peek:${peek.source}` } : null;
}

/** Чистое решение по известному плану/продукту: продукт точнее плана, план — запасной путь. */
export function resolveTierFromKnown(known: KnownPlan | null): SubscriptionTier {
  if (!known) return 'plus';
  if (known.productId) return tierFromProductId(known.productId);
  return tierFromPlan(known.plan);
}

export function useSubscriptionTier(): SubscriptionTier | null {
  const { isPremium, isVip, isPro } = usePremium();
  const active = isPremium || isVip || isPro;
  const [known, setKnown] = useState<KnownPlan | null>(() => readPeek());

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    const refresh = () => {
      const fromPeek = readPeek();
      if (fromPeek) {
        if (!cancelled) setKnown(fromPeek);
        return;
      }
      AsyncStorage.multiGet(['premium_plan', 'premium_rc_product_id'])
        .then((rows) => {
          if (cancelled) return;
          const plan = rows[0]?.[1] ?? null;
          const productId = rows[1]?.[1] ?? null;
          setKnown(plan || productId ? { plan: plan ? String(plan).trim().toLowerCase() : null, productId: productId ? String(productId) : null, source: 'storage' } : null);
        })
        .catch((error: unknown) => {
          console.warn(`[SUB-TIER] storage_read_failed reason=${error instanceof Error ? error.message.slice(0, 80) : typeof error}`); // guard-ok: catch логируется
        });
    };
    refresh();
    const subs = [
      onAppEvent('premium_activated', refresh),
      onAppEvent('premium_access_changed', refresh),
    ];
    return () => { cancelled = true; subs.forEach((sub) => sub.remove()); };
  }, [active]);

  // зачем: годовая МАГАЗИННАЯ подписка (isPremium) → по продукту; VIP/подарок/пожизненная (без магазинной подписки) → Plus. Неизвестный продукт → Plus.
  const tier: SubscriptionTier | null = !active ? null : (isPremium ? resolveTierFromKnown(known) : 'plus');
  const logSource = known?.source ?? (active ? 'default_plus' : 'no_subscription');
  const logPlan = known?.plan ?? null;
  const logProduct = known?.productId ?? null;
  useEffect(() => {
    logSubscriptionTier({ source: logSource, plan: logPlan, productId: logProduct, tier });
  }, [logSource, logPlan, logProduct, tier]);
  return tier;
}
