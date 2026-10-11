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

type AchievementStateRow = { id: string; unlockedAt: string | null; notified?: boolean; shardClaimed?: boolean };

function parseRows(raw: string | null | undefined): AchievementStateRow[] | null {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return (parsed as AchievementStateRow[]).filter((row) => row && typeof row.id === 'string');
  } catch {
    // зачем: битое значение не роняет восстановление — вызывающий решает, какую сторону оставить.
    return null;
  }
}

const isUnlocked = (row: AchievementStateRow | undefined): boolean =>
  !!row && typeof row.unlockedAt === 'string' && row.unlockedAt.length > 0;

/**
 * Слияние достижений «локально + облако» при восстановлении (координатор 11.10, п.1).
 * зачем: облако писало achievements_v1 целиком — полученное между синком и восстановлением пропадало.
 * Правило: объединение по id; получено с обеих сторон — более ранняя дата; показ тоста — ИЛИ (поздравляем фактом,
 * уже показанное на другом устройстве не повторяем). Порядок — облачный, локальные новые id в конце.
 * Битое облако — оставляем локальное; битое локальное — облако как раньше.
 */
export function mergeAchievementStatesRaw(localRaw: string | null | undefined, cloudRaw: string): string {
  const cloudRows = parseRows(cloudRaw);
  const localRows = parseRows(localRaw);
  if (cloudRows === null) return localRaw ?? cloudRaw;
  if (localRows === null || localRows.length === 0) return cloudRaw;
  const localById = new Map(localRows.map((row) => [row.id, row] as const));
  const seen = new Set<string>();
  const merged: AchievementStateRow[] = [];
  for (const cloud of cloudRows) {
    seen.add(cloud.id);
    const local = localById.get(cloud.id);
    if (!local) { merged.push(cloud); continue; }
    if (isUnlocked(cloud) && isUnlocked(local)) {
      const earlier = String(local.unlockedAt) < String(cloud.unlockedAt) ? local : cloud;
      merged.push({ ...earlier, notified: !!(cloud.notified || local.notified) });
    } else if (isUnlocked(local)) {
      merged.push({ ...local, notified: !!(cloud.notified || local.notified) });
    } else {
      merged.push(cloud);
    }
  }
  for (const local of localRows) if (!seen.has(local.id)) merged.push(local);
  return JSON.stringify(merged);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
