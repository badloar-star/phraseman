import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';
import {
  FLASHCARDS_SWIPE_SESSION_DRAFT_TTL_MS,
  clearFlashcardsSwipeSessionDraft,
  loadFlashcardsSwipeSessionDraft,
  saveFlashcardsSwipeSessionDraft,
  type FlashcardsSwipeSessionDraft,
  type FlashcardsSwipeSessionScope,
  SWIPE_DISTANCE_MAX_PX,
  SWIPE_VELOCITY_THRESHOLD,
  deckIdForSwipeSource,
  deckIdsForSwipeSources,
  swipeSourceIdsForDeckIds,
  type SwipeSourceLike,
  swipeBadgeFullAtPx,
  swipeCommitDirection,
  swipeDistanceThresholdPx,
} from '../app/flashcards_swipe_session';
import { flashcardsSwipeSessionDraftKey } from '../app/target_storage_keys';

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };
const sourcePath = path.join(__dirname, '../app/flashcards_swipe_session.ts');

const LEGACY_RUNTIME_RE =
  /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

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
  it('keeps runtime parsing free of legacy locale fallback markers', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).not.toMatch(LEGACY_RUNTIME_RE);
  });

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

  it('keeps French swipe drafts out of the legacy English draft key', async () => {
    const draft = buildDraft({ sourceIds: ['official:western'] });

    await saveFlashcardsSwipeSessionDraft(draft, 'fr');

    await expect(loadFlashcardsSwipeSessionDraft(scope, draft.savedAt + 1000, 'en')).resolves.toBeNull();
    await expect(loadFlashcardsSwipeSessionDraft(scope, draft.savedAt + 1000, 'fr')).resolves.toEqual(draft);
    await expect(AsyncStorage.getItem(flashcardsSwipeSessionDraftKey('en'))).resolves.toBeNull();
    await expect(AsyncStorage.getItem(flashcardsSwipeSessionDraftKey('fr'))).resolves.toContain('official:western');
  });
});

/**
 * FIX владельца (2026-08-13): «я свайпаю, а карточки прыгают назад».
 * Причины были две — фиксированный порог 96px (обычный флик не доезжал) и
 * отсутствие срабатывания по скорости жеста. Тесты держат обе.
 */
describe('swipe gesture commit', () => {
  const W = 390; // iPhone 14/15

  it('порог по расстоянию заметно ниже прежних 96px и растёт от ширины', () => {
    expect(swipeDistanceThresholdPx(W)).toBeLessThan(96);
    expect(swipeDistanceThresholdPx(W)).toBeGreaterThan(0);
    expect(swipeDistanceThresholdPx(1024)).toBeLessThanOrEqual(SWIPE_DISTANCE_MAX_PX);
    expect(swipeDistanceThresholdPx(200)).toBeLessThanOrEqual(swipeDistanceThresholdPx(500));
    expect(swipeDistanceThresholdPx(NaN)).toBeGreaterThan(0);
  });

  it('длинный медленный свайп берётся по расстоянию', () => {
    const dx = swipeDistanceThresholdPx(W);
    expect(swipeCommitDirection({ dx, dy: 4, vx: 0.01 }, W)).toBe('right');
    expect(swipeCommitDirection({ dx: -dx, dy: 4, vx: -0.01 }, W)).toBe('left');
  });

  it('короткий быстрый флик берётся по скорости (раньше отскакивал назад)', () => {
    const flick = { dx: 40, dy: 6, vx: SWIPE_VELOCITY_THRESHOLD + 0.1 };
    expect(flick.dx).toBeLessThan(96); // прежний порог его не пропускал
    expect(swipeCommitDirection(flick, W)).toBe('right');
    expect(swipeCommitDirection({ dx: -40, dy: 6, vx: -(SWIPE_VELOCITY_THRESHOLD + 0.1) }, W)).toBe('left');
  });

  it('дрожь пальца и вертикальный жест не засчитываются', () => {
    expect(swipeCommitDirection({ dx: 6, dy: 2, vx: 0.02 }, W)).toBeNull();
    expect(swipeCommitDirection({ dx: 0, dy: 0, vx: 0 }, W)).toBeNull();
    // быстрый, но по сути вертикальный жест
    expect(swipeCommitDirection({ dx: 25, dy: 120, vx: 1.2 }, W)).toBeNull();
    // мусор из нативного слоя
    expect(swipeCommitDirection({ dx: NaN, dy: NaN, vx: NaN }, W)).toBeNull();
  });

  it('подпись набирает полную непрозрачность в пределах ~10–15% ширины', () => {
    const full = swipeBadgeFullAtPx(W);
    expect(full).toBeGreaterThanOrEqual(Math.round(W * 0.09));
    expect(full).toBeLessThanOrEqual(Math.round(W * 0.16));
    // и заметно раньше, чем свайп будет засчитан
    expect(full).toBeLessThanOrEqual(swipeDistanceThresholdPx(W));
  });
});

/**
 * FIX владельца (2026-08-13): «Тренировка» в таббаре раздела карточек ведёт в
 * ЭТОТ свайп-режим, а не в тренажёр «Моя практика». Таббар и DeckPickerSheet
 * говорят наборами (`saved` / `custom` / `pack:<id>`), экран свайпа — своими
 * источниками; перевод между ними обязан быть в обе стороны без потерь, иначе
 * выбранные наборы «не отмечаются» и не запоминаются.
 */
describe('наборы ?deck= ↔ источники экрана свайпа (§6)', () => {
  const sources: SwipeSourceLike[] = [
    { id: 'saved:all', kind: 'saved' },
    { id: 'custom:all', kind: 'custom' },
    { id: 'official:western', kind: 'official' },
    { id: 'community:abc123', kind: 'community' },
  ];

  it('каждый источник знает свой набор', () => {
    expect(sources.map(deckIdForSwipeSource)).toEqual([
      'saved',
      'custom',
      'pack:western',
      'pack:abc123',
    ]);
  });

  it('источник без опознаваемого набора не ломает сопоставление', () => {
    expect(deckIdForSwipeSource({ id: 'official', kind: 'official' })).toBeNull();
    expect(deckIdForSwipeSource(null)).toBeNull();
    expect(deckIdForSwipeSource({ id: 'community:  ', kind: 'community' })).toBeNull();
  });

  it('мультивыбор из шита отмечает ровно свои источники', () => {
    expect(swipeSourceIdsForDeckIds(sources, ['custom', 'pack:western'])).toEqual([
      'custom:all',
      'official:western',
    ]);
    /** Набор, которого на устройстве нет, просто пропускается. */
    expect(swipeSourceIdsForDeckIds(sources, ['pack:missing'])).toEqual([]);
    /** Пустой выбор — не «ничего», а «нет предвыбора»: экран решает сам. */
    expect(swipeSourceIdsForDeckIds(sources, [])).toEqual([]);
    expect(swipeSourceIdsForDeckIds(null, ['saved'])).toEqual([]);
  });

  it('обратный перевод даёт то, что запомнится в fc_mode_prefs_v1', () => {
    expect(deckIdsForSwipeSources(sources)).toEqual([
      'saved',
      'custom',
      'pack:western',
      'pack:abc123',
    ]);
    expect(deckIdsForSwipeSources([])).toEqual([]);
  });

  it('перевод туда-обратно устойчив (что выбрали — то и отметится)', () => {
    const picked = ['saved:all', 'community:abc123'];
    const decks = deckIdsForSwipeSources(sources.filter((s) => picked.includes(s.id)));
    expect(swipeSourceIdsForDeckIds(sources, decks)).toEqual(picked);
  });
});
