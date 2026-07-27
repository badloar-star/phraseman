// ═══════════════════════════════════════════════════════════════════════════
// tournament_core.ts — чистая логика режима «Турниры» (Фаза 1 MVP).
// Спека: docs/tournaments/2026-07-21-tournaments-mode-spec.md (§5, §7, §8, §11).
//
// Здесь НЕТ Firestore/CF — только типы, константы и детерминированная
// математика (seed-рандом, скоринг, стейт-машина, призы, сезонные очки,
// банк, генератор бот-персон). IO живёт в tournaments.ts / tournament_bots.ts,
// чтобы этот модуль был полностью покрыт юнит-тестами без эмулятора.
// ═══════════════════════════════════════════════════════════════════════════

import {
  DEFAULT_TOURNAMENT_ECONOMY,
  tournamentPayouts,
  tournamentPot,
  type TournamentEconomyConfig,
} from './tournament_economy';

// ── Коллекции ───────────────────────────────────────────────────────────────

export const TOURNAMENT_SCHEDULE_COLLECTION = 'tournamentSchedule';
export const TOURNAMENT_SCHEDULE_CONFIG_DOC = 'config';
export const TOURNAMENT_ROOMS_COLLECTION = 'tournamentRooms';
export const TOURNAMENT_TASKS_COLLECTION = 'tournamentTasks';
export const TOURNAMENT_TASK_SECRETS_SUBCOLLECTION = 'taskSecrets';
export const TOURNAMENT_SEASONS_COLLECTION = 'tournamentSeasons';
export const TOURNAMENT_SEASON_ENTRIES_SUBCOLLECTION = 'entries';
export const TOURNAMENT_BANK_COLLECTION = 'tournamentBank';
export const BOT_PROFILES_COLLECTION = 'botProfiles';
export const TOURNAMENT_TICKETS_DOC = 'tickets';
export const TOURNAMENT_REWARD_CLAIMS_SUBCOLLECTION = 'reward_claims';
/** Server-only tournament receipts. Unlike legacy reward_claims, clients cannot create these. */
export const TOURNAMENT_RECEIPTS_SUBCOLLECTION = 'tournament_receipts';

// ── Размеры и лимиты (§3, §11 cost-контролы) ────────────────────────────────

export const TOURNAMENT_ROOM_SIZE = 16;
export const TOURNAMENT_MIN_REAL_PLAYERS = 8;
export const TOURNAMENT_ROUNDS = 4;
export const TOURNAMENT_LOBBY_OPEN_MS = 5 * 60 * 1000; // лобби за 5 мин до старта (§2)
// зачем 2026-07-27: было 10 минут — комната существовала лишь 10 мин в сутки
// на слот, и владелец, заходя в любое другое время, упирался в «Не удалось
// войти» (комнаты за кнопкой просто нет). Сутки вперёд: комната ждёт игрока
// весь день, лобби всё равно открывается за 5 мин до старта, стоимость —
// 3 документа в день (создание идёт транзакцией с проверкой существования).
export const TOURNAMENT_CREATE_AHEAD_MS = 24 * 60 * 60 * 1000; // комнаты на сутки вперёд
export const TOURNAMENT_FILL_BOTS_AHEAD_MS = 2 * 60 * 1000; // два тика минутного scheduler до старта
export const TOURNAMENT_FILL_CANCELLATION_CUTOFF_MS = 30 * 1000;
export const TOURNAMENT_CANCEL_COMPENSATION_GEMS = 3; // «за ожидание» (§2)
export const TOURNAMENT_TABLE_DISPLAY_MS = 12 * 1000;
export const TOURNAMENT_FINAL_DISPLAY_MS = 5 * 1000;
export const TOURNAMENT_RESULTS_DISPLAY_MS = 5 * 1000;
export const TOURNAMENT_REWARD_CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000;
export const TOURNAMENT_ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ── Расписание (§2) ─────────────────────────────────────────────────────────

export type TournamentSlotConfig = {
  slotId: string;
  /** Локальное время старта, "HH:MM" (12:00 / 19:00 / 21:00). */
  localTime: string;
  /** IANA-таймзона слота. Для скелета региональность держим конфигом, не гео-роутингом. */
  timezone: string;
  /** Стоимость входа в билетах (обычный 1, VIP воскресный 5 — фаза 2). */
  ticketsRequired: number;
  enabled: boolean;
};

export type TournamentScheduleConfig = {
  slots: TournamentSlotConfig[];
  /** Один бесплатный вход в неделю для всех (§4). */
  freeWeeklyEntry: boolean;
  /** Стоимость одного билета в 💎 для банка/покупки (малые числа, §4). */
  ticketGemValue: number;
};

export const DEFAULT_TOURNAMENT_SCHEDULE: TournamentScheduleConfig = Object.freeze({
  slots: [
    { slotId: 'daily_1200', localTime: '12:00', timezone: 'Europe/Moscow', ticketsRequired: 1, enabled: true },
    { slotId: 'daily_1900', localTime: '19:00', timezone: 'Europe/Moscow', ticketsRequired: 1, enabled: true },
    { slotId: 'daily_2100', localTime: '21:00', timezone: 'Europe/Moscow', ticketsRequired: 1, enabled: true },
  ],
  freeWeeklyEntry: true,
  ticketGemValue: 10,
});

export function normalizeTournamentSchedule(raw: unknown): TournamentScheduleConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { slots: [], freeWeeklyEntry: false, ticketGemValue: 0 };
  }
  const data = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const rawSlots = Array.isArray(data.slots) ? data.slots : [];
  const slots: TournamentSlotConfig[] = [];
  const seenSlotIds = new Set<string>();
  for (const entry of rawSlots) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const slotId = String(e.slotId ?? '').trim().slice(0, 60);
    const localTime = String(e.localTime ?? '').trim();
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(localTime);
    const timezone = String(e.timezone ?? '').trim().slice(0, 60);
    let timezoneValid = false;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0);
      timezoneValid = true;
    } catch {
      timezoneValid = false;
    }
    if (!slotId || seenSlotIds.has(slotId) || !timeMatch || Number(timeMatch[1]) > 23
      || Number(timeMatch[2]) > 59 || !timezoneValid) continue;
    seenSlotIds.add(slotId);
    slots.push({
      slotId,
      localTime,
      timezone,
      ticketsRequired: Math.max(1, Math.trunc(Number(e.ticketsRequired)) || 1),
      enabled: e.enabled === true,
    });
  }
  return {
    slots,
    freeWeeklyEntry: data.freeWeeklyEntry === true,
    ticketGemValue: Math.max(0, Math.trunc(Number(data.ticketGemValue)) || 0),
  };
}

/** Детерминированный id комнаты: повторный запуск scheduler'а не создаёт дубль. */
export function tournamentRoomId(slotId: string, timezone: string, dateKey: string): string {
  return `${slotId}_${timezone.replace(/[^\w]/g, '_')}_${dateKey}`.slice(0, 140);
}

// ── Кураторские наборы заданий ──────────────────────────────────────────────

/**
 * зачем: владелец хочет вручную отбирать конкретные задания для конкретного
 * турнира. Документ-набор живёт под id комнаты (tournamentRoomId): раунды из
 * набора имеют приоритет над случайной выборкой selectRoundTasks; раунды, не
 * указанные в наборе, добираются случайно как обычно. Набор — мягкая
 * подсказка: если задание из набора исчезло/снято с публикации, раунд
 * откатывается на случайную выборку, а не отменяет турнир.
 */
export const TOURNAMENT_CURATED_COLLECTION = 'tournamentCuratedSets';

export type TournamentCuratedRound = {
  roundNo: number;
  taskIds: string[];
};

export type TournamentCuratedSet = {
  slotId: string;
  timezone: string;
  dateKey: string;
  rounds: TournamentCuratedRound[];
};

export function normalizeTournamentCuratedSet(raw: unknown): TournamentCuratedSet | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;
  const slotId = String(data.slotId ?? '').trim().slice(0, 60);
  const timezone = String(data.timezone ?? '').trim().slice(0, 60);
  const dateKey = String(data.dateKey ?? '').trim();
  if (!slotId || !timezone || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const rawRounds = Array.isArray(data.rounds) ? data.rounds : [];
  if (rawRounds.length > TOURNAMENT_ROUNDS) return null;
  const seenRounds = new Set<number>();
  const rounds: TournamentCuratedRound[] = [];
  for (const entry of rawRounds) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const e = entry as Record<string, unknown>;
    const roundNo = Number(e.roundNo);
    if (!Number.isInteger(roundNo) || roundNo < 1 || roundNo > TOURNAMENT_ROUNDS
      || seenRounds.has(roundNo)) return null;
    const idsRaw = Array.isArray(e.taskIds) ? e.taskIds : [];
    const taskIds = idsRaw.map((id) => String(id ?? '').trim());
    if (taskIds.length === 0 || taskIds.length > TOURNAMENT_TASK_LIMITS.maxTaskIdsPerRound
      || new Set(taskIds).size !== taskIds.length
      || taskIds.some((id) => id.length === 0
        || Buffer.byteLength(id, 'utf8') > TOURNAMENT_TASK_LIMITS.taskIdBytes)) return null;
    seenRounds.add(roundNo);
    rounds.push({ roundNo, taskIds });
  }
  return { slotId, timezone, dateKey, rounds };
}

/** Дата YYYY-MM-DD в таймзоне слота (без Intl-полифиллов — через toLocaleString). */
export function dateKeyInTimezone(nowMs: number, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(nowMs));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return new Date(nowMs).toISOString().slice(0, 10);
  }
}

/** Момент старта слота (ms) для данной даты в таймзоне. Аппроксимация через смещение. */
export function slotStartMs(dateKey: string, localTime: string, timezone: string): number {
  const guessUtc = Date.parse(`${dateKey}T${localTime}:00Z`);
  try {
    const asLocal = new Date(new Date(guessUtc).toLocaleString('en-US', { timeZone: timezone }));
    const asUtc = new Date(new Date(guessUtc).toLocaleString('en-US', { timeZone: 'UTC' }));
    const offsetMs = asLocal.getTime() - asUtc.getTime();
    return guessUtc - offsetMs;
  } catch {
    return guessUtc;
  }
}

// ── Стейт-машина комнаты (§11) ──────────────────────────────────────────────

export const TOURNAMENT_STATES = [
  'scheduled', 'lobby',
  'round1', 'table1',
  'round2', 'table2',
  'round3', 'table3',
  'round4', 'final',
  'results', 'rewards', 'closed',
] as const;

export type TournamentState = typeof TOURNAMENT_STATES[number];

/** Отдельный терминал при отмене (мало живых игроков) — вне happy-path цепочки. */
export const TOURNAMENT_STATE_CANCELLED = 'cancelled' as const;

const STATE_ORDER: Readonly<Record<TournamentState, number>> = Object.freeze(
  TOURNAMENT_STATES.reduce((acc, s, i) => ({ ...acc, [s]: i }), {} as Record<TournamentState, number>),
);

export function isTournamentState(value: unknown): value is TournamentState {
  return typeof value === 'string' && (TOURNAMENT_STATES as readonly string[]).includes(value);
}

/** Единственный разрешённый переход — строго на следующее состояние. */
export function canTransitionTournament(from: unknown, to: unknown): boolean {
  if (!isTournamentState(from) || !isTournamentState(to)) return false;
  return STATE_ORDER[to] === STATE_ORDER[from] + 1;
}

export function nextTournamentState(from: TournamentState): TournamentState | null {
  const idx = STATE_ORDER[from];
  return idx < TOURNAMENT_STATES.length - 1 ? TOURNAMENT_STATES[idx + 1] : null;
}

/** Отмена разрешена только до начала раундов (пока можно честно вернуть билеты). */
export function canCancelTournament(state: unknown): boolean {
  return state === 'scheduled' || state === 'lobby';
}

export function roundStateFor(roundNo: number): TournamentState | null {
  if (roundNo < 1 || roundNo > TOURNAMENT_ROUNDS) return null;
  return `round${roundNo}` as TournamentState;
}

export function tableStateFor(roundNo: number): TournamentState | null {
  if (roundNo < 1 || roundNo > TOURNAMENT_ROUNDS - 1) return null;
  return `table${roundNo}` as TournamentState;
}

/** The next persisted state after a server deadline. No table/final/results state is skipped. */
export function stateAfterTournamentDeadline(state: TournamentState): TournamentState | null {
  if (/^round[1-3]$/.test(state)) return `table${state.slice(-1)}` as TournamentState;
  if (/^table[1-3]$/.test(state)) return `round${Number(state.slice(-1)) + 1}` as TournamentState;
  if (state === 'round4') return 'final';
  if (state === 'final') return 'results';
  if (state === 'results') return 'rewards';
  if (state === 'rewards') return 'closed';
  return null;
}

export function stateDeadlineDurationMs(
  state: TournamentState,
  taskCount = 0,
  maxMsPerTask = 10_000,
): number | null {
  if (/^round[1-4]$/.test(state)) return Math.max(1, taskCount) * Math.max(1, maxMsPerTask);
  if (/^table[1-3]$/.test(state)) return TOURNAMENT_TABLE_DISPLAY_MS;
  if (state === 'final') return TOURNAMENT_FINAL_DISPLAY_MS;
  if (state === 'results') return TOURNAMENT_RESULTS_DISPLAY_MS;
  if (state === 'rewards') return TOURNAMENT_REWARD_CLAIM_WINDOW_MS;
  return null;
}

// ── Комната / игроки / раунды (§11) ─────────────────────────────────────────

export type TournamentPlayer = {
  /** uid живого игрока ИЛИ botId (isBot=true). */
  id: string;
  isBot?: boolean;
  name: string;
  avatar: string;
  color: string;
  score: number;
  /** Серия правильных ответов без ошибок (для стрик-множителя). */
  streak: number;
  /** Билет возвращён при отмене (только живые). */
  refunded?: boolean;
  /** Immutable join provenance used for exact cancellation refunds. */
  entry?: TournamentEntryProvenance;
  /** Snapshot of the seeded bot profile; avoids mutable profile reads mid-room. */
  botWinRate?: number;
};

export type TournamentEntryProvenance = {
  kind: 'ticket' | 'free_weekly';
  ticketsSpent: number;
  bankContributionGems: number;
  weekId: string;
};

export type TournamentRoundResult = {
  playerId: string;
  correct: number;
  total: number;
  roundScore: number;
  submittedAtMs: number;
  /** Compatible lifecycle marker; timedOut remains for older room documents. */
  submissionStatus?: 'submitted' | 'timed_out' | 'simulated';
  /** Streak snapshot restored when an on-time submit races a timeout write. */
  streakBefore?: number;
  /** Original round clock anchor retained across the following table/final state. */
  roundStartedAtMs?: number;
  timedOut?: boolean;
};

export type TournamentRound = {
  roundNo: number;
  mode: string;
  taskIds: string[];
  /** Safe client payload; answer keys and voice references are never present. */
  tasks?: TournamentPublicTask[];
  results: Record<string, TournamentRoundResult>;
};

export type TournamentRoomDoc = {
  /** Банк турнира в жемчужинах: сумма взносов всех участников. */
  potGems?: number;
  roomId: string;
  slotId: string;
  seed: string;
  state: TournamentState | typeof TOURNAMENT_STATE_CANCELLED;
  startsAt: number;
  /** Immutable room admission price; used as a conservative legacy refund fallback. */
  ticketsRequired?: number;
  players: TournamentPlayer[];
  rounds: TournamentRound[];
  /** Оптимистичная блокировка для гонок join/fill/finalize. */
  version: number;
  createdAtMs: number;
  stateStartedAtMs?: number;
  stateDeadlineAtMs?: number;
  /** Operational scheduler retry gate; never changes the authoritative state deadline. */
  lifecycleRetryAtMs?: number;
  ready?: boolean;
  participantAuthUids?: string[];
  /** True only when every real participant auth identity is fully backfilled. */
  participantAuthUidsComplete?: boolean;
  closedAtMs?: number;
  expireAtMs?: number;
  cancelledAtMs?: number;
  cancelReason?: string;
  cancellationReceiptId?: string;
  finalizationReceiptId?: string;
};

// ── Пул заданий (§6) ────────────────────────────────────────────────────────

export type TournamentTask = {
  taskId: string;
  /** Режим Learning v2 (quiz/flashcard/voice/...), голосовые ×1.5 базы (§5). */
  mode: string;
  isVoice: boolean;
  difficulty: number;
  payload: Record<string, unknown>;
  tags: string[];
  verified: boolean;
};

export type TournamentTaskKind = 'choice' | 'translate' | 'timeattack' | 'voice';

export type TournamentPublicTask = {
  taskId: string;
  mode: string;
  kind: TournamentTaskKind;
  isVoice: boolean;
  difficulty: number;
  payload: Record<string, unknown>;
};

type TaskValidation = { ok: true; kind: TournamentTaskKind } | { ok: false; reason: string };

export const TOURNAMENT_TASK_LIMITS = Object.freeze({
  taskIdBytes: 160,
  modeBytes: 40,
  phraseBytes: 512,
  promptBytes: 512,
  referenceBytes: 1_024,
  answerBytes: 1_024,
  optionBytes: 128,
  tokenBytes: 128,
  tagBytes: 64,
  maxTags: 12,
  maxWordBankItems: 32,
  maxCorrectTokens: 32,
  maxTimeattackItems: 8,
  maxTimeattackOptions: 6,
  maxTaskIdsPerRound: 8,
  maxTaskSecrets: 32,
});

/** Aggregate guard is deliberately far below Firestore's 1 MiB document limit. */
export const TOURNAMENT_FILL_SERIALIZED_BUDGET_BYTES = 384 * 1_024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function boundedString(value: unknown, maxBytes: number): value is string {
  return nonEmptyString(value) && Buffer.byteLength(value as string, 'utf8') <= maxBytes;
}

function boundedStringArray(
  value: unknown,
  options: { maxItems: number; maxItemBytes: number; allowEmpty?: boolean },
): value is string[] {
  return Array.isArray(value)
    && (options.allowEmpty === true || value.length > 0)
    && value.length <= options.maxItems
    && value.every((entry) => boundedString(entry, options.maxItemBytes));
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowlist = new Set(allowed);
  return Object.keys(value).every((key) => allowlist.has(key));
}

function taskKind(task: TournamentTask): TournamentTaskKind {
  const mode = String(task.mode || '').toLowerCase();
  if (task.isVoice || mode.includes('voice')) return 'voice';
  if (mode.includes('time')) return 'timeattack';
  if (mode.includes('translate')) return 'translate';
  return 'choice';
}

/** Fail-closed task contract. Only human-verified tasks with a complete answer key may run. */
export function validateTournamentTask(task: TournamentTask): TaskValidation {
  if (task?.verified !== true) return { ok: false, reason: 'task_not_verified' };
  if (!boundedString(task.taskId, TOURNAMENT_TASK_LIMITS.taskIdBytes)
    || !boundedString(task.mode, TOURNAMENT_TASK_LIMITS.modeBytes)
    || !isRecord(task.payload)) {
    return { ok: false, reason: 'task_identity_invalid' };
  }
  if (!boundedStringArray(task.tags, {
    maxItems: TOURNAMENT_TASK_LIMITS.maxTags,
    maxItemBytes: TOURNAMENT_TASK_LIMITS.tagBytes,
    allowEmpty: true,
  })) return { ok: false, reason: 'task_tags_invalid' };
  if (!Number.isInteger(task.difficulty) || task.difficulty < 1 || task.difficulty > 3) {
    return { ok: false, reason: 'task_difficulty_invalid' };
  }
  const kind = taskKind(task);
  if (kind === 'voice') {
    if (!hasOnlyKeys(task.payload, ['phrase', 'reference'])) {
      return { ok: false, reason: 'task_payload_fields_invalid' };
    }
    if (task.isVoice !== true
      || !boundedString(task.payload.phrase, TOURNAMENT_TASK_LIMITS.phraseBytes)
      || !boundedString(task.payload.reference, TOURNAMENT_TASK_LIMITS.referenceBytes)) {
      return { ok: false, reason: 'voice_contract_invalid' };
    }
    return { ok: true, kind };
  }
  if (kind === 'translate') {
    if (!hasOnlyKeys(task.payload, ['phrase', 'wordBank', 'correctTokens', 'correctAnswer'])) {
      return { ok: false, reason: 'task_payload_fields_invalid' };
    }
    const correctTokens = boundedStringArray(task.payload.correctTokens, {
      maxItems: TOURNAMENT_TASK_LIMITS.maxCorrectTokens,
      maxItemBytes: TOURNAMENT_TASK_LIMITS.tokenBytes,
    });
    const correctAnswer = boundedString(task.payload.correctAnswer, TOURNAMENT_TASK_LIMITS.answerBytes);
    if (!boundedString(task.payload.phrase, TOURNAMENT_TASK_LIMITS.phraseBytes)
      || !boundedStringArray(task.payload.wordBank, {
        maxItems: TOURNAMENT_TASK_LIMITS.maxWordBankItems,
        maxItemBytes: TOURNAMENT_TASK_LIMITS.tokenBytes,
      })
      || (!correctTokens && !correctAnswer)) {
      return { ok: false, reason: 'translate_contract_invalid' };
    }
    return { ok: true, kind };
  }
  if (kind === 'timeattack') {
    if (!hasOnlyKeys(task.payload, ['prompt', 'items'])) {
      return { ok: false, reason: 'task_payload_fields_invalid' };
    }
    const items = task.payload.items;
    if (!boundedString(task.payload.prompt, TOURNAMENT_TASK_LIMITS.promptBytes)
      || !Array.isArray(items) || items.length === 0
      || items.length > TOURNAMENT_TASK_LIMITS.maxTimeattackItems
      || items.some((item) => {
      if (!isRecord(item) || !hasOnlyKeys(item, ['prompt', 'options', 'correctIndex'])
        || !boundedString(item.prompt, TOURNAMENT_TASK_LIMITS.promptBytes)
        || !boundedStringArray(item.options, {
          maxItems: TOURNAMENT_TASK_LIMITS.maxTimeattackOptions,
          maxItemBytes: TOURNAMENT_TASK_LIMITS.optionBytes,
        })
        || item.options.length < 2 || !Number.isInteger(item.correctIndex)) return true;
      const index = Number(item.correctIndex);
      return index < 0 || index >= item.options.length;
    })) return { ok: false, reason: 'timeattack_contract_invalid' };
    return { ok: true, kind };
  }
  if (!hasOnlyKeys(task.payload, ['phrase', 'options', 'correctIndex', 'correctAnswer'])) {
    return { ok: false, reason: 'task_payload_fields_invalid' };
  }
  const options = task.payload.options;
  const correctIndex = task.payload.correctIndex;
  const optionalCorrectAnswer = task.payload.correctAnswer;
  if (!boundedString(task.payload.phrase, TOURNAMENT_TASK_LIMITS.phraseBytes)
    || !boundedStringArray(options, { maxItems: 4, maxItemBytes: TOURNAMENT_TASK_LIMITS.optionBytes })
    || options.length !== 4 || !Number.isInteger(correctIndex)
    || (optionalCorrectAnswer !== undefined
      && !boundedString(optionalCorrectAnswer, TOURNAMENT_TASK_LIMITS.answerBytes))
    || Number(correctIndex) < 0 || Number(correctIndex) >= options.length) {
    return { ok: false, reason: 'choice_contract_invalid' };
  }
  return { ok: true, kind };
}

function publicPayloadForTask(task: TournamentTask, kind: TournamentTaskKind): Record<string, unknown> {
  if (kind === 'choice') {
    return {
      phrase: String(task.payload.phrase),
      options: (task.payload.options as string[]).slice(),
    };
  }
  if (kind === 'translate') {
    return {
      phrase: String(task.payload.phrase),
      wordBank: (task.payload.wordBank as string[]).slice(),
    };
  }
  if (kind === 'timeattack') {
    return {
      prompt: String(task.payload.prompt),
      items: (task.payload.items as Record<string, unknown>[]).map((item) => ({
        prompt: String(item.prompt),
        options: (item.options as string[]).slice(),
      })),
    };
  }
  return { phrase: String(task.payload.phrase) };
}

export function toPublicTournamentTask(task: TournamentTask): TournamentPublicTask | null {
  const validation = validateTournamentTask(task);
  if (!validation.ok) return null;
  return {
    taskId: task.taskId,
    mode: task.mode,
    kind: validation.kind,
    isVoice: task.isVoice,
    difficulty: task.difficulty,
    payload: publicPayloadForTask(task, validation.kind),
  };
}

/**
 * Reads an immutable task snapshot without converting infrastructure errors
 * into missing data. A rejected read propagates; only a proven absent or
 * invalid task returns null so callers may choose a safe cancellation path.
 */
export async function loadCompleteTournamentTasks(
  taskIds: string[],
  readTask: (taskId: string) => Promise<TournamentTask | null>,
): Promise<TournamentTask[] | null> {
  const unique = Array.from(new Set(taskIds.filter(Boolean)));
  const tasks = await Promise.all(unique.map(readTask));
  if (tasks.length !== unique.length || tasks.some((task) => task === null)) return null;
  return tasks as TournamentTask[];
}

function stableJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(null);
}

export type TournamentFillMutationValidation =
  | { ok: true; serializedBytes: number }
  | { ok: false; reason: 'fill_rounds_invalid' | 'fill_tasks_invalid' | 'fill_players_invalid' | 'fill_size_budget_exceeded'; serializedBytes: number };

/**
 * Deterministically budgets the entire fill write-set, not just the room doc.
 * Counting taskSecrets as part of the same envelope adds a conservative margin
 * on top of the 384 KiB cap and prevents a valid-looking pool from failing at commit.
 */
export function validateTournamentFillMutation(input: {
  room: TournamentRoomDoc;
  rounds: TournamentRound[];
  selectedTasks: TournamentTask[];
  botPlayers: TournamentPlayer[];
  privateBotMetadata?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): TournamentFillMutationValidation {
  const invalidRounds = input.rounds.length !== 4 || input.rounds.some((round) => (
    !Number.isInteger(round.roundNo)
    || !boundedString(round.mode, TOURNAMENT_TASK_LIMITS.modeBytes)
    || !Array.isArray(round.taskIds)
    || round.taskIds.length === 0
    || round.taskIds.length > TOURNAMENT_TASK_LIMITS.maxTaskIdsPerRound
    || !round.taskIds.every((taskId) => boundedString(taskId, TOURNAMENT_TASK_LIMITS.taskIdBytes))
    || new Set(round.taskIds).size !== round.taskIds.length
    || (round.tasks !== undefined && (!Array.isArray(round.tasks) || round.tasks.length !== round.taskIds.length))
  ));
  if (invalidRounds) return { ok: false, reason: 'fill_rounds_invalid', serializedBytes: 0 };
  if (input.selectedTasks.length === 0
    || input.selectedTasks.length > TOURNAMENT_TASK_LIMITS.maxTaskSecrets
    || new Set(input.selectedTasks.map((task) => task.taskId)).size !== input.selectedTasks.length
    || input.selectedTasks.some((task) => !validateTournamentTask(task).ok)) {
    return { ok: false, reason: 'fill_tasks_invalid', serializedBytes: 0 };
  }
  const selectedIds = new Set(input.selectedTasks.map((task) => task.taskId));
  if (input.rounds.some((round) => round.taskIds.some((taskId) => !selectedIds.has(taskId)))) {
    return { ok: false, reason: 'fill_tasks_invalid', serializedBytes: 0 };
  }
  if (input.room.players.length + input.botPlayers.length > TOURNAMENT_ROOM_SIZE) {
    return { ok: false, reason: 'fill_players_invalid', serializedBytes: 0 };
  }
  const envelope = {
    roomMutation: {
      ...input.room,
      players: [...input.room.players, ...input.botPlayers],
      rounds: input.rounds,
      ...(input.metadata || {}),
    },
    taskSecrets: input.selectedTasks.slice().sort((left, right) => left.taskId.localeCompare(right.taskId)),
    privateBotMetadata: input.privateBotMetadata,
  };
  const serializedBytes = Buffer.byteLength(stableJson(envelope), 'utf8');
  return serializedBytes <= TOURNAMENT_FILL_SERIALIZED_BUDGET_BYTES
    ? { ok: true, serializedBytes }
    : { ok: false, reason: 'fill_size_budget_exceeded', serializedBytes };
}

function normalizedTokens(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((token) => typeof token !== 'string')) return null;
  return value.map((token) => token.trim()).filter(Boolean);
}

/** Server answer normalization. Voice is deliberately disabled until evidence is server-verifiable. */
export function verifyTournamentAnswer(task: TournamentTask, answer: unknown): boolean {
  const validation = validateTournamentTask(task);
  if (!validation.ok || validation.kind === 'voice' || !isRecord(answer)) return false;
  if (validation.kind === 'choice') {
    return Number.isInteger(answer.selectedIndex) && answer.selectedIndex === task.payload.correctIndex;
  }
  if (validation.kind === 'translate') {
    const given = normalizedTokens(answer.tokens);
    if (!given) return false;
    const expectedTokens = normalizedTokens(task.payload.correctTokens)
      ?? (nonEmptyString(task.payload.correctAnswer) ? String(task.payload.correctAnswer).trim().split(/\s+/) : null);
    return !!expectedTokens && given.length === expectedTokens.length
      && given.every((token, index) => token === expectedTokens[index]);
  }
  const selected = answer.selectedIndexes;
  const items = task.payload.items as Record<string, unknown>[];
  return Array.isArray(selected) && selected.length === items.length
    && selected.every((index, itemIndex) => Number.isInteger(index) && index === items[itemIndex].correctIndex);
}

export function tournamentFeatureGates(): Record<string, { enabled: false; reason: string }> {
  return {
    voiceScoring: { enabled: false, reason: 'verified_voice_evidence_contract_missing' },
    xpCashback: { enabled: false, reason: 'progress_event_contract_missing' },
    avatarFrameExpiry: { enabled: false, reason: 'avatar_frame_contract_missing' },
    referralTickets: { enabled: false, reason: 'referral_receipt_contract_missing' },
    seasonPayout: { enabled: false, reason: 'season_payout_contract_missing' },
  };
}

/** Чередование режимов раундов (§5): 1 и 3 — одиночный, 2 и 4 — микс. */
export const TOURNAMENT_ROUND_MODE_KINDS = ['single', 'mix', 'single', 'mix'] as const;

// ── Скоринг (§5): база + бонус скорости ≤+40% + стрик ×1.5/×2 ───────────────

export const TOURNAMENT_BASE_SCORE = 100;
export const TOURNAMENT_VOICE_BASE_MULTIPLIER = 1.5;
export const TOURNAMENT_MAX_SPEED_BONUS_RATIO = 0.4;
export const TOURNAMENT_STREAK_X15_THRESHOLD = 3;
export const TOURNAMENT_STREAK_X2_THRESHOLD = 5;

export type ScoreInput = {
  correct: boolean;
  /** Сколько мс игрок отвечал. */
  elapsedMs: number;
  /** Лимит времени на вопрос, мс (из конфига раунда). */
  maxMs: number;
  /** Серия правильных ДО этого ответа. */
  streakBefore: number;
  isVoice: boolean;
  baseScore?: number;
};

export function serverBoundedElapsedMs(input: {
  stateStartedAtMs: number;
  receivedAtMs: number;
  taskCount: number;
  maxMsPerTask: number;
}): number {
  const maxMs = Math.max(1, Math.trunc(input.maxMsPerTask));
  const count = Math.max(1, Math.trunc(input.taskCount));
  const raw = input.receivedAtMs - input.stateStartedAtMs;
  if (!Number.isFinite(raw) || raw < 0) return maxMs;
  return Math.min(maxMs, Math.max(0, Math.ceil(raw / count)));
}

/**
 * Очки за один ответ.
 * - неверный ответ = 0 (и сброс серии на уровне раунда);
 * - база 100, голосовые задания ×1.5 (компенсация времени ответа, §5);
 * - бонус скорости линейный до +40% (мгновенный ответ = полный бонус);
 * - стрик-множитель применяется к (база+бонус): ×1.5 с серии 3, ×2 с серии 5.
 */
export function scoreAnswer(input: ScoreInput): number {
  if (!input.correct) return 0;
  const base = Math.max(1, Math.trunc(input.baseScore ?? TOURNAMENT_BASE_SCORE));
  const baseWithVoice = base * (input.isVoice ? TOURNAMENT_VOICE_BASE_MULTIPLIER : 1);
  const maxMs = Math.max(1, input.maxMs);
  const elapsed = Math.min(Math.max(0, input.elapsedMs), maxMs);
  const speedBonus = baseWithVoice * TOURNAMENT_MAX_SPEED_BONUS_RATIO * (1 - elapsed / maxMs);
  // streakBefore — серия ДО этого ответа; текущий ответ = streakBefore + 1.
  // ×1.5 начинается с 3-го правильного подряд, ×2 — с 5-го (§5).
  const streakWithCurrent = input.streakBefore + 1;
  const streakMult = streakWithCurrent >= TOURNAMENT_STREAK_X2_THRESHOLD
    ? 2
    : streakWithCurrent >= TOURNAMENT_STREAK_X15_THRESHOLD
      ? 1.5
      : 1;
  return Math.round((baseWithVoice + speedBonus) * streakMult);
}

/** Итог раунда: очки и новая серия. Неверный ответ сбрасывает серию. */
export function scoreRound(answers: ScoreInput[]): { roundScore: number; streakAfter: number } {
  let roundScore = 0;
  let streak = 0;
  for (const a of answers) {
    const effective = { ...a, streakBefore: a.correct ? streak : a.streakBefore };
    roundScore += scoreAnswer(effective);
    streak = a.correct ? streak + 1 : 0;
  }
  return { roundScore, streakAfter: streak };
}

function scoreInputsWithStartingStreak(
  answers: ScoreInput[],
  streakStart: number,
): { roundScore: number; correct: number; streakAfter: number } {
  let roundScore = 0;
  let correct = 0;
  let streak = Math.max(0, streakStart);
  for (const answer of answers) {
    roundScore += scoreAnswer({ ...answer, streakBefore: streak });
    if (answer.correct) {
      correct += 1;
      streak += 1;
    } else {
      streak = 0;
    }
  }
  return { roundScore, correct, streakAfter: streak };
}

export type TournamentSubmission = {
  playerId: string;
  roundNo: number;
  answers: Array<{ taskId: string; answer: unknown }>;
  tasks: TournamentTask[];
  receivedAtMs: number;
  maxMsPerTask?: number;
};

/**
 * Pure transaction plan for a submission. Firestore retries call this again with
 * the newest room snapshot, so two different players merge and a replay is inert.
 */
export function applyTournamentSubmission(
  room: TournamentRoomDoc,
  submission: TournamentSubmission,
): {
  room: TournamentRoomDoc;
  replay: boolean;
  result: TournamentRoundResult;
  allRealSubmitted: boolean;
} {
  const roundIndex = room.rounds.findIndex((entry) => entry.roundNo === submission.roundNo);
  if (roundIndex < 0) throw new Error('round_not_found');
  const existing = room.rounds[roundIndex].results?.[submission.playerId];
  const replacingTimedOut = existing?.submissionStatus === 'timed_out' || existing?.timedOut === true;
  if (existing && !replacingTimedOut) {
    return { room, replay: true, result: existing, allRealSubmitted: false };
  }
  const activeState = roundStateFor(submission.roundNo);
  if (!activeState) throw new Error('round_not_active');
  if (replacingTimedOut) {
    if (room.state !== stateAfterTournamentDeadline(activeState)) throw new Error('round_closed');
  } else if (room.state !== activeState) {
    throw new Error('round_not_active');
  }
  const deadlineAtMs = replacingTimedOut ? existing.submittedAtMs : room.stateDeadlineAtMs;
  if (deadlineAtMs && submission.receivedAtMs > deadlineAtMs) throw new Error('round_deadline_elapsed');
  const playerIndex = room.players.findIndex((entry) => !entry.isBot && entry.id === submission.playerId);
  if (playerIndex < 0) throw new Error('not_in_room');

  const maxMsPerTask = Math.max(1, Math.trunc(submission.maxMsPerTask ?? 10_000));
  const taskCount = Math.max(1, room.rounds[roundIndex].taskIds.length);
  const roundStartedAtMs = replacingTimedOut
    ? existing.roundStartedAtMs ?? Math.max(0, existing.submittedAtMs - taskCount * maxMsPerTask)
    : room.stateStartedAtMs ?? submission.receivedAtMs;
  const elapsedMs = serverBoundedElapsedMs({
    stateStartedAtMs: roundStartedAtMs,
    receivedAtMs: submission.receivedAtMs,
    taskCount,
    maxMsPerTask,
  });
  const taskMap = new Map(submission.tasks.map((task) => [task.taskId, task]));
  const answerMap = new Map(submission.answers.map((entry) => [entry.taskId, entry.answer]));
  const inputs: ScoreInput[] = room.rounds[roundIndex].taskIds.map((taskId) => {
    const task = taskMap.get(taskId);
    return {
      correct: !!task && verifyTournamentAnswer(task, answerMap.get(taskId)),
      elapsedMs,
      maxMs: maxMsPerTask,
      streakBefore: 0,
      isVoice: task?.isVoice === true,
    };
  });
  const player = room.players[playerIndex];
  const streakBefore = replacingTimedOut ? existing.streakBefore ?? player.streak : player.streak;
  const scored = scoreInputsWithStartingStreak(inputs, streakBefore);
  const result: TournamentRoundResult = {
    playerId: submission.playerId,
    correct: scored.correct,
    total: room.rounds[roundIndex].taskIds.length,
    roundScore: scored.roundScore,
    submittedAtMs: submission.receivedAtMs,
    submissionStatus: 'submitted',
    streakBefore,
    roundStartedAtMs,
  };
  const players = room.players.map((entry, index) => index === playerIndex
    ? {
      ...entry,
      score: entry.score - (replacingTimedOut ? existing.roundScore : 0) + scored.roundScore,
      streak: scored.streakAfter,
    }
    : { ...entry });
  const rounds = room.rounds.map((entry, index) => index === roundIndex
    ? { ...entry, results: { ...(entry.results || {}), [submission.playerId]: result } }
    : { ...entry, results: { ...(entry.results || {}) } });
  const allRealSubmitted = players.filter((entry) => !entry.isBot)
    .every((entry) => !!rounds[roundIndex].results[entry.id]);
  return {
    room: { ...room, players, rounds, version: room.version + 1 },
    replay: false,
    result,
    allRealSubmitted,
  };
}

export function applyTournamentJoin(
  room: TournamentRoomDoc,
  player: TournamentPlayer,
  authUid: string,
  nowMs?: number,
): TournamentRoomDoc {
  if (room.state === TOURNAMENT_STATE_CANCELLED || room.state === 'closed') throw new Error('room_not_joinable');
  const existing = room.players.some((entry) => !entry.isBot && entry.id === player.id);
  if (existing) {
    if (room.participantAuthUids?.includes(authUid)) return room;
    return {
      ...room,
      participantAuthUids: Array.from(new Set([...(room.participantAuthUids || []), authUid])),
      version: room.version + 1,
    };
  }
  if (room.state !== 'lobby') throw new Error('room_not_joinable');
  if (nowMs !== undefined && nowMs >= room.startsAt) throw new Error('join_cutoff_elapsed');
  if (room.players.length >= TOURNAMENT_ROOM_SIZE) throw new Error('room_full');
  return {
    ...room,
    players: [...room.players.map((entry) => ({ ...entry })), { ...player }],
    participantAuthUids: Array.from(new Set([...(room.participantAuthUids || []), authUid])),
    version: room.version + 1,
  };
}

export type TournamentCancellationPlan = {
  room: TournamentRoomDoc;
  receiptId: string;
  alreadyCancelled: boolean;
  refunds: Array<{
    playerId: string;
    tickets: number;
    restoreFreeWeek: string | null;
    bankContributionGems: number;
    compensationGems: number;
  }>;
};

export function planTournamentCancellation(
  room: TournamentRoomDoc,
  reason: string,
  nowMs: number,
  options: { allowActive?: boolean; fallbackTickets?: number } = {},
): TournamentCancellationPlan {
  const receiptId = `tournament_cancel_${room.roomId}`;
  if (room.state === TOURNAMENT_STATE_CANCELLED || room.cancellationReceiptId) {
    return { room, receiptId: room.cancellationReceiptId || receiptId, alreadyCancelled: true, refunds: [] };
  }
  if (!canCancelTournament(room.state) && !options.allowActive) throw new Error('room_not_cancellable');
  const refunds = room.players.flatMap((player) => {
    const refund = cancellationRefundForPlayer(player, { fallbackTickets: options.fallbackTickets });
    return refund ? [{ playerId: player.id, ...refund }] : [];
  });
  return {
    receiptId,
    alreadyCancelled: false,
    refunds,
    room: {
      ...room,
      state: TOURNAMENT_STATE_CANCELLED,
      cancelReason: reason,
      cancelledAtMs: nowMs,
      cancellationReceiptId: receiptId,
      stateStartedAtMs: nowMs,
      stateDeadlineAtMs: undefined,
      players: room.players.map((player) => player.isBot ? { ...player } : { ...player, refunded: true }),
      version: room.version + 1,
    },
  };
}

export function completeTournamentRoundAtDeadline(
  room: TournamentRoomDoc,
  tasks: TournamentTask[],
  nowMs: number,
): { room: TournamentRoomDoc; completedRoundNo: number } {
  const match = /^round([1-4])$/.exec(String(room.state));
  if (!match) throw new Error('round_not_active');
  if (room.stateDeadlineAtMs && nowMs < room.stateDeadlineAtMs) throw new Error('round_deadline_not_elapsed');
  const roundNo = Number(match[1]);
  const roundIndex = room.rounds.findIndex((entry) => entry.roundNo === roundNo);
  if (roundIndex < 0) throw new Error('round_not_found');
  const rounds = room.rounds.map((entry) => ({ ...entry, results: { ...(entry.results || {}) } }));
  const players = room.players.map((entry) => ({ ...entry }));
  const taskMap = new Map(tasks.map((task) => [task.taskId, task]));
  const roundTasks = rounds[roundIndex].taskIds.map((id) => taskMap.get(id)).filter((task): task is TournamentTask => !!task);
  if (roundTasks.length !== rounds[roundIndex].taskIds.length) throw new Error('round_tasks_unavailable');

  for (let index = 0; index < players.length; index += 1) {
    const player = players[index];
    if (rounds[roundIndex].results[player.id]) continue;
    if (!player.isBot) {
      const deadlineAtMs = room.stateDeadlineAtMs ?? nowMs;
      rounds[roundIndex].results[player.id] = {
        playerId: player.id,
        correct: 0,
        total: rounds[roundIndex].taskIds.length,
        roundScore: 0,
        submittedAtMs: deadlineAtMs,
        submissionStatus: 'timed_out',
        streakBefore: player.streak,
        roundStartedAtMs: room.stateStartedAtMs ?? deadlineAtMs,
        timedOut: true,
      };
      players[index] = { ...player, streak: 0 };
      continue;
    }
    const profile: BotProfile = {
      botId: player.id,
      name: player.name,
      avatarEmoji: player.avatar,
      rank: 'silver',
      titles: [],
      winRate: Math.min(0.85, Math.max(0.15, player.botWinRate ?? 0.5)),
      color: player.color,
    };
    const inputs = simulateBotAnswers(profile, { roomId: room.roomId, roundNo, tasks: roundTasks, maxMsPerTask: 10_000 });
    const scored = scoreInputsWithStartingStreak(inputs, player.streak);
    players[index] = { ...player, score: player.score + scored.roundScore, streak: scored.streakAfter };
    rounds[roundIndex].results[player.id] = {
      playerId: player.id,
      correct: scored.correct,
      total: rounds[roundIndex].taskIds.length,
      roundScore: scored.roundScore,
      submittedAtMs: nowMs,
      submissionStatus: 'simulated',
      streakBefore: player.streak,
      roundStartedAtMs: room.stateStartedAtMs ?? nowMs,
    };
  }

  const nextState = stateAfterTournamentDeadline(room.state as TournamentState);
  if (!nextState) throw new Error('round_transition_unavailable');
  const duration = stateDeadlineDurationMs(nextState);
  return {
    completedRoundNo: roundNo,
    room: {
      ...room,
      players,
      rounds,
      state: nextState,
      stateStartedAtMs: nowMs,
      stateDeadlineAtMs: duration === null ? undefined : nowMs + duration,
      version: room.version + 1,
    },
  };
}

export type TournamentFinalizationPlan = {
  room: TournamentRoomDoc;
  receiptId: string;
  alreadyFinalized: boolean;
  /** Сколько жемчужин турнира уходит в недельный банк (доля + неразыгранное). */
  weeklyBankGems?: number;
  playerEffects: Array<{
    playerId: string;
    place: number;
    seasonPoints: number;
    tournamentsPlayed: 1;
    won: boolean;
    reward: TournamentRewardPlan;
  }>;
};

export function planTournamentFinalization(
  room: TournamentRoomDoc,
  nowMs: number,
  economy: TournamentEconomyConfig = DEFAULT_TOURNAMENT_ECONOMY,
): TournamentFinalizationPlan {
  const receiptId = `tournament_finalize_${room.roomId}`;
  if (room.finalizationReceiptId || room.state === 'rewards' || room.state === 'closed') {
    return { room, receiptId: room.finalizationReceiptId || receiptId, alreadyFinalized: true, playerEffects: [] };
  }
  if (room.state !== 'results') throw new Error('room_not_ready_to_finalize');
  if (!room.stateDeadlineAtMs || room.stateDeadlineAtMs <= 0) throw new Error('results_deadline_missing');
  if (nowMs < room.stateDeadlineAtMs) throw new Error('results_visibility_pending');
  const { realPlacements } = computePlacements(room.players);

  // зачем: приз = доля от РЕАЛЬНОГО банка турнира. Считаем состав по самой
  // комнате, а не по накопленному полю: так пересчёт финализации даёт тот же
  // результат, даже если счётчик взносов разошёлся из-за сбоя записи.
  const realCount = room.players.filter((player) => !player.isBot).length;
  const botCount = room.players.length - realCount;
  const pot = tournamentPot(realCount, botCount, economy);
  const { payouts, unclaimedToWeekly } = tournamentPayouts(pot, realPlacements.length, economy);

  const playerEffects = realPlacements.map(({ player, place }) => ({
    playerId: player.id,
    place,
    seasonPoints: seasonPointsForPlace(place),
    tournamentsPlayed: 1 as const,
    won: place === 1,
    reward: tournamentRewardPlan(place, payouts),
  }));
  return {
    receiptId,
    alreadyFinalized: false,
    playerEffects,
    // Сколько уходит в недельный банк: доля с турнира + неразыгранные места.
    weeklyBankGems: pot.toWeeklyBank + unclaimedToWeekly,
    room: {
      ...room,
      state: 'rewards',
      potGems: pot.total,
      finalizationReceiptId: receiptId,
      stateStartedAtMs: nowMs,
      stateDeadlineAtMs: nowMs + TOURNAMENT_REWARD_CLAIM_WINDOW_MS,
      version: room.version + 1,
    },
  };
}

// ── Seeded RNG (§6): seed = roomId + roundNo, детерминированная верификация ──

export function tournamentHash32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — быстрый детерминированный PRNG из 32-битного seed. */
export function tournamentPrng(seed: string): () => number {
  let a = tournamentHash32(seed);
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roundSeed(roomId: string, roundNo: number): string {
  return `${roomId}:${roundNo}`;
}

/** Детерминированный shuffle (Fisher–Yates на seeded PRNG). */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rand = tournamentPrng(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export type TaskSelectionParams = {
  pool: TournamentTask[];
  roomId: string;
  roundNo: number;
  count: number;
  /** 'single' — один режим на раунд; 'mix' — любые режимы. */
  modeKind: 'single' | 'mix';
};

/**
 * Детерминированный выбор заданий раунда из пула. Один и тот же
 * (roomId, roundNo, pool) всегда даёт один и тот же сет — сервер верифицирует
 * ответы по тому же seed (§6).
 */
export function selectRoundTasks(params: TaskSelectionParams): TournamentTask[] {
  const { pool, roomId, roundNo, count, modeKind } = params;
  const seed = roundSeed(roomId, roundNo);
  const allowedDifficulties = roundNo === 1 ? [1]
    : roundNo === 2 ? [1, 2]
      : roundNo === 3 ? [2]
        : roundNo === 4 ? [2, 3]
          : [];
  const voiceEnabled = Boolean(tournamentFeatureGates().voiceScoring.enabled);
  const verified = pool.filter((candidate) => {
    const validation = validateTournamentTask(candidate);
    return validation.ok
      && (validation.kind !== 'voice' || voiceEnabled)
      && allowedDifficulties.includes(candidate.difficulty);
  });
  let candidates = verified;
  if (modeKind === 'single' && verified.length > 0) {
    // зачем 2026-07-27: режим выбирался среди ВСЕХ встреченных, включая те, где
    // заданий меньше, чем нужно раунду — тогда buildRounds возвращал null и
    // комната отменялась, хотя пул в целом был полон. Теперь жребий бросается
    // только среди режимов, которые реально закрывают раунд; если ни один не
    // закрывает — раунд играется смешанным, лишь бы турнир состоялся.
    const byMode = new Map<string, TournamentTask[]>();
    for (const task of verified) {
      const list = byMode.get(task.mode);
      if (list) list.push(task); else byMode.set(task.mode, [task]);
    }
    const complete = Array.from(byMode.entries())
      .filter(([, tasks]) => tasks.length >= count)
      .map(([mode]) => mode)
      .sort();
    if (complete.length > 0) {
      const rand = tournamentPrng(`${seed}:mode`);
      const mode = complete[Math.floor(rand() * complete.length)];
      candidates = verified.filter((t) => t.mode === mode);
    }
  }
  return seededShuffle(candidates, seed).slice(0, Math.max(0, count));
}

// ── Призы (§7) ──────────────────────────────────────────────────────────────

export type TournamentPrize = {
  place: number;
  gems: number;
  ticketBack: boolean;
  titleId?: string;
  avatarFrameId?: string;
};

export const TOURNAMENT_PRIZES: readonly TournamentPrize[] = Object.freeze([
  { place: 1, gems: 50, ticketBack: true, titleId: 'tournament_champion_of_day', avatarFrameId: 'tournament_gold_frame_24h' },
  { place: 2, gems: 25, ticketBack: true },
  { place: 3, gems: 10, ticketBack: false },
]);

export function prizeForPlace(place: number): TournamentPrize | null {
  return TOURNAMENT_PRIZES.find((p) => p.place === place) ?? null;
}

export type TournamentRewardPlan = {
  place: number;
  gems: number;
  tickets: number;
  titleId: string | null;
  pending: {
    xpCashback: 'disabled_pending_progress_event_contract';
    avatarFrameExpiry: 'disabled_pending_avatar_frame_contract';
    referralTickets: 'disabled_pending_referral_receipt_contract';
    seasonPayout: 'disabled_pending_season_payout_contract';
  };
};

/**
 * зачем: приз больше НЕ фиксированный (было 50/25/10 из воздуха). Владелец
 * перевёл экономику на призовой фонд: все 16 участников вносят жемчужины,
 * тройка призёров делит собранное. Суммы приходят параметром potPayouts —
 * их считает tournament_economy.tournamentPayouts из реального банка комнаты.
 * Без параметра (старые комнаты) откатываемся на прежнюю таблицу.
 */
export function tournamentRewardPlan(
  place: number,
  potPayouts?: readonly { readonly place: number; readonly gems: number }[],
): TournamentRewardPlan {
  const prize = prizeForPlace(place);
  const fromPot = potPayouts?.find((payout) => payout.place === place);
  return {
    place,
    gems: fromPot ? fromPot.gems : (prize?.gems ?? 0),
    // Билеты убраны: возврата билета больше нет, приз целиком в жемчужинах.
    tickets: 0,
    titleId: prize?.titleId ?? null,
    pending: {
      xpCashback: 'disabled_pending_progress_event_contract',
      avatarFrameExpiry: 'disabled_pending_avatar_frame_contract',
      referralTickets: 'disabled_pending_referral_receipt_contract',
      seasonPayout: 'disabled_pending_season_payout_contract',
    },
  };
}

export function cancellationRefundForPlayer(player: TournamentPlayer): {
  tickets: number;
  restoreFreeWeek: string | null;
  bankContributionGems: number;
  compensationGems: number;
} | null;
export function cancellationRefundForPlayer(
  player: TournamentPlayer,
  options?: { fallbackTickets?: number },
): {
  tickets: number;
  restoreFreeWeek: string | null;
  bankContributionGems: number;
  compensationGems: number;
} | null;
export function cancellationRefundForPlayer(
  player: TournamentPlayer,
  options: { fallbackTickets?: number } = {},
): {
  tickets: number;
  restoreFreeWeek: string | null;
  bankContributionGems: number;
  compensationGems: number;
} | null {
  if (player.isBot) return null;
  const entry = player.entry;
  return {
    tickets: entry?.kind === 'ticket'
      ? Math.max(0, Math.trunc(entry.ticketsSpent))
      : entry ? 0 : Math.max(0, Math.trunc(options.fallbackTickets ?? 0)),
    restoreFreeWeek: entry?.kind === 'free_weekly' ? entry.weekId : null,
    bankContributionGems: Math.max(0, Math.trunc(entry?.bankContributionGems ?? 0)),
    compensationGems: TOURNAMENT_CANCEL_COMPENSATION_GEMS,
  };
}

export type LegacyTournamentRecoveryAction = 'wait' | 'advance' | 'cancel';

/**
 * Legacy rooms predate persisted deadlines and immutable task snapshots. Once
 * their start has passed, missing evidence is not reconstructed or guessed:
 * the server cancels and refunds them instead of charging or stranding users.
 */
export function legacyTournamentRecoveryAction(
  room: TournamentRoomDoc,
  nowMs: number,
  hasCompleteTaskSecrets: boolean,
): LegacyTournamentRecoveryAction {
  if (room.state === TOURNAMENT_STATE_CANCELLED || room.state === 'closed') return 'wait';
  if (room.state === 'scheduled' || room.state === 'lobby') {
    if (!room.stateDeadlineAtMs) return nowMs < room.startsAt ? 'wait' : 'cancel';
    return nowMs < room.stateDeadlineAtMs ? 'wait' : 'advance';
  }
  if (/^round[1-4]$/.test(room.state) && !hasCompleteTaskSecrets) return 'cancel';
  if (!room.stateDeadlineAtMs) return 'cancel';
  return room.stateDeadlineAtMs <= nowMs ? 'advance' : 'wait';
}

/**
 * Итоговые места. Боты НЕ занимают призовые места (§3): сортировка общая,
 * но призы сдвигаются к живым игрокам.
 */
export function computePlacements(players: TournamentPlayer[]): {
  standings: TournamentPlayer[];
  realPlacements: { player: TournamentPlayer; place: number }[];
} {
  const standings = players.slice().sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const realPlacements = standings
    .filter((p) => !p.isBot)
    .map((player, idx) => ({ player, place: idx + 1 }));
  return { standings, realPlacements };
}

// ── Сезон (§8) ──────────────────────────────────────────────────────────────

export const TOURNAMENT_SEASON_POINTS = Object.freeze({
  place1: 25,
  place2: 15,
  place3: 10,
  participation: 2,
});

export function seasonPointsForPlace(place: number): number {
  if (place === 1) return TOURNAMENT_SEASON_POINTS.place1;
  if (place === 2) return TOURNAMENT_SEASON_POINTS.place2;
  if (place === 3) return TOURNAMENT_SEASON_POINTS.place3;
  return TOURNAMENT_SEASON_POINTS.participation;
}

/** ISO-неделя (та же формула, что currentWeekId в league_chest.ts). */
export function tournamentWeekId(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ── Банк недели (§9, КФ-4) ──────────────────────────────────────────────────

/** 20% стоимости билета в 💎 капает в банк недели. */
export const TOURNAMENT_BANK_RATE = 0.2;

export function bankContributionGems(ticketsSpent: number, ticketGemValue: number): number {
  const raw = Math.max(0, ticketsSpent) * Math.max(0, ticketGemValue) * TOURNAMENT_BANK_RATE;
  return Math.floor(raw);
}

// ── Горячая серия (§9, КФ-7) ────────────────────────────────────────────────

export const TOURNAMENT_HOT_STREAK_TIERS = Object.freeze([
  { wins: 3, reward: 'flame_frame_week' },
  { wins: 5, reward: 'title_unstoppable' },
  { wins: 10, reward: 'legendary_badge_bank_bonus' },
]);

export function nextHotStreak(current: number, won: boolean): number {
  return won ? Math.max(0, current) + 1 : 0;
}

// ── Бот-персоны (§3) ────────────────────────────────────────────────────────

export type BotProfile = {
  botId: string;
  name: string;
  avatarEmoji: string;
  rank: string;
  titles: string[];
  /** Реалистичный винрейт 0.15–0.85, распределение ближе к середине. */
  winRate: number;
  color: string;
};

const BOT_NAMES = [
  'Марина', 'Тёма', 'Соня', 'Дэн', 'Лера', 'Гоша', 'Настя', 'Петрович',
  'Юля', 'Сева', 'Кира', 'Макс', 'Олеся', 'Тимур', 'Вера', 'Гриша',
  'Даша', 'Эльдар', 'Милана', 'Савва', 'Алиса', 'Ратмир', 'Злата', 'Егор',
] as const;

const BOT_EMOJI = ['🦊', '🐼', '🦉', '🐸', '🐯', '🦁', '🐨', '🦜', '🐳', '🦄', '🐝', '🦖'] as const;
const BOT_RANKS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const;
const BOT_COLORS = ['#47C870', '#FFC800', '#FF5B6C', '#16B7D9', '#B78CFF', '#FF9F43'] as const;
const BOT_TITLES = ['Фразовый маньяк', 'Спринтер', 'Тихий охотник', 'Ветеран слотов', 'Словарный запас'] as const;

/** winRate: среднее двух равномерных — треугольное распределение 0.15–0.85. */
export function generateBotProfile(index: number, seed: string): BotProfile {
  const rand = tournamentPrng(`${seed}:bot:${index}`);
  const name = BOT_NAMES[Math.floor(rand() * BOT_NAMES.length)];
  const avatarEmoji = BOT_EMOJI[Math.floor(rand() * BOT_EMOJI.length)];
  const rank = BOT_RANKS[Math.floor(rand() * BOT_RANKS.length)];
  const color = BOT_COLORS[Math.floor(rand() * BOT_COLORS.length)];
  const titlesCount = rand() < 0.4 ? 1 : 0;
  const titles = Array.from({ length: titlesCount }, () => BOT_TITLES[Math.floor(rand() * BOT_TITLES.length)]);
  const winRate = Math.round(((rand() + rand()) / 2) * 70 + 15) / 100;
  return {
    botId: `bot_${String(index + 1).padStart(3, '0')}`,
    name,
    avatarEmoji,
    rank,
    titles,
    winRate: Math.min(0.85, Math.max(0.15, winRate)),
    color,
  };
}

export function generateBotProfiles(count: number, seed: string): BotProfile[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => generateBotProfile(i, seed));
}

/**
 * Детерминированный результат бота за раунд: точность из его winRate,
 * «время ответа» — 30–90% лимита (чем выше winRate, тем быстрее).
 */
export function simulateBotAnswers(bot: BotProfile, params: {
  roomId: string;
  roundNo: number;
  tasks: TournamentTask[];
  maxMsPerTask: number;
}): ScoreInput[] {
  const { roomId, roundNo, tasks, maxMsPerTask } = params;
  const rand = tournamentPrng(`${roundSeed(roomId, roundNo)}:botrun:${bot.botId}`);
  return tasks.map((task) => {
    const correct = rand() < bot.winRate;
    const speedFactor = 0.3 + (1 - bot.winRate) * 0.4 + rand() * 0.2;
    return {
      correct,
      elapsedMs: Math.round(maxMsPerTask * Math.min(0.95, speedFactor)),
      maxMs: maxMsPerTask,
      streakBefore: 0, // реальная серия считается в scoreRound
      isVoice: task.isVoice,
    };
  });
}
