/**
 * Замок вкладки «Шпиль» в разделе «Сообщество» (пакет A).
 *
 * зачем: третий сегмент «Шпиль» не должен появиться у реальных игроков, пока
 * владелец не включит его. Видимость = remote-ключ remote_config/app.bools.spire_tab_enabled
 * (по умолчанию false) ИЛИ локальный __DEV__-переключатель (по умолчанию выключен).
 * Как и в friends_together/together_config.ts, читаем ТОТ ЖЕ кэш-документ
 * (`remote_config_cache_v1` в AsyncStorage): без новых чтений Firestore и без правок
 * общего remote_flags.ts (закрытый union RemoteBoolKey — общий файл, риск гонки сессий).
 *
 * Второй замок (config.enabled из config/spire_v1) живёт на самом экране Шпиля.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { onAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import { readRemoteConfigCacheRaw } from './remote_config_client'; // зачем: [COLD-START-IO] — одно чтение кэша на всех

const SPIRE_TAB_FLAG_KEY = 'spire_tab_enabled';
const SPIRE_TAB_DEV_KEY = 'spire_tab_dev_override_v1';
const LOG = '[SPIRE]';

let _remoteEnabled = false;
let _devOverride = false;
let _hydrated = false;
let _primePromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

async function readCacheOnce(): Promise<void> {
  try {
    const raw = await readRemoteConfigCacheRaw();
    if (raw) {
      const parsed = JSON.parse(raw) as { bools?: Record<string, unknown> };
      _remoteEnabled = parsed?.bools?.[SPIRE_TAB_FLAG_KEY] === true;
    } else {
      _remoteEnabled = false;
    }
    if (__DEV__) _devOverride = (await AsyncStorage.getItem(SPIRE_TAB_DEV_KEY)) === '1';
    DebugLogger.info(LOG, `tab flag: remote=${String(_remoteEnabled)} dev=${String(_devOverride)} (из кэша remote_config_cache_v1)`);
  } catch (e) {
    // зачем: битый кэш не должен открыть вкладку — остаёмся на выключенном.
    _remoteEnabled = false;
    DebugLogger.warn(LOG, `tab flag: кэш не прочитался, вкладка остаётся скрытой (${String(e)})`);
  } finally {
    _hydrated = true;
  }
}

/** Прогреть флаг из AsyncStorage (безопасно звать сколько угодно раз). */
export function primeSpireTabFlag(): Promise<void> {
  if (!_primePromise) _primePromise = readCacheOnce();
  return _primePromise;
}

/** Синхронное чтение: до прогрева кэша всегда false. */
export function isSpireTabEnabled(): boolean {
  return _remoteEnabled || (__DEV__ && _devOverride);
}

/** __DEV__-переключатель. В релизной сборке ничего не делает. */
export async function setSpireTabDevOverride(enabled: boolean): Promise<void> {
  if (!__DEV__) {
    DebugLogger.info(LOG, 'tab flag: dev-переключатель игнорируется вне __DEV__');
    return;
  }
  _devOverride = enabled;
  try {
    await AsyncStorage.setItem(SPIRE_TAB_DEV_KEY, enabled ? '1' : '0');
  } catch (e) {
    DebugLogger.warn(LOG, `tab flag: dev-значение не сохранилось (${String(e)})`);
  }
  notify();
}

/** Реактивный флаг: переоценивается на 'remote_config_changed' и при dev-переключении. */
export function useSpireTabEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => isSpireTabEnabled());
  useEffect(() => {
    let alive = true;
    const sync = () => { if (alive) setEnabled(isSpireTabEnabled()); };
    void primeSpireTabFlag().then(sync);
    listeners.add(sync);
    const sub = onAppEvent('remote_config_changed', () => {
      void readCacheOnce().then(() => { sync(); });
    });
    return () => {
      alive = false;
      listeners.delete(sync);
      sub.remove();
    };
  }, []);
  return _hydrated ? enabled : false;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
