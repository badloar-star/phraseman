import type {
  MistakeEvent,
  MistakeFacet,
  MistakeStudyTarget,
} from './contracts';
import {
  MISTAKE_EXERCISE_MODE_REGISTRY,
  independentProductionModeCount,
  type MistakeExerciseMode,
} from './exercise_mode_registry';
import { mistakeExerciseCapabilitiesFor, type MistakeCapabilitySource } from './capabilities';

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCAL_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type MistakeProjectionStatus = 'active' | 'corrected' | 'hidden' | 'unavailable';

export interface MistakeProjectionItem {
  readonly mistakeId: string;
  readonly cycleId: string;
  readonly studyTarget: MistakeStudyTarget;
  readonly status: MistakeProjectionStatus;
  readonly firstCapturedAtMs: number;
  readonly lastEventAtMs: number;
  readonly dueAtMs: number;
  readonly correctedAtMs: number | null;
  readonly captureCount: number;
  readonly hintCount: number;
  readonly qualifyingDays: readonly string[];
  readonly qualifyingModes: readonly string[];
  readonly hasIndependentProduction: boolean;
  readonly supportPassCount?: number;
  readonly lessonId: string | null;
  readonly sourceId?: string | null;
  readonly sourceKind?: string | null;
  readonly contentFingerprint?: string | null;
  readonly facet: MistakeFacet;
  readonly canonicalTarget: string;
  readonly sourceMeaning?: string | null;
  /**
   * Текст задания с пропуском, как его видел ученик (2026-09-21). У старых
   * записей журнала его нет → null, тогда задание показывается переводом,
   * как раньше. См. MistakeContentRef.sourcePrompt.
   */
  readonly sourcePrompt?: string | null;
  readonly tokens?: readonly string[];
  readonly distractors?: readonly string[];
  readonly audioRef?: string | null;
  readonly tokenIndex?: number | null;
  readonly expected?: string | null;
  /**
   * Что ответил ученик (аудит 2026-09-21). Нужен для строки «ты написал X →
   * надо Y» в разборе после занятия. У старых записей журнала его нет — тогда
   * разбор показывает только правильный вариант, без зачёркнутого.
   */
  readonly given?: string | null;
}

export interface MistakeProjection {
  readonly items: ReadonlyMap<string, MistakeProjectionItem>;
  readonly duplicateEventCount: number;
}

interface MutableProjectionItem {
  mistakeId: string;
  cycleId: string;
  studyTarget: MistakeStudyTarget;
  status: MistakeProjectionStatus;
  firstCapturedAtMs: number;
  lastEventAtMs: number;
  dueAtMs: number;
  correctedAtMs: number | null;
  captureCount: number;
  hintCount: number;
  qualifyingDays: string[];
  qualifyingModes: string[];
  hasIndependentProduction: boolean;
  supportPassCount: number;
  lessonId: string | null;
  sourceId: string | null;
  sourceKind: string | null;
  contentFingerprint: string | null;
  facet: MistakeFacet;
  canonicalTarget: string;
  sourceMeaning: string | null;
  /** Текст задания с пропуском; у старых записей журнала его нет → null. */
  sourcePrompt: string | null;
  tokens: string[];
  distractors: string[];
  audioRef: string | null;
  tokenIndex: number | null;
  expected: string | null;
  /** Ответ ученика; у старых записей журнала его нет → null. */
  given: string | null;
}

const FACETS = new Set<MistakeFacet>([
  'meaning',
  'form',
  'word_order',
  'missing_token',
  'listening',
  'pronunciation',
]);

const payloadString = (
  payload: Readonly<Record<string, unknown>>,
  key: string,
): string | null => {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const payloadStrings = (
  payload: Readonly<Record<string, unknown>>,
  key: string,
): string[] => Array.isArray(payload[key])
  ? (payload[key] as unknown[]).filter((value): value is string =>
      typeof value === 'string' && value.trim().length > 0,
    )
  : [];

function fromCapture(event: MistakeEvent): MutableProjectionItem {
  const facetRaw = payloadString(event.payload, 'facet');
  const facet = facetRaw && FACETS.has(facetRaw as MistakeFacet)
    ? (facetRaw as MistakeFacet)
    : 'form';
  return {
    mistakeId: event.mistakeId,
    cycleId: event.cycleId,
    studyTarget: event.studyTarget,
    status: 'active',
    firstCapturedAtMs: event.occurredAtMs,
    lastEventAtMs: event.occurredAtMs,
    dueAtMs: event.occurredAtMs,
    correctedAtMs: null,
    captureCount: 1,
    hintCount: 0,
    qualifyingDays: [],
    qualifyingModes: [],
    hasIndependentProduction: false,
    supportPassCount: 0,
    lessonId: payloadString(event.payload, 'lessonId'),
    sourceId: payloadString(event.payload, 'sourceId'),
    sourceKind: payloadString(event.payload, 'sourceKind'),
    contentFingerprint: payloadString(event.payload, 'contentFingerprint'),
    facet,
    canonicalTarget: payloadString(event.payload, 'canonicalTarget') ?? '',
    sourceMeaning: payloadString(event.payload, 'sourceMeaning'),
    // Старые записи журнала этого поля не имеют → null, и задание показывается
    // переводом, как раньше. Миграции не нужно.
    sourcePrompt: payloadString(event.payload, 'sourcePrompt'),
    tokens: payloadStrings(event.payload, 'tokens'),
    distractors: payloadStrings(event.payload, 'distractors'),
    audioRef: payloadString(event.payload, 'audioRef'),
    tokenIndex: Number.isSafeInteger(event.payload.tokenIndex)
      ? Number(event.payload.tokenIndex)
      : null,
    expected: payloadString(event.payload, 'expected'),
    // Старые записи журнала этого поля не имеют → null, и разбор просто
    // покажет правильный вариант без зачёркнутого. Миграции не нужно.
    given: payloadString(event.payload, 'given'),
  };
}

function freezeItem(item: MutableProjectionItem): MistakeProjectionItem {
  return Object.freeze({
    ...item,
    qualifyingDays: Object.freeze([...item.qualifyingDays]),
    qualifyingModes: Object.freeze([...item.qualifyingModes]),
    tokens: Object.freeze([...item.tokens]),
    distractors: Object.freeze([...item.distractors]),
  });
}

/**
 * Сколько РАЗНЫХ режимов нужно, чтобы ошибка ушла: 2, если для неё возможен второй независимый режим, иначе 1.
 * зачем (§130, 04.10): единственное место расчёта — правило, панель итога и карточка ошибки говорят одно и то же.
 */
export function requiredModesForMistake(item: MistakeCapabilitySource): 1 | 2 {
  return independentProductionModeCount({
    facet: item.facet,
    capabilities: mistakeExerciseCapabilitiesFor(item),
  }) >= 2 ? 2 : 1;
}

export function projectMistakes(
  inputEvents: readonly MistakeEvent[],
): MistakeProjection {
  const byEventId = new Map<string, MistakeEvent>();
  let duplicateEventCount = 0;
  for (const event of inputEvents) {
    if (byEventId.has(event.eventId)) {
      duplicateEventCount += 1;
      continue;
    }
    byEventId.set(event.eventId, event);
  }

  const events = [...byEventId.values()].sort(
    (left, right) =>
      left.occurredAtMs - right.occurredAtMs
      || left.eventId.localeCompare(right.eventId),
  );
  const items = new Map<string, MutableProjectionItem>();

  for (const event of events) {
    const current = items.get(event.mistakeId);
    if (event.type === 'captured') {
      if (!current || current.cycleId !== event.cycleId) {
        items.set(event.mistakeId, fromCapture(event));
      } else {
        current.captureCount += 1;
        current.lastEventAtMs = event.occurredAtMs;
        current.dueAtMs = Math.min(current.dueAtMs, event.occurredAtMs);
        if (current.status !== 'active') current.status = 'active';
      }
      continue;
    }
    if (!current || current.cycleId !== event.cycleId) continue;

    current.lastEventAtMs = event.occurredAtMs;
    if (event.type === 'hint_used') {
      current.hintCount += 1;
      continue;
    }
    if (event.type === 'hidden') {
      current.status = 'hidden';
      continue;
    }
    if (event.type === 'content_unavailable') {
      current.status = 'unavailable';
      continue;
    }
    if (event.type === 'restored') {
      current.status = 'active';
      current.dueAtMs = Math.min(current.dueAtMs, event.occurredAtMs);
      continue;
    }
    // зачем (владелец 04.10, «Повторить исправленные»): ответ в повторе исправленной ошибки помечен
    // payload.review. Верно — «исправлена» остаётся как есть. Неверно — ошибка возвращается в активные:
    // срок «сейчас», путь к исправлению заново (дни и режимы с нуля, иначе следующий же верный ответ
    // снова «исправил» бы её без закрепления). События без пометки читаются как раньше.
    if (
      event.type === 'practice_answered'
      && current.status === 'corrected'
      && event.payload.review === true
    ) {
      if (event.payload.correct !== true) {
        current.status = 'active';
        current.correctedAtMs = null;
        current.supportPassCount = 0;
        current.qualifyingDays = [];
        current.qualifyingModes = [];
        current.hasIndependentProduction = false;
        current.dueAtMs = event.occurredAtMs;
        if (Date.now() - event.occurredAtMs < 10 * 60 * 1000) {
          console.log('[MISTAKE-REVIEW] corrected mistake reactivated after a wrong review answer', JSON.stringify({ facet: current.facet }));
        }
      }
      continue;
    }
    if (event.type !== 'practice_answered' || current.status !== 'active') {
      continue;
    }

    const correct = event.payload.correct === true;
    const mode = payloadString(event.payload, 'mode');
    const definition = mode
      ? MISTAKE_EXERCISE_MODE_REGISTRY[mode as MistakeExerciseMode]
      : undefined;
    const independent = definition?.countsAsIndependentProduction === true;
    if (!correct) {
      current.supportPassCount = 0;
      if (independent) {
        current.qualifyingDays = [];
        current.qualifyingModes = [];
        current.hasIndependentProduction = false;
      }
      current.dueAtMs = event.occurredAtMs;
      continue;
    }

    const localDay = payloadString(event.payload, 'localDay');
    current.supportPassCount = Math.min(2, current.supportPassCount + 1);
    if (
      !independent
      || !localDay
      || !LOCAL_DAY_PATTERN.test(localDay)
      || !mode
    ) {
      current.dueAtMs = event.occurredAtMs;
      continue;
    }

    if (!current.qualifyingDays.includes(localDay)) {
      current.qualifyingDays.push(localDay);
      current.qualifyingModes.push(mode);
      current.hasIndependentProduction = true;
    }
    current.dueAtMs = event.occurredAtMs
      + DAY_MS * Math.min(7, current.qualifyingDays.length);

    // зачем (04.10, «17 не уменьшается»): второй режим требуется, только если он для этой ошибки возможен;
    // иначе ошибка с единственным независимым режимом (печать) не уходила из счётчика никогда.
    const requiredModes = requiredModesForMistake(current);
    if (
      current.qualifyingDays.length >= 3
      && new Set(current.qualifyingModes).size >= requiredModes
      && current.hasIndependentProduction
    ) {
      current.status = 'corrected';
      current.correctedAtMs = event.occurredAtMs;
      // Проекция пересобирается из всего журнала при каждой загрузке — логируем только живое (свежее) исправление.
      if (Date.now() - event.occurredAtMs < 10 * 60 * 1000) {
        console.log('[MISTAKE-CORRECTED]', JSON.stringify({
          facet: current.facet, requiredModes, modesSeen: new Set(current.qualifyingModes).size,
          days: current.qualifyingDays.length,
        }));
      }
    }
  }

  return Object.freeze({
    items: new Map(
      [...items.entries()].map(([mistakeId, item]) => [mistakeId, freezeItem(item)]),
    ),
    duplicateEventCount,
  });
}
