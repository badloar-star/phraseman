/**
 * remote_flags.ts — слой удалённо-управляемых флагов и числовых параметров.
 *
 * Сейчас источник значений — env-переменные (EXPO_PUBLIC_*) + безопасные дефолты.
 * Когда подключат `@react-native-firebase/remote-config`, достаточно реализовать
 * `loadRemoteOverrides()` (один TODO ниже) — остальной код не меняется. Это тот же
 * приём «no-op без зависимости», что и в [[posthog_client]]: фича включается
 * добавлением пакета/ключа, без переписывания вызовов.
 *
 * Правило: ни одно изменение здесь не должно ломать сборку без нативных зависимостей.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Числовые параметры с дефолтами ──────────────────────────────────────────────
// Дефолт тренажёра: 2 бесплатные сессии в день (раньше был хардкод 1). Первая —
// разогрев, вторая — вход в поток; помогает привычке и SRS, сохраняя мотивацию к Premium.
export const FREE_TRAINER_SESSIONS_PER_DAY_DEFAULT = 2;

// A/B-доли (проценты). Сумма групп = 100. Используются детерминированно по userId-хешу.
// Группы тренажёра: A=1 сессия, B=2 сессии, C=3 сессии.
const TRAINER_AB_DEFAULT = { a: 0, b: 100, c: 0 } as const;

type RemoteNumbers = {
  free_trainer_sessions_per_day: number;
  trainer_ab_a_pct: number;
  trainer_ab_b_pct: number;
  trainer_ab_c_pct: number;
};

const DEFAULT_NUMBERS: RemoteNumbers = {
  free_trainer_sessions_per_day: FREE_TRAINER_SESSIONS_PER_DAY_DEFAULT,
  trainer_ab_a_pct: TRAINER_AB_DEFAULT.a,
  trainer_ab_b_pct: TRAINER_AB_DEFAULT.b,
  trainer_ab_c_pct: TRAINER_AB_DEFAULT.c,
};

const ENV_NUMBERS: Partial<RemoteNumbers> = {
  free_trainer_sessions_per_day: numFromEnv('EXPO_PUBLIC_FREE_TRAINER_SESSIONS'),
  trainer_ab_a_pct: numFromEnv('EXPO_PUBLIC_TRAINER_AB_A'),
  trainer_ab_b_pct: numFromEnv('EXPO_PUBLIC_TRAINER_AB_B'),
  trainer_ab_c_pct: numFromEnv('EXPO_PUBLIC_TRAINER_AB_C'),
};

function numFromEnv(key: string): number | undefined {
  const raw = process.env[key];
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

let _remoteOverrides: Partial<RemoteNumbers> = {};

/**
 * Точка интеграции Firebase Remote Config. Сейчас no-op.
 * Когда подключат пакет:
 *   const rc = (await import('@react-native-firebase/remote-config')).default();
 *   await rc.fetchAndActivate();
 *   _remoteOverrides = { free_trainer_sessions_per_day: rc.getNumber('free_trainer_sessions_per_day'), ... };
 */
export async function loadRemoteOverrides(): Promise<void> {
  // TODO(remote-config): заполнить _remoteOverrides из Firebase Remote Config.
  // До этого работают env + дефолты.
}

function resolveNumber<K extends keyof RemoteNumbers>(key: K): number {
  const remote = _remoteOverrides[key];
  if (typeof remote === 'number' && Number.isFinite(remote)) return remote;
  const env = ENV_NUMBERS[key];
  if (typeof env === 'number') return env;
  return DEFAULT_NUMBERS[key];
}

// ── Публичные геттеры ───────────────────────────────────────────────────────────

/** Базовое число бесплатных сессий тренажёра в день (без учёта A/B-группы). */
export function getFreeTrainerSessionsPerDay(): number {
  const n = resolveNumber('free_trainer_sessions_per_day');
  return Math.max(1, Math.round(n));
}

// ── Детерминированный A/B по userId ─────────────────────────────────────────────

/** djb2 — стабильный хеш строки в [0, 2^32). */
function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0;
  }
  return h;
}

export type TrainerAbGroup = 'A' | 'B' | 'C';

/**
 * Детерминированно назначает A/B-группу тренажёра по userId.
 * Один и тот же userId всегда попадает в одну группу (воспроизводимо для аналитики).
 * Доли берутся из remote/env/дефолтов; при сумме ≠ 100 нормализуются.
 */
export function getTrainerAbGroup(userId: string): TrainerAbGroup {
  const a = Math.max(0, resolveNumber('trainer_ab_a_pct'));
  const b = Math.max(0, resolveNumber('trainer_ab_b_pct'));
  const c = Math.max(0, resolveNumber('trainer_ab_c_pct'));
  const total = a + b + c;
  if (total <= 0) return 'B'; // деградация к дефолту (2 сессии)
  const bucket = djb2(`${userId}:trainer_sessions_ab`) % 100;
  const aEnd = (a / total) * 100;
  const bEnd = aEnd + (b / total) * 100;
  if (bucket < aEnd) return 'A';
  if (bucket < bEnd) return 'B';
  return 'C';
}

/** Сессий/день для конкретной A/B-группы. A=1, B=2, C=3. */
export function trainerSessionsForGroup(group: TrainerAbGroup): number {
  switch (group) {
    case 'A': return 1;
    case 'B': return 2;
    case 'C': return 3;
  }
}

/**
 * Итоговое число бесплатных сессий тренажёра в день для пользователя:
 * если заданы A/B-доли — берём группу по userId; иначе — базовый дефолт.
 * Результат кешируется в AsyncStorage, чтобы группа не «прыгала» между сессиями.
 */
const TRAINER_AB_CACHE_KEY = 'trainer_sessions_ab_group_v1';

/** Подпись текущей конфигурации долей — кеш группы инвалидируется при её смене. */
function trainerAbConfigSig(): string {
  return `${resolveNumber('trainer_ab_a_pct')}-${resolveNumber('trainer_ab_b_pct')}-${resolveNumber('trainer_ab_c_pct')}`;
}

export async function getEffectiveFreeTrainerSessions(userId: string | null): Promise<number> {
  const hasAbSplit =
    resolveNumber('trainer_ab_a_pct') +
      resolveNumber('trainer_ab_b_pct') +
      resolveNumber('trainer_ab_c_pct') >
    0;

  if (!hasAbSplit || !userId) return getFreeTrainerSessionsPerDay();

  // Кеш хранит «sig|group». Если доли поменялись (Remote Config) — пересчитываем,
  // чтобы группа не залипала навсегда при смене эксперимента.
  const sig = trainerAbConfigSig();
  let group: TrainerAbGroup | null = null;
  const cached = await AsyncStorage.getItem(TRAINER_AB_CACHE_KEY).catch(() => null);
  if (cached) {
    const [cachedSig, cachedGroup] = cached.split('|');
    if (cachedSig === sig && (cachedGroup === 'A' || cachedGroup === 'B' || cachedGroup === 'C')) {
      group = cachedGroup;
    }
  }
  if (!group) {
    group = getTrainerAbGroup(userId);
    await AsyncStorage.setItem(TRAINER_AB_CACHE_KEY, `${sig}|${group}`).catch(() => {});
  }
  return trainerSessionsForGroup(group);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
