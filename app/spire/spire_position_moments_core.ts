// ═══════════════════════════════════════════════════════════════════════════
// spire_position_moments_core.ts — чистые решения окон m05 Пика: «Позиция выросла», «Тебя обогнали», «Последний шанс».
//
// зачем (координатор 15.10; договор Дизайна components/spire/moments/position_moments_contract.ts): Дизайн рисует окна, Ядро
// решает «когда». Решения — только из того, что экран Пика уже держит (строки комнаты, rankBy, неделя, энергия): 0 чтений сети.
// Зоны — та же spireZonesFor, что у экрана «Все участники»: окно не может спорить со списком.
// Модуль чистый: ни сети, ни хранилища, время — аргументом. Хранение пометок — в use_spire_position_moments.ts.
// Журнал (в хуке): общий префикс Пика '[SPIRE]' + '[SPIRE-MOMENT-TRIGGER]'.
// ═══════════════════════════════════════════════════════════════════════════
import type {
  SpireLastChanceShow,
  SpireOvertakeShow,
  SpirePositionRiseShow,
} from '../../components/spire/moments/position_moments_contract';
import type { MomentRoomRow } from '../../components/spire/moments/MomentPromotion';
import { spireZonesFor, type SpireZone } from '../../components/spire/spire_zones';
import type { SpireRoomRow } from '../../modules/spire/room_rows';

export type SpireRankByView = 'steps' | 'coins';

/** Моя позиция в отсортированной комнате. */
export type SpirePositionState = Readonly<{
  weekId: string;
  roomFetchedAtMs: number;
  place: number;
  zone: SpireZone;
  steps: number;
  coins: number;
}>;

export const SPIRE_RISE_WINDOW_ROWS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
export const SPIRE_LAST_CHANCE_LOCAL_HOUR = 18;

export function spirePositionOf(
  rows: readonly SpireRoomRow[],
  rankBy: SpireRankByView,
  weekId: string,
  roomFetchedAtMs: number,
): SpirePositionState | null {
  const index = rows.findIndex((r) => r.isMe);
  if (index < 0) return null;
  const zones = spireZonesFor(rows, rankBy);
  const me = rows[index];
  return { weekId, roomFetchedAtMs, place: index + 1, zone: zones[index] ?? 'stay', steps: me.steps, coins: me.weekCoins };
}

const toMomentRow = (r: SpireRoomRow): MomentRoomRow => ({ uid: r.uid, name: r.name, coinRank: r.coinRank ?? null, coins: r.weekCoins, isMe: r.isMe });

export type Decision<T> = Readonly<{ show: T | null; why: string }>;

/**
 * «Позиция выросла»: своей ступенью пересёк линию зоны повышения (не-up → up) в той же неделе.
 * Окно строк — вокруг нового места; «было» прижимается к краю окна, если старое место ниже окна.
 */
export function spireDecideRise(
  prev: SpirePositionState | null,
  next: SpirePositionState,
  rows: readonly SpireRoomRow[],
): Decision<SpirePositionRiseShow> {
  if (!prev) return { show: null, why: 'нет прежней позиции в этой сессии' };
  if (prev.weekId !== next.weekId) return { show: null, why: `другая неделя (${prev.weekId} → ${next.weekId})` };
  if (next.steps <= prev.steps && next.coins <= prev.coins) return { show: null, why: `свой рост не менялся (ступени ${prev.steps}→${next.steps}, монеты ${prev.coins}→${next.coins})` };
  if (!(prev.zone !== 'up' && next.zone === 'up')) return { show: null, why: `зона ${prev.zone} → ${next.zone} — линию повышения не пересёк` };
  const toIndex = next.place - 1;
  const start = Math.max(0, Math.min(toIndex - 1, rows.length - SPIRE_RISE_WINDOW_ROWS));
  const window = rows.slice(start, start + SPIRE_RISE_WINDOW_ROWS);
  const fromIndex = Math.min(window.length - 1, Math.max(0, prev.place - 1 - start));
  return {
    show: {
      key: `${next.weekId}:rise:${next.place}:${next.steps}`,
      rows: window.map(toMomentRow),
      fromIndex,
      toIndex: toIndex - start,
      coinsGained: Math.max(0, next.coins - prev.coins), // guard-ok: разность только для показа в окне, баланс не меняется
    },
    why: `зона ${prev.zone} → up, место ${prev.place} → ${next.place}`,
  };
}

/**
 * «Тебя обогнали»: новая загрузка комнаты (другой fetchedAtMs той же недели), место хуже, а сам не откатился —
 * значит, обогнали другие. Соперник — строка прямо надо мной.
 */
export function spireDecideOvertake(
  seen: SpirePositionState | null,
  next: SpirePositionState,
  rows: readonly SpireRoomRow[],
): Decision<SpireOvertakeShow> {
  if (!seen) return { show: null, why: 'прежней загрузки комнаты нет' };
  if (seen.weekId !== next.weekId) return { show: null, why: `другая неделя (${seen.weekId} → ${next.weekId})` };
  if (seen.roomFetchedAtMs === next.roomFetchedAtMs) return { show: null, why: 'та же загрузка комнаты' };
  if (next.place <= seen.place) return { show: null, why: `место не хуже (${seen.place} → ${next.place})` };
  if (next.steps < seen.steps || next.coins < seen.coins) return { show: null, why: 'свой результат меньше прежнего — это не обгон' };
  const rival = rows[next.place - 2];
  if (!rival || rival.isMe) return { show: null, why: 'строки над собой нет' };
  return {
    show: {
      key: `${next.weekId}:overtake:${next.roomFetchedAtMs}`,
      rivalName: rival.name,
      rivalCoinRank: rival.coinRank ?? null,
      gapCoins: Math.max(0, rival.weekCoins - next.coins), // guard-ok: разность только для показа в окне, баланс не меняется
    },
    why: `место ${seen.place} → ${next.place}`,
  };
}

/** Конец ISO-недели Пика: понедельник 00:00 UTC после nowMs. */
export function spireWeekEndsAtMs(nowMs: number): number {
  const d = new Date(nowMs);
  const dayFromMonday = (d.getUTCDay() + 6) % 7;
  const mondayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - dayFromMonday * DAY_MS;
  return mondayStart + 7 * DAY_MS;
}

/**
 * «Последний шанс»: местное воскресенье после 18:00, неделя ещё идёт, я ниже линии повышения (зона не up).
 * gapCoins — только в режиме монет: монеты последнего в зоне up минус мои (ничья на границе — в пользу игрока).
 */
export function spireDecideLastChance(
  nowMs: number,
  next: SpirePositionState,
  rows: readonly SpireRoomRow[],
  rankBy: SpireRankByView,
  energyReadyAtMs: number,
): Decision<SpireLastChanceShow> {
  const local = new Date(nowMs);
  if (local.getDay() !== 0) return { show: null, why: `не воскресенье (день ${local.getDay()})` };
  if (local.getHours() < SPIRE_LAST_CHANCE_LOCAL_HOUR) return { show: null, why: `воскресенье, но ${local.getHours()}:xx < ${SPIRE_LAST_CHANCE_LOCAL_HOUR}:00` };
  const weekEndsAtMs = spireWeekEndsAtMs(nowMs);
  if (spireWeekIdMatches(next.weekId, nowMs) === false) return { show: null, why: `неделя комнаты ${next.weekId} уже закончилась (пояс западнее UTC−6)` };
  if (next.zone === 'up') return { show: null, why: 'уже в зоне повышения' };
  let gapCoins: number | undefined;
  if (rankBy === 'coins') {
    const zones = spireZonesFor(rows, rankBy);
    const upCoins = rows.filter((_, i) => zones[i] === 'up').map((r) => r.weekCoins);
    if (upCoins.length > 0) gapCoins = Math.max(0, Math.min(...upCoins) - next.coins); // guard-ok: разность только для показа в окне, баланс не меняется
  }
  return {
    show: { key: `${next.weekId}:lastChance`, weekEndsAtMs, energyReadyAtMs, ...(gapCoins !== undefined ? { gapCoins } : {}) },
    why: `воскресенье ${local.getHours()}:xx, зона ${next.zone}, до конца недели ${Math.round((weekEndsAtMs - nowMs) / 60000)} мин, не хватает ${gapCoins ?? '—'}`,
  };
}

/** Совпадает ли неделя комнаты с неделей «сейчас» (по началу недели UTC). null — формат weekId не разобран. */
function spireWeekIdMatches(weekId: string, nowMs: number): boolean | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!m) return null;
  const d = new Date(spireWeekEndsAtMs(nowMs) - DAY_MS); // воскресенье этой недели (UTC)
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 3));
  const isoYear = thursday.getUTCFullYear();
  const jan1 = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((thursday.getTime() - jan1) / DAY_MS + 1) / 7);
  return Number(m[1]) === isoYear && Number(m[2]) === week;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
