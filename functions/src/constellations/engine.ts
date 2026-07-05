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
  /** Возрождённый неуязвим по home до этого раунда включительно (1.3); 0 = нет. */
  homeShieldUntilRound?: number;
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
  // Щит возрождённого (1.3) отразил удар по home: ядро цело, звезда на месте.
  | 'home_shielded'
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
    // 1.2: дуэль между двумя БЛИЖАЙШИМИ по силе, а не топ-2 по рейтингу —
    // иначе система штрафовала сильных (их всегда сталкивали лбами). Ищем пару
    // с минимальной разницей рейтинга; остальные атакующие «опоздали».
    let best: [PlayerSlot, PlayerSlot] | null = null;
    let bestGap = Number.POSITIVE_INFINITY;
    for (let i = 0; i < attackers.length; i += 1) {
      for (let j = i + 1; j < attackers.length; j += 1) {
        const gap = Math.abs(ratingBySlot[attackers[i].slot] - ratingBySlot[attackers[j].slot]);
        if (gap < bestGap) {
          bestGap = gap;
          best = [attackers[i].slot, attackers[j].slot];
        }
      }
    }
    const pair = (best as [PlayerSlot, PlayerSlot]).slice().sort((a, b) => a - b) as [PlayerSlot, PlayerSlot];
    duels.push({ starKey, slots: pair });
    for (const a of attackers) {
      if (a.slot !== pair[0] && a.slot !== pair[1]) outpaced.push(a.slot);
    }
  }
  return { duels, singles, outpaced };
}

/** Кап Сияния для звезды по кольцу (1.5): центр (inner/polar) — maxCenter, иначе max. */
function ringCap(starKey: string, cfg: ConstellationConfig): number {
  const ring = ringOf(parseHexKey(starKey));
  return ring === 'inner' || ring === 'polar' ? cfg.radiance.maxCenter : cfg.radiance.max;
}

/**
 * Раздача звёзд выбитой жертвы (аудит — гашение снежка). Точка удара `hitKey`
 * всегда переходит захватчику. Из остальных звёзд жертвы захватчик получает
 * только те, что СМЕЖНЫ с его владениями (фронт расширяется естественно, волной
 * от захваченной звезды); несмежные ОСВОБОЖДАЮТСЯ (owner:null) — их отвоёвывают
 * заново. Так одно выбивание не отдаёт лидеру пол-карты через анклавы.
 */
function inheritEliminatedStars(
  state: MatchState,
  attacker: PlayerSlot,
  victim: PlayerSlot,
  hitKey: string,
): void {
  const victimStars = new Set(ownedStarKeys(state, victim));
  // Точка удара — гарантированно захватчику, стартовая точка волны.
  state.stars[hitKey] = { owner: attacker, radiance: 0 };
  victimStars.delete(hitKey);

  // Волна: звезда переходит захватчику, если смежна с уже его звездой.
  // Повторяем, пока на очередном проходе кто-то присоединяется (анклав, целиком
  // отрезанный от фронта захватчика, так и останется нейтральным).
  let changed = true;
  while (changed) {
    changed = false;
    for (const key of [...victimStars]) {
      const touchesAttacker = neighborsInMap(parseHexKey(key))
        .some((n) => state.stars[hexKey(n)]?.owner === attacker);
      if (touchesAttacker) {
        state.stars[key] = { owner: attacker, radiance: 0 };
        victimStars.delete(key);
        changed = true;
      }
    }
  }

  // Остаток жертвы — нейтральные звёзды (нужно отвоёвывать снова).
  for (const key of victimStars) {
    state.stars[key] = { owner: null, radiance: 0 };
  }
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
    // 1.3: возрождённый неуязвим по home первые shieldRounds — удар просто
    // не проходит (звезда остаётся, ядро цело), даёт камбэку встать на ноги.
    // Событие home_shielded, а НЕ core_lost: ядро не снято, ложного «пробили»
    // на клиенте быть не должно (аудит-фикс).
    if (defender.homeShieldUntilRound && state.round <= defender.homeShieldUntilRound) {
      events.push({ type: 'home_shielded', slot: defender.slot, starKey });
      return;
    }
    defender.cores -= 1;
    events.push({ type: 'core_lost', slot: defender.slot, starKey, amount: defender.cores });
    if (defender.cores > 0) return;
    // 0 ядер → выбывание. Аудит (снежок): захватчику достаются только СМЕЖНЫЕ с
    // его владениями звёзды жертвы (естественное расширение фронта), остальные
    // ОСВОБОЖДАЮТСЯ (нейтральные) — их ещё нужно отвоевать, лидер не забирает
    // пол-карты одним выбиванием. Захваченная home уже посчитана как смежная.
    inheritEliminatedStars(state, attacker, defender.slot, starKey);
    state.players[attacker].bonusPoints += cfg.scoring.eliminationBonus;
    const roundsLeft = cfg.roundsTotal - state.round;
    const canFall = !defender.rebirthUsed && roundsLeft >= cfg.rebirth.minRoundsLeftToFall;
    defender.status = canFall ? 'falling' : 'out';
    defender.fallingLight = 0;
    defender.polarRoundsHeld = 0;
    events.push({ type: 'eliminated', slot: defender.slot, starKey });
    return;
  }

  // Обычный захват: нейтральная или чужая звезда (A4/A5, 1.5).
  // Позиционная игра: захват НЕ обнуляет вражескую броню в 0, а понижает на
  // captureWear (укреплённый рубеж дороже отбивать). Свой идеальный захват
  // добавляет Сияние поверх изношенного, до капа кольца (центр — до maxCenter).
  const ringMax = ringCap(starKey, cfg);
  const prevRadiance = star.radiance;
  const worn = star.owner !== null && star.owner !== attacker
    ? Math.max(0, prevRadiance - cfg.radiance.captureWear)
    : 0;
  const gained = perfect ? cfg.radiance.perfectCapture : 0;
  const radiance = Math.min(ringMax, worn + gained);
  state.stars[starKey] = { owner: attacker, radiance };
  if (perfect) state.players[attacker].perfectCaptures += 1;
  // «Последний раунд ×2 очков за захваты» (F4): бонус = стоимость звезды × (множитель − 1).
  if (state.round === cfg.roundsTotal && cfg.scoring.lastRoundCaptureMultiplier > 1) {
    const value = cfg.scoring.starPoints[ringOf(parseHexKey(starKey))];
    state.players[attacker].bonusPoints += value * (cfg.scoring.lastRoundCaptureMultiplier - 1);
  }
  events.push({ type: eventType, slot: attacker, starKey });
}

/**
 * Свободная звезда для возрождения (A11, 1.3): БЛИЖЕ к действию, а не в дальний
 * угол. Оценка = (близость к ближайшей нейтральной цели, чтобы сразу расширяться)
 * − (близость к лидеру, чтобы не воскреснуть ему в пасть). Возрождённый получает
 * шанс на камбэк, а не отсроченное поражение.
 */
function pickRebirthStar(state: MatchState, forSlot: PlayerSlot): string | null {
  const free = Object.keys(state.stars).filter((key) => state.stars[key].owner === null);
  if (free.length === 0) return null;

  // Лидер по числу владеемых звёзд (кроме нас).
  const starsBySlot = new Map<PlayerSlot, number>();
  for (const star of Object.values(state.stars)) {
    if (star.owner !== null && star.owner !== forSlot) {
      starsBySlot.set(star.owner, (starsBySlot.get(star.owner) ?? 0) + 1);
    }
  }
  let leaderSlot: PlayerSlot | null = null;
  let leaderCount = -1;
  for (const [slot, count] of starsBySlot) {
    if (count > leaderCount) { leaderCount = count; leaderSlot = slot; }
  }
  const leaderKeys = leaderSlot !== null
    ? Object.keys(state.stars).filter((k) => state.stars[k].owner === leaderSlot)
    : [];

  const nearestFreeGap = (key: string): number => {
    const h = parseHexKey(key);
    const others = free.filter((f) => f !== key);
    if (others.length === 0) return 3;
    return Math.min(...others.map((f) => hexDistance(h, parseHexKey(f))));
  };
  const nearLeader = (key: string): number => {
    if (leaderKeys.length === 0) return 6;
    const h = parseHexKey(key);
    return Math.min(...leaderKeys.map((l) => hexDistance(h, parseHexKey(l))));
  };
  // Хотим: рядом со свободными (низкий gap → есть куда расширяться) и подальше
  // от лидера (высокий nearLeader). Оценка тем больше, чем лучше по обоим.
  const scoreOf = (key: string): number => nearLeader(key) - nearestFreeGap(key);
  return [...free].sort((a, b) => scoreOf(b) - scoreOf(a) || (a < b ? -1 : 1))[0];
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
  // shieldPerMatch — живая ручка (аудит: раньше не читалась): ≤0 полностью
  // выключает щиты (kill-switch из админки). shieldUsed остаётся булевым флагом
  // «щит(ы) исчерпаны» — при лимите 1 семантика прежняя.
  const shieldsAllowed = cfg.shieldPerMatch > 0;
  for (const shield of input.shields) {
    if (!shieldsAllowed) break;
    const player = state.players[shield.slot];
    const star = state.stars[shield.starKey];
    if (!player || player.status !== 'alive' || player.shieldUsed) continue;
    if (!star || star.owner !== shield.slot) continue;
    star.radiance = Math.min(ringCap(shield.starKey, cfg), star.radiance + 1);
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
    // 1.3: 2 ядра (было 1) + невредимость home на shieldRounds раундов — иначе
    // возрождённого добивают в тот же раунд и камбэк мёртв.
    state.stars[starKey] = { owner: outcome.slot, radiance: 0 };
    state.players[outcome.slot] = {
      ...player,
      homeStarKey: starKey,
      cores: cfg.rebirth.homeCores,
      status: 'alive',
      fallingLight: 0,
      rebirthUsed: true,
      homeShieldUntilRound: state.round + cfg.rebirth.shieldRounds,
    };
    events.push({ type: 'reborn', slot: outcome.slot, starKey });
  }

  // 5. Доход Полярной (A7, 1.1): ЗАТУХАЮЩИЙ доход по числу раундов удержания —
  //    держать центр всю игру больше не авто-победа.
  const polarOwner = state.stars[POLAR_KEY]?.owner ?? null;
  for (const player of state.players) {
    if (player.slot === polarOwner && player.status === 'alive') {
      const streak = player.polarRoundsHeld; // сколько раундов уже держал (0-based индекс дохода)
      const table = cfg.scoring.polarHoldByStreak;
      const income = table.length > 0
        ? table[Math.min(streak, table.length - 1)]
        : cfg.scoring.polarHoldPerRound;
      player.bonusPoints += income;
      player.polarRoundsHeld += 1;
      events.push({ type: 'polar_income', slot: player.slot, amount: income });
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

  // 6. Бонус смежности «собери созвездие» (A7a, 1.4) — каждый раунд. Плюс
  //    доп-бонус за БОЛЬШОЕ созвездие (5+ звёзд) — альтернативная ось очков
  //    для отстающего, кому не взять дорогой центр.
  for (const player of state.players) {
    if (player.status !== 'alive') continue;
    const bonus = (() => {
      const groups = connectedGroups(ownedStarKeys(state, player.slot));
      let total = 0;
      for (const g of groups) {
        if (g.length < cfg.scoring.constellationMinSize) continue;
        total += cfg.scoring.constellationBonusPerRound;
        if (g.length >= cfg.scoring.constellationBigSize) total += cfg.scoring.constellationBigBonus;
      }
      return total;
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
