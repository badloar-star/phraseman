import assert from 'node:assert/strict';

async function main(): Promise<void> {
const activity = await import('../modules/stats_activity_rows').catch(() => null);
const buildStatsActivityRows = activity?.buildStatsActivityRows;
assert.equal(typeof buildStatsActivityRows, 'function', 'local activity projection must exist');
if (!buildStatsActivityRows) return;

const now = new Date('2026-09-26T12:00:00.000Z');
const legacyXpOnly = buildStatsActivityRows(
  { '2026-09-24': { points: 900, streak: 7 } },
  {},
  9,
  now,
);
assert.equal(legacyXpOnly.activeDays, 0, 'XP without local study time must not count as activity');
assert.equal(legacyXpOnly.days.find((day: { date: string }) => day.date === '2026-09-24')?.active, false);
assert.equal(legacyXpOnly.allDays.length, 1, 'without local activity do not render a 60-day empty archive');
assert.equal(legacyXpOnly.bestStreak, 9, 'current streak must survive deletion of XP activity');
assert.equal('points' in legacyXpOnly.days[0], false, 'XP points must not enter the cache');

const studied = buildStatsActivityRows(
  { '2026-09-24': { points: 900, streak: 7 } },
  { '2026-09-24': 60_000, '2026-09-25': 120_000, '2026-09-26': 59_999 },
  1,
  now,
);
assert.equal(studied.activeDays, 2);
assert.equal(studied.days.find((day: { date: string }) => day.date === '2026-09-24')?.active, true);
assert.equal(studied.days.find((day: { date: string }) => day.date === '2026-09-26')?.active, false);
assert.equal(studied.bestStreak, 7, 'stored streak history survives without XP points');

const malformed = buildStatsActivityRows(
  {},
  { '2026-99-99': 60_000, '2026-09-26': Number.POSITIVE_INFINITY },
  0,
  now,
);
assert.equal(malformed.activeDays, 0, 'malformed days and non-finite time are ignored');
}

void main();
