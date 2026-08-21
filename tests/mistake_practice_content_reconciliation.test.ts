import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import { buildMistakeIdentity } from '../modules/mistake-practice/identity';
import { projectMistakes } from '../modules/mistake-practice/projection';
import {
  reconcileMutableMistakeContent,
} from '../app/mistake_practice_content_reconciliation';
import type { MistakePracticeStorage } from '../app/mistake_practice_store';

function storage(): MistakePracticeStorage {
  const data = new Map<string, string>();
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
    getAllKeys: async () => [...data.keys()],
  };
}

function capture(overrides: Partial<MistakeEvent['payload']> = {}): MistakeEvent {
  const identity = buildMistakeIdentity({
    studyTarget: 'en',
    content: {
      sourceKind: 'flashcard', sourceId: 'custom_1',
      canonicalTarget: 'hello', sourceMeaning: 'привет',
    },
    facet: { kind: 'meaning', expected: 'hello' },
  });
  if (identity.kind !== 'capturable') throw new Error('fixture_invalid');
  return {
    eventId: 'capture-1', mistakeId: identity.mistakeId, cycleId: 'cycle-1',
    type: 'captured', occurredAtMs: 1, studyTarget: 'en',
    payload: {
      canonicalTarget: 'hello', contentFingerprint: identity.contentFingerprint,
      facet: 'meaning', sourceId: 'custom_1', sourceKind: 'flashcard',
      sourceMeaning: 'привет', expected: 'hello', ...overrides,
    },
  };
}

describe('mutable mistake content reconciliation', () => {
  test.each([
    ['deleted', []],
    ['changed', [{ id: 'custom_1', en: 'goodbye', ru: 'пока', uk: 'бувай' }]],
  ])('marks a %s custom card unavailable before practice', async (_kind, cards) => {
    const result = await reconcileMutableMistakeContent({
      accountScope: 'owner-a', studyTarget: 'en', storage: storage(),
      journal: { version: 1, accountScope: 'owner-a', studyTarget: 'en', events: [capture()] },
    }, { loadCustomCards: async () => cards, nowMs: () => 100 });

    expect(result.unavailableCount).toBe(1);
    expect(projectMistakes(result.journal.events).items.values().next().value?.status).toBe('unavailable');
  });

  test('keeps unchanged content active and does not duplicate an unavailable marker', async () => {
    const persistence = storage();
    const input = {
      accountScope: 'owner-a' as const,
      studyTarget: 'en' as const,
      storage: persistence,
      journal: { version: 1 as const, accountScope: 'owner-a', studyTarget: 'en' as const, events: [capture()] },
    };
    const unchanged = await reconcileMutableMistakeContent(input, {
      loadCustomCards: async () => [{ id: 'custom_1', en: 'hello', ru: 'привет', uk: 'привіт' }],
      nowMs: () => 100,
    });
    expect(unchanged.unavailableCount).toBe(0);
    expect(projectMistakes(unchanged.journal.events).items.values().next().value?.status).toBe('active');

    const deleted = await reconcileMutableMistakeContent({ ...input, journal: unchanged.journal }, {
      loadCustomCards: async () => [], nowMs: () => 100,
    });
    const replay = await reconcileMutableMistakeContent({ ...input, journal: deleted.journal }, {
      loadCustomCards: async () => [], nowMs: () => 200,
    });
    expect(deleted.unavailableCount).toBe(1);
    expect(replay.unavailableCount).toBe(0);
    expect(replay.journal.events.filter((event) => event.type === 'content_unavailable')).toHaveLength(1);
  });
});
