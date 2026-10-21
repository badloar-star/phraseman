/**
 * «Вместе» — дефолты и флаг фичи.
 *
 * Флаг: remote_config/app.bools.friends_together_enabled (boolean, дефолт false
 * до релиза UI — Фаза A может катиться раньше, но UI остаётся скрытым).
 *
 * зачем: remote_flags.ts держит закрытый union RemoteBoolKey — заводить туда
 * новый ключ значит редактировать общий файл вне списка файлов этой задачи
 * (другие сессии тоже могут его трогать, риск гонки). Вместо этого читаем ТОТ ЖЕ
 * кэш-документ (`remote_config_cache_v1` в AsyncStorage), который заполняет
 * remote_config_client.ts из remote_config/app — без лишних чтений Firestore,
 * без сети, полностью автономный модуль. Реагируем на то же событие
 * 'remote_config_changed', так что выключение из админки (когда там заведут
 * ключ friends_together_enabled) подхватится живьём, без перезапуска.
 */
import { useEffect, useState } from 'react';
import { onAppEvent } from '../events';
import { DebugLogger } from '../debug-logger';
import { readRemoteConfigCacheRaw } from '../remote_config_client'; // зачем: [COLD-START-IO] — одно чтение кэша на всех


/** Пороги уровней дружбы (дней вместе), индекс = level-1. Дублирует together_days.LEVEL_THRESHOLDS
 * тем же массивом чисел — держим здесь копию под конфиг ради читаемого единого места настроек. */
export const FRIENDS_LEVEL_THRESHOLDS: readonly number[] = [0, 3, 10, 30, 100];

/** Лимиты «Позвать» (nudge), §1.3. */
export const FRIENDS_NUDGE_LIMITS = Object.freeze({
  /** Тихие часы получателя, локальное время. */
  quietHoursStart: 22,
  quietHoursEnd: 9,
  /** Максимум nudge от одного отправителя в день. */
  senderDailyLimit: 5,
  /** Максимум nudge, которые получатель может получить в день. */
  receiverDailyLimit: 3,
  /** Раз в день на конкретного друга. */
  perFriendPerDay: 1,
});

export type FriendsTogetherClientConfig = Readonly<{
  levelThresholds: readonly number[];
}>;

export const FRIENDS_TOGETHER_CLIENT_DEFAULTS: FriendsTogetherClientConfig = Object.freeze({
  levelThresholds: FRIENDS_LEVEL_THRESHOLDS,
});

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function numberArray(value: unknown, fallback: readonly number[], min: number, max: number): readonly number[] {
  if (!Array.isArray(value) || value.length !== fallback.length) return fallback;
  const parsed = value.map((item) => clampInt(item, min, max, Number.NaN));
  if (parsed.some((item) => !Number.isFinite(item))) return fallback;
  for (let i = 1; i < parsed.length; i += 1) if (parsed[i] < parsed[i - 1]) return fallback;
  return parsed;
}

export function friendsTogetherClientConfigFromNumbers(numbers: Record<string, unknown> | undefined): FriendsTogetherClientConfig {
  const n = numbers ?? {};
  const d = FRIENDS_TOGETHER_CLIENT_DEFAULTS;
  return Object.freeze({
    levelThresholds: numberArray(n.friends_level_thresholds, d.levelThresholds, 0, 100_000),
  });
}

/**
 * Сборочный выключатель интерфейса «Вместе» 2.0: вкладка «Друзья», строка «Серия вдвоём» на Главной, карточки финала занятия.
 * зачем (координатор 21.10): включается только после «Сверки» эмулятора с макетом docs/design/v2-app/friends-full.html;
 * удалённый friends_together_enabled остаётся аварийным выключателем. Один выключатель на все экраны — экраны не расходятся.
 */
export const FRIENDS_TOGETHER_UI_ENABLED = false;

const FRIENDS_TOGETHER_FLAG_KEY = 'friends_together_enabled';

/** Синхронный кэш последнего прочитанного значения — синхронное API нужно
 * не-реактивным местам (например nudge_client), а AsyncStorage асинхронен. */
let _cachedEnabled = false;
let _cachedConfig = FRIENDS_TOGETHER_CLIENT_DEFAULTS;
let _hydrated = false;
let _primePromise: Promise<void> | null = null;

async function readCacheOnce(): Promise<void> {
  try {
    const raw = await readRemoteConfigCacheRaw();
    if (!raw) { _hydrated = true; return; }
    const parsed = JSON.parse(raw) as { bools?: Record<string, unknown>; numbers?: Record<string, unknown> };
    _cachedEnabled = parsed?.bools?.[FRIENDS_TOGETHER_FLAG_KEY] === true;
    _cachedConfig = friendsTogetherClientConfigFromNumbers(parsed?.numbers);
  } catch (e) {
      // best-effort: держим дефолт false
      DebugLogger.error('together_config:parsed', e instanceof Error ? e : new Error(String(e)), 'warning');
    } finally {
    _hydrated = true;
  }
}

/** Прогреть кэш флага из AsyncStorage (вызывать рядом с primeRemoteConfigCacheFromStorage). */
export function primeFriendsTogetherFlag(): Promise<void> {
  if (!_primePromise) _primePromise = readCacheOnce();
  return _primePromise;
}

/** Синхронное чтение флага (для не-реактивных мест). Дефолт false до релиза/до прогрева кэша. */
export function isFriendsTogetherEnabled(): boolean {
  return _cachedEnabled;
}

export function getFriendsTogetherConfig(): FriendsTogetherClientConfig {
  return _cachedConfig;
}

export type FriendsTogetherFlagPolicy = Readonly<{
  enabled: boolean;
  remoteHydrated: boolean;
  config: FriendsTogetherClientConfig;
}>;

function readPolicy(): FriendsTogetherFlagPolicy {
  return {
    enabled: _cachedEnabled,
    remoteHydrated: _hydrated,
    config: _cachedConfig,
  };
}

/** Реактивный хук — переоценивает флаг на 'remote_config_changed', как useReferralRoulettePolicy. */
export function useFriendsTogetherEnabled(): FriendsTogetherFlagPolicy {
  const [policy, setPolicy] = useState<FriendsTogetherFlagPolicy>(() => readPolicy());
  useEffect(() => {
    // Первый маунт может опередить primeFriendsTogetherFlag() из bootstrap — подстрахуемся.
    void primeFriendsTogetherFlag().then(() => {
      const next = readPolicy();
      setPolicy(next);
    });
    const sub = onAppEvent('remote_config_changed', () => {
      void readCacheOnce().then(() => {
        const next = readPolicy();
        setPolicy(next);
      });
    });
    return () => sub.remove();
  }, []);
  return policy;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
