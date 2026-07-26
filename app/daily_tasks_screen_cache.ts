import { isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import type { DailyTask, TaskProgress } from './daily_tasks';
import {
  invalidateDailyTasksScreenSnapshotOnDisk,
  patchDailyTasksScreenSnapshotOnDisk,
  peekRestoredDailyTasksScreenSnapshot,
  rememberDailyTasksScreenSnapshotOnDisk,
} from './daily_tasks_screen_persist';

export type DailyTasksScreenSnapshot = Readonly<{
  tasks: DailyTask[];
  progress: TaskProgress[];
  trioShardsClaimed: boolean;
  rerollsLeft: number;
}>;

type Entry = Readonly<{ value: DailyTasksScreenSnapshot; updatedAt: number }>;
export type DailyTasksScreenRequest = Readonly<{
  key: string | null;
  token: AccountGenerationToken;
  requestId: number;
  mutationRevision: number;
}>;

const TTL_MS = 30_000;
const MAX_ENTRIES = 2;
const entries = new Map<string, Entry>();
let latestRequestId = 0;
let mutationRevision = 0;

export function isDailyTasksScreenSnapshotVisible(loadedKey: string | null, currentKey: string | null): boolean {
  return currentKey !== null && loadedKey === currentKey;
}

export function dailyTasksScreenCacheKey(
  token: AccountGenerationToken,
  dayKey: string,
  studyTarget: string,
): string | null {
  const account = accountScopeKey(token);
  return account ? `${account}:daily-tasks:${dayKey}:${studyTarget}` : null;
}

export function peekDailyTasksScreenSnapshot(
  token: AccountGenerationToken,
  dayKey: string,
  studyTarget: string,
  now = Date.now(),
): { value: DailyTasksScreenSnapshot; isFresh: boolean } | null {
  const key = dailyTasksScreenCacheKey(token, dayKey, studyTarget);
  if (!key || !isCurrentAccountGeneration(token)) return null;
  const cached = entries.get(key);
  if (cached) return { value: cached.value, isFresh: now - cached.updatedAt <= TTL_MS };
  // зачем: на ПЕРВОМ открытии после холодного старта Map выше пуста (она живёт только
  // внутри процесса) — раньше экран из-за этого показывал скелетоны и входную анимацию.
  // Дисковый снапшот прошлой сессии поднят бутстрапом, отдаём его как «есть данные, но
  // не свежие»: карточки видны с первого кадра, а фоновый пересчёт всё равно запустится
  // (isFresh:false ⇒ refreshTasksAndProgress не делает ранний return) и догонит правду.
  const restoredValue = peekRestoredDailyTasksScreenSnapshot(key, now);
  if (!restoredValue) return null;
  return { value: restoredValue, isFresh: false };
}

export function beginDailyTasksScreenRequest(
  token: AccountGenerationToken,
  dayKey: string,
  studyTarget: string,
): DailyTasksScreenRequest {
  latestRequestId += 1;
  return {
    key: dailyTasksScreenCacheKey(token, dayKey, studyTarget), token,
    requestId: latestRequestId, mutationRevision,
  };
}

export function isDailyTasksScreenRequestCurrent(request: DailyTasksScreenRequest): boolean {
  return !!request.key
    && request.requestId === latestRequestId
    && isCurrentAccountGeneration(request.token);
}

export function commitDailyTasksScreenSnapshot(
  request: DailyTasksScreenRequest,
  value: DailyTasksScreenSnapshot,
  now = Date.now(),
): boolean {
  if (!isDailyTasksScreenRequestCurrent(request)) return false;
  const current = request.key ? entries.get(request.key) : undefined;
  const committedValue = request.mutationRevision < mutationRevision && current
    ? {
      ...value,
      progress: value.progress.map((row) => {
        const optimistic = current.value.progress.find((candidate) => candidate.taskId === row.taskId);
        return optimistic?.claimed
          ? { ...row, current: Math.max(row.current, optimistic.current), completed: true, claimed: true }
          : row;
      }),
    }
    : value;
  entries.delete(request.key!);
  entries.set(request.key!, { value: committedValue, updatedAt: now });
  // зачем: зеркалим свежий результат на диск, чтобы СЛЕДУЮЩИЙ холодный старт открыл
  // экран мгновенно (см. daily_tasks_screen_persist). Запись фоновая — UI не ждёт.
  rememberDailyTasksScreenSnapshotOnDisk(request.key!, committedValue, now);
  while (entries.size > MAX_ENTRIES) {
    const oldestKey = entries.keys().next().value as string | undefined;
    if (!oldestKey) break;
    entries.delete(oldestKey);
  }
  return true;
}

export function patchDailyTasksScreenProgress(
  token: AccountGenerationToken,
  dayKey: string,
  studyTarget: string,
  taskId: string,
  patch: Partial<TaskProgress>,
): boolean {
  const key = dailyTasksScreenCacheKey(token, dayKey, studyTarget);
  const cached = key ? entries.get(key) : undefined;
  if (!key || !cached || !isCurrentAccountGeneration(token)) return false;
  mutationRevision += 1;
  entries.set(key, {
    ...cached,
    value: {
      ...cached.value,
      progress: cached.value.progress.map((row) => row.taskId === taskId ? { ...row, ...patch } : row),
    },
  });
  // зачем: optimistic-клейм должен пережить холодный старт — иначе первое открытие
  // после перезапуска показало бы уже забранную награду как незабранную.
  patchDailyTasksScreenSnapshotOnDisk(key, taskId, patch);
  return true;
}

export function invalidateDailyTasksScreenSnapshot(
  token: AccountGenerationToken,
  dayKey: string,
  studyTarget: string,
): void {
  const key = dailyTasksScreenCacheKey(token, dayKey, studyTarget);
  if (!key) return;
  entries.delete(key);
  // зачем: после реролла/смены набора дисковая копия устарела — если её не убрать,
  // следующий холодный старт нарисует на первом кадре ЗАМЕНЁННОЕ задание.
  invalidateDailyTasksScreenSnapshotOnDisk(key);
}

export function resetDailyTasksScreenCacheForTests(): void {
  entries.clear();
  latestRequestId = 0;
  mutationRevision = 0;
}
