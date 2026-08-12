export function getOrCreateArenaSubmissionId(
  cache: Map<string, string>,
  matchId: string,
  taskIndex: number,
  attempt: string,
  create: () => string,
): string {
  const scope = `${matchId}:${taskIndex}:${attempt}`;
  const cached = cache.get(scope);
  if (cached) return cached;
  const value = create().replace(/[^A-Za-z0-9:_-]/g, '_').slice(0, 160);
  cache.set(scope, value);
  return value;
}

export function pruneArenaSubmissionIds(cache: Map<string, string>, matchId: string, taskIndex: number): void {
  const keepPrefix = `${matchId}:${taskIndex}:`;
  for (const key of cache.keys()) if (!key.startsWith(keepPrefix)) cache.delete(key);
}
