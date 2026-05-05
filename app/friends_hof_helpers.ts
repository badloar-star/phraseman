// === Pure helpers for Friends Hall of Fame (exported for testing) ===
// No React Native imports — pure TypeScript, testable in Node without native mocking.

export interface HoFEntry {
  uid: string;
  name: string;
  totalXp: number;
  weeklyXp: number;
  isMe: boolean;
}

export interface RankedHoFEntry extends HoFEntry {
  rank: number;
}

/**
 * Sort entries and assign ranks. Rank 1 = highest xp.
 * Ties broken by uid (stable, deterministic).
 * mode 'alltime' → sort by totalXp; 'weekly' → sort by weeklyXp.
 */
export function sortAndRankHoF(
  entries: HoFEntry[],
  mode: 'alltime' | 'weekly',
): RankedHoFEntry[] {
  const key: keyof HoFEntry = mode === 'weekly' ? 'weeklyXp' : 'totalXp';
  const sorted = [...entries].sort((a, b) => {
    const diff = (b[key] as number) - (a[key] as number);
    return diff !== 0 ? diff : a.uid.localeCompare(b.uid);
  });
  return sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

/** Returns true when every entry has weeklyXp === 0 (show empty state for this week). */
export function isWeeklyAllZero(entries: HoFEntry[]): boolean {
  return entries.every(e => e.weeklyXp === 0);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
