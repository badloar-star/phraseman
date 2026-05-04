// Tests for weekly_xp.ts — client-side weekly XP tracking.
import { readFileSync } from 'fs';
import { join } from 'path';

// In-memory AsyncStorage mock.
const asyncStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = v; }); }),
  multiGet: jest.fn(async (keys: string[]) => keys.map(k => [k, asyncStore[k] ?? null])),
}));

function clearStore() {
  Object.keys(asyncStore).forEach(k => delete asyncStore[k]);
}

beforeEach(() => {
  clearStore();
});

// ── getCurrentWeekStartIso ─────────────────────────────────────────────────────

test('getCurrentWeekStartIso: Monday 12:00 UTC → same Monday', () => {
  const { getCurrentWeekStartIso } = require('../app/weekly_xp');
  expect(getCurrentWeekStartIso(new Date('2026-05-04T12:00:00Z'))).toBe('2026-05-04');
});

test('getCurrentWeekStartIso: Sunday 23:59 UTC → previous Monday', () => {
  const { getCurrentWeekStartIso } = require('../app/weekly_xp');
  expect(getCurrentWeekStartIso(new Date('2026-05-03T23:59:59Z'))).toBe('2026-04-27');
});

test('getCurrentWeekStartIso: Tuesday 00:00 UTC → most recent Monday', () => {
  const { getCurrentWeekStartIso } = require('../app/weekly_xp');
  expect(getCurrentWeekStartIso(new Date('2026-05-05T00:00:00Z'))).toBe('2026-05-04');
});

test('getCurrentWeekStartIso: Monday 00:00 UTC sharp → that Monday', () => {
  const { getCurrentWeekStartIso } = require('../app/weekly_xp');
  expect(getCurrentWeekStartIso(new Date('2026-05-04T00:00:00Z'))).toBe('2026-05-04');
});

// ── addWeeklyXp ───────────────────────────────────────────────────────────────

test('addWeeklyXp(50) when no prior entry → weekly_xp=50 and period_start set', async () => {
  const { addWeeklyXp, WEEKLY_XP_KEY, WEEKLY_XP_PERIOD_START_KEY, getCurrentWeekStartIso } = require('../app/weekly_xp');
  await addWeeklyXp(50);
  expect(asyncStore[WEEKLY_XP_KEY]).toBe('50');
  expect(asyncStore[WEEKLY_XP_PERIOD_START_KEY]).toBe(getCurrentWeekStartIso());
});

test('addWeeklyXp(30) when same-period weekly_xp=50 → weekly_xp=80', async () => {
  const { addWeeklyXp, WEEKLY_XP_KEY, WEEKLY_XP_PERIOD_START_KEY, getCurrentWeekStartIso } = require('../app/weekly_xp');
  const currentPeriod = getCurrentWeekStartIso();
  asyncStore[WEEKLY_XP_KEY] = '50';
  asyncStore[WEEKLY_XP_PERIOD_START_KEY] = currentPeriod;
  await addWeeklyXp(30);
  expect(asyncStore[WEEKLY_XP_KEY]).toBe('80');
});

test('addWeeklyXp(40) when stale period → resets to 40 (self-heal)', async () => {
  const { addWeeklyXp, WEEKLY_XP_KEY, WEEKLY_XP_PERIOD_START_KEY } = require('../app/weekly_xp');
  asyncStore[WEEKLY_XP_KEY] = '100';
  asyncStore[WEEKLY_XP_PERIOD_START_KEY] = '2020-01-06'; // very old period
  await addWeeklyXp(40);
  expect(asyncStore[WEEKLY_XP_KEY]).toBe('40');
});

test('addWeeklyXp(0) is a no-op', async () => {
  const { addWeeklyXp, WEEKLY_XP_KEY } = require('../app/weekly_xp');
  await addWeeklyXp(0);
  expect(asyncStore[WEEKLY_XP_KEY]).toBeUndefined();
});

test('addWeeklyXp(-5) is a no-op', async () => {
  const { addWeeklyXp, WEEKLY_XP_KEY } = require('../app/weekly_xp');
  await addWeeklyXp(-5);
  expect(asyncStore[WEEKLY_XP_KEY]).toBeUndefined();
});

// ── Integration checks via source reading ─────────────────────────────────────

test('app/xp_manager.ts calls addWeeklyXp(finalDelta)', () => {
  const src = readFileSync(join(__dirname, '../app/xp_manager.ts'), 'utf8');
  expect(src).toContain("from './weekly_xp'");
  expect(src).toContain('addWeeklyXp(finalDelta)');
});

test('app/cloud_sync.ts SYNC_KEYS includes weekly_xp and weekly_xp_period_start', () => {
  const src = readFileSync(join(__dirname, '../app/cloud_sync.ts'), 'utf8');
  expect(src).toContain("'weekly_xp'");
  expect(src).toContain("'weekly_xp_period_start'");
});
