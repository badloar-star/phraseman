// android_plan_change.ts — замена месячной подписки на годовую на Android (Q8, решение владельца 05.11).
//
// зачем: покупка годового пакета обычным purchasePackage(pkg) при активной месячной подписке Google Play создаёт ВТОРУЮ параллельную подписку
// (двойное списание). Правильно — замена подписки (product change): oldProductIdentifier + режим пропорции. SDK react-native-purchases 9.x:
// purchasePackage(pkg, upgradeInfo?, googleProductChangeInfo?, isPersonalized?) — параметры замены идут ТРЕТЬИМ аргументом (второй — устаревший upgradeInfo).
// Чистая функция, без обращений к SDK: решение проверяется тестом; любая неопределённость → null (прежняя обычная покупка).

export type AndroidPlanChangeInput = Readonly<{
  platform: string;
  /** Идентификатор продукта выбранного (целевого) пакета. */
  targetProductId: string;
  /** Выбран годовой план. */
  targetIsYearly: boolean;
  /** Идентификаторы продуктов месячного плана (из офферингов): точное совпадение по ним. */
  monthlyProductIds: readonly string[];
  /** customerInfo.activeSubscriptions — активные подписки пользователя. */
  activeSubscriptions: readonly string[];
}>;

export type AndroidPlanChangeDecision =
  | Readonly<{ change: true; oldProductIdentifier: string; reason: 'monthly_to_yearly' }>
  | Readonly<{ change: false; reason: 'not_android' | 'target_not_yearly' | 'no_active_monthly' | 'no_monthly_ids' }>;

/** `subscription_id:base_plan` → `subscription_id` (Google принимает идентификатор подписки без базового плана). */
export function googleSubscriptionIdOf(productId: string): string {
  const trimmed = productId.trim();
  const colon = trimmed.indexOf(':');
  return colon > 0 ? trimmed.slice(0, colon) : trimmed;
}

export function decideAndroidPlanChange(input: AndroidPlanChangeInput): AndroidPlanChangeDecision {
  if (input.platform !== 'android') return { change: false, reason: 'not_android' };
  if (!input.targetIsYearly) return { change: false, reason: 'target_not_yearly' };
  if (input.monthlyProductIds.length === 0) return { change: false, reason: 'no_monthly_ids' };
  const monthlySubscriptionIds = new Set(input.monthlyProductIds.map(googleSubscriptionIdOf));
  const targetSubscriptionId = googleSubscriptionIdOf(input.targetProductId);
  const active = input.activeSubscriptions
    .map(googleSubscriptionIdOf)
    .find((id) => monthlySubscriptionIds.has(id) && id !== targetSubscriptionId);
  if (!active) return { change: false, reason: 'no_active_monthly' };
  return { change: true, oldProductIdentifier: active, reason: 'monthly_to_yearly' };
}

/** Параметры третьего аргумента purchasePackage (GoogleProductChangeInfo). DEFERRED: смена на ближайшем продлении, без двойного списания. */
export function googleProductChangeInfoFor(oldProductIdentifier: string, prorationMode: number): Readonly<{ oldProductIdentifier: string; prorationMode: number }> {
  return Object.freeze({ oldProductIdentifier, prorationMode });
}
