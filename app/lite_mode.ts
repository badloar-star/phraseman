// зачем (Сверка 21.10, пункт №39, Galaxy A04 SM-A045F, обращения #9 и #10): «Лёгкий режим» для слабых телефонов. Один источник
// правды — app/flashcards/low_power.ts (порог ОЗУ строго < 3 ГБ + ручной override в AsyncStorage `fc_low_power_override_v1`):
// тот же признак уже упрощает эффекты Карточек, теперь он же выключает мягкие тени (constants/liquidGlassShadowStyle.ts) и
// принудительный монтаж вкладок по потолку 8 с (app/(tabs)/_layout.tsx). Плоский флаг лежит в constants/lite_mode_flag.ts,
// чтобы тени не тянули сюда AsyncStorage. Отката нет нужды искать: LITE_MODE_AUTO_ENABLED=false отключает авто-режим по ОЗУ.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { isLiteModeOn, setLiteModeFlag, subscribeLiteModeFlag } from '../constants/lite_mode_flag';
import {
  getLowPowerOverride,
  isLowPowerDeviceAuto,
  setLowPowerOverride,
  LOW_POWER_OVERRIDE_KEY,
} from './flashcards/low_power';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LITE_MODE_AUTO_ENABLED = true;

export type LiteModeDecision = Readonly<{ on: boolean; reason: 'override_on' | 'override_off' | 'auto_low_ram' | 'auto_off' | 'auto_disabled'; override: boolean | null; autoLowRam: boolean }>;

/** Чистое решение: ручной выбор главнее авто. */
export function decideLiteMode(override: boolean | null, autoLowRam: boolean, autoEnabled: boolean = LITE_MODE_AUTO_ENABLED): LiteModeDecision {
  if (override === true) return { on: true, reason: 'override_on', override, autoLowRam };
  if (override === false) return { on: false, reason: 'override_off', override, autoLowRam };
  if (!autoEnabled) return { on: false, reason: 'auto_disabled', override, autoLowRam };
  return { on: autoLowRam, reason: autoLowRam ? 'auto_low_ram' : 'auto_off', override, autoLowRam };
}

function totalMemoryMb(): number | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Device = require('expo-device') as { totalMemory?: number | null };
    return typeof Device.totalMemory === 'number' ? Math.round(Device.totalMemory / 1024 / 1024) : null;
  } catch (error) {
    console.warn('[PERF-LITE] memory_read_failed', error instanceof Error ? error.message : String(error));
    return null;
  }
}

let lastLogged = '';
function applyLiteMode(source: string): LiteModeDecision {
  const decision = decideLiteMode(getLowPowerOverride(), isLowPowerDeviceAuto());
  setLiteModeFlag(decision.on);
  const line = JSON.stringify({ on: decision.on, reason: decision.reason, override: decision.override, autoLowRam: decision.autoLowRam, ramMb: totalMemoryMb(), os: Platform.OS });
  if (line !== lastLogged) {
    lastLogged = line;
    console.warn('[PERF-LITE] mode', source, line); // warn: релизная сборка вырезает log, а решение о режиме нужно видеть на телефоне
  }
  return decision;
}

let started = false;
/** Вызывается один раз при старте приложения: выставляет флаг до первых рендеров и повторно — когда прочитан ручной выбор. */
export function initLiteMode(): void {
  if (started) return;
  started = true;
  applyLiteMode('init');
  // ручной выбор читается из AsyncStorage асинхронно (прогрев low_power.ts) — после чтения пересчитываем
  AsyncStorage.getItem(LOW_POWER_OVERRIDE_KEY)
    .then(() => { applyLiteMode('override_loaded'); })
    .catch((error) => { console.warn('[PERF-LITE] override_read_failed', error instanceof Error ? error.message : String(error)); });
}

/** Переключатель «Лёгкий режим» в Настройках: true — вкл, false — выкл, null — как решит авто. Флаг меняется мгновенно, запись — фоном. */
export async function setLiteModeOverride(value: boolean | null): Promise<void> {
  // оптимистично: setLowPowerOverride обновляет кэш СИНХРОННО до записи в хранилище — флаг меняем сразу, запись догоняет фоном
  // (ошибку записи low_power.ts логирует сам; значение в памяти остаётся — до перезапуска режим работает так, как выбрал человек)
  const writing = setLowPowerOverride(value);
  applyLiteMode('user_toggle');
  await writing;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

export function useLiteMode(): boolean {
  return useSyncExternalStore(subscribeLiteModeFlag, isLiteModeOn, isLiteModeOn);
}

export function __resetLiteModeForTests(): void {
  started = false;
  lastLogged = '';
  setLiteModeFlag(false);
}
