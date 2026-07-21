// ═══════════════════════════════════════════════════════════════════════════
// tournament_core.ts — чистая логика режима «Турниры» (Фаза 1 MVP).
// Спека: docs/tournaments/2026-07-21-tournaments-mode-spec.md (§5, §7, §8, §11).
//
// Здесь НЕТ Firestore/CF — только типы, константы и детерминированная
// математика (seed-рандом, скоринг, стейт-машина, призы, сезонные очки,
// банк, генератор бот-персон). IO живёт в tournaments.ts / tournament_bots.ts,
// чтобы этот модуль был полностью покрыт юнит-тестами без эмулятора.
// ═══════════════════════════════════════════════════════════════════════════

// ── Коллекции ───────────────────────────────────────────────────────────────

export const TOURNAMENT_SCHEDULE_COLLECTION = 'tournamentSchedule';
export const TOURNAMENT_SCHEDULE_CONFIG_DOC = 'config';
export const TOURNAMENT_ROOMS_COLLECTION = 'tournamentRooms';
export const TOURNAMENT_TASKS_COLLECTION = 'tournamentTasks';
export const TOURNAMENT_SEASONS_COLLECTION = 'tournamentSeasons';
export const TOURNAMENT_SEASON_ENTRIES_SUBCOLLECTION = 'entries';
export const TOURNAMENT_BANK_COLLECTION = 'tournamentBank';
export const BOT_PROFILES_COLLECTION = 'botProfiles';
export const TOURNAMENT_TICKETS_DOC = 'tickets';
export const TOURNAMENT_REWARD_CLAIMS_SUBCOLLECTION = 'reward_claims';

// ── Размеры и лимиты (§3, §11 cost-контролы) ────────────────────────────────

export const TOURNAMENT_ROOM_SIZE = 16;
export const TOURNAMENT_MIN_REAL_PLAYERS = 8;
export const TOURNAMENT_ROUNDS = 4;
export const TOURNAMENT_LOBBY_OPEN_MS = 5 * 60 * 1000; // лобби за 5 мин до старта (§2)
export const TOURNAMENT_CREATE_AHEAD_MS = 10 * 60 * 1000; // комнаты за 10 мин до слота
export const TOURNAMENT_FILL_BOTS_AHEAD_MS = 30 * 1000; // добивка ботами за 30 сек
export const TOURNAMENT_CANCEL_COMPENSATION_GEMS = 3; // «за ожидание» (§2)

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
  const data = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const rawSlots = Array.isArray(data.slots) ? data.slots : DEFAULT_TOURNAMENT_SCHEDULE.slots;
  const slots: TournamentSlotConfig[] = [];
  for (const entry of rawSlots) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const slotId = String(e.slotId ?? '').trim().slice(0, 60);
    const localTime = String(e.localTime ?? '').trim();
    if (!slotId || !/^\d{2}:\d{2}$/.test(localTime)) continue;
    slots.push({
      slotId,
      localTime,
      timezone: String(e.timezone ?? 'Europe/Moscow').trim().slice(0, 60) || 'Europe/Moscow',
      ticketsRequired: Math.max(1, Math.trunc(Number(e.ticketsRequired)) || 1),
      enabled: e.enabled !== false,
    });
  }
  return {
    slots: slots.length > 0 ? slots : [...DEFAULT_TOURNAMENT_SCHEDULE.slots],
    freeWeeklyEntry: data.freeWeeklyEntry !== false,
    ticketGemValue: Math.max(1, Math.trunc(Number(data.ticketGemValue)) || DEFAULT_TOURNAMENT_SCHEDULE.ticketGemValue),
  };
}

/** Детерминированный id комнаты: повторный запуск scheduler'а не создаёт дубль. */
export function tournamentRoomId(slotId: string, timezone: string, dateKey: string): string {
  return `${slotId}_${timezone.replace(/[^\w]/g, '_')}_${dateKey}`.slice(0, 140);
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

// ── Комната / игроки / раунды (§11) ─────────────────────────────────────────

export type TournamentPlayer = {
  /** uid живого игрока ИЛИ botId (isBot=true). */
  id: string;
  isBot: boolean;
  name: string;
  avatar: string;
  color: string;
  score: number;
  /** Серия правильных ответов без ошибок (для стрик-множителя). */
  streak: number;
  /** Билет возвращён при отмене (только живые). */
  refunded?: boolean;
};

export type TournamentRoundResult = {
  playerId: string;
  correct: number;
  total: number;
  roundScore: number;
  submittedAtMs: number;
};

export type TournamentRound = {
  roundNo: number;
  mode: string;
  taskIds: string[];
  results: Record<string, TournamentRoundResult>;
};

export type TournamentRoomDoc = {
  roomId: string;
  slotId: string;
  seed: string;
  state: TournamentState | typeof TOURNAMENT_STATE_CANCELLED;
  startsAt: number;
  players: TournamentPlayer[];
  rounds: TournamentRound[];
  /** Оптимистичная блокировка для гонок join/fill/finalize. */
  version: number;
  createdAtMs: number;
  cancelledAtMs?: number;
  cancelReason?: string;
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
  const verified = pool.filter((t) => t.verified !== false);
  let candidates = verified;
  if (modeKind === 'single' && verified.length > 0) {
    const modes = Array.from(new Set(verified.map((t) => t.mode))).sort();
    const rand = tournamentPrng(`${seed}:mode`);
    const mode = modes[Math.floor(rand() * modes.length)];
    candidates = verified.filter((t) => t.mode === mode);
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
