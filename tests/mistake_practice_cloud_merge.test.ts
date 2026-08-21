import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import {
  MISTAKE_EVENT_JOURNAL_CHUNK_MAX_SERIALIZED_CHARS,
  chunkMistakeEventJournal,
  mergeMistakeEventJournals,
  serializeMistakeEventJournalForCloud,
  type MistakeEventJournal,
} from '../app/mistake_practice_cloud_merge';

function event(eventId: string, occurredAtMs: number): MistakeEvent {
  return {
    eventId,
    mistakeId: `mistake:${eventId}`,
    cycleId: 'cycle-1',
    type: 'captured',
    occurredAtMs,
    studyTarget: 'en',
    payload: {},
  };
}

function journal(
  events: readonly MistakeEvent[],
  accountScope = 'account-a',
): MistakeEventJournal {
  return {
    version: 1,
    accountScope,
    studyTarget: 'en',
    events,
  };
}

describe('mistake practice cloud merge', () => {
  test('unions offline device journals by event id with deterministic ordering', () => {
    const duplicate = event('shared', 150);
    const merged = mergeMistakeEventJournals(
      journal([event('local', 200), duplicate]),
      journal([duplicate, event('remote', 100)]),
    );

    expect(merged.events.map((entry) => entry.eventId)).toEqual([
      'remote',
      'shared',
      'local',
    ]);
  });

  test('is replay-safe and independent from merge direction', () => {
    const local = journal([event('b', 200)]);
    const remote = journal([event('a', 100)]);
    const first = mergeMistakeEventJournals(local, remote);
    const reverse = mergeMistakeEventJournals(remote, local);
    const retry = mergeMistakeEventJournals(first, remote);

    expect(reverse).toEqual(first);
    expect(retry).toEqual(first);
  });

  test('rejects cross-account and cross-target merges', () => {
    expect(() =>
      mergeMistakeEventJournals(journal([]), journal([], 'account-b')),
    ).toThrow('mistake_practice_account_scope_mismatch');

    expect(() =>
      mergeMistakeEventJournals(journal([]), {
        ...journal([]),
        studyTarget: 'fr',
      }),
    ).toThrow('mistake_practice_study_target_mismatch');
  });

  test('fails closed before cloud upload when the physical owner does not match the envelope', () => {
    const raw = JSON.stringify(journal([event('private-a', 1)], 'account-a'));
    expect(() => serializeMistakeEventJournalForCloud(raw, 'account-b', 'en'))
      .toThrow('mistake_practice_account_scope_mismatch');
  });

  test('round-trips more than 2048 events without loss through bounded chunks', () => {
    const events = Array.from(
      { length: 2_088 },
      (_, index) => event(`event-${String(index).padStart(5, '0')}`, index + 1),
    );
    const left = mergeMistakeEventJournals(journal(events.slice(0, 2_000)), journal(events.slice(2_000)));
    const right = mergeMistakeEventJournals(journal(events.slice(2_000)), journal(events.slice(0, 2_000)));
    expect(left.events).toHaveLength(events.length);
    expect(right).toEqual(left);
    const chunks = chunkMistakeEventJournal(left);
    expect(chunks.flatMap((chunk) => chunk.events)).toEqual(left.events);
    expect(chunks.every((chunk) => JSON.stringify(chunk).length <= MISTAKE_EVENT_JOURNAL_CHUNK_MAX_SERIALIZED_CHARS)).toBe(true);
  });
});
