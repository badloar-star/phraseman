/**
 * Синхронная память текущего плана Plus — для первого кадра экрана «Подписка Plus».
 *
 * зачем (PM-214 «мгновенное открытие», координатор 13.10): manage_subscription рисовал скелет, пока не прочитает AsyncStorage
 * и RevenueCat, если план не пришёл маршрутом (?plan= из Настроек). Снимок приложения план не держит надёжно (Главная пересобирает
 * profile без premiumPlan). Память пополняют места, где план и так пишется/читается из хранилища; привязка к поколению аккаунта —
 * после смены аккаунта peek вернёт null, чужой план не покажем. Только отображение: покупки/восстановление это не трогает.
 */
import { captureAccountGeneration } from './account_generation';
import { onAppEvent } from './events';

export type PremiumPlanPeek = Readonly<{
  plan: string;
  productId: string | null;
  source: string;
  generation: number;
  at: number;
}>;

/** В памяти: известный план или подтверждённое «нет подписки» (plan: null). */
type PremiumPlanMemo = Readonly<{
  plan: string | null;
  productId: string | null;
  source: string;
  generation: number;
  at: number;
}>;

// зачем (замечание Ядра к eac42c3e0, координатор 13.10): чтение хранилища — не подтверждение. Ключ premium_plan
// после окончания подписки остаётся (меняется только premium_active=false), поэтому такое чтение не должно
// возвращать прежний план поверх подтверждённого «нет» того же аккаунта. rc_persist/guard_refresh — подтверждения.
const WEAK_SOURCES: ReadonlySet<string> = new Set(['manage_local']);

let memo: PremiumPlanMemo | null = null;
let deactivationListener: { remove: () => void } | null = null;

function ensureDeactivationListener(): void {
  if (deactivationListener) return;
  // зачем: подписка ленивая — без побочного эффекта при импорте; пока в памяти ничего нет, стирать нечего.
  // premium_deactivated шлют все места подтверждённой деактивации (premium_guard, plus_transfer, _layout).
  // Ложное срабатывание безопасно: даёт скелет, а не неверный план.
  deactivationListener = onAppEvent('premium_deactivated', () => forgetPremiumPlan('premium_deactivated'));
}

/** Запомнить план, только что записанный/прочитанный из хранилища. Пустой план не пишем (не затираем известный «ничем»). */
export function rememberPremiumPlan(plan: string | null | undefined, productId: string | null | undefined, source: string): void {
  const normalized = String(plan ?? '').trim().toLowerCase();
  if (!normalized) return;
  const generation = captureAccountGeneration().generation;
  if (WEAK_SOURCES.has(source) && memo && memo.plan === null && memo.generation === generation) {
    console.log(`[SUB-PEEK] skip source=${source} plan=${normalized} reason=confirmed_none since=${memo.source} generation=${generation}`); // guard-ok: ранний выход называет причину
    return;
  }
  ensureDeactivationListener();
  memo = Object.freeze({
    plan: normalized,
    productId: productId ? String(productId) : null,
    source,
    generation,
    at: Date.now(),
  });
}

/** Подтверждённое «нет подписки» для текущего поколения: первый кадр снова покажет скелет, а не прежний план. */
export function forgetPremiumPlan(reason: string): void {
  const generation = captureAccountGeneration().generation;
  const prev = memo;
  memo = Object.freeze({ plan: null, productId: null, source: reason, generation, at: Date.now() });
  console.log(`[SUB-PEEK] cleared reason=${reason} prev=${prev?.plan ?? 'нет'} prevSource=${prev?.source ?? 'нет'} generation=${generation}`); // guard-ok: одна строка на деактивацию
}

/** План из памяти для ТЕКУЩЕГО поколения аккаунта, без IO. null — не известен или подписки нет (экран покажет прежний скелет). */
export function peekPremiumPlan(): PremiumPlanPeek | null {
  if (!memo || memo.plan === null) return null;
  if (memo.generation !== captureAccountGeneration().generation) return null;
  return memo as PremiumPlanPeek;
}

/** Только для тестов. */
export function __resetPremiumPlanPeekForTests(): void {
  memo = null;
  deactivationListener?.remove();
  deactivationListener = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
