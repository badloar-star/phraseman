import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FLASHCARDS_SWIPE_SESSION_DRAFT_TTL_MS,
  clearFlashcardsSwipeSessionDraft,
  loadFlashcardsSwipeSessionDraft,
  saveFlashcardsSwipeSessionDraft,
  type FlashcardsSwipeSessionDraft,
  type FlashcardsSwipeSessionScope,
} from '../app/flashcards_swipe_session';

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

const scope: FlashcardsSwipeSessionScope = {
  sourceIds: ['official:western'],
  routeSource: 'official:western',
  routeFilter: 'lesson:DEV:western',
  contentLang: 'ru',
};

function buildDraft(overrides: Partial<FlashcardsSwipeSessionDraft> = {}): FlashcardsSwipeSessionDraft {
  return {
    version: 1,
    savedAt: 1_700_000_000_000,
    sourceIds: ['official:western'],
    routeSource: 'official:western',
    routeFilter: 'lesson:DEV:western',
    contentLang: 'ru',
    trainingKeys: ['official:western:card-1', 'official:western:card-2'],
    queue: [
      {
        id: 'prompt-1',
        cardKey: 'official:western:card-1',
        shownTranslation: 'Dust',
        trueTranslation: 'Dust',
        isMatch: true,
      },
    ],
    feedback: null,
    stats: {
      total: 2,
      answered: 1,
      mastered: 1,
      correctSwipes: 1,
      wrong: 0,
      hints: 0,
      streak: 1,
      bestStreak: 1,
      score: 10,
    },
    progress: {
      'official:western:card-1': {
        wrong: 0,
        hints: 0,
        attempts: 1,
        recoveryCorrect: 0,
        scoreAwarded: 10,
      },
    },
    ...overrides,
  };
}

beforeEach(async () => {
  storage.__reset?.();
  jest.clearAllMocks();
  await clearFlashcardsSwipeSessionDraft();
});

describe('flashcards swipe session draft', () => {
  it('restores an unfinished session draft for the same training scope', async () => {
    const draft = buildDraft({ sourceIds: ['official:western'] });

    await saveFlashcardsSwipeSessionDraft(draft);
    const restored = await loadFlashcardsSwipeSessionDraft(scope, draft.savedAt + 1000);

    expect(restored).toEqual(draft);
  });

  it('does not restore drafts from a different selected source', async () => {
    const draft = buildDraft();

    await saveFlashcardsSwipeSessionDraft(draft);
    const restored = await loadFlashcardsSwipeSessionDraft(
      { ...scope, sourceIds: ['official:western', 'saved:all'] },
      draft.savedAt + 1000,
    );

    expect(restored).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });

  it('expires old drafts instead of restoring stale progress', async () => {
    const draft = buildDraft();

    await saveFlashcardsSwipeSessionDraft(draft);
    const restored = await loadFlashcardsSwipeSessionDraft(
      scope,
      draft.savedAt + FLASHCARDS_SWIPE_SESSION_DRAFT_TTL_MS + 1,
    );

    expect(restored).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });
});
