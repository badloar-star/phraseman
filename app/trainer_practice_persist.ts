import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrainerPracticeSnapshot } from './trainer_practice_prefetch';

/**
 * Дисковый слой снапшота раздела «Моя практика».
 *
 * зачем: snapshotCache в trainer_practice_prefetch — Map в памяти процесса с TTL 2 минуты,
 * поэтому экран открывался с нулями (и каскадом FadeInDown, теперь снятым) при холодном
 * старте И даже при возврате через 3 минуты. Владелец требует, чтобы при входе всё было
 * сразу на местах. Пересчитать синхронно нельзя: снапшот собирается из дашборда SRS,
 * аналитики фраз, премиум-статуса, персональных тренировок и активности за 365 дней.
 * Поэтому храним РЕЗУЛЬТАТ последнего успешного расчёта на диске, поднимаем его в
 * бутстрапе приложения и синхронно отдаём экрану на первом кадре. Свежие цифры догоняют
 * фоном (loadData на фокусе всё равно вызывается с force).
 */

const STORAGE_KEY = 'trainer_practice_snapshot_v1';
/** Сутки с запасом: практика — не ежеминутная величина, но и не вечная. */
const TTL_MS = 26 * 60 * 60_000;
/** Один target × один язык интерфейса — больше для мгновенного открытия не нужно. */
const MAX_ENTRIES = 2;
/**
 * activityDays приходит за 365 дней. На первом кадре виден только «ритм недели»
 * (последние 7 наблюдаемых дней), поэтому на диск пишем хвост — иначе снапшот раздувается
 * в десятки килобайт JSON на каждую запись без всякой пользы для первого кадра.
 */
const ACTIVITY_DAYS_KEPT = 14;

type StoredEntry = Readonly<{ key: string; snapshot: TrainerPracticeSnapshot; writtenAtMs: number }>;

const restored = new Map<string, { snapshot: TrainerPracticeSnapshot; writtenAtMs: number }>();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Минимальная валидация формы: dashboard.due читается на первом кадре напрямую
 * (dashboard.due.phrases и т.п.), поэтому битая запись должна отбрасываться целиком,
 * а не падать в рендере под единственным глобальным ErrorBoundary.
 */
function parseSnapshot(raw: unknown): TrainerPracticeSnapshot | null {
  if (!isPlainObject(raw)) return null;
  const dashboard = raw.dashboard;
  if (!isPlainObject(dashboard) || !isPlainObject(dashboard.due)) return null;
  if (typeof raw.createdAt !== 'number') return null;
  return {
    dashboard: dashboard as unknown as TrainerPracticeSnapshot['dashboard'],
    hasPremium: raw.hasPremium === true,
    analytics: isPlainObject(raw.analytics)
      ? raw.analytics as unknown as TrainerPracticeSnapshot['analytics']
      : null,
    resolvedPersonalTrainings: isPlainObject(raw.resolvedPersonalTrainings)
      ? raw.resolvedPersonalTrainings as unknown as TrainerPracticeSnapshot['resolvedPersonalTrainings']
      : null,
    activityDays: Array.isArray(raw.activityDays)
      ? raw.activityDays.filter(isPlainObject) as unknown as TrainerPracticeSnapshot['activityDays']
      : [],
    createdAt: raw.createdAt,
  };
}

function trimForDisk(snapshot: TrainerPracticeSnapshot): TrainerPracticeSnapshot {
  return { ...snapshot, activityDays: snapshot.activityDays.slice(-ACTIVITY_DAYS_KEPT) };
}

function persist(): void {
  const entries: StoredEntry[] = [...restored.entries()]
    .slice(-MAX_ENTRIES)
    .map(([key, item]) => ({ key, snapshot: trimForDisk(item.snapshot), writtenAtMs: item.writtenAtMs }));
  // Фоновая запись: экран уже отрисован из памяти, ждать диск незачем.
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
}

/** Поднимает снапшот с диска в память. Вызывается из bootstrap приложения (_layout). */
export async function primeTrainerPracticeSnapshotFromStorage(nowMs = Date.now()): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;
    for (const item of parsed.slice(-MAX_ENTRIES)) {
      if (!isPlainObject(item) || typeof item.key !== 'string' || !item.key) continue;
      const writtenAtMs = Number(item.writtenAtMs);
      if (!Number.isFinite(writtenAtMs) || nowMs - writtenAtMs > TTL_MS) continue;
      const snapshot = parseSnapshot(item.snapshot);
      if (!snapshot) continue;
      restored.set(item.key, { snapshot, writtenAtMs });
    }
  } catch {
    // Дисковый снапшот — best-effort ускорение первого кадра, не источник правды.
  }
}

/** Синхронный peek для первого кадра экрана практики. */
export function peekRestoredTrainerPracticeSnapshot(
  key: string,
  nowMs = Date.now(),
): TrainerPracticeSnapshot | null {
  const entry = restored.get(key);
  if (!entry || nowMs - entry.writtenAtMs > TTL_MS) return null;
  return entry.snapshot;
}

/** Зеркалит свежий снапшот на диск — чтобы следующее открытие было мгновенным. */
export function rememberTrainerPracticeSnapshotOnDisk(
  key: string,
  snapshot: TrainerPracticeSnapshot,
  nowMs = Date.now(),
): void {
  restored.delete(key);
  restored.set(key, { snapshot, writtenAtMs: nowMs });
  while (restored.size > MAX_ENTRIES) {
    const oldest = restored.keys().next().value as string | undefined;
    if (!oldest) break;
    restored.delete(oldest);
  }
  persist();
}

/**
 * Полная очистка при смене аккаунта / logout / wipe: ключ снапшота содержит только
 * target и язык, БЕЗ uid, поэтому без этого сброса следующий вошедший на общем девайсе
 * увидел бы на первом кадре чужую статистику ошибок и активности.
 */
export function clearTrainerPracticeSnapshotOnDisk(): void {
  restored.clear();
  void AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

export function resetTrainerPracticePersistForTests(): void {
  restored.clear();
}

export default function __RouteShim() { return null; }
