// ═══════════════════════════════════════════════════════════════════════════
// today_tasks_store.ts — хранилище и засчитывание блока «Сегодня» (D49, PM-259).
//
// зачем: единая точка, куда КАЖДАЯ активность (урок, диалог, карточки, видео,
// ошибки, Шпиль) сообщает «сделал», а Главная читает готовый набор дня.
//   • Хранение — AsyncStorage на устройстве, ключ на владельца; Firestore НЕ
//     читается и НЕ пишется (D-экономика: телефон авторитетен, D49).
//   • Первый кадр Главной — из памяти процесса (peek), диск догружается фоном.
//   • Все изменения идут через одну очередь (mutex) — два события подряд не
//     затрут друг друга.
//   • Монеты: задача стала done → rewardStatus 'pending' сохраняется НА ДИСК,
//     потом операция ставится в кошелёк (enqueueLevelSpinStarGrant) с ключом
//     dailyjourney_<sha256(владелец|день|тип)[0..32]>_<n> — серверный белый
//     список functions/src/coin_wallet_policy.ts. Ключ детерминирован, поэтому
//     повтор/перезапуск/двойной тап кошелёк схлопывает в одну выплату.
// Логи — префикс [TODAY-TASKS] на каждом засчитывании, раннем выходе и catch.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import {
  TODAY_TASK_POOL,
  applyTodayTaskEvent,
  createTodayTasksDay,
  ensurePinnedTodayTasks,
  markTodayTaskRewardGranted,
  needsNewTodayTasksDay,
  parseTodayTasksDayState,
  replaceUnavailableTodayTasks,
  todayLocalDayKey,
  todayTaskRewardGiftIds,
  todayTaskRewardSeed,
  type TodayTaskEvent,
  type TodayTaskKindCore,
  type TodayTasksDayState,
} from './today_tasks_core';
import { onAccountOwnerChanged } from '../../app/account_owner_change';

const LOG = '[TODAY-TASKS]';
const STATE_KEY_PREFIX = 'today_tasks_v1:';
const AVAILABLE_KEY = 'today_tasks_available_kinds_v1';
/** Без активного аккаунта задания всё равно считаются (монеты — когда аккаунт появится). */
const ANON_OWNER = 'anon';

export type TodayTaskGrantRequest = Readonly<{ requestId: string; giftId: string; kind: TodayTaskKindCore; dayKey: string }>;

export type TodayTasksDeps = Readonly<{
  now: () => number;
  /** stableId активного аккаунта или null. */
  ownerStableId: () => Promise<string | null>;
  /** Поставить одну операцию начисления в кошелёк. Бросает — выплата остаётся pending. */
  grant: (request: TodayTaskGrantRequest) => Promise<void>;
  sha256Hex: (input: string) => Promise<string>;
}>;

async function defaultOwnerStableId(): Promise<string | null> {
  const { captureAccountGeneration } = await import('../../app/account_generation');
  const token = captureAccountGeneration();
  return token.phase === 'active' && token.stableId ? token.stableId : null;
}

async function defaultGrant(request: TodayTaskGrantRequest): Promise<void> {
  const [{ captureAccountGeneration }, { enqueueLevelSpinStarGrant }] = await Promise.all([
    import('../../app/account_generation'),
    import('../../app/level_spin_star_grants'),
  ]);
  await enqueueLevelSpinStarGrant({
    token: captureAccountGeneration(),
    requestId: request.requestId,
    lane: 'base',
    giftId: request.giftId,
    promotionEligibility: 'gameplay',
  });
}

const DEFAULT_DEPS: TodayTasksDeps = Object.freeze({
  now: () => Date.now(),
  ownerStableId: defaultOwnerStableId,
  grant: defaultGrant,
  sha256Hex: (input: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input),
});

let deps: TodayTasksDeps = DEFAULT_DEPS;
let current: TodayTasksDayState | null = null;
let availableKinds: readonly TodayTaskKindCore[] | null = null;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<(state: TodayTasksDayState | null) => void>();
// зачем (координатор 15.10, LOGOUT_WIPE_AUDIT 🔴): кэш в памяти принадлежит владельцу — при смене аккаунта без перезапуска JS B видел данные A.
onAccountOwnerChanged('today_tasks', () => {
  current = null;
  listeners.forEach((listener) => listener(null));
});
/**
 * зачем (аудит Optimistic UI «Главная и Уроки», 99ba26b1e; координатор 12.10): раньше при сбое записи на диск событие
 * отбрасывалось (`event:dropped`) — прогресс дня тихо терялся. Теперь состояние показывается сразу, держится в памяти
 * помеченным «не сохранено» и пишется повторно: при следующем событии, открытии Главной (refresh) и уходе приложения в фон.
 * Ни одного чтения Firestore — это только локальный диск. Монеты за задание выдаются лишь после успешной записи.
 */
let unsavedSince: number | null = null;
let backgroundRetryHooked = false;

function log(event: string, fields: Record<string, unknown>): void {
  console.log(`${LOG} ${event} ${JSON.stringify(fields)}`);
}

function warn(event: string, fields: Record<string, unknown>): void {
  console.warn(`${LOG} ${event} ${JSON.stringify(fields)}`);
}

function errText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function publish(next: TodayTasksDayState | null): void {
  current = next;
  for (const listener of listeners) {
    try {
      listener(next);
    } catch (error) {
      warn('listener:failed', { error: errText(error) });
    }
  }
}

function serialized<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  // зачем: очередь не должна застревать на упавшей задаче, но причина обязана быть видна (немой catch запрещён).
  queue = run.catch((error: unknown) => {
    warn('queue:previous_failed', { error: errText(error) });
  });
  return run;
}

function stateKey(ownerKey: string): string {
  return `${STATE_KEY_PREFIX}${ownerKey}`;
}

async function readAvailableKinds(): Promise<readonly TodayTaskKindCore[]> {
  if (availableKinds) return availableKinds;
  try {
    const raw = await AsyncStorage.getItem(AVAILABLE_KEY);
    const parsed = raw ? JSON.parse(raw) as unknown : null;
    if (Array.isArray(parsed)) {
      const kinds = TODAY_TASK_POOL.filter((kind) => parsed.includes(kind));
      availableKinds = Object.freeze(kinds);
      return availableKinds;
    }
    log('available:none_stored', { fallback: 'pool_without_spire' });
  } catch (error) {
    warn('available:read_failed', { error: errText(error), fallback: 'pool_without_spire' });
  }
  // Главная ещё ни разу не сообщила доступные типы — берём пул без Шпиля (он за флагом).
  return TODAY_TASK_POOL.filter((kind) => kind !== 'spire_steps');
}

async function persist(state: TodayTasksDayState): Promise<boolean> {
  try {
    await AsyncStorage.setItem(stateKey(state.ownerKey), JSON.stringify(state));
    return true;
  } catch (error) {
    warn('persist:failed', { ownerKey: state.ownerKey.slice(0, 8), dayKey: state.dayKey, error: errText(error) });
    return false;
  }
}

/** Повторить запись несохранённого состояния. Вызывать только внутри serialized. Возвращает true, если на диске актуально. */
async function retryUnsaved(trigger: string): Promise<boolean> {
  if (unsavedSince === null) return true;
  const state = current;
  if (!state) {
    warn('retry:no_state', { trigger, unsavedForMs: deps.now() - unsavedSince, action: 'flag_cleared' });
    unsavedSince = null;
    return true;
  }
  if (!(await persist(state))) {
    warn('retry:failed', { trigger, dayKey: state.dayKey, unsavedForMs: deps.now() - unsavedSince, status: 'stays_in_memory' });
    return false;
  }
  log('retry:saved', { trigger, dayKey: state.dayKey, unsavedForMs: deps.now() - unsavedSince, kinds: state.tasks.map((t) => `${t.kind}:${t.units}${t.done ? '✓' : ''}`) });
  unsavedSince = null;
  // Выполненное, пока запись не ложилась, — теперь на диске: доводим выплаты (ключ идемпотентен).
  if (state.tasks.some((task) => task.rewardStatus === 'pending')) await settlePendingRewards(state);
  return true;
}

function hookBackgroundRetry(): void {
  if (backgroundRetryHooked) return;
  backgroundRetryHooked = true;
  void import('react-native')
    .then(({ AppState }) => {
      AppState.addEventListener('change', (next) => {
        if (unsavedSince === null || (next !== 'background' && next !== 'active')) return;
        void serialized(() => retryUnsaved(`app_state:${next}`)).catch((error: unknown) => {
          warn('retry:app_state_failed', { next, error: errText(error) });
        });
      });
      log('retry:background_hooked', {});
    })
    .catch((error: unknown) => {
      backgroundRetryHooked = false;
      warn('retry:background_hook_failed', { error: errText(error) });
    });
}

/** Загрузить (или создать) состояние текущего дня. Вызывать только внутри serialized. */
async function loadDay(): Promise<TodayTasksDayState> {
  const ownerKey = (await deps.ownerStableId().catch((error: unknown) => {
    warn('owner:failed', { error: errText(error), fallback: ANON_OWNER });
    return null;
  })) ?? ANON_OWNER;
  const dayKey = todayLocalDayKey(deps.now());
  if (current && !needsNewTodayTasksDay(current, ownerKey, dayKey)) return current;
  let stored: TodayTasksDayState | null = null;
  try {
    const raw = await AsyncStorage.getItem(stateKey(ownerKey));
    stored = parseTodayTasksDayState(raw);
    if (raw && !stored) warn('load:corrupt_state', { ownerKey: ownerKey.slice(0, 8), action: 'new_day_set' });
  } catch (error) {
    warn('load:read_failed', { ownerKey: ownerKey.slice(0, 8), error: errText(error) });
  }
  if (stored && !needsNewTodayTasksDay(stored, ownerKey, dayKey)) {
    log('load:from_disk', { dayKey, kinds: stored.tasks.map((t) => t.kind) });
    publish(stored);
    return stored;
  }
  const kinds = await readAvailableKinds();
  const fresh = createTodayTasksDay(ownerKey, dayKey, kinds);
  log('day:new_set', {
    dayKey,
    previousDayKey: stored?.dayKey ?? current?.dayKey ?? null,
    reason: stored ? 'midnight_or_owner_change' : 'no_stored_state',
    available: kinds,
    picked: fresh.tasks.map((t) => t.kind),
  });
  await persist(fresh);
  publish(fresh);
  return fresh;
}

async function rewardRequests(state: TodayTasksDayState, kind: TodayTaskKindCore, amount: number): Promise<TodayTaskGrantRequest[] | null> {
  const giftIds = todayTaskRewardGiftIds(amount);
  if (!giftIds) return null;
  const hash = (await deps.sha256Hex(todayTaskRewardSeed(state.ownerKey, state.dayKey, kind))).replace(/[^A-Za-z0-9]/g, '');
  if (hash.length < 32) return null;
  return giftIds.map((giftId, index) => ({
    requestId: `dailyjourney_${hash.slice(0, 32)}_${index + 1}`,
    giftId,
    kind,
    dayKey: state.dayKey,
  }));
}

/** Провести все pending-выплаты. Вызывать только внутри serialized. */
async function settlePendingRewards(state: TodayTasksDayState): Promise<TodayTasksDayState> {
  let next = state;
  for (const task of state.tasks) {
    if (task.rewardStatus !== 'pending') continue;
    if (state.ownerKey === ANON_OWNER) {
      log('reward:skip', { kind: task.kind, dayKey: state.dayKey, reason: 'no_active_account', status: 'stays_pending' });
      continue;
    }
    const requests = await rewardRequests(state, task.kind, task.rewardCoins);
    if (!requests) {
      warn('reward:skip', { kind: task.kind, amount: task.rewardCoins, reason: 'amount_not_decomposable_or_hash_failed' });
      continue;
    }
    try {
      for (const request of requests) {
        await deps.grant(request);
      }
      next = markTodayTaskRewardGranted(next, task.kind);
      log('reward:queued', {
        kind: task.kind,
        dayKey: state.dayKey,
        coins: task.rewardCoins,
        ops: requests.map((r) => `${r.requestId.slice(0, 20)}…:${r.giftId}`),
      });
    } catch (error) {
      // Остаётся pending: следующий вызов (событие/открытие Главной) повторит тем же ключом.
      warn('reward:grant_failed', { kind: task.kind, dayKey: state.dayKey, error: errText(error), status: 'stays_pending' });
    }
  }
  if (next !== state) {
    await persist(next);
    publish(next);
  }
  return next;
}

/**
 * Сообщить об активности. Никогда не бросает: засчитывание — побочный эффект
 * активности и не имеет права ломать урок/диалог/карточки.
 */
export function recordTodayTaskActivity(event: TodayTaskEvent): Promise<void> {
  // зачем (баг серии 01.10): любое завершённое занятие отмечает день серии (раз в день),
  // а не только холодный старт. Динамический импорт — без цикла зависимостей.
  void import('../../app/hall_of_fame_utils')
    .then((m) => m.touchStreakForToday(`activity:${event.kind}`))
    .catch((error: unknown) => warn('streak_touch:import_failed', { error: errText(error) }));
  return serialized(async () => {
    try {
      await retryUnsaved(`event:${event.kind}`);
      const day = await loadDay();
      const result = applyTodayTaskEvent(day, event, deps.now());
      const fields = {
        kind: event.kind,
        source: event.source,
        unitKey: event.unitKey ? event.unitKey.slice(0, 40) : null,
        units: event.units ?? 1,
        dayKey: day.dayKey,
        outcome: result.outcome,
        progress: `${result.before}→${result.after}`,
      };
      if (result.state === day) {
        log('event:no_change', fields);
        return;
      }
      log(result.outcome === 'completed' ? 'event:completed' : 'event:counted', fields);
      if (!(await persist(result.state))) {
        // Показываем сразу (Optimistic UI) и держим в памяти; запись повторится — см. retryUnsaved. Монеты — только после записи.
        if (unsavedSince === null) unsavedSince = deps.now();
        publish(result.state);
        hookBackgroundRetry();
        warn('event:kept_unsaved', { ...fields, reason: 'persist_failed', retry: 'next_event|home_open|app_background' });
        return;
      }
      publish(result.state);
      if (result.outcome === 'completed') await settlePendingRewards(result.state);
    } catch (error) {
      warn('event:failed', { kind: event.kind, source: event.source, error: errText(error) });
    }
  });
}

/**
 * Главная сообщает, какие типы сейчас доступны (раздел виден для языка, Шпиль
 * включён), и просит актуальный день. Новый набор дня строится из этого списка.
 * Заодно доводит до кошелька выплаты, застрявшие в pending.
 */
export function refreshTodayTasks(
  kinds: readonly TodayTaskKindCore[],
  pinnedKinds: readonly TodayTaskKindCore[] = [],
): Promise<TodayTasksDayState | null> {
  return serialized(async () => {
    try {
      await retryUnsaved('home_open');
      const normalized = Object.freeze(TODAY_TASK_POOL.filter((kind) => kinds.includes(kind)));
      if (!availableKinds || availableKinds.join(',') !== normalized.join(',')) {
        availableKinds = normalized;
        await AsyncStorage.setItem(AVAILABLE_KEY, JSON.stringify(normalized)).catch((error: unknown) => {
          warn('available:write_failed', { error: errText(error) });
        });
        log('available:set', { kinds: normalized });
      }
      let day = await loadDay();
      const swap = replaceUnavailableTodayTasks(day, normalized);
      if (swap.replaced.length > 0) {
        day = swap.state;
        log('day:replaced_unavailable', { replaced: swap.replaced, available: normalized });
        await persist(day);
        publish(day);
      }
      // D144: закреплённые типы (готовые «Мои ошибки») обязаны быть в дне.
      const pinnedNow = pinnedKinds.filter((kind) => normalized.includes(kind));
      const pin = ensurePinnedTodayTasks(day, pinnedNow);
      if (pin.pinned.length > 0) {
        day = pin.state;
        log('day:pinned', { pinned: pin.pinned, pinnedKinds: pinnedNow });
        await persist(day);
        publish(day);
      } else if (pinnedNow.length > 0) {
        log('day:pin_kept', { pinnedKinds: pinnedNow, kinds: day.tasks.map((task) => task.kind) });
      }
      return await settlePendingRewards(day);
    } catch (error) {
      warn('refresh:failed', { error: errText(error) });
      return current;
    }
  });
}

/** Синхронный снимок для первого кадра (без диска). */
export function peekTodayTasks(): TodayTasksDayState | null {
  return current;
}

export function subscribeTodayTasks(listener: (state: TodayTasksDayState | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Только для тестов: подменить зависимости и сбросить память процесса. */
export const __todayTasksStoreTestHooks = Object.freeze({
  setDeps(next: Partial<TodayTasksDeps>): void {
    deps = Object.freeze({ ...DEFAULT_DEPS, ...next });
  },
  reset(): void {
    deps = DEFAULT_DEPS;
    current = null;
    unsavedSince = null;
    availableKinds = null;
    queue = Promise.resolve();
    listeners.clear();
  },
  /** Сбросить только память процесса (имитация перезапуска приложения). */
  simulateRestart(): void {
    current = null;
    unsavedSince = null;
    availableKinds = null;
    queue = Promise.resolve();
  },
});
