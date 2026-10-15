// use_moments_v3_flag.ts — реактивное чтение удалённого флага moments_v3 для экранов (кольца «Сегодня» на Главной и пр.).
// зачем (координатор 14.10): всё перенесённое показывается только за флагом, по умолчанию ВКЛ, явный false — выключатель. Читаем ТОТ ЖЕ кэш remote_config_cache_v1, что и ворота окна Пика и sound_v2:
// ни одного нового чтения Firestore; пока кэш не прочитан — false (безопасная сторона). Один общий промис на приложение, подписка на 'remote_config_changed'.
import { useEffect, useState } from 'react';
import { isMomentsV3Enabled, momentsV3RemoteState } from './streak_moments_flag';

const LOG = '[MOMENTS-V3-FLAG]';
let value = false;
let hydrated = false;
let promise: Promise<void> | null = null;
let subscribed = false;
const listeners = new Set<() => void>();
// зачем (координатор 15.10, кадры Сверки моментов v3): dev-переключатель вместо удалённого флага — phraseman://dev_state?moments=v3|off|inherit.
// Только dev-сборка (__DEV__): в стор-сборке не читается и не пишется; хранится в локальном ключе устройства, в синхронизацию не входит.
const DEV_KEY = 'dev_moments_v3_override';
let devOverride: boolean | null = null;

async function readDevOverride(): Promise<void> {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = (require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(DEV_KEY);
    devOverride = raw === '1' ? true : raw === '0' ? false : null;
    if (devOverride !== null) console.log(`${LOG} dev-переключатель активен: moments_v3=${String(devOverride)} (${DEV_KEY})`); // guard-ok: dev-ветка
  } catch (error) {
    console.warn(`${LOG} dev-переключатель не прочитался — берём удалённый флаг (${error instanceof Error ? error.message : String(error)})`);
  }
}

async function readOnce(): Promise<void> {
  await readDevOverride();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readRemoteConfigCacheRaw } = require('../../../app/remote_config_client') as typeof import('../../../app/remote_config_client');
    const raw = await readRemoteConfigCacheRaw();
    const bools = raw ? (JSON.parse(raw) as { bools?: Record<string, unknown> }).bools : null;
    const next = isMomentsV3Enabled(bools);
    // зачем (координатор 15.10): одна строка на чтение кэша — что сказал сервер (true/false/absent) и что в итоге
    console.log(LOG, JSON.stringify({ source: 'screens', remote: momentsV3RemoteState(bools), cache: raw ? 'есть' : 'нет', previous: value, effective: next })); // guard-ok: одна строка на чтение кэша
    value = next;
  } catch (error) {
    // зачем (координатор 15.10): правило «по умолчанию включено» — битый кэш считается как «ключа нет»; выключает только явный false с сервера
    value = isMomentsV3Enabled(null);
    console.warn(`${LOG} кэш конфига не прочитался — правило по умолчанию, moments_v3=${String(value)} (${error instanceof Error ? error.message : String(error)})`);
  } finally {
    hydrated = true;
    listeners.forEach((l) => l());
  }
}

function subscribeOnce(): void {
  if (subscribed) return;
  subscribed = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { onAppEvent } = require('../../../app/events') as typeof import('../../../app/events');
    onAppEvent('remote_config_changed', () => { void readOnce(); });
  } catch (error) {
    console.warn(`${LOG} подписка на remote_config_changed не удалась (${error instanceof Error ? error.message : String(error)})`);
  }
}

/** Синхронное чтение: до прогрева кэша false. */
export function isMomentsV3FlagOn(): boolean {
  if (devOverride !== null) return devOverride;
  return hydrated && value;
}

/** dev_state `moments=v3|off|inherit`: true/false — подменить удалённый флаг на устройстве, null — снять подмену. В стор-сборке ничего не делает. */
export async function setMomentsV3DevOverride(next: boolean | null): Promise<void> {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    console.log(`${LOG} dev-переключатель игнорирован: это не dev-сборка`);
    return;
  }
  devOverride = next;
  listeners.forEach((l) => l());
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = (require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage')).default;
    if (next === null) await AsyncStorage.removeItem(DEV_KEY);
    else await AsyncStorage.setItem(DEV_KEY, next ? '1' : '0');
    console.log(`${LOG} dev-переключатель: moments_v3=${next === null ? 'как в удалённом конфиге' : String(next)} (${DEV_KEY})`);
  } catch (error) {
    console.warn(`${LOG} dev-переключатель не сохранился, до перезапуска работает (${error instanceof Error ? error.message : String(error)})`);
  }
}

export function useMomentsV3Enabled(): boolean {
  const [on, setOn] = useState<boolean>(() => isMomentsV3FlagOn());
  useEffect(() => {
    const sync = () => setOn(isMomentsV3FlagOn());
    listeners.add(sync);
    if (!promise) { promise = readOnce(); subscribeOnce(); } else { sync(); }
    return () => { listeners.delete(sync); };
  }, []);
  return on;
}
