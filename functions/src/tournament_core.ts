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
  normalizeTournamentEconomy,
  tournamentPayouts,
  tournamentPot,
  type TournamentEconomyConfig,
} from './tournament_economy';
import {
  isOwnerApprovedTournamentMode,
  type OwnerApprovedTournamentMode,
} from './tournament_mode_contract';
import { REDDIT_BOT_NAMES } from './tournament_reddit_bot_names';

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
export const TOURNAMENT_PRIVATE_STATE_COLLECTION = 'tournamentPrivateState';
export const TOURNAMENT_POOL_BARRIER_DOC = 'task_pool_generation_v1';
export const TOURNAMENT_POOL_BARRIER_KIND = 'tournament_task_pool_barrier_v1';

// ── Размеры и лимиты (§3, §11 cost-контролы) ────────────────────────────────

export const TOURNAMENT_ROOM_SIZE = 16;
// зачем 2026-07-27: было 8 — комната по расписанию требовала восьмерых ЖИВЫХ,
// иначе крон отменял её за 30 сек до старта (cancelReason=not_enough_players).
// При нынешнем трафике (один активный игрок) это означало, что боевой путь не
// работал НИКОГДА: играть можно было только дев-кнопкой, а в релизе турнир был
// бы мёртв. Порог 1 — комната стартует, как только зашёл хотя бы один живой,
// остальных добирают боты (ровно как в дев-комнате). Поднять обратно, когда
// живых игроков станет достаточно, чтобы собирать комнату без ботов.
export const TOURNAMENT_MIN_REAL_PLAYERS = 1;
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

/**
 * Окно входа в турниры (решение владельца 2026-07-27).
 *
 * зачем: слот — это не «один турнир в 15:20», а ПОЛЧАСА, в течение которых
 * можно зайти. Комнаты набираются волнами: заполнилась одна (16 мест) — сервер
 * заводит следующий шард, и опоздавший попадает в неё, а не упирается в
 * room_full. Один игрок за окно играет РОВНО ОДИН турнир (маркер
 * tournament_last_slot_key), но за день может пройти все окна.
 * Клиент берёт это число с сервера (tournamentWeeklyBankInfo → entryWindowMs),
 * чтобы «таймер до старта» не превращался в мёртвый 00:00 на всё окно.
 */
export const TOURNAMENT_ENTRY_WINDOW_MS = 30 * 60 * 1000;

/**
 * Сколько комната СОБИРАЕТСЯ, прежде чем её начнут добивать ботами.
 *
 * зачем 2026-07-27 (владелец, точные правила): «юзер заходит и ждёт 30 секунд,
 * за которые могут подключиться реальные игроки, после 30 секунд добирается
 * ботами». Отсчёт идёт от ВХОДА ПЕРВОГО ЖИВОГО, а не от времени слота —
 * поэтому ожидание одинаково для всех, кто бы когда ни зашёл.
 * Окно жёсткое: новые живые его НЕ продлевают (решение владельца), иначе
 * время ожидания стало бы непредсказуемым.
 */
export const TOURNAMENT_ROOM_GATHER_MS = 45 * 1000;

/**
 * Сколько длится добор ботами после окна ожидания.
 *
 * зачем (владелец): «после 30 секунд добирается ботами на протяжении следующих
 * 45 секунд (рандомно вразброс), так же в этот зазор ещё могут зайти люди,
 * пока комната не добралась ботами до конца». Итого ожидание для любого
 * вошедшего — не более полутора минут.
 */
export const TOURNAMENT_BOT_FILL_WINDOW_MS = 45 * 1000;

/**
 * Разлёт появления ботов в лобби (владелец: «не должно быть ощущения фальши»).
 *
 * зачем: боты пишутся в комнату ОДНОЙ транзакцией (16 отдельных записей стоили
 * бы денег и рвали бы атомарность), но каждый несёт свой joinAtMs — клиент
 * показывает бота только когда его время наступило. Первая волна заходит сразу
 * (BOT_FIRST_WAVE), остальные растекаются по 2–30 секунд в случайном порядке.
 * Без этого игрок видел: сам один → мгновенно 16 из 16, и сразу понимал, что
 * соперники ненастоящие.
 */
export const TOURNAMENT_BOT_JOIN_SPREAD_MIN_MS = 2 * 1000;
export const TOURNAMENT_BOT_JOIN_SPREAD_MAX_MS = 30 * 1000;
/**
 * Сколько ботов может зайти в ПЕРВЫЕ 30 секунд (окно ожидания живых).
 *
 * зачем 2026-07-27 (владелец: «в эти первые 30 секунд может подключиться тоже
 * до 5 ботов»): пока ждём реальных игроков, комната не должна выглядеть
 * мёртвой — но и забивать её ботами сразу нельзя, иначе живым не останется
 * мест. Пять из шестнадцати — комната ожила, одиннадцать мест ещё свободны.
 */
// Compatibility export for older callers. The current contract reserves no bot
// before the full human-only gather window has elapsed.
export const TOURNAMENT_BOT_FIRST_WAVE = 0;
export const TOURNAMENT_CANCEL_COMPENSATION_GEMS = 3; // «за ожидание» (§2)
export const TOURNAMENT_TABLE_DISPLAY_MS = 5 * 1000;
/** Short result reveal before an all-real-submitted round may advance early. */
export const TOURNAMENT_EARLY_ADVANCE_DELAY_MS = 2 * 1000;
/** Golden Plan [6]/[122]: network-only receive grace; no speed benefit is earned inside it. */
export const TOURNAMENT_TASK_SUBMISSION_GRACE_MS = 1_500;
/** Server-authored prompt-only phase before interaction becomes eligible. */
export const TOURNAMENT_TASK_READING_MS = 1_500;
/** Server-authored authoritative feedback phase before the next task begins. */
export const TOURNAMENT_TASK_FEEDBACK_MS = 1_500;
export const TOURNAMENT_FINAL_DISPLAY_MS = 5 * 1000;
export const TOURNAMENT_RESULTS_DISPLAY_MS = 5 * 1000;
export const TOURNAMENT_REWARD_CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000;
export const TOURNAMENT_ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Server-owned 3-2-1 boundary; task time begins only after it elapses. */
export const TOURNAMENT_ROUND_INTRO_MS = 3_000;

/**
 * Задержка старта дев-комнаты (кнопка владельца «сыграть с ботами сейчас»).
 * зачем 5 секунд: комната уже создаётся заполненной, ждать нечего — нужен лишь
 * зазор, чтобы клиент успел войти и отрисовать лобби до первого раунда.
 */
export const TOURNAMENT_DEV_START_DELAY_MS = 5 * 1000;

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
  /** Temporary server-authoritative access gate for free, on-demand test rooms. */
  testingEnabled?: boolean;
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
    ...(data.testingEnabled === true ? { testingEnabled: true } : {}),
  };
}

export type TournamentRoomAdmissionMode = 'scheduled' | 'test';

function hasZeroEntryEconomySnapshot(
  room: Pick<TournamentRoomDoc, 'economySnapshot'>,
): boolean {
  return !!room.economySnapshot
    && normalizeTournamentEconomy(room.economySnapshot).entryGems === 0;
}

/**
 * New test rooms carry an explicit immutable marker. The constrained fallback
 * recognizes only pre-marker start-now rooms whose persisted economy was fully
 * zero, so a scheduled or paid room cannot become a test room from its id alone.
 */
export function isTournamentTestRoom(
  room: Pick<TournamentRoomDoc, 'roomId' | 'slotId' | 'testMode' | 'economySnapshot'>,
): boolean {
  if (room.testMode === true) return true;
  if (room.testMode === false || !room.economySnapshot) return false;
  if (!room.roomId.startsWith('now-') && !room.slotId.startsWith('now-')) return false;
  const economy = normalizeTournamentEconomy(room.economySnapshot);
  return economy.entryGems === 0 && economy.botEntryGems === 0;
}

/** Resolve admission from immutable room mode and the current server config. */
export function tournamentRoomAdmissionMode(
  room: Pick<TournamentRoomDoc, 'roomId' | 'slotId' | 'ticketsRequired' | 'testMode' | 'economySnapshot'>,
  config: TournamentScheduleConfig,
): TournamentRoomAdmissionMode | null {
  // Test rooms are authenticated, immutable zero-economy rooms. Their access
  // does not depend on the production schedule or an admin runtime switch.
  if (isTournamentTestRoom(room)) return 'test';
  // Historical/forged zero-price scheduled snapshots are quarantined. New paid
  // rooms are pinned to three at creation, so admitting one would revive the
  // free-reward farming path this boundary closes.
  if (hasZeroEntryEconomySnapshot(room)) return null;
  const scheduledSlot = config.slots.some((slot) => slot.slotId === room.slotId && slot.enabled);
  return scheduledSlot || Number(room.ticketsRequired ?? 0) > 0 ? 'scheduled' : null;
}

/** Test rooms never charge users, mint bot-funded prizes, or feed the weekly bank. */
export function tournamentEconomySnapshotForMode(
  raw: unknown,
  testMode: boolean,
): TournamentEconomyConfig {
  const economy = normalizeTournamentEconomy(raw);
  return testMode
    ? Object.freeze({ ...economy, entryGems: 0, botEntryGems: 0 })
    : Object.freeze({ ...economy, entryGems: DEFAULT_TOURNAMENT_ECONOMY.entryGems });
}

/**
 * Детерминированный id комнаты: повторный запуск scheduler'а не создаёт дубль.
 *
 * зачем 2026-07-27 (шардинг): на слот существовала РОВНО одна комната на 16
 * мест — при большой аудитории играли бы 16 человек, остальные только смотрели.
 * Теперь у слота есть параллельные комнаты: shard 0, 1, 2… Игрок садится в
 * первую незаполненную, заполнилась — крон создаёт следующую.
 *
 * Shard 0 намеренно даёт СТАРЫЙ id без суффикса: уже созданные комнаты,
 * кураторские наборы (они лежат под id комнаты) и формула на клиенте
 * продолжают работать без миграции.
 */
export function tournamentRoomId(
  slotId: string,
  timezone: string,
  dateKey: string,
  shard = 0,
): string {
  const base = `${slotId}_${timezone.replace(/[^\w]/g, '_')}_${dateKey}`;
  return (shard > 0 ? `${base}_r${Math.trunc(shard)}` : base).slice(0, 140);
}

/** Максимум параллельных комнат на один слот — предохранитель от разрастания. */
export const TOURNAMENT_MAX_SHARDS_PER_SLOT = 50;

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
  /** Optional visual aura id rendered around the avatar. */
  aura?: string;
  color: string;
  score: number;
  /** Final authoritative competition place, published only after finalization. */
  resultPlace?: number;
  /** Final authoritative gem payout, published only after finalization. */
  rewardGems?: number;
  /** Серия правильных ответов без ошибок (для стрик-множителя). */
  streak: number;
  /** Серия неверных ответов без правильного — переносится между раундами для камбэка. */
  missStreak?: number;
  /** Билет возвращён при отмене (только живые). */
  refunded?: boolean;
  /** Immutable join provenance used for exact cancellation refunds. */
  entry?: TournamentEntryProvenance;
  /** Snapshot of the seeded bot profile; avoids mutable profile reads mid-room. */
  botWinRate?: number;
  /** Server-authored active-play forfeit. The player remains in standings and is always ranked last. */
  forfeitedAtMs?: number;
  forfeitState?: Extract<TournamentState, `round${number}` | `table${number}`>;
  /**
   * Когда игрок «появляется» в лобби. Живому — момент реального входа, боту —
   * рассчитанное время из волны (см. planBotJoinTimes).
   *
   * зачем: поле ПУБЛИЧНОЕ и есть у всех — по нему нельзя отличить бота от
   * живого (isBot из документа комнаты вырезается намеренно). Клиент рисует
   * игрока только когда joinAtMs наступил, поэтому лобби заполняется постепенно,
   * а не мгновенной стеной из 16 аватаров.
   */
  joinAtMs?: number;
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
  /** One-way operation identity retained for exact replay without exposing the client key. */
  submissionIdempotencyKeyHash?: string;
  /**
   * Разбор ответов игрока — для экрана «что я ответил» после турнира.
   * зачем: раньше хранился только счёт, и разобрать ошибки было негде.
   * Пишем только СВОЙ разбор (в результате игрока), не чужой: подсмотреть
   * ответы соперника нельзя.
   */
  review?: Array<{
    taskId: string;
    correct: boolean;
    /** Что выбрал/собрал игрок — как есть, для показа. */
    given?: unknown;
    /** This task had no timely server receipt when the round deadline finalized it. */
    timedOut?: boolean;
    /** Server-authoritative place among correct receipts for this exact task. */
    answerRank?: number;
    /** Mode-specific deduction captured so later receipt-rank reconciliation is exact. */
    penaltyStars?: number;
    /** Stars awarded for this task after rank and penalty. */
    starsAwarded?: number;
  }>;
  /** Compatible lifecycle marker; timedOut remains for older room documents. */
  submissionStatus?: 'submitted' | 'timed_out' | 'simulated';
  /** Streak snapshot restored when an on-time submit races a timeout write. */
  streakBefore?: number;
  /** Miss-streak snapshot restored when an on-time submit races a timeout write. */
  missStreakBefore?: number;
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
  /** Absolute server-authored windows for the active/past round, in taskIds order. */
  taskSchedule?: TournamentTaskTiming[];
  results: Record<string, TournamentRoundResult>;
};

export type TournamentTaskTiming = {
  taskId: string;
  taskIndex: number;
  durationMs: number;
  startsAtMs: number;
  /** Shared server-authored intro boundary for this round. */
  introEndsAtMs?: number;
  /** Interaction is disabled before this absolute server time. */
  readingEndsAtMs?: number;
  /** Last gameplay millisecond; receive grace after this never earns speed. */
  answerDeadlineAtMs?: number;
  /** Feedback begins only after the network-only receive grace has elapsed. */
  feedbackStartsAtMs?: number;
  /** End of feedback and start of the following task. */
  feedbackEndsAtMs?: number;
  /** Compatibility alias for feedbackEndsAtMs / the complete task cycle end. */
  deadlineAtMs: number;
};

export type TournamentLobbyEvent = {
  eventId: string;
  kind: 'bot_arrival';
  playerId: string;
  atMs: number;
  potDeltaGems: number;
  potGemsAfter: number;
};

export type TournamentRoomDoc = {
  /** Immutable economy terms captured when the room is created. */
  economySnapshot?: TournamentEconomyConfig;
  /** Immutable task-pool generation used to select every task referenced by this room. */
  taskPoolGeneration?: string;
  /** Immutable on-demand testing mode. Only legacy zero-economy now rooms may omit it. */
  testMode?: boolean;
  /** Банк турнира в жемчужинах: сумма взносов всех участников. */
  potGems?: number;
  /** Bounded server-authored lobby timeline used to animate funded bot arrivals. */
  lobbyEvents?: TournamentLobbyEvent[];
  /**
   * Фактические выплаты призёрам по местам (1-е, 2-е, 3-е).
   *
   * зачем: экран результатов раньше рисовал захардкоженные «50/25/10», хотя
   * сервер платит долю реального банка. Здесь лежит правда — её и показываем,
   * и по ней анимируем начисление жемчужин из банка к аватарам.
   */
  prizeGems?: number[];
  /** Сколько всего ушло призёрам — «банк под подиумом» на экране результатов. */
  prizePoolGems?: number;
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
  /** Server-authored end of the active round intro; absent outside round states. */
  introEndsAtMs?: number;
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
  /** Immutable finalization anchor for all post-game retention windows. */
  finalizedAtMs?: number;
  reviewRetentionUntilMs?: number;
  privateEvidenceRetentionUntilMs?: number;
};

// ── Пул заданий (§6) ────────────────────────────────────────────────────────

export type TournamentTaskExplanation = {
  /** Human-readable reason shown only after the tournament. */
  ruleNote: string;
  /** A natural English usage example with its Russian meaning. */
  example: string;
  /**
   * Explanation for every answer position. The correct position is an empty
   * string; every distractor gets its own non-empty trap reason. Optional only
   * so rooms frozen before the full-review rollout can still settle honestly.
   */
  wrongOptionReasons?: string[];
};

export type TournamentTask = {
  taskId: string;
  /** Режим Learning v2 (quiz/flashcard/voice/...), голосовые ×1.5 базы (§5). */
  mode: string;
  isVoice: boolean;
  difficulty: number;
  payload: Record<string, unknown>;
  /** Frozen into room secrets; never included in an active public task. */
  explanation?: TournamentTaskExplanation;
  tags: string[];
  verified: boolean;
};

/**
 * зачем 2026-07-27: владелец отобрал аудио-режимы Learning V2 (макеты 03/04/05)
 * — «Выбор на слух», «Пары звуков», «Диктант». Они отличаются от текстовых
 * ОДНИМ: игроку проигрывается озвучка, а сам текст фразы — и есть ответ,
 * поэтому в публичную версию он попасть НЕ должен.
 *   listen  — услышал фразу → выбрал вариант из списка (03, 04);
 *   dictate — услышал фразу → собрал из чипов (05), проверка как у translate.
 */
export type TournamentTaskKind =
  | 'choice' | 'translate' | 'timeattack' | 'voice'
  | 'listen' | 'dictate'
  // зачем 2026-07-27 (владелец: «соедини пары — это СРАЗУ на одном экране
  // слева и справа слова на двух языках, и так было по макету»): speed_match
  // (макет 07) схлопывался в 'timeattack' и рисовался вертикальным списком —
  // одно слово сверху, варианты снизу. Игрок видел «Вопрос 9 из 24» вместо
  // одного поля пар, а карточки уезжали за экран. Поле пар — отдельный вид.
  | 'match';

export type TournamentPublicTask = {
  taskId: string;
  mode: string;
  kind: TournamentTaskKind;
  isVoice: boolean;
  difficulty: number;
  payload: Record<string, unknown>;
  /**
   * Room-scoped enumerable UX hints for instant local feedback. They are not an
   * anti-cheat boundary; scoring and rewards remain server-authoritative.
   */
  answerFingerprints?: string[];
};

type TaskValidation = { ok: true; kind: TournamentTaskKind } | { ok: false; reason: string };

export const TOURNAMENT_TASK_LIMITS = Object.freeze({
  taskIdBytes: 160,
  modeBytes: 40,
  phraseBytes: 512,
  promptBytes: 512,
  referenceBytes: 1_024,
  /** Ссылка на озвучку в Storage: Firebase-URL с токеном длиннее обычного. */
  audioUriBytes: 512,
  answerBytes: 1_024,
  explanationBytes: 600,
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

const SINGLE_LEXICAL_WORD = /^\p{L}[\p{L}\p{M}]*(?:['’\-]\p{L}[\p{L}\p{M}]*)*$/u;

function isSingleLexicalWord(value: unknown): value is string {
  return typeof value === 'string' && value === value.trim() && SINGLE_LEXICAL_WORD.test(value);
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

function hasExplanationShape(value: unknown): value is TournamentTaskExplanation {
  return isRecord(value)
    && boundedString(value.ruleNote, TOURNAMENT_TASK_LIMITS.explanationBytes)
    && boundedString(value.example, TOURNAMENT_TASK_LIMITS.explanationBytes)
    && (value.wrongOptionReasons === undefined || (Array.isArray(value.wrongOptionReasons)
      && value.wrongOptionReasons.length <= TOURNAMENT_TASK_LIMITS.maxTimeattackOptions
      && value.wrongOptionReasons.every((reason) => typeof reason === 'string'
        && Buffer.byteLength(reason, 'utf8') <= TOURNAMENT_TASK_LIMITS.explanationBytes)))
    && hasOnlyKeys(value, ['ruleNote', 'example', 'wrongOptionReasons']);
}

/** Full post-tournament explanation; legacy rooms remain readable without it. */
function hasFullExplanationForOptions(
  explanation: unknown,
  options: readonly unknown[],
  correctIndex: number | null,
): boolean {
  if (!hasExplanationShape(explanation) || !Array.isArray(explanation.wrongOptionReasons)
    || explanation.wrongOptionReasons.length !== options.length) return false;
  return explanation.wrongOptionReasons.every((reason, index) => (
    index === correctIndex
      ? reason === ''
      : boundedString(reason, TOURNAMENT_TASK_LIMITS.explanationBytes)
  ));
}

function taskKind(task: TournamentTask): TournamentTaskKind {
  const mode = String(task.mode || '').toLowerCase();
  // voice = игрок ГОВОРИТ (скоринг отключён). listen/dictate = игрок СЛУШАЕТ:
  // это разные вещи, поэтому проверка isVoice идёт после аудио-режимов.
  if (mode === 'listen_build') return 'dictate';
  if (mode === 'listen_choose' || mode === 'sound_contrast') return 'listen';
  if (task.isVoice || mode.includes('voice')) return 'voice';
  // зачем 2026-07-27 (владелец: «соедини пары — это сразу на одном экране слева
  // и справа слова на двух языках, и так было по макету»): speed_match раньше
  // попадал в 'timeattack' и разворачивался в 6 отдельных вопросов с 4
  // вариантами — игрок видел «Вопрос 9 из 24» и вертикальный список вместо
  // поля пар 2×5 (макет 07). Проверка стоит ДО mode.includes('time'), иначе
  // она бы снова перехватила его как timeattack.
  if (mode === 'speed_match' || mode.includes('match')) return 'match';
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
  if (task.explanation !== undefined && !hasExplanationShape(task.explanation)) {
    return { ok: false, reason: 'task_explanation_invalid' };
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
  if (kind === 'listen') {
    // Услышал → выбрал. Текст фразы В ОТВЕТЕ НЕ УЧАСТВУЕТ, но хранится в
    // секрете: он нужен стражу свежести (текст поменяли → озвучка протухла)
    // и экрану разбора после турнира.
    const listenPayloadKeys = task.mode === 'sound_contrast'
      ? ['audioUri', 'phrase', 'options', 'correctIndex', 'contrast']
      : ['audioUri', 'phrase', 'options', 'correctIndex'];
    if (!hasOnlyKeys(task.payload, listenPayloadKeys)) {
      return { ok: false, reason: 'task_payload_fields_invalid' };
    }
    const listenOptions = task.payload.options;
    const listenIndex = task.payload.correctIndex;
    if (!boundedString(task.payload.audioUri, TOURNAMENT_TASK_LIMITS.audioUriBytes)
      || !boundedString(task.payload.phrase, TOURNAMENT_TASK_LIMITS.phraseBytes)
      || !boundedStringArray(listenOptions, {
        maxItems: 4, maxItemBytes: TOURNAMENT_TASK_LIMITS.optionBytes,
      })
      // 2 варианта — «Пары звуков» (ship/sheep), 3-4 — «Выбор на слух».
      || listenOptions.length < 2 || !Number.isInteger(listenIndex)
      || Number(listenIndex) < 0 || Number(listenIndex) >= listenOptions.length
      || (task.payload.contrast !== undefined
        && !boundedString(task.payload.contrast, TOURNAMENT_TASK_LIMITS.optionBytes))) {
      return { ok: false, reason: 'listen_contract_invalid' };
    }
    return { ok: true, kind };
  }
  if (kind === 'dictate') {
    // Диктант: услышал → собрал из чипов. Проверка ответа как у translate,
    // но вместо видимой фразы игрок получает только озвучку.
    if (!hasOnlyKeys(task.payload, ['audioUri', 'phrase', 'wordBank', 'correctTokens'])) {
      return { ok: false, reason: 'task_payload_fields_invalid' };
    }
    if (!boundedString(task.payload.audioUri, TOURNAMENT_TASK_LIMITS.audioUriBytes)
      || !boundedString(task.payload.phrase, TOURNAMENT_TASK_LIMITS.phraseBytes)
      || !boundedStringArray(task.payload.wordBank, {
        maxItems: TOURNAMENT_TASK_LIMITS.maxWordBankItems,
        maxItemBytes: TOURNAMENT_TASK_LIMITS.tokenBytes,
      })
      || !boundedStringArray(task.payload.correctTokens, {
        maxItems: TOURNAMENT_TASK_LIMITS.maxCorrectTokens,
        maxItemBytes: TOURNAMENT_TASK_LIMITS.tokenBytes,
      })) {
      return { ok: false, reason: 'dictate_contract_invalid' };
    }
    return { ok: true, kind };
  }
  if (kind === 'translate') {
    if (!hasOnlyKeys(task.payload, ['phrase', 'wordBank', 'correctTokenCount', 'correctTokens', 'correctAnswer'])) {
      return { ok: false, reason: 'task_payload_fields_invalid' };
    }
    const correctTokens = boundedStringArray(task.payload.correctTokens, {
      maxItems: TOURNAMENT_TASK_LIMITS.maxCorrectTokens,
      maxItemBytes: TOURNAMENT_TASK_LIMITS.tokenBytes,
    });
    const correctAnswer = boundedString(task.payload.correctAnswer, TOURNAMENT_TASK_LIMITS.answerBytes);
    const correctTokenCount = task.payload.correctTokenCount;
    const expectedTokenCount = Array.isArray(task.payload.correctTokens) ? task.payload.correctTokens.length : 0;
    if (!boundedString(task.payload.phrase, TOURNAMENT_TASK_LIMITS.phraseBytes)
      || !boundedStringArray(task.payload.wordBank, {
        maxItems: TOURNAMENT_TASK_LIMITS.maxWordBankItems,
        maxItemBytes: TOURNAMENT_TASK_LIMITS.tokenBytes,
      })
      || (!correctTokens && !correctAnswer)
      || (correctTokenCount !== undefined && (!Number.isInteger(correctTokenCount)
        || !correctTokens || Number(correctTokenCount) !== expectedTokenCount))) {
      return { ok: false, reason: 'translate_contract_invalid' };
    }
    return { ok: true, kind };
  }
  // зачем 2026-07-27: у поля пар (match) payload ТОТ ЖЕ, что у timeattack —
  // items[] с prompt/options/correctIndex. Клиент рисует их по-разному (сетка
  // пар против списка вопросов), но контракт данных и проверка ответов общие,
  // поэтому валидация переиспользуется, а не дублируется.
  if (kind === 'timeattack' || kind === 'match') {
    const allowedPayloadKeys = kind === 'match'
      ? ['prompt', 'items', 'rightOptions']
      : ['prompt', 'items'];
    if (!hasOnlyKeys(task.payload, allowedPayloadKeys)) {
      return { ok: false, reason: 'task_payload_fields_invalid' };
    }
    const items = task.payload.items;
    if (!boundedString(task.payload.prompt, TOURNAMENT_TASK_LIMITS.promptBytes)
      || !Array.isArray(items) || items.length === 0
      || items.length > TOURNAMENT_TASK_LIMITS.maxTimeattackItems
      || items.some((item) => {
      if (!isRecord(item) || !hasOnlyKeys(item, ['prompt', 'options', 'correctIndex', 'explanation'])
        || !boundedString(item.prompt, TOURNAMENT_TASK_LIMITS.promptBytes)
        || !boundedStringArray(item.options, {
          maxItems: TOURNAMENT_TASK_LIMITS.maxTimeattackOptions,
          maxItemBytes: TOURNAMENT_TASK_LIMITS.optionBytes,
        })
        || item.options.length < 2 || !Number.isInteger(item.correctIndex)) return true;
      const index = Number(item.correctIndex);
      return index < 0 || index >= item.options.length
        || (item.explanation !== undefined && !hasExplanationShape(item.explanation));
    })) return { ok: false, reason: 'timeattack_contract_invalid' };
    if (kind === 'match' && task.payload.rightOptions !== undefined
      && !boundedStringArray(task.payload.rightOptions, {
        maxItems: TOURNAMENT_TASK_LIMITS.maxTimeattackItems,
        maxItemBytes: TOURNAMENT_TASK_LIMITS.optionBytes,
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

function hasStrictSpeedMatchFieldContract(task: TournamentTask): boolean {
  if (!isRecord(task.payload) || !Array.isArray(task.payload.rightOptions)
    || !Array.isArray(task.payload.items)) return false;
  const rightOptions = task.payload.rightOptions;
  const items = task.payload.items;
  if (rightOptions.length !== 6 || items.length !== 6
    || !boundedStringArray(rightOptions, {
      maxItems: TOURNAMENT_TASK_LIMITS.maxTimeattackItems,
      maxItemBytes: TOURNAMENT_TASK_LIMITS.optionBytes,
    }) || !rightOptions.every((value) => value.trim().split(/\s+/u).length >= 2)) return false;
  const normalized = rightOptions.map((value) => value.trim().toLocaleLowerCase('ru'));
  if (new Set(normalized).size !== normalized.length) return false;
  const correctIndexes = new Set<number>();
  const prompts = new Set<string>();
  for (const item of items) {
    if (!isRecord(item) || !Array.isArray(item.options)
      || item.options.length !== rightOptions.length
      || !item.options.every((option, index) => option === rightOptions[index])
      || typeof item.prompt !== 'string'
      || item.prompt.trim().split(/\s+/u).length < 2
      || !Number.isInteger(item.correctIndex)) return false;
    prompts.add(item.prompt.trim().toLocaleLowerCase('en'));
    const correctIndex = Number(item.correctIndex);
    if (correctIndex < 0 || correctIndex >= rightOptions.length) return false;
    correctIndexes.add(correctIndex);
  }
  return correctIndexes.size === rightOptions.length && prompts.size === items.length;
}

/** A phrase bank must contain every answer token (including duplicates) plus exactly one trap. */
function hasStrictTranslateBuildFieldContract(task: TournamentTask): boolean {
  if (!Array.isArray(task.payload.correctTokens) || !Array.isArray(task.payload.wordBank)) return false;
  const correctTokens = task.payload.correctTokens;
  const wordBank = task.payload.wordBank;
  if (!correctTokens.every((token) => typeof token === 'string' && token.trim())
    || !wordBank.every((token) => typeof token === 'string' && token.trim())) return false;
  const remaining = new Map<string, number>();
  for (const rawToken of correctTokens) {
    const token = rawToken.trim();
    remaining.set(token, (remaining.get(token) ?? 0) + 1);
  }
  let traps = 0;
  for (const rawToken of wordBank) {
    const token = rawToken.trim();
    const required = remaining.get(token) ?? 0;
    if (required > 0) remaining.set(token, required - 1);
    else traps += 1;
  }
  return traps === 1 && Array.from(remaining.values()).every((count) => count === 0);
}

/**
 * Compatibility-aware boundary for newly assembled rooms.
 *
 * validateTournamentTask deliberately remains able to parse stored legacy
 * tasks so an already-running room can still settle. This stricter predicate
 * is the only one used for new room selection and admin publication.
 */
export function validateTournamentTaskForNewRoom(task: TournamentTask): TaskValidation {
  const validation = validateTournamentTask(task);
  if (!validation.ok) return validation;
  if (!isOwnerApprovedTournamentMode(task.mode) || task.isVoice === true) {
    return { ok: false, reason: 'task_mode_retired' };
  }
  if (task.mode === 'speed_match' && !hasStrictSpeedMatchFieldContract(task)) {
    return { ok: false, reason: 'speed_match_field_contract_invalid' };
  }
  // Legacy rooms may still settle with the historical payload, but every task
  // selected for a newly assembled room must tell the client exactly how many
  // tiles form the answer. Otherwise traps can make phrase construction
  // impossible to finish without leaking the answer.
  if (task.mode === 'translate_build'
    && (!Number.isInteger(task.payload.correctTokenCount)
      || !Array.isArray(task.payload.correctTokens)
      || Number(task.payload.correctTokenCount) !== task.payload.correctTokens.length
      || !hasStrictTranslateBuildFieldContract(task))) {
    return { ok: false, reason: 'translate_token_count_required' };
  }
  const kind = validation.kind;
  const directOptions = (kind === 'choice' || kind === 'listen') && Array.isArray(task.payload.options)
    ? task.payload.options : [];
  const directCorrectIndex = (kind === 'choice' || kind === 'listen')
    && Number.isInteger(task.payload.correctIndex)
    ? Number(task.payload.correctIndex) : null;
  if (!hasFullExplanationForOptions(task.explanation, directOptions, directCorrectIndex)) {
    return { ok: false, reason: 'task_full_explanation_required' };
  }
  if ((kind === 'timeattack' || kind === 'match') && Array.isArray(task.payload.items)
    && !task.payload.items.every((item) => isRecord(item)
      && Array.isArray(item.options)
      && Number.isInteger(item.correctIndex)
      && hasFullExplanationForOptions(item.explanation, item.options, Number(item.correctIndex)))) {
    return { ok: false, reason: 'task_full_explanation_required' };
  }
  return validation;
}

function publicPayloadForTask(task: TournamentTask, kind: TournamentTaskKind): Record<string, unknown> {
  if (kind === 'choice') {
    return {
      phrase: String(task.payload.phrase),
      options: (task.payload.options as string[]).slice(),
    };
  }
  if (kind === 'translate') {
    const answerTokenCount = Array.isArray(task.payload.correctTokens)
      ? task.payload.correctTokens.length
      : String(task.payload.correctAnswer ?? '').trim().split(/\s+/).filter(Boolean).length;
    return {
      phrase: String(task.payload.phrase),
      wordBank: (task.payload.wordBank as string[]).slice(),
      correctTokenCount: answerTokenCount,
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
  if (kind === 'match') {
    const rightOptions = Array.isArray(task.payload.rightOptions)
      ? (task.payload.rightOptions as string[]).slice()
      : undefined;
    return {
      prompt: String(task.payload.prompt),
      ...(rightOptions ? { rightOptions } : {}),
      items: (task.payload.items as Record<string, unknown>[]).map((item) => ({
        prompt: String(item.prompt),
        options: (item.options as string[]).slice(),
      })),
    };
  }
  if (kind === 'listen') {
    // Ключевое: phrase НЕ отдаём — услышанный текст и есть предмет задания.
    return {
      audioUri: String(task.payload.audioUri),
      options: (task.payload.options as string[]).slice(),
      ...(task.mode === 'sound_contrast' && typeof task.payload.contrast === 'string'
        ? { contrast: task.payload.contrast }
        : {}),
    };
  }
  if (kind === 'dictate') {
    return {
      audioUri: String(task.payload.audioUri),
      wordBank: (task.payload.wordBank as string[]).slice(),
    };
  }
  return { phrase: String(task.payload.phrase) };
}

/**
 * Отпечаток правильного ответа — чтобы клиент мог МГНОВЕННО покрасить кнопку
 * «Готово» зелёным или красным, не зная самого ответа.
 *
 * зачем (владелец 2026-07-27: «если неправильно, то кнопка становится красной,
 * а не зелёной»): сервер намеренно не присылает правильный ответ — иначе его
 * вытащат из трафика и будут выигрывать все турниры, а призы реальные. Но и
 * ждать сеть на каждом ответе нельзя: это задержка и ×6 вызовов функций.
 * UX-контракт: отдаём room-scoped отпечаток ответа. Клиент сравнивает с ним
 * СВОЙ ответ и мгновенно красит интерфейс, не ожидая сеть. Это не anti-cheat
 * секрет: варианты ответа перечислимы. Очки и награды всё равно подтверждает
 * сервер, поэтому локальная окраска не меняет результат турнира.
 */
/** Канонический вид ответа: одинаковый на сервере и на клиенте. */
export function canonicalAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).join('');
  return String(value ?? '').trim();
}

/** Enumerable UX hint only; tournament scoring remains server-authoritative. */
export function answerFingerprint(roomId: string, taskId: string, answer: unknown): string {
  return tournamentHash32(`${roomId}|${taskId}|${canonicalAnswerValue(answer)}`).toString(36);
}

function answerFingerprintsForTask(
  task: TournamentTask,
  kind: TournamentTaskKind,
  roomId: string,
): string[] {
  const fingerprint = (answer: unknown) => answerFingerprint(roomId, task.taskId, answer);
  if (kind === 'choice') return [fingerprint(task.payload.correctIndex)];
  if (kind === 'translate') {
    const correctTokens = Array.isArray(task.payload.correctTokens)
      ? task.payload.correctTokens
      : String(task.payload.correctAnswer ?? '').trim().split(/\s+/).filter(Boolean);
    return [fingerprint(correctTokens)];
  }
  if (kind === 'timeattack' || kind === 'match') {
    const items = (task.payload.items as Record<string, unknown>[]) ?? [];
    return items.map((item) => fingerprint(item.correctIndex));
  }
  return [];
}

/** Отпечатки правильных ответов задания (по подвопросам для timeattack). */
export function toPublicTournamentTask(
  task: TournamentTask,
  // roomId нужен как соль отпечатков; без него отпечатки не отдаются вовсе.
  roomId?: string,
): TournamentPublicTask | null {
  const validation = validateTournamentTask(task);
  if (!validation.ok) return null;
  return {
    taskId: task.taskId,
    mode: task.mode,
    kind: validation.kind,
    isVoice: task.isVoice,
    difficulty: task.difficulty,
    payload: publicPayloadForTask(task, validation.kind),
    ...(roomId
      ? { answerFingerprints: answerFingerprintsForTask(task, validation.kind, roomId) }
      : {}),
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
  if (validation.kind === 'choice' || validation.kind === 'listen') {
    // listen проверяется как choice: игрок выбрал индекс варианта. Разница
    // только в стимуле (озвучка вместо текста) — она на клиенте, не здесь.
    return Number.isInteger(answer.selectedIndex) && answer.selectedIndex === task.payload.correctIndex;
  }
  if (validation.kind === 'translate' || validation.kind === 'dictate') {
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

export type SpeedMatchAttemptProgress = {
  matchedIndexes: number[];
  triedIndexes: number[][];
  wrongAttempts: number;
};

/**
 * Pure server-side transition for one speed-match tap. Replaying the same tap
 * is idempotent, while every distinct wrong choice is permanently journaled.
 */
export function applySpeedMatchAttempt(
  task: TournamentTask,
  current: SpeedMatchAttemptProgress | undefined,
  pairIndex: number,
  selectedIndex: number,
): { correct: boolean; completed: boolean; progress: SpeedMatchAttemptProgress } {
  const validation = validateTournamentTaskForNewRoom(task);
  const items = Array.isArray(task.payload.items) ? task.payload.items as Record<string, unknown>[] : [];
  if (!validation.ok || validation.kind !== 'match'
    || !Number.isInteger(pairIndex) || pairIndex < 0 || pairIndex >= items.length
    || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= items.length) {
    throw new Error('speed_match_attempt_invalid');
  }

  const matchedIndexes = Array.from({ length: items.length }, (_, index) => (
    Number.isInteger(current?.matchedIndexes?.[index]) ? current!.matchedIndexes[index] : -1
  ));
  const triedIndexes = Array.from({ length: items.length }, (_, index) => (
    Array.isArray(current?.triedIndexes?.[index])
      ? Array.from(new Set(current!.triedIndexes[index].filter((value) => Number.isInteger(value) && value >= 0 && value < items.length)))
      : []
  ));
  let wrongAttempts = Math.max(0, Math.trunc(Number(current?.wrongAttempts ?? 0)));
  const expectedIndex = Number(items[pairIndex].correctIndex);
  const alreadyMatched = matchedIndexes[pairIndex] === expectedIndex;
  const correct = alreadyMatched || selectedIndex === expectedIndex;

  if (correct) {
    matchedIndexes[pairIndex] = expectedIndex;
  } else if (!triedIndexes[pairIndex].includes(selectedIndex)) {
    triedIndexes[pairIndex].push(selectedIndex);
    wrongAttempts += 1;
  }

  const progress = { matchedIndexes, triedIndexes, wrongAttempts };
  return {
    correct,
    completed: matchedIndexes.every((value, index) => value === Number(items[index].correctIndex)),
    progress,
  };
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

/**
 * Immutable owner-approved layout for one complete tournament.
 *
 * Quota across all 16 fields: 4/4/3/3/2. Every four-field round contains
 * four different modes, and the two pair fields are reserved for rounds 2
 * and 4. Runtime percentage configuration must never override this contract.
 */
export const TOURNAMENT_ROUND_MODE_PLAN: readonly (
  readonly OwnerApprovedTournamentMode[]
)[] = Object.freeze([
  Object.freeze(['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build'] as const),
  Object.freeze(['guess_phrase', 'fill_gap', 'find_oddity', 'speed_match'] as const),
  Object.freeze(['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build'] as const),
  Object.freeze(['guess_phrase', 'fill_gap', 'translate_build', 'speed_match'] as const),
]);

/** Owner-approved server timing for each mode (Golden Plan decisions 98, 109-112). */
export const TOURNAMENT_TASK_DURATION_MS = Object.freeze<Record<OwnerApprovedTournamentMode, number>>({
  guess_phrase: 15_000,
  fill_gap: 15_000,
  find_oddity: 18_000,
  translate_build: 25_000,
  speed_match: 30_000,
});

/** Compatibility only for already-running rooms created with retired modes. */
const LEGACY_TOURNAMENT_TASK_DURATION_MS = 15_000;

export function tournamentTaskDurationMs(mode: unknown): number {
  return isOwnerApprovedTournamentMode(mode)
    ? TOURNAMENT_TASK_DURATION_MS[mode]
    : LEGACY_TOURNAMENT_TASK_DURATION_MS;
}

export function tournamentRoundDurationMs(tasks: readonly Pick<TournamentTask, 'mode'>[]): number {
  return tasks.reduce((total, task) => total + tournamentTaskDurationMs(task.mode), 0);
}

export function tournamentRoundTaskSchedule(
  tasks: readonly Pick<TournamentTask, 'taskId' | 'mode'>[],
  taskStartsAtMs: number,
  introEndsAtMs?: number,
): TournamentTaskTiming[] {
  let startsAtMs = Math.max(0, Math.trunc(taskStartsAtMs));
  const normalizedIntroEndsAtMs = Math.max(0, Math.trunc(introEndsAtMs ?? startsAtMs));
  return tasks.map((task, taskIndex) => {
    const durationMs = tournamentTaskDurationMs(task.mode);
    const feedbackEndsAtMs = startsAtMs + durationMs;
    const feedbackStartsAtMs = feedbackEndsAtMs - TOURNAMENT_TASK_FEEDBACK_MS;
    const answerDeadlineAtMs = feedbackStartsAtMs - TOURNAMENT_TASK_SUBMISSION_GRACE_MS;
    const timing = {
      taskId: task.taskId,
      taskIndex,
      durationMs,
      startsAtMs,
      introEndsAtMs: normalizedIntroEndsAtMs,
      readingEndsAtMs: startsAtMs + TOURNAMENT_TASK_READING_MS,
      answerDeadlineAtMs,
      feedbackStartsAtMs,
      feedbackEndsAtMs,
      deadlineAtMs: feedbackEndsAtMs,
    };
    if (timing.readingEndsAtMs >= timing.answerDeadlineAtMs) {
      throw new Error('task_duration_too_short_for_phases');
    }
    startsAtMs = timing.feedbackEndsAtMs;
    return timing;
  });
}

export function tournamentRoundTimingWindow(
  tasks: readonly Pick<TournamentTask, 'taskId' | 'mode'>[],
  stateStartedAtMs: number,
): { introEndsAtMs: number; stateDeadlineAtMs: number; taskSchedule: TournamentTaskTiming[] } {
  const normalizedStateStartedAtMs = Math.max(0, Math.trunc(stateStartedAtMs));
  const introEndsAtMs = normalizedStateStartedAtMs + TOURNAMENT_ROUND_INTRO_MS;
  const taskSchedule = tournamentRoundTaskSchedule(tasks, introEndsAtMs, introEndsAtMs);
  return {
    introEndsAtMs,
    stateDeadlineAtMs: introEndsAtMs + tournamentRoundDurationMs(tasks),
    taskSchedule,
  };
}

/**
 * Enforce the immutable per-task receive windows for a modern room. Returns
 * false only for a legacy round that predates taskSchedule, whose whole-round
 * deadline remains the compatibility boundary.
 */
export function assertTournamentAnswersWithinTaskSchedule(
  round: TournamentRound,
  taskIds: readonly string[],
  receivedAtMs: number,
): boolean {
  if (round.taskSchedule === undefined) return false;
  const schedule = round.taskSchedule;
  if (schedule.length !== round.taskIds.length || !Number.isFinite(receivedAtMs)) {
    throw new Error('task_schedule_invalid');
  }
  const byTaskId = new Map<string, TournamentTaskTiming>();
  for (let index = 0; index < schedule.length; index += 1) {
    const timing = schedule[index];
    const hasAnyPhaseField = timing && (
      timing.readingEndsAtMs !== undefined || timing.answerDeadlineAtMs !== undefined
      || timing.feedbackStartsAtMs !== undefined || timing.feedbackEndsAtMs !== undefined
    );
    const hasAllPhaseFields = timing
      && Number.isFinite(timing.readingEndsAtMs) && Number.isFinite(timing.answerDeadlineAtMs)
      && Number.isFinite(timing.feedbackStartsAtMs) && Number.isFinite(timing.feedbackEndsAtMs);
    const readingEndsAtMs = Number(timing?.readingEndsAtMs);
    const answerDeadlineAtMs = Number(timing?.answerDeadlineAtMs);
    const feedbackStartsAtMs = Number(timing?.feedbackStartsAtMs);
    const feedbackEndsAtMs = Number(timing?.feedbackEndsAtMs);
    if (!timing || timing.taskId !== round.taskIds[index] || timing.taskIndex !== index
      || !Number.isFinite(timing.startsAtMs) || !Number.isFinite(timing.deadlineAtMs)
      || !Number.isFinite(timing.durationMs) || timing.durationMs <= 0
      || timing.deadlineAtMs - timing.startsAtMs !== timing.durationMs
      || (index > 0 && timing.startsAtMs !== schedule[index - 1].deadlineAtMs)
      || (hasAnyPhaseField && !hasAllPhaseFields)
      || (hasAllPhaseFields && (
        readingEndsAtMs - timing.startsAtMs < 1_500
        || readingEndsAtMs - timing.startsAtMs > 2_000
        || answerDeadlineAtMs <= readingEndsAtMs
        || feedbackStartsAtMs !== answerDeadlineAtMs + TOURNAMENT_TASK_SUBMISSION_GRACE_MS
        || feedbackEndsAtMs - feedbackStartsAtMs < 1_500
        || feedbackEndsAtMs - feedbackStartsAtMs > 2_000
        || feedbackEndsAtMs !== timing.deadlineAtMs
      ))
      || byTaskId.has(timing.taskId)) {
      throw new Error('task_schedule_invalid');
    }
    byTaskId.set(timing.taskId, timing);
  }
  const receiveTaskIds = taskIds.length > 0 ? taskIds : [round.taskIds[round.taskIds.length - 1]];
  const seen = new Set<string>();
  for (const taskId of receiveTaskIds) {
    const timing = byTaskId.get(taskId);
    if (!timing || seen.has(taskId)) throw new Error('task_schedule_invalid');
    seen.add(taskId);
    const hasPhases = Number.isFinite(timing.readingEndsAtMs)
      && Number.isFinite(timing.answerDeadlineAtMs)
      && Number.isFinite(timing.feedbackStartsAtMs);
    const interactionStartsAtMs = hasPhases ? Number(timing.readingEndsAtMs) : timing.startsAtMs;
    if (receivedAtMs < interactionStartsAtMs) {
      throw new Error(hasPhases ? 'task_reading_in_progress' : 'task_not_started');
    }
    const receiveDeadlineAtMs = hasPhases
      ? Number(timing.feedbackStartsAtMs) - 1
      : timing.deadlineAtMs + TOURNAMENT_TASK_SUBMISSION_GRACE_MS;
    if (receivedAtMs > receiveDeadlineAtMs) {
      throw new Error('task_deadline_elapsed');
    }
  }
  return true;
}

// ── Скоринг (§5): база + бонус скорости ≤+40% + стрик ×1.5/×2 ───────────────

// зачем 2026-07-27 (владелец): шкала звёзд переписана на «максимум 3 за
// задание». Старые константы (база 100, ×1.5 голос, +40% скорость, ×2 стрик)
// давали до ~10 000 очков за турнир — нечитаемые числа. Оставлены как
// историческая ссылка для старых комнат, новый скоринг их не использует.
export const TOURNAMENT_BASE_SCORE = 100;
export const TOURNAMENT_VOICE_BASE_MULTIPLIER = 1.5;
export const TOURNAMENT_MAX_SPEED_BONUS_RATIO = 0.4;
export const TOURNAMENT_STREAK_X15_THRESHOLD = 3;
export const TOURNAMENT_STREAK_X2_THRESHOLD = 5;

// ── Звёзды (владелец 2026-07-27) ────────────────────────────────────────────
//
// Правило владельца дословно: «кто первый ответил — тот три звезды получит,
// кто второй — две, кто третий и все остальные — одну». Серии правильных и
// ошибочных ответов отслеживаются для состояния игрока, но не меняют награду.
//
// Скорость меряется НЕ секундами, а МЕСТОМ среди правильно ответивших в этом
// задании — это прямое соревнование между игроками, и одинаковых сумм почти не
// бывает. Неправильный ответ = 0 звёзд.

/** Первый правильный ответ в задании. */
export const TOURNAMENT_STAR_FIRST = 3;
/** Второй правильный ответ. */
export const TOURNAMENT_STAR_SECOND = 2;
/** Третий и все последующие правильные ответы. */
export const TOURNAMENT_STAR_REST = 1;
/**
 * Тай-брейка НЕТ: звёзды целые, ничьи разрешены честно.
 *
 * зачем (владелец 2026-07-27): сначала обсуждали дробную добавку за скорость,
 * но владелец справедливо возразил: «если у одного 70 звёзд и у другого 70, то
 * будут возмущения — почему ему больше, а мне меньше». Поэтому при равных
 * звёздах игроки ДЕЛЯТ место, а их призовые доли складываются и делятся
 * поровну (см. tournamentPayouts). Скорость влияет на сами звёзды — быстрый
 * ответ даёт +1 ⭐, — и этого достаточно, чтобы награждать темп.
 */
export const TOURNAMENT_TIEBREAK_WEIGHT = 0;

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
  /**
   * Место среди ПРАВИЛЬНО ответивших на это задание: 1 = ответил первым.
   *
   * зачем (владелец 2026-07-27): «кто первый ответил — тот три звезды, кто
   * второй — две, кто третий и остальные — одну». Скорость меряется местом в
   * гонке, а не секундами: это прямое соревнование и почти исключает ничьи.
   */
  answerRank?: number;
  /** Серия ОШИБОК до этого ответа; не меняет турнирные звёзды. */
  missStreakBefore?: number;
  /** Mode-specific deduction applied after the rank award, bounded at zero. */
  penaltyStars?: number;
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
 * Звёзды за один ответ. МАКСИМУМ 3 (решение владельца 2026-07-27).
 *
 * зачем: старая формула (база 100 × голос 1.5 × скорость 1.4 × стрик 2 = 420
 * за задание) давала до ~10 000 очков за турнир — владелец увидел «4474» и
 * справедливо сказал, что таких чисел быть не должно. Новая шкала читаемая:
 * первый правильный получает 3⭐, второй — 2⭐, третий и последующие — 1⭐.
 * Стрики и камбэки эту шкалу не повышают.
 * Максимум за турнир при 4 раундах × 4 задания = 48 звёзд.
 *
 * Ничьи РАЗРЕШЕНЫ: одинаковые звёзды = одинаковое место, а призовые доли таких
 * игроков складываются и делятся поровну (см. tournamentPayouts). Владелец:
 * «если у одного 70 звёзд и у другого 70 — будут возмущения, почему ему больше;
 * пусть начисляется поровну».
 *
 * @param input.answerRank место среди ПРАВИЛЬНО ответивших на это задание:
 *   1 = ответил первым (3⭐), 2 = вторым (2⭐), 3+ = остальные (1⭐).
 *   Не передан — считаем как «остальные»: одиночная игра не даёт форы.
 */
export function scoreAnswer(input: ScoreInput): number {
  if (!input.correct) return 0;

  const rank = Math.max(1, Math.trunc(input.answerRank ?? Number.MAX_SAFE_INTEGER));
  const stars = rank === 1
    ? TOURNAMENT_STAR_FIRST
    : rank === 2
      ? TOURNAMENT_STAR_SECOND
      : TOURNAMENT_STAR_REST;
  return Math.max(0, stars - Math.max(0, Math.trunc(input.penaltyStars ?? 0)));
}

/** Итог раунда: очки и новая серия. Неверный ответ сбрасывает серию. */
export function scoreRound(answers: ScoreInput[]): { roundScore: number; streakAfter: number } {
  let roundScore = 0;
  let streak = 0;
  // Серия ошибок продолжает жить в состоянии игрока, но не повышает звёзды.
  let missStreak = 0;
  for (const a of answers) {
    const effective = {
      ...a,
      streakBefore: a.correct ? streak : a.streakBefore,
      missStreakBefore: missStreak,
    };
    roundScore += scoreAnswer(effective);
    streak = a.correct ? streak + 1 : 0;
    missStreak = a.correct ? 0 : missStreak + 1;
  }
  return { roundScore, streakAfter: streak };
}

function scoreInputsWithStartingStreak(
  answers: ScoreInput[],
  streakStart: number,
  missStreakStart = 0,
): { roundScore: number; correct: number; streakAfter: number; missStreakAfter: number } {
  let roundScore = 0;
  let correct = 0;
  let streak = Math.max(0, streakStart);
  let missStreak = Math.max(0, missStreakStart);
  for (const answer of answers) {
    roundScore += scoreAnswer({ ...answer, streakBefore: streak, missStreakBefore: missStreak });
    if (answer.correct) {
      correct += 1;
      streak += 1;
      missStreak = 0;
    } else {
      streak = 0;
      missStreak += 1;
    }
  }
  return { roundScore, correct, streakAfter: streak, missStreakAfter: missStreak };
}

/**
 * Rank among server-confirmed correct submissions for one task.
 *
 * Firestore retries evaluate this against the newest room snapshot, so a wrong
 * answer never consumes a place and concurrent correct submissions serialize
 * to 1, 2, then 3+ without trusting client clocks or client-provided scores.
 */
function nextCorrectAnswerRank(
  round: TournamentRound,
  taskId: string,
  playerId: string,
): number {
  const confirmedBefore = Object.values(round.results || {}).filter((result) => (
    result.playerId !== playerId
    && result.review?.some((entry) => entry.taskId === taskId && entry.correct === true)
  )).length;
  return confirmedBefore + 1;
}

export type TournamentSubmission = {
  playerId: string;
  roundNo: number;
  answers: Array<{ taskId: string; answer: unknown }>;
  tasks: TournamentTask[];
  receivedAtMs: number;
  /** Server receipt timestamps for first per-task answers; absent entries use receivedAtMs. */
  taskReceivedAtMs?: Record<string, number>;
  idempotencyKeyHash?: string;
  maxMsPerTask?: number;
  /** Server-loaded private journals keyed by speed-match taskId. */
  speedMatchProgress?: Record<string, SpeedMatchAttemptProgress>;
  /** Canonical per-task receipt ranks for every finalized real player in this transaction. */
  answerRanksByPlayer?: Record<string, Record<string, number>>;
  /** Tasks missing a timely receipt when the deadline finalized this partial submission. */
  timedOutTaskIds?: readonly string[];
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
  const round = room.rounds[roundIndex];
  let scheduleEnforced = false;
  const submittedTaskIds = submission.answers.map((answer) => answer.taskId);
  if (submission.taskReceivedAtMs) {
    for (const taskId of submittedTaskIds.length > 0
      ? Array.from(new Set(submittedTaskIds))
      : [round.taskIds[round.taskIds.length - 1]]) {
      scheduleEnforced = assertTournamentAnswersWithinTaskSchedule(
        round, [taskId], submission.taskReceivedAtMs[taskId] ?? submission.receivedAtMs,
      ) || scheduleEnforced;
    }
  } else {
    scheduleEnforced = assertTournamentAnswersWithinTaskSchedule(
      round, submittedTaskIds, submission.receivedAtMs,
    );
  }
  const existing = round.results?.[submission.playerId];
  const replacingTimedOut = existing?.submissionStatus === 'timed_out' || existing?.timedOut === true;
  if (existing && !replacingTimedOut) {
    if (submission.idempotencyKeyHash && existing.submissionIdempotencyKeyHash
      && submission.idempotencyKeyHash !== existing.submissionIdempotencyKeyHash) {
      throw new Error('submission_idempotency_key_mismatch');
    }
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
  if (!scheduleEnforced && deadlineAtMs && submission.receivedAtMs > deadlineAtMs) {
    throw new Error('round_deadline_elapsed');
  }
  const playerIndex = room.players.findIndex((entry) => !entry.isBot && entry.id === submission.playerId);
  if (playerIndex < 0) throw new Error('not_in_room');
  if (room.players[playerIndex].forfeitedAtMs !== undefined) throw new Error('player_forfeited');

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
  const answerRanks = submission.answerRanksByPlayer?.[submission.playerId];
  const timedOutTaskIds = new Set(submission.timedOutTaskIds ?? []);
  const effectiveAnswer = (taskId: string, task: TournamentTask | undefined): unknown => {
    const progress = submission.speedMatchProgress?.[taskId];
    return task?.mode === 'speed_match' && progress
      ? { selectedIndexes: progress.matchedIndexes }
      : answerMap.get(taskId);
  };
  const isCorrect = (taskId: string, task: TournamentTask | undefined): boolean => {
    return !!task && verifyTournamentAnswer(task, effectiveAnswer(taskId, task));
  };
  const inputs: ScoreInput[] = room.rounds[roundIndex].taskIds.map((taskId) => {
    const task = taskMap.get(taskId);
    const correct = isCorrect(taskId, task);
    return {
      correct,
      elapsedMs,
      maxMs: maxMsPerTask,
      streakBefore: 0,
      isVoice: task?.isVoice === true,
      answerRank: correct
        ? answerRanks?.[taskId]
          ?? nextCorrectAnswerRank(room.rounds[roundIndex], taskId, submission.playerId)
        : undefined,
      penaltyStars: task?.mode === 'speed_match'
        ? submission.speedMatchProgress?.[taskId]?.wrongAttempts ?? 0
        : 0,
    };
  });
  const player = room.players[playerIndex];
  const streakBefore = replacingTimedOut ? existing.streakBefore ?? player.streak : player.streak;
  const missStreakBefore = replacingTimedOut
    ? existing.missStreakBefore ?? player.missStreak ?? 0
    : player.missStreak ?? 0;
  const scored = scoreInputsWithStartingStreak(inputs, streakBefore, missStreakBefore);
  // Разбор: что игрок ответил на каждое задание и верно ли. Верный ответ
  // здесь НЕ храним — он лежит в taskSecrets, экран разбора берёт его оттуда
  // уже после турнира, когда подсматривать нечего.
  const review = room.rounds[roundIndex].taskIds.map((taskId, taskIndex) => {
    const task = taskMap.get(taskId);
    const correct = isCorrect(taskId, task);
    const penaltyStars = inputs[taskIndex].penaltyStars ?? 0;
    const answerRank = correct ? inputs[taskIndex].answerRank : undefined;
    return {
      taskId,
      correct,
      ...(answerMap.has(taskId) || submission.speedMatchProgress?.[taskId]
        ? { given: effectiveAnswer(taskId, task) }
        : {}),
      ...(timedOutTaskIds.has(taskId) ? { timedOut: true } : {}),
      ...(answerRank !== undefined ? { answerRank } : {}),
      ...(penaltyStars > 0 ? { penaltyStars } : {}),
      starsAwarded: scoreAnswer({
        correct,
        elapsedMs,
        maxMs: maxMsPerTask,
        streakBefore: 0,
        isVoice: task?.isVoice === true,
        answerRank,
        penaltyStars,
      }),
    };
  });
  const result: TournamentRoundResult = {
    playerId: submission.playerId,
    correct: scored.correct,
    total: room.rounds[roundIndex].taskIds.length,
    roundScore: scored.roundScore,
    submittedAtMs: submission.receivedAtMs,
    ...(submission.idempotencyKeyHash
      ? { submissionIdempotencyKeyHash: submission.idempotencyKeyHash }
      : {}),
    review,
    submissionStatus: 'submitted',
    streakBefore,
    missStreakBefore,
    roundStartedAtMs,
  };
  let players = room.players.map((entry, index) => index === playerIndex
    ? {
      ...entry,
      score: entry.score - (replacingTimedOut ? existing.roundScore : 0) + scored.roundScore,
      streak: scored.streakAfter,
      missStreak: scored.missStreakAfter,
    }
    : { ...entry });
  const rounds = room.rounds.map((entry, index) => index === roundIndex
    ? { ...entry, results: { ...(entry.results || {}), [submission.playerId]: result } }
    : { ...entry, results: { ...(entry.results || {}) } });
  // A player can finish the round before another player whose earlier receipts
  // deserve a better per-task rank. Reconcile every receipt-backed result in the
  // same room transaction so finalization order can never mint the stars.
  if (submission.answerRanksByPlayer) {
    for (const [resultPlayerId, storedResult] of Object.entries(rounds[roundIndex].results)) {
      const canonicalRanks = submission.answerRanksByPlayer[resultPlayerId];
      if (!canonicalRanks || !storedResult.review?.length) continue;
      const canReconcile = storedResult.review.every((entry) => (
        !entry.correct || entry.starsAwarded !== undefined || resultPlayerId === submission.playerId
      ));
      if (!canReconcile) continue;
      let reconciledScore = 0;
      const reconciledReview = storedResult.review.map((entry) => {
        if (!entry.correct) return entry;
        const answerRank = canonicalRanks[entry.taskId];
        if (answerRank === undefined) return entry;
        const starsAwarded = scoreAnswer({
          correct: true,
          elapsedMs: 0,
          maxMs: 1,
          streakBefore: 0,
          isVoice: false,
          answerRank,
          penaltyStars: entry.penaltyStars ?? 0,
        });
        reconciledScore += starsAwarded;
        return { ...entry, answerRank, starsAwarded };
      });
      const scoreDelta = reconciledScore - storedResult.roundScore;
      rounds[roundIndex].results[resultPlayerId] = {
        ...storedResult,
        roundScore: reconciledScore,
        review: reconciledReview,
      };
      if (scoreDelta !== 0) {
        players = players.map((entry) => entry.id === resultPlayerId
          ? { ...entry, score: entry.score + scoreDelta }
          : entry);
      }
    }
  }
  const allRealSubmitted = players.filter((entry) => !entry.isBot)
    .every((entry) => !!rounds[roundIndex].results[entry.id]);
  return {
    room: { ...room, players, rounds, version: room.version + 1 },
    replay: false,
    result: rounds[roundIndex].results[submission.playerId],
    allRealSubmitted,
  };
}

export type TournamentHumanLobbyJoinPlan = {
  room: TournamentRoomDoc;
  displacedBotPlayerId?: string;
  startImmediately: boolean;
};

/**
 * Plans one human lobby join without ever exceeding the fixed room capacity.
 *
 * Future bot entries are reservations, not occupied seats. A human arriving
 * during the fill window replaces the latest future reservation atomically.
 */
export function planTournamentHumanLobbyJoin(
  room: TournamentRoomDoc,
  player: TournamentPlayer,
  authUid: string,
  nowMs?: number,
): TournamentHumanLobbyJoinPlan {
  if (room.state === TOURNAMENT_STATE_CANCELLED || room.state === 'closed') throw new Error('room_not_joinable');
  const existingIndex = room.players.findIndex((entry) => !entry.isBot && entry.id === player.id);
  if (existingIndex >= 0) {
    const existing = room.players[existingIndex];
    const { aura: _existingAura, ...existingWithoutAura } = existing;
    const refreshed: TournamentPlayer = {
      ...existingWithoutAura,
      name: player.name,
      avatar: player.avatar,
      ...(player.aura ? { aura: player.aura } : {}),
    };
    const profileChanged = existing.name !== refreshed.name
      || existing.avatar !== refreshed.avatar
      || existing.aura !== refreshed.aura;
    const authChanged = !room.participantAuthUids?.includes(authUid);
    if (!profileChanged && !authChanged) {
      return { room, startImmediately: false };
    }
    const players = room.players.map((entry, index) => (
      index === existingIndex ? refreshed : entry
    ));
    return {
      room: {
        ...room,
        players,
        participantAuthUids: Array.from(new Set([...(room.participantAuthUids || []), authUid])),
        version: room.version + 1,
      },
      startImmediately: false,
    };
  }
  if (room.state !== 'lobby') throw new Error('room_not_joinable');
  const hasFutureBotReservations = nowMs !== undefined && room.players.some((entry) => (
    entry.isBot && typeof entry.joinAtMs === 'number' && entry.joinAtMs > nowMs
  ));
  const joinCutoffMs = hasFutureBotReservations
    ? (room.stateDeadlineAtMs ?? room.startsAt)
    : room.startsAt;
  if (nowMs !== undefined && nowMs >= joinCutoffMs) throw new Error('join_cutoff_elapsed');

  const players = room.players.map((entry) => ({ ...entry }));
  let displacedBotPlayerId: string | undefined;
  if (players.length >= TOURNAMENT_ROOM_SIZE) {
    if (nowMs === undefined) throw new Error('room_full');
    const futureBot = players
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.isBot && typeof entry.joinAtMs === 'number' && entry.joinAtMs > nowMs)
      .sort((left, right) => (right.entry.joinAtMs! - left.entry.joinAtMs!)
        || right.entry.id.localeCompare(left.entry.id))[0];
    if (!futureBot) throw new Error('room_full');
    displacedBotPlayerId = futureBot.entry.id;
    players[futureBot.index] = { ...player };
  } else {
    players.push({ ...player });
  }

  if (players.length > TOURNAMENT_ROOM_SIZE) throw new Error('room_full');
  const startImmediately = players.length === TOURNAMENT_ROOM_SIZE
    && players.every((entry) => !entry.isBot
      || typeof entry.joinAtMs !== 'number'
      || nowMs === undefined
      || entry.joinAtMs <= nowMs);
  return {
    room: {
      ...room,
      players,
      participantAuthUids: Array.from(new Set([...(room.participantAuthUids || []), authUid])),
      ...(startImmediately && nowMs !== undefined ? { stateDeadlineAtMs: nowMs } : {}),
      version: room.version + 1,
    },
    displacedBotPlayerId,
    startImmediately,
  };
}

export function applyTournamentJoin(
  room: TournamentRoomDoc,
  player: TournamentPlayer,
  authUid: string,
  nowMs?: number,
): TournamentRoomDoc {
  return planTournamentHumanLobbyJoin(room, player, authUid, nowMs).room;
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
  // Legacy rooms predate the immutable snapshot and keep the historical paid-room compensation.
  const nonRewardingRoom = isTournamentTestRoom(room) || hasZeroEntryEconomySnapshot(room);
  const persistedEntryGems = room.economySnapshot
    ? normalizeTournamentEconomy(room.economySnapshot).entryGems
    : undefined;
  const refunds = room.players.flatMap((player) => {
    const frozenEntryGems = persistedEntryGems === undefined
      ? undefined
      : tournamentEconomySnapshotForMode(room.economySnapshot, nonRewardingRoom).entryGems;
    const compensationGems = frozenEntryGems !== undefined
      ? (frozenEntryGems > 0 ? TOURNAMENT_CANCEL_COMPENSATION_GEMS : 0)
      : TOURNAMENT_CANCEL_COMPENSATION_GEMS;
    const refund = cancellationRefundForPlayer(player, {
      fallbackTickets: options.fallbackTickets,
      compensationGems,
      bankContributionGems: frozenEntryGems,
    });
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

export type TournamentDeadlineSubmission = {
  answers: Array<{ taskId: string; answer: unknown }>;
  taskReceivedAtMs: Record<string, number>;
  answerRanksByPlayer?: Record<string, Record<string, number>>;
  speedMatchProgress?: Record<string, SpeedMatchAttemptProgress>;
};

export function completeTournamentRoundAtDeadline(
  room: TournamentRoomDoc,
  tasks: TournamentTask[],
  nowMs: number,
  receiptSubmissions: Record<string, TournamentDeadlineSubmission> = {},
): { room: TournamentRoomDoc; completedRoundNo: number } {
  const match = /^round([1-4])$/.exec(String(room.state));
  if (!match) throw new Error('round_not_active');
  if (room.stateDeadlineAtMs && nowMs < room.stateDeadlineAtMs) throw new Error('round_deadline_not_elapsed');
  const roundNo = Number(match[1]);
  const roundIndex = room.rounds.findIndex((entry) => entry.roundNo === roundNo);
  if (roundIndex < 0) throw new Error('round_not_found');
  const taskMap = new Map(tasks.map((task) => [task.taskId, task]));
  const originalRound = room.rounds[roundIndex];
  const roundTasks = originalRound.taskIds.map((id) => taskMap.get(id)).filter((task): task is TournamentTask => !!task);
  if (roundTasks.length !== originalRound.taskIds.length) throw new Error('round_tasks_unavailable');

  let receiptAppliedRoom = room;
  for (const player of room.players) {
    if (player.isBot || originalRound.results[player.id]) continue;
    const receiptSubmission = receiptSubmissions[player.id];
    if (!receiptSubmission?.answers.length) continue;
    const receivedAtMs = Math.max(...Object.values(receiptSubmission.taskReceivedAtMs));
    const applied = applyTournamentSubmission(receiptAppliedRoom, {
      playerId: player.id,
      roundNo,
      answers: receiptSubmission.answers,
      tasks: roundTasks,
      receivedAtMs,
      taskReceivedAtMs: receiptSubmission.taskReceivedAtMs,
      maxMsPerTask: Math.max(1, Math.ceil(tournamentRoundDurationMs(roundTasks) / roundTasks.length)),
      speedMatchProgress: receiptSubmission.speedMatchProgress,
      answerRanksByPlayer: receiptSubmission.answerRanksByPlayer,
      timedOutTaskIds: originalRound.taskIds.filter((taskId) => (
        !Object.prototype.hasOwnProperty.call(receiptSubmission.taskReceivedAtMs, taskId)
      )),
    });
    receiptAppliedRoom = applied.room;
  }

  const rounds = receiptAppliedRoom.rounds.map((entry) => ({ ...entry, results: { ...(entry.results || {}) } }));
  const players = receiptAppliedRoom.players.map((entry) => ({ ...entry }));

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
        review: rounds[roundIndex].taskIds.map((taskId) => ({
          taskId,
          correct: false,
          timedOut: true,
          starsAwarded: 0,
        })),
        submissionStatus: 'timed_out',
        streakBefore: player.streak,
        missStreakBefore: player.missStreak ?? 0,
        roundStartedAtMs: room.stateStartedAtMs ?? deadlineAtMs,
        timedOut: true,
      };
      players[index] = {
        ...player,
        streak: 0,
        missStreak: (player.missStreak ?? 0) + rounds[roundIndex].taskIds.length,
      };
      continue;
    }
    const profile: BotProfile = {
      botId: player.id,
      name: player.name,
      avatarEmoji: player.avatar,
      ...(player.aura ? { avatarAura: player.aura } : {}),
      rank: 'silver',
      titles: [],
      winRate: Math.min(0.85, Math.max(0.15, player.botWinRate ?? 0.5)),
      color: player.color,
    };
    const inputs = simulateBotAnswers(profile, { roomId: room.roomId, roundNo, tasks: roundTasks, maxMsPerTask: 10_000 });
    const scored = scoreInputsWithStartingStreak(inputs, player.streak, player.missStreak ?? 0);
    players[index] = {
      ...player,
      score: player.score + scored.roundScore,
      streak: scored.streakAfter,
      missStreak: scored.missStreakAfter,
    };
    rounds[roundIndex].results[player.id] = {
      playerId: player.id,
      correct: scored.correct,
      total: rounds[roundIndex].taskIds.length,
      roundScore: scored.roundScore,
      submittedAtMs: nowMs,
      submissionStatus: 'simulated',
      streakBefore: player.streak,
      missStreakBefore: player.missStreak ?? 0,
      roundStartedAtMs: room.stateStartedAtMs ?? nowMs,
    };
  }

  const nextState = stateAfterTournamentDeadline(room.state as TournamentState);
  if (!nextState) throw new Error('round_transition_unavailable');
  const duration = stateDeadlineDurationMs(nextState);
  return {
    completedRoundNo: roundNo,
    room: {
      ...receiptAppliedRoom,
      players,
      rounds,
      state: nextState,
      stateStartedAtMs: nowMs,
      stateDeadlineAtMs: duration === null ? undefined : nowMs + duration,
      // Deadline completion is one atomic room mutation even when it consumes
      // several players' pending receipts.
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
  const { standings, realPlacements } = computePlacements(room.players);
  // New rooms always carry this snapshot. The argument remains only as a compatibility
  // fallback for legacy documents created before the snapshot contract existed.
  const nonRewardingRoom = isTournamentTestRoom(room) || hasZeroEntryEconomySnapshot(room);
  const frozenEconomy = tournamentEconomySnapshotForMode(
    room.economySnapshot ?? economy,
    nonRewardingRoom,
  );

  // зачем: приз = доля от РЕАЛЬНОГО банка турнира. Считаем состав по самой
  // комнате, а не по накопленному полю: так пересчёт финализации даёт тот же
  // результат, даже если счётчик взносов разошёлся из-за сбоя записи.
  const realCount = room.players.filter((player) => !player.isBot).length;
  const botCount = room.players.length - realCount;
  const pot = tournamentPot(realCount, botCount, frozenEconomy);
  // Start from the three positional prize shares, then expand every tie group
  // across all equal-score players. This also handles a tie crossing the third
  // position: the third share is divided by every player sharing third place.
  const basePayout = tournamentPayouts(pot, standings.length, frozenEconomy);
  const baseByPosition = new Map(basePayout.payouts.map((payout) => [payout.place, payout.gems]));
  const positionalPayouts: Array<{ position: number; place: number; gems: number }> = [];
  for (let start = 0; start < standings.length;) {
    let end = start;
    while (
      end + 1 < standings.length
      && tournamentPlayersSharePlacement(standings[end + 1], standings[start])
    ) end += 1;
    const place = start + 1;
    const groupSize = end - start + 1;
    const groupTotal = Array.from({ length: groupSize }, (_, offset) => (
      baseByPosition.get(start + offset + 1) ?? 0
    )).reduce((sum, gems) => sum + gems, 0);
    const each = Math.floor(groupTotal / groupSize);
    const remainder = groupTotal - each * groupSize;
    for (let index = start; index <= end; index += 1) {
      positionalPayouts.push({
        position: index + 1,
        place,
        gems: each + (index - start < remainder ? 1 : 0),
      });
    }
    start = end + 1;
  }
  const payoutByPlayerId = new Map(standings.map((player, index) => [
    player.id,
    positionalPayouts[index] ?? { position: index + 1, place: index + 1, gems: 0 },
  ]));
  const botPrizeGems = standings.reduce((total, player) => (
    player.isBot ? total + (payoutByPlayerId.get(player.id)?.gems ?? 0) : total
  ), 0);
  const forfeitedPrizeGems = standings.reduce((total, player) => (
    !player.isBot && player.forfeitedAtMs !== undefined
      ? total + (payoutByPlayerId.get(player.id)?.gems ?? 0)
      : total
  ), 0);

  const playerEffects = (nonRewardingRoom ? [] : realPlacements).map(({ player, place }) => {
    const forfeited = player.forfeitedAtMs !== undefined;
    return {
      playerId: player.id,
      place,
      seasonPoints: forfeited ? TOURNAMENT_SEASON_POINTS.participation : seasonPointsForPlace(place),
      tournamentsPlayed: 1 as const,
      won: !forfeited && place === 1,
      reward: forfeited ? tournamentRewardPlan(Number.MAX_SAFE_INTEGER) : tournamentRewardPlan(place, [{
        place,
        gems: payoutByPlayerId.get(player.id)?.gems ?? 0,
      }]),
    };
  });
  const rewardByPlayerId = new Map(playerEffects.map((effect) => [effect.playerId, effect.reward.gems]));
  const finalizedPlayers = standings.map((player) => ({
    ...player,
    resultPlace: payoutByPlayerId.get(player.id)?.place ?? standings.indexOf(player) + 1,
    rewardGems: player.isBot || player.forfeitedAtMs !== undefined
      ? 0
      : rewardByPlayerId.get(player.id) ?? 0,
  }));
  return {
    receiptId,
    alreadyFinalized: false,
    playerEffects,
    // Сколько уходит в недельный банк: доля с турнира + неразыгранные места.
    weeklyBankGems: pot.toWeeklyBank + basePayout.unclaimedToWeekly + botPrizeGems + forfeitedPrizeGems,
    room: {
      ...room,
      players: finalizedPlayers,
      state: 'rewards',
      potGems: pot.total,
      // зачем 2026-07-27 (владелец: «сейчас там захардкоженные цифры, их надо
      // убрать»): экран результатов рисовал выдуманные «50/25/10 жемчужин»,
      // хотя сервер платит долю РЕАЛЬНОГО банка (при 16 игроках — 24/9/6).
      // Кладём фактические выплаты в комнату: экран показывает правду и может
      // анимировать начисление из банка к каждому призёру.
      prizeGems: nonRewardingRoom ? [] : positionalPayouts
        .filter((payout) => payout.position <= 3 || payout.gems > 0)
        .map((payout) => payout.gems),
      prizePoolGems: pot.toPrizes,
      finalizationReceiptId: receiptId,
      finalizedAtMs: nowMs,
      reviewRetentionUntilMs: nowMs + TOURNAMENT_REWARD_CLAIM_WINDOW_MS,
      privateEvidenceRetentionUntilMs: nowMs + TOURNAMENT_ROOM_TTL_MS,
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

/**
 * Когда каждый бот «заходит» в лобби.
 *
 * зачем (владелец 2026-07-27): «не должно быть ощущения фальши, поэтому боты
 * добираются не сразу все — типа если за минуту в комнату пришёл 1 игрок или
 * два, то потом хуяк и сразу +15 ботов». Раньше было ровно так: одна запись,
 * все 15 ботов одновременно. Теперь первая волна уже «сидит» в лобби (иначе
 * комната выглядит пустой), а остальные растекаются по 2–30 секунд.
 *
 * Времена считаются ДЕТЕРМИНИРОВАННО из seed комнаты: запись в Firestore
 * по-прежнему одна, а все клиенты независимо получают одинаковую картину —
 * иначе у двух игроков одной комнаты лобби заполнялось бы по-разному.
 *
 * Возвращает массив той же длины, что botCount, в исходном порядке ботов.
 * Никогда не выходит за startsAt: бот, не успевший «зайти» до старта, не
 * появился бы вовсе и комната играла бы неполной.
 */
export function planBotJoinTimes(input: {
  seed: string;
  botCount: number;
  /** Начало 45-секундного окна сбора только живых игроков. */
  fromMs: number;
  /** Жёсткий конец добора: позже него не появляется никто. */
  startsAtMs: number;
  /** Deprecated compatibility input. Current contract always has a zero first wave. */
  firstWave?: number;
}): number[] {
  const { seed, botCount, fromMs, startsAtMs } = input;
  if (botCount <= 0) return [];
  const rand = tournamentPrng(`${seed}:bot_join`);
  // Exact owner contract: no bot reservation becomes visible during the first
  // 45 seconds. All reservations are spread deterministically across the next
  // 45 seconds. startsAtMs may shorten the tail, but can never pull a bot into
  // the human-only gather window.
  const gatherEnd = fromMs + TOURNAMENT_ROOM_GATHER_MS;
  const fillEnd = gatherEnd + TOURNAMENT_BOT_FILL_WINDOW_MS;
  const hardStop = Math.max(gatherEnd, Math.min(fillEnd, startsAtMs));
  return Array.from({ length: botCount }, () => (
    gatherEnd + Math.round(rand() * Math.max(0, hardStop - gatherEnd))
  ));
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
  /** Already consumed task ids. Kept outside the exposure deck so removal cannot shift its calendar cursor. */
  excludedTaskIds?: ReadonlySet<string> | readonly string[];
  /** 'single' — один режим на раунд; 'mix' — любые режимы. */
  modeKind: 'single' | 'mix';
};

const TOURNAMENT_EXPOSURE_TAGS = [
  'pool:tpool_20260801_v5',
  'pool:tpool_20260801_v6',
] as const;

type TournamentRoomDeckPosition = {
  readonly dayOrdinal: number;
  readonly shard: number;
  readonly roomSeries: string;
};

function tournamentRoomDeckPosition(roomId: string): TournamentRoomDeckPosition | null {
  const match = /_(\d{4}-\d{2}-\d{2})(?:_r(\d+))?$/.exec(roomId);
  if (!match) return null;
  const dayMs = Date.parse(`${match[1]}T00:00:00.000Z`);
  if (!Number.isFinite(dayMs)) return null;
  const roomSeries = roomId.slice(0, match.index);
  const shard = Number(match[2] ?? 0);
  return { dayOrdinal: Math.floor(dayMs / 86_400_000), shard, roomSeries };
}

function tournamentDifficultyForExposureRound(roundNo: number, dayOrdinal: number): number | null {
  if (roundNo === 1) return 1;
  if (roundNo === 2) return dayOrdinal % 2 === 0 ? 1 : 2;
  if (roundNo === 3) return 2;
  if (roundNo === 4) return 3;
  return null;
}

function tournamentDailyExposureCellQuota(mode: string, difficulty: number, dayParity: number): number {
  let quota = 0;
  for (let roundIndex = 0; roundIndex < TOURNAMENT_ROUND_MODE_PLAN.length; roundIndex += 1) {
    if (!TOURNAMENT_ROUND_MODE_PLAN[roundIndex].includes(mode as never)) continue;
    if (tournamentDifficultyForExposureRound(roundIndex + 1, dayParity) === difficulty) quota += 1;
  }
  return quota;
}

function tournamentExposureCellOffsetBeforeDay(mode: string, difficulty: number, dayOrdinal: number): number {
  const evenQuota = tournamentDailyExposureCellQuota(mode, difficulty, 0);
  const oddQuota = tournamentDailyExposureCellQuota(mode, difficulty, 1);
  const cycles = Math.floor(dayOrdinal / 2);
  return cycles * (evenQuota + oddQuota) + (dayOrdinal % 2 === 1 ? evenQuota : 0);
}

function selectTournamentExposureDeck(
  candidates: readonly TournamentTask[],
  roomId: string,
  roundNo: number,
  count: number,
  excludedTaskIds: TaskSelectionParams['excludedTaskIds'],
): TournamentTask[] | null {
  if (candidates.length === 0) return null;
  const exposureTag = TOURNAMENT_EXPOSURE_TAGS.find((tag) => (
    candidates.every((task) => task.tags?.includes(tag))
  ));
  if (!exposureTag) return null;
  const roomPosition = tournamentRoomDeckPosition(roomId);
  if (!roomPosition) return null;
  const modes = [...new Set(candidates.map((task) => task.mode))].sort();
  if (modes.length !== 1) return null;
  const mode = modes[0];
  const difficulty = tournamentDifficultyForExposureRound(roundNo, roomPosition.dayOrdinal);
  if (!difficulty) return null;
  const cell = candidates.filter((task) => task.difficulty === difficulty);
  if (cell.length === 0) return null;
  const earlierOccurrence = TOURNAMENT_ROUND_MODE_PLAN
    .slice(0, roundNo - 1)
    .reduce((total, roundModes, roundIndex) => total + (
      roundModes.includes(mode as never)
        && tournamentDifficultyForExposureRound(roundIndex + 1, roomPosition.dayOrdinal) === difficulty ? 1 : 0
    ), 0);
  const offset = tournamentExposureCellOffsetBeforeDay(mode, difficulty, roomPosition.dayOrdinal)
    + earlierOccurrence
    + roomPosition.shard * 2
    + tournamentHash32(roomPosition.roomSeries);
  const ordered = seededShuffle(
    [...cell].sort((left, right) => left.taskId.localeCompare(right.taskId)),
    `tournament-${exposureTag.endsWith('_v5') ? 'v5' : 'v6'}-exposure:${mode}:d${difficulty}`,
  );
  const rotated = Array.from({ length: ordered.length }, (_, index) => ordered[(offset + index) % ordered.length]);
  const excluded = excludedTaskIds instanceof Set
    ? excludedTaskIds
    : new Set(excludedTaskIds ?? []);
  return rotated.filter((task) => !excluded.has(task.taskId)).slice(0, Math.max(0, count));
}

/**
 * Детерминированный выбор заданий раунда из пула. Один и тот же
 * (roomId, roundNo, pool) всегда даёт один и тот же сет — сервер верифицирует
 * ответы по тому же seed (§6).
 */
export function selectRoundTasks(params: TaskSelectionParams): TournamentTask[] {
  const { pool, roomId, roundNo, count, modeKind, excludedTaskIds } = params;
  const seed = roundSeed(roomId, roundNo);
  const allowedDifficulties = roundNo === 1 ? [1]
    : roundNo === 2 ? [1, 2]
      : roundNo === 3 ? [2]
        : roundNo === 4 ? [2, 3]
          : [];
  const voiceEnabled = Boolean(tournamentFeatureGates().voiceScoring.enabled);
  const verified = pool.filter((candidate) => {
    const validation = validateTournamentTaskForNewRoom(candidate);
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
  const exposureDeck = selectTournamentExposureDeck(candidates, roomId, roundNo, count, excludedTaskIds);
  if (exposureDeck) return exposureDeck;
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
  options?: { fallbackTickets?: number; compensationGems?: number; bankContributionGems?: number },
): {
  tickets: number;
  restoreFreeWeek: string | null;
  bankContributionGems: number;
  compensationGems: number;
} | null;
export function cancellationRefundForPlayer(
  player: TournamentPlayer,
  options: { fallbackTickets?: number; compensationGems?: number; bankContributionGems?: number } = {},
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
    bankContributionGems: Math.max(0, Math.trunc(
      options.bankContributionGems ?? entry?.bankContributionGems ?? 0,
    )),
    compensationGems: Math.max(0, Math.trunc(
      options.compensationGems ?? TOURNAMENT_CANCEL_COMPENSATION_GEMS,
    )),
  };
}

export function cancellationCreditGems(refund: {
  bankContributionGems: number;
  compensationGems: number;
}): number {
  return Math.max(0, Math.trunc(refund.bankContributionGems))
    + Math.max(0, Math.trunc(refund.compensationGems));
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

function tournamentPlayersSharePlacement(a: TournamentPlayer, b: TournamentPlayer): boolean {
  return a.score === b.score
    && (a.forfeitedAtMs !== undefined) === (b.forfeitedAtMs !== undefined);
}

/** General standings. Equal scores and forfeit states share one competition place (1, 1, 3). */
export function computePlacements(players: TournamentPlayer[]): {
  standings: TournamentPlayer[];
  realPlacements: { player: TournamentPlayer; place: number }[];
} {
  const standings = players.slice().sort((a, b) => (
    Number(a.forfeitedAtMs !== undefined) - Number(b.forfeitedAtMs !== undefined)
    || b.score - a.score
    || a.id.localeCompare(b.id)
  ));
  let sharedPlace = 0;
  const placements = standings.map((player, index) => {
    if (index === 0 || !tournamentPlayersSharePlacement(player, standings[index - 1])) sharedPlace = index + 1;
    return { player, place: sharedPlace };
  });
  const realPlacements = placements.filter(({ player }) => !player.isBot);
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

// ── Профиль игрока для комнаты и рейтинга ───────────────────────────────────

/** Заглушка последней надежды. Показывать её игрокам нельзя — см. ниже. */
export const TOURNAMENT_FALLBACK_NAME = 'Player';

/**
 * Ник для комнаты и недельного рейтинга.
 *
 * зачем 2026-07-27: имя искали ТОЛЬКО в users/{uid}, а настоящий ник живёт в
 * leaderboard/{uid} (туда пишет онбординг и синк XP). Поля не совпадали, и в
 * рейтинг уезжала заглушка «Player» — её видели ВСЕ игроки таблицы сезона.
 * Порядок источников зафиксирован здесь и покрыт тестами, чтобы приоритет
 * нельзя было поменять случайной правкой внутри транзакции.
 */
export function resolveTournamentPlayerName(
  leaderboard: Record<string, unknown> | null | undefined,
  user: Record<string, unknown> | null | undefined,
): string {
  const candidates = [leaderboard?.name, user?.name, user?.displayName];
  for (const candidate of candidates) {
    const name = String(candidate ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 48);
    if (name) return name;
  }
  return TOURNAMENT_FALLBACK_NAME;
}

/** Аватар в том же порядке источников, что и ник. Пусто — берётся дефолт. */
export function resolveTournamentPlayerAvatar(
  leaderboard: Record<string, unknown> | null | undefined,
  user: Record<string, unknown> | null | undefined,
): string {
  const candidates = [leaderboard?.avatar, user?.avatar_emoji, user?.avatar];
  for (const candidate of candidates) {
    const avatar = String(candidate ?? '').trim().slice(0, 16);
    if (avatar) return avatar;
  }
  return '';
}

export type TournamentPlayerProfile = {
  name: string;
  avatar: string;
  aura?: string;
};

function tournamentUserProgress(
  user: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const progress = user?.progress;
  return progress && typeof progress === 'object' && !Array.isArray(progress)
    ? progress as Record<string, unknown>
    : {};
}

/** Resolves the current public tournament identity from canonical profile fields. */
export function resolveTournamentPlayerProfile(
  publicProfile: Record<string, unknown> | null | undefined,
  leaderboard: Record<string, unknown> | null | undefined,
  user: Record<string, unknown> | null | undefined,
  profileHint?: Record<string, unknown> | null,
): TournamentPlayerProfile {
  const progress = tournamentUserProgress(user);
  const nameCandidates = [
    publicProfile?.name,
    leaderboard?.name,
    progress.user_name,
    user?.user_name,
    user?.name,
    user?.displayName,
    profileHint?.name,
  ];
  let name = TOURNAMENT_FALLBACK_NAME;
  for (const candidate of nameCandidates) {
    const value = String(candidate ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 48);
    if (value && value !== TOURNAMENT_FALLBACK_NAME) {
      name = value;
      break;
    }
  }

  const avatarCandidates = [
    progress.user_avatar,
    user?.user_avatar,
    publicProfile?.avatar,
    leaderboard?.avatar,
    user?.avatar_emoji,
    user?.avatar,
    profileHint?.avatar,
  ];
  let avatar = '';
  for (const candidate of avatarCandidates) {
    const value = String(candidate ?? '').trim().slice(0, 128);
    if (value) {
      avatar = value;
      break;
    }
  }

  const auraCandidates = [
    progress.user_avatar_aura,
    user?.user_avatar_aura,
    publicProfile?.aura,
    leaderboard?.aura,
    profileHint?.aura,
  ];
  let aura: string | undefined;
  for (const candidate of auraCandidates) {
    if (candidate === null || candidate === undefined) continue;
    const value = String(candidate).trim().slice(0, 64);
    if (value && value !== 'none') aura = value;
    break;
  }

  return { name, avatar, ...(aura ? { aura } : {}) };
}

/**
 * Имя, которое уйдёт в запись недели.
 *
 * Заглушка НЕ должна затирать уже сохранённый настоящий ник: игрок мог сыграть
 * первый турнир до фикса, а второй — после. Поэтому порядок именно такой.
 */
export function resolveSeasonEntryName(
  roomPlayerName: unknown,
  storedSeasonName: unknown,
): string {
  const fromRoom = String(roomPlayerName ?? '').trim().slice(0, 48);
  if (fromRoom && fromRoom !== TOURNAMENT_FALLBACK_NAME) return fromRoom;
  const stored = String(storedSeasonName ?? '').trim().slice(0, 48);
  if (stored && stored !== TOURNAMENT_FALLBACK_NAME) return stored;
  return fromRoom || stored || TOURNAMENT_FALLBACK_NAME;
}

// ── Бот-персоны (§3) ────────────────────────────────────────────────────────

export type BotProfile = {
  botId: string;
  name: string;
  /** Historical field name; stores a level-avatar index or custom avatar value. */
  avatarEmoji: string;
  avatarAura?: string;
  rank: string;
  titles: string[];
  /** Реалистичный винрейт 0.15–0.85, распределение ближе к середине. */
  winRate: number;
  color: string;
};

/**
 * Selects a unique seeded roster while excluding only the immediately prior
 * room. Recent profiles are appended as a fallback when the approved fresh
 * pool cannot satisfy the requested unique count.
 */
export function selectTournamentBotProfiles(input: {
  profiles: readonly BotProfile[];
  count: number;
  seed: string;
  recentBotIds?: readonly string[];
}): BotProfile[] {
  const uniqueProfiles = Array.from(new Map(
    input.profiles.map((profile) => [profile.botId, profile] as const),
  ).values());
  const shuffled = seededShuffle(uniqueProfiles, `${input.seed}:bot_profiles`);
  const recentIds = new Set(input.recentBotIds || []);
  const fresh = shuffled.filter((profile) => !recentIds.has(profile.botId));
  const recentFallback = shuffled.filter((profile) => recentIds.has(profile.botId));
  return [...fresh, ...recentFallback].slice(0, Math.max(0, Math.trunc(input.count)));
}

const BOT_RANKS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const;
const BOT_COLORS = ['#47C870', '#FFC800', '#FF5B6C', '#16B7D9', '#B78CFF', '#FF9F43'] as const;
const BOT_TITLES = ['Фразовый маньяк', 'Спринтер', 'Тихий охотник', 'Ветеран слотов', 'Словарный запас'] as const;
const BOT_AVATAR_GRADIENTS = [
  'aurora', 'ember', 'cosmic', 'forest', 'citrine',
  'royal', 'ruby', 'magma', 'noirgold', 'sakura',
] as const;
const BOT_AVATAR_AURAS = [
  'aura-aurora', 'aura-ember', 'aura-mint', 'aura-violet',
  'aura-coral', 'aura-prism', 'aura-lagoon', 'aura-sunset',
] as const;

function botAvatarVisual(rand: () => number): { avatarEmoji: string; avatarAura?: string } {
  const usesShopAvatar = rand() < 0.12;
  const avatarEmoji = usesShopAvatar
    ? `custom:custom-gen-${String(41 + Math.floor(rand() * 22)).padStart(2, '0')}:${BOT_AVATAR_GRADIENTS[Math.floor(rand() * BOT_AVATAR_GRADIENTS.length)]}:${rand() < 0.5 ? 'black' : 'white'}`
    : String(1 + Math.floor(rand() * 60));
  const avatarAura = rand() < 0.05
    ? BOT_AVATAR_AURAS[Math.floor(rand() * BOT_AVATAR_AURAS.length)]
    : undefined;
  return avatarAura ? { avatarEmoji, avatarAura } : { avatarEmoji };
}

/** winRate: среднее двух равномерных — треугольное распределение 0.15–0.85. */
export function generateBotProfile(index: number, seed: string): BotProfile {
  const rand = tournamentPrng(`${seed}:bot:${index}`);
  // The approved 200-profile seed maps 1:1 to the reviewed multilingual corpus.
  // Larger developer-only seeds wrap deterministically without changing IDs.
  const name = REDDIT_BOT_NAMES[Math.max(0, Math.trunc(index)) % REDDIT_BOT_NAMES.length];
  // Consume the legacy avatar draw so rank/color/difficulty stay byte-for-byte
  // stable, while avatar variety evolves on an independent deterministic stream.
  rand();
  const visual = botAvatarVisual(tournamentPrng(`${seed}:bot:${index}:visual-v2`));
  const rank = BOT_RANKS[Math.floor(rand() * BOT_RANKS.length)];
  const color = BOT_COLORS[Math.floor(rand() * BOT_COLORS.length)];
  const titlesCount = rand() < 0.4 ? 1 : 0;
  const titles = Array.from({ length: titlesCount }, () => BOT_TITLES[Math.floor(rand() * BOT_TITLES.length)]);
  const winRate = Math.round(((rand() + rand()) / 2) * 70 + 15) / 100;
  return {
    botId: `bot_${String(index + 1).padStart(3, '0')}`,
    name,
    ...visual,
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
