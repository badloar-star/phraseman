/**
 * Компас — правила доступа (премиум-гейт). ФУНДАМЕНТ, Волна 1.3.
 *
 * Единое место решения «можно ли запустить персональный план». Закрывает дыру:
 * раньше с главного экрана бесплатный ученик попадал в setup и активировал план
 * БЕЗ оплаты (онбординг гейтил, а прямой вход — нет).
 *
 * ВАЖНО про изоляцию: это починка дыры САМОГО приложения, поэтому правило
 * действует ВСЕГДА и НЕ спрятано за `compassOn()` — иначе выключенный Компас
 * снова открыл бы течь. Логика живёт здесь (в папке compass) лишь как единый
 * «центр правил доступа», но не зависит от того, включён Компас или нет.
 *
 * Чистая функция (без React/Firestore) — тестируемая и переиспользуемая на всех
 * путях активации (home → setup, онбординг). Premium-флаг передаётся снаружи
 * (из usePremium → hasPremiumAccess), модуль сам в контекст не лезет.
 */

import { isFeatureFreeForEveryone } from '../feature_gates';

export interface PlanAccessInput {
  /** Итоговый доступ: реальный premium ИЛИ vip ИЛИ intro-доступ (usePremium). */
  hasPremiumAccess: boolean;
}

export type PlanAccessDecision =
  | { allowed: true }
  | { allowed: false; reason: 'premium_required' };

/**
 * Можно ли активировать персональный план. План — Premium-фича; без доступа
 * возвращаем `premium_required`, и вызывающий экран показывает пейвол вместо
 * запуска плана. Так дыра закрыта во ВСЕХ точках активации единообразно.
 */
export function decidePlanAccess(input: PlanAccessInput): PlanAccessDecision {
  if (input.hasPremiumAccess) return { allowed: true };
  // «Пульт»: если админ перевёл персональный план в «Фри» — замок снят для всех.
  if (isFeatureFreeForEveryone('personal_plan')) return { allowed: true };
  return { allowed: false, reason: 'premium_required' };
}

/** Краткий помощник: разрешён ли запуск плана (true/false). */
export function canActivatePlan(input: PlanAccessInput): boolean {
  return decidePlanAccess(input).allowed;
}
