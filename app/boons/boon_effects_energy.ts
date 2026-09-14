// Weekly Boons — энергетические эффекты: «окно без энергии» и «турбо-восстановление».
//
// Два бонуса, оба цепляются за energy_system.ts:
//  - energy_free_window: в активный ВЕЧЕРНИЙ час буднего дня трата энергии
//    (EnergyContext.spendOne) становится no-op для всех.
//    Час считаем ЛОКАЛЬНО (окно «вечером» имеет смысл только для пользователя).
//  - turbo_regen: пишет override интервала восстановления (как league-chest), берётся
//    min(league-chest, boon) — кто быстрее, тот и применяется.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEnergyRecoveryIntervalMs } from '../remote_flags';
import { getTodaysBoons } from './boon_engine';

/** Override-ключ интервала восстановления от boon (формат совместим с league-chest). */
const BOON_ENERGY_OVERRIDE_KEY = 'boon_energy_override_v1';
let legacyOverrideObservedAt = 0;

export type EnergyRecoveryOverrideSnapshot = Readonly<{
  recoveryMs: number;
  startedAt: number;
  expiresAt: number;
}>;

/** Вечернее окно «энергия не тратится» (локальные часы, [start, end)). */
export const ENERGY_FREE_WINDOW_START_HOUR = 19;
export const ENERGY_FREE_WINDOW_END_HOUR = 22;

/**
 * Насколько turbo_regen ускоряет восстановление: интервал × этот коэффициент.
 *
 * Numeric energy сохраняет обещание «на треть быстрее»: базовый шаг 6 минут
 * превращается в 4 минуты. Коэффициент остаётся общим для boon и season.
 *
 * Живёт здесь ОДНОЙ константой, потому что ту же формулу применяет
 * season_reward_apply.ts (сезонный turbo_regen пишет тот же ключ) — раздельные
 * числа разъехались бы при следующей правке.
 */
export const TURBO_REGEN_FACTOR = 2 / 3;

/**
 * Активно ли прямо сейчас «окно без энергии». Чистая проверка: primary-бонус дня ===
 * energy_free_window И локальный час в окне. localHour прокидывается для тестов.
 */
export function isEnergyFreeWindowActive(localHour: number = new Date().getHours()): boolean {
  if (getTodaysBoons().primary !== 'energy_free_window') return false;
  return localHour >= ENERGY_FREE_WINDOW_START_HOUR && localHour < ENERGY_FREE_WINDOW_END_HOUR;
}

/**
 * Записывает boon-override восстановления энергии на остаток UTC-дня (для turbo_regen).
 * recoveryMs = база × TURBO_REGEN_FACTOR («на треть быстрее»). Идемпотентно: тот же ключ.
 */
export async function applyTurboRegenOverride(): Promise<void> {
  const base = getEnergyRecoveryIntervalMs();
  const recoveryMs = Math.max(1000, Math.floor(base * TURBO_REGEN_FACTOR));
  // Истекает в конце текущих UTC-суток (00:00 следующего дня).
  const now = new Date();
  const endOfUtcDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
  const payload = { startedAt: now.getTime(), expiresAt: endOfUtcDay, recoveryMs };
  await AsyncStorage.setItem(BOON_ENERGY_OVERRIDE_KEY, JSON.stringify(payload));
}

/**
 * Читает активный boon-override интервала (или null, если истёк/отсутствует).
 * Формат полностью совпадает с readLeagueChestEnergyOverrideMs.
 */
export async function readBoonEnergyOverrideMs(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(BOON_ENERGY_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt?: number; recoveryMs?: number };
    if (!parsed.expiresAt || Date.now() >= parsed.expiresAt) {
      return null;
    }
    const recoveryMs = Number(parsed.recoveryMs);
    return Number.isFinite(recoveryMs) && recoveryMs > 0 ? recoveryMs : null;
  } catch {
    return null;
  }
}

/** Read without deleting expired data so offline settlement can split at expiry. */
export async function readBoonEnergyOverrideSnapshot(): Promise<EnergyRecoveryOverrideSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(BOON_ENERGY_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { recoveryMs?: unknown; startedAt?: unknown; expiresAt?: unknown };
    const recoveryMs = Number(parsed.recoveryMs);
    const expiresAt = Number(parsed.expiresAt);
    const explicitStartedAt = Number(parsed.startedAt);
    if (!(Number.isFinite(explicitStartedAt) && explicitStartedAt > 0) && legacyOverrideObservedAt <= 0) {
      legacyOverrideObservedAt = Date.now();
    }
    const startedAt = Number.isFinite(explicitStartedAt) && explicitStartedAt > 0
      ? explicitStartedAt
      : legacyOverrideObservedAt;
    if (!Number.isFinite(recoveryMs) || recoveryMs <= 0 || !Number.isFinite(expiresAt) || expiresAt <= 0) return null;
    return { recoveryMs, startedAt, expiresAt };
  } catch {
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
