/**
 * Dev-инструменты режима энергии (координатор 12.10): проверить режим Б на эмуляторе БЕЗ включения рубильника `energy_mistake_charge` в проде.
 *
 * зачем: владелец и Сверка должны пройти все состояния Б1–Б8 руками. Серверный ключ в проде не трогаем — вместо этого в Dev Hub
 * локальный переключатель «Режим энергии: А / Б / как на сервере» и быстрая установка энергии (5 / 1 / 0). Plus вкл/выкл уже есть в Dev Hub.
 *
 * Только dev-сборка: в релизе каждая функция — ранний выход, ключ хранилища не читается и не пишется (как app/dev_as_free_flag.ts).
 * Журнал: [ENERGY-DEV].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { emitAppEvent } from './events';
import { withStorageLock } from './storage_mutex';
import { coerceEnergyStateV2 } from './energy_state_v2';
import { ENERGY_RECOVERY_INTERVAL_MS, ENERGY_STORAGE_KEY } from './energy_system';
import type { EnergyMode } from './energy_mode';

const DEV_ENERGY_MODE_KEY = 'dev_energy_mode_override_v1';
const TAG = '[ENERGY-DEV]';

let override: EnergyMode | null = null;
// зачем: загрузка с диска стартует при импорте асинхронно; поздний ответ не должен затереть выбор, сделанный раньше (как в dev_as_free_flag).
let setRevision = 0;
// зачем (координатор 13.10, energy-modes-003/007: «step energy=1 ок», а на кадре 5): energy_state — ключ аккаунта, на свежей
// установке смена/сброс аккаунта стирает его ПОСЛЕ подмены, и загрузка ставит полный бак. Подмена держится в памяти до
// перезапуска: если ключ пуст, EnergyContext берёт её (peekDevEnergyPinRaw). Трата пишет непустой ключ — закреп её не откатывает.
let energyPinRaw: string | null = null;

/** Последняя dev-подмена энергии (сериализованный energy_state) или null. В релизе всегда null. */
export function peekDevEnergyPinRaw(): string | null {
  return devBuild() ? energyPinRaw : null;
}

function devBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

/** Локальный override режима: null — режим берётся из серверного ключа. В релизе всегда null. */
export function peekDevEnergyModeOverride(): EnergyMode | null {
  return devBuild() ? override : null;
}

export async function loadDevEnergyModeOverride(): Promise<void> {
  if (!devBuild()) return;
  const revisionAtStart = setRevision;
  try {
    const stored = await AsyncStorage.getItem(DEV_ENERGY_MODE_KEY);
    if (revisionAtStart !== setRevision) {
      console.warn(TAG, 'load_skipped', JSON.stringify({ reason: 'set_during_load', current: override })); // guard-ok: ветка логируется
      return;
    }
    override = stored === 'start_charge' || stored === 'mistake_charge' ? stored : null;
    if (override) {
      console.warn(TAG, 'override loaded', JSON.stringify({ mode: override })); // guard-ok: dev-override виден в логе
      emitAppEvent('remote_config_changed');
    }
  } catch (error) {
    console.warn(TAG, 'load_failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
  }
}

/** Выбрать режим локально (`null` — вернуть серверный). Возвращает false вне dev-сборки. */
export async function setDevEnergyModeOverride(mode: EnergyMode | null): Promise<boolean> {
  if (!devBuild()) return false;
  setRevision += 1;
  override = mode;
  console.warn(TAG, 'override set', JSON.stringify({ mode })); // guard-ok: dev-override виден в логе
  try {
    if (mode) await AsyncStorage.setItem(DEV_ENERGY_MODE_KEY, mode);
    else await AsyncStorage.removeItem(DEV_ENERGY_MODE_KEY);
  } catch (error) {
    console.warn(TAG, 'save_failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
  }
  // Подписчики useEnergyMode() пересчитывают режим по этому событию.
  emitAppEvent('remote_config_changed');
  return true;
}

/**
 * Поставить текущую энергию (подарочная не трогается) и перезапустить часы восстановления — чтобы таймеры «Нужна энергия» и
 * остановки были предсказуемыми. Под тем же замком, что остальные писатели energy_state.
 */
export async function devSetEnergy(amount: number): Promise<boolean> {
  if (!devBuild()) return false;
  const target = Math.max(0, Math.min(5, Math.floor(amount)));
  try {
    await withStorageLock(async () => {
      const now = Date.now();
      const stored = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
      let parsed: unknown = null;
      if (stored) {
        try { parsed = JSON.parse(stored); } catch (error) {
          console.warn(TAG, 'energy_state не разобран — начинаем с чистого', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
        }
      }
      const prev = coerceEnergyStateV2(parsed, now);
      const next = { ...prev, current: target, lastSettledAt: now };
      energyPinRaw = JSON.stringify(next);
      await AsyncStorage.setItem(ENERGY_STORAGE_KEY, energyPinRaw);
      console.warn(TAG, 'energy set', JSON.stringify({ from: prev.current, to: target })); // guard-ok: dev-действие видно в логе
    });
    emitAppEvent('energy_reload');
    return true;
  } catch (error) {
    console.warn(TAG, 'energy_set_failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
    return false;
  }
}

/**
 * `dev_state?energy=restoring&restore_in=N` (координатор 12.10, energy-modes-008 «энергия восстановилась»): энергия 0, а следующая
 * единица вернётся через N секунд — шторка «Нужна энергия» доходит до нуля и кнопка становится «Начать». Только локальное
 * состояние энергии на устройстве (как energy=0..5), без сети. Восстановление линейное: прошло (интервал − N) секунд.
 */
export async function devSetEnergyRestoringIn(seconds: number): Promise<boolean> {
  if (!devBuild()) return false;
  const restoreInMs = Math.max(1, Math.min(600, Math.floor(seconds))) * 1000;
  try {
    await withStorageLock(async () => {
      const now = Date.now();
      const stored = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
      let parsed: unknown = null;
      if (stored) {
        try { parsed = JSON.parse(stored); } catch (error) {
          console.warn(TAG, 'energy_state не разобран — начинаем с чистого', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
        }
      }
      const prev = coerceEnergyStateV2(parsed, now);
      const next = { ...prev, current: 0, lastSettledAt: now - Math.max(0, ENERGY_RECOVERY_INTERVAL_MS - restoreInMs), recoveryCreditMicrounits: 0, recoveryDivisionRemainder: 0 };
      energyPinRaw = JSON.stringify(next);
      await AsyncStorage.setItem(ENERGY_STORAGE_KEY, energyPinRaw);
      console.warn(TAG, 'energy restoring', JSON.stringify({ from: prev.current, restoreInMs, intervalMs: ENERGY_RECOVERY_INTERVAL_MS })); // guard-ok: dev-действие видно в логе
    });
    emitAppEvent('energy_reload');
    return true;
  } catch (error) {
    console.warn(TAG, 'energy_restoring_failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
    return false;
  }
}

if (devBuild()) void loadDevEnergyModeOverride();

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
