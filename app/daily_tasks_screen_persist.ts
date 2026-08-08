import AsyncStorage from '@react-native-async-storage/async-storage';
import { findDailyTaskById, type DailyTask, type TaskProgress } from './daily_tasks';
import type { DailyTasksScreenSnapshot } from './daily_tasks_screen_cache';

/**
 * Дисковый слой снапшота экрана «Вызовы дня».
 *
 * зачем: daily_tasks_screen_cache — это Map в памяти процесса, поэтому она пуста на
 * ПЕРВОМ открытии после холодного старта, и экран показывал shimmer-скелетоны + входную
 * stagger-анимацию (ощущение «монтируется/грузится»). Владелец хочет, чтобы даже первое
 * открытие было мгновенным. Пересчитать набор синхронно нельзя — getTodayTasksSafe ждёт
 * уровень, премиум, реролл-стейт, очередь тренажёра и т.п. Поэтому храним РЕЗУЛЬТАТ
 * последнего успешного расчёта на диске, поднимаем его одним чтением в бутстрапе
 * приложения (задолго до тапа по «Вызовам дня») и синхронно отдаём экрану на первом кадре.
 * Тот же паттерн, что survey_daily_task_cache и league_open_cache_policy.
 *
 * На диске лежат только id заданий: объекты восстанавливаются из кода (findDailyTaskById),
 * так что после обновления приложения тексты/награды берутся актуальные.
 */

const STORAGE_KEY = 'daily_tasks_screen_snapshot_v1';
/** Снапшот дневной: живёт до конца суток + запас на смену часового пояса. */
const TTL_MS = 26 * 60 * 60_000;
/** Один аккаунт × один studyTarget × сегодня — большего для мгновенного открытия не нужно. */
const MAX_ENTRIES = 2;

type PersistedRow = Readonly<{
  taskId: string;
  current: number;
  completed: boolean;
  claimed: boolean;
}>;

type PersistedEntry = Readonly<{
  /** Ключ формата `${accountScope}:daily-tasks:${dayKey}:${studyTarget}` (см. dailyTasksScreenCacheKey). */
  key: string;
  taskIds: readonly string[];
  progress: readonly PersistedRow[];
  trioShardsClaimed: boolean;
  rerollsLeft: number;
  writtenAtMs: number;
}>;

/** Поднятые с диска записи. Читается синхронно экраном, пишется бутстрапом и коммитом. */
const restored = new Map<string, { value: DailyTasksScreenSnapshot; writtenAtMs: number }>();

function readNumber(raw: unknown): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function parseRow(raw: unknown): PersistedRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.taskId !== 'string' || !row.taskId) return null;
  return {
    taskId: row.taskId,
    current: readNumber(row.current),
    completed: row.completed === true,
    claimed: row.claimed === true,
  };
}

/**
 * Восстанавливает снапшот из сохранённой записи. Возвращает null, если хотя бы одно
 * задание пропало из кода (retired-тип, переименование) — показать неполный набор хуже,
 * чем один раз честно догрузить: иначе «Забрать» ссылался бы на несуществующий id.
 */
function restoreSnapshot(entry: PersistedEntry): DailyTasksScreenSnapshot | null {
  if (entry.taskIds.length === 0) return null;
  const tasks: DailyTask[] = [];
  for (const id of entry.taskIds) {
    const task = findDailyTaskById(id);
    if (!task) return null;
    tasks.push(task);
  }
  const known = new Set(tasks.map((task) => task.id));
  const progress: TaskProgress[] = entry.progress
    .filter((row) => known.has(row.taskId))
    .map((row) => ({ ...row }));
  return {
    tasks,
    progress,
    trioShardsClaimed: entry.trioShardsClaimed,
    rerollsLeft: entry.rerollsLeft,
  };
}

function parseEntry(raw: unknown, nowMs: number): PersistedEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const entry = raw as Record<string, unknown>;
  if (typeof entry.key !== 'string' || !entry.key) return null;
  const writtenAtMs = Number(entry.writtenAtMs);
  if (!Number.isFinite(writtenAtMs) || nowMs - writtenAtMs > TTL_MS) return null;
  if (!Array.isArray(entry.taskIds) || !Array.isArray(entry.progress)) return null;
  const taskIds = entry.taskIds.filter((id): id is string => typeof id === 'string' && !!id);
  if (taskIds.length !== entry.taskIds.length) return null;
  const progress = entry.progress.map(parseRow).filter((row): row is PersistedRow => row !== null);
  return {
    key: entry.key,
    taskIds,
    progress,
    trioShardsClaimed: entry.trioShardsClaimed === true,
    rerollsLeft: readNumber(entry.rerollsLeft),
    writtenAtMs,
  };
}

function serializeEntry(
  key: string,
  value: DailyTasksScreenSnapshot,
  writtenAtMs: number,
): PersistedEntry {
  return {
    key,
    taskIds: value.tasks.map((task) => task.id),
    progress: value.progress.map((row) => ({
      taskId: row.taskId,
      current: readNumber(row.current),
      completed: row.completed === true,
      claimed: row.claimed === true,
    })),
    trioShardsClaimed: value.trioShardsClaimed,
    rerollsLeft: readNumber(value.rerollsLeft),
    writtenAtMs,
  };
}

function persist(): void {
  const entries = [...restored.entries()]
    .slice(-MAX_ENTRIES)
    .map(([key, item]) => serializeEntry(key, item.value, item.writtenAtMs));
  // Пишем в фоне: экран уже отрисован из памяти, ждать диск незачем.
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
}

/**
 * Поднимает снапшот с диска в память. Вызывается из bootstrap приложения (_layout),
 * то есть до того, как пользователь дотянется до экрана вызовов.
 */
export async function primeDailyTasksScreenSnapshotFromStorage(nowMs = Date.now()): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;
    for (const item of parsed.slice(-MAX_ENTRIES)) {
      const entry = parseEntry(item, nowMs);
      if (!entry) continue;
      const value = restoreSnapshot(entry);
      if (!value) continue;
      restored.set(entry.key, { value, writtenAtMs: entry.writtenAtMs });
    }
  } catch {
    // Дисковый снапшот — best-effort ускорение первого кадра, не источник правды.
  }
}

/** Синхронный peek для первого кадра экрана. null → данных нет, честно грузим. */
export function peekRestoredDailyTasksScreenSnapshot(
  key: string | null,
  nowMs = Date.now(),
): DailyTasksScreenSnapshot | null {
  if (!key) return null;
  const entry = restored.get(key);
  if (!entry || nowMs - entry.writtenAtMs > TTL_MS) return null;
  return entry.value;
}

/** Сохраняет свежий снапшот на диск — чтобы СЛЕДУЮЩИЙ холодный старт открылся мгновенно. */
export function rememberDailyTasksScreenSnapshotOnDisk(
  key: string | null,
  value: DailyTasksScreenSnapshot,
  nowMs = Date.now(),
): void {
  if (!key) return;
  restored.delete(key);
  restored.set(key, { value, writtenAtMs: nowMs });
  while (restored.size > MAX_ENTRIES) {
    const oldest = restored.keys().next().value as string | undefined;
    if (!oldest) break;
    restored.delete(oldest);
  }
  persist();
}

/** Точечное обновление прогресса на диске после optimistic-действия (клейм/прогресс). */
export function patchDailyTasksScreenSnapshotOnDisk(
  key: string | null,
  taskId: string,
  patch: Partial<TaskProgress>,
): void {
  if (!key) return;
  const entry = restored.get(key);
  if (!entry) return;
  restored.set(key, {
    ...entry,
    value: {
      ...entry.value,
      progress: entry.value.progress.map((row) => (row.taskId === taskId ? { ...row, ...patch } : row)),
    },
  });
  persist();
}

/** Убирает одну устаревшую запись (реролл, смена набора) — остальные дни/аккаунты живут. */
export function invalidateDailyTasksScreenSnapshotOnDisk(key: string | null): void {
  if (!key || !restored.delete(key)) return;
  persist();
}

/**
 * Полная очистка: смена аккаунта / logout / wipe локальных данных. Иначе следующий
 * вошедший на том же устройстве увидел бы на первом кадре ЧУЖИЕ вызовы дня и прогресс.
 */
export function clearDailyTasksScreenSnapshotOnDisk(): void {
  restored.clear();
  void AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

export function resetDailyTasksScreenPersistForTests(): void {
  restored.clear();
}

export default function __RouteShim() { return null; }
