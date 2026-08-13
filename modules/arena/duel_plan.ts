import type { ArenaEntryMode, ArenaPublicTask, ArenaTaskMode } from './contract';
import { arenaIsTaskMode } from './stars';
import type { ArenaMatchPlan, ArenaOpponentTick } from './match_machine';
import type { ArenaCopyKey } from './copy';

/**
 * План матча в том виде, в каком его присылает сервер.
 *
 * Это единственный ответ сервера за весь матч: в нём все задания, отпечатки
 * правильных ответов и заранее выданные ходы соперника. Дальше устройство
 * играет само и обращается к серверу ровно один раз — с отчётом.
 *
 * Разбор плана здесь ЗАКРЫТЫЙ: всё, что не прошло проверку целиком,
 * отбрасывается целиком. Начать матч с половиной заданий хуже, чем честно не
 * начать: игрок доиграет до пустого места и потеряет результат, а не время.
 */

export const ARENA_PLAN_SCHEMA_VERSION = 'arena-match-plan.v2' as const;

export type ArenaPlanTaskWire = Readonly<{
  taskId: string;
  taskIndex: number;
  mode: ArenaTaskMode;
  kind: string;
  difficulty: number;
  answerMs: number;
  payload: Readonly<Record<string, unknown>>;
  /** Соседнее поле, а не часть payload — чтобы утечка ответа осталась заметной. */
  answerFingerprints: readonly string[];
}>;

export type ArenaPlanRules = Readonly<{
  starsCorrect: number;
  starsCorrectFirst: number;
  starsPerPair: number;
  comboThreshold: number;
  comboBonus: number;
  timeQuantumMs: number;
  starPolicy: string;
  awardsRankPoints: boolean;
  matchStarCeiling: number;
}>;

export type ArenaPlanOpponent = Readonly<{
  seat: 'a' | 'b';
  name: string;
  avatar?: string;
  aura?: string;
  rank: number;
}>;

export type ArenaMatchPlanWire = Readonly<{
  schemaVersion: typeof ARENA_PLAN_SCHEMA_VERSION;
  rulesVersion: string;
  matchId: string;
  mode: ArenaEntryMode;
  viewerSeat: 'a' | 'b';
  taskCount: number;
  countdownMs: number;
  readingMs: number;
  revealMs: number;
  rules: ArenaPlanRules;
  tasks: readonly ArenaPlanTaskWire[];
  opponent: ArenaPlanOpponent;
  /** Пустой у живого соперника. По пустоте тип соперника НЕ читается. */
  opponentTicks: readonly ArenaOpponentTick[];
  liveChannelPath: string;
  planHash: string;
  issuedAtMs: number;
}>;

/* ------------------------------- разбор ---------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteInt(value: unknown, min: number, max: number): number | null {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const truncated = Math.trunc(number);
  return truncated >= min && truncated <= max ? truncated : null;
}

function nonEmptyString(value: unknown, maxLength = 200): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength ? value : null;
}

const ENTRY_MODES: readonly ArenaEntryMode[] = ['quick', 'ranked', 'friend', 'today', 'ghost', 'series'];

function entryMode(value: unknown): ArenaEntryMode | null {
  return typeof value === 'string' && (ENTRY_MODES as readonly string[]).includes(value)
    ? value as ArenaEntryMode
    : null;
}

function seat(value: unknown): 'a' | 'b' | null {
  return value === 'a' || value === 'b' ? value : null;
}

/** Верхняя граница длины матча. Больше десяти заданий не бывает ни в одном режиме. */
export const ARENA_PLAN_MAX_TASKS = 10;

function parseTask(raw: unknown, expectedIndex: number): ArenaPlanTaskWire | null {
  if (!isRecord(raw)) return null;
  const taskId = nonEmptyString(raw.taskId);
  const mode = raw.mode;
  const answerMs = finiteInt(raw.answerMs, 1_000, 120_000);
  const difficulty = finiteInt(raw.difficulty, 1, 3);
  const taskIndex = finiteInt(raw.taskIndex, 0, ARENA_PLAN_MAX_TASKS - 1);
  if (!taskId || !arenaIsTaskMode(mode) || answerMs === null || difficulty === null) return null;
  // Порядок заданий — часть отпечатка плана. Задание, приехавшее под чужим
  // номером, означает разъехавшийся план, а не мелкую неточность.
  if (taskIndex !== expectedIndex) return null;
  if (!isRecord(raw.payload)) return null;
  const rawFingerprints = raw.answerFingerprints;
  if (!Array.isArray(rawFingerprints)) return null;
  const fingerprints = rawFingerprints.filter((item): item is string => typeof item === 'string');
  if (fingerprints.length !== rawFingerprints.length) return null;
  // Без отпечатков мгновенного вердикта не будет, а ждать сервер запрещено.
  if (fingerprints.length === 0) return null;
  return {
    taskId,
    taskIndex,
    mode,
    kind: typeof raw.kind === 'string' ? raw.kind : '',
    difficulty,
    answerMs,
    payload: raw.payload,
    answerFingerprints: fingerprints,
  };
}

function parseRules(raw: unknown): ArenaPlanRules | null {
  if (!isRecord(raw)) return null;
  const starsCorrect = finiteInt(raw.starsCorrect, 0, 100);
  const starsCorrectFirst = finiteInt(raw.starsCorrectFirst, 0, 100);
  const starsPerPair = finiteInt(raw.starsPerPair, 0, 100);
  const comboThreshold = finiteInt(raw.comboThreshold, 1, 100);
  const comboBonus = finiteInt(raw.comboBonus, 0, 100);
  const timeQuantumMs = finiteInt(raw.timeQuantumMs, 1, 10_000);
  const matchStarCeiling = finiteInt(raw.matchStarCeiling, 0, 10_000);
  if (starsCorrect === null || starsCorrectFirst === null || starsPerPair === null
    || comboThreshold === null || comboBonus === null || timeQuantumMs === null
    || matchStarCeiling === null) return null;
  return {
    starsCorrect,
    starsCorrectFirst,
    starsPerPair,
    comboThreshold,
    comboBonus,
    timeQuantumMs,
    starPolicy: typeof raw.starPolicy === 'string' ? raw.starPolicy : 'none',
    awardsRankPoints: raw.awardsRankPoints === true,
    matchStarCeiling,
  };
}

function parseOpponent(raw: unknown): ArenaPlanOpponent | null {
  if (!isRecord(raw)) return null;
  const opponentSeat = seat(raw.seat);
  const rank = finiteInt(raw.rank, 0, 1_000);
  if (!opponentSeat || rank === null) return null;
  return {
    seat: opponentSeat,
    name: typeof raw.name === 'string' ? raw.name : '',
    ...(typeof raw.avatar === 'string' && raw.avatar ? { avatar: raw.avatar } : {}),
    ...(typeof raw.aura === 'string' && raw.aura ? { aura: raw.aura } : {}),
    rank,
  };
}

function parseTicks(raw: unknown, taskCount: number): readonly ArenaOpponentTick[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return null;
  const ticks: ArenaOpponentTick[] = [];
  for (const item of raw) {
    if (!isRecord(item)) return null;
    const taskIndex = finiteInt(item.taskIndex, 0, taskCount - 1);
    const raceElapsedMs = finiteInt(item.raceElapsedMs, 0, 600_000);
    if (taskIndex === null || raceElapsedMs === null) return null;
    ticks.push({ taskIndex, raceElapsedMs, correct: item.correct === true });
  }
  return ticks;
}

/**
 * Разбирает ответ сервера. `null` означает «начинать матч нельзя» — вызывающий
 * обязан показать отказ, а не пустой экран.
 */
export function arenaParseMatchPlan(raw: unknown): ArenaMatchPlanWire | null {
  if (!isRecord(raw)) return null;
  if (raw.schemaVersion !== ARENA_PLAN_SCHEMA_VERSION) return null;
  const matchId = nonEmptyString(raw.matchId);
  const mode = entryMode(raw.mode);
  const viewerSeat = seat(raw.viewerSeat);
  const planHash = nonEmptyString(raw.planHash, 64);
  const rules = parseRules(raw.rules);
  const opponent = parseOpponent(raw.opponent);
  if (!matchId || !mode || !viewerSeat || !planHash || !rules || !opponent) return null;
  if (opponent.seat === viewerSeat) return null;

  if (!Array.isArray(raw.tasks)) return null;
  const tasks: ArenaPlanTaskWire[] = [];
  for (let index = 0; index < raw.tasks.length; index += 1) {
    const task = parseTask(raw.tasks[index], index);
    if (!task) return null;
    tasks.push(task);
  }
  if (tasks.length === 0 || tasks.length > ARENA_PLAN_MAX_TASKS) return null;
  const declaredCount = finiteInt(raw.taskCount, 1, ARENA_PLAN_MAX_TASKS);
  // Заявленная длина, не совпавшая с фактической, означает обрезанный ответ.
  if (declaredCount !== tasks.length) return null;

  const opponentTicks = parseTicks(raw.opponentTicks, tasks.length);
  if (!opponentTicks) return null;

  const countdownMs = finiteInt(raw.countdownMs, 0, 60_000);
  const readingMs = finiteInt(raw.readingMs, 0, 60_000);
  const revealMs = finiteInt(raw.revealMs, 0, 60_000);
  if (countdownMs === null || readingMs === null || revealMs === null) return null;

  return {
    schemaVersion: ARENA_PLAN_SCHEMA_VERSION,
    rulesVersion: typeof raw.rulesVersion === 'string' ? raw.rulesVersion : '',
    matchId,
    mode,
    viewerSeat,
    taskCount: tasks.length,
    countdownMs,
    readingMs,
    revealMs,
    rules,
    tasks,
    opponent,
    opponentTicks,
    liveChannelPath: typeof raw.liveChannelPath === 'string' ? raw.liveChannelPath : '',
    planHash,
    issuedAtMs: finiteInt(raw.issuedAtMs, 0, Number.MAX_SAFE_INTEGER) ?? 0,
  };
}

/**
 * План для машины матча — только то, что нужно арифметике.
 *
 * Полный план весит сотни килобайт, машина же обязана оставаться дешёвой:
 * редьюсер получает его на каждом событии.
 */
export function arenaMachinePlan(plan: ArenaMatchPlanWire): ArenaMatchPlan {
  return {
    matchId: plan.matchId,
    seat: plan.viewerSeat,
    mode: plan.mode,
    planHash: plan.planHash,
    tasks: plan.tasks.map((task) => ({ taskIndex: task.taskIndex, mode: task.mode })),
  };
}

/**
 * Задание в том виде, в каком его рисуют существующие компоненты вопроса.
 *
 * Отпечатки ответов сюда НЕ попадают: они нужны проверке, а не отрисовке, и в
 * пропсах компонента им делать нечего — иначе рано или поздно окажутся в
 * снимке экрана или в логе.
 */
export function arenaPlanTaskToPublic(task: ArenaPlanTaskWire): ArenaPublicTask {
  return {
    taskId: task.taskId,
    mode: task.mode,
    kind: (task.kind || 'choice') as ArenaPublicTask['kind'],
    isVoice: false,
    difficulty: task.difficulty,
    payload: task.payload,
  };
}

/* ------------------------- вход в матч ----------------------------------- */

/**
 * Окно принятия дуэли. Совпадает с серверным `ARENA_V2_ACCEPT_MS`: позже
 * сервер сам отменит матч, и повторять запросы становится нечего.
 */
export const ARENA_ACCEPT_WINDOW_MS = 12_000;
/** Пауза между попытками войти в матч, пока второй игрок ещё не принял. */
export const ARENA_ACCEPT_RETRY_MS = 1_200;

export type ArenaEntryStep = 'accept' | 'plan' | 'give_up';

/**
 * Что делать при входе в матч.
 *
 * Матч приходит в состоянии «принимается», и пока ОБА не приняли, плана не
 * существует — сервер откажет. Поэтому вход это короткий цикл, а не один
 * вызов. Цикл ограничен окном принятия: дальше матч отменит сам сервер, и
 * стучаться в него бессмысленно.
 *
 * Это НЕ опрос хода матча: он длится секунды и только до старта. Во время
 * самого матча к серверу не обращаются вовсе.
 */
export function arenaEntryStep(input: Readonly<{
  state: string;
  elapsedSinceEntryMs: number;
}>): ArenaEntryStep {
  if (input.state === 'aborted' || input.state === 'settled') return 'give_up';
  if (input.state === 'accepting') {
    return input.elapsedSinceEntryMs < ARENA_ACCEPT_WINDOW_MS ? 'accept' : 'give_up';
  }
  return 'plan';
}

/* ------------------------- вход без сети --------------------------------- */

/**
 * Почему не удалось войти в матч и что из этого следует.
 *
 * Владелец (D-72) сказал прямо: **рейтинговый матч нельзя начать без сети.**
 * И отдельно (D-58): начатый матч доигрывается оффлайн — задания уже на
 * устройстве, и пропажа сети на десятки секунд игроком не замечается.
 *
 * Разница тонкая, но принципиальная, и в коде её легко потерять: «начать» и
 * «доиграть» — разные вещи. Начать рейтинг без сети нельзя не из-за
 * технического ограничения, а потому что соперник живой: матч, начатый в
 * одностороннем порядке, — это матч, которого у второго игрока не было.
 */
export type ArenaEntryFailure =
  /** Сети нет. Повтор осмыслен, как только она вернётся. */
  | 'offline'
  /** Сервер ответил, но временно. Повтор осмыслен через паузу. */
  | 'transient'
  /** Приложение старое или Арена выключена. Повтор не поможет. */
  | 'gated'
  /** Сервер отказал по существу: матч кончился, отменён, чужой. */
  | 'rejected'
  /**
   * Соперник так и не принял вызов за отведённое окно. Это НЕ ошибка: сервер
   * отвечал исправно, просто второй игрок вышел или потерял сеть. Экран
   * выставляет это значение сам — `arenaEntryFailure` его не возвращает,
   * потому что разбирает ошибки, а здесь ошибки нет.
   */
  | 'no_opponent';

export function arenaEntryFailure(error: unknown): ArenaEntryFailure {
  const raw = typeof error === 'string' ? error : String((error as { message?: unknown })?.message ?? error ?? '');
  const code = String((error as { code?: unknown })?.code ?? '');
  const text = `${code} ${raw}`.toLowerCase();

  if (text.includes('arena_client_update_required') || text.includes('arena_disabled')
    || text.includes('arena_config_missing') || text.includes('arena_config_incompatible')) {
    return 'gated';
  }
  if (text.includes('unavailable') || text.includes('network') || text.includes('offline')
    || text.includes('failed to fetch') || text.includes('econn')) {
    return 'offline';
  }
  if (text.includes('deadline-exceeded') || text.includes('internal')
    || text.includes('resource-exhausted') || text.includes('app check')) {
    return 'transient';
  }
  return 'rejected';
}

/**
 * Что показать игроку и осмысленен ли повтор.
 *
 * Экран этого не решает: раньше он сводил четыре причины к трём веткам, и
 * «сервер занят» вместе с «матча больше нет» показывались одной строкой
 * «Повторить» — то есть глаголом вместо объяснения, да ещё и без кнопки
 * повтора. Игрок читал приказ, который нечем выполнить.
 */
export type ArenaEntryFailureCopy = Readonly<{
  title: ArenaCopyKey;
  hint: ArenaCopyKey;
  /** Повтор предлагается только там, где он может сработать. */
  canRetry: boolean;
}>;

export function arenaEntryFailureCopy(failure: ArenaEntryFailure | null): ArenaEntryFailureCopy {
  switch (failure) {
    case 'offline':
      return { title: 'entryOffline', hint: 'entryOfflineHint', canRetry: true };
    case 'transient':
      return { title: 'entryBusy', hint: 'entryBusyHint', canRetry: true };
    case 'gated':
      // Выключенную Арену повтором не включить: кнопка была бы обманом.
      return { title: 'maintenance', hint: 'maintenanceHint', canRetry: false };
    case 'no_opponent':
      return { title: 'entryNoOpponent', hint: 'entryNoOpponentHint', canRetry: false };
    default:
      // Матча больше нет — повторять нечего.
      return { title: 'entryGone', hint: 'entryGoneHint', canRetry: false };
  }
}

/**
 * Можно ли начать матч, когда сети нет.
 *
 * Ответ ВСЕГДА «нельзя», и функция существует именно затем, чтобы это было
 * написано один раз и проверялось тестом. План матча приходит с сервера: без
 * него нет ни заданий, ни отпечатков ответов, ни соперника — начинать нечего и
 * не с кем, ни в рейтинге, ни в быстром матче.
 *
 * Оффлайн относится к УЖЕ начатому матчу (D-58), и это другое место в коде.
 */
export function arenaCanStartOffline(): false {
  return false;
}
