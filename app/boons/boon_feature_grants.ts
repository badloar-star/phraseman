// Weekly Boons — временное снятие премиум-замка по бонусу дня.
//
// Некоторые бонусы открывают обычно платную фичу всем на день (напр.
// «Speaking-суббота» открывает режим speaking). Карта boon → feature ниже; модуль
// читается из feature_gates.ts (shouldGateFeature), поэтому feature тут — строка
// (имя FeatureGate), чтобы не создавать циклический импорт типов.

import type { BoonId } from './boon_types';
import { getTodaysBoons } from './boon_engine';

/** Какой primary-бонус открывает какую фичу (имя FeatureGate из feature_gates.ts). */
const BOON_GRANTS_FEATURE: Partial<Record<BoonId, string>> = {
  speaking_saturday: 'speaking',
};

/**
 * true, если активный primary-бонус дня временно открывает указанную фичу всем.
 * feature — имя FeatureGate ('speaking' и т.п.).
 */
export function isFeatureGrantedByWeeklyBoon(feature: string): boolean {
  const primary = getTodaysBoons().primary;
  if (!primary) return false;
  return BOON_GRANTS_FEATURE[primary] === feature;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
