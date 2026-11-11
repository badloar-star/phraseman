import {
  canonicalJsonV1,
  sha256Utf8,
} from '../modules/canonical_json';
import type {
  MistakeContentRef,
  MistakeFacetRef,
  MistakeStudyTarget,
} from '../modules/mistake-practice/contracts';
import { MISTAKE_GIVEN_MAX_CHARS } from '../modules/mistake-practice/contracts';
import { buildMistakeIdentity } from '../modules/mistake-practice/identity';
import { projectMistakes } from '../modules/mistake-practice/projection';
import {
  appendMistakeEvent,
  loadMistakeEventJournal,
  type MistakePracticeStorage,
} from './mistake_practice_store';
import { getStableId } from './stable_id';

export type ObjectiveAttemptVerdict =
  | 'correct'
  | 'wrong'
  | 'technical'
  | 'cancelled'
  | 'uncertain';

export interface ObjectiveMistakeAttempt {
  readonly accountScope: string;
  readonly attemptId: string;
  readonly studyTarget: MistakeStudyTarget;
  readonly verdict: ObjectiveAttemptVerdict;
  readonly objective: boolean;
  readonly content: MistakeContentRef;
  readonly facet: MistakeFacetRef;
}

export type CaptureResult =
  | Readonly<{
      kind: 'captured';
      mistakeId: string;
      cycleId: string;
      eventId: string;
      appended: boolean;
    }>
  | Readonly<{
      kind: 'ignored';
      reason: 'correct' | 'subjective' | 'technical' | 'cancelled' | 'unsupported';
    }>;

export interface CaptureDependencies {
  readonly storage?: MistakePracticeStorage;
  readonly forceNewCycle?: boolean;
}

const stableId = (prefix: string, body: unknown): string =>
  `${prefix}:v1:${sha256Utf8(canonicalJsonV1(body))}`;

/**
 * зачем (02.10, аудит PM-193): 13 экранов зовут запись ошибки с `.catch(() => {})` — сбой записи
 * (хранилище, личность аккаунта) пропадал без следа, и «Мои ошибки» молча теряли попытку.
 * Причину пишем здесь, в одном месте для всех источников, и пробрасываем дальше без изменений
 * (поведение вызывающих прежнее). Только факты попытки, без текста фраз.
 */
function logCaptureFailure(
  attempt: Pick<ObjectiveMistakeAttempt, 'studyTarget' | 'content'>,
  error: unknown,
): void {
  console.warn('[MISTAKE-CAPTURE] failed', JSON.stringify({
    studyTarget: attempt.studyTarget,
    sourceKind: attempt.content?.sourceKind ?? null,
    reason: error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 200) : String(error).slice(0, 200),
  }));
}

/**
 * зачем (владелец 11.11.2026, «Да, почини»): ошибку «пропущенное слово» раздел принимает только с номером слова
 * (modules/mistake-practice/identity.ts), а итоговый экзамен, пробный тест и Пик номер не передавали — запись молча
 * отбрасывалась как неподдержанная, и «Мои ошибки» этих ответов не получали. Номер однозначно виден из самого вопроса:
 * это слово с пропуском «___». Достаём его здесь, в одном месте для всех источников. Вопроса с пропуском нет — ничего не
 * выдумываем: запись, как и раньше, не принимается, но теперь с причиной в журнале.
 */
export function withGapTokenIndex(attempt: ObjectiveMistakeAttempt): ObjectiveMistakeAttempt {
  if (attempt.facet.kind !== 'missing_token' || attempt.facet.tokenIndex !== undefined) return attempt;
  const gapLine = (attempt.content.sourcePrompt ?? '').split('\n').find((line) => line.includes('___')) ?? '';
  const tokenIndex = gapLine.trim().split(/\s+/).findIndex((word) => word.includes('___'));
  if (tokenIndex < 0) return attempt;
  const withIndex = { ...attempt, facet: { ...attempt.facet, tokenIndex } };
  // зачем: ответ из нескольких слов («turn on», «was written») занимает ОДИН пропуск. Раздел при повторе делит эталон на
  // слова и прячет слово с этим номером — без подсказки вышло бы «Please _____ on the light.» с ответом «turn on».
  // Поэтому отдаём разбивку, где ответ — одна плитка; только если она в точности складывается в эталонную фразу.
  const expected = (attempt.facet.expected ?? '').trim();
  if (attempt.content.tokens || !/\s/.test(expected)) return withIndex;
  const tokens = gapLine.trim().split(/\s+/).map((word, index) => (index === tokenIndex ? word.replace('___', expected) : word));
  if (tokens.join(' ') !== attempt.content.canonicalTarget.trim().replace(/\s+/g, ' ')) return withIndex;
  return { ...withIndex, content: { ...attempt.content, tokens } };
}

export async function captureObjectiveAttempt(
  attempt: ObjectiveMistakeAttempt,
  dependencies: CaptureDependencies = {},
): Promise<CaptureResult> {
  try {
    return await captureObjectiveAttemptUnlogged(attempt, dependencies);
  } catch (error) {
    logCaptureFailure(attempt, error);
    throw error;
  }
}

async function captureObjectiveAttemptUnlogged(
  rawAttempt: ObjectiveMistakeAttempt,
  dependencies: CaptureDependencies = {},
): Promise<CaptureResult> {
  const attempt = withGapTokenIndex(rawAttempt);
  if (!attempt.objective) {
    return Object.freeze({ kind: 'ignored', reason: 'subjective' });
  }
  if (attempt.verdict === 'correct') {
    return Object.freeze({ kind: 'ignored', reason: 'correct' });
  }
  if (attempt.verdict === 'cancelled') {
    return Object.freeze({ kind: 'ignored', reason: 'cancelled' });
  }
  if (attempt.verdict === 'technical' || attempt.verdict === 'uncertain') {
    return Object.freeze({ kind: 'ignored', reason: 'technical' });
  }

  const identity = buildMistakeIdentity({
    studyTarget: attempt.studyTarget,
    content: attempt.content,
    facet: attempt.facet,
  });
  if (identity.kind !== 'capturable') {
    // зачем: этот ранний выход был немым — так запись пропусков и терялась месяцами незамеченной. Только факты, без текста фраз.
    console.warn('[MISTAKE-CAPTURE] ignored', JSON.stringify({
      studyTarget: attempt.studyTarget,
      sourceKind: attempt.content?.sourceKind ?? null,
      facet: attempt.facet?.kind ?? null,
      reason: identity.reason,
    }));
    return Object.freeze({ kind: 'ignored', reason: 'unsupported' });
  }

  const currentJournal = await loadMistakeEventJournal({
    accountScope: attempt.accountScope,
    studyTarget: attempt.studyTarget,
    storage: dependencies.storage,
  });
  const current = projectMistakes(currentJournal.events).items.get(identity.mistakeId);
  const shouldCreateCycle = dependencies.forceNewCycle
    || !current
    || current.status === 'corrected'
    || current.status === 'hidden';
  const cycleId = shouldCreateCycle
    ? stableId('mistake-cycle', {
        attemptId: attempt.attemptId,
        mistakeId: identity.mistakeId,
      })
    : current.cycleId;
  const eventId = stableId('mistake-event', {
    attemptId: attempt.attemptId,
    cycleId,
    mistakeId: identity.mistakeId,
    type: 'captured',
  });
  if (currentJournal.events.some((event) => event.eventId === eventId)) {
    return Object.freeze({
      kind: 'captured',
      mistakeId: identity.mistakeId,
      cycleId,
      eventId,
      appended: false,
    });
  }
  const write = await appendMistakeEvent({
    accountScope: attempt.accountScope,
    studyTarget: attempt.studyTarget,
    storage: dependencies.storage,
    event: {
      eventId,
      mistakeId: identity.mistakeId,
      cycleId,
      type: 'captured',
      occurredAtMs: Date.now(),
      studyTarget: attempt.studyTarget,
      payload: {
        canonicalTarget: attempt.content.canonicalTarget,
        contentFingerprint: identity.contentFingerprint,
        facet: attempt.facet.kind,
        lessonId: attempt.content.lessonId ?? null,
        sourceId: attempt.content.sourceId,
        sourceKind: attempt.content.sourceKind,
        sourceMeaning: attempt.content.sourceMeaning ?? null,
        // зачем (2026-09-21): без текста задания повтор ошибки нерешаем —
        // на экране оставался один перевод. В отпечаток поле НЕ входит,
        // повторы одной ошибки по-прежнему склеиваются (см. identity.ts).
        sourcePrompt: attempt.content.sourcePrompt ?? null,
        audioRef: attempt.content.audioRef ?? null,
        tokens: attempt.content.tokens ?? null,
        distractors: attempt.content.distractors ?? null,
        tokenIndex: attempt.facet.tokenIndex ?? null,
        expected: attempt.facet.expected ?? null,
        // зачем (аудит 2026-09-21): без ответа ученика разбор после занятия
        // не может показать «ты написал X → надо Y» — а это его суть.
        // В отпечаток ошибки поле НЕ входит (см. identity.ts), поэтому повторы
        // одной ошибки с разными опечатками по-прежнему склеиваются в одну.
        // зачем (04.10, вариант А): ответ уходит в облако — не больше 200 знаков.
        given: typeof attempt.facet.given === 'string' ? attempt.facet.given.slice(0, MISTAKE_GIVEN_MAX_CHARS) : null,
      },
    },
  });

  return Object.freeze({
    kind: 'captured',
    mistakeId: identity.mistakeId,
    cycleId,
    eventId,
    appended: write.appended,
  });
}

export async function captureCurrentAccountObjectiveAttempt(
  attempt: Omit<ObjectiveMistakeAttempt, 'accountScope'>,
  dependencies: CaptureDependencies = {},
): Promise<CaptureResult> {
  let accountScope: Awaited<ReturnType<typeof getStableId>>;
  try {
    accountScope = await getStableId();
  } catch (error) {
    logCaptureFailure(attempt, error);
    throw error;
  }
  return captureObjectiveAttempt({ ...attempt, accountScope }, dependencies);
}
