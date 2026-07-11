import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const LEDGER = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'docs', 'reports', 'borderless_surface_inventory.json'), 'utf8'),
) as {
  entries: Array<{
    id: string;
    category: string;
    status: string;
    scanState: string;
    reason: string;
  }>;
};

const FLASHCARDS_FIRST_WAVE_TARGET_IDS = [
  'surface:app-flashcards:flashcardshubscreen:1',
  'surface:app-flashcards-audio:flashcardsaudioscreen:2',
  'surface:app-flashcards-audio:flashcardsaudioscreen:3',
  'surface:app-flashcards-flashcardscategoryhub:flashcardscategoryhub:1',
  'surface:app-flashcards-flashcardscategoryhub:flashcardscategoryhub:2',
] as const;

const FLASHCARDS_SWIPE_TARGET_IDS = [
  'surface:app-flashcards-swipe:answerbutton:1',
  'surface:app-flashcards-swipe:checkcircle:1',
  'surface:app-flashcards-swipe:feedbackbox:1',
  'surface:app-flashcards-swipe:headerstreakpill:1',
  'surface:app-flashcards-swipe:segment:1',
  'surface:app-flashcards-swipe:segmentbutton:1',
  'surface:app-flashcards-swipe:swipebadge:1',
] as const;

const FLASHCARD_LIST_ITEM_TARGET_IDS = [
  'surface:app-flashcards-flashcardlistitem:flashcardlistitemimpl:10',
  'surface:app-flashcards-flashcardlistitem:flashcardlistitemimpl:11',
  'surface:app-flashcards-flashcardlistitem:flashcardlistitemimpl:4',
  'surface:app-flashcards-flashcardlistitem:flashcardlistitemimpl:6',
  'surface:app-flashcards-flashcardlistitem:flashcardlistitemimpl:7',
  'surface:app-flashcards-flashcardlistitem:flashcardlistitemimpl:8',
  'surface:app-flashcards-flashcardlistitem:flashcardlistitemimpl:9',
] as const;

function expectMigrated(ids: readonly string[]): void {
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) {
    const row = LEDGER.entries.find((entry) => entry.id === id);
    expect(row).toBeDefined();
    expect(row?.category).toBe('MIGRATE');
    expect(row?.status).toBe('migrated');
    expect(row?.scanState).toBe('missing');
    expect(row?.reason).toBeTruthy();
  }
}

describe('learning and flashcards borderless production surfaces', () => {
  it('migrates the reviewed first flashcards wave containers', () => {
    expectMigrated(FLASHCARDS_FIRST_WAVE_TARGET_IDS);
  });

  it('migrates the reviewed flashcards swipe containers', () => {
    expectMigrated(FLASHCARDS_SWIPE_TARGET_IDS);
  });

  it('migrates the reviewed flashcard list item containers', () => {
    expectMigrated(FLASHCARD_LIST_ITEM_TARGET_IDS);
  });
});
