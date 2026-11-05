/**
 * Уровень подписки: Plus (месячная) или Ultra (годовая). ОДНА функция на всё приложение.
 *
 * зачем (владелец 06.11, «МАКЕТ ПО УЛЬТРА И ПЛЮС ОДОБРЯЮ!»): месячная = «Plus», годовая = «Ultra» — другой цвет и другой значок везде, где показывается Plus.
 * Уровень берётся из ПРОДУКТА магазина (годовой → ultra, месячный → plus; пожизненная/VIP/подарок/неизвестный план → plus: Ultra по догадке не показываем),
 * из уже загруженных данных — без новых запросов. Права доступа не меняются: Ultra = все права Plus.
 * Журнал: [SUB-TIER].
 */
export type SubscriptionTier = 'plus' | 'ultra';

/** Имя уровня для текстов («Ultra» не переводится — как «Plus»). */
export const SUBSCRIPTION_TIER_NAME: Readonly<Record<SubscriptionTier, string>> = Object.freeze({ plus: 'Plus', ultra: 'Ultra' });

/** План (monthly | yearly | lifetime | прочее) → уровень. Только годовой = ultra. */
export function tierFromPlan(plan: string | null | undefined): SubscriptionTier {
  return String(plan ?? '').trim().toLowerCase() === 'yearly' ? 'ultra' : 'plus';
}

/** Идентификатор продукта магазина → уровень (годовой → ultra, иначе plus). */
export function tierFromProductId(productId: string | null | undefined): SubscriptionTier {
  const id = String(productId ?? '').trim().toLowerCase();
  if (id === '') return 'plus';
  // зачем: те же правила, что inferPremiumPlanFromProductId (premium_revenuecat_state.ts; паритет проверяет тест), без его тяжёлой цепочки импортов в UI-модуле.
  if (/lifetime|forever|one.?time|onetime|perpetual/.test(id)) return 'plus'; // пожизненная проверяется первой, как там
  return /year|yearly|annual|12.?month/.test(id) ? 'ultra' : 'plus';
}

/** Публичное поле другого человека (часть D, сервер): 'ultra' → ultra, всё остальное/нет поля → plus. */
export function tierFromPublicField(value: unknown): SubscriptionTier {
  return value === 'ultra' ? 'ultra' : 'plus';
}

/** Подставить имя уровня в готовый текст: «с Plus» → «с Ultra» (название не переводится, поэтому замена по слову работает во всех 9 языках). */
export function applyTierName(text: string, tier: SubscriptionTier): string {
  if (tier === 'plus') return text;
  return text.replace(/\bPlus\b/g, SUBSCRIPTION_TIER_NAME[tier]);
}

let lastLoggedKey: string | null = null;

/** Журнал решения уровня — только при смене (источник, план, продукт, итог). */
export function logSubscriptionTier(input: Readonly<{ source: string; plan: string | null; productId: string | null; tier: SubscriptionTier | null }>): void {
  const key = `${input.source}|${input.plan ?? '-'}|${input.productId ?? '-'}|${input.tier ?? 'none'}`;
  if (key === lastLoggedKey) return;
  lastLoggedKey = key;
  console.log(`[SUB-TIER] source=${input.source} plan=${input.plan ?? 'none'} productId=${input.productId ?? 'none'} tier=${input.tier ?? 'none'}`); // guard-ok: ветка и значение, которое её решило
}

/** Только для тестов. */
export function __resetSubscriptionTierLogForTests(): void { lastLoggedKey = null; }

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __SubscriptionTierRouteShim() { return null; }
