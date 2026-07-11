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
});
