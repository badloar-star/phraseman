/**
 * Синхронная память текущего плана Plus — для первого кадра экрана «Подписка Plus».
 *
 * зачем (PM-214 «мгновенное открытие», координатор 13.10): manage_subscription рисовал скелет, пока не прочитает AsyncStorage
 * и RevenueCat, если план не пришёл маршрутом (?plan= из Настроек). Снимок приложения план не держит надёжно (Главная пересобирает
 * profile без premiumPlan). Память пополняют места, где план и так пишется/читается из хранилища; привязка к поколению аккаунта —
 * после смены аккаунта peek вернёт null, чужой план не покажем. Только отображение: покупки/восстановление это не трогает.
 */
import { captureAccountGeneration } from './account_generation';

export type PremiumPlanPeek = Readonly<{
  plan: string;
  productId: string | null;
  source: string;
  generation: number;
  at: number;
}>;

let memo: PremiumPlanPeek | null = null;

/** Запомнить план, только что записанный/прочитанный из хранилища. Пустой план не пишем (не затираем известный «ничем»). */
export function rememberPremiumPlan(plan: string | null | undefined, productId: string | null | undefined, source: string): void {
  const normalized = String(plan ?? '').trim().toLowerCase();
  if (!normalized) return;
  memo = Object.freeze({
    plan: normalized,
    productId: productId ? String(productId) : null,
    source,
    generation: captureAccountGeneration().generation,
    at: Date.now(),
  });
}

/** План из памяти для ТЕКУЩЕГО поколения аккаунта, без IO. null — не известен (экран покажет прежний скелет). */
export function peekPremiumPlan(): PremiumPlanPeek | null {
  if (!memo) return null;
  if (memo.generation !== captureAccountGeneration().generation) return null;
  return memo;
}

/** Только для тестов. */
export function __resetPremiumPlanPeekForTests(): void {
  memo = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
