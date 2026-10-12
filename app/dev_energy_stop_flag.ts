/**
 * DEV-флаг `dev_state?energy_stop=plus_granted` (координатор 12.10, energy-modes-006 «после покупки занятие продолжается»).
 *
 * зачем отдельным модулем БЕЗ импортов: шторка остановки (components/energy/EnergyStopSheet.tsx) проверяет флаг синхронно в
 * обработчике тапа, и экран не должен тянуть за собой конфиг/хранилище ради dev-флага (это ломало изолированные тесты шторки).
 * Только память процесса; вне dev-сборки (`__DEV__ = false`) флаг всегда выключен, а в стор-сборке модуль подменён заглушкой
 * (metro.config.js → storeReleaseDevStateStubs). Логи: [DEV-STATE].
 */
let plusGranted = false;

function devFlagAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

export function setDevEnergyStopPlusGranted(on: boolean): boolean {
  if (!devFlagAvailable()) {
    console.warn('[DEV-STATE] energy_stop: отклонено — не dev-сборка'); // guard-ok: ранний выход логируется
    return false;
  }
  plusGranted = on;
  console.log(`[DEV-STATE] energy_stop=${on ? 'plus_granted' : 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

export function isDevEnergyStopPlusGranted(): boolean {
  return devFlagAvailable() && plusGranted;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
