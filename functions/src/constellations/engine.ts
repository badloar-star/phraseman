// ════════════════════════════════════════════════════════════════════════════
// constellations/engine.ts — чистый движок резолва раунда (спек A3–A11).
//
// БЕЗ firebase-admin: state-in → state-out, полная покрываемость юнитами.
// Firestore-слой (транзакция резолва) только читает документы, вызывает
// resolveRound и пишет результат — вся игровая логика живёт здесь.
//
// Порядок резолва (решение спека, A4): щиты → дуэли → одиночные атаки →
// падающие звёзды/возрождение → доход Полярной → бонус созвездий →
// проверка завершения. Легальность целей движок НЕ перепроверяет — это
// обязанность callable при сабмите (submit-time validation, D6); движок
// доверяет входу и обязан быть детерминированным.
//
// Иммутабельность: вход не мутируется, возвращается новое состояние.
// ════════════════════════════════════════════════════════════════════════════

import type { ConstellationConfig } from './config';
import {
  STAR_COUNT,
  allMapHexes,
  connectedGroups,
  hexDistance,
  hexKey,
  neighborsInMap,
  parseHexKey,
  ringOf,
} from './hex';

export type PlayerSlot = 0 | 1 | 2 | 3;
export type PlayerStatus = 'alive' | 'falling' | 'out';
export type MatchStage = 'active' | 'finished';

export interface StarState {
  owner: PlayerSlot | null;
  radiance: number;
}

export interface PlayerMatchState {
  uid: string;
  slot: PlayerSlot;
  homeStarKey: string;
  cores: number;
  status: PlayerStatus;
  fallingLight: number;
  rebirthUsed: boolean;
  shieldUsed: boolean;
  bonusPoints: number;
  perfectCaptures: number;
  dustEarned: number;
  polarRoundsHeld: number;
}

export interface MatchState {
  round: number;
  roundsTotal: number;
  stage: MatchStage;
  stars: Record<string, StarState>;
  players: PlayerMatchState[];
}

export interface RoundAction {
  slot: PlayerSlot;
  target: string | null;
  shieldStarKey: string | null;
}

export interface AttackOutcome {
  slot: PlayerSlot;
  target: string;
  correctAll: boolean;
  perfect: boolean;
}

export interface DuelOutcome {
  starKey: string;
  slots: [PlayerSlot, PlayerSlot];
  /** null = оба промахнулись (в т.ч. после внезапной смерти). */
  winner: PlayerSlot | null;
}

export interface FallingOutcome {
  slot: PlayerSlot;
  answeredCorrect: boolean;
}

export interface RoundInput {
  shields: Array<{ slot: PlayerSlot; starKey: string }>;
  attacks: AttackOutcome[];
  duels: DuelOutcome[];
  falling: FallingOutcome[];
}

export type RoundEventType =
  | 'shield'
  | 'capture'
  | 'core_lost'
  | 'eliminated'
  | 'duel_capture'
  | 'reborn'
  | 'polar_income'
  | 'polar_dust'
  | 'constellation_bonus'
  | 'early_win';

export interface RoundEvent {
  type: RoundEventType;
  slot?: PlayerSlot;
  starKey?: string;
  amount?: number;
}

const POLAR_KEY = '0,0';

export function createInitialMatchState(args: {
  uids: string[];
  homes: string[];
  roundsTotal: number;
  homeCores: number;
}): MatchState {
  const stars: Record<string, StarState> = {};
  for (const h of allMapHexes()) {
    stars[hexKey(h)] = { owner: null, radiance: 0 };
  }
  const players = args.uids.map((uid, slot): PlayerMatchState => {
    const homeStarKey = args.homes[slot];
    stars[homeStarKey] = { owner: slot as PlayerSlot, radiance: 0 };
    return {
      uid,
      slot: slot as PlayerSlot,
      homeStarKey,
      cores: args.homeCores,
      status: 'alive',
      fallingLight: 0,
      rebirthUsed: false,
      shieldUsed: false,
      bonusPoints: 0,
      perfectCaptures: 0,
      dustEarned: 0,
      polarRoundsHeld: 0,
    };
  });
  return { round: 1, roundsTotal: args.roundsTotal, stage: 'active', stars, players };
}

/** Ключи звёзд игрока (включая родную). */
export function ownedStarKeys(state: MatchState, slot: PlayerSlot): string[] {
  return Object.keys(state.stars).filter((key) => state.stars[key].owner === slot);
}

/**
 * Легальные цели атаки (F3): соседи своего созвездия, не свои звёзды.
 * Падающие и выбитые целей не имеют.
 */
export function legalTargets(state: MatchState, slot: PlayerSlot): string[] {
  const player = state.players[slot];
  if (!player || player.status !== 'alive') return [];
  const targets = new Set<string>();
  for (const ownKey of ownedStarKeys(state, slot)) {
    for (const n of neighborsInMap(parseHexKey(ownKey))) {
      const nKey = hexKey(n);
      if (state.stars[nKey].owner !== slot) targets.add(nKey);
    }
  }
  return [...targets];
}

export interface ConflictResolution {
  duels: Array<{ starKey: string; slots: [PlayerSlot, PlayerSlot] }>;
  singles: RoundAction[];
  /** «Соперник опередил»: 3-й и далее атакующие одной звезды. */
  outpaced: PlayerSlot[];
}

/**
 * Конфликты фазы выбора (A4a): 2 атакующих одной звезды → дуэль;
 * 3+ → дуэль двух с лучшим рейтингом, остальные «опоздали».
 */
export function detectConflicts(
  actions: readonly RoundAction[],
  ratingBySlot: Record<PlayerSlot, number>,
): ConflictResolution {
  const byTarget = new Map<string, RoundAction[]>();
  for (const action of actions) {
    if (!action.target) continue;
    const list = byTarget.get(action.target) ?? [];
    byTarget.set(action.target, [...list, action]);
  }
  const duels: ConflictResolution['duels'] = [];
  const singles: RoundAction[] = [];
  const outpaced: PlayerSlot[] = [];
  for (const [starKey, attackers] of byTarget) {
    if (attackers.length === 1) {
      singles.push(attackers[0]);
      continue;
    }
    const byRating = [...attackers].sort(
      (a, b) => ratingBySlot[b.slot] - ratingBySlot[a.slot] || a.slot - b.slot,
    );
    const pair = byRating.slice(0, 2).map((a) => a.slot).sort((a, b) => a - b);
    duels.push({ starKey, slots: [pair[0], pair[1]] });
    for (const late of byRating.slice(2)) outpaced.push(late.slot);
  }
  return { duels, singles, outpaced };
}

/** Ядро резолва: применяет один успешный удар по звезде (атака или дуэль). */
function applyAttackSuccess(
  state: MatchState,
  attacker: PlayerSlot,
  starKey: string,
  perfect: boolean,
  cfg: ConstellationConfig,
  events: RoundEvent[],
  eventType: 'capture' | 'duel_capture',
): void {
  const star = state.stars[starKey];
  if (!star) return;
  const defender = star.owner !== null ? state.players[star.owner] : null;

  // Удар по родной звезде живого владельца → снимает ядро (A6).
  if (defender && defender.status === 'alive' && defender.homeStarKey === starKey && defender.cores > 0) {
    defender.cores -= 1;
    events.push({ type: 'core_lost', slot: defender.slot, starKey, amount: defender.cores });
    if (defender.cores > 0) return;
    // 0 ядер → выбывание: ВСЕ звёзды жертвы переходят захватчику (A6).
    for (const key of ownedStarKeys(state, defender.slot)) {
      state.stars[key] = { owner: attacker, radiance: 0 };
    }
    state.players[attacker].bonusPoints += cfg.scoring.eliminationBonus;
    const roundsLeft = cfg.roundsTotal - state.round;
    const canFall = !defender.rebirthUsed && roundsLeft >= cfg.rebirth.minRoundsLeftToFall;
    defender.status = canFall ? 'falling' : 'out';
    defender.fallingLight = 0;
    defender.polarRoundsHeld = 0;
    events.push({ type: 'eliminated', slot: defender.slot, starKey });
    return;
  }

  // Обычный захват: нейтральная или чужая звезда (A4/A5).
  const radiance = perfect ? Math.min(cfg.radiance.perfectCapture, cfg.radiance.max) : 0;
  state.stars[starKey] = { owner: attacker, radiance };
  if (perfect) state.players[attacker].perfectCaptures += 1;
  // «Последний раунд ×2 очков за захваты» (F4): бонус = стоимость звезды × (множитель − 1).
  if (state.round === cfg.roundsTotal && cfg.scoring.lastRoundCaptureMultiplier > 1) {
    const value = cfg.scoring.starPoints[ringOf(parseHexKey(starKey))];
    state.players[attacker].bonusPoints += value * (cfg.scoring.lastRoundCaptureMultiplier - 1);
  }
  events.push({ type: eventType, slot: attacker, starKey });
}

/** Свободная звезда для возрождения: внешнее кольцо, максимально далеко от врагов (A11). */
function pickRebirthStar(state: MatchState, forSlot: PlayerSlot): string | null {
  const enemyKeys = Object.keys(state.stars).filter((key) => {
    const owner = state.stars[key].owner;
    return owner !== null && owner !== forSlot;
  });
  const scoreOf = (key: string): number => {
    if (enemyKeys.length === 0) return 0;
    const h = parseHexKey(key);
    return Math.min(...enemyKeys.map((e) => hexDistance(h, parseHexKey(e))));
  };
  const pickBest = (candidates: string[]): string | null => {
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => scoreOf(b) - scoreOf(a) || (a < b ? -1 : 1))[0];
  };
  const free = Object.keys(state.stars).filter((key) => state.stars[key].owner === null);
  const outerFree = free.filter((key) => ringOf(parseHexKey(key)) === 'outer');
  // Edge case спека: нет свободной на внешнем → ближайшая к краю любого кольца.
  return pickBest(outerFree) ?? pickBest(
    [...free].sort((a, b) => hexDistance(parseHexKey(b), { q: 0, r: 0 }) - hexDistance(parseHexKey(a), { q: 0, r: 0 })),
  );
}

export interface RoundResolution {
  state: MatchState;
  events: RoundEvent[];
}

/**
 * Резолв раунда — единственная точка изменения игрового состояния.
 * Вход не мутируется; возвращается новое состояние + события для анимаций
 * клиента и начислений «Звездопада» (C1).
 */
export function resolveRound(
  input_state: MatchState,
  input: RoundInput,
  cfg: ConstellationConfig,
): RoundResolution {
  const state: MatchState = structuredClone(input_state);
  const events: RoundEvent[] = [];

  // 1. Щиты (A5a): бесплатный козырь, не тратит ход, виден всем.
  for (const shield of input.shields) {
    const player = state.players[shield.slot];
    const star = state.stars[shield.starKey];
    if (!player || player.status !== 'alive' || player.shieldUsed) continue;
    if (!star || star.owner !== shield.slot) continue;
    star.radiance = Math.min(cfg.radiance.max, star.radiance + 1);
    player.shieldUsed = true;
    events.push({ type: 'shield', slot: shield.slot, starKey: shield.starKey });
  }

  // 2. Дуэли «Столкновение» (A4a): раньше одиночных атак (решение спека).
  for (const duel of input.duels) {
    if (duel.winner === null) continue; // оба мимо — звезда прежнему владельцу
    applyAttackSuccess(state, duel.winner, duel.starKey, false, cfg, events, 'duel_capture');
  }

  // 3. Одиночные атаки — в детерминированном порядке слотов.
  const orderedAttacks = [...input.attacks].sort((a, b) => a.slot - b.slot);
  for (const attack of orderedAttacks) {
    const player = state.players[attack.slot];
    if (!player || player.status !== 'alive') continue;
    if (!attack.correctAll) continue;
    applyAttackSuccess(state, attack.slot, attack.target, attack.perfect, cfg, events, 'capture');
  }

  // 4. Падающие звёзды (A11): копят свет, возрождаются.
  for (const outcome of input.falling) {
    const player = state.players[outcome.slot];
    if (!player || player.status !== 'falling') continue;
    if (!outcome.answeredCorrect) continue;
    player.fallingLight += 1;
    if (player.fallingLight < cfg.rebirth.correctToRespawn) continue;
    const starKey = pickRebirthStar(state, outcome.slot);
    if (!starKey) continue; // нет свободных звёзд — продолжает падать (крайне редко)
    state.stars[starKey] = { owner: outcome.slot, radiance: 0 };
    state.players[outcome.slot] = {
      ...player,
      homeStarKey: starKey,
      cores: 1,
      status: 'alive',
      fallingLight: 0,
      rebirthUsed: true,
    };
    events.push({ type: 'reborn', slot: outcome.slot, starKey });
  }

  // 5. Доход Полярной (A7): очки каждый полный раунд, пыль редко, с капом.
  const polarOwner = state.stars[POLAR_KEY]?.owner ?? null;
  for (const player of state.players) {
    if (player.slot === polarOwner && player.status === 'alive') {
      player.bonusPoints += cfg.scoring.polarHoldPerRound;
      player.polarRoundsHeld += 1;
      events.push({ type: 'polar_income', slot: player.slot, amount: cfg.scoring.polarHoldPerRound });
      const earnsDust = player.polarRoundsHeld % cfg.polarDust.perRounds === 0
        && player.dustEarned < cfg.polarDust.matchCap;
      if (earnsDust) {
        player.dustEarned += 1;
        events.push({ type: 'polar_dust', slot: player.slot, amount: 1 });
      }
    } else {
      player.polarRoundsHeld = 0;
    }
  }

  // 6. Бонус смежности «собери созвездие» (A7a) — каждый раунд.
  for (const player of state.players) {
    if (player.status !== 'alive') continue;
    const bonus = (() => {
      const groups = connectedGroups(ownedStarKeys(state, player.slot));
      const qualifying = groups.filter((g) => g.length >= cfg.scoring.constellationMinSize);
      return qualifying.length * cfg.scoring.constellationBonusPerRound;
    })();
    if (bonus > 0) {
      player.bonusPoints += bonus;
      events.push({ type: 'constellation_bonus', slot: player.slot, amount: bonus });
    }
  }

  // 7. Завершение: последний раунд / ранняя победа (A9).
  const aliveOrFalling = state.players.filter((p) => p.status !== 'out');
  const earlyWinThreshold = Math.ceil((STAR_COUNT * cfg.earlyWin.mapSharePct) / 100);
  const dominator = state.players.find(
    (p) => p.status === 'alive' && ownedStarKeys(state, p.slot).length >= earlyWinThreshold,
  );
  const lastStanding = aliveOrFalling.length === 1 && aliveOrFalling[0].status === 'alive'
    ? aliveOrFalling[0]
    : null;
  if (dominator || lastStanding) {
    state.stage = 'finished';
    const winner = (dominator ?? lastStanding) as PlayerMatchState;
    events.push({ type: 'early_win', slot: winner.slot });
  } else if (state.round >= cfg.roundsTotal) {
    state.stage = 'finished';
  } else {
    state.round += 1;
  }

  return { state, events };
}
