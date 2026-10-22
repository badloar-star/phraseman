import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { learningV2OrderedCourseSessionIdsV1 } from '../modules/learning-v2/progress/course_local_progress_v1';
import {
  LEARNING_V2_SESSION_STARS_SYNC_KEY_V1,
  packSessionStarsSyncV1,
  unpackSessionStarsSyncV1,
} from '../modules/learning-v2/progress/progress_sync_v1';

/**
 * Звёзды 0–3 за пройденную сессию — ТОЛЬКО для показа на карте.
 *
 * зачем (владелец, 22.08): на пройденных узлах карты должны быть звёздочки
 * результата (спека mock 08). Канонический локальный прогресс
 * (`course_local_progress_v1`) хранит строго последовательность пройденных
 * сессий и прямо объявляет `masteryAuthority: "none"` — расширять его нельзя,
 * там точный набор ключей, канонический JSON и fingerprint. Поэтому результат
 * живёт ОТДЕЛЬНЫМ presentation-хранилищем рядом: порча или потеря этих данных
 * не может сломать прогресс, разблокировку, кошелёк или мастерство.
 *
 * Авторитет: никакой. Это витрина последнего результата. Сервер, кошелёк и
 * ворота доступа её не читают и читать не должны.
 *
 * Формула звёзд намеренно простая и объяснимая человеку: считаем долю заданий,
 * решённых с первой попытки и без подсказки.
 */

const PREFIX = 'learning-v2:session-star-results:v1:' as const;
const SCHEMA = 'learning-v2-session-star-results.v1' as const;
const HASH_RE = /^[a-f0-9]{64}$/u;
const SESSION_ID_RE = /^[A-Za-z0-9._:-]{1,160}$/u;
const MAX_ENTRIES = 32 * 56;
const MAX_RAW_CHARS = 256 * 1024;

export type LearningV2SessionStarResultsV1 = Readonly<
  Record<string, 0 | 1 | 2 | 3>
>;

export interface LearningV2SessionStarInteractionV1 {
  readonly disposition: "completed" | "skipped";
  readonly learnerAttempts: number;
  readonly hintUsed: boolean;
}

const EMPTY: LearningV2SessionStarResultsV1 = Object.freeze({});

// зачем (Ревизор 22.10, ⚡): порядок занятий — общий кэш хранилища прогресса, топология курса не строится второй раз.
const orderedSessionIds = learningV2OrderedCourseSessionIdsV1;

/** Облачная копия звёзд не уменьшается: пишем, только если по какому-то занятию локально лучше. */
async function mirrorStarsToSync(results: LearningV2SessionStarResultsV1): Promise<void> {
  try {
    const order = orderedSessionIds();
    const syncedRaw = await AsyncStorage.getItem(LEARNING_V2_SESSION_STARS_SYNC_KEY_V1);
    const synced = unpackSessionStarsSyncV1(syncedRaw, order);
    let better = 0;
    const merged: Record<string, number> = { ...synced };
    for (const [id, stars] of Object.entries(results)) {
      if (synced[id] === undefined || stars > synced[id]) { merged[id] = stars; better += 1; }
    }
    if (better === 0) return;
    await AsyncStorage.setItem(LEARNING_V2_SESSION_STARS_SYNC_KEY_V1, packSessionStarsSyncV1(merged, order));
    console.log('[V2-PROGRESS-SYNC] stars:mirrored', JSON.stringify({ improved: better, total: Object.keys(merged).length })); // guard-ok: что ушло в облачную копию
  } catch (error) {
    console.warn('[V2-PROGRESS-SYNC] stars:mirror_failed', JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
  }
}
const listeners = new Set<() => void>();
let memory: LearningV2SessionStarResultsV1 = EMPTY;
let memoryScopeHash: string | null = null;

const storageKey = (accountScopeHash: string): string =>
  `${PREFIX}${accountScopeHash}`;

const validStars = (value: unknown): value is 0 | 1 | 2 | 3 =>
  value === 0 || value === 1 || value === 2 || value === 3;

/**
 * 3 звезды — безупречно (всё с первой попытки, без подсказок);
 * 2 — не меньше 80% чисто; 1 — не меньше половины; 0 — ниже половины.
 * Пустой список заданий даёт 1 звезду: сессия пройдена, но доказательств нет.
 */
export function learningV2SessionStars(
  interactions: readonly LearningV2SessionStarInteractionV1[],
): 0 | 1 | 2 | 3 {
  if (interactions.length === 0) return 1;
  const clean = interactions.filter(
    (entry) =>
      entry.disposition === "completed" &&
      entry.learnerAttempts <= 1 &&
      !entry.hintUsed,
  ).length;
  const ratio = clean / interactions.length;
  if (ratio >= 1) return 3;
  if (ratio >= 0.8) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

function parse(raw: string, accountScopeHash: string): LearningV2SessionStarResultsV1 {
  if (raw.length > MAX_RAW_CHARS) return EMPTY;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return EMPTY;
  const row = value as Record<string, unknown>;
  if (row.schemaVersion !== SCHEMA || row.accountScopeHash !== accountScopeHash)
    return EMPTY;
  const results = row.results;
  if (
    typeof results !== 'object' ||
    results === null ||
    Array.isArray(results) ||
    Object.getPrototypeOf(results) !== Object.prototype
  )
    return EMPTY;
  const out: Record<string, 0 | 1 | 2 | 3> = {};
  let kept = 0;
  for (const [sessionId, stars] of Object.entries(results)) {
    if (kept >= MAX_ENTRIES) break;
    // Битая запись просто отбрасывается: витрина не имеет права уронить экран.
    if (!SESSION_ID_RE.test(sessionId) || !validStars(stars)) continue;
    out[sessionId] = stars;
    kept += 1;
  }
  return Object.freeze(out);
}

export function peekLearningV2SessionStarResults(): LearningV2SessionStarResultsV1 {
  return memory;
}

/**
 * Лучшие звёзды (0–3) за занятие — для строки «Лучший результат» в окне старта пройденного занятия.
 *
 * зачем (координатор 05.10, макет startModal): синхронно из памяти — окно открывается мгновенно, без чтения
 * диска. Значения нет (старое занятие пройдено до появления витрины или витрина ещё не поднята) — undefined:
 * ничего не выдумываем. Передан accountScopeHash и он не совпадает с поднятым — тоже undefined (чужой аккаунт).
 * Запись — только recordLearningV2SessionStarResult (max прежнего и нового), новых записей и сети здесь нет.
 */
export function getLessonBestStars(
  courseSessionId: string,
  accountScopeHash?: string,
): 0 | 1 | 2 | 3 | undefined {
  if (accountScopeHash !== undefined && accountScopeHash !== memoryScopeHash) return undefined;
  if (!SESSION_ID_RE.test(courseSessionId)) return undefined;
  const stars = Object.prototype.hasOwnProperty.call(memory, courseSessionId) ? memory[courseSessionId] : undefined;
  return validStars(stars) ? stars : undefined;
}

export function subscribeLearningV2SessionStarResults(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(
  accountScopeHash: string,
  next: LearningV2SessionStarResultsV1,
): void {
  memoryScopeHash = accountScopeHash;
  memory = next;
  for (const listener of listeners) listener();
}

export async function hydrateLearningV2SessionStarResults(
  accountScopeHash: string,
): Promise<LearningV2SessionStarResultsV1> {
  if (!HASH_RE.test(accountScopeHash)) return EMPTY;
  try {
    const raw = await AsyncStorage.getItem(storageKey(accountScopeHash));
    const local = raw === null ? EMPTY : parse(raw, accountScopeHash);
    // зачем (координатор 22.10): после переустановки или на новом телефоне облачная строка звёзд знает больше —
    // берём лучшее по каждому занятию; локально лучшее поднимает облачную копию.
    const synced = unpackSessionStarsSyncV1(await AsyncStorage.getItem(LEARNING_V2_SESSION_STARS_SYNC_KEY_V1), orderedSessionIds());
    const merged: Record<string, 0 | 1 | 2 | 3> = { ...local };
    let fromCloud = 0;
    for (const [id, stars] of Object.entries(synced)) {
      if (merged[id] === undefined || stars > merged[id]) { merged[id] = stars; fromCloud += 1; }
    }
    const next = fromCloud > 0 ? Object.freeze(merged) : local;
    if (fromCloud > 0) {
      await AsyncStorage.setItem(storageKey(accountScopeHash), JSON.stringify({ schemaVersion: SCHEMA, accountScopeHash, results: next }));
      console.log('[V2-PROGRESS-SYNC] stars:hydrated_from_cloud', JSON.stringify({ local: Object.keys(local).length, fromCloud, source: 'sync_key' })); // guard-ok: откуда пришло
    }
    publish(accountScopeHash, next);
    void mirrorStarsToSync(next);
    return next;
  } catch (error) {
    console.warn('[V2-PROGRESS-SYNC] stars:hydrate_failed', JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
    publish(accountScopeHash, EMPTY);
    return EMPTY;
  }
}

export async function recordLearningV2SessionStarResult(input: {
  readonly accountScopeHash: string;
  readonly courseSessionId: string;
  readonly stars: 0 | 1 | 2 | 3;
}): Promise<void> {
  const { accountScopeHash, courseSessionId, stars } = input;
  if (
    !HASH_RE.test(accountScopeHash) ||
    !SESSION_ID_RE.test(courseSessionId) ||
    !validStars(stars)
  )
    return;
  try {
    const raw = await AsyncStorage.getItem(storageKey(accountScopeHash));
    const current = raw === null ? EMPTY : parse(raw, accountScopeHash);
    // Повтор улучшает результат, но не ухудшает: как в спеке «best result».
    const previous = current[courseSessionId];
    const best = previous === undefined || stars > previous ? stars : previous;
    if (previous === best) {
      publish(accountScopeHash, current);
      return;
    }
    const next = Object.freeze({ ...current, [courseSessionId]: best });
    await AsyncStorage.setItem(
      storageKey(accountScopeHash),
      JSON.stringify({
        schemaVersion: SCHEMA,
        accountScopeHash,
        results: next,
      }),
    );
    publish(accountScopeHash, next);
    await mirrorStarsToSync(next);
  } catch (e) {
      // Витрина: сбой записи не должен ломать завершение сессии.
      DebugLogger.error('learning_v2_session_star_results_store:next', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export function __resetLearningV2SessionStarResultsForTests(): void {
  memory = EMPTY;
  memoryScopeHash = null;
  for (const listener of listeners) listener();
}

export function __peekLearningV2SessionStarResultsScopeForTests(): string | null {
  return memoryScopeHash;
}
