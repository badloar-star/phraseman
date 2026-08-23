import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  toPublicTournamentTask,
  verifyTournamentAnswer,
  type TournamentTask,
} from './tournament_core';
import {
  ARENA_ANSWER_MS,
  arenaClampRaceMs,
  arenaIsTaskMode,
  arenaMatchStarCeiling,
  arenaResolveDuel,
  arenaScoreRun,
  ARENA_STAR_POLICY,
  ARENA_STARS_RULES_VERSION,
  ARENA_SPEED_MATCH_PAIRS,
  ARENA_STARS_CORRECT,
  ARENA_STARS_CORRECT_FIRST,
  ARENA_STARS_PER_PAIR,
  ARENA_COMBO_THRESHOLD,
  ARENA_COMBO_BONUS,
  ARENA_TIME_QUANTUM_MS,
  type ArenaEntryMode,
  type ArenaTaskMode,
  type ArenaTaskOutcome,
  type ArenaTaskOutcomeStatus,
  type ArenaRunScore,
} from './arena_stars_v3';

/**
 * Дуэль версии 3: матч считается на устройстве, сервер отдаёт план и принимает
 * отчёт.
 *
 * Владелец (D-12): задержек быть не должно вообще, античит не является
 * ограничением. Отсюда вся конструкция:
 *
 *   — при старте клиент получает ВСЕ задания и отпечатки правильных ответов;
 *   — таймер ведёт сам, вердикт показывает мгновенно, сервер не спрашивает;
 *   — в конце отправляет один отчёт.
 *
 * Пересчёт на сервере существует не ради защиты от читеров, а ради того, чтобы
 * начисленное число совпадало с показанным даже на старой сборке со
 * старыми константами, и чтобы настройку начисления можно было менять без
 * выпуска приложения.
 */

export const ARENA_PLAN_SCHEMA_VERSION = 'arena-match-plan.v2' as const;
export const ARENA_REPORT_SCHEMA_VERSION = 'arena-match-report.v2' as const;

/** Пауза на прочтение задания и показ результата — те же, что на клиенте. */
export const ARENA_DUEL_READING_MS = 1_500;
export const ARENA_DUEL_REVEAL_MS = 1_200;
export const ARENA_DUEL_COUNTDOWN_MS = 3_200;
/**
 * Запас после расчётной длины матча, после которого матч закрывается тем, что
 * известно. Владелец (D-70): ждать бесконечно нельзя, на той стороне живой
 * человек.
 */
export const ARENA_DUEL_SETTLE_GRACE_MS = 20_000;
/** Владелец (D-71): максимум ожидания соперника после собственного финиша. */
export const ARENA_DUEL_OPPONENT_WAIT_MS = 10_000;

export type ArenaPlanTask = Readonly<{
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

export type ArenaMatchPlanWire = Readonly<{
  schemaVersion: typeof ARENA_PLAN_SCHEMA_VERSION;
  rulesVersion: typeof ARENA_STARS_RULES_VERSION;
  matchId: string;
  mode: ArenaEntryMode;
  viewerSeat: 'a' | 'b';
  taskCount: number;
  countdownMs: number;
  readingMs: number;
  revealMs: number;
  rules: Readonly<{
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
  tasks: readonly ArenaPlanTask[];
  opponent: Readonly<{ seat: 'a' | 'b'; name: string; avatar?: string; aura?: string; rank: number }>;
  /** Всегда массив. Пустой у живого соперника — по нему тип соперника не читается. */
  opponentTicks: readonly ArenaOpponentTickWire[];
  liveChannelPath: string;
  planHash: string;
  issuedAtMs: number;
}>;

export type ArenaOpponentTickWire = Readonly<{
  taskIndex: number;
  raceElapsedMs: number;
  correct: boolean;
  firstAttemptPairs?: number;
  /**
   * зачем (2026-08-23): `correct: false` у обычного задания не различает
   * «ответил неверно» и «не успел», поэтому клиент обрывал подсчёт счёта
   * соперника на первой же его ошибке — и до конца матча вместо числа стоял
   * прочерк (владелец: «почему-то не видно счёт бота»). У бота исход известен
   * точно: его ходы сгенерированы заранее. Этот флаг говорит клиенту, что
   * значению `correct` можно верить и подсчёт можно продолжать дальше.
   * Живой соперник флаг не ставит: у него `correct: false` по-прежнему
   * неоднозначен.
   */
  exact?: true;
}>;

/** Exact pair count for a scripted speed tick; other modes omit the field. */
export function arenaOpponentFirstAttemptPairs(
  mode: ArenaTaskMode,
  matchedPairs: unknown,
): number | undefined {
  if (mode !== 'speed_match') return undefined;
  const numeric = Number(matchedPairs);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(ARENA_SPEED_MATCH_PAIRS, Math.trunc(numeric)));
}

export type ArenaSubmittedOutcome = Readonly<{
  taskIndex: number;
  status: ArenaTaskOutcomeStatus;
  raceElapsedMs: number;
  answer?: unknown;
  /** Журнал попыток по парам: номер пары → выбранные индексы по порядку. */
  pairAttempts?: Readonly<Record<string, readonly number[]>>;
}>;

export type ArenaMatchReportWire = Readonly<{
  schemaVersion: typeof ARENA_REPORT_SCHEMA_VERSION;
  rulesVersion: string;
  matchId: string;
  seat: 'a' | 'b';
  planHash: string;
  taskCount: number;
  startedAtWallMs: number;
  finishedAtWallMs: number;
  tasks: readonly ArenaSubmittedOutcome[];
  /** Что игроку ПОКАЗАЛИ. Сравнивается, пишется в счётчик, но не является правдой. */
  shownMatchStars: number;
  abandoned: boolean;
  clockSuspect: boolean;
}>;

/* ------------------------------- план матча ------------------------------ */

/** Отпечаток набора заданий: клиент присылает его обратно, чтобы поймать подмену. */
export function arenaPlanHash(matchId: string, tasks: readonly TournamentTask[]): string {
  const canonical = tasks.map((task, index) => `${index}:${task.taskId}:${task.mode}:${task.difficulty}`).join('|');
  return createHash('sha256').update(`${matchId}|${canonical}`).digest('base64url').slice(0, 32);
}

/**
 * Собирает публичное задание вместе с отпечатками ответов.
 *
 * Объяснения и разборы вырезаются: во время матча они не показываются, а
 * занимают большую часть объёма — на медленной сети это разница между
 * мгновенным стартом и ожиданием.
 */
export function arenaPlanTask(
  matchId: string,
  task: TournamentTask,
  taskIndex: number,
): ArenaPlanTask | null {
  const publicTask = toPublicTournamentTask(task, matchId);
  if (!publicTask) return null;
  // Режим обязан быть ареновым. Иначе ARENA_ANSWER_MS[mode] даст undefined, и
  // NaN разойдётся по бюджету матча, дедлайну и обрезанию времени — матч
  // закроется мгновенно и без начислений, причём молча.
  if (!arenaIsTaskMode(publicTask.mode)) return null;
  const payload = { ...(publicTask.payload as Record<string, unknown>) };
  delete payload.explanation;
  delete payload.wrongOptionReasons;
  return {
    taskId: publicTask.taskId,
    taskIndex,
    mode: publicTask.mode as ArenaTaskMode,
    kind: publicTask.kind,
    difficulty: publicTask.difficulty,
    answerMs: ARENA_ANSWER_MS[publicTask.mode as ArenaTaskMode],
    payload,
    answerFingerprints: publicTask.answerFingerprints ?? [],
  };
}

export function arenaMatchPlanRules(mode: ArenaEntryMode, taskCount: number) {
  return {
    starsCorrect: ARENA_STARS_CORRECT,
    starsCorrectFirst: ARENA_STARS_CORRECT_FIRST,
    starsPerPair: ARENA_STARS_PER_PAIR,
    comboThreshold: ARENA_COMBO_THRESHOLD,
    comboBonus: ARENA_COMBO_BONUS,
    timeQuantumMs: ARENA_TIME_QUANTUM_MS,
    starPolicy: ARENA_STAR_POLICY[mode] ?? 'none',
    awardsRankPoints: mode === 'ranked',
    matchStarCeiling: arenaMatchStarCeiling(taskCount),
  } as const;
}

/** Полная расчётная длина матча — от неё считается дедлайн закрытия. */
export function arenaMatchBudgetMs(tasks: readonly { mode: ArenaTaskMode }[]): number {
  return tasks.reduce(
    (sum, task) => sum + ARENA_DUEL_READING_MS + ARENA_ANSWER_MS[task.mode] + ARENA_DUEL_REVEAL_MS,
    ARENA_DUEL_COUNTDOWN_MS,
  );
}

/* ------------------------------ приём отчёта ----------------------------- */

const MAX_PAIR_ATTEMPTS_PER_PAIR = 12;

/**
 * Сколько пар угадано С ПЕРВОЙ попытки. Считается из запечатанного задания и
 * журнала попыток — заявленному клиентом числу здесь не верят, иначе перебор
 * снова стал бы выгодным.
 */
export function arenaRecountFirstAttemptPairs(
  matchId: string,
  task: TournamentTask,
  pairAttempts: Readonly<Record<string, readonly number[]>> | undefined,
): { firstAttemptPairs: number; resolvedPairs: number } {
  if (!pairAttempts) return { firstAttemptPairs: 0, resolvedPairs: 0 };
  const items = Array.isArray(task.payload?.items) ? task.payload.items as Record<string, unknown>[] : [];
  let firstAttemptPairs = 0;
  let resolvedPairs = 0;
  for (let pairIndex = 0; pairIndex < Math.min(items.length, ARENA_SPEED_MATCH_PAIRS); pairIndex += 1) {
    const attempts = pairAttempts[String(pairIndex)];
    if (!Array.isArray(attempts) || !attempts.length) continue;
    // Здесь задание ЗАПЕЧАТАННОЕ: correctIndex лежит открытым текстом.
    // Сравнивать отпечатками (как вынужден клиент, у которого correctIndex
    // вырезан) на сервере незачем — hash32 32-битный, и совпадение отпечатков
    // засчитало бы неверный индекс как верный. Сравниваем числа.
    const expected = Number(items[pairIndex]?.correctIndex);
    if (!Number.isInteger(expected)) continue;
    const bounded = attempts.slice(0, MAX_PAIR_ATTEMPTS_PER_PAIR);
    const hitIndex = bounded.findIndex((selected) => Number(selected) === expected);
    if (hitIndex < 0) continue;
    resolvedPairs += 1;
    if (hitIndex === 0) firstAttemptPairs += 1;
  }
  return { firstAttemptPairs, resolvedPairs };
}

/**
 * Приводит присланный отчёт к исходам, которым можно верить.
 *
 * Правильность берётся ТОЛЬКО из проверки запечатанного задания, а не из поля
 * `status`. Просрочка и технический сбой принимаются как есть и всегда дают
 * неверный ответ.
 */
export function arenaNormalizeReport(
  matchId: string,
  tasks: readonly TournamentTask[],
  submitted: readonly ArenaSubmittedOutcome[],
): ArenaTaskOutcome[] {
  const byIndex = new Map<number, ArenaSubmittedOutcome>();
  for (const row of submitted) {
    const index = Math.trunc(Number(row?.taskIndex));
    if (Number.isInteger(index) && index >= 0 && index < tasks.length && !byIndex.has(index)) {
      byIndex.set(index, row);
    }
  }

  return tasks.map((task, taskIndex) => {
    const mode = task.mode as ArenaTaskMode;
    const row = byIndex.get(taskIndex);
    if (!row) {
      return {
        taskIndex, mode, status: 'timeout' as ArenaTaskOutcomeStatus,
        raceElapsedMs: ARENA_ANSWER_MS[mode], firstAttemptPairs: 0, resolvedPairs: 0, answer: null,
      };
    }

    if (mode === 'speed_match') {
      const { firstAttemptPairs, resolvedPairs } = arenaRecountFirstAttemptPairs(matchId, task, row.pairAttempts);
      return {
        taskIndex, mode,
        status: (resolvedPairs > 0 ? 'correct' : 'timeout') as ArenaTaskOutcomeStatus,
        raceElapsedMs: arenaClampRaceMs(row.raceElapsedMs, mode),
        firstAttemptPairs, resolvedPairs, answer: null,
      };
    }

    const declared = row.status;
    if (declared === 'timeout' || declared === 'broken') {
      return {
        taskIndex, mode, status: declared,
        // Просрочка стоит полного окна: солгав о времени, клиент может сделать
        // себя только медленнее.
        raceElapsedMs: ARENA_ANSWER_MS[mode], firstAttemptPairs: 0, resolvedPairs: 0, answer: null,
      };
    }

    const correct = verifyTournamentAnswer(task, row.answer);
    return {
      taskIndex, mode,
      status: (correct ? 'correct' : 'wrong') as ArenaTaskOutcomeStatus,
      raceElapsedMs: arenaClampRaceMs(row.raceElapsedMs, mode),
      firstAttemptPairs: 0, resolvedPairs: 0,
      answer: row.answer ?? null,
    };
  });
}

/** Пересчитывает прогон против замороженных исходов соперника. */
export function arenaScoreReport(
  tasks: readonly TournamentTask[],
  own: readonly ArenaTaskOutcome[],
  opponent: readonly (ArenaTaskOutcome | null)[],
): ArenaRunScore {
  return arenaScoreRun({
    modes: tasks.map((task) => task.mode as ArenaTaskMode),
    own,
    opponent,
  });
}

/**
 * Задание, на котором матч решился: самая большая разница по звёздам, при
 * равенстве — самое позднее.
 */
export function arenaDecisiveTaskIndex(
  own: ArenaRunScore,
  rival: ArenaRunScore | null,
): number | null {
  if (!rival) return null;
  let best: number | null = null;
  let bestGap = 0;
  const length = Math.min(own.perTask.length, rival.perTask.length);
  for (let index = 0; index < length; index += 1) {
    const gap = Math.abs((own.perTask[index]?.stars ?? 0) - (rival.perTask[index]?.stars ?? 0));
    if (gap >= bestGap && gap > 0) {
      bestGap = gap;
      best = index;
    }
  }
  return best;
}

export { arenaResolveDuel };

/* ------------------------------ проверки ------------------------------- */

export function arenaAssertReportShape(report: unknown, expectedTaskCount: number): ArenaMatchReportWire {
  const row = report as Partial<ArenaMatchReportWire> | undefined;
  if (!row || typeof row !== 'object') throw new HttpsError('invalid-argument', 'arena_report_missing');
  if (row.schemaVersion !== ARENA_REPORT_SCHEMA_VERSION) {
    throw new HttpsError('failed-precondition', 'arena_report_schema_unsupported');
  }
  if (typeof row.matchId !== 'string' || !row.matchId) {
    throw new HttpsError('invalid-argument', 'arena_report_match_invalid');
  }
  if (row.seat !== 'a' && row.seat !== 'b') {
    throw new HttpsError('invalid-argument', 'arena_report_seat_invalid');
  }
  if (!Array.isArray(row.tasks) || row.tasks.length > expectedTaskCount + 2) {
    throw new HttpsError('invalid-argument', 'arena_report_tasks_invalid');
  }
  return row as ArenaMatchReportWire;
}

/** Дедлайн, после которого матч закрывается тем, что известно. */
export function arenaSettleDeadlineMs(
  startedAtMs: number,
  tasks: readonly { mode: ArenaTaskMode }[],
): number {
  return startedAtMs + arenaMatchBudgetMs(tasks) + ARENA_DUEL_SETTLE_GRACE_MS;
}

/**
 * Пора ли закрывать матч. Закрываем, когда сдали оба; когда вышел дедлайн;
 * или когда один сдал, а присутствие второго пропало и прошло окно ожидания.
 */
export function arenaShouldSettle(input: Readonly<{
  nowMs: number;
  startedAtMs: number;
  tasks: readonly { mode: ArenaTaskMode }[];
  reportsIn: number;
  participants: number;
  firstReportAtMs: number | null;
  opponentPresent: boolean;
}>): boolean {
  if (input.reportsIn >= input.participants) return true;
  if (input.nowMs >= arenaSettleDeadlineMs(input.startedAtMs, input.tasks)) return true;
  if (input.reportsIn > 0 && !input.opponentPresent && input.firstReportAtMs !== null) {
    return input.nowMs - input.firstReportAtMs >= ARENA_DUEL_OPPONENT_WAIT_MS;
  }
  return false;
}

/* --------------------------- машина расчёта ------------------------------ */

/**
 * Что делать с матчем, который никто не двигает.
 *
 * Пошаговая машина v2 здесь применяться НЕ ДОЛЖНА. Она шагает по заданиям и
 * закрывает их просрочкой, а v3-матч в это время идёт на устройстве и в базу
 * не пишет вовсе. Дать ей шагнуть означало бы забить документ расписками с
 * нулями до того, как придёт настоящий отчёт: `storeReceipt` их не
 * перезаписывает, и игрок получил бы ноль за выигранный матч.
 *
 * Поэтому у v3 своё, очень короткое решение.
 */
export type ArenaDuelReconcileAction = 'wait' | 'settle' | 'abort';

export function arenaDuelReconcile(input: Readonly<{
  nowMs: number;
  startedAtMs: number;
  tasks: readonly { mode: ArenaTaskMode }[];
  reportsIn: number;
  participants: number;
  firstReportAtMs: number | null;
  opponentPresent: boolean;
}>): ArenaDuelReconcileAction {
  if (input.reportsIn > 0) {
    return arenaShouldSettle(input) ? 'settle' : 'wait';
  }
  // Ни одного отчёта после дедлайна — матча фактически не было. Закрывать его
  // «победой» кого-то из двоих нельзя: не сыграл никто.
  return input.nowMs >= arenaSettleDeadlineMs(input.startedAtMs, input.tasks) ? 'abort' : 'wait';
}

/**
 * Момент, с которого имеет смысл спросить сервер о закрытии.
 *
 * Клиент, сдавший отчёт первым, ждёт ровно окно ожидания соперника и
 * спрашивает ОДИН раз. Опрос по кругу здесь запрещён: он и есть тот самый
 * «хартбит каждую секунду», от которого растёт счёт за базу.
 */
export function arenaDuelSettleProbeAtMs(firstReportAtMs: number): number {
  return firstReportAtMs + ARENA_DUEL_OPPONENT_WAIT_MS;
}

export function arenaDeclaredVsActualDelta(shown: unknown, actual: number): number {
  const declared = Math.trunc(Number(shown));
  return Number.isFinite(declared) ? actual - declared : 0;
}
