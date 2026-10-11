/**
 * Сравнение достижений «локально vs облако» при восстановлении — [ACH-RESTORE].
 *
 * зачем (координатор 11.10): в ветке «облако главнее» achievements_v1 записывается облачным значением целиком —
 * достижения, полученные между последним синком и восстановлением, пропадают. Сперва логи: какие полученные
 * (unlockedAt не пустой) id есть локально, какие в облаке и что потерялось бы. Слияние — отдельным шагом.
 */
type AchievementRow = { id?: unknown; unlockedAt?: unknown };

function unlockedIds(raw: string | null | undefined): string[] | null {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return (parsed as AchievementRow[])
      .filter((row) => row && typeof row.id === 'string' && typeof row.unlockedAt === 'string' && row.unlockedAt.length > 0)
      .map((row) => String(row.id));
  } catch {
    return null;
  }
}

export type AchievementRestoreDiff = Readonly<{
  localUnlocked: readonly string[] | null;
  cloudUnlocked: readonly string[] | null;
  /** Получены локально, но в облаке не получены — облако затёрло бы их. */
  wouldLose: readonly string[];
}>;

export function diffAchievementUnlocks(localRaw: string | null | undefined, cloudRaw: string | null | undefined): AchievementRestoreDiff {
  const localUnlocked = unlockedIds(localRaw);
  const cloudUnlocked = unlockedIds(cloudRaw);
  const cloudSet = new Set(cloudUnlocked ?? []);
  const wouldLose = (localUnlocked ?? []).filter((id) => !cloudSet.has(id));
  return { localUnlocked, cloudUnlocked, wouldLose };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
