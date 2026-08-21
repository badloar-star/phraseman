import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  buildMistakePracticeInsights,
  getMistakePracticeAchievementSnapshot,
  getMistakePracticeReadyCount,
  loadMistakePracticeInsights,
} from '../app/mistake_practice_insights';
import { mistakePracticeLengthOptions } from '../modules/mistake-practice/session';
import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import type { MistakeEventJournal } from '../app/mistake_practice_cloud_merge';

const mockGetStableId = jest.fn<Promise<string>, []>();
const mockLoadJournal = jest.fn<Promise<MistakeEventJournal>, [unknown]>();
const mockReconcile = jest.fn(async (input: { journal: MistakeEventJournal }) => ({
  unavailableCount: 0,
  journal: input.journal,
}));

jest.mock('../app/stable_id', () => ({
  getStableId: () => mockGetStableId(),
}));
jest.mock('../app/mistake_practice_store', () => ({
  loadMistakeEventJournal: (input: unknown) => mockLoadJournal(input),
}));
jest.mock('../app/mistake_practice_content_reconciliation', () => ({
  reconcileMutableMistakeContent: (input: { journal: MistakeEventJournal }) => mockReconcile(input),
}));

const now = Date.UTC(2026, 7, 20, 12);
const captured = (input: Partial<MistakeEvent> & { eventId: string; mistakeId: string; occurredAtMs: number; target: string; facet?: string }): MistakeEvent => ({
  eventId: input.eventId,
  mistakeId: input.mistakeId,
  cycleId: input.cycleId ?? `mistake-cycle:v1:${input.mistakeId.padEnd(64, 'a').slice(0, 64)}`,
  type: input.type ?? 'captured',
  occurredAtMs: input.occurredAtMs,
  studyTarget: 'en',
  payload: input.payload ?? {
    canonicalTarget: input.target,
    facet: input.facet ?? 'form',
    lessonId: 'lesson-1',
  },
});

describe('mistake practice insights', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    mockGetStableId.mockReset().mockResolvedValue('account-a');
    mockLoadJournal.mockReset();
    mockReconcile.mockReset().mockImplementation(async (input) => ({
      unavailableCount: 0,
      journal: input.journal,
    }));
  });

  test('projects weekly counts, due words/phrases and frequent facets from the journal', () => {
    const events: MistakeEvent[] = [
      captured({ eventId: 'e1', mistakeId: 'm1', occurredAtMs: now - 2 * 86_400_000, target: 'went', facet: 'form' }),
      captured({ eventId: 'e2', mistakeId: 'm2', occurredAtMs: now - 5 * 86_400_000, target: 'I have been there', facet: 'word_order' }),
      captured({ eventId: 'e3', mistakeId: 'm1', occurredAtMs: now - 10 * 86_400_000, target: 'went', facet: 'form' }),
    ];

    expect(buildMistakePracticeInsights(events, now)).toMatchObject({
      active: 2,
      corrected: 0,
      correctedPhrases: 0,
      dueWords: 1,
      duePhrases: 1,
      mistakeCount7d: 2,
      mistakeCount30d: 3,
      uniqueMistakes30d: 2,
      frequentFacets: [
        { facet: 'form', count: 2 },
        { facet: 'word_order', count: 1 },
      ],
    });
  });

  test.each([
    ['ready count', () => getMistakePracticeReadyCount('en', { nowMs: now })],
    ['insights', () => loadMistakePracticeInsights('en', now)],
    ['achievement snapshot', () => getMistakePracticeAchievementSnapshot('en')],
  ])('rejects a deferred account A %s read after switching to account B', async (_label, read) => {
    beginAccountGeneration('account-a');
    let resolveJournal!: (journal: MistakeEventJournal) => void;
    const deferredJournal = new Promise<MistakeEventJournal>((resolve) => {
      resolveJournal = resolve;
    });
    mockLoadJournal.mockReturnValueOnce(deferredJournal);
    const pending = read();

    await Promise.resolve();
    beginAccountGeneration('account-b');
    resolveJournal({
      version: 1,
      accountScope: 'account-a',
      studyTarget: 'en',
      events: [captured({
        eventId: 'account-a-private-event',
        mistakeId: 'account-a-private-mistake',
        occurredAtMs: now,
        target: 'account A private phrase',
      })],
    });

    await expect(pending).rejects.toThrow('stale_account_generation');
  });

  test('reconciles a deleted custom card before exposing the Cards ready count', async () => {
    beginAccountGeneration('account-a');
    const events = Array.from({ length: 5 }, (_, index) => captured({
      eventId: `event-${index}`,
      mistakeId: `mistake-${index}`,
      occurredAtMs: now,
      target: `target-${index}`,
      payload: index === 4 ? {
        canonicalTarget: 'deleted custom card',
        contentFingerprint: 'fingerprint-custom-4',
        facet: 'meaning',
        sourceId: 'custom_4',
        sourceKind: 'flashcard',
      } : undefined,
    }));
    const journal: MistakeEventJournal = {
      version: 1, accountScope: 'account-a', studyTarget: 'en', events,
    };

    mockLoadJournal.mockResolvedValueOnce(journal);
    mockReconcile.mockResolvedValueOnce({
      unavailableCount: 1,
      journal: {
        ...journal,
        events: [...events, {
          eventId: 'unavailable-custom-4',
          mistakeId: 'mistake-4',
          cycleId: events[4].cycleId,
          type: 'content_unavailable',
          occurredAtMs: now + 1,
          studyTarget: 'en',
          payload: { reason: 'deleted', sourceId: 'custom_4', sourceKind: 'flashcard' },
        }],
      },
    });

    const count = await getMistakePracticeReadyCount('en', { nowMs: now });

    expect(count).toBe(4);
    expect(mistakePracticeLengthOptions(count).every((option) => !option.enabled)).toBe(true);
  });
});
