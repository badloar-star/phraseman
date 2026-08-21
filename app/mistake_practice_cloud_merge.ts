import { canonicalJsonV1 } from '../modules/learning-v2/policies/decision_registry';
import type {
  MistakeEvent,
  MistakeStudyTarget,
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
    && (value.studyTarget === 'en' || value.studyTarget === 'fr');
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
    || (parsed.studyTarget !== 'en' && parsed.studyTarget !== 'fr')
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

export function chunkMistakeEventJournal(
  journal: MistakeEventJournal,
): readonly MistakeEventJournal[] {
  const chunks: MistakeEventJournal[] = [];
  let events: MistakeEvent[] = [];
  const flush = () => {
    if (events.length === 0) return;
    chunks.push(Object.freeze({
      version: 1,
      accountScope: journal.accountScope,
      studyTarget: journal.studyTarget,
      events: Object.freeze([...events]),
    }));
    events = [];
  };
  for (const event of [...journal.events].sort(eventSort)) {
    const candidate = Object.freeze({
      version: 1 as const,
      accountScope: journal.accountScope,
      studyTarget: journal.studyTarget,
      events: Object.freeze([...events, event]),
    });
    if (
      events.length >= MISTAKE_EVENT_JOURNAL_CHUNK_MAX_EVENTS
      || canonicalJsonV1(candidate).length > MISTAKE_EVENT_JOURNAL_CHUNK_MAX_SERIALIZED_CHARS
    ) {
      flush();
    }
    const single = Object.freeze({
      version: 1 as const,
      accountScope: journal.accountScope,
      studyTarget: journal.studyTarget,
      events: Object.freeze([event]),
    });
    if (canonicalJsonV1(single).length > MISTAKE_EVENT_JOURNAL_CHUNK_MAX_SERIALIZED_CHARS) {
      throw new Error('mistake_practice_event_too_large');
    }
    events.push(event);
  }
  flush();
  return Object.freeze(chunks);
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
