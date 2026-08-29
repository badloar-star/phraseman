/**
 * cards-2.0: детект «слабого устройства» для деградации эффектов (§1 принцип 5).
 * Авто-порог: expo-device totalMemory СТРОГО < 3GB → lowPower (эталон Helio G35 /
 * ровно 3GB под порог НЕ попадает — на нём принимается полный 3D-флип).
 * Плюс ручной тумблер «Упрощённые эффекты» (AsyncStorage), который перекрывает авто.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from '../debug-logger';

export const LOW_POWER_MEMORY_THRESHOLD_BYTES = 3 * 1024 * 1024 * 1024;

/** Ручной оверрайд: 'on' | 'off' | null (авто). Новый ключ — старые данные не трогаем. */
export const LOW_POWER_OVERRIDE_KEY = 'fc_low_power_override_v1';

/**
 * Чистая функция порога — юнит-тестируема без нативных модулей.
 * Неизвестная память (null/undefined/web) → НЕ lowPower: не деградируем «на всякий случай».
 */
export function computeLowPower(
  totalMemoryBytes: number | null | undefined,
  os: string,
): boolean {
  if (os === 'web') return false;
  if (typeof totalMemoryBytes !== 'number' || !Number.isFinite(totalMemoryBytes) || totalMemoryBytes <= 0) {
    return false;
  }
  return totalMemoryBytes < LOW_POWER_MEMORY_THRESHOLD_BYTES;
}

let cachedAuto: boolean | null = null;
let cachedOverride: 'on' | 'off' | null = null;

// Прогреваем кэш оверрайда при старте (паттерн use-haptics.ts) — чтение синхронно из кэша.
if (Platform.OS !== 'web') {
  AsyncStorage.getItem(LOW_POWER_OVERRIDE_KEY)
    .then((v) => {
      if (v === 'on' || v === 'off') cachedOverride = v;
    })
    .catch(() => {});
}

/** Авто-детект по памяти устройства; значение кэшируется (память не меняется в рантайме). */
export function isLowPowerDeviceAuto(): boolean {
  if (cachedAuto != null) return cachedAuto;
  if (Platform.OS === 'web') {
    cachedAuto = false;
    return cachedAuto;
  }
  let totalMemory: number | null = null;
  try {
    // require, а не import: expo-device недоступен в некоторых окружениях (тесты/web-SSR)
    const Device = require('expo-device') as { totalMemory?: number | null };
    totalMemory = Device.totalMemory ?? null;
  } catch {
    totalMemory = null;
  }
  cachedAuto = computeLowPower(totalMemory, Platform.OS);
  return cachedAuto;
}

/** Итог: ручной тумблер перекрывает авто-детект. Синхронно (из кэша) — можно звать в рендере. */
export function isLowPowerEffective(): boolean {
  if (cachedOverride === 'on') return true;
  if (cachedOverride === 'off') return false;
  return isLowPowerDeviceAuto();
}

/** Установка тумблера «Упрощённые эффекты»: true=вкл, false=выкл, null=авто. */
export async function setLowPowerOverride(value: boolean | null): Promise<void> {
  cachedOverride = value == null ? null : value ? 'on' : 'off';
  try {
    if (value == null) await AsyncStorage.removeItem(LOW_POWER_OVERRIDE_KEY);
    else await AsyncStorage.setItem(LOW_POWER_OVERRIDE_KEY, value ? 'on' : 'off');
  } catch (e) {
      DebugLogger.error('low_power:setLowPowerOverride', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export function getLowPowerOverride(): boolean | null {
  return cachedOverride === 'on' ? true : cachedOverride === 'off' ? false : null;
}

/** Только для юнит-тестов: сброс модульных кэшей. */
export function __resetLowPowerCacheForTests(): void {
  cachedAuto = null;
  cachedOverride = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
