// ═══════════════════════════════════════════════════════════════════════════
// feature_gates.ts — единая точка «фича за премиумом / фича бесплатна».
//
// Админ из «Пульта управления» (раздел «Премиум/Фри») для каждой фичи выбирает:
//   • Премиум  → флаг gate_<feature>_premium = true  (замок на месте, как сейчас)
//   • Фри      → флаг gate_<feature>_premium = false (замок снимается у ВСЕХ живьём)
//
// Изменение прилетает через remote_config/app.bools из кэша при старте/возврате
// в приложение и затем foreground-polling не реже чем раз примерно в 5 минут,
// без релиза/OTA. Дефолт каждого флага = true, поэтому без вмешательства админа
// поведение приложения не меняется.
//
// Гейт-сайты в приложении больше НЕ проверяют `isPremium` напрямую для решения
// «показать пейвол?»: они спрашивают isFeaturePremiumGated(feature). Если фича
// переведена в «Фри», функция вернёт false → пейвол не показывается, фича
// доступна бесплатно. Числовые лимиты (диалоги/тренер) при этом продолжают
// действовать — их значения настраиваются отдельно (Remote Config numbers).
// ═══════════════════════════════════════════════════════════════════════════

/** Каноничные имена фич, у которых есть премиум-замок. */
export type FeatureGate =
  | 'lessons'
  | 'speaking'
  | 'ai_dialog'
  | 'stats'
  | 'flashcards'
  | 'themes'
  | 'avatar_auras'
  | 'mastery'
  | 'energy'
  | 'arena'
  | 'extra_languages'
  | 'mistake_practice';

/** Премиум-доступ — локальное контрактное решение приложения, не remote-config. */
const PREMIUM_GATED = new Set<FeatureGate>([
  'lessons', 'speaking', 'ai_dialog', 'stats', 'flashcards', 'themes',
  'avatar_auras', 'mastery', 'energy', 'arena', 'extra_languages', 'mistake_practice',
]);

/** Полный список фич — для итерации в админке/тестах. */
export const FEATURE_GATE_KEYS = Object.freeze([...PREMIUM_GATED]) as readonly FeatureGate[];

/**
 * true → фича по-прежнему за премиум-замком (нужно проверять премиум/показывать
 * пейвол). false → админ перевёл фичу в «Фри», замок снят для всех.
 */
export function isFeaturePremiumGated(feature: FeatureGate): boolean {
  return PREMIUM_GATED.has(feature);
}

/** Удобный инверс: true → фича бесплатна для всех (замок снят админом). */
export function isFeatureFreeForEveryone(feature: FeatureGate): boolean {
  return !isFeaturePremiumGated(feature);
}

/**
 * Возрастной вопрос живёт только в onboarding новых пользователей.
 * После входа в приложение фичи не блокируются возрастным helper-ом.
 */
export function isFeatureBlockedForAge(feature: FeatureGate): boolean {
  void feature;
  return false;
}

/**
 * Главный хелпер для гейт-сайтов. Заменяет паттерн «if (!isPremium) показать пейвол».
 * Блокировать (показывать пейвол) нужно, только когда фича всё ещё за премиумом
 * И у пользователя нет премиума.
 *
 *   shouldGateFeature('speaking', hasPremiumAccess)  // true → показать пейвол
 */
export function shouldGateFeature(feature: FeatureGate, hasPremiumAccess: boolean): boolean {
  if (hasPremiumAccess) return false;
  return isFeaturePremiumGated(feature);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
