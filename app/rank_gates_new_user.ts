/**
 * Кто «новый» для ранговых гейтов Главной (координатор 30.10 по слову владельца: «Главная Free по рангам»).
 *
 * зачем: серверной проекции доступа в магазинной сборке нет, поэтому «новый» определяется локально и дёшево — аккаунт создан не раньше выхода
 * этой версии (Firebase Auth metadata.creationTime ≥ RANK_GATES_NEW_USERS_SINCE_MS), онбординг завершён после выхода (метка
 * onboarding_completed_at_ms_v1) И нет прежнего прогресса. Время создания аккаунта закрывает гонку с облачным восстановлением (владелец 04.11):
 * ветеран, входящий на втором устройстве в СТАРЫЙ аккаунт, «не новый» независимо от того, успел ли прогресс вернуться из облака.
 * Всё неопределённое (нет владельца, нет времени создания, ошибка чтения) = НЕ новый = всё открыто (старым ничего не отбираем; лучше открыть
 * лишнее, чем запереть своего), и такое решение НЕ фиксируется.
 * Лог: [RANK-GATE].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration } from './account_generation';
import { peekCurrentAccountCreatedAtMs } from './account_created_at';
import { ONBOARDING_COMPLETED_AT_KEY } from './fresh_install_gate';

/**
 * Момент выхода версии с ранговыми гейтами (мс). ЗАГЛУШКА: максимум = «никто не новый», гейты не работают, пока сборка не подставит
 * реальный момент релиза (координатор: «подставим при сборке»).
 */
export const RANK_GATES_NEW_USERS_SINCE_MS = Number.MAX_SAFE_INTEGER;

/** Признаки прежнего прогресса (как в ui_lang_migration): любой из них делает пользователя «старым». */
export const RANK_GATES_PRIOR_PROGRESS_KEYS = ['streak_count', 'user_total_xp'] as const;

/**
 * Липкая отметка когорты 'new' | 'old' — НА АККАУНТ (владелец 04.11): удаление аккаунта, выход и второй человек на том же телефоне не переносят чужое состояние.
 * Лежит в уже стираемом семействе `story_events_v1:` (app/cloud_sync WIPE_ONLY_ACCOUNT_KEY_PREFIXES) — стирается при выходе и удалении аккаунта.
 */
export const RANK_GATE_COHORT_KEY_PREFIX = 'story_events_v1:rank_cohort';
export const rankGateCohortKey = (owner: string): string => `${RANK_GATE_COHORT_KEY_PREFIX}:${owner}`;

export type RankGateUserVerdict = Readonly<{
  isNew: boolean;
  reason:
    | 'new' | 'no_timestamp' | 'before_release' | 'prior_progress' | 'clock_skew' | 'read_failed' | 'sticky_new' | 'sticky_old'
    | 'old_account' | 'account_age_unknown' | 'no_owner' | 'owner_changed';
}>;

/** Причины, при которых решение НЕ фиксируется (неизвестное не должно стать липким). */
const UNSTABLE_REASONS: ReadonlySet<RankGateUserVerdict['reason']> = new Set([
  'no_timestamp', 'clock_skew', 'read_failed', 'account_age_unknown', 'no_owner', 'owner_changed',
]);

const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Чистое правило. completedAtMs — метка онбординга (null = нет); priorProgress — есть ли прежний прогресс;
 * accountCreatedAtMs — время создания аккаунта Auth (null = неизвестно → не новый; undefined — правило не применяется, старый вызов).
 */
export function judgeRankGateUser(input: Readonly<{
  completedAtMs: number | null;
  priorProgress: boolean;
  nowMs: number;
  sinceMs?: number;
  accountCreatedAtMs?: number | null;
}>): RankGateUserVerdict {
  const since = input.sinceMs ?? RANK_GATES_NEW_USERS_SINCE_MS;
  const at = input.completedAtMs;
  if (at === null || !Number.isFinite(at) || at <= 0) return { isNew: false, reason: 'no_timestamp' };
  if (at > input.nowMs + CLOCK_SKEW_TOLERANCE_MS) return { isNew: false, reason: 'clock_skew' };
  if (at < since) return { isNew: false, reason: 'before_release' };
  if (input.accountCreatedAtMs !== undefined) {
    const created = input.accountCreatedAtMs;
    if (created === null || !Number.isFinite(created) || created <= 0) return { isNew: false, reason: 'account_age_unknown' };
    if (created < since) return { isNew: false, reason: 'old_account' };
  }
  if (input.priorProgress) return { isNew: false, reason: 'prior_progress' };
  return { isNew: true, reason: 'new' };
}

/** Владелец сейчас: активный аккаунт со stableId, иначе null. */
function activeOwner(): string | null {
  const token = captureAccountGeneration();
  return token.phase === 'active' && token.stableId ? token.stableId : null;
}

/** Читает локальные метки (один раз за запуск — результат кэшируется вызывающим). */
export async function readRankGateUserVerdict(nowMs: number = Date.now(), sinceMs: number = RANK_GATES_NEW_USERS_SINCE_MS): Promise<RankGateUserVerdict> {
  try {
    const owner = activeOwner();
    if (!owner) {
      console.log('[RANK-GATE] verdict', JSON.stringify({ isNew: false, reason: 'no_owner' })); // guard-ok: ранний выход называет причину
      return { isNew: false, reason: 'no_owner' };
    }
    const cohortKey = rankGateCohortKey(owner);
    // зачем (владелец 30.10): новичок после первого занятия получает прогресс (серия/опыт) — без липкой отметки следующий запуск счёл бы его «старым» и
    // открыл всё. Решение «новый/старый» принимается один раз и хранится НА АККАУНТ (владелец 04.11).
    const stored = await AsyncStorage.getItem(cohortKey);
    if (activeOwner() !== owner) return { isNew: false, reason: 'owner_changed' };
    if (stored === 'new') return { isNew: true, reason: 'sticky_new' };
    if (stored === 'old') return { isNew: false, reason: 'sticky_old' };
    const keys = [ONBOARDING_COMPLETED_AT_KEY, ...RANK_GATES_PRIOR_PROGRESS_KEYS];
    const pairs = await AsyncStorage.multiGet(keys);
    if (activeOwner() !== owner) return { isNew: false, reason: 'owner_changed' };
    const map = new Map(pairs);
    const raw = Number(map.get(ONBOARDING_COMPLETED_AT_KEY));
    const priorProgress = RANK_GATES_PRIOR_PROGRESS_KEYS.some((k) => Number(map.get(k)) > 0);
    const accountCreatedAtMs = peekCurrentAccountCreatedAtMs();
    const verdict = judgeRankGateUser({ completedAtMs: Number.isFinite(raw) && raw > 0 ? raw : null, priorProgress, nowMs, sinceMs, accountCreatedAtMs });
    console.log('[RANK-GATE] verdict', JSON.stringify({ ...verdict, owner: `${owner.slice(0, 6)}…`, completedAtMs: raw > 0 ? raw : null, accountCreatedAtMs, priorProgress, sinceMs })); // guard-ok: итог решения
    // фиксируем только устойчивые решения: «новый» и «старый из-за прогресса/старого аккаунта/до релиза»; неизвестное (идёт онбординг, Auth ещё не загружен) — не фиксируем
    if (!UNSTABLE_REASONS.has(verdict.reason)) {
      await AsyncStorage.setItem(cohortKey, verdict.isNew ? 'new' : 'old').catch((error: unknown) => console.warn('[RANK-GATE] cohort_store_failed', error instanceof Error ? error.message : String(error)));
    }
    return verdict;
  } catch (error) {
    console.warn('[RANK-GATE] read_failed — считаем «не новый» (всё открыто)', error instanceof Error ? error.message : String(error));
    return { isNew: false, reason: 'read_failed' };
  }
}
