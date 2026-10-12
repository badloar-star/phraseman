import { LogBox } from 'react-native';

// зачем (координатор 11.10): чистые кадры сверки без LogBox-плашек и инспектора. Сверка снимает экраны эмулятора в dev-сборке; жёлтые/красные
// плашки (RevenueCat BILLING_UNAVAILABLE, «Open debugger…») закрывают низ экрана, а случайный тап открывает полноэкранный инспектор и портит
// весь прогон. Включается ТОЛЬКО в dev и ТОЛЬКО при EXPO_PUBLIC_SNAPSHOT_CLEAN=1 (Metro перезапускает сессия «Эмулятор»); в обычном dev и в релизе
// ничего не меняется. Консольные предупреждения остаются — в бандлере и журнале видны по-прежнему, скрываются только плашки на экране.
// Это публичный флаг, секретов нет.
declare const __DEV__: boolean;

// зачем (координатор 12.10, «ДА — выключать Fast Refresh в режиме чистых кадров»): белый экран cards-v2-033 — это перезагрузка JS
// от правок параллельных сессий посреди съёмки. В режиме чистых кадров Fast Refresh выключен: робот перед каждым id делает
// force-stop и получает свежий код холодным стартом. Настройка на Android сохраняется между запусками, поэтому ставим метку
// «выключил режим съёмки» и в обычном dev возвращаем Fast Refresh, только если выключали мы.
export const SNAPSHOT_CLEAN_HOT_OFF_MARK_KEY = 'dev_snapshot_clean_fast_refresh_off_v1';

type DevSettingsNative = { setHotLoadingEnabled?: (enabled: boolean) => void };

function devSettingsNative(): DevSettingsNative | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native/Libraries/NativeModules/specs/NativeDevSettings') as { default?: DevSettingsNative };
    return mod.default ?? null;
  } catch (error) {
    console.warn('[SNAPSHOT-CLEAN] fast_refresh: модуль DevSettings недоступен', String(error)); // guard-ok: catch называет причину
    return null;
  }
}

function setFastRefresh(enabled: boolean): boolean {
  const native = devSettingsNative();
  if (!native?.setHotLoadingEnabled) {
    console.warn(`[SNAPSHOT-CLEAN] fast_refresh=${enabled ? 'on' : 'off'} не выставлен: setHotLoadingEnabled нет`); // guard-ok: ранний выход называет причину
    return false;
  }
  native.setHotLoadingEnabled(enabled);
  return true;
}

async function syncFastRefreshMark(snapshotClean: boolean): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storage = (require('@react-native-async-storage/async-storage') as { default: { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void>; removeItem(k: string): Promise<void> } }).default;
    if (snapshotClean) {
      await storage.setItem(SNAPSHOT_CLEAN_HOT_OFF_MARK_KEY, '1');
      return;
    }
    if ((await storage.getItem(SNAPSHOT_CLEAN_HOT_OFF_MARK_KEY)) !== '1') return;
    if (setFastRefresh(true)) console.log('[SNAPSHOT-CLEAN] fast_refresh=on — возвращён после режима чистых кадров');
    await storage.removeItem(SNAPSHOT_CLEAN_HOT_OFF_MARK_KEY);
  } catch (error) {
    console.warn('[SNAPSHOT-CLEAN] fast_refresh: метка не записана/не прочитана', String(error)); // guard-ok: catch называет причину
  }
}

/** true — LogBox отключён этим вызовом. */
export function applyDevSnapshotClean(): boolean {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  if (process.env.EXPO_PUBLIC_SNAPSHOT_CLEAN !== '1') {
    void syncFastRefreshMark(false);
    return false;
  }
  LogBox.ignoreAllLogs(true);
  console.log('[SNAPSHOT-CLEAN] LogBox отключён: чистые кадры сверки (EXPO_PUBLIC_SNAPSHOT_CLEAN=1)');
  if (setFastRefresh(false)) console.log('[SNAPSHOT-CLEAN] fast_refresh=off — правки других сессий не перезагружают приложение посреди съёмки');
  void syncFastRefreshMark(true);
  return true;
}

applyDevSnapshotClean();
