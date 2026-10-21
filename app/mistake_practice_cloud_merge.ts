import { canonicalJsonV1 } from '../modules/learning-v2/policies/decision_registry';
import {
  isMistakeStudyTargetValue,
  type MistakeEvent,
  type MistakeStudyTarget,
} from '../modules/mistake-practice/contracts';

export interface MistakeEventJournal {
  readonly version: 1;
  readonly accountScope: string;
  readonly studyTarget: MistakeStudyTarget;
  readonly events: readonly MistakeEvent[];
}

export const MISTAKE_EVENT_JOURNAL_CHUNK_MAX_EVENTS = 100;
export const MISTAKE_EVENT_JOURNAL_CHUNK_MAX_SERIALIZED_CHARS = 60_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isMistakeEvent(value: unknown): value is MistakeEvent {
  if (!isRecord(value) || !isRecord(value.payload)) return false;
  return typeof value.eventId === 'string'
    && value.eventId.length > 0
    && typeof value.mistakeId === 'string'
    && value.mistakeId.length > 0
    && typeof value.cycleId === 'string'
    && value.cycleId.length > 0
    && typeof value.type === 'string'
    && [
      'captured',
      'hint_used',
      'practice_answered',
      'hidden',
      'restored',
      'content_unavailable',
      'correction_rewarded',
    ].includes(value.type)
    && Number.isSafeInteger(value.occurredAtMs)
    // зачем (22.09): здесь перечислялись только en/fr, поэтому событие ошибки
    // на испанском или немецком считалось невалидным и отбрасывалось.
    && isMistakeStudyTargetValue(value.studyTarget);
}

export function parseMistakeEventJournal(raw: string): MistakeEventJournal {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('mistake_practice_events_corrupt');
  }
  if (
    !isRecord(parsed)
    || parsed.version !== 1
    || typeof parsed.accountScope !== 'string'
    || !parsed.accountScope.trim()
    // зачем (22.09): непризнанный язык ронял ВЕСЬ журнал как «испорченный»
    // (mistake_practice_events_corrupt), а не одну запись. Для испанского и
    // немецкого это означало, что «Мои ошибки» не работали в принципе.
    || !isMistakeStudyTargetValue(parsed.studyTarget)
    || !Array.isArray(parsed.events)
    || !parsed.events.every(isMistakeEvent)
  ) {
    throw new Error('mistake_practice_events_corrupt');
  }
  return Object.freeze({
    version: 1,
    accountScope: parsed.accountScope,
    studyTarget: parsed.studyTarget,
    events: Object.freeze([...parsed.events]),
  });
}

const eventSort = (left: MistakeEvent, right: MistakeEvent): number =>
  left.occurredAtMs - right.occurredAtMs
  || left.eventId.localeCompare(right.eventId);

/** Один кусок журнала вместе с его каноническим текстом: id куска = SHA-256 `encoded`, повторно не сериализуем. */
export type PlannedMistakeJournalChunk = Readonly<{
  chunk: MistakeEventJournal;
  /** Ровно `canonicalJsonV1(chunk)`. */
  encoded: string;
  /** Канонический текст каждого события куска (для дописывания в хвост без пересериализации). */
  encodedEvents: readonly string[];
}>;

const isSortedByEvent = (events: readonly MistakeEvent[]): boolean => {
  for (let index = 1; index < events.length; index += 1) {
    if (eventSort(events[index - 1], events[index]) > 0) return false;
  }
  return true;
};

/**
 * Разбиение журнала на куски за ОДИН проход.
 *
 * зачем (замер Сверки 21.10, слабый Android, «работа над ошибками тормозит»): прежний алгоритм для КАЖДОГО события заново
 * сериализовал весь растущий кусок целиком (до 100 событий → ~5 000 сериализаций на кусок, квадратично), и так на каждый ответ.
 * Теперь длина кандидата считается из длин канонических текстов событий: у канонического JSON ключи отсортированы, запятых
 * между событиями на одну меньше числа событий, а пустой журнал даёт длину каркаса. Границы кусков и их тексты побайтово те
 * же, что у прежнего алгоритма (иначе поменялись бы id кусков, а они адресуются хешем), — это проверяет tests/mistake_journal_chunk_linear.test.ts
 * против копии прежнего алгоритма на случайных журналах.
 */
export function planMistakeEventJournalChunks(
  journal: MistakeEventJournal,
): readonly PlannedMistakeJournalChunk[] {
  const skeleton = canonicalJsonV1({
    version: 1 as const,
    accountScope: journal.accountScope,
    studyTarget: journal.studyTarget,
    events: [],
  });
  const marker = '"events":[]';
  const at = skeleton.indexOf(marker);
  if (at < 0) throw new Error('mistake_practice_chunk_skeleton_invalid');
  const head = skeleton.slice(0, at + marker.length - 1); // до открывающей «[» включительно
  const tail = skeleton.slice(at + marker.length - 1); // от закрывающей «]»
  const skeletonLength = skeleton.length;

  const planned: PlannedMistakeJournalChunk[] = [];
  let events: MistakeEvent[] = [];
  let encodedEvents: string[] = [];
  let sum = 0;
  const flush = () => {
    if (events.length === 0) return;
    planned.push(Object.freeze({
      chunk: Object.freeze({
        version: 1 as const,
        accountScope: journal.accountScope,
        studyTarget: journal.studyTarget,
        events: Object.freeze([...events]),
      }),
      encoded: `${head}${encodedEvents.join(',')}${tail}`,
      encodedEvents: Object.freeze([...encodedEvents]),
    }));
    events = [];
    encodedEvents = [];
    sum = 0;
  };
  const ordered = isSortedByEvent(journal.events) ? journal.events : [...journal.events].sort(eventSort);
  for (const event of ordered) {
    const encodedEvent = canonicalJsonV1(event);
    // длина кандидата из events+[event]: каркас + тексты событий + запятые (их events.length: событий станет events.length+1)
    const candidateLength = skeletonLength + sum + encodedEvent.length + events.length;
    if (
      events.length >= MISTAKE_EVENT_JOURNAL_CHUNK_MAX_EVENTS
      || candidateLength > MISTAKE_EVENT_JOURNAL_CHUNK_MAX_SERIALIZED_CHARS
    ) {
      flush();
    }
    if (skeletonLength + encodedEvent.length > MISTAKE_EVENT_JOURNAL_CHUNK_MAX_SERIALIZED_CHARS) {
      throw new Error('mistake_practice_event_too_large');
    }
    events.push(event);
    encodedEvents.push(encodedEvent);
    sum += encodedEvent.length;
  }
  flush();
  return Object.freeze(planned);
}

export function chunkMistakeEventJournal(
  journal: MistakeEventJournal,
): readonly MistakeEventJournal[] {
  return Object.freeze(planMistakeEventJournalChunks(journal).map((planned) => planned.chunk));
}

export function mergeMistakeEventJournals(
  local: MistakeEventJournal,
  remote: MistakeEventJournal,
): MistakeEventJournal {
  if (local.accountScope !== remote.accountScope) {
    throw new Error('mistake_practice_account_scope_mismatch');
  }
  if (local.studyTarget !== remote.studyTarget) {
    throw new Error('mistake_practice_study_target_mismatch');
  }

  const events = new Map<string, MistakeEvent>();
  for (const event of [...local.events, ...remote.events]) {
    const existing = events.get(event.eventId);
    if (
      existing
      && canonicalJsonV1(existing) !== canonicalJsonV1(event)
    ) {
      throw new Error('mistake_practice_event_id_conflict');
    }
    events.set(event.eventId, event);
  }

  return Object.freeze({
    version: 1,
    accountScope: local.accountScope,
    studyTarget: local.studyTarget,
    events: Object.freeze([...events.values()].sort(eventSort)),
  });
}

export function serializeMistakeEventJournalForCloud(
  raw: string,
  expectedAccountScope: string,
  expectedStudyTarget: MistakeStudyTarget,
): string {
  const journal = parseMistakeEventJournal(raw);
  if (journal.accountScope !== expectedAccountScope) {
    throw new Error('mistake_practice_account_scope_mismatch');
  }
  if (journal.studyTarget !== expectedStudyTarget) {
    throw new Error('mistake_practice_study_target_mismatch');
  }
  chunkMistakeEventJournal(journal);
  return canonicalJsonV1(journal);
}

export function mergeMistakeEventJournalRaw(
  localRaw: string | null | undefined,
  cloudRaw: string,
): string {
  const remote = parseMistakeEventJournal(cloudRaw);
  if (!localRaw) return canonicalJsonV1(remote);
  const local = parseMistakeEventJournal(localRaw);
  return canonicalJsonV1(mergeMistakeEventJournals(local, remote));
}
