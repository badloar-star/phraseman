/**
 * СЕРВЕРНАЯ КОПИЯ движка звёзд Арены.
 *
 * Источник — `modules/arena/stars.ts`. Файл повторяет его один в один, отличие
 * только в первой строке: сервер не может импортировать клиентский контракт,
 * поэтому два типа объявлены здесь локально.
 *
 * Расхождение между этим файлом и клиентским означает, что игрок видит одно
 * число, а получает другое. Тест паритета `arena_stars_parity` прогоняет обе
 * реализации на одних входах и падает при первом же расхождении.
 *
 * НЕ ПРАВИТЬ ЗДЕСЬ. Правишь `modules/arena/stars.ts` — переносишь сюда.
 */

export type ArenaTaskMode =
  | 'guess_phrase' | 'fill_gap' | 'find_oddity' | 'translate_build' | 'speed_match';
export type ArenaEntryMode = 'quick' | 'ranked' | 'friend' | 'today' | 'ghost' | 'series';

export const ARENA_STARS_RULES_VERSION = 'arena-stars.v3' as const;

/** Проверка режима на границе данных: всё, что не отсюда, ареной не считается. */
export const ARENA_TASK_MODES = Object.freeze([
  'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
] as const);

export function arenaIsTaskMode(value: unknown): value is ArenaTaskMode {
  return typeof value === 'string' && (ARENA_TASK_MODES as readonly string[]).includes(value);
}


/** Окно ответа по типу задания. Сокращено владельцем на четверть 2026-08-12. */
export const ARENA_ANSWER_MS = Object.freeze({
  guess_phrase: 8_000,
  fill_gap: 8_000,
  find_oddity: 10_000,
  translate_build: 14_000,
  speed_match: 18_000,
} as const);

/**
 * Квант сравнения времени. Гонка «кто первым» решается по ведру в 100 мс, а не
 * по сырым миллисекундам: экран на 120 Гц иначе давал бы владельцу такого
 * телефона систематическое преимущество до 16.6 мс на каждом задании — около
 * 166 мс за рейтинговый матч, чего хватает, чтобы отобрать третью звезду.
 */
export const ARENA_TIME_QUANTUM_MS = 100;

export const ARENA_STARS_CORRECT = 2;
export const ARENA_STARS_CORRECT_FIRST = 3;
export const ARENA_STARS_PER_PAIR = 1;
export const ARENA_COMBO_THRESHOLD = 3;
export const ARENA_COMBO_BONUS = 1;
export const ARENA_SPEED_MATCH_PAIRS = 4;

/**
 * Считать звёзды и зачислять их в кошелёк — разные вещи.
 * `matchStars` считается ВСЕГДА, во всех режимах, потому что именно он решает
 * исход. `bankedStars` гейтится режимом. Если бы быстрый матч не считал звёзды
 * вовсе, у обоих игроков был бы счёт ноль и победа доставалась бы тому, кто
 * быстрее случайно тыкал.
 */
export type ArenaStarPolicy = 'banked' | 'unbanked' | 'none';

export const ARENA_STAR_POLICY: Readonly<Record<ArenaEntryMode, ArenaStarPolicy>> = Object.freeze({
  ranked: 'banked',
  quick: 'none',
  friend: 'unbanked',
  series: 'unbanked',
  today: 'banked',
  ghost: 'none',
});

/**
 * Потолок за матч. Выводится из фиксированного порядка типов заданий:
 * рейтинг — 3+3+3+3+4 дважды = 32 базовых плюс 8 комбо начиная с третьего
 * задания; быстрый — 16 базовых плюс 3 комбо.
 */
export function arenaMatchStarCeiling(taskCount: number): number {
  if (taskCount === 5) return 19;
  if (taskCount === 10) return 40;
  return 0;
}

export function arenaTimeBucket(ms: number): number {
  return Math.floor(Math.max(0, ms) / ARENA_TIME_QUANTUM_MS);
}

export function arenaClampRaceMs(elapsedMs: number, mode: ArenaTaskMode): number {
  const max = ARENA_ANSWER_MS[mode];
  if (!Number.isFinite(elapsedMs)) return max;
  return Math.round(Math.max(0, Math.min(elapsedMs, max)));
}

/* ----------------------------- исход задания ----------------------------- */

export type ArenaTaskOutcomeStatus = 'correct' | 'wrong' | 'timeout' | 'broken';

export type ArenaTaskOutcome = Readonly<{
  taskIndex: number;
  mode: ArenaTaskMode;
  status: ArenaTaskOutcomeStatus;
  /** Миллисекунды от открытия окна ответа НА ЭТОМ устройстве, зажатые окном. */
  raceElapsedMs: number;
  /** Только пары: сколько пар угадано С ПЕРВОЙ попытки. 0..4 */
  firstAttemptPairs: number;
  /** Только пары: сколько пар закрыто вообще — для отрисовки доски. 0..4 */
  resolvedPairs: number;
  /** Очищенный ответ ограниченного размера. */
  answer: unknown;
}>;

/* ------------------------------ начисление ------------------------------- */

export type ArenaStarLineReason =
  | 'base_correct' | 'base_pairs' | 'first' | 'combo'
  | 'wrong' | 'timeout' | 'broken';

export type ArenaStarLineState = 'earned' | 'missed' | 'not_applicable';

export type ArenaStarLine = Readonly<{
  reason: ArenaStarLineReason;
  stars: number;
  state: ArenaStarLineState;
  /** Только для упущенного бонуса за скорость: на сколько соперник был быстрее. */
  behindByMs?: number;
  pairs?: number;
  comboRun?: number;
}>;

/**
 * Ключ фразы плюс параметры. Интерфейс никогда не собирает предложение сам —
 * иначе восемь локалей разъедутся по смыслу.
 */
export type ArenaStarHeadline = Readonly<{
  key: 'starFirst' | 'starSecond' | 'starSecondUnknownDelta'
     | 'starPairsFull' | 'starPairsPartial' | 'starPairsNone'
     | 'starWrong' | 'starTimeout' | 'starBroken';
  stars: number;
  behindSeconds?: number;
  pairs?: number;
}>;

export type ArenaStarAward = Readonly<{
  stars: number;
  base: number;
  firstBonus: 0 | 1;
  comboBonus: 0 | 1;
  comboRunAfter: number;
  tieBreakElapsedMs: number;
  lines: readonly ArenaStarLine[];
  headline: ArenaStarHeadline;
}>;

type ComboEffect = 'increment' | 'hold' | 'reset';

/**
 * Как задание влияет на серию.
 *
 * Пары — особый случай. Строгий сброс убивал бы комбо ровно там, где оно
 * впервые становится оплачиваемым: пары стоят пятым и десятым заданием, и
 * требование «все четыре с первой попытки» жёстче любого другого в матче.
 * Поэтому 4/4 наращивает серию, 3/4 удерживает её, а 2 и меньше сбрасывает.
 */
function comboEffect(mode: ArenaTaskMode, status: ArenaTaskOutcomeStatus, firstAttemptPairs: number): ComboEffect {
  if (mode === 'speed_match') {
    if (firstAttemptPairs >= ARENA_SPEED_MATCH_PAIRS) return 'increment';
    if (firstAttemptPairs === ARENA_SPEED_MATCH_PAIRS - 1) return 'hold';
    return 'reset';
  }
  if (status === 'correct') return 'increment';
  // Технический сбой — не вина игрока, серия сохраняется. Но бонус за это
  // задание не платится, иначе падение рендера станет источником звёзд.
  if (status === 'broken') return 'hold';
  return 'reset';
}

export function arenaAwardStars(input: Readonly<{
  mode: ArenaTaskMode;
  status: ArenaTaskOutcomeStatus;
  raceElapsedMs: number;
  firstAttemptPairs: number;
  /** null — про соперника ничего не известно; тогда игрок считается первым. */
  opponentRaceElapsedMs: number | null;
  opponentCorrect: boolean;
  comboRunBefore: number;
}>): ArenaStarAward {
  const { mode, status, opponentCorrect, comboRunBefore } = input;
  const isPairs = mode === 'speed_match';
  const pairs = Math.max(0, Math.min(ARENA_SPEED_MATCH_PAIRS, Math.trunc(input.firstAttemptPairs)));
  const race = arenaClampRaceMs(input.raceElapsedMs, mode);

  const effect = comboEffect(mode, status, pairs);
  const runAfter = effect === 'increment' ? comboRunBefore + 1 : effect === 'hold' ? comboRunBefore : 0;

  const lines: ArenaStarLine[] = [];
  let base = 0;
  let firstBonus: 0 | 1 = 0;
  let headline: ArenaStarHeadline;

  if (isPairs) {
    base = pairs * ARENA_STARS_PER_PAIR;
    lines.push({
      reason: 'base_pairs',
      stars: base,
      state: base > 0 ? 'earned' : 'missed',
      pairs,
    });
    lines.push({ reason: 'first', stars: 0, state: 'not_applicable' });
    headline = {
      key: pairs >= ARENA_SPEED_MATCH_PAIRS ? 'starPairsFull' : pairs > 0 ? 'starPairsPartial' : 'starPairsNone',
      stars: base,
      pairs,
    };
  } else if (status === 'correct') {
    base = ARENA_STARS_CORRECT;
    lines.push({ reason: 'base_correct', stars: base, state: 'earned' });

    // «Первым» считается тот, кто первым ответил ВЕРНО. Иначе появляется приём:
    // мгновенно ткнуть любой вариант, чтобы лишить соперника третьей звезды.
    const opponentKnown = opponentCorrect && typeof input.opponentRaceElapsedMs === 'number';
    const wasFirst = !opponentCorrect
      || !opponentKnown
      || arenaTimeBucket(race) <= arenaTimeBucket(input.opponentRaceElapsedMs as number);

    if (wasFirst) {
      firstBonus = 1;
      base = ARENA_STARS_CORRECT_FIRST;
      lines.push({ reason: 'first', stars: ARENA_STARS_CORRECT_FIRST - ARENA_STARS_CORRECT, state: 'earned' });
      headline = { key: 'starFirst', stars: base };
    } else {
      const behindByMs = Math.max(0, race - (input.opponentRaceElapsedMs as number));
      lines.push({ reason: 'first', stars: 0, state: 'missed', behindByMs });
      headline = opponentKnown
        ? { key: 'starSecond', stars: base, behindSeconds: Math.round(behindByMs / 100) / 10 }
        : { key: 'starSecondUnknownDelta', stars: base };
    }
  } else {
    lines.push({
      reason: status === 'wrong' ? 'wrong' : status === 'timeout' ? 'timeout' : 'broken',
      stars: 0,
      state: 'missed',
    });
    headline = {
      key: status === 'wrong' ? 'starWrong' : status === 'timeout' ? 'starTimeout' : 'starBroken',
      stars: 0,
    };
  }

  // Комбо не платится за задание, где игрок ничего не решил: сбой рендера и
  // просрочка не должны приносить звёзд.
  const comboPayable = runAfter >= ARENA_COMBO_THRESHOLD && effect !== 'reset' && status !== 'broken';
  const comboBonus: 0 | 1 = comboPayable ? ARENA_COMBO_BONUS as 1 : 0;
  if (comboBonus) {
    lines.push({ reason: 'combo', stars: comboBonus, state: 'earned', comboRun: runAfter });
  }

  const stars = base + comboBonus;
  const headlineWithCombo: ArenaStarHeadline = comboBonus ? { ...headline, stars } : headline;

  /**
   * Время для исхода считается иначе, чем время для бонуса: неверный ответ
   * стоит полного окна. Без этого быстрый неверный тык бил бы медленный
   * верный ответ при равенстве звёзд.
   */
  const solved = isPairs ? pairs > 0 : status === 'correct';
  const tieBreakElapsedMs = solved ? race : ARENA_ANSWER_MS[mode];

  return {
    stars,
    base,
    firstBonus,
    comboBonus,
    comboRunAfter: runAfter,
    tieBreakElapsedMs,
    lines,
    headline: headlineWithCombo,
  };
}

/* -------------------------------- прогон --------------------------------- */

export type ArenaRunScore = Readonly<{
  rulesVersion: typeof ARENA_STARS_RULES_VERSION;
  perTask: readonly ArenaStarAward[];
  /** Итоговый счёт матча, зажатый потолком режима. */
  matchStars: number;
  /** До ограничения потолком — только для телеметрии. */
  rawMatchStars: number;
  tieBreakElapsedMs: number;
  raceElapsedMs: number;
  correctCount: number;
  firstCount: number;
  longestCombo: number;
  brokenCount: number;
}>;

export function arenaScoreRun(input: Readonly<{
  modes: readonly ArenaTaskMode[];
  own: readonly ArenaTaskOutcome[];
  /** null на позиции i — про соперника на этом задании ничего не известно. */
  opponent: readonly (ArenaTaskOutcome | null)[];
}>): ArenaRunScore {
  const perTask: ArenaStarAward[] = [];
  let comboRun = 0;
  let rawMatchStars = 0;
  let tieBreakElapsedMs = 0;
  let raceElapsedMs = 0;
  let correctCount = 0;
  let firstCount = 0;
  let longestCombo = 0;
  let brokenCount = 0;

  for (let index = 0; index < input.modes.length; index += 1) {
    const mode = input.modes[index] as ArenaTaskMode;
    const own = input.own[index];
    const rival = input.opponent[index] ?? null;
    const status: ArenaTaskOutcomeStatus = own?.status ?? 'timeout';
    const rivalSolved = rival
      ? (rival.mode === 'speed_match' ? rival.firstAttemptPairs > 0 : rival.status === 'correct')
      : false;

    const award = arenaAwardStars({
      mode,
      status,
      raceElapsedMs: own?.raceElapsedMs ?? ARENA_ANSWER_MS[mode],
      firstAttemptPairs: own?.firstAttemptPairs ?? 0,
      opponentRaceElapsedMs: rival ? rival.raceElapsedMs : null,
      opponentCorrect: rivalSolved,
      comboRunBefore: comboRun,
    });

    comboRun = award.comboRunAfter;
    longestCombo = Math.max(longestCombo, comboRun);
    rawMatchStars += award.stars;
    tieBreakElapsedMs += award.tieBreakElapsedMs;
    raceElapsedMs += arenaClampRaceMs(own?.raceElapsedMs ?? ARENA_ANSWER_MS[mode], mode);
    if (mode === 'speed_match' ? (own?.firstAttemptPairs ?? 0) > 0 : status === 'correct') correctCount += 1;
    if (award.firstBonus) firstCount += 1;
    if (status === 'broken') brokenCount += 1;
    perTask.push(award);
  }

  const ceiling = arenaMatchStarCeiling(input.modes.length);
  const matchStars = ceiling > 0 ? Math.min(rawMatchStars, ceiling) : rawMatchStars;

  return {
    rulesVersion: ARENA_STARS_RULES_VERSION,
    perTask,
    matchStars,
    rawMatchStars,
    tieBreakElapsedMs,
    raceElapsedMs,
    correctCount,
    firstCount,
    longestCombo,
    brokenCount,
  };
}

/* --------------------------------- исход --------------------------------- */

export type ArenaDuelOutcome = 'win' | 'loss' | 'draw';

export function arenaResolveDuel(
  left: Pick<ArenaRunScore, 'matchStars' | 'tieBreakElapsedMs'>,
  right: Pick<ArenaRunScore, 'matchStars' | 'tieBreakElapsedMs'>,
): Readonly<{ left: ArenaDuelOutcome; right: ArenaDuelOutcome; reason: 'stars' | 'time' | 'draw' }> {
  if (left.matchStars !== right.matchStars) {
    const leftWins = left.matchStars > right.matchStars;
    return { left: leftWins ? 'win' : 'loss', right: leftWins ? 'loss' : 'win', reason: 'stars' };
  }
  const leftBucket = arenaTimeBucket(left.tieBreakElapsedMs);
  const rightBucket = arenaTimeBucket(right.tieBreakElapsedMs);
  if (leftBucket === rightBucket) return { left: 'draw', right: 'draw', reason: 'draw' };
  const leftFaster = leftBucket < rightBucket;
  return { left: leftFaster ? 'win' : 'loss', right: leftFaster ? 'loss' : 'win', reason: 'time' };
}

/* ------------------------------- зачисление ------------------------------ */

/** Дневное затухание: первые четыре матча по 100 %, следующие два по 50 %. */
export const ARENA_DAILY_MULTIPLIERS = Object.freeze([1, 1, 1, 1, 0.5, 0.5] as const);
export const ARENA_DAILY_STAR_CAP = 160;

export function arenaBankedStars(input: Readonly<{
  mode: ArenaEntryMode;
  matchStars: number;
  taskCount: number;
  eligibleMatchIndex: number;
  dailyStarsBefore: number;
}>): number {
  if (ARENA_STAR_POLICY[input.mode] !== 'banked') return 0;
  const ceiling = arenaMatchStarCeiling(input.taskCount);
  const capped = ceiling > 0 ? Math.min(input.matchStars, ceiling) : input.matchStars;
  const multiplier = ARENA_DAILY_MULTIPLIERS[input.eligibleMatchIndex] ?? 0;
  const scaled = Math.floor(Math.max(0, capped) * multiplier);
  const roomLeft = Math.max(0, ARENA_DAILY_STAR_CAP - Math.max(0, input.dailyStarsBefore));
  return Math.min(scaled, roomLeft);
}

/** База опыта за звезду счёта. Кривая приложения — в constants/theme.ts. */
export const ARENA_XP_PER_STAR = 5;
export const ARENA_XP_COMPLETION = 10;
export const ARENA_XP_WIN = 20;

export function arenaMatchXp(input: Readonly<{
  mode: ArenaEntryMode;
  matchStars: number;
  outcome: ArenaDuelOutcome;
  completed: boolean;
}>): number {
  if (!input.completed) return 0;
  const base = Math.max(0, Math.trunc(input.matchStars)) * ARENA_XP_PER_STAR;
  const win = input.outcome === 'win' ? ARENA_XP_WIN : 0;
  return base + ARENA_XP_COMPLETION + win;
}
