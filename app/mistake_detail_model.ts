import type { MistakeEvent, MistakeFacet, MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { projectMistakes } from '../modules/mistake-practice/projection';
import { MISTAKE_EXERCISE_MODE_REGISTRY, type MistakeExerciseMode } from '../modules/mistake-practice/exercise_mode_registry';
import { loadMistakeEventJournal } from './mistake_practice_store';
import { mistakeSourceGroupFor, type MistakeSourceGroup } from './mistake_practice_insights';

/**
 * Карточка одной ошибки (макет Б): хроника попыток, сколько осталось до
 * «исправлено», похожие фразы, которые человек уже победил.
 *
 * ВАЖНО про данные: журнал НЕ хранит ответ ученика — только факт промаха, тип
 * ошибки, источник и режим. Поэтому блок «твои ответы» из макета здесь не
 * строится: показать вместо реальных ответов выдумку хуже, чем не показать
 * ничего. Если владелец захочет его — нужно отдельное решение о хранении
 * ответов (это новые данные, с приватностью и объёмом).
 */

export type MistakeTimelineKind = 'captured' | 'practice_wrong' | 'practice_right' | 'corrected' | 'hidden' | 'restored';

export interface MistakeTimelineEntry {
  readonly kind: MistakeTimelineKind;
  readonly atMs: number;
  readonly sourceGroup: MistakeSourceGroup | null;
  /** Режим задания, если событие о тренировке. */
  readonly mode: MistakeExerciseMode | null;
  /** Ответ засчитан как самостоятельный (без подсказок). */
  readonly independent: boolean;
}

export interface MistakeDetail {
  readonly mistakeId: string;
  readonly phrase: string;
  readonly meaning: string | null;
  readonly facet: MistakeFacet;
  readonly lessonId: string | null;
  readonly sourceGroup: MistakeSourceGroup | null;
  readonly status: 'active' | 'corrected' | 'hidden' | 'unavailable';
  readonly captureCount: number;
  /** Верных самостоятельных дней в текущем цикле (0..3). */
  readonly qualifyingDays: number;
  /** Сколько разных режимов уже зачтено (нужно 2 из 3 дней). */
  readonly qualifyingModes: number;
  readonly ready: boolean;
  readonly dueAtMs: number;
  readonly correctedAtMs: number | null;
  readonly audioRef: string | null;
  readonly timeline: readonly MistakeTimelineEntry[];
  /** Фразы того же типа, уже исправленные навсегда — опора на свой опыт. */
  readonly solvedNeighbours: readonly Readonly<{ phrase: string; correctedAtMs: number | null }>[];
}

const MAX_TIMELINE = 12;
const MAX_NEIGHBOURS = 3;

const str = (payload: Readonly<Record<string, unknown>>, key: string): string | null => {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value : null;
};

export function buildMistakeDetail(
  events: readonly MistakeEvent[],
  mistakeId: string,
  nowMs = Date.now(),
): MistakeDetail | null {
  const projection = projectMistakes(events);
  const item = projection.items.get(mistakeId);
  if (!item) return null;

  const own = events.filter((event) => event.mistakeId === mistakeId);
  const timeline: MistakeTimelineEntry[] = [];
  for (const event of own) {
    const mode = str(event.payload, 'mode') as MistakeExerciseMode | null;
    const independent = mode ? MISTAKE_EXERCISE_MODE_REGISTRY[mode]?.countsAsIndependentProduction === true : false;
    const sourceGroup = str(event.payload, 'sourceKind')
      ? mistakeSourceGroupFor(str(event.payload, 'sourceKind'))
      : null;
    if (event.type === 'captured') {
      timeline.push({ kind: 'captured', atMs: event.occurredAtMs, sourceGroup, mode: null, independent: false });
    } else if (event.type === 'practice_answered') {
      timeline.push({
        kind: event.payload.correct === true ? 'practice_right' : 'practice_wrong',
        atMs: event.occurredAtMs,
        sourceGroup: null,
        mode,
        independent,
      });
    } else if (event.type === 'hidden' || event.type === 'restored') {
      timeline.push({ kind: event.type, atMs: event.occurredAtMs, sourceGroup: null, mode: null, independent: false });
    }
  }
  if (item.status === 'corrected' && item.correctedAtMs !== null) {
    timeline.push({ kind: 'corrected', atMs: item.correctedAtMs, sourceGroup: null, mode: null, independent: true });
  }
  timeline.sort((left, right) => left.atMs - right.atMs);

  // Соседи: тот же тип ошибки, уже исправлены. Опираемся на победы человека,
  // а не на учебник — это поддерживает, а не поучает.
  const solvedNeighbours = [...projection.items.values()]
    .filter((candidate) => candidate.mistakeId !== mistakeId
      && candidate.status === 'corrected'
      && candidate.facet === item.facet)
    .sort((left, right) => (right.correctedAtMs ?? 0) - (left.correctedAtMs ?? 0))
    .slice(0, MAX_NEIGHBOURS)
    .map((candidate) => Object.freeze({ phrase: candidate.canonicalTarget, correctedAtMs: candidate.correctedAtMs }));

  return Object.freeze({
    mistakeId,
    phrase: item.canonicalTarget,
    meaning: item.sourceMeaning ?? null,
    facet: item.facet,
    lessonId: item.lessonId,
    sourceGroup: item.sourceKind ? mistakeSourceGroupFor(item.sourceKind) : null,
    status: item.status,
    captureCount: item.captureCount,
    qualifyingDays: Math.min(3, item.qualifyingDays.length),
    qualifyingModes: new Set(item.qualifyingModes).size,
    ready: item.status === 'active' && item.dueAtMs <= nowMs,
    dueAtMs: item.dueAtMs,
    correctedAtMs: item.correctedAtMs,
    audioRef: item.audioRef ?? null,
    // Хроника с конца: последние события важнее первых.
    timeline: Object.freeze(timeline.slice(-MAX_TIMELINE)),
    solvedNeighbours: Object.freeze(solvedNeighbours),
  });
}

/**
 * Загрузка карточки. accountScope обязателен: журнал живёт под аккаунтом, и
 * читать его «без владельца» нельзя — иначе на смене аккаунта покажем чужое.
 */
export async function loadMistakeDetail(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  mistakeId: string;
  nowMs?: number;
}>): Promise<MistakeDetail | null> {
  const journal = await loadMistakeEventJournal({
    accountScope: input.accountScope,
    studyTarget: input.studyTarget,
  });
  const detail = buildMistakeDetail(journal.events, input.mistakeId, input.nowMs ?? Date.now());
  console.log('[MISTAKES-HUB] detail', JSON.stringify({ // guard-ok: трассировка (правило «сперва логи»)
    found: detail !== null,
    status: detail?.status ?? null,
    captures: detail?.captureCount ?? 0,
    days: detail?.qualifyingDays ?? 0,
    timeline: detail?.timeline.length ?? 0,
  }));
  return detail;
}

/* expo-router route shim: keeps this app utility from being treated as a route */
export default function __RouteShim() {
  return null;
}
