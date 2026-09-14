import fs from 'fs';
import path from 'path';

/**
 * зачем (владелец 2026-09-14, дословно: «В РАЗДЕЛЕ КАРТОЧКИ УДАЛИ "СЕГОДНЯ
 * СЛАБНОЕ" НАВСЕГДА, УДАЛИ ЧТОБЫ НИКОГДА БОЛЬШЕ»): раздел «Сегодня слабое» и
 * весь механизм ежедневной практики карточек удалены целиком. Этот сторож
 * ломает сборку при любой попытке вернуть их — снимается ТОЛЬКО по прямой
 * команде владельца, как пломбы MAX и App Check.
 */

const ROOT = path.join(__dirname, '..');

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(ROOT, ...segments), 'utf8');
}

function exists(...segments: string[]): boolean {
  return fs.existsSync(path.join(ROOT, ...segments));
}

/** «Сегодня слабое» — заголовок удалённой плитки, ищем его во всех локалях. */
const REMOVED_TITLES = [
  'Сегодня слабое', // Сегодня слабое
  'Сьогодні слабке', // Сьогодні слабке
  'Today’s weak cards',
  'Débiles de hoy',
];

/** Экраны, через которые механизм проходил насквозь. */
const CARDS_FILES = [
  'app/flashcards/FlashcardsHubScreen.tsx',
  'app/flashcards/training_entry.ts',
  'app/flashcards_training_setup.tsx',
  'app/flashcards_blitz_session.tsx',
  'app/flashcards_recall_session.tsx',
  'app/flashcards_speaking_session.tsx',
  'app/flashcards_swipe.tsx',
];

describe('cards daily practice stays removed forever', () => {
  test('the daily_practice module is gone and nobody imports it', () => {
    expect(exists('app', 'flashcards', 'daily_practice.ts')).toBe(false);
    for (const file of CARDS_FILES) {
      expect(read(file)).not.toContain('daily_practice');
    }
  });

  test('no cards screen carries the daily route parameter or its state', () => {
    for (const file of CARDS_FILES) {
      const source = read(file);
      expect(source).not.toContain('dailyPractice');
      expect(source).not.toContain("daily: '1'");
      expect(source).not.toContain('FC_DAILY_PRACTICE');
      expect(source).not.toContain('loadOrCreateDailyPracticeCards');
      expect(source).not.toContain('dailyPracticeDayKey');
    }
  });

  test('the removed tile title never returns to the cards hub', () => {
    const hub = read('app', 'flashcards', 'FlashcardsHubScreen.tsx');
    expect(hub).not.toContain('fc-cards-hub-daily-practice');
    for (const title of REMOVED_TITLES) {
      expect(hub).not.toContain(title);
    }
  });

  test('the durable assignment key and its paywall source are gone', () => {
    expect(read('app', 'target_storage_keys.ts')).not.toContain('flashcardsDailyPracticeAssignmentKey');
    expect(read('app', 'paywall_entry_contract.ts')).not.toContain('flashcards_hub_daily_practice');
  });

  test('the pending-grant scope no longer carries the daily flag', () => {
    const grant = read('app', 'flashcard_training_pending_grant.ts');
    expect(grant).not.toContain('scope.daily');
    expect(grant).not.toContain('daily: boolean');
  });
});
