// ════════════════════════════════════════════════════════════════════════════
// types/constellations.ts — клиентские типы игры «Созвездия».
//
// Зеркало ПУБЛИЧНЫХ контрактов functions/src/constellations/store_types.ts
// (только то, что клиент реально читает). Правильных ответов здесь нет и быть
// не может (анти-чит D6) — correct приходит ТОЛЬКО в ответе callable после
// фиксации ответа.
// ════════════════════════════════════════════════════════════════════════════

export type ConstellationSlot = 0 | 1 | 2 | 3;
export type ConstellationStage = 'active' | 'finished';
export type ConstellationPhase = 'choose' | 'answer';
export type ConstellationPlayerStatus = 'alive' | 'falling' | 'out';
export type ConstellationAssignmentKind = 'attack' | 'duel' | 'falling' | 'idle';

export interface ConstellationStar {
  owner: ConstellationSlot | null;
  radiance: number;
}

export interface ConstellationMatchPlayer {
  uid: string;
  slot: ConstellationSlot;
  name: string;
  avatar: string;
  avatarLevel: number;
  aura?: string;
  status: ConstellationPlayerStatus;
  cores: number;
  fallingLight: number;
  shieldUsed: boolean;
  bonusPoints: number;
  perfectCaptures: number;
  dustEarned: number;
  starfallEarned: number;
  roundDone: boolean;
  place?: number;
}

export interface ConstellationRoundEvent {
  type: string;
  slot?: ConstellationSlot;
  starKey?: string;
  amount?: number;
}

export interface ConstellationEmote {
  slot: ConstellationSlot;
  emoteId: string;
  round: number;
  at: number;
}

export interface ConstellationMatch {
  id: string;
  schemaVersion: number;
  stage: ConstellationStage;
  phase: ConstellationPhase;
  round: number;
  roundsTotal: number;
  phaseDeadlineAt: number;
  mapSeed: string;
  homes: string[];
  stars: Record<string, ConstellationStar>;
  players: ConstellationMatchPlayer[];
  playerIds: string[];
  starfall: { golden: boolean };
  roundEvents: ConstellationRoundEvent[];
  emotes: ConstellationEmote[];
  wagerBySlot: Record<string, number>;
  createdAt: number;
  finishedAt?: number;
  resultProcessedAt?: number;
}

export interface ConstellationDealtQuestion {
  qid: string;
  question: string;
  options: string[];
  type: 'mcq' | 'order';
  level: string;
}

export interface ConstellationAnswerRecord {
  qIndex: number;
  answerIndex: number;
  correct: boolean;
  timeMs: number;
}

export interface ConstellationPlayerPrivate {
  matchId: string;
  uid: string;
  slot: ConstellationSlot;
  round: number;
  target: string | null;
  shieldStarKey: string | null;
  kind: ConstellationAssignmentKind;
  questions: ConstellationDealtQuestion[];
  answers: ConstellationAnswerRecord[];
  dealtAt: number | null;
  doneAt: number | null;
  duelStarKey: string | null;
  duelOppSlot: ConstellationSlot | null;
  outpaced?: boolean;
}

export interface ConstellationQueueEntry {
  userId: string;
  joinedAt: number;
  displayName?: string;
  rankIndex?: number;
  wager?: number;
  expoPushToken?: string;
  matchId?: string | null;
}

/** Ответ callable на 'answer' — микро-обучение после фиксации (F3/D10). */
export interface ConstellationAnswerResult {
  ok: boolean;
  correct?: boolean;
  correctIndex?: number;
  rule?: string;
  done?: boolean;
  duplicate?: boolean;
}

export const CONSTELLATION_CLIENT_SCHEMA_VERSION = 1;
