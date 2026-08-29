import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('practice rune settlement has no 160/day or 180/session gameplay ceiling', () => {
  const server = readFileSync(join(process.cwd(), 'functions', 'src', 'practice_rune_grant.ts'), 'utf8');
  const client = readFileSync(join(process.cwd(), 'app', 'level_spin_star_grants.ts'), 'utf8');
  for (const forbidden of [
    'PRACTICE_RUNE_MAX_PER_SESSION',
    'PRACTICE_RUNE_MAX_PER_DAY',
    'practice_rune_daily_cap_reached',
    'practice_runes_daily',
  ]) expect(server).not.toContain(forbidden);
  expect(client).not.toMatch(/Number\(operation\.amount\)\s*>\s*180/);
  expect(server).toContain('splitPracticeRuneStarOperations');
  expect(server).toContain('STAR_OP_MAX_ABS_DELTA');
});

test('legacy daily field remains client-write protected in Firestore Rules', () => {
  const rules = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8');
  const updateGuard = rules.match(/function hasNoShardWrites\(\) \{[\s\S]*?\n    \}/)?.[0] ?? '';
  const createGuard = rules.match(/function newDocHasNoShardWrites\(\) \{[\s\S]*?\n    \}/)?.[0] ?? '';
  const userWriteRules = rules.match(
    /match \/users\/\{userId\} \{[\s\S]*?match \/community_seller_inbox/,
  )?.[0] ?? '';
  expect(updateGuard).toContain("'practice_runes_daily'");
  expect(createGuard).toContain("'practice_runes_daily'");
  expect(userWriteRules).toContain('allow create: if false;');
  expect(userWriteRules).toContain('&& hasNoShardWrites()');
});
