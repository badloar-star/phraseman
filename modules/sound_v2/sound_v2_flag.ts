// зачем: владелец 14.10 одобрил звуки лаборатории; несколько вариантов на событие, без повторов подряд.
//
// Флаг sound_v2 — ВКЛЮЧЁН по умолчанию (владелец 18.10: «в приложении ни одного звука», в макетах все моменты со звуком).
// remote_config/app.bools.sound_v2 = false — выключатель на случай беды (как use_moments_v3_flag); ключа нет или true — звуки V2 играют.
// Читаем ТОТ ЖЕ кэш удалённой конфигурации (`remote_config_cache_v1`), что и app/spire_tab_flag.ts:
//  - без новых чтений Firestore (кэш уже лежит в памяти после старта приложения);
//  - без правок общего app/remote_flags.ts (закрытый union RemoteBoolKey — общий файл, риск гонки сессий).
// Когда ключ sound_v2 добавят в RemoteBoolKey/DEFAULT_FLAGS, достаточно заменить readCacheOnce на getRemoteBool('sound_v2').
//
// Пока кэш не прочитан — действует значение по умолчанию (вкл). Тяжёлые модули (remote_config_client, events)
// подключаются лениво внутри прогрева, поэтому импорт этого файла ничего не тянет на холодном старте.

const FLAG_KEY = 'sound_v2';
// зачем (координатор 14.10, п.1): Сверка включает звуки V2 на эмуляторе ссылкой dev_state (soundv2=on|off) без правки удалённой конфигурации; только в __DEV__, переживает перезапуск
const DEV_KEY = 'sound_v2_dev_override_v1';
/** dev-переключатель: null — не задан, иначе явное значение (только __DEV__). */
let devOverride: boolean | null = null;
const LOG = '[SOUND-V2]';

/** Явное значение из удалённой конфигурации; null — ключа нет (действует значение по умолчанию). */
let remoteValue: boolean | null = null;
let hydrated = false;
let primePromise: Promise<void> | null = null;
let subscribed = false;
let testOverride: boolean | null = null;

/** Звуки V2 по умолчанию ВКЛ (владелец 18.10). Выключает только явный false в удалённой конфигурации (или dev-переключатель). */
export const SOUND_V2_DEFAULT_ENABLED = true;

/** Синхронное чтение: до прогрева кэша — значение по умолчанию (вкл). */
export function isSoundV2Enabled(): boolean {
  if (testOverride !== null) return testOverride;
  if (typeof __DEV__ !== 'undefined' && __DEV__ && devOverride !== null) return devOverride;
  return remoteValue ?? SOUND_V2_DEFAULT_ENABLED;
}

export function isSoundV2FlagHydrated(): boolean {
  return testOverride !== null || hydrated;
}

async function readCacheOnce(): Promise<void> {
  const before = hydrated ? remoteValue : undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readRemoteConfigCacheRaw } = require('@/app/remote_config_client') as typeof import('@/app/remote_config_client');
    const raw = await readRemoteConfigCacheRaw();
    if (raw) {
      const parsed = JSON.parse(raw) as { bools?: Record<string, unknown> };
      const flagValue = parsed?.bools?.[FLAG_KEY];
      remoteValue = typeof flagValue === 'boolean' ? flagValue : null;
    } else {
      remoteValue = null;
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = (require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage')).default;
      const stored = await AsyncStorage.getItem(DEV_KEY);
      devOverride = stored === '1' ? true : stored === '0' ? false : null;
    }
    if (before !== remoteValue) {
      console.warn(`${LOG} flag: ${FLAG_KEY} remote=${String(remoteValue)} → звуки V2 ${isSoundV2Enabled() ? 'ВКЛ' : 'выкл'} (по умолчанию вкл; раньше remote=${String(before)}; dev=${String(devOverride)})`); // guard-ok: одна строка на смену флага
    }
  } catch (error) {
    // зачем (владелец 18.10): звуки по умолчанию включены — битый кэш оставляет значение по умолчанию; выключить может только явный false.
    remoteValue = null;
    console.warn(`${LOG} flag: кэш не прочитался, звуки V2 по умолчанию ВКЛ (${error instanceof Error ? error.message : String(error)})`);
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

