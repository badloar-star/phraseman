// ═══════════════════════════════════════════════════════════════════════════
// today_tasks_core.ts — чистая логика блока «Сегодня» (D49, PM-259).
//
// зачем (владелец 01.10: «задания дня … должны быть все рабочими … и корректно
// засчитываться все»): до этого блок на Главной был заглушкой с нулями —
// ни одно действие его не двигало. Здесь — ТОЛЬКО правила, без хранилища и сети:
//   • набор дня: 3 типа из пула, детерминированно от (владелец, локальный день),
//     только из типов, доступных человеку (раздел виден для языка, Шпиль включён);
//   • засчитывание: событие активности → progress растёт до target, done ставится
//     ОДИН раз, повтор той же единицы (тот же ответ/ступень/урок) не считается дважды;
//   • монеты: одна выплата на задачу в день — ключ выплаты = (владелец, день, тип),
//     поэтому перезапуск, двойной тап и смена языка не дают второй выплаты;
//   • локальная полночь → новый день → новый набор.
// Модуль без импортов: его гоняют тесты и зовёт store (today_tasks_store.ts).
// ═══════════════════════════════════════════════════════════════════════════

export type TodayTaskKindCore = 'lesson' | 'dialog' | 'cards' | 'video' | 'mistakes' | 'spire_steps';

/** Порядок пула = порядок тай-брейка при выборе; менять только осознанно. */
export const TODAY_TASK_POOL: readonly TodayTaskKindCore[] = Object.freeze([
  'lesson', 'dialog', 'cards', 'video', 'mistakes', 'spire_steps',
]);

export const TODAY_TASKS_PER_DAY = 3;

export type TodayTaskRule = Readonly<{
  /** Сколько шагов прогресса нужно (то, что видно на Главной как N/target). */
  target: number;
  /** Сколько единиц события = один шаг прогресса (видео: 60 секунд = 1). */
  unitsPerStep: number;
  /** Монеты за выполнение задачи. */
  rewardCoins: number;
}>;

/**
 * Правила типов. Суммы монет — ОТКРЫТЫЙ вопрос D49 («суммы — спросить владельца
 * при реализации»): стоит рабочее значение 50 (кратно номиналу stars_50 серверного
 * кошелька, 3 задачи = 150/день — далеко ниже суточного потолка 2000 у dailyjourney_).
 * Суммы решены координатором 01.10: Q20 — 50 за задание (≤150/день).
 * Видео — тоже 50 (Q21): это награда за выполненное задание дня из источника «Сегодня»,
 * а не за сам просмотр (Q9 запрещает платить за просмотр, не за задание дня).
 */
export const TODAY_TASK_RULES: Readonly<Record<TodayTaskKindCore, TodayTaskRule>> = Object.freeze({
  lesson: Object.freeze({ target: 1, unitsPerStep: 1, rewardCoins: 50 }),
  dialog: Object.freeze({ target: 1, unitsPerStep: 1, rewardCoins: 50 }),
  cards: Object.freeze({ target: 10, unitsPerStep: 1, rewardCoins: 50 }),
  // зачем: владелец 17.10 — «засчитывать только если посмотрели не менее 10 минут» (было 60 с).
  video: Object.freeze({ target: 1, unitsPerStep: 600, rewardCoins: 50 }),
  mistakes: Object.freeze({ target: 5, unitsPerStep: 1, rewardCoins: 50 }),
  spire_steps: Object.freeze({ target: 3, unitsPerStep: 1, rewardCoins: 50 }),
});

/** Сколько уникальных ключей единиц помнить на задачу (защита от роста хранилища). */
export const TODAY_TASK_MAX_UNIT_KEYS = 64;

export type TodayTaskRewardStatus = 'none' | 'pending' | 'granted';

export type TodayTaskState = Readonly<{
  kind: TodayTaskKindCore;
  /** Накопленные единицы события (видео — секунды, остальное — штуки). */
  units: number;
  /** Уже засчитанные ключи единиц (id карточки, reportId ступени, id урока…). */
  unitKeys: readonly string[];
  done: boolean;
  doneAtMs: number | null;
  rewardCoins: number;
  rewardStatus: TodayTaskRewardStatus;
}>;

export type TodayTasksDayState = Readonly<{
  schemaVersion: 1;
  ownerKey: string;
  dayKey: string;
  tasks: readonly TodayTaskState[];
}>;

export type TodayTaskEvent = Readonly<{
  kind: TodayTaskKindCore;
  /** Единиц в событии (по умолчанию 1). */
  units?: number;
  /** Ключ единицы: повтор того же ключа за день не засчитывается. */
  unitKey?: string;
  /** Откуда пришло событие — только для логов. */
  source: string;
}>;

export type TodayTaskApplyResult = Readonly<{
  state: TodayTasksDayState;
  /** Что произошло — для лога [TODAY-TASKS]. */
  outcome: 'counted' | 'completed' | 'not_in_today_set' | 'already_done' | 'duplicate_unit' | 'invalid_units';
  before: number;
  after: number;
}>;

/** Локальный день YYYY-MM-DD (полночь по часам телефона). */
export function todayLocalDayKey(nowMs: number): string {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** FNV-1a 32 бит — стабильный дешёвый хэш для порядка выбора (не криптография). */
export function todayTasksHash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Три типа дня из доступных. Детерминировано: тот же (владелец, день, доступные)
 * → тот же набор, на любом перезапуске. Разные дни → разный порядок.
 */
export function selectTodayTaskKinds(
  ownerKey: string,
  dayKey: string,
  availableKinds: readonly TodayTaskKindCore[],
): TodayTaskKindCore[] {
  const allowed = TODAY_TASK_POOL.filter((kind) => availableKinds.includes(kind));
  const ranked = allowed
    .map((kind, index) => ({ kind, index, score: todayTasksHash32(`${ownerKey}|${dayKey}|${kind}`) }))
    .sort((a, b) => (a.score - b.score) || (a.index - b.index));
  const picked = new Set(ranked.slice(0, TODAY_TASKS_PER_DAY).map((item) => item.kind));
  // Порядок показа — порядок пула, чтобы список не «прыгал» внутри дня.
  return allowed.filter((kind) => picked.has(kind));
}

function freshTask(kind: TodayTaskKindCore): TodayTaskState {
  return Object.freeze({
    kind,
    units: 0,
    unitKeys: Object.freeze([]),
    done: false,
    doneAtMs: null,
    rewardCoins: TODAY_TASK_RULES[kind].rewardCoins,
    rewardStatus: 'none' as const,
  });
}

export function createTodayTasksDay(
  ownerKey: string,
  dayKey: string,
  availableKinds: readonly TodayTaskKindCore[],
): TodayTasksDayState {
  return Object.freeze({
    schemaVersion: 1 as const,
    ownerKey,
    dayKey,
    tasks: Object.freeze(selectTodayTaskKinds(ownerKey, dayKey, availableKinds).map(freshTask)),
  });
}

/**
 * Заменить в текущем дне задания, ставшие невыполнимыми (раздел выключен, ошибок
 * не хватает), на другие доступные типы — только если по заданию НЕ было прогресса.
 * зачем («Дизайн» 01.10, эмулятор): «Шпиль 0/3» при выключенном Шпиле и «Ошибки 0/5»
 * при пустом журнале висели тупиком до полуночи. Начатые/выполненные задания не
 * трогаем — иначе ломается «один раз в день» и можно «перебрасывать» набор.
 */
export function replaceUnavailableTodayTasks(
  state: TodayTasksDayState,
  availableKinds: readonly TodayTaskKindCore[],
): Readonly<{ state: TodayTasksDayState; replaced: readonly { from: TodayTaskKindCore; to: TodayTaskKindCore }[] }> {
  const used = new Set(state.tasks.map((task) => task.kind));
  const spare = TODAY_TASK_POOL.filter((kind) => availableKinds.includes(kind) && !used.has(kind));
  const replaced: { from: TodayTaskKindCore; to: TodayTaskKindCore }[] = [];
  const tasks = state.tasks.map((task) => {
    const untouched = !task.done && task.units === 0 && task.unitKeys.length === 0;
    if (availableKinds.includes(task.kind) || !untouched) return task;
    const next = spare.shift();
    if (!next) return task;
    replaced.push({ from: task.kind, to: next });
    return freshTask(next);
  });
  if (replaced.length === 0) return { state, replaced };
  return { state: Object.freeze({ ...state, tasks: Object.freeze(tasks) }), replaced };
}

/**
 * Закрепить обязательные типы в текущем дне: если закреплённого нет — он вытесняет
 * последнее нетронутое незакреплённое задание.
 * зачем (D144, владелец 01.10): вход в «Мои ошибки» на Главной — только строкой
 * в «Сегодня»; случайный выбор мог не дать её в день, и раздел становился недостижим.
 * Начатые/выполненные задания не трогаем (как и в replaceUnavailableTodayTasks).
 */
export function ensurePinnedTodayTasks(
  state: TodayTasksDayState,
  pinnedKinds: readonly TodayTaskKindCore[],
): Readonly<{ state: TodayTasksDayState; pinned: readonly { from: TodayTaskKindCore; to: TodayTaskKindCore }[] }> {
  const missing = TODAY_TASK_POOL.filter((kind) => pinnedKinds.includes(kind)
    && !state.tasks.some((task) => task.kind === kind));
  if (missing.length === 0) return { state, pinned: [] };
  const tasks = [...state.tasks];
  const pinned: { from: TodayTaskKindCore; to: TodayTaskKindCore }[] = [];
  for (const kind of missing) {
    let slot = -1;
    for (let i = tasks.length - 1; i >= 0; i -= 1) {
      const task = tasks[i];
      const untouched = !task.done && task.units === 0 && task.unitKeys.length === 0;
      if (untouched && !pinnedKinds.includes(task.kind)) { slot = i; break; }
    }
    if (slot < 0) break;
    pinned.push({ from: tasks[slot].kind, to: kind });
    tasks[slot] = freshTask(kind);
  }
  if (pinned.length === 0) return { state, pinned };
  // Порядок показа — порядок пула, как в selectTodayTaskKinds.
  const ordered = [...tasks].sort((a, b) => TODAY_TASK_POOL.indexOf(a.kind) - TODAY_TASK_POOL.indexOf(b.kind));
  return { state: Object.freeze({ ...state, tasks: Object.freeze(ordered) }), pinned };
}

/** Нужен ли новый день: другой владелец или наступила локальная полночь. */
export function needsNewTodayTasksDay(state: TodayTasksDayState | null, ownerKey: string, dayKey: string): boolean {
  return !state || state.ownerKey !== ownerKey || state.dayKey !== dayKey;
}

export function todayTaskProgress(task: TodayTaskState): number {
  const rule = TODAY_TASK_RULES[task.kind];
  return Math.min(rule.target, Math.floor(task.units / rule.unitsPerStep));
}

/**
 * Применить событие. Иммутабельно: возвращает НОВОЕ состояние (или то же, если
 * ничего не изменилось). done ставится ровно один раз, вместе с rewardStatus
 * 'pending' (если у задачи есть монеты) — выплату делает store по этому флагу.
 */
export function applyTodayTaskEvent(state: TodayTasksDayState, event: TodayTaskEvent, nowMs: number): TodayTaskApplyResult {
  const index = state.tasks.findIndex((task) => task.kind === event.kind);
  if (index < 0) return { state, outcome: 'not_in_today_set', before: 0, after: 0 };
  const task = state.tasks[index]!;
  const before = todayTaskProgress(task);
  if (task.done) return { state, outcome: 'already_done', before, after: before };
  const units = event.units ?? 1;
  if (!Number.isFinite(units) || units <= 0) return { state, outcome: 'invalid_units', before, after: before };
  const unitKey = event.unitKey?.trim() ? event.unitKey.trim().slice(0, 120) : null;
  if (unitKey && task.unitKeys.includes(unitKey)) return { state, outcome: 'duplicate_unit', before, after: before };
  const rule = TODAY_TASK_RULES[task.kind];
  const nextUnits = Math.min(task.units + units, rule.target * rule.unitsPerStep);
  const nextKeys = unitKey ? [...task.unitKeys, unitKey].slice(-TODAY_TASK_MAX_UNIT_KEYS) : task.unitKeys;
  const draft: TodayTaskState = { ...task, units: nextUnits, unitKeys: Object.freeze(nextKeys) };
  const after = todayTaskProgress(draft);
  const completed = after >= rule.target;
  const nextTask: TodayTaskState = Object.freeze(completed
    ? {
      ...draft,
      done: true,
      doneAtMs: nowMs,
      rewardStatus: task.rewardCoins > 0 ? 'pending' as const : 'none' as const,
    }
    : draft);
  const tasks = Object.freeze(state.tasks.map((item, i) => (i === index ? nextTask : item)));
  return { state: Object.freeze({ ...state, tasks }), outcome: completed ? 'completed' : 'counted', before, after };
}

/** Отметить выплату задачи проведённой (кошелёк принял операцию в очередь). */
export function markTodayTaskRewardGranted(state: TodayTasksDayState, kind: TodayTaskKindCore): TodayTasksDayState {
  const tasks = state.tasks.map((task) => (
    task.kind === kind && task.rewardStatus === 'pending' ? Object.freeze({ ...task, rewardStatus: 'granted' as const }) : task
  ));
  return Object.freeze({ ...state, tasks: Object.freeze(tasks) });
}

/**
 * Ключ выплаты: (владелец, день, тип). Один и тот же для любого числа попыток —
 * кошелёк (enqueueLevelSpinStarGrant + серверный журнал) схлопывает повтор.
 */
export function todayTaskRewardSeed(ownerKey: string, dayKey: string, kind: TodayTaskKindCore): string {
  return `today-tasks.v1|${ownerKey}|${dayKey}|${kind}`;
}

/** Номиналы серверного кошелька для dailyjourney_ (coin_wallet_policy.ts). */
const COIN_DENOMINATIONS = Object.freeze([1000, 500, 250, 100, 50, 20, 10] as const);

/** Разложить сумму на номиналы stars_N; null — сумма не раскладывается. */
export function todayTaskRewardGiftIds(amount: number): string[] | null {
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  let remaining = amount;
  const ids: string[] = [];
  for (const denomination of COIN_DENOMINATIONS) {
    while (remaining >= denomination) {
      ids.push(`stars_${denomination}`);
      remaining -= denomination;
    }
  }
  return remaining === 0 ? ids : null;
}

/** Разбор сохранённого JSON с проверкой формы; мусор → null (лог у вызывающего). */
export function parseTodayTasksDayState(raw: string | null): TodayTasksDayState | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 1 || typeof v.ownerKey !== 'string' || typeof v.dayKey !== 'string' || !Array.isArray(v.tasks)) return null;
  const tasks: TodayTaskState[] = [];
  for (const item of v.tasks as unknown[]) {
    if (!item || typeof item !== 'object') return null;
    const t = item as Record<string, unknown>;
    if (typeof t.kind !== 'string' || !(TODAY_TASK_POOL as readonly string[]).includes(t.kind)) return null;
    const status = t.rewardStatus === 'pending' || t.rewardStatus === 'granted' ? t.rewardStatus : 'none';
    tasks.push(Object.freeze({
      kind: t.kind as TodayTaskKindCore,
      units: typeof t.units === 'number' && Number.isFinite(t.units) && t.units > 0 ? t.units : 0,
      unitKeys: Object.freeze(Array.isArray(t.unitKeys) ? (t.unitKeys as unknown[]).filter((k): k is string => typeof k === 'string').slice(-TODAY_TASK_MAX_UNIT_KEYS) : []),
      done: t.done === true,
      doneAtMs: typeof t.doneAtMs === 'number' ? t.doneAtMs : null,
      rewardCoins: typeof t.rewardCoins === 'number' && t.rewardCoins >= 0 ? t.rewardCoins : 0,
      rewardStatus: status,
    }));
  }
  return Object.freeze({ schemaVersion: 1 as const, ownerKey: v.ownerKey, dayKey: v.dayKey, tasks: Object.freeze(tasks) });
}
