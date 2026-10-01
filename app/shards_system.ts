// ════════════════════════════════════════════════════════════════════════════
// shards_system.ts — Валюта "Осколки знаний" 💎
// Хранение: AsyncStorage 'shards_balance' + Firestore /users/{uid}/shards
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';
import { withStorageLock } from './storage_mutex';
import { getCanonicalUserId } from './user_id_policy';
import { emitAppEvent } from './events';
import { bumpLifetimeShardsEarned, bumpLifetimeShardsSpent } from './lifetime_profile_stats';
import {
  consumeExactLegacyQuarantinedShardDelta,
  enqueueAppliedShardDeltaWithStorage,
  hasExactLegacyQuarantinedShardDelta,
  hasQuarantinedShardDeltaQueue,
  newShardOpId,
  readShardDeltaQueue,
  removeShardDeltas,
  type LegacyShardDeltaRecoveryIdentity,
} from './shards_delta_queue';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  waitForActiveAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { SHARD_SPEND_OP_LEDGER_KEY } from '../constants/customization_storage_keys';
import {
  commitClientShardOperation,
  hasClientShardLedgerState,
  initializeClientShardLedgerOpeningBalance,
  isTerminalPreparedRecoveryReason,
  recoverPreparedClientShardOperation,
  type ClientShardGrant,
  type ClientShardLocalWrite,
  type CommitClientShardOperationResult,
} from './economy/client_shard_operation_ledger';

export type ShardSpendReason =
  | 'buy_energy'     // −N жемчужин, 1 = до 20 недостающей энергии
  | 'streak_freeze'  // -X Заморозка цепочки
  | 'streak_revive'  // -X Восстановление потерянной цепочки (≤24ч после обнуления)
  | 'wager_bet'      // -X Ставка в турнире
  | 'card_pack'      // -X Набор карточек за осколки
  | 'custom_avatar'
  | 'avatar_aura'
  | 'theme_purchase'  // -200 Тема оформления за жемчуг (подписка её не открывает)
  | 'custom_avatar_restyle'
  | 'quota_day_pass'     // -X Дневной пропуск: +N попыток сверх лимита обычного аккаунта (2026-09-13)
  | 'lesson_pearl_unlock' // -100 Открыть один урок курса навсегда, минуя прохождение (2026-09-17)
  | 'lesson_replay';     // legacy reason; lesson replay no longer spends shards

export type ShardSource =
  | 'lesson_first'          // +1 Первое прохождение урока
  | 'lesson_perfect'        // +2 Идеальный урок (0 ошибок)
  | 'lesson_quiz_passed'    // +1 Зачёт в уроке
  | 'lesson_completed'      // +1 Урок полностью завершён
  | 'streak_7'              // +3 Каждые 7 дней цепочки
  | 'streak_30'             // +5 Каждые 30 дней цепочки
  | 'topic_completed'       // +3 Все уроки темы (разово)
  | 'exam_excellent'        // +3 Экзамен 90%+ (единоразово)
  | 'diagnostic_test'       // +1 Диагностический тест (единоразово)
  | 'lessons_5_perfect'     // +3 5 уроков подряд без ошибок
  | 'preposition_drill_perfect' // +1 Идеальный проход тренажёра предлогов (разово на урок)
  | 'survey_completed';     // +1 Пройден опрос (сервер submitShardSurvey, идемпотентно).
                            // Сумма фиксирована на сервере (SURVEY_SHARD_AMOUNT = 1);
                            // rewardShards из конфига опроса на выплату НЕ влияет.
  // Награда за баг-репорт начисляется админом вручную при подтверждении (admin/index.html,
  // reason 'bug_fixed', shards += 1) — отдельного ShardSource в каталоге для неё нет.

/**
 * Экономика «Монеты и Звёзды» (docs/plans/2026-07-20-coins-stars-economy-plan.ru.md §7):
 * игровые начисления монет обнулены — учебная награда ушла в звёзды, монеты только
 * покупаются. Структура каталога и ShardSource сохранены: addShards() при amount <= 0
 * завершается no-op, вызывающие не меняются.
 *
 * PM-058 (владелец: «удалить выдачу жемчуга за любые действия»): исключение
 * survey_completed = 1 (решение владельца 2026-07-26) ОТМЕНЕНО. Сервер
 * (functions/src/shard_survey.ts, SURVEY_SHARD_AMOUNT) синхронно занулён —
 * клиентское значение обязано совпадать, иначе expectedReward в UI разойдётся
 * с фактической (нулевой) выплатой.
 *
 * Остальные источники по-прежнему нулевые. Подтверждённый баг-репорт (+1 монета)
 * начисляется админом вручную (admin/v2/legacy.html, reason 'bug_fixed') и в каталоге
 * не представлен.
 */
export const SHARD_REWARDS: Record<ShardSource, number> = {
  lesson_first: 0,
  lesson_perfect: 0,
  lesson_quiz_passed: 0,
  lesson_completed: 0,
  streak_7: 0,
  streak_30: 0,
  topic_completed: 0,
  exam_excellent: 0,
  diagnostic_test: 0,
  lessons_5_perfect: 0,
  preposition_drill_perfect: 0,
  survey_completed: 0,
};

const STORAGE_KEY = 'shards_balance';
const BALANCE_META_KEY = 'shards_balance_meta_v1';
const STORE_PURCHASED_SHARDS_KEY = 'shards_store_purchased_total_v1';
const ONE_TIME_KEY = 'shards_one_time_events';
const ADMIN_OVERRIDE_APPLIED_KEY = 'shards_admin_override_applied_at';

type ShardBalanceMeta = {
  updatedAtMs: number;
  op: 'earn' | 'spend' | 'replace' | 'admin';
  reason: string;
};

type ReplaceShardBalanceOptions = {
  updatedAtMs?: number | null;
  op?: ShardBalanceMeta['op'];
  reason?: string;
};

/** In-memory кэш для мгновенного UI без мигания 0 до AsyncStorage. */
let shardsBalanceMemory: { balance: number; ownerStableId: string } | null = null;
const setShardsBalanceMemory = (
  n: number,
  accountToken: AccountGenerationToken,
) => {
  if (
    !Number.isFinite(n)
    || n < 0
    || !accountToken.stableId
    || !isCurrentAccountGeneration(accountToken, accountToken.stableId)
  ) return;
  shardsBalanceMemory = {
    balance: Math.floor(n),
    ownerStableId: accountToken.stableId,
  };
};

const parseShardBalance = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
};

const parseUpdatedAtMs = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
};

const isStorePurchaseReason = (reason: string | null | undefined): boolean =>
  reason === 'shards_store_purchase';

const readStorePurchasedShardsTotal = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(STORE_PURCHASED_SHARDS_KEY);
    return parseShardBalance(raw) ?? 0;
  } catch {
    return 0;
  }
};

const bumpStorePurchasedShardsTotal = async (amount: number): Promise<number> => {
  const safe = Math.max(0, Math.floor(Number(amount) || 0));
  if (safe <= 0) return readStorePurchasedShardsTotal();
  try {
    const current = await readStorePurchasedShardsTotal();
    const next = current + safe;
    await AsyncStorage.setItem(STORE_PURCHASED_SHARDS_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
};

const consumeStorePurchasedShardsOnSpend = async (amount: number): Promise<number> => {
  const safe = Math.max(0, Math.floor(Number(amount) || 0));
  if (safe <= 0) return readStorePurchasedShardsTotal();
  try {
    const current = await readStorePurchasedShardsTotal();
    const next = Math.max(0, current - safe);
    await AsyncStorage.setItem(STORE_PURCHASED_SHARDS_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
};


// зачем: PM-183-A2 — бонус осколков за карточку IV+ удалён (бонусы яруса сняты, D07/PM-081):
// заглушки множителя/бонуса и список исключённых причин убраны. В payload грантов оставлен
// `perkBonus: 0` — форма запроса неизменна, чтобы повтор уже подготовленной операции
// не стал «конфликтом».

export const getShardAchievementEligibleBalance = async (balance?: number): Promise<number> => {
  const total = balance === undefined ? await getShardsBalance() : Math.max(0, Math.floor(Number(balance) || 0));
  const purchased = await readStorePurchasedShardsTotal();
  return Math.max(0, total - purchased);
};

const prepareShardsBalanceUpdatedPayload = async (balance: number, meta?: ShardBalanceMeta | null) => {
  const safeBalance = Math.max(0, Math.floor(Number(balance) || 0));
  return {
    balance: safeBalance,
    ...(meta ? { op: meta.op, reason: meta.reason } : {}),
    eligibleAchievementBalance: await getShardAchievementEligibleBalance(safeBalance),
  };
};

const emitShardsBalanceUpdated = async (balance: number, meta?: ShardBalanceMeta | null): Promise<void> => {
  emitAppEvent('shards_balance_updated', await prepareShardsBalanceUpdatedPayload(balance, meta));
};

const readBalanceMeta = async (): Promise<ShardBalanceMeta | null> => {
  try {
    const raw = await AsyncStorage.getItem(BALANCE_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ShardBalanceMeta>;
    const updatedAtMs = parseUpdatedAtMs(parsed.updatedAtMs);
    if (updatedAtMs === null) return null;
    const op = parsed.op === 'earn' || parsed.op === 'spend' || parsed.op === 'replace' || parsed.op === 'admin'
      ? parsed.op
      : 'replace';
    return {
      updatedAtMs,
      op,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'unknown',
    };
  } catch {
    return null;
  }
};

const localWriteStamp = (op: ShardBalanceMeta['op'], reason: string): ShardBalanceMeta => ({
  updatedAtMs: Date.now(),
  op,
  reason,
});

/**
 * Похоже ли локальное состояние баланса на «артефакт restore», а не на реальную
 * пользовательскую операцию? cloud_sync.ts при restoreFromCloud кладёт старое теневое
 * `progress.shards_balance` в локальный STORAGE_KEY, НЕ обновляя `shards_balance_meta_v1`.
 * Реальная свежая операция всегда помечена op:'earn'/'spend' — её ронять нельзя.
 * Артефакт restore/reconcile — это op:'replace'/'admin' либо полное отсутствие метки.
 * Используется в loadShardsFromCloud, чтобы отличить «локаль законно потрачена ниже
 * облака» (не трогаем) от «локаль занижена теневым restore» (авторитетное облако побеждает).
 */
const isLocalRestoreArtifact = (meta: ShardBalanceMeta | null): boolean => (
  meta === null || meta.op === 'replace' || meta.op === 'admin'
);

const normalizeShardBalanceOp = (value: unknown): ShardBalanceMeta['op'] => (
  value === 'earn' || value === 'spend' || value === 'admin' || value === 'replace'
    ? value
    : 'replace'
);

/**
 * Заполнить peek-память балансом, который стартовая гидратация уже прочитала с диска.
 *
 * зачем (владелец, 2026-08-24, «жемчужины на Главной ждут подгрузки»): peek-память
 * живёт только внутри JS-процесса, и на холодном старте она пуста — до первого
 * `getShardsBalance()` любой экран, читающий peek, честно получал `null` и рисовал 0.
 * Загрузчик снапшота в этот момент УЖЕ держит настоящее число в руках (ключ
 * `shards_balance` входит в его multiGet), но раньше никому его не отдавал.
 * Теперь отдаёт — второго похода на диск это не стоит.
 *
 * Значение проходит те же проверки владельца, что и обычная запись: чужую
 * генерацию аккаунта или мусор `setShardsBalanceMemory` отвергнет сам.
 */
export const primeShardsBalanceMemoryFromBoot = (
  balance: number,
  accountToken: AccountGenerationToken,
): void => {
  // Уже читали в этой сессии — свежая запись авторитетнее стартового снимка.
  if (shardsBalanceMemory) return;
  setShardsBalanceMemory(balance, accountToken);
};

/**
 * Самостоятельный прогрев баланса жемчужин из хранилища на старте.
 *
 * зачем (владелец, 27.08: «счётчик жемчужин не всегда держит снапшот, иногда
 * нули»): единственным прогревом до сих пор был вызов
 * `primeShardsBalanceMemoryFromBoot` ИЗНУТРИ `primeAppSnapshotFromStorage`, а та
 * висит в `Promise.race([startupLocalHydration, timeout(350ms)])` в _layout.tsx —
 * пачке из 15+ параллельных чтений диска. Если холодный I/O медленнее 350мс
 * (обычное дело на Android), гонка обрывается раньше, и первый кадр Главной
 * читает `peekLastKnownShardsBalance() -> null` -> рисует 0. Ровно та же ловушка,
 * что чинили у энергии (`energy_peek_cache.ts`) и рун (`runes_system.ts`), — то же
 * лекарство: чтение стартует САМО при импорте модуля, параллельно общей пачке,
 * но вне её таймаута.
 *
 * Лишнего похода на диск это почти не стоит: один `getItem` того же ключа, что уже
 * входит в общий `multiGet` загрузчика, и только на холодном старте — при повторном
 * вызове память уже заполнена и функция выходит сразу.
 */
let shardsBootPrimed = false;
export const primeShardsBalanceFromBootStorage = async (): Promise<void> => {
  if (shardsBootPrimed || shardsBalanceMemory) return;
  // Ключ `shards_balance` не зависит от владельца, но ЗАПИСАТЬ его в память можно
  // только под активным аккаунтом (setShardsBalanceMemory сам отвергнет чужую или
  // ещё не установленную генерацию). На первом тике импорта аккаунт всегда
  // `uninitialized` — поэтому ждём активации, иначе прогрев молча не сделает ничего.
  const token = await waitForActiveAccountGeneration();
  if (!token || shardsBootPrimed || shardsBalanceMemory) return;
  const stableId = token.stableId?.trim();
  if (!stableId || !isCurrentAccountGeneration(token, stableId)) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return; // Пусто на диске — пусть решает обычный getShardsBalance.
    const parsed = parseShardBalance(raw);
    if (parsed === null) return; // Битое значение чинит getShardsBalance, ноль не рисуем.
    if (shardsBootPrimed || shardsBalanceMemory) return;
    shardsBootPrimed = true;
    setShardsBalanceMemory(parsed, token);
  } catch (e) {
      // Хранилище недоступно — оставляем память пустой: экран отработает как раньше, // а не покажет выдуманное число.
      DebugLogger.error('shards_system:parsed', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

/** Последний известный баланс (после чтения/записи в этой сессии). null — ещё не читали с диска. */
export const peekLastKnownShardsBalance = (): number | null => {
  const accountToken = captureAccountGeneration();
  if (
    !shardsBalanceMemory
    || !accountToken.stableId
    || !isCurrentAccountGeneration(accountToken, accountToken.stableId)
    || shardsBalanceMemory.ownerStableId !== accountToken.stableId
  ) return null;
  return shardsBalanceMemory.balance;
};

// ── Получить баланс ────────────────────────────────────────────────────────
export const getShardsBalance = async (): Promise<number> => {
  const accountToken = captureAccountGeneration();
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
      return 0;
    }
    if (val === null) {
      setShardsBalanceMemory(0, accountToken);
      return 0;
    }
    const parsed = parseShardBalance(val);
    const n = parsed ?? 0;
    setShardsBalanceMemory(n, accountToken);
    return n;
  } catch {
    if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return 0;
    return peekLastKnownShardsBalance() ?? 0;
  }
};

/** Локальный баланс = значение с сервера (после Cloud Function, без client-side spend). */
export type AccountGenerationShardBalanceOutcome = 'applied' | 'already-newer' | 'stale-generation' | 'failed';

/**
 * Lock-free balance replacement for callers that already own the account-transition lock.
 * Never call this directly from an unscoped flow; use one of the exported wrappers below.
 */
const replaceShardsBalanceLocalWithOutcomeUnlocked = async (
  next: number,
  options?: ReplaceShardBalanceOptions,
  accountToken?: AccountGenerationToken,
): Promise<AccountGenerationShardBalanceOutcome> => {
  const operationAccountToken = accountToken ?? captureAccountGeneration();
  const n = Math.max(0, Math.floor(Number(next)));
  if (!Number.isFinite(n)) return 'failed';
  if (accountToken && !isCurrentAccountGeneration(accountToken)) return 'stale-generation';
  const serverUpdatedAtMs = parseUpdatedAtMs(options?.updatedAtMs);
  const meta: ShardBalanceMeta = {
    updatedAtMs: serverUpdatedAtMs ?? Date.now(),
    op: normalizeShardBalanceOp(options?.op),
    reason: typeof options?.reason === 'string' && options.reason.trim()
      ? options.reason.trim()
      : 'server_replace',
  };
  let storageOutcome: AccountGenerationShardBalanceOutcome;
  try {
    storageOutcome = await withStorageLock(async (): Promise<AccountGenerationShardBalanceOutcome> => {
      if (accountToken && !isCurrentAccountGeneration(accountToken)) return 'stale-generation';
      if (serverUpdatedAtMs !== null) {
        const currentMeta = await readBalanceMeta();
        if (accountToken && !isCurrentAccountGeneration(accountToken)) return 'stale-generation';
        if (currentMeta && currentMeta.updatedAtMs > serverUpdatedAtMs) return 'already-newer';
      }
      if (accountToken && !isCurrentAccountGeneration(accountToken)) return 'stale-generation';
      await persistLocalBalance(n, meta);
      if (accountToken && !isCurrentAccountGeneration(accountToken)) return 'stale-generation';
      return 'applied';
    });
  } catch {
    return 'failed';
  }
  if (storageOutcome !== 'applied') return storageOutcome;
  if (accountToken && !isCurrentAccountGeneration(accountToken)) return 'stale-generation';
  setShardsBalanceMemory(n, operationAccountToken);
  await emitShardsBalanceUpdated(n, meta);
  return accountToken && !isCurrentAccountGeneration(accountToken) ? 'stale-generation' : 'applied';
};

export const replaceShardsBalanceLocal = async (
  next: number,
  options?: ReplaceShardBalanceOptions,
): Promise<void> => {
  await withAccountTransitionLock(async () => {
    await replaceShardsBalanceLocalWithOutcomeUnlocked(next, options);
  });
};

/** Structured token-checked replacement for receipt journals that distinguish safe no-ops from failures. */
export const replaceShardsBalanceLocalWithOutcomeWhileAccountTransitionLocked = async (
  next: number,
  accountToken: AccountGenerationToken,
  options?: ReplaceShardBalanceOptions,
): Promise<AccountGenerationShardBalanceOutcome> => (
  replaceShardsBalanceLocalWithOutcomeUnlocked(next, options, accountToken)
);

/** Token-checked variant for code that already owns `withAccountTransitionLock`. */
export const replaceShardsBalanceLocalWhileAccountTransitionLocked = async (
  next: number,
  accountToken: AccountGenerationToken,
  options?: ReplaceShardBalanceOptions,
): Promise<boolean> => (
  await replaceShardsBalanceLocalWithOutcomeWhileAccountTransitionLocked(next, accountToken, options)
) === 'applied';

/** Account-scoped server reconciliation that cannot leave a stale generation in the shared wallet. */
export const replaceShardsBalanceForAccountGeneration = async (
  next: number,
  token: AccountGenerationToken,
  stableId: string,
  options?: ReplaceShardBalanceOptions,
): Promise<AccountGenerationShardBalanceOutcome> => withAccountTransitionLock(async () => {
  const n = Math.max(0, Math.floor(Number(next)));
  if (!Number.isFinite(n)) return 'failed';
  if (!isCurrentAccountGeneration(token, stableId)) return 'stale-generation';
  const serverUpdatedAtMs = parseUpdatedAtMs(options?.updatedAtMs);
  const meta: ShardBalanceMeta = {
    updatedAtMs: serverUpdatedAtMs ?? Date.now(),
    op: normalizeShardBalanceOp(options?.op),
    reason: typeof options?.reason === 'string' && options.reason.trim()
      ? options.reason.trim()
      : 'server_replace',
  };
  try {
    const preparedEvent = await prepareShardsBalanceUpdatedPayload(n, meta);
    if (!isCurrentAccountGeneration(token, stableId)) return 'stale-generation';
    const storageOutcome = await withStorageLock(async (): Promise<AccountGenerationShardBalanceOutcome> => {
      if (!isCurrentAccountGeneration(token, stableId)) return 'stale-generation';
      if (serverUpdatedAtMs !== null) {
        const currentMeta = await readBalanceMeta();
        if (!isCurrentAccountGeneration(token, stableId)) return 'stale-generation';
        if (currentMeta && currentMeta.updatedAtMs > serverUpdatedAtMs) return 'already-newer';
      }
      if (!isCurrentAccountGeneration(token, stableId)) return 'stale-generation';
      await persistLocalBalance(n, meta);
      return isCurrentAccountGeneration(token, stableId) ? 'applied' : 'stale-generation';
    });
    if (storageOutcome !== 'applied') return storageOutcome;
    if (!isCurrentAccountGeneration(token, stableId)) return 'stale-generation';
    // No await between the final generation check, shared memory commit, and event dispatch.
    setShardsBalanceMemory(n, token);
    emitAppEvent('shards_balance_updated', preparedEvent);
    return 'applied';
  } catch {
    return 'failed';
  }
});

const mirrorServerShardBalanceLocal = async (
  next: number,
  meta: ShardBalanceMeta,
  accountToken?: AccountGenerationToken,
  ownerStableId?: string,
): Promise<AccountGenerationShardBalanceOutcome> => {
  if (accountToken && ownerStableId) {
    return replaceShardsBalanceForAccountGeneration(next, accountToken, ownerStableId, {
      updatedAtMs: meta.updatedAtMs,
      op: meta.op,
      reason: meta.reason,
    });
  }
  await replaceShardsBalanceLocal(next, {
    updatedAtMs: meta.updatedAtMs,
    op: meta.op,
    reason: meta.reason,
  });
  return 'applied';
};

export const addShardsLocalOnlyForPendingServerClaim = async (
  amount: number,
  reason: string = 'pending_server_claim',
  accountToken: AccountGenerationToken,
  ownerStableId: string,
): Promise<number> => {
  const isCurrent = (): boolean =>
    isCurrentAccountGeneration(accountToken, ownerStableId);
  try {
    if (!isCurrent() || accountToken.stableId !== ownerStableId) return 0;
    const safe = Math.max(0, Math.floor(Number(amount) || 0));
    if (safe <= 0) return 0;
    const cleanReason = String(reason || '').trim() || 'pending_server_claim';
    let meta: ShardBalanceMeta = localWriteStamp('earn', cleanReason);
    const credited = await withAccountTransitionLock(async () => {
      if (!isCurrent()) return null;
      const newBalance = await withStorageLock(async () => {
        if (!isCurrent()) return null;
        const currentMeta = await readBalanceMeta();
        if (!isCurrent()) return null;
        meta = {
          updatedAtMs: Math.max(Date.now(), (currentMeta?.updatedAtMs ?? 0) + 1),
          op: 'earn',
          reason: cleanReason,
        };
        const current = await getShardsBalance();
        if (!isCurrent()) return null;
        const next = current + safe;
        await persistLocalBalance(next, meta);
        return isCurrent() ? next : null;
      });
      if (newBalance === null || !isCurrent()) return null;
      setShardsBalanceMemory(newBalance, accountToken);
      if (!isCurrent()) return null;
      await emitShardsBalanceUpdated(newBalance, meta);
      return isCurrent() ? safe : null;
    });
    if (credited === null || !isCurrent()) return 0;
    await bumpLifetimeShardsEarned(safe, accountToken);
    return isCurrent() ? credited : 0;
  } catch (error) {
    DebugLogger.error('shards_system.ts:addShardsLocalOnlyForPendingServerClaim', error, 'warning');
    return 0;
  }
};

export const keepShardsBalanceLocalAtLeast = async (
  minimumBalance: number,
  reason: string = 'local_merge',
  accountToken: AccountGenerationToken,
  ownerStableId: string,
): Promise<number> => {
  const isCurrent = (): boolean =>
    isCurrentAccountGeneration(accountToken, ownerStableId);
  try {
    if (!isCurrent() || accountToken.stableId !== ownerStableId) {
      return getShardsBalance().catch(() => 0);
    }
    const safeMinimum = Math.max(0, Math.floor(Number(minimumBalance) || 0));
    const cleanReason = String(reason || '').trim() || 'local_merge';
    let meta: ShardBalanceMeta = localWriteStamp('replace', cleanReason);
    const nextBalance = await withAccountTransitionLock(async () => {
      if (!isCurrent()) return null;
      const committedBalance = await withStorageLock(async () => {
        if (!isCurrent()) return null;
        const currentMeta = await readBalanceMeta();
        if (!isCurrent()) return null;
        meta = {
          updatedAtMs: Math.max(Date.now(), (currentMeta?.updatedAtMs ?? 0) + 1),
          op: 'replace',
          reason: cleanReason,
        };
        const current = await getShardsBalance();
        if (!isCurrent()) return null;
        const next = Math.max(current, safeMinimum);
        await persistLocalBalance(next, meta);
        return isCurrent() ? next : null;
      });
      if (committedBalance === null || !isCurrent()) return null;
      setShardsBalanceMemory(committedBalance, accountToken);
      await emitShardsBalanceUpdated(committedBalance, meta);
      return isCurrent() ? committedBalance : null;
    });
    if (nextBalance === null || !isCurrent()) return getShardsBalance().catch(() => 0);
    return nextBalance;
  } catch (error) {
    DebugLogger.error('shards_system.ts:keepShardsBalanceLocalAtLeast', error, 'warning');
    return getShardsBalance().catch(() => 0);
  }
};

// ── Лог транзакций в Firestore ────────────────────────────────────────────
const logShardTransaction = async (
  type: 'earn' | 'spend',
  amount: number,
  reason: string,
  balanceAfter: number,
  balanceBefore?: number,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const operationToken = accountToken ?? captureAccountGeneration();
    const ownerStableId = operationToken.stableId;
    if (!ownerStableId || !isCurrentAccountGeneration(operationToken, ownerStableId)) return;
    const uid = await getCanonicalUserId();
    if (uid !== ownerStableId || !isCurrentAccountGeneration(operationToken, ownerStableId)) return;
    const db = firestore();
    await db.collection('users').doc(uid).collection('shard_log').add({
      type,
      amount,
      reason,
      ...(typeof balanceBefore === 'number' ? { balanceBefore } : {}),
      balanceAfter,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    // зачем: под `if (__DEV__)` отказ записи журнала транзакций был невидим в
    // сторовой сборке — а это единственный след, по которому разбирают споры
    // «жемчужины пропали». Логи в catch остаются навсегда.
    DebugLogger.error('shards_system:shardLog', e instanceof Error ? e : new Error(String(e)), 'warning');
  }
};

export type AddShardOpts = Readonly<{
  /** Stable identity of this concrete reward occurrence. Required forever. */
  eventId: string;
  /** Claim/result writes committed before the immutable credit operation. */
  localWrites?: readonly ClientShardLocalWrite[];
  suppressEarnEvent?: boolean;
}>;

// Сколько ждём ответа Firestore при списании/начислении осколков, прежде чем
// считать облако недоступным. В регионах с заблокированным Firebase транзакция
// без таймаута висит бесконечно и держит покупку в состоянии «Подождите…».
// По истечении срока трактуем как 'unavailable' (НЕ 'insufficient') — вызывающий
// уходит в локальную ветку: списывает локально и до-синхронизирует в фоне.
const SHARD_CLOUD_TX_TIMEOUT_MS = 6000;

const SHARD_CLOUD_TIMEOUT_SIGNAL = Symbol('shard_cloud_timeout');

const runWithTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(SHARD_CLOUD_TIMEOUT_SIGNAL), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

type ShardsApplyDeltaResponse = {
  ok: boolean;
  alreadyApplied: boolean;
  insufficient: boolean;
  balance: number;
  shardsUpdatedAtMs?: number | null;
};

// K3: единственная точка серверной записи баланса — callable shardsApplyDelta
// (runTransaction под Admin SDK, обходит hasNoShardWrites; идемпотентность по
// opId). Заменяет прежний нетранзакционный read-modify-write, который терял
// дельту при гонке двух устройств (TOCTOU) и вдобавок писал `shards` напрямую —
// а это заблокировано firestore.rules, т.е. запись всегда падала латентно.
const callShardsApplyDelta = async (
  opId: string,
  delta: number,
  type: 'earn' | 'spend',
  reason: string,
  ownerStableId: string,
): Promise<ShardsApplyDeltaResponse> => {
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions') as {
    getFunctions: (...args: unknown[]) => unknown;
    httpsCallable: (
      fns: unknown,
      name: string,
    ) => (data: unknown) => Promise<{ data: ShardsApplyDeltaResponse }>;
  };
  const { getApp } = require('@react-native-firebase/app') as { getApp: () => unknown };
  const cfCall = httpsCallable(getFunctions(getApp(), 'us-central1'), 'shardsApplyDelta');
  const cfResult = await cfCall({ opId, delta, type, reason, ownerStableId });
  return cfResult.data;
};

/**
 * Атомарно применить дельту осколков на сервере (earn: delta>0, spend: delta<0).
 * opId делает вызов идемпотентным — повтор (ретрай/офлайн-очередь) с тем же opId
 * не удвоит дельту.
 *
 * Совместимо по форме результата с прежним applyShardDeltaToCloud, поэтому все
 * вызывающие (addShards / addShardsRaw / spendShards) не менялись: 'unavailable'
 * уводит в локальную оптимистичную ветку (+ enqueue для последующей сверки),
 * 'insufficient' сверяет локаль с облаком.
 */
const applyShardDeltaToCloud = async (
  delta: number,
  type: 'earn' | 'spend',
  reason: string,
  _localFallbackBase: number,
  _localBaseMeta?: ShardBalanceMeta | null,
  accountToken?: AccountGenerationToken,
  opIdOverride?: string,
  legacyRecoveryIdentity?: LegacyShardDeltaRecoveryIdentity,
): Promise<
  | { ok: true; balance: number; balanceBefore: number; updatedAtMs: number; opId: string; alreadyApplied: boolean }
  | { ok: false; reason: 'unavailable'; opId: string }
  | { ok: false; reason: 'stale-generation'; opId: string }
  | { ok: false; reason: 'insufficient'; cloudBalance: number; opId: string }
> => {
  const opId = opIdOverride ?? newShardOpId();
  const operationToken = accountToken ?? captureAccountGeneration();
  const ownerStableId = operationToken.stableId;
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { ok: false, reason: 'unavailable', opId };
    if (!ownerStableId || !isCurrentAccountGeneration(operationToken, ownerStableId)) {
      return { ok: false, reason: 'stale-generation', opId };
    }
    const exactCustomizationRecovery = legacyRecoveryIdentity !== undefined
      && type === 'spend'
      && opIdOverride === opId
      && /^[A-Za-z0-9_:-]{8,80}$/.test(opId)
      && (
        reason === 'custom_avatar'
        || reason === 'custom_avatar_restyle'
        || reason === 'avatar_aura'
      );
    if (await hasQuarantinedShardDeltaQueue(ownerStableId)) {
      if (
        !exactCustomizationRecovery
        || !await hasExactLegacyQuarantinedShardDelta(
          ownerStableId,
          legacyRecoveryIdentity!,
        )
      ) return { ok: false, reason: 'unavailable', opId };
    }
    if (!isCurrentAccountGeneration(operationToken, ownerStableId)) {
      return { ok: false, reason: 'stale-generation', opId };
    }
    const uid = await getCanonicalUserId();
    if (!isCurrentAccountGeneration(operationToken, ownerStableId) || uid !== ownerStableId) {
      return { ok: false, reason: 'stale-generation', opId };
    }
    if (
      legacyRecoveryIdentity
      && !await hasExactLegacyQuarantinedShardDelta(
        ownerStableId,
        legacyRecoveryIdentity,
      )
    ) return { ok: false, reason: 'unavailable', opId };
    // delta приходит со знаком (spend отрицательна). Callable принимает величину +
    // type, знак ставит сервер сам.
    const magnitude = Math.abs(Math.trunc(delta));
    if (magnitude <= 0) return { ok: false, reason: 'unavailable', opId };
    const data = await runWithTimeout(
      callShardsApplyDelta(opId, magnitude, type, reason, ownerStableId),
      SHARD_CLOUD_TX_TIMEOUT_MS,
    );
    if (!isCurrentAccountGeneration(operationToken, ownerStableId)) {
      return { ok: false, reason: 'stale-generation', opId };
    }
    if (data.insufficient) {
      return { ok: false, reason: 'insufficient', cloudBalance: Math.max(0, Math.floor(Number(data.balance) || 0)), opId };
    }
    if (!data.ok) return { ok: false, reason: 'unavailable', opId };
    const balance = Math.max(0, Math.floor(Number(data.balance) || 0));
    const updatedAtMs = parseUpdatedAtMs(data.shardsUpdatedAtMs) ?? Date.now();
    const balanceBefore = data.alreadyApplied ? balance : balance - delta;
    return { ok: true, balance, balanceBefore, updatedAtMs, opId, alreadyApplied: data.alreadyApplied };
  } catch {
    return { ok: false, reason: 'unavailable', opId };
  }
};

const persistLocalBalance = async (
  balance: number,
  meta: ShardBalanceMeta,
): Promise<void> => {
  await AsyncStorage.multiSet([
    [STORAGE_KEY, String(balance)],
    [BALANCE_META_KEY, JSON.stringify(meta)],
  ]);
};

const SHARD_SPEND_OP_LEDGER_LIMIT = 128;
const SHARD_EARN_OP_LEDGER_KEY = 'shards_earn_op_ledger_v1';
const SHARD_EARN_OP_LEDGER_LIMIT = 128;

const readShardSpendOpLedger = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(SHARD_SPEND_OP_LEDGER_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];
  } catch {
    return [];
  }
};

const appendShardSpendOp = (ledger: readonly string[], opId: string): string[] =>
  [...ledger.filter((value) => value !== opId), opId].slice(-SHARD_SPEND_OP_LEDGER_LIMIT);

const readShardEarnOpLedger = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(SHARD_EARN_OP_LEDGER_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];
  } catch {
    return [];
  }
};

const appendShardEarnOp = (ledger: readonly string[], opId: string): string[] =>
  [...ledger.filter((value) => value !== opId), opId].slice(-SHARD_EARN_OP_LEDGER_LIMIT);

// Functions rather than compile-time constants keep the retired forensic body
// type-checkable while guaranteeing the new runtime boundary.
const clientEconomyConstitutionEnabled = (): boolean => true;

// зачем (PM-289 этап 2б, D70/D78): начисления, траты, разовые награды и серия 7/30
// жемчуга удалены; остаток модуля сокращается следующим коммитом.

// ── Синхронизация с Firestore ─────────────────────────────────────────────
/**
 * Раньше зеркалила локальный баланс в users/{uid}.shards. Больше НЕ пишет.
 *
 * зачем (владелец 2026-09-02): поле `shards` в корне users закрыто правилом
 * hasNoShardWrites БЕЗУСЛОВНО — исключения нет даже для админского токена, это
 * сделано намеренно («звезда — общая валюта приложения, а не локальный
 * счётчик»). То есть запись падала с permission-denied ВСЕГДА, а немой catch
 * под `__DEV__` прятал это в сторовой сборке полностью.
 *
 * Баланс при этом не терялся и не теряется: авторитетный кошелёк давно живёт в
 * личном журнале (client_economy_*, см. readPersonalEconomyProjection на
 * сервере), локальная запись и журнал идут ДО этого вызова, а legacy-поле
 * читается ровно один раз при заведении журнала — там прямо записано
 * «One-way migration only: Firestore is passive storage».
 *
 * Чтение legacy-поля СОЗНАТЕЛЬНО оставлено нетронутым: на нём держится перенос
 * баланса старых аккаунтов при первой миграции.
 *
 * Заодно снят лишний `userRef.get()` перед обречённой записью — он стоил одно
 * чтение Firestore на КАЖДОЕ начисление жемчужин и ничего не решал.
 */
const syncShardsToCloud = async (
  _balance: number,
  _meta?: ShardBalanceMeta | null,
  _accountToken?: AccountGenerationToken,
  _expectedStableId?: string,
): Promise<void> => {
  // Осознанный no-op. Оставлен вызываемым, чтобы не переписывать десяток точек
  // начисления: авторитет кошелька — журнал, а не документ users.
};

/**
 * Привести облако и локал к согласованному состоянию перед локальной
 * атомарной операцией, чтобы журнал видел актуальный баланс, а не отставший.
 *
 * Раньше эта функция СОЗНАТЕЛЬНО ставила свежий `Date.now()` и перетирала облачный
 * баланс локальным «гарантированно». Проблема: если CF (ежедневки/подарки)
 * только что начислила осколки на сервер, локальный устаревший баланс их затирал —
 * пользователь терял реально начисленные монеты, а потом видел «недостаточно
 * осколков» при покупке (см. аудит 2026-06-27).
 *
 * Правильный путь — двухсторонняя сверка:
 *   1) `loadShardsFromCloud()` — корректно мержит (сервер новее → перезаписывает
 *      локал; локал новее → пушит в облако), уже умеет priority-merge.
 *   2) После merge запись с РЕАЛЬНОЙ меткой из `readBalanceMeta`: если облако и
 *      так свежее, guard `cloudUpdatedAt > effectiveMeta.updatedAtMs` корректно
 *      пропустит лишний write. Если локал новее — нормально перезапишет.
 *
 * Best-effort: ошибка не пробрасывается.
 */
export const forceSyncShardsToCloud = async (): Promise<void> => {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const { syncClientShardOperationJournalToCloud } = await import(
      './economy/client_shard_operation_sync'
    );
    await syncClientShardOperationJournalToCloud();
  } catch (e) {
    if (__DEV__) console.warn('[shards_system] forceSyncShardsToCloud', e);
  }
};

// ── K3: проиграть офлайн-очередь дельт осколков ────────────────────────────
// Каждую неотправленную дельту повторяем через идемпотентный callable
// shardsApplyDelta (тот же opId → сервер не удвоит). Успешно подтверждённые
// (или уже применённые) убираем из очереди и зеркалим серверный баланс локально.
// Вызывается при старте (cloud_sync boot) и после skipServerAwait-операций.
const scopedShardReplayInFlight = new Map<
  string,
  Promise<{ resolved: number; pending: number }>
>();

/**
 * Отказы, которые повтором НЕ лечатся: сервер отверг саму операцию, а не связь.
 * зачем: незавершённых покупок быть не должно. Раньше любой отказ считался
 * временным, поэтому перманентно отклонённая строка навсегда вставала в голове
 * очереди и блокировала все записи за собой — покупка висела «незавершённой»
 * вечно и запирала выход из аккаунта. Такую строку снимаем с очереди: локально
 * она уже применена, а сверка баланса ниже подтянет облачное значение.
 * 'unauthenticated' и 'unavailable' сюда НЕ входят — это чинится повтором.
 */
const PERMANENT_SHARD_DELTA_REJECTIONS = new Set([
  'permission-denied',
  'invalid-argument',
  'failed-precondition',
  'not-found',
]);

/**
 * Прочитать авторитетный облачный баланс для сверки после перманентного отказа.
 * зачем: обычный loadShardsFromCloud берёт облако только если оно НОВЕЕ локальной
 * метки, а наша оптимистичная запись всегда свежее — поэтому он бы не исправил
 * заниженный локальный баланс. Здесь нужен именно факт «сервер списание не
 * принял», поэтому читаем значение напрямую. Одно чтение документа и только
 * когда отказ реально случился — на обычном пути расхода нет.
 */
const readCloudShardBalanceForReconcile = async (
  ownerStableId: string,
): Promise<number | null> => {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
    const uid = await getCanonicalUserId().catch(() => null);
    if (uid !== ownerStableId) return null;
    const snap = await runWithTimeout(
      firestore().collection('users').doc(ownerStableId).get(),
      SHARD_CLOUD_TX_TIMEOUT_MS,
    );
    if (!snap.exists) return null;
    return parseShardBalance(snap.data()?.shards);
  } catch {
    return null;
  }
};

const isPermanentShardDeltaRejection = (error: unknown): boolean => {
  const code = String(
    (error as { code?: unknown })?.code ?? '',
  ).replace(/^functions\//, '');
  return PERMANENT_SHARD_DELTA_REJECTIONS.has(code);
};

export const resumePendingShardDeltas = async (): Promise<{ resolved: number; pending: number }> => {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId;
  if (
    IS_EXPO_GO
    || !CLOUD_SYNC_ENABLED
    || !ownerStableId
    || !isCurrentAccountGeneration(accountToken, ownerStableId)
  ) {
    return { resolved: 0, pending: 0 };
  }
  const replayKey = `${accountToken.generation}:${ownerStableId}`;
  const existing = scopedShardReplayInFlight.get(replayKey);
  if (existing) return existing;
  const isCurrent = (): boolean => isCurrentAccountGeneration(accountToken, ownerStableId);

  const replay = (async (): Promise<{ resolved: number; pending: number }> => {
    let queueLength = 0;
    try {
      const queue = await readShardDeltaQueue(ownerStableId);
      queueLength = queue.length;
      if (!isCurrent()) return { resolved: 0, pending: queue.length };
      if (clientEconomyConstitutionEnabled()) {
        // Retired server-authoritative rows were already applied locally.
        // A retry or cloud balance read could only overwrite valid user state.
        if (queue.length === 0) return { resolved: 0, pending: 0 };
        const removed = await removeShardDeltas(ownerStableId, queue.map((entry) => entry.opId));
        return removed
          ? { resolved: queue.length, pending: 0 }
          : { resolved: 0, pending: queue.length };
      }
      // зачем: незавершённых покупок быть не должно. Раньше досылка целиком
      // глохла при любом карантине — а карантин относится к ДРУГОМУ, отдельно
      // отложенному хранилищу и никак не делает записи текущей очереди
      // невалидными. Получался замкнутый круг: карантин выключал досылку,
      // из-за чего живые списания висели «незавершёнными» вечно и запирали
      // выход из аккаунта. Читаемая очередь проигрывается всегда; сами
      // карантинные строки по-прежнему не трогаем — их разбирает recovery.
      if (!isCurrent() || queue.length === 0) {
        return { resolved: 0, pending: isCurrent() ? 0 : queue.length };
      }
      // зачем: досылка осколков больше не ждёт App Check (снят навсегда, 2026-08-17).
      if (!isCurrent()) return { resolved: 0, pending: queue.length };
      const uid = await getCanonicalUserId().catch(() => null);
      if (!isCurrent() || uid !== ownerStableId) return { resolved: 0, pending: queue.length };
      const localSnapshot = await getShardsBalance();
      if (!isCurrent()) return { resolved: 0, pending: queue.length };

      const confirmed: string[] = [];
      let latestBalance: number | null = null;
      let droppedPermanently = false;
      let pendingStartIndex = queue.length;
      for (let index = 0; index < queue.length; index += 1) {
        const entry = queue[index];
        if (!isCurrent()) return { resolved: 0, pending: queue.length };
        if (entry.localApplied !== true) {
          pendingStartIndex = index;
          break;
        }
        try {
          const data = await runWithTimeout(
            callShardsApplyDelta(
              entry.opId,
              entry.delta,
              entry.type,
              entry.reason,
              ownerStableId,
            ),
            SHARD_CLOUD_TX_TIMEOUT_MS,
          );
          if (!isCurrent()) return { resolved: 0, pending: queue.length };
          if (data.ok || data.insufficient) {
            confirmed.push(entry.opId);
            latestBalance = Math.max(0, Math.floor(Number(data.balance) || 0));
          } else {
            pendingStartIndex = index;
            break;
          }
        } catch (error) {
          if (!isCurrent()) return { resolved: 0, pending: queue.length };
          if (isPermanentShardDeltaRejection(error)) {
            // Повтор ничего не изменит — снимаем строку, чтобы она не держала
            // очередь и не висела незавершённой покупкой. Пишем в лог: это
            // расхождение локального и облачного баланса, его надо видеть.
            DebugLogger.error(
              'shards_system.ts:resumePendingShardDeltas:permanent_rejection',
              error,
              'warning',
            );
            confirmed.push(entry.opId);
            droppedPermanently = true;
            continue;
          }
          pendingStartIndex = index;
          break;
        }
      }
      const pendingEntries = queue.slice(pendingStartIndex);

      if (!isCurrent()) return { resolved: 0, pending: queue.length };
      if (confirmed.length > 0) {
        const removed = await removeShardDeltas(ownerStableId, confirmed);
        if (!isCurrent()) return { resolved: 0, pending: queue.length };
        if (!removed) return { resolved: 0, pending: queue.length };
      }

      // зачем: перманентно отклонённая строка означает, что локально осколки
      // уже списаны оптимистично, а облако эту операцию не приняло. Без сверки
      // юзер остался бы с заниженным балансом — то есть просто потерял бы
      // жемчужины. Сервер здесь авторитетен, поэтому берём его значение.
      if (latestBalance === null && droppedPermanently) {
        latestBalance = await readCloudShardBalanceForReconcile(ownerStableId);
        if (!isCurrent()) return { resolved: 0, pending: pendingEntries.length };
      }

      if (latestBalance !== null) {
        const pendingOptimisticDelta = pendingEntries.reduce(
          (sum, entry) => entry.localApplied === true
            ? sum + (entry.type === 'earn' ? entry.delta : -entry.delta)
            : sum,
          0,
        );
        const targetBalance = Math.max(0, latestBalance + pendingOptimisticDelta);
        const correction = targetBalance - localSnapshot;
        if (correction !== 0) {
          const meta: ShardBalanceMeta = {
            updatedAtMs: Date.now(),
            op: 'replace',
            reason: 'shard_delta_queue_reconcile',
          };
          const reconciled = await withAccountTransitionLock(async () => {
            if (!isCurrent()) return null;
            const current = await getShardsBalance();
            if (!isCurrent()) return null;
            const next = Math.max(0, current + correction);
            await persistLocalBalance(next, meta);
            if (!isCurrent()) return null;
            return next;
          }).catch(() => null);
          if (!isCurrent()) return { resolved: 0, pending: queue.length };
          if (reconciled !== null) {
            setShardsBalanceMemory(reconciled, accountToken);
            await emitShardsBalanceUpdated(reconciled, meta);
            if (!isCurrent()) return { resolved: 0, pending: queue.length };
          }
        }
      }
      return { resolved: confirmed.length, pending: pendingEntries.length };
    } catch (error) {
      DebugLogger.error('shards_system.ts:resumePendingShardDeltas', error, 'warning');
      return { resolved: 0, pending: queueLength };
    } finally {
      scopedShardReplayInFlight.delete(replayKey);
    }
  })();
  scopedShardReplayInFlight.set(replayKey, replay);
  return replay;
};

export const preparePendingShardDeltasForAccountSwitch = async (): Promise<{
  resolved: number;
  pending: number;
  pendingEarn: number;
  pendingSpend: number;
  ownerStableId: string | null;
  stale: boolean;
}> => {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId;
  if (!ownerStableId || !isCurrentAccountGeneration(accountToken, ownerStableId)) {
    return {
      resolved: 0,
      pending: 0,
      pendingEarn: 0,
      pendingSpend: 0,
      ownerStableId,
      stale: true,
    };
  }
  const replay = await resumePendingShardDeltas();
  if (!isCurrentAccountGeneration(accountToken, ownerStableId)) {
    return {
      resolved: 0,
      pending: replay.pending,
      pendingEarn: 0,
      pendingSpend: 0,
      ownerStableId,
      stale: true,
    };
  }
  const remaining = await readShardDeltaQueue(ownerStableId);
  if (!isCurrentAccountGeneration(accountToken, ownerStableId)) {
    return {
      resolved: 0,
      pending: remaining.length,
      pendingEarn: 0,
      pendingSpend: 0,
      ownerStableId,
      stale: true,
    };
  }
  return {
    resolved: replay.resolved,
    pending: remaining.length,
    pendingEarn: remaining.filter((entry) => entry.type === 'earn').length,
    pendingSpend: remaining.filter((entry) => entry.type === 'spend').length,
    ownerStableId,
    stale: false,
  };
};

// ── Загрузить осколки из облака (при первом входе / смене устройства) ─────
export const loadShardsFromCloud = async (isCallerCurrent: () => boolean = () => true): Promise<void> => {
  const accountToken = captureAccountGeneration();
  let expectedOwnerStableId = '';
  const isCurrent = (): boolean => isCallerCurrent()
    && (!expectedOwnerStableId
      || (accountToken.stableId === expectedOwnerStableId
        && isCurrentAccountGeneration(accountToken, expectedOwnerStableId)));
  try {
    const uid = await getCanonicalUserId();
    expectedOwnerStableId = String(uid ?? '').trim();
    if (!isCurrent()) return;
    if (!uid) return;
    const recovered = await recoverPreparedClientShardOperation();
    if (!isCurrent() || recovered?.status === 'failed') return;
    if (await hasClientShardLedgerState(uid)) {
      // Once migrated, neither a cloud timestamp nor a server balance may
      // overwrite the client journal projection. Cloud is storage only.
      // зачем (PM-289, D70): внешние события жемчуга (турниры, покупки) больше
      // не подтягиваются — жемчуг удалён без компенсации, а чтение коллекции
      // external_economy_events стоило Firestore-чтений на каждом входе.
      const local = await getShardsBalance();
      if (!isCurrent()) return;
      setShardsBalanceMemory(local, accountToken);
      void import('./economy/client_shard_operation_sync')
        .then(({ syncClientShardOperationJournalToCloud }) => syncClientShardOperationJournalToCloud())
        .catch(() => {});
      return;
    }
    if (clientEconomyConstitutionEnabled()) {
      let openingOverride: number | undefined;
      if (!IS_EXPO_GO && CLOUD_SYNC_ENABLED) {
        const db = firestore();
        const [legacySnap, openingSnap] = await Promise.all([
          db.collection('users').doc(uid).get().catch(() => null),
          db.collection('users').doc(uid).collection('client_economy_opening').doc('v1').get().catch(() => null),
        ]);
        if (!isCurrent()) return;
        const immutableOpening = openingSnap?.exists
          ? parseShardBalance(openingSnap.data?.()?.openingBalance)
          : null;
        const legacyStoredCandidate = legacySnap?.exists
          ? parseShardBalance(legacySnap.data?.()?.shards)
          : null;
        const localCandidate = await getShardsBalance();
        if (!isCurrent()) return;
        // One-way migration only: Firestore is passive storage. The client
        // chooses the user-favouring opening and freezes it in journal v1.
        openingOverride = immutableOpening
          ?? Math.max(localCandidate, legacyStoredCandidate ?? 0);
      }
      await initializeClientShardLedgerOpeningBalance(openingOverride, uid);
      if (!isCurrent()) return;
      void import('./economy/client_shard_operation_sync')
        .then(({ syncClientShardOperationJournalToCloud }) => syncClientShardOperationJournalToCloud())
        .catch(() => {});
      return;
    }
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
      await initializeClientShardLedgerOpeningBalance(undefined, uid);
      return;
    }
    const db = firestore();
    const [snap, openingSnap] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('users').doc(uid).collection('client_economy_opening').doc('v1').get(),
    ]);
    if (!isCurrent()) return;
    const data = snap.data?.() ?? {};
    const openingData = openingSnap.exists ? openingSnap.data?.() : undefined;
    const cloudRaw = Number.isSafeInteger(openingData?.openingBalance)
      ? openingData?.openingBalance
      : data.shards;
    const cloudShards = parseShardBalance(cloudRaw);
    if (cloudShards === null) return;
    const cloudUpdatedAt = parseUpdatedAtMs(data.shards_updated_at_ms);
    const cloudOverrideAt: string | null = data.shards_admin_override_at ?? null;
    const local = await getShardsBalance();
    if (!isCurrent()) return;
    const localMeta = await readBalanceMeta();
    if (!isCurrent()) return;
    const appliedOverrideAt = await AsyncStorage.getItem(ADMIN_OVERRIDE_APPLIED_KEY);
    if (!isCurrent()) return;
    let changed = false;
    let appliedMeta: ShardBalanceMeta | null = null;
    // Admin override has priority: force local balance to cloud value once per override marker.
    if (cloudOverrideAt && cloudOverrideAt !== appliedOverrideAt) {
      const meta = localWriteStamp('admin', 'admin_override');
      if (!isCurrent()) return;
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(cloudShards)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
        [ADMIN_OVERRIDE_APPLIED_KEY, cloudOverrideAt],
      ]);
      if (!isCurrent()) return;
      setShardsBalanceMemory(cloudShards, accountToken);
      changed = true;
      appliedMeta = meta;
    } else if (
      cloudUpdatedAt !== null && (!localMeta || cloudUpdatedAt >= localMeta.updatedAtMs)
    ) {
      // Cloud wins only when it is newer than the local shard operation.
      const meta: ShardBalanceMeta = {
        updatedAtMs: cloudUpdatedAt ?? Date.now(),
        op: data.shards_updated_op === 'earn' || data.shards_updated_op === 'spend' ? data.shards_updated_op : 'replace',
        reason: typeof data.shards_updated_reason === 'string' ? data.shards_updated_reason : 'cloud_restore',
      };
      if (!isCurrent()) return;
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(cloudShards)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
      ]);
      if (!isCurrent()) return;
      setShardsBalanceMemory(cloudShards, accountToken);
      if (isStorePurchaseReason(meta.reason) && cloudShards > local) {
        if (!isCurrent()) return;
        await bumpStorePurchasedShardsTotal(cloudShards - local);
      }
      changed = true;
      appliedMeta = meta;
    } else if (isLocalRestoreArtifact(localMeta) && cloudShards > local) {
      // Authoritative-cloud-wins (fix: пропажа осколков после restore/обновления).
      // `users/{uid}.shards` (канал A) — append-safe авторитет: каждый earn/spend идёт
      // через него с монотонной меткой. Второй, теневой канал — `progress.shards_balance`
      // из cloud_sync.ts — переносится БЕЗ метки и при restoreFromCloud слепо кладёт
      // СТАРОЕ число в локальный STORAGE_KEY ДО вызова loadShardsFromCloud, НЕ трогая
      // `shards_balance_meta_v1`. Локальная метка остаётся от прошлой операции и может
      // оказаться «новее» облачной → timestamp-guard выше не срабатывает, и заниженное
      // после-restore число закрепляется (660→498, 516→500, 540→501 — по shard_log).
      // Ключевой разделитель: настоящая свежая локальная трата помечена op:'spend'/'earn'
      // (её ронять нельзя — тест «older cloud over newer local spend»). Артефакт restore —
      // это op:'replace'/'admin' ЛИБО отсутствие метки. Только в этом случае, если
      // авторитетный облачный баланс СТРОГО БОЛЬШЕ, восстанавливаем его: терять
      // заработанные осколки при простом чтении из облака нельзя.
      const meta: ShardBalanceMeta = {
        updatedAtMs: Math.max(cloudUpdatedAt ?? 0, localMeta?.updatedAtMs ?? 0) + 1,
        op: data.shards_updated_op === 'earn' || data.shards_updated_op === 'spend' ? data.shards_updated_op : 'replace',
        reason: typeof data.shards_updated_reason === 'string' ? data.shards_updated_reason : 'cloud_restore',
      };
      if (!isCurrent()) return;
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(cloudShards)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
      ]);
      if (!isCurrent()) return;
      setShardsBalanceMemory(cloudShards, accountToken);
      if (isStorePurchaseReason(meta.reason) && cloudShards > local) {
        if (!isCurrent()) return;
        await bumpStorePurchasedShardsTotal(cloudShards - local);
      }
      changed = true;
      appliedMeta = meta;
    } else if (
      cloudUpdatedAt === null && !localMeta && cloudShards > local
    ) {
      // Ни у облака, ни у локали нет метки, но облако выше — безопасно поднять локаль.
      const meta: ShardBalanceMeta = {
        updatedAtMs: Date.now(),
        op: data.shards_updated_op === 'earn' || data.shards_updated_op === 'spend' ? data.shards_updated_op : 'replace',
        reason: typeof data.shards_updated_reason === 'string' ? data.shards_updated_reason : 'cloud_restore',
      };
      if (!isCurrent()) return;
      await AsyncStorage.multiSet([
        [STORAGE_KEY, String(cloudShards)],
        [BALANCE_META_KEY, JSON.stringify(meta)],
      ]);
      if (!isCurrent()) return;
      setShardsBalanceMemory(cloudShards, accountToken);
      if (isStorePurchaseReason(meta.reason) && cloudShards > local) {
        if (!isCurrent()) return;
        await bumpStorePurchasedShardsTotal(cloudShards - local);
      }
      changed = true;
      appliedMeta = meta;
    } else if (
      localMeta
      && (cloudUpdatedAt === null || localMeta.updatedAtMs > cloudUpdatedAt)
      // Не проталкивать в облако локаль, которая НИЖЕ авторитетного облачного баланса,
      // когда локаль — артефакт restore (op:'replace'/'admin'). Именно эта ветка раньше
      // закрепляла просадку: restore обнулял локаль до старого теневого числа, метка
      // оставалась «свежей», и мы записывали заниженный баланс обратно в канал A.
      // Настоящую трату (op:'spend', local < cloud из-за отставшего облака) — пушим как прежде.
      && !(isLocalRestoreArtifact(localMeta) && local < cloudShards)
    ) {
      if (!isCurrent()) return;
      await syncShardsToCloud(local, localMeta);
    }
    if (changed) {
      if (!isCurrent()) return;
      const b = await getShardsBalance();
      if (!isCurrent()) return;
      await emitShardsBalanceUpdated(b, appliedMeta);
    }
    await initializeClientShardLedgerOpeningBalance(undefined, uid);
    void import('./economy/client_shard_operation_sync')
      .then(({ syncClientShardOperationJournalToCloud }) => syncClientShardOperationJournalToCloud())
      .catch(() => {});
  } catch (e) {
    // зачем: загрузка баланса из облака. Молчащий отказ = человек видит старый
    // баланс и не понимает, куда делись начисленные жемчужины.
    DebugLogger.error('shards_system:loadFromCloud', e instanceof Error ? e : new Error(String(e)), 'warning');
  }
};

// зачем: прогрев запускается САМ при первом импорте модуля (см. комментарий
// primeShardsBalanceFromBootStorage), а не только из bootstrap-гонки 350мс —
// _layout.tsx уже импортирует этот модуль статически, лишнего веса нет. Обещание
// намеренно не ожидается: ожидание аккаунта не должно задерживать сам импорт.
void primeShardsBalanceFromBootStorage();

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
