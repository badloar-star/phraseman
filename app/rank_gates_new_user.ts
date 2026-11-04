/**
 * Кто «новый» для ранговых гейтов Главной (координатор 30.10 по слову владельца: «Главная Free по рангам»).
 *
 * зачем: серверной проекции доступа в магазинной сборке нет, поэтому «новый» определяется локально и дёшево — онбординг завершён
 * ПОСЛЕ выхода этой версии (метка onboarding_completed_at_ms_v1 ≥ RANK_GATES_NEW_USERS_SINCE_MS) И нет прежнего прогресса.
 * Всё неопределённое = НЕ новый = всё открыто (старым ничего не отбираем; лучше открыть лишнее, чем запереть своего).
 * Лог: [RANK-GATE].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_COMPLETED_AT_KEY } from './fresh_install_gate';

/**
 * Момент выхода версии с ранговыми гейтами (мс). ЗАГЛУШКА: максимум = «никто не новый», гейты не работают, пока сборка не подставит
 * реальный момент релиза (координатор: «подставим при сборке»).
 */
export const RANK_GATES_NEW_USERS_SINCE_MS = Number.MAX_SAFE_INTEGER;

/** Признаки прежнего прогресса (как в ui_lang_migration): любой из них делает пользователя «старым». */
export const RANK_GATES_PRIOR_PROGRESS_KEYS = ['streak_count', 'user_total_xp'] as const;

export type RankGateUserVerdict = Readonly<{
  isNew: boolean;
  reason: 'new' | 'no_timestamp' | 'before_release' | 'prior_progress' | 'clock_skew' | 'read_failed';
}>;

const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

/** Чистое правило. completedAtMs — метка онбординга (null = нет); priorProgress — есть ли прежний прогресс. */
export function judgeRankGateUser(input: Readonly<{ completedAtMs: number | null; priorProgress: boolean; nowMs: number; sinceMs?: number }>): RankGateUserVerdict {
  const since = input.sinceMs ?? RANK_GATES_NEW_USERS_SINCE_MS;
  const at = input.completedAtMs;
  if (at === null || !Number.isFinite(at) || at <= 0) return { isNew: false, reason: 'no_timestamp' };
  if (at > input.nowMs + CLOCK_SKEW_TOLERANCE_MS) return { isNew: false, reason: 'clock_skew' };
  if (at < since) return { isNew: false, reason: 'before_release' };
  if (input.priorProgress) return { isNew: false, reason: 'prior_progress' };
  return { isNew: true, reason: 'new' };
}

/** Читает локальные метки (один раз за запуск — результат кэшируется вызывающим). */
export async function readRankGateUserVerdict(nowMs: number = Date.now()): Promise<RankGateUserVerdict> {
  try {
    const keys = [ONBOARDING_COMPLETED_AT_KEY, ...RANK_GATES_PRIOR_PROGRESS_KEYS];
    const pairs = await AsyncStorage.multiGet(keys);
    const map = new Map(pairs);
    const raw = Number(map.get(ONBOARDING_COMPLETED_AT_KEY));
    const priorProgress = RANK_GATES_PRIOR_PROGRESS_KEYS.some((k) => Number(map.get(k)) > 0);
    const verdict = judgeRankGateUser({ completedAtMs: Number.isFinite(raw) && raw > 0 ? raw : null, priorProgress, nowMs });
    console.log('[RANK-GATE] verdict', JSON.stringify({ ...verdict, completedAtMs: raw > 0 ? raw : null, priorProgress, sinceMs: RANK_GATES_NEW_USERS_SINCE_MS }));
    return verdict;
  } catch (error) {
    console.warn('[RANK-GATE] read_failed — считаем «не новый» (всё открыто)', error instanceof Error ? error.message : String(error));
    return { isNew: false, reason: 'read_failed' };
  }
}
