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
import { DeviceEventEmitter } from 'react-native';
import { peekAppLang } from './app_snapshot_bootstrap';
import { logSpireUiLangGate, spireUiLangDecision } from './spire/spire_ui_lang_gate';
import { peekResolvedUiLang, subscribeResolvedUiLang } from './ui_lang_resolved';
import { onAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import { readRemoteConfigCacheRaw } from './remote_config_client'; // зачем: [COLD-START-IO] — одно чтение кэша на всех
import { invalidateSpireConfigCache } from './spire_config_client';

const SPIRE_TAB_FLAG_KEY = 'spire_tab_enabled';
const SPIRE_TAB_DEV_KEY = 'spire_tab_dev_override_v1';
// зачем (координатор 11.10, Шпиль — обязательный пункт релиза): для съёмки экранов на эмуляторе без правки remote-конфига вкладку можно показать в dev
// переменной EXPO_PUBLIC_SPIRE_DEV_TAB=1. Только __DEV__ (в релизе значение игнорируется), второй замок config.enabled сервера НЕ обходится.
const DEV_TAB_ENV = process.env.EXPO_PUBLIC_SPIRE_DEV_TAB === '1';
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
  const before = _hydrated ? _remoteEnabled : null;
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
    // зачем (координатор 11.10): флаг вкладки сменился → кэш config/spire_v1 (6 ч) мог остаться от прежнего состояния —
    // сбрасываем, чтобы вход в Шпиль прочитал сервер (одно чтение документа, только при смене).
    if (before !== null && before !== _remoteEnabled) void invalidateSpireConfigCache(`spire_tab_enabled ${String(before)}→${String(_remoteEnabled)}`);
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

/** Флаг вкладки без учёта языка интерфейса (remote или dev). */
function isSpireFlagOn(): boolean {
  return _remoteEnabled || (__DEV__ && (_devOverride || DEV_TAB_ENV));
}

/**
 * Синхронное чтение: до прогрева кэша всегда false.
 * зачем (владелец 11.10): Шпиль в первом выпуске только при интерфейсе ru/uk — язык проверяется здесь, в
 * единственном замке, через который ходят вкладка, ворота сети, задания дня, плитка Главной и вход по пушу.
 * Dev-переключатель язык НЕ обходит: съёмка es-интерфейса обязана показать Главную без Шпиля.
 */
export function isSpireTabEnabled(): boolean {
  if (!isSpireFlagOn()) return false;
  const ui = spireGateUiLang();
  const decision = spireUiLangDecision(ui.lang);
  logSpireUiLangGate(decision, `isSpireTabEnabled source=${ui.source}`);
  return decision.allowed;
}

/**
 * Язык для замка Шпиля: фактический язык интерфейса из LangContext, до его монтирования — сохранённый `app_lang`.
 * зачем (координатор 12.10, 🔴 community-001): peek — СЫРОЕ сохранённое значение; кто язык не выбирал вручную, у того
 * он навсегда null, а интерфейс рисуется языком устройства (ru) — Шпиль пропадал у русских и украинских игроков.
 */
export function spireGateUiLang(): { lang: string | null; source: 'context' | 'stored_peek' | 'none' } {
  const resolved = peekResolvedUiLang();
  if (resolved) return { lang: resolved, source: 'context' };
  const stored = peekAppLang();
  if (stored) return { lang: stored, source: 'stored_peek' };
  return { lang: null, source: 'none' };
}

// зачем: смена языка ru → es посреди недели — Шпиль пропадает сразу, без перезапуска. LangContext пишет peek
// языка ДО события 'app_lang_changed', поэтому подписчики видят уже новый язык. Подписка одна на процесс.
// зачем (координатор 12.10): null — не «нет», а «ещё не знаем». Вторая подписка — на публикацию фактического языка
// (первый кадр LangContext и гидрация события 'app_lang_changed' не шлют), замок пересчитывается, когда язык стал известен.
let _langSub: { remove: () => void } | null = null;
let _resolvedLangUnsub: (() => void) | null = null;
function ensureLangSubscription(): void {
  if (!_langSub) {
    _langSub = DeviceEventEmitter.addListener('app_lang_changed', () => {
      DebugLogger.info(LOG, `tab flag: язык интерфейса сменился → пересчёт замка (lang=${String(spireGateUiLang().lang)})`);
      notify();
    });
  }
  if (!_resolvedLangUnsub) {
    _resolvedLangUnsub = subscribeResolvedUiLang((lang) => {
      DebugLogger.info(LOG, `tab flag: язык интерфейса стал известен/сменился (lang=${lang}) → пересчёт замка, подписчиков=${listeners.size}`);
      notify();
    });
  }
}

/** Перечитать флаг из кэша рубильников сейчас (после принудительного перечита) и уведомить подписчиков. */
export async function rereadSpireTabFlag(): Promise<boolean> {
  await readCacheOnce();
  notify();
  return isSpireTabEnabled();
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
    ensureLangSubscription();
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

/** Прогрет ли флаг (для входа по ссылке: до прогрева «скрыт» ещё не значит «нельзя»). */
export function isSpireTabFlagHydrated(): boolean {
  return _hydrated;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
