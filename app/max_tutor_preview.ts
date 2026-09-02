import { subscribeAccountGeneration } from './account_generation';

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
  /**
   * зачем (владелец 2026-08-26): limits.dayRemainingSec — всегда общий
   * пул MAX, даже когда доступ trial. Кто рисует минуты по этому
   * превью (бейдж Главной), обязан знать доступ, иначе free/plus видит «20м»
   * вместо реальных 3 минут пробника.
   *
   * зачем ('paid_minutes'/'admin', аудит 2026-08-30): сервер с переезда на
   * кошелёк минут шлёт access 'trial' | 'paid_minutes' | 'admin' — прежний
   * литерал 'max' не приходил никогда, и платный доступ выживал только потому,
   * что падал в ветку dayRemainingSec. Тип приведён к серверному контракту.
   */
  access?: 'paid_minutes' | 'admin' | 'trial';
  /**
   * зачем (владелец 2026-08-31, раздел «Уроки с МАКСом»): каталогу нужны звёзды
   * КАЖДОГО урока, а не только текущего (goalMastery выше — ступень текущей
   * цели, это другое поле, менять его нельзя: на него смотрит табличка миссии).
   * Сервер шлёт только ненулевые ступени, отсутствие ключа = 0 звёзд.
   */
  catalogMastery: Record<string, number>;
  /** Шапка раздела: закрыто целей / всего и честный уровень по закрытым целям. */
  catalogProgress: { done: number; total: number; level: string };
}

export interface MaxTutorPreviewKeyParams {
  format: string;
  cefr?: string;
  interfaceLang?: string;
  studyTarget?: string;
  /**
   * Урок из каталога. Обязан входить в ключ: без него превью урока «Заказать в
   * кафе» перезаписало бы кэш урока «Спросить дорогу», и следующий экран
   * показал бы чужую цель из свежего кэша.
   */
  goalId?: string;
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
    catalogMastery: parseCatalogMastery(source.catalogMastery),
    catalogProgress: parseCatalogProgress(source.progress),
  };
}

/**
 * Карта звёзд каталога из ответа сервера. Ключи — id уроков, значения 0–3.
 * Старый сервер поля не шлёт — тогда карта пустая и каталог рисует нули, а не
 * падает: раздел обязан открываться на любой версии функций.
 */
function parseCatalogMastery(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    // id урока — короткий слаг вида a1_greet; всё прочее игнорируем молча,
    // это недоверенный ввод, а не ошибка.
    if (!/^[a-z0-9_]{1,80}$/u.test(id)) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    out[id] = Math.min(3, Math.max(0, Math.floor(n)));
  }
  return out;
}

function parseCatalogProgress(value: unknown): { done: number; total: number; level: string } {
  const src = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const total = count(src.total, 500);
  return {
    done: Math.min(count(src.done, 500), total || 500),
    total,
    level: text(src.level, 8) || 'A1',
  };
}

export function maxTutorPreviewKey(params: MaxTutorPreviewKeyParams): string {
  return [
    params.format,
    params.cefr ?? '',
    params.interfaceLang ?? '',
    params.studyTarget ?? '',
    params.goalId ?? '',
  ].join('|');
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

// зачем (владелец 2026-09-02, вход с другого аккаунта в том же процессе):
// ключ кэша — параметры звонка (формат/уровень/язык/цель), АККАУНТА в ключе
// нет. После смены пользователя Главная и раздел уроков поднимали превью
// прежнего: его доступ, его минуты, его звёзды каталога. Владелец видел «20м»
// админского пула первого аккаунта на втором. Тот же образец, что у
// peek_cache минут и energy_peek_cache: смена поколения аккаунта = чистый кэш.
subscribeAccountGeneration(() => {
  cache.clear();
});

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
