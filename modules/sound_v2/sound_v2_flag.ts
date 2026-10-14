// зачем: владелец 14.10 одобрил звуки лаборатории; несколько вариантов на событие, без повторов подряд.
//
// Флаг sound_v2 — ВЫКЛЮЧЕН по умолчанию. Включает только владелец в «Пульте»: remote_config/app.bools.sound_v2.
// Читаем ТОТ ЖЕ кэш удалённой конфигурации (`remote_config_cache_v1`), что и app/spire_tab_flag.ts:
//  - без новых чтений Firestore (кэш уже лежит в памяти после старта приложения);
//  - без правок общего app/remote_flags.ts (закрытый union RemoteBoolKey — общий файл, риск гонки сессий).
// Когда ключ sound_v2 добавят в RemoteBoolKey/DEFAULT_FLAGS, достаточно заменить readCacheOnce на getRemoteBool('sound_v2').
//
// Пока кэш не прочитан — флаг выключен (безопасная сторона). Тяжёлые модули (remote_config_client, events)
// подключаются лениво внутри прогрева, поэтому импорт этого файла ничего не тянет на холодном старте.

const FLAG_KEY = 'sound_v2';
// зачем (координатор 14.10, п.1): Сверка включает звуки V2 на эмуляторе ссылкой dev_state (soundv2=on|off) без правки удалённой конфигурации; только в __DEV__, переживает перезапуск
const DEV_KEY = 'sound_v2_dev_override_v1';
let devOverride = false;
const LOG = '[SOUND-V2]';

let remoteEnabled = false;
let hydrated = false;
let primePromise: Promise<void> | null = null;
let subscribed = false;
let testOverride: boolean | null = null;

/** Синхронное чтение: до прогрева кэша всегда false. */
export function isSoundV2Enabled(): boolean {
  if (testOverride !== null) return testOverride;
  return hydrated && (remoteEnabled || (__DEV__ && devOverride));
}

export function isSoundV2FlagHydrated(): boolean {
  return testOverride !== null || hydrated;
}

async function readCacheOnce(): Promise<void> {
  const before = hydrated ? remoteEnabled : null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readRemoteConfigCacheRaw } = require('@/app/remote_config_client') as typeof import('@/app/remote_config_client');
    const raw = await readRemoteConfigCacheRaw();
    if (raw) {
      const parsed = JSON.parse(raw) as { bools?: Record<string, unknown> };
      remoteEnabled = parsed?.bools?.[FLAG_KEY] === true;
    } else {
      remoteEnabled = false;
    }
    if (__DEV__) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = (require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage')).default;
      devOverride = (await AsyncStorage.getItem(DEV_KEY)) === '1';
    }
    if (before !== remoteEnabled) {
      console.log(`${LOG} flag: ${FLAG_KEY}=${String(remoteEnabled)} (из кэша remote_config_cache_v1, раньше=${String(before)})`);
    }
  } catch (error) {
    // зачем: битый кэш или недоступное хранилище не должны включить новые звуки — остаёмся на выключенном.
    remoteEnabled = false;
    console.warn(`${LOG} flag: кэш не прочитался, звуки V2 остаются выключенными (${error instanceof Error ? error.message : String(error)})`);
  } finally {
    hydrated = true;
  }
}

function subscribeToConfigChanges(): void {
  if (subscribed) return;
  subscribed = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { onAppEvent } = require('@/app/events') as typeof import('@/app/events');
    onAppEvent('remote_config_changed', () => {
      void readCacheOnce();
    });
  } catch (error) {
    // Без подписки флаг обновится при следующем запуске приложения — это не поломка, но причину пишем.
    console.warn(`${LOG} flag: подписка на remote_config_changed не удалась (${error instanceof Error ? error.message : String(error)})`);
  }
}

/** Прогреть флаг из кэша (безопасно звать сколько угодно раз; один общий промис). */
export function primeSoundV2Flag(): Promise<void> {
  if (testOverride !== null) return Promise.resolve();
  if (!primePromise) {
    primePromise = readCacheOnce();
    subscribeToConfigChanges();
  }
  return primePromise;
}

/** Только для тестов: принудительное значение (null — снять). */
export function setSoundV2FlagForTests(value: boolean | null): void {
  testOverride = value;
}

/** Dev-переключатель (только __DEV__): включить/выключить звуки V2 на устройстве, не трогая удалённый флаг. */
export async function setSoundV2DevOverride(enabled: boolean): Promise<void> {
  if (!__DEV__) {
    console.log(`${LOG} dev-переключатель игнорирован: это не dev-сборка`);
    return;
  }
  devOverride = enabled;
  hydrated = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = (require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(DEV_KEY, enabled ? '1' : '0');
    console.log(`${LOG} dev-переключатель: sound_v2=${String(enabled)} (сохранено в ${DEV_KEY})`);
  } catch (error) {
    console.warn(`${LOG} dev-переключатель: значение не сохранилось, до перезапуска работает (${error instanceof Error ? error.message : String(error)})`);
  }
}

