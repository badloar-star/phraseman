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

import { getRemoteBool, type RemoteBoolKey } from './remote_flags';
import { isFeatureGrantedByWeeklyBoon } from './boons/boon_feature_grants';

/** Каноничные имена фич, у которых есть премиум-замок. */
export type FeatureGate =
  | 'lessons'
  | 'speaking'
  | 'ai_dialog'
  | 'personal_plan'
  | 'diagnosis_training'
  | 'stats'
  | 'flashcards'
  | 'themes'
  | 'avatar_auras'
  | 'mastery'
  | 'energy'
  | 'extra_languages';

/** Соответствие фича → булев флаг remote_config. Держать в синхроне с RemoteBoolKey. */
const FEATURE_FLAG: Record<FeatureGate, RemoteBoolKey> = {
  lessons: 'gate_lessons_premium',
  speaking: 'gate_speaking_premium',
  ai_dialog: 'gate_ai_dialog_premium',
  personal_plan: 'gate_personal_plan_premium',
  diagnosis_training: 'gate_diagnosis_training_premium',
  stats: 'gate_stats_premium',
  flashcards: 'gate_flashcards_premium',
  themes: 'gate_themes_premium',
  avatar_auras: 'gate_avatar_auras_premium',
  mastery: 'gate_mastery_premium',
  energy: 'gate_energy_premium',
  extra_languages: 'gate_extra_languages_premium',
};

/** Полный список фич — для итерации в админке/тестах. */
export const FEATURE_GATE_KEYS = Object.keys(FEATURE_FLAG) as FeatureGate[];

/**
 * true → фича по-прежнему за премиум-замком (нужно проверять премиум/показывать
 * пейвол). false → админ перевёл фичу в «Фри», замок снят для всех.
 */
export function isFeaturePremiumGated(feature: FeatureGate): boolean {
  return getRemoteBool(FEATURE_FLAG[feature]);
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
  // Weekly Boon может временно открыть фичу всем (напр. «Speaking-суббота»).
  if (isFeatureGrantedByWeeklyBoon(feature)) return false;
  return isFeaturePremiumGated(feature);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
