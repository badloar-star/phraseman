// ════════════════════════════════════════════════════════════════════════════
// constellations/store_types.ts — контракты Firestore-документов (спек H1).
//
// Коллекции:
//   constellation_queue/{uid}            — очередь (аналог matchmaking_queue)
//   constellation_matches/{matchId}      — ПУБЛИЧНЫЙ матч (читают участники)
//   constellation_players/{matchId}_{uid}— приватный док игрока (вопросы БЕЗ
//                                          correct, ответы; пишется ТОЛЬКО callable)
//   constellation_server/{matchId}       — серверный док (correct-ответы, боты,
//                                          engine-состояние) — клиентам закрыт
//   constellation_results/{matchId}      — финал для истории/статистики
//   constellation_pity/{uid}             — pity Звездопада + дневные капы (серверный)
//
// Анти-чит (D6): правильный индекс НИКОГДА не попадает в match/player-доки —
// он живёт только в constellation_server, который правила не отдают никому.
// ════════════════════════════════════════════════════════════════════════════

import type { BotProfile } from './bots';
import type { MatchState, PlayerSlot, RoundEvent } from './engine';

export const CONSTELLATION_SCHEMA_VERSION = 1;

// ── Очередь ─────────────────────────────────────────────────────────────────

export interface ConstellationQueueEntry {
  userId: string;
  joinedAt: number;
  displayName?: string;
  rankIndex?: number;
  searchRange?: number;
  expoPushToken?: string;
  /** Ставка осколками (C3): 0/1/2/5. Валидируется при создании матча. */
  wager?: number;
  matchId?: string | null;
  matchedAt?: number;
}

// ── Вопросы, выданные игроку (без correct!) ────────────────────────────────

export type ConstellationQuestionType = 'mcq' | 'order';

export interface DealtQuestionPublic {
  qid: string;
  question: string;
  options: string[];
  type: ConstellationQuestionType;
  level: string;
}

export interface PlayerAnswerRecord {
  qIndex: number;
  answerIndex: number;
  correct: boolean;
  timeMs: number;
}

/** Чем занят игрок в фазе ответов текущего раунда. */
export type PlayerAssignmentKind = 'attack' | 'duel' | 'falling' | 'idle';

export interface ConstellationPlayerDoc {
  matchId: string;
  uid: string;
  slot: PlayerSlot;
  /** Раунд, к которому относятся target/questions/answers ниже. */
  round: number;
  target: string | null;
  shieldStarKey: string | null;
  kind: PlayerAssignmentKind;
  questions: DealtQuestionPublic[];
  answers: PlayerAnswerRecord[];
  dealtAt: number | null;
  doneAt: number | null;
  duelStarKey: string | null;
  duelOppSlot: PlayerSlot | null;
  /** Идемпотентность callable: последние обработанные actionId. */
  processedActionIds: string[];
  updatedAt: number;
}

// ── Публичный матч ──────────────────────────────────────────────────────────

export interface MatchPlayerPublic {
  uid: string;
  slot: PlayerSlot;
  name: string;
  avatar: string;
  avatarLevel: number;
  aura?: string;
  status: 'alive' | 'falling' | 'out';
  cores: number;
  fallingLight: number;
  shieldUsed: boolean;
  bonusPoints: number;
  /** Полный live-счёт = стоимость владеемых звёзд по кольцам + bonusPoints (0.2). */
  liveScore: number;
  perfectCaptures: number;
  dustEarned: number;
  /** Осколки, накапанные событиями «Звездопада» (виден live-счётчик, F2a). */
  starfallEarned: number;
  /** Live-индикация «сходил» в текущей фазе (F3). */
  roundDone: boolean;
  place?: number;
}

export type MatchPhase = 'choose' | 'answer';

export interface ConstellationMatchDoc {
  id: string;
  schemaVersion: number;
  stage: 'active' | 'finished';
  phase: MatchPhase;
  round: number;
  roundsTotal: number;
  phaseDeadlineAt: number;
  mapSeed: string;
  homes: string[];
  stars: Record<string, { owner: PlayerSlot | null; radiance: number }>;
  players: MatchPlayerPublic[];
  starfall: { golden: boolean };
  /** События последнего резолва — клиент проигрывает анимации по ним (F3). */
  roundEvents: RoundEvent[];
  /** Последние эмоуты (F10), капы валидирует callable. */
  emotes: Array<{ slot: PlayerSlot; emoteId: string; round: number; at: number }>;
  wagerBySlot: Record<number, number>;
  createdAt: number;
  finishedAt?: number;
  resultProcessedAt?: number;
}

// ── Серверный док (закрыт от клиентов правилами) ────────────────────────────

export interface ServerBotEntry {
  uid: string;
  slot: PlayerSlot;
  profile: BotProfile;
  /** План ответов на текущий раунд (генерится при раздаче). */
  plan: { correct: boolean[]; timesMs: number[]; perfect: boolean } | null;
  target: string | null;
  shieldStarKey: string | null;
}

export interface ConstellationServerDoc {
  matchId: string;
  /** Единственный источник истины движка; match-док — проекция. */
  state: MatchState;
  ratingBySlot: Record<number, number>;
  bots: ServerBotEntry[];
  /** Правильные ответы выданных вопросов текущего раунда. */
  correctByQid: Record<string, { correctIndex: number }>;
  /** Активные дуэли раунда: пары и общие вопросы. */
  duels: Array<{ starKey: string; slots: [PlayerSlot, PlayerSlot]; qids: string[] }>;
  /** Осколки событий Звездопада по слотам (кап matchCap — при начислении). */
  starfallBySlot: Record<number, number>;
  updatedAt: number;
}

// ── Pity и дневные капы (серверный, per-uid) ────────────────────────────────

export interface ConstellationPityDoc {
  /** Матчей без Звездопада подряд (счётчик игроку НЕ показывается, C1). */
  pityCounter: number;
  /** Дневные капы: YYYY-MM-DD UTC → выдано сегодня. */
  dayKey: string;
  dustToday: number;
  starfallToday: number;
  updatedAt: number;
}

// ── Проекция движка в публичный док ────────────────────────────────────────

export interface PlayerMeta {
  uid: string;
  name: string;
  avatar: string;
  avatarLevel: number;
  aura?: string;
}

export function publicPlayersFromState(
  state: MatchState,
  meta: PlayerMeta[],
  extras: {
    starfallBySlot: Record<number, number>;
    roundDoneSlots: ReadonlySet<number>;
    /** slot → полный счёт (звёзды+бонусы). Считает вызывающий (у него scoring). */
    liveScoreBySlot?: Record<number, number>;
  },
): MatchPlayerPublic[] {
  return state.players.map((p) => {
    const m = meta[p.slot];
    const out: MatchPlayerPublic = {
      uid: p.uid,
      slot: p.slot,
      name: m?.name ?? 'Игрок',
      avatar: m?.avatar ?? '1',
      avatarLevel: m?.avatarLevel ?? 1,
      status: p.status,
      cores: p.cores,
      fallingLight: p.fallingLight,
      shieldUsed: p.shieldUsed,
      bonusPoints: p.bonusPoints,
      liveScore: extras.liveScoreBySlot?.[p.slot] ?? p.bonusPoints,
      perfectCaptures: p.perfectCaptures,
      dustEarned: p.dustEarned,
      starfallEarned: extras.starfallBySlot[p.slot] ?? 0,
      roundDone: extras.roundDoneSlots.has(p.slot),
    };
    if (m?.aura) out.aura = m.aura;
    return out;
  });
}

/** Полный счёт по слотам: стоимость владеемых звёзд + bonusPoints (0.2/A8). */
export function liveScoreBySlotFromState(
  state: MatchState,
  starValueOf: (starKey: string) => number,
): Record<number, number> {
  const bySlot: Record<number, number> = {};
  for (const p of state.players) bySlot[p.slot] = p.bonusPoints;
  for (const [key, star] of Object.entries(state.stars)) {
    if (star.owner === null) continue;
    bySlot[star.owner] = (bySlot[star.owner] ?? 0) + starValueOf(key);
  }
  return bySlot;
}
