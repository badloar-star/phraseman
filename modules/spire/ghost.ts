/**
 * Шпиль — «призрак друга» на ступени Пика (ТЗ docs/work/tasks/spire-engagement-2026-10-25.md §3а, решение владельца 25.10).
 * Чистый модуль: ни React, ни Firebase, ни часов. Все числа — из комнаты недели, которая уже лежит в кэше телефона.
 *
 * зачем (владелец 25.10: «среднее время, "Аня в среднем за 2:10", из уже загруженной комнаты»): сервер не хранит время ОДНОЙ ступени,
 * только `steps` и `totalMs` за неделю. Поэтому призрак = средняя ступень друга (totalMs / steps). Новых чтений Firestore нет.
 */
import { spireStepsForFloorLocal } from './report_queue';
import type { SpireRoomMember, SpireRoomSnapshot } from './room_rows';

/** Ступень — 10 заданий; тот же счёт, что у раннера и итога. */
export const SPIRE_GHOST_TASKS_PER_STEP = 10;
/** Среднее быстрее 20 с — подозрительно (накрутка/обрыв счётчика); дольше 15 минут — обрыв. */
export const SPIRE_GHOST_MIN_AVG_MS = 20_000;
export const SPIRE_GHOST_MAX_AVG_MS = 15 * 60_000;
/** «Обогнал» не раньше 5-го задания — на первых заданиях преимущество случайно и мигало бы. */
export const SPIRE_GHOST_MIN_DONE_TO_PASS = 5;
/** Разрыв в итоге показываем от секунды: «быстрее на 0:00» — это не новость. */
export const SPIRE_GHOST_MIN_MARGIN_MS = 1000;

export type SpireGhost = Readonly<{
  uid: string;
  /** Порядковый номер друга в снимке друзей (1…) — для журнала вместо uid: «друг #3». */
  ordinal: number;
  name: string;
  /** Первая буква имени — для метки «А». */
  letter: string;
  avgMs: number;
  steps: number;
}>;

export type SpireGhostNoneReason = 'no_room' | 'no_friend' | 'not_reached' | 'no_time' | 'suspicious' | 'no_name';
export type SpireGhostPick =
  | Readonly<{ ghost: SpireGhost; reason: null }>
  | Readonly<{ ghost: null; reason: SpireGhostNoneReason }>;

export type SpireGhostPickInput = Readonly<{
  room: SpireRoomSnapshot | null;
  /** uid друзей из уже прогретого снимка вкладки «Друзья» (пустой набор — друзей нет). Порядок набора = порядок в снимке: по нему «друг #N». */
  friendUids: ReadonlySet<string>;
  myUid: string;
  /** Номер ступени недели, которую человек проходит сейчас (1 = первая за неделю). */
  stepNumber: number;
}>;

/** Номер ступени недели по этажу и ступени внутри этажа (stepInFloor — 0-based, как в SpireStepContext). */
export function spireGhostStepNumber(floor: number, stepInFloor: number): number {
  let cleared = Math.max(0, Math.trunc(Number.isFinite(stepInFloor) ? stepInFloor : 0));
  for (let f = 1; f < Math.max(1, Math.trunc(floor)); f += 1) cleared += spireStepsForFloorLocal(f);
  return cleared + 1;
}

/** Первая буква имени (с учётом суррогатных пар), заглавная; пустое имя — «?». */
export function spireGhostLetter(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toLocaleUpperCase() : '?';
}

function judge(member: SpireRoomMember, stepNumber: number): SpireGhostNoneReason | 'ok' {
  const name = member.name.trim();
  if (!name || name === '—') return 'no_name';
  if (member.steps < stepNumber) return 'not_reached';
  if (member.steps <= 0 || member.totalMs <= 0) return 'no_time';
  const avg = member.totalMs / member.steps;
  if (avg < SPIRE_GHOST_MIN_AVG_MS || avg > SPIRE_GHOST_MAX_AVG_MS) return 'suspicious';
  return 'ok';
}

const REASON_ORDER: readonly SpireGhostNoneReason[] = ['suspicious', 'no_time', 'no_name', 'not_reached'];

/**
 * Кто бежит рядом — ТОЛЬКО друг из комнаты (ближайший по ступеням, но не отставший от моей ступени). Решение координатора 25.10 (приватность): запасного
 * «соперника» нет — темп чужого человека, не друга, не показываем. Нет друга в комнате — `ghost: null`, причина `no_friend`; друг есть, но не подходит —
 * самая «содержательная» из причин отказа.
 */
export function spirePickGhost(input: SpireGhostPickInput): SpireGhostPick {
  const { room, friendUids, myUid, stepNumber } = input;
  if (!room) return { ghost: null, reason: 'no_room' };
  const others = room.members.filter((m) => m.uid !== myUid);
  if (others.length === 0) return { ghost: null, reason: 'no_room' };
  const byClosest = (a: SpireRoomMember, b: SpireRoomMember): number => (a.steps - b.steps) || a.uid.localeCompare(b.uid);
  const friends = others.filter((m) => friendUids.has(m.uid));
  if (friends.length === 0) return { ghost: null, reason: 'no_friend' };
  const order = [...friendUids];
  const seen = new Set<SpireGhostNoneReason>();
  for (const m of [...friends].sort(byClosest)) {
    const verdict = judge(m, stepNumber);
    if (verdict !== 'ok') { seen.add(verdict); continue; }
    const name = m.name.trim();
    return { ghost: { uid: m.uid, ordinal: order.indexOf(m.uid) + 1, name, letter: spireGhostLetter(name), avgMs: Math.round(m.totalMs / m.steps), steps: m.steps }, reason: null };
  }
  return { ghost: null, reason: REASON_ORDER.find((r) => seen.has(r)) ?? 'not_reached' };
}

/**
 * Доля ОСТАВШЕГОСЯ времени ступени, при которой призрак финиширует (0..1 от круга, считая от верха по часовой).
 * Метка стоит на кольце неподвижно в этой точке; дуга таймера доедает до неё ровно к «финишу» друга. Среднее не короче бюджета — метки нет.
 */
export function spireGhostMarkFrac(avgMs: number, budgetMs: number): number | null {
  if (!(budgetMs > 0) || !(avgMs > 0) || avgMs >= budgetMs) return null;
  return Math.max(0.03, Math.min(0.97, (budgetMs - avgMs) / budgetMs));
}

/** Где был бы призрак на полосе (0..1) за elapsedMs от начала ступени. */
export function spireGhostTrackFrac(elapsedMs: number, avgMs: number): number {
  return avgMs > 0 ? Math.max(0, Math.min(1, elapsedMs / avgMs)) : 1;
}

/** Обогнал: выполнено заданий больше, чем успел бы друг за это время, и не раньше 5-го. */
export function spireGhostAhead(input: Readonly<{ done: number; elapsedMs: number; avgMs: number }>): boolean {
  const { done, elapsedMs, avgMs } = input;
  if (!(avgMs > 0) || done < SPIRE_GHOST_MIN_DONE_TO_PASS) return false;
  return done > (elapsedMs / avgMs) * SPIRE_GHOST_TASKS_PER_STEP;
}

/** На сколько мс человек прошёл ступень быстрее средней ступени друга; не быстрее (или меньше секунды) — 0. */
export function spireGhostMarginMs(avgMs: number, usedMs: number): number {
  const diff = Math.round(avgMs - usedMs);
  return diff >= SPIRE_GHOST_MIN_MARGIN_MS ? diff : 0;
}

/** Строка журнала [SPIRE-GHOST]: «друг #N» (порядок в снимке друзей, без uid и имени) steps=… avgMs=… | нет призрака: причина=… */
export function spireGhostLogLine(pick: SpireGhostPick, stepNumber: number): string {
  if (!pick.ghost) return `нет призрака: причина=${pick.reason} ступень=${stepNumber}`;
  const g = pick.ghost;
  return `друг #${g.ordinal} steps=${g.steps} avgMs=${g.avgMs} ступень=${stepNumber}`;
}
