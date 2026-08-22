export type MaxTutorLessonType = 'new_material' | 'review_and_scene' | 'free_talk';

export interface MaxTutorPreview {
  tutorName: string;
  lessonOrdinal: number;
  lessonType: MaxTutorLessonType;
  dueCount: number;
  homeworkCount: number;
  nextTopic: string;
  goalId: string;
  goalTitle: string;
  goalLevel: string;
  goalMastery: number;
  displayTitle: string;
  outcome: string;
  /** Read-only quota/config snapshot returned by the same preflight. */
  limits?: Record<string, unknown>;
}

export interface MaxTutorPreviewKeyParams {
  format: string;
  cefr?: string;
  interfaceLang?: string;
  studyTarget?: string;
}

export const MAX_TUTOR_PREVIEW_TTL_MS = 5 * 60_000;

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ').slice(0, max) : '';
}

function count(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(0, Math.floor(value)))
    : 0;
}

export function parseMaxTutorPreview(value: unknown, interfaceLang: string): MaxTutorPreview | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const lessonOrdinal = count(source.lessonOrdinal, 100_000);
  if (lessonOrdinal < 1) return null;
  const rawType = source.lessonType;
  const lessonType: MaxTutorLessonType = rawType === 'review_and_scene' || rawType === 'free_talk'
    ? rawType
    : 'new_material';
  const goal = source.goal && typeof source.goal === 'object'
    ? source.goal as Record<string, unknown>
    : {};
  const titles = goal.title && typeof goal.title === 'object'
    ? goal.title as Record<string, unknown>
    : {};
  const goalTitle = interfaceLang === 'ru'
    ? text(titles.ru, 140) || text(titles.en, 140)
    : interfaceLang === 'uk'
      ? text(titles.uk, 140) || text(titles.en, 140)
      : text(titles.en, 140) || text(titles.ru, 140) || text(titles.uk, 140);

  return {
    tutorName: text(source.name, 24) || 'Max',
    lessonOrdinal,
    lessonType,
    dueCount: count(source.dueCount, 99),
    homeworkCount: count(source.homeworkCount, 99),
    nextTopic: text(source.nextTopic, 140),
    goalId: text(goal.id, 80),
    goalTitle,
    goalLevel: text(goal.level, 8) || 'A1',
    goalMastery: count(goal.mastery, 3),
    displayTitle: text(source.displayTitle, 120) || goalTitle || `Lesson ${lessonOrdinal}`,
    outcome: text(source.outcome, 180) || goalTitle,
  };
}

export function maxTutorPreviewKey(params: MaxTutorPreviewKeyParams): string {
  return [params.format, params.cefr ?? '', params.interfaceLang ?? '', params.studyTarget ?? ''].join('|');
}

interface CacheEntry {
  value: MaxTutorPreview | null;
  updatedAtMs: number;
  pending: Promise<MaxTutorPreview | null> | null;
}

const cache = new Map<string, CacheEntry>();

export function peekMaxTutorPreview(
  key: string,
  nowMs = Date.now(),
  allowStale = false,
): MaxTutorPreview | null {
  const entry = cache.get(key);
  if (!entry?.value) return null;
  if (!allowStale && nowMs - entry.updatedAtMs > MAX_TUTOR_PREVIEW_TTL_MS) return null;
  return entry.value;
}

export function primeMaxTutorPreview(
  key: string,
  fetcher: () => Promise<MaxTutorPreview | null>,
  nowMs = Date.now(),
): Promise<MaxTutorPreview | null> {
  const existing = cache.get(key);
  const fresh = peekMaxTutorPreview(key, nowMs);
  if (fresh) return Promise.resolve(fresh);
  if (existing?.pending) return existing.pending;

  const entry: CacheEntry = existing ?? { value: null, updatedAtMs: 0, pending: null };
  let fetched: Promise<MaxTutorPreview | null>;
  try {
    fetched = fetcher();
  } catch (error) {
    fetched = Promise.reject(error);
  }
  const pending = fetched
    .then((value) => {
      if (!value) throw new Error('max_tutor_preview_malformed');
      entry.value = value;
      entry.updatedAtMs = nowMs;
      entry.pending = null;
      cache.set(key, entry);
      return value;
    })
    .catch((error) => {
      entry.pending = null;
      cache.set(key, entry);
      throw error;
    });
  entry.pending = pending;
  cache.set(key, entry);
  return pending;
}

export function invalidateMaxTutorPreview(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}

export function clearMaxTutorPreviewCacheForTests(): void {
  cache.clear();
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
