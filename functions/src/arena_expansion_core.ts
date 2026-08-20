import { createHash } from 'crypto';
import { toPublicTournamentTask, type TournamentTask } from './tournament_core';
import { decodeArenaSpeedProgress, encodeArenaSpeedProgress } from './arena_v2_core';

export const ARENA_EXPANSION_SCHEMA_VERSION = 'arena-expansion.v1';
export const ARENA_EXPANSION_CATALOG_VERSION = 'arena-cosmetics.v1';
export const ARENA_TODAY_RUN_MS = 20 * 60 * 1_000;
export const ARENA_TODAY_STARS_CAP = 30;
export const ARENA_GHOST_TTL_MS = 48 * 60 * 60 * 1_000;
export const ARENA_LAB_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
export const ARENA_MASTERY_SIGNATURE_TTL_MS = 60 * 24 * 60 * 60 * 1_000;
export const ARENA_MASTERY_ROLLING_LIMIT = 40;
export const ARENA_PARTNER_WEEKLY_CAP = 30;

export const ARENA_EXPANSION_COLLECTIONS = Object.freeze({
  dailyPrivate: 'arena_v2_daily_private',
  ghosts: 'arena_v2_ghosts',
  series: 'arena_v2_series',
  partnerships: 'arena_v2_partnerships',
  dailyAttempts: 'arena_v2_daily_attempts',
  runs: 'arena_v2_expansion_runs',
  matchLabs: 'arena_v2_match_labs',
  masterySignatures: 'arena_v2_mastery_signatures',
  activityDays: 'arena_v2_activity_days',
  partnerWeeks: 'arena_v2_partner_weeks',
  starLedger: 'arena_v2_star_ledger',
  entitlements: 'arena_v2_entitlements',
  receipts: 'arena_v2_expansion_receipts',
});

export type ArenaExpansionRunKind = 'match' | 'today' | 'ghost' | 'rival';
export type ArenaMasteryMode = 'guess_phrase' | 'fill_gap' | 'find_oddity' | 'translate_build' | 'speed_match';
export type ArenaMasteryConfidence = 'hidden' | 'preliminary' | 'confident';

export type ArenaMasteryObservation = {
  signature: string;
  atMs: number;
  skill: number;
  difficulty: number;
  elapsedMs: number;
};

export type ArenaExpansionAnswerEvidence = {
  correct?: boolean;
  elapsedMs?: number;
  answerSnapshot?: unknown;
};

export type ArenaMasteryModeState = {
  observations: ArenaMasteryObservation[];
  score: number | null;
  sampleCount: number;
  confidence: ArenaMasteryConfidence;
  accuracy: number;
  medianMs: number;
  trend: number;
  claimedThresholds: number[];
};

export type ArenaMasteryProfileState = Partial<Record<ArenaMasteryMode, ArenaMasteryModeState>>;

export const ARENA_MASTERY_MODES = Object.freeze([
  'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
] as const);

export const ARENA_MASTERY_THRESHOLDS = Object.freeze([
  { score: 50, walletStars: 10 },
  { score: 65, walletStars: 20 },
  { score: 80, walletStars: 30 },
  { score: 90, walletStars: 40 },
] as const);

export type ArenaCosmeticSlot = 'title' | 'reaction_pack' | 'result_theme' | 'victory_stamp' | 'entry';
export type ArenaCosmeticItem = Readonly<{
  itemId: string;
  slot: ArenaCosmeticSlot;
  price: number;
}>;

export const ARENA_COSMETIC_CATALOG: readonly ArenaCosmeticItem[] = Object.freeze([
  { itemId: 'title_rising_challenger', slot: 'title', price: 250 },
  { itemId: 'title_clutch_player', slot: 'title', price: 400 },
  { itemId: 'title_wordsmith', slot: 'title', price: 600 },
  { itemId: 'reactions_respect', slot: 'reaction_pack', price: 300 },
  { itemId: 'reactions_comeback', slot: 'reaction_pack', price: 500 },
  { itemId: 'result_midnight', slot: 'result_theme', price: 400 },
  { itemId: 'result_lime', slot: 'result_theme', price: 600 },
  { itemId: 'result_champion_gold', slot: 'result_theme', price: 900 },
  { itemId: 'victory_clean_sweep', slot: 'victory_stamp', price: 500 },
  { itemId: 'victory_clutch', slot: 'victory_stamp', price: 800 },
  { itemId: 'entry_cyan_trail', slot: 'entry', price: 800 },
  { itemId: 'entry_gold_burst', slot: 'entry', price: 1200 },
  { itemId: 'entry_legend_crown', slot: 'entry', price: 1800 },
]);

function stableJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(null);
}

const NON_GAMEPLAY_KEYS = new Set([
  'explanation', 'wrongOptionReasons', 'ruleNote', 'example', 'tags', 'verified',
  'arenaPublication', 'publication', 'editorial', 'editorialNote', 'sourceNote',
]);

function gameplayPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(gameplayPayload);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.entries(record)
      .filter(([key]) => !NON_GAMEPLAY_KEYS.has(key))
      .map(([key, child]) => [key, gameplayPayload(child)]));
  }
  return value;
}

/** Content identity deliberately excludes taskId and user identity. */
export function arenaCanonicalTaskSignature(task: TournamentTask): string {
  return createHash('sha256').update(stableJson({
    mode: task.mode,
    difficulty: task.difficulty,
    payload: gameplayPayload(task.payload),
  })).digest('hex');
}

export function arenaTodayDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function arenaTodayBand(divisionIndex: number): 0 | 1 | 2 | 3 {
  const rank = Math.max(0, Math.min(23, Math.trunc(divisionIndex)));
  return Math.min(3, Math.floor(rank / 6)) as 0 | 1 | 2 | 3;
}

export function arenaTodaySnapshotId(dayKey: string, band: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || !Number.isInteger(band) || band < 0 || band > 3) {
    throw new Error('arena_today_snapshot_invalid');
  }
  return `${dayKey}_b${band}`;
}

export function arenaTodayHardExpiresAt(startedAtMs: number): number {
  return Math.max(0, Math.trunc(startedAtMs)) + ARENA_TODAY_RUN_MS;
}

export function arenaTodayStars(correct: number, submittedAnswers: number): number {
  const submitted = Math.max(0, Math.min(10, Math.trunc(submittedAnswers)));
  const correctCount = Math.max(0, Math.min(submitted, Math.trunc(correct)));
  return Math.min(ARENA_TODAY_STARS_CAP,
    2 * correctCount + (submitted >= 8 ? 5 : 0)
      + (correctCount === 10 && submitted === 10 ? 5 : 0));
}

export function arenaUtcWeekKey(nowMs: number): string {
  const date = new Date(nowMs);
  const day = date.getUTCDay() || 7;
  const monday = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day + 1);
  return new Date(monday).toISOString().slice(0, 10);
}

export function arenaPartnerSpotlightAward(sharedDays: number, claimedThresholds: readonly number[]): {
  thresholds: Array<3 | 5>;
  walletStars: number;
} {
  const days = Math.max(0, Math.trunc(sharedDays));
  const claimed = new Set(claimedThresholds);
  const thresholds: Array<3 | 5> = [];
  if (days >= 3 && !claimed.has(3)) thresholds.push(3);
  if (days >= 5 && !claimed.has(5)) thresholds.push(5);
  return { thresholds, walletStars: thresholds.reduce((sum, value) => sum + (value === 3 ? 10 : 20), 0) };
}

export function arenaRunEligibility(runKind: ArenaExpansionRunKind, mode: string): {
  rating: boolean;
  baseStars: boolean;
  todayStars: boolean;
  spin: boolean;
  mastery: boolean;
  partnerActivity: boolean;
  profileOutcome: boolean;
} {
  if (runKind === 'today') return {
    rating: false, baseStars: false, todayStars: true, spin: false,
    mastery: true, partnerActivity: true, profileOutcome: false,
  };
  if (runKind === 'ghost' || runKind === 'rival') return {
    rating: false, baseStars: false, todayStars: false, spin: false,
    mastery: false, partnerActivity: false, profileOutcome: false,
  };
  if (mode === 'friend') return {
    rating: false, baseStars: false, todayStars: false, spin: false,
    mastery: false, partnerActivity: false, profileOutcome: true,
  };
  return {
    /**
      * Новейшее решение владельца: quick выдаёт только XP. Поэтому spin,
      * mastery и partner progression доступны только ranked; profileOutcome
      * остаётся telemetry факта матча, а не отдельной наградой.
     */
    rating: mode === 'ranked', baseStars: mode === 'ranked',
    todayStars: false, spin: mode === 'ranked',
    mastery: mode === 'ranked', partnerActivity: mode === 'ranked',
    profileOutcome: true,
  };
}

export function arenaSanitizeAnswerSnapshot(answer: unknown): unknown {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return null;
  const source = answer as Record<string, unknown>;
  if (Array.isArray(source.matchedIndexes)
    && (Array.isArray(source.triedIndexes) || source.triedIndexesByPair)) {
    return encodeArenaSpeedProgress(decodeArenaSpeedProgress(source));
  }
  if (Number.isInteger(source.selectedIndex)) return { selectedIndex: Number(source.selectedIndex) };
  if (Array.isArray(source.selectedIndexes)) return {
    selectedIndexes: source.selectedIndexes.slice(0, 12).map((value) => Number.isInteger(value) ? Number(value) : -1),
  };
  if (Array.isArray(source.tokens)) return {
    tokens: source.tokens.slice(0, 24).map((value) => String(value).slice(0, 128)),
  };
  return null;
}

export function arenaSpeedSkill(matched: number, wrongAttempts: number): number {
  return Math.max(0, Math.min(1, (Math.max(0, Math.trunc(matched))
    - 0.25 * Math.max(0, Math.trunc(wrongAttempts))) / 4));
}

export function arenaMasteryObservation(
  task: TournamentTask,
  evidence: ArenaExpansionAnswerEvidence,
  atMs: number,
): ArenaMasteryObservation {
  const speed = decodeArenaSpeedProgress(evidence.answerSnapshot);
  const matched = Array.isArray(speed?.matchedIndexes) ? new Set(speed.matchedIndexes
    .filter((value) => Number.isInteger(value) && Number(value) >= 0 && Number(value) < 4)).size : 0;
  return {
    signature: arenaCanonicalTaskSignature(task),
    atMs: Math.max(0, Math.trunc(atMs)),
    skill: task.mode === 'speed_match'
      ? arenaSpeedSkill(matched, Number(speed?.wrongAttempts ?? 0)) : evidence.correct ? 1 : 0,
    difficulty: Math.max(1, Math.min(3, Math.trunc(task.difficulty))),
    elapsedMs: Math.max(0, Math.trunc(Number(evidence.elapsedMs ?? 0))),
  };
}

export function arenaLabTask(task: TournamentTask, evidence: ArenaExpansionAnswerEvidence): Record<string, unknown> {
  const publicTask = toPublicTournamentTask(task);
  const payload = task.payload;
  const solution = task.mode === 'speed_match'
    ? { correctIndexes: Array.isArray(payload.items)
      ? (payload.items as Array<Record<string, unknown>>).map((item) => Number(item.correctIndex)) : [] }
    : Number.isInteger(payload.correctIndex) ? { correctIndex: Number(payload.correctIndex) }
      : Array.isArray(payload.correctTokens) ? { correctTokens: payload.correctTokens }
        : typeof payload.correctAnswer === 'string' ? { correctAnswer: payload.correctAnswer } : {};
  return {
    taskId: task.taskId,
    mode: task.mode,
    difficulty: task.difficulty,
    publicTask,
    solution,
    explanation: task.explanation ?? null,
    answerSnapshot: task.mode === 'speed_match'
      ? encodeArenaSpeedProgress(decodeArenaSpeedProgress(evidence.answerSnapshot)) ?? null
      : evidence.answerSnapshot ?? null,
    correct: evidence.correct === true,
    elapsedMs: Math.max(0, Math.trunc(Number(evidence.elapsedMs ?? 0))),
  };
}

export function arenaBuildViewerReviewSnapshot(input: Readonly<{
  matchId: string;
  runKind: string;
  createdAtMs: number;
  tasks: readonly TournamentTask[];
  evidenceByTask: Readonly<Record<string, ArenaExpansionAnswerEvidence>>;
  summary: Readonly<Record<string, unknown>>;
}>): Readonly<{
  schemaVersion: 'arena-match-lab.v1';
  matchId: string;
  runKind: string;
  createdAtMs: number;
  tasks: readonly Record<string, unknown>[];
  retryTaskIndexes: readonly number[];
  summary: Readonly<Record<string, unknown>>;
}> {
  const tasks: Record<string, unknown>[] = input.tasks.map((task, taskIndex) => ({
    taskIndex,
    ...arenaLabTask(task, input.evidenceByTask[String(taskIndex)] ?? {}),
  }));
  return {
    schemaVersion: 'arena-match-lab.v1',
    matchId: input.matchId,
    runKind: input.runKind,
    createdAtMs: Math.max(0, Math.trunc(input.createdAtMs)),
    tasks,
    retryTaskIndexes: tasks.map((row, index) => row.correct === true ? -1 : index)
      .filter((index) => index >= 0).slice(0, 3),
    summary: input.summary,
  };
}

function difficultyWeight(difficulty: number): number {
  return difficulty <= 1 ? 0.8 : difficulty >= 3 ? 1.2 : 1;
}

function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function arenaMasteryModeState(
  observations: readonly ArenaMasteryObservation[],
  claimedThresholds: readonly number[] = [],
): ArenaMasteryModeState {
  const unique = new Map<string, ArenaMasteryObservation>();
  [...observations].sort((left, right) => right.atMs - left.atMs).forEach((observation) => {
    if (!unique.has(observation.signature)) unique.set(observation.signature, observation);
  });
  const latest = [...unique.values()]
    .sort((left, right) => right.atMs - left.atMs || left.signature.localeCompare(right.signature))
    .slice(0, ARENA_MASTERY_ROLLING_LIMIT);
  let a = 2;
  let b = 2;
  latest.forEach((observation, index) => {
    const weight = difficultyWeight(observation.difficulty) * Math.pow(0.97, index);
    const skill = Math.max(0, Math.min(1, observation.skill));
    a += weight * skill;
    b += weight * (1 - skill);
  });
  const sampleCount = latest.length;
  const rawScore = Math.round(100 * a / (a + b));
  const confidence: ArenaMasteryConfidence = sampleCount < 5 ? 'hidden'
    : sampleCount < 20 ? 'preliminary' : 'confident';
  const newest = latest.slice(0, Math.min(10, sampleCount));
  const previous = latest.slice(10, 20);
  const mean = (items: readonly ArenaMasteryObservation[]) => items.length
    ? items.reduce((sum, item) => sum + item.skill, 0) / items.length : 0;
  return {
    observations: latest,
    score: confidence === 'hidden' ? null : rawScore,
    sampleCount,
    confidence,
    accuracy: sampleCount ? Math.round(1000 * mean(latest)) / 10 : 0,
    medianMs: median(latest.map((entry) => Math.max(0, Math.trunc(entry.elapsedMs)))),
    trend: previous.length ? Math.round(1000 * (mean(newest) - mean(previous))) / 10 : 0,
    claimedThresholds: Array.from(new Set(claimedThresholds
      .filter((value) => ARENA_MASTERY_THRESHOLDS.some((entry) => entry.score === value)))).sort((x, y) => x - y),
  };
}

export function arenaApplyMasteryObservations(input: {
  current?: ArenaMasteryProfileState;
  additions: Partial<Record<ArenaMasteryMode, ArenaMasteryObservation[]>>;
  lifetimeThresholdStars: number;
}): { mastery: ArenaMasteryProfileState; walletAward: number; newlyClaimed: Array<{ mode: ArenaMasteryMode; score: number; walletStars: number }> } {
  const mastery: ArenaMasteryProfileState = { ...(input.current ?? {}) };
  const newlyClaimed: Array<{ mode: ArenaMasteryMode; score: number; walletStars: number }> = [];
  let remaining = Math.max(0, 500 - Math.max(0, Math.trunc(input.lifetimeThresholdStars)));
  for (const mode of ARENA_MASTERY_MODES) {
    const previous = mastery[mode];
    const evaluated = arenaMasteryModeState([
      ...(input.additions[mode] ?? []), ...(previous?.observations ?? []),
    ], previous?.claimedThresholds ?? []);
    for (const threshold of ARENA_MASTERY_THRESHOLDS) {
      if (evaluated.score === null || evaluated.score < threshold.score
        || evaluated.claimedThresholds.includes(threshold.score) || remaining < threshold.walletStars) continue;
      evaluated.claimedThresholds.push(threshold.score);
      newlyClaimed.push({ mode, score: threshold.score, walletStars: threshold.walletStars });
      remaining -= threshold.walletStars;
    }
    evaluated.claimedThresholds.sort((left, right) => left - right);
    mastery[mode] = evaluated;
  }
  return {
    mastery,
    walletAward: newlyClaimed.reduce((sum, entry) => sum + entry.walletStars, 0),
    newlyClaimed,
  };
}

export function arenaCatalogItem(itemId: string): ArenaCosmeticItem | null {
  return ARENA_COSMETIC_CATALOG.find((item) => item.itemId === itemId) ?? null;
}

export function arenaCosmeticSlot(value: unknown): ArenaCosmeticSlot | null {
  return value === 'title' || value === 'reaction_pack' || value === 'result_theme'
    || value === 'victory_stamp' || value === 'entry' ? value : null;
}

export function arenaRivalSeriesAfterGame(input: {
  winsA: number;
  winsB: number;
  draws: number;
  winnerSeat?: 'a' | 'b';
}): { winsA: number; winsB: number; draws: number; complete: boolean; gamesPlayed: number } {
  const winsA = Math.max(0, Math.trunc(input.winsA)) + (input.winnerSeat === 'a' ? 1 : 0);
  const winsB = Math.max(0, Math.trunc(input.winsB)) + (input.winnerSeat === 'b' ? 1 : 0);
  const draws = Math.max(0, Math.trunc(input.draws)) + (input.winnerSeat ? 0 : 1);
  const gamesPlayed = winsA + winsB + draws;
  return { winsA, winsB, draws, gamesPlayed, complete: winsA >= 2 || winsB >= 2 || gamesPlayed >= 3 };
}
