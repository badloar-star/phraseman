// peak_tower_players.ts — какие иконки участников рисуем на башне Пика B и где.
// зачем (владелец 05.11 07:38: «на башне все еще надо показывать иконки юзеров кто где если что»): иконки — только из уже загруженной комнаты
// недели (rivalsByFloor: 0 новых чтений). Чтобы не перегружать башню: два лидера (верхние этажи) + по два ближайших выше и ниже меня, всего ≤ 7.
import type { SpireRival } from '../spire_tower_model';

export const PEAK_TOWER_PLAYERS_MAX = 7;
export const PEAK_TOWER_PER_FLOOR_MAX = 3;

export type PeakTowerPlayer = Readonly<{ uid: string; name: string; coinRank: number | null; floor: number; slot: number; slots: number }>;

type Flat = Readonly<{ rival: SpireRival; floor: number }>;

export function pickPeakTowerPlayers(rivalsByFloor: ReadonlyMap<number, readonly SpireRival[]> | undefined | null, myFloor: number | null): readonly PeakTowerPlayer[] {
  if (!rivalsByFloor || rivalsByFloor.size === 0) return [];
  const flat: Flat[] = [];
  for (const [floor, list] of rivalsByFloor) for (const rival of list) flat.push({ rival, floor });
  const byFloorDesc = [...flat].sort((a, b) => b.floor - a.floor);
  const picked = new Map<string, Flat>();
  const add = (items: readonly Flat[], n: number) => { for (const it of items) { if (n <= 0) break; if (!picked.has(it.rival.uid)) { picked.set(it.rival.uid, it); n -= 1; } } };
  add(byFloorDesc, 2); // лидеры
  if (myFloor !== null) {
    add(flat.filter((f) => f.floor >= myFloor).sort((a, b) => a.floor - b.floor), 2); // ближайшие выше (и на моём этаже)
    add(flat.filter((f) => f.floor < myFloor).sort((a, b) => b.floor - a.floor), 2); // ближайшие ниже
  }
  const chosen = [...picked.values()].slice(0, PEAK_TOWER_PLAYERS_MAX);
  const perFloor = new Map<number, Flat[]>();
  for (const it of chosen) perFloor.set(it.floor, [...(perFloor.get(it.floor) ?? []), it]);
  const out: PeakTowerPlayer[] = [];
  for (const [floor, items] of perFloor) {
    const shown = items.slice(0, PEAK_TOWER_PER_FLOOR_MAX);
    shown.forEach((it, slot) => out.push({ uid: it.rival.uid, name: it.rival.name, coinRank: it.rival.coinRank, floor, slot, slots: shown.length }));
  }
  return out;
}

/** Размер монеты на башне, dp: растёт с башней, но остаётся читаемым и не больше строки этажа. */
export function peakTowerCoinSize(scale: number): number {
  return Math.round(Math.max(18, Math.min(30, 46 * scale)));
}
