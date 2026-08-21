import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import {
  appendMistakeEvent,
  loadMistakeEventJournal,
  mergeMistakeEvents,
  type MistakePracticeStorage,
} from '../app/mistake_practice_store';
import {
  mistakePracticeEventChunkKey,
  mistakePracticeEventsKey,
  mistakePracticeManifestPageKey,
} from '../app/target_storage_keys';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

function createStorage(): MistakePracticeStorage & {
  data: Map<string, string>;
  getAllKeys(): Promise<readonly string[]>;
} {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
    getAllKeys: async () => [...data.keys()],
  };
}

function event(eventId: string, occurredAtMs: number): MistakeEvent {
  return {
    eventId,
    mistakeId: 'mistake:v1:one',
    cycleId: 'cycle-1',
    type: 'captured',
    occurredAtMs,
    studyTarget: 'en',
    payload: { canonicalTarget: 'I am ready.' },
  };
}

describe('mistake practice event store', () => {
  afterEach(() => __resetAccountGenerationForTests());
  test('appends events idempotently by event id', async () => {
    const storage = createStorage();
    const first = await appendMistakeEvent({
      accountScope: 'account-a',
      studyTarget: 'en',
      event: event('capture-1', 100),
      storage,
    });
    const replay = await appendMistakeEvent({
      accountScope: 'account-a',
      studyTarget: 'en',
      event: event('capture-1', 100),
      storage,
    });

    expect(first.appended).toBe(true);
    expect(replay.appended).toBe(false);
    expect(replay.journal.events).toHaveLength(1);
  });

  test('serializes concurrent appends without losing either event', async () => {
    const storage = createStorage();
    await Promise.all([
      appendMistakeEvent({
        accountScope: 'account-a',
        studyTarget: 'en',
        event: event('capture-2', 200),
        storage,
      }),
      appendMistakeEvent({
        accountScope: 'account-a',
        studyTarget: 'en',
        event: event('capture-1', 100),
        storage,
      }),
    ]);

    const journal = await loadMistakeEventJournal({
      accountScope: 'account-a',
      studyTarget: 'en',
      storage,
    });
    expect(journal.events.map((entry) => entry.eventId)).toEqual([
      'capture-1',
      'capture-2',
    ]);
  });

  test('merges a large cloud restore in one bounded graph commit', async () => {
    const storage = createStorage();
    let writes = 0;
    const originalSetItem = storage.setItem;
    storage.setItem = async (key, value) => {
      writes += 1;
      await originalSetItem(key, value);
    };
    const events = Array.from({ length: 2_000 }, (_, index) =>
      event(`cloud-${String(index).padStart(4, '0')}`, index),
    );

    const first = await mergeMistakeEvents({
      accountScope: 'account-a', studyTarget: 'en', events, storage,
    });
    expect(first.appendedCount).toBe(2_000);
    expect(writes).toBeLessThanOrEqual(23);

    writes = 0;
    const replay = await mergeMistakeEvents({
      accountScope: 'account-a', studyTarget: 'en', events, storage,
    });
    expect(replay.appendedCount).toBe(0);
    expect(writes).toBe(0);
    expect(replay.journal.events).toHaveLength(2_000);
  });

  test('does not expose another account scope stored under the same target key', async () => {
    const storage = createStorage();
    await appendMistakeEvent({
      accountScope: 'account-a',
      studyTarget: 'en',
      event: event('private-a', 100),
      storage,
    });

    const journalB = await loadMistakeEventJournal({
      accountScope: 'account-b',
      studyTarget: 'en',
      storage,
    });
    expect(journalB).toEqual({
      version: 1,
      accountScope: 'account-b',
      studyTarget: 'en',
      events: [],
    });
  });

  test('uses distinct always-targeted keys and rejects corrupt journals', async () => {
    expect(mistakePracticeEventsKey('account-a', 'en')).not.toBe(
      mistakePracticeEventsKey('account-a', 'fr'),
    );
    expect(mistakePracticeEventsKey('account-a', 'en')).not.toBe(
      mistakePracticeEventsKey('account-b', 'en'),
    );
    expect(mistakePracticeEventsKey('account-a', 'en')).toContain('mistake_practice_v2::en');

    const storage = createStorage();
    storage.data.set(mistakePracticeEventsKey('account-a', 'en'), '{broken');
    await expect(
      loadMistakeEventJournal({
        accountScope: 'account-a',
        studyTarget: 'en',
        storage,
      }),
    ).rejects.toThrow('mistake_practice_events_corrupt');
  });

  test('fences a deferred account A append when account B becomes current', async () => {
    beginAccountGeneration('account-a');
    let releaseRead!: () => void;
    const readBlocked = new Promise<void>((resolve) => { releaseRead = resolve; });
    const storage = createStorage();
    storage.getItem = async (key) => {
      await readBlocked;
      return storage.data.get(key) ?? null;
    };

    const deferred = appendMistakeEvent({
      accountScope: 'account-a',
      studyTarget: 'en',
      event: event('late-account-a', 300),
      storage,
    });
    await Promise.resolve();
    beginAccountGeneration('account-b');
    releaseRead();

    await expect(deferred).rejects.toThrow('stale_account_generation');
    expect(storage.data.has(mistakePracticeEventsKey('account-a', 'en'))).toBe(false);
    expect(storage.data.has(mistakePracticeEventsKey('account-b', 'en'))).toBe(false);
  });

  test('sweeps unreachable prior roots and crash orphans without deleting current graph', async () => {
    const storage = createStorage();
    await appendMistakeEvent({
      accountScope: 'account-a', studyTarget: 'en', event: event('one', 1), storage,
    });
    const firstGraphKeys = new Set(storage.data.keys());
    const orphanChunk = mistakePracticeEventChunkKey('account-a', 'en', 'a'.repeat(64));
    const orphanPage = mistakePracticeManifestPageKey('account-a', 'en', 'b'.repeat(64));
    storage.data.set(orphanChunk, 'crash-orphan');
    storage.data.set(orphanPage, 'crash-orphan');

    await appendMistakeEvent({
      accountScope: 'account-a', studyTarget: 'en', event: event('two', 2), storage,
    });
    expect(storage.data.has(orphanChunk)).toBe(false);
    expect(storage.data.has(orphanPage)).toBe(false);
    for (const oldKey of firstGraphKeys) {
      if (oldKey === mistakePracticeEventsKey('account-a', 'en')) continue;
      expect(storage.data.has(oldKey)).toBe(false);
    }
    await expect(loadMistakeEventJournal({
      accountScope: 'account-a', studyTarget: 'en', storage,
    })).resolves.toMatchObject({ events: [event('one', 1), event('two', 2)] });
  });
});
