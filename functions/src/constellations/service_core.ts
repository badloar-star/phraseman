// ════════════════════════════════════════════════════════════════════════════
// constellations/service_core.ts — чистые сборщики оркестрации (без Firestore).
//
// Всё, что можно проверить юнитами, живёт здесь; match_service.ts остаётся
// тонкой обвязкой чтения/записи документов. Уровни вопросов замаплены на
// РЕАЛЬНЫЙ банк arena_questions (A1/A2/B1/B2 — C1 в банке нет, см. комментарий
// у RANK_TO_QUESTION_LEVEL в ../types.ts).
// ════════════════════════════════════════════════════════════════════════════

import type { ConstellationConfig } from './config';
import { scoreDuel, type DuelAnswer } from './duel';
import type {
  MatchState,
  PlayerSlot,
  RoundInput,
} from './engine';
import { parseHexKey, ringOf, type Ring } from './hex';
import type { PlayerAssignmentKind } from './store_types';

/**
 * Уровень вопросов по кольцу (A2) с поправкой на ранг матча.
 * Пороги: 6 = Gold I, 12 = Diamond I, 15 = Master I (rankToIndex 0..23).
 */
export function levelForRing(ring: Ring, matchRankIndex: number): string {
  switch (ring) {
    case 'outer': return matchRankIndex < 6 ? 'A1' : 'A2';
    case 'middle': return matchRankIndex < 12 ? 'A2' : 'B1';
    case 'inner': return matchRankIndex < 15 ? 'B1' : 'B2';
    case 'polar': return 'B2'; // спек хочет B2–C1, но C1 в банке не существует
    default: return 'A2';
  }
}

export interface AttackQuestionSpec {
  count: number;
  level: string;
  isBossAssault: boolean;
}

/** Число звёзд, владеемых слотом (для underdog-скидки). */
function starCountOf(state: MatchState, slot: number): number {
  let n = 0;
  for (const star of Object.values(state.stars)) if (star.owner === slot) n += 1;
  return n;
}

/**
 * Скидка догоняющего (1.4): если атакующий владеет ≤ maxStarsForDiscount звёзд
 * И цель принадлежит лидеру (больше всех звёзд) — минус questionDiscount вопрос.
 * Rubber-band: отстающему легче кусать лидера, снежный ком тормозится.
 */
function underdogDiscount(
  state: MatchState,
  targetKey: string,
  attackerSlot: number | undefined,
  cfg: ConstellationConfig,
): number {
  if (attackerSlot === undefined) return 0;
  const target = state.stars[targetKey];
  if (!target || target.owner === null || target.owner === attackerSlot) return 0;
  if (starCountOf(state, attackerSlot) > cfg.underdog.maxStarsForDiscount) return 0;
  // Цель у лидера?
  const counts = new Map<number, number>();
  for (const star of Object.values(state.stars)) {
    if (star.owner !== null) counts.set(star.owner, (counts.get(star.owner) ?? 0) + 1);
  }
  let leader = -1;
  let leaderCount = -1;
  for (const [slot, c] of counts) if (c > leaderCount) { leaderCount = c; leader = slot; }
  return target.owner === leader ? cfg.underdog.questionDiscount : 0;
}

/**
 * Сколько и каких вопросов выдаётся на атаку цели (A2/A5/A6):
 * кольцо + Сияние, дом = 2 среднего + Сияние, последнее ядро = босс-штурм
 * (3 внутреннего, Сияние игнорируется), общий кап attackQuestionsCap.
 * attackerSlot нужен для underdog-скидки (1.4); минимум вопросов — всегда 1.
 */
export function attackQuestionSpec(
  state: MatchState,
  targetKey: string,
  matchRankIndex: number,
  cfg: ConstellationConfig,
  attackerSlot?: number,
): AttackQuestionSpec {
  const star = state.stars[targetKey];
  const owner = star?.owner !== null && star !== undefined ? state.players[star.owner] : null;
  const isHome = !!owner && owner.status === 'alive' && owner.homeStarKey === targetKey && owner.cores > 0;
  const discount = underdogDiscount(state, targetKey, attackerSlot, cfg);
  const withDiscount = (n: number) => Math.max(1, n - discount);

  if (isHome && owner.cores === 1) {
    return {
      count: withDiscount(Math.min(cfg.bossAssaultQuestions, cfg.attackQuestionsCap)),
      level: levelForRing('inner', matchRankIndex),
      isBossAssault: true,
    };
  }
  if (isHome) {
    const count = withDiscount(Math.min(cfg.questionsPerRing.middle + star.radiance, cfg.attackQuestionsCap));
    return { count, level: levelForRing('middle', matchRankIndex), isBossAssault: false };
  }
  const ring = ringOf(parseHexKey(targetKey));
  const count = withDiscount(Math.min(cfg.questionsPerRing[ring] + (star?.radiance ?? 0), cfg.attackQuestionsCap));
  return { count, level: levelForRing(ring, matchRankIndex), isBossAssault: false };
}

// ── Сборка входа резолва из содержимого документов ──────────────────────────

export interface SlotRoundRecord {
  slot: PlayerSlot;
  kind: PlayerAssignmentKind;
  target: string | null;
  shieldStarKey: string | null;
  questionCount: number;
  answers: Array<{ qIndex: number; correct: boolean; timeMs: number }>;
  /** Боты: план может «смазать» идеальный захват (человечность, B4). */
  perfectOverride: boolean | null;
}

export interface DuelRecordInput {
  starKey: string;
  slots: [PlayerSlot, PlayerSlot];
}

const NOT_ANSWERED_TIME = Number.MAX_SAFE_INTEGER;

/** Порог «быстро» для идеального захвата: среднее время ниже половины лимита. */
export const PERFECT_SPEED_FRACTION = 0.5;

/**
 * Среднее время ответов ниже порога? Пустой список ответов (не отвечал) — не быстро.
 * timeMs у не-ответа = NOT_ANSWERED_TIME, что естественно проваливает порог.
 */
function isFastEnough(
  answers: ReadonlyArray<{ timeMs: number }>,
  thresholdMs: number,
): boolean {
  if (answers.length === 0) return false;
  const sum = answers.reduce((acc, a) => acc + a.timeMs, 0);
  return sum / answers.length < thresholdMs;
}

function duelAnswersFor(record: SlotRoundRecord | undefined, questionCount: number): DuelAnswer[] {
  const out: DuelAnswer[] = [];
  for (let i = 0; i < questionCount; i += 1) {
    const a = record?.answers.find((x) => x.qIndex === i);
    out.push(a ? { correct: a.correct, timeMs: a.timeMs } : { correct: false, timeMs: NOT_ANSWERED_TIME });
  }
  return out;
}

/**
 * RoundInput движка из записей раунда: атаки (correctAll = отвечены ВСЕ
 * выданные, неотвеченный = неверно), дуэли через scoreDuel, падающие звёзды,
 * щиты. Детерминированно — идемпотентный резолв.
 */
export function buildRoundInput(
  records: readonly SlotRoundRecord[],
  duels: readonly DuelRecordInput[],
  cfg: ConstellationConfig,
): RoundInput {
  const bySlot = new Map<PlayerSlot, SlotRoundRecord>();
  for (const r of records) bySlot.set(r.slot, r);

  const shields = records
    .filter((r) => r.shieldStarKey)
    .map((r) => ({ slot: r.slot, starKey: r.shieldStarKey as string }));

  // «Идеальный захват» = верно И быстро (аудит-фикс): среднее время ответов
  // ниже половины лимита вопроса. Боты сохраняют право «смазать» через
  // perfectOverride===false (человечность B4); у людей override === null.
  const perfectSpeedMs = cfg.questionMaxSec * 1000 * PERFECT_SPEED_FRACTION;

  const attacks = records
    .filter((r) => r.kind === 'attack' && r.target)
    .map((r) => {
      const answered = new Map(r.answers.map((a) => [a.qIndex, a.correct]));
      let correctAll = r.questionCount > 0;
      for (let i = 0; i < r.questionCount; i += 1) {
        if (answered.get(i) !== true) {
          correctAll = false;
          break;
        }
      }
      const fastEnough = isFastEnough(r.answers, perfectSpeedMs);
      // Бот явно «смазал» (false) → не идеально. Иначе (человек null / бот true)
      // идеальность требует и полной верности, и достаточной скорости.
      const notSmudged = r.perfectOverride !== false;
      return {
        slot: r.slot,
        target: r.target as string,
        correctAll,
        perfect: correctAll && notSmudged && fastEnough,
      };
    });

  // Основных вопросов в дуэли — из конфига (targetScore); +1 на внезапную смерть.
  const mainQ = Math.max(1, Math.floor(cfg.duel.targetScore));
  const duelSlots = mainQ + 1;
  const duelOutcomes = duels.map((duel) => {
    const a = duelAnswersFor(bySlot.get(duel.slots[0]), duelSlots);
    const b = duelAnswersFor(bySlot.get(duel.slots[1]), duelSlots);
    const score = scoreDuel(a, b, mainQ);
    return {
      starKey: duel.starKey,
      slots: duel.slots,
      winner: score.winner === null ? null : duel.slots[score.winner],
    };
  });

  const falling = records
    .filter((r) => r.kind === 'falling')
    .map((r) => ({
      slot: r.slot,
      answeredCorrect: r.answers.some((a) => a.qIndex === 0 && a.correct),
    }));

  return { shields, attacks, duels: duelOutcomes, falling };
}
