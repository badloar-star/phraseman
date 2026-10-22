// зачем (Сверка 21.10, пункт №39, Galaxy A04 SM-A045F, обращения #9 и #10): «Лёгкий режим» для слабых телефонов. Один источник
// правды — app/flashcards/low_power.ts (порог ОЗУ строго < 3 ГБ + ручной override в AsyncStorage `fc_low_power_override_v1`):
// тот же признак уже упрощает эффекты Карточек, теперь он же выключает мягкие тени (constants/liquidGlassShadowStyle.ts) и
// принудительный монтаж вкладок по потолку 8 с (app/(tabs)/_layout.tsx). Плоский флаг лежит в constants/lite_mode_flag.ts,
// чтобы тени не тянули сюда AsyncStorage. Отката нет нужды искать: LITE_MODE_AUTO_ENABLED=false отключает авто-режим по ОЗУ.
// зачем (владелец 22.10 кнопкой: ускорение первого кадра Главной; план 4 · ТЕМЫ home_first_frame_effects, шаг 1; координатор 22.10):
// в стор-сборке авто включается и на эмуляторе / симуляторе (expo-device isDevice === false) — размытые тени там компилируются через
// qemu_pipe и эмулятор уходит в ANR. В dev-сборке (ENABLE_DEV_TOOLS) авто выключено — эмулятор Сверки снимает «как в макете», с тенями;
// проверить авто — dev-ссылкой ?lite=auto, принудительно — ?lite=on|off. Журнал — [HOME-LITE] (и прежний [PERF-LITE]).
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { isLiteModeOn, setLiteModeFlag, subscribeLiteModeFlag } from '../constants/lite_mode_flag';
import { ENABLE_DEV_TOOLS } from './config';
import {
  getLowPowerOverride,
  isLowPowerDeviceAuto,
  setLowPowerOverride,
  LOW_POWER_OVERRIDE_KEY,
} from './flashcards/low_power';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LITE_MODE_AUTO_ENABLED = true;

/** Dev-ссылка ?lite=auto|on|off (только dev-сборки): auto — проверить сам авто-Lite, on / off — принудительно. */
export type LiteDevLink = 'auto' | 'on' | 'off';
/** Сборка для решения: build — инструменты разработчика включены (ENABLE_DEV_TOOLS, эмулятор Сверки), link — dev-ссылка. */
export type LiteDevContext = Readonly<{ build: boolean; link: LiteDevLink | null }>;
const STORE_CONTEXT: LiteDevContext = Object.freeze({ build: false, link: null });

export type LiteModeDecision = Readonly<{
  on: boolean;
  reason: 'dev_on' | 'dev_off' | 'override_on' | 'override_off' | 'auto_disabled' | 'dev_default_off' | 'auto_low_ram' | 'auto_emulator' | 'auto_off';
  override: boolean | null;
  autoLowRam: boolean;
  emulator: boolean;
}>;

/**
 * Чистое решение. Dev-ссылка (только в dev-сборке) главнее всего, затем ручной выбор, затем авто. В dev-сборке авто выключено, пока
 * ссылка не попросит lite=auto (координатор 22.10: эмулятор — инструмент сверки 1:1, тени на нём нужны); в стор-сборке авто — мало
 * ОЗУ, затем эмулятор. По умолчанию — стор-сборка без ссылки.
 */
export function decideLiteMode(
  override: boolean | null, autoLowRam: boolean, autoEnabled: boolean = LITE_MODE_AUTO_ENABLED, emulator: boolean = false, dev: LiteDevContext = STORE_CONTEXT,
): LiteModeDecision {
  const base = { override, autoLowRam, emulator };
  if (dev.build && dev.link === 'on') return { on: true, reason: 'dev_on', ...base };
  if (dev.build && dev.link === 'off') return { on: false, reason: 'dev_off', ...base };
  if (override === true) return { on: true, reason: 'override_on', ...base };
  if (override === false) return { on: false, reason: 'override_off', ...base };
  if (!autoEnabled) return { on: false, reason: 'auto_disabled', ...base };
  if (dev.build && dev.link !== 'auto') return { on: false, reason: 'dev_default_off', ...base };
  if (autoLowRam) return { on: true, reason: 'auto_low_ram', ...base };
  return { on: emulator, reason: emulator ? 'auto_emulator' : 'auto_off', ...base };
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

/** Эмулятор / симулятор (expo-device isDevice === false); не прочитали — телефон (лёгкий режим не навязываем). Читается один раз. */
let emulatorCached: boolean | null = null;
function isEmulatorDevice(): boolean {
  if (emulatorCached !== null) return emulatorCached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Device = require('expo-device') as { isDevice?: boolean };
    emulatorCached = Device.isDevice === false;
  } catch (error) {
    console.warn('[HOME-LITE] device_read_failed', error instanceof Error ? error.message : String(error));
    emulatorCached = false;
  }
  return emulatorCached;
}

/** Dev-ссылка (dev_state_fixtures ?lite=…) — живёт в памяти до перезапуска. */
let devLink: LiteDevLink | null = null;
let lastLogged = '';
function applyLiteMode(source: string): LiteModeDecision {
  const decision = decideLiteMode(getLowPowerOverride(), isLowPowerDeviceAuto(), LITE_MODE_AUTO_ENABLED, isEmulatorDevice(), { build: ENABLE_DEV_TOOLS, link: devLink });
  setLiteModeFlag(decision.on);
  const line = JSON.stringify({ on: decision.on, reason: decision.reason, override: decision.override, autoLowRam: decision.autoLowRam, emulator: decision.emulator, devBuild: ENABLE_DEV_TOOLS, devLink, ramMb: totalMemoryMb(), os: Platform.OS });
  if (line !== lastLogged) {
    lastLogged = line;
    console.warn('[HOME-LITE] [PERF-LITE] mode', source, line); // warn: релизная сборка вырезает log, а решение о режиме нужно видеть на телефоне
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

/** Dev-ссылка ?lite=auto|on|off (dev_state_fixtures); null — снять. В стор-сборке не действует — журнал причины. */
export function setLiteModeDevLink(link: LiteDevLink | null): void {
  if (!ENABLE_DEV_TOOLS) {
    console.warn('[HOME-LITE] dev_link_ignored', JSON.stringify({ link, reason: 'store_build' }));
    return;
  }
  devLink = link;
  applyLiteMode('dev_link');
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

export function useLiteMode(): boolean {
  return useSyncExternalStore(subscribeLiteModeFlag, isLiteModeOn, isLiteModeOn);
}

export function __resetLiteModeForTests(): void {
  started = false;
  lastLogged = '';
  emulatorCached = null;
  devLink = null;
  setLiteModeFlag(false);
}
