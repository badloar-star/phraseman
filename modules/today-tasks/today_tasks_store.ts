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
  // зачем (аудит Optimistic UI 17.10, п.4): несохранённый день прежнего владельца дописываем в ЕГО ключ, а флаг сбрасываем —
  // иначе повтор записи взял бы состояние нового владельца по флагу старого.
  const previous = current;
  if (unsavedSince !== null && previous) {
    void persist(previous).then((ok) => log('owner_change:unsaved_flushed', { ok, dayKey: previous.dayKey }));
  }
  unsavedSince = null;
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

/**
 * Записать и при сбое пометить «не сохранено» — тот же путь повтора, что у событий.
 * зачем (аудит Optimistic UI 17.10, п.3): новый день, замена/закрепление задач и отметка выплаты писались без проверки результата —
 * при сбое записи после перезапуска день «прыгал» назад, а повтора не было.
 */
async function persistOrMarkUnsaved(state: TodayTasksDayState, reason: string): Promise<boolean> {
  if (await persist(state)) return true;
  if (unsavedSince === null) unsavedSince = deps.now();
  hookBackgroundRetry();
  warn('persist:kept_unsaved', { reason, dayKey: state.dayKey, retry: 'next_event|home_open|app_background' });
  return false;
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
  // зачем (Ревизор 3.16, решение координатора 17.10): выдача не удалась, а день сменился — награду прошлого дня не теряем:
  // невыданные pending уходят в список переноса и выдаются тем же идемпотентным ключом прошлого дня.
  const previous = current && current.ownerKey === ownerKey && current.dayKey !== dayKey ? current : stored && stored.ownerKey === ownerKey && stored.dayKey !== dayKey ? stored : null;
  if (previous && ownerKey !== ANON_OWNER) await carryOverPendingRewards(previous);
  const kinds = await readAvailableKinds();
  const fresh = createTodayTasksDay(ownerKey, dayKey, kinds);
  log('day:new_set', {
    dayKey,
    previousDayKey: stored?.dayKey ?? current?.dayKey ?? null,
    reason: stored ? 'midnight_or_owner_change' : 'no_stored_state',
    available: kinds,
    picked: fresh.tasks.map((t) => t.kind),
  });
  publish(fresh);
  await persistOrMarkUnsaved(fresh, 'new_day');
  return fresh;
}

async function rewardRequests(state: Pick<TodayTasksDayState, 'ownerKey' | 'dayKey'>, kind: TodayTaskKindCore, amount: number): Promise<TodayTaskGrantRequest[] | null> {
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

type CarryItem = Readonly<{ dayKey: string; kind: TodayTaskKindCore; coins: number }>;
const CARRY_KEY_PREFIX = 'today_tasks_carry_v1:';

async function readCarry(ownerKey: string): Promise<CarryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(`${CARRY_KEY_PREFIX}${ownerKey}`);
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    if (!Array.isArray(parsed)) {
      settleLog('carry_over:broken', { action: 'reset' });
      return [];
    }
    return parsed.filter((x): x is CarryItem => Boolean(x) && typeof x.dayKey === 'string' && TODAY_TASK_POOL.includes(x.kind) && Number.isFinite(x.coins) && x.coins > 0);
  } catch (error) {
    warn('carry:read_failed', { error: errText(error) });
    return [];
  }
}

async function writeCarry(ownerKey: string, items: readonly CarryItem[]): Promise<void> {
  try {
    if (items.length === 0) await AsyncStorage.removeItem(`${CARRY_KEY_PREFIX}${ownerKey}`);
    else await AsyncStorage.setItem(`${CARRY_KEY_PREFIX}${ownerKey}`, JSON.stringify(items.slice(-14)));
  } catch (error) {
    warn('carry:write_failed', { error: errText(error), items: items.length });
  }
}

/** Невыданные награды уходящего дня — в список переноса (без дублей). */
async function carryOverPendingRewards(previous: TodayTasksDayState): Promise<void> {
  const pending = previous.tasks.filter((task) => task.rewardStatus === 'pending' && task.rewardCoins > 0);
  if (pending.length === 0) return;
  const carry = await readCarry(previous.ownerKey);
  const added = pending.filter((task) => !carry.some((c) => c.dayKey === previous.dayKey && c.kind === task.kind)).map((task) => ({ dayKey: previous.dayKey, kind: task.kind, coins: task.rewardCoins }));
  await writeCarry(previous.ownerKey, [...carry, ...added]);
  settleLog('carry_over', { fromDay: previous.dayKey, saved: added.map((c) => c.kind), total: carry.length + added.length });
}

/** Выдать перенесённые награды прошлых дней ключом СВОЕГО дня. Вызывать только внутри serialized. */
async function settleCarriedRewards(ownerKey: string): Promise<void> {
  if (ownerKey === ANON_OWNER) return;
  const carry = await readCarry(ownerKey);
  if (carry.length === 0) return;
  const left: CarryItem[] = [];
  for (const item of carry) {
    const requests = await rewardRequests({ ownerKey, dayKey: item.dayKey }, item.kind, item.coins);
    if (!requests) {
      warn('carry:skip', { ...item, reason: 'amount_not_decomposable_or_hash_failed', action: 'dropped' });
      continue;
    }
    try {
      for (const request of requests) await deps.grant(request);
      settleLog('carry_over:granted', { dayKey: item.dayKey, kind: item.kind, coins: item.coins });
    } catch (error) {
      left.push(item);
      settleLog('carry_over:grant_failed', { dayKey: item.dayKey, kind: item.kind, error: errText(error), retryInMs: REWARD_RETRY_MS });
      scheduleRewardRetry();
    }
  }
  if (left.length !== carry.length) await writeCarry(ownerKey, left);
}

/** Провести все pending-выплаты. Вызывать только внутри serialized. */
async function settlePendingRewards(state: TodayTasksDayState): Promise<TodayTasksDayState> {
  // зачем (Ревизор 3.11, 🔴 по f1b855998; координатор 17.10): выдача ждёт сеть, а события теперь применяются к `current` сразу, мимо очереди.
  // Раньше отметку «выдано» ставили на снимке ДО ожидания и публиковали его — событие, пришедшее за время выдачи, затиралось.
  // Теперь копим выданные типы и ставим отметку на СВЕЖЕМ current того же владельца и дня.
  await settleCarriedRewards(state.ownerKey);
  const pendingKinds = state.tasks.filter((task) => task.rewardStatus === 'pending').map((task) => task.kind);
  settleLog('enter', { dayKey: state.dayKey, owner: state.ownerKey === ANON_OWNER ? 'anon' : 'account', pending: pendingKinds });
  const grantedKinds: TodayTaskKindCore[] = [];
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
      grantedKinds.push(task.kind);
      log('reward:queued', {
        kind: task.kind,
        dayKey: state.dayKey,
        coins: task.rewardCoins,
        ops: requests.map((r) => `${r.requestId.slice(0, 20)}…:${r.giftId}`),
      });
    } catch (error) {
      // Остаётся pending: следующий вызов (событие/открытие Главной) повторит тем же ключом; плюс один отложенный повтор.
      warn('reward:grant_failed', { kind: task.kind, dayKey: state.dayKey, error: errText(error), status: 'stays_pending', retryInMs: REWARD_RETRY_MS });
      scheduleRewardRetry();
    }
  }
  if (grantedKinds.length === 0) {
    settleLog('done', { dayKey: state.dayKey, granted: [], winner: 'none', reason: pendingKinds.length === 0 ? 'nothing_pending' : 'all_skipped_or_failed' });
    return current ?? state;
  }
  const fresh = current;
  if (!fresh || fresh.ownerKey !== state.ownerKey || fresh.dayKey !== state.dayKey) {
    // Выдача прошла (ключ идемпотентен), но день/владелец сменились — отметку не переносим на чужой день; следующий вызов повторит тем же ключом без двойной выплаты.
    settleLog('skip_mark', { dayKey: state.dayKey, granted: grantedKinds, reason: fresh ? 'owner_or_day_changed' : 'state_reset', freshDay: fresh?.dayKey ?? null });
    return fresh ?? state;
  }
  let next = fresh;
  for (const kind of grantedKinds) next = markTodayTaskRewardGranted(next, kind);
  settleLog('done', {
    dayKey: state.dayKey,
    granted: grantedKinds,
    winner: fresh === state ? 'current_unchanged' : 'current_newer_than_snapshot',
    kinds: next.tasks.map((t) => `${t.kind}:${t.units}${t.done ? '✓' : ''}:${t.rewardStatus}`),
  });
  if (next !== fresh) {
    publish(next);
    await persistOrMarkUnsaved(next, 'reward_granted');
  }
  return next;
}

function settleLog(step: string, fields: Record<string, unknown>): void {
  console.log(`[TODAY-SETTLE] ${step} ${JSON.stringify(fields)}`);
}

/**
 * зачем (аудит Optimistic UI 17.10, п.2): сбой выдачи монет ждал следующего события или открытия Главной — человек с галочкой
 * мог час не получить монеты. Один отложенный повтор тем же идемпотентным ключом (двойной выплаты нет); таймер один на процесс.
 */
const REWARD_RETRY_MS = 30_000;
let rewardRetryTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleRewardRetry(): void {
  if (rewardRetryTimer) return;
  rewardRetryTimer = setTimeout(() => {
    rewardRetryTimer = null;
    void serialized(async () => {
      const state = current;
      if (!state) {
        log('reward:retry_skip', { reason: 'no_state' });
        return;
      }
      log('reward:retry', { dayKey: state.dayKey });
      await settlePendingRewards(state);
    }).catch((error: unknown) => warn('reward:retry_failed', { error: errText(error) }));
  }, REWARD_RETRY_MS);
}

/**
 * Применить событие к дню в памяти сразу (без диска). null — дня в памяти нет, он вчерашний или событие ничего не меняет:
 * тогда всё делает очередь, как раньше. Событие применяется ровно один раз — очередь его уже не применяет.
 */
function applyOptimisticTodayEvent(event: TodayTaskEvent): Readonly<{ ownerKey: string; dayKey: string; outcome: string }> | null {
  const state = current;
  if (!state) return null;
  const today = todayLocalDayKey(deps.now());
  if (state.dayKey !== today) {
    log('event:optimistic_skip', { kind: event.kind, reason: 'day_rollover', from: state.dayKey, to: today });
    return null;
  }
  const result = applyTodayTaskEvent(state, event, deps.now());
  const fields = { kind: event.kind, source: event.source, unitKey: event.unitKey ? event.unitKey.slice(0, 40) : null, units: event.units ?? 1, dayKey: state.dayKey, outcome: result.outcome, progress: `${result.before}→${result.after}` };
  if (result.state === state) {
    log('event:no_change', fields);
    return null;
  }
  log(result.outcome === 'completed' ? 'event:completed' : 'event:counted', { ...fields, shown: 'instant' });
  publish(result.state);
  return { ownerKey: state.ownerKey, dayKey: state.dayKey, outcome: result.outcome };
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
  // зачем (аудит Optimistic UI 17.10, п.1): счётчик и кольцо менялись только после записи на диск (и после чужих задач в очереди, в т.ч.
  // выдачи монет без таймаута) — человек видел 0/1 после урока. Если день в памяти — применяем СРАЗУ и показываем; очередь только пишет.
  const optimistic = applyOptimisticTodayEvent(event);
  return serialized(async () => {
    try {
      await retryUnsaved(`event:${event.kind}`);
      if (optimistic && current && current.ownerKey === optimistic.ownerKey && current.dayKey === optimistic.dayKey) {
        const saved = await persistOrMarkUnsaved(current, `event:${event.kind}`);
        log('event:persisted_after_optimistic', { kind: event.kind, outcome: optimistic.outcome, saved, dayKey: current.dayKey });
        if (saved && optimistic.outcome === 'completed') await settlePendingRewards(current);
        return;
      }
      if (optimistic) log('event:optimistic_superseded', { kind: event.kind, reason: current ? 'owner_or_day_changed' : 'state_reset', action: 'reapply_to_loaded_day' });
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
      // зачем (Ревизор 3.11, та же гонка): показываем ДО записи — событие, пришедшее за время записи, ложится поверх и не затирается;
      // на диск пишем самый свежий current. Монеты — только после успешной записи.
      publish(result.state);
      const latest = current ?? result.state;
      if (!(await persistOrMarkUnsaved(latest, `event:${event.kind}`))) {
        warn('event:kept_unsaved', { ...fields, reason: 'persist_failed', retry: 'next_event|home_open|app_background' });
        return;
      }
      if (result.outcome === 'completed') await settlePendingRewards(current ?? latest);
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
        publish(day);
        await persistOrMarkUnsaved(day, 'replaced_unavailable');
      }
      // D144: закреплённые типы (готовые «Мои ошибки») обязаны быть в дне.
      const pinnedNow = pinnedKinds.filter((kind) => normalized.includes(kind));
      const pin = ensurePinnedTodayTasks(day, pinnedNow);
      if (pin.pinned.length > 0) {
        day = pin.state;
        log('day:pinned', { pinned: pin.pinned, pinnedKinds: pinnedNow });
        publish(day);
        await persistOrMarkUnsaved(day, 'pinned');
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
    if (rewardRetryTimer) clearTimeout(rewardRetryTimer);
    rewardRetryTimer = null;
    deps = DEFAULT_DEPS;
    current = null;
    unsavedSince = null;
    availableKinds = null;
    queue = Promise.resolve();
    listeners.clear();
  },
  /** Сбросить только память процесса (имитация перезапуска приложения). */
  simulateRestart(): void {
    if (rewardRetryTimer) clearTimeout(rewardRetryTimer);
    rewardRetryTimer = null;
    current = null;
    unsavedSince = null;
    availableKinds = null;
    queue = Promise.resolve();
  },
});
