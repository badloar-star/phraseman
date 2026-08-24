export const NOTIFICATION_DELETE_UNDO_MS = 4_000;

export type NotificationRowIdentity = Readonly<{ id: string }>;

export type PendingNotificationDeletion<T extends NotificationRowIdentity> = Readonly<{
  row: T;
  index: number;
  commitAtMs: number;
}>;

export function hideNotificationIds<T extends NotificationRowIdentity>(
  rows: readonly T[],
  hiddenIds: ReadonlySet<string>,
): T[] {
  return hiddenIds.size === 0 ? [...rows] : rows.filter((row) => !hiddenIds.has(row.id));
}

export function stageNotificationDeletion<T extends NotificationRowIdentity>(
  rows: readonly T[],
  id: string,
  nowMs: number,
): Readonly<{
  rows: T[];
  deletion: PendingNotificationDeletion<T> | null;
}> {
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return { rows: [...rows], deletion: null };
  const row = rows[index];
  return {
    rows: rows.filter((candidate) => candidate.id !== id),
    deletion: { row, index, commitAtMs: nowMs + NOTIFICATION_DELETE_UNDO_MS },
  };
}

export function undoNotificationDeletion<T extends NotificationRowIdentity>(
  rows: readonly T[],
  deletion: PendingNotificationDeletion<T> | null,
): T[] {
  if (!deletion || rows.some((row) => row.id === deletion.row.id)) return [...rows];
  const restored = [...rows];
  restored.splice(Math.min(deletion.index, restored.length), 0, deletion.row);
  return restored;
}

export function shouldCommitDeletion<T extends NotificationRowIdentity>(
  deletion: PendingNotificationDeletion<T> | null,
  nowMs: number,
): boolean {
  return deletion !== null && nowMs >= deletion.commitAtMs;
}

export default function __RouteShim() {
  return null;
}
