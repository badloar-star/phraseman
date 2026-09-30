import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildWeeklyReviewSnapshot } from '../app/weekly_review_snapshot';

const snapshot = buildWeeklyReviewSnapshot({
  mistakes: { status: 'ready', total7d: 3, total30d: 5, uniquePhrases: 2 },
  activity: {
    status: 'ready', activeDays7d: 2, activeDays30d: 3,
    currentStreak: 2, longestStreak: 3, weekMinutes: 42,
    lessons7d: 1, reviews7d: 1,
  },
  practice: { status: 'ready', dueWords: 2, duePhrases: 0, overdue: 0, totalTracked: 4 },
} as Parameters<typeof buildWeeklyReviewSnapshot>[0]);

assert.equal(snapshot.signalCount, 6, 'Weekly minutes must replace XP as an effort signal');
assert.equal('weekXp' in snapshot, false, 'Snapshot still exposes retired XP');
assert.equal(snapshot.weekMinutes, 42);

const root = path.join(__dirname, '..');
for (const relative of [
  'app/weekly_review_types.ts',
  'app/weekly_review_snapshot.ts',
  'functions/src/weekly_review.ts',
]) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  assert.equal(source.includes('weekXp'), false, `${relative} still includes weekXp`);
}
