import {
  canonicalJsonV1,
  sha256Utf8,
} from '../learning-v2/policies/decision_registry';
import { buildMistakeExercise, type MistakeExercise } from './exercise_builders';
import {
  chooseMistakeExerciseMode,
  MISTAKE_EXERCISE_MODE_REGISTRY,
  type MistakeExerciseCapabilities,
  type MistakeExerciseMode,
  type MistakeExerciseSupport,
} from './exercise_mode_registry';
import type { MistakeFacet } from './contracts';
import type { MistakeProjectionItem } from './projection';
import { mistakeExerciseCapabilitiesFor } from './capabilities';
import {
  planFailureRequeue,
  selectCorrectedMistakesForReview,
  selectMistakesForSession,
  type FailureRequeuePlan,
} from './scheduler';

export type MistakePracticeLength = '5' | '10' | '15' | 'all';

/** Откуда берётся сессия: активные ошибки (по умолчанию) или уже исправленные — повтор для закрепления. */
export type MistakePracticePool = 'active' | 'corrected';

export interface MistakePracticeLengthOption {
  readonly id: MistakePracticeLength;
  readonly count: number;
  readonly enabled: boolean;
}

export interface MistakePracticeSessionEntry {
  readonly mistakeId: string;
  readonly cycleId: string;
  readonly facet: MistakeFacet;
  readonly support: MistakeExerciseSupport;
  readonly exercise: MistakeExercise;
}

/**
 * Под какой запрос собрана сессия (длина и группы ошибок).
 * зачем (координатор 13.10, mistakes-panel-017): сессия группы «Грамматика 1» сохранялась без запроса, и «Все 12» её
 * продолжало — 1 задание вместо 12. Поле необязательное: сохранённые раньше сессии читаются как прежде.
 */
export interface MistakePracticeRequest {
  readonly length: MistakePracticeLength;
  readonly facets: readonly MistakeFacet[];
}

/** Отпечаток запроса: группы без повторов и по порядку — «Значение+Грамматика» и «Грамматика+Значение» один запрос. */
export function mistakePracticeRequestOf(length: MistakePracticeLength, facets?: readonly MistakeFacet[]): MistakePracticeRequest {
  return Object.freeze({ length, facets: Object.freeze([...new Set(facets ?? [])].sort()) });
}

/** Чем запрос отличается от сохранённого; null — тот же запрос (или у сохранённой сессии запроса нет — старая запись). */
export function mistakePracticeRequestMismatch(
  stored: MistakePracticeRequest | undefined,
  requested: MistakePracticeRequest,
): string | null {
  if (!stored) return null;
  const diffs: string[] = [];
  if (stored.length !== requested.length) diffs.push(`length:${stored.length}->${requested.length}`);
  const storedFacets = [...stored.facets].sort().join('+') || 'all';
  const requestedFacets = [...requested.facets].sort().join('+') || 'all';
  if (storedFacets !== requestedFacets) diffs.push(`facets:${storedFacets}->${requestedFacets}`);
  return diffs.length > 0 ? diffs.join(',') : null;
}

export interface MistakePracticeSession {
  readonly version: 1;
  readonly sessionId: string;
  /** Запрос, под который собрана сессия (см. MistakePracticeRequest). У сессий до 13.10 поля нет. */
  readonly request?: MistakePracticeRequest;
  /** Есть только у повтора исправленных; у обычной сессии поля нет (сохранённые сессии читаются как раньше). */
  readonly pool?: 'corrected';
  readonly startedAtMs: number;
  readonly initialCount: number;
  readonly cursor: number;
  readonly queue: readonly MistakePracticeSessionEntry[];
  readonly failureCounts: Readonly<Record<string, number>>;
  readonly answeredAttemptIds: readonly string[];
}

/** Не больше стольких id ошибок принимает маршрут «Ещё N» (как лимит одной сессии). */
export const MISTAKE_RETRY_IDS_MAX = 30;
const MISTAKE_ID_PATTERN = /^[A-Za-z0-9:_-]{1,128}$/;

/**
 * Разбор параметра маршрута `mistakeIds` (id через запятую). Недоверенный ввод: оставляем только
 * id допустимого вида, без повторов, не больше MISTAKE_RETRY_IDS_MAX; остальное — в `dropped`
 * (экран пишет это в лог [MISTAKE-RETRY]).
 */
export function parseMistakeRetryIdsParam(raw: unknown): Readonly<{ ids: readonly string[]; dropped: number; overLimit: number }> {
  const text = Array.isArray(raw) ? raw.join(',') : typeof raw === 'string' ? raw : '';
  const parts = text.split(',').map((part) => part.trim()).filter((part) => part.length > 0);
  const valid: string[] = [];
  let dropped = 0;
  for (const part of parts) {
    if (!MISTAKE_ID_PATTERN.test(part)) { dropped += 1; continue; }
    if (!valid.includes(part)) valid.push(part);
  }
  const ids = valid.slice(0, MISTAKE_RETRY_IDS_MAX);
  return Object.freeze({ ids: Object.freeze(ids), dropped, overLimit: valid.length - ids.length });
}

/** Верхняя граница одной сессии: дольше человек устаёт, а не учится. */
export const MISTAKE_PRACTICE_MAX_SESSION = 30;
/**
 * С какого объёма сессия стоит энергию. Короткие наборы (1-4 ошибки)
 * бесплатны, чтобы новичок с тремя промахами сразу попадал в раздел.
 * зачем (владелец 2026-09-14): порог «минимум 5 ошибок» закрывал раздел целиком.
 */
export const MISTAKE_PRACTICE_ENERGY_MIN_COUNT = 5;

export function mistakePracticeLengthOptions(
  rawAvailable: number,
): readonly MistakePracticeLengthOption[] {
  const available = Number.isFinite(rawAvailable)
    ? Math.max(0, Math.floor(rawAvailable))
    : 0;
  // зачем (владелец 2026-09-14): «Все» доступно от одной ошибки; фиксированные
  // 5/10/15 включаются, когда ошибок хватает на полный набор.
  return Object.freeze([
    Object.freeze({ id: '5', count: 5, enabled: available >= 5 }),
    Object.freeze({ id: '10', count: 10, enabled: available >= 10 }),
    Object.freeze({ id: '15', count: 15, enabled: available >= 15 }),
    Object.freeze({ id: 'all', count: Math.min(MISTAKE_PRACTICE_MAX_SESSION, available), enabled: available >= 1 }),
  ]);
}

/** Сколько ошибок реально попадёт в сессию при выбранной длине. */
export function mistakePracticeSessionCount(
  requested: MistakePracticeLength,
  rawAvailable: number,
): number {
  const available = Number.isFinite(rawAvailable) ? Math.max(0, Math.floor(rawAvailable)) : 0;
  return requested === 'all'
    ? Math.min(MISTAKE_PRACTICE_MAX_SESSION, available)
    : Math.min(Number(requested), available);
}

/** Сессия платная (энергия), только если в ней от 5 ошибок. */
export function mistakePracticeSessionCostsEnergy(count: number): boolean {
  return Number.isFinite(count) && count >= MISTAKE_PRACTICE_ENERGY_MIN_COUNT;
}

const stageFor = (item: MistakeProjectionItem): MistakeExerciseSupport => {
  if ((item.supportPassCount ?? 0) === 0) return 'recognition';
  if ((item.supportPassCount ?? 0) === 1) return 'guided';
  return 'production';
};

// зачем (04.10): расчёт вынесен в capabilities.ts — тот же нужен проекции (правило «ушла из счётчика»).
const capabilitiesFor = (item: MistakeProjectionItem): MistakeExerciseCapabilities => mistakeExerciseCapabilitiesFor(item);

const countFor = mistakePracticeSessionCount;

export function buildMistakePracticeSession(input: {
  readonly items: readonly MistakeProjectionItem[];
  readonly requestedLength: MistakePracticeLength;
  readonly nowMs: number;
  /** Direct handoff from a correction card: practice exactly this mistake. */
  readonly focusMistakeId?: string;
  /**
   * зачем (макет «Панель», окно «Перед отработкой»: чипы Значение / Грамматика / Произношение): сузить сессию до выбранных типов ошибок.
   * Без параметра (или пустой список) поведение прежнее байт в байт.
   */
  readonly facets?: readonly MistakeFacet[];
  /**
   * зачем (владелец 04.10, «Повторить исправленные»): 'corrected' собирает сессию из уже
   * исправленных ошибок для закрепления. Без параметра — 'active', поведение прежнее байт в байт.
   */
  readonly pool?: MistakePracticePool;
  /**
   * зачем (координатор 04.10, кнопка «Ещё N» в итоге, mistakes-panel.html кадр result): сузить
   * новую сессию до ошибок, на которые в прошлой сессии ответили неверно. Пустой список или без
   * параметра — поведение прежнее байт в байт. Дальше работают обычные правила pool/срока/лимита.
   */
  readonly mistakeIds?: readonly string[];
}): MistakePracticeSession {
  const focusMistakeId = input.focusMistakeId?.trim() ?? '';
  const facetFiltered = input.facets && input.facets.length > 0
    ? input.items.filter((item) => input.facets!.includes(item.facet))
    : input.items;
  const retryIds = input.mistakeIds && input.mistakeIds.length > 0 ? new Set(input.mistakeIds) : null;
  // зачем (координатор 04.10): «Ещё N» — это всегда обычная отработка. После повтора исправленных
  // неверно отвеченные уже стали активными, и pool 'corrected' отсеял бы их все до отказа.
  const pool: MistakePracticePool = retryIds ? 'active' : input.pool ?? 'active';
  const idFiltered = retryIds ? facetFiltered.filter((item) => retryIds.has(item.mistakeId)) : facetFiltered;
  const candidates = focusMistakeId
    ? idFiltered.filter((item) => item.mistakeId === focusMistakeId)
    : idFiltered;
  const ready = pool === 'corrected'
    ? selectCorrectedMistakesForReview(candidates, { limit: focusMistakeId ? 1 : 30 })
    : selectMistakesForSession(candidates, {
      nowMs: input.nowMs,
      limit: focusMistakeId ? 1 : 30,
    });
  // зачем (координатор 04.10, «выбрано Все 12, а сессия из одного задания»): сперва логи — сколько ошибок отсеял каждый фильтр
  // и сколько реально готово по сроку. Печатаем значения, не голые флаги.
  console.log('[MISTAKE-SESSION] build', JSON.stringify({
    items: input.items.length,
    activeItems: input.items.filter((item) => item.status === 'active').length,
    dueActiveItems: input.items.filter((item) => item.status === 'active' && item.dueAtMs <= input.nowMs).length,
    afterFacets: facetFiltered.length,
    afterRetryIds: idFiltered.length,
    candidates: candidates.length,
    ready: ready.length,
    requestedLength: input.requestedLength,
    facets: input.facets ?? null,
    pool,
    focusMistakeId: focusMistakeId || null,
    retryIds: retryIds ? retryIds.size : null,
  }));
  if (focusMistakeId && ready.length !== 1) {
    throw new Error('mistake_practice_focus_unavailable');
  }
  // зачем (владелец 2026-09-14): сессия стартует от ОДНОЙ готовой ошибки;
  // прежний порог «минимум 5» отменён. Запрошенная длина больше наличия
  // просто урезается до наличия (так «10» при 7 готовых даёт 7).
  if (!focusMistakeId && ready.length < 1) {
    throw new Error('mistake_practice_no_ready_mistakes');
  }
  const count = focusMistakeId ? 1 : countFor(input.requestedLength, ready.length);
  if (!focusMistakeId && (count > ready.length || count < 1)) {
    throw new Error('mistake_practice_length_unavailable');
  }

  const recentModes: MistakeExerciseMode[] = [];
  const queue = ready.slice(0, count).map((item) => {
    const mode: MistakeExerciseMode = chooseMistakeExerciseMode({
      facet: item.facet,
      capabilities: capabilitiesFor(item),
      stage: stageFor(item),
      recentModes,
    });
    recentModes.push(mode);
    return Object.freeze({
      mistakeId: item.mistakeId,
      cycleId: item.cycleId,
      facet: item.facet,
      support: MISTAKE_EXERCISE_MODE_REGISTRY[mode].support,
      exercise: buildMistakeExercise({
        mistakeId: item.mistakeId,
        mode,
        canonicalTarget: item.canonicalTarget,
        sourceMeaning: item.sourceMeaning ?? undefined,
        sourcePrompt: item.sourcePrompt ?? undefined,
        tokens: item.tokens,
        distractors: item.distractors,
        audioRef: item.audioRef ?? undefined,
        tokenIndex: item.tokenIndex ?? undefined,
        expected: item.expected ?? undefined,
      }),
    });
  });
  console.log('[MISTAKE-SESSION] queue', JSON.stringify({
    count,
    queue: queue.map((entry) => ({ id: entry.mistakeId.slice(-8), mode: entry.exercise.mode })),
  }));
  const sessionId = `mistake-session:v1:${sha256Utf8(canonicalJsonV1({
    mistakeIds: queue.map((entry) => entry.mistakeId),
    focusMistakeId: focusMistakeId || null,
    requestedLength: input.requestedLength,
    startedAtMs: input.nowMs,
    // поле только у повтора — у обычной сессии id прежний байт в байт
    ...(pool === 'corrected' ? { pool } : {}),
  }))}`;
  return Object.freeze({
    version: 1,
    sessionId,
    request: mistakePracticeRequestOf(input.requestedLength, input.facets),
    ...(pool === 'corrected' ? { pool } : {}),
    startedAtMs: input.nowMs,
    initialCount: count,
    cursor: 0,
    queue: Object.freeze(queue),
    failureCounts: Object.freeze({}),
    answeredAttemptIds: Object.freeze([]),
  });
}

export type MistakeSessionAdvanceResult = Readonly<{
  kind: 'advanced' | 'duplicate' | 'complete';
  session: MistakePracticeSession;
  answeredEntry: MistakePracticeSessionEntry | null;
  requeue: FailureRequeuePlan | null;
}>;

export function advanceMistakePracticeSession(
  session: MistakePracticeSession,
  answer: Readonly<{ attemptId: string; correct: boolean }>,
): MistakeSessionAdvanceResult {
  const attemptId = answer.attemptId.trim();
  if (!attemptId) throw new Error('mistake_practice_attempt_id_required');
  if (session.answeredAttemptIds.includes(attemptId)) {
    return Object.freeze({ kind: 'duplicate', session, answeredEntry: null, requeue: null });
  }
  const entry = session.queue[session.cursor];
  if (!entry) {
    return Object.freeze({ kind: 'complete', session, answeredEntry: null, requeue: null });
  }

  const queue = [...session.queue];
  const failureCounts = { ...session.failureCounts };
  let requeue: FailureRequeuePlan | null = null;
  if (!answer.correct) {
    const failureCount = (failureCounts[entry.mistakeId] ?? 0) + 1;
    failureCounts[entry.mistakeId] = failureCount;
    requeue = planFailureRequeue({ mistakeId: entry.mistakeId, failureCount });
    if (requeue.kind === 'requeue') {
      const desiredInsertAt = session.cursor + 1 + requeue.afterTaskCount;
      if (desiredInsertAt > queue.length) {
        const used = new Set<string>([entry.mistakeId]);
        const spacers = queue.filter((candidate) => {
          if (used.has(candidate.mistakeId)) return false;
          used.add(candidate.mistakeId);
          return true;
        });
        queue.push(...spacers.slice(0, desiredInsertAt - queue.length), entry);
      } else {
        queue.splice(desiredInsertAt, 0, entry);
      }
    }
  }
  const nextCursor = session.cursor + 1;
  console.log('[MISTAKE-SESSION] advance', JSON.stringify({
    attemptId,
    correct: answer.correct,
    cursorBefore: session.cursor,
    queueLengthBefore: session.queue.length,
    queueLengthAfter: queue.length,
    requeue: requeue ? requeue.kind : null,
    failureCount: failureCounts[entry.mistakeId] ?? 0,
    initialCount: session.initialCount,
    completeAfter: nextCursor >= queue.length,
  }));
  const next = Object.freeze({
    ...session,
    cursor: nextCursor,
    queue: Object.freeze(queue),
    failureCounts: Object.freeze(failureCounts),
    answeredAttemptIds: Object.freeze([...session.answeredAttemptIds, attemptId]),
  });
  return Object.freeze({
    kind: nextCursor >= queue.length ? 'complete' : 'advanced',
    session: next,
    answeredEntry: entry,
    requeue,
  });
}

/**
 * Сколько ошибок отработано ОКОНЧАТЕЛЬНО — счётчик «N/initialCount» в шапке.
 *
 * зачем (баг владельца 2026-09-14: экран «Мои ошибки» показывал 10/10 сразу при
 * открытии): считать уникальные mistakeId в пройденной части очереди нельзя.
 * Ошибочный ответ переставляет задание дальше по очереди (requeue), курсор
 * уходит вперёд, и все 10 идентификаторов набираются задолго до конца сессии —
 * счётчик упирается в 10/10, пока задания ещё остаются. Такая сессия
 * сохранялась (cursor < queue.length) и при следующем заходе восстанавливалась
 * уже с «10/10». Ошибка закрыта только тогда, когда её больше нет в остатке.
 */
export function mistakePracticeProgress(
  session: Pick<MistakePracticeSession, 'queue' | 'cursor' | 'initialCount'>,
): number {
  const remaining = new Set(session.queue.slice(session.cursor).map((item) => item.mistakeId));
  const closed = new Set(
    session.queue
      .slice(0, session.cursor)
      .map((item) => item.mistakeId)
      .filter((mistakeId) => !remaining.has(mistakeId)),
  ).size;
  return Math.min(session.initialCount, closed);
}

/**
 * Счётчик шапки задания «n / N» — пройденные вопросы.
 * зачем (решено по рекомендации 05.10, п.70): закрытые ошибки (mistakePracticeProgress) не двигались после верного
 * ответа (ошибка закрывается только за три разных дня) — человек не видел движения. Шапка считает ответы; если ошибка
 * вернулась в очередь после промаха, общее число честно растёт.
 */
export function mistakePracticeAnsweredProgress(
  session: Pick<MistakePracticeSession, 'queue' | 'cursor' | 'initialCount'>,
): Readonly<{ answered: number; total: number }> {
  const total = Math.max(session.initialCount, session.queue.length);
  return { answered: Math.min(Math.max(0, session.cursor), total), total };
}
