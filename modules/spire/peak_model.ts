/**
 * Модель экрана Пика — чистые функции без UI, не зависят от выбранного варианта макета.
 * зачем (координатор 04.11): пока владелец выбирает вариант экрана, слой данных готов заранее и подключается одной строкой.
 * Источник — уже прочитанные строки комнаты (spireBuildRoomRows, members.weekCoins): ноль дополнительных чтений Firestore.
 * Никаких React, Firebase и часов.
 */
import { spireZonesFor, type SpireZone } from '../../components/spire/spire_zones';
import type { SpireMemberRow } from '../../components/spire/spire_room_types';
import { SPIRE_TOP_STEPS, spireReachedTop } from '../../shared/spire_top_steps';
import type { SpireRoomRow } from './room_rows';

export const PEAK_TOP_COUNT = 5;

export type PeakRow = Readonly<{
  uid: string;
  name: string;
  place: number;
  weekCoins: number;
  steps: number;
  isMe: boolean;
  isPremium: boolean;
  coinRank: number | null;
  zone: SpireZone;
  reachedTop: boolean;
}>;

export type PeakMe = Readonly<{
  place: number | null;
  weekCoins: number;
  zone: SpireZone | null;
  inTop: boolean;
  reachedTop: boolean;
}>;

export type PeakModel = Readonly<{
  /** Первые PEAK_TOP_COUNT по монетам недели. */
  top: readonly PeakRow[];
  /** Дошедшие до вершины (steps ≥ SPIRE_TOP_STEPS), которых нет в топе, — «сверх топ-5». */
  summiters: readonly PeakRow[];
  /** Все участники в порядке монет — для зон повышения/понижения. */
  all: readonly PeakRow[];
  promotion: readonly PeakRow[];
  demotion: readonly PeakRow[];
  me: PeakMe;
}>;

/** rows — уже отсортированные по монетам (spireBuildRoomRows с rankBy='coins'); порядок не пересчитываем. */
export function buildPeakModel(rows: readonly SpireRoomRow[]): PeakModel {
  const members: SpireMemberRow[] = rows.map((r) => ({
    uid: r.uid, name: r.name, steps: r.steps, isMe: r.isMe, coinRank: r.coinRank ?? null, weekCoins: r.weekCoins, isPremium: r.isPremium === true,
  }));
  const zones = spireZonesFor(members, 'coins');
  const all: PeakRow[] = rows.map((r, i) => ({
    uid: r.uid,
    name: r.name,
    place: i + 1,
    weekCoins: r.weekCoins,
    steps: r.steps,
    isMe: r.isMe,
    isPremium: r.isPremium === true,
    coinRank: r.coinRank ?? null,
    zone: zones[i] ?? 'stay',
    reachedTop: spireReachedTop(r.steps),
  }));
  const top = all.slice(0, PEAK_TOP_COUNT);
  const summiters = all.slice(PEAK_TOP_COUNT).filter((r) => r.reachedTop);
  const mine = all.find((r) => r.isMe) ?? null;
  return {
    top,
    summiters,
    all,
    promotion: all.filter((r) => r.zone === 'up'),
    demotion: all.filter((r) => r.zone === 'down'),
    me: {
      place: mine?.place ?? null,
      weekCoins: mine?.weekCoins ?? 0,
      zone: mine?.zone ?? null,
      inTop: !!mine && mine.place <= PEAK_TOP_COUNT,
      reachedTop: mine?.reachedTop ?? false,
    },
  };
}

// зачем: та же схема адреса, что у серверных рекордов (shared/spire_floor_records.stepRecordKey: этаж 1..15, ступеней floor+4 до 5-го этажа, дальше 10);
// копия, чтобы слой данных не зависел от файла, который ещё не в HEAD. После коммита рекордов — заменить на импорт.
function stepRecordKey(floor: number, step: number): string | null {
  if (!Number.isInteger(floor) || !Number.isInteger(step) || floor < 1 || floor > 15 || step < 1 || step > (floor <= 5 ? floor + 4 : 10)) return null;
  return floor + ':' + step;
}

export type PeakStepRecord = Readonly<{ uid: string; name?: string; durationMs: number }>;

/** Рекорд ступени по адресу «этаж:ступень»; нет данных или адрес вне схемы — null (данных рекордов в документе комнаты пока нет). */
export function peakStepRecord(
  records: Readonly<Record<string, PeakStepRecord>> | null | undefined,
  floor: number,
  step: number,
): PeakStepRecord | null {
  const key = stepRecordKey(floor, step);
  if (!key || !records) return null;
  const rec = records[key];
  return rec && Number.isFinite(rec.durationMs) && rec.durationMs > 0 ? rec : null;
}

/** Время «мм:сс.сс» (сотые, вниз). Не число, ≤0 → null: экран рисует «—», а не «00:00.00». */
export function formatPeakTime(ms: number): string | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return null;
  const cs = Math.floor(ms / 10);
  const mm = Math.floor(cs / 6000);
  const ss = Math.floor(cs / 100) % 60;
  const hh = cs % 100;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(mm)}:${p(ss)}.${p(hh)}`;
}

export { SPIRE_TOP_STEPS };
