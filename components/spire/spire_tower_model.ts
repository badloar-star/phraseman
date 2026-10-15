// ═══════════════════════════════════════════════════════════════════════════
// spire_tower_model.ts — чистая механика этажей Шпиля для экрана (пакет C).
//
// зачем: макет spire.html считает этажи, Стражей и монеты прямо в скрипте; здесь та же
// математика, но привязанная к РЕАЛЬНЫМ правилам сервера (functions/src/spire_config_contract.ts:
// 15 этажей, ступеней 5..9 затем по 10, Страж каждые 5; монеты — из config/spire_v1),
// без единого выдуманного числа.
// ═══════════════════════════════════════════════════════════════════════════
import { spireStepsForFloorLocal } from '../../modules/spire/report_queue';
import type { SpireCoinsConfig } from '../../modules/spire/config_contract';

export const SPIRE_FLOOR_COUNT = 15;
export const SPIRE_GUARD_EVERY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export const spireIsGuard = (floor: number): boolean => floor % SPIRE_GUARD_EVERY === 0;
export const spireIsSummit = (floor: number): boolean => floor === SPIRE_FLOOR_COUNT;
export const spireStepsIn = (floor: number): number => spireStepsForFloorLocal(floor);

/** Монеты за этаж по конфигу сервера: perFloorPerLevel × N, у Стража ещё × guardianMultiplier. */
export function spireFloorCoinsOf(floor: number, coins: SpireCoinsConfig): number {
  const base = coins.perFloorPerLevel * floor;
  return Math.round(spireIsGuard(floor) ? base * coins.guardianMultiplier : base);
}

/** Сколько ступеней проходят по очереди в этажах 1..floor включительно. */
export function spireCumulativeSteps(floor: number): number {
  let sum = 0;
  for (let f = 1; f <= floor; f += 1) sum += spireStepsIn(f);
  return sum;
}

/** Состояние этажа относительно маркера игрока. */
export type SpireFloorState = 'mine' | 'passed' | 'ahead';

export function spireFloorState(floor: number, myFloor: number | null): SpireFloorState | 'unknown' {
  if (myFloor === null) return 'unknown';
  if (floor === myFloor) return 'mine';
  return floor < myFloor ? 'passed' : 'ahead';
}

/** Ключ ISO-недели 'YYYY-Www' — зеркало getWeekKey из functions/src/progress_events.ts. */
export function spireCurrentWeekKey(nowMs: number): string {
  const date = new Date(nowMs);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Сколько осталось до конца недели (понедельник 00:00 UTC). */
export function spireTimeLeft(nowMs: number, weekStartMs: number): Readonly<{ days: number; hours: number }> {
  const left = Math.max(0, weekStartMs + 7 * DAY_MS - nowMs);
  return { days: Math.floor(left / DAY_MS), hours: Math.floor((left % DAY_MS) / HOUR_MS) };
}

/** Геометрия башни (координаты viewBox 390 × H), как towerGeom() макета. */
export const SPIRE_TW = 390;
export const SPIRE_CX = 195;
// зачем (закон владельца 14.10, «пик башни не обрезается, свет тоже»): запас над верхним этажом = граница башни (острие, навершие, древко, ореол ×2.6 «вершины недели»)
// самой большой лиги + поле — 360 (считает spire_tower_bounds.spireMaxTowerHeadroom; сторож tests/spire_tower_no_clip_contract.test.ts). Было 300: ореол выходил выше верха SVG.
// зачем (координатор 15.10, условие 2): поле до края окна 8 → 16 (SPIRE_TOWER_EDGE_MARGIN) — запас сверху 360 → 376, чтобы острие и ореол самой большой лиги с полем ≥ 16 лежали внутри
const TOP_PAD = 376;
const BASE_PAD = 96;

export const spireFloorHeight = (f: number): number => (spireIsGuard(f) ? 60 : 46);
export const spireFloorWidth = (f: number): number => 196 - (f - 1) * 5;

export type SpireFloorGeom = Readonly<{ f: number; y: number; h: number; w: number; x0: number }>;
export type SpireTowerGeom = Readonly<{ floors: readonly SpireFloorGeom[]; height: number; base: number; top: number }>;

function buildGeom(): SpireTowerGeom {
  let total = 0;
  for (let f = 1; f <= SPIRE_FLOOR_COUNT; f += 1) total += spireFloorHeight(f);
  const height = TOP_PAD + total + BASE_PAD;
  let yb = height - BASE_PAD;
  const floors: SpireFloorGeom[] = [];
  for (let f = 1; f <= SPIRE_FLOOR_COUNT; f += 1) {
    const h = spireFloorHeight(f);
    const w = spireFloorWidth(f);
    yb -= h;
    floors.push({ f, y: yb, h, w, x0: SPIRE_CX - w / 2 });
  }
  return { floors, height, base: height - BASE_PAD, top: floors[SPIRE_FLOOR_COUNT - 1].y };
}

export const SPIRE_TOWER_GEOM: SpireTowerGeom = buildGeom();

/** Центр маркера игрока справа от этажа (markerXY макета). */
export function spireMarkerXY(fl: SpireFloorGeom): Readonly<{ x: number; y: number }> {
  return { x: fl.x0 + fl.w + 34, y: fl.y + fl.h / 2 + 2 };
}

/**
 * Этаж, на котором стоит игрок с N пройденными ступенями (floorOf макета).
 * 0 ступеней → этаж 1; после вершины (135) → 16 «над облаками».
 */
export function spireFloorOfSteps(steps: number): number {
  const n = Math.max(0, Math.trunc(steps) || 0);
  for (let f = 1; f <= SPIRE_FLOOR_COUNT; f += 1) if (n < spireCumulativeSteps(f)) return f;
  return SPIRE_FLOOR_COUNT + 1;
}

export type SpireRival = Readonly<{ uid: string; name: string; coinRank: number | null }>;

/**
 * Соперники по этажам (onFloor макета): все строки комнаты, кроме своей, разложены
 * по этажу их ступеней. зачем (владелец 30.09): «соперники слева от башни» и «кто на
 * этом этаже» — из уже закэшированной комнаты, без новых чтений.
 */
export function spireRivalsByFloor(
  rows: readonly Readonly<{ uid: string; name: string; steps: number; isMe: boolean; coinRank?: number | null }>[] | null,
): ReadonlyMap<number, readonly SpireRival[]> {
  const map = new Map<number, SpireRival[]>();
  for (const r of rows ?? []) {
    if (r.isMe) continue;
    const f = Math.min(spireFloorOfSteps(r.steps), SPIRE_FLOOR_COUNT);
    const list = map.get(f) ?? [];
    list.push({ uid: r.uid, name: r.name, coinRank: r.coinRank ?? null });
    map.set(f, list);
  }
  return map;
}
