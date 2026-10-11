import { LogBox } from 'react-native';

// зачем (координатор 11.10): чистые кадры сверки без LogBox-плашек и инспектора. Сверка снимает экраны эмулятора в dev-сборке; жёлтые/красные
// плашки (RevenueCat BILLING_UNAVAILABLE, «Open debugger…») закрывают низ экрана, а случайный тап открывает полноэкранный инспектор и портит
// весь прогон. Включается ТОЛЬКО в dev и ТОЛЬКО при EXPO_PUBLIC_SNAPSHOT_CLEAN=1 (Metro перезапускает сессия «Эмулятор»); в обычном dev и в релизе
// ничего не меняется. Консольные предупреждения остаются — в бандлере и журнале видны по-прежнему, скрываются только плашки на экране.
// Это публичный флаг, секретов нет.
declare const __DEV__: boolean;

/** true — LogBox отключён этим вызовом. */
export function applyDevSnapshotClean(): boolean {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  if (process.env.EXPO_PUBLIC_SNAPSHOT_CLEAN !== '1') return false;
  LogBox.ignoreAllLogs(true);
  console.log('[SNAPSHOT-CLEAN] LogBox отключён: чистые кадры сверки (EXPO_PUBLIC_SNAPSHOT_CLEAN=1)');
  return true;
}

applyDevSnapshotClean();
